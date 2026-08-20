/**
 * Enum de tipos de entidades auditables
 * Representa las entidades del sistema que pueden ser auditadas
 */
export enum AuditEntityType {
    SALE = 'sale',
    EXPENSE = 'expense',
    INCOME = 'income',
    PURCHASE = 'purchase',
    CASH_REGISTER = 'cash_register',
    CASH_MOVEMENT = 'cash_movement',
    STOCKTAKE_SESSION = 'stocktake_session',
    CREDIT_NOTE = 'credit_note',
}

/**
 * Enum de acciones de auditoría
 * Representa las operaciones que se pueden realizar sobre las entidades
 *
 * Plan reference (S2 H3 / T9): adds `STOCKTAKE_START`, `STOCKTAKE_COUNT`,
 * `STOCKTAKE_APPROVE`, `STOCKTAKE_CANCEL`. `audit_log.action` is a `varchar`
 * column (not a Postgres enum), so the migration is purely additive on the
 * TypeScript side; no SQL migration is required.
 */
export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    CANCEL = 'CANCEL',
    PAY = 'PAY',
    OPEN = 'OPEN',
    CLOSE = 'CLOSE',
    STOCKTAKE_START = 'STOCKTAKE_START',
    STOCKTAKE_COUNT = 'STOCKTAKE_COUNT',
    STOCKTAKE_APPROVE = 'STOCKTAKE_APPROVE',
    STOCKTAKE_CANCEL = 'STOCKTAKE_CANCEL',
    ATTEMPT = 'ATTEMPT',
}
