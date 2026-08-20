import { resolveMeasuredQuantity, validateMeasuredQuantity } from './measured-quantity.policy';

describe('validateMeasuredQuantity', () => {
    it('rejects fractional quantities for unit products', () => {
        expect(() => validateMeasuredQuantity(0.125, false)).toThrow('no admite cantidades fraccionarias');
    });

    it('accepts fractional quantities for measured products', () => {
        expect(() => validateMeasuredQuantity(0.125, true)).not.toThrow();
    });
});

describe('resolveMeasuredQuantity', () => {
    it('deducts tare from a gross kilogram reading before stock is affected', () => {
        expect(resolveMeasuredQuantity({ quantity: 0.625, grossQuantity: 0.75, tareGrams: 125 }, true)).toBe(0.625);
    });

    it('rejects a submitted quantity that differs from the gross reading net of tare', () => {
        expect(() => resolveMeasuredQuantity({ quantity: 0.5, grossQuantity: 0.75, tareGrams: 125 }, true)).toThrow(
            'La cantidad neta no coincide con el peso bruto menos la tara',
        );
    });

    it('keeps a GS1 net-weight quantity unchanged when no gross reading is supplied', () => {
        expect(resolveMeasuredQuantity({ quantity: 0.125, tareGrams: 125 }, true)).toBe(0.125);
    });
});
