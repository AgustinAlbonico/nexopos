import { getMetadataArgsStorage } from 'typeorm';
import { Product } from './product.entity';
import { ProductVariantAttribute } from './product-variant-attribute.entity';

describe('Product quantity metadata', () => {
    it('stores stock with three decimal places', () => {
        const stock = getMetadataArgsStorage().columns.find(
            (column) => column.target === Product && column.propertyName === 'stock',
        );

        expect(stock?.options).toMatchObject({ type: 'decimal', precision: 20, scale: 3 });
    });
});

describe('Product variant metadata', () => {
    it('models a parent link and a non-sellable parent flag', () => {
        const columns = getMetadataArgsStorage().columns.filter((column) => column.target === Product);

        expect(columns.find((column) => column.propertyName === 'parentProductId')?.options).toMatchObject({
            type: 'uuid',
            nullable: true,
        });
        expect(columns.find((column) => column.propertyName === 'isVariantParent')?.options).toMatchObject({
            type: 'boolean',
            default: false,
        });
    });

    it('makes each variant attribute key unique per child product', () => {
        expect(getMetadataArgsStorage().uniques).toContainEqual(expect.objectContaining({
            target: ProductVariantAttribute,
            columns: ['productId', 'attributeKey'],
        }));
    });
});
