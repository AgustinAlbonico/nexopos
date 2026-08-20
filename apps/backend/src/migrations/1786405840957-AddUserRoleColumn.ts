import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRoleColumn1786405840957 implements MigrationInterface {
    name = 'AddUserRoleColumn1786405840957';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN IF NOT EXISTS "role" varchar(50) NOT NULL DEFAULT 'admin';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN IF EXISTS "role";
        `);
    }
}
