/**
 * Tests unitarios para ConfigurationService
 * Cubre: getConfiguration, updateConfiguration, getDefaultProfitMargin,
 *        getMinStockAlert, updateAllProductsPrices
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';

import { ConfigurationService } from './configuration.service';
import { SystemConfiguration } from './entities/system-configuration.entity';

// Mock de configuración
const createMockConfig = (overrides = {}) => ({
    id: 'config-uuid-123',
    defaultProfitMargin: 30,
    minStockAlert: 5,
    barcodeScannerEnabled: false,
    barcodeScannerTimeoutMs: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

// Mock de producto
const createMockProduct = (overrides = {}) => ({
    id: 'product-uuid',
    name: 'Producto Test',
    cost: 100,
    price: 130,
    profitMargin: 30,
    useCustomMargin: false,
    isActive: true,
    categoryId: null,
    ...overrides,
});

// Mocks
const mockConfigRepository = {
    find: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
};

const mockProductRepository = {
    find: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
};

const mockCategoryRepository = {
    createQueryBuilder: jest.fn(),
};

const mockDataSource = {
    getRepository: jest.fn((entity) => {
        if (entity.name === 'Product') return mockProductRepository;
        if (entity.name === 'Category') return mockCategoryRepository;
        return {};
    }),
};

describe('ConfigurationService', () => {
    let service: ConfigurationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConfigurationService,
                { provide: getRepositoryToken(SystemConfiguration), useValue: mockConfigRepository },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<ConfigurationService>(ConfigurationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('onModuleInit', () => {
        it('crea configuración por defecto si no existe', async () => {
            mockConfigRepository.count.mockResolvedValue(0);
            mockConfigRepository.save.mockResolvedValue(createMockConfig());

            await service.onModuleInit();

            expect(mockConfigRepository.save).toHaveBeenCalledWith({
                defaultProfitMargin: 30,
                minStockAlert: 5,
                barcodeScannerEnabled: false,
                barcodeScannerTimeoutMs: 100,
            });
        });

        it('no crea configuración si ya existe', async () => {
            mockConfigRepository.count.mockResolvedValue(1);

            await service.onModuleInit();

            expect(mockConfigRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('getConfiguration', () => {
        it('retorna la configuración del sistema', async () => {
            const config = createMockConfig();
            mockConfigRepository.find.mockResolvedValue([config]);

            const result = await service.getConfiguration();

            expect(result).toEqual(config);
        });
    });

    describe('updateConfiguration', () => {
        it('actualiza la configuración correctamente', async () => {
            const oldConfig = createMockConfig();
            const updatedConfig = createMockConfig({ defaultProfitMargin: 40 });

            mockConfigRepository.find
                .mockResolvedValueOnce([oldConfig])
                .mockResolvedValueOnce([updatedConfig]);
            mockConfigRepository.update.mockResolvedValue({ affected: 1 });

            const result = await service.updateConfiguration({ defaultProfitMargin: 40 });

            expect(mockConfigRepository.update).toHaveBeenCalledWith(
                oldConfig.id,
                { defaultProfitMargin: 40 }
            );
            expect(result.defaultProfitMargin).toBe(40);
        });

        it('actualiza configuración del scanner de barras', async () => {
            const oldConfig = createMockConfig();
            const updatedConfig = createMockConfig({ barcodeScannerEnabled: true, barcodeScannerTimeoutMs: 200 });

            mockConfigRepository.find
                .mockResolvedValueOnce([oldConfig])
                .mockResolvedValueOnce([updatedConfig]);
            mockConfigRepository.update.mockResolvedValue({ affected: 1 });

            const result = await service.updateConfiguration({ barcodeScannerEnabled: true, barcodeScannerTimeoutMs: 200 });

            expect(mockConfigRepository.update).toHaveBeenCalledWith(
                oldConfig.id,
                { barcodeScannerEnabled: true, barcodeScannerTimeoutMs: 200 }
            );
            expect(result.barcodeScannerEnabled).toBe(true);
            expect(result.barcodeScannerTimeoutMs).toBe(200);
        });
    });

    describe('getDefaultProfitMargin', () => {
        it('retorna el margen de ganancia por defecto', async () => {
            mockConfigRepository.find.mockResolvedValue([createMockConfig({ defaultProfitMargin: 35 })]);

            const result = await service.getDefaultProfitMargin();

            expect(result).toBe(35);
        });

        it('convierte a número el valor decimal', async () => {
            mockConfigRepository.find.mockResolvedValue([createMockConfig({ defaultProfitMargin: '25.5' })]);

            const result = await service.getDefaultProfitMargin();

            expect(typeof result).toBe('number');
            expect(result).toBe(25.5);
        });
    });

    describe('getMinStockAlert', () => {
        it('retorna el nivel mínimo de stock para alertas', async () => {
            mockConfigRepository.find.mockResolvedValue([createMockConfig({ minStockAlert: 10 })]);

            const result = await service.getMinStockAlert();

            expect(result).toBe(10);
        });
    });

    describe('updateAllProductsPrices', () => {
        beforeEach(() => {
            mockConfigRepository.find.mockResolvedValue([createMockConfig({ defaultProfitMargin: 30 })]);
            mockConfigRepository.update.mockResolvedValue({ affected: 1 });

            const mockCategoryQB = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };
            mockCategoryRepository.createQueryBuilder.mockReturnValue(mockCategoryQB);
        });

        it('actualiza precios de productos sin margen personalizado', async () => {
            const products = [
                createMockProduct({ id: '1', cost: 100 }),
                createMockProduct({ id: '2', cost: 200 }),
            ];
            mockProductRepository.find.mockResolvedValue(products);
            mockProductRepository.count.mockResolvedValue(0); // Sin productos con margen custom
            mockProductRepository.save.mockResolvedValue(products);

            const result = await service.updateAllProductsPrices();

            expect(result.updated).toBe(2);
            expect(result.margin).toBe(30);
            expect(products[0].price).toBe(130); // 100 * 1.30
            expect(products[1].price).toBe(260); // 200 * 1.30
        });

        it('actualiza configuración cuando se pasa nuevo margen', async () => {
            mockProductRepository.find.mockResolvedValue([]);
            mockProductRepository.count.mockResolvedValue(0);
            mockProductRepository.save.mockResolvedValue([]);

            await service.updateAllProductsPrices(40);

            expect(mockConfigRepository.update).toHaveBeenCalledWith(
                expect.any(String),
                { defaultProfitMargin: 40 }
            );
        });

        it('reporta productos omitidos con margen personalizado', async () => {
            mockProductRepository.find.mockResolvedValue([]);
            mockProductRepository.count.mockResolvedValue(5); // 5 productos con useCustomMargin
            mockProductRepository.save.mockResolvedValue([]);

            const result = await service.updateAllProductsPrices();

            expect(result.skipped).toBe(5);
        });

        it('excluye productos de categorías con margen definido', async () => {
            const mockCategoryQB = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([{ id: 'cat-1' }]),
            };
            mockCategoryRepository.createQueryBuilder.mockReturnValue(mockCategoryQB);

            const mockProductQB = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
                getCount: jest.fn().mockResolvedValue(3),
            };
            mockProductRepository.createQueryBuilder.mockReturnValue(mockProductQB);
            mockProductRepository.count.mockResolvedValue(0);
            mockProductRepository.save.mockResolvedValue([]);

            const result = await service.updateAllProductsPrices();

            expect(result.skippedByCategory).toBe(3);
        });

        it('redondea precios a 2 decimales', async () => {
            const products = [
                createMockProduct({ cost: 33.33 }), // 33.33 * 1.30 = 43.329
            ];
            mockProductRepository.find.mockResolvedValue(products);
            mockProductRepository.count.mockResolvedValue(0);
            mockProductRepository.save.mockResolvedValue(products);

            await service.updateAllProductsPrices();

            expect(products[0].price).toBe(43.33); // Redondeado
        });
    });
});
