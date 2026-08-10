import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PR5: Add `locationId` (nullable) to `purchases` para trazabilidad del
 * destino físico en modo sectorizado.
 *
 *  - En modo simple la columna queda en null (comportamiento actual intacto).
 *  - En modo sectorizado `PurchasesService.create` la completa con la
 *    ubicación resuelta (DTO o `defaultReceiveLocationId`).
 *  - FK a `locations(id)` ON DELETE RESTRICT: preserva el historial; no se
 *    permite borrar una ubicación referenciada por una compra.
 *
 * Idempotente: aplica solo si la columna / FK no existen.
 */
export class AddPurchaseLocationId1773000000000 implements MigrationInterface {
    name = 'AddPurchaseLocationId1773000000000';

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
        if (!await this.columnExists(queryRunner, 'purchases', 'locationId')) {
            await queryRunner.query(`
                ALTER TABLE "purchases"
                ADD COLUMN "locationId" uuid NULL
            `);
            await queryRunner.query(`
                ALTER TABLE "purchases"
                ADD CONSTRAINT "FK_purchases_location"
                FOREIGN KEY ("locationId") REFERENCES "locations"("id")
                ON DELETE RESTRICT ON UPDATE NO ACTION
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (await this.constraintExists(queryRunner, 'FK_purchases_location')) {
            await queryRunner.query(`
                ALTER TABLE "purchases" DROP CONSTRAINT "FK_purchases_location"
            `);
        }
        if (await this.columnExists(queryRunner, 'purchases', 'locationId')) {
            await queryRunner.query(`ALTER TABLE "purchases" DROP COLUMN "locationId"`);
        }
    }
}
