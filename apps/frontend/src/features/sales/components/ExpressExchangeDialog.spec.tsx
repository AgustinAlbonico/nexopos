import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExpressExchangeDialog } from './ExpressExchangeDialog';

vi.mock('@/lib/axios', () => ({
    api: {
        post: vi.fn(),
        get: vi.fn(),
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

describe('ExpressExchangeDialog', () => {
    it('renders the dialog with steps when open is true', () => {
        renderWithProviders(
            <ExpressExchangeDialog
                open={true}
                onOpenChange={vi.fn()}
            />
        );

        expect(screen.getByText('Cambio de Prenda Express')).toBeInTheDocument();
        expect(screen.getByText('1. Prenda que Devuelve')).toBeInTheDocument();
        expect(screen.getByText('2. Prenda Nueva que se Lleva')).toBeInTheDocument();
    });
});
