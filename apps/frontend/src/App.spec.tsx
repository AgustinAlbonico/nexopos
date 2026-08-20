import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

const protectedPaths = [
    'dashboard',
    'products',
    'customers',
    'suppliers',
    'purchases',
    'sales',
    'expenses',
    'incomes',
    'cash-register',
    'customer-accounts',
    'customer-accounts/:customerId',
    'reports',
    'settings',
    'settings/fiscal',
    'settings/users',
    'settings/backup',
    'inventory/locations',
    'inventory/locations/activate',
    'inventory/replenishment',
];

describe('App route capability contract', () => {
    it('Given S1 routing When source is inspected Then retains 19 protected paths plus index and login', () => {
        expect(protectedPaths).toHaveLength(19);
        for (const path of protectedPaths) {
            expect(source).toContain(`path="${path}"`);
            expect(source).toContain(`requiredCapability="${path === 'customer-accounts/:customerId' ? 'customer-accounts' : path}"`);
        }
        expect(source).toContain('requiredCapability="dashboard"><Navigate to="/dashboard" replace />');
        expect(source).toContain('path="/login"');
    });
});
