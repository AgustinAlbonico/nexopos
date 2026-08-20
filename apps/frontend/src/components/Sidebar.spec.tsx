import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCapabilities } from '@/hooks/useCapabilities';
import { Sidebar } from './Sidebar';

vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: vi.fn() }));
vi.mock('@/features/products/hooks/useLowStock', () => ({
    useLowStockCount: () => ({ count: 0 }),
}));

const allRoutes = [
    'dashboard', 'sales', 'cash-register', 'customer-accounts', 'incomes', 'purchases',
    'expenses', 'products', 'customers', 'suppliers', 'reports', 'inventory/locations',
    'inventory/replenishment', 'settings',
];

describe('Sidebar capability visibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Given legacy routes When rendered Then preserves all 14 navigation items', () => {
        vi.mocked(useCapabilities).mockReturnValue({
            data: {
                profileKey: 'legacy',
                profileVersion: 1,
                capabilitiesSchemaVersion: 1,
                capabilities: {},
                appRoutes: { enabled: allRoutes, disabled: [] },
            },
            isLoading: false,
            isError: false,
        });

        render(
            <MemoryRouter>
                <Sidebar user={{ firstName: 'Ada', lastName: 'Lovelace', username: 'ada' }} onLogout={vi.fn()} />
            </MemoryRouter>,
        );

        expect(screen.getAllByRole('link')).toHaveLength(15);
        expect(screen.getByText('Ubicaciones')).toBeInTheDocument();
        expect(screen.getByText('Reposición')).toBeInTheDocument();
    });

    it('Given a reduced route manifest When rendered Then hides only disabled navigation items', () => {
        vi.mocked(useCapabilities).mockReturnValue({
            data: {
                profileKey: 'legacy',
                profileVersion: 1,
                capabilitiesSchemaVersion: 1,
                capabilities: {},
                appRoutes: { enabled: ['dashboard', 'sales', 'settings'], disabled: ['inventory/replenishment'] },
            },
            isLoading: false,
            isError: false,
        });

        render(
            <MemoryRouter>
                <Sidebar user={{ firstName: 'Ada', lastName: 'Lovelace', username: 'ada' }} onLogout={vi.fn()} />
            </MemoryRouter>,
        );

        expect(screen.getByText('Inicio')).toBeInTheDocument();
        expect(screen.getByText('Ventas')).toBeInTheDocument();
        expect(screen.queryByText('Reposición')).not.toBeInTheDocument();
    });
});
