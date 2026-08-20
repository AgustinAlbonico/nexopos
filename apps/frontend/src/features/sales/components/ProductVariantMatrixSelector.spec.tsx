import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductVariantMatrixSelector } from './ProductVariantMatrixSelector';
import { productsApi } from '@/features/products/api/products.api';

vi.mock('@/features/products/api/products.api', () => ({
    productsApi: {
        getAll: vi.fn(),
        getOne: vi.fn(),
    },
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: false },
    },
});

function renderWithProviders(ui: React.ReactElement) {
    return render(
        <QueryClientProvider client={queryClient}>
            {ui}
        </QueryClientProvider>
    );
}

describe('ProductVariantMatrixSelector', () => {
    it('renders the dialog when open is true', () => {
        vi.mocked(productsApi.getAll).mockResolvedValue({
            data: [],
            total: 0,
            page: 1,
            limit: 100,
            totalPages: 1,
        });

        renderWithProviders(
            <ProductVariantMatrixSelector
                open={true}
                onOpenChange={vi.fn()}
                onSelectVariant={vi.fn()}
            />
        );

        expect(screen.getByText('Selector Visual de Talles y Colores')).toBeInTheDocument();
    });

    it('renders parent models in select', async () => {
        const mockParent = {
            id: 'parent-1',
            name: 'Remera Lisa',
            isVariantParent: true,
            price: 15000,
            cost: 8000,
            stock: 10,
            isActive: true,
            createdAt: '2026-08-14',
            updatedAt: '2026-08-14',
        };

        vi.mocked(productsApi.getAll).mockResolvedValue({
            data: [mockParent],
            total: 1,
            page: 1,
            limit: 100,
            totalPages: 1,
        });

        vi.mocked(productsApi.getOne).mockResolvedValue({
            ...mockParent,
            variants: [
                {
                    id: 'var-1',
                    name: 'Remera Lisa M Negro',
                    price: 15000,
                    cost: 8000,
                    stock: 5,
                    isActive: true,
                    isVariantParent: false,
                    parentProductId: 'parent-1',
                    createdAt: '2026-08-14',
                    updatedAt: '2026-08-14',
                    variantAttributes: [
                        { id: '1', attributeKey: 'size', attributeValue: 'M' },
                        { id: '2', attributeKey: 'color', attributeValue: 'Negro' },
                    ],
                },
            ],
        });

        renderWithProviders(
            <ProductVariantMatrixSelector
                open={true}
                onOpenChange={vi.fn()}
                onSelectVariant={vi.fn()}
            />
        );

        expect(screen.getByText('Selector Visual de Talles y Colores')).toBeInTheDocument();
    });
});
