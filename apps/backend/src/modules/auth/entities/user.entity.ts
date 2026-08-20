import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    Index,
    BeforeInsert,
    BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { RefreshToken } from './refresh-token.entity';

export enum UserRole {
    ADMIN = 'admin',
    MANAGER = 'manager',
    CASHIER = 'cashier',
}

@Entity('users')
@Index(['username'])
export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    username!: string;

    @Column({ type: 'varchar', length: 50, default: UserRole.ADMIN })
    role!: UserRole;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email!: string | null;

    @Column({ type: 'varchar', length: 255, select: false })
    passwordHash!: string;

    @Column({ type: 'varchar', length: 100 })
    firstName!: string;

    @Column({ type: 'varchar', length: 100 })
    lastName!: string;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    lastLogin!: Date | null;

    @OneToMany(() => RefreshToken, (token) => token.user)
    refreshTokens!: RefreshToken[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;

    // Virtual field
    get fullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }

    // Method to validate password
    async validatePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.passwordHash);
    }

    // Hash password before insert/update
    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword() {
        if (this.passwordHash && !this.passwordHash.startsWith('$2b$')) {
            this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
        }
    }
}
