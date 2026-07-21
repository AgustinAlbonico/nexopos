/**
 * Hooks de React Query para Reportes
 */
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/reports.api';
import {
    ReportFilters,
    TopProductsFilters,
    ProductsByIdFilters,
    TopCustomersFilters,
    ReportPeriod,
} from '../types';

// Keys para React Query
export const reportsKeys = {
    all: ['reports'] as const,
    dashboard: () => [...reportsKeys.all, 'dashboard'] as const,
    financial: (filters?: ReportFilters) => [...reportsKeys.all, 'financial', filters] as const,
    sales: (filters?: ReportFilters) => [...reportsKeys.all, 'sales', filters] as const,
    products: (filters?: ReportFilters) => [...reportsKeys.all, 'products', filters] as const,
    topProducts: (filters?: TopProductsFilters) => [...reportsKeys.all, 'top-products', filters] as const,
    productsById: (filters?: ProductsByIdFilters) => [...reportsKeys.all, 'products-by-id', filters] as const,
    customers: (filters?: ReportFilters) => [...reportsKeys.all, 'customers', filters] as const,
    topCustomers: (filters?: TopCustomersFilters) => [...reportsKeys.all, 'top-customers', filters] as const,
    expenses: (filters?: ReportFilters) => [...reportsKeys.all, 'expenses', filters] as const,
    cashFlow: (filters?: ReportFilters) => [...reportsKeys.all, 'cash-flow', filters] as const,
};

/**
 * Hook para obtener resumen del dashboard
 */
export function useDashboardSummary() {
    return useQuery({
        queryKey: reportsKeys.dashboard(),
        queryFn: () => reportsApi.getDashboardSummary(),
        staleTime: 1000 * 60 * 2, // 2 minutos
        refetchInterval: 1000 * 60 * 5, // Refetch cada 5 minutos
    });
}

/**
 * Hook para obtener reporte financiero
 */
export function useFinancialReport(filters?: ReportFilters) {
    return useQuery({
        queryKey: reportsKeys.financial(filters),
        queryFn: () => reportsApi.getFinancialReport(filters),
        staleTime: 1000 * 60 * 5, // 5 minutos
    });
}

/**
 * Hook para obtener reporte de ventas
 */
export function useSalesReport(filters?: ReportFilters) {
    return useQuery({
        queryKey: reportsKeys.sales(filters),
        queryFn: () => reportsApi.getSalesReport(filters),
        staleTime: 1000 * 60 * 5,
    });
}

/**
 * Hook para obtener reporte de productos
 */
export function useProductsReport(filters?: ReportFilters) {
    return useQuery({
        queryKey: reportsKeys.products(filters),
        queryFn: () => reportsApi.getProductsReport(filters),
        staleTime: 1000 * 60 * 5,
    });
}

/**
 * Hook para obtener top productos
 */
export function useTopProducts(filters?: TopProductsFilters) {
    return useQuery({
        queryKey: reportsKeys.topProducts(filters),
        queryFn: () => reportsApi.getTopProducts(filters),
        staleTime: 1000 * 60 * 5,
    });
}

/**
 * Hook para obtener reporte de productos seleccionados por id
 */
export function useProductsByIdReport(filters?: ProductsByIdFilters) {
    return useQuery({
        queryKey: reportsKeys.productsById(filters),
        queryFn: () => reportsApi.getProductsByIds(filters!),
        enabled: Boolean(filters?.productIds && filters.productIds.length > 0),
        staleTime: 1000 * 60 * 5,
    });
}

/**
 * Hook para obtener reporte de clientes
 */
export function useCustomersReport(filters?: ReportFilters) {
    return useQuery({
        queryKey: reportsKeys.customers(filters),
        queryFn: () => reportsApi.getCustomersReport(filters),
        staleTime: 1000 * 60 * 5,
    });
}

/**
 * Hook para obtener top clientes
 */
export function useTopCustomers(filters?: TopCustomersFilters) {
    return useQuery({
        queryKey: reportsKeys.topCustomers(filters),
        queryFn: () => reportsApi.getTopCustomers(filters),
        staleTime: 1000 * 60 * 5,
    });
}

/**
 * Hook para obtener reporte de gastos
 */
export function useExpensesReport(filters?: ReportFilters) {
    return useQuery({
        queryKey: reportsKeys.expenses(filters),
        queryFn: () => reportsApi.getExpensesReport(filters),
        staleTime: 1000 * 60 * 5,
    });
}

/**
 * Hook para obtener reporte de flujo de caja
 */
export function useCashFlowReport(filters?: ReportFilters) {
    return useQuery({
        queryKey: reportsKeys.cashFlow(filters),
        queryFn: () => reportsApi.getCashFlowReport(filters),
        staleTime: 1000 * 60 * 5,
    });
}

/**
 * Helper para obtener etiquetas de períodos
 */
export const periodLabels: Record<ReportPeriod, string> = {
    [ReportPeriod.TODAY]: 'Hoy',
    [ReportPeriod.YESTERDAY]: 'Ayer',
    [ReportPeriod.THIS_WEEK]: 'Esta semana',
    [ReportPeriod.LAST_WEEK]: 'Semana pasada',
    [ReportPeriod.THIS_MONTH]: 'Este mes',
    [ReportPeriod.LAST_MONTH]: 'Mes pasado',
    [ReportPeriod.THIS_QUARTER]: 'Este trimestre',
    [ReportPeriod.LAST_QUARTER]: 'Trimestre pasado',
    [ReportPeriod.THIS_YEAR]: 'Este año',
    [ReportPeriod.LAST_YEAR]: 'Año pasado',
    [ReportPeriod.CUSTOM]: 'Personalizado',
};
