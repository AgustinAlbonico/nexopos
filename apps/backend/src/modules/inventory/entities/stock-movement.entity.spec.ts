/**
 * Tests de modelo para StockMovement.
 *
 * Cubre la forma del entity, defaults, y los campos agregados en PR2 del
 * change `stock-sectorizado`: `locationId` nullable y `StockMovementSource.TRANSFER`.
 */
import { StockMovement, StockMovementType, StockMovementSource } from './stock-movement.entity';
import { Product } from '../../products/entities/product.entity';
import { Location } from './location.entity';

describe('StockMovement entity', () => {
    it('acepta los tipos IN y OUT', () => {
        expect(Object.values(StockMovementType)).toEqual(
            expect.arrayContaining([StockMovementType.IN, StockMovementType.OUT]),
        );
    });

    it('incluye el valor TRANSFER en StockMovementSource', () => {
        // Extensión del enum para que los traslados entre ubicaciones puedan
        // identificarse como origen del movimiento (escenarios S3 / S5 de
        // inventory-movements.md).
        expect(Object.values(StockMovementSource)).toEqual(
            expect.arrayContaining([StockMovementSource.TRANSFER]),
        );
        expect(StockMovementSource.TRANSFER).toBe('TRANSFER');
    });

    it('mantiene los valores previos del enum StockMovementSource', () => {
        // Garantiza que la extensión no rompió ninguno existente.
        const expected = [
            StockMovementSource.INITIAL_LOAD,
            StockMovementSource.PURCHASE,
            StockMovementSource.SALE,
            StockMovementSource.ADJUSTMENT,
            StockMovementSource.RETURN,
            StockMovementSource.TRANSFER,
        ];
        const actual = Object.values(StockMovementSource);
        for (const value of expected) {
            expect(actual).toContain(value);
        }
    });

    it('locationId es opcional y se permite null (back-compat)', () => {
        const movement = new StockMovement();
        expect(movement.locationId).toBeFalsy();
        expect(movement.location).toBeFalsy();
    });

    it('acepta asignar locationId y referencia a Location', () => {
        const location = new Location();
        location.id = 'loc-1';

        const movement = new StockMovement();
        movement.locationId = 'loc-1';
        movement.location = location;

        expect(movement.locationId).toBe('loc-1');
        expect(movement.location).toBe(location);
    });

    it('mantiene la referencia al producto', () => {
        const product = new Product();
        product.id = 'prod-1';

        const movement = new StockMovement();
        movement.productId = 'prod-1';
        movement.product = product;

        expect(movement.productId).toBe('prod-1');
        expect(movement.product).toBe(product);
    });
});