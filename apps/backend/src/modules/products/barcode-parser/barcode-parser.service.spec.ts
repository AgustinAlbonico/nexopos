import { parseVariableBarcode } from './barcode-parser.service';

describe('parseVariableBarcode', () => {
    it('parses a GS1 weight payload into kilograms', () => {
        expect(parseVariableBarcode('3103001250')).toEqual({ kind: 'weight', quantity: 1.25 });
    });

    it('parses a local EAN-13 weight layout', () => {
        expect(parseVariableBarcode('2012345012509', {
            prefix: '20',
            productCodeRange: { from: 2, to: 6 },
            valueRange: { from: 7, to: 11 },
            valueType: 'weight',
            decimalPlaces: 3,
            checkDigit: true,
        })).toEqual({ kind: 'weight', productCode: '12345', quantity: 1.25 });
    });

    it('parses a GS1 price payload into currency units', () => {
        expect(parseVariableBarcode('3922001234')).toEqual({ kind: 'price', amount: 12.34 });
    });

    it('parses a GS1 price payload with ISO currency', () => {
        expect(parseVariableBarcode('3932032001234')).toEqual({ kind: 'price', amount: 12.34 });
    });

    it('rejects malformed payloads', () => {
        expect(parseVariableBarcode('not-a-barcode')).toBeNull();
    });
});
