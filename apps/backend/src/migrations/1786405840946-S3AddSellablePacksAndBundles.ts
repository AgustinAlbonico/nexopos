import { MigrationInterface, QueryRunner } from 'typeorm';

export class S3AddSellablePacksAndBundles1786405840946 implements MigrationInterface {
    name = 'S3AddSellablePacksAndBundles1786405840946';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "product_packs" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "product_id" uuid NOT NULL,
                "pack_barcode" varchar(100) NOT NULL UNIQUE,
                "pack_price" numeric(20,2) NOT NULL,
                "units_per_pack" numeric(20,3) NOT NULL,
                CONSTRAINT "FK_product_packs_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_product_packs_product_id" ON "product_packs" ("product_id")`);

        await queryRunner.query(`
            CREATE TABLE "product_bundles" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "bundle_product_id" uuid NOT NULL,
                "component_product_id" uuid NOT NULL,
                "component_quantity" numeric(20,3) NOT NULL,
                CONSTRAINT "UQ_product_bundles_pair" UNIQUE ("bundle_product_id", "component_product_id"),
                CONSTRAINT "FK_product_bundles_bundle_product" FOREIGN KEY ("bundle_product_id") REFERENCES "products"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_product_bundles_component_product" FOREIGN KEY ("component_product_id") REFERENCES "products"("id") ON DELETE RESTRICT
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_product_bundles_bundle_product_id" ON "product_bundles" ("bundle_product_id")`);
        await queryRunner.query(`CREATE INDEX "idx_product_bundles_component_product_id" ON "product_bundles" ("component_product_id")`);

        await queryRunner.query(`ALTER TABLE "sale_items" ADD "pack_id" uuid NULL`);
        await queryRunner.query(`ALTER TABLE "sale_items" ADD "inventory_effects" jsonb NULL`);
        await queryRunner.query(`ALTER TABLE "sale_items" ADD CONSTRAINT "FK_sale_items_pack" FOREIGN KEY ("pack_id") REFERENCES "product_packs"("id") ON DELETE SET NULL`);
    }

    public async down(): Promise<void> {
        throw new Error('Forward-only migration: sellable pack/bundle sale metadata is required for deterministic returns');
    }
}
