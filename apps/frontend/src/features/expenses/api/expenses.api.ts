/**
 * API de gastos
 * Funciones para comunicarse con el backend
 */
import { api } from '@/lib/axios';
import {
    Expense,
    ExpenseCategory,
    CreateExpenseDTO,
    UpdateExpenseDTO,
    CreateExpenseCategoryDTO,
    UpdateExpenseCategoryDTO,
    ExpenseFilters,
    ExpenseStats,
    PaginatedExpenses,
    RecurringSuggestion,
} from '../types';

export const expensesApi = {
    /**
     * Obtiene gastos con filtros y paginación
     */
    getAll: async (params?: ExpenseFilters): Promise<PaginatedExpenses> => {
        const response = await api.get<PaginatedExpenses>('/api/expenses', { params });
        return response.data;
    },

    /**
     * Obtiene un gasto por ID
     */
    getOne: async (id: string): Promise<Expense> => {
        const response = await api.get<Expense>(`/api/expenses/${id}`);
        return response.data;
    },

    /**
     * Crea un nuevo gasto
     */
    create: async (data: CreateExpenseDTO): Promise<Expense> => {
        const response = await api.post<Expense>('/api/expenses', data);
        return response.data;
    },

    /**
     * Actualiza un gasto
     */
    update: async (id: string, data: UpdateExpenseDTO): Promise<Expense> => {
        const response = await api.patch<Expense>(`/api/expenses/${id}`, data);
        return response.data;
    },

    /**
     * Elimina un gasto
     */
    delete: async (id: string): Promise<{ message: string }> => {
        const response = await api.delete<{ message: string }>(`/api/expenses/${id}`);
        return response.data;
    },

    /**
     * Marca un gasto como pagado
     */
    markAsPaid: async (id: string, paymentMethodId: string): Promise<Expense> => {
        const response = await api.patch<Expense>(`/api/expenses/${id}/mark-paid`, { paymentMethodId });
        return response.data;
    },

    /**
     * Obtiene estadísticas de gastos
     */
    getStats: async (startDate?: string, endDate?: string): Promise<ExpenseStats> => {
        const params: Record<string, string> = {};
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const response = await api.get<ExpenseStats>('/api/expenses/stats', { params });
        return response.data;
    },

    /**
     * FIX 2.2: Obtiene sugerencias de gastos recurrentes del mes actual
     */
    getRecurringSuggestions: async (): Promise<RecurringSuggestion[]> => {
        const response = await api.get<RecurringSuggestion[]>('/api/expenses/recurring-suggestions');
        return response.data;
    },
};

export const expenseCategoriesApi = {
    /**
     * Obtiene todas las categorías
     */
    getAll: async (): Promise<ExpenseCategory[]> => {
        const response = await api.get<ExpenseCategory[]>('/api/expense-categories');
        return response.data;
    },

    /**
     * Obtiene una categoría por ID
     */
    getOne: async (id: string): Promise<ExpenseCategory> => {
        const response = await api.get<ExpenseCategory>(`/api/expense-categories/${id}`);
        return response.data;
    },

    /**
     * Crea una nueva categoría
     */
    create: async (data: CreateExpenseCategoryDTO): Promise<ExpenseCategory> => {
        const response = await api.post<ExpenseCategory>('/api/expense-categories', data);
        return response.data;
    },

    /**
     * Actualiza una categoría
     */
    update: async (id: string, data: UpdateExpenseCategoryDTO): Promise<ExpenseCategory> => {
        const response = await api.patch<ExpenseCategory>(`/api/expense-categories/${id}`, data);
        return response.data;
    },

    /**
     * Elimina una categoría
     */
    delete: async (id: string): Promise<{ message: string }> => {
        const response = await api.delete<{ message: string }>(`/api/expense-categories/${id}`);
        return response.data;
    },

    /**
     * Inicializa categorías por defecto
     */
    seed: async (): Promise<{ message: string; created: number }> => {
        const response = await api.post<{ message: string; created: number }>('/api/expense-categories/seed');
        return response.data;
    },
};

