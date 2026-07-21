/**
 * Servicio de Reportes
 * Genera análisis financieros y operativos del negocio
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale, SaleStatus } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { SalePayment } from '../sales/entities/sale-payment.entity';
import { Purchase, PurchaseStatus } from '../purchases/entities/purchase.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerAccount } from '../customer-accounts/entities/customer-account.entity';
import { ReportPeriod } from './dto';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { ConfigurationService } from '../configuration/configuration.service';
import { Income } from '../incomes/entities/income.entity';
import { AccountMovement, MovementType } from '../customer-accounts/entities/account-movement.entity';

// ============================================
// INTERFACES PARA REPORTES
// ============================================

export interface RevenueData {
    totalRevenue: number;
    totalSales: number;
    averageTicket: number;
    completedSales: number;
    pendingSales: number;
    cancelledSales: number;
}

export interface CostsData {
    costOfGoodsSold: number;
    totalPurchases: number;
    paidPurchases: number;
    pendingPurchases: number;
}

export interface ExpensesData {
    operatingExpenses: number;
    totalExpenses: number;
    paidExpenses: number;
    pendingExpenses: number;
    byCategory: Array<{
        categoryId: string | null;
        categoryName: string;
        count: number;
        total: number;
        percentage: number;
    }>;
}

export interface IncomesData {
    totalServiceIncome: number;
    totalIncomes: number;
    paidIncomes: number;
    pendingIncomes: number;
    byCategory: Array<{
        categoryId: string | null;
        categoryName: string;
        count: number;
        total: number;
        percentage: number;
    }>;
}

export interface ProfitabilityData {
    grossProfit: number;
    grossMargin: number;
    netProfit: number;
    netMargin: number;
    roi: number;
}

export interface FinancialReport {
    period: { startDate: Date; endDate: Date };
    revenue: RevenueData;
    incomes: IncomesData;
    costs: CostsData;
    expenses: ExpensesData;
    profitability: ProfitabilityData;
    summary: {
        totalRevenue: number;
        totalServiceIncome: number;
        totalCosts: number;
        netProfit: number;
        profitColor: 'green' | 'red' | 'yellow';
    };
}

export interface SalesReport {
    period: { startDate: Date; endDate: Date };
    current: {
        totalRevenue: number;
        totalSales: number;
        averageTicket: number;
        byPaymentMethod: Array<{
            methodId: string;
            methodName: string;
            total: number;
            count: number;
            percentage: number;
        }>;
        byStatus: Record<string, number>;
    };
    previous: {
        period: { startDate: Date; endDate: Date };
        totalRevenue: number;
        totalSales: number;
        averageTicket: number;
    };
    growth: {
        revenueGrowth: number;
        salesGrowth: number;
        ticketGrowth: number;
    };
    dailyData: Array<{
        date: string;
        revenue: number;
        salesCount: number;
    }>;
}

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

export interface ProductsReport {
    period: { startDate: Date; endDate: Date };
    topProducts: TopProduct[];
    lowRotationProducts: Array<{
        productId: string;
        productName: string;
        stock: number;
        lastSaleDate: Date | null;
        daysSinceLastSale: number;
    }>;
    inventory: {
        totalProducts: number;
        productsWithStock: number;
        productsOutOfStock: number;
        productsLowStock: number;
        totalStockValue: number;
        totalSaleValue: number;
    };
}

export interface TopCustomer {
    customerId: string;
    customerName: string;
    email: string | null;
    phone: string | null;
    totalPurchases: number;
    totalAmount: number;
    averageTicket: number;
    lastPurchaseDate: Date;
}

export interface CustomersReport {
    period: { startDate: Date; endDate: Date };
    topCustomers: TopCustomer[];
    accountsStats: {
        totalAccounts: number;
        activeAccounts: number;
        totalDebt: number;
        averageDebt: number;
        overdueAccounts: number;
        topDebtors: Array<{
            customerId: string;
            customerName: string;
            balance: number;
            daysOverdue: number;
        }>;
    };
    newCustomers: number;
    returningCustomers: number;
}

export interface ExpensesReport {
    period: { startDate: Date; endDate: Date };
    current: {
        totalAmount: number;
        totalCount: number;
        byCategory: Array<{
            categoryId: string | null;
            categoryName: string;
            count: number;
            total: number;
            percentage: number;
        }>;
        monthlyTrend: Array<{
            month: string;
            total: number;
        }>;
    };
    previous: {
        period: { startDate: Date; endDate: Date };
        totalAmount: number;
        totalCount: number;
    };
    growth: {
        amountGrowth: number;
        countGrowth: number;
    };
}

export interface CashFlowReport {
    period: { startDate: Date; endDate: Date };
    totalIncome: number;
    totalExpense: number;
    netCashFlow: number;
    byDay: Array<{
        date: string;
        income: number;
        expense: number;
        net: number;
        cumulative: number;
    }>;
}

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
        openedAt: Date | null;
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

@Injectable()
export class ReportsService {
    constructor(
        @InjectRepository(Sale)
        private readonly saleRepo: Repository<Sale>,
        @InjectRepository(SaleItem)
        private readonly saleItemRepo: Repository<SaleItem>,
        @InjectRepository(SalePayment)
        private readonly salePaymentRepo: Repository<SalePayment>,
        @InjectRepository(Purchase)
        private readonly purchaseRepo: Repository<Purchase>,
        @InjectRepository(Expense)
        private readonly expenseRepo: Repository<Expense>,
        @InjectRepository(Income)
        private readonly incomeRepo: Repository<Income>,
        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,
        @InjectRepository(Customer)
        private readonly customerRepo: Repository<Customer>,
        @InjectRepository(CustomerAccount)
        private readonly accountRepo: Repository<CustomerAccount>,
        @InjectRepository(AccountMovement)
        private readonly accountMovementRepo: Repository<AccountMovement>,
        private readonly cashRegisterService: CashRegisterService,
        private readonly configurationService: ConfigurationService,
    ) { }

    // ============================================
    // HELPERS PARA FECHAS
    // ============================================

    private getPeriodDates(
        period?: ReportPeriod,
        startDate?: string,
        endDate?: string
    ): { start: Date; end: Date } {
        const now = new Date();
        if (period && period !== ReportPeriod.CUSTOM) {
            return this.getPresetPeriodDates(period, now);
        }

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        }

        // Por defecto: mes actual
        return this.getCurrentMonthPeriodDates(now);
    }

    private getCurrentMonthPeriodDates(now: Date): { start: Date; end: Date } {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
    }

    private getPresetPeriodDates(period: ReportPeriod, now: Date): { start: Date; end: Date } {
        switch (period) {
            case ReportPeriod.TODAY: {
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                return { start, end };
            }
            case ReportPeriod.YESTERDAY: {
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
                return { start, end };
            }
            case ReportPeriod.THIS_WEEK: {
                const dayOfWeek = now.getDay();
                const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
                const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                return { start, end };
            }
            case ReportPeriod.LAST_WEEK: {
                const currentDayOfWeek = now.getDay();
                const diffToLastMonday = currentDayOfWeek === 0 ? 13 : currentDayOfWeek + 6;
                const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToLastMonday);
                const end = new Date(start);
                end.setDate(end.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                return { start, end };
            }
            case ReportPeriod.THIS_MONTH: {
                return this.getCurrentMonthPeriodDates(now);
            }
            case ReportPeriod.LAST_MONTH: {
                const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                return { start, end };
            }
            case ReportPeriod.THIS_QUARTER: {
                const currentQuarter = Math.floor(now.getMonth() / 3);
                const start = new Date(now.getFullYear(), currentQuarter * 3, 1);
                const end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);
                return { start, end };
            }
            case ReportPeriod.LAST_QUARTER: {
                const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
                const year = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
                const quarterIndex = lastQuarter < 0 ? 3 : lastQuarter;
                const start = new Date(year, quarterIndex * 3, 1);
                const end = new Date(year, (quarterIndex + 1) * 3, 0, 23, 59, 59, 999);
                return { start, end };
            }
            case ReportPeriod.THIS_YEAR: {
                const start = new Date(now.getFullYear(), 0, 1);
                const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                return { start, end };
            }
            case ReportPeriod.LAST_YEAR: {
                const start = new Date(now.getFullYear() - 1, 0, 1);
                const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
                return { start, end };
            }
            default: {
                return this.getCurrentMonthPeriodDates(now);
            }
        }
    }

    private calculateGrowthPercentage(current: number, previous: number): number {
        if (previous > 0) {
            return ((current - previous) / previous) * 100;
        }
        return current > 0 ? 100 : 0;
    }

    private getProfitColor(netProfit: number): 'green' | 'red' | 'yellow' {
        if (netProfit > 0) return 'green';
        if (netProfit < 0) return 'red';
        return 'yellow';
    }

    private getPreviousPeriod(start: Date, end: Date): { start: Date; end: Date } {
        const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const previousEnd = new Date(start);
        previousEnd.setDate(previousEnd.getDate() - 1);
        previousEnd.setHours(23, 59, 59, 999);
        const previousStart = new Date(previousEnd);
        previousStart.setDate(previousStart.getDate() - periodDays + 1);
        previousStart.setHours(0, 0, 0, 0);
        return { start: previousStart, end: previousEnd };
    }

    // ============================================
    // REPORTE FINANCIERO GENERAL
    // ============================================

    async getFinancialReport(
        period?: ReportPeriod,
        startDate?: string,
        endDate?: string
    ): Promise<FinancialReport> {
        const { start, end } = this.getPeriodDates(period, startDate, endDate);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        // 1. INGRESOS POR VENTAS (Ventas completadas)
        const sales = await this.saleRepo
            .createQueryBuilder('sale')
            .where('sale.deletedAt IS NULL')
            .andWhere('DATE(sale.saleDate) BETWEEN :start AND :end', { start: startStr, end: endStr })
            .getMany();

        const completedSales = sales.filter(s => s.status === SaleStatus.COMPLETED);
        const pendingSales = sales.filter(s => s.status === SaleStatus.PENDING);
        const cancelledSales = sales.filter(s => s.status === SaleStatus.CANCELLED);

        const salesRevenue = completedSales.reduce((sum, s) => sum + Number(s.total), 0);
        const averageTicket = completedSales.length > 0 ? salesRevenue / completedSales.length : 0;

        // 2. INGRESOS POR SERVICIOS (Income)
        const incomes = await this.incomeRepo
            .createQueryBuilder('income')
            .leftJoinAndSelect('income.category', 'category')
            .where('income.deletedAt IS NULL')
            .andWhere('DATE(income.incomeDate) BETWEEN :start AND :end', { start: startStr, end: endStr })
            .getMany();

        const paidIncomes = incomes.filter(i => i.isPaid);
        const pendingIncomesArr = incomes.filter(i => !i.isPaid);
        const totalServiceIncome = paidIncomes.reduce((sum, i) => sum + Number(i.amount), 0);

        // Agrupar ingresos por categoría
        const incomeCategoryMap = new Map<string, { name: string; count: number; total: number }>();
        for (const income of paidIncomes) {
            const categoryId = income.categoryId ?? 'uncategorized';
            const categoryName = income.category?.name ?? 'Sin categoría';
            if (!incomeCategoryMap.has(categoryId)) {
                incomeCategoryMap.set(categoryId, { name: categoryName, count: 0, total: 0 });
            }
            const cat = incomeCategoryMap.get(categoryId)!;
            cat.count++;
            cat.total += Number(income.amount);
        }

        const incomesByCategory = Array.from(incomeCategoryMap.entries())
            .map(([categoryId, data]) => ({
                categoryId: categoryId === 'uncategorized' ? null : categoryId,
                categoryName: data.name,
                count: data.count,
                total: data.total,
                percentage: totalServiceIncome > 0 ? (data.total / totalServiceIncome) * 100 : 0,
            }))
            .sort((a, b) => b.total - a.total);

        // 3. COSTOS (Compras pagadas)
        const purchases = await this.purchaseRepo
            .createQueryBuilder('purchase')
            .where('purchase.deletedAt IS NULL')
            .andWhere('DATE(purchase.purchaseDate) BETWEEN :start AND :end', { start: startStr, end: endStr })
            .getMany();

        const paidPurchases = purchases.filter(p => p.status === PurchaseStatus.PAID);
        const pendingPurchases = purchases.filter(p => p.status === PurchaseStatus.PENDING);
        const costOfGoodsSold = paidPurchases.reduce((sum, p) => sum + Number(p.total), 0);

        // 4. GASTOS OPERATIVOS
        const expenses = await this.expenseRepo
            .createQueryBuilder('expense')
            .leftJoinAndSelect('expense.category', 'category')
            .where('expense.deletedAt IS NULL')
            .andWhere('DATE(expense.expenseDate) BETWEEN :start AND :end', { start: startStr, end: endStr })
            .getMany();

        const paidExpenses = expenses.filter(e => e.isPaid);
        const pendingExpensesArr = expenses.filter(e => !e.isPaid);
        const operatingExpenses = paidExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        // Agrupar gastos por categoría
        const categoryMap = new Map<string, { name: string; count: number; total: number }>();
        for (const expense of paidExpenses) {
            const categoryId = expense.categoryId ?? 'uncategorized';
            const categoryName = expense.category?.name ?? 'Sin categoría';
            if (!categoryMap.has(categoryId)) {
                categoryMap.set(categoryId, { name: categoryName, count: 0, total: 0 });
            }
            const cat = categoryMap.get(categoryId)!;
            cat.count++;
            cat.total += Number(expense.amount);
        }

        const byCategory = Array.from(categoryMap.entries())
            .map(([categoryId, data]) => ({
                categoryId: categoryId === 'uncategorized' ? null : categoryId,
                categoryName: data.name,
                count: data.count,
                total: data.total,
                percentage: operatingExpenses > 0 ? (data.total / operatingExpenses) * 100 : 0,
            }))
            .sort((a, b) => b.total - a.total);

        // 5. CÁLCULOS DE RENTABILIDAD (ventas + ingresos por servicios)
        const totalRevenue = salesRevenue + totalServiceIncome;
        const grossProfit = totalRevenue - costOfGoodsSold;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        const netProfit = grossProfit - operatingExpenses;
        const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        const totalCosts = costOfGoodsSold + operatingExpenses;
        const roi = totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0;

        return {
            period: { startDate: start, endDate: end },
            revenue: {
                totalRevenue: salesRevenue, // Solo ventas para este campo
                totalSales: sales.length,
                averageTicket,
                completedSales: completedSales.length,
                pendingSales: pendingSales.length,
                cancelledSales: cancelledSales.length,
            },
            incomes: {
                totalServiceIncome,
                totalIncomes: incomes.length,
                paidIncomes: paidIncomes.length,
                pendingIncomes: pendingIncomesArr.length,
                byCategory: incomesByCategory,
            },
            costs: {
                costOfGoodsSold,
                totalPurchases: purchases.length,
                paidPurchases: paidPurchases.length,
                pendingPurchases: pendingPurchases.length,
            },
            expenses: {
                operatingExpenses,
                totalExpenses: expenses.length,
                paidExpenses: paidExpenses.length,
                pendingExpenses: pendingExpensesArr.length,
                byCategory,
            },
            profitability: {
                grossProfit,
                grossMargin,
                netProfit,
                netMargin,
                roi,
            },
            summary: {
                totalRevenue,
                totalServiceIncome,
                totalCosts,
                netProfit,
                profitColor: this.getProfitColor(netProfit),
            },
        };
    }

    // ============================================
    // REPORTE DE VENTAS DETALLADO
    // ============================================

    async getSalesReport(
        period?: ReportPeriod,
        startDate?: string,
        endDate?: string
    ): Promise<SalesReport> {
        const { start, end } = this.getPeriodDates(period, startDate, endDate);
        const { start: prevStart, end: prevEnd } = this.getPreviousPeriod(start, end);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];
        const prevStartStr = prevStart.toISOString().split('T')[0];
        const prevEndStr = prevEnd.toISOString().split('T')[0];

        // Ventas del período actual
        const currentSales = await this.saleRepo
            .createQueryBuilder('sale')
            .leftJoinAndSelect('sale.payments', 'payments')
            .leftJoinAndSelect('payments.paymentMethod', 'paymentMethod')
            .where('sale.deletedAt IS NULL')
            .andWhere('DATE(sale.saleDate) BETWEEN :start AND :end', { start: startStr, end: endStr })
            .andWhere('sale.status != :cancelled', { cancelled: SaleStatus.CANCELLED })
            .getMany();

        // Ventas del período anterior
        const previousSales = await this.saleRepo
            .createQueryBuilder('sale')
            .where('sale.deletedAt IS NULL')
            .andWhere('DATE(sale.saleDate) BETWEEN :start AND :end', { start: prevStartStr, end: prevEndStr })
            .andWhere('sale.status != :cancelled', { cancelled: SaleStatus.CANCELLED })
            .getMany();

        // Calcular métricas actuales
        const currentRevenue = currentSales.reduce((sum, s) => sum + Number(s.total), 0);
        const currentCount = currentSales.length;
        const currentAvgTicket = currentCount > 0 ? currentRevenue / currentCount : 0;

        // Calcular métricas anteriores
        const previousRevenue = previousSales.reduce((sum, s) => sum + Number(s.total), 0);
        const previousCount = previousSales.length;
        const previousAvgTicket = previousCount > 0 ? previousRevenue / previousCount : 0;

        // Crecimiento
        const revenueGrowth = this.calculateGrowthPercentage(currentRevenue, previousRevenue);
        const salesGrowth = this.calculateGrowthPercentage(currentCount, previousCount);
        const ticketGrowth = this.calculateGrowthPercentage(currentAvgTicket, previousAvgTicket);

        // Ventas por método de pago
        const byPaymentMethod = this.buildPaymentMethodBreakdown(currentSales, currentRevenue);

        // Ventas por estado
        const byStatus = this.countSalesByStatus(currentSales);

        // Datos diarios
        const dailyData = this.buildDailySalesData(currentSales);

        return {
            period: { startDate: start, endDate: end },
            current: {
                totalRevenue: currentRevenue,
                totalSales: currentCount,
                averageTicket: currentAvgTicket,
                byPaymentMethod,
                byStatus,
            },
            previous: {
                period: { startDate: prevStart, endDate: prevEnd },
                totalRevenue: previousRevenue,
                totalSales: previousCount,
                averageTicket: previousAvgTicket,
            },
            growth: {
                revenueGrowth,
                salesGrowth,
                ticketGrowth,
            },
            dailyData,
        };
    }

    private buildPaymentMethodBreakdown(
        sales: Sale[],
        totalRevenue: number
    ): Array<{ methodId: string; methodName: string; total: number; count: number; percentage: number }> {
        const paymentMap = new Map<string, { name: string; total: number; count: number }>();

        for (const sale of sales) {
            for (const payment of sale.payments || []) {
                const methodId = payment.paymentMethodId ?? 'unknown';
                const methodName = payment.paymentMethod?.name ?? 'Desconocido';

                const current = paymentMap.get(methodId) ?? { name: methodName, total: 0, count: 0 };
                current.total += Number(payment.amount);
                current.count++;
                paymentMap.set(methodId, current);
            }
        }

        return Array.from(paymentMap.entries())
            .map(([methodId, data]) => ({
                methodId,
                methodName: data.name,
                total: data.total,
                count: data.count,
                percentage: totalRevenue > 0 ? (data.total / totalRevenue) * 100 : 0,
            }))
            .sort((a, b) => b.total - a.total);
    }

    private countSalesByStatus(sales: Sale[]): Record<string, number> {
        const byStatus: Record<string, number> = {};
        for (const sale of sales) {
            byStatus[sale.status] = (byStatus[sale.status] || 0) + 1;
        }
        return byStatus;
    }

    private buildDailySalesData(sales: Sale[]): Array<{ date: string; revenue: number; salesCount: number }> {
        const dailyMap = new Map<string, { revenue: number; count: number }>();

        for (const sale of sales) {
            const dateStr = new Date(sale.saleDate).toISOString().split('T')[0];
            const current = dailyMap.get(dateStr) ?? { revenue: 0, count: 0 };
            current.revenue += Number(sale.total);
            current.count++;
            dailyMap.set(dateStr, current);
        }

        return Array.from(dailyMap.entries())
            .map(([date, data]) => ({
                date,
                revenue: data.revenue,
                salesCount: data.count,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    // ============================================
    // TOP PRODUCTOS MÁS VENDIDOS
    // ============================================

    async getTopProducts(
        period?: ReportPeriod,
        startDate?: string,
        endDate?: string,
        limit: number = 10
    ): Promise<TopProduct[]> {
        const { start, end } = this.getPeriodDates(period, startDate, endDate);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        // Obtener items de ventas completadas
        const items = await this.saleItemRepo
            .createQueryBuilder('item')
            .innerJoin('item.sale', 'sale')
            .leftJoinAndSelect('item.product', 'product')
            .where('sale.deletedAt IS NULL')
            .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
            .andWhere('DATE(sale.saleDate) BETWEEN :start AND :end', { start: startStr, end: endStr })
            .getMany();

        // Agrupar por producto
        const productMap = new Map<string, {
            product: Product;
            quantity: number;
            revenue: number;
            cost: number;
        }>();

        for (const item of items) {
            if (!item.product) continue;
            const productId = item.productId;
            if (!productMap.has(productId)) {
                productMap.set(productId, {
                    product: item.product,
                    quantity: 0,
                    revenue: 0,
                    cost: 0,
                });
            }
            const prod = productMap.get(productId)!;
            prod.quantity += item.quantity;
            prod.revenue += Number(item.subtotal);
            prod.cost += item.quantity * Number(item.product.cost);
        }

        // Convertir y ordenar
        const topProducts: TopProduct[] = Array.from(productMap.values())
            .map(data => {
                const profit = data.revenue - data.cost;
                return {
                    productId: data.product.id,
                    productName: data.product.name,
                    productSku: data.product.sku ?? null,
                    quantitySold: data.quantity,
                    revenue: data.revenue,
                    cost: data.cost,
                    profit,
                    margin: data.revenue > 0 ? (profit / data.revenue) * 100 : 0,
                };
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, limit);

        return topProducts;
    }

    async getProductsByIds(
        productIds: string[],
        period?: ReportPeriod,
        startDate?: string,
        endDate?: string
    ): Promise<TopProduct[]> {
        if (productIds.length === 0) return [];

        const { start, end } = this.getPeriodDates(period, startDate, endDate);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        // Obtener items de ventas completadas filtrando por ids de producto
        const items = await this.saleItemRepo
            .createQueryBuilder('item')
            .innerJoin('item.sale', 'sale')
            .leftJoinAndSelect('item.product', 'product')
            .where('sale.deletedAt IS NULL')
            .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
            .andWhere('DATE(sale.saleDate) BETWEEN :start AND :end', { start: startStr, end: endStr })
            .andWhere('item.productId IN (:...ids)', { ids: productIds })
            .getMany();

        // Agrupar por producto
        const productMap = new Map<string, {
            product: Product;
            quantity: number;
            revenue: number;
            cost: number;
        }>();

        for (const item of items) {
            if (!item.product) continue;
            const productId = item.productId;
            if (!productMap.has(productId)) {
                productMap.set(productId, {
                    product: item.product,
                    quantity: 0,
                    revenue: 0,
                    cost: 0,
                });
            }
            const prod = productMap.get(productId)!;
            prod.quantity += item.quantity;
            prod.revenue += Number(item.subtotal);
            prod.cost += item.quantity * Number(item.product.cost);
        }

        const result: TopProduct[] = Array.from(productMap.values())
            .map(data => {
                const profit = data.revenue - data.cost;
                return {
                    productId: data.product.id,
                    productName: data.product.name,
                    productSku: data.product.sku ?? null,
                    quantitySold: data.quantity,
                    revenue: data.revenue,
                    cost: data.cost,
                    profit,
                    margin: data.revenue > 0 ? (profit / data.revenue) * 100 : 0,
                };
            })
            .sort((a, b) => b.revenue - a.revenue);

        return result;
    }

    // ============================================
    // REPORTE DE PRODUCTOS
    // ============================================

    async getProductsReport(
        period?: ReportPeriod,
        startDate?: string,
        endDate?: string
    ): Promise<ProductsReport> {
        const { start, end } = this.getPeriodDates(period, startDate, endDate);

        // Top productos
        const topProducts = await this.getTopProducts(period, startDate, endDate, 20);

        // Estadísticas de inventario
        const globalMinStockForProducts = await this.configurationService.getMinStockAlert();
        const allProducts = await this.productRepo.find({
            where: { isActive: true },
        });

        const totalProducts = allProducts.length;
        const productsWithStock = allProducts.filter(p => p.stock > 0).length;
        const productsOutOfStock = allProducts.filter(p => p.stock === 0).length;
        const productsLowStock = allProducts.filter(p => p.stock > 0 && p.stock <= globalMinStockForProducts).length;
        const totalStockValue = allProducts.reduce((sum, p) => sum + (p.stock * Number(p.cost)), 0);
        const totalSaleValue = allProducts.reduce((sum, p) => sum + (p.stock * Number(p.price)), 0);

        // Productos de baja rotación (sin ventas en el período)
        const soldProductIds = new Set(topProducts.map(p => p.productId));
        const lowRotationProducts = allProducts
            .filter(p => !soldProductIds.has(p.id) && p.stock > 0)
            .map(p => ({
                productId: p.id,
                productName: p.name,
                stock: p.stock,
                lastSaleDate: null as Date | null,
                daysSinceLastSale: 0,
            }))
            .slice(0, 20);

        return {
            period: { startDate: start, endDate: end },
            topProducts,
            lowRotationProducts,
            inventory: {
                totalProducts,
                productsWithStock,
                productsOutOfStock,
                productsLowStock,
                totalStockValue: Math.round(totalStockValue * 100) / 100,
                totalSaleValue: Math.round(totalSaleValue * 100) / 100,
            },
        };
    }

    // ============================================
    // TOP CLIENTES
    // ============================================

    async getTopCustomers(
        period?: ReportPeriod,
        startDate?: string,
        endDate?: string,
        limit: number = 10
    ): Promise<TopCustomer[]> {
        const { start, end } = this.getPeriodDates(period, startDate, endDate);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const sales = await this.saleRepo
            .createQueryBuilder('sale')
            .leftJoinAndSelect('sale.customer', 'customer')
            .where('sale.deletedAt IS NULL')
            .andWhere('sale.customerId IS NOT NULL')
            .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
            .andWhere('DATE(sale.saleDate) BETWEEN :start AND :end', { start: startStr, end: endStr })
            .getMany();

        // Agrupar por cliente
        const customerMap = new Map<string, {
            customer: Customer;
            purchases: number;
            amount: number;
            lastDate: Date;
        }>();

        for (const sale of sales) {
            if (!sale.customer) continue;
            const customerId = sale.customerId!;
            if (!customerMap.has(customerId)) {
                customerMap.set(customerId, {
                    customer: sale.customer,
                    purchases: 0,
                    amount: 0,
                    lastDate: new Date(sale.saleDate),
                });
            }
            const cust = customerMap.get(customerId)!;
            cust.purchases++;
            cust.amount += Number(sale.total);
            if (new Date(sale.saleDate) > cust.lastDate) {
                cust.lastDate = new Date(sale.saleDate);
            }
        }

        return Array.from(customerMap.values())
            .map(data => ({
                customerId: data.customer.id,
                customerName: `${data.customer.firstName} ${data.customer.lastName}`.trim(),
                email: data.customer.email,
                phone: data.customer.phone,
                totalPurchases: data.purchases,
                totalAmount: data.amount,
                averageTicket: data.purchases > 0 ? data.amount / data.purchases : 0,
                lastPurchaseDate: data.lastDate,
            }))
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, limit);
    }

    // ============================================
    // REPORTE DE CLIENTES
    // ============================================

    async getCustomersReport(
        period?: ReportPeriod,
        startDate?: string,
        endDate?: string
    ): Promise<CustomersReport> {
        const { start, end } = this.getPeriodDates(period, startDate, endDate);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        // Top clientes
        const topCustomers = await this.getTopCustomers(period, startDate, endDate, 10);

        // Estadísticas de cuentas corrientes
        const accounts = await this.accountRepo.find({
            relations: ['customer'],
        });

        const activeAccounts = accounts.filter(a => a.status === 'active');
        const totalDebt = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
        const accountsWithDebt = accounts.filter(a => Number(a.balance) > 0);
        const overdueAccounts = accounts.filter(a => a.daysOverdue > 0);

        const topDebtors = accountsWithDebt
            .map(a => ({
                customerId: a.customerId,
                customerName: a.customer
                    ? `${a.customer.firstName} ${a.customer.lastName}`.trim()
                    : 'Cliente desconocido',
                balance: Number(a.balance),
                daysOverdue: a.daysOverdue,
            }))
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 10);

        // Clientes nuevos vs recurrentes
        const salesInPeriod = await this.saleRepo
            .createQueryBuilder('sale')
            .where('sale.deletedAt IS NULL')
            .andWhere('sale.customerId IS NOT NULL')
            .andWhere('DATE(sale.saleDate) BETWEEN :start AND :end', { start: startStr, end: endStr })
            .getMany();

        const customerIdsInPeriod = new Set(salesInPeriod.map(s => s.customerId));

        // Clientes que compraron antes del período
        const previousSales = await this.saleRepo
            .createQueryBuilder('sale')
            .where('sale.deletedAt IS NULL')
            .andWhere('sale.customerId IS NOT NULL')
            .andWhere('DATE(sale.saleDate) < :start', { start: startStr })
            .getMany();

        const previousCustomerIds = new Set(previousSales.map(s => s.customerId));

        let newCustomers = 0;
        let returningCustomers = 0;
        for (const customerId of customerIdsInPeriod) {
            if (previousCustomerIds.has(customerId)) {
                returningCustomers++;
            } else {
                newCustomers++;
            }
        }

        return {
            period: { startDate: start, endDate: end },
            topCustomers,
            accountsStats: {
                totalAccounts: accounts.length,
                activeAccounts: activeAccounts.length,
                totalDebt,
                averageDebt: accountsWithDebt.length > 0 ? totalDebt / accountsWithDebt.length : 0,
                overdueAccounts: overdueAccounts.length,
                topDebtors,
            },
            newCustomers,
            returningCustomers,
        };
    }

    // ============================================
    // REPORTE DE GASTOS
    // ============================================

    async getExpensesReport(
        period?: ReportPeriod,
        startDate?: string,
        endDate?: string
    ): Promise<ExpensesReport> {
        const { start, end } = this.getPeriodDates(period, startDate, endDate);
        const { start: prevStart, end: prevEnd } = this.getPreviousPeriod(start, end);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];
        const prevStartStr = prevStart.toISOString().split('T')[0];
        const prevEndStr = prevEnd.toISOString().split('T')[0];

        // Gastos del período actual
        const currentExpenses = await this.expenseRepo
            .createQueryBuilder('expense')
            .leftJoinAndSelect('expense.category', 'category')
            .where('expense.deletedAt IS NULL')
            .andWhere('expense.isPaid = true')
            .andWhere('DATE(expense.expenseDate) BETWEEN :start AND :end', { start: startStr, end: endStr })
            .getMany();

        // Gastos del período anterior
        const previousExpenses = await this.expenseRepo
            .createQueryBuilder('expense')
            .where('expense.deletedAt IS NULL')
            .andWhere('expense.isPaid = true')
            .andWhere('DATE(expense.expenseDate) BETWEEN :start AND :end', { start: prevStartStr, end: prevEndStr })
            .getMany();

        const currentTotal = currentExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const previousTotal = previousExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        // Gastos por categoría
        const categoryMap = new Map<string, { name: string; count: number; total: number }>();
        for (const expense of currentExpenses) {
            const categoryId = expense.categoryId ?? 'uncategorized';
            const categoryName = expense.category?.name ?? 'Sin categoría';
            if (!categoryMap.has(categoryId)) {
                categoryMap.set(categoryId, { name: categoryName, count: 0, total: 0 });
            }
            const cat = categoryMap.get(categoryId)!;
            cat.count++;
            cat.total += Number(expense.amount);
        }

        const byCategory = Array.from(categoryMap.entries())
            .map(([categoryId, data]) => ({
                categoryId: categoryId === 'uncategorized' ? null : categoryId,
                categoryName: data.name,
                count: data.count,
                total: data.total,
                percentage: currentTotal > 0 ? (data.total / currentTotal) * 100 : 0,
            }))
            .sort((a, b) => b.total - a.total);

        // Tendencia mensual (últimos 6 meses)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const monthlyExpenses = await this.expenseRepo
            .createQueryBuilder('expense')
            .where('expense.deletedAt IS NULL')
            .andWhere('expense.isPaid = true')
            .andWhere('expense.expenseDate >= :start', { start: sixMonthsAgo })
            .getMany();

        const monthlyMap = new Map<string, number>();
        for (const expense of monthlyExpenses) {
            const date = new Date(expense.expenseDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + Number(expense.amount));
        }

        const monthlyTrend = Array.from(monthlyMap.entries())
            .map(([month, total]) => ({ month, total }))
            .sort((a, b) => a.month.localeCompare(b.month));

        // Crecimiento
        const amountGrowth = this.calculateGrowthPercentage(currentTotal, previousTotal);
        const countGrowth = this.calculateGrowthPercentage(currentExpenses.length, previousExpenses.length);

        return {
            period: { startDate: start, endDate: end },
            current: {
                totalAmount: currentTotal,
                totalCount: currentExpenses.length,
                byCategory,
                monthlyTrend,
            },
            previous: {
                period: { startDate: prevStart, endDate: prevEnd },
                totalAmount: previousTotal,
                totalCount: previousExpenses.length,
            },
            growth: {
                amountGrowth,
                countGrowth,
            },
        };
    }

    // ============================================
    // FLUJO DE CAJA
    // ============================================

    async getCashFlowReport(
        period?: ReportPeriod,
        startDate?: string,
        endDate?: string
    ): Promise<CashFlowReport> {
        const { start, end } = this.getPeriodDates(period, startDate, endDate);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        // Ingresos (ventas completadas)
        const sales = await this.saleRepo
            .createQueryBuilder('sale')
            .where('sale.deletedAt IS NULL')
            .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
            .andWhere('DATE(sale.saleDate) BETWEEN :start AND :end', { start: startStr, end: endStr })
            .getMany();

        // Egresos (compras pagadas + gastos pagados)
        const purchases = await this.purchaseRepo
            .createQueryBuilder('purchase')
            .where('purchase.deletedAt IS NULL')
            .andWhere('purchase.status = :status', { status: PurchaseStatus.PAID })
            .andWhere('DATE(purchase.purchaseDate) BETWEEN :start AND :end', { start: startStr, end: endStr })
            .getMany();

        const expenses = await this.expenseRepo
            .createQueryBuilder('expense')
            .where('expense.deletedAt IS NULL')
            .andWhere('expense.isPaid = true')
            .andWhere('DATE(expense.expenseDate) BETWEEN :start AND :end', { start: startStr, end: endStr })
            .getMany();

        // Totales
        const totalIncome = sales.reduce((sum, s) => sum + Number(s.total), 0);
        const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.total), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const totalExpense = totalPurchases + totalExpenses;
        const netCashFlow = totalIncome - totalExpense;

        // Datos por día
        const dailyMap = new Map<string, { income: number; expense: number }>();

        // Inicializar todos los días del período
        const currentDate = new Date(start);
        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            dailyMap.set(dateStr, { income: 0, expense: 0 });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Agregar ingresos
        for (const sale of sales) {
            const dateStr = new Date(sale.saleDate).toISOString().split('T')[0];
            if (dailyMap.has(dateStr)) {
                dailyMap.get(dateStr)!.income += Number(sale.total);
            }
        }

        // Agregar egresos de compras
        for (const purchase of purchases) {
            const dateStr = new Date(purchase.purchaseDate).toISOString().split('T')[0];
            if (dailyMap.has(dateStr)) {
                dailyMap.get(dateStr)!.expense += Number(purchase.total);
            }
        }

        // Agregar egresos de gastos
        for (const expense of expenses) {
            const dateStr = new Date(expense.expenseDate).toISOString().split('T')[0];
            if (dailyMap.has(dateStr)) {
                dailyMap.get(dateStr)!.expense += Number(expense.amount);
            }
        }

        // Convertir a array con acumulados
        let cumulative = 0;
        const byDay = Array.from(dailyMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, data]) => {
                const net = data.income - data.expense;
                cumulative += net;
                return {
                    date,
                    income: data.income,
                    expense: data.expense,
                    net,
                    cumulative,
                };
            });

        return {
            period: { startDate: start, endDate: end },
            totalIncome,
            totalExpense,
            netCashFlow,
            byDay,
        };
    }

    // ============================================
    // DASHBOARD RESUMIDO
    // ============================================

    async getDashboardSummary(): Promise<DashboardSummary> {
        const now = new Date();

        // Fechas
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayStr = todayStart.toISOString().split('T')[0];

        const weekStart = new Date(todayStart);
        const dayOfWeek = weekStart.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setDate(weekStart.getDate() - diffToMonday);
        const weekStartStr = weekStart.toISOString().split('T')[0];

        const lastWeekStart = new Date(weekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(weekStart);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
        const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
        const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0];

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const monthStartStr = monthStart.toISOString().split('T')[0];
        const monthEndStr = monthEnd.toISOString().split('T')[0];

        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const lastMonthStartStr = lastMonthStart.toISOString().split('T')[0];
        const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];

        // HOY
        const todaySales = await this.saleRepo
            .createQueryBuilder('sale')
            .where('sale.deletedAt IS NULL')
            .andWhere('DATE(sale.saleDate) = :date', { date: todayStr })
            .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
            .getMany();

        const todayIncomes = await this.incomeRepo
            .createQueryBuilder('income')
            .where('income.deletedAt IS NULL')
            .andWhere('DATE(income.incomeDate) = :date', { date: todayStr })
            .andWhere('income.isPaid = true')
            .getMany();

        const todayExpenses = await this.expenseRepo
            .createQueryBuilder('expense')
            .where('expense.deletedAt IS NULL')
            .andWhere('DATE(expense.expenseDate) = :date', { date: todayStr })
            .andWhere('expense.isPaid = true')
            .getMany();

        const todayPurchases = await this.purchaseRepo
            .createQueryBuilder('purchase')
            .where('purchase.deletedAt IS NULL')
            .andWhere('DATE(purchase.purchaseDate) = :date', { date: todayStr })
            .andWhere('purchase.status = :status', { status: PurchaseStatus.PAID })
            .getMany();

        const todaySalesRevenue = todaySales.reduce((sum, s) => sum + Number(s.total), 0) + todayIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
        const todayExpensesAmount = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const todayPurchasesAmount = todayPurchases.reduce((sum, p) => sum + Number(p.total), 0);

        // Pagos de Cuenta Corriente (Ingresos Reales)
        const todayAccountPayments = await this.accountMovementRepo
            .createQueryBuilder('movement')
            .where('movement.deletedAt IS NULL')
            .andWhere('DATE(movement.createdAt) = :date', { date: todayStr })
            .andWhere('movement.movementType = :type', { type: MovementType.PAYMENT })
            .getMany();

        const todayAccountPaymentsAmount = todayAccountPayments.reduce((sum, m) => sum + Math.abs(Number(m.amount)), 0);

        // Ajuste de flujo de caja: Consideramos Ventas + Ingresos + Cobros de Deuda - Gastos - Compras
        // Nota: Si la venta fue a crédito hoy, se suma en SalesRevenue. Idealmente deberíamos restar la parte a crédito para netCashFlow puro,
        // pero por simplicidad y para responder al usuario, sumamos los cobros de deuda al flujo.
        const todayNetCashFlow = todaySalesRevenue + todayAccountPaymentsAmount - todayExpensesAmount - todayPurchasesAmount;

        // SEMANA
        const weekSales = await this.saleRepo
            .createQueryBuilder('sale')
            .where('sale.deletedAt IS NULL')
            .andWhere('DATE(sale.saleDate) BETWEEN :start AND :end', { start: weekStartStr, end: todayStr })
            .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
            .getMany();

        const weekIncomes = await this.incomeRepo
            .createQueryBuilder('income')
            .where('income.deletedAt IS NULL')
            .andWhere('DATE(income.incomeDate) BETWEEN :start AND :end', { start: weekStartStr, end: todayStr })
            .andWhere('income.isPaid = true')
            .getMany();

        const lastWeekSales = await this.saleRepo
            .createQueryBuilder('sale')
            .where('sale.deletedAt IS NULL')
            .andWhere('DATE(sale.saleDate) BETWEEN :start AND :end', { start: lastWeekStartStr, end: lastWeekEndStr })
            .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
            .getMany();

        const lastWeekIncomes = await this.incomeRepo
            .createQueryBuilder('income')
            .where('income.deletedAt IS NULL')
            .andWhere('DATE(income.incomeDate) BETWEEN :start AND :end', { start: lastWeekStartStr, end: lastWeekEndStr })
            .andWhere('income.isPaid = true')
            .getMany();

        const weekExpenses = await this.expenseRepo
            .createQueryBuilder('expense')
            .where('expense.deletedAt IS NULL')
            .andWhere('DATE(expense.expenseDate) BETWEEN :start AND :end', { start: weekStartStr, end: todayStr })
            .andWhere('expense.isPaid = true')
            .getMany();

        const lastWeekExpenses = await this.expenseRepo
            .createQueryBuilder('expense')
            .where('expense.deletedAt IS NULL')
            .andWhere('DATE(expense.expenseDate) BETWEEN :start AND :end', { start: lastWeekStartStr, end: lastWeekEndStr })
            .andWhere('expense.isPaid = true')
            .getMany();

        const weekSalesRevenue = weekSales.reduce((sum, s) => sum + Number(s.total), 0) + weekIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
        const lastWeekSalesRevenue = lastWeekSales.reduce((sum, s) => sum + Number(s.total), 0) + lastWeekIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
        const weekExpensesAmount = weekExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const lastWeekExpensesAmount = lastWeekExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        const weekAccountPayments = await this.accountMovementRepo
            .createQueryBuilder('movement')
            .where('movement.deletedAt IS NULL')
            .andWhere('DATE(movement.createdAt) BETWEEN :start AND :end', { start: weekStartStr, end: todayStr })
            .andWhere('movement.movementType = :type', { type: MovementType.PAYMENT })
            .getMany();
        // weekAccountPaymentsAmount se calcula pero no se usa actualmente en el retorno
        // Se mantiene comentado para futura implementación
        // const weekAccountPaymentsAmount = weekAccountPayments.reduce((sum, m) => sum + Math.abs(Number(m.amount)), 0);

        // MES
        const monthSales = await this.saleRepo
            .createQueryBuilder('sale')
            .where('sale.deletedAt IS NULL')
            .andWhere('DATE(sale.saleDate) BETWEEN :start AND :end', { start: monthStartStr, end: monthEndStr })
            .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
            .getMany();

        const monthIncomes = await this.incomeRepo
            .createQueryBuilder('income')
            .where('income.deletedAt IS NULL')
            .andWhere('DATE(income.incomeDate) BETWEEN :start AND :end', { start: monthStartStr, end: monthEndStr })
            .andWhere('income.isPaid = true')
            .getMany();

        const monthPurchases = await this.purchaseRepo
            .createQueryBuilder('purchase')
            .where('purchase.deletedAt IS NULL')
            .andWhere('DATE(purchase.purchaseDate) BETWEEN :start AND :end', { start: monthStartStr, end: monthEndStr })
            .andWhere('purchase.status = :status', { status: PurchaseStatus.PAID })
            .getMany();

        const lastMonthSales = await this.saleRepo
            .createQueryBuilder('sale')
            .where('sale.deletedAt IS NULL')
            .andWhere('DATE(sale.saleDate) BETWEEN :start AND :end', { start: lastMonthStartStr, end: lastMonthEndStr })
            .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
            .getMany();

        const lastMonthIncomes = await this.incomeRepo
            .createQueryBuilder('income')
            .where('income.deletedAt IS NULL')
            .andWhere('DATE(income.incomeDate) BETWEEN :start AND :end', { start: lastMonthStartStr, end: lastMonthEndStr })
            .andWhere('income.isPaid = true')
            .getMany();

        const monthExpenses = await this.expenseRepo
            .createQueryBuilder('expense')
            .where('expense.deletedAt IS NULL')
            .andWhere('DATE(expense.expenseDate) BETWEEN :start AND :end', { start: monthStartStr, end: monthEndStr })
            .andWhere('expense.isPaid = true')
            .getMany();

        const lastMonthExpenses = await this.expenseRepo
            .createQueryBuilder('expense')
            .where('expense.deletedAt IS NULL')
            .andWhere('DATE(expense.expenseDate) BETWEEN :start AND :end', { start: lastMonthStartStr, end: lastMonthEndStr })
            .andWhere('expense.isPaid = true')
            .getMany();



        const monthSalesRevenue = monthSales.reduce((sum, s) => sum + Number(s.total), 0) + monthIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
        const lastMonthSalesRevenue = lastMonthSales.reduce((sum, s) => sum + Number(s.total), 0) + lastMonthIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
        const monthExpensesAmount = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const lastMonthExpensesAmount = lastMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const monthPurchasesAmount = monthPurchases.reduce((sum, p) => sum + Number(p.total), 0);

        // monthNetProfit y monthNetMargin se calculan pero no se usan actualmente
        // Se mantienen comentados para futura implementación
        // const monthNetProfit = monthSalesRevenue - monthPurchasesAmount - monthExpensesAmount;
        // const monthNetMargin = monthSalesRevenue > 0 ? (monthNetProfit / monthSalesRevenue) * 100 : 0;
        void (monthSalesRevenue - monthPurchasesAmount - monthExpensesAmount); // Silencia warning de variables no usadas

        // INVENTARIO
        const globalMinStock = await this.configurationService.getMinStockAlert();
        const products = await this.productRepo.find({ where: { isActive: true } });
        const totalProducts = products.length;
        const lowStock = products.filter(p => p.stock > 0 && p.stock <= globalMinStock).length;
        const outOfStock = products.filter(p => p.stock === 0).length;
        const totalValue = products.reduce((sum, p) => sum + (p.stock * Number(p.cost)), 0);

        // CUENTAS CORRIENTES
        const accounts = await this.accountRepo.find();
        const totalDebt = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
        const overdueAccounts = accounts.filter(a => a.daysOverdue > 0).length;

        // ESTADO DE CAJA
        const openRegister = await this.cashRegisterService.getOpenRegister();
        const cashRegister = {
            isOpen: !!openRegister,
            balance: openRegister
                ? Number(openRegister.initialAmount) + Number(openRegister.totalIncome) - Number(openRegister.totalExpense)
                : 0,
            openedBy: openRegister?.openedBy?.firstName ?? null,
            openedAt: openRegister?.openedAt ?? null,
        };

        // GRÁFICOS - Ventas últimos 7 días
        const last7DaysData: Array<{ date: string; revenue: number; salesCount: number }> = [];
        for (let i = 6; i >= 0; i--) {
            const dayDate = new Date(todayStart);
            dayDate.setDate(dayDate.getDate() - i);
            const dayStr = dayDate.toISOString().split('T')[0];

            const daySales = await this.saleRepo
                .createQueryBuilder('sale')
                .where('sale.deletedAt IS NULL')
                .andWhere('DATE(sale.saleDate) = :date', { date: dayStr })
                .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
                .getMany();

            last7DaysData.push({
                date: dayStr,
                revenue: daySales.reduce((sum, s) => sum + Number(s.total), 0),
                salesCount: daySales.length,
            });
        }

        // TOP 5 PRODUCTOS DEL MES
        const topProducts = await this.getTopProducts(
            undefined,
            monthStartStr,
            monthEndStr,
            5
        );

        // Cálculos de crecimiento
        const calculateGrowth = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        return {
            today: {
                sales: { revenue: todaySalesRevenue, count: todaySales.length + todayIncomes.length },
                expenses: { amount: todayExpensesAmount, count: todayExpenses.length },
                purchases: { amount: todayPurchasesAmount, count: todayPurchases.length },
                netCashFlow: todayNetCashFlow,
            },
            week: {
                sales: {
                    revenue: weekSalesRevenue,
                    count: weekSales.length + weekIncomes.length,
                    growth: calculateGrowth(weekSalesRevenue, lastWeekSalesRevenue),
                },
                expenses: {
                    amount: weekExpensesAmount,
                    count: weekExpenses.length,
                    growth: calculateGrowth(weekExpensesAmount, lastWeekExpensesAmount),
                },
            },
            month: {
                sales: {
                    revenue: monthSalesRevenue,
                    count: monthSales.length + monthIncomes.length,
                    growth: calculateGrowth(monthSalesRevenue, lastMonthSalesRevenue),
                },
                expenses: {
                    amount: monthExpensesAmount,
                    count: monthExpenses.length,
                    growth: calculateGrowth(monthExpensesAmount, lastMonthExpensesAmount),
                },
                netProfit: monthSalesRevenue - monthPurchasesAmount - monthExpensesAmount,
                netMargin: monthSalesRevenue > 0 ? ((monthSalesRevenue - monthPurchasesAmount - monthExpensesAmount) / monthSalesRevenue) * 100 : 0,
            },
            inventory: {
                totalProducts,
                lowStock,
                outOfStock,
                totalValue,
            },
            accounts: {
                totalDebt,
                overdueAccounts,
            },
            cashRegister,
            charts: {
                last7Days: last7DaysData,
            },
            topProducts: topProducts.map(p => ({
                productId: p.productId,
                productName: p.productName,
                quantitySold: p.quantitySold,
                revenue: p.revenue,
            })),
            alerts: {
                cashClosed: !openRegister,
                lowStockCount: lowStock,
                outOfStockCount: outOfStock,
                overdueAccountsCount: overdueAccounts,
            },
        };
    }
}
