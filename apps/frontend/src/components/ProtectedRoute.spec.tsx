import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCapabilities } from '../hooks/useCapabilities';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { useAuthStore } from '../stores/auth.store';
import { ProtectedRoute } from './ProtectedRoute';

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));

vi.mock('../hooks/useCapabilities', () => ({ useCapabilities: vi.fn() }));
vi.mock('../hooks/useSystemStatus', () => ({ useSystemStatus: vi.fn() }));
vi.mock('../stores/auth.store', () => ({ useAuthStore: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: toastError } }));
vi.mock('./SystemBlockedScreen', () => ({ SystemBlockedScreen: () => <p>Sistema bloqueado</p> }));

describe('ProtectedRoute capability gate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuthStore).mockReturnValue(true);
        vi.mocked(useSystemStatus).mockReturnValue({
            isEnabled: true,
            message: '',
            isLoading: false,
            isError: false,
        });
    });

    it('Given an enabled route When navigated directly Then renders the page', () => {
        vi.mocked(useCapabilities).mockReturnValue({
            data: {
                profileKey: 'legacy',
                profileVersion: 1,
                capabilitiesSchemaVersion: 1,
                capabilities: {},
                appRoutes: { enabled: ['products'], disabled: [] },
            },
            isLoading: false,
            isError: false,
        });

        render(
            <MemoryRouter initialEntries={['/products']}>
                <ProtectedRoute requiredCapability="products"><p>Productos</p></ProtectedRoute>
            </MemoryRouter>,
        );

        expect(screen.getByText('Productos')).toBeInTheDocument();
    });

    it('Given a disabled route When navigated directly Then redirects without partial render', async () => {
        vi.mocked(useCapabilities).mockReturnValue({
            data: {
                profileKey: 'legacy',
                profileVersion: 1,
                capabilitiesSchemaVersion: 1,
                capabilities: {},
                appRoutes: { enabled: ['dashboard'], disabled: ['products'] },
            },
            isLoading: false,
            isError: false,
        });

        render(
            <MemoryRouter initialEntries={['/products']}>
                <Routes>
                    <Route path="/products" element={<ProtectedRoute requiredCapability="products"><p>Productos</p></ProtectedRoute>} />
                    <Route path="/dashboard" element={<p>Dashboard</p>} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.queryByText('Productos')).not.toBeInTheDocument();
        expect(await screen.findByText('Dashboard')).toBeInTheDocument();
        await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    });
});
