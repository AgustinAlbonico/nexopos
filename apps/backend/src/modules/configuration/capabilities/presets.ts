import { type CapabilityMap } from './keys';

export const CURRENT_CAPABILITIES_SCHEMA_VERSION = 1;

export const CAPABILITY_PROFILE_KEYS = [
    'simple-retail',
    'hardware',
    'apparel',
    'weight',
    'expiry-tracking',
    'electronics',
    'wholesale',
] as const;

export type CapabilityProfileKey = (typeof CAPABILITY_PROFILE_KEYS)[number];

export const BUSINESS_TYPES_MAP: Readonly<Record<string, { label: string; profileKey: CapabilityProfileKey; category: string }>> = {
    kiosco: { label: 'Kiosco / Drugstore', profileKey: 'simple-retail', category: 'Venta Simple' },
    libreria: { label: 'Librería / Papelería', profileKey: 'simple-retail', category: 'Venta Simple' },
    jugueteria: { label: 'Juguetería', profileKey: 'simple-retail', category: 'Venta Simple' },
    bazar: { label: 'Bazar / Regalería', profileKey: 'simple-retail', category: 'Venta Simple' },
    cotillon: { label: 'Cotillón', profileKey: 'simple-retail', category: 'Venta Simple' },

    ferreteria: { label: 'Ferretería', profileKey: 'hardware', category: 'Ferretería y Medidas' },
    pintureria: { label: 'Pinturería', profileKey: 'hardware', category: 'Ferretería y Medidas' },

    indumentaria: { label: 'Indumentaria / Ropa', profileKey: 'apparel', category: 'Variantes' },
    calzado: { label: 'Calzado / Zapatillería', profileKey: 'apparel', category: 'Variantes' },
    merceria: { label: 'Mercería / Telas', profileKey: 'apparel', category: 'Variantes' },

    dietetica: { label: 'Dietética / Prod. Naturales', profileKey: 'weight', category: 'Venta por Peso' },
    fiambreria: { label: 'Fiambrería / Rotisería', profileKey: 'weight', category: 'Venta por Peso' },
    verduleria: { label: 'Verdulería / Frutería', profileKey: 'weight', category: 'Venta por Peso' },
    granel: { label: 'Granel (Especias/Legumbres)', profileKey: 'weight', category: 'Venta por Peso' },

    perfumeria: { label: 'Perfumería / Cosmética', profileKey: 'expiry-tracking', category: 'Vencimientos' },
    veterinaria: { label: 'Veterinaria', profileKey: 'expiry-tracking', category: 'Vencimientos' },

    electronica: { label: 'Electrónica / Computación', profileKey: 'electronics', category: 'Garantía y Seriales' },
    electrodomesticos: { label: 'Electrodomésticos', profileKey: 'electronics', category: 'Garantía y Seriales' },
    celulares: { label: 'Celulares y Accesorios', profileKey: 'electronics', category: 'Garantía y Seriales' },

    mayorista: { label: 'Mayorista Genérico', profileKey: 'wholesale', category: 'Mayorista' },
};

export const BASE_CAPABILITIES = {
    'POLICY.manual_discount_reason': false,
    'POLICY.price_override_reason': false,
    'POLICY.whole_sale_only_cancellation': false,
    'STRUCTURAL.decimal_quantities': false,
    'STRUCTURAL.weight_scale': false,
    'STRUCTURAL.variants': false,
    'STRUCTURAL.lot_expiry': false,
    'STRUCTURAL.serial_warranty': false,
    'STRUCTURAL.consignment': false,
    'STRUCTURAL.wholesale_price_lists': false,
    'STRUCTURAL.unit_pack': false,
    'STRUCTURAL.sellable_pack': false,
    'STRUCTURAL.bundle': false,
    'STRUCTURAL.acopio_management': false,
    'STRUCTURAL.lazy_serial_scan': false,
    'TOOLING.catalog_import': false,
    'TOOLING.product_labels': false,
    'TOOLING.stocktake': false,
    'TOOLING.inventory_audit': false,
    'TOOLING.restore_safety': false,
    'TOOLING.updater_recovery': false,
    'TOOLING.peripheral_diagnostics': false,
    'TOOLING.blind_cash_closing': false,
    'TOOLING.park_sales': false,
    'TOOLING.quick_cash_pay': false,
    'COMMERCIAL.quantity_breaks': false,
    'COMMERCIAL.time_bound_promotion': false,
    'COMMERCIAL.coupon': false,
    'COMMERCIAL.loyalty': false,
    'COMMERCIAL.store_credit': false,
    'COMMERCIAL.customer_credit_limit': false,
    'COMMERCIAL.volume_discount_rules': false,
    'FISCALITY.credit_notes_a': false,
    'FISCALITY.credit_notes_b': false,
    'FISCALITY.credit_notes_c': false,
    'APP_ROUTES.dashboard': false,
    'APP_ROUTES.products': false,
    'APP_ROUTES.customers': false,
    'APP_ROUTES.suppliers': false,
    'APP_ROUTES.purchases': false,
    'APP_ROUTES.sales': false,
    'APP_ROUTES.expenses': false,
    'APP_ROUTES.incomes': false,
    'APP_ROUTES.cash_register': false,
    'APP_ROUTES.customer_accounts': false,
    'APP_ROUTES.reports': false,
    'APP_ROUTES.settings': false,
    'APP_ROUTES.settings_fiscal': false,
    'APP_ROUTES.settings_users': false,
    'APP_ROUTES.settings_backup': false,
    'APP_ROUTES.inventory_locations': false,
    'APP_ROUTES.inventory_locations_activate': false,
    'APP_ROUTES.inventory_replenishment': false,
} as const satisfies CapabilityMap;

const ALL_APP_ROUTES_ON = {
    'APP_ROUTES.dashboard': true,
    'APP_ROUTES.products': true,
    'APP_ROUTES.customers': true,
    'APP_ROUTES.suppliers': true,
    'APP_ROUTES.purchases': true,
    'APP_ROUTES.sales': true,
    'APP_ROUTES.expenses': true,
    'APP_ROUTES.incomes': true,
    'APP_ROUTES.cash_register': true,
    'APP_ROUTES.customer_accounts': true,
    'APP_ROUTES.reports': true,
    'APP_ROUTES.settings': true,
    'APP_ROUTES.settings_fiscal': true,
    'APP_ROUTES.settings_users': true,
    'APP_ROUTES.settings_backup': true,
    'APP_ROUTES.inventory_locations': false,
    'APP_ROUTES.inventory_locations_activate': false,
    'APP_ROUTES.inventory_replenishment': false,
} as const;

export const CAPABILITY_PRESETS = {
    'simple-retail': {
        ...BASE_CAPABILITIES,
        ...ALL_APP_ROUTES_ON,
        'TOOLING.product_labels': true,
        'TOOLING.blind_cash_closing': true,
        'TOOLING.park_sales': true,
        'TOOLING.quick_cash_pay': true,
    },
    hardware: {
        ...BASE_CAPABILITIES,
        ...ALL_APP_ROUTES_ON,
        'STRUCTURAL.decimal_quantities': true,
        'STRUCTURAL.unit_pack': true,
        'STRUCTURAL.sellable_pack': true,
        'STRUCTURAL.acopio_management': true,
        'TOOLING.catalog_import': true,
        'TOOLING.product_labels': true,
        'TOOLING.park_sales': true,
    },
    apparel: {
        ...BASE_CAPABILITIES,
        ...ALL_APP_ROUTES_ON,
        'STRUCTURAL.variants': true,
        'STRUCTURAL.decimal_quantities': true,
        'TOOLING.product_labels': true,
        'TOOLING.park_sales': true,
    },
    weight: {
        ...BASE_CAPABILITIES,
        ...ALL_APP_ROUTES_ON,
        'STRUCTURAL.decimal_quantities': true,
        'STRUCTURAL.weight_scale': true,
        'TOOLING.product_labels': true,
        'TOOLING.quick_cash_pay': true,
        'TOOLING.park_sales': true,
    },
    'expiry-tracking': {
        ...BASE_CAPABILITIES,
        ...ALL_APP_ROUTES_ON,
        'STRUCTURAL.lot_expiry': true,
        'TOOLING.product_labels': true,
        'TOOLING.park_sales': true,
    },
    electronics: {
        ...BASE_CAPABILITIES,
        ...ALL_APP_ROUTES_ON,
        'STRUCTURAL.serial_warranty': true,
        'STRUCTURAL.lazy_serial_scan': true,
        'TOOLING.product_labels': true,
        'TOOLING.park_sales': true,
    },
    wholesale: {
        ...BASE_CAPABILITIES,
        ...ALL_APP_ROUTES_ON,
        'STRUCTURAL.decimal_quantities': true,
        'STRUCTURAL.wholesale_price_lists': true,
        'STRUCTURAL.unit_pack': true,
        'STRUCTURAL.sellable_pack': true,
        'COMMERCIAL.quantity_breaks': true,
        'COMMERCIAL.volume_discount_rules': true,
        'COMMERCIAL.customer_credit_limit': true,
        'TOOLING.catalog_import': true,
        'TOOLING.product_labels': true,
    },
} as const satisfies Readonly<Record<CapabilityProfileKey, CapabilityMap>>;

const CAPABILITY_PROFILE_KEY_SET: ReadonlySet<string> = new Set(CAPABILITY_PROFILE_KEYS);

export function isCapabilityProfileKey(value: string): value is CapabilityProfileKey {
    return CAPABILITY_PROFILE_KEY_SET.has(value);
}
