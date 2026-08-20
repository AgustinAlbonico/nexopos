import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExpenseForm } from './ExpenseForm';
import { expenseCategoriesApi } from '../api/expenses.api';
import { toast } from 'sonner';

vi.mock('../api/expenses.api', () => ({
    expenseCategoriesApi: {
        getAll: vi.fn(() => Promise.resolve([
            { id: 'cat-exp-1', name: 'Alquiler', isRecurring: true, isActive: true },
        ])),
        create: vi.fn(),
    },
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

describe('ExpenseForm - Creación rápida de categorías de gastos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renderiza el botón con el ícono más (+) junto al selector de categorías', () => {
        const wrapper = createWrapper();
        render(<ExpenseForm onSubmit={vi.fn()} />, { wrapper });

        const addCategoryBtn = screen.getByRole('button', { name: /crear nueva categoría/i });
        expect(addCategoryBtn).toBeInTheDocument();
    });

    it('abre el modal de "Nueva Categoría de Gastos" al presionar el botón (+)', async () => {
        const user = userEvent.setup();
        const wrapper = createWrapper();
        render(<ExpenseForm onSubmit={vi.fn()} />, { wrapper });

        const addCategoryBtn = screen.getByRole('button', { name: /crear nueva categoría/i });
        await user.click(addCategoryBtn);

        expect(screen.getByRole('heading', { name: /nueva categoría de gastos/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/ej: alquiler, servicios, mantenimiento/i)).toBeInTheDocument();
    });

    it('permite crear una nueva categoría de gastos y la selecciona automáticamente', async () => {
        const user = userEvent.setup();
        const newCategory = {
            id: 'cat-exp-new-456',
            name: 'Limpieza e Insumos',
            description: 'Gastos generales de limpieza',
            isRecurring: false,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        (expenseCategoriesApi.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(newCategory);

        const wrapper = createWrapper();
        render(<ExpenseForm onSubmit={vi.fn()} />, { wrapper });

        // Abrir modal con botón (+)
        const addCategoryBtn = screen.getByRole('button', { name: /crear nueva categoría/i });
        await user.click(addCategoryBtn);

        // Completar campos del modal
        const nameInput = screen.getByPlaceholderText(/ej: alquiler, servicios, mantenimiento/i);
        const descInput = screen.getByPlaceholderText(/detalle o uso de la categoría/i);

        await user.type(nameInput, 'Limpieza e Insumos');
        await user.type(descInput, 'Gastos generales de limpieza');

        // Click en Crear Categoría
        const submitBtn = screen.getByRole('button', { name: 'Crear Categoría' });
        await user.click(submitBtn);

        await waitFor(() => {
            expect(expenseCategoriesApi.create).toHaveBeenCalledWith({
                name: 'Limpieza e Insumos',
                description: 'Gastos generales de limpieza',
            });
        });

        expect(toast.success).toHaveBeenCalledWith('Categoría "Limpieza e Insumos" creada');
    });
});
