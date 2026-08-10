/**
 * Tests del ActivationWizardPage.
 * Cubre:
 *  - El click en "Continuar" en el paso 1 avanza al paso 2.
 *  - Cargar ubicaciones y avanzar: las radios se llenan y bloquean "Continuar"
 *    hasta seleccionar.
 *  - El paso final dispara la mutación de activación.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivationWizardPage } from '../pages/ActivationWizardPage';

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const real = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return { ...real, useNavigate: () => mockNavigate };
});

vi.mock('@/lib/axios', () => ({
    api: { post: vi.fn() },
}));

import { api } from '@/lib/axios';

function createWrapper() {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    };
}

describe('ActivationWizardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('arranca en el paso 1 (explicación) y avanza al paso 2', async () => {
        const user = userEvent.setup();
        render(<ActivationWizardPage />, { wrapper: createWrapper() });

        expect(await screen.findByText(/qué cambia al activar el modo sectorizado/i)).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: /continuar/i }));

        await waitFor(() => {
            expect(screen.getByText(/cargá las ubicaciones iniciales/i)).toBeInTheDocument();
        });
    });

    it('el paso 2 bloquea "Continuar" si no hay ubicaciones cargadas', async () => {
        const user = userEvent.setup();
        render(<ActivationWizardPage />, { wrapper: createWrapper() });

        // Avanzar al paso 2.
        await user.click(await screen.findByRole('button', { name: /continuar/i }));

        // "Continuar" debería estar deshabilitado porque no hay filas.
        const continues = screen.getAllByRole('button', { name: /continuar/i });
        // El primer "Continuar" del paso 2 es el del form.
        const step2Continue = continues[0];
        expect(step2Continue).toBeDisabled();
    });

    it('el paso 2 permite cargar una ubicación, avanzar y ver los radios en el paso 3', async () => {
        const user = userEvent.setup();
        render(<ActivationWizardPage />, { wrapper: createWrapper() });

        // Paso 1 → 2
        await user.click(await screen.findByRole('button', { name: /continuar/i }));

        // Paso 2: agregar una fila.
        await user.click(screen.getByRole('button', { name: /agregar ubicación/i }));
        const nameInput = await screen.findByLabelText(/nombre/i, { selector: 'input' });
        await user.type(nameInput, 'Salón');

        // Avanzar al paso 3.
        const formContinue = screen.getAllByRole('button', { name: /continuar/i })[0];
        await user.click(formContinue);

        // Paso 3: radio con "Salón".
        await waitFor(() => {
            expect(screen.getByText('Salón')).toBeInTheDocument();
        });
        // "Continuar" debería estar deshabilitado hasta seleccionar.
        const step3Continue = screen.getAllByRole('button', { name: /continuar/i })[0];
        expect(step3Continue).toBeDisabled();
    });

    it('el submit final llama a POST /api/inventory/activate', async () => {
        const user = userEvent.setup();
        (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            data: { ok: true, products: 3, locations: 2 },
        });
        render(<ActivationWizardPage />, { wrapper: createWrapper() });

        // Paso 1 → 2
        await user.click(await screen.findByRole('button', { name: /continuar/i }));

        // Paso 2: agregar dos ubicaciones.
        await user.click(screen.getByRole('button', { name: /agregar ubicación/i }));
        let inputs = screen.getAllByLabelText(/nombre/i, { selector: 'input' });
        await user.type(inputs[0], 'Salón');
        await user.click(screen.getByRole('button', { name: /agregar ubicación/i }));
        inputs = screen.getAllByLabelText(/nombre/i, { selector: 'input' });
        await user.type(inputs[1], 'Depósito');
        const formContinue = screen.getAllByRole('button', { name: /continuar/i })[0];
        await user.click(formContinue);

        // Paso 3: primaria → Salón
        const step3Radios = await screen.findByRole('radiogroup');
        await user.click(within(step3Radios).getByLabelText('Salón'));
        await user.click(screen.getAllByRole('button', { name: /continuar/i })[0]);

        // Paso 4: destino → Salón
        const step4Radios = await screen.findByRole('radiogroup');
        await user.click(within(step4Radios).getByLabelText('Salón'));
        await user.click(screen.getAllByRole('button', { name: /continuar/i })[0]);

        // Paso 5: stock inicial → Salón
        const step5Radios = await screen.findByRole('radiogroup');
        await user.click(within(step5Radios).getByLabelText('Salón'));
        await user.click(screen.getAllByRole('button', { name: /continuar/i })[0]);

        // Paso 6: confirmar.
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /activar modo sectorizado/i })).toBeInTheDocument();
        });
        await user.click(screen.getByRole('button', { name: /activar modo sectorizado/i }));

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith(
                '/api/inventory/activate',
                expect.objectContaining({
                    locations: expect.arrayContaining([
                        expect.objectContaining({ name: 'Salón', isPrimarySale: true, isDefaultReceive: true }),
                        expect.objectContaining({ name: 'Depósito' }),
                    ]),
                    initialStockLocationName: 'Salón',
                }),
            );
        });
    });
});
