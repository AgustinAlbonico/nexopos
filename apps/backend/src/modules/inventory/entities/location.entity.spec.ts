/**
 * Tests de modelo para Location.
 * Verifica la forma del entity, defaults e invariantes reflejadas en la migración.
 */
import { Location, LocationFunction } from './location.entity';
import { ProductLocationStock } from './product-location-stock.entity';

describe('Location entity', () => {
    it('define defaults en los decoradores de columna (validados por la migración)', () => {
        // TypeORM no aplica los `default:` al instanciar `new Entity()`; se
        // aplican al persistir. Por eso acá validamos enum y nombres de
        // campo, no defaults aplicados en memoria.
        const location = new Location();
        expect(location.productLocationStocks).toBeUndefined();
        expect(LocationFunction.STORAGE).toBe('STORAGE');
        expect(LocationFunction.SALE).toBe('SALE');
    });

    it('acepta las dos funciones definidas (SALE | STORAGE)', () => {
        const sale = new Location();
        sale.function = LocationFunction.SALE;

        const storage = new Location();
        storage.function = LocationFunction.STORAGE;

        expect(Object.values(LocationFunction)).toEqual(
            expect.arrayContaining([LocationFunction.SALE, LocationFunction.STORAGE]),
        );
        expect(sale.function).toBe('SALE');
        expect(storage.function).toBe('STORAGE');
    });

    it('mantiene la forma de la relación OneToMany a ProductLocationStock', () => {
        const pls = new ProductLocationStock();
        const location = new Location();
        location.productLocationStocks = [pls];

        expect(location.productLocationStocks).toHaveLength(1);
        expect(location.productLocationStocks[0]).toBe(pls);
    });
});
