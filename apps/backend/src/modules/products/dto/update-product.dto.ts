import { z } from 'zod';
import { BaseProductSchema, ProductBundleComponentDto, ProductPackDto } from './create-product.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsBoolean, IsUUID, Min, Max, Length, IsArray, ValidateNested, IsIn } from 'class-validator';

export const UpdateProductSchema = BaseProductSchema.partial();

export type UpdateProductDTO = z.infer<typeof UpdateProductSchema>;

/**
 * DTO para actualizar producto - Simplificado
 * Categoría opcional (una sola)
 * Opcional: margen de ganancia personalizado
 */
export class UpdateProductDto {
    @ApiPropertyOptional({ example: 'Shampoo Sedal 400ml' })
    @IsOptional()
    @IsString()
    @Length(1, 255)
    name?: string;

    @ApiPropertyOptional({ example: 'Shampoo reparador para cabello dañado', description: 'Descripción del producto' })
    @IsOptional()
    @IsString()
    @Length(0, 1000)
    description?: string | null;

    @ApiPropertyOptional({ example: 100 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    cost?: number | null;

    @ApiPropertyOptional({ example: 150, description: 'Precio final de venta (en modo precio fijo)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number | null;

    @ApiPropertyOptional({ example: 10, description: 'Stock actual' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    stock?: number;

    @ApiPropertyOptional({ example: false, description: 'Usar precio fijo (cargado directamente)' })
    @IsOptional()
    @IsBoolean()
    useManualPrice?: boolean;


    @ApiPropertyOptional({ type: String, description: 'ID de la categoría' })
    @IsOptional()
    @IsUUID('4')
    categoryId?: string | null;

    @ApiPropertyOptional({ example: 'Sedal', description: 'Nombre de la marca' })
    @IsOptional()
    @IsString()
    @Length(0, 100)
    brandName?: string | null;

    @ApiPropertyOptional({ example: 'REM-NEGRA-M', description: 'SKU único del producto o variante' })
    @IsOptional()
    @IsString()
    @Length(0, 100)
    sku?: string | null;

    @ApiPropertyOptional({ example: '1234567890123', description: 'Código de barras del producto' })
    @IsOptional()
    @IsString()
    @Length(0, 100)
    barcode?: string | null;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isMeasure?: boolean;

    @ApiPropertyOptional({ example: 25 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    tareGrams?: number | null;

    @ApiPropertyOptional({ enum: ['gs1_weight', 'gs1_price', 'local_weight', 'local_price'] })
    @IsOptional()
    @IsIn(['gs1_weight', 'gs1_price', 'local_weight', 'local_price'])
    variableBarcodeFormat?: 'gs1_weight' | 'gs1_price' | 'local_weight' | 'local_price' | null;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ example: false, description: 'Usar margen de ganancia personalizado' })
    @IsOptional()
    @IsBoolean()
    useCustomMargin?: boolean;

    @ApiPropertyOptional({ example: 40, description: 'Margen de ganancia personalizado (%)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1000000)
    customProfitMargin?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProductPackDto)
    @IsOptional()
    packs?: ProductPackDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProductBundleComponentDto)
    @IsOptional()
    bundleComponents?: ProductBundleComponentDto[];
}

