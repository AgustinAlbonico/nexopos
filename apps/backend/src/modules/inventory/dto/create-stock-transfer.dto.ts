import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

/**
 * DTO de creación de traslado (`POST /api/inventory/transfers`, PR9).
 *
 * Wrap del método interno `InventoryService.transfer()` para que la UI de
 * reposición proactiva pueda crear traslados sin tener que pasar por el
 * flujo POS (PR8). El backend mantiene su invariante de atomicidad (origen,
 * destino, recálculo de `Product.stock`, dos `stock_movements` y un
 * `stock_transfer`) — este endpoint solo abre la puerta HTTP.
 */
export class CreateStockTransferDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    productId!: string;

    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    fromLocationId!: string;

    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    toLocationId!: string;

    @ApiProperty({ minimum: 0.0001, example: 5 })
    @IsNumber()
    @Min(0.0001)
    quantity!: number;

    @ApiProperty({ required: false, maxLength: 255 })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    reason?: string;
}