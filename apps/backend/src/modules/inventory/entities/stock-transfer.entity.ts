import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Check,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Location } from './location.entity';

/**
 * Estado de una transferencia de stock entre ubicaciones.
 */
export enum StockTransferStatus {
    COMPLETADO = 'COMPLETADO',
    ANULADO = 'ANULADO',
}

/**
 * Traslado de mercadería entre dos ubicaciones.
 *
 * Invariantes (aplicadas a nivel servicio y reflejadas en CHECK constraint):
 * - quantity > 0
 * - fromLocationId <> toLocationId
 * - ambas ubicaciones activas al momento del traslado
 * - saldo suficiente en origen
 */
@Entity('stock_transfers')
@Check(`"quantity" > 0`)
@Check(`"fromLocationId" <> "toLocationId"`)
@Index(['productId'])
@Index(['fromLocationId'])
@Index(['toLocationId'])
@Index(['createdAt'])
export class StockTransfer {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    productId!: string;

    @ManyToOne(() => Product, { eager: false, nullable: false })
    @JoinColumn({ name: 'productId' })
    product!: Product;

    @Column({ type: 'uuid' })
    fromLocationId!: string;

    @ManyToOne(() => Location, { eager: false, nullable: false })
    @JoinColumn({ name: 'fromLocationId' })
    fromLocation!: Location;

    @Column({ type: 'uuid' })
    toLocationId!: string;

    @ManyToOne(() => Location, { eager: false, nullable: false })
    @JoinColumn({ name: 'toLocationId' })
    toLocation!: Location;

    @Column({
        type: 'decimal',
        precision: 14,
        scale: 3,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number.parseFloat(value),
        },
    })
    quantity!: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    reason!: string | null;

    @Column({ type: 'uuid', nullable: true })
    createdById!: string | null;

    @Column({
        type: 'enum',
        enum: StockTransferStatus,
        default: StockTransferStatus.COMPLETADO,
    })
    status!: StockTransferStatus;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;
}
