/**
 * Tests para Locations CRUD (PR7).
 * Cubre: listar, crear (con conflictos de unicidad), actualizar, desactivar
 * (con rechazo por saldo > 0).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Location, LocationFunction } from './entities/location.entity';
import { ProductLocationStock } from './entities/product-location-stock.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { Product } from '../products/entities/product.entity';
import { ConfigurationService } from '../configuration/configuration.service';

describe('InventoryService - Locations CRUD (PR7)', () => {
    let service: InventoryService;
    let locationRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock; findOne: jest.Mock };
    let plsRepo: { createQueryBuilder: jest.Mock };

    const mkLocation = (overrides: Partial<Location> = {}): Location => ({
        id: 'loc-1',
        name: 'Depósito',
        function: LocationFunction.STORAGE,
        isActive: true,
        isPrimarySale: false,
        isDefaultReceive: false,
        productLocationStocks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    });

    const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
    };

    beforeEach(async () => {
        locationRepo = {
            find: jest.fn(),
            create: jest.fn((dto: Partial<Location>) => dto as Location),
            save: jest.fn(async (loc: Location) => loc),
            findOne: jest.fn(),
        };
        plsRepo = {
            createQueryBuilder: jest.fn(() => queryBuilder),
        };
        queryBuilder.where.mockReturnThis();
        queryBuilder.andWhere.mockReturnThis();
        queryBuilder.getCount.mockResolvedValue(0);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                {
                    provide: getRepositoryToken(StockMovement),
                    useValue: { create: jest.fn(), save: jest.fn() },
                },
                {
                    provide: getRepositoryToken(Product),
                    useValue: {},
                },
                {
                    provide: getRepositoryToken(Location),
                    useValue: locationRepo,
                },
                {
                    provide: getRepositoryToken(ProductLocationStock),
                    useValue: plsRepo,
                },
                {
                    provide: getDataSourceToken(),
                    useValue: { createQueryRunner: jest.fn(), getRepository: jest.fn() },
                },
                {
                    provide: ConfigurationService,
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
    });

    describe('listLocations', () => {
        it('delega en el repository.find con el orden esperado', async () => {
            locationRepo.find.mockResolvedValue([mkLocation()]);
            const result = await service.listLocations();
            expect(locationRepo.find).toHaveBeenCalledWith({
                order: { isActive: 'DESC', name: 'ASC' },
            });
            expect(result).toHaveLength(1);
        });
    });

    describe('createLocation', () => {
        it('crea y guarda una ubicación nueva', async () => {
            const result = await service.createLocation({
                name: 'Salón',
                function: LocationFunction.SALE,
            });
            expect(locationRepo.create).toHaveBeenCalledWith({
                name: 'Salón',
                function: LocationFunction.SALE,
                isActive: true,
                isPrimarySale: false,
                isDefaultReceive: false,
            });
            expect(result.name).toBe('Salón');
        });

        it('traduce violación de unicidad a 409', async () => {
            locationRepo.save.mockRejectedValueOnce({ code: '23510' });
            await expect(
                service.createLocation({ name: 'Dup', function: LocationFunction.STORAGE }),
            ).rejects.toBeInstanceOf(ConflictException);
        });

        it('re-lanza errores no relacionados con unicidad', async () => {
            locationRepo.save.mockRejectedValueOnce(new Error('db down'));
            await expect(
                service.createLocation({ name: 'X', function: LocationFunction.STORAGE }),
            ).rejects.toThrow('db down');
        });
    });

    describe('updateLocation', () => {
        it('rechaza 404 si la ubicación no existe', async () => {
            locationRepo.findOne.mockResolvedValueOnce(null);
            await expect(
                service.updateLocation('missing', { name: 'X' }),
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it('actualiza el nombre y la función cuando se pasan', async () => {
            locationRepo.findOne.mockResolvedValueOnce(mkLocation({ name: 'Viejo' }));
            const updated = await service.updateLocation('loc-1', {
                name: 'Nuevo',
                function: LocationFunction.SALE,
            });
            expect(updated.name).toBe('Nuevo');
            expect(updated.function).toBe(LocationFunction.SALE);
        });

        it('rechaza promover a primaria una ubicación inactiva', async () => {
            locationRepo.findOne.mockResolvedValueOnce(
                mkLocation({ isActive: false, isPrimarySale: false }),
            );
            await expect(
                service.updateLocation('loc-1', { isPrimarySale: true }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('traduce violación de unicidad en PATCH a 409', async () => {
            locationRepo.findOne.mockResolvedValueOnce(mkLocation());
            locationRepo.save.mockRejectedValueOnce({ code: 'SQLITE_CONSTRAINT' });
            await expect(
                service.updateLocation('loc-1', { name: 'Otro' }),
            ).rejects.toBeInstanceOf(ConflictException);
        });
    });

    describe('deactivateLocation', () => {
        it('rechaza 404 si no existe', async () => {
            locationRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.deactivateLocation('nope')).rejects.toBeInstanceOf(NotFoundException);
        });

        it('es idempotente si la ubicación ya estaba inactiva', async () => {
            const loc = mkLocation({ isActive: false });
            locationRepo.findOne.mockResolvedValueOnce(loc);
            const result = await service.deactivateLocation('loc-1');
            expect(result).toBe(loc);
            expect(locationRepo.save).not.toHaveBeenCalled();
        });

        it('rechaza con 409 si hay productos con saldo != 0', async () => {
            locationRepo.findOne.mockResolvedValueOnce(mkLocation());
            queryBuilder.getCount.mockResolvedValueOnce(2);
            await expect(service.deactivateLocation('loc-1')).rejects.toBeInstanceOf(ConflictException);
            expect(locationRepo.save).not.toHaveBeenCalled();
        });

        it('desactiva cuando no hay saldo y persiste el cambio', async () => {
            const loc = mkLocation();
            locationRepo.findOne.mockResolvedValueOnce(loc);
            const result = await service.deactivateLocation('loc-1');
            expect(result.isActive).toBe(false);
            expect(locationRepo.save).toHaveBeenCalledWith(loc);
        });
    });
});
