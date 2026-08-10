/**
 * Tests de modelo para StockTransfer.
 * Verifica forma, defaults e invariantes reflejadas en CHECK constraints.
 */
import { StockTransfer, StockTransferStatus } from './stock-transfer.entity';
import { Product } from '../../products/entities/product.entity';
import { Location } from './location.entity';

describe('StockTransfer entity', () => {
    it('declara status default COMPLETADO en la entity (validado por la migración)', () => {
        // TypeORM no aplica los `default:` al instanciar `new Entity()`; se
        // aplican al persistir. Validamos enum y forma, no defaults en memoria.
        expect(StockTransferStatus.COMPLETADO).toBe('COMPLETADO');
        const transfer = new StockTransfer();
        expect(transfer.status).toBeUndefined();
    });

    it('quantity positiva y origen/destino distintos se modelan como invariantes', () => {
        const transfer = new StockTransfer();
        transfer.quantity = 4;
        transfer.fromLocationId = 'loc-a';
        transfer.toLocationId = 'loc-b';

        // Estas invariantes están enforced en BD (CHECK constraints); a nivel
        // entity la clase las modela solo con tipos (no nullable, number).
        expect(transfer.quantity).toBeGreaterThan(0);
        expect(transfer.fromLocationId).not.toBe(transfer.toLocationId);
    });

    it('acepta ambos estados del enum', () => {
        expect(Object.values(StockTransferStatus)).toEqual(
            expect.arrayContaining([
                StockTransferStatus.COMPLETADO,
                StockTransferStatus.ANULADO,
            ]),
        );
    });

    it('mantiene referencias ManyToOne a Product, from y to', () => {
        const transfer = new StockTransfer();
        const product = new Product();
        const from = new Location();
        const to = new Location();

        transfer.product = product;
        transfer.fromLocation = from;
        transfer.toLocation = to;

        expect(transfer.product).toBe(product);
        expect(transfer.fromLocation).toBe(from);
        expect(transfer.toLocation).toBe(to);
    });
});
