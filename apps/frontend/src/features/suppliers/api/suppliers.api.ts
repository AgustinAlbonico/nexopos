/**
 * API de proveedores
 * Servicios para comunicación con el backend
 */
import { api } from '@/lib/axios';
import {
    Supplier,
    SupplierFilters,
    SupplierStats,
    CreateSupplierDTO,
    UpdateSupplierDTO,
    PaginatedResponse,
} from '../types';

export const suppliersApi = {
    /**
     * Lista proveedores con filtros y paginación
     */
    getAll: async (params?: SupplierFilters) => {
        const response = await api.get<PaginatedResponse<Supplier>>('/api/suppliers', { params });
        return response.data;
    },

    /**
     * Lista proveedores activos (para selectores)
     */
    getActive: async () => {
        const response = await api.get<Supplier[]>('/api/suppliers/active');
        return response.data;
    },

    /**
     * Obtiene estadísticas de proveedores
     */
    getStats: async () => {
        const response = await api.get<SupplierStats>('/api/suppliers/stats');
        return response.data;
    },

    /**
     * Busca proveedores por nombre
     */
    search: async (term: string) => {
        const response = await api.get<Supplier[]>('/api/suppliers/search', {
            params: { term },
        });
        return response.data;
    },

    /**
     * Lista clasificaciones únicas de proveedores (para autocompletado)
     */
    getClassifications: async () => {
        const response = await api.get<string[]>('/api/suppliers/classifications');
        return response.data;
    },

    /**
     * Obtiene un proveedor por ID
     */
    getOne: async (id: string) => {
        const response = await api.get<Supplier>(`/api/suppliers/${id}`);
        return response.data;
    },

    /**
     * Crea un nuevo proveedor
     */
    create: async (data: CreateSupplierDTO) => {
        const response = await api.post<Supplier>('/api/suppliers', data);
        return response.data;
    },

    /**
     * Actualiza un proveedor
     */
    update: async (id: string, data: UpdateSupplierDTO) => {
        const response = await api.patch<Supplier>(`/api/suppliers/${id}`, data);
        return response.data;
    },

    /**
     * Desactiva un proveedor
     */
    delete: async (id: string) => {
        const response = await api.delete<{ message: string }>(`/api/suppliers/${id}`);
        return response.data;
    },
};
