import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCapabilitiesColumns1786387763156 implements MigrationInterface {
    name = 'AddCapabilitiesColumns1786387763156';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "system_configuration"
            ADD COLUMN "profile_key" character varying(64) NOT NULL DEFAULT 'legacy',
            ADD COLUMN "profile_version" integer NOT NULL DEFAULT 1,
            ADD COLUMN "capabilities_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
            ADD COLUMN "capabilities_schema_version" integer NOT NULL DEFAULT 1
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const result = await queryRunner.query(`
            SELECT COUNT(*)::int AS "nonLegacyCount"
            FROM "system_configuration"
            WHERE "profile_key" <> 'legacy'
               OR "profile_version" <> 1
               OR "capabilities_json" <> '{}'::jsonb
               OR "capabilities_schema_version" <> 1
        `);

        if (Number(result[0]?.nonLegacyCount ?? 0) > 0) {
            throw new Error('Cannot drop capability metadata columns while non-legacy configuration data exists');
        }

        await queryRunner.query(`
            ALTER TABLE "system_configuration"
            DROP COLUMN "capabilities_schema_version",
            DROP COLUMN "capabilities_json",
            DROP COLUMN "profile_version",
            DROP COLUMN "profile_key"
        `);
    }
}
