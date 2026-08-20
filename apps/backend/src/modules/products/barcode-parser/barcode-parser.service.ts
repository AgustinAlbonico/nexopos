export interface LocalBarcodeLayout {
    readonly prefix: string;
    readonly productCodeRange: { readonly from: number; readonly to: number };
    readonly valueRange: { readonly from: number; readonly to: number };
    readonly valueType: 'weight' | 'price';
    readonly decimalPlaces: number;
    readonly checkDigit: boolean;
}

export type VariableBarcode =
    | { readonly kind: 'weight'; readonly quantity: number; readonly productCode?: string }
    | { readonly kind: 'price'; readonly amount: number; readonly productCode?: string };

export function parseVariableBarcode(barcode: string, layout?: LocalBarcodeLayout): VariableBarcode | null {
    const gs1Weight = /^310(\d)(\d{6})$/.exec(barcode);
    if (gs1Weight) {
        return { kind: 'weight', quantity: Number(gs1Weight[2]) / 10 ** Number(gs1Weight[1]) };
    }

    const gs1Price = /^392(\d)(\d+)$/.exec(barcode);
    if (gs1Price) {
        return { kind: 'price', amount: Number(gs1Price[2]) / 10 ** Number(gs1Price[1]) };
    }

    const gs1PriceWithCurrency = /^393(\d)\d{3}(\d+)$/.exec(barcode);
    if (gs1PriceWithCurrency) {
        return { kind: 'price', amount: Number(gs1PriceWithCurrency[2]) / 10 ** Number(gs1PriceWithCurrency[1]) };
    }

    if (!layout || !/^\d{13}$/.test(barcode) || !barcode.startsWith(layout.prefix)) return null;
    if (layout.checkDigit && ean13CheckDigit(barcode.slice(0, -1)) !== Number(barcode.at(-1))) return null;

    const productCode = barcode.slice(layout.productCodeRange.from, layout.productCodeRange.to + 1);
    const value = Number(barcode.slice(layout.valueRange.from, layout.valueRange.to + 1)) / 10 ** layout.decimalPlaces;
    if (!productCode || !Number.isFinite(value)) return null;

    return layout.valueType === 'weight'
        ? { kind: 'weight', productCode, quantity: value }
        : { kind: 'price', productCode, amount: value };
}

function ean13CheckDigit(digits: string): number {
    const sum = [...digits].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
    return (10 - (sum % 10)) % 10;
}
