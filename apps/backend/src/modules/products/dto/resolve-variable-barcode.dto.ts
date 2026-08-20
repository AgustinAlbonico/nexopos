import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsObject, IsString, Min, ValidateNested } from 'class-validator';

class BarcodeRangeDto {
    @IsInt()
    @Min(0)
    from!: number;

    @IsInt()
    @Min(0)
    to!: number;
}

class LocalBarcodeLayoutDto {
    @IsString()
    @IsNotEmpty()
    prefix!: string;

    @ValidateNested()
    @Type(() => BarcodeRangeDto)
    productCodeRange!: BarcodeRangeDto;

    @ValidateNested()
    @Type(() => BarcodeRangeDto)
    valueRange!: BarcodeRangeDto;

    @IsIn(['weight', 'price'])
    valueType!: 'weight' | 'price';

    @IsInt()
    @Min(0)
    decimalPlaces!: number;

    @IsBoolean()
    checkDigit!: boolean;
}

export class ResolveVariableBarcodeDto {
    @IsString()
    @IsNotEmpty()
    barcode!: string;

    @IsObject()
    @ValidateNested()
    @Type(() => LocalBarcodeLayoutDto)
    layout!: LocalBarcodeLayoutDto;
}
