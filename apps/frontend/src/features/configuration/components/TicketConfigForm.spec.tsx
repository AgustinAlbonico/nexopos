import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TicketConfigForm } from './TicketConfigForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/axios', () => ({
    api: {
        get: vi.fn().mockResolvedValue({
            data: {
                id: 'config-1',
                ticketAutoPrintEnabled: true,
                ticketPrinterName: null,
                ticketPaperWidth: '80mm',
                ticketHeaderTitle: 'Mi Comercio',
                ticketHeaderAddress: null,
                ticketHeaderPhone: null,
                ticketFooterText: 'Gracias',
                ticketShowCustomerData: true,
            },
        }),
        patch: vi.fn().mockResolvedValue({ data: {} }),
    },
}));

function renderWithClient(ui: React.ReactNode) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            {ui}
        </QueryClientProvider>
    );
}

describe('TicketConfigForm', () => {
    it('renderiza sin romper con impresora por defecto', async () => {
        renderWithClient(<TicketConfigForm />);
        const title = await screen.findByText(/Configuración de Tiquetera e Impresión/i);
        expect(title).toBeInTheDocument();
    });
});
