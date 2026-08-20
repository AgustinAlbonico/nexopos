import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApparelAdvancedFeatures1786405840958 implements MigrationInterface {
    name = 'AddApparelAdvancedFeatures1786405840958';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Columnas en productos: temporada y guía de talles
        await queryRunner.query(`
            ALTER TABLE "products"
            ADD COLUMN IF NOT EXISTS "season" varchar(100) NULL,
            ADD COLUMN IF NOT EXISTS "size_chart" jsonb NULL
        `);

        // 2. Columnas en ventas: vendedor, reserva con seña y fecha de expiración
        await queryRunner.query(`
            ALTER TABLE "sales"
            ADD COLUMN IF NOT EXISTS "seller_id" uuid NULL,
            ADD COLUMN IF NOT EXISTS "seller_name" varchar(255) NULL,
            ADD COLUMN IF NOT EXISTS "is_reservation" boolean NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS "reservation_deposit" numeric(12,2) NULL,
            ADD COLUMN IF NOT EXISTS "reservation_status" varchar(50) NULL,
            ADD COLUMN IF NOT EXISTS "reservation_expires_at" timestamp NULL
        `);

        // 3. Índice para búsqueda de ventas por vendedor y reservas
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_sales_seller_id" ON "sales" ("seller_id");
            CREATE INDEX IF NOT EXISTS "IDX_sales_is_reservation" ON "sales" ("is_reservation", "reservation_status");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX IF EXISTS "IDX_sales_is_reservation";
            DROP INDEX IF EXISTS "IDX_sales_seller_id";
            ALTER TABLE "sales"
            DROP COLUMN IF EXISTS "reservation_expires_at",
            DROP COLUMN IF EXISTS "reservation_status",
            DROP COLUMN IF EXISTS "reservation_deposit",
            DROP COLUMN IF EXISTS "is_reservation",
            DROP COLUMN IF EXISTS "seller_name",
            DROP COLUMN IF EXISTS "seller_id";
            ALTER TABLE "products"
            DROP COLUMN IF EXISTS "size_chart",
            DROP COLUMN IF EXISTS "season";
        `);
    }
}
