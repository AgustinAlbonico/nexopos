import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReturnDialog } from './ReturnDialog';
import type { Sale } from '../types';

const sale: Sale = {
    id: 'sale-1', saleNumber: 'V-1', saleDate: '2026-08-11', subtotal: 20, discount: 0,
    surcharge: 0, tax: 0, total: 20, status: 'completed', isOnAccount: false,
    isFiscal: false, fiscalPending: false, inventoryUpdated: true, createdAt: '', updatedAt: '',
    items: [{ id: 'item-1', saleId: 'sale-1', productId: 'product-1', product: { id: 'product-1', name: 'Café', price: 10 }, productDescription: 'Café', quantity: 2, unitOfMeasure: 'un', unitPrice: 10, discount: 0, discountPercent: 0, subtotal: 20 }],
    payments: [],
};

describe('ReturnDialog', () => {
    it('previews and confirms a restock return', async () => {
        const user = userEvent.setup();
        const onPreview = vi.fn().mockResolvedValue({ totalRefund: 10, totalExchangeAmount: 0, items: [] });
        const onConfirm = vi.fn().mockResolvedValue(undefined);
        render(<ReturnDialog open sale={sale} onOpenChange={vi.fn()} onPreview={onPreview} onConfirm={onConfirm} isSubmitting={false} />);

        await user.clear(screen.getByLabelText(/cantidad a devolver/i));
        await user.type(screen.getByLabelText(/cantidad a devolver/i), '1');
        await user.click(screen.getByRole('button', { name: /previsualizar/i }));
        expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ originalSaleId: 'sale-1' }));
        await user.click(screen.getByRole('button', { name: /confirmar devolución/i }));
        expect(onConfirm).toHaveBeenCalledOnce();
    });
});
