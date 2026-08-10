import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Location } from './location.entity';

/**
 * Tipos de movimiento de stock
 */
export enum StockMovementType {
    IN = 'IN',   // Entrada de stock
    OUT = 'OUT', // Salida de stock
}

/**
 * Origen del movimiento de stock
 */
export enum StockMovementSource {
    INITIAL_LOAD = 'INITIAL_LOAD',   // Carga inicial desde módulo productos
    PURCHASE = 'PURCHASE',            // Compra a proveedor
    SALE = 'SALE',                    // Venta
    ADJUSTMENT = 'ADJUSTMENT',        // Ajuste manual de inventario
    RETURN = 'RETURN',                // Devolución
    TRANSFER = 'TRANSFER',            // Traslado entre ubicaciones (modo sectorizado)
}

/**
 * Entidad para registrar movimientos de inventario.
 *
 * En modo sectorizado la columna `locationId` identifica la ubicación
 * afectada; en modo simple queda en null (back-compat con el historial
 * previo a la activación).
 */
@Entity('stock_movements')
@Index(['productId'])
@Index(['date'])
@Index(['type'])
@Index(['source'])
@Index(['productId', 'locationId', 'createdAt'])
export class StockMovement {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    productId!: string;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'productId' })
    product!: Product;

    @Column({
        type: 'enum',
        enum: StockMovementType,
    })
    type!: StockMovementType;

    @Column({
        type: 'enum',
        enum: StockMovementSource,
        default: StockMovementSource.ADJUSTMENT,
    })
    source!: StockMovementSource;

    @Column('int')
    quantity!: number;

    @Column('decimal', { precision: 20, scale: 2, nullable: true })
    cost?: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    provider?: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    referenceId?: string; // ID de referencia (compra, venta, etc.)

    @Column({ type: 'text', nullable: true })
    notes?: string;

    @Column({ type: 'timestamp' })
    date!: Date;

    /**
     * Ubicación afectada por el movimiento (modo sectorizado).
     * Null en modo simple y en movimientos históricos previos a la activación.
     */
    @Column({ type: 'uuid', nullable: true })
    locationId!: string | null;

    @ManyToOne(() => Location, { eager: false, nullable: true })
    @JoinColumn({ name: 'locationId' })
    location!: Location | null;

    @CreateDateColumn()
    createdAt!: Date;
}
