// Archivo que exporta todas las migraciones para uso con webpack bundle
// TypeORM necesita referencias explícitas en lugar de patrones glob cuando se bundlea

import { MigrationInterface } from 'typeorm';
import { InitialSchema1734450000000 } from './migrations/1734450000000-InitialSchema';
import { UpdateAccountDateColumnsToTimestamp1735498200000 } from './migrations/1735498200000-UpdateAccountDateColumnsToTimestamp';
import { AddBrandsSupport1768003658000 } from './migrations/1768003658000-AddBrandsSupport';
import { SimplifyBrandsTable1768003659000 } from './migrations/1768003659000-SimplifyBrandsTable';
import { AddMissingCustomerAccountColumns1768003660000 } from './migrations/1768003660000-AddMissingCustomerAccountColumns';
import { SchemaImprovements1768003661000 } from './migrations/1768003661000-SchemaImprovements';
import { IncreaseProfitMarginPrecision1768412960845 } from './migrations/1768412960845-IncreaseProfitMarginPrecision';
import { MassiveNumericPrecisionStandardization1768413296219 } from './migrations/1768413296219-MassiveNumericPrecisionStandardization';
import { AddBarcodeScannerConfig1768413297000 } from './migrations/1768413297000-AddBarcodeScannerConfig';
import { AddAuditLogCompositeIndexes1769113297000 } from './migrations/1769113297000-AddAuditLogCompositeIndexes';

export const migrations: (new () => MigrationInterface)[] = [
    InitialSchema1734450000000,
    UpdateAccountDateColumnsToTimestamp1735498200000,
    AddBrandsSupport1768003658000,
    SimplifyBrandsTable1768003659000,
    AddMissingCustomerAccountColumns1768003660000,
    SchemaImprovements1768003661000,
    IncreaseProfitMarginPrecision1768412960845,
    MassiveNumericPrecisionStandardization1768413296219,
    AddBarcodeScannerConfig1768413297000,
    AddAuditLogCompositeIndexes1769113297000,
];
