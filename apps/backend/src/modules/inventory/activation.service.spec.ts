/**
 * Tests unitarios para ActivationService.
 *
 * Cubre:
 * - Activación exitosa con totales preservados (SUM pre == SUM post).
 * - Rechazo si el modo ya está activo.
 * - Validaciones de DTO (una primaria, un destino, ubicación inicial).
 * - Rollback ante error simulado en el medio de la distribución.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';

import { ActivationService } from './activation.service';
import { Location, LocationFunction } from './entities/location.entity';
import { ProductLocationStock } from './entities/product-location-stock.entity';
import { SystemConfiguration } from '../configuration/entities/system-configuration.entity';
import { Product } from '../products/entities/product.entity';
import { ActivateStockSectorizadoDto } from './dto/activate-stock-sectorizado.dto';

// QueryRunner compartido.
const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
        find: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        query: jest.fn(),
    },
};

const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
};

const mockLocationRepository = {};
const mockPlsRepository = {};
const mockConfigRepository = {};

const buildDto = (overrides: Partial<ActivateStockSectorizadoDto> = {}): ActivateStockSectorizadoDto => ({
    locations: [
        { name: 'Salón', function: LocationFunction.SALE, isPrimarySale: true },
        { name: 'Depósito', function: LocationFunction.STORAGE, isDefaultReceive: true },
    ],
    initialStockLocationName: 'Salón',
    ...overrides,
});

const buildConfig = (overrides = {}) => ({
    id: 'config-uuid',
    stockSectorizado: false,
    primarySaleLocationId: null,
    defaultReceiveLocationId: null,
    stockMinimoVenta: 5,
    ...overrides,
});

describe('ActivationService', () => {
    let service: ActivationService;

    beforeEach(async () => {
        mockQueryRunner.connect.mockResolvedValue(undefined);
        mockQueryRunner.startTransaction.mockResolvedValue(undefined);
        mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
        mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
        mockQueryRunner.release.mockResolvedValue(undefined);

        mockQueryRunner.manager.find.mockReset();
        mockQueryRunner.manager.save.mockReset();
        mockQueryRunner.manager.create.mockReset();
        mockQueryRunner.manager.update.mockReset();
        mockQueryRunner.manager.query.mockReset();

        // manager.create envuelve el input con id.
        mockQueryRunner.manager.create.mockImplementation((_Entity: unknown, data: object) => ({
            id: `loc-${Math.random().toString(36).slice(2, 8)}`,
            ...data,
        }));
        // manager.save devuelve el input tal cual.
        mockQueryRunner.manager.save.mockImplementation((input: unknown) => Promise.resolve(input));

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivationService,
                { provide: getRepositoryToken(Location), useValue: mockLocationRepository },
                { provide: getRepositoryToken(ProductLocationStock), useValue: mockPlsRepository },
                { provide: getRepositoryToken(SystemConfiguration), useValue: mockConfigRepository },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<ActivationService>(ActivationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validaciones previas', () => {
        it('rechaza cuando no hay exactamente una ubicación primaria de venta', async () => {
            const dto = buildDto({
                locations: [
                    { name: 'A', function: LocationFunction.SALE },
                    { name: 'B', function: LocationFunction.SALE },
                ],
            });

            await expect(service.activate(dto)).rejects.toThrow(/primaria de venta/);
            // No abre transacción si la validación previa falla.
            expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
        });

        it('rechaza cuando no hay exactamente un destino predeterminado de compras', async () => {
            const dto = buildDto({
                locations: [
                    { name: 'Salón', function: LocationFunction.SALE, isPrimarySale: true },
                    { name: 'Depósito', function: LocationFunction.STORAGE },
                ],
            });

            await expect(service.activate(dto)).rejects.toThrow(/destino predeterminado de compras/);
        });

        it('rechaza cuando initialStockLocationName no existe en la lista', async () => {
            const dto = buildDto({ initialStockLocationName: 'NoExiste' });

            await expect(service.activate(dto)).rejects.toThrow(/no está en la lista/);
        });

        it('rechaza cuando hay nombres duplicados', async () => {
            const dto = buildDto({
                locations: [
                    { name: 'Salón', function: LocationFunction.SALE, isPrimarySale: true },
                    { name: 'Salón', function: LocationFunction.STORAGE, isDefaultReceive: true },
                ],
            });

            await expect(service.activate(dto)).rejects.toThrow(/nombres de ubicación deben ser únicos/);
        });
    });

    describe('happy path: stock preservado', () => {
        const setupHappyPathMocks = (products: Array<{ id: string; stock: number }>) => {
            const config = buildConfig();
            mockQueryRunner.manager.find.mockImplementation((Entity: unknown) => {
                if (Entity === SystemConfiguration) return Promise.resolve([config]);
                if (Entity === Product) return Promise.resolve(products);
                return Promise.resolve([]);
            });

            // Cada vez que se crea una Location la devolvemos con un id estable
            // basado en el nombre, para que las validaciones internas funcionen.
            mockQueryRunner.manager.create.mockImplementation((_Entity: unknown, data: { name?: string } & object) => {
                if (data && typeof data === 'object' && 'name' in data) {
                    return { id: `id-${(data as { name: string }).name}`, ...data };
                }
                return { id: 'auto-id', ...data };
            });

            // SUM distribuido == stock total.
            const total = products.reduce((acc, p) => acc + p.stock, 0);
            mockQueryRunner.manager.query.mockResolvedValue([{ total: String(total) }]);
        };

        it('preserva SUM(pre) == SUM(post) con múltiples productos', async () => {
            const products = [
                { id: 'p-1', stock: 10 },
                { id: 'p-2', stock: 5 },
                { id: 'p-3', stock: 0 },
            ];
            setupHappyPathMocks(products);

            const result = await service.activate(buildDto());

            expect(result.ok).toBe(true);
            expect(result.products).toBe(3);
            expect(result.locations).toBe(2);

            // Creó 2 ubicaciones.
            const savedLocations = mockQueryRunner.manager.save.mock.calls
                .map(([arg]: unknown[]) => arg)
                .filter((a): a is { name?: string; isPrimarySale?: boolean; isDefaultReceive?: boolean } =>
                    typeof a === 'object' && a !== null && 'name' in (a as object)
                );
            expect(savedLocations).toHaveLength(2);

            // Creó PLS solo para los productos con stock > 0.
            const plsCalls = mockQueryRunner.manager.save.mock.calls
                .map(([arg]: unknown[]) => arg)
                .filter((a): a is { productId?: string; quantity?: number } =>
                    typeof a === 'object' && a !== null && 'productId' in (a as object)
                );
            expect(plsCalls).toHaveLength(2); // p-1 y p-2; p-3 con stock 0 no se crea.
            expect(plsCalls.find(p => p.productId === 'p-1')?.quantity).toBe(10);
            expect(plsCalls.find(p => p.productId === 'p-2')?.quantity).toBe(5);

            // Actualizó SystemConfiguration con stockSectorizado=true y los IDs resueltos.
            const updateCall = mockQueryRunner.manager.update.mock.calls[0];
            expect(updateCall[0]).toBe(SystemConfiguration);
            expect(updateCall[1]).toBe('config-uuid');
            expect(updateCall[2]).toEqual({
                stockSectorizado: true,
                primarySaleLocationId: 'id-Salón',
                defaultReceiveLocationId: 'id-Depósito',
            });

            expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
            expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
        });

        it('persiste primarySaleLocationId y defaultReceiveLocationId en config', async () => {
            setupHappyPathMocks([{ id: 'p-1', stock: 7 }]);

            await service.activate(buildDto());

            const updateArgs = mockQueryRunner.manager.update.mock.calls[0];
            expect(updateArgs?.[2]).toMatchObject({
                stockSectorizado: true,
                primarySaleLocationId: 'id-Salón',
                defaultReceiveLocationId: 'id-Depósito',
            });
        });
    });

    describe('ya activado', () => {
        it('rechaza con ConflictException cuando stockSectorizado = true', async () => {
            const config = buildConfig({ stockSectorizado: true });
            mockQueryRunner.manager.find.mockImplementation((Entity: unknown) => {
                if (Entity === SystemConfiguration) return Promise.resolve([config]);
                if (Entity === Product) return Promise.resolve([]);
                return Promise.resolve([]);
            });
            mockQueryRunner.manager.query.mockResolvedValue([{ total: '0' }]);

            await expect(service.activate(buildDto())).rejects.toThrow(ConflictException);
            await expect(service.activate(buildDto())).rejects.toThrow(/ya está activo/);

            expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
        });
    });

    describe('rollback ante error', () => {
        it('rollbackea si la distribución falla en un producto intermedio', async () => {
            const config = buildConfig();
            const products = [
                { id: 'p-1', stock: 10 },
                { id: 'p-2', stock: 5 },
            ];
            mockQueryRunner.manager.find.mockImplementation((Entity: unknown) => {
                if (Entity === SystemConfiguration) return Promise.resolve([config]);
                if (Entity === Product) return Promise.resolve(products);
                return Promise.resolve([]);
            });

            // manager.create para Location devuelve id estable.
            mockQueryRunner.manager.create.mockImplementation((_Entity: unknown, data: object) => {
                const d = data as { name?: string };
                return { id: `id-${d.name}`, ...data };
            });

            // Forzar error en el SEGUNDO save (la creación del segundo PLS).
            // El primer save es Location Salón, segundo es Location Depósito,
            // tercero es el primer PLS. Pero como manager.save es compartido,
            // basta con rechazar a partir del cuarto call (segundo PLS).
            let saveCalls = 0;
            mockQueryRunner.manager.save.mockImplementation((input: unknown) => {
                saveCalls += 1;
                if (saveCalls >= 4) {
                    throw new Error('Simulated DB error');
                }
                return Promise.resolve(input);
            });
            mockQueryRunner.manager.query.mockResolvedValue([{ total: '15' }]);

            await expect(service.activate(buildDto())).rejects.toThrow(/Simulated DB error/);

            // Verifica rollback.
            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
            expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
            expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
        });

        it('rollbackea si el SUM distribuido no coincide con el snapshot', async () => {
            const config = buildConfig();
            mockQueryRunner.manager.find.mockImplementation((Entity: unknown) => {
                if (Entity === SystemConfiguration) return Promise.resolve([config]);
                if (Entity === Product) return Promise.resolve([{ id: 'p-1', stock: 10 }]);
                return Promise.resolve([]);
            });
            mockQueryRunner.manager.create.mockImplementation((_Entity: unknown, data: object) => {
                const d = data as { name?: string };
                return { id: `id-${d.name}`, ...data };
            });
            // SUM distribuido incorrecto.
            mockQueryRunner.manager.query.mockResolvedValue([{ total: '5' }]);

            await expect(service.activate(buildDto())).rejects.toThrow(/Distribución inconsistente/);

            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
            expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
        });
    });

    describe('validación de ubicación inexistente', () => {
        it('rechaza si no existe configuración', async () => {
            mockQueryRunner.manager.find.mockImplementation((Entity: unknown) => {
                if (Entity === SystemConfiguration) return Promise.resolve([]);
                return Promise.resolve([]);
            });

            await expect(service.activate(buildDto())).rejects.toThrow(/No existe configuración/);
            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        });
    });
});
