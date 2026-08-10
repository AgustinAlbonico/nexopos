import { ApiProperty } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
    ValidateNested,
    ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LocationFunction } from '../entities/location.entity';

/**
 * Una ubicación a crear durante la activación del modo sectorizado.
 *
 * Notas:
 * - `isPrimarySale` y `isDefaultReceive` se infieren por nombre (debe haber
 *   exactamente uno true de cada uno). El servicio resuelve los IDs finales.
 */
export class LocationInput {
    @ApiProperty({ example: 'Salón', maxLength: 120 })
    @IsString()
    @MinLength(1)
    @MaxLength(120)
    name!: string;

    @ApiProperty({ enum: LocationFunction, example: LocationFunction.SALE })
    @IsEnum(LocationFunction)
    function!: LocationFunction;

    @ApiProperty({ required: false, default: false })
    @IsOptional()
    @IsBoolean()
    isPrimarySale?: boolean;

    @ApiProperty({ required: false, default: false })
    @IsOptional()
    @IsBoolean()
    isDefaultReceive?: boolean;
}

/**
 * DTO del asistente de activación del modo sectorizado.
 *
 * El servicio:
 *  1. Valida que haya exactamente una primaria de venta y un destino de compras.
 *  2. Crea las ubicaciones, marca los flags, snapshot del stock, distribuye
 *     todo a `initialStockLocationName`, flipea `stockSectorizado`.
 *  3. Verifica `SUM(pre) == SUM(post)` por producto antes de commitear.
 */
export class ActivateStockSectorizadoDto {
    @ApiProperty({ type: [LocationInput] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => LocationInput)
    locations!: LocationInput[];

    @ApiProperty({
        description: 'Nombre (único) de la ubicación que recibe todo el stock existente',
        example: 'Salón',
    })
    @IsString()
    @IsNotEmpty()
    initialStockLocationName!: string;
}
