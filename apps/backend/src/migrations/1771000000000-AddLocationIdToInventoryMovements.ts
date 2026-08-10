import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migración: AddLocationIdToInventoryMovements
 *
 * Extiende `stock_movements` con la columna `locationId` (uuid, nullable,
 * FK -> locations(id)) para registrar la ubicación afectada cuando el modo
 * sectorizado está activo. En modo simple queda en null y el comportamiento
 * actual no cambia.
 *
 * Además agrega el valor `TRANSFER` al enum `stock_movements.source` para que
 * los traslados puedan identificarse como origen del movimiento (escenarios S3
 * y S5 de `inventory-movements.md`).
 *
 * Crea un índice compuesto `(productId, locationId, createdAt DESC)` para la
 * consulta típica de historial por producto y ubicación.
 *
 * Es idempotente: cada cambio se aplica solo si la columna / índice / valor
 * de enum no existe todavía. El `down` revierte en orden inverso.
 */
export class AddLocationIdToInventoryMovements1771000000000 implements MigrationInterface {
    name = 'AddLocationIdToInventoryMovements1771000000000'

    private async columnExists(queryRunner: QueryRunner, tableName: string, columnName: string): Promise<boolean> {
        const result = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = '${tableName}'
                AND column_name = '${columnName}'
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

    private async enumValueExists(queryRunner: QueryRunner, enumTypeName: string, value: string): Promise<boolean> {
        const result = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 FROM pg_enum e
                JOIN pg_type t ON t.oid = e.enumtypid
                WHERE t.typname = '${enumTypeName}'
                AND e.enumlabel = '${value}'
            )
        `);
        return result[0]?.exists || false;
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. locationId en stock_movements (nullable para back-compat).
        if (!await this.columnExists(queryRunner, 'stock_movements', 'locationId')) {
            await queryRunner.query(`
                ALTER TABLE "stock_movements"
                ADD COLUMN "locationId" uuid NULL
            `);

            await queryRunner.query(`
                ALTER TABLE "stock_movements"
                ADD CONSTRAINT "FK_stock_movements_location"
                FOREIGN KEY ("locationId") REFERENCES "locations"("id")
                ON DELETE RESTRICT ON UPDATE NO ACTION
            `);
        }

        // 2. Índice compuesto (productId, locationId, createdAt DESC) para la
        // consulta típica de historial por producto/ubicación.
        if (!await this.indexExists(queryRunner, 'IDX_stock_movements_product_location_created')) {
            await queryRunner.query(`
                CREATE INDEX "IDX_stock_movements_product_location_created"
                ON "stock_movements" ("productId", "locationId", "createdAt" DESC)
            `);
        }

        // 3. Valor TRANSFER en el enum de source. TypeORM genera el tipo
        // siguiendo el patrón {table}_{column}_enum.
        // PG 12+ permite ALTER TYPE ... ADD VALUE dentro de transacción;
        // usamos IF NOT EXISTS para que la migración sea idempotente.
        const enumName = 'stock_movements_source_enum';
        if (!await this.enumValueExists(queryRunner, enumName, 'TRANSFER')) {
            await queryRunner.query(`
                ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS 'TRANSFER'
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 3. Quitar el valor TRANSFER del enum.
        // PostgreSQL no permite DROP VALUE de un enum; recreamos el tipo.
        // Sólo se hace si el valor existe; si no, no-op.
        const enumName = 'stock_movements_source_enum';
        if (await this.enumValueExists(queryRunner, enumName, 'TRANSFER')) {
            // Renombrar el enum actual, crear uno nuevo sin TRANSFER,
            // convertir la columna, borrar el viejo. Si en el futuro se agregan
            // más valores, ajustar acá.
            await queryRunner.query(`ALTER TABLE "stock_movements" ALTER COLUMN "source" TYPE varchar`);
            await queryRunner.query(`DROP TYPE IF EXISTS "${enumName}"`);
            await queryRunner.query(`
                CREATE TYPE "${enumName}"
                AS ENUM ('INITIAL_LOAD', 'PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN')
            `);
            await queryRunner.query(`
                ALTER TABLE "stock_movements"
                ALTER COLUMN "source" TYPE "${enumName}"
                USING "source"::text::"${enumName}"
            `);
        }

        // 2. Drop index
        if (await this.indexExists(queryRunner, 'IDX_stock_movements_product_location_created')) {
            await queryRunner.query(`DROP INDEX "IDX_stock_movements_product_location_created"`);
        }

        // 1. Drop FK + column
        await queryRunner.query(`
            ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "FK_stock_movements_location"
        `);
        if (await this.columnExists(queryRunner, 'stock_movements', 'locationId')) {
            await queryRunner.query(`ALTER TABLE "stock_movements" DROP COLUMN "locationId"`);
        }
    }
}