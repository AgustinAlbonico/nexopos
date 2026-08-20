/**
 * In-memory preview cache for the catalog import.
 *
 * Plan reference: `apps/backend/src/modules/products/import/preview-cache.ts`.
 * The preview endpoint parses + normalizes the CSV and stores the parsed rows
 * keyed by `previewId`; the commit endpoint then resolves the same
 * `previewId` and applies the chosen duplicate strategy. We keep the cache
 * tiny (UUID + rows + duplicates + errors) and evict on commit. There is
 * no Redis or external queue — the plan forbids it.
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { ImportDuplicateRef, ImportPreviewRow, ImportRowError } from './import-preview.dto';

export interface ImportPreviewSnapshot {
    readonly previewId: string;
    readonly rows: readonly ImportPreviewRow[];
    readonly duplicates: readonly ImportDuplicateRef[];
    readonly errors: readonly ImportRowError[];
}

@Injectable()
export class ImportPreviewCache {
    private readonly store = new Map<string, ImportPreviewSnapshot>();

    put(rows: ImportPreviewRow[], duplicates: ImportDuplicateRef[], errors: ImportRowError[]): ImportPreviewSnapshot {
        const previewId = randomUUID();
        const snapshot: ImportPreviewSnapshot = { previewId, rows, duplicates, errors };
        this.store.set(previewId, snapshot);
        return snapshot;
    }

    get(previewId: string): ImportPreviewSnapshot | undefined {
        return this.store.get(previewId);
    }

    drop(previewId: string): void {
        this.store.delete(previewId);
    }
}