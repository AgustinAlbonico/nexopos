import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migración: Agregar índices compuestos a audit_logs
 *
 * Índices agregados:
 * - idx_audit_entity_type_timestamp (entityType, timestamp) - para reportes por tipo + fecha
 * - idx_audit_user_id_timestamp (userId, timestamp) - para actividad de usuario por fecha
 *
 * IMPORTANTE: Usar CONCURRENTLY para no bloquear la tabla en producción
 */
export class AddAuditLogCompositeIndexes1769113297000 implements MigrationInterface {
    name = 'AddAuditLogCompositeIndexes1769113297000'
    transaction = false

    /**
     * Verifica si un índice existe
     */
    private async indexExists(queryRunner: QueryRunner, indexName: string): Promise<boolean> {
        const result = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE tablename = 'audit_logs'
                AND indexname = '${indexName}'
            )
        `);
        return result[0]?.exists || false;
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Índice compuesto para entityType + timestamp
        if (!await this.indexExists(queryRunner, 'idx_audit_entity_type_timestamp')) {
            await queryRunner.query(`
                CREATE INDEX CONCURRENTLY "idx_audit_entity_type_timestamp"
                ON "audit_logs" ("entity_type", "timestamp")
            `);
        }

        // 2. Índice compuesto para userId + timestamp
        if (!await this.indexExists(queryRunner, 'idx_audit_user_id_timestamp')) {
            await queryRunner.query(`
                CREATE INDEX CONCURRENTLY "idx_audit_user_id_timestamp"
                ON "audit_logs" ("user_id", "timestamp")
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar índices en orden inverso
        if (await this.indexExists(queryRunner, 'idx_audit_user_id_timestamp')) {
            await queryRunner.query(`
                DROP INDEX CONCURRENTLY "idx_audit_user_id_timestamp"
            `);
        }

        if (await this.indexExists(queryRunner, 'idx_audit_entity_type_timestamp')) {
            await queryRunner.query(`
                DROP INDEX CONCURRENTLY "idx_audit_entity_type_timestamp"
            `);
        }
    }
}
