import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { StocktakeSession } from './stocktake-session.entity';

/**
 * Plan reference: `apps/backend/src/modules/inventory/entities/stocktake-line.entity.ts`.
 *
 * `expectedQuantity` is the snapshot of `Product.stock` at start. At approval
 * the service recomputes `expectedQuantity` by replaying movements made
 * during the session (see `StocktakeService.approve`).
 */
@Entity('stocktake_lines')
@Index(['sessionId', 'productId'], { unique: true })
@Index(['productId'])
export class StocktakeLine {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    sessionId!: string;

    @ManyToOne(() => StocktakeSession, (session: { id: string }) => session.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sessionId' })
    session!: StocktakeSession;

    @Column({ type: 'uuid' })
    productId!: string;

    @ManyToOne(() => Product, { eager: true })
    @JoinColumn({ name: 'productId' })
    product!: Product;

    @Column({ type: 'decimal', precision: 20, scale: 3, default: 0 })
    expectedQuantity!: number;

    @Column({ type: 'decimal', precision: 20, scale: 3, default: 0 })
    countedQuantity!: number;

    @Column({ type: 'timestamp', nullable: true })
    countedAt!: Date | null;

    @Column({ type: 'uuid', nullable: true })
    countedById!: string | null;

    @Column({ type: 'varchar', length: 32, nullable: true })
    reasonCode!: string | null;
}