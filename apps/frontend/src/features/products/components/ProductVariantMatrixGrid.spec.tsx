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

describe('ProductVariantMatrixGrid component - Sprint 3 Features', () => {
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

    it('permite navegar bidireccionalmente por teclado entre celdas (flechas y Enter)', () => {
        const onMatrixChange = vi.fn();
        renderWithQuery(
            <ProductVariantMatrixGrid
                styleCode="REM-01"
                onMatrixChange={onMatrixChange}
            />
        );

        const cell00 = document.getElementById('matrix-cell-0-0') as HTMLInputElement;
        const cell01 = document.getElementById('matrix-cell-0-1') as HTMLInputElement;
        const cell10 = document.getElementById('matrix-cell-1-0') as HTMLInputElement;

        expect(cell00).toBeInTheDocument();
        expect(cell01).toBeInTheDocument();
        expect(cell10).toBeInTheDocument();

        // Foco inicial en celda (0, 0)
        cell00.focus();

        // Presionar ArrowRight -> foco pasa a (0, 1)
        fireEvent.keyDown(cell00, { key: 'ArrowRight' });
        expect(document.activeElement).toBe(cell01);

        // Presionar ArrowDown -> foco pasa a (1, 1)
        const cell11 = document.getElementById('matrix-cell-1-1') as HTMLInputElement;
        fireEvent.keyDown(cell01, { key: 'ArrowDown' });
        expect(document.activeElement).toBe(cell11);

        // Presionar Enter -> avanza horizontalmente a (1, 2)
        const cell12 = document.getElementById('matrix-cell-1-2') as HTMLInputElement;
        fireEvent.keyDown(cell11, { key: 'Enter' });
        expect(document.activeElement).toBe(cell12);
    });

    it('ejecuta atajo global Alt+L para limpiar stock de todas las celdas', () => {
        const onMatrixChange = vi.fn();
        renderWithQuery(
            <ProductVariantMatrixGrid
                styleCode="REM-01"
                onMatrixChange={onMatrixChange}
            />
        );

        // Llenar primero con 5 unidades
        const fill5Btn = screen.getByText('Todo 5u');
        fireEvent.click(fill5Btn);

        expect(screen.getByText('60 unidades')).toBeInTheDocument();

        // Disparar Alt+L
        fireEvent.keyDown(window, { key: 'l', altKey: true });

        expect(screen.getByText('0 unidades')).toBeInTheDocument();
    });

    it('ejecuta atajo global Alt+D para alternar vista compacta y detallada', () => {
        const onMatrixChange = vi.fn();
        renderWithQuery(
            <ProductVariantMatrixGrid
                styleCode="REM-01"
                onMatrixChange={onMatrixChange}
            />
        );

        expect(screen.queryByPlaceholderText('Precio')).not.toBeInTheDocument();

        // Disparar Alt+D
        fireEvent.keyDown(window, { key: 'd', altKey: true });

        expect(screen.getAllByPlaceholderText('Precio').length).toBeGreaterThanOrEqual(12);
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

        const specialBtn = screen.getByText(/Talles Especiales/i);
        fireEvent.click(specialBtn);

        expect(screen.getByText('Reglas de Recargo para Talles Especiales')).toBeInTheDocument();

        const xlOption = screen.getByRole('button', { name: 'XL' });
        fireEvent.click(xlOption);

        const ruleValueInput = screen.getByPlaceholderText('15');
        fireEvent.change(ruleValueInput, { target: { value: '20' } });

        const applyBtn = screen.getByRole('button', { name: 'Aplicar Recargo' });
        fireEvent.click(applyBtn);

        expect(onMatrixChange).toHaveBeenCalled();
        const lastCall = onMatrixChange.mock.calls[onMatrixChange.mock.calls.length - 1][0];

        const xlCells = lastCall.filter((c: any) => c.size === 'XL');
        expect(xlCells.every((c: any) => c.price === 12000 && c.cost === 6000)).toBe(true);
    });
});
