import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S2 Stage 2 — stocktake foundations (T9).
 *
 * Plan reference: `<generated>-AddStocktakeFoundations.ts`. Hand-written
 * to keep the migration minimal and idempotent. The `audit_log.action`
 * column is `varchar(20)`, so the STOCKTAKE_* enum values land on the
 * TypeScript side without an `ALTER TYPE` (see `AuditAction`).
 */

export class S2AddStocktakeFoundations1786405840942 implements MigrationInterface {
    name = 'S2AddStocktakeFoundations1786405840942';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "stocktake_sessions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(200) NOT NULL,
                "status" character varying(16) NOT NULL DEFAULT 'open',
                "startedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "startedById" uuid NOT NULL,
                "approvedAt" TIMESTAMP NULL,
                "approvedById" uuid NULL,
                CONSTRAINT "PK_stocktake_sessions" PRIMARY KEY ("id"),
                CONSTRAINT "FK_stocktake_sessions_started_by"
                    FOREIGN KEY ("startedById") REFERENCES "users"("id")
                    ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_stocktake_sessions_approved_by"
                    FOREIGN KEY ("approvedById") REFERENCES "users"("id")
                    ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "stocktake_lines" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "sessionId" uuid NOT NULL,
                "productId" uuid NOT NULL,
                "expectedQuantity" numeric(20,3) NOT NULL DEFAULT 0,
                "countedQuantity" numeric(20,3) NOT NULL DEFAULT 0,
                "countedAt" TIMESTAMP NULL,
                "countedById" uuid NULL,
                "reasonCode" character varying(32) NULL,
                CONSTRAINT "PK_stocktake_lines" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_stocktake_lines_session_product"
                    UNIQUE ("sessionId", "productId"),
                CONSTRAINT "FK_stocktake_lines_session"
                    FOREIGN KEY ("sessionId") REFERENCES "stocktake_sessions"("id")
                    ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_stocktake_lines_product"
                    FOREIGN KEY ("productId") REFERENCES "products"("id")
                    ON DELETE RESTRICT ON UPDATE NO ACTION,
                CONSTRAINT "FK_stocktake_lines_counted_by"
                    FOREIGN KEY ("countedById") REFERENCES "users"("id")
                    ON DELETE RESTRICT ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_stocktake_lines_product" ON "stocktake_lines" ("productId")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_stocktake_sessions_status" ON "stocktake_sessions" ("status")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_stocktake_sessions_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_stocktake_lines_product"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "stocktake_lines"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "stocktake_sessions"`);
    }
}