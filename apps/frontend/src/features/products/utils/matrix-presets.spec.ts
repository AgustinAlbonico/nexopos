import { describe, it, expect } from 'vitest';
import {
    calculateCurveStock,
    generateStructuredSku,
    SIZE_RUN_PRESETS,
    COLOR_PRESETS,
    DISTRIBUTION_CURVES,
} from './matrix-presets';

describe('matrix-presets utils', () => {
    describe('calculateCurveStock', () => {
        it('distribuye cantidades exactas cuando coincide la cantidad de talles', () => {
            const result = calculateCurveStock(4, [1, 2, 2, 1], 1);
            expect(result).toEqual([1, 2, 2, 1]);
        });

        it('aplica multiplicador correctamente', () => {
            const result = calculateCurveStock(4, [1, 2, 2, 1], 5);
            expect(result).toEqual([5, 10, 10, 5]);
        });

        it('retorna array vacío si la cantidad de talles es 0', () => {
            const result = calculateCurveStock(0, [1, 2, 2, 1]);
            expect(result).toEqual([]);
        });

        it('distribuye proporcionalmente si la cantidad de talles difiere', () => {
            const result = calculateCurveStock(6, [1, 2, 2, 1], 1);
            expect(result).toHaveLength(6);
            expect(result.every((val) => val > 0)).toBe(true);
        });
    });

    describe('generateStructuredSku', () => {
        it('genera un SKU con formato [STYLE]-[COLOR]-[SIZE]', () => {
            const sku = generateStructuredSku('REM-100', 'Negro', 'M');
            expect(sku).toBe('REM100-NEG-M');
        });

        it('normaliza acentos y caracteres especiales', () => {
            const sku = generateStructuredSku('ZAP/01', 'Marrón', '42');
            expect(sku).toBe('ZAP01-MAR-42');
        });

        it('usa fallback si no se proporciona styleCode', () => {
            const sku = generateStructuredSku(null, 'Blanco', 'L');
            expect(sku).toBe('PROD-BLA-L');
        });
    });

    describe('presets definitions', () => {
        it('contiene curvas de talles estándar para adultos, pantalones y calzado', () => {
            expect(SIZE_RUN_PRESETS.length).toBeGreaterThanOrEqual(4);
            const adult = SIZE_RUN_PRESETS.find((p) => p.key === 'adult_letter');
            expect(adult?.sizes).toContain('M');
            expect(adult?.sizes).toContain('L');
        });

        it('contiene paleta de colores base', () => {
            expect(COLOR_PRESETS.length).toBeGreaterThanOrEqual(10);
            expect(COLOR_PRESETS.some((c) => c.name === 'Negro')).toBe(true);
            expect(COLOR_PRESETS.some((c) => c.name === 'Blanco')).toBe(true);
        });

        it('contiene curvas de distribución', () => {
            expect(DISTRIBUTION_CURVES.length).toBeGreaterThanOrEqual(3);
        });
    });
});
