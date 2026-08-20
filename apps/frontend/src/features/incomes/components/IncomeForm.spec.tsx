import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IncomeForm } from './IncomeForm';
import { incomeCategoriesApi } from '../api/incomes.api';
import { toast } from 'sonner';

vi.mock('../api/incomes.api', () => ({
    incomeCategoriesApi: {
        getAll: vi.fn(() => Promise.resolve([
            { id: 'cat-inc-1', name: 'Servicios', isActive: true },
        ])),
        create: vi.fn(),
    },
}));

vi.mock('@/features/customers/api/customers.api', () => ({
    customersApi: {
        create: vi.fn(),
        search: vi.fn(() => Promise.resolve([])),
    },
}));

vi.mock('@/components/common/CustomerSearch', () => ({
    CustomerSearch: () => <div data-testid="customer-search">Customer Search</div>,
}));

vi.mock('@/components/shared/PaymentMethodSelect', () => ({
    PaymentMethodSelect: () => <div data-testid="payment-method-select">Payment Method</div>,
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

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

describe('IncomeForm - Creación rápida de categorías de ingresos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renderiza el botón con el ícono más (+) junto al selector de categorías', () => {
        const wrapper = createWrapper();
        render(<IncomeForm onSubmit={vi.fn()} />, { wrapper });

        const addCategoryBtn = screen.getByRole('button', { name: /crear nueva categoría/i });
        expect(addCategoryBtn).toBeInTheDocument();
    });

    it('abre el modal de "Nueva Categoría de Ingresos" al presionar el botón (+)', async () => {
        const user = userEvent.setup();
        const wrapper = createWrapper();
        render(<IncomeForm onSubmit={vi.fn()} />, { wrapper });

        const addCategoryBtn = screen.getByRole('button', { name: /crear nueva categoría/i });
        await user.click(addCategoryBtn);

        expect(screen.getByRole('heading', { name: /nueva categoría de ingresos/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/ej: servicios, alquileres, comisiones/i)).toBeInTheDocument();
    });

    it('permite crear una nueva categoría de ingresos y la selecciona automáticamente', async () => {
        const user = userEvent.setup();
        const newCategory = {
            id: 'cat-inc-new-789',
            name: 'Comisiones Especiales',
            description: 'Ingresos por comisiones',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        (incomeCategoriesApi.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(newCategory);

        const wrapper = createWrapper();
        render(<IncomeForm onSubmit={vi.fn()} />, { wrapper });

        // Abrir modal con botón (+)
        const addCategoryBtn = screen.getByRole('button', { name: /crear nueva categoría/i });
        await user.click(addCategoryBtn);

        // Completar campos del modal
        const nameInput = screen.getByPlaceholderText(/ej: servicios, alquileres, comisiones/i);
        const descInput = screen.getByPlaceholderText(/detalle de la categoría/i);

        await user.type(nameInput, 'Comisiones Especiales');
        await user.type(descInput, 'Ingresos por comisiones');

        // Click en Crear Categoría
        const submitBtn = screen.getByRole('button', { name: 'Crear Categoría' });
        await user.click(submitBtn);

        await waitFor(() => {
            expect(incomeCategoriesApi.create).toHaveBeenCalledWith({
                name: 'Comisiones Especiales',
                description: 'Ingresos por comisiones',
            });
        });

        expect(toast.success).toHaveBeenCalledWith('Categoría "Comisiones Especiales" creada');
    });
});
