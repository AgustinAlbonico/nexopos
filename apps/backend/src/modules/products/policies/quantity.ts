import { convertToBase, type UomDescriptor } from '../../products/uom/converter';

/**
 * Quantity validation policy used by `SalesService.create` and
 * `InventoryService.recordMovementInLocation`. Pure; no I/O. Always runs
 * regardless of capability flags — the capability `STRUCTURAL.decimal_quantities`
 * only chooses the *parser* in `SaleForm`, not whether validation runs.
 *
 * Plan reference: `apps/backend/src/modules/products/policies/quantity.ts`.
 */

export interface QuantityValidationInput {
    readonly requested: number;
    readonly availableStock: number;
    readonly uom: UomDescriptor;
    /** When false the policy refuses any fractional request. */
    readonly allowDecimals: boolean;
    /** When true the policy may exceed `availableStock`. */
    readonly allowOutOfStock: boolean;
}

export interface QuantityValidationSuccess {
    readonly ok: true;
    readonly baseQuantity: number;
    readonly precision: number;
    readonly deduction: number;
}

export interface QuantityValidationFailure {
    readonly ok: false;
    readonly code:
        | 'NON_FINITE'
        | 'NON_POSITIVE'
        | 'FRACTIONAL_FOR_UNIT_ONLY'
        | 'PRECISION_EXCEEDED'
        | 'INSUFFICIENT_STOCK';
    readonly message: string;
}

export type QuantityValidationResult =
    | QuantityValidationSuccess
    | QuantityValidationFailure;

const ALLOWED_DECIMAL_CATEGORIES = new Set(['weight', 'volume', 'length']);

export function validateSaleQuantity(
    input: QuantityValidationInput,
): QuantityValidationResult {
    const { requested, availableStock, uom, allowDecimals, allowOutOfStock } = input;

    if (!Number.isFinite(requested)) {
        return { ok: false, code: 'NON_FINITE', message: 'La cantidad debe ser un número finito' };
    }

    if (requested <= 0) {
        return { ok: false, code: 'NON_POSITIVE', message: 'La cantidad debe ser mayor a cero' };
    }

    const requestedHasFraction = requested !== Math.floor(requested);

    if (requestedHasFraction && !allowDecimals) {
        return {
            ok: false,
            code: 'FRACTIONAL_FOR_UNIT_ONLY',
            message: 'Legacy solo acepta cantidades enteras',
        };
    }

    const step = Math.pow(10, uom.precision);
    const scaledRequested = Math.round(requested * step);
    const remainder = Math.abs(scaledRequested - requested * step);

    if (remainder > Number.EPSILON * step) {
        return {
            ok: false,
            code: 'PRECISION_EXCEEDED',
            message: `La cantidad excede la precisión de ${uom.precision} decimales`,
        };
    }

    const normalizedRequested = scaledRequested / step;
    const conversion = convertToBase(normalizedRequested, uom);
    if (!conversion.ok) {
        return { ok: false, code: 'NON_FINITE', message: conversion.error };
    }
    const rounded = conversion.baseQuantity;

    if (!allowOutOfStock && rounded > availableStock) {
        return {
            ok: false,
            code: 'INSUFFICIENT_STOCK',
            message: `Stock insuficiente: ${availableStock} disponibles`,
        };
    }

    return {
        ok: true,
        baseQuantity: rounded,
        precision: uom.precision,
        deduction: rounded,
    };
}

export function categoryAllowsDecimals(category: UomDescriptor['category']): boolean {
    return ALLOWED_DECIMAL_CATEGORIES.has(category);
}