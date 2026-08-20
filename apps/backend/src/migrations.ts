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
import { AllowOutOfStockSale1769200000000 } from './migrations/1769200000000-AllowOutOfStockSale';
import { AddStockSectorizadoFoundations1770000000000 } from './migrations/1770000000000-AddStockSectorizadoFoundations';
import { AddManualPriceMode1770496000000 } from './migrations/1770496000000-AddManualPriceMode';
import { AddLocationIdToInventoryMovements1771000000000 } from './migrations/1771000000000-AddLocationIdToInventoryMovements';
import { AddStockSectorizadoConfig1772000000000 } from './migrations/1772000000000-AddStockSectorizadoConfig';
import { AddPurchaseLocationId1773000000000 } from './migrations/1773000000000-AddPurchaseLocationId';
import { AddCapabilitiesColumns1786387763156 } from './migrations/1786387763156-AddCapabilitiesColumns';
import { S2AddUnitOfMeasures1786405536069 } from './migrations/1786405536069-S2AddUnitOfMeasures';
import { S2DecimalizeQuantity1786405840940 } from './migrations/1786405840940-S2DecimalizeQuantity';
import { S2AddLineSnapshotColumns1786405840941 } from './migrations/1786405840941-S2AddLineSnapshotColumns';
import { S2AddStocktakeFoundations1786405840942 } from './migrations/1786405840942-S2AddStocktakeFoundations';
import { S3AddSaleReturnFoundations1786405840943 } from './migrations/1786405840943-S3AddSaleReturnFoundations';
import { S3AddCreditNotes1786405840944 } from './migrations/1786405840944-S3AddCreditNotes';
import { S3DecimalizeStockMovementQuantity1786405840945 } from './migrations/1786405840945-S3DecimalizeStockMovementQuantity';
import { S3AddSellablePacksAndBundles1786405840946 } from './migrations/1786405840946-S3AddSellablePacksAndBundles';
import { S4AddMeasureColumns1786405840947 } from './migrations/1786405840947-S4AddMeasureColumns';
import { S4AddSaleItemMeasureColumns1786405840948 } from './migrations/1786405840948-S4AddSaleItemMeasureColumns';
import { S4DecimalizeProductStock1786405840949 } from './migrations/1786405840949-S4DecimalizeProductStock';
import { S4AddVariableBarcodeLayout1786405840950 } from './migrations/1786405840950-S4AddVariableBarcodeLayout';
import { S4AddProductVariants1786405840951 } from './migrations/1786405840951-S4AddProductVariants';
import { AddBusinessProfilesAndOnboarding1786405840952 } from './migrations/1786405840952-AddBusinessProfilesAndOnboarding';
import { AddTicketConfigurationFields1786405840953 } from './migrations/1786405840953-AddTicketConfigurationFields';
import { AddTicketLogoUrlField1786405840954 } from './migrations/1786405840954-AddTicketLogoUrlField';
import { AddUniqueSkuAndBarcodeConstraints1786405840955 } from './migrations/1786405840955-AddUniqueSkuAndBarcodeConstraints';
import { AddApparelProductColumns1786405840956 } from './migrations/1786405840956-AddApparelProductColumns';
import { AddUserRoleColumn1786405840957 } from './migrations/1786405840957-AddUserRoleColumn';
import { AddApparelAdvancedFeatures1786405840958 } from './migrations/1786405840958-AddApparelAdvancedFeatures';
import { AddVariantAttributeOptions1787200000000 } from './migrations/1787200000000-AddVariantAttributeOptions';

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
    AllowOutOfStockSale1769200000000,
    AddStockSectorizadoFoundations1770000000000,
    AddManualPriceMode1770496000000,
    AddLocationIdToInventoryMovements1771000000000,
    AddStockSectorizadoConfig1772000000000,
    AddPurchaseLocationId1773000000000,
    AddCapabilitiesColumns1786387763156,
    S2AddUnitOfMeasures1786405536069,
    S2DecimalizeQuantity1786405840940,
    S2AddLineSnapshotColumns1786405840941,
    S2AddStocktakeFoundations1786405840942,
    S3AddSaleReturnFoundations1786405840943,
    S3AddCreditNotes1786405840944,
    S3DecimalizeStockMovementQuantity1786405840945,
    S3AddSellablePacksAndBundles1786405840946,
    S4AddMeasureColumns1786405840947,
    S4AddSaleItemMeasureColumns1786405840948,
    S4DecimalizeProductStock1786405840949,
    S4AddVariableBarcodeLayout1786405840950,
    S4AddProductVariants1786405840951,
    AddBusinessProfilesAndOnboarding1786405840952,
    AddTicketConfigurationFields1786405840953,
    AddTicketLogoUrlField1786405840954,
    AddUniqueSkuAndBarcodeConstraints1786405840955,
    AddApparelProductColumns1786405840956,
    AddUserRoleColumn1786405840957,
    AddApparelAdvancedFeatures1786405840958,
    AddVariantAttributeOptions1787200000000,
];
