/**
 * Entidad Purchase - Representa una compra a proveedor
 * Gestiona compras de mercadería con actualización de inventario y registro de gastos
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
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { PurchaseItem } from './purchase-item.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { PaymentMethod as PaymentMethodEntity } from '../../configuration/entities/payment-method.entity';
import { Location } from '../../inventory/entities/location.entity';

/**
 * Estados posibles de una compra
 */
export enum PurchaseStatus {
    PENDING = 'pending',       // Pendiente de pago
    PAID = 'paid',            // Pagada completamente
}

/**
 * Métodos de pago disponibles
 */
export enum PaymentMethod {
    CASH = 'cash',
    TRANSFER = 'transfer',
    DEBIT_CARD = 'debit_card',
    CREDIT_CARD = 'credit_card',
    CHECK = 'check',
    OTHER = 'other',
}

@Entity('purchases')
@Index(['purchaseDate'])
@Index(['status'])
@Index(['providerName'])
@Index(['supplierId'])
export class Purchase {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 20, unique: true })
    purchaseNumber!: string; // Ej: "COMP-2024-00001"

    // Relación con proveedor (opcional para compatibilidad)
    @ManyToOne(() => Supplier, { nullable: true, eager: true })
    @JoinColumn({ name: 'supplier_id' })
    supplier!: Supplier | null;

    @Column({ name: 'supplier_id', nullable: true })
    supplierId!: string | null;

    @Column({ type: 'varchar', length: 200 })
    providerName!: string; // Nombre del proveedor (texto simple - backup)

    @Column({ type: 'varchar', length: 100, nullable: true })
    providerDocument!: string | null; // DNI/CUIT del proveedor

    @Column({ type: 'varchar', length: 100, nullable: true })
    providerPhone!: string | null; // Teléfono de contacto

    @Column({ type: 'date' })
    purchaseDate!: Date; // Fecha de la compra

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
    subtotal!: number; // Suma de todos los items

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
    discount!: number; // Descuento aplicado

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
    total!: number; // subtotal + tax - discount

    @Column({
        type: 'enum',
        enum: PurchaseStatus,
        default: PurchaseStatus.PENDING,
    })
    status!: PurchaseStatus;

    @ManyToOne(() => PaymentMethodEntity, { nullable: true })
    @JoinColumn({ name: 'payment_method_id' })
    paymentMethod!: PaymentMethodEntity | null;

    @Column({ name: 'payment_method_id', nullable: true })
    paymentMethodId!: string | null;

    @Column({ type: 'timestamp', nullable: true })
    paidAt!: Date | null; // Fecha de pago

    @Column({ type: 'varchar', length: 100, nullable: true })
    invoiceNumber!: string | null; // Número de factura del proveedor

    @Column({ type: 'text', nullable: true })
    notes!: string | null; // Observaciones

    @Column({ type: 'boolean', default: false })
    inventoryUpdated!: boolean; // Flag para saber si ya se actualizó el stock

    // Relaciones
    @OneToMany(() => PurchaseItem, (item) => item.purchase, {
        cascade: true,
        eager: true,
    })
    items!: PurchaseItem[];

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'created_by' })
    createdBy!: User | null;

    @Column({ name: 'created_by', nullable: true })
    createdById!: string | null;

    @ManyToOne(() => Location, { nullable: true })
    @JoinColumn({ name: 'locationId' })
    location!: Location | null;

    @Column({ name: 'locationId', type: 'uuid', nullable: true })
    locationId!: string | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt!: Date | null;
}

