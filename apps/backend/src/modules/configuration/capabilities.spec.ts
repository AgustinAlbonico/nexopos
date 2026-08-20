import { ALL_CAPABILITY_KEYS, APP_ROUTE_CAPABILITY_KEYS, type CapabilityKey } from './capabilities/keys';
import {
    CAPABILITY_PROFILE_KEYS,
    CURRENT_CAPABILITIES_SCHEMA_VERSION,
    type CapabilityProfileKey,
} from './capabilities/presets';
import { resolveCapabilities } from './capabilities/resolve';

describe('capability resolver', () => {
    it('Given every planned profile key When resolving Then it returns the complete capability map', () => {
        for (const profileKey of CAPABILITY_PROFILE_KEYS) {
            const result = resolveCapabilities(profileKey, {}, CURRENT_CAPABILITIES_SCHEMA_VERSION);

            expect(result.ok).toBe(true);
            if (!result.ok) {
                throw new Error(result.errors.join('\n'));
            }
            expect(CAPABILITY_PROFILE_KEYS).toContain(profileKey);
            expect(Object.keys(result.capabilities)).toEqual([...ALL_CAPABILITY_KEYS]);
        }
    });

    it('Given simple-retail profile When resolving Then default speed tooling and app routes are enabled', () => {
        const result = resolveCapabilities('simple-retail', {}, CURRENT_CAPABILITIES_SCHEMA_VERSION);

        expect(result.ok).toBe(true);
        if (!result.ok) {
            throw new Error(result.errors.join('\n'));
        }
        expect(APP_ROUTE_CAPABILITY_KEYS).toHaveLength(18);
        const defaultDisabledRoutes = new Set([
            'APP_ROUTES.inventory_locations',
            'APP_ROUTES.inventory_locations_activate',
            'APP_ROUTES.inventory_replenishment',
        ]);
        for (const routeKey of APP_ROUTE_CAPABILITY_KEYS) {
            if (defaultDisabledRoutes.has(routeKey)) {
                expect(result.capabilities[routeKey]).toBe(false);
            } else {
                expect(result.capabilities[routeKey]).toBe(true);
            }
        }
        expect(result.capabilities['TOOLING.product_labels']).toBe(true);
        expect(result.capabilities['TOOLING.blind_cash_closing']).toBe(true);
        expect(result.capabilities['TOOLING.park_sales']).toBe(true);
        expect(result.capabilities['TOOLING.quick_cash_pay']).toBe(true);
        expect(result.capabilities['STRUCTURAL.decimal_quantities']).toBe(false);
        expect(result.capabilities['STRUCTURAL.weight_scale']).toBe(false);
    });

    it('Given obvious vertical presets When resolving Then only their obvious structural capabilities are enabled', () => {
        const expectedEnabled = {
            'simple-retail': ['TOOLING.product_labels', 'TOOLING.blind_cash_closing', 'TOOLING.park_sales', 'TOOLING.quick_cash_pay'],
            hardware: ['STRUCTURAL.decimal_quantities', 'STRUCTURAL.unit_pack', 'STRUCTURAL.sellable_pack', 'STRUCTURAL.acopio_management', 'TOOLING.catalog_import', 'TOOLING.product_labels', 'TOOLING.park_sales'],
            apparel: ['STRUCTURAL.decimal_quantities', 'STRUCTURAL.variants', 'TOOLING.product_labels', 'TOOLING.park_sales'],
            weight: ['STRUCTURAL.decimal_quantities', 'STRUCTURAL.weight_scale', 'TOOLING.product_labels', 'TOOLING.park_sales', 'TOOLING.quick_cash_pay'],
            'expiry-tracking': ['STRUCTURAL.lot_expiry', 'TOOLING.product_labels', 'TOOLING.park_sales'],
            electronics: ['STRUCTURAL.serial_warranty', 'STRUCTURAL.lazy_serial_scan', 'TOOLING.product_labels', 'TOOLING.park_sales'],
            wholesale: ['STRUCTURAL.decimal_quantities', 'STRUCTURAL.wholesale_price_lists', 'STRUCTURAL.unit_pack', 'STRUCTURAL.sellable_pack', 'TOOLING.catalog_import', 'TOOLING.product_labels', 'COMMERCIAL.quantity_breaks', 'COMMERCIAL.customer_credit_limit', 'COMMERCIAL.volume_discount_rules'],
        } as const satisfies Record<CapabilityProfileKey, readonly CapabilityKey[]>;

        for (const [profileKey, enabledKeys] of Object.entries(expectedEnabled)) {
            const result = resolveCapabilities(profileKey, {}, CURRENT_CAPABILITIES_SCHEMA_VERSION);

            expect(result.ok).toBe(true);
            if (!result.ok) {
                throw new Error(result.errors.join('\n'));
            }
            const enabledNonRouteKeys = ALL_CAPABILITY_KEYS.filter(
                (key) => !key.startsWith('APP_ROUTES.') && result.capabilities[key],
            );
            expect(enabledNonRouteKeys.sort()).toEqual([...enabledKeys].sort());
        }
    });

    it('Given unknown profile, schema mismatch, unknown key, and non-boolean override When resolving Then errors are stable', () => {
        const result = resolveCapabilities(
            'does-not-exist',
            {
                'APP_ROUTES.dashboard': 'yes',
                'UNKNOWN.capability': true,
            },
            CURRENT_CAPABILITIES_SCHEMA_VERSION + 1,
        );

        expect(result).toEqual({
            ok: false,
            errors: [
                'capabilitiesSchemaVersion must be 1',
                'profileKey must be a known capability profile',
                'capabilities.APP_ROUTES.dashboard must be boolean',
                'capabilities.UNKNOWN.capability is not a known capability key',
            ],
        });
    });

    it('Given overrides When resolving Then override values win and output remains deterministic', () => {
        const first = resolveCapabilities(
            'simple-retail',
            {
                'APP_ROUTES.sales': false,
                'STRUCTURAL.weight_scale': true,
            },
            CURRENT_CAPABILITIES_SCHEMA_VERSION,
        );
        const second = resolveCapabilities(
            'simple-retail',
            {
                'STRUCTURAL.weight_scale': true,
                'APP_ROUTES.sales': false,
            },
            CURRENT_CAPABILITIES_SCHEMA_VERSION,
        );

        expect(first).toEqual(second);
        expect(first.ok).toBe(true);
        if (!first.ok) {
            throw new Error(first.errors.join('\n'));
        }
        expect(first.capabilities['APP_ROUTES.sales']).toBe(false);
        expect(first.capabilities['STRUCTURAL.weight_scale']).toBe(true);
        expect(Object.keys(first.capabilities)).toEqual([...ALL_CAPABILITY_KEYS]);
    });
});
