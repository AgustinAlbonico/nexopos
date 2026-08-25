/**
 * Tests unitarios para SuppliersService
 * Cubre: create, findAll, findOne, update, remove, searchByName, getStats
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { SuppliersService } from './suppliers.service';
import { Supplier } from './entities/supplier.entity';

// Mock factory para proveedores
const createMockSupplier = (overrides = {}) => ({
    id: 'supplier-uuid-123',
    name: 'Proveedor Test',
    tradeName: 'Comercial Test',
    documentType: 'CUIT',
    documentNumber: '20-12345678-9',
    ivaCondition: 'RESPONSABLE_INSCRIPTO',
    email: 'test@supplier.com',
    phone: '1234567890',
    address: 'Calle Test 123',
    city: 'Buenos Aires',
    state: 'Buenos Aires',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

// Mock del repositorio
const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
};

const mockSupplierRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

describe('SuppliersService', () => {
    let service: SuppliersService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SuppliersService,
                { provide: getRepositoryToken(Supplier), useValue: mockSupplierRepository },
            ],
        }).compile();

        service = module.get<SuppliersService>(SuppliersService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        const createDto = {
            name: 'Nuevo Proveedor',
            documentNumber: '20-99999999-9',
            email: 'nuevo@proveedor.com',
        };

        it('crea proveedor exitosamente', async () => {
            mockSupplierRepository.findOne.mockResolvedValue(null);
            mockSupplierRepository.create.mockImplementation((data) => ({ id: 'new-id', ...data }));
            mockSupplierRepository.save.mockImplementation((supplier) => Promise.resolve(supplier));

            const result = await service.create(createDto);

            expect(result.name).toBe('Nuevo Proveedor');
            expect(mockSupplierRepository.create).toHaveBeenCalled();
            expect(mockSupplierRepository.save).toHaveBeenCalled();
        });

        it('lanza ConflictException si documento ya existe', async () => {
            mockSupplierRepository.findOne.mockResolvedValue(createMockSupplier());

            await expect(
                service.create(createDto)
            ).rejects.toThrow(ConflictException);

            await expect(
                service.create(createDto)
            ).rejects.toThrow('Ya existe un proveedor con el documento');
        });

        it('permite crear proveedor sin documento', async () => {
            const dtoWithoutDoc = { name: 'Sin Documento' };
            mockSupplierRepository.create.mockImplementation((data) => ({ id: 'new-id', ...data }));
            mockSupplierRepository.save.mockImplementation((supplier) => Promise.resolve(supplier));

            await service.create(dtoWithoutDoc);

            expect(mockSupplierRepository.findOne).not.toHaveBeenCalled();
        });
    });

    describe('findAll', () => {
        it('retorna proveedores paginados', async () => {
            const suppliers = [createMockSupplier(), createMockSupplier({ id: '2' })];
            mockSupplierRepository.findAndCount.mockResolvedValue([suppliers, 2]);

            const result = await service.findAll({ page: 1, limit: 10 });

            expect(result.data).toHaveLength(2);
            expect(result.total).toBe(2);
            expect(result.page).toBe(1);
            expect(result.totalPages).toBe(1);
        });

        it('aplica filtro de búsqueda', async () => {
            mockSupplierRepository.findAndCount.mockResolvedValue([[], 0]);

            await service.findAll({ search: 'test' });

            expect(mockSupplierRepository.findAndCount).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.arrayContaining([
                        expect.objectContaining({ name: expect.any(Object) }),
                    ]),
                })
            );
        });

        it('aplica filtro de clasificación', async () => {
            mockSupplierRepository.findAndCount.mockResolvedValue([[], 0]);

            await service.findAll({ classification: 'Nacional' });

            expect(mockSupplierRepository.findAndCount).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.arrayContaining([
                        expect.objectContaining({ classification: 'Nacional' }),
                    ]),
                })
            );
        });
    });

    describe('getClassifications', () => {
        it('retorna lista de clasificaciones ordenadas por frecuencia', async () => {
            mockQueryBuilder.getRawMany.mockResolvedValue([
                { classification: 'Distribuidor', count: '5' },
                { classification: 'Importador', count: '3' },
                { classification: 'Nacional', count: '1' },
            ]);

            const result = await service.getClassifications();

            expect(result).toEqual(['Distribuidor', 'Importador', 'Nacional']);
            expect(mockSupplierRepository.createQueryBuilder).toHaveBeenCalledWith('supplier');
            expect(mockQueryBuilder.select).toHaveBeenCalledWith('supplier.classification', 'classification');
            expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('COUNT(supplier.id)', 'count');
            expect(mockQueryBuilder.where).toHaveBeenCalledWith('supplier.classification IS NOT NULL');
            expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('supplier.classification');
            expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('COUNT(supplier.id)', 'DESC');
            expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('supplier.classification', 'ASC');
        });
    });

    describe('findOne', () => {
        it('retorna proveedor cuando existe', async () => {
            const supplier = createMockSupplier();
            mockSupplierRepository.findOne.mockResolvedValue(supplier);

            const result = await service.findOne('supplier-123');

            expect(result).toEqual(supplier);
        });

        it('lanza NotFoundException cuando no existe', async () => {
            mockSupplierRepository.findOne.mockResolvedValue(null);

            await expect(
                service.findOne('invalid-id')
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('findActive', () => {
        it('retorna solo proveedores activos ordenados', async () => {
            const activeSuppliers = [
                createMockSupplier({ name: 'A' }),
                createMockSupplier({ name: 'B' }),
            ];
            mockSupplierRepository.find.mockResolvedValue(activeSuppliers);

            const result = await service.findActive();

            expect(result).toEqual(activeSuppliers);
            expect(mockSupplierRepository.find).toHaveBeenCalledWith({
                where: { isActive: true },
                order: { name: 'ASC' },
            });
        });
    });

    describe('update', () => {
        it('actualiza proveedor correctamente', async () => {
            const existingSupplier = createMockSupplier();
            mockSupplierRepository.findOne.mockResolvedValue(existingSupplier);
            mockSupplierRepository.save.mockImplementation((s) => Promise.resolve(s));

            const result = await service.update('supplier-123', { name: 'Nombre Actualizado' });

            expect(result.name).toBe('Nombre Actualizado');
        });

        it('lanza ConflictException si documento duplicado en update', async () => {
            const existingSupplier = createMockSupplier({ id: '1', documentNumber: '11-11111111-1' });
            const otherSupplier = createMockSupplier({ id: '2', documentNumber: '22-22222222-2' });

            mockSupplierRepository.findOne
                .mockResolvedValueOnce(existingSupplier) // findOne para el proveedor a actualizar
                .mockResolvedValueOnce(otherSupplier);  // findOne para verificar documento

            await expect(
                service.update('1', { documentNumber: '22-22222222-2' })
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('remove', () => {
        it('desactiva proveedor (soft delete)', async () => {
            const supplier = createMockSupplier();
            mockSupplierRepository.findOne.mockResolvedValue(supplier);
            mockSupplierRepository.save.mockImplementation((s) => Promise.resolve(s));

            const result = await service.remove('supplier-123');

            expect(supplier.isActive).toBe(false);
            expect(result.message).toContain('desactivado');
        });
    });

    describe('getStats', () => {
        it('retorna estadísticas correctas', async () => {
            mockSupplierRepository.count
                .mockResolvedValueOnce(10) // total
                .mockResolvedValueOnce(8); // active

            const result = await service.getStats();

            expect(result.total).toBe(10);
            expect(result.active).toBe(8);
            expect(result.inactive).toBe(2); // 10 - 8
        });
    });

    describe('searchByName', () => {
        it('busca proveedores por nombre o nombre comercial', async () => {
            const suppliers = [createMockSupplier()];
            mockSupplierRepository.find.mockResolvedValue(suppliers);

            const result = await service.searchByName('test');

            expect(result).toEqual(suppliers);
            expect(mockSupplierRepository.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    take: 10,
                    order: { name: 'ASC' },
                })
            );
        });
    });
});
