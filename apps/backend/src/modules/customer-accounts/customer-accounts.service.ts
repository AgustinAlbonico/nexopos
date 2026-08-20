/**
 * Servicio de Cuentas Corrientes
 * Gestiona el CRUD de cuentas y movimientos de clientes
 */
import {
    Injectable,
    BadRequestException,
    forwardRef,
    Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, DataSource, EntityManager } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { CustomerAccount, AccountStatus } from './entities/customer-account.entity';
import { AccountMovement, MovementType } from './entities/account-movement.entity';
import { CreateChargeDto, CreatePaymentDto, UpdateAccountDto, AccountFiltersDto } from './dto';
import { CustomersService } from '../customers/customers.service';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { Sale, SaleStatus } from '../sales/entities/sale.entity';
import { Income } from '../incomes/entities/income.entity';
import { Customer } from '../customers/entities/customer.entity';

/**
 * Interfaz para estadísticas de cuentas corrientes
 */
export interface AccountStats {
    totalAccounts: number;
    activeAccounts: number;
    suspendedAccounts: number;
    totalDebtors: number;
    totalDebt: number;
    averageDebt: number;
    overdueAccounts: number;
    totalOverdue: number;
}

/**
 * Interfaz para resumen de estado de cuenta
 */
export interface AccountStatementSummary {
    totalCharges: number;
    totalPayments: number;
    currentBalance: number;
    customerPosition: 'customer_owes' | 'business_owes' | 'settled';
}

/**
 * Interfaz para alerta de deudor moroso
 */
export interface OverdueAlert {
    customerId: string;
    customerName: string;
    balance: number;
    daysOverdue: number;
    lastPaymentDate: Date | null;
}

/**
 * Respuesta paginada para cuentas
 */
export interface PaginatedAccounts {
    data: CustomerAccount[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/**
 * Respuesta paginada para movimientos (mejora #9)
 */
export interface PaginatedMovements {
    data: AccountMovement[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/**
 * Interfaz para transacciones pendientes
 */
export interface PendingTransactions {
    sales: Sale[];
    incomes: Income[];
}

@Injectable()
export class CustomerAccountsService {
    constructor(
        @InjectRepository(CustomerAccount)
        private readonly accountRepo: Repository<CustomerAccount>,
        @InjectRepository(AccountMovement)
        private readonly movementRepo: Repository<AccountMovement>,
        @InjectRepository(Sale)
        private readonly saleRepo: Repository<Sale>,
        @InjectRepository(Income)
        private readonly incomeRepo: Repository<Income>,
        private readonly customersService: CustomersService,
        @Inject(forwardRef(() => CashRegisterService))
        private readonly cashRegisterService: CashRegisterService,
        private readonly dataSource: DataSource,
    ) { }

    /**
     * Obtiene o crea una cuenta corriente para un cliente
     */
    async getOrCreateAccount(customerId: string): Promise<CustomerAccount> {
        let account = await this.accountRepo.findOne({
            where: { customerId },
            relations: ['customer'],
        });

        if (!account) {
            // Verificar que el cliente existe
            await this.customersService.findOne(customerId);

            account = this.accountRepo.create({
                customerId,
                balance: 0,
                creditLimit: 0,
                status: AccountStatus.ACTIVE,
                daysOverdue: 0,
            });

            await this.accountRepo.save(account);

            // Recargar con relaciones
            account = await this.accountRepo.findOneOrFail({
                where: { id: account.id },
                relations: ['customer'],
            });
        }

        return account;
    }

    /**
     * Crea un cargo en la cuenta (desde venta)
     * Mejora #4: Usa lock pesimista para evitar race conditions en concurrencia
     */
    async createCharge(customerId: string, dto: CreateChargeDto, userId?: string): Promise<AccountMovement> {
        // Crear movimiento dentro de una transacción con lock pesimista (mejora #4)
        return this.dataSource.transaction(async (manager) => {
            // Lock pesimista: bloquea la cuenta durante la transacción
            const account = await manager
                .createQueryBuilder(CustomerAccount, 'account')
                .setLock('pessimistic_write')
                .where('account.customerId = :customerId', { customerId })
                .getOne();

            // Si no existe, crear cuenta (fuera del lock para evitar deadlock)
            if (!account) {
                const newAccount = await this.getOrCreateAccount(customerId);
                return this.createCharge(customerId, dto, userId); // Reintentar con cuenta creada
            }

            // Verificar límite de crédito
            if (account.creditLimit > 0) {
                const newBalance = Number(account.balance) + dto.amount;
                if (newBalance > account.creditLimit) {
                    throw new BadRequestException(
                        `El cliente ha excedido su límite de crédito ($${account.creditLimit}). Saldo actual: $${account.balance}`
                    );
                }
            }

            // Verificar si está suspendido
            if (account.status === AccountStatus.SUSPENDED) {
                throw new BadRequestException('La cuenta del cliente está suspendida. No se pueden agregar cargos.');
            }

            const balanceBefore = Number(account.balance);
            const chargeAmount = Math.abs(dto.amount);
            const balanceAfter = balanceBefore + chargeAmount;

            const movement = manager.create(AccountMovement, {
                accountId: account.id,
                movementType: MovementType.CHARGE,
                amount: chargeAmount, // Positivo = débito
                balanceBefore,
                balanceAfter,
                description: dto.description,
                referenceType: dto.saleId ? 'sale' : 'manual',
                referenceId: dto.saleId || null,
                notes: dto.notes || null,
                createdById: userId || null,
            });

            await manager.save(movement);

            // Actualizar saldo de la cuenta
            account.balance = balanceAfter;
            account.lastPurchaseDate = new Date();
            await manager.save(account);

            return movement;
        });
    }

    /**
     * Registra un pago del cliente
     * Si el pago cubre toda la deuda, marca automáticamente las transacciones pendientes como completadas
     * Mejora #1: Registro de caja dentro de la transacción (no setImmediate)
     * Mejora #4: Usa lock pesimista para evitar race conditions
     */
    async createPayment(customerId: string, dto: CreatePaymentDto, userId?: string): Promise<AccountMovement> {
        // Crear movimiento dentro de una transacción con lock pesimista (mejora #4)
        return this.dataSource.transaction(async (manager) => {
            // Lock pesimista: bloquea la cuenta durante la transacción
            const account = await manager
                .createQueryBuilder(CustomerAccount, 'account')
                .setLock('pessimistic_write')
                .where('account.customerId = :customerId', { customerId })
                .getOne();

            // Cargar datos del cliente si existe (separado para evitar error FOR UPDATE con outer join)
            if (account) {
                const customer = await manager.getRepository(Customer).findOne({ where: { id: customerId } });
                if (customer) {
                    account.customer = customer;
                }
            }

            if (!account) {
                throw new BadRequestException('Cuenta no encontrada');
            }

            const currentBalance = Number(account.balance);

            // Validar que hay deuda pendiente
            if (currentBalance <= 0) {
                throw new BadRequestException('El cliente no tiene deuda pendiente');
            }

            // Validar que el pago no excede la deuda
            if (dto.amount > currentBalance) {
                throw new BadRequestException(
                    `El pago ($${dto.amount}) excede la deuda pendiente ($${currentBalance})`
                );
            }

            const balanceBefore = currentBalance;
            const paymentAmount = Math.abs(dto.amount);
            const balanceAfter = balanceBefore - paymentAmount;
            const isFullPayment = balanceAfter === 0;

            const movement = manager.create(AccountMovement, {
                accountId: account.id,
                movementType: MovementType.PAYMENT,
                amount: -paymentAmount, // Negativo = crédito
                balanceBefore,
                balanceAfter,
                description: dto.description || 'Pago recibido',
                referenceType: 'payment',
                paymentMethodId: dto.paymentMethodId,
                notes: dto.notes || null,
                createdById: userId || null,
            });

            await manager.save(movement);

            // Actualizar saldo de la cuenta
            account.balance = balanceAfter;
            account.lastPaymentDate = new Date();

            // Si saldo = 0, resetear días de mora y marcar transacciones como completadas
            if (isFullPayment) {
                account.daysOverdue = 0;
                if (account.status === AccountStatus.SUSPENDED) {
                    account.status = AccountStatus.ACTIVE;
                }

                // Marcar todas las ventas pendientes como COMPLETED (sin registrar en caja)
                await manager
                    .createQueryBuilder()
                    .update(Sale)
                    .set({
                        status: SaleStatus.COMPLETED,
                        isOnAccount: false
                    })
                    .where('customerId = :customerId', { customerId })
                    .andWhere('status = :status', { status: SaleStatus.PENDING })
                    .andWhere('isOnAccount = :isOnAccount', { isOnAccount: true })
                    .execute();

                // Marcar todos los ingresos pendientes como pagados
                await manager
                    .createQueryBuilder()
                    .update(Income)
                    .set({ isPaid: true })
                    .where('customerId = :customerId', { customerId })
                    .andWhere('isPaid = :isPaid', { isPaid: false })
                    .andWhere('isOnAccount = :isOnAccount', { isOnAccount: true })
                    .execute();

                console.log(`[CustomerAccounts] Pago completo de ${customerId}. Ventas e ingresos pendientes marcados como completados.`);
            }

            await manager.save(account);

            // Mejora #1: Registrar el pago en caja DENTRO de la transacción
            // Si falla, se hace rollback completo (antes usaba setImmediate fuera)
            try {
                await this.cashRegisterService.registerAccountPayment(
                    {
                        accountMovementId: movement.id,
                        customerId,
                        amount: paymentAmount,
                        paymentMethodId: dto.paymentMethodId,
                        description: `Pago CC - ${account.customer?.firstName || 'Cliente'} ${account.customer?.lastName || ''}`.trim(),
                    },
                    userId || 'system',
                );
            } catch (cashError) {
                // Si no hay caja abierta, permitir el pago pero loguear advertencia
                // No hacemos rollback para no bloquear pagos si la caja no está abierta
                console.warn(`[CustomerAccounts] Pago registrado pero sin ingreso en caja: ${(cashError as Error).message}`);
            }

            return movement;
        });
    }

    /**
     * Aplica un recargo (interés) a la cuenta del cliente
     * El recargo puede ser porcentual (sobre el saldo actual) o fijo
     * Mejora #4: Usa lock pesimista para evitar race conditions
     */
    async applySurcharge(
        customerId: string,
        dto: { surchargeType: 'percentage' | 'fixed'; value: number; description?: string },
        userId?: string,
    ): Promise<AccountMovement> {
        // Crear movimiento dentro de una transacción con lock pesimista (mejora #4)
        return this.dataSource.transaction(async (manager) => {
            // Lock pesimista: bloquea la cuenta durante la transacción
            const account = await manager
                .createQueryBuilder(CustomerAccount, 'account')
                .setLock('pessimistic_write')
                .where('account.customerId = :customerId', { customerId })
                .getOne();

            if (!account) {
                throw new BadRequestException('Cuenta no encontrada');
            }

            const currentBalance = Number(account.balance);

            // Validar que hay deuda pendiente
            if (currentBalance <= 0) {
                throw new BadRequestException('El cliente no tiene deuda pendiente para aplicar recargo');
            }

            // Calcular el monto del recargo
            let surchargeAmount: number;
            let description: string;

            if (dto.surchargeType === 'percentage') {
                surchargeAmount = Math.round((currentBalance * (dto.value / 100)) * 100) / 100;
                description = dto.description || `Recargo por mora (${dto.value}%)`;
            } else {
                surchargeAmount = dto.value;
                description = dto.description || `Recargo por mora ($${dto.value.toFixed(2)})`;
            }

            const balanceBefore = currentBalance;
            const balanceAfter = balanceBefore + surchargeAmount;

            const movement = manager.create(AccountMovement, {
                accountId: account.id,
                movementType: MovementType.INTEREST,
                amount: surchargeAmount, // Positivo = débito
                balanceBefore,
                balanceAfter,
                description,
                referenceType: 'surcharge',
                notes: dto.surchargeType === 'percentage'
                    ? `Porcentaje aplicado: ${dto.value}% sobre saldo de $${balanceBefore.toFixed(2)}`
                    : `Monto fijo aplicado`,
                createdById: userId || null,
            });

            await manager.save(movement);

            // Actualizar saldo de la cuenta
            account.balance = balanceAfter;
            await manager.save(account);

            return movement;
        });
    }

    /**
     * Crea un ajuste en la cuenta (para reversiones, correcciones, etc.)
     * Mejora #3: Usado para revertir cargos cuando se cancela una venta
     */
    async createAdjustment(
        customerId: string,
        dto: {
            amount: number;
            description: string;
            referenceType?: string;
            referenceId?: string;
            notes?: string;
        },
        userId?: string,
    ): Promise<AccountMovement> {
        return this.dataSource.transaction((manager) => this.createAdjustmentWithManager(customerId, dto, userId, manager));
    }

    async createAdjustmentWithManager(
        customerId: string,
        dto: {
            amount: number;
            description: string;
            referenceType?: string;
            referenceId?: string;
            notes?: string;
        },
        userId: string | undefined,
        manager: EntityManager,
    ): Promise<AccountMovement> {
            // Lock pesimista para evitar race conditions
            const account = await manager
                .createQueryBuilder(CustomerAccount, 'account')
                .setLock('pessimistic_write')
                .where('account.customerId = :customerId', { customerId })
                .getOne();

            if (!account) {
                throw new BadRequestException('Cuenta no encontrada');
            }

            const currentBalance = Number(account.balance);
            const adjustmentAmount = dto.amount; // Puede ser positivo o negativo
            const balanceAfter = currentBalance + adjustmentAmount;

            const movement = manager.create(AccountMovement, {
                accountId: account.id,
                movementType: MovementType.ADJUSTMENT,
                amount: adjustmentAmount,
                balanceBefore: currentBalance,
                balanceAfter,
                description: dto.description,
                referenceType: dto.referenceType || 'adjustment',
                referenceId: dto.referenceId || null,
                notes: dto.notes || null,
                createdById: userId || null,
            });

            await manager.save(movement);

            // Actualizar saldo de la cuenta
            account.balance = balanceAfter;
            await manager.save(account);

            console.log(`[CustomerAccounts] Ajuste registrado: $${adjustmentAmount} para cliente ${customerId}`);

            return movement;
    }

    /**
     * Obtiene el estado de cuenta de un cliente
     * Mejora #9: Soporta paginación de movimientos
     */
    async getAccountStatement(customerId: string, page = 1, limit = 50) {
        const account = await this.getOrCreateAccount(customerId);
        const skip = (page - 1) * limit;

        // Obtener movimientos paginados
        const [movements, totalMovements] = await this.movementRepo.findAndCount({
            where: { accountId: account.id },
            relations: ['createdBy', 'paymentMethod'],
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

        // Calcular totales usando SQL agregado para eficiencia
        const totals = await this.movementRepo
            .createQueryBuilder('movement')
            .select('movement.movementType', 'type')
            .addSelect('SUM(movement.amount)', 'total')
            .where('movement.accountId = :accountId', { accountId: account.id })
            .groupBy('movement.movementType')
            .getRawMany();

        const totalCharges = Number(totals.find(t => t.type === MovementType.CHARGE)?.total || 0);
        const totalPayments = Math.abs(Number(totals.find(t => t.type === MovementType.PAYMENT)?.total || 0));
        const currentBalance = Number(account.balance);

        const summary: AccountStatementSummary = {
            totalCharges,
            totalPayments,
            currentBalance,
            customerPosition: this.getCustomerPosition(currentBalance),
        };

        return {
            account,
            movements,
            summary,
            pagination: {
                total: totalMovements,
                page,
                limit,
                totalPages: Math.ceil(totalMovements / limit),
            },
        };
    }

    /**
     * Lista todas las cuentas con filtros y paginación
     */
    async findAll(filters: AccountFiltersDto = {}): Promise<PaginatedAccounts> {
        const { page = 1, limit = 10, status, hasDebt, isOverdue, search } = filters;
        const skip = (page - 1) * limit;

        const query = this.accountRepo.createQueryBuilder('account')
            .leftJoinAndSelect('account.customer', 'customer')
            .orderBy('account.balance', 'DESC');

        if (status) {
            query.andWhere('account.status = :status', { status });
        }

        if (hasDebt) {
            query.andWhere('account.balance > 0');
        }

        if (isOverdue) {
            query.andWhere('account.daysOverdue > 0');
        }

        if (search) {
            query.andWhere(
                '(customer.firstName ILIKE :search OR customer.lastName ILIKE :search)',
                { search: `%${search}%` }
            );
        }

        const [data, total] = await query
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Obtiene lista de clientes deudores
     */
    async getDebtors(): Promise<CustomerAccount[]> {
        return this.accountRepo.find({
            where: { balance: MoreThan(0) },
            relations: ['customer'],
            order: { balance: 'DESC' },
        });
    }

    /**
     * Actualiza límite de crédito y/o estado de una cuenta
     */
    async updateAccount(customerId: string, dto: UpdateAccountDto): Promise<CustomerAccount> {
        const account = await this.getOrCreateAccount(customerId);

        if (dto.creditLimit !== undefined) {
            account.creditLimit = dto.creditLimit;
        }

        if (dto.status !== undefined) {
            account.status = dto.status;
        }

        return this.accountRepo.save(account);
    }

    /**
     * Suspende la cuenta de un cliente
     */
    async suspendAccount(customerId: string): Promise<CustomerAccount> {
        const account = await this.getOrCreateAccount(customerId);
        account.status = AccountStatus.SUSPENDED;
        return this.accountRepo.save(account);
    }

    /**
     * Reactiva la cuenta de un cliente
     */
    async activateAccount(customerId: string): Promise<CustomerAccount> {
        const account = await this.getOrCreateAccount(customerId);
        account.status = AccountStatus.ACTIVE;
        return this.accountRepo.save(account);
    }

    /**
     * Obtiene estadísticas globales de cuentas corrientes
     * Mejora #5: Usa SQL agregado en vez de cargar todas las cuentas en memoria
     */
    async getStats(): Promise<AccountStats> {
        const result = await this.dataSource.query(`
            SELECT 
                COUNT(*)::int as "totalAccounts",
                COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0)::int as "activeAccounts",
                COALESCE(SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END), 0)::int as "suspendedAccounts",
                COALESCE(SUM(CASE WHEN balance > 0 THEN 1 ELSE 0 END), 0)::int as "totalDebtors",
                COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0)::numeric as "totalDebt",
                COALESCE(SUM(CASE WHEN "daysOverdue" > 0 THEN 1 ELSE 0 END), 0)::int as "overdueAccounts",
                COALESCE(SUM(CASE WHEN "daysOverdue" > 0 AND balance > 0 THEN balance ELSE 0 END), 0)::numeric as "totalOverdue"
            FROM customer_accounts
            WHERE "deletedAt" IS NULL
        `);

        const stats = result[0] || {};
        const totalDebt = Number(stats.totalDebt || 0);
        const totalDebtors = Number(stats.totalDebtors || 0);

        return {
            totalAccounts: Number(stats.totalAccounts || 0),
            activeAccounts: Number(stats.activeAccounts || 0),
            suspendedAccounts: Number(stats.suspendedAccounts || 0),
            totalDebtors,
            totalDebt,
            averageDebt: totalDebtors > 0 ? totalDebt / totalDebtors : 0,
            overdueAccounts: Number(stats.overdueAccounts || 0),
            totalOverdue: Number(stats.totalOverdue || 0),
        };
    }

    /**
     * Obtiene alertas de deudores morosos
     * (para mostrar al inicio de cada mes)
     */
    async getOverdueAlerts(): Promise<OverdueAlert[]> {
        const overdueAccounts = await this.accountRepo.find({
            where: {
                balance: MoreThan(0),
                daysOverdue: MoreThan(0),
            },
            relations: ['customer'],
            order: { daysOverdue: 'DESC' },
        });

        return overdueAccounts.map(account => ({
            customerId: account.customerId,
            customerName: account.customer
                ? `${account.customer.firstName} ${account.customer.lastName}`
                : 'Cliente desconocido',
            balance: Number(account.balance),
            daysOverdue: account.daysOverdue,
            lastPaymentDate: account.lastPaymentDate,
        }));
    }

    /**
     * Actualiza días de mora de todas las cuentas
     * Se ejecuta automáticamente todos los días a las 3:00 AM
     * Mejora #6: Usa SQL bulk update en vez de loop individual
     * Mejora #8: Usa paymentTermDays para cálculo real de mora
     */
    @Cron('0 3 * * *') // 3:00 AM todos los días
    async updateOverdueDays(): Promise<void> {
        console.log('[CustomerAccounts] Actualizando días de mora con bulk update...');

        // Mejora #6: Bulk update usando SQL nativo
        // Mejora #8: Calcula mora considerando paymentTermDays
        // días de mora = días desde último cargo - plazo de pago (solo si es positivo)
        const updateResult = await this.dataSource.query(`
            WITH last_charges AS (
                SELECT DISTINCT ON ("accountId")
                    "accountId" as account_id,
                    "createdAt" as last_charge_date
                FROM account_movements
                WHERE "movementType" = 'charge' AND "deletedAt" IS NULL
                ORDER BY "accountId", "createdAt" DESC
            )
            UPDATE customer_accounts ca
            SET 
                "daysOverdue" = GREATEST(0, 
                    EXTRACT(DAY FROM NOW() - lc.last_charge_date)::int - ca."paymentTermDays"
                ),
                status = CASE 
                    WHEN EXTRACT(DAY FROM NOW() - lc.last_charge_date)::int - ca."paymentTermDays" > 30 
                         AND ca.status = 'active'
                    THEN 'suspended' 
                    ELSE ca.status 
                END,
                "updatedAt" = NOW()
            FROM last_charges lc
            WHERE ca.id = lc.account_id
              AND ca.balance > 0
              AND ca."deletedAt" IS NULL
            RETURNING ca.id, ca."daysOverdue", ca.status
        `);

        // Contar cuentas suspendidas
        const suspendedCount = updateResult.filter((r: { status: string }) => r.status === 'suspended').length;
        if (suspendedCount > 0) {
            console.log(`[CustomerAccounts] ${suspendedCount} cuenta(s) suspendida(s) por mora > 30 días`);
        }

        console.log(`[CustomerAccounts] Actualizadas ${updateResult.length} cuentas con días de mora`);
    }

    /**
     * Verifica deudores morosos al inicio de cada mes
     * Se ejecuta el día 1 de cada mes a las 8:00 AM
     */
    @Cron('0 8 1 * *') // 8:00 AM del día 1 de cada mes
    async checkOverdueAccountsMonthly(): Promise<void> {
        console.log('[CustomerAccounts] Verificación mensual de morosos...');

        const overdueAlerts = await this.getOverdueAlerts();

        if (overdueAlerts.length > 0) {
            console.log(`[CustomerAccounts] Hay ${overdueAlerts.length} clientes morosos:`);
            overdueAlerts.forEach(alert => {
                console.log(`  - ${alert.customerName}: $${alert.balance} (${alert.daysOverdue} días de mora)`);
            });
        } else {
            console.log('[CustomerAccounts] No hay clientes morosos');
        }
    }

    /**
     * Determina la posición del cliente según el balance
     */
    private getCustomerPosition(balance: number): 'customer_owes' | 'business_owes' | 'settled' {
        if (balance > 0) return 'customer_owes';
        if (balance < 0) return 'business_owes';
        return 'settled';
    }

    /**
     * Obtiene las transacciones pendientes de un cliente (ventas e ingresos a cuenta corriente sin pagar)
     */
    async getPendingTransactions(customerId: string): Promise<PendingTransactions> {
        // Obtener ventas pendientes (status PENDING) del cliente
        const sales = await this.saleRepo.find({
            where: {
                customerId,
                status: SaleStatus.PENDING,
                isOnAccount: true,
            },
            relations: ['items', 'items.product', 'customer'],
            order: { saleDate: 'DESC' },
        });

        // Obtener ingresos pendientes (isPaid = false y isOnAccount = true) del cliente
        const incomes = await this.incomeRepo.find({
            where: {
                customerId,
                isPaid: false,
                isOnAccount: true,
            },
            relations: ['category', 'customer'],
            order: { incomeDate: 'DESC' },
        });

        return { sales, incomes };
    }

    /**
     * Sincroniza cargos faltantes de ventas a cuenta corriente que nunca se registraron
     * Retorna la cantidad de cargos creados y el monto total
     */
    async syncMissingCharges(customerId: string, userId?: string): Promise<{
        chargesCreated: number;
        totalAmount: number;
        sales: Array<{ saleId: string; saleNumber: string; amount: number }>;
    }> {
        const account = await this.getOrCreateAccount(customerId);

        // Obtener ventas pendientes a cuenta corriente
        const pendingSales = await this.saleRepo.find({
            where: {
                customerId,
                status: SaleStatus.PENDING,
                isOnAccount: true,
            },
            order: { saleDate: 'ASC' }, // Ordenar por fecha para mantener cronología correcta
        });

        // Obtener IDs de ventas que YA tienen un cargo registrado
        const existingCharges = await this.movementRepo.find({
            where: {
                accountId: account.id,
                movementType: MovementType.CHARGE,
                referenceType: 'sale',
            },
            select: ['referenceId'],
        });

        const registeredSaleIds = new Set(existingCharges.map(m => m.referenceId));

        // Filtrar ventas que NO tienen cargo
        const salesWithoutCharge = pendingSales.filter(sale => !registeredSaleIds.has(sale.id));

        if (salesWithoutCharge.length === 0) {
            return { chargesCreated: 0, totalAmount: 0, sales: [] };
        }

        // Crear cargos para las ventas faltantes dentro de una transacción
        const result = await this.dataSource.transaction(async (manager) => {
            let currentBalance = Number(account.balance);
            const createdCharges: Array<{ saleId: string; saleNumber: string; amount: number }> = [];

            for (const sale of salesWithoutCharge) {
                const chargeAmount = Number(sale.total);
                const balanceBefore = currentBalance;
                const balanceAfter = currentBalance + chargeAmount;

                // Crear el movimiento de cargo
                const movement = manager.create(AccountMovement, {
                    accountId: account.id,
                    movementType: MovementType.CHARGE,
                    amount: chargeAmount,
                    balanceBefore,
                    balanceAfter,
                    description: `Venta ${sale.saleNumber}`,
                    referenceType: 'sale',
                    referenceId: sale.id,
                    notes: 'Cargo generado por sincronización de datos históricos',
                    createdById: userId || null,
                });

                await manager.save(movement);

                currentBalance = balanceAfter;
                createdCharges.push({
                    saleId: sale.id,
                    saleNumber: sale.saleNumber,
                    amount: chargeAmount,
                });
            }

            // Actualizar el saldo final de la cuenta
            account.balance = currentBalance;
            await manager.save(account);

            return createdCharges;
        });

        const totalAmount = result.reduce((sum, c) => sum + c.amount, 0);

        console.log(`[CustomerAccounts] Sincronizados ${result.length} cargos para cliente ${customerId}. Total: $${totalAmount}`);

        return {
            chargesCreated: result.length,
            totalAmount,
            sales: result,
        };
    }
}

