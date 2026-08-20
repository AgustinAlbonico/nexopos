import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Product } from './product.entity';

const decimal3 = {
    to: (value: number) => value,
    from: (value: string) => Number.parseFloat(value) || 0,
};

@Entity('product_bundles')
@Index(['bundleProductId', 'componentProductId'], { unique: true })
export class ProductBundle {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'bundle_product_id', type: 'uuid' })
    bundleProductId!: string;

    @ManyToOne(() => Product, (product) => product.bundleComponents, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'bundle_product_id' })
    bundleProduct!: Product;

    @Column({ name: 'component_product_id', type: 'uuid' })
    componentProductId!: string;

    @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'component_product_id' })
    componentProduct!: Product;

    @Column({ name: 'component_quantity', type: 'decimal', precision: 20, scale: 3, transformer: decimal3 })
    componentQuantity!: number;
}
