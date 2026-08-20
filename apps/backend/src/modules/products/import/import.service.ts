import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { Product } from '../entities/product.entity';
import { CsvImportError } from './errors';
import { parseCatalogCsv } from './parser-csv';
import { ImportPreviewCache } from './preview-cache';
import {
    ImportDuplicateRef,
    ImportDuplicateStrategy,
    ImportPreviewResponse,
    ImportPreviewRow,
    ImportRowError,
} from './import-preview.dto';

/**
 * Catalog CSV importer (T8).
 *
 * Plan reference:
 *   - `apps/backend/src/modules/products/import/import.service.ts`
 *   - Dialect + state machine implemented in `parser-csv.ts`.
 *
 * Two-phase API:
 *   - `preview(csv)` parses, normalizes, resolves duplicates against the
 *     current DB and stores the snapshot in the in-memory cache.
 *   - `commit(previewId, strategy)` resolves the snapshot, applies the
 *     chosen duplicate strategy and writes everything inside a single
 *     `dataSource.transaction()`.
 */

const KNOWN_COLUMNS = new Set([
    'name',
    'description',
    'cost',
    'stock',
    'categoryId',
    'brandName',
    'barcode',
    'sku',
    'isActive',
    'useCustomMargin',
    'customProfitMargin',
]);

interface NormalizedRow {
    readonly line: number;
    readonly payload: Record<string, unknown>;
    readonly key: string;
}

@Injectable()
export class ImportService {
    private readonly logger = new Logger(ImportService.name);

    constructor(
        private readonly cache: ImportPreviewCache,
        private readonly dataSource: DataSource,
    ) {}

    /**
     * Parse the CSV, normalize each row against the canonical column set,
     * resolve duplicates against existing products, and store a preview
     * snapshot under a fresh `previewId`. No DB writes happen here.
     */
    async preview(csv: string): Promise<ImportPreviewResponse> {
        let parsed;
        try {
            parsed = parseCatalogCsv(csv);
        } catch (error) {
            if (error instanceof CsvImportError) {
                throw new BadRequestException({
                    code: error.code,
                    message: error.message,
                    line: error.line,
                    column: error.column,
                });
            }
            throw error;
        }

        const headerErrors = this.validateHeader(parsed.header);
        if (headerErrors.length > 0) {
            throw new BadRequestException({ code: 'InvalidHeader', errors: headerErrors });
        }

        const normalized: NormalizedRow[] = [];
        const errors: ImportRowError[] = [];
        parsed.rows.forEach((row) => {
            try {
                normalized.push(this.normalizeRow(parsed.header, row.cells, row.line));
            } catch (error) {
                errors.push({
                    code: this.toCode(error),
                    message: error instanceof Error ? error.message : String(error),
                    line: row.line,
                });
            }
        });

        const duplicates = await this.resolveDuplicates(normalized);
        const previewRows = normalized.map<ImportPreviewRow>((row) => ({
            line: String(row.line),
            key: row.key,
            cells: this.cellsFor(normalized, row),
            payload: row.payload,
        }));

        const snapshot = this.cache.put(previewRows, duplicates, errors);
        return {
            previewId: snapshot.previewId,
            rows: snapshot.rows as ImportPreviewRow[],
            duplicates: snapshot.duplicates as ImportDuplicateRef[],
            errors: snapshot.errors as ImportRowError[],
        };
    }

    /**
     * Apply a previously generated preview. The whole commit runs inside a
     * single transaction; any thrown error rolls back every write.
     */
    async commit(previewId: string, strategy: ImportDuplicateStrategy): Promise<{ created: number; updated: number; duplicated: number; skipped: number }> {
        const snapshot = this.cache.get(previewId);
        if (!snapshot) {
            throw new BadRequestException({
                code: 'PreviewNotFound',
                message: `previewId ${previewId} was not found or has already been committed`,
            });
        }

        const duplicateMap = new Map(snapshot.duplicates.map((d) => [d.key, d]));
        let created = 0;
        let updated = 0;
        let duplicated = 0;
        let skipped = 0;

        try {
            await this.dataSource.transaction(async (manager) => {
                for (const row of snapshot.rows) {
                    const duplicate = duplicateMap.get(row.key);
                    if (duplicate && strategy === 'skip') {
                        skipped += 1;
                        continue;
                    }
                    if (duplicate && strategy === 'overwrite' && duplicate.existingProductId) {
                        await manager.update(
                            Product,
                            duplicate.existingProductId,
                            row.payload as object,
                        );
                        updated += 1;
                        continue;
                    }
                    if (duplicate && strategy === 'duplicate') {
                        const { id: _omitId, barcode: _bc, ...payload } = (row.payload ?? {}) as Record<string, unknown>;
                        void _omitId;
                        void _bc;
                        await manager.save(Product, manager.create(Product, payload));
                        duplicated += 1;
                        continue;
                    }
                    const entity = manager.create(Product, row.payload as object);
                    await manager.save(Product, entity);
                    created += 1;
                }
            });
        } catch (error) {
            this.logger.error(`Commit failed for previewId=${previewId}: ${(error as Error).message}`);
            throw error;
        } finally {
            this.cache.drop(previewId);
        }

        return { created, updated, duplicated, skipped };
    }

    private validateHeader(header: readonly string[]): ImportRowError[] {
        const errors: ImportRowError[] = [];
        if (!header.includes('name')) {
            errors.push({ code: 'MissingRequiredColumn', message: 'Column "name" is required' });
        }
        if (!header.includes('cost')) {
            errors.push({ code: 'MissingRequiredColumn', message: 'Column "cost" is required' });
        }
        return errors;
    }

    private normalizeRow(header: readonly string[], cells: readonly string[], line: number): NormalizedRow {
        if (cells.length !== header.length) {
            throw new CsvImportError(
                'FieldCountMismatch',
                `Row at line ${line} has ${cells.length} fields, expected ${header.length}`,
                line,
            );
        }
        const payload: Record<string, unknown> = {};
        for (let i = 0; i < header.length; i++) {
            const column = header[i].trim();
            const value = cells[i].trim();
            if (!column) continue;
            if (!KNOWN_COLUMNS.has(column)) continue;
            if (value.length === 0) continue;
            payload[column] = this.coerce(column, value, line);
        }
        if (typeof payload.name !== 'string' || payload.name.length === 0) {
            throw new CsvImportError('MissingRequiredField', `Row ${line}: "name" is required`, line);
        }
        const cost = Number(payload.cost);
        if (!Number.isFinite(cost) || cost < 0) {
            throw new CsvImportError('InvalidCost', `Row ${line}: "cost" must be a non-negative number`, line);
        }
        payload.cost = cost;

        if (payload.stock !== undefined) {
            const stock = Number(payload.stock);
            if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
                throw new CsvImportError(
                    'InvalidStock',
                    `Row ${line}: "stock" must be a non-negative integer`,
                    line,
                );
            }
            payload.stock = stock;
        }

        const key = this.stableKey(payload, line);
        return { line, payload, key };
    }

    private coerce(column: string, value: string, line: number): unknown {
        switch (column) {
            case 'cost':
            case 'customProfitMargin': {
                const numeric = Number(value);
                if (!Number.isFinite(numeric)) {
                    throw new CsvImportError('InvalidNumber', `Row ${line}: "${column}" must be numeric`, line);
                }
                return numeric;
            }
            case 'isActive':
            case 'useCustomMargin':
                return /^(true|1|yes|si|sí)$/i.test(value);
            case 'stock': {
                const numeric = Number(value);
                if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
                    throw new CsvImportError('InvalidNumber', `Row ${line}: "stock" must be an integer`, line);
                }
                return numeric;
            }
            default:
                return value;
        }
    }

    private stableKey(payload: Record<string, unknown>, line: number): string {
        const barcode = typeof payload.barcode === 'string' ? payload.barcode : '';
        if (barcode.length > 0) return `barcode:${barcode}`;
        const sku = typeof payload.sku === 'string' ? payload.sku : '';
        if (sku.length > 0) return `sku:${sku}`;
        const name = typeof payload.name === 'string' ? payload.name : '';
        const cost = payload.cost !== undefined ? String(payload.cost) : '';
        return `name:${name}|cost:${cost}|line:${line}`;
    }

    private cellsFor(_rows: NormalizedRow[], row: NormalizedRow): string[] {
        return Object.values(row.payload).map((value) => (value === null || value === undefined ? '' : String(value)));
    }

    private async resolveDuplicates(rows: NormalizedRow[]): Promise<ImportDuplicateRef[]> {
        const duplicates: ImportDuplicateRef[] = [];
        const seen = new Map<string, number>();
        for (const row of rows) {
            const seenCount = seen.get(row.key) ?? 0;
            if (seenCount > 0) {
                duplicates.push({ key: row.key });
            } else {
                const existing = await this.lookupExistingProduct(row.payload);
                if (existing) {
                    duplicates.push({ key: row.key, existingProductId: existing.id });
                }
                seen.set(row.key, seenCount + 1);
            }
        }
        return duplicates;
    }

    private async lookupExistingProduct(payload: Record<string, unknown>): Promise<Product | null> {
        const repository = this.dataSource.getRepository(Product);
        const barcode = typeof payload.barcode === 'string' ? payload.barcode : undefined;
        if (barcode && barcode.length > 0) {
            const hit = await repository.findOne({ where: { barcode } });
            if (hit) return hit;
        }
        const sku = typeof (payload as Record<string, unknown>).sku === 'string'
            ? (payload as Record<string, string>).sku
            : undefined;
        if (sku && sku.length > 0) {
            const hit = await repository.createQueryBuilder('product')
                .where('product.sku = :sku', { sku })
                .getOne();
            if (hit) return hit;
        }
        return null;
    }

    private toCode(error: unknown): string {
        if (error instanceof CsvImportError) return error.code;
        return 'RowError';
    }
}