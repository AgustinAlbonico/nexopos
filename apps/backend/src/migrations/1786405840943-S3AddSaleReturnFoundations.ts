import { MigrationInterface, QueryRunner } from 'typeorm';

export class S3AddSaleReturnFoundations1786405840943 implements MigrationInterface {
    name = 'S3AddSaleReturnFoundations1786405840943';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "sale_returns" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "original_sale_id" uuid NOT NULL,
                "customer_id" uuid NULL,
                "cash_register_session_id" uuid NULL,
                "totalRefund" numeric(20,2) NOT NULL DEFAULT 0,
                "totalExchangeAmount" numeric(20,2) NOT NULL DEFAULT 0,
                "status" character varying(16) NOT NULL DEFAULT 'draft',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "committedAt" TIMESTAMP NULL,
                CONSTRAINT "PK_sale_returns" PRIMARY KEY ("id"),
                CONSTRAINT "FK_sale_returns_original_sale"
                    FOREIGN KEY ("original_sale_id") REFERENCES "sales"("id")
                    ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_sale_returns_customer"
                    FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
                    ON DELETE SET NULL ON UPDATE NO ACTION,
                CONSTRAINT "FK_sale_returns_cash_register"
                    FOREIGN KEY ("cash_register_session_id") REFERENCES "cash_registers"("id")
                    ON DELETE SET NULL ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "sale_return_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "return_id" uuid NOT NULL,
                "original_sale_item_id" uuid NOT NULL,
                "quantityReturned" numeric(20,3) NOT NULL,
                "unitRefundAmount" numeric(20,2) NOT NULL,
                "disposition" character varying(16) NOT NULL,
                "taxSnapshot" jsonb NULL,
                "capabilitySnapshot" jsonb NULL,
                CONSTRAINT "PK_sale_return_items" PRIMARY KEY ("id"),
                CONSTRAINT "FK_sale_return_items_return"
                    FOREIGN KEY ("return_id") REFERENCES "sale_returns"("id")
                    ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_sale_return_items_original_sale_item"
                    FOREIGN KEY ("original_sale_item_id") REFERENCES "sale_items"("id")
                    ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_sale_returns_original_sale" ON "sale_returns" ("original_sale_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_sale_return_items_original_sale_item" ON "sale_return_items" ("original_sale_item_id")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_sale_return_items_original_sale_item"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_sale_returns_original_sale"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "sale_return_items"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "sale_returns"`);
    }
}
