import { MigrationInterface, QueryRunner } from 'typeorm';

export class S3DecimalizeStockMovementQuantity1786405840945 implements MigrationInterface {
    name = 'S3DecimalizeStockMovementQuantity1786405840945';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "stock_movements" ALTER COLUMN "quantity" TYPE numeric(20,3) USING "quantity"::numeric`,
        );
    }

    public async down(): Promise<void> {
        throw new Error('Forward-only migration: stock movement quantities may contain fractional values');
    }
}
