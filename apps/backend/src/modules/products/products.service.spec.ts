/**
 * Tests unitarios para ProductsService
 * Cobertura del fix 7.7: Producto con precio $0
 * + Tests adicionales para cobertura completa
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { CategoriesRepository } from './categories.repository';
import { BrandsRepository } from './brands.repository';
import { ConfigurationService } from '../configuration/configuration.service';
import { InventoryService } from '../inventory/inventory.service';

// Mocks
const mockProductsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findWithFilters: jest.fn(),
};

const mockCategoriesRepository = {
    findOne: jest.fn(),
};

const mockBrandsRepository = {
    findOrCreateByName: jest.fn(),
};

const mockConfigurationService = {
    getDefaultProfitMargin: jest.fn().mockResolvedValue(30),
    getMinStockAlert: jest.fn().mockResolvedValue(5),
};

const mockInventoryService = {
    createMovement: jest.fn(),
};

describe('ProductsService', () => {
    let service: ProductsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductsService,
                { provide: ProductsRepository, useValue: mockProductsRepository },
                { provide: CategoriesRepository, useValue: mockCategoriesRepository },
                { provide: BrandsRepository, useValue: mockBrandsRepository },
                { provide: ConfigurationService, useValue: mockConfigurationService },
                { provide: InventoryService, useValue: mockInventoryService },
            ],
        }).compile();

        service = module.get<ProductsService>(ProductsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getEffectiveProfitMargin', () => {
        it('retorna margen personalizado cuando useCustomMargin es true', async () => {
            const result = await service.getEffectiveProfitMargin(true, 50, null);
            expect(result).toBe(50);
        });

        it('retorna margen de categoría cuando no hay margen personalizado', async () => {
            const category = { id: '1', name: 'Test', profitMargin: 40 } as any;
            const result = await service.getEffectiveProfitMargin(false, undefined, category);
            expect(result).toBe(40);
        });

        it('retorna margen del sistema cuando no hay categoría ni margen personalizado', async () => {
            mockConfigurationService.getDefaultProfitMargin.mockResolvedValue(30);
            const result = await service.getEffectiveProfitMargin(false, undefined, null);
            expect(result).toBe(30);
            expect(mockConfigurationService.getDefaultProfitMargin).toHaveBeenCalled();
        });

        it('ignora margen personalizado si useCustomMargin es false', async () => {
            mockConfigurationService.getDefaultProfitMargin.mockResolvedValue(30);
            const result = await service.getEffectiveProfitMargin(false, 50, null);
            expect(result).toBe(30);
        });

        it('usa margen del sistema si categoría tiene profitMargin null', async () => {
            const category = { id: '1', name: 'Test', profitMargin: null } as any;
            mockConfigurationService.getDefaultProfitMargin.mockResolvedValue(25);
            const result = await service.getEffectiveProfitMargin(false, undefined, category);
            expect(result).toBe(25);
        });
    });

    describe('findOne', () => {
        it('retorna producto cuando existe', async () => {
            const mockProduct = { id: 'uuid-123', name: 'Test' };
            mockProductsRepository.findOne.mockResolvedValue(mockProduct);

            const result = await service.findOne('uuid-123');

            expect(result).toEqual(mockProduct);
        });

        it('lanza NotFoundException cuando no existe', async () => {
            mockProductsRepository.findOne.mockResolvedValue(null);

            await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
            await expect(service.findOne('invalid-id')).rejects.toThrow('Producto no encontrado');
        });
    });

    describe('findByIds', () => {
        it('busca productos en una sola consulta y elimina IDs duplicados', async () => {
            const mockProducts = [
                { id: 'product-1', name: 'Producto 1' },
                { id: 'product-2', name: 'Producto 2' },
            ];
            mockProductsRepository.find.mockResolvedValue(mockProducts);

            const result = await service.findByIds(['product-1', 'product-2', 'product-1']);

            expect(result).toEqual(mockProducts);
            expect(mockProductsRepository.find).toHaveBeenCalledTimes(1);
            expect(mockProductsRepository.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    relations: ['category', 'brand'],
                })
            );
        });

        it('retorna array vacío sin consultar la base si no recibe IDs', async () => {
            const result = await service.findByIds([]);

            expect(result).toEqual([]);
            expect(mockProductsRepository.find).not.toHaveBeenCalled();
        });
    });

    describe('FIX 7.7: calculatePrice - Productos con costo $0', () => {
            // Accedemos al método privado para testear
            const getCalculatePrice = () => (service as any).calculatePrice.bind(service);

            it('debe retornar 0 cuando el costo es 0', () => {
                const result = getCalculatePrice()(0, 30);
                expect(result).toBe(0);
            });

            it('debe retornar 0 cuando el costo es negativo', () => {
                const result = getCalculatePrice()(-10, 30);
                expect(result).toBe(0);
            });

            it('debe calcular precio correctamente para costos positivos', () => {
                const result = getCalculatePrice()(100, 30);
                expect(result).toBe(130);
            });

            it('debe redondear a 2 decimales', () => {
                const result = getCalculatePrice()(100, 33.33);
                expect(result).toBe(133.33);
            });

            it('debe manejar margen 0%', () => {
                const result = getCalculatePrice()(100, 0);
                expect(result).toBe(100);
            });

            it('debe manejar margen 100%', () => {
                const result = getCalculatePrice()(100, 100);
                expect(result).toBe(200);
            });
        });

    const defaultQuery = { page: 1, limit: 100, sortBy: 'name' as const, order: 'ASC' as const };

    describe('findAll - Filtros básicos', () => {
        it('retorna todos los productos sin filtros', async () => {
                const mockProducts = [
                    { id: '1', name: 'Producto 1', cost: 100, price: 130, stock: 10 },
                    { id: '2', name: 'Producto 2', cost: 50, price: 65, stock: 5 },
                ];
                mockProductsRepository.findWithFilters.mockResolvedValue([mockProducts, 2]);

                const result = await service.findAll({ ...defaultQuery });
                expect(result).toEqual({
                    data: mockProducts,
                    total: 2,
                    page: 1,
                    limit: 100,
                    totalPages: 1,
                });
                expect(mockProductsRepository.findWithFilters).toHaveBeenCalledWith(
                    expect.any(Object),
                    undefined,
                );
            });

            it('filtra por búsqueda en nombre', async () => {
                const mockProducts = [
                    { id: '1', name: 'Coca Cola', cost: 100, price: 130, stock: 10 },
                    { id: '2', name: 'Pepsi', cost: 50, price: 65, stock: 5 },
                ];
                mockProductsRepository.findWithFilters.mockResolvedValue([[mockProducts[0]], 1]);

                const result = await service.findAll({ ...defaultQuery, search: 'cola' });
                expect(result).toEqual({
                    data: [mockProducts[0]],
                    total: 1,
                    page: 1,
                    limit: 100,
                    totalPages: 1,
                });
            });

            it('filtra por búsqueda en barcode', async () => {
                const mockProducts = [
                    { id: '1', name: 'Coca Cola', barcode: '1234567890123', cost: 100, price: 130, stock: 10 },
                    { id: '2', name: 'Pepsi', barcode: '9876543210987', cost: 50, price: 65, stock: 5 },
                ];
                mockProductsRepository.findWithFilters.mockResolvedValue([[mockProducts[0]], 1]);

                const result = await service.findAll({ ...defaultQuery, search: '1234567890123' });
                expect(result.data).toHaveLength(1);
                expect(result.data[0].barcode).toBe('1234567890123');
            });

            it('filtra por categoryId', async () => {
                const mockProducts = [
                    { id: '1', name: 'Producto 1', categoryId: 'cat-1', cost: 100, price: 130, stock: 10 },
                    { id: '2', name: 'Producto 2', categoryId: 'cat-2', cost: 50, price: 65, stock: 5 },
                ];
                mockProductsRepository.findWithFilters.mockResolvedValue([mockProducts, 2]);

                const result = await service.findAll({ ...defaultQuery, categoryId: 'cat-1' });
                expect(result).toEqual({
                    data: mockProducts,
                    total: 2,
                    page: 1,
                    limit: 100,
                    totalPages: 1,
                });
                expect(mockProductsRepository.findWithFilters).toHaveBeenCalledWith(
                    expect.objectContaining({ categoryId: 'cat-1' }),
                    undefined,
                );
            });

            it('filtra por isActive = true', async () => {
                const mockProducts = [
                    { id: '1', name: 'Producto Activo', cost: 100, price: 130, stock: 10, isActive: true },
                    { id: '2', name: 'Producto Inactivo', cost: 50, price: 65, stock: 5, isActive: false },
                ];
                mockProductsRepository.findWithFilters.mockResolvedValue([[mockProducts[0]], 1]);

                const result = await service.findAll({ ...defaultQuery, isActive: true });
                expect(result).toEqual({
                    data: [mockProducts[0]],
                    total: 1,
                    page: 1,
                    limit: 100,
                    totalPages: 1,
                });
            });

            it('filtra por isActive = false', async () => {
                const mockProducts = [
                    { id: '1', name: 'Producto Activo', cost: 100, price: 130, stock: 10, isActive: true },
                ];
                mockProductsRepository.findWithFilters.mockResolvedValue([mockProducts, 1]);

                const result = await service.findAll({ ...defaultQuery, isActive: false });
                expect(result).toEqual({
                    data: mockProducts,
                    total: 1,
                    page: 1,
                    limit: 100,
                    totalPages: 1,
                });
            });

            it('combina búsqueda y categoryId', async () => {
                const mockProducts = [
                    { id: '1', name: 'Cola', categoryId: 'cat-1', cost: 100, price: 130, stock: 10 },
                    { id: '2', name: 'Pepsi', categoryId: 'cat-1', cost: 50, price: 65, stock: 5 },
                ];
                mockProductsRepository.findWithFilters.mockResolvedValue([[mockProducts[0]], 1]);

                const result = await service.findAll({ ...defaultQuery, search: 'cola', categoryId: 'cat-1' });
                expect(result).toEqual({
                    data: [mockProducts[0]],
                    total: 1,
                    page: 1,
                    limit: 100,
                    totalPages: 1,
                });
            });

            it('ordena por name DESC', async () => {
                const mockProducts = [
                    { id: '1', name: 'Z' },
                    { id: '2', name: 'A' },
                ];
                mockProductsRepository.findWithFilters.mockResolvedValue([mockProducts, 2]);

                await service.findAll({ ...defaultQuery, sortBy: 'name', order: 'DESC' });
                expect(mockProductsRepository.findWithFilters).toHaveBeenCalledWith(
                    expect.objectContaining({ sortBy: 'name', order: 'DESC' }),
                    undefined,
                );
            });

            it('ordena por price ASC', async () => {
                const mockProducts = [
                    { id: '1', name: 'Producto A', cost: 100, price: 130 },
                    { id: '2', name: 'Producto B', cost: 50, price: 65 },
                ];
                mockProductsRepository.findWithFilters.mockResolvedValue([mockProducts, 2]);

                await service.findAll({ ...defaultQuery, sortBy: 'price', order: 'ASC' });
                expect(mockProductsRepository.findWithFilters).toHaveBeenCalledWith(
                    expect.objectContaining({ sortBy: 'price', order: 'ASC' }),
                    undefined,
                );
            });

            it('paginación correcta', async () => {
                const mockProducts = Array.from({ length: 150 }, (_, i) => ({
                    id: `p-${i}`,
                    name: `Producto ${i}`,
                    cost: 100,
                    price: 130,
                    stock: 10,
                }));
                mockProductsRepository.findWithFilters.mockResolvedValue([mockProducts, 150]);

                const result = await service.findAll({ ...defaultQuery, page: 1, limit: 10 });
                expect(result.data).toHaveLength(150);
                expect(result.page).toBe(1);
                expect(result.limit).toBe(10);
                expect(result.totalPages).toBe(15);
            });

            it('calcula totalPages correctamente', async () => {
                const mockProducts = Array.from({ length: 100 }, (_, i) => ({
                    id: `p-${i}`,
                    name: `Producto ${i}`,
                    cost: 100,
                    price: 130,
                }));
                mockProductsRepository.findWithFilters.mockResolvedValue([mockProducts, 100]);

                const result = await service.findAll({ ...defaultQuery, limit: 15 });
                expect(result.totalPages).toBe(Math.ceil(100 / 15));
            });
    });

    describe('create', () => {
        const createProductDTO = {
            name: 'Test Product',
            cost: 100,
            stock: 0,
            categoryId: null,
            brandName: null,
        };

        beforeEach(() => {
            mockProductsRepository.create.mockImplementation((data) => ({ id: 'uuid-123', ...data }));
            mockProductsRepository.save.mockImplementation((product) => Promise.resolve(product));
            mockConfigurationService.getDefaultProfitMargin.mockResolvedValue(30);
        });

        it('crea producto con precio calculado', async () => {
            await service.create(createProductDTO as any);

            expect(mockProductsRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Test Product',
                    cost: 100,
                    price: 130,
                    profitMargin: 30,
                })
            );
        });

        it('lanza error si categoría no existe', async () => {
            mockCategoriesRepository.findOne.mockResolvedValue(null);
            const dto = { ...createProductDTO, categoryId: 'fake-id' };

            await expect(service.create(dto as any)).rejects.toThrow(NotFoundException);
        });

        it('procesa marca cuando se proporciona brandName', async () => {
            const mockBrand = { id: 'brand-1', name: 'Nike' };
            mockBrandsRepository.findOrCreateByName.mockResolvedValue(mockBrand);

            await service.create({ ...createProductDTO, brandName: 'Nike' } as any);

            expect(mockBrandsRepository.findOrCreateByName).toHaveBeenCalledWith('Nike');
        });

        it('no procesa marca si brandName es vacío', async () => {
            await service.create({ ...createProductDTO, brandName: '' } as any);

            expect(mockBrandsRepository.findOrCreateByName).not.toHaveBeenCalled();
        });

        it('crea movimiento de stock si hay stock inicial', async () => {
            const dto = { ...createProductDTO, stock: 10 };
            mockProductsRepository.findOne.mockResolvedValue({ id: 'uuid-123', stock: 10 });

            await service.create(dto as any);

            expect(mockInventoryService.createMovement).toHaveBeenCalledWith(
                expect.objectContaining({
                    productId: 'uuid-123',
                    quantity: 10,
                    type: 'IN',
                    source: 'INITIAL_LOAD',
                })
            );
        });

        it('no crea movimiento si stock es 0', async () => {
            await service.create(createProductDTO as any);

            expect(mockInventoryService.createMovement).not.toHaveBeenCalled();
        });

        it('crea producto con barcode cuando se proporciona', async () => {
            const dto = { ...createProductDTO, barcode: '1234567890123' };

            await service.create(dto as any);

            expect(mockProductsRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    barcode: '1234567890123',
                })
            );
        });

        it('crea producto con barcode null cuando se proporciona', async () => {
            const dto = { ...createProductDTO, barcode: null };

            await service.create(dto as any);

            expect(mockProductsRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    barcode: null,
                })
            );
        });
    });

    describe('update', () => {
        it('actualiza barcode del producto', async () => {
            const mockProduct = { id: 'uuid-123', name: 'Original', barcode: null, isActive: true };
            mockProductsRepository.findOne.mockResolvedValue(mockProduct);

            await service.update('uuid-123', { barcode: '9876543210987' } as any);

            expect(mockProductsRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    barcode: '9876543210987',
                })
            );
        });

        it('permite eliminar barcode estableciendo null', async () => {
            const mockProduct = { id: 'uuid-123', name: 'Original', barcode: '123', isActive: true };
            mockProductsRepository.findOne.mockResolvedValue(mockProduct);

            await service.update('uuid-123', { barcode: null } as any);

            expect(mockProductsRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    barcode: null,
                })
            );
        });
    });

    describe('remove (soft delete)', () => {
        it('soft delete marca producto como inactivo', async () => {
            const mockProduct = { id: 'uuid-123', name: 'Original', isActive: true };
            mockProductsRepository.findOne.mockResolvedValue(mockProduct);
            const result = await service.remove('uuid-123');
            expect(result).toEqual({ message: 'Producto eliminado' });
            expect(mockProductsRepository.save).toHaveBeenCalledWith({ ...mockProduct, isActive: false });
        });

        it('lanza NotFoundException cuando producto no existe', async () => {
            mockProductsRepository.findOne.mockResolvedValue(null);
            await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
        });
    });
});
