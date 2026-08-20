import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';

import { SaleItem } from './sale-item.entity';
import { SaleReturn } from './sale-return.entity';

export const SALE_RETURN_ITEM_DISPOSITIONS = ['restock', 'quarantine', 'scrap', 'supplier'] as const;
export type SaleReturnItemDisposition = typeof SALE_RETURN_ITEM_DISPOSITIONS[number];

const decimal3 = {
    to: (value: number) => value,
    from: (value: string) => Number.parseFloat(value) || 0,
};

const decimal2 = {
    to: (value: number) => value,
    from: (value: string) => Number.parseFloat(value) || 0,
};

@Entity('sale_return_items')
export class SaleReturnItem {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'return_id' })
    returnId!: string;

    @ManyToOne(() => SaleReturn, (saleReturn) => saleReturn.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'return_id' })
    saleReturn!: SaleReturn;

    @Column({ name: 'original_sale_item_id' })
    originalSaleItemId!: string;

    @ManyToOne(() => SaleItem)
    @JoinColumn({ name: 'original_sale_item_id' })
    originalSaleItem!: SaleItem;

    @Column({ type: 'decimal', precision: 20, scale: 3, transformer: decimal3 })
    quantityReturned!: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, transformer: decimal2 })
    unitRefundAmount!: number;

    @Column({ type: 'varchar', length: 16 })
    disposition!: SaleReturnItemDisposition;

    @Column({ type: 'jsonb', nullable: true })
    taxSnapshot!: Record<string, unknown> | null;

    @Column({ type: 'jsonb', nullable: true })
    capabilitySnapshot!: Record<string, unknown> | null;
}
