/**
 * Canonical base units used by UOM conversions.
 * Plan reference: `apps/backend/src/modules/products/uom/canonical-bases.ts`.
 *
 * This list is intentionally tiny: it defines only the category-to-base
 * mapping the rest of the codebase relies on. New categories must extend
 * `UomCategory` (see `keys.ts`) and add their base here.
 */
export const CANONICAL_UOM_BASES = {
    unit: 'un',
    weight: 'kg',
    volume: 'l',
    length: 'm',
} as const;

export type UomCategory = keyof typeof CANONICAL_UOM_BASES;
export type CanonicalBaseCode = (typeof CANONICAL_UOM_BASES)[UomCategory];

export const UOM_CATEGORIES: readonly UomCategory[] = Object.keys(
    CANONICAL_UOM_BASES,
) as readonly UomCategory[];