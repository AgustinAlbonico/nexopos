/**
 * Entidad AuditLog - Registro de auditoría centralizado
 * Almacena todas las operaciones sobre entidades financieras
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { AuditEntityType, AuditAction } from '../enums/audit.enums';

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['userId'])
@Index(['timestamp'])
@Index(['action'])
@Index(['entityType', 'timestamp'])
@Index(['userId', 'timestamp'])
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /**
     * Tipo de entidad afectada (sale, expense, income, etc.)
     */
    @Column({
        type: 'varchar',
        length: 50,
        name: 'entity_type'
    })
    entityType!: AuditEntityType;

    /**
     * ID de la entidad afectada
     */
    @Column({
        type: 'uuid',
        name: 'entity_id'
    })
    entityId!: string;

    /**
     * Acción realizada (CREATE, UPDATE, DELETE, etc.)
     */
    @Column({
        type: 'varchar',
        length: 20
    })
    action!: AuditAction;

    /**
     * Usuario que realizó la acción
     */
    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ name: 'user_id' })
    userId!: string;

    /**
     * Valores anteriores (antes de la modificación)
     * Se almacena como JSON para flexibilidad
     */
    @Column({
        type: 'jsonb',
        nullable: true,
        name: 'previous_values'
    })
    previousValues!: Record<string, unknown> | null;

    /**
     * Valores nuevos (después de la modificación)
     * Se almacena como JSON para flexibilidad
     */
    @Column({
        type: 'jsonb',
        nullable: true,
        name: 'new_values'
    })
    newValues!: Record<string, unknown> | null;

    /**
     * Metadatos adicionales (IP, user-agent, descripción, etc.)
     */
    @Column({
        type: 'jsonb',
        nullable: true
    })
    metadata!: Record<string, unknown> | null;

    /**
     * Descripción legible de la acción realizada
     */
    @Column({
        type: 'varchar',
        length: 500,
        nullable: true
    })
    description!: string | null;

    /**
     * Fecha y hora de la acción
     */
    @CreateDateColumn({ type: 'timestamp' })
    timestamp!: Date;
}
