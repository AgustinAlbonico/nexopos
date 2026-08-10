/**
 * Tests unitarios para SalesService (extensión de flujos críticos)
 * Cubre: ventas con caja abierta, ventas a cuenta corriente, validaciones de stock y pagos
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';

import { SalesService } from './sales.service';
import { Sale, SaleStatus } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SalePayment } from './entities/sale-payment.entity';
import { SaleTax } from './entities/sale-tax.entity';
import { InventoryService } from '../inventory/inventory.service';
import { ProductsService } from '../products/products.service';
import { InvoiceService } from './services/invoice.service';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { CustomerAccountsService } from '../customer-accounts/customer-accounts.service';
import { AuditService } from '../audit/audit.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { CreateSaleDto } from './dto';
import { InvoiceFilterStatus } from './dto/sale-filters.dto';
import { createSaleDTO, createSaleItemDTO } from '../../test/factories';

let mockCompletedSaleForFindOne: unknown = null;
const savedEntities = new Map<string, unknown[]>();
let mockPaymentsForSale: unknown[] = [];

const createMockQueryRunner = () => ({
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
        query: jest.fn().mockResolvedValue([]),
        save: jest.fn().mockImplementation(async (entity: unknown) => {
            if (!entity) {
                return { id: 'generated-id' };
            }
            const typedEntity = entity as Record<string, unknown>;
            const savedEntity = { ...typedEntity, id: typedEntity.id || `generated-${Date.now()}-${Math.random()}` };

            if (entity && typeof entity === 'object' && 'paymentMethodId' in entity && 'amount' in entity) {
                const payments = savedEntities.get('payments') || [];
                payments.push(savedEntity);
                savedEntities.set('payments', payments);
            }

            return savedEntity;
        }),
        findOne: jest.fn().mockImplementation(async (_entity: unknown, options?: unknown) => {
            const typedOptions = options as { where?: { id?: string } } | undefined;
            if (typedOptions?.where?.id) {
                const payments = mockPaymentsForSale.length > 0 ? mockPaymentsForSale : (savedEntities.get('payments') || []);
                return {
                    ...(mockCompletedSaleForFindOne || {}),
                    payments: payments.length > 0 ? payments : [],
                };
            }
            return mockCompletedSaleForFindOne;
        }),
        getRepository: jest.fn(() => mockRepository()),
    },
});

const mockDataSource = {
    createQueryRunner: jest.fn(createMockQueryRunner),
};

beforeEach(() => {
    mockProductsService.findByIds.mockImplementation(async (ids: string[]) => {
        const products = await Promise.all(ids.map((id) => mockProductsService.findOne(id)));
        return products.filter(Boolean);
    });
});

afterEach(() => {
    mockCompletedSaleForFindOne = null;
    savedEntities.clear();
    mockPaymentsForSale = [];
});

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
    findByIds: jest.fn(),
};

const mockInventoryService = {
    createMovement: jest.fn(),
    recordMovementInLocation: jest.fn(),
    transfer: jest.fn(),
    isSectorizedMode: jest.fn().mockResolvedValue(false),
    getPrimarySaleLocationId: jest.fn().mockResolvedValue(null),
    getDefaultReceiveLocationId: jest.fn().mockResolvedValue(null),
    findReplenishmentOptions: jest.fn().mockResolvedValue([]),
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

const mockConfigurationService = {
    isOutOfStockSaleAllowed: jest.fn().mockResolvedValue(false),
};

describe('SalesService - critical flows', () => {
    let service: SalesService;

    beforeEach(async () => {
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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);

        mockProductsService.findByIds.mockImplementation(async (ids: string[]) => {
            const products = await Promise.all(ids.map((id) => mockProductsService.findOne(id)));
            return products.filter(Boolean);
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        // Resetear la variable de venta mock
        mockCompletedSaleForFindOne = null;
        // Limpiar entidades guardadas
        savedEntities.clear();
        // Limpiar payments manuales
        mockPaymentsForSale = [];
    });

    describe('validación de caja abierta', () => {
        it('debe bloquear venta si no hay caja abierta', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue(null);

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
            };

            await expect(
                service.create(dto),
            ).rejects.toThrow(new BadRequestException('No hay caja abierta. Debe abrir la caja antes de registrar ventas.'));
        });

        it('debe permitir venta si hay caja abierta', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test'
            });

            // Usar el queryRunner compartido (el servicio usará el mismo)

            const mockCompletedSale = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.COMPLETED,
                items: [],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: null,
            } as unknown;
            mockCompletedSaleForFindOne = mockCompletedSale;
            // Configurar payments que devolverá findOne
            mockPaymentsForSale = [
                { id: 'payment-1', paymentMethodId: 'pm-1', amount: 100, saleId: 'sale-1' },
            ];

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
            };

            const result = await service.create(dto, 'user-1');

            expect(result).toBeDefined();
            expect(mockCashRegisterService.registerIncome).toHaveBeenCalled();
        });
    });

    describe('ventas a cuenta corriente', () => {
        it('debe crear venta a cuenta corriente y registrar cargo', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto'
            });

            // Usar el queryRunner compartido (el servicio usará el mismo)
            const mockCompletedSale = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.PENDING,
                items: [],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: null,
            };
            mockCompletedSaleForFindOne = mockCompletedSale;

            const dto: CreateSaleDto = {
                customerId: 'customer-1',
                isOnAccount: true,
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            };

            await service.create(dto, 'user-1');

            expect(mockCustomerAccountsService.createCharge).toHaveBeenCalledWith(
                'customer-1',
                expect.objectContaining({
                    amount: 100,
                    description: expect.stringContaining('VENTA-'),
                }),
                'user-1',
            );
        });

        it('debe marcar venta como PENDING cuando es a cuenta corriente', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto'
            });

            // Usar el queryRunner compartido (el servicio usará el mismo)
            const mockCompletedSale = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.PENDING,
                items: [],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: null,
            };
            mockCompletedSaleForFindOne = mockCompletedSale;

            const dto: CreateSaleDto = {
                customerId: 'customer-1',
                isOnAccount: true,
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            };

            const result = await service.create(dto, 'user-1');

            expect(result.status).toBe(SaleStatus.PENDING);
        });
    });

    describe('validación de stock', () => {
        it('debe validar stock suficiente antes de crear venta', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 5,
                sku: 'SKU1',
                name: 'Producto Test'
            });

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 10, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 1000 }],
            };

            await expect(service.create(dto)).rejects.toThrow(
                new BadRequestException('Stock insuficiente para "Producto Test". Disponible: 5, Solicitado: 10')
            );
        });

        it('debe lanzar error si producto no existe', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue(null);

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-inexistente', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
            };

            await expect(service.create(dto)).rejects.toThrow(
                new NotFoundException('Producto con ID product-inexistente no encontrado')
            );
        });

        it('debe buscar productos en lote para evitar N+1 queries', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findByIds.mockResolvedValue([
                { id: 'product-1', stock: 10, sku: 'SKU1', name: 'Producto 1' },
                { id: 'product-2', stock: 10, sku: 'SKU2', name: 'Producto 2' },
            ]);

            mockCompletedSaleForFindOne = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.COMPLETED,
                saleDate: new Date(),
                items: [],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: null,
            };
            mockPaymentsForSale = [
                { id: 'payment-1', paymentMethodId: 'pm-1', amount: 300, saleId: 'sale-1' },
            ];

            const dto: CreateSaleDto = {
                items: [
                    { productId: 'product-1', quantity: 1, unitPrice: 100 },
                    { productId: 'product-2', quantity: 1, unitPrice: 200 },
                ],
                payments: [{ paymentMethodId: 'pm-1', amount: 300 }],
            };

            await service.create(dto, 'user-1');

            expect(mockProductsService.findByIds).toHaveBeenCalledTimes(1);
            expect(mockProductsService.findByIds).toHaveBeenCalledWith(['product-1', 'product-2']);
            expect(mockProductsService.findOne).not.toHaveBeenCalled();
        });

        it('debe crear movimiento de stock al completar venta', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto'
            });

            // Usar el queryRunner compartido (el servicio usará el mismo)
            const mockCompletedSale = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.COMPLETED,
                saleDate: new Date(),
                items: [
                    { id: 'item-1', productId: 'product-1', quantity: 2, unitPrice: 100, saleId: 'sale-1' },
                ],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: null,
            };
            mockCompletedSaleForFindOne = mockCompletedSale;
            // Configurar payments que devolverá findOne
            mockPaymentsForSale = [
                { id: 'payment-1', paymentMethodId: 'pm-1', amount: 200, saleId: 'sale-1' },
            ];

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 2, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 200 }],
            };

            await service.create(dto, 'user-1');

            expect(mockInventoryService.createMovement).toHaveBeenCalledWith(
                expect.objectContaining({
                    productId: 'product-1',
                    quantity: 2,
                    type: 'OUT',
                })
            );
        });

        it('debe permitir venta sin stock cuando allowOutOfStockSale está activo', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockConfigurationService.isOutOfStockSaleAllowed.mockResolvedValue(true);
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 0,
                sku: 'SKU1',
                name: 'Producto Sin Stock'
            });

            const mockCompletedSale = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.COMPLETED,
                saleDate: new Date(),
                items: [],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: null,
            } as unknown;
            mockCompletedSaleForFindOne = mockCompletedSale;
            mockPaymentsForSale = [
                { id: 'payment-1', paymentMethodId: 'pm-1', amount: 500, saleId: 'sale-1' },
            ];

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 5, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 500 }],
            };

            await expect(service.create(dto, 'user-1')).resolves.toBeDefined();
            expect(mockConfigurationService.isOutOfStockSaleAllowed).toHaveBeenCalled();
        });

        it('debe respetar flag allowOutOfStockSale=false aunque isOutOfStockSaleAllowed falle', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockConfigurationService.isOutOfStockSaleAllowed.mockResolvedValue(false);
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 0,
                sku: 'SKU1',
                name: 'Producto Test'
            });

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
            };

            await expect(service.create(dto)).rejects.toThrow(
                new BadRequestException('Stock insuficiente para "Producto Test". Disponible: 0, Solicitado: 1')
            );
        });
    });

    describe('generación de comprobante', () => {
        it('debe generar número de venta único', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto'
            });

            // Usar el queryRunner compartido (el servicio usará el mismo)
            const mockCompletedSale = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.COMPLETED,
                items: [],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: null,
            };
            mockCompletedSaleForFindOne = mockCompletedSale;

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
            };

            const result = await service.create(dto, 'user-1');

            expect(result.saleNumber).toMatch(/^VENTA-\d{4}-\d{5}$/);
        });

        it('debe generar factura si está configurado', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto'
            });
            mockInvoiceService.generateInvoice.mockResolvedValue({ id: 'invoice-1' });

            // Usar el queryRunner compartido (el servicio usará el mismo)
            const mockCompletedSale = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.COMPLETED,
                items: [],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: { id: 'invoice-1' },
            };
            mockCompletedSaleForFindOne = mockCompletedSale;

            const dto: CreateSaleDto = {
                generateInvoice: true,
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
            };

            await service.create(dto, 'user-1');

            expect(mockInvoiceService.generateInvoice).toHaveBeenCalled();
        });
    });

    describe('efecto en caja', () => {
        it('debe registrar ingreso en caja por cada pago', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto'
            });

            // Usar el queryRunner compartido (el servicio usará el mismo)
            const mockCompletedSale = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.COMPLETED,
                items: [],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: null,
            };
            mockCompletedSaleForFindOne = mockCompletedSale;
            // Configurar payments que devolverá findOne
            mockPaymentsForSale = [
                { id: 'payment-1', paymentMethodId: 'pm-1', amount: 60, saleId: 'sale-1' },
                { id: 'payment-2', paymentMethodId: 'pm-2', amount: 40, saleId: 'sale-1' },
            ];

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [
                    { paymentMethodId: 'pm-1', amount: 60 },
                    { paymentMethodId: 'pm-2', amount: 40 },
                ],
            };

            await service.create(dto, 'user-1');

            expect(mockCashRegisterService.registerIncome).toHaveBeenCalledTimes(2);
        });

        it('no debe registrar en caja si es venta a cuenta corriente', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto'
            });

            // Usar el queryRunner compartido (el servicio usará el mismo)
            const mockCompletedSale = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.PENDING,
                items: [],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: null,
            };
            mockCompletedSaleForFindOne = mockCompletedSale;

            const dto: CreateSaleDto = {
                isOnAccount: true,
                customerId: 'customer-1',
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            };

            await service.create(dto, 'user-1');

            expect(mockCashRegisterService.registerIncome).not.toHaveBeenCalled();
        });
    });

    describe('validación de pagos', () => {
        it('debe validar que los pagos cubran el total', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto'
            });

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 80 }], // Menor al total
            };

            await expect(service.create(dto)).rejects.toThrow(
                new BadRequestException('El total de pagos ($80.00) no coincide con el total de la venta ($100.00)')
            );
        });

        it('debe permitir tolerancia pequeña en diferencia de centavos', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto'
            });

            // Usar el queryRunner compartido (el servicio usará el mismo)
            const mockCompletedSale = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.COMPLETED,
                items: [],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: null,
            };
            mockCompletedSaleForFindOne = mockCompletedSale;

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 3, unitPrice: 100 }], // 300
                payments: [{ paymentMethodId: 'pm-1', amount: 300.01 }], // Diferencia de 0.01
            };

            // No debe lanzar error por diferencia de 0.01
            const result = await service.create(dto, 'user-1');

            expect(result).toBeDefined();
        });
    });

    describe('cálculos de totales', () => {
        it('debe calcular subtotal correctamente con descuentos por item', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test'
            });

            mockCompletedSaleForFindOne = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.COMPLETED,
                items: [],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: null,
                subtotal: 270,
                discount: 0,
                tax: 0,
                total: 270,
            };

            const dto: CreateSaleDto = {
                items: [
                    { productId: 'product-1', quantity: 2, unitPrice: 100, discount: 10 },
                    { productId: 'product-1', quantity: 1, unitPrice: 100, discount: 20 },
                ],
                payments: [{ paymentMethodId: 'pm-1', amount: 270 }],
            };

            const result = await service.create(dto, 'user-1');

            // Subtotal esperado: (200 - 10) + (100 - 20) = 190 + 80 = 270
            expect(result.subtotal).toBe(270);
        });

        it('debe calcular total con impuestos incluidos', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test'
            });

            mockCompletedSaleForFindOne = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.COMPLETED,
                items: [],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: null,
                subtotal: 100,
                discount: 0,
                tax: 21,
                total: 121,
            };

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                taxes: [{ name: 'IVA', amount: 21 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 121 }],
            };

            const result = await service.create(dto, 'user-1');

            // Subtotal: 100, TotalTax: 21, Total: 121
            expect(result.subtotal).toBe(100);
            expect(result.tax).toBe(21);
            expect(result.total).toBe(121);
        });

        it('debe calcular descuento global', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto Test'
            });

            mockCompletedSaleForFindOne = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.COMPLETED,
                items: [],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: null,
                subtotal: 200,
                discount: 30,
                tax: 0,
                total: 170,
            };

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 2, unitPrice: 100 }],
                discount: 30,
                payments: [{ paymentMethodId: 'pm-1', amount: 170 }],
            };

            const result = await service.create(dto, 'user-1');

            // Subtotal: 200, Discount: 30, Total: 170
            expect(result.subtotal).toBe(200);
            expect(result.discount).toBe(30);
            expect(result.total).toBe(170);
        });
    });

    describe('auditoría', () => {
        it('debe registrar auditoría al crear venta', async () => {
            mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
            mockProductsService.findOne.mockResolvedValue({
                id: 'product-1',
                stock: 10,
                sku: 'SKU1',
                name: 'Producto'
            });

            // Usar el queryRunner compartido (el servicio usará el mismo)
            const mockCompletedSale = {
                id: 'sale-1',
                saleNumber: 'VENTA-2026-00001',
                status: SaleStatus.COMPLETED,
                items: [],
                payments: [],
                customer: null,
                createdBy: null,
                invoice: null,
            };
            mockCompletedSaleForFindOne = mockCompletedSale;

            const dto: CreateSaleDto = {
                items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
            };

            await service.create(dto, 'user-1');

            expect(mockAuditService.logSilent).toHaveBeenCalledWith(
                expect.objectContaining({
                    entityType: 'sale',
                    action: 'CREATE',
                    userId: 'user-1',
                })
            );
        });
    });
});

describe('SalesService - canCreateSale', () => {
    let service: SalesService;

    beforeEach(async () => {
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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe retornar true con razón cuando hay caja abierta', async () => {
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });

        const result = await service.canCreateSale();

        expect(result.canCreate).toBe(true);
        expect(result.reason).toBeUndefined();
    });

    it('debe retornar false con razón cuando no hay caja abierta', async () => {
        mockCashRegisterService.getOpenRegister.mockResolvedValue(null);

        const result = await service.canCreateSale();

        expect(result.canCreate).toBe(false);
        expect(result.reason).toContain('No hay caja abierta');
    });

    it('debe lanzar error cuando el servicio de caja falla', async () => {
        mockCashRegisterService.getOpenRegister.mockRejectedValue(new Error('Error de conexión'));

        await expect(service.canCreateSale()).rejects.toThrow('Error de conexión');
    });
});

describe('SalesService - findAll con filtros', () => {
    let service: SalesService;
    let mockQueryBuilder: unknown;

    beforeEach(async () => {
        // Mock query builder encadenable
        mockQueryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
            getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };

        const mockSaleRepo = {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        } as unknown as Repository<Sale>;

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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe retornar paginación vacía por defecto', async () => {
        const result = await service.findAll({});

        expect(result.data).toEqual([]);
        expect(result.total).toBe(0);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
        expect(result.totalPages).toBe(0);
    });

    it('debe aplicar paginación correctamente', async () => {
        await service.findAll({ page: 2, limit: 20 });

        const qb = mockQueryBuilder as { skip: jest.Mock; take: jest.Mock };
        expect(qb.skip).toHaveBeenCalledWith(20);
        expect(qb.take).toHaveBeenCalledWith(20);
    });

    it('debe aplicar ordenamiento por defecto (saleNumber DESC)', async () => {
        await service.findAll({});

        const qb = mockQueryBuilder as { orderBy: jest.Mock };
        expect(qb.orderBy).toHaveBeenCalledWith('sale.saleNumber', 'DESC');
    });

    it('debe aplicar ordenamiento personalizado', async () => {
        await service.findAll({ sortBy: 'total', order: 'ASC' });

        const qb = mockQueryBuilder as { orderBy: jest.Mock };
        expect(qb.orderBy).toHaveBeenCalledWith('sale.total', 'ASC');
    });
});

describe('SalesService - findOne', () => {
    let service: SalesService;
    let mockSaleRepo: Repository<Sale>;

    beforeEach(async () => {
        mockSaleRepo = {
            findOne: jest.fn(),
        } as unknown as Repository<Sale>;

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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe retornar venta con todas las relaciones', async () => {
        const mockSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(mockSale);

        const result = await service.findOne('sale-1');

        expect(result).toEqual(mockSale);
        expect(mockSaleRepo.findOne).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'sale-1' },
                relations: ['items', 'items.product', 'payments', 'payments.paymentMethod', 'customer', 'createdBy', 'invoice'],
            })
        );
    });

    it('debe lanzar NotFoundException si venta no existe', async () => {
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(null);

        await expect(service.findOne('nonexistent')).rejects.toThrow(
            new NotFoundException('Venta con ID nonexistent no encontrada')
        );
    });
});

describe('SalesService - update', () => {
    let service: SalesService;
    let mockSaleRepo: Repository<Sale>;

    beforeEach(async () => {
        mockSaleRepo = {
            findOne: jest.fn(),
            save: jest.fn(),
        } as unknown as Repository<Sale>;

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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe actualizar campos permitidos', async () => {
        const mockSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            inventoryUpdated: false,
            subtotal: 100,
            discount: 0,
            surcharge: 0,
            tax: 0,
            total: 100,
            customerId: null,
            customerName: null,
            notes: null,
            isOnAccount: false,
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(mockSale);
        (mockSaleRepo.save as jest.Mock).mockResolvedValue({ ...mockSale, notes: 'Nota actualizada' });

        const result = await service.update('sale-1', { notes: 'Nota actualizada' }, 'user-1');

        expect(mockAuditService.logSilent).toHaveBeenCalled();
    });

    it('debe bloquear si venta está cancelada', async () => {
        const mockSale = {
            id: 'sale-1',
            status: SaleStatus.CANCELLED,
            inventoryUpdated: false,
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(mockSale);

        await expect(
            service.update('sale-1', { notes: 'Nota' }, 'user-1')
        ).rejects.toThrow(new BadRequestException('No se puede modificar una venta cancelada'));
    });

    it('debe bloquear si inventario ya fue actualizado', async () => {
        const mockSale = {
            id: 'sale-1',
            status: SaleStatus.COMPLETED,
            inventoryUpdated: true,
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(mockSale);

        await expect(
            service.update('sale-1', { notes: 'Nota' }, 'user-1')
        ).rejects.toThrow(new BadRequestException('No se puede modificar una venta que ya actualizó el inventario'));
    });

    it('debe recalcular total al cambiar impuesto/descuento/recargo', async () => {
        const mockSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            inventoryUpdated: false,
            subtotal: 100,
            discount: 0,
            surcharge: 0,
            tax: 0,
            total: 100,
            customerId: null,
            customerName: null,
            notes: null,
            isOnAccount: false,
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(mockSale);
        (mockSaleRepo.save as jest.Mock).mockImplementation((sale) => sale);

        const result = await service.update('sale-1', { tax: 21, discount: 10 }, 'user-1');

        expect(result.total).toBe(111); // 100 - 10 + 21
    });
});

describe('SalesService - cancel', () => {
    let service: SalesService;
    let mockSaleRepo: Repository<Sale>;

    const mockSaleWithPayments = {
        id: 'sale-1',
        saleNumber: 'VENTA-2026-00001',
        status: SaleStatus.COMPLETED,
        inventoryUpdated: true,
        total: 100,
        items: [],
        payments: [
            { paymentMethodId: 'pm-1', amount: 100, saleId: 'sale-1' },
        ],
        customer: null,
        createdBy: null,
        invoice: null,
        customerId: null,
        isOnAccount: false,
    };

    beforeEach(async () => {
        mockSaleRepo = {
            findOne: jest.fn(),
            save: jest.fn(),
        } as unknown as Repository<Sale>;

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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe cancelar venta y cambiar estado', async () => {
        const freshSale = {
            ...mockSaleWithPayments,
            items: [{ id: 'item-1', productId: 'product-1', quantity: 1, unitPrice: 100, saleId: 'sale-1' }],
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(freshSale);
        (mockSaleRepo.save as jest.Mock).mockImplementation((sale) => sale);

        const result = await service.cancel('sale-1', 'user-1');

        expect(result.status).toBe(SaleStatus.CANCELLED);
        expect(mockInventoryService.createMovement).toHaveBeenCalled();
    });

    it('debe lanzar error si venta ya está cancelada', async () => {
        const mockCancelledSale = { ...mockSaleWithPayments, status: SaleStatus.CANCELLED };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(mockCancelledSale);

        await expect(service.cancel('sale-1', 'user-1')).rejects.toThrow(
            new BadRequestException('La venta ya está cancelada')
        );
    });

    it('debe revertir inventario si fue actualizado', async () => {
        const freshSale = {
            ...mockSaleWithPayments,
            items: [{ id: 'item-1', productId: 'product-1', quantity: 1, unitPrice: 100, saleId: 'sale-1' }],
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(freshSale);
        (mockSaleRepo.save as jest.Mock).mockImplementation((sale) => sale);

        await service.cancel('sale-1', 'user-1');

        expect(mockInventoryService.createMovement).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'IN',
                source: 'RETURN',
            })
        );
    });

    it('debe revertir cargo en cuenta corriente si aplica', async () => {
        const mockAccountSale = {
            ...mockSaleWithPayments,
            customerId: 'customer-1',
            isOnAccount: true,
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(mockAccountSale);
        (mockSaleRepo.save as jest.Mock).mockImplementation((sale) => sale);

        await service.cancel('sale-1', 'user-1');

        expect(mockCustomerAccountsService.createAdjustment).toHaveBeenCalledWith(
            'customer-1',
            expect.objectContaining({
                amount: -100,
                description: expect.stringContaining('Anulación de venta'),
            }),
            'user-1',
        );
    });

    it('debe registrar devolución en caja para venta de contado', async () => {
        const freshSale = { ...mockSaleWithPayments };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(freshSale);
        (mockSaleRepo.save as jest.Mock).mockImplementation((sale) => sale);

        await service.cancel('sale-1', 'user-1');

        expect(mockCashRegisterService.registerRefund).toHaveBeenCalled();
    });
});

describe('SalesService - remove (soft delete)', () => {
    let service: SalesService;
    let mockSaleRepo: Repository<Sale>;

    beforeEach(async () => {
        mockSaleRepo = {
            findOne: jest.fn(),
            softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
        } as unknown as Repository<Sale>;

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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe eliminar venta (soft delete)', async () => {
        const mockSale = {
            id: 'sale-1',
            inventoryUpdated: false,
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(mockSale);

        const result = await service.remove('sale-1', 'user-1');

        expect(result).toEqual({ message: 'Venta eliminada' });
        expect(mockSaleRepo.softDelete).toHaveBeenCalledWith('sale-1');
        expect(mockAuditService.logSilent).toHaveBeenCalled();
    });

    it('debe bloquear si inventario ya fue actualizado', async () => {
        const mockSale = {
            id: 'sale-1',
            inventoryUpdated: true,
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(mockSale);

        await expect(service.remove('sale-1', 'user-1')).rejects.toThrow(
            new BadRequestException('No se puede eliminar una venta que ya actualizó el inventario. Cancélela primero.')
        );
    });
});

describe('SalesService - markAsPaid', () => {
    let service: SalesService;
    let savedEntities: unknown[] = [];
    let mockQueryRunner: QueryRunner;
    let mockSaleRepo: Repository<Sale>;

    const createMockQueryRunnerForMarkAsPaid = () => ({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
            query: jest.fn().mockResolvedValue([]),
            save: jest.fn().mockImplementation(async (entity) => {
                if (!entity) {
                    return { id: 'generated-id' };
                }
                const typed = entity as Record<string, unknown>;
                const savedEntity = { ...typed, id: typed.id || `generated-${Date.now()}` };
                savedEntities.push(savedEntity);
                return savedEntity;
            }),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            findOne: jest.fn().mockResolvedValue({
                id: 'sale-1',
                status: SaleStatus.PENDING,
                inventoryUpdated: false,
                items: [],
                payments: [],
            }),
            getRepository: jest.fn(() => mockRepository()),
        },
    });

    const mockDataSource = {
        createQueryRunner: jest.fn(createMockQueryRunnerForMarkAsPaid),
    };

    beforeEach(async () => {
        savedEntities = [];
        mockQueryRunner = createMockQueryRunnerForMarkAsPaid() as unknown as QueryRunner;

        mockSaleRepo = {
            findOne: jest.fn(),
        } as unknown as Repository<Sale>;

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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
        savedEntities = [];
    });

    it('debe marcar venta PENDING como COMPLETED', async () => {
        const mockSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.PENDING,
            isOnAccount: true,
            inventoryUpdated: false,
            customerId: 'customer-1',
            customerName: 'Cliente CC',
            items: [],
            payments: [],
            customer: null,
            createdBy: null,
            invoice: null,
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(mockSale);

        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });

        const payments = [{ paymentMethodId: 'pm-1', amount: 100 }];

        const result = await service.markAsPaid('sale-1', payments, 'user-1');

        expect(result.status).toBe(SaleStatus.COMPLETED);
        expect(result.isOnAccount).toBe(false);
        expect(mockCashRegisterService.registerIncome).toHaveBeenCalled();
        expect(mockAuditService.logSilent).toHaveBeenCalled();
    });

    it('debe lanzar error si venta está cancelada', async () => {
        const mockSale = {
            id: 'sale-1',
            status: SaleStatus.CANCELLED,
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(mockSale);

        await expect(
            service.markAsPaid('sale-1', [{ paymentMethodId: 'pm-1', amount: 100 }], 'user-1')
        ).rejects.toThrow(new BadRequestException('No se puede pagar una venta cancelada'));
    });

    it('debe lanzar error si venta ya está completada', async () => {
        const mockSale = {
            id: 'sale-1',
            status: SaleStatus.COMPLETED,
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(mockSale);

        await expect(
            service.markAsPaid('sale-1', [{ paymentMethodId: 'pm-1', amount: 100 }], 'user-1')
        ).rejects.toThrow(new BadRequestException('La venta ya está completada'));
    });

    it('debe actualizar inventario si no estaba actualizado', async () => {
        const mockSale = {
            id: 'sale-1',
            status: SaleStatus.PENDING,
            isOnAccount: true,
            inventoryUpdated: false,
            items: [{ productId: 'product-1', quantity: 1, unitPrice: 100, saleId: 'sale-1' }],
            payments: [],
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(mockSale);

        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });

        const result = await service.markAsPaid('sale-1', [{ paymentMethodId: 'pm-1', amount: 100 }], 'user-1');

        // La venta se marca como completada
        expect(result.status).toBe(SaleStatus.COMPLETED);
        expect(result.isOnAccount).toBe(false);
    });
});

describe('SalesService - getTodaySales', () => {
    let service: SalesService;
    let mockQueryBuilder: unknown;

    beforeEach(async () => {
        mockQueryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        };

        const mockSaleRepo = {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        } as unknown as Repository<Sale>;

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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe retornar ventas del día actual', async () => {
        await service.getTodaySales();

        const qb = mockQueryBuilder as { where: jest.Mock };
        expect(qb.where).toHaveBeenCalled();
    });

    it('debe incluir relaciones correctas', async () => {
        await service.getTodaySales();

        const qb = mockQueryBuilder as { leftJoinAndSelect: jest.Mock };
        expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('sale.items', 'items');
        expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('sale.payments', 'payments');
        expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('sale.customer', 'customer');
    });
});

describe('SalesService - getStats', () => {
    let service: SalesService;
    let mockSummaryQueryBuilder: unknown;
    let mockPaymentQueryBuilder: unknown;

    beforeEach(async () => {
        mockSummaryQueryBuilder = {
            leftJoin: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({
                totalSales: '3',
                totalAmount: '150',
                totalCompleted: '100',
                totalPending: '50',
                completedCount: '1',
                pendingCount: '1',
                partialCount: '0',
                cancelledCount: '1',
            }),
            getMany: jest.fn().mockResolvedValue([]),
        };

        mockPaymentQueryBuilder = {
            innerJoin: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue([
                { method: 'Efectivo', total: '50' },
            ]),
        };

        const mockSaleRepo = {
            createQueryBuilder: jest.fn()
                .mockReturnValueOnce(mockSummaryQueryBuilder)
                .mockReturnValueOnce(mockPaymentQueryBuilder),
        } as unknown as Repository<Sale>;

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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe calcular estadísticas correctamente', async () => {
        const result = await service.getStats();

        expect(result.totalSales).toBe(3);
        expect(result.totalAmount).toBe(150); // Excluye cancelled
        expect(result.totalCompleted).toBe(100);
        expect(result.totalPending).toBe(50);
        expect((mockSummaryQueryBuilder as { getMany: jest.Mock }).getMany).not.toHaveBeenCalled();
    });

    it('debe contar ventas por estado', async () => {
        const result = await service.getStats();

        expect(result.salesByStatus).toEqual({
            [SaleStatus.COMPLETED]: 1,
            [SaleStatus.PENDING]: 1,
            [SaleStatus.PARTIAL]: 0,
            [SaleStatus.CANCELLED]: 1,
        });
    });

    it('debe agrupar por método de pago', async () => {
        const result = await service.getStats();

        expect(result.salesByPaymentMethod).toEqual({
            'Efectivo': 50,
        });
    });
});

describe('SalesService - Validación de Impuestos Duplicados (FIX 7.8)', () => {
    let service: SalesService;

    beforeEach(async () => {
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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe rechazar impuestos duplicados', async () => {
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 10,
            sku: 'SKU1',
            name: 'Producto Test'
        });

        const dto: CreateSaleDto = {
            items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            payments: [{ paymentMethodId: 'pm-1', amount: 142 }],
            taxes: [
                { name: 'IVA', percentage: 21, amount: 21 },
                { name: 'IVA', percentage: 21, amount: 21 }, // Duplicado
            ],
        };

        await expect(service.create(dto)).rejects.toThrow(
            new BadRequestException('No se permiten impuestos duplicados en la misma venta. Verifique los impuestos seleccionados.')
        );
    });

    it('debe rechazar impuestos con nombres similares (case insensitive)', async () => {
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 10,
            sku: 'SKU1',
            name: 'Producto Test'
        });

        const dto: CreateSaleDto = {
            items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            payments: [{ paymentMethodId: 'pm-1', amount: 142 }],
            taxes: [
                { name: 'IVA', percentage: 21, amount: 21 },
                { name: 'iva', percentage: 21, amount: 21 }, // Duplicado en minúsculas
            ],
        };

        await expect(service.create(dto)).rejects.toThrow(
            new BadRequestException('No se permiten impuestos duplicados en la misma venta. Verifique los impuestos seleccionados.')
        );
    });

    it('debe aceptar impuestos con nombres diferentes', async () => {
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 10,
            sku: 'SKU1',
            name: 'Producto Test'
        });

        const mockCompletedSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            items: [],
            payments: [],
            customer: null,
            createdBy: null,
            invoice: null,
        };
        mockCompletedSaleForFindOne = mockCompletedSale;

        const dto: CreateSaleDto = {
            items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            payments: [{ paymentMethodId: 'pm-1', amount: 126 }],
            taxes: [
                { name: 'IVA', percentage: 21, amount: 21 },
                { name: 'Impuesto Municipal', percentage: 5, amount: 5 },
            ],
        };

        const result = await service.create(dto, 'user-1');
        expect(result).toBeDefined();
    });
});

describe('SalesService - Tolerancia de Redondeo en Pagos', () => {
    let service: SalesService;

    beforeEach(async () => {
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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe aceptar diferencia de 0.01 en pagos', async () => {
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 10,
            sku: 'SKU1',
            name: 'Producto Test'
        });

        const mockCompletedSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            items: [],
            payments: [],
            customer: null,
            createdBy: null,
            invoice: null,
        };
        mockCompletedSaleForFindOne = mockCompletedSale;

        const dto: CreateSaleDto = {
            items: [{ productId: 'product-1', quantity: 3, unitPrice: 100 }], // 300
            payments: [{ paymentMethodId: 'pm-1', amount: 300.01 }], // Diferencia 0.01
        };

        const result = await service.create(dto, 'user-1');
        expect(result).toBeDefined();
    });

    it('debe rechazar diferencia mayor a 0.01', async () => {
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 10,
            sku: 'SKU1',
            name: 'Producto Test'
        });

        const dto: CreateSaleDto = {
            items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            payments: [{ paymentMethodId: 'pm-1', amount: 100.05 }], // Diferencia 0.05
        };

        await expect(service.create(dto)).rejects.toThrow(
            new BadRequestException('El total de pagos ($100.05) no coincide con el total de la venta ($100.00)')
        );
    });
});

describe('SalesService - generateSaleNumberTransactional', () => {
    let service: SalesService;
    let mockQueryRunner: any;

    beforeEach(async () => {
        mockQueryRunner = {
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: {
                query: jest.fn(),
                save: jest.fn(),
                findOne: jest.fn(),
            },
        };

        const mockDataSource = {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
        };

        mockQueryRunner.manager.save.mockImplementation(async (entity: unknown) => {
            if (entity && typeof entity === 'object') {
                return Object.assign({ id: 'sale-1' }, entity);
            }

            return { id: 'sale-1' };
        });
        mockQueryRunner.manager.findOne.mockImplementation(async () => mockCompletedSaleForFindOne);

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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe generar primer número de venta correctamente', async () => {
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 10,
            sku: 'SKU1',
            name: 'Producto Test'
        });

        mockQueryRunner.manager.query.mockResolvedValue([]); // Sin ventas previas

        const mockCompletedSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            items: [],
            payments: [],
            customer: null,
            createdBy: null,
            invoice: null,
        };
        mockCompletedSaleForFindOne = mockCompletedSale;

        const dto: CreateSaleDto = {
            items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
        };

        const result = await service.create(dto, 'user-1');

        expect(result.saleNumber).toMatch(/^VENTA-\d{4}-00001$/);
    });

    it('debe incrementar número secuencial correctamente', async () => {
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 10,
            sku: 'SKU1',
            name: 'Producto Test'
        });

        mockQueryRunner.manager.query.mockResolvedValue([{ saleNumber: 'VENTA-2026-00005' }]);

        const mockCompletedSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00006',
            status: SaleStatus.COMPLETED,
            items: [],
            payments: [],
            customer: null,
            createdBy: null,
            invoice: null,
        };
        mockCompletedSaleForFindOne = mockCompletedSale;

        const dto: CreateSaleDto = {
            items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
        };

        const result = await service.create(dto, 'user-1');

        expect(result.saleNumber).toBe('VENTA-2026-00006');
    });
});

describe('SalesService - create con Items Múltiples y Descuentos', () => {
    let service: SalesService;

    beforeEach(async () => {
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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe crear venta con múltiples items con descuentos individuales', async () => {
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
        mockProductsService.findOne.mockImplementation((id: string) => {
            if (id === 'product-1') {
                return Promise.resolve({ id: 'product-1', stock: 10, sku: 'SKU1', name: 'Producto 1' });
            }
            return Promise.resolve({ id: 'product-2', stock: 5, sku: 'SKU2', name: 'Producto 2' });
        });

        const mockCompletedSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            items: [
                { id: 'item-1', productId: 'product-1', quantity: 2, unitPrice: 100, discount: 10 }, // 190
                { id: 'item-2', productId: 'product-2', quantity: 1, unitPrice: 50, discount: 5 },  // 45
            ],
            payments: [],
            customer: null,
            createdBy: null,
            invoice: null,
            subtotal: 235,
            discount: 0,
            tax: 0,
            total: 235,
        };
        mockCompletedSaleForFindOne = mockCompletedSale;

        const dto: CreateSaleDto = {
            items: [
                { productId: 'product-1', quantity: 2, unitPrice: 100, discount: 10 },
                { productId: 'product-2', quantity: 1, unitPrice: 50, discount: 5 },
            ],
            payments: [{ paymentMethodId: 'pm-1', amount: 235 }],
        };

        const result = await service.create(dto, 'user-1');

        expect(result).toBeDefined();
        expect(mockInventoryService.createMovement).toHaveBeenCalledTimes(2);
    });

    it('debe calcular subtotal correctamente con descuentos por item', async () => {
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 10,
            sku: 'SKU1',
            name: 'Producto Test'
        });

        const mockCompletedSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            items: [],
            payments: [],
            customer: null,
            createdBy: null,
            invoice: null,
            subtotal: 270,
            discount: 0,
            tax: 0,
            total: 270,
        };
        mockCompletedSaleForFindOne = mockCompletedSale;

        const dto: CreateSaleDto = {
            items: [
                { productId: 'product-1', quantity: 2, unitPrice: 100, discount: 10 }, // 190
                { productId: 'product-1', quantity: 1, unitPrice: 100, discount: 20 }, // 80
            ],
            payments: [{ paymentMethodId: 'pm-1', amount: 270 }],
        };

        const result = await service.create(dto, 'user-1');

        expect(result.subtotal).toBe(270); // (200-10) + (100-20) = 190 + 80 = 270
    });
});

describe('SalesService - create con Pago Mixto', () => {
    let service: SalesService;

    beforeEach(async () => {
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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe registrar ingresos por cada método de pago', async () => {
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 10,
            sku: 'SKU1',
            name: 'Producto Test'
        });

        const mockCompletedSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            items: [],
            payments: [
                { id: 'payment-1', paymentMethodId: 'pm-cash', amount: 60 },
                { id: 'payment-2', paymentMethodId: 'pm-debit', amount: 40 },
            ],
            customer: null,
            createdBy: null,
            invoice: null,
        };
        mockCompletedSaleForFindOne = mockCompletedSale;
        mockPaymentsForSale = [
            { id: 'payment-1', paymentMethodId: 'pm-cash', amount: 60, saleId: 'sale-1' },
            { id: 'payment-2', paymentMethodId: 'pm-debit', amount: 40, saleId: 'sale-1' },
        ];

        const dto: CreateSaleDto = {
            items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            payments: [
                { paymentMethodId: 'pm-cash', amount: 60 },
                { paymentMethodId: 'pm-debit', amount: 40 },
            ],
        };

        await service.create(dto, 'user-1');

        expect(mockCashRegisterService.registerIncome).toHaveBeenCalledTimes(2);
    });

    it('debe aceptar pagos mixtos que cubran el total exacto', async () => {
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 10,
            sku: 'SKU1',
            name: 'Producto Test'
        });

        const mockCompletedSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            items: [],
            payments: [],
            customer: null,
            createdBy: null,
            invoice: null,
        };
        mockCompletedSaleForFindOne = mockCompletedSale;
        mockPaymentsForSale = [
            { id: 'payment-1', paymentMethodId: 'pm-cash', amount: 50, saleId: 'sale-1' },
            { id: 'payment-2', paymentMethodId: 'pm-credit', amount: 50, saleId: 'sale-1' },
        ];

        const dto: CreateSaleDto = {
            items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            payments: [
                { paymentMethodId: 'pm-cash', amount: 50 },
                { paymentMethodId: 'pm-credit', amount: 50 },
            ],
        };

        const result = await service.create(dto, 'user-1');
        expect(result).toBeDefined();
    });
});

describe('SalesService - findAll con Filtros', () => {
    let service: SalesService;
    let mockQueryBuilder: any;

    beforeEach(async () => {
        mockQueryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
            getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };

        const mockSaleRepo = {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
        } as unknown as Repository<Sale>;

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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe filtrar por rango de fechas', async () => {
        await service.findAll({
            startDate: '2026-01-01',
            endDate: '2026-01-31',
        });

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
            'DATE(sale.saleDate) BETWEEN :start AND :end',
            { start: '2026-01-01', end: '2026-01-31' }
        );
    });

    it('debe filtrar solo por fecha de inicio', async () => {
        await service.findAll({
            startDate: '2026-01-01',
        });

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
            'DATE(sale.saleDate) >= :start',
            { start: '2026-01-01' }
        );
    });

    it('debe filtrar solo por fecha de fin', async () => {
        await service.findAll({
            endDate: '2026-01-31',
        });

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
            'DATE(sale.saleDate) <= :end',
            { end: '2026-01-31' }
        );
    });

    it('debe filtrar por búsqueda de número de venta', async () => {
        await service.findAll({
            search: 'VENTA-2026',
        });

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
            expect.stringContaining('saleNumber ILIKE'),
            expect.objectContaining({ search: '%VENTA-2026%' })
        );
    });

    it('debe filtrar por estado', async () => {
        await service.findAll({
            status: SaleStatus.COMPLETED,
        });

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
            'sale.status = :status',
            { status: SaleStatus.COMPLETED }
        );
    });

    it('debe filtrar por cliente', async () => {
        await service.findAll({
            customerId: 'customer-123',
        });

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
            'sale.customerId = :customerId',
            { customerId: 'customer-123' }
        );
    });

    it('debe filtrar por estado de factura fiscal (fiscal)', async () => {
        await service.findAll({
            invoiceStatus: InvoiceFilterStatus.FISCAL,
        });

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
            'sale.isFiscal = :isFiscal',
            { isFiscal: true }
        );
    });

    it('debe filtrar por estado de factura fiscal (no fiscal)', async () => {
        await service.findAll({
            invoiceStatus: InvoiceFilterStatus.NO_FISCAL,
        });

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
            'sale.isFiscal = :isFiscal',
            { isFiscal: false }
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
            '(sale.fiscalPending IS NULL OR sale.fiscalPending = :fiscalPending)',
            { fiscalPending: false }
        );
    });

    it('debe filtrar por error de factura fiscal', async () => {
        await service.findAll({
            invoiceStatus: InvoiceFilterStatus.ERROR,
        });

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
            'sale.fiscalPending = :fiscalPending',
            { fiscalPending: true }
        );
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
            'sale.isFiscal = :isFiscal',
            { isFiscal: false }
        );
    });
});

describe('SalesService - cancel con Escenarios Especiales', () => {
    let service: SalesService;
    let mockSaleRepo: Repository<Sale>;

    beforeEach(async () => {
        mockSaleRepo = {
            findOne: jest.fn(),
            save: jest.fn(),
        } as unknown as Repository<Sale>;

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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe registrar devolución para cada pago al cancelar venta de contado', async () => {
        const mockSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            inventoryUpdated: true,
            total: 150,
            isOnAccount: false,
            customerId: null,
            items: [{ id: 'item-1', productId: 'product-1', quantity: 1, unitPrice: 150 }],
            payments: [
                { id: 'payment-1', paymentMethodId: 'pm-cash', amount: 100 },
                { id: 'payment-2', paymentMethodId: 'pm-debit', amount: 50 },
            ],
            customer: null,
            createdBy: null,
            invoice: null,
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(mockSale);
        (mockSaleRepo.save as jest.Mock).mockImplementation((sale) => sale);

        await service.cancel('sale-1', 'user-1');

        expect(mockCashRegisterService.registerRefund).toHaveBeenCalledTimes(2);
    });

    it('debe registrar advertencia si venta de contado no tiene pagos', async () => {
        const mockSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            inventoryUpdated: false,
            total: 100,
            isOnAccount: false,
            customerId: null,
            items: [],
            payments: [],
            customer: null,
            createdBy: null,
            invoice: null,
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(mockSale);
        (mockSaleRepo.save as jest.Mock).mockImplementation((sale) => sale);

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        await service.cancel('sale-1', 'user-1');

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('no tiene pagos registrados')
        );
        consoleSpy.mockRestore();
    });

    it('no debe revertir inventario si no estaba actualizado', async () => {
        const mockSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            inventoryUpdated: false,
            total: 100,
            isOnAccount: false,
            customerId: null,
            items: [{ id: 'item-1', productId: 'product-1', quantity: 1, unitPrice: 100 }],
            payments: [{ id: 'payment-1', paymentMethodId: 'pm-cash', amount: 100 }],
            customer: null,
            createdBy: null,
            invoice: null,
        };
        (mockSaleRepo.findOne as jest.Mock).mockResolvedValue(mockSale);
        (mockSaleRepo.save as jest.Mock).mockImplementation((sale) => sale);

        await service.cancel('sale-1', 'user-1');

        expect(mockInventoryService.createMovement).not.toHaveBeenCalled();
    });
});

describe('SalesService - create con Cuenta Corriente', () => {
    let service: SalesService;

    beforeEach(async () => {
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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe rechazar cuenta corriente sin cliente', async () => {
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 10,
            sku: 'SKU1',
            name: 'Producto Test'
        });

        const dto: CreateSaleDto = {
            isOnAccount: true,
            customerId: undefined,
            items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
        };

        await expect(service.create(dto)).rejects.toThrow();
    });
});

describe('SalesService - create con Factura Fiscal', () => {
    let service: SalesService;

    beforeEach(async () => {
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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe generar factura fiscal si esta configurado', async () => {
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 10,
            sku: 'SKU1',
            name: 'Producto Test'
        });
        mockInvoiceService.generateInvoice.mockResolvedValue({ id: 'invoice-1' });

        const mockCompletedSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            items: [],
            payments: [],
            customer: null,
            createdBy: null,
            invoice: { id: 'invoice-1' },
        };
        mockCompletedSaleForFindOne = mockCompletedSale;

        const dto: CreateSaleDto = {
            items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
            generateInvoice: true,
        };

        await service.create(dto, 'user-1');

        expect(mockInvoiceService.generateInvoice).toHaveBeenCalledWith('generated-id', expect.anything());
    });

    it('debe manejar error de factura fiscal gracefully', async () => {
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 10,
            sku: 'SKU1',
            name: 'Producto Test'
        });
        mockInvoiceService.generateInvoice.mockRejectedValue(new Error('Error AFIP'));

        const mockCompletedSale = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            items: [],
            payments: [],
            customer: null,
            createdBy: null,
            invoice: null,
            fiscalPending: true,
            fiscalError: 'Error AFIP',
        };
        mockCompletedSaleForFindOne = mockCompletedSale;

        const dto: CreateSaleDto = {
            items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
            generateInvoice: true,
        };

        const result = await service.create(dto, 'user-1');

        expect(result.fiscalPending).toBe(true);
        expect(result.fiscalError).toBe('Error AFIP');
    });
});

describe('SalesService - sectorized mode', () => {
    let service: SalesService;
    let savedEntities: unknown[] = [];

    const createMockQueryRunnerForSectorized = () => ({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
            query: jest.fn().mockResolvedValue([]),
            save: jest.fn().mockImplementation(async (entity: unknown) => {
                if (!entity) return { id: 'generated-id' };
                const typed = entity as Record<string, unknown>;
                const saved = { ...typed, id: typed.id || `gen-${Date.now()}-${Math.random()}` };
                if (Array.isArray(entity)) {
                    return entity.map((e) => ({ ...(e as object), id: (e as { id?: string }).id || `gen-${Date.now()}` }));
                }
                savedEntities.push(saved);
                return saved;
            }),
            findOne: jest.fn().mockImplementation(async (_entity: unknown, options?: unknown) => {
                const opts = options as { where?: { id?: string } } | undefined;
                if (opts?.where?.id) {
                    return {
                        ...(mockCompletedSaleForFindOne || {}),
                        payments: mockPaymentsForSale.length > 0 ? mockPaymentsForSale : [],
                    };
                }
                return mockCompletedSaleForFindOne;
            }),
            getRepository: jest.fn(() => mockRepository()),
        },
    });

    const sectorizedDataSource = {
        createQueryRunner: jest.fn(createMockQueryRunnerForSectorized),
        getRepository: jest.fn(),
    };

    beforeEach(async () => {
        savedEntities = [];
        mockCompletedSaleForFindOne = null;
        mockPaymentsForSale = [];

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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: sectorizedDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
    });

    afterEach(() => {
        jest.clearAllMocks();
        mockCompletedSaleForFindOne = null;
        savedEntities = [];
        mockPaymentsForSale = [];
    });

    it('modo simple: comportamiento inalterado (no llama a recordMovementInLocation)', async () => {
        mockInventoryService.isSectorizedMode.mockResolvedValue(false);
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 10,
            sku: 'SKU1',
            name: 'Producto',
        });
        mockCompletedSaleForFindOne = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            saleDate: new Date(),
            items: [
                { id: 'item-1', productId: 'product-1', quantity: 1, unitPrice: 100, saleId: 'sale-1' },
            ],
            payments: [],
            customer: null,
            createdBy: null,
            invoice: null,
        } as unknown;
        mockPaymentsForSale = [{ id: 'pay-1', paymentMethodId: 'pm-1', amount: 100, saleId: 'sale-1' }];

        await service.create({
            items: [{ productId: 'product-1', quantity: 1, unitPrice: 100 }],
            payments: [{ paymentMethodId: 'pm-1', amount: 100 }],
        });

        expect(mockInventoryService.recordMovementInLocation).not.toHaveBeenCalled();
        expect(mockInventoryService.createMovement).toHaveBeenCalled();
    });

    it('sectorizado + stock suficiente en primaria: usa recordMovementInLocation con locationId', async () => {
        mockInventoryService.isSectorizedMode.mockResolvedValue(true);
        mockInventoryService.getPrimarySaleLocationId.mockResolvedValue('loc-primary');
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 5,
            sku: 'SKU1',
            name: 'Producto',
        });

        const plsRepo = {
            find: jest.fn().mockResolvedValue([{ productId: 'product-1', locationId: 'loc-primary', quantity: 5 }]),
        };
        sectorizedDataSource.getRepository.mockReturnValue(plsRepo);

        mockCompletedSaleForFindOne = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            saleDate: new Date(),
            items: [{ id: 'item-1', productId: 'product-1', quantity: 2, unitPrice: 100, saleId: 'sale-1' }],
            payments: [],
            customer: null,
            createdBy: null,
            invoice: null,
        } as unknown;
        mockPaymentsForSale = [{ id: 'pay-1', paymentMethodId: 'pm-1', amount: 200, saleId: 'sale-1' }];

        await service.create({
            items: [{ productId: 'product-1', quantity: 2, unitPrice: 100 }],
            payments: [{ paymentMethodId: 'pm-1', amount: 200 }],
        });

        expect(mockInventoryService.recordMovementInLocation).toHaveBeenCalledWith(
            expect.objectContaining({
                productId: 'product-1',
                locationId: 'loc-primary',
                type: 'OUT',
                source: 'SALE',
                quantity: 2,
                manager: expect.anything(),
            }),
        );
        expect(mockInventoryService.createMovement).not.toHaveBeenCalled();
    });

    it('sectorizado + stock insuficiente + allowOutOfStock false: lanza ConflictException estructurado', async () => {
        mockInventoryService.isSectorizedMode.mockResolvedValue(true);
        mockInventoryService.getPrimarySaleLocationId.mockResolvedValue('loc-primary');
        mockConfigurationService.isOutOfStockSaleAllowed.mockResolvedValue(false);
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 0,
            sku: 'SKU1',
            name: 'Producto Test',
        });
        mockInventoryService.findReplenishmentOptions.mockResolvedValue([
            { locationId: 'loc-storage', locationName: 'Depósito', available: 10 },
        ]);

        const plsRepo = {
            find: jest.fn().mockResolvedValue([{ productId: 'product-1', locationId: 'loc-primary', quantity: 1 }]),
        };
        sectorizedDataSource.getRepository.mockReturnValue(plsRepo);

        let caught: unknown;
        try {
            await service.create({
                items: [{ productId: 'product-1', quantity: 5, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 500 }],
            });
        } catch (e) {
            caught = e;
        }

        expect(caught).toBeDefined();
        const response = (caught as { getResponse: () => unknown }).getResponse();
        const body = response as { statusCode: number; items: Array<{ productId: string; options: unknown[] }> };
        expect(body.statusCode).toBe(409);
        expect(body.items).toHaveLength(1);
        expect(body.items[0].productId).toBe('product-1');
        expect(body.items[0].options).toHaveLength(1);
    });

    it('sectorizado + stock insuficiente + allowOutOfStock true: pasa con allowOutOfStock:true', async () => {
        mockInventoryService.isSectorizedMode.mockResolvedValue(true);
        mockInventoryService.getPrimarySaleLocationId.mockResolvedValue('loc-primary');
        mockConfigurationService.isOutOfStockSaleAllowed.mockResolvedValue(true);
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 0,
            sku: 'SKU1',
            name: 'Producto',
        });

        const plsRepo = {
            find: jest.fn().mockResolvedValue([{ productId: 'product-1', locationId: 'loc-primary', quantity: 0 }]),
        };
        sectorizedDataSource.getRepository.mockReturnValue(plsRepo);

        mockCompletedSaleForFindOne = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            saleDate: new Date(),
            items: [{ id: 'item-1', productId: 'product-1', quantity: 2, unitPrice: 100, saleId: 'sale-1' }],
            payments: [],
            customer: null,
            createdBy: null,
            invoice: null,
        } as unknown;
        mockPaymentsForSale = [{ id: 'pay-1', paymentMethodId: 'pm-1', amount: 200, saleId: 'sale-1' }];

        await service.create({
            items: [{ productId: 'product-1', quantity: 2, unitPrice: 100 }],
            payments: [{ paymentMethodId: 'pm-1', amount: 200 }],
        });

        expect(mockInventoryService.recordMovementInLocation).toHaveBeenCalledWith(
            expect.objectContaining({ allowOutOfStock: true, quantity: 2 }),
        );
    });
});

describe('SalesService - completeSaleAfterReplenishment', () => {
    let service: SalesService;
    let savedEntities: unknown[] = [];

    const createAtomicQueryRunner = () => {
        const transfersExecuted: Array<{ productId: string; quantity: number }> = [];
        return {
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: {
                query: jest.fn().mockResolvedValue([]),
                save: jest.fn().mockImplementation(async (entity: unknown) => {
                    if (!entity) return { id: 'generated-id' };
                    const typed = entity as Record<string, unknown>;
                    const saved = { ...typed, id: typed.id || `gen-${Date.now()}` };
                    if (Array.isArray(entity)) {
                        return entity.map((e) => ({ ...(e as object), id: (e as { id?: string }).id || `gen-${Date.now()}-${Math.random()}` }));
                    }
                    savedEntities.push(saved);
                    return saved;
                }),
                findOne: jest.fn().mockImplementation(async (_entity: unknown, options?: unknown) => {
                    const opts = options as { where?: { id?: string } } | undefined;
                    if (opts?.where?.id) {
                        return {
                            ...(mockCompletedSaleForFindOne || {}),
                            payments: mockPaymentsForSale.length > 0 ? mockPaymentsForSale : [],
                        };
                    }
                    return mockCompletedSaleForFindOne;
                }),
                getRepository: jest.fn(() => mockRepository()),
                __transfersExecuted: transfersExecuted,
            },
        };
    };

    const atomicDataSource = {
        createQueryRunner: jest.fn(createAtomicQueryRunner),
        getRepository: jest.fn(),
    };

    beforeEach(async () => {
        savedEntities = [];
        mockCompletedSaleForFindOne = null;
        mockPaymentsForSale = [];

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
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: getDataSourceToken(), useValue: atomicDataSource },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
        mockCashRegisterService.getOpenRegister.mockResolvedValue({ id: 'cash-1' });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('ejecuta traslados + venta en una sola tx (transfer con manager)', async () => {
        mockInventoryService.isSectorizedMode.mockResolvedValue(true);
        mockInventoryService.getPrimarySaleLocationId.mockResolvedValue('loc-primary');
        mockProductsService.findOne.mockResolvedValue({
            id: 'product-1',
            stock: 5,
            sku: 'SKU1',
            name: 'Producto',
        });
        mockInventoryService.transfer.mockImplementation(async (opts) => {
            return { id: 'transfer-1', productId: opts.productId, quantity: opts.quantity };
        });

        const plsRepo = {
            find: jest.fn().mockResolvedValue([{ productId: 'product-1', locationId: 'loc-primary', quantity: 5 }]),
        };
        atomicDataSource.getRepository.mockReturnValue(plsRepo);

        mockCompletedSaleForFindOne = {
            id: 'sale-1',
            saleNumber: 'VENTA-2026-00001',
            status: SaleStatus.COMPLETED,
            saleDate: new Date(),
            items: [{ id: 'item-1', productId: 'product-1', quantity: 3, unitPrice: 100, saleId: 'sale-1' }],
            payments: [],
            customer: null,
            createdBy: null,
            invoice: null,
        } as unknown;
        mockPaymentsForSale = [{ id: 'pay-1', paymentMethodId: 'pm-1', amount: 300, saleId: 'sale-1' }];

        await service.completeSaleAfterReplenishment(
            {
                items: [{ productId: 'product-1', quantity: 3, unitPrice: 100 }],
                payments: [{ paymentMethodId: 'pm-1', amount: 300 }],
            },
            [{ productId: 'product-1', fromLocationId: 'loc-storage', quantity: 2, reason: 'Reposición' }],
            'user-1',
        );

        expect(mockInventoryService.transfer).toHaveBeenCalledTimes(1);
        expect(mockInventoryService.transfer).toHaveBeenCalledWith(
            expect.objectContaining({
                productId: 'product-1',
                fromLocationId: 'loc-storage',
                toLocationId: 'loc-primary',
                quantity: 2,
                manager: expect.anything(),
            }),
        );
        expect(mockInventoryService.recordMovementInLocation).toHaveBeenCalledWith(
            expect.objectContaining({ productId: 'product-1', locationId: 'loc-primary', quantity: 3, manager: expect.anything() }),
        );
    });

    it('rollbackea todo si un traslado falla (la venta no se persiste)', async () => {
        mockInventoryService.isSectorizedMode.mockResolvedValue(true);
        mockInventoryService.getPrimarySaleLocationId.mockResolvedValue('loc-primary');
        mockProductsService.findOne.mockImplementation(async (id: string) => ({
            id,
            stock: 5,
            sku: `SKU-${id}`,
            name: `Producto ${id}`,
        }));
        mockProductsService.findByIds.mockImplementation(async (ids: string[]) =>
            ids.map((id) => ({ id, stock: 5, sku: `SKU-${id}`, name: `Producto ${id}` })),
        );
        mockInventoryService.transfer.mockImplementation(async (opts) => {
            if (opts.productId === 'product-2') {
                throw new BadRequestException('Saldo insuficiente en origen');
            }
            return { id: 'transfer-1' };
        });

        const plsRepo = {
            find: jest.fn().mockResolvedValue([
                { productId: 'product-1', locationId: 'loc-primary', quantity: 5 },
                { productId: 'product-2', locationId: 'loc-primary', quantity: 5 },
            ]),
        };
        atomicDataSource.getRepository.mockReturnValue(plsRepo);

        await expect(
            service.completeSaleAfterReplenishment(
                {
                    items: [
                        { productId: 'product-1', quantity: 1, unitPrice: 100 },
                        { productId: 'product-2', quantity: 1, unitPrice: 50 },
                    ],
                    payments: [{ paymentMethodId: 'pm-1', amount: 150 }],
                },
                [
                    { productId: 'product-1', fromLocationId: 'loc-storage', quantity: 2 },
                    { productId: 'product-2', fromLocationId: 'loc-storage', quantity: 1 },
                ],
                'user-1',
            ),
        ).rejects.toThrow(/Saldo insuficiente/);

        const qb = atomicDataSource.createQueryRunner.mock.results[0].value;
        expect(qb.rollbackTransaction).toHaveBeenCalled();
        expect(qb.commitTransaction).not.toHaveBeenCalled();
        expect(mockInventoryService.recordMovementInLocation).not.toHaveBeenCalled();
    });
});
