import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

/**
 * Entidad para plantillas maestras de escalas de talles
 */
@Entity('size_scale_templates')
export class SizeScaleTemplate {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    name!: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    category?: string | null;

    @Column({ type: 'jsonb' })
    sizes!: string[];

    @Column({ type: 'boolean', default: false, name: 'is_system_preset' })
    isSystemPreset!: boolean;

    @Column({ type: 'int', default: 0, name: 'sort_order' })
    sortOrder!: number;

    @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
    updatedAt!: Date;
}
