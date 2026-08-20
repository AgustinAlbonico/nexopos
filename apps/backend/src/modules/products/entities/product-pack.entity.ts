import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Product } from './product.entity';

const decimal2 = {
    to: (value: number) => value,
    from: (value: string) => Number.parseFloat(value) || 0,
};

const decimal3 = {
    to: (value: number) => value,
    from: (value: string) => Number.parseFloat(value) || 0,
};

@Entity('product_packs')
@Index(['packBarcode'], { unique: true })
export class ProductPack {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'product_id', type: 'uuid' })
    productId!: string;

    @ManyToOne(() => Product, (product) => product.packs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product!: Product;

    @Column({ name: 'pack_barcode', type: 'varchar', length: 100, unique: true })
    packBarcode!: string;

    @Column({ name: 'pack_price', type: 'decimal', precision: 20, scale: 2, transformer: decimal2 })
    packPrice!: number;

    @Column({ name: 'units_per_pack', type: 'decimal', precision: 20, scale: 3, transformer: decimal3 })
    unitsPerPack!: number;
}
