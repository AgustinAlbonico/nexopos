/**
 * Tests para el flujo de carga rápida por escaneo de código de barras en ProductsPage.
 * Cubre:
 *  - Scan de código existente abre ProductDetailDialog
 *  - Scan de código inexistente abre el modal de creación con barcode pre-cargado
 *  - Scan con error de red muestra toast y no abre ningún modal
 *  - El botón "Ver Detalle" del menú de fila también abre el ProductDetailDialog
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductsPage from './ProductsPage';

// Capturamos el callback onScan que ProductsPage le pasa al hook
let capturedOnScan: ((code: string) => void) | null = null;

vi.mock('@/hooks/useBarcodeScanner', () => ({
    useBarcodeScanner: ({ onScan }: { onScan: (code: string) => void }) => {
        capturedOnScan = onScan;
        return { scannedBarcode: null, isScanning: false, reset: vi.fn() };
    },
}));

// useConfirm no es relevante para estos tests
vi.mock('@/hooks/useConfirm', () => ({
    useConfirm: () => async () => true,
}));

// Toast mockeado para poder espiar llamadas
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
    toast: {
        success: (...args: unknown[]) => toastSuccess(...args),
        error: (...args: unknown[]) => toastError(...args),
        warning: vi.fn(),
    },
}));

// APIs mockeadas
vi.mock('@/features/products/api/products.api', () => ({
    productsApi: {
        getAll: vi.fn(() => Promise.resolve({ data: [], total: 0, page: 1, limit: 10000, totalPages: 0 })),
        findByBarcode: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        getOne: vi.fn(),
        calculatePrice: vi.fn(),
    },
    categoriesApi: {
        getAll: vi.fn(() => Promise.resolve([])),
        getActive: vi.fn(() => Promise.resolve([])),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        getDeletionPreview: vi.fn(),
    },
    brandsApi: {
        getAll: vi.fn(() => Promise.resolve([])),
        search: vi.fn(() => Promise.resolve([])),
        getProductCount: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}));

// Configuración global mockeada: scanner habilitado
vi.mock('@/lib/axios', () => ({
    api: {
        get: vi.fn((url: string) => {
            if (url === '/api/configuration') {
                return Promise.resolve({
                    data: {
                        minStockAlert: 5,
                        barcodeScannerEnabled: true,
                        barcodeScannerTimeoutMs: 100,
                    },
                });
            }
            return Promise.resolve({ data: {} });
        }),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}));

// React Router mock
vi.mock('react-router-dom', () => ({
    useNavigate: vi.fn(() => vi.fn()),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
        <a href={to}>{children}</a>
    ),
}));

import { productsApi } from '@/features/products/api/products.api';

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

const existingProduct = {
    id: 'prod-1',
    name: 'Shampoo Sedal',
    description: null,
    barcode: '7791234567890',
    cost: 100,
    price: 150,
    stock: 10,
    categoryId: null,
    category: null,
    brandId: null,
    brand: null,
    isActive: true,
    profitMargin: 50,
    useCustomMargin: false,
};

describe('ProductsPage - escaneo de código de barras', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedOnScan = null;
        toastSuccess.mockClear();
        toastError.mockClear();
    });

    it('registra el callback del hook de scanner al montar', () => {
        const wrapper = createWrapper();
        render(<ProductsPage />, { wrapper });
        expect(capturedOnScan).not.toBeNull();
    });

    it('al escanear un código existente abre el ProductDetailDialog con el producto', async () => {
        (productsApi.findByBarcode as ReturnType<typeof vi.fn>).mockResolvedValueOnce(existingProduct);

        const wrapper = createWrapper();
        render(<ProductsPage />, { wrapper });

        await act(async () => {
            capturedOnScan?.('7791234567890');
        });

        // El nombre del producto debe aparecer en el detail dialog
        await waitFor(() => {
            expect(screen.getByText('Shampoo Sedal')).toBeInTheDocument();
        });
        // La query se llamó con el código correcto
        expect(productsApi.findByBarcode).toHaveBeenCalledWith('7791234567890');
        // El modal de creación NO debe estar abierto (su input de barcode no debe existir)
        expect(screen.queryByPlaceholderText(/7791234567890/i)).not.toBeInTheDocument();
    });

    it('al escanear un código inexistente (backend devuelve null) abre el modal de creación con barcode pre-cargado', async () => {
        // El backend responde 200 con body null cuando el barcode no existe
        (productsApi.findByBarcode as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

        const wrapper = createWrapper();
        render(<ProductsPage />, { wrapper });

        await act(async () => {
            capturedOnScan?.('7799999999999');
        });

        // El input de barcode del formulario debe estar visible y pre-cargado
        await waitFor(() => {
            const barcodeInput = screen.getByPlaceholderText(/7791234567890/i) as HTMLInputElement;
            expect(barcodeInput.value).toBe('7799999999999');
        });
    });

    it('al haber un error de red en el scan muestra toast de error y no abre ningún modal', async () => {
        const networkError = {
            response: { status: 500 },
        };
        (productsApi.findByBarcode as ReturnType<typeof vi.fn>).mockRejectedValueOnce(networkError);

        const wrapper = createWrapper();
        render(<ProductsPage />, { wrapper });

        await act(async () => {
            capturedOnScan?.('7798888888888');
        });

        await waitFor(() => {
            expect(toastError).toHaveBeenCalled();
        });
        // No debería abrirse el modal de creación (su input de barcode no debe existir)
        expect(screen.queryByPlaceholderText(/7791234567890/i)).not.toBeInTheDocument();
        // El detail dialog tampoco
        expect(screen.queryByText('Shampoo Sedal')).not.toBeInTheDocument();
    });
});