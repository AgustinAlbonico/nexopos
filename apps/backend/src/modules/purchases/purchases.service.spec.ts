/**
 * Tests unitarios para PurchasesService
 * Cubre: CRUD de compras, actualización de inventario, validaciones
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';

import { PurchasesService, PurchaseStats, PaginatedPurchases } from './purchases.service';
import { Purchase, PurchaseStatus } from './entities/purchase.entity';
import { PurchaseItem } from './entities/purchase-item.entity';
import { InventoryService } from '../inventory/inventory.service';
import { ProductsService } from '../products/products.service';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { AuditService } from '../audit/audit.service';

// Mocks
const mockPurchaseRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    softDelete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
};

const mockPurchaseItemRepo = {
    create: jest.fn(),
    save: jest.fn(),
};

const mockInventoryService = {
    createMovement: jest.fn(),
};

const mockProductsService = {
    findOne: jest.fn(),
};

const mockCashRegisterService = {
    getOpenRegister: jest.fn(),
    registerPurchase: jest.fn(),
};

const mockSuppliersService = {
    findOne: jest.fn(),
};

const mockAuditService = {
    logSilent: jest.fn(),
};

const mockDataSource = {
    createQueryRunner: jest.fn(),
};

const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
        save: jest.fn(),
        findOne: jest.fn(),
        query: jest.fn().mockResolvedValue([]),
    },
    isTransactionActive: true,
};

// Mock factories
const createMockPurchase = (overrides = {}) => ({
    id: 'purchase-uuid-123',
    purchaseNumber: 'COMP-2024-00001',
    supplierId: 'supplier-123',
    providerName: 'Proveedor Test',
    providerDocument: '123456789',
    providerPhone: '1234567890',
    purchaseDate: new Date(),
    subtotal: 1000,
    tax: 210,
    discount: 0,
    total: 1210,
    status: PurchaseStatus.PENDING,
    paymentMethodId: null,
    paidAt: null,
    invoiceNumber: 'A001',
    notes: 'Notas de prueba',
    inventoryUpdated: false,
    items: [],
    createdBy: null,
    paymentMethod: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
});

const createMockPurchaseItem = (overrides = {}) => ({
    id: 'item-uuid-123',
    purchaseId: 'purchase-uuid-123',
    productId: 'product-123',
    quantity: 10,
    unitPrice: 100,
    subtotal: 1000,
    notes: null,
    product: null,
    ...overrides,
});

describe('PurchasesService', () => {
    let service: PurchasesService;

    beforeEach(async () => {
        mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PurchasesService,
                { provide: getRepositoryToken(Purchase), useValue: mockPurchaseRepo },
                { provide: getRepositoryToken(PurchaseItem), useValue: mockPurchaseItemRepo },
                { provide: InventoryService, useValue: mockInventoryService },
                { provide: ProductsService, useValue: mockProductsService },
                { provide: CashRegisterService, useValue: mockCashRegisterService },
                { provide: SuppliersService, useValue: mockSuppliersService },
                { provide: DataSource, useValue: mockDataSource },
                { provide: AuditService, useValue: mockAuditService },
            ],
        }).compile();

        service = module.get<PurchasesService>(PurchasesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        const createPurchaseDto = {
            supplierId: 'supplier-123',
            providerName: 'Proveedor Test',
            providerDocument: '123456789',
            providerPhone: '1234567890',
            purchaseDate: '2024-01-15',
            items: [
                { productId: 'product-123', quantity: 10, unitPrice: 100 },
            ],
            tax: 210,
            discount: 0,
            status: PurchaseStatus.PENDING,
        };

        beforeEach(() => {
            mockQueryRunner.manager.save.mockResolvedValue(createMockPurchase());
            mockQueryRunner.manager.findOne.mockResolvedValue(createMockPurchase());
            mockCashRegisterService.getOpenRegister.mockResolvedValue(null);
            mockProductsService.findOne.mockResolvedValue({ id: 'product-123' });
            mockSuppliersService.findOne.mockResolvedValue({ id: 'supplier-123' });
            mockPurchaseRepo.count.mockResolvedValue(0);
        });

        it('crea una compra pendiente exitosamente', async () => {
            const result = await service.create(createPurchaseDto, 'user-123');

            expect(result).toHaveProperty('id');
            expect(result.providerName).toBe('Proveedor Test');
            expect(mockQueryRunner.manager.save).toHaveBeenCalled();
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
        });

        it('serializa la asignación del número de compra por año', async () => {
            const year = new Date().getFullYear();
            mockQueryRunner.manager.query
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([{ purchaseNumber: `COMP-${year}-1` }]);

            await service.create(createPurchaseDto, 'user-123');

            expect(mockQueryRunner.manager.query).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('pg_advisory_xact_lock'),
                [year],
            );
            expect(mockQueryRunner.manager.query).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining(
                    `CAST(SPLIT_PART("purchaseNumber", '-', 3) AS INTEGER) DESC`,
                ),
                [`COMP-${year}-%`],
            );
            expect(mockPurchaseRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ purchaseNumber: `COMP-${year}-00002` }),
            );
        });

        it('lanza BadRequestException si marca como pagada sin caja abierta', async () => {
            const paidDto = { ...createPurchaseDto, status: PurchaseStatus.PAID };
            mockCashRegisterService.getOpenRegister.mockResolvedValue(null);

            await expect(service.create(paidDto, 'user-123')).rejects.toThrow(BadRequestException);
            await expect(service.create(paidDto, 'user-123')).rejects.toThrow('No hay caja abierta');
        });

        it('valida que los productos existan', async () => {
            mockProductsService.findOne.mockRejectedValue(new NotFoundException());

            await expect(service.create(createPurchaseDto, 'user-123')).rejects.toThrow();
        });

        it('calcula correctamente subtotal y total', async () => {
            const dtoWithMultipleItems = {
                ...createPurchaseDto,
                items: [
                    { productId: 'product-1', quantity: 5, unitPrice: 100 },
                    { productId: 'product-2', quantity: 3, unitPrice: 50 },
                ],
                tax: 100,
                discount: 50,
            };

            await service.create(dtoWithMultipleItems, 'user-123');

            const savedPurchase = mockPurchaseRepo.create.mock.calls[0][0];
            expect(savedPurchase.subtotal).toBe(650); // 5*100 + 3*50
            expect(savedPurchase.total).toBe(700); // 650 + 100 - 50
        });

        it('crea auditoría cuando se proporciona userId', async () => {
            await service.create(createPurchaseDto, 'user-123');

            expect(mockAuditService.logSilent).toHaveBeenCalledWith(
                expect.objectContaining({
                    entityType: 'purchase',
                    action: 'CREATE',
                    userId: 'user-123',
                })
            );
        });

        it('no crea auditoría cuando no se proporciona userId', async () => {
            await service.create(createPurchaseDto);

            expect(mockAuditService.logSilent).not.toHaveBeenCalled();
        });

        it('maneja correctamente el rollback en caso de error', async () => {
            mockQueryRunner.manager.save.mockRejectedValue(new Error('DB Error'));

            await expect(service.create(createPurchaseDto, 'user-123')).rejects.toThrow();
            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
            expect(mockQueryRunner.release).toHaveBeenCalled();
        });
    });

    describe('findAll', () => {
        beforeEach(() => {
            const mockQueryBuilder = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([[createMockPurchase()], 1]),
            };
            mockPurchaseRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
        });

        it('retorna compras paginadas', async () => {
            const filters = { page: 1, limit: 10 };
            const result = await service.findAll(filters);

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('total');
            expect(result).toHaveProperty('page', 1);
            expect(result).toHaveProperty('limit', 10);
            expect(result).toHaveProperty('totalPages');
            expect(result.data).toHaveLength(1);
        });

        it('aplica filtro de status cuando se proporciona', async () => {
            const filters = { status: PurchaseStatus.PAID };
            await service.findAll(filters);

            const queryBuilder = mockPurchaseRepo.createQueryBuilder().andWhere;
            expect(queryBuilder).toHaveBeenCalledWith(
                'purchase.status = :status',
                { status: PurchaseStatus.PAID }
            );
        });

        it('aplica filtro de rango de fechas', async () => {
            const filters = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
            };
            await service.findAll(filters);

            expect(mockPurchaseRepo.createQueryBuilder().andWhere).toHaveBeenCalled();
        });

        it('aplica filtro de búsqueda por nombre de proveedor', async () => {
            const filters = { providerName: 'Proveedor' };
            await service.findAll(filters);

            expect(mockPurchaseRepo.createQueryBuilder().andWhere).toHaveBeenCalled();
        });

        it('aplica ordenamiento personalizado', async () => {
            const filters = { sortBy: 'total' as const, order: 'ASC' as const };
            await service.findAll(filters);

            expect(mockPurchaseRepo.createQueryBuilder().orderBy).toHaveBeenCalledWith('purchase.total', 'ASC');
        });
    });

    describe('findOne', () => {
        it('retorna una compra por ID', async () => {
            const mockPurchase = createMockPurchase();
            mockPurchaseRepo.findOne.mockResolvedValue(mockPurchase);

            const result = await service.findOne('purchase-123');

            expect(result).toEqual(mockPurchase);
            expect(mockPurchaseRepo.findOne).toHaveBeenCalledWith({
                where: { id: 'purchase-123' },
                relations: ['items', 'items.product', 'createdBy', 'paymentMethod'],
            });
        });

        it('lanza NotFoundException si la compra no existe', async () => {
            mockPurchaseRepo.findOne.mockResolvedValue(null);

            await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
            await expect(service.findOne('non-existent')).rejects.toThrow('no encontrada');
        });
    });

    describe('update', () => {
        const updatePurchaseDto = {
            providerName: 'Proveedor Actualizado',
            tax: 100,
            discount: 50,
        };

        beforeEach(() => {
            mockQueryRunner.manager.save.mockResolvedValue(undefined);
        });

        it('actualiza campos de una compra pendiente', async () => {
            const mockPurchase = createMockPurchase({ status: PurchaseStatus.PENDING });
            mockPurchaseRepo.findOne.mockResolvedValue(mockPurchase);

            await service.update('purchase-123', updatePurchaseDto);

            expect(mockPurchase.providerName).toBe('Proveedor Actualizado');
            expect(mockPurchase.tax).toBe(100);
            expect(mockQueryRunner.manager.save).toHaveBeenCalled();
        });

        it('lanza BadRequestException si la compra está pagada', async () => {
            const paidPurchase = createMockPurchase({ status: PurchaseStatus.PAID });
            mockPurchaseRepo.findOne.mockResolvedValue(paidPurchase);

            await expect(service.update('purchase-123', updatePurchaseDto)).rejects.toThrow(BadRequestException);
            await expect(service.update('purchase-123', updatePurchaseDto)).rejects.toThrow('No se puede modificar una compra ya pagada');
        });

        it('recalcula el total al cambiar impuestos o descuentos', async () => {
            const mockPurchase = createMockPurchase({
                subtotal: 1000,
                tax: 0,
                discount: 0,
                total: 1000,
                status: PurchaseStatus.PENDING,
            });
            mockPurchaseRepo.findOne.mockResolvedValue(mockPurchase);

            await service.update('purchase-123', { tax: 200, discount: 100 });

            expect(mockPurchase.total).toBe(1100); // 1000 + 200 - 100
        });

        it('actualiza inventario si cambia a PAID', async () => {
            const mockPurchase = createMockPurchase({
                status: PurchaseStatus.PENDING,
                inventoryUpdated: false,
                items: [createMockPurchaseItem()],
            });
            mockPurchaseRepo.findOne.mockResolvedValue(mockPurchase);
            mockInventoryService.createMovement.mockResolvedValue(undefined);

            await service.update('purchase-123', { status: PurchaseStatus.PAID });

            expect(mockInventoryService.createMovement).toHaveBeenCalled();
            expect(mockPurchase.inventoryUpdated).toBe(true);
        });
    });

    describe('remove', () => {
        it('elimina una compra pendiente', async () => {
            const mockPurchase = createMockPurchase({ status: PurchaseStatus.PENDING });
            mockPurchaseRepo.findOne.mockResolvedValue(mockPurchase);
            mockPurchaseRepo.softDelete.mockResolvedValue({ affected: 1 });

            const result = await service.remove('purchase-123', 'user-123');

            expect(result).toEqual({ message: 'Compra eliminada' });
            expect(mockPurchaseRepo.softDelete).toHaveBeenCalledWith('purchase-123');
            expect(mockAuditService.logSilent).toHaveBeenCalled();
        });

        it('lanza BadRequestException si la compra está pagada', async () => {
            const paidPurchase = createMockPurchase({ status: PurchaseStatus.PAID });
            mockPurchaseRepo.findOne.mockResolvedValue(paidPurchase);

            await expect(service.remove('purchase-123', 'user-123')).rejects.toThrow(BadRequestException);
            await expect(service.remove('purchase-123', 'user-123')).rejects.toThrow('No se puede eliminar una compra ya pagada');
        });
    });

    describe('markAsPaid', () => {
        beforeEach(() => {
            mockQueryRunner.manager.save.mockResolvedValue(undefined);
        });

        it('marca una compra como pagada y actualiza inventario', async () => {
            const mockPurchase = createMockPurchase({
                status: PurchaseStatus.PENDING,
                inventoryUpdated: false,
                items: [createMockPurchaseItem()],
            });
            mockPurchaseRepo.findOne.mockResolvedValue(mockPurchase);
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-123' });
            mockInventoryService.createMovement.mockResolvedValue(undefined);
            mockCashRegisterService.registerPurchase.mockResolvedValue(undefined);

            await service.markAsPaid('purchase-123', 'payment-123', 'user-123');

            expect(mockPurchase.status).toBe(PurchaseStatus.PAID);
            expect(mockPurchase.inventoryUpdated).toBe(true);
            expect(mockInventoryService.createMovement).toHaveBeenCalled();
            expect(mockCashRegisterService.registerPurchase).toHaveBeenCalled();
            expect(mockAuditService.logSilent).toHaveBeenCalled();
        });

        it('lanza BadRequestException si no hay caja abierta', async () => {
            mockPurchaseRepo.findOne.mockResolvedValue(createMockPurchase());
            mockCashRegisterService.getOpenRegister.mockResolvedValue(null);

            await expect(
                service.markAsPaid('purchase-123', 'payment-123', 'user-123')
            ).rejects.toThrow(BadRequestException);
        });

        it('lanza BadRequestException si la compra ya está pagada', async () => {
            const paidPurchase = createMockPurchase({ status: PurchaseStatus.PAID });
            mockPurchaseRepo.findOne.mockResolvedValue(paidPurchase);
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-123' });

            await expect(
                service.markAsPaid('purchase-123', 'payment-123', 'user-123')
            ).rejects.toThrow(BadRequestException);
            await expect(
                service.markAsPaid('purchase-123', 'payment-123', 'user-123')
            ).rejects.toThrow('ya está pagada');
        });

        it('no actualiza inventario si ya fue actualizado', async () => {
            const mockPurchase = createMockPurchase({
                status: PurchaseStatus.PENDING,
                inventoryUpdated: true,
                items: [createMockPurchaseItem()],
            });
            mockPurchaseRepo.findOne.mockResolvedValue(mockPurchase);
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-123' });
            mockCashRegisterService.registerPurchase.mockResolvedValue(undefined);

            await service.markAsPaid('purchase-123', 'payment-123', 'user-123');

            expect(mockInventoryService.createMovement).not.toHaveBeenCalled();
        });
    });

    describe('getStats', () => {
        beforeEach(() => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([
                    createMockPurchase({ total: 1000, status: PurchaseStatus.PENDING }),
                    createMockPurchase({ total: 2000, status: PurchaseStatus.PAID }),
                    createMockPurchase({ total: 1500, status: PurchaseStatus.PAID }),
                ]),
            };
            mockPurchaseRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
        });

        it('retorna estadísticas de todas las compras', async () => {
            const result = await service.getStats();

            expect(result).toEqual({
                totalPurchases: 3,
                totalAmount: 4500,
                totalPaid: 3500,
                totalPending: 1000,
                purchasesByStatus: {
                    pending: 1,
                    paid: 2,
                },
            });
        });

        it('filtra por rango de fechas cuando se proporciona', async () => {
            await service.getStats('2024-01-01', '2024-01-31');

            const queryBuilder = mockPurchaseRepo.createQueryBuilder().andWhere;
            expect(queryBuilder).toHaveBeenCalledWith(
                'purchase.purchaseDate BETWEEN :start AND :end',
                { start: '2024-01-01', end: '2024-01-31' }
            );
        });

        it('retorna estadísticas vacías si no hay compras', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };
            mockPurchaseRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getStats();

            expect(result).toEqual({
                totalPurchases: 0,
                totalAmount: 0,
                totalPaid: 0,
                totalPending: 0,
                purchasesByStatus: {
                    pending: 0,
                    paid: 0,
                },
            });
        });
    });

    describe('getProviders', () => {
        it('retorna lista de proveedores únicos', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([
                    { providerName: 'Proveedor A' },
                    { providerName: 'Proveedor B' },
                ]),
            };
            mockPurchaseRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getProviders();

            expect(result).toEqual(['Proveedor A', 'Proveedor B']);
        });

        it('retorna array vacío si no hay proveedores', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
            };
            mockPurchaseRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.getProviders();

            expect(result).toEqual([]);
        });
    });
});
