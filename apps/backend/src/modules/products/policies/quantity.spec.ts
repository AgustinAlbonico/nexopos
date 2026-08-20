import { validateSaleQuantity, categoryAllowsDecimals } from './quantity';
import type { UomDescriptor } from '../../products/uom/converter';

const unit: UomDescriptor = {
    code: 'un',
    category: 'unit',
    precision: 0,
    conversionToBase: 1,
};

const gram: UomDescriptor = {
    code: 'g',
    category: 'weight',
    precision: 3,
    conversionToBase: 0.001,
};

describe('validateSaleQuantity', () => {
    it('Given integer request on a unit product When validating Then succeeds', () => {
        const result = validateSaleQuantity({
            requested: 5,
            availableStock: 10,
            uom: unit,
            allowDecimals: false,
            allowOutOfStock: false,
        });
        expect(result).toEqual({ ok: true, baseQuantity: 5, precision: 0, deduction: 5 });
    });

    it('Given fractional request on a unit product with decimals disabled When validating Then rejects', () => {
        const result = validateSaleQuantity({
            requested: 1.5,
            availableStock: 10,
            uom: unit,
            allowDecimals: false,
            allowOutOfStock: false,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.code).toBe('FRACTIONAL_FOR_UNIT_ONLY');
    });

    it('Given 125g request on grams When validating Then baseQuantity is exactly 0.125 and deduction matches', () => {
        const result = validateSaleQuantity({
            requested: 125,
            availableStock: 1,
            uom: gram,
            allowDecimals: true,
            allowOutOfStock: true,
        });
        expect(result).toEqual({ ok: true, baseQuantity: 0.125, precision: 3, deduction: 0.125 });
    });

    it('Given request exceeds available stock When out-of-stock disabled Then rejects INSUFFICIENT_STOCK', () => {
        const result = validateSaleQuantity({
            requested: 6,
            availableStock: 4,
            uom: unit,
            allowDecimals: false,
            allowOutOfStock: false,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.code).toBe('INSUFFICIENT_STOCK');
    });

    it('Given request exceeds stock When out-of-stock allowed Then succeeds', () => {
        const result = validateSaleQuantity({
            requested: 6,
            availableStock: 4,
            uom: unit,
            allowDecimals: false,
            allowOutOfStock: true,
        });
        expect(result).toEqual({ ok: true, baseQuantity: 6, precision: 0, deduction: 6 });
    });

    it('Given request with too many decimals When validating Then rejects PRECISION_EXCEEDED', () => {
        const result = validateSaleQuantity({
            requested: 1.2345,
            availableStock: 5,
            uom: gram,
            allowDecimals: true,
            allowOutOfStock: false,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.code).toBe('PRECISION_EXCEEDED');
    });

    it('Given zero or negative request When validating Then rejects NON_POSITIVE', () => {
        const zero = validateSaleQuantity({
            requested: 0,
            availableStock: 10,
            uom: unit,
            allowDecimals: false,
            allowOutOfStock: false,
        });
        expect(zero.ok).toBe(false);
        if (!zero.ok) expect(zero.code).toBe('NON_POSITIVE');

        const negative = validateSaleQuantity({
            requested: -3,
            availableStock: 10,
            uom: unit,
            allowDecimals: false,
            allowOutOfStock: false,
        });
        expect(negative.ok).toBe(false);
        if (!negative.ok) expect(negative.code).toBe('NON_POSITIVE');
    });

    it('Given non-finite request When validating Then rejects NON_FINITE', () => {
        const result = validateSaleQuantity({
            requested: Number.NaN,
            availableStock: 10,
            uom: unit,
            allowDecimals: false,
            allowOutOfStock: false,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.code).toBe('NON_FINITE');
    });
});

describe('categoryAllowsDecimals', () => {
    it('Given every category When checking decimals Then mapping matches plan', () => {
        expect(categoryAllowsDecimals('unit')).toBe(false);
        expect(categoryAllowsDecimals('weight')).toBe(true);
        expect(categoryAllowsDecimals('volume')).toBe(true);
        expect(categoryAllowsDecimals('length')).toBe(true);
    });
});