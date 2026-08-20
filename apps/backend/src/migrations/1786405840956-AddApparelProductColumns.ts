import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApparelProductColumns1786405840956 implements MigrationInterface {
    name = 'AddApparelProductColumns1786405840956';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "products"
            ADD COLUMN IF NOT EXISTS "season" varchar(100) NULL,
            ADD COLUMN IF NOT EXISTS "collection" varchar(100) NULL,
            ADD COLUMN IF NOT EXISTS "composition" varchar(255) NULL,
            ADD COLUMN IF NOT EXISTS "care_instructions" varchar(255) NULL,
            ADD COLUMN IF NOT EXISTS "origin_country" varchar(100) NULL,
            ADD COLUMN IF NOT EXISTS "return_policy" varchar(50) NOT NULL DEFAULT 'standard',
            ADD COLUMN IF NOT EXISTS "image_url" varchar(500) NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "products"
            DROP COLUMN IF EXISTS "image_url",
            DROP COLUMN IF EXISTS "return_policy",
            DROP COLUMN IF EXISTS "origin_country",
            DROP COLUMN IF EXISTS "care_instructions",
            DROP COLUMN IF EXISTS "composition",
            DROP COLUMN IF EXISTS "collection",
            DROP COLUMN IF EXISTS "season";
        `);
    }
}
