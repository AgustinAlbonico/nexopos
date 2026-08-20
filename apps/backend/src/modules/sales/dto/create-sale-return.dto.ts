import { Type } from 'class-transformer';
import {
    IsArray,
    IsIn,
    IsNumber,
    IsObject,
    IsOptional,
    IsUUID,
    Min,
    ValidateNested,
} from 'class-validator';

import { SALE_RETURN_ITEM_DISPOSITIONS, SaleReturnItemDisposition } from '../entities/sale-return-item.entity';

export class CreateSaleReturnItemDto {
    @IsUUID()
    originalSaleItemId!: string;

    @IsNumber()
    @Min(0.001)
    quantityReturned!: number;

    @IsNumber()
    @Min(0)
    unitRefundAmount!: number;

    @IsIn(SALE_RETURN_ITEM_DISPOSITIONS)
    disposition!: SaleReturnItemDisposition;

    @IsObject()
    @IsOptional()
    taxSnapshot?: Record<string, unknown> | null;

    @IsObject()
    @IsOptional()
    capabilitySnapshot?: Record<string, unknown> | null;
}

export class RefundPaymentItemDto {
    @IsUUID()
    paymentMethodId!: string;

    @IsNumber()
    @Min(0.01)
    amount!: number;
}

export class CreateSaleReturnBodyDto {
    @IsNumber()
    @Min(0)
    @IsOptional()
    totalRefund?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    totalExchangeAmount?: number;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => RefundPaymentItemDto)
    refundPayments?: RefundPaymentItemDto[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateSaleReturnItemDto)
    items!: CreateSaleReturnItemDto[];
}

export type CreateSaleReturnDto = CreateSaleReturnBodyDto & { readonly originalSaleId: string };

export class PreviewSaleReturnDto extends CreateSaleReturnBodyDto {
    @IsUUID()
    originalSaleId!: string;
}

export class CommitSaleReturnDto {
    @IsUUID()
    returnId!: string;
}
