/**
 * Controlador de Reportes
 * Endpoints para análisis financieros y operativos
 */
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { ReportFiltersDto, TopProductsFiltersDto, TopCustomersFiltersDto, ProductsByIdReportDto } from './dto';

import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

    /**
     * GET /api/reports/apparel
     * Obtiene indicadores específicos de indumentaria (curva de talles, sell-through, colores, curvas rotas)
     */
    @Get('apparel')
    getApparelMetrics(@Query() filters: ReportFiltersDto) {
        return this.reportsService.getApparelMetrics(
            filters.startDate,
            filters.endDate
        );
    }

    /**
     * GET /api/reports/dashboard
     * Obtiene resumen del dashboard con métricas clave
     */
    @Get('dashboard')
    @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
    getDashboardSummary() {
        return this.reportsService.getDashboardSummary();
    }

    /**
     * GET /api/reports/financial
     * Obtiene reporte financiero general
     */
    @Get('financial')
    getFinancialReport(@Query() filters: ReportFiltersDto) {
        return this.reportsService.getFinancialReport(
            filters.period,
            filters.startDate,
            filters.endDate
        );
    }

    /**
     * GET /api/reports/sales
     * Obtiene reporte detallado de ventas
     */
    @Get('sales')
    getSalesReport(@Query() filters: ReportFiltersDto) {
        return this.reportsService.getSalesReport(
            filters.period,
            filters.startDate,
            filters.endDate
        );
    }

    /**
     * GET /api/reports/products
     * Obtiene reporte de productos
     */
    @Get('products')
    getProductsReport(@Query() filters: ReportFiltersDto) {
        return this.reportsService.getProductsReport(
            filters.period,
            filters.startDate,
            filters.endDate
        );
    }

    /**
     * GET /api/reports/top-products
     * Obtiene top productos más vendidos
     */
    @Get('top-products')
    getTopProducts(@Query() filters: TopProductsFiltersDto) {
        return this.reportsService.getTopProducts(
            filters.period,
            filters.startDate,
            filters.endDate,
            filters.limit
        );
    }

    /**
     * GET /api/reports/products-by-ids
     * Obtiene reporte de productos seleccionados por id
     */
    @Get('products-by-ids')
    getProductsByIds(@Query() filters: ProductsByIdReportDto) {
        return this.reportsService.getProductsByIds(
            filters.productIds,
            filters.period,
            filters.startDate,
            filters.endDate
        );
    }

    /**
     * GET /api/reports/customers
     * Obtiene reporte de clientes
     */
    @Get('customers')
    getCustomersReport(@Query() filters: ReportFiltersDto) {
        return this.reportsService.getCustomersReport(
            filters.period,
            filters.startDate,
            filters.endDate
        );
    }

    /**
     * GET /api/reports/top-customers
     * Obtiene top clientes por volumen de compra
     */
    @Get('top-customers')
    getTopCustomers(@Query() filters: TopCustomersFiltersDto) {
        return this.reportsService.getTopCustomers(
            filters.period,
            filters.startDate,
            filters.endDate,
            filters.limit
        );
    }

    /**
     * GET /api/reports/expenses
     * Obtiene reporte de gastos
     */
    @Get('expenses')
    getExpensesReport(@Query() filters: ReportFiltersDto) {
        return this.reportsService.getExpensesReport(
            filters.period,
            filters.startDate,
            filters.endDate
        );
    }

    /**
     * GET /api/reports/cash-flow
     * Obtiene reporte de flujo de caja
     */
    @Get('cash-flow')
    getCashFlowReport(@Query() filters: ReportFiltersDto) {
        return this.reportsService.getCashFlowReport(
            filters.period,
            filters.startDate,
            filters.endDate
        );
    }

    /**
     * GET /api/reports/seller-commissions
     * Reporte de comisiones por vendedor
     */
    @Get('seller-commissions')
    getSellerCommissions(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('commissionRate') commissionRate?: number,
    ) {
        return this.reportsService.getSellerCommissions(startDate, endDate, commissionRate ? Number(commissionRate) : 3);
    }
}
