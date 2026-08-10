import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Location } from './location.entity';

/**
 * Saldo de un producto en una ubicación específica.
 *
 * Invariantes:
 * - Exactamente una fila por par (productId, locationId) cuando el modo
 *   sectorizado está activo y la ubicación recibió stock.
 * - Sólo `InventoryService` escribe en esta tabla; ningún otro módulo.
 */
@Entity('product_location_stocks')
@Unique('UQ_product_location_stock_product_location', ['productId', 'locationId'])
@Index(['productId'])
@Index(['locationId'])
export class ProductLocationStock {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    productId!: string;

    @ManyToOne(() => Product, { eager: false, nullable: false })
    @JoinColumn({ name: 'productId' })
    product!: Product;

    @Column({ type: 'uuid' })
    locationId!: string;

    @ManyToOne(() => Location, (location) => location.productLocationStocks, {
        eager: false,
        nullable: false,
    })
    @JoinColumn({ name: 'locationId' })
    location!: Location;

    @Column({
        type: 'decimal',
        precision: 14,
        scale: 3,
        default: 0,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number.parseFloat(value),
        },
    })
    quantity!: number;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}
