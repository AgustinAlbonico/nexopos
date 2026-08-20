import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración: Agregar configuración de tickets e impresoras térmicas
 */
export class AddTicketConfigurationFields1786405840953 implements MigrationInterface {
    name = 'AddTicketConfigurationFields1786405840953';

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
        if (!await this.columnExists(queryRunner, 'system_configuration', 'ticketAutoPrintEnabled')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD COLUMN "ticketAutoPrintEnabled" boolean NOT NULL DEFAULT true
            `);
        }

        if (!await this.columnExists(queryRunner, 'system_configuration', 'ticketPrinterName')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD COLUMN "ticketPrinterName" varchar(255) NULL
            `);
        }

        if (!await this.columnExists(queryRunner, 'system_configuration', 'ticketPaperWidth')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD COLUMN "ticketPaperWidth" varchar(20) NOT NULL DEFAULT '80mm'
            `);
        }

        if (!await this.columnExists(queryRunner, 'system_configuration', 'ticketHeaderTitle')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD COLUMN "ticketHeaderTitle" varchar(255) NULL
            `);
        }

        if (!await this.columnExists(queryRunner, 'system_configuration', 'ticketHeaderAddress')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD COLUMN "ticketHeaderAddress" varchar(255) NULL
            `);
        }

        if (!await this.columnExists(queryRunner, 'system_configuration', 'ticketHeaderPhone')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD COLUMN "ticketHeaderPhone" varchar(255) NULL
            `);
        }

        if (!await this.columnExists(queryRunner, 'system_configuration', 'ticketFooterText')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD COLUMN "ticketFooterText" text NULL
            `);
        }

        if (!await this.columnExists(queryRunner, 'system_configuration', 'ticketShowCustomerData')) {
            await queryRunner.query(`
                ALTER TABLE "system_configuration"
                ADD COLUMN "ticketShowCustomerData" boolean NOT NULL DEFAULT true
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "system_configuration"
            DROP COLUMN IF EXISTS "ticketShowCustomerData",
            DROP COLUMN IF EXISTS "ticketFooterText",
            DROP COLUMN IF EXISTS "ticketHeaderPhone",
            DROP COLUMN IF EXISTS "ticketHeaderAddress",
            DROP COLUMN IF EXISTS "ticketHeaderTitle",
            DROP COLUMN IF EXISTS "ticketPaperWidth",
            DROP COLUMN IF EXISTS "ticketPrinterName",
            DROP COLUMN IF EXISTS "ticketAutoPrintEnabled"
        `);
    }
}
