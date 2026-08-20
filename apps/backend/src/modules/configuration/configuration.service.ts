import { BadRequestException, ConflictException, ForbiddenException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SystemConfiguration } from './entities/system-configuration.entity';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { getAppRouteManifest, type AppRouteManifest } from './capabilities/app-routes';
import { ALL_CAPABILITY_KEYS, type CapabilityKey, type CapabilityMap } from './capabilities/keys';
import { CURRENT_CAPABILITIES_SCHEMA_VERSION, isCapabilityProfileKey, BUSINESS_TYPES_MAP } from './capabilities/presets';
import { resolveCapabilities } from './capabilities/resolve';
import type { SystemConfigurationLegacyResponseDto } from './dto/system-configuration-legacy-response.dto';
import { Product } from '../products/entities/product.entity';
import { Category } from '../products/entities/category.entity';
import { ConfigurationAuditService } from './configuration-audit.service';

export type CapabilitiesResponse = Readonly<{
    profileKey: SystemConfiguration['profileKey'];
    profileVersion: number;
    capabilitiesSchemaVersion: number;
    capabilities: CapabilityMap;
    onboardingCompleted: boolean;
    selectedBusinessType: string | null;
}>;

export type CapabilitiesManifestResponse = CapabilitiesResponse & Readonly<{
    appRoutes: AppRouteManifest;
}>;

export type UpdateCapabilitiesInput = Readonly<{
    profileKey?: unknown;
    capabilities?: unknown;
    capabilitiesSchemaVersion?: unknown;
}>;

export type VariableBarcodeLayout = NonNullable<SystemConfiguration['variableBarcodeLayout']>;

/**
 * Capacidades del motor de capabilities.
 * Claves agrupadas por dominio; cada una se evalúa por
 * `assertCapabilityEnabled(key)` en el servicio correspondiente.
 *
 * Por defecto todas están habilitadas. Para desactivarlas en runtime se
 * persiste en `system_configuration.capabilitiesDisabled` (jsonb) — pendiente
 * de migración. Mientras tanto, los servicios pueden mockear
 * `getCapabilitiesManifest()` en sus tests para forzar el camino OFF.
 */
export type CapabilityKey =
    | 'STRUCTURAL.variants'
    | (string & { readonly _brand: 'CapabilityKey' });

export type CapabilitiesManifest = Record<CapabilityKey, boolean>;


/**
 * Servicio de configuración del sistema
 */
@Injectable()
export class ConfigurationService implements OnModuleInit {
    constructor(
        @InjectRepository(SystemConfiguration)
        private readonly configRepository: Repository<SystemConfiguration>,
        private readonly dataSource: DataSource,
        private readonly auditService: ConfigurationAuditService,
    ) { }

    async onModuleInit() {
        // Asegurar que existe la configuración por defecto
        const count = await this.configRepository.count();
        if (count === 0) {
            const envProfileKey = process.env.NEXOPOS_PROFILE_KEY;
            await this.configRepository.save({
                defaultProfitMargin: 30,
                minStockAlert: 5,
                barcodeScannerEnabled: false,
                barcodeScannerTimeoutMs: 100,
                allowOutOfStockSale: false,
                profileKey: typeof envProfileKey === 'string' && isCapabilityProfileKey(envProfileKey) ? envProfileKey : 'simple-retail',
                profileVersion: 1,
                capabilitiesJson: {},
                capabilitiesSchemaVersion: CURRENT_CAPABILITIES_SCHEMA_VERSION,
                onboardingCompleted: false,
                selectedBusinessType: null,
                ticketAutoPrintEnabled: true,
                ticketPrinterName: null,
                ticketPaperWidth: '80mm',
                ticketHeaderTitle: null,
                ticketHeaderAddress: null,
                ticketHeaderPhone: null,
                ticketFooterText: '¡Gracias por su compra!',
                ticketShowCustomerData: true,
                ticketLogoUrl: null,
            });
        }
    }

    async getConfiguration(): Promise<SystemConfiguration> {
        const config = await this.configRepository.find();
        return config[0];
    }

    async updateConfiguration(updateDto: UpdateConfigurationDto): Promise<SystemConfiguration> {
        const config = await this.getConfiguration();

        // Usamos update() en lugar de save() para asegurar que los cambios se apliquen
        // correctamente en columnas decimales
        await this.configRepository.update(config.id, updateDto);

        return this.getConfiguration();
    }

    async getVariableBarcodeLayout(): Promise<VariableBarcodeLayout | null> {
        return (await this.getConfiguration()).variableBarcodeLayout ?? null;
    }

    async getLegacyResponse(config?: SystemConfiguration): Promise<SystemConfigurationLegacyResponseDto> {
        const resolvedConfig = config ?? await this.getConfiguration();
        return {
            id: resolvedConfig.id,
            defaultProfitMargin: resolvedConfig.defaultProfitMargin,
            minStockAlert: resolvedConfig.minStockAlert,
            sistemaHabilitado: resolvedConfig.sistemaHabilitado,
            barcodeScannerEnabled: resolvedConfig.barcodeScannerEnabled,
            barcodeScannerTimeoutMs: resolvedConfig.barcodeScannerTimeoutMs,
            allowOutOfStockSale: resolvedConfig.allowOutOfStockSale,
            stockSectorizado: resolvedConfig.stockSectorizado,
            primarySaleLocationId: resolvedConfig.primarySaleLocationId,
            defaultReceiveLocationId: resolvedConfig.defaultReceiveLocationId,
            stockMinimoVenta: resolvedConfig.stockMinimoVenta,
            ticketAutoPrintEnabled: resolvedConfig.ticketAutoPrintEnabled,
            ticketPrinterName: resolvedConfig.ticketPrinterName,
            ticketPaperWidth: resolvedConfig.ticketPaperWidth,
            ticketHeaderTitle: resolvedConfig.ticketHeaderTitle,
            ticketHeaderAddress: resolvedConfig.ticketHeaderAddress,
            ticketHeaderPhone: resolvedConfig.ticketHeaderPhone,
            ticketFooterText: resolvedConfig.ticketFooterText,
            ticketShowCustomerData: resolvedConfig.ticketShowCustomerData,
            ticketLogoUrl: resolvedConfig.ticketLogoUrl,
            createdAt: resolvedConfig.createdAt,
            updatedAt: resolvedConfig.updatedAt,
        };
    }

    async getCapabilitiesResponse(config?: SystemConfiguration): Promise<CapabilitiesResponse> {
        const resolvedConfig = config ?? await this.getConfiguration();
        const capabilities = this.resolveStoredCapabilities(resolvedConfig);
        return {
            profileKey: resolvedConfig.profileKey,
            profileVersion: resolvedConfig.profileVersion,
            capabilitiesSchemaVersion: resolvedConfig.capabilitiesSchemaVersion,
            capabilities,
            onboardingCompleted: resolvedConfig.onboardingCompleted ?? false,
            selectedBusinessType: resolvedConfig.selectedBusinessType ?? null,
        };
    }

    async getCapabilitiesManifest(): Promise<CapabilitiesManifestResponse> {
        const response = await this.getCapabilitiesResponse();
        return {
            ...response,
            appRoutes: getAppRouteManifest(response.capabilities),
        };
    }

    verifyTechnicianKey(key: string): boolean {
        const expectedKey = process.env.NEXOPOS_TECHNICIAN_KEY || 'admin1234';
        return typeof key === 'string' && key.trim() === expectedKey.trim();
    }

    async completeOnboarding(businessTypeKey: string): Promise<CapabilitiesResponse> {
        const typeInfo = BUSINESS_TYPES_MAP[businessTypeKey];
        if (!typeInfo) {
            throw new BadRequestException(`Tipo de negocio no válido: ${businessTypeKey}`);
        }
        const config = await this.getConfiguration();
        await this.configRepository.update(config.id, {
            profileKey: typeInfo.profileKey,
            onboardingCompleted: true,
            selectedBusinessType: businessTypeKey,
        });
        return this.getCapabilitiesResponse();
    }

    async updateProfileWithTechnicianKey(profileKey: string, technicianKey: string): Promise<CapabilitiesResponse> {
        if (!this.verifyTechnicianKey(technicianKey)) {
            throw new ForbiddenException('Clave técnica incorrecta o no proporcionada');
        }
        if (!isCapabilityProfileKey(profileKey)) {
            throw new BadRequestException(`Perfil técnico desconocido: ${profileKey}`);
        }

        const audit = await this.auditService.auditProfileSwitch(profileKey);
        if (!audit.canSwitch) {
            throw new BadRequestException(`No se puede cambiar el perfil: ${audit.blockingReasons.join(' ')}`);
        }

        const config = await this.getConfiguration();
        await this.configRepository.update(config.id, { profileKey });
        return this.getCapabilitiesResponse();
    }

    async updateCapabilitiesWithTechnicianKey(capabilities: Record<string, boolean>, technicianKey: string): Promise<CapabilitiesResponse> {
        if (!this.verifyTechnicianKey(technicianKey)) {
            throw new ForbiddenException('Clave técnica incorrecta o no proporcionada');
        }
        return this.updateCapabilities({ capabilities });
    }

    async updateCapabilities(input: UpdateCapabilitiesInput): Promise<CapabilitiesResponse> {
        return this.updateCapabilitiesInternal(input);
    }

    async setProfile(profileKey: SystemConfiguration['profileKey']): Promise<CapabilitiesResponse> {
        return this.updateCapabilitiesInternal({ profileKey });
    }

    async setCapabilityOverrides(capabilities: Readonly<Partial<Record<CapabilityKey, boolean>>>): Promise<CapabilitiesResponse> {
        return this.updateCapabilitiesInternal({ capabilities });
    }

    async assertCapabilityEnabled(capabilityKey: CapabilityKey): Promise<void> {
        const { capabilities } = await this.getCapabilitiesResponse();
        if (!capabilities[capabilityKey]) {
            throw new ForbiddenException(`${capabilityKey} capability is disabled`);
        }
    }

    private async updateCapabilitiesInternal(input: UpdateCapabilitiesInput): Promise<CapabilitiesResponse> {
        const config = await this.getConfiguration();
        const profileKey = input.profileKey ?? config.profileKey;
        const capabilities = input.capabilities ?? config.capabilitiesJson;
        const capabilitiesSchemaVersion = input.capabilitiesSchemaVersion ?? config.capabilitiesSchemaVersion;
        this.resolveOrThrow(profileKey, capabilities, capabilitiesSchemaVersion);

        const nextProfileKey = typeof input.profileKey === 'string' && isCapabilityProfileKey(input.profileKey)
            ? input.profileKey
            : config.profileKey;
        const nextCapabilitiesJson = input.capabilities === undefined
            ? config.capabilitiesJson
            : this.normalizeCapabilityOverrides(input.capabilities);
        const nextCapabilitiesSchemaVersion = typeof input.capabilitiesSchemaVersion === 'number'
            ? input.capabilitiesSchemaVersion
            : config.capabilitiesSchemaVersion;

        await this.configRepository.update(config.id, {
            profileKey: nextProfileKey,
            capabilitiesJson: nextCapabilitiesJson,
            capabilitiesSchemaVersion: nextCapabilitiesSchemaVersion,
        });

        return this.getCapabilitiesResponse();
    }

    private resolveStoredCapabilities(config: SystemConfiguration): CapabilityMap {
        const capabilities = this.resolveOrThrow(config.profileKey, config.capabilitiesJson, config.capabilitiesSchemaVersion);
        const isSectorized = Boolean(config.stockSectorizado);
        return {
            ...capabilities,
            'APP_ROUTES.inventory_locations': isSectorized,
            'APP_ROUTES.inventory_locations_activate': isSectorized,
            'APP_ROUTES.inventory_replenishment': isSectorized,
        };
    }

    private resolveOrThrow(profileKey: unknown, capabilities: unknown, capabilitiesSchemaVersion: unknown): CapabilityMap {
        const result = resolveCapabilities(profileKey, capabilities, capabilitiesSchemaVersion);
        if (result.ok) {
            return result.capabilities;
        }
        const message = result.errors.join('; ');
        if (result.errors.some(error => error.startsWith('capabilitiesSchemaVersion'))) {
            throw new ConflictException(message);
        }
        throw new BadRequestException(message);
    }

    private normalizeCapabilityOverrides(value: unknown): Partial<Record<CapabilityKey, boolean>> {
        if (!this.isRecord(value)) {
            return {};
        }
        const overrides: Partial<Record<CapabilityKey, boolean>> = {};
        for (const key of ALL_CAPABILITY_KEYS) {
            const override = value[key];
            if (typeof override === 'boolean') {
                overrides[key] = override;
            }
        }
        return overrides;
    }

    private isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    async getDefaultProfitMargin(): Promise<number> {
        const config = await this.getConfiguration();
        return Number(config.defaultProfitMargin);
    }

    async getMinStockAlert(): Promise<number> {
        const config = await this.getConfiguration();
        return Number(config.minStockAlert);
    }

    async isOutOfStockSaleAllowed(): Promise<boolean> {
        const config = await this.getConfiguration();
        return Boolean(config.allowOutOfStockSale);
    }

    /**
     * Actualiza el precio de productos según el % de ganancia configurado
     * NOTA: Excluye:
     * - Productos con margen de ganancia personalizado (useCustomMargin = true)
     * - Productos cuya categoría tenga un margen de ganancia definido
     */
    async updateAllProductsPrices(newMargin?: number): Promise<{ updated: number; margin: number; skipped: number; skippedByCategory: number }> {
        if (newMargin !== undefined) {
            await this.updateConfiguration({ defaultProfitMargin: newMargin });
        }

        const config = await this.getConfiguration();
        const margin = Number(config.defaultProfitMargin);

        const productRepo = this.dataSource.getRepository(Product);
        const categoryRepo = this.dataSource.getRepository(Category);

        // Obtener IDs de categorías que tienen margen definido
        const categoriesWithMargin = await categoryRepo
            .createQueryBuilder('category')
            .select('category.id')
            .where('category.profitMargin IS NOT NULL')
            .getMany();

        const categoryIdsWithMargin = categoriesWithMargin.map(c => c.id);

        let productsToUpdate: Product[] = [];

        if (categoryIdsWithMargin.length > 0) {
            productsToUpdate = await productRepo
                .createQueryBuilder('product')
                .where('product.isActive = :isActive', { isActive: true })
                .andWhere('product.useCustomMargin = :useCustomMargin', { useCustomMargin: false })
                .andWhere('product.useManualPrice = :useManualPrice', { useManualPrice: false })
                .andWhere('(product.categoryId IS NULL OR product.categoryId NOT IN (:...categoryIds))', {
                    categoryIds: categoryIdsWithMargin
                })
                .getMany();
        } else {
            productsToUpdate = await productRepo.find({
                where: { isActive: true, useCustomMargin: false, useManualPrice: false }
            });
        }

        const skipped = await productRepo.count({
            where: { isActive: true, useCustomMargin: true }
        });

        let skippedByCategory = 0;
        if (categoryIdsWithMargin.length > 0) {
            skippedByCategory = await productRepo
                .createQueryBuilder('product')
                .where('product.isActive = :isActive', { isActive: true })
                .andWhere('product.useCustomMargin = :useCustomMargin', { useCustomMargin: false })
                .andWhere('product.useManualPrice = :useManualPrice', { useManualPrice: false })
                .andWhere('product.categoryId IN (:...categoryIds)', {
                    categoryIds: categoryIdsWithMargin
                })
                .getCount();
        }

        for (const product of productsToUpdate) {
            const cost = product.cost ?? 0;
            product.price = cost * (1 + margin / 100);
            product.price = Math.round(product.price * 100) / 100;
            product.profitMargin = margin;
        }

        await productRepo.save(productsToUpdate);

        return {
            updated: productsToUpdate.length,
            margin,
            skipped,
            skippedByCategory
        };
    }

    // ============ Motor de Capabilities ============

    private readonly defaultCapabilitiesManifest: CapabilitiesManifest = {
        'STRUCTURAL.variants': true,
    };

    async getCapabilitiesManifest(): Promise<CapabilitiesManifest> {
        return { ...this.defaultCapabilitiesManifest };
    }

    async assertCapabilityEnabled(capability: CapabilityKey): Promise<void> {
        const manifest = await this.getCapabilitiesManifest();
        if (manifest[capability] === false) {
            throw new ForbiddenException(
                `La capacidad "${capability}" no está habilitada para el perfil de negocio activo.`,
            );
        }
    }
}
