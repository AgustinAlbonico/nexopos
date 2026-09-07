import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsBoolean, IsUUID, Min, Max, Length, IsArray, ValidateNested, IsIn } from 'class-validator';

const ProductPackSchema = z.object({
    packBarcode: z.string().max(100),
    packPrice: z.number().min(0),
    unitsPerPack: z.number().min(0.001),
});

const ProductBundleComponentSchema = z.object({
    componentProductId: z.string().uuid(),
    componentQuantity: z.number().min(0.001),
});

/**
 * Schema simplificado para crear producto
 * Solo: nombre, costo, stock, categoría (opcional, una sola)
 * Opcionalmente: margen de ganancia personalizado

/**
 * Schema simplificado para crear producto
 * Solo: nombre, costo, stock, categoría (opcional, una sola)
 * Opcionalmente: margen de ganancia personalizado
 */
export const BaseProductSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido').max(255),
    description: z.string().max(1000).optional().nullable(),
    cost: z.number().min(0, 'El costo debe ser 0 o mayor').optional().nullable(),
    price: z.number().min(0, 'El precio debe ser 0 o mayor').optional().nullable(),
    stock: z.number().min(0).optional().default(0),
    categoryId: z.string().uuid().optional().nullable(),
    brandName: z.string().max(100).optional().nullable(),
    sku: z.string().max(100).optional().nullable(),
    barcode: z.string().max(100).optional().nullable(),
    isMeasure: z.boolean().optional().default(false),
    tareGrams: z.number().min(0).optional().nullable(),
    variableBarcodeFormat: z.enum(['gs1_weight', 'gs1_price', 'local_weight', 'local_price']).optional().nullable(),
    isActive: z.boolean().default(true),
    // Modo Precio Fijo (cargado directamente)
    useManualPrice: z.boolean().optional().default(false),
    // Margen de ganancia personalizado (opcional)
    useCustomMargin: z.boolean().optional().default(false),
    customProfitMargin: z.number().min(0).max(1000000).optional(),
    season: z.string().max(100).optional().nullable(),
    collection: z.string().max(100).optional().nullable(),
    composition: z.string().max(255).optional().nullable(),
    careInstructions: z.string().max(255).optional().nullable(),
    originCountry: z.string().max(100).optional().nullable(),
    returnPolicy: z.enum(['standard', 'final_sale', 'size_exchange_only', 'time_limited']).optional().nullable(),
    imageUrl: z.string().max(500).optional().nullable(),
    packs: z.array(ProductPackSchema).optional(),
    bundleComponents: z.array(ProductBundleComponentSchema).optional(),
    isVariantParent: z.boolean().optional().default(false),
});

export const CreateProductSchema = BaseProductSchema;

export type CreateProductDTO = z.infer<typeof CreateProductSchema>;

export class ProductPackDto {
    @IsString()
    @Length(1, 100)
    packBarcode!: string;

    @IsNumber()
    @Min(0)
    packPrice!: number;

    @IsNumber()
    @Min(0.001)
    unitsPerPack!: number;
}

export class ProductBundleComponentDto {
    @IsUUID('4')
    componentProductId!: string;

    @IsNumber()
    @Min(0.001)
    componentQuantity!: number;
}

/**
 * DTO para crear producto - Simplificado
 * Categoría opcional (una sola)
 * Opcional: margen de ganancia personalizado
 */
export class CreateProductDto {
    @ApiProperty({ example: 'Shampoo Sedal 400ml', description: 'Nombre del producto' })
    @IsString()
    @Length(1, 255)
    name!: string;

    @ApiPropertyOptional({ example: 'Shampoo reparador para cabello dañado', description: 'Descripción del producto' })
    @IsOptional()
    @IsString()
    @Length(0, 1000)
    description?: string | null;

    @ApiPropertyOptional({ example: 100, description: 'Costo del producto' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    cost?: number | null;

    @ApiPropertyOptional({ example: 150, description: 'Precio final de venta (en modo precio fijo)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number | null;

    @ApiPropertyOptional({ example: 10, description: 'Stock inicial' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    stock?: number;

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

    @ApiPropertyOptional({ example: true, description: 'Se vende por peso o medida' })
    @IsOptional()
    @IsBoolean()
    isMeasure?: boolean;

    @ApiPropertyOptional({ example: 25, description: 'Tara en gramos' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    tareGrams?: number | null;

    @ApiPropertyOptional({ enum: ['gs1_weight', 'gs1_price', 'local_weight', 'local_price'] })
    @IsOptional()
    @IsIn(['gs1_weight', 'gs1_price', 'local_weight', 'local_price'])
    variableBarcodeFormat?: 'gs1_weight' | 'gs1_price' | 'local_weight' | 'local_price' | null;

    @ApiPropertyOptional({ example: true, default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ example: false, description: 'Usar precio fijo (cargado directamente)' })
    @IsOptional()
    @IsBoolean()
    useManualPrice?: boolean;

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

    @ApiPropertyOptional({ example: 'Verano 2026', description: 'Temporada' })
    @IsOptional()
    @IsString()
    @Length(0, 100)
    season?: string | null;

    @ApiPropertyOptional({ example: 'Capsula Urbana', description: 'Colección' })
    @IsOptional()
    @IsString()
    @Length(0, 100)
    collection?: string | null;

    @ApiPropertyOptional({ example: '100% Algodón', description: 'Composición textil' })
    @IsOptional()
    @IsString()
    @Length(0, 255)
    composition?: string | null;

    @ApiPropertyOptional({ example: 'Lavar con agua fría', description: 'Cuidados' })
    @IsOptional()
    @IsString()
    @Length(0, 255)
    careInstructions?: string | null;

    @ApiPropertyOptional({ example: 'Argentina', description: 'País de origen' })
    @IsOptional()
    @IsString()
    @Length(0, 100)
    originCountry?: string | null;

    @ApiPropertyOptional({ example: 'standard', enum: ['standard', 'final_sale', 'size_exchange_only', 'time_limited'] })
    @IsOptional()
    @IsIn(['standard', 'final_sale', 'size_exchange_only', 'time_limited'])
    returnPolicy?: 'standard' | 'final_sale' | 'size_exchange_only' | 'time_limited' | null;

    @ApiPropertyOptional({ example: 'https://cdn.example.com/img.jpg', description: 'URL de imagen' })
    @IsOptional()
    @IsString()
    @Length(0, 500)
    imageUrl?: string | null;

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

    @ApiPropertyOptional({ example: false, description: 'Es producto padre de variantes' })
    @IsOptional()
    @IsBoolean()
    isVariantParent?: boolean;
}

