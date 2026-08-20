import {
    Injectable,
    NotFoundException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { In } from 'typeorm';
import { ProductsRepository } from './products.repository';
import { CategoriesRepository } from './categories.repository';
import {
    CreateProductDto,
    UpdateProductDTO,
    QueryProductsDTO,
} from './dto';

import { ConfigurationService } from '../configuration/configuration.service';
import { InventoryService } from '../inventory/inventory.service';
import { StockMovementType, StockMovementSource } from '../inventory/entities/stock-movement.entity';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { BrandsRepository } from './brands.repository';

/**
 * Servicio de productos
 * - Calcula precio automáticamente según jerarquía de márgenes:
 *   1. Margen personalizado del producto (si useCustomMargin = true)
 *   2. Margen de la categoría (si la categoría tiene profitMargin definido)
 *   3. Margen general del sistema (defaultProfitMargin)
 * - Registra movimientos de stock al crear productos con stock inicial
 */
@Injectable()
export class ProductsService {
    constructor(
        private readonly productsRepository: ProductsRepository,
        private readonly categoriesRepository: CategoriesRepository,
        private readonly brandsRepository: BrandsRepository,
        private readonly configService: ConfigurationService,
        @Inject(forwardRef(() => InventoryService))
        private readonly inventoryService: InventoryService,
    ) { }

    /**
     * Obtiene el margen de ganancia efectivo según la jerarquía:
     * 1. Margen personalizado del producto
     * 2. Margen de la categoría
     * 3. Margen general del sistema
     */
    async getEffectiveProfitMargin(
        useCustomMargin: boolean,
        customProfitMargin?: number,
        category?: Category | null,
    ): Promise<number> {
        // 1. Margen personalizado del producto
        if (useCustomMargin && customProfitMargin !== undefined) {
            return customProfitMargin;
        }

        // 2. Margen de la categoría
        if (category?.profitMargin !== null && category?.profitMargin !== undefined) {
            return category.profitMargin;
        }

        // 3. Margen general del sistema
        return this.configService.getDefaultProfitMargin();
    }

    async create(dto: CreateProductDto) {
        // Cargar categoría si se proporciona ID
        let category: Category | null = null;
        if (dto.categoryId) {
            const foundCategory = await this.categoriesRepository.findOne({
                where: { id: dto.categoryId },
            });
            if (!foundCategory) {
                throw new NotFoundException('Categoría no encontrada');
            }
            category = foundCategory;
        }

        // Determinar margen de ganancia según jerarquía
        const useCustomMargin = dto.useCustomMargin ?? false;
        const profitMargin = await this.getEffectiveProfitMargin(
            useCustomMargin,
            dto.customProfitMargin,
            category,
        );

        // Procesar marca (opcional)
        let brand: Brand | null = null;
        if (dto.brandName && dto.brandName.trim().length > 0) {
            brand = await this.brandsRepository.findOrCreateByName(dto.brandName);
        }

        // Calcular precio automáticamente
        const price = this.calculatePrice(dto.cost ?? 0, profitMargin);

        // Crear producto con stock 0 inicialmente (el stock se agrega via movimiento)
        const initialStock = dto.stock ?? 0;
        const product = this.productsRepository.create({
            name: dto.name,
            description: dto.description,
            cost: dto.cost,
            price,
            profitMargin,
            useCustomMargin,
            stock: 0, // Inicializar en 0, el movimiento lo actualizará
            category,
            categoryId: dto.categoryId || null,
            brand,
            brandId: brand?.id || null,
            barcode: dto.barcode ?? null,
            isActive: dto.isActive ?? true,
        });

        const savedProduct = await this.productsRepository.save(product);

        // Si hay stock inicial, registrar movimiento de stock
        if (initialStock > 0) {
            await this.inventoryService.createMovement({
                productId: savedProduct.id,
                type: StockMovementType.IN,
                source: StockMovementSource.INITIAL_LOAD,
                quantity: initialStock,
                cost: dto.cost ?? undefined,
                notes: 'Carga inicial de stock',
                date: new Date().toISOString(),
            });

            // Recargar el producto con el stock actualizado
            return this.findOne(savedProduct.id);
        }

        return savedProduct;
    }

    async findAll(filters: QueryProductsDTO) {
        // Si se filtra por stock crítico, obtener el umbral de minStockAlert
        let minStockAlert: number | undefined;
        if (filters.stockStatus === 'critical') {
            minStockAlert = await this.configService.getMinStockAlert();
        }

        const [data, total] = await this.productsRepository.findWithFilters(filters, minStockAlert);

        return {
            data,
            total,
            page: filters.page,
            limit: filters.limit,
            totalPages: Math.ceil(total / filters.limit),
        };
    }

    async findOne(id: string) {
        const product = await this.productsRepository.findOne({
            where: { id },
            relations: ['category', 'brand'],
        });

        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        return product;
    }

    async findByIds(ids: string[]): Promise<Product[]> {
        const uniqueIds = Array.from(new Set(ids));
        if (uniqueIds.length === 0) {
            return [];
        }

        return this.productsRepository.find({
            where: { id: In(uniqueIds) },
            relations: ['category', 'brand'],
        });
    }

    async update(id: string, dto: UpdateProductDTO) {
        const product = await this.findOne(id);

        // Actualizar categoría si se proporciona
        if (dto.categoryId !== undefined) {
            await this.updateProductCategory(product, dto.categoryId);
        }

        // Actualizar marca si se proporciona
        if (dto.brandName !== undefined) {
            if (dto.brandName && dto.brandName.trim().length > 0) {
                const brand = await this.brandsRepository.findOrCreateByName(dto.brandName);
                product.brand = brand;
                product.brandId = brand.id;
            } else {
                product.brand = null;
                product.brandId = null;
            }
        }

        // Manejar cambio de margen y recalcular precio si es necesario
        await this.handlePriceRecalculation(product, dto);

        // Actualizar campos básicos
        if (dto.name !== undefined) product.name = dto.name;
        if (dto.description !== undefined) product.description = dto.description;
        if (dto.cost !== undefined) product.cost = dto.cost;
        if (dto.barcode !== undefined) product.barcode = dto.barcode;
        if (dto.isActive !== undefined) product.isActive = dto.isActive;

        // FIX: Si cambia el stock, registrar un movimiento ADJUSTMENT para no
        // romper el historial (antes se pisaba product.stock sin crear StockMovement).
        if (dto.stock !== undefined && dto.stock !== product.stock) {
            const delta = dto.stock - product.stock;
            await this.inventoryService.createMovement({
                productId: product.id,
                type: delta > 0 ? StockMovementType.IN : StockMovementType.OUT,
                source: StockMovementSource.ADJUSTMENT,
                quantity: Math.abs(delta),
                notes: 'Ajuste manual desde edición de producto',
                date: new Date().toISOString(),
            });
            product.stock = dto.stock;
        }

        return this.productsRepository.save(product);
    }

    /**
     * Actualiza la categoría de un producto
     */
    private async updateProductCategory(product: Product, categoryId: string | null): Promise<void> {
        if (categoryId) {
            const category = await this.categoriesRepository.findOne({
                where: { id: categoryId },
            });
            if (!category) {
                throw new NotFoundException('Categoría no encontrada');
            }
            product.category = category;
            product.categoryId = categoryId;
        } else {
            // Quitar categoría
            product.category = null;
            product.categoryId = null;
        }
    }

    /**
     * Maneja el recálculo del precio según cambios en margen, costo o categoría
     */
    private async handlePriceRecalculation(product: Product, dto: UpdateProductDTO): Promise<void> {
        // Caso 1: Cambio en useCustomMargin
        if (dto.useCustomMargin !== undefined) {
            product.useCustomMargin = dto.useCustomMargin;

            if (dto.useCustomMargin && dto.customProfitMargin !== undefined) {
                product.profitMargin = dto.customProfitMargin;
            } else if (!dto.useCustomMargin) {
                product.profitMargin = await this.getEffectiveProfitMargin(false, undefined, product.category);
            }

            const cost = dto.cost ?? product.cost ?? 0;
            product.price = this.calculatePrice(cost, product.profitMargin ?? 0);
            return;
        }

        // Caso 2: Actualización de margen personalizado existente
        if (dto.customProfitMargin !== undefined && product.useCustomMargin) {
            product.profitMargin = dto.customProfitMargin;
            const cost = dto.cost ?? product.cost ?? 0;
            product.price = this.calculatePrice(cost, product.profitMargin);
            return;
        }

        // Caso 3: Solo cambio de costo
        if (dto.cost !== undefined && dto.cost !== product.cost) {
            const margin = await this.getEffectiveProfitMargin(
                product.useCustomMargin,
                product.profitMargin ?? undefined,
                product.category,
            );
            product.price = this.calculatePrice(dto.cost ?? 0, margin);
            product.profitMargin = margin;
            return;
        }

        // Caso 4: Cambio de categoría sin margen personalizado
        if (dto.categoryId !== undefined && !product.useCustomMargin) {
            const margin = await this.getEffectiveProfitMargin(false, undefined, product.category);
            product.profitMargin = margin;
            product.price = this.calculatePrice(product.cost ?? 0, margin);
        }
    }

    async remove(id: string) {
        const product = await this.findOne(id);

        // Soft delete - solo marcar como inactivo
        product.isActive = false;
        await this.productsRepository.save(product);

        return { message: 'Producto eliminado' };
    }

    /**
     * Recalcula los precios de todos los productos de una categoría
     * Se llama cuando se actualiza el profitMargin de una categoría
     */
    async recalculateProductsByCategory(categoryId: string, categoryMargin: number | null): Promise<number> {
        // Obtener productos de esta categoría que NO tienen margen personalizado
        const products = await this.productsRepository.find({
            where: {
                categoryId,
                useCustomMargin: false,
                isActive: true,
            },
        });

        let updated = 0;
        for (const product of products) {
            // Si la categoría tiene margen, usarlo; si no, usar el margen general
            const margin = categoryMargin ?? await this.configService.getDefaultProfitMargin();
            product.profitMargin = margin;
            product.price = this.calculatePrice(product.cost ?? 0, margin);
            await this.productsRepository.save(product);
            updated++;
        }

        return updated;
    }

    /**
     * Busca un producto por código de barras exacto
     * Útil para scanners de código de barras en el POS
     */
    async findByBarcode(barcode: string): Promise<Product | null> {
        if (!barcode) {
            return null;
        }
        return this.productsRepository.findByBarcode(barcode);
    }

    /**
     * Calcula el precio de venta basado en costo y margen
     * FIX 7.7: Maneja productos con costo $0 (gratuitos/promocionales)
     */
    private calculatePrice(cost: number, profitMargin: number): number {
        // Protección para productos gratuitos o sin costo definido
        if (cost <= 0) {
            return 0;
        }
        const price = cost * (1 + profitMargin / 100);
        return Math.round(price * 100) / 100;
    }
}
