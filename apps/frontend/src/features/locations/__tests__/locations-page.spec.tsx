/**
 * Tests del componente LocationsPage.
 * Cubre:
 *  - Render de la tabla con la lista.
 *  - Apertura del dialog de creación.
 *  - Validación: name requerido bloquea el submit.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocationsPage } from '../pages/LocationsPage';
import type { Location, SystemConfiguration } from '../types';
import { LocationFunction } from '../types';

// useConfirm mock: aceptamos todo por defecto.
vi.mock('@/hooks/useConfirm', () => ({
    useConfirm: () => async () => true,
}));

// useNavigate mock (necesario por el banner).
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const real = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...real,
        useNavigate: () => mockNavigate,
    };
});

// Hooks de locations: mockeamos.
const mockUseLocations = vi.fn();
const mockUseSystemConfig = vi.fn();
const mockCreate = { mutateAsync: vi.fn(), isPending: false };
const mockUpdate = { mutateAsync: vi.fn(), isPending: false };
const mockDeactivate = { mutateAsync: vi.fn(), isPending: false };
const mockCreateHook = vi.fn();
const mockUpdateHook = vi.fn();
const mockDeactivateHook = vi.fn();

vi.mock('../hooks/useLocations', () => ({
    useLocations: () => mockUseLocations(),
    useSystemConfig: () => mockUseSystemConfig(),
    useCreateLocation: () => mockCreateHook(),
    useUpdateLocation: () => mockUpdateHook(),
    useDeactivateLocation: () => mockDeactivateHook(),
}));

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

const locSalon: Location = {
    id: 'l1',
    name: 'Salón',
    function: LocationFunction.SALE,
    isActive: true,
    isPrimarySale: true,
    isDefaultReceive: true,
    createdAt: '',
    updatedAt: '',
};
const locDeposito: Location = {
    id: 'l2',
    name: 'Depósito',
    function: LocationFunction.STORAGE,
    isActive: true,
    isPrimarySale: false,
    isDefaultReceive: false,
    createdAt: '',
    updatedAt: '',
};
const systemConfigActive: SystemConfiguration = {
    id: 'c1',
    defaultProfitMargin: 30,
    minStockAlert: 5,
    barcodeScannerEnabled: false,
    barcodeScannerTimeoutMs: 100,
    allowOutOfStockSale: false,
    stockSectorizado: true,
    primarySaleLocationId: 'l1',
    defaultReceiveLocationId: 'l1',
    stockMinimoVenta: 5,
    createdAt: '',
    updatedAt: '',
};

function createWrapper() {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    };
}

describe('LocationsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseLocations.mockReturnValue({ data: [locSalon, locDeposito], isLoading: false });
        mockUseSystemConfig.mockReturnValue({ data: systemConfigActive });
        mockCreateHook.mockReturnValue(mockCreate);
        mockUpdateHook.mockReturnValue(mockUpdate);
        mockDeactivateHook.mockReturnValue(mockDeactivate);
    });

    it('renderiza la tabla con la lista de ubicaciones', async () => {
        render(<LocationsPage />, { wrapper: createWrapper() });
        const salonRow = await screen.findByTestId('location-row-Salón');
        expect(within(salonRow).getByText('Salón')).toBeInTheDocument();
        expect(within(salonRow).getByText('Venta')).toBeInTheDocument();
        const depositoRow = screen.getByTestId('location-row-Depósito');
        // El nombre de la ubicación está en la primera celda (font-medium).
        expect(within(depositoRow).getAllByText('Depósito').length).toBeGreaterThanOrEqual(1);
    });

    it('muestra los badges de primaria y destino', async () => {
        render(<LocationsPage />, { wrapper: createWrapper() });
        const row = await screen.findByTestId('location-row-Salón');
        expect(within(row).getByText('Primaria venta')).toBeInTheDocument();
        expect(within(row).getByText('Destino compras')).toBeInTheDocument();
    });

    it('abre el dialog de creación al hacer click en "Nueva ubicación"', async () => {
        const user = userEvent.setup();
        render(<LocationsPage />, { wrapper: createWrapper() });
        await user.click(screen.getByRole('button', { name: /nueva ubicación/i }));
        // El dialog de FormDialog se monta; el input de nombre debe estar presente.
        await waitFor(() => {
            expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
        });
    });

    it('bloquea el submit del form si el nombre está vacío (validación zod)', async () => {
        const user = userEvent.setup();
        render(<LocationsPage />, { wrapper: createWrapper() });
        await user.click(screen.getByRole('button', { name: /nueva ubicación/i }));

        // Tocar el input y enviar sin completar.
        const nameInput = await screen.findByLabelText(/nombre/i);
        await user.clear(nameInput);
        // El botón "Crear" está en el dialog.
        const createBtn = screen.getByRole('button', { name: /^crear$/i });
        await user.click(createBtn);

        await waitFor(() => {
            expect(screen.getByText(/el nombre es requerido/i)).toBeInTheDocument();
        });
        expect(mockCreate.mutateAsync).not.toHaveBeenCalled();
    });

    it('envía el form cuando los datos son válidos', async () => {
        const user = userEvent.setup();
        mockCreate.mutateAsync.mockResolvedValueOnce({});
        render(<LocationsPage />, { wrapper: createWrapper() });
        await user.click(screen.getByRole('button', { name: /nueva ubicación/i }));
        const nameInput = await screen.findByLabelText(/nombre/i);
        await user.type(nameInput, 'Mostrador');
        await user.click(screen.getByRole('button', { name: /^crear$/i }));
        await waitFor(() => {
            expect(mockCreate.mutateAsync).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'Mostrador', function: LocationFunction.STORAGE }),
            );
        });
    });

    it('muestra el banner cuando el modo sectorizado está apagado', async () => {
        mockUseSystemConfig.mockReturnValue({
            data: { ...systemConfigActive, stockSectorizado: false },
        });
        render(<LocationsPage />, { wrapper: createWrapper() });
        expect(await screen.findByText(/activar stock sectorizado/i)).toBeInTheDocument();
    });

    it('NO muestra el banner cuando el modo sectorizado está activo', async () => {
        render(<LocationsPage />, { wrapper: createWrapper() });
        // Esperar un tick y luego no debería estar el banner.
        await screen.findByText('Salón');
        expect(screen.queryByText(/activar stock sectorizado/i)).not.toBeInTheDocument();
    });
});
