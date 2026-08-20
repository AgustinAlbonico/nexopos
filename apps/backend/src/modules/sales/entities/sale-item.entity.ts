/**
 * Entidad SaleItem - Representa un item de venta
 * Cada item tiene un producto, cantidad y precio
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    BeforeInsert,
    BeforeUpdate,
} from 'typeorm';
import { Sale } from './sale.entity';
import { Product } from '../../products/entities/product.entity';

export type SaleItemInventoryEffect = {
    readonly productId: string;
    readonly quantity: number;
};

@Entity('sale_items')
export class SaleItem {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'sale_id' })
    saleId!: string;

    @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sale_id' })
    sale!: Sale;

    @Column({ name: 'product_id' })
    productId!: string;

    @Column({ name: 'pack_id', type: 'uuid', nullable: true })
    packId!: string | null;

    @ManyToOne(() => Product, { eager: true })
    @JoinColumn({ name: 'product_id' })
    product!: Product;

    @Column({ type: 'varchar', length: 50, nullable: true })
    productCode!: string | null; // Código del producto (snapshot)

    @Column({ type: 'varchar', length: 200 })
    productDescription!: string; // Descripción del producto (snapshot)

    @Column({
        type: 'decimal',
        precision: 20,
        scale: 3,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number.parseFloat(value),
        },
    })
    quantity!: number;

    @Column({ type: 'varchar', length: 16, nullable: true })
    enterMode!: 'manual' | 'barcode' | 'scale' | null;

    @Column({ type: 'decimal', precision: 20, scale: 3, nullable: true, transformer: { to: (value: number | null) => value, from: (value: string | null) => value === null ? null : Number.parseFloat(value) } })
    grossQuantity!: number | null;

    @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true, transformer: { to: (value: number | null) => value, from: (value: string | null) => value === null ? null : Number.parseFloat(value) } })
    tareGrams!: number | null;

    @Column({ type: 'decimal', precision: 20, scale: 3, nullable: true, transformer: { to: (value: number | null) => value, from: (value: string | null) => value === null ? null : Number.parseFloat(value) } })
    netQuantity!: number | null;

    @Column({ type: 'varchar', length: 20, default: 'unidades' })
    unitOfMeasure!: string;

    @Column({
        type: 'decimal',
        precision: 20,
        scale: 2,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number.parseFloat(value) || 0,
        },
    })
    unitPrice!: number; // Precio de venta unitario

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
    discount!: number; // Descuento por item

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number.parseFloat(value) || 0,
        },
    })
    discountPercent!: number; // Porcentaje de descuento

    @Column({
        type: 'decimal',
        precision: 20,
        scale: 2,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number.parseFloat(value) || 0,
        },
    })
    subtotal!: number; // (quantity * unitPrice) - discount

    @Column({ name: 'inventory_effects', type: 'jsonb', nullable: true })
    inventoryEffects!: SaleItemInventoryEffect[] | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;

    /**
     * Calcula el subtotal antes de insertar/actualizar
     */
    @BeforeInsert()
    @BeforeUpdate()
    calculateSubtotal() {
        this.subtotal = (this.quantity * this.unitPrice) - this.discount;
    }
}

