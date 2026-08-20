/**
 * Módulo de configuración del sistema
 * Incluye configuración general y fiscal (AFIP)
 */
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigurationController } from './configuration.controller';
import { ConfigurationService } from './configuration.service';
import { SystemConfiguration } from './entities/system-configuration.entity';
import { FiscalConfiguration } from './entities/fiscal-configuration.entity';
import { FiscalConfigurationController } from './fiscal-configuration.controller';
import { FiscalConfigurationService } from './fiscal-configuration.service';
import { CertificateEncryptionService } from './certificate-encryption.service';
import { CertificateGenerationService } from './certificate-generation.service';
import { TaxType } from './entities/tax-type.entity';
import { TaxTypesController } from './controllers/tax-types.controller';
import { TaxTypesService } from './services/tax-types.service';

import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentMethodsController } from './controllers/payment-methods.controller';
import { PaymentMethodsService } from './services/payment-methods.service';

import { ConfigurationAuditService } from './configuration-audit.service';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([SystemConfiguration, FiscalConfiguration, TaxType, PaymentMethod]),
    ],
    controllers: [ConfigurationController, FiscalConfigurationController, TaxTypesController, PaymentMethodsController],
    providers: [
        ConfigurationService,
        ConfigurationAuditService,
        FiscalConfigurationService,
        CertificateEncryptionService,
        CertificateGenerationService,
        TaxTypesService,
        PaymentMethodsService,
    ],
    exports: [
        ConfigurationService,
        ConfigurationAuditService,
        FiscalConfigurationService,
        CertificateEncryptionService,
        CertificateGenerationService,
        TaxTypesService,
        PaymentMethodsService,
    ],
})
export class ConfigurationModule { }
