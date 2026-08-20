import { MigrationInterface, QueryRunner } from 'typeorm';

export class S4AddMeasureColumns1786405840947 implements MigrationInterface {
    name = 'S4AddMeasureColumns1786405840947';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isMeasure" boolean NOT NULL DEFAULT false');
        await queryRunner.query('ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tareGrams" numeric(10,3)');
        await queryRunner.query('ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "variableBarcodeFormat" varchar(16)');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "products" DROP COLUMN IF EXISTS "variableBarcodeFormat"');
        await queryRunner.query('ALTER TABLE "products" DROP COLUMN IF EXISTS "tareGrams"');
        await queryRunner.query('ALTER TABLE "products" DROP COLUMN IF EXISTS "isMeasure"');
    }
}
