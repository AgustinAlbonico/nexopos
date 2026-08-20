import { Injectable, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SystemConfiguration } from './entities/system-configuration.entity';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { Product } from '../products/entities/product.entity';
import { Category } from '../products/entities/category.entity';

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
    ) { }

    async onModuleInit() {
        // Asegurar que existe la configuración por defecto
        const count = await this.configRepository.count();
        if (count === 0) {
            await this.configRepository.save({
                defaultProfitMargin: 30,
                minStockAlert: 5,
                barcodeScannerEnabled: false,
                barcodeScannerTimeoutMs: 100,
                allowOutOfStockSale: false,
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

        // Obtener productos que deben usar el margen general:
        // - isActive = true
        // - useCustomMargin = false
        // - categoryId IS NULL O categoryId NO está en categorías con margen
        let productsToUpdate: Product[] = [];

        if (categoryIdsWithMargin.length > 0) {
            productsToUpdate = await productRepo
                .createQueryBuilder('product')
                .where('product.isActive = :isActive', { isActive: true })
                .andWhere('product.useCustomMargin = :useCustomMargin', { useCustomMargin: false })
                .andWhere('(product.categoryId IS NULL OR product.categoryId NOT IN (:...categoryIds))', {
                    categoryIds: categoryIdsWithMargin
                })
                .getMany();
        } else {
            // No hay categorías con margen, obtener todos los que no tienen margen personalizado
            productsToUpdate = await productRepo.find({
                where: { isActive: true, useCustomMargin: false }
            });
        }

        // Contar productos con margen personalizado (no serán afectados)
        const skipped = await productRepo.count({
            where: { isActive: true, useCustomMargin: true }
        });

        // Contar productos con categoría que tiene margen (no serán afectados)
        let skippedByCategory = 0;
        if (categoryIdsWithMargin.length > 0) {
            skippedByCategory = await productRepo
                .createQueryBuilder('product')
                .where('product.isActive = :isActive', { isActive: true })
                .andWhere('product.useCustomMargin = :useCustomMargin', { useCustomMargin: false })
                .andWhere('product.categoryId IN (:...categoryIds)', {
                    categoryIds: categoryIdsWithMargin
                })
                .getCount();
        }

        // Actualizar precio de cada producto
        for (const product of productsToUpdate) {
            product.price = product.cost * (1 + margin / 100);
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
