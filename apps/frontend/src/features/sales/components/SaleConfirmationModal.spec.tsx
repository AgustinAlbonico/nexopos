import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SaleConfirmationModal } from './SaleConfirmationModal';
import { Sale, PaymentMethod } from '../types';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: false },
    },
});

function renderWithQuery(ui: React.ReactElement) {
    return render(
        <QueryClientProvider client={queryClient}>
            {ui}
        </QueryClientProvider>
    );
}

const mockSaleWithChange: Sale = {
    id: 'sale-1',
    saleNumber: 'V-0001',
    saleDate: '2026-08-11',
    subtotal: 1000,
    discount: 0,
    surcharge: 0,
    tax: 0,
    total: 1000,
    status: 'COMPLETED' as any,
    isOnAccount: false,
    isFiscal: false,
    fiscalPending: false,
    inventoryUpdated: true,
    createdAt: '2026-08-11T20:00:00Z',
    updatedAt: '2026-08-11T20:00:00Z',
    items: [
        {
            id: 'item-1',
            saleId: 'sale-1',
            productId: 'p-1',
            productDescription: 'Producto Ejemplo',
            quantity: 1,
            unitPrice: 1000,
            discount: 0,
            discountPercent: 0,
            subtotal: 1000,
        },
    ],
    payments: [
        {
            id: 'pay-1',
            saleId: 'sale-1',
            paymentMethod: PaymentMethod.CASH,
            amount: 1500, // $500 de vuelto
            createdAt: '2026-08-11T20:00:00Z',
        },
    ],
};

describe('SaleConfirmationModal', () => {
    it('muestra el banner de vuelto cuando el cobro supera el total', () => {
        renderWithQuery(
            <SaleConfirmationModal
                sale={mockSaleWithChange}
                open={true}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText(/Vuelto a Entregar/i)).toBeInTheDocument();
        expect(screen.getByText(/\$ 500/i)).toBeInTheDocument();
    });

    it('muestra los botones de acción rápida (Nueva Venta, Imprimir Ticket, Descargar PDF)', () => {
        renderWithQuery(
            <SaleConfirmationModal
                sale={mockSaleWithChange}
                open={true}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByRole('button', { name: /Nueva Venta/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Imprimir Ticket/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Descargar PDF/i })).toBeInTheDocument();
    });

    it('permite cerrar el modal para iniciar una nueva venta', async () => {
        const mockOnClose = vi.fn();
        const user = userEvent.setup();

        renderWithQuery(
            <SaleConfirmationModal
                sale={mockSaleWithChange}
                open={true}
                onClose={mockOnClose}
            />
        );

        const newSaleBtn = screen.getByRole('button', { name: /Nueva Venta/i });
        await user.click(newSaleBtn);

        expect(mockOnClose).toHaveBeenCalled();
    });
});
