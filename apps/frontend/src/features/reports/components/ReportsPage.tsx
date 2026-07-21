/**
 * Página principal de Reportes
 * Dashboard completo con análisis financieros y operativos
 */
import { useState } from 'react';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    Package,
    Users,
    Wallet,
    CreditCard,
    FileSpreadsheet,
    Printer,
    ArrowUpRight,
    ArrowDownRight,
    AlertTriangle,
    BarChart3,
    Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/utils';

// Componentes
import { PeriodSelector } from './PeriodSelector';
import { MetricCard } from './MetricCard';
import { PieChartCard, BarChartCard, LineChartCard, ComposedChartCard } from './Charts';
import { TopProductsTable } from './TopProductsTable';
import { TopCustomersTable } from './TopCustomersTable';
import { ProductsByIdSelector } from './ProductsByIdSelector';

// Hooks
import {
    useDashboardSummary,
    useFinancialReport,
    useSalesReport,
    useProductsReport,
    useCustomersReport,
    useExpensesReport,
    useCashFlowReport,
    useProductsByIdReport,
} from '../hooks/useReports';

// Tipos y utilidades
import { ReportPeriod, ReportFilters, ProductsByIdFilters } from '../types';
import {
    exportFinancialToCSV,
    exportSalesToCSV,
    exportProductsToCSV,
    exportCustomersToCSV,
    exportExpensesToCSV,
    printReport,
} from '../utils/export';

export function ReportsPage() {
    const [activeTab, setActiveTab] = useState('overview');
    const [period, setPeriod] = useState<ReportPeriod>(ReportPeriod.THIS_MONTH);
    const [customDates, setCustomDates] = useState<{ start?: string; end?: string }>({});
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

    // Construir filtros basados en período
    const filters: ReportFilters = {
        period: period !== ReportPeriod.CUSTOM ? period : undefined,
        startDate: period === ReportPeriod.CUSTOM ? customDates.start : undefined,
        endDate: period === ReportPeriod.CUSTOM ? customDates.end : undefined,
    };

    const productsByIdFilters: ProductsByIdFilters | undefined = selectedProductIds.length > 0
        ? { ...filters, productIds: selectedProductIds }
        : undefined;

    // Hooks de datos
    const { data: dashboard, isLoading: loadingDashboard } = useDashboardSummary();
    const { data: financial, isLoading: loadingFinancial } = useFinancialReport(filters);
    const { data: sales, isLoading: loadingSales } = useSalesReport(filters);
    const { data: products, isLoading: loadingProducts } = useProductsReport(filters);
    const { data: customers, isLoading: loadingCustomers } = useCustomersReport(filters);
    const { data: expenses, isLoading: loadingExpenses } = useExpensesReport(filters);
    const { data: cashFlow, isLoading: loadingCashFlow } = useCashFlowReport(filters);
    const { data: selectedProductsReport, isLoading: loadingSelectedProducts } = useProductsByIdReport(productsByIdFilters);

    // Handlers
    const handlePeriodChange = (newPeriod: ReportPeriod, start?: string, end?: string) => {
        setPeriod(newPeriod);
        if (newPeriod === ReportPeriod.CUSTOM) {
            setCustomDates({ start, end });
        }
    };

    const handleExport = () => {
        switch (activeTab) {
            case 'overview':
            case 'financial':
                if (financial) exportFinancialToCSV(financial);
                break;
            case 'sales':
                if (sales) exportSalesToCSV(sales);
                break;
            case 'products':
                if (products) exportProductsToCSV(products);
                break;
            case 'customers':
                if (customers) exportCustomersToCSV(customers);
                break;
            case 'expenses':
                if (expenses) exportExpensesToCSV(expenses);
                break;
        }
    };

    return (
        <div className="space-y-6 print:space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
                    <p className="text-muted-foreground">Análisis financiero y operativo del negocio</p>
                </div>
                <div className="flex items-center gap-2">
                    <PeriodSelector
                        period={period}
                        startDate={customDates.start}
                        endDate={customDates.end}
                        onChange={handlePeriodChange}
                    />
                    <Button variant="outline" size="icon" onClick={handleExport} title="Exportar a Excel">
                        <FileSpreadsheet className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={printReport} title="Imprimir">
                        <Printer className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Dashboard Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Ventas Hoy"
                    value={dashboard?.today.sales.revenue || 0}
                    subtitle={`${dashboard?.today.sales.count || 0} ventas`}
                    icon={DollarSign}
                    variant="success"
                    isLoading={loadingDashboard}
                />
                <MetricCard
                    title="Ventas del Mes"
                    value={dashboard?.month.sales.revenue || 0}
                    subtitle={`${dashboard?.month.sales.count || 0} ventas`}
                    icon={TrendingUp}
                    trend={dashboard?.month.sales.growth}
                    variant="success"
                    isLoading={loadingDashboard}
                />
                <MetricCard
                    title="Resultado Neto"
                    value={dashboard?.month.netProfit || 0}
                    subtitle={`Margen: ${(dashboard?.month.netMargin || 0).toFixed(1)}%`}
                    icon={dashboard?.month.netProfit && dashboard.month.netProfit >= 0 ? TrendingUp : TrendingDown}
                    variant={dashboard?.month.netProfit && dashboard.month.netProfit >= 0 ? 'success' : 'danger'}
                    isLoading={loadingDashboard}
                />
                <MetricCard
                    title="Deuda Clientes"
                    value={dashboard?.accounts.totalDebt || 0}
                    subtitle={`${dashboard?.accounts.overdueAccounts || 0} vencidas`}
                    icon={CreditCard}
                    variant={dashboard?.accounts.overdueAccounts && dashboard.accounts.overdueAccounts > 0 ? 'warning' : 'default'}
                    isLoading={loadingDashboard}
                />
            </div>

            {/* Tabs de Reportes */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
                <TabsList className="grid grid-cols-6 w-full">
                    <TabsTrigger value="overview">Resumen</TabsTrigger>
                    <TabsTrigger value="sales">Ventas</TabsTrigger>
                    <TabsTrigger value="products">Productos</TabsTrigger>
                    <TabsTrigger value="customers">Clientes</TabsTrigger>
                    <TabsTrigger value="expenses">Gastos</TabsTrigger>
                    <TabsTrigger value="cashflow">Flujo de Caja</TabsTrigger>
                </TabsList>

                {/* TAB: RESUMEN FINANCIERO */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Métricas principales */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <MetricCard
                            title="Ingresos Ventas"
                            value={financial?.revenue.totalRevenue || 0}
                            subtitle={`${financial?.revenue.totalSales || 0} ventas`}
                            icon={DollarSign}
                            variant="success"
                            isLoading={loadingFinancial}
                        />
                        <MetricCard
                            title="Ingresos Servicios"
                            value={financial?.incomes?.totalServiceIncome || 0}
                            subtitle={`${financial?.incomes?.paidIncomes || 0} ingresos`}
                            icon={Briefcase}
                            variant="success"
                            isLoading={loadingFinancial}
                        />
                        <MetricCard
                            title="Costo Mercadería"
                            value={financial?.costs.costOfGoodsSold || 0}
                            subtitle={`${financial?.costs.paidPurchases || 0} compras`}
                            icon={ShoppingCart}
                            variant="warning"
                            isLoading={loadingFinancial}
                        />
                        <MetricCard
                            title="Gastos Operativos"
                            value={financial?.expenses.operatingExpenses || 0}
                            subtitle={`${financial?.expenses.paidExpenses || 0} gastos`}
                            icon={Wallet}
                            variant="danger"
                            isLoading={loadingFinancial}
                        />
                        <MetricCard
                            title="Ganancia Neta"
                            value={financial?.profitability.netProfit || 0}
                            subtitle={`Margen: ${(financial?.profitability.netMargin || 0).toFixed(1)}%`}
                            icon={financial?.profitability.netProfit && financial.profitability.netProfit >= 0 ? TrendingUp : TrendingDown}
                            variant={financial?.profitability.netProfit && financial.profitability.netProfit >= 0 ? 'success' : 'danger'}
                            isLoading={loadingFinancial}
                        />
                    </div>

                    {/* Gráficos */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <PieChartCard
                            title="Gastos por Categoría"
                            data={financial?.expenses.byCategory.map(c => ({ name: c.categoryName, value: c.total })) || []}
                            isLoading={loadingFinancial}
                        />
                        <PieChartCard
                            title="Ingresos por Categoría"
                            data={financial?.incomes?.byCategory?.map(c => ({ name: c.categoryName, value: c.total })) || []}
                            isLoading={loadingFinancial}
                        />
                        <div className="md:col-span-2">
                            <BarChartCard
                                title="Ventas por Método de Pago"
                                data={sales?.current.byPaymentMethod.map(pm => ({ name: pm.methodName, value: pm.total })) || []}
                                color="#3b82f6"
                                layout="vertical"
                                isLoading={loadingSales}
                            />
                        </div>
                    </div>

                    {/* Resumen Financiero Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Resumen del Período</CardTitle>
                            <CardDescription>
                                {financial && `${formatDate(financial.period.startDate)} - ${formatDate(financial.period.endDate)}`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingFinancial ? (
                                <div className="space-y-2">
                                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Ingresos por Ventas</span>
                                        <span className="font-medium text-emerald-600">
                                            {formatCurrency(financial?.revenue.totalRevenue || 0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Ingresos por Servicios</span>
                                        <span className="font-medium text-emerald-600">
                                            {formatCurrency(financial?.incomes?.totalServiceIncome || 0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b bg-emerald-50 dark:bg-emerald-950/30 -mx-6 px-6">
                                        <span className="font-medium">Total Ingresos</span>
                                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                            {formatCurrency(financial?.summary.totalRevenue || 0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Costo de Mercadería</span>
                                        <span className="font-medium text-orange-600">
                                            - {formatCurrency(financial?.costs.costOfGoodsSold || 0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b bg-muted/30 -mx-6 px-6">
                                        <span className="font-medium">Ganancia Bruta</span>
                                        <span className="font-medium">
                                            {formatCurrency(financial?.profitability.grossProfit || 0)}
                                            <span className="text-xs text-muted-foreground ml-2">
                                                ({(financial?.profitability.grossMargin || 0).toFixed(1)}%)
                                            </span>
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Gastos Operativos</span>
                                        <span className="font-medium text-red-600">
                                            - {formatCurrency(financial?.expenses.operatingExpenses || 0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-3 bg-muted/50 -mx-6 px-6 rounded-b-lg">
                                        <span className="font-bold text-lg">Resultado Neto</span>
                                        <span className={`font-bold text-lg ${(financial?.profitability.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {formatCurrency(financial?.profitability.netProfit || 0)}
                                            <span className="text-xs font-normal text-muted-foreground ml-2">
                                                ({(financial?.profitability.netMargin || 0).toFixed(1)}%)
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: VENTAS */}
                <TabsContent value="sales" className="space-y-6">
                    {/* Métricas de ventas */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                            title="Total Ingresos"
                            value={sales?.current.totalRevenue || 0}
                            trend={sales?.growth.revenueGrowth}
                            icon={DollarSign}
                            variant="success"
                            isLoading={loadingSales}
                        />
                        <MetricCard
                            title="Cantidad de Ventas"
                            value={sales?.current.totalSales || 0}
                            trend={sales?.growth.salesGrowth}
                            icon={ShoppingCart}
                            format="number"
                            isLoading={loadingSales}
                        />
                        <MetricCard
                            title="Ticket Promedio"
                            value={sales?.current.averageTicket || 0}
                            trend={sales?.growth.ticketGrowth}
                            icon={CreditCard}
                            isLoading={loadingSales}
                        />
                        <MetricCard
                            title="vs. Período Anterior"
                            value={sales?.growth.revenueGrowth || 0}
                            subtitle={`${formatCurrency(sales?.previous.totalRevenue || 0)} anterior`}
                            icon={(sales?.growth.revenueGrowth || 0) >= 0 ? ArrowUpRight : ArrowDownRight}
                            format="percent"
                            variant={(sales?.growth.revenueGrowth || 0) >= 0 ? 'success' : 'danger'}
                            isLoading={loadingSales}
                        />
                    </div>

                    {/* Gráficos de ventas */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <LineChartCard
                            title="Ventas Diarias"
                            data={sales?.dailyData.map(d => ({
                                name: formatDate(d.date),
                                ingresos: d.revenue,
                                cantidad: d.salesCount,
                            })) || []}
                            lines={[
                                { dataKey: 'ingresos', color: '#10b981', name: 'Ingresos' },
                            ]}
                            isLoading={loadingSales}
                        />
                        <PieChartCard
                            title="Ventas por Método de Pago"
                            data={sales?.current.byPaymentMethod.map(pm => ({ name: pm.methodName, value: pm.total })) || []}
                            isLoading={loadingSales}
                        />
                    </div>

                    {/* Tabla de métodos de pago */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Detalle por Método de Pago</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingSales ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {sales?.current.byPaymentMethod.map(pm => (
                                        <div key={pm.methodId} className="flex justify-between items-center py-2 border-b last:border-0">
                                            <div>
                                                <span className="font-medium">{pm.methodName}</span>
                                                <span className="text-xs text-muted-foreground ml-2">({pm.count} transacciones)</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-medium">{formatCurrency(pm.total)}</span>
                                                <span className="text-xs text-muted-foreground ml-2">({pm.percentage.toFixed(1)}%)</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: PRODUCTOS */}
                <TabsContent value="products" className="space-y-6">
                    {/* Métricas de inventario */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                            title="Total Productos"
                            value={products?.inventory.totalProducts || 0}
                            subtitle={`${products?.inventory.productsWithStock || 0} con stock`}
                            icon={Package}
                            format="number"
                            isLoading={loadingProducts}
                        />
                        <MetricCard
                            title="Sin Stock"
                            value={products?.inventory.productsOutOfStock || 0}
                            icon={AlertTriangle}
                            format="number"
                            variant={(products?.inventory.productsOutOfStock || 0) > 0 ? 'danger' : 'default'}
                            isLoading={loadingProducts}
                        />
                        <MetricCard
                            title="Stock Bajo"
                            value={products?.inventory.productsLowStock || 0}
                            icon={AlertTriangle}
                            format="number"
                            variant={(products?.inventory.productsLowStock || 0) > 0 ? 'warning' : 'default'}
                            isLoading={loadingProducts}
                        />
                        <MetricCard
                            title="Valor Inventario"
                            value={products?.inventory.totalStockValue || 0}
                            subtitle={`Venta: ${formatCurrency(products?.inventory.totalSaleValue || 0)}`}
                            icon={Wallet}
                            isLoading={loadingProducts}
                        />
                    </div>

                    {/* Top productos */}
                    <TopProductsTable
                        products={products?.topProducts || []}
                        isLoading={loadingProducts}
                    />

                    {/* Gráfico de top productos */}
                    <BarChartCard
                        title="Top 10 por Ingresos"
                        data={products?.topProducts.slice(0, 10).map(p => ({
                            name: p.productName.length > 20 ? p.productName.slice(0, 20) + '...' : p.productName,
                            value: p.revenue,
                        })) || []}
                        color="#10b981"
                        layout="vertical"
                        isLoading={loadingProducts}
                    />

                    {/* Reporte de productos seleccionados por id */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Reporte de Productos Seleccionados</CardTitle>
                            <CardDescription>
                                Elegí los productos para analizar las ventas del período actual
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ProductsByIdSelector
                                value={selectedProductIds}
                                onChange={setSelectedProductIds}
                                placeholder="Buscar y agregar productos..."
                            />
                            {selectedProductIds.length === 0 ? (
                                <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg">
                                    Agregá uno o más productos usando el buscador para ver el reporte
                                </div>
                            ) : (
                                <TopProductsTable
                                    products={selectedProductsReport || []}
                                    isLoading={loadingSelectedProducts}
                                    title="Productos Seleccionados"
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: CLIENTES */}
                <TabsContent value="customers" className="space-y-6">
                    {/* Métricas de clientes */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                            title="Clientes Nuevos"
                            value={customers?.newCustomers || 0}
                            icon={Users}
                            format="number"
                            variant="success"
                            isLoading={loadingCustomers}
                        />
                        <MetricCard
                            title="Clientes Recurrentes"
                            value={customers?.returningCustomers || 0}
                            icon={Users}
                            format="number"
                            isLoading={loadingCustomers}
                        />
                        <MetricCard
                            title="Deuda Total"
                            value={customers?.accountsStats.totalDebt || 0}
                            subtitle={`${customers?.accountsStats.activeAccounts || 0} cuentas activas`}
                            icon={CreditCard}
                            variant={(customers?.accountsStats.totalDebt || 0) > 0 ? 'warning' : 'default'}
                            isLoading={loadingCustomers}
                        />
                        <MetricCard
                            title="Cuentas Vencidas"
                            value={customers?.accountsStats.overdueAccounts || 0}
                            icon={AlertTriangle}
                            format="number"
                            variant={(customers?.accountsStats.overdueAccounts || 0) > 0 ? 'danger' : 'default'}
                            isLoading={loadingCustomers}
                        />
                    </div>

                    {/* Top clientes */}
                    <TopCustomersTable
                        customers={customers?.topCustomers || []}
                        isLoading={loadingCustomers}
                    />

                    {/* Top deudores */}
                    {(customers?.accountsStats.topDebtors?.length || 0) > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                    Principales Deudores
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {customers?.accountsStats.topDebtors.map((debtor, index) => (
                                        <div key={debtor.customerId} className="flex justify-between items-center py-2 border-b last:border-0">
                                            <div className="flex items-center gap-3">
                                                <span className="text-muted-foreground text-sm">{index + 1}.</span>
                                                <span className="font-medium">{debtor.customerName}</span>
                                                {debtor.daysOverdue > 0 && (
                                                    <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                                        {debtor.daysOverdue} días vencido
                                                    </span>
                                                )}
                                            </div>
                                            <span className="font-medium text-orange-600">
                                                {formatCurrency(debtor.balance)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* TAB: GASTOS */}
                <TabsContent value="expenses" className="space-y-6">
                    {/* Métricas de gastos */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                            title="Total Gastos"
                            value={expenses?.current.totalAmount || 0}
                            subtitle={`${expenses?.current.totalCount || 0} gastos`}
                            icon={Wallet}
                            variant="danger"
                            isLoading={loadingExpenses}
                        />
                        <MetricCard
                            title="vs. Período Anterior"
                            value={expenses?.growth.amountGrowth || 0}
                            subtitle={`${formatCurrency(expenses?.previous.totalAmount || 0)} anterior`}
                            icon={(expenses?.growth.amountGrowth || 0) <= 0 ? ArrowDownRight : ArrowUpRight}
                            format="percent"
                            variant={(expenses?.growth.amountGrowth || 0) <= 0 ? 'success' : 'danger'}
                            isLoading={loadingExpenses}
                        />
                        <MetricCard
                            title="Promedio por Gasto"
                            value={(expenses?.current.totalAmount || 0) / Math.max(expenses?.current.totalCount || 1, 1)}
                            icon={CreditCard}
                            isLoading={loadingExpenses}
                        />
                        <MetricCard
                            title="Categorías"
                            value={expenses?.current.byCategory.length || 0}
                            icon={BarChart3}
                            format="number"
                            isLoading={loadingExpenses}
                        />
                    </div>

                    {/* Gráficos de gastos */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <PieChartCard
                            title="Gastos por Categoría"
                            data={expenses?.current.byCategory.map(c => ({ name: c.categoryName, value: c.total })) || []}
                            isLoading={loadingExpenses}
                        />
                        <BarChartCard
                            title="Tendencia Mensual"
                            data={expenses?.current.monthlyTrend.map(m => ({ name: m.month, value: m.total })) || []}
                            color="#ef4444"
                            isLoading={loadingExpenses}
                        />
                    </div>

                    {/* Detalle por categoría */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Detalle por Categoría</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingExpenses ? (
                                <div className="space-y-2">
                                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {expenses?.current.byCategory.map(cat => (
                                        <div key={cat.categoryId || 'uncategorized'} className="flex justify-between items-center py-2 border-b last:border-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                                <span className="font-medium">{cat.categoryName}</span>
                                                <span className="text-xs text-muted-foreground">({cat.count} gastos)</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-medium text-red-600">{formatCurrency(cat.total)}</span>
                                                <span className="text-xs text-muted-foreground ml-2">({cat.percentage.toFixed(1)}%)</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: FLUJO DE CAJA */}
                <TabsContent value="cashflow" className="space-y-6">
                    {/* Métricas de flujo de caja */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                            title="Ingresos"
                            value={cashFlow?.totalIncome || 0}
                            icon={ArrowUpRight}
                            variant="success"
                            isLoading={loadingCashFlow}
                        />
                        <MetricCard
                            title="Egresos"
                            value={cashFlow?.totalExpense || 0}
                            icon={ArrowDownRight}
                            variant="danger"
                            isLoading={loadingCashFlow}
                        />
                        <MetricCard
                            title="Flujo Neto"
                            value={cashFlow?.netCashFlow || 0}
                            icon={(cashFlow?.netCashFlow || 0) >= 0 ? TrendingUp : TrendingDown}
                            variant={(cashFlow?.netCashFlow || 0) >= 0 ? 'success' : 'danger'}
                            isLoading={loadingCashFlow}
                        />
                        <MetricCard
                            title="Días en Período"
                            value={cashFlow?.byDay.length || 0}
                            icon={BarChart3}
                            format="number"
                            isLoading={loadingCashFlow}
                        />
                    </div>

                    {/* Gráfico de flujo de caja */}
                    <ComposedChartCard
                        title="Flujo de Caja Diario"
                        data={cashFlow?.byDay.map(d => ({
                            name: formatDate(d.date),
                            ingresos: d.income,
                            egresos: d.expense,
                            acumulado: d.cumulative,
                        })) || []}
                        bars={[
                            { dataKey: 'ingresos', color: '#10b981', name: 'Ingresos' },
                            { dataKey: 'egresos', color: '#ef4444', name: 'Egresos' },
                        ]}
                        lines={[
                            { dataKey: 'acumulado', color: '#3b82f6', name: 'Acumulado' },
                        ]}
                        isLoading={loadingCashFlow}
                    />

                    {/* Resumen de flujo */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Resumen del Período</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingCashFlow ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Total Ingresos (Ventas)</span>
                                        <span className="font-medium text-emerald-600">
                                            + {formatCurrency(cashFlow?.totalIncome || 0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b">
                                        <span className="text-muted-foreground">Total Egresos (Compras + Gastos)</span>
                                        <span className="font-medium text-red-600">
                                            - {formatCurrency(cashFlow?.totalExpense || 0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-3 bg-muted/50 -mx-6 px-6 rounded-b-lg">
                                        <span className="font-bold text-lg">Flujo de Caja Neto</span>
                                        <span className={`font-bold text-lg ${(cashFlow?.netCashFlow || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {(cashFlow?.netCashFlow || 0) >= 0 ? '+ ' : ''}{formatCurrency(cashFlow?.netCashFlow || 0)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
