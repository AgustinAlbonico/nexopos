import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migración: Modo "Precio Fijo" en productos
 *
 * Agrega la columna "useManualPrice" (boolean, default false) a products.
 * Cuando es true, el producto tiene el precio de venta cargado directamente
 * (sin cálculo desde costo + % ganancia), y el costo pasa a ser opcional.
 *
 * También hace que la columna "cost" sea nullable (DROP NOT NULL), para
 * permitir productos en modo precio fijo sin costo conocido.
 *
 * Productos existentes quedan en useManualPrice=false (modo automático)
 * para no alterar el comportamiento actual en producción.
 */
export class AddManualPriceMode1770496000000 implements MigrationInterface {
    name = 'AddManualPriceMode1770496000000'

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

    private async isNullable(queryRunner: QueryRunner, tableName: string, columnName: string): Promise<boolean> {
        const result = await queryRunner.query(`
            SELECT is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = '${tableName}'
            AND column_name = '${columnName}'
        `);
        return result[0]?.is_nullable === 'YES';
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Agregar columna useManualPrice (default false: productos existentes siguen en modo automático)
        if (!await this.columnExists(queryRunner, 'products', 'useManualPrice')) {
            await queryRunner.query(`
                ALTER TABLE "products"
                ADD COLUMN "useManualPrice" boolean NOT NULL DEFAULT false
            `);
        }

        // 2. Hacer cost nullable para permitir productos en modo precio fijo sin costo
        if (await this.columnExists(queryRunner, 'products', 'cost')) {
            if (!await this.isNullable(queryRunner, 'products', 'cost')) {
                await queryRunner.query(`
                    ALTER TABLE "products" ALTER COLUMN "cost" DROP NOT NULL
                `);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1. Restaurar cost NOT NULL (solo si hay datos; en down se asume DB consistente)
        if (await this.columnExists(queryRunner, 'products', 'cost')) {
            // Llenar cost null con 0 antes de restaurar NOT NULL
            await queryRunner.query(`
                UPDATE "products" SET "cost" = 0 WHERE "cost" IS NULL
            `);
            await queryRunner.query(`
                ALTER TABLE "products" ALTER COLUMN "cost" SET NOT NULL
            `);
        }

        // 2. Eliminar columna useManualPrice
        await queryRunner.query(`
            ALTER TABLE "products" DROP COLUMN IF EXISTS "useManualPrice"
        `);
    }
}
