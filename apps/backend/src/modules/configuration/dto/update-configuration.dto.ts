import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, Min, Max, IsOptional, IsInt, IsBoolean } from 'class-validator';

/**
 * DTO para actualizar configuración del sistema
 */
export class UpdateConfigurationDto {
    @ApiPropertyOptional({ example: 30, description: 'Margen de ganancia por defecto (%)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1000000)
    defaultProfitMargin?: number;

    @ApiPropertyOptional({ example: 5, description: 'Stock mínimo para alertas' })
    @IsOptional()
    @IsInt()
    @Min(0)
    minStockAlert?: number;

    @ApiPropertyOptional({ example: false, description: 'Habilitar escáner de código de barras' })
    @IsOptional()
    @IsBoolean()
    barcodeScannerEnabled?: boolean;

    @ApiPropertyOptional({ example: 100, description: 'Timeout del escáner de código de barras en milisegundos' })
    @IsOptional()
    @IsInt()
    @Min(0)
    barcodeScannerTimeoutMs?: number;
}
