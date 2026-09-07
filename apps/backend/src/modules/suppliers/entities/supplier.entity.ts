/**
 * Entidad Supplier - Representa un proveedor
 * Gestiona los datos de proveedores para el módulo de compras
 */
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { IvaCondition } from '../../../common/enums/iva-condition.enum';

export enum DocumentType {
    DNI = 'DNI',
    CUIT = 'CUIT',
    CUIL = 'CUIL',
    OTRO = 'OTRO',
}



@Entity('suppliers')
@Index(['name'])
@Index(['documentNumber'])
@Index(['email'])
@Index(['isActive'])
@Index(['classification'])
export class Supplier {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 200 })
    name!: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    tradeName!: string | null; // Nombre de fantasía

    @Column({
        type: 'enum',
        enum: DocumentType,
        nullable: true,
    })
    documentType!: DocumentType | null;

    @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
    documentNumber!: string | null;

    @Column({
        type: 'enum',
        enum: IvaCondition,
        nullable: true,
    })
    ivaCondition!: IvaCondition | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    phone!: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    mobile!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    address!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    city!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    state!: string | null;

    @Column({ type: 'varchar', length: 20, nullable: true })
    postalCode!: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    website!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    contactName!: string | null; // Nombre del contacto principal

    @Column({ type: 'varchar', length: 100, nullable: true })
    bankAccount!: string | null; // CBU o alias

    @Column({ type: 'text', nullable: true })
    notes!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    classification!: string | null;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;

    // Getter para nombre completo con nombre de fantasía
    get displayName(): string {
        return this.tradeName ? `${this.name} (${this.tradeName})` : this.name;
    }
}
