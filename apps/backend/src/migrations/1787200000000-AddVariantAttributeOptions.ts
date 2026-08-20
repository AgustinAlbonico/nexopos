import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migración: AddVariantAttributeOptions
 *
 * Crea la tabla maestra "variant_attribute_options" para soportar la matriz
 * de variantes de producto (colores × talles).
 *
 *  - id          uuid PK
 *  - type        varchar(16) CHECK type IN ('color','size')
 *  - name        varchar(100) NOT NULL
 *  - colorHex    varchar(7)  NULL (solo aplica a type='color')
 *  - createdAt / updatedAt timestamptz
 *  - UNIQUE (type, name)
 *
 * Siembra idempotente (re-correr la migración no duplica filas):
 *  - 7 colores base con su color_hex
 *  - 14 talles (S, M, L, XL, XXL, 36..44) con color_hex = NULL
 *
 * Nota: la tabla "product_variant_attributes" (matriz producto × atributo)
 * se crea en una migración posterior — esta migración solo crea el maestro.
 */
export class AddVariantAttributeOptions1787200000000 implements MigrationInterface {
    name = 'AddVariantAttributeOptions1787200000000';

    private async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
        const result = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = '${tableName}'
            )
        `);
        return result[0]?.exists || false;
    }

    private async indexExists(queryRunner: QueryRunner, indexName: string): Promise<boolean> {
        const result = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE schemaname = 'public'
                AND indexname = '${indexName}'
            )
        `);
        return result[0]?.exists || false;
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Crear tabla variant_attribute_options (idempotente).
        if (!await this.tableExists(queryRunner, 'variant_attribute_options')) {
            await queryRunner.query(`
                CREATE TABLE "variant_attribute_options" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "type" character varying(16) NOT NULL,
                    "name" character varying(100) NOT NULL,
                    "colorHex" character varying(7),
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_variant_attribute_options" PRIMARY KEY ("id"),
                    CONSTRAINT "CHK_variant_attribute_options_type"
                        CHECK ("type" IN ('color', 'size'))
                )
            `);
        }

        // 2. Índice único (type, name) — protege idempotencia del seed.
        if (!await this.indexExists(queryRunner, 'UQ_variant_attribute_options_type_name')) {
            await queryRunner.query(`
                CREATE UNIQUE INDEX "UQ_variant_attribute_options_type_name"
                ON "variant_attribute_options" ("type", "name")
            `);
        }

        // 3. Seed idempotente: colores base.
        const colors: Array<[string, string]> = [
            ['Negro',  '#18181b'],
            ['Blanco', '#ffffff'],
            ['Azul',   '#2563eb'],
            ['Rojo',   '#dc2626'],
            ['Gris',   '#6b7280'],
            ['Verde',  '#16a34a'],
            ['Beige',  '#f5f5dc'],
        ];

        for (const [name, colorHex] of colors) {
            await queryRunner.query(
                `INSERT INTO "variant_attribute_options" ("type", "name", "colorHex")
                 VALUES ('color', $1, $2)
                 ON CONFLICT ("type", "name") DO NOTHING`,
                [name, colorHex],
            );
        }

        // 4. Seed idempotente: talles.
        const sizes = ['S', 'M', 'L', 'XL', 'XXL', '36', '37', '38', '39', '40', '41', '42', '43', '44'];
        for (const name of sizes) {
            await queryRunner.query(
                `INSERT INTO "variant_attribute_options" ("type", "name", "colorHex")
                 VALUES ('size', $1, NULL)
                 ON CONFLICT ("type", "name") DO NOTHING`,
                [name],
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Orden inverso: índice → tabla.
        if (await this.indexExists(queryRunner, 'UQ_variant_attribute_options_type_name')) {
            await queryRunner.query(`DROP INDEX "UQ_variant_attribute_options_type_name"`);
        }

        if (await this.tableExists(queryRunner, 'variant_attribute_options')) {
            await queryRunner.query(`DROP TABLE "variant_attribute_options"`);
        }
    }
}
