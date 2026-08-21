/**
 * DTO para filtros de proveedores
 */
import { IsOptional, IsString, IsBoolean, IsNumber, Min, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SupplierFiltersDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return undefined;
    })
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsString()
    classification?: string;

    @IsOptional()
    @IsEnum(['name', 'tradeName', 'email', 'createdAt', 'classification'], {
        message: 'sortBy debe ser: name, tradeName, email, createdAt, classification',
    })
    sortBy?: 'name' | 'tradeName' | 'email' | 'createdAt' | 'classification';

    @IsOptional()
    @IsEnum(['ASC', 'DESC'], { message: 'order debe ser ASC o DESC' })
    order?: 'ASC' | 'DESC';
}
