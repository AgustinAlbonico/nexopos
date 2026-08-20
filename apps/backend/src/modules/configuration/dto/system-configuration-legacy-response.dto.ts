import { ApiProperty } from '@nestjs/swagger';

export class SystemConfigurationLegacyResponseDto {
    @ApiProperty({ format: 'uuid' })
    id!: string;

    @ApiProperty({ example: 30 })
    defaultProfitMargin!: number;

    @ApiProperty({ example: 5 })
    minStockAlert!: number;

    @ApiProperty({ example: true })
    sistemaHabilitado!: boolean;

    @ApiProperty({ example: false })
    barcodeScannerEnabled!: boolean;

    @ApiProperty({ example: 100 })
    barcodeScannerTimeoutMs!: number;

    @ApiProperty({ example: false })
    allowOutOfStockSale!: boolean;

    @ApiProperty({ example: false })
    stockSectorizado!: boolean;

    @ApiProperty({ format: 'uuid', nullable: true })
    primarySaleLocationId!: string | null;

    @ApiProperty({ format: 'uuid', nullable: true })
    defaultReceiveLocationId!: string | null;

    @ApiProperty({ example: 5 })
    stockMinimoVenta!: number;

    @ApiProperty({ example: true })
    ticketAutoPrintEnabled?: boolean;

    @ApiProperty({ example: null, nullable: true })
    ticketPrinterName?: string | null;

    @ApiProperty({ example: '80mm' })
    ticketPaperWidth?: string;

    @ApiProperty({ example: null, nullable: true })
    ticketHeaderTitle?: string | null;

    @ApiProperty({ example: null, nullable: true })
    ticketHeaderAddress?: string | null;

    @ApiProperty({ example: null, nullable: true })
    ticketHeaderPhone?: string | null;

    @ApiProperty({ example: null, nullable: true })
    ticketFooterText?: string | null;

    @ApiProperty({ example: true })
    ticketShowCustomerData?: boolean;

    @ApiProperty({ example: null, nullable: true })
    ticketLogoUrl?: string | null;

    @ApiProperty({ type: String, format: 'date-time' })
    createdAt!: Date;

    @ApiProperty({ type: String, format: 'date-time' })
    updatedAt!: Date;
}
