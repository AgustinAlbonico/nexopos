import { MigrationInterface, QueryRunner } from 'typeorm';

export class S4AddSaleItemMeasureColumns1786405840948 implements MigrationInterface {
    name = 'S4AddSaleItemMeasureColumns1786405840948';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "enterMode" varchar(16)');
        await queryRunner.query('ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "grossQuantity" numeric(20,3)');
        await queryRunner.query('ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "tareGrams" numeric(10,3)');
        await queryRunner.query('ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "netQuantity" numeric(20,3)');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "sale_items" DROP COLUMN IF EXISTS "netQuantity"');
        await queryRunner.query('ALTER TABLE "sale_items" DROP COLUMN IF EXISTS "tareGrams"');
        await queryRunner.query('ALTER TABLE "sale_items" DROP COLUMN IF EXISTS "grossQuantity"');
        await queryRunner.query('ALTER TABLE "sale_items" DROP COLUMN IF EXISTS "enterMode"');
    }
}
