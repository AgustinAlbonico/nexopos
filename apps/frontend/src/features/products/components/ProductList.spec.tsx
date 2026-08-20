import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductList } from './ProductList';
import { productsApi, categoriesApi, brandsApi } from '../api/products.api';

vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
    DropdownMenuItem: ({ children, onClick }: any) => (
        <button onClick={onClick}>{children}</button>
    ),
    DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
}));

vi.mock('../api/products.api', () => ({
    productsApi: {
        getAll: vi.fn(),
    },
    categoriesApi: {
        getAll: vi.fn(),
    },
    brandsApi: {
        getAll: vi.fn(),
    },
}));

vi.mock('@/hooks/useCapabilities', () => ({
    useCapabilities: () => ({
        data: {
            capabilities: {
                'STRUCTURAL.variants': true,
            },
        },
    }),
}));

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

const mockProducts = [
    {
        id: 'prod-1',
        name: 'Remera Básica Algodón',
        sku: 'REM-BAS-01',
        cost: 3000,
        price: 7500,
        stock: 25,
        isActive: true,
        isVariantParent: true,
        createdAt: '2026-08-19',
        updatedAt: '2026-08-19',
    },
];

describe('ProductList component - Clonación de Modelos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (productsApi.getAll as any).mockResolvedValue({
            data: mockProducts,
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
        });
        (categoriesApi.getAll as any).mockResolvedValue([]);
        (brandsApi.getAll as any).mockResolvedValue([]);
    });

    it('renderiza la opción "Clonar Modelo" y dispara onClone con el producto seleccionado', async () => {
        const onClone = vi.fn();
        const onEdit = vi.fn();
        const onDelete = vi.fn();
        const onView = vi.fn();

        const queryClient = createTestQueryClient();
        render(
            <QueryClientProvider client={queryClient}>
                <ProductList
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onView={onView}
                    onClone={onClone}
                />
            </QueryClientProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('Remera Básica Algodón')).toBeInTheDocument();
        });

        // Buscar y presionar "Clonar Modelo"
        const cloneOption = screen.getByRole('button', { name: /Clonar Modelo/i });
        expect(cloneOption).toBeInTheDocument();
        fireEvent.click(cloneOption);

        expect(onClone).toHaveBeenCalledWith(mockProducts[0]);
    });
});
