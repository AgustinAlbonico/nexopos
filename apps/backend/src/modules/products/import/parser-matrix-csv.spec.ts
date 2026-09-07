import { describe, it, expect } from '@jest/globals';
import { parseMatrixCsv } from './parser-matrix-csv';

describe('parseMatrixCsv', () => {
    it('parsea correctamente un CSV matricial 2D agrupando colores bajo el mismo modelo', () => {
        const csv = `CODIGO_ESTILO,NOMBRE_MODELO,CATEGORIA,MARCA,COLOR,COSTO_BASE,PRECIO_BASE,S,M,L,XL
REM-101,Remera Lisa Urban,Remeras,Levis,Negro,4500,8900,5,10,10,5
REM-101,Remera Lisa Urban,Remeras,Levis,Blanco,4500,8900,4,8,8,4
PAN-204,Jean Regular Fit,Pantalones,Taverniti,Azul,9500,18500,0,4,6,6`;

        const result = parseMatrixCsv(csv);

        expect(result.totalModels).toBe(2);
        expect(result.sizeColumns).toEqual(['S', 'M', 'L', 'XL']);
        expect(result.totalVariants).toBe(2 * 4 + 1 * 4); // Remera (2 colores * 4 talles = 8) + Jean (1 color * 4 talles = 4) = 12

        // Verificar modelo Remera Lisa
        const remera = result.models.find((m) => m.styleCode === 'REM-101');
        expect(remera).toBeDefined();
        expect(remera?.name).toBe('Remera Lisa Urban');
        expect(remera?.categoryName).toBe('Remeras');
        expect(remera?.brandName).toBe('Levis');
        expect(remera?.variants.length).toBe(8);

        // Verificar variante Negro - S
        const negroS = remera?.variants.find((v) => v.color === 'Negro' && v.size === 'S');
        expect(negroS?.stock).toBe(5);
        expect(negroS?.price).toBe(8900);
        expect(negroS?.sku).toBe('REM-101-NEG-S');

        // Total stock units
        // Remera: Negro(5+10+10+5 = 30) + Blanco(4+8+8+4 = 24) = 54
        // Jean: Azul(0+4+6+6 = 16)
        // Total = 70
        expect(result.totalStockUnits).toBe(70);
    });

    it('arroja error si faltan columnas obligatorias de modelo o color', () => {
        const invalidCsv = `CATEGORIA,MARCA,S,M,L\nRemeras,Nike,1,2,3`;
        expect(() => parseMatrixCsv(invalidCsv)).toThrow(/obligatoria/i);
    });

    it('arroja error si no hay columnas de talles', () => {
        const noSizesCsv = `NOMBRE_MODELO,COLOR,COSTO\nRemera,Negro,500`;
        expect(() => parseMatrixCsv(noSizesCsv)).toThrow(/columna de talle/i);
    });
});
