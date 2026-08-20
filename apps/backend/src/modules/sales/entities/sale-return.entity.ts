import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from 'typeorm';

import { CashRegister } from '../../cash-register/entities/cash-register.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Sale } from './sale.entity';
import { SaleReturnItem } from './sale-return-item.entity';

export const SALE_RETURN_STATUSES = ['draft', 'committed', 'cancelled'] as const;
export type SaleReturnStatus = typeof SALE_RETURN_STATUSES[number];

const decimal2 = {
    to: (value: number) => value,
    from: (value: string) => Number.parseFloat(value) || 0,
};

@Entity('sale_returns')
export class SaleReturn {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'original_sale_id' })
    originalSaleId!: string;

    @ManyToOne(() => Sale)
    @JoinColumn({ name: 'original_sale_id' })
    originalSale!: Sale;

    @Column({ name: 'customer_id', nullable: true })
    customerId!: string | null;

    @ManyToOne(() => Customer, { nullable: true })
    @JoinColumn({ name: 'customer_id' })
    customer!: Customer | null;

    @Column({ name: 'cash_register_session_id', nullable: true })
    cashRegisterSessionId!: string | null;

    @ManyToOne(() => CashRegister, { nullable: true })
    @JoinColumn({ name: 'cash_register_session_id' })
    cashRegisterSession!: CashRegister | null;

    @Column({ type: 'decimal', precision: 20, scale: 2, default: 0, transformer: decimal2 })
    totalRefund!: number;

    @Column({ type: 'decimal', precision: 20, scale: 2, default: 0, transformer: decimal2 })
    totalExchangeAmount!: number;

    @Column({ type: 'jsonb', nullable: true })
    refundPayments!: Array<{ paymentMethodId: string; amount: number }> | null;

    @Column({ type: 'varchar', length: 16, default: 'draft' })
    status!: SaleReturnStatus;

    @OneToMany(() => SaleReturnItem, (item) => item.saleReturn, { cascade: true, eager: true })
    items!: SaleReturnItem[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @Column({ type: 'timestamp', nullable: true })
    committedAt!: Date | null;
}
