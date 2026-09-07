import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
    it('delegates variable barcode resolution to the products service', async () => {
        const productsService = {
            findByVariableBarcode: jest.fn().mockResolvedValue({ product: { id: 'product-1' } }),
        } as unknown as ProductsService;
        const controller = new ProductsController(productsService);
        const input = {
            barcode: '2012345012509',
            layout: {
                prefix: '20', productCodeRange: { from: 2, to: 6 }, valueRange: { from: 7, to: 11 },
                valueType: 'weight' as const, decimalPlaces: 3, checkDigit: true,
            },
        };

        await expect(controller.resolveVariableBarcode(input)).resolves.toEqual({ product: { id: 'product-1' } });
        expect(productsService.findByVariableBarcode).toHaveBeenCalledWith(input.barcode, input.layout);
    });

    it('delegates createMatrixProduct to products service', async () => {
        const productsService = {
            createMatrixProduct: jest.fn().mockResolvedValue({ parent: { id: 'parent-1' }, variants: [], totalVariants: 0 }),
        } as unknown as ProductsService;
        const controller = new ProductsController(productsService);
        const dto = {
            name: 'Remera Lisa',
            matrixCells: [{ color: 'Negro', size: 'M', stock: 10 }],
        };

        await expect(controller.createMatrix(dto as any)).resolves.toEqual({ parent: { id: 'parent-1' }, variants: [], totalVariants: 0 });
        expect(productsService.createMatrixProduct).toHaveBeenCalledWith(dto);
    });

    it('delegates size-scales and color-palettes CRUD to products service', async () => {
        const productsService = {
            getSizeScales: jest.fn().mockResolvedValue([{ id: '1', name: 'Adultos' }]),
            createSizeScale: jest.fn().mockResolvedValue({ id: '2', name: 'Oversize' }),
            getColorPalettes: jest.fn().mockResolvedValue([{ id: '1', name: 'Básicos' }]),
            createColorPalette: jest.fn().mockResolvedValue({ id: '2', name: 'Pasteles' }),
        } as unknown as ProductsService;
        const controller = new ProductsController(productsService);

        await expect(controller.getSizeScales()).resolves.toEqual([{ id: '1', name: 'Adultos' }]);
        await expect(controller.createSizeScale({ name: 'Oversize', sizes: ['1', '2'] } as any)).resolves.toEqual({ id: '2', name: 'Oversize' });
        await expect(controller.getColorPalettes()).resolves.toEqual([{ id: '1', name: 'Básicos' }]);
        await expect(controller.createColorPalette({ name: 'Pasteles', colors: [] } as any)).resolves.toEqual({ id: '2', name: 'Pasteles' });
    });
});
