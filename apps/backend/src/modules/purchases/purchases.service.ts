/**
 * Servicio de Compras
 * Gestiona el CRUD de compras con integración a inventario y gastos
 */
import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Like, EntityManager } from 'typeorm';
import { Purchase, PurchaseStatus } from './entities/purchase.entity';
import { PurchaseItem } from './entities/purchase-item.entity';
import {
    CreatePurchaseDto,
    UpdatePurchaseDto,
    PurchaseFiltersDto,
} from './dto';
import { InventoryService } from '../inventory/inventory.service';
import { ProductsService } from '../products/products.service';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { parseLocalDate } from '../../common/utils/date.utils';
import { StockMovementType, StockMovementSource } from '../inventory/entities/stock-movement.entity';
import { AuditService } from '../audit/audit.service';
import { AuditEntityType, AuditAction } from '../audit/enums';

export interface PurchaseStats {
    totalPurchases: number;
    totalAmount: number;
    totalPaid: number;
    totalPending: number;
    purchasesByStatus: Record<PurchaseStatus, number>;
}

export interface PaginatedPurchases {
    data: Purchase[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

@Injectable()
export class PurchasesService {
    constructor(
        @InjectRepository(Purchase)
        private readonly purchaseRepo: Repository<Purchase>,
        @InjectRepository(PurchaseItem)
        private readonly purchaseItemRepo: Repository<PurchaseItem>,
        private readonly inventoryService: InventoryService,
        private readonly productsService: ProductsService,
        private readonly cashRegisterService: CashRegisterService,
        private readonly suppliersService: SuppliersService,
        private readonly dataSource: DataSource,
        private readonly auditService: AuditService,
    ) { }

    /**
     * Crea una nueva compra
     */
    async create(dto: CreatePurchaseDto, userId?: string): Promise<Purchase> {
        await this.ensureOpenCashRegisterForPaidPurchase(dto.status);

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            await this.validatePurchaseItems(dto.items);

            // Generar número de compra (transaccional para evitar race conditions)
            const purchaseNumber = await this.generatePurchaseNumberTransactional(queryRunner.manager);

            // Calcular subtotal y total
            const { subtotal, total } = this.calculatePurchaseTotals(dto.items, dto.tax, dto.discount);

            // Validar y obtener proveedor si se proporciona supplierId
            const supplierId = await this.resolveSupplierId(dto.supplierId);

            // Crear compra
            const purchase = this.purchaseRepo.create({
                purchaseNumber,
                supplierId,
                providerName: dto.providerName,
                providerDocument: dto.providerDocument ?? null,
                providerPhone: dto.providerPhone ?? null,
                purchaseDate: parseLocalDate(dto.purchaseDate),
                subtotal,
                tax: dto.tax ?? 0,
                discount: dto.discount ?? 0,
                total,
                status: dto.status ?? PurchaseStatus.PENDING,
                paymentMethodId: dto.paymentMethodId ?? null,
                paidAt: dto.paidAt ? parseLocalDate(dto.paidAt) : null,
                invoiceNumber: dto.invoiceNumber ?? null,
                notes: dto.notes ?? null,
                createdById: userId ?? null,
            });

            // Guardar compra
            const savedPurchase = await queryRunner.manager.save(purchase);

            // Crear items de compra
            const purchaseItems = this.buildPurchaseItems(savedPurchase.id, dto.items);
            await queryRunner.manager.save(purchaseItems);

            // Si se marca como pagada, actualizar inventario y registrar en caja
            await this.processPaidPurchaseIfNeeded(dto, savedPurchase, queryRunner.manager, userId);

            // Cargar la compra con relaciones usando el manager de la transacción
            const result = await queryRunner.manager.findOne(Purchase, {
                where: { id: savedPurchase.id },
                relations: ['items', 'items.product', 'createdBy', 'paymentMethod'],
            });

            if (!result) {
                throw new NotFoundException(`Compra con ID ${savedPurchase.id} no encontrada`);
            }

            await queryRunner.commitTransaction();
            await queryRunner.release();

            // Log de auditoría (fuera de la transacción)
            if (userId) {
                await this.auditService.logSilent({
                    entityType: AuditEntityType.PURCHASE,
                    entityId: result.id,
                    action: AuditAction.CREATE,
                    userId,
                    newValues: {
                        purchaseNumber: result.purchaseNumber,
                        total: result.total,
                        status: result.status,
                        providerName: result.providerName,
                    },
                    description: AuditService.generateDescription(
                        AuditAction.CREATE,
                        AuditEntityType.PURCHASE,
                        result.purchaseNumber
                    ),
                });
            }

            return result;
        } catch (err) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            await queryRunner.release();
            throw err;
        }
    }

    private async ensureOpenCashRegisterForPaidPurchase(status?: PurchaseStatus): Promise<void> {
        if (status !== PurchaseStatus.PAID) return;

        const openCashRegister = await this.cashRegisterService.getOpenRegister();
        if (!openCashRegister) {
            throw new BadRequestException(
                'No hay caja abierta. Debe abrir la caja antes de registrar compras pagadas.',
            );
        }
    }

    private async validatePurchaseItems(items: Array<{ productId: string }>): Promise<void> {
        for (const item of items) {
            await this.productsService.findOne(item.productId);
        }
    }

    private calculatePurchaseTotals(
        items: Array<{ quantity: number; unitPrice: number }>,
        tax?: number,
        discount?: number,
    ): { subtotal: number; total: number } {
        const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        const total = subtotal + (tax || 0) - (discount || 0);
        return { subtotal, total };
    }

    private async resolveSupplierId(supplierId?: string): Promise<string | null> {
        if (!supplierId) return null;

        const supplier = await this.suppliersService.findOne(supplierId);
        return supplier?.id ?? null;
    }

    private buildPurchaseItems(
        purchaseId: string,
        items: Array<{ productId: string; quantity: number; unitPrice: number; notes?: string }>,
    ): PurchaseItem[] {
        return items.map(itemDto =>
            this.purchaseItemRepo.create({
                purchaseId,
                productId: itemDto.productId,
                quantity: itemDto.quantity,
                unitPrice: itemDto.unitPrice,
                subtotal: itemDto.quantity * itemDto.unitPrice,
                notes: itemDto.notes ?? null,
            }),
        );
    }

    private async processPaidPurchaseIfNeeded(
        dto: CreatePurchaseDto,
        savedPurchase: Purchase,
        manager: Repository<Purchase>['manager'],
        userId?: string,
    ): Promise<void> {
        if (dto.status !== PurchaseStatus.PAID) return;

        const purchaseWithItems = await manager.findOne(Purchase, {
            where: { id: savedPurchase.id },
            relations: ['items', 'items.product'],
        });

        if (!purchaseWithItems) return;

        await this.updateInventoryFromPurchase(purchaseWithItems);
        savedPurchase.inventoryUpdated = true;
        savedPurchase.paidAt = savedPurchase.paidAt ?? new Date();
        await manager.save(savedPurchase);

        if (!dto.paymentMethodId) return;

        await this.cashRegisterService.registerPurchase(
            {
                purchaseId: savedPurchase.id,
                total: savedPurchase.total,
                paymentMethodId: dto.paymentMethodId,
            },
            userId || 'system',
        );
    }

    /**
     * Obtiene compras con filtros y paginación
     */
    async findAll(filters: PurchaseFiltersDto): Promise<PaginatedPurchases> {
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 10;
        const skip = (page - 1) * limit;

        const query = this.purchaseRepo
            .createQueryBuilder('purchase')
            .leftJoinAndSelect('purchase.items', 'items')
            .leftJoinAndSelect('items.product', 'product')
            .leftJoinAndSelect('purchase.createdBy', 'user')
            .leftJoinAndSelect('purchase.paymentMethod', 'paymentMethod')
            .where('purchase.deletedAt IS NULL')
            .orderBy('purchase.createdAt', 'DESC');

        // Aplicar filtros
        if (filters.providerName) {
            query.andWhere('purchase.providerName ILIKE :provider', {
                provider: `%${filters.providerName}%`,
            });
        }

        if (filters.status) {
            query.andWhere('purchase.status = :status', { status: filters.status });
        }

        if (filters.startDate && filters.endDate) {
            query.andWhere('purchase.purchaseDate BETWEEN :start AND :end', {
                start: filters.startDate,
                end: filters.endDate,
            });
        } else if (filters.startDate) {
            query.andWhere('purchase.purchaseDate >= :start', {
                start: filters.startDate,
            });
        } else if (filters.endDate) {
            query.andWhere('purchase.purchaseDate <= :end', {
                end: filters.endDate,
            });
        }

        if (filters.invoiceNumber) {
            query.andWhere('purchase.invoiceNumber ILIKE :invoice', {
                invoice: `%${filters.invoiceNumber}%`,
            });
        }

        if (filters.productId) {
            query.andWhere('items.productId = :productId', {
                productId: filters.productId,
            });
        }

        if (filters.search) {
            query.andWhere(
                '(purchase.purchaseNumber ILIKE :search OR purchase.providerName ILIKE :search OR purchase.invoiceNumber ILIKE :search)',
                { search: `%${filters.search}%` }
            );
        }

        // Ordenamiento
        const sortBy = filters.sortBy ?? 'purchaseDate';
        const order = filters.order ?? 'DESC';
        query.orderBy(`purchase.${sortBy}`, order);

        // Obtener total y datos paginados
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
     * Obtiene una compra por ID
     */
    async findOne(id: string): Promise<Purchase> {
        const purchase = await this.purchaseRepo.findOne({
            where: { id },
            relations: ['items', 'items.product', 'createdBy', 'paymentMethod'],
        });

        if (!purchase) {
            throw new NotFoundException(`Compra con ID ${id} no encontrada`);
        }

        return purchase;
    }

    /**
     * Actualiza una compra
     */
    async update(id: string, dto: UpdatePurchaseDto): Promise<Purchase> {
        const purchase = await this.findOne(id);

        if (purchase.status === PurchaseStatus.PAID) {
            throw new BadRequestException('No se puede modificar una compra ya pagada');
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Actualizar campos
            if (dto.providerName !== undefined) purchase.providerName = dto.providerName;
            if (dto.providerDocument !== undefined) purchase.providerDocument = dto.providerDocument ?? null;
            if (dto.providerPhone !== undefined) purchase.providerPhone = dto.providerPhone ?? null;
            if (dto.invoiceNumber !== undefined) purchase.invoiceNumber = dto.invoiceNumber ?? null;
            if (dto.notes !== undefined) purchase.notes = dto.notes ?? null;
            if (dto.paymentMethodId !== undefined) purchase.paymentMethodId = dto.paymentMethodId ?? null;

            // Actualizar impuesto/descuento y recalcular total
            if (dto.tax !== undefined) purchase.tax = dto.tax;
            if (dto.discount !== undefined) purchase.discount = dto.discount;
            purchase.total = purchase.subtotal + purchase.tax - purchase.discount;

            // Si cambia a PAID y no se ha actualizado inventario
            if (dto.status === PurchaseStatus.PAID && !purchase.inventoryUpdated) {
                await this.updateInventoryFromPurchase(purchase);
                purchase.inventoryUpdated = true;
                purchase.paidAt = dto.paidAt ? parseLocalDate(dto.paidAt) : new Date();
            }

            if (dto.status !== undefined) purchase.status = dto.status;

            await queryRunner.manager.save(purchase);
            await queryRunner.commitTransaction();

            return this.findOne(id);
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Elimina una compra (soft delete)
     */
    async remove(id: string, userId?: string): Promise<{ message: string }> {
        const purchase = await this.findOne(id);

        if (purchase.status === PurchaseStatus.PAID) {
            throw new BadRequestException(
                'No se puede eliminar una compra ya pagada (el inventario fue actualizado)'
            );
        }

        await this.purchaseRepo.softDelete(id);

        // Log de auditoría
        if (userId) {
            await this.auditService.logSilent({
                entityType: AuditEntityType.PURCHASE,
                entityId: id,
                action: AuditAction.DELETE,
                userId,
                previousValues: {
                    purchaseNumber: purchase.purchaseNumber,
                    total: purchase.total,
                    status: purchase.status,
                },
                description: AuditService.generateDescription(
                    AuditAction.DELETE,
                    AuditEntityType.PURCHASE,
                    purchase.purchaseNumber
                ),
            });
        }

        return { message: 'Compra eliminada' };
    }

    /**
     * Marca una compra como pagada y actualiza inventario
     */
    async markAsPaid(id: string, paymentMethodId: string, userId: string): Promise<Purchase> {
        // Validar que haya caja abierta
        const openCashRegister = await this.cashRegisterService.getOpenRegister();
        if (!openCashRegister) {
            throw new BadRequestException(
                'No hay caja abierta. Debe abrir la caja antes de marcar compras como pagadas.'
            );
        }

        const purchase = await this.findOne(id);

        if (purchase.status === PurchaseStatus.PAID) {
            throw new BadRequestException('La compra ya está pagada');
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Actualizar inventario si no se ha hecho
            if (!purchase.inventoryUpdated) {
                await this.updateInventoryFromPurchase(purchase);
                purchase.inventoryUpdated = true;
            }

            purchase.status = PurchaseStatus.PAID;
            purchase.paidAt = new Date();
            purchase.paymentMethodId = paymentMethodId;

            await queryRunner.manager.save(purchase);

            // Registrar egreso en caja
            await this.cashRegisterService.registerPurchase(
                {
                    purchaseId: purchase.id,
                    total: purchase.total,
                    paymentMethodId: paymentMethodId
                },
                userId
            );

            await queryRunner.commitTransaction();

            // Log de auditoría
            await this.auditService.logSilent({
                entityType: AuditEntityType.PURCHASE,
                entityId: id,
                action: AuditAction.PAY,
                userId,
                previousValues: { status: PurchaseStatus.PENDING },
                newValues: { status: PurchaseStatus.PAID, paidAt: purchase.paidAt },
                description: AuditService.generateDescription(
                    AuditAction.PAY,
                    AuditEntityType.PURCHASE,
                    purchase.purchaseNumber
                ),
            });

            return this.findOne(id);
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Actualiza inventario desde una compra
     * @param purchase - Objeto Purchase con items cargados
     */
    private async updateInventoryFromPurchase(purchase: Purchase): Promise<void> {
        // purchaseDate puede ser Date o string dependiendo de cómo venga de la DB
        const dateString = typeof purchase.purchaseDate === 'string'
            ? purchase.purchaseDate
            : purchase.purchaseDate.toISOString();

        for (const item of purchase.items) {
            // Usar el servicio de inventario para crear movimiento
            await this.inventoryService.createMovement({
                productId: item.productId,
                type: StockMovementType.IN,
                source: StockMovementSource.PURCHASE,
                quantity: item.quantity,
                cost: item.unitPrice,
                provider: purchase.providerName,
                referenceId: purchase.purchaseNumber,
                notes: `Ingreso por compra ${purchase.purchaseNumber}`,
                date: dateString,
            });
        }
    }

    /**
     * Genera número de compra único
     * @deprecated Usar generatePurchaseNumberTransactional para evitar race conditions
     */
    private async generatePurchaseNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const count = await this.purchaseRepo.count({
            where: { purchaseNumber: Like(`COMP-${year}-%`) },
            withDeleted: true,
        });

        const nextNumber = (count + 1).toString().padStart(5, '0');
        return `COMP-${year}-${nextNumber}`;
    }

    /**
     * Genera número de compra único dentro de una transacción
     * FIX: Evita race condition usando FOR UPDATE (mismo patrón que sales)
     */
    private async generatePurchaseNumberTransactional(manager: EntityManager): Promise<string> {
        const year = new Date().getFullYear();
        const prefix = `COMP-${year}-`;

        // Serializa la asignación del número anual incluso cuando aún no hay
        // compras para bloquear con una fila existente.
        await manager.query(
            "SELECT pg_advisory_xact_lock(hashtext('purchase-number'), $1)",
            [year],
        );

        const result = await manager.query(`
            SELECT "purchaseNumber" FROM purchases
            WHERE "purchaseNumber" LIKE $1
            ORDER BY CAST(SPLIT_PART("purchaseNumber", '-', 3) AS INTEGER) DESC
            LIMIT 1
        `, [`${prefix}%`]);

        let nextNumber = 1;
        if (result.length > 0) {
            const lastNumber = result[0].purchaseNumber;
            const match = lastNumber.match(/COMP-\d{4}-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
            }
        }

        return `${prefix}${String(nextNumber).padStart(5, '0')}`;
    }

    /**
     * Obtiene estadísticas de compras
     */
    async getStats(startDate?: string, endDate?: string): Promise<PurchaseStats> {
        const query = this.purchaseRepo
            .createQueryBuilder('purchase')
            .where('purchase.deletedAt IS NULL');

        if (startDate && endDate) {
            query.andWhere('purchase.purchaseDate BETWEEN :start AND :end', {
                start: startDate,
                end: endDate,
            });
        }

        const purchases = await query.getMany();

        const totalPurchases = purchases.length;

        const totalAmount = purchases
            .reduce((sum, p) => sum + Number(p.total), 0);

        const totalPaid = purchases
            .filter((p) => p.status === PurchaseStatus.PAID)
            .reduce((sum, p) => sum + Number(p.total), 0);

        const totalPending = purchases
            .filter((p) => p.status === PurchaseStatus.PENDING)
            .reduce((sum, p) => sum + Number(p.total), 0);

        // Contar por estado
        const purchasesByStatus = {
            [PurchaseStatus.PENDING]: 0,
            [PurchaseStatus.PAID]: 0,
        };

        for (const purchase of purchases) {
            purchasesByStatus[purchase.status]++;
        }

        return {
            totalPurchases,
            totalAmount,
            totalPaid,
            totalPending,
            purchasesByStatus,
        };
    }

    /**
     * Obtiene proveedores únicos (para autocompletado)
     */
    async getProviders(): Promise<string[]> {
        const result = await this.purchaseRepo
            .createQueryBuilder('purchase')
            .select('DISTINCT purchase.providerName', 'providerName')
            .where('purchase.deletedAt IS NULL')
            .orderBy('purchase.providerName', 'ASC')
            .getRawMany();

        return result.map((r) => r.providerName);
    }
}

