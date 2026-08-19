import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MatrixImportDialog } from './MatrixImportDialog';
import { matrixImportApi } from '../api/products.api';

vi.mock('../api/products.api', () => ({
    matrixImportApi: {
        downloadTemplate: vi.fn(),
        preview: vi.fn(),
        commit: vi.fn(),
    },
}));

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

describe('MatrixImportDialog component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renderiza el diálogo cerrado y abierto correctamente', () => {
        const queryClient = createTestQueryClient();
        const { rerender } = render(
            <QueryClientProvider client={queryClient}>
                <MatrixImportDialog open={false} onOpenChange={vi.fn()} />
            </QueryClientProvider>
        );

        expect(screen.queryByText('Importación Masiva de Indumentaria (Matriz 2D)')).not.toBeInTheDocument();

        rerender(
            <QueryClientProvider client={queryClient}>
                <MatrixImportDialog open={true} onOpenChange={vi.fn()} />
            </QueryClientProvider>
        );

        expect(screen.getByText('Importación Masiva de Indumentaria (Matriz 2D)')).toBeInTheDocument();
        expect(screen.getByText('Descargar Plantilla CSV')).toBeInTheDocument();
    });

    it('dispara la descarga de plantilla al presionar el botón', async () => {
        const queryClient = createTestQueryClient();
        render(
            <QueryClientProvider client={queryClient}>
                <MatrixImportDialog open={true} onOpenChange={vi.fn()} />
            </QueryClientProvider>
        );

        const downloadBtn = screen.getByText('Descargar Plantilla CSV');
        fireEvent.click(downloadBtn);

        expect(matrixImportApi.downloadTemplate).toHaveBeenCalled();
    });

    it('muestra el preview de modelos tras cargar un archivo', async () => {
        (matrixImportApi.preview as any).mockResolvedValueOnce({
            totalModels: 1,
            totalVariants: 4,
            totalStockUnits: 30,
            sizeColumns: ['S', 'M', 'L', 'XL'],
            models: [
                {
                    styleCode: 'REM-101',
                    name: 'Remera Lisa Urban',
                    categoryName: 'Remeras',
                    brandName: 'Levis',
                    cost: 4500,
                    price: 8900,
                    variants: [
                        { color: 'Negro', size: 'S', stock: 5 },
                        { color: 'Negro', size: 'M', stock: 10 },
                        { color: 'Negro', size: 'L', stock: 10 },
                        { color: 'Negro', size: 'XL', stock: 5 },
                    ],
                },
            ],
            errors: [],
        });

        const queryClient = createTestQueryClient();
        render(
            <QueryClientProvider client={queryClient}>
                <MatrixImportDialog open={true} onOpenChange={vi.fn()} />
            </QueryClientProvider>
        );

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const fakeFile = new File(['fake,csv,content'], 'matriz.csv', { type: 'text/csv' });

        fireEvent.change(fileInput, { target: { files: [fakeFile] } });

        await waitFor(() => {
            expect(screen.getByText('Remera Lisa Urban')).toBeInTheDocument();
            expect(screen.getByText('30 unidades totales')).toBeInTheDocument();
        });

        // Botón de confirmación debe estar habilitado
        const confirmBtn = screen.getByRole('button', { name: /Confirmar e Importar/i });
        expect(confirmBtn).not.toBeDisabled();
    });
});
