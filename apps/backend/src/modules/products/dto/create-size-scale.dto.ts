import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, ArrayMinSize, Length, IsOptional, IsInt, Min } from 'class-validator';

export class CreateSizeScaleDto {
    @ApiProperty({ example: 'Remeras Oversize', description: 'Nombre único de la escala' })
    @IsString()
    @Length(1, 100)
    name!: string;

    @ApiPropertyOptional({ example: 'apparel', description: 'Categoría de la escala' })
    @IsOptional()
    @IsString()
    @Length(1, 50)
    category?: string | null;

    @ApiProperty({ example: ['1', '2', '3', '4'], description: 'Array ordenado de talles' })
    @IsArray()
    @ArrayMinSize(1, { message: 'La escala debe contener al menos 1 talle' })
    @IsString({ each: true })
    sizes!: string[];

    @ApiPropertyOptional({ example: 1, description: 'Orden de visualización' })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}

export class UpdateSizeScaleDto extends CreateSizeScaleDto {}
