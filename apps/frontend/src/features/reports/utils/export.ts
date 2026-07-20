/**
 * Utilidades para exportación de reportes a Excel y PDF
 */
import { formatDate } from '@/lib/utils';
import type { FinancialReport, SalesReport, ProductsReport, CustomersReport, ExpensesReport, TopProduct } from '../types';

/**
 * Exporta reporte financiero a CSV (compatible con Excel)
 */
export function exportFinancialToCSV(report: FinancialReport, filename?: string): void {
    const startDate = formatDate(report.period.startDate);
    const endDate = formatDate(report.period.endDate);
    
    const rows = [
        ['REPORTE FINANCIERO'],
        [`Período: ${startDate} - ${endDate}`],
        [''],
        ['=== INGRESOS ==='],
        ['Total Ingresos', report.revenue.totalRevenue.toFixed(2)],
        ['Cantidad de Ventas', report.revenue.totalSales.toString()],
        ['Ticket Promedio', report.revenue.averageTicket.toFixed(2)],
        ['Ventas Completadas', report.revenue.completedSales.toString()],
        ['Ventas Pendientes', report.revenue.pendingSales.toString()],
        [''],
        ['=== COSTOS ==='],
        ['Costo de Mercadería', report.costs.costOfGoodsSold.toFixed(2)],
        ['Total Compras', report.costs.totalPurchases.toString()],
        ['Compras Pagadas', report.costs.paidPurchases.toString()],
        ['Compras Pendientes', report.costs.pendingPurchases.toString()],
        [''],
        ['=== GASTOS OPERATIVOS ==='],
        ['Total Gastos', report.expenses.operatingExpenses.toFixed(2)],
        ['Cantidad de Gastos', report.expenses.totalExpenses.toString()],
        [''],
        ['--- Por Categoría ---'],
        ...report.expenses.byCategory.map(cat => [cat.categoryName, cat.total.toFixed(2), `${cat.percentage.toFixed(1)}%`]),
        [''],
        ['=== RENTABILIDAD ==='],
        ['Ganancia Bruta', report.profitability.grossProfit.toFixed(2)],
        ['Margen Bruto %', `${report.profitability.grossMargin.toFixed(1)}%`],
        ['Ganancia Neta', report.profitability.netProfit.toFixed(2)],
        ['Margen Neto %', `${report.profitability.netMargin.toFixed(1)}%`],
        ['ROI %', `${report.profitability.roi.toFixed(1)}%`],
    ];

    downloadCSV(rows, filename || `reporte-financiero-${Date.now()}.csv`);
}

/**
 * Exporta reporte de ventas a CSV
 */
export function exportSalesToCSV(report: SalesReport, filename?: string): void {
    const startDate = formatDate(report.period.startDate);
    const endDate = formatDate(report.period.endDate);
    
    const rows = [
        ['REPORTE DE VENTAS'],
        [`Período: ${startDate} - ${endDate}`],
        [''],
        ['=== RESUMEN ==='],
        ['Total Ingresos', report.current.totalRevenue.toFixed(2)],
        ['Cantidad de Ventas', report.current.totalSales.toString()],
        ['Ticket Promedio', report.current.averageTicket.toFixed(2)],
        [''],
        ['=== COMPARATIVA ==='],
        ['Período Anterior', `${formatDate(report.previous.period.startDate)} - ${formatDate(report.previous.period.endDate)}`],
        ['Ingresos Anterior', report.previous.totalRevenue.toFixed(2)],
        ['Crecimiento Ingresos', `${report.growth.revenueGrowth.toFixed(1)}%`],
        ['Crecimiento Ventas', `${report.growth.salesGrowth.toFixed(1)}%`],
        [''],
        ['=== POR MÉTODO DE PAGO ==='],
        ['Método', 'Total', 'Cantidad', '%'],
        ...report.current.byPaymentMethod.map(pm => [pm.methodName, pm.total.toFixed(2), pm.count.toString(), `${pm.percentage.toFixed(1)}%`]),
        [''],
        ['=== VENTAS DIARIAS ==='],
        ['Fecha', 'Ingresos', 'Cantidad'],
        ...report.dailyData.map(d => [formatDate(d.date), d.revenue.toFixed(2), d.salesCount.toString()]),
    ];

    downloadCSV(rows, filename || `reporte-ventas-${Date.now()}.csv`);
}

/**
 * Exporta top productos a CSV
 */
export function exportTopProductsToCSV(products: TopProduct[], filename?: string): void {
    const rows = [
        ['TOP PRODUCTOS MÁS VENDIDOS'],
        [''],
        ['Producto', 'SKU', 'Cantidad Vendida', 'Ingresos', 'Costo', 'Ganancia', 'Margen %'],
        ...products.map(p => [
            p.productName,
            p.productSku || '-',
            p.quantitySold.toString(),
            p.revenue.toFixed(2),
            p.cost.toFixed(2),
            p.profit.toFixed(2),
            `${p.margin.toFixed(1)}%`,
        ]),
    ];

    downloadCSV(rows, filename || `top-productos-${Date.now()}.csv`);
}

/**
 * Exporta reporte de productos a CSV
 */
export function exportProductsToCSV(report: ProductsReport, filename?: string): void {
    const startDate = formatDate(report.period.startDate);
    const endDate = formatDate(report.period.endDate);
    
    const rows = [
        ['REPORTE DE PRODUCTOS'],
        [`Período: ${startDate} - ${endDate}`],
        [''],
        ['=== ESTADÍSTICAS DE INVENTARIO ==='],
        ['Total Productos', report.inventory.totalProducts.toString()],
        ['Con Stock', report.inventory.productsWithStock.toString()],
        ['Sin Stock', report.inventory.productsOutOfStock.toString()],
        ['Stock Bajo', report.inventory.productsLowStock.toString()],
        ['Valor Total (Costo)', report.inventory.totalStockValue.toFixed(2)],
        ['Valor Total (Venta)', report.inventory.totalSaleValue.toFixed(2)],
        [''],
        ['=== TOP PRODUCTOS ==='],
        ['Producto', 'SKU', 'Cantidad', 'Ingresos', 'Ganancia', 'Margen %'],
        ...report.topProducts.map(p => [
            p.productName,
            p.productSku || '-',
            p.quantitySold.toString(),
            p.revenue.toFixed(2),
            p.profit.toFixed(2),
            `${p.margin.toFixed(1)}%`,
        ]),
        [''],
        ['=== PRODUCTOS SIN ROTACIÓN ==='],
        ['Producto', 'Stock Actual'],
        ...report.lowRotationProducts.map(p => [p.productName, p.stock.toString()]),
    ];

    downloadCSV(rows, filename || `reporte-productos-${Date.now()}.csv`);
}

/**
 * Exporta reporte de clientes a CSV
 */
export function exportCustomersToCSV(report: CustomersReport, filename?: string): void {
    const startDate = formatDate(report.period.startDate);
    const endDate = formatDate(report.period.endDate);
    
    const rows = [
        ['REPORTE DE CLIENTES'],
        [`Período: ${startDate} - ${endDate}`],
        [''],
        ['=== RESUMEN ==='],
        ['Clientes Nuevos', report.newCustomers.toString()],
        ['Clientes Recurrentes', report.returningCustomers.toString()],
        [''],
        ['=== CUENTAS CORRIENTES ==='],
        ['Total Cuentas', report.accountsStats.totalAccounts.toString()],
        ['Cuentas Activas', report.accountsStats.activeAccounts.toString()],
        ['Deuda Total', report.accountsStats.totalDebt.toFixed(2)],
        ['Deuda Promedio', report.accountsStats.averageDebt.toFixed(2)],
        ['Cuentas Vencidas', report.accountsStats.overdueAccounts.toString()],
        [''],
        ['=== TOP CLIENTES ==='],
        ['Cliente', 'Email', 'Compras', 'Total Gastado', 'Ticket Promedio'],
        ...report.topCustomers.map(c => [
            c.customerName,
            c.email || '-',
            c.totalPurchases.toString(),
            c.totalAmount.toFixed(2),
            c.averageTicket.toFixed(2),
        ]),
        [''],
        ['=== TOP DEUDORES ==='],
        ['Cliente', 'Saldo', 'Días Vencido'],
        ...report.accountsStats.topDebtors.map(d => [
            d.customerName,
            d.balance.toFixed(2),
            d.daysOverdue.toString(),
        ]),
    ];

    downloadCSV(rows, filename || `reporte-clientes-${Date.now()}.csv`);
}

/**
 * Exporta reporte de gastos a CSV
 */
export function exportExpensesToCSV(report: ExpensesReport, filename?: string): void {
    const startDate = formatDate(report.period.startDate);
    const endDate = formatDate(report.period.endDate);
    
    const rows = [
        ['REPORTE DE GASTOS'],
        [`Período: ${startDate} - ${endDate}`],
        [''],
        ['=== RESUMEN ==='],
        ['Total Gastos', report.current.totalAmount.toFixed(2)],
        ['Cantidad de Gastos', report.current.totalCount.toString()],
        [''],
        ['=== COMPARATIVA ==='],
        ['Período Anterior', `${formatDate(report.previous.period.startDate)} - ${formatDate(report.previous.period.endDate)}`],
        ['Gastos Anterior', report.previous.totalAmount.toFixed(2)],
        ['Crecimiento', `${report.growth.amountGrowth.toFixed(1)}%`],
        [''],
        ['=== POR CATEGORÍA ==='],
        ['Categoría', 'Cantidad', 'Total', '%'],
        ...report.current.byCategory.map(cat => [
            cat.categoryName,
            cat.count.toString(),
            cat.total.toFixed(2),
            `${cat.percentage.toFixed(1)}%`,
        ]),
        [''],
        ['=== TENDENCIA MENSUAL ==='],
        ['Mes', 'Total'],
        ...report.current.monthlyTrend.map(m => [m.month, m.total.toFixed(2)]),
    ];

    downloadCSV(rows, filename || `reporte-gastos-${Date.now()}.csv`);
}

/**
 * Función auxiliar para descargar CSV
 */
function downloadCSV(rows: (string | number)[][], filename: string): void {
    // Sanitizar para prevenir CSV injection (fórmulas en Excel/Sheets)
    // Celdas que empiezan con =, +, -, @, TAB, CR se tratan como texto
    const sanitizeCell = (cell: string | number): string => {
        const cellStr = String(cell);
        // Prevenir inyección CSV: prefijar con ' si empieza con caracteres de fórmula
        if (/^[=+\-@\t\r]/.test(cellStr)) {
            return `'${cellStr}`;
        }
        return cellStr;
    };

    // Escapar valores con comas o saltos de línea
    const escapedRows = rows.map(row => 
        row.map(cell => {
            const cellStr = sanitizeCell(cell);
            if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
                return `"${cellStr.replaceAll('"', '""')}"`;
            }
            return cellStr;
        }).join(',')
    );
    
    // Agregar BOM para UTF-8 (para que Excel reconozca los caracteres especiales)
    const BOM = '\uFEFF';
    const csvContent = BOM + escapedRows.join('\n');
    
    // Crear blob y descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

/**
 * Imprime el reporte actual (versión simple para PDF)
 */
export function printReport(): void {
    globalThis.print();
}
