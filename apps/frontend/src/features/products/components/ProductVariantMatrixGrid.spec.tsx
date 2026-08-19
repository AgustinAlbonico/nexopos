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

describe('ProductVariantMatrixGrid component', () => {
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

    it('permite aplicar una plantilla rápida de talles', () => {
        const onMatrixChange = vi.fn();
        renderWithQuery(
            <ProductVariantMatrixGrid
                styleCode="JEAN-01"
                onMatrixChange={onMatrixChange}
            />
        );

        const pantsPresetBtn = screen.getByText('Pantalones / Jeans (38 a 50)');
        fireEvent.click(pantsPresetBtn);

        expect(screen.getAllByText('38').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('40').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('42').length).toBeGreaterThanOrEqual(1);
        expect(onMatrixChange).toHaveBeenCalled();
    });

    it('abre el modal para guardar escala de talles como plantilla', () => {
        const onMatrixChange = vi.fn();
        renderWithQuery(
            <ProductVariantMatrixGrid
                styleCode="REM-01"
                onMatrixChange={onMatrixChange}
            />
        );

        const saveScaleBtn = screen.getByTitle('Guardar los talles actuales como plantilla reutilizable');
        fireEvent.click(saveScaleBtn);

        expect(screen.getByText('Guardar Escala de Talles')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Ej: Remeras Oversize, Calzado Dama...')).toBeInTheDocument();
    });

    it('abre el modal para guardar paleta de colores como plantilla', () => {
        const onMatrixChange = vi.fn();
        renderWithQuery(
            <ProductVariantMatrixGrid
                styleCode="REM-01"
                onMatrixChange={onMatrixChange}
            />
        );

        const savePaletteBtn = screen.getByTitle('Guardar los colores actuales como paleta reutilizable');
        fireEvent.click(savePaletteBtn);

        expect(screen.getByText('Guardar Paleta de Colores')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Ej: Cápsula Verano, Tonos Pastel...')).toBeInTheDocument();
    });

    it('permite aplicar atajo de curva rápida de distribución (1-2-2-1)', () => {
        const onMatrixChange = vi.fn();
        renderWithQuery(
            <ProductVariantMatrixGrid
                styleCode="REM-01"
                onMatrixChange={onMatrixChange}
            />
        );

        const curveBtn = screen.getByText('1-2-2-1');
        fireEvent.click(curveBtn);

        expect(onMatrixChange).toHaveBeenCalled();
        const lastCall = onMatrixChange.mock.calls[onMatrixChange.mock.calls.length - 1][0];
        expect(lastCall.some((c: any) => c.stock > 0)).toBe(true);
    });

    it('permite llenar todo el stock con cantidad fija (Todo 5u)', () => {
        const onMatrixChange = vi.fn();
        renderWithQuery(
            <ProductVariantMatrixGrid
                styleCode="REM-01"
                onMatrixChange={onMatrixChange}
            />
        );

        const fill5Btn = screen.getByText('Todo 5u');
        fireEvent.click(fill5Btn);

        expect(onMatrixChange).toHaveBeenCalled();
        const lastCall = onMatrixChange.mock.calls[onMatrixChange.mock.calls.length - 1][0];
        expect(lastCall.every((c: any) => c.stock === 5)).toBe(true);
    });

    it('calcula y muestra el total consolidado de unidades', () => {
        const onMatrixChange = vi.fn();
        renderWithQuery(
            <ProductVariantMatrixGrid
                styleCode="REM-01"
                onMatrixChange={onMatrixChange}
            />
        );

        const fill5Btn = screen.getByText('Todo 5u');
        fireEvent.click(fill5Btn);

        // 3 colores x 4 talles = 12 variantes * 5 = 60 unidades
        expect(screen.getByText('60 unidades')).toBeInTheDocument();
    });
});
