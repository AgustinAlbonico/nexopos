import { MigrationInterface, QueryRunner } from 'typeorm';

export class S4AddProductVariants1786405840951 implements MigrationInterface {
    name = 'S4AddProductVariants1786405840951';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isVariantParent" boolean NOT NULL DEFAULT false');
        await queryRunner.query('ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "parentProductId" uuid');
        await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_products_parentProductId" ON "products" ("parentProductId")');
        await queryRunner.query('ALTER TABLE "products" ADD CONSTRAINT "FK_products_parentProductId" FOREIGN KEY ("parentProductId") REFERENCES "products"("id") ON DELETE SET NULL');
        await queryRunner.query('CREATE TABLE IF NOT EXISTS "product_variant_attributes" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL, "attributeKey" varchar(64) NOT NULL, "attributeValue" varchar(128) NOT NULL, CONSTRAINT "UQ_product_variant_attributes_product_key" UNIQUE ("productId", "attributeKey"), CONSTRAINT "FK_product_variant_attributes_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE)');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP TABLE IF EXISTS "product_variant_attributes"');
        await queryRunner.query('ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_products_parentProductId"');
        await queryRunner.query('DROP INDEX IF EXISTS "IDX_products_parentProductId"');
        await queryRunner.query('ALTER TABLE "products" DROP COLUMN IF EXISTS "parentProductId"');
        await queryRunner.query('ALTER TABLE "products" DROP COLUMN IF EXISTS "isVariantParent"');
    }
}
