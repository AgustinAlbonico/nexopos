import { CsvImportError } from './errors';

/**
 * Tiny CSV parser tailored to the S2 H2 catalog import dialect.
 *
 * Supported:
 *   - UTF-8 input; optional BOM at the start is stripped.
 *   - Header row = first non-empty row.
 *   - Comma (`,`) is the only separator.
 *   - Line terminators `\r\n` and `\n`.
 *   - Quoted fields with `"…"`; inside quotes a literal `""` represents `"`.
 *   - Embedded newlines **inside** a quoted field are explicitly rejected
 *     (`EmbeddedNewlineInQuotedField`); the parser never splits lines
 *     inside quotes.
 *
 * The parser is intentionally tiny (hand-written state machine). It does
 * not attempt to be a general CSV parser and never grows features beyond
 * what the S2 plan locks in.
 */
export interface ParseResult {
    readonly header: readonly string[];
    /** 1-based line number of each row. */
    readonly rows: ReadonlyArray<{ readonly line: number; readonly cells: readonly string[] }>;
}

const COMMA = 0x2c;
const DOUBLE_QUOTE = 0x22;
const CR = 0x0d;
const LF = 0x0a;
const UTF8_BOM = 0xfeff;

export function parseCatalogCsv(input: string): ParseResult {
    if (input.length === 0) {
        throw new CsvImportError('EmptyDocument', 'CSV input is empty');
    }

    const text = stripBom(input);
    const rows: { line: number; cells: string[] }[] = [];
    let field = '';
    let row: string[] = [];
    let line = 1;
    let rowStartLine = 1;
    let inQuotes = false;
    let sawEmbeddedNewlineInQuotes = false;
    let embeddedNewlineLine: number | undefined;

    for (let index = 0; index < text.length; index++) {
        const char = text.charCodeAt(index);

        if (inQuotes) {
            if (char === DOUBLE_QUOTE) {
                const next = text.charCodeAt(index + 1);
                if (next === DOUBLE_QUOTE) {
                    field += '"';
                    index++;
                } else {
                    inQuotes = false;
                }
            } else if (char === LF || char === CR) {
                sawEmbeddedNewlineInQuotes = true;
                embeddedNewlineLine = line;
                break;
            } else {
                field += text[index];
            }
            continue;
        }

        if (char === COMMA) {
            row.push(field);
            field = '';
            continue;
        }

        if (char === DOUBLE_QUOTE) {
            // Quote only opens a quoted field at the start of a cell.
            if (field.length === 0) {
                inQuotes = true;
            } else {
                field += text[index];
            }
            continue;
        }

        if (char === CR) {
            // CR alone or CRLF; consume the LF if it follows.
            if (text.charCodeAt(index + 1) === LF) {
                index++;
            }
            row.push(field);
            rows.push({ line: rowStartLine, cells: row });
            field = '';
            row = [];
            line++;
            rowStartLine = line;
            continue;
        }

        if (char === LF) {
            row.push(field);
            rows.push({ line: rowStartLine, cells: row });
            field = '';
            row = [];
            line++;
            rowStartLine = line;
            continue;
        }

        field += text[index];
    }

    if (sawEmbeddedNewlineInQuotes) {
        throw new CsvImportError(
            'EmbeddedNewlineInQuotedField',
            `Embedded newline inside a quoted field is not allowed (line ${embeddedNewlineLine ?? line}).`,
            embeddedNewlineLine,
        );
    }

    if (inQuotes) {
        throw new CsvImportError(
            'UnterminatedQuotedField',
            'Quoted field was not closed before end of input',
            rowStartLine,
        );
    }

    // Flush trailing cell/row if input did not end with a terminator.
    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push({ line: rowStartLine, cells: row });
    }

    const nonEmpty = rows.filter((r) => r.cells.some((c) => c.length > 0));
    if (nonEmpty.length === 0) {
        throw new CsvImportError('MissingHeader', 'CSV input has no rows');
    }

    const headerRow = nonEmpty[0];
    const dataRows = nonEmpty.slice(1);

    const header = headerRow.cells.map((cell) => cell.trim());
    const seen = new Set<string>();
    header.forEach((name, idx) => {
        if (seen.has(name)) {
            throw new CsvImportError(
                'DuplicateColumnInHeader',
                `Duplicate column "${name}" at position ${idx + 1}`,
                headerRow.line,
                idx + 1,
            );
        }
        seen.add(name);
    });

    dataRows.forEach((dataRow) => {
        if (dataRow.cells.length !== header.length) {
            throw new CsvImportError(
                'FieldCountMismatch',
                `Row at line ${dataRow.line} has ${dataRow.cells.length} fields, expected ${header.length}`,
                dataRow.line,
            );
        }
    });

    return { header, rows: dataRows };
}

function stripBom(input: string): string {
    return input.charCodeAt(0) === UTF8_BOM ? input.slice(1) : input;
}