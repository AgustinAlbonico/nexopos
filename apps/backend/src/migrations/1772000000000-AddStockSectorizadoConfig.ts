import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración: AddStockSectorizadoConfig
 *
 * Agrega a `system_configuration` los campos que el modo sectorizado necesita:
 *  - `stockSectorizado` (boolean default false) — interruptor global del modo.
 *  - `primarySaleLocationId` (uuid FK a locations, nullable) — ubicación que
 *    abastece ventas; seteada por el ActivationService al activar el modo.
 *  - `defaultReceiveLocationId` (uuid FK a locations, nullable) — destino
 *    predeterminado de compras; seteada por el ActivationService.
 *  - `stockMinimoVenta` (int default 5) — mínimo de reposición del salón;
 *    distinto del `minStockAlert` global (umbral de compra).
 *
 * Idempotente: cada cambio se aplica solo si la columna no existe. `down`
 * revierte en orden inverso y respeta las FKs que dependen de las columnas.
 */
export class AddStockSectorizadoConfig1772000000000 implements MigrationInterface {
    name = 'AddStockSectorizadoConfig1772000000000';

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

    private async constraintExists(queryRunner: QueryRunner, constraintName: string): Promise<boolean> {
        const result = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_schema = 'public'
                AND constraint_name = '${constraintName}'
            )
        `);
        return result[0]?.exists || false;
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. stockSectorizado
        if (!await this.columnExists(queryRunner, 'system_configuration', 'stockSectorizado')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD COLUMN "stockSectorizado" boolean NOT NULL DEFAULT false
            `);
        }

        // 2. primarySaleLocationId (FK nullable a locations)
        if (!await this.columnExists(queryRunner, 'system_configuration', 'primarySaleLocationId')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD COLUMN "primarySaleLocationId" uuid NULL
            `);
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD CONSTRAINT "FK_system_configuration_primary_sale_location"
                FOREIGN KEY ("primarySaleLocationId") REFERENCES "locations"("id")
                ON DELETE RESTRICT ON UPDATE NO ACTION
            `);
        }

        // 3. defaultReceiveLocationId (FK nullable a locations)
        if (!await this.columnExists(queryRunner, 'system_configuration', 'defaultReceiveLocationId')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD COLUMN "defaultReceiveLocationId" uuid NULL
            `);
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD CONSTRAINT "FK_system_configuration_default_receive_location"
                FOREIGN KEY ("defaultReceiveLocationId") REFERENCES "locations"("id")
                ON DELETE RESTRICT ON UPDATE NO ACTION
            `);
        }

        // 4. stockMinimoVenta
        if (!await this.columnExists(queryRunner, 'system_configuration', 'stockMinimoVenta')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD COLUMN "stockMinimoVenta" integer NOT NULL DEFAULT 5
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop en orden inverso: primero dropeamos FKs para no romper la
        // restricción al eliminar columnas.

        if (await this.constraintExists(queryRunner, 'FK_system_configuration_default_receive_location')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                DROP CONSTRAINT "FK_system_configuration_default_receive_location"
            `);
        }

        if (await this.constraintExists(queryRunner, 'FK_system_configuration_primary_sale_location')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                DROP CONSTRAINT "FK_system_configuration_primary_sale_location"
            `);
        }

        if (await this.columnExists(queryRunner, 'system_configuration', 'stockMinimoVenta')) {
            await queryRunner.query(`ALTER TABLE "system_configuration" DROP COLUMN "stockMinimoVenta"`);
        }

        if (await this.columnExists(queryRunner, 'system_configuration', 'defaultReceiveLocationId')) {
            await queryRunner.query(`ALTER TABLE "system_configuration" DROP COLUMN "defaultReceiveLocationId"`);
        }

        if (await this.columnExists(queryRunner, 'system_configuration', 'primarySaleLocationId')) {
            await queryRunner.query(`ALTER TABLE "system_configuration" DROP COLUMN "primarySaleLocationId"`);
        }

        if (await this.columnExists(queryRunner, 'system_configuration', 'stockSectorizado')) {
            await queryRunner.query(`ALTER TABLE "system_configuration" DROP COLUMN "stockSectorizado"`);
        }
    }
}
