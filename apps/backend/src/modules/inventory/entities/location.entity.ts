import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    Index,
} from 'typeorm';
import { ProductLocationStock } from './product-location-stock.entity';

/**
 * Función lógica de una ubicación física.
 * - SALE: abastece el punto de venta (salón, mostrador).
 * - STORAGE: almacenamiento / depósito.
 */
export enum LocationFunction {
    SALE = 'SALE',
    STORAGE = 'STORAGE',
}

/**
 * Ubicación física de stock (salón, depósito, etc.).
 * Una ubicación activa puede ser la primaria de venta o el destino
 * predeterminado de compras; a lo sumo una fila por cada rol (partial
 * unique index garantiza la unicidad).
 */
@Entity('locations')
@Index(['name'], { unique: true })
export class Location {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 120, unique: true })
    name!: string;

    @Column({
        type: 'enum',
        enum: LocationFunction,
        default: LocationFunction.STORAGE,
    })
    function!: LocationFunction;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    /** Marca la ubicación primaria que abastece ventas (a lo sumo una true). */
    @Column({ type: 'boolean', default: false })
    isPrimarySale!: boolean;

    /** Marca el destino predeterminado para compras (a lo sumo una true). */
    @Column({ type: 'boolean', default: false })
    isDefaultReceive!: boolean;

    @OneToMany(() => ProductLocationStock, (pls) => pls.location)
    productLocationStocks!: ProductLocationStock[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}
