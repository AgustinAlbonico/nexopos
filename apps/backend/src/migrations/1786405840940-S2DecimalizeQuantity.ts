import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S2 Stage 2 — decimalize the `quantity` columns on transactional lines.
 *
 * Plan reference: `<generated>-DecimalizeQuantityColumns.ts`. Hand-written
 * because TypeORM's diff against an already-applied schema produced a full
 * rebuild. We widen only the three columns S2 cares about:
 *
 *   - `sale_items.quantity`     int → numeric(20,3)
 *   - `purchase_items.quantity`  int → numeric(20,3)
 *   - `stock_movements.quantity` int → numeric(20,3)
 *
 * Existing integer values round-trip exactly (e.g. 5 → 5.000).
 *
 * Decimalization is **forward-only**: the `down()` aborts if any row has a
 * fractional value so production rollback never silently truncates data.
 */
export class S2DecimalizeQuantity1786405840940 implements MigrationInterface {
    name = 'S2DecimalizeQuantity1786405840940';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "sale_items" ALTER COLUMN "quantity" TYPE numeric(20,3)`,
        );
        await queryRunner.query(
            `ALTER TABLE "purchase_items" ALTER COLUMN "quantity" TYPE numeric(20,3)`,
        );
        await queryRunner.query(
            `ALTER TABLE "stock_movements" ALTER COLUMN "quantity" TYPE numeric(20,3)`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const fractional = await queryRunner.query(`
            SELECT 'sale_items' AS source FROM "sale_items" WHERE "quantity" <> FLOOR("quantity") LIMIT 1
            UNION ALL
            SELECT 'purchase_items' AS source FROM "purchase_items" WHERE "quantity" <> FLOOR("quantity") LIMIT 1
            UNION ALL
            SELECT 'stock_movements' AS source FROM "stock_movements" WHERE "quantity" <> FLOOR("quantity") LIMIT 1
        `);

        if (fractional.length > 0) {
            const sources = fractional.map((row: { source: string }) => row.source).join(', ');
            throw new Error(
                `S2DecimalizeQuantity down aborted: fractional quantities exist in ${sources}. Production rollback must never truncate decimal data.`,
            );
        }

        await queryRunner.query(
            `ALTER TABLE "stock_movements" ALTER COLUMN "quantity" TYPE integer`,
        );
        await queryRunner.query(
            `ALTER TABLE "purchase_items" ALTER COLUMN "quantity" TYPE integer`,
        );
        await queryRunner.query(
            `ALTER TABLE "sale_items" ALTER COLUMN "quantity" TYPE integer`,
        );
    }
}