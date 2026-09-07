/**
 * Setup para tests de integración con BD real.
 *
 * Alineado con el plan S2 (`.omo/plans/retail-multirubro-phase-execution.md`,
 * líneas 519-526): usamos `migrationsRun: true` con el array registrado en
 * `migrations.ts` en vez de `synchronize: true`. Esto preserva el shape
 * generado por las migraciones (incluidos los `numeric(20,3)` y columnas
 * snapshot añadidos por S2 H1) y deja de reescribir el esquema desde
 * entidades en cada corrida.
 *
 * `dropSchema: true` sigue siendo válido: limpia la BD antes de que las
 * migraciones reaparezcan el esquema durante `migrationsRun`.
 */

import { DataSource } from 'typeorm';
import { entities as appEntities } from '../src/entities';
import { migrations as appMigrations } from '../src/migrations';

// Configuración de la BD de tests — defaults = docker-compose.test.yml.
// Override con env vars TEST_DB_* si Docker no está disponible.
const TEST_DB_HOST = process.env.TEST_DB_HOST ?? 'localhost';
const TEST_DB_PORT = Number(process.env.TEST_DB_PORT ?? 5433);
const TEST_DB_USER = process.env.TEST_DB_USER ?? 'test';
const TEST_DB_PASS = process.env.TEST_DB_PASS ?? 'test';
const TEST_DB_NAME = process.env.TEST_DB_NAME ?? 'nexopos_test';

export let testDataSource: DataSource;

beforeAll(async () => {
    testDataSource = new DataSource({
        type: 'postgres',
        host: 'localhost',
        port: 5433,
        username: 'test',
        password: 'test',
        database: 'nexopos_test',
        entities: appEntities,
        migrations: appMigrations,
        migrationsRun: true,
        migrationsTransactionMode: 'each',
        synchronize: false,
        dropSchema: true,
        logging: false,
    });

    await testDataSource.initialize();
});

afterAll(async () => {
    if (testDataSource?.isInitialized) {
        await testDataSource.destroy();
    }
});

// Limpiar tablas entre tests
beforeEach(async () => {
    // Deshabilitar constraints para evitar deadlocks
    await testDataSource.query(`SET session_replication_role = 'replica'`);

    const entities = testDataSource.entityMetadatas;
    const tableNames = entities.map((e) => `"${e.tableName}"`).join(', ');

    // Truncate todas las tablas en una sola consulta
    await testDataSource.query(`TRUNCATE TABLE ${tableNames} CASCADE`);

    // Rehabilitar constraints
    await testDataSource.query(`SET session_replication_role = 'origin'`);
});

// Helper para obtener repositorios
export const getTestRepository = <T extends object>(entity: new () => T) => {
    return testDataSource.getRepository<T>(entity);
};