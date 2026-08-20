import type { QueryRunner } from 'typeorm';

import { AddCapabilitiesColumns1786387763156 } from '../../src/migrations/1786387763156-AddCapabilitiesColumns';
import { testDataSource } from '../setup-integration';

type UnknownRecord = Readonly<Record<string, unknown>>;

let schemaSequence = 0;

function safeSchemaName(): string {
    schemaSequence += 1;
    return `s1caps_${process.pid}_${Date.now()}_${schemaSequence}`.replace(/[^a-zA-Z0-9_]/g, '');
}

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRows(value: unknown): readonly UnknownRecord[] {
    if (!Array.isArray(value) || value.some((row) => !isRecord(row))) {
        throw new Error('Expected query rows');
    }
    return value;
}

function firstRow(value: unknown): UnknownRecord {
    const rows = toRows(value);
    const row = rows[0];
    if (row === undefined) {
        throw new Error('Expected one query row');
    }
    return row;
}

async function withMigrationSchema(run: (queryRunner: QueryRunner) => Promise<void>): Promise<void> {
    const queryRunner = testDataSource.createQueryRunner();
    const schemaName = safeSchemaName();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
        await queryRunner.query(`CREATE SCHEMA "${schemaName}"`);
        await queryRunner.query(`SET LOCAL search_path TO "${schemaName}", public`);
        await run(queryRunner);
    } finally {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
    }
}

async function createPreCapabilityTable(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE system_configuration (
            id uuid PRIMARY KEY,
            defaultProfitMargin numeric(10, 2) NOT NULL DEFAULT 30,
            minStockAlert integer NOT NULL DEFAULT 5,
            sistemaHabilitado boolean NOT NULL DEFAULT true,
            barcodeScannerEnabled boolean NOT NULL DEFAULT false,
            barcodeScannerTimeoutMs integer NOT NULL DEFAULT 100,
            allowOutOfStockSale boolean NOT NULL DEFAULT false,
            stockSectorizado boolean NOT NULL DEFAULT false,
            primarySaleLocationId uuid NULL,
            defaultReceiveLocationId uuid NULL,
            stockMinimoVenta integer NOT NULL DEFAULT 5,
            createdAt timestamp NOT NULL DEFAULT now(),
            updatedAt timestamp NOT NULL DEFAULT now()
        )
    `);
}

async function insertLegacyRow(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
        `
            INSERT INTO system_configuration (
                id,
                defaultProfitMargin,
                minStockAlert,
                sistemaHabilitado,
                barcodeScannerEnabled,
                barcodeScannerTimeoutMs,
                allowOutOfStockSale,
                stockSectorizado,
                stockMinimoVenta
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        ['00000000-0000-0000-0000-000000000001', 42.5, 11, false, true, 250, true, true, 7],
    );
}

async function columnRows(queryRunner: QueryRunner): Promise<readonly UnknownRecord[]> {
    return toRows(await queryRunner.query(`
        SELECT column_name, column_default, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'system_configuration'
          AND column_name IN ('profile_key', 'profile_version', 'capabilities_json', 'capabilities_schema_version')
        ORDER BY column_name
    `));
}

async function hasColumn(queryRunner: QueryRunner, columnName: string): Promise<boolean> {
    const row = firstRow(await queryRunner.query(
        `
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'system_configuration'
                  AND column_name = $1
            ) AS exists
        `,
        [columnName],
    ));
    return row.exists === true;
}

describe('Integración: AddCapabilitiesColumns1786387763156 migration', () => {
    const migration = new AddCapabilitiesColumns1786387763156();

    it('Given a clean pre-capability table When migration runs up Then capability columns are created with defaults', async () => {
        await withMigrationSchema(async (queryRunner) => {
            await createPreCapabilityTable(queryRunner);

            await migration.up(queryRunner);

            const columns = await columnRows(queryRunner);
            expect(columns).toEqual([
                expect.objectContaining({ column_name: 'capabilities_json', column_default: "'{}'::jsonb", data_type: 'jsonb', is_nullable: 'NO' }),
                expect.objectContaining({ column_name: 'capabilities_schema_version', column_default: '1', data_type: 'integer', is_nullable: 'NO' }),
                expect.objectContaining({ column_name: 'profile_key', column_default: "'legacy'::character varying", data_type: 'character varying', is_nullable: 'NO' }),
                expect.objectContaining({ column_name: 'profile_version', column_default: '1', data_type: 'integer', is_nullable: 'NO' }),
            ]);
        });
    });

    it('Given pre-feature legacy values When migration runs up Then values survive and metadata defaults are legacy version one empty overrides', async () => {
        await withMigrationSchema(async (queryRunner) => {
            await createPreCapabilityTable(queryRunner);
            await insertLegacyRow(queryRunner);

            await migration.up(queryRunner);

            const row = firstRow(await queryRunner.query('SELECT * FROM system_configuration'));
            expect(Number(row.defaultprofitmargin)).toBe(42.5);
            expect(row.minstockalert).toBe(11);
            expect(row.sistemahabilitado).toBe(false);
            expect(row.barcodescannerenabled).toBe(true);
            expect(row.barcodescannertimeoutms).toBe(250);
            expect(row.allowoutofstocksale).toBe(true);
            expect(row.stocksectorizado).toBe(true);
            expect(row.stockminimoventa).toBe(7);
            expect(row.profile_key).toBe('legacy');
            expect(row.profile_version).toBe(1);
            expect(row.capabilities_json).toEqual({});
            expect(row.capabilities_schema_version).toBe(1);
        });
    });

    it('Given only legacy-empty metadata When migration runs down Then capability columns are dropped', async () => {
        await withMigrationSchema(async (queryRunner) => {
            await createPreCapabilityTable(queryRunner);
            await insertLegacyRow(queryRunner);
            await migration.up(queryRunner);

            await migration.down(queryRunner);

            expect(await hasColumn(queryRunner, 'profile_key')).toBe(false);
            expect(await hasColumn(queryRunner, 'profile_version')).toBe(false);
            expect(await hasColumn(queryRunner, 'capabilities_json')).toBe(false);
            expect(await hasColumn(queryRunner, 'capabilities_schema_version')).toBe(false);
        });
    });

    it.each([
        ['nonlegacy profile', `UPDATE system_configuration SET profile_key = 'weight'`],
        ['capability overrides', `UPDATE system_configuration SET capabilities_json = '{"APP_ROUTES.sales": false}'::jsonb`],
    ])('Given %s metadata When migration runs down Then it rejects and preserves columns', async (_name, updateSql) => {
        await withMigrationSchema(async (queryRunner) => {
            await createPreCapabilityTable(queryRunner);
            await insertLegacyRow(queryRunner);
            await migration.up(queryRunner);
            await queryRunner.query(updateSql);

            await expect(migration.down(queryRunner)).rejects.toThrow(
                'Cannot drop capability metadata columns while non-legacy configuration data exists',
            );
            expect(await hasColumn(queryRunner, 'profile_key')).toBe(true);
            expect(await hasColumn(queryRunner, 'capabilities_json')).toBe(true);
        });
    });
});
