import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, Between, DataSource } from 'typeorm';
import { CashRegister, CashRegisterStatus } from './entities/cash-register.entity';
import { CashMovement, MovementType } from './entities/cash-movement.entity';
import { CashRegisterTotals } from './entities/cash-register-totals.entity';
import { PaymentMethod as PaymentMethodEntity } from '../configuration/entities/payment-method.entity';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { CashFlowReportFiltersDto } from './dto/cash-flow-report-filters.dto';
import { getTodayLocalDate } from '../../common/utils/date.utils';
import { AuditService } from '../audit/audit.service';
import { AuditEntityType, AuditAction } from '../audit/enums';
import {
    RawMovementResult,
    MappedMovement,
    UserWithName,
    CashRegisterWithNames,
} from './types/cash-movement.types';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class CashRegisterService {
    constructor(
        @InjectRepository(CashRegister)
        private readonly cashRegisterRepo: Repository<CashRegister>,
        @InjectRepository(CashMovement)
        private readonly cashMovementRepo: Repository<CashMovement>,
        @InjectRepository(CashRegisterTotals)
        private readonly cashTotalsRepo: Repository<CashRegisterTotals>,
        @InjectRepository(PaymentMethodEntity)
        private readonly paymentMethodRepo: Repository<PaymentMethodEntity>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly auditService: AuditService,
    ) { }

    // ============ SPRINT 1: Saldo Sugerido ============

    /**
     * Obtener saldo inicial sugerido (del día anterior)
     */
    async getSuggestedInitialAmount(): Promise<{
        suggested: number;
        previousDate: Date | null;
        previousActual: number;
    }> {
        const previousRegister = await this.getPreviousDayCashRegister();

        return {
            suggested: previousRegister?.actualAmount ? Number(previousRegister.actualAmount) : 0,
            previousDate: previousRegister?.date || null,
            previousActual: previousRegister?.actualAmount ? Number(previousRegister.actualAmount) : 0,
        };
    }

    /**
     * Obtener caja del día anterior para continuidad
     */
    private async getPreviousDayCashRegister(): Promise<CashRegister | null> {
        return this.cashRegisterRepo.findOne({
            where: { status: CashRegisterStatus.CLOSED },
            order: { closedAt: 'DESC' },
        });
    }

    /**
     * Abrir una nueva caja
     */
    async open(dto: OpenCashRegisterDto, userId: string): Promise<CashRegisterWithNames> {
        // Verificar que no hay caja abierta
        const openRegister = await this.getOpenRegister();
        if (openRegister) {
            throw new BadRequestException('Ya existe una caja abierta');
        }

        // Verificar que no exista una caja del día de hoy (abierta o cerrada)
        const todayDate = getTodayLocalDate();
        const existingTodaysRegister = await this.cashRegisterRepo.findOne({
            where: { date: todayDate },
        });

        if (existingTodaysRegister) {
            if (existingTodaysRegister.status === CashRegisterStatus.CLOSED) {
                throw new BadRequestException(
                    'Ya existe una caja cerrada para el día de hoy. Debe reabrirla para continuar operando.'
                );
            } else {
                throw new BadRequestException('Ya existe una caja para el día de hoy');
            }
        }

        // Obtener saldo final del día anterior para validación
        const previousRegister = await this.getPreviousDayCashRegister();
        const suggestedInitialAmount = previousRegister?.actualAmount
            ? Number(previousRegister.actualAmount)
            : 0;

        // Validar si se ajustó manualmente
        if (dto.manuallyAdjusted && dto.initialAmount !== suggestedInitialAmount) {
            console.warn(
                `[CashRegister] Saldo inicial ajustado manualmente. ` +
                `Sugerido: ${suggestedInitialAmount}, Ingresado: ${dto.initialAmount}. ` +
                `Razón: ${dto.adjustmentReason || 'No especificada'}`,
            );
        }

        const cashRegister = this.cashRegisterRepo.create({
            date: todayDate,
            openedAt: new Date(),
            initialAmount: dto.initialAmount,
            totalIncome: 0,
            totalExpense: 0,
            openingNotes: dto.openingNotes,
            status: CashRegisterStatus.OPEN,
            openedBy: { id: userId } as any,
        });

        const saved = await this.cashRegisterRepo.save(cashRegister);

        // Crear totales iniciales por método de pago
        await this.initializePaymentMethodTotals(saved, dto.initialAmount);

        // Log de auditoría
        await this.auditService.logSilent({
            entityType: AuditEntityType.CASH_REGISTER,
            entityId: saved.id,
            action: AuditAction.OPEN,
            userId,
            newValues: {
                date: saved.date,
                initialAmount: saved.initialAmount,
                openingNotes: saved.openingNotes,
            },
            description: AuditService.generateDescription(
                AuditAction.OPEN,
                AuditEntityType.CASH_REGISTER
            ),
        });

        // Recargar con relaciones
        const reloaded = await this.cashRegisterRepo.findOne({
            where: { id: saved.id },
            relations: ['movements', 'openedBy', 'totals'],
        });

        if (!reloaded) {
            throw new NotFoundException('Caja no encontrada al recargar');
        }

        return this.transformCashRegisterResponseNonNull(reloaded);
    }

    /**
     * Inicializar totales por método de pago
     */
    private async initializePaymentMethodTotals(
        cashRegister: CashRegister,
        initialCashAmount: number,
    ): Promise<void> {
        const paymentMethods = await this.paymentMethodRepo.find({ where: { isActive: true } });

        for (const method of paymentMethods) {
            const initialAmount = method.code === 'cash' ? initialCashAmount : 0;
            await this.cashTotalsRepo.save({
                cashRegister,
                paymentMethod: method,
                paymentMethodId: method.id,
                initialAmount,
                totalIncome: 0,
                totalExpense: 0,
                expectedAmount: initialAmount,
            });
        }
    }

    /**
     * Cerrar la caja abierta con arqueo detallado
     */
    async close(dto: CloseCashRegisterDto, userId: string): Promise<CashRegisterWithNames> {
        const cashRegister = await this.cashRegisterRepo.findOne({
            where: { status: CashRegisterStatus.OPEN },
            relations: ['totals'],
        });

        if (!cashRegister) {
            throw new NotFoundException('No hay caja abierta');
        }

        // Actualizar montos reales por método de pago
        await this.updateActualAmounts(cashRegister, dto);

        // Recalcular totales esperados
        const totals = await this.cashTotalsRepo.find({
            where: { cashRegister: { id: cashRegister.id } },
        });

        // Calcular totales generales
        const expectedAmount =
            Number(cashRegister.initialAmount) +
            Number(cashRegister.totalIncome) -
            Number(cashRegister.totalExpense);

        const totalActual = this.calculateTotalActual(totals);
        const difference = totalActual - expectedAmount;

        cashRegister.closedAt = new Date();
        cashRegister.expectedAmount = expectedAmount;
        cashRegister.actualAmount = totalActual;
        cashRegister.difference = difference;
        cashRegister.closingNotes = dto.closingNotes;
        cashRegister.status = CashRegisterStatus.CLOSED;
        cashRegister.closedBy = { id: userId } as any;

        await this.cashRegisterRepo.save(cashRegister);

        // Log de auditoría
        await this.auditService.logSilent({
            entityType: AuditEntityType.CASH_REGISTER,
            entityId: cashRegister.id,
            action: AuditAction.CLOSE,
            userId,
            previousValues: { status: CashRegisterStatus.OPEN },
            newValues: {
                status: CashRegisterStatus.CLOSED,
                expectedAmount,
                actualAmount: totalActual,
                difference,
            },
            description: AuditService.generateDescription(
                AuditAction.CLOSE,
                AuditEntityType.CASH_REGISTER
            ),
        });

        // Recargar con todas las relaciones
        const reloaded = await this.cashRegisterRepo.findOne({
            where: { id: cashRegister.id },
            relations: ['movements', 'openedBy', 'closedBy', 'totals'],
        });

        if (!reloaded) {
            throw new NotFoundException('Caja no encontrada al recargar');
        }

        return this.transformCashRegisterResponseNonNull(reloaded);
    }

    /**
     * Reabrir una caja cerrada del día actual
     */
    async reopen(cashRegisterId: string, userId: string): Promise<CashRegisterWithNames> {
        const cashRegister = await this.cashRegisterRepo.findOne({
            where: { id: cashRegisterId },
            relations: ['movements', 'openedBy', 'totals'],
        });

        if (!cashRegister) {
            throw new NotFoundException('Caja no encontrada');
        }

        // Validar que la caja esté cerrada
        if (cashRegister.status === CashRegisterStatus.OPEN) {
            throw new BadRequestException('La caja ya está abierta');
        }

        // Validar que la caja sea del día actual
        if (!this.isSameDayAsToday(cashRegister.date)) {
            throw new BadRequestException(
                'Solo se puede reabrir la caja del día actual'
            );
        }

        // Verificar que no haya otra caja abierta
        const openRegister = await this.getOpenRegister();
        if (openRegister) {
            throw new BadRequestException('Ya existe otra caja abierta');
        }

        // Limpiar datos de cierre y reabrir
        cashRegister.status = CashRegisterStatus.OPEN;
        cashRegister.closedAt = undefined;
        cashRegister.closedBy = undefined;
        cashRegister.expectedAmount = undefined;
        cashRegister.actualAmount = undefined;
        cashRegister.difference = undefined;
        cashRegister.closingNotes = undefined;

        // Limpiar montos reales y diferencias de los totales
        for (const total of cashRegister.totals) {
            total.actualAmount = undefined;
            total.difference = undefined;
            await this.cashTotalsRepo.save(total);
        }

        await this.cashRegisterRepo.save(cashRegister);

        console.log(`[CashRegister] Caja ${cashRegisterId} reabierta por usuario ${userId}`);

        // Recargar con todas las relaciones
        const reloaded = await this.cashRegisterRepo.findOne({
            where: { id: cashRegisterId },
            relations: ['movements', 'movements.createdBy', 'openedBy', 'totals'],
            order: {
                movements: {
                    createdAt: 'DESC',
                },
            },
        });

        if (!reloaded) {
            throw new NotFoundException('Caja no encontrada al recargar');
        }

        return this.transformCashRegisterResponseNonNull(reloaded);
    }

    /**
     * Actualizar montos reales por método de pago
     */
    private async updateActualAmounts(
        cashRegister: CashRegister,
        dto: CloseCashRegisterDto,
    ): Promise<void> {
        const totals = await this.cashTotalsRepo.find({
            where: { cashRegister: { id: cashRegister.id } },
            relations: ['paymentMethod'],
        });

        // Efectivo
        const cashTotal = totals.find(t => t.paymentMethod.code === 'cash');
        if (cashTotal) {
            cashTotal.actualAmount = dto.actualCashAmount;
            cashTotal.difference = dto.actualCashAmount - Number(cashTotal.expectedAmount);
            await this.cashTotalsRepo.save(cashTotal);
        }

        // Otros métodos (si se proporcionan)
        if (dto.actualAmounts) {
            for (const [code, amount] of Object.entries(dto.actualAmounts)) {
                if (amount !== undefined && amount !== null) {
                    const total = totals.find(t => t.paymentMethod.code === code);
                    if (total) {
                        total.actualAmount = amount;
                        total.difference = amount - Number(total.expectedAmount);
                        await this.cashTotalsRepo.save(total);
                    }
                }
            }
        }

        // Para métodos no especificados, usar el valor esperado como actual
        for (const total of totals) {
            if (total.actualAmount === null || total.actualAmount === undefined) {
                total.actualAmount = Number(total.expectedAmount);
                total.difference = 0;
                await this.cashTotalsRepo.save(total);
            }
        }
    }

    /**
     * Calcular total actual sumando todos los métodos
     */
    private calculateTotalActual(totals: CashRegisterTotals[]): number {
        return totals.reduce(
            (sum, t) => sum + Number(t.actualAmount ?? t.expectedAmount ?? 0),
            0,
        );
    }

    /**
     * Verifica si una fecha corresponde al día actual
     * Compara strings de fecha para evitar problemas de zona horaria
     */
    private isSameDayAsToday(date: Date | string): boolean {
        const todayDate = getTodayLocalDate();
        const todayString = todayDate.toISOString().split('T')[0]; // YYYY-MM-DD

        // La fecha puede ser un Date o un string, normalizarla
        const dateString = date instanceof Date
            ? date.toISOString().split('T')[0]
            : String(date).split('T')[0];

        return dateString === todayString;
    }

    /**
     * Obtener la caja abierta actual
     */
    async getOpenRegister(): Promise<any> {
        const register = await this.cashRegisterRepo.findOne({
            where: { status: CashRegisterStatus.OPEN },
            relations: ['openedBy', 'totals', 'totals.paymentMethod'],
        });

        if (register) {
            register.movements = await this.loadMovementsWithDetails(register.id);
        }

        return this.transformCashRegisterResponse(register);
    }

    /**
     * Cargar movimientos con detalles de ventas, gastos, compras y movimientos manuales
     */
    private async loadMovementsWithDetails(registerId: string): Promise<any[]> {
        const movements = await this.cashMovementRepo
            .createQueryBuilder('movement')
            .leftJoinAndSelect('movement.createdBy', 'createdBy')
            .leftJoinAndSelect('movement.cashRegister', 'cashRegister')
            // Join con SalePayment para ingresos de ventas
            .leftJoin('sale_payments', 'sp', 'movement.referenceType = :saleType AND movement.referenceId = sp.id', { saleType: 'sale_payment' })
            .leftJoin('sales', 's', 'sp.sale_id = s.id')
            .leftJoin('payment_methods', 'pm_sale', 'sp.payment_method_id = pm_sale.id')
            // Join con Expense para egresos de gastos
            .leftJoin('expenses', 'e', 'movement.referenceType = :expenseType AND movement.referenceId = e.id', { expenseType: 'expense' })
            .leftJoin('payment_methods', 'pm_expense', 'e.payment_method_id = pm_expense.id')
            // Join con Purchase para egresos de compras
            .leftJoin('purchases', 'p', 'movement.referenceType = :purchaseType AND movement.referenceId = p.id', { purchaseType: 'purchase' })
            .leftJoin('payment_methods', 'pm_purchase', 'p.payment_method_id = pm_purchase.id')
            // Join con Income para ingresos de servicios
            .leftJoin('incomes', 'i', 'movement.referenceType = :incomeType AND movement.referenceId = i.id', { incomeType: 'income' })
            .leftJoin('payment_methods', 'pm_income', 'i.payment_method_id = pm_income.id')
            // Join con métodos de pago para movimientos manuales
            .leftJoin('payment_methods', 'pm_manual', 'movement.referenceType = :manualType AND movement.manual_payment_method_id = pm_manual.id', { manualType: 'manual' })
            // Join con métodos de pago para pagos de cuenta corriente
            .leftJoin('payment_methods', 'pm_account', 'movement.referenceType = :accountPaymentType AND movement.manual_payment_method_id = pm_account.id', { accountPaymentType: 'account_payment' })
            .select([
                'movement.id',
                'movement.movementType',
                'movement.referenceType',
                'movement.referenceId',
                'movement.createdAt',
                'createdBy.id',
                'createdBy.firstName',
                'createdBy.lastName',
            ])
            // Mapear campos dinámicos - prioridad: sale_payment > expense > purchase > income > manual
            .addSelect('COALESCE(sp.amount, e.amount, p.total, i.amount, movement."manualAmount")', 'amount')
            .addSelect(`CASE 
                WHEN s.id IS NOT NULL THEN CONCAT('Venta ', s."saleNumber") 
                WHEN e.id IS NOT NULL THEN e.description 
                WHEN p.id IS NOT NULL THEN CONCAT('Compra ', p."purchaseNumber")
                WHEN i.id IS NOT NULL THEN i.description
                WHEN movement."referenceType" = 'account_payment' THEN movement."manualDescription"
                WHEN movement."referenceType" = 'manual' THEN movement."manualDescription"
                ELSE 'Movimiento' 
            END`, 'description')
            .addSelect('COALESCE(pm_sale.name, pm_expense.name, pm_purchase.name, pm_income.name, pm_account.name, pm_manual.name)', 'paymentMethodName')
            .addSelect('COALESCE(pm_sale.code, pm_expense.code, pm_purchase.code, pm_income.code, pm_account.code, pm_manual.code)', 'paymentMethodCode')
            .where('movement.cashRegister.id = :registerId', { registerId })
            .orderBy('movement.createdAt', 'DESC')
            .getRawMany();

        return this.mapRawMovements(movements);
    }

    /**
     * Mapear resultados raw a objetos que el frontend pueda entender
     * getRawMany() devuelve campos con prefijos como movement_id, movement_createdAt, etc.
     */
    private mapRawMovements(movements: RawMovementResult[]): MappedMovement[] {
        return movements.map((m): MappedMovement => ({
            id: m.movement_id,
            movementType: m.movement_movementType,
            referenceType: m.movement_referenceType,
            referenceId: m.movement_referenceId,
            createdAt: m.movement_createdAt,
            createdBy: {
                id: m.createdBy_id,
                firstName: m.createdBy_firstName,
                lastName: m.createdBy_lastName,
                name: `${m.createdBy_firstName || ''} ${m.createdBy_lastName || ''}`.trim() || null,
            },
            // Campos calculados desde los JOINs
            amount: Number(m.amount),
            description: m.description,
            paymentMethod: {
                name: m.paymentMethodName,
                code: m.paymentMethodCode
            }
        }));
    }

    /**
     * Registrar ingreso desde venta
     */
    async registerIncome(
        data: {
            salePaymentId: string;
        },
        userId: string,
    ): Promise<CashMovement> {
        const cashRegister = await this.getOpenRegister();

        if (!cashRegister) {
            throw new BadRequestException('No hay caja abierta');
        }

        // Obtener el pago de venta para actualizar totales
        const salePayment = await this.dataSource.query(
            `SELECT sp.*, pm.id as "paymentMethodId", pm.code as "paymentMethodCode" 
             FROM sale_payments sp
             JOIN payment_methods pm ON sp.payment_method_id = pm.id
             WHERE sp.id = $1`,
            [data.salePaymentId]
        );

        if (!salePayment || salePayment.length === 0) {
            throw new NotFoundException('Pago de venta no encontrado');
        }

        const payment = salePayment[0];
        const amount = Number(payment.amount);

        const isValidUUID = userId && userId !== 'system' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

        // Usar query directo para evitar problemas con cascade de TypeORM
        const result = await this.dataSource.query(
            `INSERT INTO cash_movements 
                (cash_register_id, "movementType", "referenceType", "referenceId", created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                cashRegister.id,
                MovementType.INCOME,
                'sale_payment',
                data.salePaymentId,
                isValidUUID ? userId : null
            ]
        );

        const savedMovement = result[0];

        // Actualizar totales de caja usando UPDATE directo para no tocar relaciones
        // FIX 1.4: incremento atómico en SQL (antes: read-modify-write con race condition)
        await this.cashRegisterRepo.increment({ id: cashRegister.id }, 'totalIncome', Math.abs(amount));

        // Actualizar totales por método de pago
        // Necesitamos la entidad PaymentMethod para updatePaymentMethodTotal
        const paymentMethodEntity = await this.paymentMethodRepo.findOneBy({ id: payment.paymentMethodId });

        if (paymentMethodEntity) {
            await this.updatePaymentMethodTotal(
                cashRegister.id,
                paymentMethodEntity,
                Math.abs(amount),
                'income',
            );
        }

        return savedMovement;
    }

    /**
     * Registrar egreso desde gasto
     */
    async registerExpense(
        data: {
            expenseId: string;
        },
        userId: string,
    ): Promise<CashMovement> {
        const cashRegister = await this.getOpenRegister();

        if (!cashRegister) {
            throw new BadRequestException('No hay caja abierta');
        }

        // Obtener el gasto para actualizar totales
        const expenseResult = await this.dataSource.query(
            `SELECT e.*, pm.id as "paymentMethodId", pm.code as "paymentMethodCode" 
             FROM expenses e
             JOIN payment_methods pm ON e.payment_method_id = pm.id
             WHERE e.id = $1`,
            [data.expenseId]
        );

        if (!expenseResult || expenseResult.length === 0) {
            throw new NotFoundException('Gasto no encontrado');
        }

        const expense = expenseResult[0];
        const amount = Number(expense.amount);

        const isValidUUID = userId && userId !== 'system' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

        // Usar query directo para evitar problemas con cascade de TypeORM
        const result = await this.dataSource.query(
            `INSERT INTO cash_movements 
                (cash_register_id, "movementType", "referenceType", "referenceId", created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                cashRegister.id,
                MovementType.EXPENSE,
                'expense',
                data.expenseId,
                isValidUUID ? userId : null
            ]
        );

        const savedMovement = result[0];

        // Actualizar totales de caja usando UPDATE directo para no tocar relaciones
        // FIX 1.4: incremento atómico en SQL
        await this.cashRegisterRepo.increment({ id: cashRegister.id }, 'totalExpense', Math.abs(amount));

        // Actualizar totales por método de pago
        const paymentMethodEntity = await this.paymentMethodRepo.findOneBy({ id: expense.paymentMethodId });

        if (paymentMethodEntity) {
            await this.updatePaymentMethodTotal(
                cashRegister.id,
                paymentMethodEntity,
                Math.abs(amount),
                'expense',
            );
        }

        return savedMovement;
    }

    /**
     * Registrar ingreso desde servicio (módulo de ingresos)
     */
    async registerServiceIncome(
        data: {
            incomeId: string;
        },
        userId: string,
    ): Promise<CashMovement> {
        const cashRegister = await this.getOpenRegister();

        if (!cashRegister) {
            throw new BadRequestException('No hay caja abierta');
        }

        // Obtener el ingreso para actualizar totales
        const incomeResult = await this.dataSource.query(
            `SELECT i.*, pm.id as "paymentMethodId", pm.code as "paymentMethodCode" 
             FROM incomes i
             JOIN payment_methods pm ON i.payment_method_id = pm.id
             WHERE i.id = $1`,
            [data.incomeId]
        );

        if (!incomeResult || incomeResult.length === 0) {
            throw new NotFoundException('Ingreso no encontrado');
        }

        const income = incomeResult[0];
        const amount = Number(income.amount);

        const isValidUUID = userId && userId !== 'system' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

        // Usar query directo para evitar problemas con cascade de TypeORM
        const result = await this.dataSource.query(
            `INSERT INTO cash_movements 
                (cash_register_id, "movementType", "referenceType", "referenceId", created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                cashRegister.id,
                MovementType.INCOME,
                'income',
                data.incomeId,
                isValidUUID ? userId : null
            ]
        );

        const savedMovement = result[0];

        // Actualizar totales de caja usando UPDATE directo para no tocar relaciones
        // FIX 1.4: incremento atómico en SQL (antes: read-modify-write con race condition)
        await this.cashRegisterRepo.increment({ id: cashRegister.id }, 'totalIncome', Math.abs(amount));

        // Actualizar totales por método de pago
        const paymentMethodEntity = await this.paymentMethodRepo.findOneBy({ id: income.paymentMethodId });

        if (paymentMethodEntity) {
            await this.updatePaymentMethodTotal(
                cashRegister.id,
                paymentMethodEntity,
                Math.abs(amount),
                'income',
            );
        }

        return savedMovement;
    }

    /**
     * Registrar ingreso desde pago de cuenta corriente
     * Este método registra pagos parciales o totales de clientes en cuenta corriente
     */
    async registerAccountPayment(
        data: {
            accountMovementId: string;
            customerId: string;
            amount: number;
            paymentMethodId: string;
            description: string;
        },
        userId: string,
    ): Promise<CashMovement> {
        const cashRegister = await this.getOpenRegister();

        if (!cashRegister) {
            throw new BadRequestException('No hay caja abierta');
        }

        const amount = Math.abs(data.amount);

        const isValidUUID = userId && userId !== 'system' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

        // Usar query directo para evitar problemas con cascade de TypeORM
        const result = await this.dataSource.query(
            `INSERT INTO cash_movements 
                (cash_register_id, "movementType", "referenceType", "referenceId", "manualDescription", "manualAmount", "manual_payment_method_id", created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                cashRegister.id,
                MovementType.INCOME,
                'account_payment',
                data.accountMovementId,
                data.description,
                amount,
                data.paymentMethodId,
                isValidUUID ? userId : null
            ]
        );

        const savedMovement = result[0];

        // Actualizar totales de caja usando UPDATE directo para no tocar relaciones
        // FIX 1.4: incremento atómico en SQL
        await this.cashRegisterRepo.increment({ id: cashRegister.id }, 'totalIncome', amount);

        // Actualizar totales por método de pago
        const paymentMethodEntity = await this.paymentMethodRepo.findOneBy({ id: data.paymentMethodId });

        if (paymentMethodEntity) {
            await this.updatePaymentMethodTotal(
                cashRegister.id,
                paymentMethodEntity,
                amount,
                'income',
            );
        }

        console.log(`[CashRegister] Pago de cuenta corriente registrado: $${amount} - ${data.description}`);

        return savedMovement;
    }

    /**
     * Registrar egreso desde compra
     */
    async registerPurchase(
        data: {
            purchaseId: string;
            total?: number;
            paymentMethodId?: string;
        },
        userId: string,
    ): Promise<CashMovement> {
        const cashRegister = await this.getOpenRegister();

        if (!cashRegister) {
            throw new BadRequestException('No hay caja abierta');
        }

        let amount: number;
        let paymentMethodId: string | undefined = data.paymentMethodId;

        // Si se pasan los datos directamente, usarlos (para evitar problemas con transacciones)
        if (data.total !== undefined && data.paymentMethodId !== undefined) {
            amount = Number(data.total);
        } else {
            // Fallback: obtener la compra de la base de datos
            const purchaseResult = await this.dataSource.query(
                `SELECT p.*, pm.id as "paymentMethodId", pm.code as "paymentMethodCode" 
                 FROM purchases p
                 LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
                 WHERE p.id = $1`,
                [data.purchaseId]
            );

            if (!purchaseResult || purchaseResult.length === 0) {
                throw new NotFoundException('Compra no encontrada');
            }

            const purchase = purchaseResult[0];
            amount = Number(purchase.total);
            paymentMethodId = purchase.paymentMethodId;
        }

        const isValidUUID = userId && userId !== 'system' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

        // Usar query directo para evitar problemas con cascade de TypeORM
        const result = await this.dataSource.query(
            `INSERT INTO cash_movements 
                (cash_register_id, "movementType", "referenceType", "referenceId", created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                cashRegister.id,
                MovementType.EXPENSE,
                'purchase',
                data.purchaseId,
                isValidUUID ? userId : null
            ]
        );

        const savedMovement = result[0];

        // Actualizar totales de caja usando UPDATE directo para no tocar relaciones
        // FIX 1.4: incremento atómico en SQL
        await this.cashRegisterRepo.increment({ id: cashRegister.id }, 'totalExpense', Math.abs(amount));

        // Actualizar totales por método de pago
        if (paymentMethodId) {
            const paymentMethodEntity = await this.paymentMethodRepo.findOneBy({ id: paymentMethodId });

            if (paymentMethodEntity) {
                await this.updatePaymentMethodTotal(
                    cashRegister.id,
                    paymentMethodEntity,
                    Math.abs(amount),
                    'expense',
                );
            }
        }

        return savedMovement;
    }

    /**
     * Registrar devolución de venta (Refund)
     * Se registra como un egreso manual vinculado a la venta
     */
    async registerRefund(
        data: {
            amount: number;
            paymentMethodId: string;
            description: string;
            referenceId?: string;
        },
        userId: string,
    ): Promise<CashMovement> {
        const cashRegister = await this.getOpenRegister();

        if (!cashRegister) {
            throw new BadRequestException('No hay caja abierta para registrar la devolución');
        }

        const amount = Math.abs(data.amount);
        const isValidUUID = userId && userId !== 'system' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

        // Insertar movimiento manual de tipo GASTO
        const result = await this.dataSource.query(
            `INSERT INTO cash_movements 
                (cash_register_id, "movementType", "referenceType", "referenceId", "manualDescription", "manualAmount", "manual_payment_method_id", created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                cashRegister.id,
                MovementType.EXPENSE,
                'manual',
                data.referenceId || null,
                data.description,
                amount,
                data.paymentMethodId,
                isValidUUID ? userId : null
            ]
        );

        const savedMovement = result[0];

        // Actualizar totales de caja
        // FIX 1.4: incremento atómico en SQL
        await this.cashRegisterRepo.increment({ id: cashRegister.id }, 'totalExpense', amount);

        // Actualizar totales por método de pago
        const paymentMethodEntity = await this.paymentMethodRepo.findOneBy({ id: data.paymentMethodId });

        if (paymentMethodEntity) {
            await this.updatePaymentMethodTotal(
                cashRegister.id,
                paymentMethodEntity,
                amount,
                'expense',
            );
        }

        console.log(`[CashRegister] Devolución registrada: $${amount} - ${data.description}`);

        return savedMovement;
    }

    /**
     * Actualizar totales por método de pago
     */
    private async updatePaymentMethodTotal(
        cashRegisterId: string,
        paymentMethod: PaymentMethodEntity,
        amount: number,
        type: 'income' | 'expense',
    ): Promise<void> {
        let total = await this.cashTotalsRepo.findOne({
            where: {
                cashRegister: { id: cashRegisterId },
                paymentMethod: { id: paymentMethod.id },
            },
        });

        // Si no existe el total para este método de pago, crearlo
        if (!total) {
            total = this.cashTotalsRepo.create({
                cashRegister: { id: cashRegisterId } as any,
                paymentMethod,
                initialAmount: 0,
                totalIncome: 0,
                totalExpense: 0,
                expectedAmount: 0,
            });
            await this.cashTotalsRepo.save(total);
        }

        // FIX 1.4: Incrementos atómicos en SQL para evitar race conditions
        // (antes hacía read-modify-write en memoria, perdía actualizaciones concurrentes).
        // initialAmount es inmutable post-apertura, así que expectedAmount tiene el
        // mismo delta que el ingreso/egreso.
        const column = type === 'income' ? 'totalIncome' : 'totalExpense';
        await this.cashTotalsRepo.increment({ id: total.id }, column, amount);
        await this.cashTotalsRepo.increment({ id: total.id }, 'expectedAmount', type === 'income' ? amount : -amount);
    }

    /**
     * Crear movimiento manual (retiro/ingreso de efectivo)
     */
    async createManualMovement(
        dto: {
            movementType: 'income' | 'expense';
            paymentMethodId: string;
            amount: number;
            description: string;
            notes?: string;
        },
        userId: string,
    ): Promise<CashMovement> {
        const cashRegister = await this.getOpenRegister();

        if (!cashRegister) {
            throw new BadRequestException('No hay caja abierta');
        }

        // Obtener el método de pago
        const paymentMethod = await this.paymentMethodRepo.findOneBy({ id: dto.paymentMethodId });
        if (!paymentMethod) {
            throw new NotFoundException('Método de pago no encontrado');
        }

        const amount = Math.abs(dto.amount);
        const isIncome = dto.movementType === 'income';

        const isValidUUID = userId && userId !== 'system' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

        // Crear el movimiento con referenceType = 'manual' y datos adicionales
        const result = await this.dataSource.query(
            `INSERT INTO cash_movements 
                (cash_register_id, "movementType", "referenceType", "referenceId", created_by, 
                 "manualAmount", "manualDescription", "manual_payment_method_id", "manualNotes")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                cashRegister.id,
                isIncome ? MovementType.INCOME : MovementType.EXPENSE,
                'manual',
                null, // No hay referenceId para movimientos manuales
                isValidUUID ? userId : null,
                amount,
                dto.description,
                dto.paymentMethodId,
                dto.notes || null
            ]
        );

        const savedMovement = result[0];

        // Actualizar totales de la caja
        if (isIncome) {
            // FIX 1.4: incremento atómico en SQL
            await this.cashRegisterRepo.increment({ id: cashRegister.id }, 'totalIncome', amount);
        } else {
            await this.cashRegisterRepo.increment({ id: cashRegister.id }, 'totalExpense', amount);
        }

        // Actualizar totales por método de pago
        await this.updatePaymentMethodTotal(
            cashRegister.id,
            paymentMethod,
            amount,
            isIncome ? 'income' : 'expense',
        );

        // Log de auditoría
        await this.auditService.logSilent({
            entityType: AuditEntityType.CASH_REGISTER,
            entityId: cashRegister.id,
            action: AuditAction.UPDATE,
            userId,
            newValues: {
                movementType: dto.movementType,
                paymentMethod: paymentMethod.name,
                amount,
                description: dto.description,
            },
            description: `Movimiento manual: ${dto.description}`,
        });

        // Retornar el movimiento con datos adicionales
        return {
            ...savedMovement,
            amount,
            description: dto.description,
            paymentMethod: { name: paymentMethod.name, code: paymentMethod.code },
        };
    }

    // ============ SPRINT 1: REPORTES POR RANGO DE FECHAS ============

    /**
     * Obtener reporte de flujo de caja
     */
    async getCashFlowReport(filters: CashFlowReportFiltersDto) {
        const { startDate, endDate, paymentMethod, includeComparison } = filters;

        // Obtener registros del período principal
        const query = this.cashRegisterRepo
            .createQueryBuilder('register')
            .leftJoinAndSelect('register.totals', 'totals')
            .leftJoinAndSelect('totals.paymentMethod', 'paymentMethod')
            .leftJoinAndSelect('register.movements', 'movements')
            .where('register.date BETWEEN :start AND :end', {
                start: startDate,
                end: endDate,
            })
            .orderBy('register.date', 'ASC');

        const registers = await query.getMany();

        // Filtrar totales por método de pago si se especifica
        if (paymentMethod) {
            registers.forEach(r => {
                r.totals = r.totals?.filter(t => t.paymentMethod.code === paymentMethod) || [];
            });
        }

        // Calcular período anterior para comparación
        let comparison = null;
        if (includeComparison) {
            comparison = await this.calculateComparisonPeriod(startDate, endDate);
        }

        return {
            period: { start: startDate, end: endDate },
            summary: this.calculateSummary(registers),
            byPaymentMethod: this.calculateByPaymentMethod(registers),
            dailyBreakdown: this.calculateDailyBreakdown(registers),
            comparison,
        };
    }

    /**
     * Calcular resumen del período
     */
    private calculateSummary(registers: CashRegister[]) {
        const closedRegisters = registers.filter(
            r => r.status === CashRegisterStatus.CLOSED,
        );

        const totalIncome = closedRegisters.reduce(
            (sum, r) => sum + Number(r.totalIncome),
            0,
        );
        const totalExpense = closedRegisters.reduce(
            (sum, r) => sum + Number(r.totalExpense),
            0,
        );

        return {
            totalDays: registers.length,
            closedDays: closedRegisters.length,
            totalIncome,
            totalExpense,
            netCashFlow: totalIncome - totalExpense,
            totalDifferences: closedRegisters.reduce(
                (sum, r) => sum + Number(r.difference || 0),
                0,
            ),
            averageDailyIncome:
                closedRegisters.length > 0
                    ? totalIncome / closedRegisters.length
                    : 0,
        };
    }

    /**
     * Calcular totales por método de pago
     */
    private calculateByPaymentMethod(registers: CashRegister[]) {
        const methodTotals: Record<
            string,
            {
                totalIncome: number;
                totalExpense: number;
                netAmount: number;
                totalDifferences: number;
            }
        > = {};

        registers.forEach(register => {
            register.totals?.forEach(total => {
                const key = total.paymentMethod.name;
                if (!methodTotals[key]) {
                    methodTotals[key] = {
                        totalIncome: 0,
                        totalExpense: 0,
                        netAmount: 0,
                        totalDifferences: 0,
                    };
                }

                methodTotals[key].totalIncome += Number(total.totalIncome);
                methodTotals[key].totalExpense += Number(total.totalExpense);
                methodTotals[key].netAmount +=
                    Number(total.totalIncome) - Number(total.totalExpense);
                methodTotals[key].totalDifferences += Number(
                    total.difference || 0,
                );
            });
        });

        return methodTotals;
    }

    /**
     * Calcular desglose diario
     */
    private calculateDailyBreakdown(registers: CashRegister[]) {
        return registers.map(register => ({
            date: register.date,
            status: register.status,
            income: Number(register.totalIncome),
            expense: Number(register.totalExpense),
            net: Number(register.totalIncome) - Number(register.totalExpense),
            difference: Number(register.difference || 0),
            movementsCount: register.movements?.length || 0,
        }));
    }

    /**
     * Calcular comparación con período anterior
     */
    private async calculateComparisonPeriod(startDate: string, endDate: string) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.floor(
            (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
        );

        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - days);

        const prevRegisters = await this.cashRegisterRepo.find({
            where: {
                date: Between(prevStart, prevEnd),
            },
            relations: ['totals'],
        });

        const summary = this.calculateSummary(prevRegisters);

        return {
            period: {
                start: prevStart.toISOString().split('T')[0],
                end: prevEnd.toISOString().split('T')[0],
            },
            summary,
        };
    }

    // ============ HISTORIAL Y ESTADÍSTICAS ============

    /**
     * Obtener historial de cajas con paginación
     */
    async findAll(filters?: {
        page?: number;
        limit?: number;
        date?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{ data: CashRegisterWithNames[]; total: number }> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 10;
        const skip = (page - 1) * limit;

        const query = this.cashRegisterRepo
            .createQueryBuilder('register')
            .leftJoinAndSelect('register.movements', 'movements')
            .leftJoinAndSelect('register.openedBy', 'openedBy')
            .leftJoinAndSelect('register.closedBy', 'closedBy')
            .leftJoinAndSelect('register.totals', 'totals')
            .orderBy('register.date', 'DESC');

        // Filtro por día específico (tiene prioridad sobre el rango)
        if (filters?.date) {
            query.where('register.date = :date', { date: filters.date });
        } else if (filters?.startDate && filters?.endDate) {
            // Filtro por rango de fechas
            query.where('register.date BETWEEN :start AND :end', {
                start: filters.startDate,
                end: filters.endDate,
            });
        }

        // Obtener total de registros
        const total = await query.getCount();

        // Aplicar paginación
        query.skip(skip).take(limit);

        const data = await query.getMany();

        // Transformar cada caja para incluir 'name' en los usuarios
        const transformedData = data
            .map(register => this.transformCashRegisterResponse(register))
            .filter((register): register is CashRegisterWithNames => register !== null);

        return { data: transformedData, total };
    }

    /**
     * Obtener estadísticas de cajas
     */
    async getStats(startDate?: string, endDate?: string) {
        const result = await this.findAll({
            startDate,
            endDate,
            page: 1,
            limit: 10000, // Obtener todos los registros para estadísticas
        });

        const registers = result.data;

        const closedRegisters = registers.filter(
            (r) => r.status === CashRegisterStatus.CLOSED,
        );

        const totalIncome = closedRegisters.reduce(
            (sum, r) => sum + Number(r.totalIncome),
            0,
        );
        const totalExpense = closedRegisters.reduce(
            (sum, r) => sum + Number(r.totalExpense),
            0,
        );
        const totalDifferences = closedRegisters.reduce(
            (sum, r) => sum + Number(r.difference || 0),
            0,
        );

        return {
            totalRegisters: registers.length,
            closedRegisters: closedRegisters.length,
            openRegisters: registers.filter((r) => r.status === CashRegisterStatus.OPEN)
                .length,
            totalIncome,
            totalExpense,
            netCashFlow: totalIncome - totalExpense,
            totalDifferences,
            averageDifference:
                closedRegisters.length > 0 ? totalDifferences / closedRegisters.length : 0,
        };
    }

    /**
     * Obtener una caja por ID
     */
    async findOne(id: string): Promise<CashRegisterWithNames> {
        const cashRegister = await this.cashRegisterRepo.findOne({
            where: { id },
            relations: ['openedBy', 'closedBy', 'totals', 'totals.paymentMethod'],
        });

        if (!cashRegister) {
            throw new NotFoundException('Caja no encontrada');
        }

        // Cargar movimientos con JOINs para obtener datos calculados
        const movements = await this.cashMovementRepo
            .createQueryBuilder('movement')
            .leftJoinAndSelect('movement.createdBy', 'createdBy')
            .leftJoinAndSelect('movement.cashRegister', 'cashRegister')
            // Join con SalePayment para ingresos de ventas
            .leftJoin('sale_payments', 'sp', 'movement.referenceType = :saleType AND movement.referenceId = sp.id', { saleType: 'sale_payment' })
            .leftJoin('sales', 's', 'sp.sale_id = s.id')
            .leftJoin('payment_methods', 'pm_sale', 'sp.payment_method_id = pm_sale.id')
            // Join con Expense para egresos de gastos
            .leftJoin('expenses', 'e', 'movement.referenceType = :expenseType AND movement.referenceId = e.id', { expenseType: 'expense' })
            .leftJoin('payment_methods', 'pm_expense', 'e.payment_method_id = pm_expense.id')
            // Join con Purchase para egresos de compras
            .leftJoin('purchases', 'p', 'movement.referenceType = :purchaseType AND movement.referenceId = p.id', { purchaseType: 'purchase' })
            .leftJoin('payment_methods', 'pm_purchase', 'p.payment_method_id = pm_purchase.id')
            // Join con Income para ingresos de servicios
            .leftJoin('incomes', 'i', 'movement.referenceType = :incomeType AND movement.referenceId = i.id', { incomeType: 'income' })
            .leftJoin('payment_methods', 'pm_income', 'i.payment_method_id = pm_income.id')
            // Join con métodos de pago para movimientos manuales
            .leftJoin('payment_methods', 'pm_manual', 'movement.referenceType = :manualType AND movement.manual_payment_method_id = pm_manual.id', { manualType: 'manual' })
            .select([
                'movement.id',
                'movement.movementType',
                'movement.referenceType',
                'movement.referenceId',
                'movement.createdAt',
                'createdBy.id',
                'createdBy.firstName',
                'createdBy.lastName',
            ])
            // Mapear campos dinámicos - prioridad: sale_payment > expense > purchase > income > manual
            .addSelect('COALESCE(sp.amount, e.amount, p.total, i.amount, movement."manualAmount")', 'amount')
            .addSelect(`CASE 
                WHEN s.id IS NOT NULL THEN CONCAT('Venta ', s."saleNumber") 
                WHEN e.id IS NOT NULL THEN e.description 
                WHEN p.id IS NOT NULL THEN CONCAT('Compra ', p."purchaseNumber")
                WHEN i.id IS NOT NULL THEN i.description
                WHEN movement."referenceType" = 'manual' THEN movement."manualDescription"
                ELSE 'Movimiento' 
            END`, 'description')
            .addSelect('COALESCE(pm_sale.name, pm_expense.name, pm_purchase.name, pm_income.name, pm_manual.name)', 'paymentMethodName')
            .addSelect('COALESCE(pm_sale.code, pm_expense.code, pm_purchase.code, pm_income.code, pm_manual.code)', 'paymentMethodCode')
            .where('movement.cashRegister.id = :registerId', { registerId: cashRegister.id })
            .orderBy('movement.createdAt', 'DESC')
            .getRawMany();

        // Mapear resultados raw a objetos que el frontend pueda entender
        cashRegister.movements = movements.map(m => ({
            id: m.movement_id,
            movementType: m.movement_movementType,
            referenceType: m.movement_referenceType,
            referenceId: m.movement_referenceId,
            createdAt: m.movement_createdAt,
            createdBy: {
                id: m.createdBy_id,
                firstName: m.createdBy_firstName,
                lastName: m.createdBy_lastName,
                name: `${m.createdBy_firstName || ''} ${m.createdBy_lastName || ''}`.trim() || null,
            },
            // Campos calculados desde los JOINs
            amount: Number(m.amount),
            description: m.description,
            paymentMethod: {
                name: m.paymentMethodName,
                code: m.paymentMethodCode
            }
        })) as any;

        // cashRegister ya se validó que no es null arriba
        return this.transformCashRegisterResponseNonNull(cashRegister);
    }

    /**
     * Obtener estado de la caja (si está abierta y si es del día anterior)
     * Útil para mostrar alertas cuando la caja no fue cerrada el día anterior
     */
    async getCashStatus(): Promise<{
        hasOpenRegister: boolean;
        isFromPreviousDay: boolean;
        openRegister: CashRegister | null;
    }> {
        const openRegister = await this.getOpenRegister();

        if (!openRegister) {
            return { hasOpenRegister: false, isFromPreviousDay: false, openRegister: null };
        }

        const todayDate = getTodayLocalDate();
        const todayString = todayDate.toISOString().split('T')[0];

        // Normalizar la fecha de la caja a string YYYY-MM-DD
        let cashRegisterDateString: string;
        if (openRegister.date instanceof Date) {
            cashRegisterDateString = openRegister.date.toISOString().split('T')[0];
        } else {
            cashRegisterDateString = String(openRegister.date).split('T')[0];
        }

        return {
            hasOpenRegister: true,
            isFromPreviousDay: cashRegisterDateString !== todayString,
            openRegister,
        };
    }

    /**
     * Helper para agregar el campo 'name' a un objeto User.
     * TypeORM no serializa getters como 'fullName', así que lo hacemos manualmente.
     */
    private mapUserWithName(user: User | null): UserWithName | null {
        if (!user) return null;
        return {
            ...user,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || null,
        };
    }

    /**
     * Transformar un CashRegister para incluir 'name' en openedBy y closedBy
     * Versión que retorna null si el registro es null
     */
    private transformCashRegisterResponse(register: CashRegister | null): CashRegisterWithNames | null {
        if (!register) return null;
        return this.transformCashRegisterResponseNonNull(register);
    }

    /**
     * Transformar un CashRegister para incluir 'name' en openedBy y closedBy
     * Versión que asume que el registro no es null (para usar cuando se validó previamente)
     */
    private transformCashRegisterResponseNonNull(register: CashRegister): CashRegisterWithNames {
        return {
            ...register,
            openedBy: this.mapUserWithName(register.openedBy ?? null),
            closedBy: this.mapUserWithName(register.closedBy ?? null),
        };
    }
}

