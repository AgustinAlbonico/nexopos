import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCapabilities } from '@/hooks/useCapabilities';
import { api } from '@/lib/axios';
import { CapabilitiesTab } from './CapabilitiesTab';

vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: vi.fn() }));
vi.mock('@/lib/axios', () => ({ api: { patch: vi.fn(), post: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

describe('CapabilitiesTab', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useCapabilities).mockReturnValue({
            data: {
                profileKey: 'simple-retail',
                profileVersion: 1,
                capabilitiesSchemaVersion: 1,
                capabilities: {
                    'APP_ROUTES.dashboard': true,
                    'TOOLING.catalog_import': false,
                },
                appRoutes: { enabled: ['dashboard'], disabled: [] },
                onboardingCompleted: true,
                selectedBusinessType: 'kiosco',
            },
            isLoading: false,
            isError: false,
        });
        vi.mocked(api.patch).mockResolvedValue({ data: {} });
        vi.mocked(api.post).mockResolvedValue({ data: { valid: true } });
    });

    it('Given active capabilities When rendered Then lists Spanish labels, search bar, and unlock button', () => {
        const queryClient = new QueryClient();
        const wrapper = ({ children }: PropsWithChildren) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );

        render(<CapabilitiesTab />, { wrapper });

        expect(screen.getByText('Módulo: Panel Principal (Dashboard)')).toBeInTheDocument();
        expect(screen.getByText('Importación Masiva de Catálogos (Excel/CSV)')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Buscar funcionalidad...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Desbloquear Modo Técnico/i })).toBeInTheDocument();
    });

    it('Given locked mode When Cambiar Rubro clicked Then prompts for technician key modal', async () => {
        const queryClient = new QueryClient();
        const wrapper = ({ children }: PropsWithChildren) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
        render(<CapabilitiesTab />, { wrapper });

        fireEvent.click(screen.getByRole('button', { name: /Cambiar Rubro/i }));

        await waitFor(() => {
            expect(screen.getByText(/Modo Técnico Requerido/i)).toBeInTheDocument();
        });
    });

    it('Given unlocked technician mode When a capability toggle is changed Then persists the effective override map', async () => {
        const queryClient = new QueryClient();
        const wrapper = ({ children }: PropsWithChildren) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
        render(<CapabilitiesTab />, { wrapper });

        // Click unlock button
        fireEvent.click(screen.getByRole('button', { name: /Desbloquear Modo Técnico/i }));

        // Fill password input
        const passwordInput = screen.getByLabelText(/Clave de Desarrollador/i);
        fireEvent.change(passwordInput, { target: { value: 'admin1234' } });

        // Submit unlock modal
        fireEvent.click(screen.getByRole('button', { name: 'Desbloquear' }));

        await waitFor(() => expect(screen.getByText(/Modo Técnico Activo/i)).toBeInTheDocument());

        // Now toggle switch
        fireEvent.click(screen.getByRole('switch', { name: 'Importación Masiva de Catálogos (Excel/CSV)' }));

        await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/api/configuration/capabilities', {
            capabilities: {
                'APP_ROUTES.dashboard': true,
                'TOOLING.catalog_import': true,
            },
        }));
    });
});
