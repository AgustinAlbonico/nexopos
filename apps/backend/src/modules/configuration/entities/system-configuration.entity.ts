import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
