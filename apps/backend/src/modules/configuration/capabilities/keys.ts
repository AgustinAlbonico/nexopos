export const POLICY_CAPABILITY_KEYS = [
    'POLICY.manual_discount_reason',
    'POLICY.price_override_reason',
    'POLICY.whole_sale_only_cancellation',
] as const;

export const STRUCTURAL_CAPABILITY_KEYS = [
    'STRUCTURAL.decimal_quantities',
    'STRUCTURAL.weight_scale',
    'STRUCTURAL.variants',
    'STRUCTURAL.lot_expiry',
    'STRUCTURAL.serial_warranty',
    'STRUCTURAL.consignment',
    'STRUCTURAL.wholesale_price_lists',
    'STRUCTURAL.unit_pack',
    'STRUCTURAL.sellable_pack',
    'STRUCTURAL.bundle',
    'STRUCTURAL.acopio_management',
    'STRUCTURAL.lazy_serial_scan',
] as const;

export const TOOLING_CAPABILITY_KEYS = [
    'TOOLING.catalog_import',
    'TOOLING.product_labels',
    'TOOLING.stocktake',
    'TOOLING.inventory_audit',
    'TOOLING.restore_safety',
    'TOOLING.updater_recovery',
    'TOOLING.peripheral_diagnostics',
    'TOOLING.blind_cash_closing',
    'TOOLING.park_sales',
    'TOOLING.quick_cash_pay',
] as const;

export const COMMERCIAL_CAPABILITY_KEYS = [
    'COMMERCIAL.quantity_breaks',
    'COMMERCIAL.time_bound_promotion',
    'COMMERCIAL.coupon',
    'COMMERCIAL.loyalty',
    'COMMERCIAL.store_credit',
    'COMMERCIAL.customer_credit_limit',
    'COMMERCIAL.volume_discount_rules',
] as const;

export const FISCALITY_CAPABILITY_KEYS = [
    'FISCALITY.credit_notes_a',
    'FISCALITY.credit_notes_b',
    'FISCALITY.credit_notes_c',
] as const;

export const APP_ROUTE_CAPABILITY_KEYS = [
    'APP_ROUTES.dashboard',
    'APP_ROUTES.products',
    'APP_ROUTES.customers',
    'APP_ROUTES.suppliers',
    'APP_ROUTES.purchases',
    'APP_ROUTES.sales',
    'APP_ROUTES.expenses',
    'APP_ROUTES.incomes',
    'APP_ROUTES.cash_register',
    'APP_ROUTES.customer_accounts',
    'APP_ROUTES.reports',
    'APP_ROUTES.settings',
    'APP_ROUTES.settings_fiscal',
    'APP_ROUTES.settings_users',
    'APP_ROUTES.settings_backup',
    'APP_ROUTES.inventory_locations',
    'APP_ROUTES.inventory_locations_activate',
    'APP_ROUTES.inventory_replenishment',
] as const;

export const ALL_CAPABILITY_KEYS = [
    ...POLICY_CAPABILITY_KEYS,
    ...STRUCTURAL_CAPABILITY_KEYS,
    ...TOOLING_CAPABILITY_KEYS,
    ...COMMERCIAL_CAPABILITY_KEYS,
    ...FISCALITY_CAPABILITY_KEYS,
    ...APP_ROUTE_CAPABILITY_KEYS,
] as const;

export type CapabilityKey = (typeof ALL_CAPABILITY_KEYS)[number];
export type CapabilityMap = Readonly<Record<CapabilityKey, boolean>>;

const CAPABILITY_KEY_SET: ReadonlySet<string> = new Set(ALL_CAPABILITY_KEYS);

export function isCapabilityKey(value: string): value is CapabilityKey {
    return CAPABILITY_KEY_SET.has(value);
}
