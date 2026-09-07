import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { type CapabilityKey } from '../capabilities/keys';
import { type CapabilityProfileKey } from '../capabilities/presets';

/**
 * Configuración global del sistema
 */
@Entity('system_configuration')
export class SystemConfiguration {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('decimal', { precision: 10, scale: 2, default: 30 })
    defaultProfitMargin!: number;

    @Column('int', { default: 5 })
    minStockAlert!: number;

    /** Control de acceso: si es false, el sistema muestra pantalla de bloqueo */
    @Column('boolean', { default: true })
    sistemaHabilitado!: boolean;

    @Column('boolean', { default: false })
    barcodeScannerEnabled!: boolean;

    @Column('int', { default: 100 })
    barcodeScannerTimeoutMs!: number;

    /** Si es true, permite vender productos con stock ≤ 0 (el stock queda negativo) */
    @Column('boolean', { default: false })
    allowOutOfStockSale!: boolean;

    /**
     * Modo sectorizado opcional — interruptor global del modo por ubicación.
     * Mientras sea false, `Product.stock` es la única verdad y los flujos de
     * venta/compra no tocan `product_location_stock`. PR3 lo flippea a true
     * dentro de la transacción de activación (ver `ActivationService`).
     */
    @Column('boolean', { default: false })
    stockSectorizado!: boolean;

    /** Ubicación primaria de venta (modo sectorizado). */
    @Column({ type: 'uuid', nullable: true })
    primarySaleLocationId!: string | null;

    /** Destino predeterminado para compras (modo sectorizado). */
    @Column({ type: 'uuid', nullable: true })
    defaultReceiveLocationId!: string | null;

    /**
     * Mínimo de reposición del salón — dispara la alerta de reposición
     * cuando el stock en la ubicación principal de venta cae por debajo.
     * Distinto del `minStockAlert` global (que alerta sobre el total).
     */
    @Column('int', { default: 5 })
    stockMinimoVenta!: number;

    @Column({ name: 'profile_key', type: 'varchar', length: 64, default: 'simple-retail' })
    profileKey!: CapabilityProfileKey;

    @Column({ name: 'onboarding_completed', type: 'boolean', default: false })
    onboardingCompleted!: boolean;

    @Column({ name: 'selected_business_type', type: 'varchar', length: 64, nullable: true })
    selectedBusinessType!: string | null;

    @Column({ name: 'profile_version', type: 'int', default: 1 })
    profileVersion!: number;

    @Column({ name: 'capabilities_json', type: 'jsonb', default: () => "'{}'::jsonb" })
    capabilitiesJson!: Partial<Record<CapabilityKey, boolean>>;

    @Column({ name: 'capabilities_schema_version', type: 'int', default: 1 })
    capabilitiesSchemaVersion!: number;

    @Column({ name: 'variable_barcode_layout', type: 'jsonb', nullable: true })
    variableBarcodeLayout?: {
        prefix: string;
        productCodeRange: { from: number; to: number };
        valueRange: { from: number; to: number };
        valueType: 'weight' | 'price';
        decimalPlaces: number;
        checkDigit: boolean;
    } | null;

    @Column('boolean', { default: true })
    ticketAutoPrintEnabled!: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    ticketPrinterName!: string | null;

    @Column({ type: 'varchar', length: 20, default: '80mm' })
    ticketPaperWidth!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    ticketHeaderTitle!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    ticketHeaderAddress!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    ticketHeaderPhone!: string | null;

    @Column({ type: 'text', nullable: true })
    ticketFooterText!: string | null;

    @Column('boolean', { default: true })
    ticketShowCustomerData!: boolean;

    @Column({ type: 'text', nullable: true })
    ticketLogoUrl!: string | null;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
