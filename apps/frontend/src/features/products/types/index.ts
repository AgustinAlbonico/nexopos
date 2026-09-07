export interface Brand {
    id: string;
    name: string;
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    sku?: string;
    barcode?: string;
    isMeasure?: boolean;
    tareGrams?: number | null;
    variableBarcodeFormat?: 'gs1_weight' | 'gs1_price' | 'local_weight' | 'local_price' | null;
    cost: number | null;
    price: number;
    profitMargin?: number;
    useCustomMargin?: boolean;
    useManualPrice?: boolean;
    stock: number;
    categoryId?: string | null;
    category?: Category | null;
    brandId?: string | null;
    brand?: Brand | null;
    isActive: boolean;
    isVariantParent?: boolean;
    parentProductId?: string | null;
    variants?: Product[];
    variantAttributes?: ProductVariantAttribute[];
    season?: string | null;
    collection?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Category {
    id: string;
    name: string;
    description?: string;
    color?: string;
    profitMargin?: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateProductDTO {
    name: string;
    description?: string | null;
    barcode?: string | null;
    isMeasure?: boolean;
    tareGrams?: number | null;
    variableBarcodeFormat?: 'gs1_weight' | 'gs1_price' | 'local_weight' | 'local_price' | null;
    cost?: number | null;
    price?: number;
    stock?: number;
    categoryId?: string | null;
    brandName?: string | null;
    isActive?: boolean;
    useManualPrice?: boolean;
    useCustomMargin?: boolean;
    customProfitMargin?: number;
    season?: string | null;
    collection?: string | null;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> { }

export interface LocalBarcodeLayout {
    prefix: string;
    productCodeRange: { from: number; to: number };
    valueRange: { from: number; to: number };
    valueType: 'weight' | 'price';
    decimalPlaces: number;
    checkDigit: boolean;
}

export interface ProductVariantAttribute {
    id: string;
    attributeKey: string;
    attributeValue: string;
}

export interface VariableBarcodeResolution {
    product: Product;
    variable: { kind: 'weight'; quantity: number; productCode: string } | { kind: 'price'; amount: number; productCode: string };
}

export interface ProductFilters {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    brandId?: string;
    isActive?: boolean;
    stockStatus?: 'all' | 'critical';
    sortBy?: 'name' | 'price' | 'cost' | 'stock' | 'createdAt';
    order?: 'ASC' | 'DESC';
    excludeVariantParents?: boolean;
}

export interface CreateCategoryDTO {
    name: string;
    description?: string;
    color?: string;
    profitMargin?: number | null;
    isActive?: boolean;
}

export interface UpdateCategoryDTO extends Partial<CreateCategoryDTO> { }

export interface CategoryDeletionPreview {
    productCount: number;
    affectedProductsCount: number;
    globalMargin: number;
}

// Tipos de Inventario
export enum StockMovementType {
    IN = 'IN',
    OUT = 'OUT',
}

export enum StockMovementSource {
    INITIAL_LOAD = 'INITIAL_LOAD',
    PURCHASE = 'PURCHASE',
    SALE = 'SALE',
    ADJUSTMENT = 'ADJUSTMENT',
    RETURN = 'RETURN',
}

export interface StockMovement {
    id: string;
    productId: string;
    product?: Product;
    type: StockMovementType;
    source: StockMovementSource;
    quantity: number;
    cost?: number;
    provider?: string;
    referenceId?: string;
    notes?: string;
    date: string;
    createdAt: string;
}

export interface CreateStockMovementDTO {
    productId: string;
    type: StockMovementType;
    source?: StockMovementSource;
    quantity: number;
    cost?: number;
    provider?: string;
    referenceId?: string;
    notes?: string;
    date: string;
}

export interface InventoryStats {
    totalProducts: number;
    productsWithStock: number;
    productsOutOfStock: number;
    productsLowStock: number;
    totalInventoryValue: number;
    totalInventorySaleValue: number;
}

export interface ProductStock {
    id: string;
    name: string;
    sku?: string;
    stock: number;
    cost: number;
    price: number;
    categoryId?: string;
}

export interface ApparelMatrixCellDTO {
    color: string;
    size: string;
    colorHex?: string;
    sku?: string | null;
    barcode?: string | null;
    stock: number;
    cost?: number | null;
    price?: number | null;
    customProfitMargin?: number | null;
}

export interface CreateApparelMatrixProductDTO {
    name: string;
    styleCode?: string | null;
    description?: string | null;
    categoryId?: string | null;
    brandName?: string | null;
    season?: string | null;
    collection?: string | null;
    composition?: string | null;
    careInstructions?: string | null;
    originCountry?: string | null;
    returnPolicy?: 'standard' | 'final_sale' | 'size_exchange_only' | 'time_limited' | null;
    imageUrl?: string | null;
    cost?: number | null;
    price?: number | null;
    profitMargin?: number | null;
    useCustomMargin?: boolean;
    useManualPrice?: boolean;
    matrixCells: ApparelMatrixCellDTO[];
}

export interface SizeScaleTemplate {
    id: string;
    name: string;
    category?: string | null;
    sizes: string[];
    isSystemPreset: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface ColorPaletteItem {
    name: string;
    hex: string;
    border?: boolean;
}

export interface ColorPaletteTemplate {
    id: string;
    name: string;
    colors: ColorPaletteItem[];
    isSystemPreset: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

