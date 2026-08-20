import { APP_ROUTE_CAPABILITY_KEYS, type CapabilityMap } from './keys';

const APP_ROUTE_PATHS = {
    'APP_ROUTES.dashboard': ['dashboard'],
    'APP_ROUTES.products': ['products'],
    'APP_ROUTES.customers': ['customers'],
    'APP_ROUTES.suppliers': ['suppliers'],
    'APP_ROUTES.purchases': ['purchases'],
    'APP_ROUTES.sales': ['sales'],
    'APP_ROUTES.expenses': ['expenses'],
    'APP_ROUTES.incomes': ['incomes'],
    'APP_ROUTES.cash_register': ['cash-register'],
    'APP_ROUTES.customer_accounts': ['customer-accounts', 'customer-accounts/:customerId'],
    'APP_ROUTES.reports': ['reports'],
    'APP_ROUTES.settings': ['settings'],
    'APP_ROUTES.settings_fiscal': ['settings/fiscal'],
    'APP_ROUTES.settings_users': ['settings/users'],
    'APP_ROUTES.settings_backup': ['settings/backup'],
    'APP_ROUTES.inventory_locations': ['inventory/locations'],
    'APP_ROUTES.inventory_locations_activate': ['inventory/locations/activate'],
    'APP_ROUTES.inventory_replenishment': ['inventory/replenishment'],
} as const satisfies Readonly<Record<(typeof APP_ROUTE_CAPABILITY_KEYS)[number], readonly string[]>>;

export type AppRouteManifest = Readonly<{
    enabled: readonly string[];
    disabled: readonly string[];
}>;

export function getAppRouteManifest(capabilities: CapabilityMap): AppRouteManifest {
    const enabled: string[] = [];
    const disabled: string[] = [];

    for (const key of APP_ROUTE_CAPABILITY_KEYS) {
        const target = capabilities[key] ? enabled : disabled;
        target.push(...APP_ROUTE_PATHS[key]);
    }

    return { enabled, disabled };
}
