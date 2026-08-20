import { productSchema } from './product.schema';

describe('productSchema', () => {
    it('accepts measured-product configuration in manual price mode', () => {
        expect(productSchema.parse({
            name: 'Queso por kilo',
            price: 1500,
            useManualPrice: true,
            isMeasure: true,
            tareGrams: 25,
            variableBarcodeFormat: 'gs1_weight',
        })).toMatchObject({
            name: 'Queso por kilo',
            price: 1500,
            useManualPrice: true,
            isMeasure: true,
            tareGrams: 25,
            variableBarcodeFormat: 'gs1_weight',
        });
    });

    it('requires price when useManualPrice is true', () => {
        expect(() => productSchema.parse({
            name: 'Producto sin precio',
            useManualPrice: true,
        })).toThrow();
    });

    it('requires cost when useManualPrice is false', () => {
        expect(() => productSchema.parse({
            name: 'Producto sin costo',
            useManualPrice: false,
        })).toThrow();
    });

    it('accepts classic mode with cost', () => {
        expect(productSchema.parse({
            name: 'Shampoo Sedal',
            cost: 100,
            useManualPrice: false,
        })).toMatchObject({
            name: 'Shampoo Sedal',
            cost: 100,
            useManualPrice: false,
        });
    });
});
