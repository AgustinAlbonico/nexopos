/**
 * Tests unitarios para InventoryService
 * Cubre: createMovement, getProductHistory, getLowStockProducts, 
 *        getOutOfStockProducts, getInventoryStats, validateStockAvailability
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';

import { InventoryService } from './inventory.service';
import { StockMovement, StockMovementType, StockMovementSource } from './entities/stock-movement.entity';
import { Product } from '../products/entities/product.entity';
import { ConfigurationService } from '../configuration/configuration.service';

// Mock factory para productos
const createMockProduct = (overrides = {}) => ({
    id: 'product-uuid-123',
    name: 'Producto Test',
    sku: 'SKU-001',
    stock: 10,
    cost: 100,
    price: 150,
    profitMargin: 50,
    isActive: true,
    ...overrides,
});

// Mocks
const mockStockMovementRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
};

const mockProductRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
};

const mockConfigurationService = {
    getMinStockAlert: jest.fn().mockResolvedValue(5),
    isOutOfStockSaleAllowed: jest.fn().mockResolvedValue(false),
};

const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
        save: jest.fn(),
    },
};

const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
};

describe('InventoryService', () => {
    let service: InventoryService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                { provide: getRepositoryToken(StockMovement), useValue: mockStockMovementRepository },
                { provide: getRepositoryToken(Product), useValue: mockProductRepository },
                { provide: getDataSourceToken(), useValue: mockDataSource },
                { provide: ConfigurationService, useValue: mockConfigurationService },
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createMovement', () => {
        const baseMovementDto = {
            productId: 'product-123',
            quantity: 5,
            type: StockMovementType.IN,
            date: new Date().toISOString(),
            notes: 'Test movement',
        };

        beforeEach(() => {
            mockStockMovementRepository.create.mockImplementation((data) => ({ id: 'mov-123', ...data }));
            mockQueryRunner.manager.save.mockResolvedValue({});
        });

        it('crea movimiento de entrada y aumenta stock', async () => {
            const product = createMockProduct({ stock: 10 });
            mockProductRepository.findOne.mockResolvedValue(product);

            const dto = { ...baseMovementDto, type: StockMovementType.IN, quantity: 5 };
            const result = await service.createMovement(dto);

            expect(result.product.stock).toBe(15); // 10 + 5
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
        });

        it('crea movimiento de salida y reduce stock', async () => {
            const product = createMockProduct({ stock: 10 });
            mockProductRepository.findOne.mockResolvedValue(product);

            const dto = { ...baseMovementDto, type: StockMovementType.OUT, quantity: 3 };
            const result = await service.createMovement(dto);

            expect(result.product.stock).toBe(7); // 10 - 3
        });

        it('lanza NotFoundException si producto no existe', async () => {
            mockProductRepository.findOne.mockResolvedValue(null);

            await expect(
                service.createMovement(baseMovementDto)
            ).rejects.toThrow(NotFoundException);

            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        });

        it('lanza BadRequestException si stock insuficiente para salida', async () => {
            const product = createMockProduct({ stock: 2 });
            mockProductRepository.findOne.mockResolvedValue(product);

            const dto = { ...baseMovementDto, type: StockMovementType.OUT, quantity: 5 };

            await expect(
                service.createMovement(dto)
            ).rejects.toThrow(BadRequestException);

            await expect(
                service.createMovement(dto)
            ).rejects.toThrow('Stock insuficiente');
        });

        it('permite salida con stock cero cuando source=SALE y allowOutOfStockSale=true', async () => {
            mockConfigurationService.isOutOfStockSaleAllowed.mockResolvedValue(true);
            const product = createMockProduct({ stock: 0 });
            mockProductRepository.findOne.mockResolvedValue(product);

            const dto = {
                ...baseMovementDto,
                type: StockMovementType.OUT,
                source: StockMovementSource.SALE,
                quantity: 1,
            };

            const result = await service.createMovement(dto);

            expect(result.product.stock).toBe(-1);
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
        });

        it('rechaza salida con stock cero cuando source=ADJUSTMENT aunque allowOutOfStockSale=true', async () => {
            mockConfigurationService.isOutOfStockSaleAllowed.mockResolvedValue(true);
            const product = createMockProduct({ stock: 0 });
            mockProductRepository.findOne.mockResolvedValue(product);

            const dto = {
                ...baseMovementDto,
                type: StockMovementType.OUT,
                source: StockMovementSource.ADJUSTMENT,
                quantity: 1,
            };

            await expect(service.createMovement(dto)).rejects.toThrow(BadRequestException);
            await expect(service.createMovement(dto)).rejects.toThrow('Stock insuficiente');
        });

        it('actualiza costo y precio cuando es compra con costo', async () => {
            const product = createMockProduct({ cost: 100, profitMargin: 50, price: 150 });
            mockProductRepository.findOne.mockResolvedValue(product);

            const dto = {
                ...baseMovementDto,
                type: StockMovementType.IN,
                source: StockMovementSource.PURCHASE,
                cost: 120,
            };

            await service.createMovement(dto);

            // El producto debería tener nuevo costo y precio recalculado
            expect(product.cost).toBe(120);
            expect(product.price).toBe(180); // 120 * 1.5
        });

        it('usa ADJUSTMENT como source por defecto', async () => {
            const product = createMockProduct();
            mockProductRepository.findOne.mockResolvedValue(product);

            await service.createMovement(baseMovementDto);

            expect(mockStockMovementRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    source: StockMovementSource.ADJUSTMENT,
                })
            );
        });
    });

    describe('getProductHistory', () => {
        it('retorna historial de movimientos del producto', async () => {
            const product = createMockProduct();
            const movements = [
                { id: 'mov-1', quantity: 5, type: StockMovementType.IN },
                { id: 'mov-2', quantity: 3, type: StockMovementType.OUT },
            ];

            mockProductRepository.findOne.mockResolvedValue(product);
            mockStockMovementRepository.find.mockResolvedValue(movements);

            const result = await service.getProductHistory('product-123');

            expect(result.product.id).toBe(product.id);
            expect(result.product.stock).toBe(product.stock);
            expect(result.movements).toEqual(movements);
        });

        it('lanza NotFoundException si producto no existe', async () => {
            mockProductRepository.findOne.mockResolvedValue(null);

            await expect(
                service.getProductHistory('invalid-id')
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('getLowStockProducts', () => {
        it('retorna productos con stock menor o igual al mínimo', async () => {
            const lowStockProducts = [
                createMockProduct({ id: '1', stock: 3 }),
                createMockProduct({ id: '2', stock: 5 }),
            ];

            const mockQB = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(lowStockProducts),
            };
            mockProductRepository.createQueryBuilder.mockReturnValue(mockQB);

            const result = await service.getLowStockProducts();

            expect(result).toEqual(lowStockProducts);
            expect(mockConfigurationService.getMinStockAlert).toHaveBeenCalled();
        });
    });

    describe('getOutOfStockProducts', () => {
        it('retorna productos sin stock', async () => {
            const outOfStockProducts = [
                createMockProduct({ id: '1', stock: 0 }),
                createMockProduct({ id: '2', stock: 0 }),
            ];

            mockProductRepository.find.mockResolvedValue(outOfStockProducts);

            const result = await service.getOutOfStockProducts();

            expect(result).toEqual(outOfStockProducts);
            expect(mockProductRepository.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { stock: 0, isActive: true },
                })
            );
        });
    });

    describe('getInventoryStats', () => {
        it('calcula estadísticas correctamente', async () => {
            const products = [
                createMockProduct({ stock: 10, cost: 100, price: 150 }), // Con stock
                createMockProduct({ stock: 3, cost: 50, price: 75 }),   // Stock bajo
                createMockProduct({ stock: 0, cost: 200, price: 300 }),  // Sin stock
            ];

            mockConfigurationService.getMinStockAlert.mockResolvedValue(5);
            mockProductRepository.find.mockResolvedValue(products);

            const result = await service.getInventoryStats();

            expect(result.totalProducts).toBe(3);
            expect(result.productsWithStock).toBe(2); // stock > 0
            expect(result.productsOutOfStock).toBe(1); // stock === 0
            expect(result.productsLowStock).toBe(1); // stock > 0 && stock <= 5
            expect(result.totalInventoryValue).toBe(1150); // (10*100) + (3*50) + (0*200)
            expect(result.totalInventorySaleValue).toBe(1725); // (10*150) + (3*75) + (0*300)
        });
    });

    describe('validateStockAvailability', () => {
        it('retorna available: true cuando hay stock suficiente', async () => {
            mockProductRepository.findOne
                .mockResolvedValueOnce(createMockProduct({ id: '1', stock: 10 }))
                .mockResolvedValueOnce(createMockProduct({ id: '2', stock: 20 }));

            const result = await service.validateStockAvailability([
                { productId: '1', quantity: 5 },
                { productId: '2', quantity: 10 },
            ]);

            expect(result.available).toBe(true);
            expect(result.insufficientProducts).toHaveLength(0);
        });

        it('retorna productos insuficientes cuando no hay stock', async () => {
            mockProductRepository.findOne
                .mockResolvedValueOnce(createMockProduct({ id: '1', name: 'Producto A', stock: 3 }))
                .mockResolvedValueOnce(createMockProduct({ id: '2', name: 'Producto B', stock: 20 }));

            const result = await service.validateStockAvailability([
                { productId: '1', quantity: 5 },
                { productId: '2', quantity: 10 },
            ]);

            expect(result.available).toBe(false);
            expect(result.insufficientProducts).toHaveLength(1);
            expect(result.insufficientProducts[0]).toEqual({
                productId: '1',
                name: 'Producto A',
                requested: 5,
                available: 3,
            });
        });

        it('marca producto no encontrado como insuficiente', async () => {
            mockProductRepository.findOne.mockResolvedValue(null);

            const result = await service.validateStockAvailability([
                { productId: 'invalid', quantity: 5 },
            ]);

            expect(result.available).toBe(false);
            expect(result.insufficientProducts[0].name).toBe('Producto no encontrado');
        });
    });
});
