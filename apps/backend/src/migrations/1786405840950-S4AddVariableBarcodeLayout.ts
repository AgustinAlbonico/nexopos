import { MigrationInterface, QueryRunner } from 'typeorm';

export class S4AddVariableBarcodeLayout1786405840950 implements MigrationInterface {
    name = 'S4AddVariableBarcodeLayout1786405840950';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "system_configuration" ADD COLUMN IF NOT EXISTS "variable_barcode_layout" jsonb');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "system_configuration" DROP COLUMN IF EXISTS "variable_barcode_layout"');
    }
}
