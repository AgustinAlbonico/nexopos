import { describe, it, expect } from 'vitest';
import { generateSaleTicketHtml } from './ticketGenerator';
import { Sale, PaymentMethod } from '../types';

describe('generateSaleTicketHtml', () => {
    const mockSale: Sale = {
        id: 'sale-1',
        saleNumber: 'V-0001',
        saleDate: '2026-08-11T12:00:00Z',
        subtotal: 1000,
        discount: 100,
        tax: 0,
        total: 900,
        isFiscal: false,
        fiscalPending: false,
        status: 'completed' as any,
        items: [
            {
                id: 'item-1',
                productDescription: 'Gaseosa Cola 1.5L',
                quantity: 2,
                unitPrice: 500,
                subtotal: 1000,
            } as any,
        ],
        payments: [
            {
                id: 'pay-1',
                paymentMethod: PaymentMethod.CASH,
                amount: 1000,
            } as any,
        ],
        customer: {
            id: 'cust-1',
            firstName: 'Carlos',
            lastName: 'Gómez',
            documentNumber: '30123456',
        } as any,
    };

    it('genera el HTML del ticket con encabezado y pie personalizados', () => {
        const html = generateSaleTicketHtml(mockSale, {
            ticketHeaderTitle: 'Supermercado Don Juan',
            ticketHeaderAddress: 'Av. San Martín 456',
            ticketHeaderPhone: '011-4444-8888',
            ticketFooterText: '¡Gracias por elegirnos!',
            ticketShowCustomerData: true,
        });

        expect(html).toContain('Supermercado Don Juan');
        expect(html).toContain('Av. San Martín 456');
        expect(html).toContain('011-4444-8888');
        expect(html).toContain('¡Gracias por elegirnos!');
        expect(html).toContain('Gaseosa Cola 1.5L');
        expect(html).toContain('Carlos Gómez');
        expect(html).toContain('CAMBIO');
    });

    it('oculta datos del cliente cuando ticketShowCustomerData es false', () => {
        const html = generateSaleTicketHtml(mockSale, {
            ticketShowCustomerData: false,
        });

        expect(html).not.toContain('Carlos Gómez');
    });
});
