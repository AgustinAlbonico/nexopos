import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migración: Agregar configuración del lector de códigos de barras
 *
 * Cambios:
 * - Agrega columna "barcodeScannerEnabled" (boolean, default false) a system_configuration
 * - Agrega columna "barcodeScannerTimeoutMs" (int, default 100) a system_configuration
 */
export class AddBarcodeScannerConfig1768413297000 implements MigrationInterface {
    name = 'AddBarcodeScannerConfig1768413297000'

    /**
     * Verifica si una columna existe en una tabla
     */
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
        // 1. Agregar columna barcodeScannerEnabled (boolean, default false)
        if (!await this.columnExists(queryRunner, 'system_configuration', 'barcodeScannerEnabled')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD COLUMN "barcodeScannerEnabled" boolean NOT NULL DEFAULT false
            `);
        }

        // 2. Agregar columna barcodeScannerTimeoutMs (int, default 100)
        if (!await this.columnExists(queryRunner, 'system_configuration', 'barcodeScannerTimeoutMs')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD COLUMN "barcodeScannerTimeoutMs" integer NOT NULL DEFAULT 100
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revertir cambios en orden inverso
        // Usar IF EXISTS para que sea idempotente

        // 1. Eliminar columna barcodeScannerTimeoutMs
        await queryRunner.query(`
            ALTER TABLE "system_configuration"
            DROP COLUMN IF EXISTS "barcodeScannerTimeoutMs"
        `);

        // 2. Eliminar columna barcodeScannerEnabled
        await queryRunner.query(`
            ALTER TABLE "system_configuration"
            DROP COLUMN IF EXISTS "barcodeScannerEnabled"
        `);
    }
}
