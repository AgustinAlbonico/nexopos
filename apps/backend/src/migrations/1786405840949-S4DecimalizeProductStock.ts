import { MigrationInterface, QueryRunner } from 'typeorm';

export class S4DecimalizeProductStock1786405840949 implements MigrationInterface {
    name = 'S4DecimalizeProductStock1786405840949';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "products" ALTER COLUMN "stock" TYPE numeric(20,3)');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const fractional = await queryRunner.query('SELECT 1 FROM "products" WHERE "stock" <> FLOOR("stock") LIMIT 1');
        if (fractional.length > 0) throw new Error('S4DecimalizeProductStock down aborted: fractional stock exists');
        await queryRunner.query('ALTER TABLE "products" ALTER COLUMN "stock" TYPE integer');
    }
}
