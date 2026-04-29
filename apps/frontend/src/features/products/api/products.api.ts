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
        const response = await api.post<Product>('/api/products', data);
        return response.data;
    },

    update: async (id: string, data: UpdateProductDTO) => {
        const response = await api.patch<Product>(`/api/products/${id}`, data);
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
