/**
 * Entidad Sale - Representa una venta
 * Gestiona ventas con múltiples formas de pago y actualización de inventario
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { SaleItem } from './sale-item.entity';
import { SalePayment } from './sale-payment.entity';
import { SaleTax } from './sale-tax.entity';
import { Invoice } from './invoice.entity';

/**
 * Estados posibles de una venta
 */
export enum SaleStatus {
    COMPLETED = 'completed',   // Venta completada y pagada
    PENDING = 'pending',       // Venta pendiente de pago (cuenta corriente)
    PARTIAL = 'partial',       // Venta parcialmente pagada
    CANCELLED = 'cancelled',   // Venta cancelada
}

@Entity('sales')
@Index(['saleDate'])
@Index(['status'])
@Index(['saleNumber'])
export class Sale {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 20, unique: true })
    saleNumber!: string; // Ej: "VENTA-2024-00001"

    @Index()
    @Column({ name: 'customer_id', nullable: true })
    customerId!: string | null;

    @ManyToOne(() => Customer, { nullable: true })
    @JoinColumn({ name: 'customer_id' })
    customer!: Customer | null;

    @Column({ type: 'varchar', length: 200, nullable: true })
    customerName!: string | null; // Nombre rápido si no hay cliente registrado

    @Column({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    })
    saleDate!: Date;

    @Column({
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: 0,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number.parseFloat(value) || 0,
        },
    })
    subtotal!: number; // Suma de todos los items sin descuento

    @Column({
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: 0,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number.parseFloat(value) || 0,
        },
    })
    discount!: number; // Descuento total aplicado

    @Column({
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: 0,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number.parseFloat(value) || 0,
        },
    })
    surcharge!: number; // Recargo total aplicado

    @Column({
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: 0,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number.parseFloat(value) || 0,
        },
    })
    tax!: number; // IVA u otros impuestos

    @Column({
        type: 'decimal',
        precision: 20,
        scale: 2,
        default: 0,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number.parseFloat(value) || 0,
        },
    })
    total!: number; // subtotal - discount + surcharge + tax

    @Column({
        type: 'enum',
        enum: SaleStatus,
        default: SaleStatus.COMPLETED,
    })
    status!: SaleStatus;

    @Column({ type: 'boolean', default: false })
    isOnAccount!: boolean; // Si es venta en cuenta corriente

    @Column({ type: 'text', nullable: true })
    notes!: string | null; // Observaciones

    @Column({ type: 'boolean', default: false })
    inventoryUpdated!: boolean; // Flag para saber si ya se actualizó el stock

    @Column({ type: 'boolean', default: false })
    isFiscal!: boolean; // Si tiene factura fiscal autorizada

    @Index()
    @Column({ name: 'seller_id', type: 'uuid', nullable: true })
    sellerId?: string | null;

    @Column({ name: 'seller_name', type: 'varchar', length: 255, nullable: true })
    sellerName?: string | null;

    @Index()
    @Column({ name: 'is_reservation', type: 'boolean', default: false })
    isReservation!: boolean;

    @Column({
        name: 'reservation_deposit',
        type: 'decimal',
        precision: 12,
        scale: 2,
        nullable: true,
        transformer: {
            to: (value?: number | null) => value,
            from: (value?: string | null) => value ? Number.parseFloat(value) : null,
        },
    })
    reservationDeposit?: number | null;

    @Column({ name: 'reservation_status', type: 'varchar', length: 50, nullable: true })
    reservationStatus?: string | null;

    @Column({ name: 'reservation_expires_at', type: 'timestamp', nullable: true })
    reservationExpiresAt?: Date | null;

    @Column({ type: 'boolean', default: false })
    fiscalPending!: boolean; // Si se solicitó factura pero falló la generación (pendiente de reintento)

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
        nullable: true,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => (value ? Number.parseFloat(value) : null),
        },
    })
    ivaPercentage!: number | null; // Porcentaje de IVA para Factura A (21, 10.5, 27)

    @Column({ type: 'text', nullable: true })
    fiscalError!: string | null; // Mensaje de error de la última falla de facturación

    // Relaciones
    @OneToMany(() => SaleItem, (item) => item.sale, {
        cascade: true,
        eager: true,
    })
    items!: SaleItem[];

    @OneToMany(() => SalePayment, (payment) => payment.sale, {
        cascade: true,
        eager: true,
    })
    payments!: SalePayment[];

    @OneToMany(() => SaleTax, (tax) => tax.sale, {
        cascade: true,
        eager: true,
    })
    taxes!: SaleTax[];

    @OneToOne(() => Invoice, (invoice) => invoice.sale, { nullable: true })
    invoice!: Invoice | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'created_by' })
    createdBy!: User | null;

    @Column({ name: 'created_by', nullable: true })
    createdById!: string | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt!: Date | null;
}

