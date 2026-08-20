/**
 * Test de integración HTTP para F1 (POST /api/purchases).
 * Cubre: DTO acepta supplierId sin providerName, service deriva, ambos vacíos → 400.
 */
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { CashRegisterService } from '../../src/modules/cash-register/cash-register.service';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { ProductsService } from '../../src/modules/products/products.service';
import { SuppliersService } from '../../src/modules/suppliers/suppliers.service';
import { AuditService } from '../../src/modules/audit/audit.service';
import { Purchase, PurchaseStatus } from '../../src/modules/purchases/entities/purchase.entity';
import { PurchaseItem } from '../../src/modules/purchases/entities/purchase-item.entity';
import { PurchasesController } from '../../src/modules/purchases/purchases.controller';
import { PurchasesService } from '../../src/modules/purchases/purchases.service';
import { testDataSource } from '../setup-integration';

describe('Integración: POST /api/purchases (F1 fix)', () => {
    let app: INestApplication;
    let moduleRef: TestingModule;

    const mockCashRegister = {
        getOpenRegister: jest.fn().mockResolvedValue({ id: 'cash-1' }),
        registerPurchase: jest.fn().mockResolvedValue({ id: 'cm-1' }),
    };

    const mockInventory = {
        createMovement: jest.fn().mockResolvedValue({ id: 'mv-1' }),
        recordMovementInLocation: jest.fn().mockResolvedValue({ id: 'mv-1' }),
        isSectorizedMode: jest.fn().mockResolvedValue(false),
        getDefaultReceiveLocationId: jest.fn().mockResolvedValue(null),
    };

    const mockProducts = {
        findOne: jest.fn().mockImplementation(async (id: string) => ({ id, name: `Product ${id}` })),
    };

    const mockSuppliers = {
        findOne: jest.fn().mockImplementation(async (id: string) => ({
            id,
            name: `Supplier ${id}`,
        })),
    };

    const mockAudit = {
        logSilent: jest.fn().mockResolvedValue(undefined),
    };

    const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        isTransactionActive: true,
        manager: {
            save: jest.fn(),
            findOne: jest.fn(),
            query: jest.fn().mockResolvedValue([]),
        },
    };

    beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
            controllers: [PurchasesController],
            providers: [
                PurchasesService,
                { provide: getRepositoryToken(Purchase), useValue: testDataSource.getRepository(Purchase) },
                { provide: getRepositoryToken(PurchaseItem), useValue: testDataSource.getRepository(PurchaseItem) },
                { provide: InventoryService, useValue: mockInventory },
                { provide: ProductsService, useValue: mockProducts },
                { provide: CashRegisterService, useValue: mockCashRegister },
                { provide: SuppliersService, useValue: mockSuppliers },
                { provide: AuditService, useValue: mockAudit },
                {
                    provide: DataSource,
                    useValue: {
                        ...testDataSource,
                        createQueryRunner: () => mockQueryRunner,
                    },
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        app = moduleRef.createNestApplication();
        app.setGlobalPrefix('api');
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        app.useGlobalFilters(new AllExceptionsFilter());
        await app.init();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        const savedPurchase = {
            id: 'purchase-1',
            purchaseNumber: 'COMP-2026-00001',
            supplierId: 'supplier-1',
            providerName: 'Supplier supplier-1',
            purchaseDate: new Date('2026-08-19'),
            subtotal: 100,
            tax: 0,
            discount: 0,
            total: 100,
            status: PurchaseStatus.PENDING,
            paymentMethodId: null,
            paidAt: null,
            invoiceNumber: null,
            notes: null,
            locationId: null,
            inventoryUpdated: false,
            createdById: null,
            createdBy: null,
            paymentMethod: null,
            location: null,
            items: [],
        };
        mockQueryRunner.manager.save.mockResolvedValue(savedPurchase);
        mockQueryRunner.manager.findOne.mockResolvedValue(savedPurchase);
        mockQueryRunner.isTransactionActive = true;
    });

    afterAll(async () => {
        await app.close();
        await moduleRef.close();
    });

    it('201 — supplierId válido + sin providerName: el service deriva el nombre del Supplier', async () => {
        const response = await request(app.getHttpServer())
            .post('/api/purchases')
            .send({
                supplierId: '11111111-1111-1111-1111-111111111111',
                purchaseDate: '2026-08-19',
                status: PurchaseStatus.PENDING,
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            })
            .expect(201);

        expect(response.body.providerName).toBe('Supplier 11111111-1111-1111-1111-111111111111');
        expect(mockSuppliers.findOne).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    });

    it('201 — supplierId + providerName explícito: respeta el providerName del DTO', async () => {
        const response = await request(app.getHttpServer())
            .post('/api/purchases')
            .send({
                supplierId: '11111111-1111-1111-1111-111111111111',
                providerName: 'Mi Proveedor SA',
                purchaseDate: '2026-08-19',
                status: PurchaseStatus.PENDING,
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            })
            .expect(201);

        expect(response.body.providerName).toBe('Mi Proveedor SA');
    });

    it('400 — sin supplierId y sin providerName: mensaje claro del service', async () => {
        const response = await request(app.getHttpServer())
            .post('/api/purchases')
            .send({
                purchaseDate: '2026-08-19',
                status: PurchaseStatus.PENDING,
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            })
            .expect(400);

        expect(response.body.message).toEqual(
            expect.arrayContaining(['Seleccioná un proveedor o ingresá un nombre']),
        );
    });
});
