import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { entities } from './entities';

// Cargar variables de entorno
config({ path: '../../.env' });

/**
 * DataSource para TypeORM CLI
 * Usado para generar y correr migraciones
 */
export default new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 5432,
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'nexopos',
    entities: entities,
    migrations: ['src/migrations/*.ts'],
    migrationsTransactionMode: 'each',
    synchronize: false,
    logging: false,
});
