import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MatrixImportService } from './matrix-import.service';

describe('MatrixImportService', () => {
    let service: MatrixImportService;
    let mockDataSource: any;
    let mockConfigService: any;
    let mockProductRepo: any;
    let mockCategoryRepo: any;
    let mockBrandRepo: any;
    let mockVariantAttrRepo: any;

    beforeEach(() => {
        mockConfigService = {
            getCapabilitiesManifest: jest.fn<any>().mockResolvedValue({
                capabilities: {
                    'STRUCTURAL.variants': true,
                },
            }),
        };

        mockProductRepo = {
            create: jest.fn((dto: any) => ({ id: 'prod-id-' + Math.random(), ...dto })),
            save: jest.fn(async (entity: any) => entity),
        };

        mockCategoryRepo = {
            findOne: jest.fn<any>().mockResolvedValue(null),
            create: jest.fn((dto: any) => ({ id: 'cat-id', ...dto })),
            save: jest.fn(async (entity: any) => entity),
        };

        mockBrandRepo = {
            findOne: jest.fn<any>().mockResolvedValue(null),
            create: jest.fn((dto: any) => ({ id: 'brand-id', ...dto })),
            save: jest.fn(async (entity: any) => entity),
        };

        mockVariantAttrRepo = {
            create: jest.fn((dto: any) => ({ id: 'attr-id', ...dto })),
            save: jest.fn(async (entity: any) => entity),
        };

        mockDataSource = {
            transaction: jest.fn(async (callback: (manager: any) => Promise<any>) => {
                const manager = {
                    getRepository: (target: any) => {
                        if (target.name === 'Product') return mockProductRepo;
                        if (target.name === 'Category') return mockCategoryRepo;
                        if (target.name === 'Brand') return mockBrandRepo;
                        if (target.name === 'ProductVariantAttribute') return mockVariantAttrRepo;
                        return mockProductRepo;
                    },
                };
                return callback(manager);
            }),
        };

        service = new MatrixImportService(mockDataSource as any, mockConfigService as any);
    });

    it('genera la plantilla CSV correctamente con cabeceras y ejemplos', () => {
        const template = service.getTemplateCsv();
        expect(template).toContain('CODIGO_ESTILO');
        expect(template).toContain('NOMBRE_MODELO');
        expect(template).toContain('COLOR');
        expect(template).toContain('XS,S,M,L,XL,XXL');
    });

    it('previsualiza correctamente un CSV válido', async () => {
        const csv = `CODIGO_ESTILO,NOMBRE_MODELO,COLOR,S,M,L\nREM-01,Remera Básica,Negro,5,10,15`;
        const preview = await service.preview(csv);

        expect(preview.totalModels).toBe(1);
        expect(preview.totalVariants).toBe(3);
        expect(preview.totalStockUnits).toBe(30);
    });

    it('bloquea la importación si la capacidad STRUCTURAL.variants no está activa', async () => {
        mockConfigService.getCapabilitiesManifest.mockResolvedValueOnce({
            capabilities: {
                'STRUCTURAL.variants': false,
            },
        });

        const csv = `CODIGO_ESTILO,NOMBRE_MODELO,COLOR,S\nREM-01,Remera,Negro,5`;
        await expect(service.preview(csv)).rejects.toThrow(/solo está habilitada para el rubro Indumentaria/i);
    });

    it('ejecuta el commit atómico creando producto padre y variantes', async () => {
        const csv = `CODIGO_ESTILO,NOMBRE_MODELO,CATEGORIA,MARCA,COLOR,S,M\nREM-01,Remera Básica,Remeras,Levis,Negro,5,10`;
        const result = await service.commit(csv);

        expect(result.success).toBe(true);
        expect(result.importedModels).toBe(1);
        expect(result.importedVariants).toBe(2);
        expect(result.totalStockUnits).toBe(15);
        expect(mockDataSource.transaction).toHaveBeenCalled();
    });
});
