/**
 * Tests de Integración para Flujo Completo de Ventas
 * Usa mocks para probar la interacción entre servicios
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesService } from '../../src/modules/sales/sales.service';
import { Sale, SaleStatus } from '../../src/modules/sales/entities/sale.entity';
import { SaleItem } from '../../src/modules/sales/entities/sale-item.entity';
import { SalePayment } from '../../src/modules/sales/entities/sale-payment.entity';
import { SaleTax } from '../../src/modules/sales/entities/sale-tax.entity';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { ProductsService } from '../../src/modules/products/products.service';
import { InvoiceService } from '../../src/modules/sales/services/invoice.service';
import { CashRegisterService } from '../../src/modules/cash-register/cash-register.service';
import { CustomerAccountsService } from '../../src/modules/customer-accounts/customer-accounts.service';
import { AuditService } from '../../src/modules/audit/audit.service';
import { CreateSaleDto } from '../../src/modules/sales/dto';

const mockRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getOne: jest.fn().mockResolvedValue(null),
    })),
});

const mockCashRegisterService = {
    getOpenRegister: jest.fn(),
    registerIncome: jest.fn(),
    registerRefund: jest.fn(),
};

const mockProductsService = {
    findOne: jest.fn(),
};

const mockInventoryService = {
    createMovement: jest.fn(),
};

const mockInvoiceService = {
    generateInvoice: jest.fn(),
};

const mockCustomerAccountsService = {
    createCharge: jest.fn(),
    createAdjustment: jest.fn(),
};

const mockAuditService = {
    logSilent: jest.fn(),
};

describe('Integración - Flujo Completo de Ventas', () => {
    let salesService: SalesService;

    const createMockQueryRunner = () => {
        const savedEntities: any[] = [];
        return {
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: {
                query: jest.fn().mockResolvedValue([]),
                save: jest.fn().mockImplementation(async (entity: any) => {
                    if (!entity) return { id: 'generated-id' };
                    const saved = { ...entity, id: entity.id || `generated-${Date.now()}` };
                    savedEntities.push(saved);
                    return saved;
                }),
                findOne: jest.fn().mockImplementation(async (entity: any, options: any) => {
                    if (options?.where?.id) {
                        const mockSale = {
                            id: 'sale-1',
                            saleNumber: 'VENTA-2026-00001',
                            status: SaleStatus.COMPLETED,
                            items: [],
                            payments: [],
                            customer: null,
                            createdBy: null,
                            invoice: null,
                        };
                        return mockSale;
                    }
                    return null;
                }),
                getRepository: jest.fn(() => mockRepository()),
            },
        };
    };

    const mockDataSource = {
        createQueryRunner: jest.fn(createMockQueryRunner),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SalesService,
                { provide: getRepositoryToken(Sale), useFactory: mockRepository },
                { provide: getRepositoryToken(SaleItem), useFactory: mockRepository },
                { provide: getRepositoryToken(SalePayment), useFactory: mockRepository },
                { provide: getRepositoryToken(SaleTax), useFactory: mockRepository },
                { provide: CashRegisterService, useValue: mockCashRegisterService },
                { provide: ProductsService, useValue: mockProductsService },
                { provide: InventoryService, useValue: mockInventoryService },
                { provide: InvoiceService, useValue: mockInvoiceService },
                { provide: CustomerAccountsService, useValue: mockCustomerAccountsService },
                { provide: AuditService, useValue: mockAuditService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        salesService = module.get<SalesService>(SalesService);
    });

    describe('1. Creación de Venta', () => {
        it('debe crear venta exitosamente con caja abierta', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test',
            });

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
            };

            const result = await salesService.create(dto, 'user-1');

            expect(result).toBeDefined();
            expect(mockCashRegisterService.getOpenRegister).toHaveBeenCalled();
        });

        it('debe rechazar venta sin caja abierta', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue(null);

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
            };

            await expect(salesService.create(dto)).rejects.toThrow(
                new BadRequestException('No hay caja abierta')
            );
        });

        it('debe rechazar venta con stock insuficiente', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 5,
                sku: 'SKU1',
                name: 'Producto Test',
            });

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 10, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 1000 }],
            };

            await expect(salesService.create(dto)).rejects.toThrow('Stock insuficiente');
        });

        it('debe rechazar venta si producto no existe', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue(null);

            const dto: CreateSaleDto = {
                items: [{ productId: 'inexistente', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
            };

            await expect(salesService.create(dto)).rejects.toThrow(NotFoundException);
        });
    });

    describe('2. Venta a Cuenta Corriente', () => {
        it('debe crear cargo en cuenta corriente al vender a CC', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test',
            });

            const dto: CreateSaleDto = {
                customerId: 'customer-1',
                isOnAccount: true,
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            };

            await salesService.create(dto, 'user-1');

            expect(mockCustomerAccountsService.createCharge).toHaveBeenCalledWith(
                'customer-1',
                expect.objectContaining({
                    amount: 100,
                }),
                'user-1'
            );
        });

        it('debe marcar venta como PENDING al ser CC', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test',
            });

            const dto: CreateSaleDto = {
                customerId: 'customer-1',
                isOnAccount: true,
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            };

            const result = await salesService.create(dto, 'user-1');

            expect(result.status).toBe(SaleStatus.PENDING);
        });

        it('no debe registrar en caja al ser venta CC', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test',
            });

            const dto: CreateSaleDto = {
                customerId: 'customer-1',
                isOnAccount: true,
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            };

            await salesService.create(dto, 'user-1');

            expect(mockCashRegisterService.registerIncome).not.toHaveBeenCalled();
        });
    });

    describe('3. Actualización de Inventario', () => {
        it('debe crear movimiento de stock OUT al completar venta', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test',
            });

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 2, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 200 }],
            };

            await salesService.create(dto, 'user-1');

            expect(mockInventoryService.createMovement).toHaveBeenCalledWith(
                expect.objectContaining({
                    productId: 'product-1',
                    quantity: 2,
                    type: 'OUT',
                    source: 'SALE',
                })
            );
        });

        it('debe descontar stock por cada item en la venta', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockImplementation((id: string) => {
                return Promise.resolve({
                    id,
                    stock: 10,
                    sku: 'SKU',
                    name: 'Producto',
                });
            });

            const dto: CreateSaleDto = {
                items: [
                    { productId: 'product-1', quantity: 2, unitPrice: 100 },
                    { productId: 'product-2', quantity: 3, unitPrice: 50 },
                ],
                payments: [{ paymentMethodId: 'pm-1', amount: 350 }],
            };

            await salesService.create(dto, 'user-1');

            expect(mockInventoryService.createMovement).toHaveBeenCalledTimes(2);
        });
    });

    describe('4. Registro en Caja', () => {
        it('debe registrar ingreso por cada pago', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test',
            });

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [
                    { paymentMethodId: 'pm-cash', amount: 60 },
                    { paymentMethodId: 'pm-debit', amount: 40 },
                ],
            };

            await salesService.create(dto, 'user-1');

            expect(mockCashRegisterService.registerIncome).toHaveBeenCalledTimes(2);
        });

        it('debe usar userId system cuando no se proporciona', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test',
            });

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
            };

            await salesService.create(dto);

            expect(mockCashRegisterService.registerIncome).toHaveBeenCalledWith(
                expect.anything(),
                'system'
            );
        });
    });

    describe('5. Auditoría', () => {
        it('debe registrar log de auditoría al crear venta', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test',
            });

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
            };

            await salesService.create(dto, 'user-1');

            expect(mockAuditService.logSilent).toHaveBeenCalledWith(
                expect.objectContaining({
                    entityType: 'sale',
                    action: 'CREATE',
                    userId: 'user-1',
                })
            );
        });

        it('debe incluir datos relevantes en el log', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test',
            });

            const dto: CreateSaleDto = {
                customerId: 'customer-1',
                isOnAccount: false,
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
            };

            await salesService.create(dto, 'user-1');

            const auditCall = mockAuditService.logSilent.mock.calls[0][0];
            expect(auditCall.newValues).toMatchObject({
                customerId: 'customer-1',
                isOnAccount: false,
            });
        });
    });

    describe('6. Cancelación de Venta', () => {
        it('debe revertir inventario al cancelar venta completada', async () => {
            const mockSale = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.COMPLETED,
                inventoryUpdated: true,
                total: 100,
                isOnAccount: false,
                customerId: null,
                items: [{ id: 'item-1', productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ id: 'payment-1', paymentMethodId: 'pm-1', amount: 100 }],
                customer: null,
                createdBy: null,
                invoice: null,
            };

            const mockSaleRepo = {
                findOne: jest.fn().mockResolvedValue(mockSale),
                save: jest.fn().mockImplementation((sale) => sale),
            };

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    SalesService,
                    { provide: getRepositoryToken(Sale), useValue: mockSaleRepo },
                    { provide: getRepositoryToken(SaleItem), useFactory: mockRepository },
                    { provide: getRepositoryToken(SalePayment), useFactory: mockRepository },
                    { provide: getRepositoryToken(SaleTax), useFactory: mockRepository },
                    { provide: CashRegisterService, useValue: mockCashRegisterService },
                    { provide: ProductsService, useValue: mockProductsService },
                    { provide: InventoryService, useValue: mockInventoryService },
                    { provide: InvoiceService, useValue: mockInvoiceService },
                    { provide: CustomerAccountsService, useValue: mockCustomerAccountsService },
                    { provide: AuditService, useValue: mockAuditService },
                    { provide: getDataSourceToken(), useValue: {} },
                ],
            }).compile();

            const service = module.get<SalesService>(SalesService);

            await service.cancel('sale-1', 'user-1');

            expect(mockInventoryService.createMovement).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'IN',
                    source: 'RETURN',
                })
            );
        });

        it('debe revertir cargo en cuenta corriente al cancelar CC', async () => {
            const mockSale = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.PENDING,
                inventoryUpdated: true,
                total: 100,
                isOnAccount: true,
                customerId: 'customer-1',
                items: [{ id: 'item-1', productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: null,
            };

            const mockSaleRepo = {
                findOne: jest.fn().mockResolvedValue(mockSale),
                save: jest.fn().mockImplementation((sale) => sale),
            };

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    SalesService,
                    { provide: getRepositoryToken(Sale), useValue: mockSaleRepo },
                    { provide: getRepositoryToken(SaleItem), useFactory: mockRepository },
                    { provide: getRepositoryToken(SalePayment), useFactory: mockRepository },
                    { provide: getRepositoryToken(SaleTax), useFactory: mockRepository },
                    { provide: CashRegisterService, useValue: mockCashRegisterService },
                    { provide: ProductsService, useValue: mockProductsService },
                    { provide: InventoryService, useValue: mockInventoryService },
                    { provide: InvoiceService, useValue: mockInvoiceService },
                    { provide: CustomerAccountsService, useValue: mockCustomerAccountsService },
                    { provide: AuditService, useValue: mockAuditService },
                    { provide: getDataSourceToken(), useValue: {} },
                ],
            }).compile();

            const service = module.get<SalesService>(SalesService);

            await service.cancel('sale-1', 'user-1');

            expect(mockCustomerAccountsService.createAdjustment).toHaveBeenCalledWith(
                'customer-1',
                expect.objectContaining({
                    amount: -100,
                }),
                'user-1'
            );
        });

        it('debe registrar devolución en caja al cancelar venta de contado', async () => {
            const mockSale = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.COMPLETED,
                inventoryUpdated: true,
                total: 100,
                isOnAccount: false,
                customerId: null,
                items: [{ id: 'item-1', productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ id: 'payment-1', paymentMethodId: 'pm-cash', amount: 100 }],
                customer: null,
                createdBy: null,
                invoice: null,
            };

            const mockSaleRepo = {
                findOne: jest.fn().mockResolvedValue(mockSale),
                save: jest.fn().mockImplementation((sale) => sale),
            };

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    SalesService,
                    { provide: getRepositoryToken(Sale), useValue: mockSaleRepo },
                    { provide: getRepositoryToken(SaleItem), useFactory: mockRepository },
                    { provide: getRepositoryToken(SalePayment), useFactory: mockRepository },
                    { provide: getRepositoryToken(SaleTax), useFactory: mockRepository },
                    { provide: CashRegisterService, useValue: mockCashRegisterService },
                    { provide: ProductsService, useValue: mockProductsService },
                    { provide: InventoryService, useValue: mockInventoryService },
                    { provide: InvoiceService, useValue: mockInvoiceService },
                    { provide: CustomerAccountsService, useValue: mockCustomerAccountsService },
                    { provide: AuditService, useValue: mockAuditService },
                    { provide: getDataSourceToken(), useValue: {} },
                ],
            }).compile();

            const service = module.get<SalesService>(SalesService);

            await service.cancel('sale-1', 'user-1');

            expect(mockCashRegisterService.registerRefund).toHaveBeenCalledWith(
                expect.objectContaining({
                    amount: 100,
                }),
                'system'
            );
        });

        it('debe rechazar cancelación si ya está cancelada', async () => {
            const mockSale = {
                id: 'sale-1',
                status: SaleStatus.CANCELLED,
                inventoryUpdated: false,
            };

            const mockSaleRepo = {
                findOne: jest.fn().mockResolvedValue(mockSale),
            };

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    SalesService,
                    { provide: getRepositoryToken(Sale), useValue: mockSaleRepo },
                    { provide: getRepositoryToken(SaleItem), useFactory: mockRepository },
                    { provide: getRepositoryToken(SalePayment), useFactory: mockRepository },
                    { provide: getRepositoryToken(SaleTax), useFactory: mockRepository },
                    { provide: CashRegisterService, useValue: mockCashRegisterService },
                    { provide: ProductsService, useValue: mockProductsService },
                    { provide: InventoryService, useValue: mockInventoryService },
                    { provide: InvoiceService, useValue: mockInvoiceService },
                    { provide: CustomerAccountsService, useValue: mockCustomerAccountsService },
                    { provide: AuditService, useValue: mockAuditService },
                    { provide: getDataSourceToken(), useValue: {} },
                ],
            }).compile();

            const service = module.get<SalesService>(SalesService);

            await expect(service.cancel('sale-1')).rejects.toThrow(
                new BadRequestException('La venta ya está cancelada')
            );
        });
    });

    describe('7. Factura Fiscal', () => {
        it('debe generar factura si generateInvoice=true', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test',
            });
            mockInvoiceService.generateInvoice.mockResolvedValue({ id: 'invoice-1' });

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
                generateInvoice: true,
            };

            await salesService.create(dto, 'user-1');

            expect(mockInvoiceService.generateInvoice).toHaveBeenCalled();
        });

        it('debe marcar fiscalPending=true si falla la factura', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test',
            });
            mockInvoiceService.generateInvoice.mockRejectedValue(new Error('AFIP error'));

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
                generateInvoice: true,
            };

            const result = await salesService.create(dto, 'user-1');

            expect(result.fiscalPending).toBe(true);
            expect(result.fiscalError).toBe('AFIP error');
        });
    });

    describe('8. Cálculo de Totales', () => {
        it('debe calcular subtotal correctamente con descuentos por item', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test',
            });

            const dto: CreateSaleDto = {
                items: [
                    { productId: 'product-1', quantity: 2, unitPrice: 100, discount: 10 }, // 190
                    { productId: 'product-1', quantity: 1, unitPrice: 100, discount: 20 }, // 80
                ],
                payments: [{ paymentMethodId: 'pm-1', amount: 270 }],
            };

            const result = await salesService.create(dto, 'user-1');

            expect(result.subtotal).toBe(270);
        });

        it('debe aplicar descuento global', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test',
            });

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 2, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 170 }],
                discount: 30,
            };

            const result = await salesService.create(dto, 'user-1');

            expect(result.discount).toBe(30);
            expect(result.total).toBe(170);
        });

        it('debe incluir impuestos en el total', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test',
            });

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                taxes: [{ name: 'IVA', percentage: 21, amount: 21 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 121 }],
            };

            const result = await salesService.create(dto, 'user-1');

            expect(result.tax).toBe(21);
            expect(result.total).toBe(121);
        });
    });

    describe('9. Estado de Venta', () => {
        it('debe cambiar estado a COMPLETED al crear venta de contado', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test',
            });

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
            };

            const result = await salesService.create(dto, 'user-1');

            expect(result.status).toBe(SaleStatus.COMPLETED);
        });

        it('debe mantener estado al crear venta con estado explícito', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test',
            });

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
                status: SaleStatus.COMPLETED,
            };

            const result = await salesService.create(dto, 'user-1');

            expect(result.status).toBe(SaleStatus.COMPLETED);
        });
    });
});

describe('Integración - Flujo de Pagos', () => {
    let salesService: SalesService;

    const mockSaleRepo = {
        findOne: jest.fn(),
        save: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SalesService,
                { provide: getRepositoryToken(Sale), useValue: mockSaleRepo },
                { provide: getRepositoryToken(SaleItem), useFactory: mockRepository },
                { provide: getRepositoryToken(SalePayment), useFactory: mockRepository },
                { provide: getRepositoryToken(SaleTax), useFactory: mockRepository },
                { provide: CashRegisterService, useValue: mockCashRegisterService },
                { provide: ProductsService, useValue: mockProductsService },
                { provide: InventoryService, useValue: mockInventoryService },
                { provide: InvoiceService, useValue: mockInvoiceService },
                { provide: CustomerAccountsService, useValue: mockCustomerAccountsService },
                { provide: AuditService, useValue: mockAuditService },
                { provide: getDataSourceToken(), useValue: {} },
            ],
        }).compile();

        salesService = module.get<SalesService>(SalesService);
    });

    describe('markAsPaid', () => {
        it('debe marcar venta PENDING como COMPLETED', async () => {
            const mockSale = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.PENDING,
                isOnAccount: true,
                inventoryUpdated: false,
                customerId: 'customer-1',
                items: [],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: null,
            };
            mockSaleRepo.findOne.mockResolvedValue(mockSale);
            mockSaleRepo.save.mockImplementation((sale) => sale);
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });

            const payments = [{ paymentMethodId: 'pm-1', amount: 100 }];

            const result = await salesService.markAsPaid('sale-1', payments, 'user-1');

            expect(result.status).toBe(SaleStatus.COMPLETED);
            expect(result.isOnAccount).toBe(false);
        });

        it('debe rechazar si la venta está cancelada', async () => {
            const mockSale = {
                id: 'sale-1',
                status: SaleStatus.CANCELLED,
            };
            mockSaleRepo.findOne.mockResolvedValue(mockSale);

            await expect(
                salesService.markAsPaid('sale-1', [{ paymentMethodId: 'pm-1', amount: 100 }])
            ).rejects.toThrow(new BadRequestException('No se puede pagar una venta cancelada'));
        });

        it('debe rechazar si la venta ya está completada', async () => {
            const mockSale = {
                id: 'sale-1',
                status: SaleStatus.COMPLETED,
            };
            mockSaleRepo.findOne.mockResolvedValue(mockSale);

            await expect(
                salesService.markAsPaid('sale-1', [{ paymentMethodId: 'pm-1', amount: 100 }])
            ).rejects.toThrow(new BadRequestException('La venta ya está completada'));
        });

        it('debe requerir caja abierta para marcar como pagada', async () => {
            const mockSale = {
                id: 'sale-1',
                status: SaleStatus.PENDING,
                isOnAccount: true,
            };
            mockSaleRepo.findOne.mockResolvedValue(mockSale);
            mockCashRegisterService.getOpenRegister.mockResolvedValue(null);

            await expect(
                salesService.markAsPaid('sale-1', [{ paymentMethodId: 'pm-1', amount: 100 }])
            ).rejects.toThrow(new BadRequestException('No hay caja abierta'));
        });
    });
});
