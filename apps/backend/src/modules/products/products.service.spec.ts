/**
 * Tests unitarios para ProductsService
 * Cobertura del fix 7.7: Producto con precio $0
 * + Tests adicionales para cobertura completa
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { CategoriesRepository } from './categories.repository';
import { BrandsRepository } from './brands.repository';
import { ConfigurationService } from '../configuration/configuration.service';
import { InventoryService } from '../inventory/inventory.service';
import { SizeScaleTemplate } from './entities/size-scale-template.entity';
import { ColorPaletteTemplate } from './entities/color-palette-template.entity';

const mockManager = {
    getRepository: jest.fn().mockReturnValue({
        create: jest.fn((val) => val),
        save: jest.fn(async (val) => {
            if (Array.isArray(val)) {
                return val.map((item, idx) => ({ ...item, id: item.id || `id-${idx}` }));
            }
            return { ...val, id: val.id || 'parent-id-1' };
        }),
    }),
};

const mockProductsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findWithFilters: jest.fn(),
    findBySku: jest.fn(),
    manager: {
        transaction: jest.fn(async (cb: any) => cb(mockManager)),
    },
};

const mockCategoriesRepository = {
    findOne: jest.fn(),
};

const mockBrandsRepository = {
    findOrCreateByName: jest.fn(),
};

const mockSizeScaleRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((val) => val),
    save: jest.fn((val) => Promise.resolve({ ...val, id: val.id || 'scale-uuid-1' })),
    remove: jest.fn((val) => Promise.resolve(val)),
};

const mockColorPaletteRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((val) => val),
    save: jest.fn((val) => Promise.resolve({ ...val, id: val.id || 'palette-uuid-1' })),
    remove: jest.fn((val) => Promise.resolve(val)),
};

const mockConfigurationService = {
    getDefaultProfitMargin: jest.fn().mockResolvedValue(30),
    getMinStockAlert: jest.fn().mockResolvedValue(5),
    getCapabilitiesManifest: jest.fn().mockResolvedValue({ capabilities: { 'STRUCTURAL.variants': true } }),
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
                { provide: getRepositoryToken(SizeScaleTemplate), useValue: mockSizeScaleRepository },
                { provide: getRepositoryToken(ColorPaletteTemplate), useValue: mockColorPaletteRepository },
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
                    relations: expect.arrayContaining(['category', 'brand', 'packs', 'bundleComponents']),
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
            ];
            mockProductsRepository.findWithFilters.mockResolvedValue([mockProducts, 1]);

            const result = await service.findAll({ ...defaultQuery, search: '1234567890123' });
            expect(result.data).toHaveLength(1);
            expect(result.data[0].barcode).toBe('1234567890123');
        });

        it('filtra por categoryId', async () => {
            const mockProducts = [
                { id: '1', name: 'Producto 1', categoryId: 'cat-1', cost: 100, price: 130, stock: 10 },
            ];
            mockProductsRepository.findWithFilters.mockResolvedValue([mockProducts, 1]);

            const result = await service.findAll({ ...defaultQuery, categoryId: 'cat-1' });
            expect(result.data).toHaveLength(1);
            expect(result.data[0].categoryId).toBe('cat-1');
        });

        it('pasa excludeVariantParents al repositorio correctamente', async () => {
            const mockVariants = [
                { id: 'var-1', name: 'Remera Azul M', isVariantParent: false, cost: 100, price: 130, stock: 10 },
            ];
            mockProductsRepository.findWithFilters.mockResolvedValue([mockVariants, 1]);

            const result = await service.findAll({ ...defaultQuery, search: 'Remera', excludeVariantParents: true });
            expect(mockProductsRepository.findWithFilters).toHaveBeenCalledWith(
                expect.objectContaining({ excludeVariantParents: true, search: 'Remera' }),
                undefined,
            );
            expect(result.data).toHaveLength(1);
            expect(result.data[0].isVariantParent).toBe(false);
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
            mockProductsRepository.findOne.mockResolvedValue(null);
        });

        it('crea producto con precio calculado', async () => {
            await service.create(createProductDTO as any);

            expect(mockProductsRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Test Product',
                    cost: 100,
                    price: 130,
                    profitMargin: 30,
                    useManualPrice: false,
                })
            );
        });

        it('crea producto en modo precio fijo cuando se especifica price directamente', async () => {
            const manualDto = { name: 'Producto Góndola', price: 1500, useManualPrice: true };
            await service.create(manualDto as any);

            expect(mockProductsRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Producto Góndola',
                    cost: null,
                    price: 1500,
                    profitMargin: null,
                    useManualPrice: true,
                })
            );
        });

        it('lanza BadRequestException si se activa useManualPrice sin proporcionar precio final', async () => {
            const invalidDto = { name: 'Sin Precio', useManualPrice: true };
            await expect(service.create(invalidDto as any)).rejects.toThrow(BadRequestException);
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

        it('crea producto con barcode cuando se proporciona', async () => {
            mockProductsRepository.findOne.mockResolvedValue(null);
            const dto = { ...createProductDTO, barcode: '1234567890123' };

            await service.create(dto as any);

            expect(mockProductsRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    barcode: '1234567890123',
                })
            );
        });

        it('lanza ConflictException al crear producto con código de barras existente', async () => {
            mockProductsRepository.findOne.mockResolvedValue({ id: 'other-1', name: 'Otro Producto' });
            const dto = { ...createProductDTO, barcode: '1234567890123' };

            await expect(service.create(dto as any)).rejects.toThrow('ya está registrado');
        });

        it('lanza ConflictException al crear producto con SKU existente', async () => {
            mockProductsRepository.findOne.mockResolvedValue({ id: 'other-1', name: 'Otro Producto' });
            const dto = { ...createProductDTO, sku: 'SKU-EXISTENTE' };

            await expect(service.create(dto as any)).rejects.toThrow('ya está registrado');
        });
    });

    describe('generateVariants', () => {
        it('generates one sellable child per attribute combination', async () => {
            mockProductsRepository.findOne.mockResolvedValue({
                id: 'parent-1',
                name: 'Remera',
                description: null,
                cost: 100,
                price: 130,
                profitMargin: 30,
                useCustomMargin: false,
                category: null,
                categoryId: null,
                brand: null,
                brandId: null,
                isActive: true,
                isVariantParent: true,
            });
            mockProductsRepository.create.mockImplementation((value: unknown) => value);
            mockProductsRepository.save.mockImplementation(async (value: unknown) => value);

            const variants = await service.generateVariants('parent-1', {
                Color: ['Rojo', 'Azul'],
                Talle: ['M'],
            });

            expect(variants).toHaveLength(2);
            expect(variants[0]).toEqual(expect.objectContaining({
                parentProductId: 'parent-1',
                isVariantParent: false,
                stock: 0,
            }));
        });
    });

    describe('createMatrixProduct', () => {
        it('crea el producto padre y variantes con stock y atributos', async () => {
            mockConfigurationService.getCapabilitiesManifest.mockResolvedValue({
                capabilities: { 'STRUCTURAL.variants': true },
            });
            mockProductsRepository.findOne.mockResolvedValue(null);

            const result = await service.createMatrixProduct({
                name: 'Remera Lisa',
                styleCode: 'REM-100',
                cost: 5000,
                price: 10000,
                useManualPrice: true,
                season: 'Primavera-Verano 2026',
                matrixCells: [
                    { color: 'Negro', size: 'S', stock: 5, colorHex: '#000000' },
                    { color: 'Negro', size: 'M', stock: 10, colorHex: '#000000' },
                ],
            });

            expect(result.parent).toBeDefined();
            expect(result.parent.isVariantParent).toBe(true);
            expect(result.variants).toHaveLength(2);
            expect(result.totalVariants).toBe(2);
            expect(mockInventoryService.createMovement).toHaveBeenCalledTimes(2);
        });

        it('rechaza si no tiene la capacidad STRUCTURAL.variants', async () => {
            mockConfigurationService.getCapabilitiesManifest.mockResolvedValueOnce({
                capabilities: { 'STRUCTURAL.variants': false },
            });

            await expect(service.createMatrixProduct({
                name: 'Remera Lisa',
                matrixCells: [{ color: 'Negro', size: 'S', stock: 5 }],
            })).rejects.toThrow('solo está disponible para el rubro Indumentaria');
        });

        it('rechaza si hay código de barras duplicado en el payload', async () => {
            mockConfigurationService.getCapabilitiesManifest.mockResolvedValue({
                capabilities: { 'STRUCTURAL.variants': true },
            });

            await expect(service.createMatrixProduct({
                name: 'Remera Lisa',
                matrixCells: [
                    { color: 'Negro', size: 'S', stock: 5, barcode: '779123456' },
                    { color: 'Negro', size: 'M', stock: 10, barcode: '779123456' },
                ],
            })).rejects.toThrow('está duplicado en la matriz');
        });

        it('rechaza si el código de barras ya existe en la base de datos', async () => {
            mockConfigurationService.getCapabilitiesManifest.mockResolvedValue({
                capabilities: { 'STRUCTURAL.variants': true },
            });
            mockProductsRepository.findOne.mockResolvedValueOnce({ barcode: '779123456', name: 'Otro Producto' });

            await expect(service.createMatrixProduct({
                name: 'Remera Lisa',
                matrixCells: [
                    { color: 'Negro', size: 'S', stock: 5, barcode: '779123456' },
                ],
            })).rejects.toThrow('ya está registrado en el producto');
        });
    });

    describe('findByVariableBarcode', () => {
        it('resolves a local variable barcode through the existing SKU lookup', async () => {
            const product = { id: 'product-1', sku: '12345' };
            mockProductsRepository.findBySku.mockResolvedValue(product);

            await expect(service.findByVariableBarcode('2012345012509', {
                prefix: '20',
                productCodeRange: { from: 2, to: 6 },
                valueRange: { from: 7, to: 11 },
                valueType: 'weight',
                decimalPlaces: 3,
                checkDigit: true,
            })).resolves.toEqual({ product, variable: { kind: 'weight', productCode: '12345', quantity: 1.25 } });
        });
    });

    describe('update', () => {
        it('actualiza barcode del producto', async () => {
            const mockProduct = { id: 'uuid-123', name: 'Original', barcode: null, isActive: true };
            mockProductsRepository.findOne.mockImplementation(async (query: any) => {
                if (query?.where?.id === 'uuid-123') return mockProduct;
                return null;
            });

            await service.update('uuid-123', { barcode: '9876543210987' } as any);

            expect(mockProductsRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    barcode: '9876543210987',
                })
            );
        });

        it('lanza ConflictException al actualizar con código de barras de otro producto', async () => {
            const mockProduct = { id: 'uuid-123', name: 'Original', barcode: null, isActive: true };
            mockProductsRepository.findOne.mockImplementation(async (query: any) => {
                if (query?.where?.id === 'uuid-123') return mockProduct;
                return { id: 'other-id', name: 'Otro Producto' };
            });

            await expect(service.update('uuid-123', { barcode: '9876543210987' } as any))
                .rejects.toThrow('ya está registrado');
        });

        it('permite eliminar barcode estableciendo null', async () => {
            const mockProduct = { id: 'uuid-123', name: 'Original', barcode: '123', isActive: true };
            mockProductsRepository.findOne.mockImplementation(async (query: any) => {
                if (query?.where?.id === 'uuid-123') return mockProduct;
                return null;
            });

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

    describe('SizeScaleTemplates CRUD', () => {
        it('obtiene todas las escalas de talles ordenadas', async () => {
            const scales = [
                { id: '1', name: 'Adultos', sizes: ['S', 'M', 'L'], isSystemPreset: true, sortOrder: 1 },
                { id: '2', name: 'Oversize', sizes: ['1', '2'], isSystemPreset: false, sortOrder: 2 },
            ];
            mockSizeScaleRepository.find.mockResolvedValue(scales);

            const result = await service.getSizeScales();
            expect(result).toEqual(scales);
            expect(mockSizeScaleRepository.find).toHaveBeenCalledWith({
                order: { sortOrder: 'ASC', name: 'ASC' },
            });
        });

        it('crea una nueva escala de talles personalizada', async () => {
            mockSizeScaleRepository.findOne.mockResolvedValue(null);

            const result = await service.createSizeScale({
                name: 'Oversize Especial',
                sizes: ['1', '2', '3'],
                category: 'apparel',
            });

            expect(result.name).toBe('Oversize Especial');
            expect(result.sizes).toEqual(['1', '2', '3']);
            expect(mockSizeScaleRepository.save).toHaveBeenCalled();
        });

        it('lanza ConflictException si ya existe una escala con el mismo nombre', async () => {
            mockSizeScaleRepository.findOne.mockResolvedValue({ id: 'existing-id', name: 'Adultos' });

            await expect(
                service.createSizeScale({ name: 'Adultos', sizes: ['S', 'M'] })
            ).rejects.toThrow(ConflictException);
        });

        it('lanza ForbiddenException si se intenta modificar un preset de sistema', async () => {
            mockSizeScaleRepository.findOne.mockResolvedValue({
                id: 'sys-1',
                name: 'Adultos',
                isSystemPreset: true,
            });

            await expect(
                service.updateSizeScale('sys-1', { name: 'Adultos Mod', sizes: ['S'] })
            ).rejects.toThrow(ForbiddenException);
        });

        it('lanza ForbiddenException si se intenta eliminar un preset de sistema', async () => {
            mockSizeScaleRepository.findOne.mockResolvedValue({
                id: 'sys-1',
                name: 'Adultos',
                isSystemPreset: true,
            });

            await expect(service.deleteSizeScale('sys-1')).rejects.toThrow(ForbiddenException);
        });

        it('elimina una escala personalizada exitosamente', async () => {
            mockSizeScaleRepository.findOne.mockResolvedValue({
                id: 'custom-1',
                name: 'Mi Escala',
                isSystemPreset: false,
            });

            const result = await service.deleteSizeScale('custom-1');
            expect(result).toEqual({ message: 'Escala de talles eliminada correctamente' });
            expect(mockSizeScaleRepository.remove).toHaveBeenCalled();
        });
    });

    describe('ColorPaletteTemplates CRUD', () => {
        it('obtiene todas las paletas de colores ordenadas', async () => {
            const palettes = [
                { id: '1', name: 'Básicos', colors: [{ name: 'Negro', hex: '#000000' }], isSystemPreset: true },
            ];
            mockColorPaletteRepository.find.mockResolvedValue(palettes);

            const result = await service.getColorPalettes();
            expect(result).toEqual(palettes);
        });

        it('crea una nueva paleta de colores personalizada', async () => {
            mockColorPaletteRepository.findOne.mockResolvedValue(null);

            const result = await service.createColorPalette({
                name: 'Pasteles',
                colors: [{ name: 'Rosa Pastel', hex: '#f472b6' }],
            });

            expect(result.name).toBe('Pasteles');
            expect(mockColorPaletteRepository.save).toHaveBeenCalled();
        });

        it('lanza ForbiddenException si se intenta eliminar un preset de sistema', async () => {
            mockColorPaletteRepository.findOne.mockResolvedValue({
                id: 'pal-sys-1',
                name: 'Básicos',
                isSystemPreset: true,
            });

            await expect(service.deleteColorPalette('pal-sys-1')).rejects.toThrow(ForbiddenException);
        });

        it('elimina una paleta personalizada exitosamente', async () => {
            mockColorPaletteRepository.findOne.mockResolvedValue({
                id: 'pal-custom-1',
                name: 'Mi Paleta',
                isSystemPreset: false,
            });

            const result = await service.deleteColorPalette('pal-custom-1');
            expect(result).toEqual({ message: 'Paleta de colores eliminada correctamente' });
            expect(mockColorPaletteRepository.remove).toHaveBeenCalled();
        });
    });
});
