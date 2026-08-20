import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsArray, ArrayMinSize, Length, IsOptional, IsInt, Min, ValidateNested, IsBoolean } from 'class-validator';

export class ColorItemDto {
    @ApiProperty({ example: 'Negro', description: 'Nombre del color' })
    @IsString()
    @Length(1, 100)
    name!: string;

    @ApiProperty({ example: '#18181b', description: 'Código hexadecimal del color' })
    @IsString()
    @Length(1, 30)
    hex!: string;

    @ApiPropertyOptional({ example: false, description: 'Si requiere borde visual en swatches claros' })
    @IsOptional()
    @IsBoolean()
    border?: boolean;
}

export class CreateColorPaletteDto {
    @ApiProperty({ example: 'Cápsula Invierno 2026', description: 'Nombre único de la paleta' })
    @IsString()
    @Length(1, 100)
    name!: string;

    @ApiProperty({ type: [ColorItemDto], description: 'Lista de colores que integran la paleta' })
    @IsArray()
    @ArrayMinSize(1, { message: 'La paleta debe contener al menos 1 color' })
    @ValidateNested({ each: true })
    @Type(() => ColorItemDto)
    colors!: ColorItemDto[];

    @ApiPropertyOptional({ example: 1, description: 'Orden de visualización' })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}

export class UpdateColorPaletteDto extends CreateColorPaletteDto {}
