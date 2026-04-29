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
    cost: number;
    price: number;
    profitMargin?: number;
    useCustomMargin?: boolean;
    stock: number;
    categoryId?: string | null;
    category?: Category | null;
    brandId?: string | null;
    brand?: Brand | null;
    isActive: boolean;
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
    cost: number;
    stock?: number;
    categoryId?: string | null;
    brandName?: string | null;
    isActive?: boolean;
    useCustomMargin?: boolean;
    customProfitMargin?: number;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> { }

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
