/**
 * Controlador de Proveedores
 * Endpoints REST para gestión de proveedores
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
    ParseUUIDPipe,
    UseGuards,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto, SupplierFiltersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
    constructor(private readonly suppliersService: SuppliersService) {}

    /**
     * Crea un nuevo proveedor
     * POST /api/suppliers
     */
    @Post()
    create(@Body() createSupplierDto: CreateSupplierDto) {
        return this.suppliersService.create(createSupplierDto);
    }

    /**
     * Lista proveedores con filtros y paginación
     * GET /api/suppliers
     */
    @Get()
    findAll(@Query() filters: SupplierFiltersDto) {
        return this.suppliersService.findAll(filters);
    }

    /**
     * Lista proveedores activos (para selectores)
     * GET /api/suppliers/active
     */
    @Get('active')
    findActive() {
        return this.suppliersService.findActive();
    }

    /**
     * Obtiene estadísticas de proveedores
     * GET /api/suppliers/stats
     */
    @Get('stats')
    getStats() {
        return this.suppliersService.getStats();
    }

    /**
     * Busca proveedores por nombre
     * GET /api/suppliers/search?term=xxx
     */
    @Get('search')
    search(@Query('term') term: string) {
        return this.suppliersService.searchByName(term || '');
    }

    /**
     * Lista clasificaciones únicas de proveedores
     * GET /api/suppliers/classifications
     */
    @Get('classifications')
    getClassifications() {
        return this.suppliersService.getClassifications();
    }

    /**
     * Obtiene un proveedor por ID
     * GET /api/suppliers/:id
     */
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.suppliersService.findOne(id);
    }

    /**
     * Actualiza un proveedor
     * PATCH /api/suppliers/:id
     */
    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateSupplierDto: UpdateSupplierDto,
    ) {
        return this.suppliersService.update(id, updateSupplierDto);
    }

    /**
     * Desactiva un proveedor
     * DELETE /api/suppliers/:id
     */
    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.suppliersService.remove(id);
    }
}
