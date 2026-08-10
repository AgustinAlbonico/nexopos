/**
 * DTOs para crear ventas
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
    IsBoolean,
    MaxLength,
    IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

import { SaleStatus } from '../entities/sale.entity';

/**
 * Traslado previo a la venta, usado por el flujo "Reponer y continuar"
 * del POS en modo sectorizado. Se ejecuta dentro de la misma transacción
 * que la venta.
 */
export class ReplenishmentTransferDto {
    @IsUUID()
    productId!: string;

    @IsUUID()
    fromLocationId!: string;

    @IsNumber()
    @Min(0.0001)
    quantity!: number;

    @IsString()
    @IsOptional()
    @MaxLength(255)
    reason?: string;
}

/**
 * Item para `POST /sales/check-replenishment` (read-only).
 */
export class CheckReplenishmentItemDto {
    @IsUUID()
    productId!: string;

    @IsNumber()
    @Min(1)
    quantity!: number;
}

/**
 * DTO para crear un item de venta
 */
export class CreateSaleItemDto {
    @IsUUID()
    @IsNotEmpty()
    productId!: string;

    @IsNumber()
    @Min(1)
    quantity!: number;

    @IsNumber()
    @Min(0)
    unitPrice!: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    discount?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    discountPercent?: number;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    notes?: string;
}

/**
 * DTO para crear un pago de venta
 */
export class CreateSalePaymentDto {
    @IsUUID()
    @IsNotEmpty()
    paymentMethodId!: string;

    @IsNumber()
    @Min(0.01)
    amount!: number;

    @IsNumber()
    @Min(1)
    @IsOptional()
    installments?: number;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    cardLastFourDigits?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    authorizationCode?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    referenceNumber?: string;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    notes?: string;
}

/**
 * DTO para crear una venta
 */
/**
 * DTO para crear un impuesto de venta
 */
export class CreateSaleTaxDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name!: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    percentage?: number;

    @IsNumber()
    @Min(0)
    amount!: number;
}

/**
 * DTO para crear una venta
 */
export class CreateSaleDto {
    @IsUUID()
    @IsOptional()
    customerId?: string;

    @IsString()
    @IsOptional()
    @MaxLength(200)
    customerName?: string;

    @IsString()
    @IsOptional()
    saleDate?: string; // ISO 8601 (YYYY-MM-DDTHH:mm:ss o YYYY-MM-DD)

    @IsNumber()
    @Min(0)
    @IsOptional()
    discount?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    surcharge?: number;

    // Se mantiene por compatibilidad, pero se calculará desde taxes si se envían
    @IsNumber()
    @Min(0)
    @IsOptional()
    tax?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateSaleTaxDto)
    @IsOptional()
    taxes?: CreateSaleTaxDto[];

    @IsEnum(SaleStatus)
    @IsOptional()
    status?: SaleStatus;

    @IsBoolean()
    @IsOptional()
    isOnAccount?: boolean;

    @IsBoolean()
    @IsOptional()
    generateInvoice?: boolean; // Si true, genera factura fiscal AFIP

    @IsNumber()
    @IsOptional()
    ivaPercentage?: number; // Porcentaje de IVA para Factura A (21, 10.5, 27)

    @IsString()
    @IsOptional()
    @MaxLength(1000)
    notes?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateSaleItemDto)
    items!: CreateSaleItemDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateSalePaymentDto)
    @IsOptional()
    payments?: CreateSalePaymentDto[];

    /**
     * Traslados previos a la venta, opcionales. Si están presentes, el
     * backend los ejecuta en la misma transacción antes de registrar la
     * venta. Sólo se usan en modo sectorizado; en modo simple se ignoran.
     */
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReplenishmentTransferDto)
    @IsOptional()
    replenishmentTransfers?: ReplenishmentTransferDto[];
}

