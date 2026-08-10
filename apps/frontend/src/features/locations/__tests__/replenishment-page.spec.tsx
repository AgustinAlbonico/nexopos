/**
 * Tests del ReplenishmentPage (PR9).
 * Cubre:
 *  - Render de la tabla con alertas de reposición en modo sectorizado.
 *  - Apertura del dialog de confirmación con valores pre-llenados.
 *  - Confirm llama al endpoint de transfers y refresca.
 *  - Selección múltiple + acción masiva "Reponer seleccionados".
 *  - Modo simple: muestra banner y tabla de purchase alerts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReplenishmentPage } from '../pages/ReplenishmentPage';
import type {
    ReplenishmentAlertDTO,
    PurchaseAlertDTO,
    Location,
    SystemConfiguration,
} from '../types';
import { LocationFunction } from '../types';

vi.mock('react-router-dom', async () => {
    const real = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return real;
});

const { MemoryRouter } = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

const mockUseSystemConfig = vi.fn();
const mockUseLocations = vi.fn();
const mockUseStockAlerts = vi.fn();
const mockTransfer = { mutateAsync: vi.fn(), isPending: false, isError: false, error: null };
const mockUseCreateTransfer = vi.fn();
const mockUseProductStockByLocation = vi.fn();

vi.mock('../hooks/useLocations', () => ({
    useSystemConfig: () => mockUseSystemConfig(),
    useLocations: () => mockUseLocations(),
    useStockAlerts: () => mockUseStockAlerts(),
    useCreateTransfer: () => mockUseCreateTransfer(),
    useProductStockByLocation: (...args: unknown[]) => mockUseProductStockByLocation(...args),
    stockAlertsQueryKey: ['inventory', 'stock-alerts'],
    locationsQueryKey: ['inventory', 'locations'],
    systemConfigQueryKey: ['configuration'],
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

const sysConfigSectorized: SystemConfiguration = {
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

const sysConfigSimple: SystemConfiguration = {
    ...sysConfigSectorized,
    stockSectorizado: false,
    primarySaleLocationId: null,
};

const repAlerts: ReplenishmentAlertDTO[] = [
    {
        productId: 'p-1',
        productName: 'Coca Cola',
        currentLocationStock: 2,
        minimum: 5,
        suggestedSourceLocationId: 'l2',
        suggestedQuantity: 3,
        reserveStock: 10,
    },
    {
        productId: 'p-2',
        productName: 'Sprite',
        currentLocationStock: 0,
        minimum: 5,
        suggestedSourceLocationId: 'l2',
        suggestedQuantity: 5,
        reserveStock: 8,
    },
];

const purAlerts: PurchaseAlertDTO[] = [
    {
        productId: 'p-x',
        productName: 'Producto X',
        currentStock: 1,
        minimum: 5,
    },
];

function createWrapper() {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <MemoryRouter>
                <QueryClientProvider client={qc}>{children}</QueryClientProvider>
            </MemoryRouter>
        );
    };
}

describe('ReplenishmentPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseSystemConfig.mockReturnValue({ data: sysConfigSectorized });
        mockUseLocations.mockReturnValue({ data: [locSalon, locDeposito] });
        mockUseStockAlerts.mockReturnValue({
            data: { purchaseAlerts: purAlerts, replenishmentAlerts: repAlerts },
            isLoading: false,
        });
        mockUseCreateTransfer.mockReturnValue(mockTransfer);
        mockUseProductStockByLocation.mockReturnValue({ data: [], isLoading: false });
    });

    it('renderiza la tabla con las alertas de reposición en modo sectorizado', async () => {
        render(<ReplenishmentPage />, { wrapper: createWrapper() });
        const row = await screen.findByTestId('replenishment-row-Coca Cola');
        expect(within(row).getByText('Coca Cola')).toBeInTheDocument();
        expect(within(row).getByText('2')).toBeInTheDocument();
        expect(within(row).getByText('10')).toBeInTheDocument();
        expect(screen.getByTestId('replenishment-row-Sprite')).toBeInTheDocument();
    });

    it('abre el dialog de confirmación con valores pre-llenados al clickear "Reponer"', async () => {
        const user = userEvent.setup();
        render(<ReplenishmentPage />, { wrapper: createWrapper() });
        const btn = await screen.findByTestId('reponer-btn-Coca Cola');
        await user.click(btn);

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText(/stock en venta/i)).toBeInTheDocument();
        const qtyInput = within(dialog).getByLabelText(/cantidad a trasladar/i);
        expect(qtyInput).toHaveValue('3');
        // El dialog muestra origen → destino.
        expect(within(dialog).getAllByText('Depósito').length).toBeGreaterThan(0);
    });

    it('confirma el dialog llama al transfer con los valores pre-llenados', async () => {
        const user = userEvent.setup();
        mockTransfer.mutateAsync.mockResolvedValueOnce({});
        render(<ReplenishmentPage />, { wrapper: createWrapper() });

        await user.click(await screen.findByTestId('reponer-btn-Coca Cola'));
        const dialog = await screen.findByRole('dialog');
        await user.click(within(dialog).getByRole('button', { name: /^reponer$/i }));

        await waitFor(() => {
            expect(mockTransfer.mutateAsync).toHaveBeenCalledWith({
                productId: 'p-1',
                fromLocationId: 'l2',
                toLocationId: 'l1',
                quantity: 3,
                reason: 'Reposición proactiva',
            });
        });
    });

    it('la acción masiva llama transfer por cada fila seleccionada y muestra errores inline', async () => {
        const user = userEvent.setup();
        // Primer call OK, segundo falla.
        mockTransfer.mutateAsync
            .mockResolvedValueOnce({ id: 't-1' })
            .mockRejectedValueOnce({
                response: { data: { message: 'Saldo insuficiente en origen' } },
            });

        render(<ReplenishmentPage />, { wrapper: createWrapper() });

        const cbCoca = await screen.findByRole('checkbox', { name: /seleccionar coca cola/i });
        const cbSprite = await screen.findByRole('checkbox', { name: /seleccionar sprite/i });
        await user.click(cbCoca);
        await user.click(cbSprite);

        const bulkBtn = await screen.findByTestId('bulk-reponer-btn');
        await user.click(bulkBtn);

        await waitFor(() => {
            expect(mockTransfer.mutateAsync).toHaveBeenCalledTimes(2);
        });
        expect(mockTransfer.mutateAsync).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({ productId: 'p-1', quantity: 3 }),
        );
        expect(mockTransfer.mutateAsync).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ productId: 'p-2', quantity: 5 }),
        );

        // El error de Sprite aparece en el bloque de errores global.
        await waitFor(() => {
            expect(screen.getByTestId('bulk-errors')).toBeInTheDocument();
        });
        const alert = screen.getByTestId('bulk-errors');
        expect(within(alert).getByText(/saldo insuficiente en origen/i)).toBeInTheDocument();
    });

    it('modo simple: muestra banner y la tabla de purchase alerts', async () => {
        mockUseSystemConfig.mockReturnValue({ data: sysConfigSimple });
        render(<ReplenishmentPage />, { wrapper: createWrapper() });

        expect(
            await screen.findByText(/el modo sectorizado está desactivado/i),
        ).toBeInTheDocument();
        expect(screen.getByTestId('purchase-row-Producto X')).toBeInTheDocument();
        expect(screen.queryByTestId('replenishment-row-Coca Cola')).not.toBeInTheDocument();
    });
});