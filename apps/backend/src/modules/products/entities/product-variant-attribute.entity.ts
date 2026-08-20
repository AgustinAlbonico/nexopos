import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_variant_attributes')
@Unique(['productId', 'attributeKey'])
export class ProductVariantAttribute {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    productId!: string;

    @ManyToOne(() => Product, (product) => product.variantAttributes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productId' })
    product!: Product;

    @Column({ type: 'varchar', length: 64 })
    attributeKey!: string;

    @Column({ type: 'varchar', length: 128 })
    attributeValue!: string;
}
