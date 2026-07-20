/**
 * Controlador de gastos
 * Expone endpoints REST para gestionar gastos del negocio
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
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import {
    CreateExpenseDto,
    UpdateExpenseDto,
    ExpenseFiltersDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/types';

@ApiTags('expenses')
@Controller('expenses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) { }

    @Post()
    @ApiOperation({ summary: 'Registrar nuevo gasto' })
    @ApiResponse({ status: 201, description: 'Gasto registrado' })
    @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
    create(@Body() dto: CreateExpenseDto, @Request() req: AuthenticatedRequest) {
        return this.expensesService.create(dto, req.user?.userId);
    }

    @Get()
    @ApiOperation({ summary: 'Listar gastos con filtros' })
    @ApiResponse({ status: 200, description: 'Lista paginada de gastos' })
    findAll(@Query() filters: ExpenseFiltersDto) {
        return this.expensesService.findAll(filters);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Obtener estadísticas de gastos' })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Estadísticas de gastos' })
    getStats(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.expensesService.getStats(startDate, endDate);
    }

    @Get('recurring-suggestions')
    @ApiOperation({ summary: 'Obtener sugerencias de gastos recurrentes del mes' })
    @ApiResponse({ status: 200, description: 'Gastos recurrentes pendientes este mes' })
    getRecurringSuggestions() {
        return this.expensesService.getRecurringSuggestions();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener gasto por ID' })
    @ApiResponse({ status: 200, description: 'Gasto encontrado' })
    @ApiResponse({ status: 404, description: 'Gasto no encontrado' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.expensesService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar gasto' })
    @ApiResponse({ status: 200, description: 'Gasto actualizado' })
    @ApiResponse({ status: 404, description: 'Gasto no encontrado' })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateExpenseDto,
    ) {
        return this.expensesService.update(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar gasto' })
    @ApiResponse({ status: 200, description: 'Gasto eliminado' })
    @ApiResponse({ status: 404, description: 'Gasto no encontrado' })
    remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
        return this.expensesService.remove(id, req.user?.userId);
    }

    @Patch(':id/mark-paid')
    @ApiOperation({ summary: 'Marcar gasto como pagado' })
    @ApiResponse({ status: 200, description: 'Gasto marcado como pagado' })
    @ApiResponse({ status: 400, description: 'No hay caja abierta o gasto ya pagado' })
    @ApiResponse({ status: 404, description: 'Gasto no encontrado' })
    markAsPaid(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('paymentMethodId', ParseUUIDPipe) paymentMethodId: string,
        @Request() req: any,
    ) {
        return this.expensesService.markAsPaid(id, req.user?.userId, paymentMethodId);
    }
}

