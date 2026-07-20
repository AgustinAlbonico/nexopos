import { IsDateString, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CashFlowReportFiltersDto {
    @ApiProperty({
        description: 'Fecha de inicio del reporte',
        example: '2024-12-01',
    })
    @IsDateString()
    startDate!: string;

    @ApiProperty({
        description: 'Fecha de fin del reporte',
        example: '2024-12-31',
    })
    @IsDateString()
    endDate!: string;

    @ApiPropertyOptional({
        description: 'Filtrar por código de método de pago (ej: cash, bank, wallet, check)',
        example: 'cash',
    })
    @IsString()
    @IsOptional()
    paymentMethod?: string;

    @ApiPropertyOptional({
        description: 'Incluir comparación con el período anterior',
        example: true,
    })
    @IsBoolean()
    @IsOptional()
    includeComparison?: boolean;
}
