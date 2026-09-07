import { parseCatalogCsv, ParseResult } from './parser-csv';
import { CsvImportError } from './errors';

export interface MatrixParsedVariant {
    color: string;
    colorHex?: string;
    size: string;
    stock: number;
    cost?: number;
    price?: number;
    sku?: string;
    barcode?: string;
}

export interface MatrixParsedModel {
    styleCode?: string;
    name: string;
    categoryName?: string;
    brandName?: string;
    season?: string;
    collection?: string;
    cost?: number;
    price?: number;
    variants: MatrixParsedVariant[];
    line: number;
}

export interface MatrixParseResult {
    models: MatrixParsedModel[];
    totalModels: number;
    totalVariants: number;
    totalStockUnits: number;
    sizeColumns: string[];
    errors: Array<{ line: number; message: string }>;
}

const METADATA_COLUMN_ALIASES: Record<string, string> = {
    codigo_estilo: 'styleCode',
    codigoestilo: 'styleCode',
    stylecode: 'styleCode',
    estilo: 'styleCode',
    nombre_modelo: 'name',
    nombremodelo: 'name',
    nombre: 'name',
    name: 'name',
    modelo: 'name',
    categoria: 'categoryName',
    category: 'categoryName',
    categorianame: 'categoryName',
    marca: 'brandName',
    brand: 'brandName',
    brandname: 'brandName',
    temporada: 'season',
    season: 'season',
    coleccion: 'collection',
    collection: 'collection',
    color: 'color',
    hex_color: 'colorHex',
    hexcolor: 'colorHex',
    colorhex: 'colorHex',
    hex: 'colorHex',
    costo_base: 'cost',
    costobase: 'cost',
    costo: 'cost',
    cost: 'cost',
    precio_base: 'price',
    preciobase: 'price',
    precio: 'price',
    price: 'price',
};

/**
 * Normaliza un string de cabecera removiendo acentos, espacios y guiones bajos
 */
function normalizeHeaderName(header: string): string {
    return header
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s-_]+/g, '');
}

/**
 * Parsea un CSV en formato matricial 2D (Filas: Modelo/Color, Columnas: Talles)
 */
export function parseMatrixCsv(input: string): MatrixParseResult {
    const rawParsed = parseCatalogCsv(input);
    if (!rawParsed.header || rawParsed.header.length === 0) {
        throw new CsvImportError('EmptyDocument', 'El archivo no contiene encabezados válidos');
    }

    // 1. Identificar columnas de metadatos vs columnas de talles
    const metaColMap: Record<number, string> = {};
    const sizeColMap: Record<number, string> = {};
    const detectedSizes: string[] = [];

    rawParsed.header.forEach((colName, idx) => {
        const norm = normalizeHeaderName(colName);
        const mappedField = METADATA_COLUMN_ALIASES[norm];

        if (mappedField) {
            metaColMap[idx] = mappedField;
        } else {
            // Es una columna de talle (ej: T_S, T_38, o directo S, M, L, XL, 40)
            const cleanSize = colName.trim().replace(/^T_/i, '').toUpperCase();
            if (cleanSize) {
                sizeColMap[idx] = cleanSize;
                detectedSizes.push(cleanSize);
            }
        }
    });

    if (!Object.values(metaColMap).includes('name')) {
        throw new CsvImportError(
            'MissingRequiredField',
            'El archivo debe contener una columna obligatoria para el nombre del modelo (ej: NOMBRE_MODELO o NOMBRE)'
        );
    }

    if (!Object.values(metaColMap).includes('color')) {
        throw new CsvImportError(
            'MissingRequiredField',
            'El archivo debe contener una columna obligatoria para el color de la fila (ej: COLOR)'
        );
    }

    if (detectedSizes.length === 0) {
        throw new CsvImportError(
            'MissingHeader',
            'El archivo debe contener al menos una columna de talle (ej: S, M, L, XL o T_38, T_40)'
        );
    }

    // 2. Procesar filas y agrupar por modelo
    const modelsMap = new Map<string, MatrixParsedModel>();
    const errors: Array<{ line: number; message: string }> = [];

    rawParsed.rows.forEach(({ line, cells }) => {
        const rowData: Record<string, any> = {};
        Object.entries(metaColMap).forEach(([idxStr, fieldName]) => {
            const idx = Number(idxStr);
            rowData[fieldName] = (cells[idx] || '').trim();
        });

        const modelName = rowData.name;
        const colorName = rowData.color;

        if (!modelName) {
            errors.push({ line, message: 'La fila no tiene nombre de modelo' });
            return;
        }

        if (!colorName) {
            errors.push({ line, message: `La fila del modelo "${modelName}" no tiene especificado el color` });
            return;
        }

        const costNum = rowData.cost ? Number.parseFloat(rowData.cost) || undefined : undefined;
        const priceNum = rowData.price ? Number.parseFloat(rowData.price) || undefined : undefined;
        const styleCode = rowData.styleCode || undefined;
        const groupingKey = (styleCode || modelName).toUpperCase();

        let model = modelsMap.get(groupingKey);
        if (!model) {
            model = {
                styleCode,
                name: modelName,
                categoryName: rowData.categoryName || undefined,
                brandName: rowData.brandName || undefined,
                season: rowData.season || undefined,
                collection: rowData.collection || undefined,
                cost: costNum,
                price: priceNum,
                variants: [],
                line,
            };
            modelsMap.set(groupingKey, model);
        }

        // Para cada talle en la fila, generar la variante
        Object.entries(sizeColMap).forEach(([idxStr, sizeName]) => {
            const idx = Number(idxStr);
            const stockRaw = (cells[idx] || '').trim();
            const stockVal = stockRaw === '' ? 0 : Number.parseInt(stockRaw, 10) || 0;

            const baseSku = styleCode ? `${styleCode}-${colorName.substring(0, 3).toUpperCase()}-${sizeName}` : undefined;

            model!.variants.push({
                color: colorName,
                colorHex: rowData.colorHex || undefined,
                size: sizeName,
                stock: Math.max(0, stockVal),
                cost: costNum ?? model!.cost,
                price: priceNum ?? model!.price,
                sku: baseSku,
            });
        });
    });

    const models = Array.from(modelsMap.values());
    const totalVariants = models.reduce((acc, m) => acc + m.variants.length, 0);
    const totalStockUnits = models.reduce(
        (acc, m) => acc + m.variants.reduce((vAcc, v) => vAcc + v.stock, 0),
        0
    );

    return {
        models,
        totalModels: models.length,
        totalVariants,
        totalStockUnits,
        sizeColumns: detectedSizes,
        errors,
    };
}
