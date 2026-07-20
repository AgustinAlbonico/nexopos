import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SaleForm } from './SaleForm';
import type { Product } from '@/features/products/types';
import type { Customer } from '@/features/customers/types';
import type { CreateSaleDTO } from '../types';
import {
    useFiscalConfigValidation,
    useMonotributistaCleanup,
    useOnAccountValidation,
    usePaymentAmountSync,
} from '../hooks/useSaleFormEffects';

const productFixture: Product = {
    id: 'product-123',
    name: 'Producto Test',
    price: 100,
    cost: 50,
    stock: 50,
    sku: 'SKU123',
    isActive: true,
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
};

const customerFixture: Customer = {
    id: 'customer-123',
    firstName: 'Juan',
    lastName: 'Pérez',
    fullName: 'Juan Pérez',
    documentNumber: '12345678',
    email: 'juan@example.com',
    phone: '1234567890',
    address: 'Calle 123',
    city: 'Ciudad',
    isActive: true,
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
};

vi.mock('@/components/common/ProductSearch', () => ({
    ProductSearch: ({ onSelect }: { readonly onSelect: (productId: string, product: Product) => void }) => (
        <button
            type="button"
            data-testid="select-product"
            onClick={() => onSelect(productFixture.id, productFixture)}
        >
            Seleccionar Producto
        </button>
    ),
}));

vi.mock('@/components/common/CustomerSearch', () => ({
    CustomerSearch: ({ onSelect }: { readonly onSelect: (customerId: string, customer: Customer) => void }) => (
        <button
            type="button"
            data-testid="select-customer"
            onClick={() => onSelect(customerFixture.id, customerFixture)}
        >
            Seleccionar Cliente
        </button>
    ),
}));

vi.mock('@tanstack/react-query', async () => {
    const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
    return {
        ...actual,
        useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            mutateAsync: vi.fn(),
            isPending: false,
        })),
        useQuery: vi.fn(() => ({
            data: [],
            isLoading: false,
            error: null,
        })),
        useQueryClient: vi.fn(() => ({
            invalidateQueries: vi.fn(),
        })),
    };
});

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('../hooks/useSaleFormEffects', () => ({
    useTaxSync: vi.fn(),
    usePaymentAmountSync: vi.fn(),
    useDiscountCalculation: vi.fn(),
    useSurchargeCalculation: vi.fn(),
    useTaxAmountCalculation: vi.fn(),
    useOnAccountValidation: vi.fn(),
    useMonotributistaCleanup: vi.fn(),
    useFiscalConfigValidation: vi.fn(() => ({ canCreateInvoice: true })),
}));

vi.mock('../hooks/useParkedSales', () => ({
    useParkedSales: vi.fn(() => ({
        parkedSales: [],
        parkSale: vi.fn(),
        retrieveSale: vi.fn(),
        removeSale: vi.fn(),
    })),
}));

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    return function Wrapper({ children }: { readonly children: ReactNode }) {
        return (
            <QueryClientProvider client={queryClient}>
                <Dialog open={true}>
                    <DialogContent>{children}</DialogContent>
                </Dialog>
            </QueryClientProvider>
        );
    };
}

function renderSaleForm(props: { readonly onSubmit?: (data: CreateSaleDTO) => void; readonly onParkSale?: () => void; readonly isLoading?: boolean } = {}) {
    const onSubmit = props.onSubmit ?? vi.fn();
    render(
        <SaleForm
            onSubmit={onSubmit}
            onParkSale={props.onParkSale}
            isLoading={props.isLoading}
        />,
        { wrapper: createWrapper() }
    );
    return { onSubmit };
}

describe('SaleForm', () => {
    let mockOnSubmit: ReturnType<typeof vi.fn<[CreateSaleDTO], void>>;

    beforeEach(() => {
        mockOnSubmit = vi.fn<[CreateSaleDTO], void>();
        vi.clearAllMocks();
    });

    describe('renderizado inicial', () => {
        it('debe renderizar el formulario vacío dentro del Dialog real', () => {
            renderSaleForm({ onSubmit: mockOnSubmit });

            expect(screen.getByText(/Nueva Venta/i)).toBeInTheDocument();
            expect(screen.getByText(/Agregar Productos/i)).toBeInTheDocument();
        });

        it('debe tener el botón de confirmar venta deshabilitado inicialmente', () => {
            renderSaleForm({ onSubmit: mockOnSubmit });

            expect(screen.getByRole('button', { name: /confirmar venta/i })).toBeDisabled();
        });
    });

    describe('selección de producto', () => {
        it('debe agregar un producto al seleccionarlo', async () => {
            const user = userEvent.setup();
            renderSaleForm({ onSubmit: mockOnSubmit });

            await user.click(screen.getByTestId('select-product'));

            expect(await screen.findByText(/Producto Test/i)).toBeInTheDocument();
        });

        it('debe calcular el subtotal cuando se agrega un producto', async () => {
            const user = userEvent.setup();
            renderSaleForm({ onSubmit: mockOnSubmit });

            await user.click(screen.getByTestId('select-product'));

            await waitFor(() => {
                expect(screen.getAllByText(/\$\s?100/i).length).toBeGreaterThan(0);
            });
        });
    });

    describe('selección de cliente', () => {
        it('debe permitir seleccionar un cliente', async () => {
            const user = userEvent.setup();
            renderSaleForm({ onSubmit: mockOnSubmit });

            await user.click(screen.getByTestId('select-customer'));

            expect(await screen.findByText(/12345678/i)).toBeInTheDocument();
        });
    });

    describe('cálculo de totales', () => {
        it('debe calcular el total correctamente con múltiples items', async () => {
            const user = userEvent.setup();
            renderSaleForm({ onSubmit: mockOnSubmit });

            const selectButton = screen.getByTestId('select-product');
            await user.click(selectButton);
            await user.click(selectButton);

            await waitFor(() => {
                expect(screen.getAllByText(/\$\s?200/i).length).toBeGreaterThan(0);
            });
        });
    });

    describe('validación del formulario', () => {
        it('no debe permitir enviar el formulario sin items', async () => {
            const user = userEvent.setup();
            renderSaleForm({ onSubmit: mockOnSubmit });

            await user.click(screen.getByRole('button', { name: /confirmar venta/i }));

            expect(mockOnSubmit).not.toHaveBeenCalled();
        });
    });

    describe('estado de loading', () => {
        it('debe mostrar indicador de carga cuando isLoading es true', () => {
            renderSaleForm({ onSubmit: mockOnSubmit, isLoading: true });

            expect(screen.getByRole('button', { name: /procesando/i })).toBeDisabled();
        });
    });

    describe('ventas pendientes', () => {
        it('debe tener opción de posponer venta', () => {
            renderSaleForm({ onSubmit: mockOnSubmit, onParkSale: vi.fn() });

            expect(screen.getByRole('button', { name: /posponer/i })).toBeInTheDocument();
        });

        it('debe mantener la opción de posponer aunque no se proporcione callback externo', () => {
            renderSaleForm({ onSubmit: mockOnSubmit });

            expect(screen.getByRole('button', { name: /posponer/i })).toBeInTheDocument();
        });
    });

    describe('integración con hooks personalizados', () => {
        it('debe llamar a los hooks de efectos del formulario', () => {
            renderSaleForm({ onSubmit: mockOnSubmit });

            expect(vi.mocked(usePaymentAmountSync)).toHaveBeenCalled();
            expect(vi.mocked(useOnAccountValidation)).toHaveBeenCalled();
            expect(vi.mocked(useMonotributistaCleanup)).toHaveBeenCalled();
            expect(vi.mocked(useFiscalConfigValidation)).toHaveBeenCalled();
        });
    });

    describe('manejo de errores', () => {
        it('debe manejar errores de validación del formulario', async () => {
            const user = userEvent.setup();
            renderSaleForm({ onSubmit: mockOnSubmit });

            await user.click(screen.getByRole('button', { name: /confirmar venta/i }));

            expect(mockOnSubmit).not.toHaveBeenCalled();
        });
    });
});
