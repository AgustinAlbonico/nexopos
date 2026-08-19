import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PostCreationLabelDialog } from './PostCreationLabelDialog';
import { api } from '@/lib/axios';

vi.mock('@/lib/axios', () => ({
    api: {
        post: vi.fn(),
    },
}));

describe('PostCreationLabelDialog component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.URL and window.open
        window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/fake-pdf');
        window.open = vi.fn();
    });

    const mockVariants = [
        { id: 'v1', size: 'S', color: 'Negro', stock: 5, sku: 'REM-NEG-S', price: 8900 },
        { id: 'v2', size: 'M', color: 'Negro', stock: 10, sku: 'REM-NEG-M', price: 8900 },
        { id: 'v3', size: 'L', color: 'Negro', stock: 0, sku: 'REM-NEG-L', price: 8900 },
    ];

    it('renderiza correctamente el resumen del producto y opciones de formato', () => {
        render(
            <PostCreationLabelDialog
                open={true}
                onOpenChange={vi.fn()}
                productName="Remera Lisa Urban"
                brandName="Levis"
                variants={mockVariants}
            />
        );

        expect(screen.getByText('Impresión de Etiquetas Post-Guardado')).toBeInTheDocument();
        expect(screen.getByText('Hangtag de Colgar')).toBeInTheDocument();
        expect(screen.getByText('Térmica Rollo')).toBeInTheDocument();
        expect(screen.getByText('15 u. stock total')).toBeInTheDocument();
    });

    it('permite cambiar entre formato Hangtag y Térmico Rollo', () => {
        render(
            <PostCreationLabelDialog
                open={true}
                onOpenChange={vi.fn()}
                productName="Remera Lisa Urban"
                brandName="Levis"
                variants={mockVariants}
            />
        );

        const thermalBtn = screen.getByText('Térmica Rollo').closest('button')!;
        fireEvent.click(thermalBtn);

        expect(thermalBtn).toHaveClass('border-blue-500');
    });

    it('envía los items correctos para imprimir y abre el PDF generado', async () => {
        (api.post as any).mockResolvedValueOnce({
            data: new ArrayBuffer(100),
        });

        const onOpenChange = vi.fn();
        render(
            <PostCreationLabelDialog
                open={true}
                onOpenChange={onOpenChange}
                productName="Remera Lisa Urban"
                brandName="Levis"
                variants={mockVariants}
            />
        );

        const printBtn = screen.getByRole('button', { name: /Imprimir 15 Etiquetas/i });
        fireEvent.click(printBtn);

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith(
                '/api/products/labels/preview',
                expect.objectContaining({
                    template: 'hangtag_50x90',
                    items: expect.arrayContaining([
                        expect.objectContaining({ name: 'Remera Lisa Urban', size: 'S', copies: 5 }),
                        expect.objectContaining({ name: 'Remera Lisa Urban', size: 'M', copies: 10 }),
                    ]),
                }),
                expect.anything()
            );
            expect(window.open).toHaveBeenCalled();
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });
});
