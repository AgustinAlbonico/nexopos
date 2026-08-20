/**
 * DTO para creación de compras
 * Incluye validaciones con class-validator
 */
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsNumber,
    IsEnum,
    IsArray,
    ValidateNested,
    Min,
    MaxLength,
    ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseStatus } from '../entities/purchase.entity';

/**
 * DTO para un item de compra
 */
export class CreatePurchaseItemDto {
    @IsString()
    @IsNotEmpty({ message: 'El producto es requerido' })
    productId!: string;

    @IsNumber({}, { message: 'La cantidad debe ser un número' })
    @Min(1, { message: 'La cantidad mínima es 1' })
    quantity!: number;

    @IsNumber({}, { message: 'El precio unitario debe ser un número' })
    @Min(0, { message: 'El precio no puede ser negativo' })
    unitPrice!: number;

    @IsString()
    @IsOptional()
    @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
    notes?: string;
}

/**
 * DTO para creación de compra
 */
export class CreatePurchaseDto {
    @IsString()
    @IsOptional()
    supplierId?: string; // ID del proveedor (relación)

    @IsString()
    @IsOptional()
    @MaxLength(200, { message: 'El nombre del proveedor no puede exceder 200 caracteres' })
    providerName?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100, { message: 'El documento no puede exceder 100 caracteres' })
    providerDocument?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100, { message: 'El teléfono no puede exceder 100 caracteres' })
    providerPhone?: string;

    @IsString()
    @IsNotEmpty({ message: 'La fecha de compra es requerida' })
    purchaseDate!: string; // YYYY-MM-DD

    @IsNumber()
    @Min(0, { message: 'El impuesto no puede ser negativo' })
    @IsOptional()
    tax?: number;

    @IsNumber()
    @Min(0, { message: 'El descuento no puede ser negativo' })
    @IsOptional()
    discount?: number;

    @IsEnum(PurchaseStatus, { message: 'Estado de compra inválido' })
    @IsOptional()
    status?: PurchaseStatus;

    @IsString()
    @IsOptional()
    paymentMethodId?: string;

    @IsString()
    @IsOptional()
    paidAt?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100, { message: 'El número de factura no puede exceder 100 caracteres' })
    invoiceNumber?: string;

    @IsString()
    @IsOptional()
    @MaxLength(1000, { message: 'Las notas no pueden exceder 1000 caracteres' })
    notes?: string;

    @IsArray({ message: 'Los items deben ser un arreglo' })
    @ArrayMinSize(1, { message: 'Debe incluir al menos un item' })
    @ValidateNested({ each: true })
    @Type(() => CreatePurchaseItemDto)
    items!: CreatePurchaseItemDto[];

    @IsString()
    @IsOptional()
    locationId?: string;
}

