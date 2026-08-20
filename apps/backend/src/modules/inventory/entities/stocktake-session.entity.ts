import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { StocktakeLine } from './stocktake-line.entity';

/**
 * Plan reference: `apps/backend/src/modules/inventory/entities/stocktake-session.entity.ts`.
 *
 * Status values are validated in the service layer (no Postgres enum migration
 * required — `audit_log.action` is `varchar` so STOCKTAKE_* fits naturally).
 */
export const STOCKTAKE_STATUS_VALUES = ['open', 'approved', 'cancelled'] as const;
export type StocktakeStatusValue = (typeof STOCKTAKE_STATUS_VALUES)[number];

@Entity('stocktake_sessions')
@Index(['status'])
export class StocktakeSession {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 200 })
    name!: string;

    @Column({ type: 'varchar', length: 16, default: 'open' })
    status!: StocktakeStatusValue;

    @CreateDateColumn({ type: 'timestamp' })
    startedAt!: Date;

    @Column({ type: 'uuid' })
    startedById!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'startedById' })
    startedBy!: User;

    @Column({ type: 'timestamp', nullable: true })
    approvedAt!: Date | null;

    @Column({ type: 'uuid', nullable: true })
    approvedById!: string | null;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'approvedById' })
    approvedBy!: User | null;

    @OneToMany(() => StocktakeLine, (line: StocktakeLine) => line.session)
    lines!: StocktakeLine[];
}