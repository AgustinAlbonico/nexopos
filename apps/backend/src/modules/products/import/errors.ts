/**
 * Typed errors for the CSV import pipeline.
 *
 * Plan reference: `apps/backend/src/modules/products/import/errors.ts`.
 * `EmbeddedNewlineInQuotedField` is the explicit rejection from S2 H2
 * (T8): quoted fields must not contain `\n` or `\r\n`. The import service
 * catches these and surfaces them on `RowError[]` / the file-level error.
 */

export type CsvErrorCode =
    | 'EmptyDocument'
    | 'MissingHeader'
    | 'EmbeddedNewlineInQuotedField'
    | 'UnterminatedQuotedField'
    | 'FieldCountMismatch'
    | 'DuplicateColumnInHeader'
    | 'MissingRequiredField'
    | 'InvalidCost'
    | 'InvalidStock'
    | 'InvalidNumber';

export interface CsvError {
    readonly code: CsvErrorCode;
    readonly message: string;
    /** 1-based line number for row-level errors; undefined for file-level errors. */
    readonly line?: number;
    /** 1-based column index for row-level field errors. */
    readonly column?: number;
}

export class CsvImportError extends Error {
    readonly code: CsvErrorCode;
    readonly line?: number;
    readonly column?: number;

    constructor(code: CsvErrorCode, message: string, line?: number, column?: number) {
        super(message);
        this.name = 'CsvImportError';
        this.code = code;
        this.line = line;
        this.column = column;
    }
}