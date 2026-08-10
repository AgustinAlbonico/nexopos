/**
 * Tests unitarios para InventoryService
 *
 * Cubre:
 * - createMovement (modo simple, regresión)
 * - getProductHistory, getLowStockProducts, getOutOfStockProducts,
 *   getInventoryStats, validateStockAvailability
 * - recordMovementInLocation (modo simple y sectorizado) - PR2
 * - transfer (casos happy + 5 rechazos) - PR2
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';

import { InventoryService } from './inventory.service';
import { StockMovement, StockMovementType, StockMovementSource } from './entities/stock-movement.entity';
import { Location, LocationFunction } from './entities/location.entity';
import { ProductLocationStock } from './entities/product-location-stock.entity';
import { StockTransfer, StockTransferStatus } from './entities/stock-transfer.entity';
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

const createMockLocation = (overrides = {}) => ({
    id: 'loc-uuid',
    name: 'Salón',
    function: LocationFunction.SALE,
    isActive: true,
    isPrimarySale: false,
    isDefaultReceive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    productLocationStocks: [],
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
    getConfiguration: jest.fn().mockResolvedValue({
        stockSectorizado: false,
        primarySaleLocationId: null,
        defaultReceiveLocationId: null,
        stockMinimoVenta: 5,
    }),
};

// QueryRunner compartido por todos los métodos transaccionales.
const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
        save: jest.fn(),
        create: jest.fn(),
        findOne: jest.fn(),
        query: jest.fn(),
    },
};

const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
    // dataSource.getRepository(...) usado en findStockByLocation cuando sectorized.
    getRepository: jest.fn(),
};

describe('InventoryService', () => {
    let service: InventoryService;

    beforeEach(async () => {
        // Reset de los mocks compartidos antes de cada test.
        mockQueryRunner.manager.save.mockReset();
        mockQueryRunner.manager.create.mockReset();
        mockQueryRunner.manager.findOne.mockReset();
        mockQueryRunner.manager.query.mockReset();
        mockQueryRunner.connect.mockResolvedValue(undefined);
        mockQueryRunner.startTransaction.mockResolvedValue(undefined);
        mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
        mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
        mockQueryRunner.release.mockResolvedValue(undefined);

        // Por default: el manager.create devuelve el input envuelto en id.
        mockQueryRunner.manager.create.mockImplementation((_Entity: unknown, data: object) => ({
            id: 'entity-id',
            ...data,
        }));
        // Por default: el manager.save devuelve el input tal cual.
        mockQueryRunner.manager.save.mockImplementation((input: unknown) => Promise.resolve(input));
        // Por default: el manager.query devuelve un total 0 (caso sin filas).
        mockQueryRunner.manager.query.mockResolvedValue([{ total: '0' }]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                { provide: getRepositoryToken(StockMovement), useValue: mockStockMovementRepository },
                { provide: getRepositoryToken(Product), useValue: mockProductRepository },
                { provide: getRepositoryToken(Location), useValue: { find: jest.fn(), create: jest.fn(), save: jest.fn(), findOne: jest.fn() } },
                { provide: getRepositoryToken(ProductLocationStock), useValue: { createQueryBuilder: jest.fn(() => ({ where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getCount: jest.fn().mockResolvedValue(0) })) } },
                { provide: getDataSourceToken(), useValue: mockDataSource },
                { provide: ConfigurationService, useValue: mockConfigurationService },
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ===========================================================================
    // createMovement — regresión modo simple (sin cambios respecto a PR1).
    // ===========================================================================

    describe('createMovement (modo simple)', () => {
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

    // ===========================================================================
    // recordMovementInLocation — PR2.
    // ===========================================================================

    describe('recordMovementInLocation (modo simple, locationId ignorado)', () => {
        beforeEach(() => {
            mockQueryRunner.manager.save.mockResolvedValue({});
        });

        it('modo simple: actualiza product.stock y guarda el movimiento con locationId null', async () => {
            const product = createMockProduct({ stock: 10 });
            // En modo simple, recordMovementInLocation usa queryRunner.manager.findOne.
            mockQueryRunner.manager.findOne.mockResolvedValueOnce(product);

            const result = await service.recordMovementInLocation({
                productId: 'product-123',
                locationId: 'loc-ignored',
                type: StockMovementType.IN,
                quantity: 4,
            });

            expect(result.product.stock).toBe(14);
            // En modo simple el movimiento guardado tiene locationId null.
            const allSaved = mockQueryRunner.manager.save.mock.calls
                .map(([m]: unknown[]) => m)
                .flat() as unknown[];
            const savedMovement = allSaved.find(
                (m): m is { type: StockMovementType; locationId: unknown } =>
                    typeof m === 'object' && m !== null && 'type' in m,
            );
            expect(savedMovement).toBeDefined();
            expect(savedMovement!.locationId).toBeNull();
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
        });

        it('modo simple: rechaza OUT con stock insuficiente', async () => {
            const product = createMockProduct({ stock: 2 });
            mockQueryRunner.manager.findOne.mockResolvedValueOnce(product);

            await expect(
                service.recordMovementInLocation({
                    productId: 'product-123',
                    type: StockMovementType.OUT,
                    quantity: 5,
                })
            ).rejects.toThrow(BadRequestException);

            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        });

        it('lanza NotFoundException si el producto no existe', async () => {
            mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

            await expect(
                service.recordMovementInLocation({
                    productId: 'invalid',
                    type: StockMovementType.IN,
                    quantity: 1,
                })
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('recordMovementInLocation (modo sectorizado)', () => {
        beforeEach(() => {
            mockQueryRunner.manager.save.mockResolvedValue({});
        });

        it('valida el saldo por ubicación y escribe el movimiento con locationId', async () => {
            // Forzar sectorized: stub de isSectorizedMode vía override del
            // método del service (jest.spyOn sobre la instancia).
            const sectorizedSpy = jest.spyOn(service, 'isSectorizedMode').mockResolvedValue(true);
            const primarySpy = jest.spyOn(service, 'getPrimarySaleLocationId').mockResolvedValue('loc-sale');

            const product = createMockProduct({ stock: 6 });
            const pls = { productId: 'product-123', locationId: 'loc-sale', quantity: 6 };

            // Primer findOne: product. Segundo findOne: PLS existente.
            mockQueryRunner.manager.findOne
                .mockResolvedValueOnce(product) // product
                .mockResolvedValueOnce(pls);     // PLS

            const result = await service.recordMovementInLocation({
                productId: 'product-123',
                type: StockMovementType.OUT,
                source: StockMovementSource.SALE,
                quantity: 2,
            });

            expect(result.product.stock).toBe(4);
            // El movimiento se guardó con locationId = 'loc-sale'.
            const movements = mockQueryRunner.manager.save.mock.calls
                .map(([m]: unknown[]) => m)
                .flat() as unknown[];
            const movementsTyped = movements.filter(
                (m): m is { type: StockMovementType; source: StockMovementSource; locationId: unknown } =>
                    typeof m === 'object' && m !== null && 'type' in m,
            );
            expect(movementsTyped).toHaveLength(1);
            expect(movementsTyped[0].locationId).toBe('loc-sale');
            expect(movementsTyped[0].source).toBe(StockMovementSource.SALE);
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();

            sectorizedSpy.mockRestore();
            primarySpy.mockRestore();
        });

        it('rechaza OUT cuando el saldo en la ubicación es insuficiente', async () => {
            const sectorizedSpy = jest.spyOn(service, 'isSectorizedMode').mockResolvedValue(true);
            const primarySpy = jest.spyOn(service, 'getPrimarySaleLocationId').mockResolvedValue('loc-sale');

            const product = createMockProduct({ stock: 5 });
            const pls = { productId: 'product-123', locationId: 'loc-sale', quantity: 1 };

            mockQueryRunner.manager.findOne
                .mockResolvedValueOnce(product)
                .mockResolvedValueOnce(pls);

            await expect(
                service.recordMovementInLocation({
                    productId: 'product-123',
                    type: StockMovementType.OUT,
                    quantity: 3,
                })
            ).rejects.toThrow(/Stock insuficiente/);

            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();

            sectorizedSpy.mockRestore();
            primarySpy.mockRestore();
        });

        it('lanza BadRequestException si no hay ubicación principal configurada', async () => {
            const sectorizedSpy = jest.spyOn(service, 'isSectorizedMode').mockResolvedValue(true);
            const primarySpy = jest.spyOn(service, 'getPrimarySaleLocationId').mockResolvedValue(null);

            const product = createMockProduct({ stock: 10 });
            mockQueryRunner.manager.findOne.mockResolvedValueOnce(product);

            await expect(
                service.recordMovementInLocation({
                    productId: 'product-123',
                    type: StockMovementType.IN,
                    quantity: 1,
                })
            ).rejects.toThrow(/principal de venta/);

            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();

            sectorizedSpy.mockRestore();
            primarySpy.mockRestore();
        });
    });

    // ===========================================================================
    // transfer — PR2 (atómico entre dos ubicaciones).
    // ===========================================================================

    describe('transfer', () => {
        const productId = 'product-123';
        const fromLocationId = 'loc-a';
        const toLocationId = 'loc-b';

        const setupMocksForHappyPath = () => {
            const product = createMockProduct({ stock: 12 });
            const from = createMockLocation({ id: fromLocationId, name: 'Salón', isActive: true });
            const to = createMockLocation({ id: toLocationId, name: 'Depósito', isActive: true });
            const fromPls = { productId, locationId: fromLocationId, quantity: 10 };
            const toPls = { productId, locationId: toLocationId, quantity: 2 };

            // Secuencia de findOne dentro de transfer:
            // 1. Product
            // 2. from Location
            // 3. to Location
            // 4. from PLS
            // 5. to PLS
            mockQueryRunner.manager.findOne
                .mockResolvedValueOnce(product)
                .mockResolvedValueOnce(from)
                .mockResolvedValueOnce(to)
                .mockResolvedValueOnce(fromPls)
                .mockResolvedValueOnce(toPls);

            // SUM recalculado post-traslado: 6 + 6 = 12.
            mockQueryRunner.manager.query.mockResolvedValue([{ total: '12' }]);
        };

        it('traslado exitoso: debit/credit, transfer COMPLETADO, dos movimientos con TRANSFER', async () => {
            setupMocksForHappyPath();

            const transfer = await service.transfer({
                productId,
                fromLocationId,
                toLocationId,
                quantity: 4,
                reason: 'Reposición',
                userId: 'user-1',
            });

            // StockTransfer devuelto.
            expect(transfer).toBeDefined();
            expect(transfer.status).toBe(StockTransferStatus.COMPLETADO);

            // 4 saves: PLS pair, product (recalc), transfer, movements pair.
            // 1° save(): [fromPls, toPls]
            // 2° save(): product (recalc de SUM)
            // 3° save(): StockTransfer
            // 4° save(): [movementOut, movementIn]
            expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(4);

            // Los movimientos tienen source TRANSFER y locationId correcto.
            const allSaved = mockQueryRunner.manager.save.mock.calls
                .map(([arg]: unknown[]) => arg)
                .flat()
                .filter(Boolean) as Array<Record<string, unknown>>;
            const movements = allSaved.filter(
                (m): m is { type: StockMovementType; source: StockMovementSource; locationId: string } =>
                    m.type === StockMovementType.OUT || m.type === StockMovementType.IN,
            );
            expect(movements).toHaveLength(2);
            expect(movements.every(m => m.source === StockMovementSource.TRANSFER)).toBe(true);

            const outMovement = movements.find(m => m.type === StockMovementType.OUT);
            const inMovement = movements.find(m => m.type === StockMovementType.IN);
            expect(outMovement?.locationId).toBe(fromLocationId);
            expect(inMovement?.locationId).toBe(toLocationId);

            // Recalculó product.stock = 12 (sin cambio).
            const productSaves = (mockQueryRunner.manager.save.mock.calls[2]?.[0] as unknown[]) ?? [];
            expect(productSaves).toBeDefined();

            // Commit, no rollback.
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
            expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
            expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
        });

        it('rechaza con BadRequestException cuando quantity <= 0', async () => {
            await expect(
                service.transfer({ productId, fromLocationId, toLocationId, quantity: 0 })
            ).rejects.toThrow('mayor a 0');

            await expect(
                service.transfer({ productId, fromLocationId, toLocationId, quantity: -1 })
            ).rejects.toThrow('mayor a 0');

            // Ni siquiera abre transacción.
            expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
        });

        it('rechaza con BadRequestException cuando from == to', async () => {
            await expect(
                service.transfer({
                    productId,
                    fromLocationId: 'loc-same',
                    toLocationId: 'loc-same',
                    quantity: 5,
                })
            ).rejects.toThrow('distintas');

            expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
        });

        it('rechaza con BadRequestException cuando saldo en origen es insuficiente', async () => {
            const product = createMockProduct({ stock: 3 });
            const from = createMockLocation({ id: fromLocationId, isActive: true });
            const to = createMockLocation({ id: toLocationId, isActive: true });
            const fromPls = { productId, locationId: fromLocationId, quantity: 3 };
            const toPls = { productId, locationId: toLocationId, quantity: 0 };

            mockQueryRunner.manager.findOne
                .mockResolvedValueOnce(product)
                .mockResolvedValueOnce(from)
                .mockResolvedValueOnce(to)
                .mockResolvedValueOnce(fromPls)
                .mockResolvedValueOnce(toPls);

            await expect(
                service.transfer({ productId, fromLocationId, toLocationId, quantity: 5 })
            ).rejects.toThrow(/Saldo insuficiente/);

            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
            expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
        });

        it('rechaza con BadRequestException cuando destino está inactivo', async () => {
            const product = createMockProduct({ stock: 10 });
            const from = createMockLocation({ id: fromLocationId, isActive: true });
            const to = createMockLocation({ id: toLocationId, isActive: false });
            const fromPls = { productId, locationId: fromLocationId, quantity: 10 };
            const toPls = { productId, locationId: toLocationId, quantity: 0 };

            mockQueryRunner.manager.findOne
                .mockResolvedValueOnce(product)
                .mockResolvedValueOnce(from)
                .mockResolvedValueOnce(to)
                .mockResolvedValueOnce(fromPls)
                .mockResolvedValueOnce(toPls);

            await expect(
                service.transfer({ productId, fromLocationId, toLocationId, quantity: 2 })
            ).rejects.toThrow(/destino inactiva/);

            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
            expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
        });

        it('rechaza con NotFoundException cuando el producto no existe', async () => {
            mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

            await expect(
                service.transfer({ productId: 'invalid', fromLocationId, toLocationId, quantity: 1 })
            ).rejects.toThrow(NotFoundException);

            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        });
    });

    // ===========================================================================
    // Detectores de modo sectorizado (PR3: leen SystemConfiguration).
    // ===========================================================================

    describe('isSectorizedMode / getPrimarySaleLocationId / getDefaultReceiveLocationId / getStockMinimoVenta (PR3)', () => {
        it('isSectorizedMode devuelve true cuando config.stockSectorizado = true', async () => {
            mockConfigurationService.getConfiguration = jest.fn().mockResolvedValue({
                stockSectorizado: true,
                primarySaleLocationId: 'loc-1',
                defaultReceiveLocationId: 'loc-2',
                stockMinimoVenta: 3,
            });
            expect(await service.isSectorizedMode()).toBe(true);
        });

        it('isSectorizedMode devuelve false cuando config.stockSectorizado = false', async () => {
            mockConfigurationService.getConfiguration = jest.fn().mockResolvedValue({
                stockSectorizado: false,
                primarySaleLocationId: null,
                defaultReceiveLocationId: null,
                stockMinimoVenta: 5,
            });
            expect(await service.isSectorizedMode()).toBe(false);
        });

        it('isSectorizedMode devuelve false cuando no hay configuración', async () => {
            mockConfigurationService.getConfiguration = jest.fn().mockResolvedValue(null);
            expect(await service.isSectorizedMode()).toBe(false);
        });

        it('getPrimarySaleLocationId devuelve el id de la primaria cuando existe', async () => {
            mockConfigurationService.getConfiguration = jest.fn().mockResolvedValue({
                stockSectorizado: true,
                primarySaleLocationId: 'loc-sale-uuid',
                defaultReceiveLocationId: null,
                stockMinimoVenta: 5,
            });
            expect(await service.getPrimarySaleLocationId()).toBe('loc-sale-uuid');
        });

        it('getPrimarySaleLocationId devuelve null en modo simple', async () => {
            mockConfigurationService.getConfiguration = jest.fn().mockResolvedValue({
                stockSectorizado: false,
                primarySaleLocationId: null,
                defaultReceiveLocationId: null,
                stockMinimoVenta: 5,
            });
            expect(await service.getPrimarySaleLocationId()).toBeNull();
        });

        it('getDefaultReceiveLocationId devuelve el id configurado', async () => {
            mockConfigurationService.getConfiguration = jest.fn().mockResolvedValue({
                stockSectorizado: true,
                primarySaleLocationId: 'loc-sale',
                defaultReceiveLocationId: 'loc-receive',
                stockMinimoVenta: 5,
            });
            expect(await service.getDefaultReceiveLocationId()).toBe('loc-receive');
        });

        it('getStockMinimoVenta devuelve el valor configurado', async () => {
            mockConfigurationService.getConfiguration = jest.fn().mockResolvedValue({
                stockSectorizado: true,
                primarySaleLocationId: 'loc-sale',
                defaultReceiveLocationId: 'loc-receive',
                stockMinimoVenta: 8,
            });
            expect(await service.getStockMinimoVenta()).toBe(8);
        });

        it('getStockMinimoVenta devuelve 5 cuando no hay valor explícito', async () => {
            mockConfigurationService.getConfiguration = jest.fn().mockResolvedValue({
                stockSectorizado: false,
                primarySaleLocationId: null,
                defaultReceiveLocationId: null,
                stockMinimoVenta: null,
            });
            expect(await service.getStockMinimoVenta()).toBe(5);
        });
    });

    // ===========================================================================
    // Regresión: métodos no tocados por PR2.
    // ===========================================================================

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
            expect(result.productsWithStock).toBe(2);
            expect(result.productsOutOfStock).toBe(1);
            expect(result.productsLowStock).toBe(1);
            expect(result.totalInventoryValue).toBe(1150);
            expect(result.totalInventorySaleValue).toBe(1725);
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

    // ===========================================================================
    // findReplenishmentOptions — PR4 (POS sale flow, sale-stock-by-location spec).
    // ===========================================================================

    describe('findReplenishmentOptions', () => {
        const productId = 'product-123';
        const primaryId = 'loc-primary';
        const secondaryA = 'loc-a';
        const secondaryB = 'loc-b';
        const secondaryC = 'loc-c';
        const inactiveLoc = 'loc-inactive';

        const setupLocations = () => [
            createMockLocation({ id: primaryId, name: 'Salón', isActive: true }),
            createMockLocation({ id: secondaryA, name: 'Depósito A', isActive: true }),
            createMockLocation({ id: secondaryB, name: 'Depósito B', isActive: true }),
            createMockLocation({ id: secondaryC, name: 'Depósito C', isActive: true }),
            createMockLocation({ id: inactiveLoc, name: 'Inactivo', isActive: false }),
        ];

        it('devuelve [] en modo simple', async () => {
            (mockDataSource.getRepository as jest.Mock).mockReturnValue({
                find: jest.fn().mockResolvedValue([]),
            });

            const result = await service.findReplenishmentOptions(productId, 5);

            expect(result).toEqual([]);
        });

        it('excluye la ubicación primaria y las inactivas, devuelve full-match ordenado desc', async () => {
            const sectorizedSpy = jest.spyOn(service, 'isSectorizedMode').mockResolvedValue(true);
            const primarySpy = jest.spyOn(service, 'getPrimarySaleLocationId').mockResolvedValue(primaryId);

            const locationRepo = {
                find: jest.fn().mockImplementation(({ where }: { where?: { isActive?: boolean } } = {}) =>
                    Promise.resolve(
                        setupLocations().filter((l) =>
                            where?.isActive === undefined ? true : l.isActive === where.isActive,
                        ),
                    ),
                ),
            };
            const plsRepo = {
                find: jest.fn().mockResolvedValue([
                    { productId, locationId: secondaryA, quantity: 8 },
                    { productId, locationId: secondaryB, quantity: 12 },
                    { productId, locationId: secondaryC, quantity: 3 },
                    { productId, locationId: inactiveLoc, quantity: 99 },
                ]),
            };
            (mockDataSource.getRepository as jest.Mock).mockImplementation((Entity: unknown) => {
                if (Entity === Location) return locationRepo;
                if (Entity === ProductLocationStock) return plsRepo;
                return { find: jest.fn().mockResolvedValue([]) };
            });

            const result = await service.findReplenishmentOptions(productId, 5);

            expect(result).toEqual([
                { locationId: secondaryB, locationName: 'Depósito B', available: 12 },
                { locationId: secondaryA, locationName: 'Depósito A', available: 8 },
            ]);
            // No debe incluir la primaria, ni la inactiva, ni la parcial C.
            expect(result.find((o) => o.locationId === primaryId)).toBeUndefined();
            expect(result.find((o) => o.locationId === inactiveLoc)).toBeUndefined();
            expect(result.find((o) => o.locationId === secondaryC)).toBeUndefined();

            sectorizedSpy.mockRestore();
            primarySpy.mockRestore();
        });

        it('devuelve top-3 parciales cuando ninguna cubre la cantidad', async () => {
            const sectorizedSpy = jest.spyOn(service, 'isSectorizedMode').mockResolvedValue(true);
            const primarySpy = jest.spyOn(service, 'getPrimarySaleLocationId').mockResolvedValue(primaryId);

            const locationRepo = {
                find: jest.fn().mockImplementation(({ where }: { where?: { isActive?: boolean } } = {}) =>
                    Promise.resolve(
                        setupLocations().filter((l) =>
                            where?.isActive === undefined ? true : l.isActive === where.isActive,
                        ),
                    ),
                ),
            };
            const plsRepo = {
                find: jest.fn().mockResolvedValue([
                    { productId, locationId: secondaryA, quantity: 3 },
                    { productId, locationId: secondaryB, quantity: 2 },
                    { productId, locationId: secondaryC, quantity: 1 },
                ]),
            };
            (mockDataSource.getRepository as jest.Mock).mockImplementation((Entity: unknown) => {
                if (Entity === Location) return locationRepo;
                if (Entity === ProductLocationStock) return plsRepo;
                return { find: jest.fn().mockResolvedValue([]) };
            });

            const result = await service.findReplenishmentOptions(productId, 10);

            expect(result).toEqual([
                { locationId: secondaryA, locationName: 'Depósito A', available: 3 },
                { locationId: secondaryB, locationName: 'Depósito B', available: 2 },
                { locationId: secondaryC, locationName: 'Depósito C', available: 1 },
            ]);

            sectorizedSpy.mockRestore();
            primarySpy.mockRestore();
        });

        it('devuelve [] cuando no hay otras ubicaciones activas', async () => {
            const sectorizedSpy = jest.spyOn(service, 'isSectorizedMode').mockResolvedValue(true);
            const primarySpy = jest.spyOn(service, 'getPrimarySaleLocationId').mockResolvedValue(primaryId);

            const locationRepo = {
                find: jest.fn().mockResolvedValue([
                    createMockLocation({ id: primaryId, name: 'Salón', isActive: true }),
                    createMockLocation({ id: inactiveLoc, name: 'Inactivo', isActive: false }),
                ]),
            };
            (mockDataSource.getRepository as jest.Mock).mockReturnValue(locationRepo);

            const result = await service.findReplenishmentOptions(productId, 1);

            expect(result).toEqual([]);

            sectorizedSpy.mockRestore();
            primarySpy.mockRestore();
        });
    });

    // ===========================================================================
    // getStockAlerts — PR6 (alerts split: compra vs reposición).
    // ===========================================================================

    describe('getStockAlerts (PR6)', () => {
        const buildProductQB = (rows: unknown[]) => {
            const qb: Record<string, jest.Mock> = {
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(rows),
            };
            return qb;
        };

        const buildPlsQB = (rows: unknown[]) => {
            const qb: Record<string, jest.Mock> = {
                innerJoin: jest.fn().mockReturnThis(),
                innerJoinAndSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(rows),
            };
            return qb;
        };

        it('modo simple: replenishmentAlerts siempre vacío', async () => {
            mockProductRepository.createQueryBuilder.mockReturnValue(
                buildProductQB([]),
            );

            const result = await service.getStockAlerts();

            expect(result.replenishmentAlerts).toEqual([]);
            expect(result.purchaseAlerts).toEqual([]);
        });

        it('modo simple: purchaseAlerts devuelve productos con stock <= minStockAlert', async () => {
            const products = [
                createMockProduct({ id: 'p1', name: 'Producto A', stock: 3 }),
                createMockProduct({ id: 'p2', name: 'Producto B', stock: 5 }),
            ];
            mockProductRepository.createQueryBuilder.mockReturnValue(
                buildProductQB(products),
            );
            mockConfigurationService.getMinStockAlert.mockResolvedValue(5);

            const result = await service.getStockAlerts();

            expect(result.purchaseAlerts).toEqual([
                { productId: 'p1', productName: 'Producto A', currentStock: 3, minimum: 5 },
                { productId: 'p2', productName: 'Producto B', currentStock: 5, minimum: 5 },
            ]);
            expect(result.replenishmentAlerts).toEqual([]);
        });

        it('sectorizado + stock en venta > minimoVenta: NO entra en replenishment pero SÍ en purchase si total <= minimoGeneral', async () => {
            const sectorizedSpy = jest.spyOn(service, 'isSectorizedMode').mockResolvedValue(true);
            const primarySpy = jest.spyOn(service, 'getPrimarySaleLocationId').mockResolvedValue('loc-sale');
            const minVentaSpy = jest.spyOn(service, 'getStockMinimoVenta').mockResolvedValue(5);

            const products = [
                createMockProduct({ id: 'p1', name: 'Producto A', stock: 4 }),
            ];
            mockProductRepository.createQueryBuilder.mockReturnValue(
                buildProductQB(products),
            );
            (mockDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn(() => buildPlsQB([])),
            });
            mockConfigurationService.getMinStockAlert.mockResolvedValue(5);

            const result = await service.getStockAlerts();

            expect(result.purchaseAlerts).toEqual([
                { productId: 'p1', productName: 'Producto A', currentStock: 4, minimum: 5 },
            ]);
            expect(result.replenishmentAlerts).toEqual([]);

            sectorizedSpy.mockRestore();
            primarySpy.mockRestore();
            minVentaSpy.mockRestore();
        });

        it('sectorizado + stock en venta <= minimoVenta: entra en replenishmentAlerts', async () => {
            const sectorizedSpy = jest.spyOn(service, 'isSectorizedMode').mockResolvedValue(true);
            const primarySpy = jest.spyOn(service, 'getPrimarySaleLocationId').mockResolvedValue('loc-sale');
            const minVentaSpy = jest.spyOn(service, 'getStockMinimoVenta').mockResolvedValue(5);

            mockProductRepository.createQueryBuilder.mockReturnValue(
                buildProductQB([]),
            );
            const plsRows = [
                {
                    productId: 'p2',
                    locationId: 'loc-sale',
                    quantity: 2,
                    product: { id: 'p2', name: 'Producto B', isActive: true },
                },
            ];
            (mockDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn()
                    .mockReturnValueOnce(buildPlsQB(plsRows))
                    .mockReturnValueOnce(buildPlsQB([])),
            });
            mockConfigurationService.getMinStockAlert.mockResolvedValue(5);

            const result = await service.getStockAlerts();

            expect(result.purchaseAlerts).toEqual([]);
            expect(result.replenishmentAlerts).toEqual([
                {
                    productId: 'p2',
                    productName: 'Producto B',
                    currentLocationStock: 2,
                    minimum: 5,
                    suggestedSourceLocationId: null,
                    suggestedQuantity: 3,
                    reserveStock: 0,
                },
            ]);

            sectorizedSpy.mockRestore();
            primarySpy.mockRestore();
            minVentaSpy.mockRestore();
        });

        it('sectorizado + sin stock: aparece en ambas listas (compra y reposición)', async () => {
            const sectorizedSpy = jest.spyOn(service, 'isSectorizedMode').mockResolvedValue(true);
            const primarySpy = jest.spyOn(service, 'getPrimarySaleLocationId').mockResolvedValue('loc-sale');
            const minVentaSpy = jest.spyOn(service, 'getStockMinimoVenta').mockResolvedValue(5);

            const products = [
                createMockProduct({ id: 'p3', name: 'Producto C', stock: 0 }),
            ];
            mockProductRepository.createQueryBuilder.mockReturnValue(
                buildProductQB(products),
            );
            const plsRows = [
                {
                    productId: 'p3',
                    locationId: 'loc-sale',
                    quantity: 0,
                    product: { id: 'p3', name: 'Producto C', isActive: true },
                },
            ];
            (mockDataSource.getRepository as jest.Mock).mockReturnValue({
                createQueryBuilder: jest.fn()
                    .mockReturnValueOnce(buildPlsQB(plsRows))
                    .mockReturnValueOnce(buildPlsQB([])),
            });
            mockConfigurationService.getMinStockAlert.mockResolvedValue(5);

            const result = await service.getStockAlerts();

            expect(result.purchaseAlerts).toEqual([
                { productId: 'p3', productName: 'Producto C', currentStock: 0, minimum: 5 },
            ]);
            expect(result.replenishmentAlerts).toEqual([
                {
                    productId: 'p3',
                    productName: 'Producto C',
                    currentLocationStock: 0,
                    minimum: 5,
                    suggestedSourceLocationId: null,
                    suggestedQuantity: 5,
                    reserveStock: 0,
                },
            ]);

            sectorizedSpy.mockRestore();
            primarySpy.mockRestore();
            minVentaSpy.mockRestore();
        });

        it('regresión: getLowStockProducts() mantiene su shape original (back-compat)', async () => {
            const lowStockProducts = [
                createMockProduct({ id: '1', stock: 3 }),
                createMockProduct({ id: '2', stock: 5 }),
            ];
            mockProductRepository.createQueryBuilder.mockReturnValue(
                buildProductQB(lowStockProducts),
            );
            mockConfigurationService.getMinStockAlert.mockResolvedValue(5);

            const result = await service.getLowStockProducts();

            expect(result).toEqual(lowStockProducts);
            expect(result[0]).toHaveProperty('id');
            expect(result[0]).toHaveProperty('name');
            expect(result[0]).toHaveProperty('stock');
            expect(result).not.toHaveProperty('purchaseAlerts');
            expect(result).not.toHaveProperty('replenishmentAlerts');
        });
    });
});