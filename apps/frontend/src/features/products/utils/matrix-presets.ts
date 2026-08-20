export interface SizeRunPreset {
    key: string;
    label: string;
    description: string;
    sizes: string[];
}

export interface ColorPreset {
    name: string;
    hex: string;
    border?: boolean;
}

export const SIZE_RUN_PRESETS: SizeRunPreset[] = [
    {
        key: 'adult_letter',
        label: 'Adultos (XS a XXL)',
        description: 'Talles estándar en letras para remeras, buzos, camperas',
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    },
    {
        key: 'pants_numeric',
        label: 'Pantalones / Jeans (38 a 50)',
        description: 'Numeración estándar para pantalones y bermudas',
        sizes: ['38', '40', '42', '44', '46', '48', '50'],
    },
    {
        key: 'footwear_adult',
        label: 'Calzado Adultos (37 a 44)',
        description: 'Numeración estándar de zapatillas y zapatos',
        sizes: ['37', '38', '39', '40', '41', '42', '43', '44'],
    },
    {
        key: 'kids_clothing',
        label: 'Ropa Infantil (4 a 14)',
        description: 'Talles para niños y preadolescentes',
        sizes: ['4', '6', '8', '10', '12', '14'],
    },
    {
        key: 'footwear_kids',
        label: 'Calzado Infantil (22 a 32)',
        description: 'Numeración para calzado de niños',
        sizes: ['22', '24', '26', '28', '30', '32'],
    },
    {
        key: 'baby_months',
        label: 'Bebés (0M a 18M)',
        description: 'Talles por mes para recién nacidos y bebés',
        sizes: ['0M', '3M', '6M', '9M', '12M', '18M'],
    },
];

export const COLOR_PRESETS: ColorPreset[] = [
    { name: 'Negro', hex: '#18181b' },
    { name: 'Blanco', hex: '#ffffff', border: true },
    { name: 'Gris Melange', hex: '#94a3b8' },
    { name: 'Azul Marino', hex: '#1e3a8a' },
    { name: 'Azul Francia', hex: '#2563eb' },
    { name: 'Celeste', hex: '#38bdf8' },
    { name: 'Rojo', hex: '#dc2626' },
    { name: 'Bordo', hex: '#881337' },
    { name: 'Verde Militar', hex: '#3f6212' },
    { name: 'Verde Esmeralda', hex: '#059669' },
    { name: 'Beige / Arena', hex: '#d6d3d1' },
    { name: 'Marrón', hex: '#78350f' },
    { name: 'Rosa Pastel', hex: '#f472b6' },
    { name: 'Mostaza', hex: '#eab308' },
    { name: 'Naranja', hex: '#ea580c' },
];

export interface DistributionCurve {
    key: string;
    label: string;
    ratio: number[];
}

export const DISTRIBUTION_CURVES: DistributionCurve[] = [
    { key: '1-2-2-1', label: 'Curva 1-2-2-1 (Más M/L)', ratio: [1, 2, 2, 1] },
    { key: '2-3-3-2', label: 'Curva 2-3-3-2 (Volumen M/L)', ratio: [2, 3, 3, 2] },
    { key: '1-1-1-1', label: 'Curva 1-1-1-1 (Equitativa 1)', ratio: [1, 1, 1, 1] },
    { key: '2-2-2-2', label: 'Curva 2-2-2-2 (Equitativa 2)', ratio: [2, 2, 2, 2] },
];

/**
 * Aplica una curva de ratio a una lista de talles
 */
export function calculateCurveStock(
    sizesCount: number,
    ratio: number[],
    multiplier = 1
): number[] {
    if (sizesCount <= 0) return [];
    
    // Si la cantidad de talles coincide con el ratio, usar directo
    if (sizesCount === ratio.length) {
        return ratio.map((r) => r * multiplier);
    }

    // Si hay más o menos talles, distribuir proporcionalmente o repetir el patrón central
    const result: number[] = [];
    for (let i = 0; i < sizesCount; i++) {
        const ratioIndex = Math.floor((i / sizesCount) * ratio.length);
        result.push((ratio[ratioIndex] || 1) * multiplier);
    }
    return result;
}

/**
 * Genera un SKU determinístico estructurado
 */
export function generateStructuredSku(
    styleCode: string | undefined | null,
    colorName: string,
    sizeName: string
): string {
    const base = (styleCode?.trim() || 'PROD').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanColor = colorName
        .trim()
        .substring(0, 3)
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const cleanSize = sizeName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return `${base}-${cleanColor}-${cleanSize}`;
}
