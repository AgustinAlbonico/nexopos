import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Delete,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VariantAttributeOptionsService } from './variant-attribute-options.service';
import { CreateVariantAttributeOptionDto } from './dto/create-variant-attribute-option.dto';
import { UpdateVariantAttributeOptionDto } from './dto/update-variant-attribute-option.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('variant-attribute-options')
@Controller('variant-attribute-options')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VariantAttributeOptionsController {
    constructor(
        private readonly variantAttributeOptionsService: VariantAttributeOptionsService,
    ) { }

    @Get('search')
    @ApiOperation({ summary: 'Buscar opciones por nombre (autocomplete) dentro de un tipo' })
    @ApiQuery({ name: 'q', required: false, description: 'Texto a buscar' })
    @ApiQuery({ name: 'type', required: true, enum: ['color', 'size'], description: 'Tipo de atributo' })
    @ApiResponse({ status: 200, description: 'Opciones que coinciden' })
    search(
        @Query('q') query: string,
        @Query('type') type: 'color' | 'size',
    ) {
        return this.variantAttributeOptionsService.search(type, query || '');
    }

    @Get()
    @ApiOperation({ summary: 'Listar todas las opciones (opcionalmente filtradas por tipo)' })
    @ApiQuery({ name: 'type', required: false, enum: ['color', 'size'], description: 'Filtrar por tipo' })
    findAll(@Query('type') type?: 'color' | 'size') {
        return this.variantAttributeOptionsService.findAll(type);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener una opción por ID' })
    findOne(@Param('id') id: string) {
        return this.variantAttributeOptionsService.findOne(id);
    }

    @Get(':id/usage-count')
    @ApiOperation({ summary: 'Obtener cantidad de productos que usan esta opción' })
    @ApiResponse({ status: 200, description: 'Conteo de uso' })
    getUsageCount(@Param('id') id: string) {
        return this.variantAttributeOptionsService.getUsageCount(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Crear u obtener opción existente por (type, name)' })
    @ApiResponse({ status: 201, description: 'Opción creada o encontrada' })
    @ApiResponse({ status: 403, description: 'Capacidad STRUCTURAL.variants deshabilitada' })
    create(@Body() createDto: CreateVariantAttributeOptionDto) {
        return this.variantAttributeOptionsService.create(createDto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar nombre y/o colorHex de una opción' })
    @ApiResponse({ status: 200, description: 'Opción actualizada' })
    @ApiResponse({ status: 404, description: 'Opción no encontrada' })
    @ApiResponse({ status: 409, description: 'Nombre duplicado dentro del mismo tipo' })
    update(@Param('id') id: string, @Body() updateDto: UpdateVariantAttributeOptionDto) {
        return this.variantAttributeOptionsService.update(id, updateDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar una opción' })
    @ApiResponse({ status: 200, description: 'Opción eliminada' })
    @ApiResponse({ status: 404, description: 'Opción no encontrada' })
    remove(@Param('id') id: string) {
        return this.variantAttributeOptionsService.remove(id);
    }
}