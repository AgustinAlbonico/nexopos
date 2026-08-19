import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
    CreateProductDto,
    UpdateProductDto,
    QueryProductsDto,
    ResolveVariableBarcodeDto,
    GenerateVariantsDto,
    CreateApparelMatrixProductDto,
} from './dto';
import { CreateSizeScaleDto, UpdateSizeScaleDto } from './dto/create-size-scale.dto';
import { CreateColorPaletteDto, UpdateColorPaletteDto } from './dto/create-color-palette.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Controlador de productos simplificado con soporte de variantes por rubro
 */
@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post()
    @ApiOperation({ summary: 'Crear producto (precio calculado automáticamente)' })
    @ApiResponse({ status: 201, description: 'Producto creado' })
    create(@Body() createProductDto: CreateProductDto) {
        return this.productsService.create(createProductDto);
    }

    @Post('matrix')
    @ApiOperation({ summary: 'Crear modelo y matriz de variantes atómicamente para Indumentaria y Calzado' })
    @ApiResponse({ status: 201, description: 'Modelo y variantes creadas exitosamente' })
    createMatrix(@Body() dto: CreateApparelMatrixProductDto) {
        return this.productsService.createMatrixProduct(dto);
    }

    @Post('variable-barcode/resolve')
    @ApiOperation({ summary: 'Resolver un código de barras variable local' })
    resolveVariableBarcode(@Body() dto: ResolveVariableBarcodeDto) {
        return this.productsService.findByVariableBarcode(dto.barcode, dto.layout);
    }

    @Post(':id/variants/generate')
    @ApiOperation({ summary: 'Generar variantes vendibles para un producto padre' })
    generateVariants(@Param('id') id: string, @Body() dto: GenerateVariantsDto) {
        return this.productsService.generateVariants(id, dto.attributes);
    }

    @Get()
    @ApiOperation({ summary: 'Listar productos' })
    findAll(@Query() query: QueryProductsDto) {
        return this.productsService.findAll(query);
    }

    @Get('apparel/suggestions')
    @ApiOperation({ summary: 'Obtener sugerencias de temporadas y colecciones existentes' })
    getApparelSuggestions() {
        return this.productsService.getApparelSuggestions();
    }

    // --- Plantillas Maestras de Talles ---
    @Get('size-scales')
    @ApiOperation({ summary: 'Listar escalas de talles maestras y personalizadas' })
    getSizeScales() {
        return this.productsService.getSizeScales();
    }

    @Post('size-scales')
    @ApiOperation({ summary: 'Crear una nueva escala de talles personalizada' })
    createSizeScale(@Body() dto: CreateSizeScaleDto) {
        return this.productsService.createSizeScale(dto);
    }

    @Put('size-scales/:id')
    @ApiOperation({ summary: 'Actualizar una escala de talles personalizada' })
    updateSizeScale(@Param('id') id: string, @Body() dto: UpdateSizeScaleDto) {
        return this.productsService.updateSizeScale(id, dto);
    }

    @Delete('size-scales/:id')
    @ApiOperation({ summary: 'Eliminar una escala de talles personalizada' })
    deleteSizeScale(@Param('id') id: string) {
        return this.productsService.deleteSizeScale(id);
    }

    // --- Plantillas Maestras de Paletas de Colores ---
    @Get('color-palettes')
    @ApiOperation({ summary: 'Listar paletas de colores maestras y personalizadas' })
    getColorPalettes() {
        return this.productsService.getColorPalettes();
    }

    @Post('color-palettes')
    @ApiOperation({ summary: 'Crear una nueva paleta de colores personalizada' })
    createColorPalette(@Body() dto: CreateColorPaletteDto) {
        return this.productsService.createColorPalette(dto);
    }

    @Put('color-palettes/:id')
    @ApiOperation({ summary: 'Actualizar una paleta de colores personalizada' })
    updateColorPalette(@Param('id') id: string, @Body() dto: UpdateColorPaletteDto) {
        return this.productsService.updateColorPalette(id, dto);
    }

    @Delete('color-palettes/:id')
    @ApiOperation({ summary: 'Eliminar una paleta de colores personalizada' })
    deleteColorPalette(@Param('id') id: string) {
        return this.productsService.deleteColorPalette(id);
    }

    @Get('barcode/:barcode')
    @ApiOperation({ summary: 'Buscar producto por código de barras' })
    @ApiResponse({ status: 200, description: 'Producto encontrado' })
    @ApiResponse({ status: 404, description: 'Producto no encontrado' })
    findByBarcode(@Param('barcode') barcode: string) {
        return this.productsService.findByBarcode(barcode);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener producto por ID' })
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar producto' })
    update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
        return this.productsService.update(id, updateProductDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar producto' })
    remove(@Param('id') id: string) {
        return this.productsService.remove(id);
    }
}
