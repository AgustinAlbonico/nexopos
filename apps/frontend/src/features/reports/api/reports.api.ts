/**
 * API de Reportes
 * Funciones para comunicarse con el backend
 */
import { api } from '@/lib/axios';
import {
    ReportFilters,
    TopProductsFilters,
    ProductsByIdFilters,
    TopCustomersFilters,
    FinancialReport,
    SalesReport,
    ProductsReport,
    TopProduct,
    CustomersReport,
    TopCustomer,
    ExpensesReport,
    CashFlowReport,
    DashboardSummary,
} from '../types';

export const reportsApi = {
    /**
     * Obtiene resumen del dashboard
     */
    getDashboardSummary: async (): Promise<DashboardSummary> => {
        const response = await api.get<DashboardSummary>('/api/reports/dashboard');
        return response.data;
    },

    /**
     * Obtiene reporte financiero general
     */
    getFinancialReport: async (params?: ReportFilters): Promise<FinancialReport> => {
        const response = await api.get<FinancialReport>('/api/reports/financial', { params });
        return response.data;
    },

    /**
     * Obtiene reporte detallado de ventas
     */
    getSalesReport: async (params?: ReportFilters): Promise<SalesReport> => {
        const response = await api.get<SalesReport>('/api/reports/sales', { params });
        return response.data;
    },

    /**
     * Obtiene reporte de productos
     */
    getProductsReport: async (params?: ReportFilters): Promise<ProductsReport> => {
        const response = await api.get<ProductsReport>('/api/reports/products', { params });
        return response.data;
    },

    /**
     * Obtiene top productos más vendidos
     */
    getTopProducts: async (params?: TopProductsFilters): Promise<TopProduct[]> => {
        const response = await api.get<TopProduct[]>('/api/reports/top-products', { params });
        return response.data;
    },

    /**
     * Obtiene reporte de productos seleccionados por id
     */
    getProductsByIds: async (params: ProductsByIdFilters): Promise<TopProduct[]> => {
        const response = await api.get<TopProduct[]>('/api/reports/products-by-ids', {
            params: {
                ...params,
                productIds: params.productIds.join(','),
            },
        });
        return response.data;
    },

    /**
     * Obtiene reporte de clientes
     */
    getCustomersReport: async (params?: ReportFilters): Promise<CustomersReport> => {
        const response = await api.get<CustomersReport>('/api/reports/customers', { params });
        return response.data;
    },

    /**
     * Obtiene top clientes por volumen de compra
     */
    getTopCustomers: async (params?: TopCustomersFilters): Promise<TopCustomer[]> => {
        const response = await api.get<TopCustomer[]>('/api/reports/top-customers', { params });
        return response.data;
    },

    /**
     * Obtiene reporte de gastos
     */
    getExpensesReport: async (params?: ReportFilters): Promise<ExpensesReport> => {
        const response = await api.get<ExpensesReport>('/api/reports/expenses', { params });
        return response.data;
    },

    /**
     * Obtiene reporte de flujo de caja
     */
    getCashFlowReport: async (params?: ReportFilters): Promise<CashFlowReport> => {
        const response = await api.get<CashFlowReport>('/api/reports/cash-flow', { params });
        return response.data;
    },
};
