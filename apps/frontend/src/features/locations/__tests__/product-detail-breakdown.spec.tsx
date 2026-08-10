/**
 * Tests del StockByLocationSection (PR9).
 * Cubre:
 *  - Modo simple: no renderiza nada.
 *  - Modo sectorizado: renderiza la lista de ubicaciones con su saldo.
 *  - Estado de carga: muestra spinner.
 *  - Lista vacía: no muestra nada.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StockByLocationSection } from '../components/StockByLocationSection';
import type { ProductStockByLocationRowDTO, SystemConfiguration } from '../types';

const mockUseSystemConfig = vi.fn();
const mockUseProductStockByLocation = vi.fn();

vi.mock('../hooks/useLocations', () => ({
    useSystemConfig: () => mockUseSystemConfig(),
    useProductStockByLocation: (...args: unknown[]) => mockUseProductStockByLocation(...args),
}));

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
};

const rows: ProductStockByLocationRowDTO[] = [
    { locationId: 'l1', locationName: 'Salón', function: 'SALE', quantity: 2 },
    { locationId: 'l2', locationName: 'Depósito', function: 'STORAGE', quantity: 48 },
];

function createWrapper() {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    };
}

describe('StockByLocationSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('no renderiza nada en modo simple', () => {
        mockUseSystemConfig.mockReturnValue({ data: sysConfigSimple });
        mockUseProductStockByLocation.mockReturnValue({ data: rows, isLoading: false });
        const { container } = render(<StockByLocationSection productId="p-1" />, {
            wrapper: createWrapper(),
        });
        expect(container).toBeEmptyDOMElement();
    });

    it('renderiza la lista de ubicaciones con su saldo en modo sectorizado', async () => {
        mockUseSystemConfig.mockReturnValue({ data: sysConfigSectorized });
        mockUseProductStockByLocation.mockReturnValue({ data: rows, isLoading: false });

        render(<StockByLocationSection productId="p-1" />, { wrapper: createWrapper() });

        const section = await screen.findByTestId('stock-by-location-section');
        expect(section).toBeInTheDocument();
        expect(screen.getByTestId('stock-by-location-row-Salón')).toBeInTheDocument();
        expect(screen.getByTestId('stock-by-location-row-Depósito')).toBeInTheDocument();
        // El depósito muestra su cantidad (48) — el total se ve en la lista.
        expect(screen.getByText('48')).toBeInTheDocument();
    });

    it('muestra spinner mientras carga', () => {
        mockUseSystemConfig.mockReturnValue({ data: sysConfigSectorized });
        mockUseProductStockByLocation.mockReturnValue({ data: undefined, isLoading: true });

        const { container } = render(<StockByLocationSection productId="p-1" />, {
            wrapper: createWrapper(),
        });
        expect(container.textContent).toMatch(/cargando/i);
    });

    it('no llama a la query si el modo sectorizado está apagado', () => {
        mockUseSystemConfig.mockReturnValue({ data: sysConfigSimple });
        mockUseProductStockByLocation.mockReturnValue({ data: [], isLoading: false });

        render(<StockByLocationSection productId="p-1" />, { wrapper: createWrapper() });
        // El hook se llama con enabled=false → queryFn no se dispara.
        expect(mockUseProductStockByLocation).toHaveBeenCalledWith('p-1', false);
    });
});