import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export interface ColorPaletteItem {
    name: string;
    hex: string;
    border?: boolean;
}

/**
 * Entidad para plantillas maestras de paletas de colores
 */
@Entity('color_palette_templates')
export class ColorPaletteTemplate {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    name!: string;

    @Column({ type: 'jsonb' })
    colors!: ColorPaletteItem[];

    @Column({ type: 'boolean', default: false, name: 'is_system_preset' })
    isSystemPreset!: boolean;

    @Column({ type: 'int', default: 0, name: 'sort_order' })
    sortOrder!: number;

    @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
    updatedAt!: Date;
}
