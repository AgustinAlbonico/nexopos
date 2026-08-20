import { z } from 'zod';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, IsBoolean, IsEnum, IsUUID, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export const QueryProductsSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(10000).default(100),
    search: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    brandId: z.string().uuid().optional(),
    isActive: z.coerce.boolean().optional(),
    stockStatus: z.enum(['all', 'critical']).optional(),
    sortBy: z.enum(['name', 'price', 'cost', 'stock', 'createdAt']).default('name'),
    order: z.enum(['ASC', 'DESC']).default('ASC'),
    excludeVariantParents: z.coerce.boolean().optional(),
});

export type QueryProductsDTO = z.infer<typeof QueryProductsSchema>;

export class QueryProductsDto implements QueryProductsDTO {
    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiPropertyOptional({ example: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(10000)
    limit: number = 100;

    @ApiPropertyOptional({ example: 'coca cola' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional({ format: 'uuid', description: 'Filtrar por marca' })
    @IsOptional()
    @IsUUID()
    brandId?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ enum: ['all', 'critical'], description: 'Filtro de estado de stock: critical = bajo stock o sin stock' })
    @IsOptional()
    @IsEnum(['all', 'critical'])
    stockStatus?: 'all' | 'critical';

    @ApiPropertyOptional({ enum: ['name', 'price', 'cost', 'stock', 'createdAt'] })
    @IsOptional()
    @IsEnum(['name', 'price', 'cost', 'stock', 'createdAt'])
    sortBy: 'name' | 'price' | 'cost' | 'stock' | 'createdAt' = 'name';

    @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
    @IsOptional()
    @IsEnum(['ASC', 'DESC'])
    order: 'ASC' | 'DESC' = 'ASC';

    @ApiPropertyOptional({ description: 'Excluir productos padre de variantes de los resultados' })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    excludeVariantParents?: boolean;
}
