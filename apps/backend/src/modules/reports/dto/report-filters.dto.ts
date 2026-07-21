/**
 * DTOs para filtros de reportes
 */
import { IsOptional, IsDateString, IsEnum, IsInt, Min, Max, IsArray, ArrayMinSize } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum ReportPeriod {
    TODAY = 'today',
    YESTERDAY = 'yesterday',
    THIS_WEEK = 'this_week',
    LAST_WEEK = 'last_week',
    THIS_MONTH = 'this_month',
    LAST_MONTH = 'last_month',
    THIS_QUARTER = 'this_quarter',
    LAST_QUARTER = 'last_quarter',
    THIS_YEAR = 'this_year',
    LAST_YEAR = 'last_year',
    CUSTOM = 'custom',
}

export class ReportFiltersDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsEnum(ReportPeriod)
    period?: ReportPeriod;
}

export class TopProductsFiltersDto extends ReportFiltersDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number = 10;
}

export class TopCustomersFiltersDto extends ReportFiltersDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number = 10;
}

export class ProductsByIdReportDto extends ReportFiltersDto {
    @Transform(({ value }: { value: unknown }) => {
        if (Array.isArray(value)) return value;
        if (typeof value !== 'string') return value;
        return value.split(',').map((id) => id.trim()).filter(Boolean);
    })
    @IsArray()
    @ArrayMinSize(1)
    productIds!: string[];
}
