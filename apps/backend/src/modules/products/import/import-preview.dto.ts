/**
 * Preview / commit DTOs for the catalog import endpoint.
 *
 * Plan reference: `apps/backend/src/modules/products/import/import-preview.dto.ts`.
 * Pure shapes; no I/O here. The service stores the parsed preview under
 * `previewId` (an in-memory map keyed by a generated UUID) so the client can
 * round-trip `POST /import/preview` → `POST /import/commit` without re-uploading
 * the file.
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export type ImportDuplicateStrategy = 'skip' | 'overwrite' | 'duplicate';

export const IMPORT_DUPLICATE_STRATEGIES: readonly ImportDuplicateStrategy[] = [
    'skip',
    'overwrite',
    'duplicate',
];

/**
 * A single normalized row from the CSV preview. Field names mirror the
 * `CreateProductDto` contract; values are coerced to their target JS types
 * (string for text, number for numeric). Only `name` and `cost` are strictly
 * required by `ProductsService.create`; the rest are optional passthroughs.
 */
export class ImportPreviewRow {
    @ApiProperty({ description: '1-based line number in the original CSV' })
    @IsOptional()
    @IsString()
    line?: string;

    @ApiProperty({ description: 'Stable key resolved by the importer (barcode > sku > name+price)' })
    @IsString()
    key!: string;

    @ApiProperty({ description: 'Raw normalized cells, in header order' })
    @IsArray()
    @IsString({ each: true })
    cells!: string[];

    @ApiProperty({ description: 'Normalized product payload consumed by ProductsService.create' })
    payload!: Record<string, unknown>;
}

export class ImportDuplicateRef {
    @ApiProperty()
    @IsString()
    key!: string;

    @ApiProperty({ description: 'Existing product id when known' })
    @IsOptional()
    @IsString()
    existingProductId?: string;
}

export class ImportRowError {
    @ApiProperty()
    @IsString()
    code!: string;

    @ApiProperty()
    @IsString()
    message!: string;

    @ApiProperty({ required: false })
    @IsOptional()
    line?: number;
}

export class ImportPreviewResponse {
    @ApiProperty({ description: 'Token to identify this preview in the follow-up commit call' })
    @IsString()
    previewId!: string;

    @ApiProperty({ type: [ImportPreviewRow] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ImportPreviewRow)
    rows!: ImportPreviewRow[];

    @ApiProperty({ type: [ImportDuplicateRef] })
    @IsArray()
    @ValidateNested({ each: true })
  @Type(() => ImportDuplicateRef)
  duplicates!: ImportDuplicateRef[];

  @ApiProperty({ type: [ImportRowError] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportRowError)
  errors!: ImportRowError[];
}

export class ImportCommitRequest {
  @ApiProperty()
  @IsString()
  previewId!: string;

  @ApiProperty({ enum: IMPORT_DUPLICATE_STRATEGIES })
  @IsIn(IMPORT_DUPLICATE_STRATEGIES as readonly string[])
  duplicates!: ImportDuplicateStrategy;
}