import { MigrationInterface, QueryRunner } from 'typeorm';

export class S3AddCreditNotes1786405840944 implements MigrationInterface {
    name = 'S3AddCreditNotes1786405840944';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "credit_notes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "sale_return_id" uuid NOT NULL,
                "original_invoice_id" uuid NOT NULL,
                "afip_document_type_code" int NOT NULL,
                "afip_associated_document_type_code" int NULL,
                "afip_associated_invoice_number" bigint NULL,
                "afip_associated_point_of_sale" int NULL,
                "receiver_cuit" character varying(13) NOT NULL,
                "cae" character varying(20) NULL,
                "cae_expiration_date" date NULL,
                "invoice_number" bigint NULL,
                "point_of_sale" int NULL,
                "status" character varying(16) NOT NULL,
                "attempt_id" uuid NULL,
                "error_message" text NULL,
                "payload_snapshot" jsonb NOT NULL,
                CONSTRAINT "PK_credit_notes" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_credit_notes_sale_return" UNIQUE ("sale_return_id"),
                CONSTRAINT "FK_credit_notes_sale_return"
                    FOREIGN KEY ("sale_return_id") REFERENCES "sale_returns"("id")
                    ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_credit_notes_original_invoice"
                    FOREIGN KEY ("original_invoice_id") REFERENCES "invoices"("id")
                    ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_credit_notes_original_invoice" ON "credit_notes" ("original_invoice_id")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_credit_notes_original_invoice"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "credit_notes"`);
    }
}
