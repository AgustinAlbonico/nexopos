import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { CashRegister } from './cash-register.entity';


export enum MovementType {
    INCOME = 'income',
    EXPENSE = 'expense',
}

@Entity('cash_movements')
export class CashMovement {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => CashRegister, (register) => register.movements)
    @JoinColumn({ name: 'cash_register_id' })
    cashRegister!: CashRegister;

    @Column({ type: 'enum', enum: MovementType })
    movementType!: MovementType;

    @Column({ type: 'varchar', length: 50, nullable: true })
    referenceType?: string;

    @Column({ type: 'uuid', nullable: true })
    referenceId?: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'created_by' })
    createdBy?: User;

    // Campos para movimientos manuales (solo se usan cuando referenceType = 'manual')
    @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
    manualAmount?: number;

    @Column({ type: 'varchar', length: 200, nullable: true })
    manualDescription?: string;

    @Column({ type: 'uuid', nullable: true, name: 'manual_payment_method_id' })
    manualPaymentMethodId?: string;

    @Column({ type: 'varchar', length: 1000, nullable: true })
    manualNotes?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @DeleteDateColumn()
    deletedAt?: Date;
}
