import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

/**
 * Tipos de atributo soportados en la matriz de variantes.
 * - color: usa colorHex para mostrar en UI
 * - size:  colorHex queda NULL
 */
export type VariantAttributeType = 'color' | 'size';

/**
 * Opciones maestras de atributos para variantes de producto
 * (colores y talles de la matriz talles × colores).
 *
 * Seed inicial:
 *  - 7 colores (Negro, Blanco, Azul, Rojo, Gris, Verde, Beige)
 *  - 14 talles (S, M, L, XL, XXL, 36..44)
 */
@Entity('variant_attribute_options')
export class VariantAttributeOption {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({
        type: 'varchar',
        length: 16,
    })
    type!: VariantAttributeType;

    @Column({ type: 'varchar', length: 100 })
    name!: string;

    @Column({ type: 'varchar', length: 7, nullable: true })
    colorHex!: string | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}
