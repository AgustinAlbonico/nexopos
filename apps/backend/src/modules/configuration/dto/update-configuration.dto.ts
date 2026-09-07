import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min, Max, IsOptional, IsInt, IsBoolean, IsIn, IsNotEmpty, IsString, ValidateNested, ValidateIf } from 'class-validator';

class BarcodeRangeDto {
    @IsInt()
    @Min(0)
    from!: number;

    @IsInt()
    @Min(0)
    to!: number;
}

class VariableBarcodeLayoutDto {
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

    @ApiPropertyOptional({ example: false, description: 'Permitir ventas de productos con stock agotado (queda negativo)' })
    @IsOptional()
    @IsBoolean()
    allowOutOfStockSale?: boolean;

    @IsOptional()
    @ValidateNested()
    @Type(() => VariableBarcodeLayoutDto)
    variableBarcodeLayout?: VariableBarcodeLayoutDto | null;

    @ApiPropertyOptional({ example: true, description: 'Impresión automática de tickets al vender' })
    @IsOptional()
    @IsBoolean()
    ticketAutoPrintEnabled?: boolean;

    @ApiPropertyOptional({ example: 'POS-80', description: 'Nombre de la impresora de tickets' })
    @IsOptional()
    @ValidateIf((_, val) => val !== null)
    @IsString()
    ticketPrinterName?: string | null;

    @ApiPropertyOptional({ example: '80mm', description: 'Ancho del papel de ticket (58mm o 80mm)' })
    @IsOptional()
    @IsIn(['58mm', '80mm'])
    ticketPaperWidth?: string;

    @ApiPropertyOptional({ example: 'Mi Comercio POS', description: 'Título / Nombre en el encabezado del ticket' })
    @IsOptional()
    @ValidateIf((_, val) => val !== null)
    @IsString()
    ticketHeaderTitle?: string | null;

    @ApiPropertyOptional({ example: 'Av. Corrientes 1234', description: 'Dirección en el encabezado del ticket' })
    @IsOptional()
    @ValidateIf((_, val) => val !== null)
    @IsString()
    ticketHeaderAddress?: string | null;

    @ApiPropertyOptional({ example: '11 1234-5678', description: 'Teléfono en el encabezado del ticket' })
    @IsOptional()
    @ValidateIf((_, val) => val !== null)
    @IsString()
    ticketHeaderPhone?: string | null;

    @ApiPropertyOptional({ example: '¡Gracias por su compra!', description: 'Texto del pie de página del ticket' })
    @IsOptional()
    @ValidateIf((_, val) => val !== null)
    @IsString()
    ticketFooterText?: string | null;

    @ApiPropertyOptional({ example: true, description: 'Mostrar datos del cliente en el ticket' })
    @IsOptional()
    @IsBoolean()
    ticketShowCustomerData?: boolean;

    @ApiPropertyOptional({ example: 'https://mi-comercio.com/logo.png', description: 'URL o base64 del logo del ticket' })
    @IsOptional()
    @ValidateIf((_, val) => val !== null)
    @IsString()
    ticketLogoUrl?: string | null;
}
