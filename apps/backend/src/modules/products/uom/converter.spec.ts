import {
    CANONICAL_UOM_BASES,
} from './canonical-bases';
import {
    convertToBase,
    isCanonicalBase,
    type UomDescriptor,
} from './converter';

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

const kilogram: UomDescriptor = {
    code: 'kg',
    category: 'weight',
    precision: 3,
    conversionToBase: 1,
};

const milliliter: UomDescriptor = {
    code: 'ml',
    category: 'volume',
    precision: 3,
    conversionToBase: 0.001,
};

const liter: UomDescriptor = {
    code: 'l',
    category: 'volume',
    precision: 3,
    conversionToBase: 1,
};

describe('convertToBase', () => {
    it('Given a canonical unit When converting Then base quantity is identity', () => {
        const result = convertToBase(7, unit);
        expect(result).toEqual({ ok: true, baseQuantity: 7, precision: 0 });
        expect(isCanonicalBase(unit)).toBe(true);
        expect(isCanonicalBase(gram)).toBe(false);
    });

    it('Given grams When converting 125g Then base is exactly 0.125', () => {
        const result = convertToBase(125, gram);
        expect(result).toEqual({ ok: true, baseQuantity: 0.125, precision: 3 });
    });

    it('Given grams When converting 3g Then base is exactly 0.003', () => {
        const result = convertToBase(3, gram);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.baseQuantity).toBe(0.003);
    });

    it('Given kilograms When converting Then base is identity', () => {
        const result = convertToBase(2.5, kilogram);
        expect(result).toEqual({ ok: true, baseQuantity: 2.5, precision: 3 });
    });

    it('Given milliliters When converting 500ml Then base is exactly 0.5 l', () => {
        const result = convertToBase(500, milliliter);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.baseQuantity).toBe(0.5);
    });

    it('Given liters When converting Then base is identity', () => {
        const result = convertToBase(1.25, liter);
        expect(result).toEqual({ ok: true, baseQuantity: 1.25, precision: 3 });
    });

    it('Given non-finite quantity When converting Then returns failure', () => {
        const result = convertToBase(Number.NaN, unit);
        expect(result).toEqual({ ok: false, error: 'quantity must be a finite number' });
    });

    it('Given invalid conversionToBase When converting Then returns failure', () => {
        const broken: UomDescriptor = { ...unit, conversionToBase: 0 };
        const result = convertToBase(5, broken);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toContain('must be > 0');
    });
});

describe('canonical bases', () => {
    it('Given every category When listing bases Then mapping is stable', () => {
        expect(CANONICAL_UOM_BASES.unit).toBe('un');
        expect(CANONICAL_UOM_BASES.weight).toBe('kg');
        expect(CANONICAL_UOM_BASES.volume).toBe('l');
        expect(CANONICAL_UOM_BASES.length).toBe('m');
    });
});