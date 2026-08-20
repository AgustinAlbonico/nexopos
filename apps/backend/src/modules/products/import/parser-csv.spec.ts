import { parseCatalogCsv } from './parser-csv';

describe('parseCatalogCsv', () => {
    it('Given an empty input When parsing Then throws EmptyDocument', () => {
        expect(() => parseCatalogCsv('')).toThrow(/empty/i);
    });

    it('Given UTF-8 BOM + header + row When parsing Then strips the BOM and returns header/rows', () => {
        const csv = '\uFEFFname,sku,cost\nCoca,CC-1,1.5\nPepsi,PP-1,1.2';
        const result = parseCatalogCsv(csv);
        expect(result.header).toEqual(['name', 'sku', 'cost']);
        expect(result.rows).toEqual([
            { line: 2, cells: ['Coca', 'CC-1', '1.5'] },
            { line: 3, cells: ['Pepsi', 'PP-1', '1.2'] },
        ]);
    });

    it('Given CRLF terminators and quoted commas When parsing Then preserves cells and rows', () => {
        const csv = 'name,sku,cost\r\n"Acme, Inc.","AC-1,SKU",2.50\r\n"Other","O-1",1.25';
        const result = parseCatalogCsv(csv);
        expect(result.header).toEqual(['name', 'sku', 'cost']);
        expect(result.rows).toEqual([
            { line: 2, cells: ['Acme, Inc.', 'AC-1,SKU', '2.50'] },
            { line: 3, cells: ['Other', 'O-1', '1.25'] },
        ]);
    });

    it('Given escaped double-quotes inside quoted field When parsing Then unescapes them', () => {
        const csv = 'name,note\n"He said ""hi""","ok"';
        const result = parseCatalogCsv(csv);
        expect(result.rows[0].cells).toEqual(['He said "hi"', 'ok']);
    });

    it('Given embedded LF inside quoted field When parsing Then rejects with EmbeddedNewlineInQuotedField', () => {
        const csv = 'name,note\n"line1\nline2","ok"';
        expect(() => parseCatalogCsv(csv)).toThrow(/embedded newline/i);
    });

    it('Given embedded CRLF inside quoted field When parsing Then rejects with EmbeddedNewlineInQuotedField', () => {
        const csv = 'name,note\n"line1\r\nline2","ok"';
        expect(() => parseCatalogCsv(csv)).toThrow(/embedded newline/i);
    });

    it('Given an unterminated quoted field When parsing Then rejects with UnterminatedQuotedField', () => {
        const csv = 'name,note\n"never closed';
        expect(() => parseCatalogCsv(csv)).toThrow(/not closed/i);
    });

    it('Given a row with mismatched field count When parsing Then rejects with FieldCountMismatch', () => {
        const csv = 'a,b,c\n1,2';
        expect(() => parseCatalogCsv(csv)).toThrow(/fields/i);
    });

    it('Given duplicate column names in the header When parsing Then rejects with DuplicateColumnInHeader', () => {
        const csv = 'name,name,cost\nCoca,CC-1,1';
        expect(() => parseCatalogCsv(csv)).toThrow(/duplicate column/i);
    });

    it('Given header-only CSV When parsing Then returns zero rows and reports the header', () => {
        const result = parseCatalogCsv('name,sku\n');
        expect(result.header).toEqual(['name', 'sku']);
        expect(result.rows).toEqual([]);
    });
});