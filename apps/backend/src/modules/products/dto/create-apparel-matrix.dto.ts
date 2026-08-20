import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsString,
    IsOptional,
    IsNumber,
    IsBoolean,
    IsUUID,
    Min,
    Length,
    IsArray,
    ValidateNested,
    ArrayMinSize,
} from 'class-validator';

export class ApparelMatrixCellDto {
    @ApiProperty({ example: 'Negro', description: 'Nombre del color o estampa' })
    @IsString()
    @Length(1, 100)
    color!: string;

    @ApiProperty({ example: 'M', description: 'Talle o numeración' })
    @IsString()
    @Length(1, 50)
    size!: string;

    @ApiPropertyOptional({ example: '#18181b', description: 'Código hexadecimal del color' })
    @IsOptional()
    @IsString()
    @Length(0, 30)
    colorHex?: string;

    @ApiPropertyOptional({ example: 'REM001-NEG-M', description: 'SKU específico de la variante' })
    @IsOptional()
    @IsString()
    @Length(0, 100)
    sku?: string | null;

    @ApiPropertyOptional({ example: '7791234567890', description: 'Código de barras de la variante' })
    @IsOptional()
    @IsString()
    @Length(0, 100)
    barcode?: string | null;

    @ApiProperty({ example: 5, description: 'Stock inicial de esta variante' })
    @IsNumber()
    @Min(0)
    stock!: number;

    @ApiPropertyOptional({ example: 4500, description: 'Costo de compra específico para esta variante' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    cost?: number | null;

    @ApiPropertyOptional({ example: 8900, description: 'Precio final de venta específico para esta variante' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number | null;

    @ApiPropertyOptional({ example: 60, description: 'Margen de ganancia personalizado para esta variante' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    customProfitMargin?: number | null;
}

export class CreateApparelMatrixProductDto {
    @ApiProperty({ example: 'Remera Lisa Cuello Redondo', description: 'Nombre del producto/modelo padre' })
    @IsString()
    @Length(1, 255)
    name!: string;

    @ApiPropertyOptional({ example: 'REM-101', description: 'Código de estilo o modelo base' })
    @IsOptional()
    @IsString()
    @Length(0, 100)
    styleCode?: string | null;

    @ApiPropertyOptional({ example: 'Remera 100% algodón peinado 24/1', description: 'Descripción detallada' })
    @IsOptional()
    @IsString()
    @Length(0, 1000)
    description?: string | null;

    @ApiPropertyOptional({ description: 'ID de la categoría' })
    @IsOptional()
    @IsUUID('4')
    categoryId?: string | null;

    @ApiPropertyOptional({ example: 'Levis', description: 'Nombre de la marca' })
    @IsOptional()
    @IsString()
    @Length(0, 100)
    brandName?: string | null;

    @ApiPropertyOptional({ example: 'Primavera-Verano 2026', description: 'Temporada' })
    @IsOptional()
    @IsString()
    @Length(0, 100)
    season?: string | null;

    @ApiPropertyOptional({ example: 'Línea Urbana', description: 'Colección' })
    @IsOptional()
    @IsString()
    @Length(0, 100)
    collection?: string | null;

    @ApiPropertyOptional({ example: '100% Algodón Peinado', description: 'Composición textil' })
    @IsOptional()
    @IsString()
    @Length(0, 255)
    composition?: string | null;

    @ApiPropertyOptional({ example: 'Lavar con agua fría, no usar blanqueador', description: 'Instrucciones de cuidado' })
    @IsOptional()
    @IsString()
    @Length(0, 255)
    careInstructions?: string | null;

    @ApiPropertyOptional({ example: 'Argentina', description: 'País de origen' })
    @IsOptional()
    @IsString()
    @Length(0, 100)
    originCountry?: string | null;

    @ApiPropertyOptional({ example: 'standard', description: 'Política de cambio' })
    @IsOptional()
    @IsString()
    @Length(0, 50)
    returnPolicy?: 'standard' | 'final_sale' | 'size_exchange_only' | 'time_limited' | null;

    @ApiPropertyOptional({ example: 'https://ejemplo.com/remera.jpg', description: 'URL de imagen principal' })
    @IsOptional()
    @IsString()
    @Length(0, 500)
    imageUrl?: string | null;

    @ApiPropertyOptional({ example: 4500, description: 'Costo base de referencia' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    cost?: number | null;

    @ApiPropertyOptional({ example: 8900, description: 'Precio base de venta' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number | null;

    @ApiPropertyOptional({ example: 50, description: 'Margen de ganancia general' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    profitMargin?: number | null;

    @ApiPropertyOptional({ default: false, description: 'Si usa margen personalizado sobre el costo' })
    @IsOptional()
    @IsBoolean()
    useCustomMargin?: boolean;

    @ApiPropertyOptional({ default: false, description: 'Si el precio fue cargado de forma manual y fija' })
    @IsOptional()
    @IsBoolean()
    useManualPrice?: boolean;

    @ApiProperty({ type: [ApparelMatrixCellDto], description: 'Celdas de la matriz de variantes (Color x Talle)' })
    @IsArray()
    @ArrayMinSize(1, { message: 'Debe incluir al menos 1 celda en la matriz de variantes' })
    @ValidateNested({ each: true })
    @Type(() => ApparelMatrixCellDto)
    matrixCells!: ApparelMatrixCellDto[];
}
