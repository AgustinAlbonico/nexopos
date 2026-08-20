import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

/**
 * Categories a UOM may belong to. Mirrors `UomCategory` from
 * `canonical-bases.ts`. Validated at the application layer instead of via a
 * Postgres enum so we never need an enum migration when adding categories.
 */
export const UOM_CATEGORY_VALUES = ['unit', 'weight', 'volume', 'length'] as const;
export type UomCategoryValue = (typeof UOM_CATEGORY_VALUES)[number];

/**
 * Typed unit-of-measure definition.
 *
 * `conversionToBase` is `1` for the canonical base itself, and the
 * category-specific multiplier otherwise (e.g. `g → kg` = `0.001`).
 *
 * `precision` is the number of decimal places the UI accepts and the
 * backend enforces; it is persisted on the row to keep the converter
 * pure and to keep seeded and user-defined UOMs on equal footing.
 */
@Entity('unit_of_measures')
@Index(['code'], { unique: true })
export class UnitOfMeasure {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 16, unique: true })
    code!: string;

    @Column({ type: 'varchar', length: 64 })
    name!: string;

    @Column({ type: 'varchar', length: 8 })
    symbol!: string;

    @Column({ type: 'varchar', length: 16 })
    category!: UomCategoryValue;

    @Column({ type: 'int', default: 0 })
    precision!: number;

    @Column({
        type: 'decimal',
        precision: 20,
        scale: 8,
        default: 1,
        transformer: {
            to: (value: number | null | undefined) => value ?? 1,
            from: (value: string | null | undefined) =>
                value === null || value === undefined ? 1 : Number.parseFloat(value),
        },
    })
    conversionToBase!: number;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}