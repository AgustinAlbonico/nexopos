import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTicketLogoUrlField1786405840954 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'system_configuration',
            new TableColumn({
                name: 'ticketLogoUrl',
                type: 'text',
                isNullable: true,
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('system_configuration', 'ticketLogoUrl');
    }
}
