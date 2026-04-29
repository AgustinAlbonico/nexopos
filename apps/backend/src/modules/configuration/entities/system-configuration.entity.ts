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

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
