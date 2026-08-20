import { getMetadataArgsStorage } from 'typeorm';
import { SaleItem } from './sale-item.entity';

describe('SaleItem measurement snapshot metadata', () => {
    it('persists entry mode and gross, tare, and net quantities', () => {
        const columns = getMetadataArgsStorage().columns
            .filter((column) => column.target === SaleItem)
            .map((column) => column.options.name ?? column.propertyName);

        expect(columns).toEqual(expect.arrayContaining(['enterMode', 'grossQuantity', 'tareGrams', 'netQuantity']));
    });
});
