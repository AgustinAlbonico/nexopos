import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueSkuAndBarcodeConstraints1786405840955 implements MigrationInterface {
    name = 'AddUniqueSkuAndBarcodeConstraints1786405840955';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Crear índice único parcial en products.sku (ignora NULL y cadenas vacías)
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "UQ_products_sku"
            ON "products" ("sku")
            WHERE "sku" IS NOT NULL AND "sku" != '';
        `);

        // Crear índice único parcial en products.barcode (ignora NULL y cadenas vacías)
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "UQ_products_barcode"
            ON "products" ("barcode")
            WHERE "barcode" IS NOT NULL AND "barcode" != '';
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_products_barcode";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_products_sku";`);
    }
}
