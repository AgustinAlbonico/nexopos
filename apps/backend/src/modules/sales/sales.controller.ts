/**
 * Controlador de Ventas
 * Endpoints para gestionar ventas
 */
import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    Request,
    ParseUUIDPipe,
} from '@nestjs/common';
import { SalesService, PaginatedSales, SaleStats } from './sales.service';
import {
    CreateSaleDto,
    UpdateSaleDto,
    SaleFiltersDto,
    CheckReplenishmentItemDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest, PaymentDto } from '../auth/interfaces';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
    constructor(private readonly salesService: SalesService) { }

    /**
     * Crea una nueva venta. Si el DTO trae `replenishmentTransfers`, se
     * enruta al flujo "Reponer y continuar" (sectorizado): los traslados
     * y la venta se ejecutan en una sola transacción.
     */
    @Post()
    create(@Body() dto: CreateSaleDto, @Request() req: AuthenticatedRequest) {
        if (dto.replenishmentTransfers && dto.replenishmentTransfers.length > 0) {
            return this.salesService.completeSaleAfterReplenishment(
                dto,
                dto.replenishmentTransfers,
                req.user?.userId,
            );
        }
        return this.salesService.create(dto, req.user?.userId);
    }

    /**
     * Lee opciones de reposición por ítem para el POS (read-only).
     * Devuelve por cada producto: stock en la primaria, si requiere
     * reposición, y alternativas en otras ubicaciones activas.
     */
    @Post('check-replenishment')
    checkReplenishment(@Body() body: { items: CheckReplenishmentItemDto[] }) {
        return this.salesService.checkReplenishment(body.items ?? []);
    }

    /**
     * Obtiene ventas con filtros y paginación
     */
    @Get()
    findAll(@Query() filters: SaleFiltersDto): Promise<PaginatedSales> {
        return this.salesService.findAll(filters);
    }

    /**
     * Obtiene estadísticas de ventas
     */
    @Get('stats')
    getStats(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ): Promise<SaleStats> {
        return this.salesService.getStats(startDate, endDate);
    }

    /**
     * FIX 1.1: Verifica si se puede crear una venta
     * Retorna el estado de la caja y si está habilitado para vender
     */
    @Get('can-create')
    async canCreate(): Promise<{ canCreate: boolean; reason?: string }> {
        return this.salesService.canCreateSale();
    }

    /**
     * Obtiene ventas del día actual
     */
    @Get('today')
    getTodaySales() {
        return this.salesService.getTodaySales();
    }

    /**
     * Obtiene una venta por ID
     */
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.salesService.findOne(id);
    }

    /**
     * Actualiza una venta
     */
    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateSaleDto,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.salesService.update(id, dto, req.user?.userId);
    }

    /**
     * Cancela una venta
     */
    @Patch(':id/cancel')
    cancel(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
        return this.salesService.cancel(id, req.user?.userId);
    }

    /**
     * Marca una venta pendiente como pagada
     */
    @Patch(':id/pay')
    markAsPaid(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: { payments: PaymentDto[] },
        @Request() req: AuthenticatedRequest,
    ) {
        return this.salesService.markAsPaid(id, body.payments || [], req.user?.userId);
    }

    /**
     * Elimina una venta (soft delete)
     */
    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
        return this.salesService.remove(id, req.user?.userId);
    }
}

