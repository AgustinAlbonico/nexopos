import { ApiProperty } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsInt,
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
 * DTO de creación de ubicación.
 *
 * `isPrimarySale` / `isDefaultReceive` son opcionales; cuando llegan en
 * `true`, las partial unique indexes en `locations` (UQ_locations_primary_sale
 * / UQ_locations_default_receive) garantizan que a lo sumo una ubicación
 * los tenga en true. El servicio traduce el `QueryFailedError` correspondiente
 * a un 409.
 */
export class CreateLocationDto {
    @ApiProperty({ example: 'Depósito', maxLength: 120 })
    @IsString()
    @MinLength(1)
    @MaxLength(120)
    name!: string;

    @ApiProperty({ enum: LocationFunction, example: LocationFunction.STORAGE })
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
 * DTO de edición de ubicación. Todos los campos son opcionales: solo se
 * actualiza lo que llega. Los flags `isPrimarySale` / `isDefaultReceive`
 * siguen gobernados por las partial unique indexes.
 */
export class UpdateLocationDto {
    @ApiProperty({ required: false, maxLength: 120 })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(120)
    name?: string;

    @ApiProperty({ required: false, enum: LocationFunction })
    @IsOptional()
    @IsEnum(LocationFunction)
    function?: LocationFunction;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    isPrimarySale?: boolean;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    isDefaultReceive?: boolean;
}
