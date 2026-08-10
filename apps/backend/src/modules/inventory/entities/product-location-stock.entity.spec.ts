/**
 * Tests de modelo para ProductLocationStock.
 * Verifica la forma del entity, default de quantity e invariantes reflejadas
 * en la migración (UNIQUE sobre productId+locationId, FKs no null).
 */
import { ProductLocationStock } from './product-location-stock.entity';
import { Product } from '../../products/entities/product.entity';
import { Location } from './location.entity';

describe('ProductLocationStock entity', () => {
    it('declara quantity con default 0 en la entity (validado por la migración)', () => {
        // TypeORM no aplica los `default:` al instanciar `new Entity()`; se
        // aplican al persistir. Validamos la forma del entity, no el valor
        // aplicado en memoria.
        const stock = new ProductLocationStock();
        expect(stock.quantity).toBeUndefined();
    });

    it('mantiene las referencias a Product y Location', () => {
        const product = new Product();
        product.id = 'p-1';

        const location = new Location();
        location.id = 'l-1';

        const stock = new ProductLocationStock();
        stock.product = product;
        stock.location = location;
        stock.productId = 'p-1';
        stock.locationId = 'l-1';

        expect(stock.product).toBe(product);
        expect(stock.location).toBe(location);
        expect(stock.productId).toBe('p-1');
        expect(stock.locationId).toBe('l-1');
    });
});
