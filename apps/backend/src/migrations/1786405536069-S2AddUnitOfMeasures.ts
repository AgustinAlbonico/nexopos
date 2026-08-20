import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * S2 Stage 2 — unit_of_measures table + canonical seed.
 *
 * Plan reference: `<generated>-AddUnitOfMeasures.ts`. We hand-write this
 * migration (instead of `migration:generate`) so the file is minimal,
 * idempotent, and seeded with the canonical six UOMs (`un`, `kg`, `g`, `l`,
 * `ml`, `m`). The `pack` UOM is intentionally absent — packs are a
 * separate concept in S3.
 *
 * `g` and `ml` carry `conversionToBase` for their category canonical base
 * (`kg`, `l`); the converter in `apps/backend/src/modules/products/uom/converter.ts`
 * multiplies the requested quantity by that factor.
 */
export class S2AddUnitOfMeasures1786405536069 implements MigrationInterface {
    name = 'S2AddUnitOfMeasures1786405536069';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "unit_of_measures" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "code" character varying(16) NOT NULL,
                "name" character varying(64) NOT NULL,
                "symbol" character varying(8) NOT NULL,
                "category" character varying(16) NOT NULL,
                "precision" integer NOT NULL DEFAULT 0,
                "conversionToBase" numeric(20,8) NOT NULL DEFAULT 1,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_unit_of_measures" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_unit_of_measures_code" UNIQUE ("code")
            )
        `);

        await queryRunner.query(`
            INSERT INTO "unit_of_measures" ("code", "name", "symbol", "category", "precision", "conversionToBase")
            VALUES
                ('un', 'Unidad', 'un', 'unit',   0, 1),
                ('kg', 'Kilogramo', 'kg', 'weight',  3, 1),
                ('g',  'Gramo',     'g',  'weight',  3, 0.001),
                ('l',  'Litro',     'l',  'volume',  3, 1),
                ('ml', 'Mililitro', 'ml', 'volume',  3, 0.001),
                ('m',  'Metro',     'm',  'length',  3, 1)
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "unit_of_measures" WHERE "code" IN ('un', 'kg', 'g', 'l', 'ml', 'm')`);
        await queryRunner.query(`DROP TABLE IF EXISTS "unit_of_measures"`);
    }
}