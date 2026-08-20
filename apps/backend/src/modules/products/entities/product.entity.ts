import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
    BeforeInsert,
    BeforeUpdate,
} from 'typeorm';
import { Category } from './category.entity';
import { Brand } from './brand.entity';
import { StockMovement } from '../../inventory/entities/stock-movement.entity';
import { ProductLocationStock } from '../../inventory/entities/product-location-stock.entity';
import { ProductPack } from './product-pack.entity';
import { ProductBundle } from './product-bundle.entity';
import { ProductVariantAttribute } from './product-variant-attribute.entity';

@Entity('products')
@Index(['name'])
@Index(['barcode'])
@Index(['isActive'])
export class Product {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255 })
    name!: string;

    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    sku?: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    barcode?: string | null;

    @Column({ type: 'boolean', default: false })
    isMeasure!: boolean;

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 3,
        nullable: true,
        transformer: {
            to: (value: number | null) => value,
            from: (value: string | null) => value === null ? null : Number.parseFloat(value),
        },
    })
    tareGrams!: number | null;

    @Column({ type: 'varchar', length: 16, nullable: true })
    variableBarcodeFormat!: 'gs1_weight' | 'gs1_price' | 'local_weight' | 'local_price' | null;

    @Column({
        type: 'decimal',
        precision: 20,
        scale: 2,
        nullable: true,
        transformer: {
            to: (value: number | null) => value,
            from: (value: string | null) => value ? Number.parseFloat(value) : null,
        },
    })
    cost!: number | null;

    @Column({
        type: 'decimal',
        precision: 20,
        scale: 2,
        nullable: true,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number.parseFloat(value),
        },
    })
    price?: number | null;

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
        nullable: true,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => value ? Number.parseFloat(value) : null,
        },
    })
    profitMargin?: number | null;

    /**
     * Stock total consolidado.
     * - En modo simple: única verdad, se modifica como hasta ahora.
     * - En modo sectorizado: derivado de la suma de
     *   `ProductLocationStock.quantity`. NO se escribe directamente;
     *   `InventoryService` lo recalcula dentro de la misma transacción que
     *   toca `product_location_stock`.
     */
    @Column({
        type: 'decimal',
        precision: 20,
        scale: 3,
        default: 0,
        transformer: {
            to: (value: number) => value,
            from: (value: string) => Number.parseFloat(value),
        },
    })
    stock!: number;

    // Relación ManyToOne: Un producto pertenece a UNA categoría (opcional)
    @Index()
    @Column({ type: 'uuid', nullable: true })
    categoryId!: string | null;

    @ManyToOne(() => Category, (category) => category.products, { eager: false, nullable: true })
    @JoinColumn({ name: 'categoryId' })
    category!: Category | null;

    // Relación ManyToOne: Un producto tiene UNA marca (opcional)
    @Index()
    @Column({ type: 'uuid', nullable: true })
    brandId!: string | null;

    @ManyToOne(() => Brand, (brand) => brand.products, { eager: false, nullable: true })
    @JoinColumn({ name: 'brandId' })
    brand!: Brand | null;

    // Movimientos de stock que afectaron este producto (modo simple o sectorizado).
    @OneToMany(() => StockMovement, (movement) => movement.product)
    stockMovements!: StockMovement[];

    // Saldos por ubicación cuando el modo sectorizado está activo.
    @OneToMany(() => ProductLocationStock, (pls) => pls.product)
    productLocationStocks!: ProductLocationStock[];

    @Column({ type: 'boolean', default: false })
    isVariantParent!: boolean;

    @Column({ type: 'varchar', length: 100, nullable: true })
    season?: string | null;

    @Column({ name: 'size_chart', type: 'jsonb', nullable: true })
    sizeChart?: Record<string, string> | null;

    @Index()
    @Column({ type: 'uuid', nullable: true })
    parentProductId!: string | null;

    @ManyToOne(() => Product, (product) => product.variants, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'parentProductId' })
    parentProduct!: Product | null;

    @OneToMany(() => Product, (product) => product.parentProduct)
    variants!: Product[];

    @OneToMany(() => ProductVariantAttribute, (attribute) => attribute.product, { cascade: true })
    variantAttributes!: ProductVariantAttribute[];

    @OneToMany(() => ProductPack, (pack) => pack.product, { cascade: true })
    packs!: ProductPack[];

    @OneToMany(() => ProductBundle, (bundle) => bundle.bundleProduct, { cascade: true })
    bundleComponents!: ProductBundle[];

    @Column({ type: 'boolean', default: false })
    useCustomMargin!: boolean;

    @Column({ type: 'boolean', default: false })
    useManualPrice!: boolean;

    @Column({ type: 'varchar', length: 100, nullable: true })
    collection?: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    composition?: string | null;

    @Column({ name: 'care_instructions', type: 'varchar', length: 255, nullable: true })
    careInstructions?: string | null;

    @Column({ name: 'origin_country', type: 'varchar', length: 100, nullable: true })
    originCountry?: string | null;

    @Column({ name: 'return_policy', type: 'varchar', length: 50, default: 'standard' })
    returnPolicy?: 'standard' | 'final_sale' | 'size_exchange_only' | 'time_limited' | string;

    @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
    imageUrl?: string | null;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;

    // Hook para calcular precio si hay margen de ganancia
    @BeforeInsert()
    @BeforeUpdate()
    calculatePriceFromMargin() {
        if (this.useManualPrice) {
            return;
        }
        if (this.profitMargin && this.cost) {
            this.price = this.cost * (1 + this.profitMargin / 100);
            this.price = Math.round(this.price * 100) / 100; // Redondear a 2 decimales
        }
    }
}
