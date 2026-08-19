import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductVariantMatrixGrid } from './ProductVariantMatrixGrid';

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

const renderWithQuery = (ui: React.ReactElement) => {
    const queryClient = createTestQueryClient();
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('ProductVariantMatrixGrid component - Sprint 2 Features', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renderiza correctamente las columnas de talles y filas de colores por defecto', () => {
        const onMatrixChange = vi.fn();
        renderWithQuery(
            <ProductVariantMatrixGrid
                styleCode="REM-01"
                defaultPrice={1000}
                defaultCost={500}
                onMatrixChange={onMatrixChange}
            />
        );

        expect(screen.getByText('1. Curva de Talles (Columnas)')).toBeInTheDocument();
        expect(screen.getByText('2. Paleta de Colores (Filas)')).toBeInTheDocument();
        expect(screen.getAllByText('Negro').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Blanco').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Azul Marino').length).toBeGreaterThanOrEqual(1);
    });

    it('permite aplicar una regla de recargo porcentual (+20%) sobre talles especiales', () => {
        const onMatrixChange = vi.fn();
        renderWithQuery(
            <ProductVariantMatrixGrid
                styleCode="REM-01"
                defaultPrice={10000}
                defaultCost={5000}
                onMatrixChange={onMatrixChange}
            />
        );

        // Abrir modal de talles especiales
        const specialBtn = screen.getByText(/Talles Especiales/i);
        fireEvent.click(specialBtn);

        expect(screen.getByText('Reglas de Recargo para Talles Especiales')).toBeInTheDocument();

        // Seleccionar talle XL en el modal
        const xlOption = screen.getByRole('button', { name: 'XL' });
        fireEvent.click(xlOption);

        // Cambiar porcentaje a 20%
        const ruleValueInput = screen.getByPlaceholderText('15');
        fireEvent.change(ruleValueInput, { target: { value: '20' } });

        // Aplicar recargo
        const applyBtn = screen.getByRole('button', { name: 'Aplicar Recargo' });
        fireEvent.click(applyBtn);

        expect(onMatrixChange).toHaveBeenCalled();
        const lastCall = onMatrixChange.mock.calls[onMatrixChange.mock.calls.length - 1][0];

        // Verificar que las celdas de XL tienen precio $12.000 y costo $6.000 (+20%)
        const xlCells = lastCall.filter((c: any) => c.size === 'XL');
        expect(xlCells.length).toBeGreaterThanOrEqual(3);
        expect(xlCells.every((c: any) => c.price === 12000 && c.cost === 6000)).toBe(true);

        // Verificar que los talles estándar S, M, L mantienen $10.000 y $5.000
        const standardCells = lastCall.filter((c: any) => c.size !== 'XL');
        expect(standardCells.every((c: any) => c.price === 10000 && c.cost === 5000)).toBe(true);
    });

    it('permite edición masiva por columna (fijar stock a todos los colores de un talle)', () => {
        const onMatrixChange = vi.fn();
        renderWithQuery(
            <ProductVariantMatrixGrid
                styleCode="REM-01"
                onMatrixChange={onMatrixChange}
            />
        );

        // Abrir edición masiva en columna M
        const bulkBtns = screen.getAllByTitle(/Editar masivamente la columna M/i);
        fireEvent.click(bulkBtns[0]);

        expect(screen.getByText(/Edición Masiva — Talle M/i)).toBeInTheDocument();

        // Asignar 15 unidades de stock
        const bulkInput = screen.getByPlaceholderText('10');
        fireEvent.change(bulkInput, { target: { value: '15' } });

        // Guardar
        const submitBtn = screen.getByRole('button', { name: /Aplicar a 3 Colores/i });
        fireEvent.click(submitBtn);

        expect(onMatrixChange).toHaveBeenCalled();
        const lastCall = onMatrixChange.mock.calls[onMatrixChange.mock.calls.length - 1][0];

        const mCells = lastCall.filter((c: any) => c.size === 'M');
        expect(mCells.every((c: any) => c.stock === 15)).toBe(true);
    });

    it('permite edición masiva por fila (fijar precio a todos los talles de un color)', () => {
        const onMatrixChange = vi.fn();
        renderWithQuery(
            <ProductVariantMatrixGrid
                styleCode="REM-01"
                defaultPrice={5000}
                onMatrixChange={onMatrixChange}
            />
        );

        // Abrir edición masiva en fila Negro
        const bulkRowBtn = screen.getByTitle(/Editar masivamente la fila de color Negro/i);
        fireEvent.click(bulkRowBtn);

        expect(screen.getByText(/Edición Masiva — Color Negro/i)).toBeInTheDocument();

        // Seleccionar campo Precio
        const priceFieldBtn = screen.getByRole('button', { name: 'Precio ($)' });
        fireEvent.click(priceFieldBtn);

        // Asignar precio $8.500
        const bulkInput = screen.getByPlaceholderText('15000');
        fireEvent.change(bulkInput, { target: { value: '8500' } });

        // Guardar
        const submitBtn = screen.getByRole('button', { name: /Aplicar a 4 Talles/i });
        fireEvent.click(submitBtn);

        expect(onMatrixChange).toHaveBeenCalled();
        const lastCall = onMatrixChange.mock.calls[onMatrixChange.mock.calls.length - 1][0];

        const blackCells = lastCall.filter((c: any) => c.color === 'Negro');
        expect(blackCells.every((c: any) => c.price === 8500)).toBe(true);
    });

    it('permite alternar entre vista compacta y vista detallada', () => {
        const onMatrixChange = vi.fn();
        renderWithQuery(
            <ProductVariantMatrixGrid
                styleCode="REM-01"
                onMatrixChange={onMatrixChange}
            />
        );

        // Inicialmente vista compacta (no se ven inputs con placeholder "Precio")
        expect(screen.queryByPlaceholderText('Precio')).not.toBeInTheDocument();

        // Cambiar a vista detallada
        const toggleBtn = screen.getByTitle('Ver y editar costos y precios por celda');
        fireEvent.click(toggleBtn);

        expect(screen.getAllByPlaceholderText('Precio').length).toBeGreaterThanOrEqual(12);
        expect(screen.getAllByPlaceholderText('Costo').length).toBeGreaterThanOrEqual(12);
    });
});
