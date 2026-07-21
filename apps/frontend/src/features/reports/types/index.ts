/**
 * Tipos para el módulo de reportes
 */

// Enums
export enum ReportPeriod {
    TODAY = 'today',
    YESTERDAY = 'yesterday',
    THIS_WEEK = 'this_week',
    LAST_WEEK = 'last_week',
    THIS_MONTH = 'this_month',
    LAST_MONTH = 'last_month',
    THIS_QUARTER = 'this_quarter',
    LAST_QUARTER = 'last_quarter',
    THIS_YEAR = 'this_year',
    LAST_YEAR = 'last_year',
    CUSTOM = 'custom',
}

// Filtros
export interface ReportFilters {
    startDate?: string;
    endDate?: string;
    period?: ReportPeriod;
}

export interface TopProductsFilters extends ReportFilters {
    limit?: number;
}

export interface ProductsByIdFilters extends ReportFilters {
    productIds: string[];
}

export interface TopCustomersFilters extends ReportFilters {
    limit?: number;
}

// Datos de Ingresos
export interface RevenueData {
    totalRevenue: number;
    totalSales: number;
    averageTicket: number;
    completedSales: number;
    pendingSales: number;
    cancelledSales: number;
}

// Datos de Costos
export interface CostsData {
    costOfGoodsSold: number;
    totalPurchases: number;
    paidPurchases: number;
    pendingPurchases: number;
}

// Datos de Gastos
export interface ExpenseCategoryData {
    categoryId: string | null;
    categoryName: string;
    count: number;
    total: number;
    percentage: number;
}

export interface ExpensesData {
    operatingExpenses: number;
    totalExpenses: number;
    paidExpenses: number;
    pendingExpenses: number;
    byCategory: ExpenseCategoryData[];
}

// Datos de Ingresos por Servicios
export interface IncomeCategoryData {
    categoryId: string | null;
    categoryName: string;
    count: number;
    total: number;
    percentage: number;
}

export interface IncomesData {
    totalServiceIncome: number;
    totalIncomes: number;
    paidIncomes: number;
    pendingIncomes: number;
    byCategory: IncomeCategoryData[];
}

// Datos de Rentabilidad
export interface ProfitabilityData {
    grossProfit: number;
    grossMargin: number;
    netProfit: number;
    netMargin: number;
    roi: number;
}

// Reporte Financiero
export interface FinancialReport {
    period: { startDate: string; endDate: string };
    revenue: RevenueData;
    incomes?: IncomesData;
    costs: CostsData;
    expenses: ExpensesData;
    profitability: ProfitabilityData;
    summary: {
        totalRevenue: number;
        totalServiceIncome?: number;
        totalCosts: number;
        netProfit: number;
        profitColor: 'green' | 'red' | 'yellow';
    };
}

// Datos de Ventas por Método de Pago
export interface PaymentMethodData {
    methodId: string;
    methodName: string;
    total: number;
    count: number;
    percentage: number;
}

// Datos Diarios
export interface DailyData {
    date: string;
    revenue: number;
    salesCount: number;
}

// Reporte de Ventas
export interface SalesReport {
    period: { startDate: string; endDate: string };
    current: {
        totalRevenue: number;
        totalSales: number;
        averageTicket: number;
        byPaymentMethod: PaymentMethodData[];
        byStatus: Record<string, number>;
    };
    previous: {
        period: { startDate: string; endDate: string };
        totalRevenue: number;
        totalSales: number;
        averageTicket: number;
    };
    growth: {
        revenueGrowth: number;
        salesGrowth: number;
        ticketGrowth: number;
    };
    dailyData: DailyData[];
}

// Top Producto
export interface TopProduct {
    productId: string;
    productName: string;
    productSku: string | null;
    quantitySold: number;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
}

// Producto de Baja Rotación
export interface LowRotationProduct {
    productId: string;
    productName: string;
    stock: number;
    lastSaleDate: string | null;
    daysSinceLastSale: number;
}

// Estadísticas de Inventario
export interface InventoryStats {
    totalProducts: number;
    productsWithStock: number;
    productsOutOfStock: number;
    productsLowStock: number;
    totalStockValue: number;
    totalSaleValue: number;
}

// Reporte de Productos
export interface ProductsReport {
    period: { startDate: string; endDate: string };
    topProducts: TopProduct[];
    lowRotationProducts: LowRotationProduct[];
    inventory: InventoryStats;
}

// Top Cliente
export interface TopCustomer {
    customerId: string;
    customerName: string;
    email: string | null;
    phone: string | null;
    totalPurchases: number;
    totalAmount: number;
    averageTicket: number;
    lastPurchaseDate: string;
}

// Deudor
export interface TopDebtor {
    customerId: string;
    customerName: string;
    balance: number;
    daysOverdue: number;
}

// Estadísticas de Cuentas
export interface AccountsStats {
    totalAccounts: number;
    activeAccounts: number;
    totalDebt: number;
    averageDebt: number;
    overdueAccounts: number;
    topDebtors: TopDebtor[];
}

// Reporte de Clientes
export interface CustomersReport {
    period: { startDate: string; endDate: string };
    topCustomers: TopCustomer[];
    accountsStats: AccountsStats;
    newCustomers: number;
    returningCustomers: number;
}

// Tendencia Mensual
export interface MonthlyTrend {
    month: string;
    total: number;
}

// Reporte de Gastos
export interface ExpensesReport {
    period: { startDate: string; endDate: string };
    current: {
        totalAmount: number;
        totalCount: number;
        byCategory: ExpenseCategoryData[];
        monthlyTrend: MonthlyTrend[];
    };
    previous: {
        period: { startDate: string; endDate: string };
        totalAmount: number;
        totalCount: number;
    };
    growth: {
        amountGrowth: number;
        countGrowth: number;
    };
}

// Datos de Flujo de Caja por Día
export interface CashFlowDay {
    date: string;
    income: number;
    expense: number;
    net: number;
    cumulative: number;
}

// Reporte de Flujo de Caja
export interface CashFlowReport {
    period: { startDate: string; endDate: string };
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    byDay: CashFlowDay[];
}

// Dashboard Summary
export interface DashboardSummary {
    today: {
        sales: { revenue: number; count: number };
        expenses: { amount: number; count: number };
        purchases: { amount: number; count: number };
        netCashFlow: number;
    };
    week: {
        sales: { revenue: number; count: number; growth: number };
        expenses: { amount: number; count: number; growth: number };
    };
    month: {
        sales: { revenue: number; count: number; growth: number };
        expenses: { amount: number; count: number; growth: number };
        netProfit: number;
        netMargin: number;
    };
    inventory: {
        totalProducts: number;
        lowStock: number;
        outOfStock: number;
        totalValue: number;
    };
    accounts: {
        totalDebt: number;
        overdueAccounts: number;
    };
    // Nuevos campos para dashboard profesional
    cashRegister: {
        isOpen: boolean;
        balance: number;
        openedBy: string | null;
        openedAt: string | null;
    };
    charts: {
        last7Days: Array<{
            date: string;
            revenue: number;
            salesCount: number;
        }>;
    };
    topProducts: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
    }>;
    alerts: {
        cashClosed: boolean;
        lowStockCount: number;
        outOfStockCount: number;
        overdueAccountsCount: number;
    };
}

