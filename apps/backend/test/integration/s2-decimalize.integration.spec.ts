import { DataSource } from 'typeorm';
import { entities } from '../../src/entities';

/**
 * S2 H1 integration test: validates that the migrations applied to
 * `nexopos_test` widened the transactional `quantity` columns and added the
 * snapshot columns on `sale_items` / `purchase_items`. The shared
 * `test/setup-integration.ts` boots a `synchronize: true` DataSource that
 * reflects the entity column types; the migrations are applied separately
 * via `typeorm migration:run` against the same database. We re-use the
 * entity types to query the live schema so the test stays accurate when
 * entities drift.
 */

describe('S2 H1 schema after decimalize + snapshot migrations', () => {
    let dataSource: DataSource;

    beforeAll(async () => {
        dataSource = new DataSource({
            type: 'postgres',
            host: 'localhost',
            port: 5433,
            username: 'test',
            password: 'test',
            database: 'nexopos_test',
            entities,
            synchronize: false,
            logging: false,
        });
        await dataSource.initialize();
    });

    afterAll(async () => {
        if (dataSource?.isInitialized) {
            await dataSource.destroy();
        }
    });

    it('Given sale_items, purchase_items, stock_movements When checking quantity column Then it is numeric(20,3)', async () => {
        const rows = await dataSource.query(
            `SELECT table_name, data_type, numeric_precision, numeric_scale
             FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name IN ('sale_items','purchase_items','stock_movements')
               AND column_name = 'quantity'
             ORDER BY table_name`,
        );
        expect(rows).toHaveLength(3);
        for (const row of rows) {
            expect(row.data_type).toBe('numeric');
            expect(row.numeric_precision).toBe(20);
            expect(row.numeric_scale).toBe(3);
        }
    });

    it('Given snapshot columns on sale_items and purchase_items When checking schema Then each column exists with correct type', async () => {
        for (const table of ['sale_items', 'purchase_items']) {
            for (const [column, expectedType] of [
                ['unitOfMeasureCode', 'character varying'],
                ['uomConversionToBase', 'numeric'],
                ['unitCost', 'numeric'],
                ['taxSnapshot', 'jsonb'],
                ['capabilitySnapshot', 'jsonb'],
            ] as const) {
                const rows = await dataSource.query(
                    `SELECT data_type FROM information_schema.columns
                     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
                    [table, column],
                );
                expect(rows.length).toBe(1);
                expect(rows[0].data_type).toBe(expectedType);
            }
        }
    });

    it('Given a decimal quantity value When reading it back Then exact value preserved', async () => {
        const product = await dataSource.query(
            `INSERT INTO "products" ("name", "cost", "price", "useCustomMargin", "isActive")
             VALUES ('S2 round-trip', 1, 1, false, true)
             RETURNING "id"`,
        );
        const productId = product[0].id;

        try {
            await dataSource.query(
                `INSERT INTO "stock_movements" ("productId", "type", "source", "quantity", "date")
                 VALUES ($1, 'IN', 'ADJUSTMENT', 0.125, NOW())`,
                [productId],
            );

            const result = await dataSource.query(
                `SELECT "quantity" FROM "stock_movements" WHERE "productId" = $1`,
                [productId],
            );
            expect(Number(result[0].quantity)).toBe(0.125);
        } finally {
            await dataSource.query(`DELETE FROM "stock_movements" WHERE "productId" = $1`, [productId]);
            await dataSource.query(`DELETE FROM "products" WHERE "id" = $1`, [productId]);
        }
    });
});