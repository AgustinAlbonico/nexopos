import {
    CANONICAL_UOM_BASES,
    UOM_CATEGORIES,
    type UomCategory,
} from './canonical-bases';

/**
 * Lightweight description of a UOM used by the pure converter. Mirrors the
 * `UnitOfMeasure` entity but without coupling to TypeORM; callers can build
 * one from an entity or from a seed row.
 */
export interface UomDescriptor {
    readonly code: string;
    readonly category: UomCategory;
    readonly precision: number;
    readonly conversionToBase: number;
}

export interface ConvertSuccess {
    readonly ok: true;
    readonly baseQuantity: number;
    readonly precision: number;
}

export interface ConvertFailure {
    readonly ok: false;
    readonly error: string;
}

export type ConvertResult = ConvertSuccess | ConvertFailure;

const ROUND_FACTOR = 1_000_000;

function assertCategory(value: string): asserts value is UomCategory {
    if (!UOM_CATEGORIES.includes(value as UomCategory)) {
        throw new Error(`Unknown UOM category: ${value}`);
    }
}

export function isCanonicalBase(uom: UomDescriptor): boolean {
    return CANONICAL_UOM_BASES[uom.category] === uom.code;
}

/**
 * Converts `quantity` expressed in `fromUom` to its canonical-base equivalent.
 * Pure; no I/O.
 */
export function convertToBase(quantity: number, fromUom: UomDescriptor): ConvertResult {
    if (!Number.isFinite(quantity)) {
        return { ok: false, error: 'quantity must be a finite number' };
    }
    assertCategory(fromUom.category);
    if (fromUom.conversionToBase <= 0) {
        return { ok: false, error: `conversionToBase must be > 0 for ${fromUom.code}` };
    }

    const rawBase = quantity * fromUom.conversionToBase;
    const factor = Math.pow(10, fromUom.precision);
    const rounded = Math.round(rawBase * factor) / factor;

    if (!Number.isFinite(rounded)) {
        return { ok: false, error: 'resulting base quantity is not finite' };
    }

    return { ok: true, baseQuantity: rounded, precision: fromUom.precision };
}

export const __TESTING = { ROUND_FACTOR };