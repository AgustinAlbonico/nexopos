import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S2 Stage 2 — additive snapshot columns on transactional lines.
 *
 * Plan reference: `<generated>-AddLineSnapshotColumns.ts`. Hand-written to
 * stay minimal and idempotent. Every column is nullable so existing rows
 * stay valid (legacy snapshot is `null`); the application layer reads these
 * only when present.
 *
 *   sale_items / purchase_items:
 *     - unitOfMeasureCode     varchar(16) NULL
 *     - uomConversionToBase   numeric(20,8) NULL
 *     - unitCost              numeric(20,4) NULL
 *     - taxSnapshot           jsonb NULL
 *     - capabilitySnapshot    jsonb NULL
 *
 * We intentionally do NOT yet read from these columns in `SalesService` /
 * `PurchasesService`; the snapshot writer hooks land in the next commit so
 * this migration is reversible via DROP COLUMN.
 */
export class S2AddLineSnapshotColumns1786405840941 implements MigrationInterface {
    name = 'S2AddLineSnapshotColumns1786405840941';

    private async ensureColumn(
        queryRunner: QueryRunner,
        table: string,
        column: string,
        type: string,
    ): Promise<void> {
        const exists = await queryRunner.query(
            `SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = $1
                  AND column_name = $2
            )`,
            [table, column],
        );
        if (exists[0]?.exists) return;
        await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`);
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const table of ['sale_items', 'purchase_items']) {
            await this.ensureColumn(queryRunner, table, 'unitOfMeasureCode', 'varchar(16)');
            await this.ensureColumn(queryRunner, table, 'uomConversionToBase', 'numeric(20,8)');
            await this.ensureColumn(queryRunner, table, 'unitCost', 'numeric(20,4)');
            await this.ensureColumn(queryRunner, table, 'taxSnapshot', 'jsonb');
            await this.ensureColumn(queryRunner, table, 'capabilitySnapshot', 'jsonb');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const table of ['sale_items', 'purchase_items']) {
            for (const column of [
                'capabilitySnapshot',
                'taxSnapshot',
                'unitCost',
                'uomConversionToBase',
                'unitOfMeasureCode',
            ]) {
                await queryRunner.query(
                    `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${column}"`,
                );
            }
        }
    }
}