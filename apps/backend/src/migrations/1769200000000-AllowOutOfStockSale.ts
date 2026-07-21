import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migración: Agregar configuración allowOutOfStockSale
 *
 * Agrega columna "allowOutOfStockSale" (boolean, default false) a system_configuration.
 * Cuando es true, permite vender productos con stock ≤ 0 (el stock queda negativo).
 */
export class AllowOutOfStockSale1769200000000 implements MigrationInterface {
    name = 'AllowOutOfStockSale1769200000000'

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

    public async up(queryRunner: QueryRunner): Promise<void> {
        if (!await this.columnExists(queryRunner, 'system_configuration', 'allowOutOfStockSale')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD COLUMN "allowOutOfStockSale" boolean NOT NULL DEFAULT false
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "system_configuration"
            DROP COLUMN IF EXISTS "allowOutOfStockSale"
        `);
    }
}
