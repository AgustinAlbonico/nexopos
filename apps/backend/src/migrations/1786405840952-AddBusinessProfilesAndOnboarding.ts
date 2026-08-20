import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessProfilesAndOnboarding1786405840952 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "system_configuration"
            ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS "selected_business_type" varchar(64) NULL;
        `);

        // Migration fallback: if profile_key was 'legacy' or invalid, set to 'simple-retail'
        await queryRunner.query(`
            UPDATE "system_configuration"
            SET "profile_key" = 'simple-retail'
            WHERE "profile_key" = 'legacy' OR "profile_key" = 'consignment' OR "profile_key" = 'unit-retail' OR "profile_key" = 'fast-packaged' OR "profile_key" = 'lot-retail';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "system_configuration"
            DROP COLUMN IF EXISTS "selected_business_type",
            DROP COLUMN IF EXISTS "onboarding_completed";
        `);
    }
}
