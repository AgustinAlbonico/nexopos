import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplierClassification1786405840962 implements MigrationInterface {
    name = 'AddSupplierClassification1786405840962';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasClassification = await queryRunner.hasColumn('suppliers', 'classification');
        if (!hasClassification) {
            await queryRunner.query(
                `ALTER TABLE "suppliers" ADD "classification" character varying(100)`,
            );
            await queryRunner.query(
                `CREATE INDEX "IDX_SUPPLIER_CLASSIFICATION" ON "suppliers" ("classification")`,
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasClassification = await queryRunner.hasColumn('suppliers', 'classification');
        if (hasClassification) {
            await queryRunner.query(`DROP INDEX "IDX_SUPPLIER_CLASSIFICATION"`);
            await queryRunner.query(`ALTER TABLE "suppliers" DROP COLUMN "classification"`);
        }
    }
}
