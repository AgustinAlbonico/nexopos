import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { ActivationService } from './activation.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { ActivateStockSectorizadoDto } from './dto/activate-stock-sectorizado.dto';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Controlador de inventario - Gestiona stock y movimientos
 */
@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InventoryController {
    constructor(
        private readonly inventoryService: InventoryService,
        private readonly activationService: ActivationService,
    ) { }

    @Get('stats')
    @ApiOperation({ summary: 'Obtener estadísticas generales de inventario' })
    @ApiResponse({ status: 200, description: 'Estadísticas del inventario' })
    getStats() {
        return this.inventoryService.getInventoryStats();
    }

    @Get('products')
    @ApiOperation({ summary: 'Obtener todos los productos con su stock' })
    @ApiResponse({ status: 200, description: 'Lista de productos con stock' })
    getAllProductsStock() {
        return this.inventoryService.getAllProductsStock();
    }

    @Get('low-stock')
    @ApiOperation({ summary: 'Obtener productos con stock bajo' })
    @ApiResponse({ status: 200, description: 'Lista de productos con stock bajo' })
    getLowStock() {
        return this.inventoryService.getLowStockProducts();
    }

    @Get('stock-alerts')
    @ApiOperation({
        summary: 'Obtener alertas separadas de compra (total vs minStockAlert) y reposición (salón vs stockMinimoVenta)',
    })
    @ApiResponse({ status: 200, description: 'Alertas separadas de compra y reposición' })
    getStockAlerts() {
        return this.inventoryService.getStockAlerts();
    }

    @Get('out-of-stock')
    @ApiOperation({ summary: 'Obtener productos sin stock' })
    @ApiResponse({ status: 200, description: 'Lista de productos sin stock' })
    getOutOfStock() {
        return this.inventoryService.getOutOfStockProducts();
    }

    @Post('movement')
    @ApiOperation({ summary: 'Registrar movimiento de stock (entrada o salida)' })
    @ApiResponse({ status: 201, description: 'Movimiento registrado exitosamente' })
    @ApiResponse({ status: 400, description: 'Stock insuficiente o datos inválidos' })
    createMovement(@Body() createStockMovementDto: CreateStockMovementDto) {
        return this.inventoryService.createMovement(createStockMovementDto);
    }

    @Get('product/:id/history')
    @ApiOperation({ summary: 'Obtener historial de movimientos de un producto' })
    @ApiResponse({ status: 200, description: 'Historial de movimientos' })
    @ApiResponse({ status: 404, description: 'Producto no encontrado' })
    getProductHistory(@Param('id') id: string) {
        return this.inventoryService.getProductHistory(id);
    }

    @Post('validate-stock')
    @ApiOperation({ summary: 'Validar disponibilidad de stock para múltiples productos' })
    @ApiResponse({ status: 200, description: 'Resultado de validación' })
    validateStock(@Body() items: { productId: string; quantity: number }[]) {
        return this.inventoryService.validateStockAvailability(items);
    }

    @Post('activate')
    @ApiOperation({ summary: 'Activar el modo sectorizado (asistente transaccional)' })
    @ApiResponse({ status: 201, description: 'Modo sectorizado activado' })
    @ApiResponse({ status: 400, description: 'Datos inválidos o distribución inconsistente' })
    @ApiResponse({ status: 409, description: 'El modo sectorizado ya está activo' })
    activate(@Body() dto: ActivateStockSectorizadoDto) {
        return this.activationService.activate(dto);
    }

    // --- Locations CRUD (PR7) ------------------------------------------

    @Get('locations')
    @ApiOperation({ summary: 'Listar ubicaciones (activas primero, inactivas al final)' })
    @ApiResponse({ status: 200, description: 'Lista de ubicaciones' })
    listLocations() {
        return this.inventoryService.listLocations();
    }

    @Post('locations')
    @ApiOperation({ summary: 'Crear una ubicación' })
    @ApiResponse({ status: 201, description: 'Ubicación creada' })
    @ApiResponse({ status: 409, description: 'Nombre duplicado o flag primario/destino ya tomado' })
    createLocation(@Body() dto: CreateLocationDto) {
        return this.inventoryService.createLocation(dto);
    }

    @Patch('locations/:id')
    @ApiOperation({ summary: 'Editar una ubicación (nombre, función, flags)' })
    @ApiResponse({ status: 200, description: 'Ubicación actualizada' })
    @ApiResponse({ status: 404, description: 'Ubicación no encontrada' })
    @ApiResponse({ status: 409, description: 'Conflicto de unicidad' })
    updateLocation(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
        return this.inventoryService.updateLocation(id, dto);
    }

    @Post('locations/:id/deactivate')
    @ApiOperation({ summary: 'Desactivar una ubicación (rechaza si tiene saldo > 0)' })
    @ApiResponse({ status: 200, description: 'Ubicación desactivada' })
    @ApiResponse({ status: 404, description: 'Ubicación no encontrada' })
    @ApiResponse({ status: 409, description: 'La ubicación tiene stock' })
    deactivateLocation(@Param('id') id: string) {
        return this.inventoryService.deactivateLocation(id);
    }

    // --- Transfers + per-product breakdown (PR9) -----------------------

    @Post('transfers')
    @ApiOperation({ summary: 'Crear un traslado entre dos ubicaciones (modo sectorizado)' })
    @ApiResponse({ status: 201, description: 'Traslado creado' })
    @ApiResponse({ status: 400, description: 'Datos inválidos, saldo insuficiente o ubicaciones inactivas' })
    createTransfer(@Body() dto: CreateStockTransferDto, @Req() req: { user?: { id?: string } }) {
        return this.inventoryService.createTransfer(dto, req.user?.id);
    }

    @Get('products/:productId/stock-by-location')
    @ApiOperation({ summary: 'Desglose de stock por ubicación para un producto (PR9)' })
    @ApiResponse({ status: 200, description: 'Lista de ubicaciones con su saldo para el producto' })
    @ApiResponse({ status: 404, description: 'Producto no encontrado' })
    getProductStockByLocation(@Param('productId') productId: string) {
        return this.inventoryService.getProductStockByLocation(productId);
    }
}
