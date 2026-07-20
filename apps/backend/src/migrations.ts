// Archivo que exporta todas las migraciones para uso con webpack bundle
// TypeORM necesita referencias explícitas en lugar de patrones glob cuando se bundlea

import { MigrationInterface } from 'typeorm';
import { InitialSchema1734450000000 } from './migrations/1734450000000-InitialSchema';
import { UpdateAccountDateColumnsToTimestamp1735498200000 } from './migrations/1735498200000-UpdateAccountDateColumnsToTimestamp';
import { AddBrandsSupport1768003658000 } from './migrations/1768003658000-AddBrandsSupport';
import { SimplifyBrandsTable1768003659000 } from './migrations/1768003659000-SimplifyBrandsTable';
import { AddMissingCustomerAccountColumns1768003660000 } from './migrations/1768003660000-AddMissingCustomerAccountColumns';
import { SchemaImprovements1768003661000 } from './migrations/1768003661000-SchemaImprovements';
import { AddAuditLogCompositeIndexes1769113297000 } from './migrations/1769113297000-AddAuditLogCompositeIndexes';

export const migrations: (new () => MigrationInterface)[] = [
    InitialSchema1734450000000,
    UpdateAccountDateColumnsToTimestamp1735498200000,
    AddBrandsSupport1768003658000,
    SimplifyBrandsTable1768003659000,
    AddMissingCustomerAccountColumns1768003660000,
    SchemaImprovements1768003661000,
    AddAuditLogCompositeIndexes1769113297000,
];
