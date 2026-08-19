import { api } from '@/lib/axios';
import {
    Product,
    CreateProductDTO,
    UpdateProductDTO,
    ProductFilters,
    Category,
    CreateCategoryDTO,
    UpdateCategoryDTO,
    Brand,
    CategoryDeletionPreview,
    LocalBarcodeLayout,
    VariableBarcodeResolution,
    CreateApparelMatrixProductDTO,
    SizeScaleTemplate,
    ColorPaletteTemplate,
} from '../types';

export const brandsApi = {
    search: async (query: string) => {
        const response = await api.get<Brand[]>('/api/brands/search', { params: { q: query } });
        return response.data;
    },
    getAll: async () => {
        const response = await api.get<Brand[]>('/api/brands');
        return response.data;
    },
    getProductCount: async (id: string) => {
        const response = await api.get<{ count: number }>(`/api/brands/${id}/product-count`);
        return response.data;
    },
    update: async (id: string, name: string) => {
        const response = await api.patch<Brand>(`/api/brands/${id}`, { name });
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete<{ message: string; productsAffected: number }>(`/api/brands/${id}`);
        return response.data;
    },
};

export const productsApi = {
    getAll: async (params?: ProductFilters) => {
        const response = await api.get<{
            data: Product[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }>('/api/products', { params });
        return response.data;
    },

    getOne: async (id: string) => {
        const response = await api.get<Product>(`/api/products/${id}`);
        return response.data;
    },

    create: async (data: CreateProductDTO) => {
        const cleanData = Object.fromEntries(
            Object.entries(data).filter(([_, v]) => v !== null && v !== undefined)
        );
        const response = await api.post<Product>('/api/products', cleanData);
        return response.data;
    },

    createMatrix: async (data: CreateApparelMatrixProductDTO) => {
        const response = await api.post<{ parent: Product; variants: Product[]; totalVariants: number }>(
            '/api/products/matrix',
            data
        );
        return response.data;
    },

    update: async (id: string, data: UpdateProductDTO) => {
        const cleanData = Object.fromEntries(
            Object.entries(data).filter(([_, v]) => v !== null && v !== undefined)
        );
        const response = await api.patch<Product>(`/api/products/${id}`, cleanData);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete<{ message: string }>(`/api/products/${id}`);
        return response.data;
    },

    calculatePrice: async (data: { cost: number; profitMargin: number }) => {
        const response = await api.post<{ price: number }>('/api/products/calculate-price', data);
        return response.data;
    },

    findByBarcode: async (barcode: string): Promise<Product | null> => {
        const response = await api.get<Product>(`/api/products/barcode/${barcode}`);
        return response.data;
    },

    resolveVariableBarcode: async (barcode: string, layout: LocalBarcodeLayout): Promise<VariableBarcodeResolution | null> => {
        const response = await api.post<VariableBarcodeResolution | null>('/api/products/variable-barcode/resolve', { barcode, layout });
        return response.data;
    },

    generateVariants: async (id: string, attributes: Record<string, string[]>) => {
        const response = await api.post<Product[]>(`/api/products/${id}/variants/generate`, { attributes });
        return response.data;
    },

    getApparelSuggestions: async () => {
        const response = await api.get<{ seasons: string[]; collections: string[] }>('/api/products/apparel/suggestions');
        return response.data;
    },
};

export const categoriesApi = {
    getAll: async () => {
        const response = await api.get<Category[]>('/api/categories');
        return response.data;
    },

    getActive: async () => {
        const response = await api.get<Category[]>('/api/categories/active');
        return response.data;
    },

    create: async (data: CreateCategoryDTO) => {
        const response = await api.post<Category>('/api/categories', data);
        return response.data;
    },

    update: async (id: string, data: UpdateCategoryDTO) => {
        const response = await api.patch<Category>(`/api/categories/${id}`, data);
        return response.data;
    },

    getDeletionPreview: async (id: string) => {
        const response = await api.get<CategoryDeletionPreview>(`/api/categories/${id}/deletion-preview`);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete<{ message: string }>(`/api/categories/${id}`);
        return response.data;
    },
};

export const sizeScalesApi = {
    getAll: async () => {
        const response = await api.get<SizeScaleTemplate[]>('/api/products/size-scales');
        return response.data;
    },
    create: async (data: { name: string; category?: string | null; sizes: string[]; sortOrder?: number }) => {
        const response = await api.post<SizeScaleTemplate>('/api/products/size-scales', data);
        return response.data;
    },
    update: async (id: string, data: { name: string; category?: string | null; sizes: string[]; sortOrder?: number }) => {
        const response = await api.put<SizeScaleTemplate>(`/api/products/size-scales/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete<{ message: string }>(`/api/products/size-scales/${id}`);
        return response.data;
    },
};

export const colorPalettesApi = {
    getAll: async () => {
        const response = await api.get<ColorPaletteTemplate[]>('/api/products/color-palettes');
        return response.data;
    },
    create: async (data: { name: string; colors: Array<{ name: string; hex: string; border?: boolean }>; sortOrder?: number }) => {
        const response = await api.post<ColorPaletteTemplate>('/api/products/color-palettes', data);
        return response.data;
    },
    update: async (id: string, data: { name: string; colors: Array<{ name: string; hex: string; border?: boolean }>; sortOrder?: number }) => {
        const response = await api.put<ColorPaletteTemplate>(`/api/products/color-palettes/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete<{ message: string }>(`/api/products/color-palettes/${id}`);
        return response.data;
    },
};

export interface MatrixPreviewResponse {
    models: Array<{
        styleCode?: string;
        name: string;
        categoryName?: string;
        brandName?: string;
        season?: string;
        collection?: string;
        cost?: number;
        price?: number;
        variants: Array<{
            color: string;
            colorHex?: string;
            size: string;
            stock: number;
            cost?: number;
            price?: number;
            sku?: string;
        }>;
        line: number;
    }>;
    totalModels: number;
    totalVariants: number;
    totalStockUnits: number;
    sizeColumns: string[];
    errors: Array<{ line: number; message: string }>;
}

export const matrixImportApi = {
    downloadTemplate: async () => {
        const response = await api.get('/api/products/matrix-import/template', { responseType: 'blob' });
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'plantilla_matriz_indumentaria.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
    },
    preview: async (csv: string): Promise<MatrixPreviewResponse> => {
        const response = await api.post<MatrixPreviewResponse>('/api/products/matrix-import/preview', { csv });
        return response.data;
    },
    commit: async (csv: string): Promise<{ success: boolean; importedModels: number; importedVariants: number; totalStockUnits: number }> => {
        const response = await api.post('/api/products/matrix-import/commit', { csv });
        return response.data;
    },
};

