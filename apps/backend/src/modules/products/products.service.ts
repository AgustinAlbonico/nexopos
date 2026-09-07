import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository, ILike } from 'typeorm';
import { ProductsRepository } from './products.repository';
import { CategoriesRepository } from './categories.repository';
import {
    CreateProductDto,
    UpdateProductDTO,
    QueryProductsDTO,
    CreateApparelMatrixProductDto,
} from './dto';
import { CreateSizeScaleDto, UpdateSizeScaleDto } from './dto/create-size-scale.dto';
import { CreateColorPaletteDto, UpdateColorPaletteDto } from './dto/create-color-palette.dto';
import { ConfigurationService } from '../configuration/configuration.service';
import { InventoryService } from '../inventory/inventory.service';
import { StockMovementType, StockMovementSource } from '../inventory/entities/stock-movement.entity';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { BrandsRepository } from './brands.repository';
import { SizeScaleTemplate } from './entities/size-scale-template.entity';
import { ColorPaletteTemplate } from './entities/color-palette-template.entity';
import { LocalBarcodeLayout, parseVariableBarcode } from './barcode-parser/barcode-parser.service';
import { ProductVariantAttribute } from './entities/product-variant-attribute.entity';

@Injectable()
export class ProductsService {
    constructor(
        private readonly productsRepository: ProductsRepository,
        private readonly categoriesRepository: CategoriesRepository,
        private readonly brandsRepository: BrandsRepository,
        @InjectRepository(SizeScaleTemplate)
        private readonly sizeScaleRepository: Repository<SizeScaleTemplate>,
        @InjectRepository(ColorPaletteTemplate)
        private readonly colorPaletteRepository: Repository<ColorPaletteTemplate>,
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
        // Validar unicidad de SKU si se especificó
        if (dto.sku && dto.sku.trim().length > 0) {
            const existingSku = await this.productsRepository.findOne({ where: { sku: dto.sku.trim() } });
            if (existingSku) {
                throw new ConflictException(`El SKU "${dto.sku}" ya está registrado en el producto "${existingSku.name}"`);
            }
        }

        // Validar unicidad de código de barras si se especificó
        if (dto.barcode && dto.barcode.trim().length > 0) {
            const existingBarcode = await this.productsRepository.findOne({ where: { barcode: dto.barcode.trim() } });
            if (existingBarcode) {
                throw new ConflictException(`El código de barras "${dto.barcode}" ya está registrado en el producto "${existingBarcode.name}"`);
            }
        }

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

        // Modo precio fijo: si no se especifica explícitamente, se deduce según si se envió dto.price o no.
        const useManualPrice = dto.useManualPrice ?? (dto.price !== undefined && dto.price !== null);

        let price: number | null;
        let profitMargin: number | null;
        let useCustomMargin: boolean;

        if (useManualPrice) {
            // Modo precio fijo: el price se carga directamente.
            if (dto.price === undefined || dto.price === null) {
                throw new BadRequestException('Cuando useManualPrice = true, debe proporcionar el precio final.');
            }
            price = dto.price;
            profitMargin = null;
            useCustomMargin = false;
        } else {
            // Modo clásico: calcular desde cost + profitMargin
            useCustomMargin = dto.useCustomMargin ?? false;
            profitMargin = await this.getEffectiveProfitMargin(
                useCustomMargin,
                dto.customProfitMargin,
                category,
            );
            price = this.calculatePrice(dto.cost ?? 0, profitMargin);
        }

        // Procesar marca (opcional)
        let brand: Brand | null = null;
        if (dto.brandName && dto.brandName.trim().length > 0) {
            brand = await this.brandsRepository.findOrCreateByName(dto.brandName);
        }

        // Crear producto con stock 0 inicialmente (el stock se agrega via movimiento)
        const initialStock = dto.stock ?? 0;
        const product = this.productsRepository.create({
            name: dto.name,
            description: dto.description,
            cost: dto.cost ?? null,
            price,
            profitMargin,
            useCustomMargin,
            useManualPrice,
            stock: 0, // Inicializar en 0, el movimiento lo actualizará
            category,
            categoryId: dto.categoryId || null,
            brand,
            brandId: brand?.id || null,
            sku: dto.sku ?? null,
            barcode: dto.barcode ?? null,
            isMeasure: dto.isMeasure ?? false,
            tareGrams: dto.tareGrams ?? null,
            variableBarcodeFormat: dto.variableBarcodeFormat ?? null,
            isActive: dto.isActive ?? true,
            season: dto.season ?? null,
            collection: dto.collection ?? null,
            composition: dto.composition ?? null,
            careInstructions: dto.careInstructions ?? null,
            originCountry: dto.originCountry ?? null,
            returnPolicy: dto.returnPolicy ?? 'standard',
            imageUrl: dto.imageUrl ?? null,
            packs: dto.packs ?? [],
            bundleComponents: dto.bundleComponents ?? [],
            isVariantParent: dto.isVariantParent ?? (Boolean(dto.season) || Boolean(dto.collection)),
        });

        const savedProduct = await this.productsRepository.save(product);

        // Si hay stock inicial, registrar movimiento de stock
        if (initialStock > 0) {
            await this.inventoryService.createMovement({
                productId: savedProduct.id,
                type: StockMovementType.IN,
                source: StockMovementSource.INITIAL_LOAD,
                quantity: initialStock,
                cost: dto.cost ?? 0,
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
            relations: [
                'category',
                'brand',
                'packs',
                'bundleComponents',
                'bundleComponents.componentProduct',
                'variantAttributes',
            ],
        });

        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        if (product.isVariantParent) {
            product.variants = await this.productsRepository.find({
                where: { parentProductId: id, isActive: true },
                relations: ['variantAttributes'],
            });
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
            relations: [
                'category',
                'brand',
                'packs',
                'bundleComponents',
                'bundleComponents.componentProduct',
                'variants',
                'variants.variantAttributes',
                'variantAttributes',
            ],
        });
    }

    async update(id: string, dto: UpdateProductDTO) {
        const product = await this.findOne(id);

        // Validar unicidad de SKU si cambió
        if (dto.sku !== undefined && dto.sku && dto.sku.trim().length > 0) {
            const existingSku = await this.productsRepository.findOne({ where: { sku: dto.sku.trim(), id: Not(id) } });
            if (existingSku) {
                throw new ConflictException(`El SKU "${dto.sku}" ya está registrado en el producto "${existingSku.name}"`);
            }
        }

        // Validar unicidad de código de barras si cambió
        if (dto.barcode !== undefined && dto.barcode && dto.barcode.trim().length > 0) {
            const existingBarcode = await this.productsRepository.findOne({ where: { barcode: dto.barcode.trim(), id: Not(id) } });
            if (existingBarcode) {
                throw new ConflictException(`El código de barras "${dto.barcode}" ya está registrado en el producto "${existingBarcode.name}"`);
            }
        }

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
        if (dto.sku !== undefined) product.sku = dto.sku;
        if (dto.barcode !== undefined) product.barcode = dto.barcode;
        if (dto.isMeasure !== undefined) product.isMeasure = dto.isMeasure;
        if (dto.tareGrams !== undefined) product.tareGrams = dto.tareGrams;
        if (dto.variableBarcodeFormat !== undefined) product.variableBarcodeFormat = dto.variableBarcodeFormat;
        if (dto.isActive !== undefined) product.isActive = dto.isActive;
        if (dto.season !== undefined) product.season = dto.season;
        if (dto.collection !== undefined) product.collection = dto.collection;
        if (dto.composition !== undefined) product.composition = dto.composition;
        if (dto.careInstructions !== undefined) product.careInstructions = dto.careInstructions;
        if (dto.originCountry !== undefined) product.originCountry = dto.originCountry;
        if (dto.returnPolicy !== undefined) product.returnPolicy = dto.returnPolicy ?? 'standard';
        if (dto.imageUrl !== undefined) product.imageUrl = dto.imageUrl;
        if (dto.isVariantParent !== undefined) product.isVariantParent = dto.isVariantParent;
        if (dto.packs !== undefined) product.packs = dto.packs as never;
        if (dto.bundleComponents !== undefined) product.bundleComponents = dto.bundleComponents as never;

        // FIX: Si cambia el stock, registrar un movimiento ADJUSTMENT
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

        const saved = await this.productsRepository.save(product);

        // B.2: Propagación en cascada a variantes si es modelo padre y cambiaron precios/costos
        if (product.isVariantParent && (dto.price !== undefined || dto.cost !== undefined || dto.customProfitMargin !== undefined || dto.useManualPrice !== undefined || dto.useCustomMargin !== undefined)) {
            const childVariants = await this.productsRepository.find({
                where: { parentProductId: product.id },
            });
            for (const child of childVariants) {
                if (dto.cost !== undefined) child.cost = product.cost;
                if (dto.price !== undefined) child.price = product.price;
                if (dto.customProfitMargin !== undefined) child.profitMargin = product.profitMargin;
                if (dto.useManualPrice !== undefined) child.useManualPrice = product.useManualPrice;
                if (dto.useCustomMargin !== undefined) child.useCustomMargin = product.useCustomMargin;
                await this.productsRepository.save(child);
            }
        }

        return saved;
    }

    async remove(id: string) {
        const product = await this.findOne(id);
        product.isActive = false;
        await this.productsRepository.save(product);
        return { message: 'Producto eliminado' };
    }

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
            product.category = null;
            product.categoryId = null;
        }
    }

    private async handlePriceRecalculation(product: Product, dto: UpdateProductDTO): Promise<void> {
        // Caso 0.bis: Transición de modo precio fijo
        if (dto.useManualPrice !== undefined && dto.useManualPrice !== product.useManualPrice) {
            product.useManualPrice = dto.useManualPrice;

            if (dto.useManualPrice) {
                // Pasó a modo precio fijo: usar el price del DTO (o mantener el actual)
                product.price = dto.price ?? product.price ?? 0;
                // profitMargin deja de tener sentido en modo manual
                product.profitMargin = null;
                product.useCustomMargin = false;
            } else {
                // Volvió a modo clásico: recalcular desde cost + margen efectivo
                const margin = await this.getEffectiveProfitMargin(
                    dto.useCustomMargin ?? product.useCustomMargin,
                    dto.customProfitMargin,
                    product.category,
                );
                product.profitMargin = margin;
                product.useCustomMargin = dto.useCustomMargin ?? false;
                const cost = dto.cost ?? product.cost ?? 0;
                product.price = this.calculatePrice(cost, margin);
            }
            return;
        }

        // Caso 0: producto en modo precio fijo — solo respetar price directo
        if (product.useManualPrice) {
            if (dto.price !== undefined) {
                product.price = dto.price;
            }
            return;
        }

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

        if (dto.customProfitMargin !== undefined && product.useCustomMargin) {
            product.profitMargin = dto.customProfitMargin;
            const cost = dto.cost ?? product.cost ?? 0;
            product.price = this.calculatePrice(cost, product.profitMargin);
            return;
        }

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

        if (dto.categoryId !== undefined && !product.useCustomMargin) {
            const margin = await this.getEffectiveProfitMargin(false, undefined, product.category);
            product.profitMargin = margin;
            const cost = product.cost ?? 0;
            product.price = this.calculatePrice(cost, margin);
        }
    }

    async recalculateProductsByCategory(categoryId: string, categoryMargin: number | null): Promise<number> {
        // Obtener productos de esta categoría que NO tienen margen personalizado ni modo manual
        const products = await this.productsRepository.find({
            where: {
                categoryId,
                useCustomMargin: false,
                useManualPrice: false,
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

    async findByVariableBarcode(barcode: string, layout: LocalBarcodeLayout) {
        const variable = parseVariableBarcode(barcode, layout);
        if (!variable?.productCode) return null;

        const product = await this.productsRepository.findBySku(variable.productCode);
        return product ? { product, variable } : null;
    }

    async generateVariants(parentId: string, attributes: Record<string, string[]>): Promise<Product[]> {
        const manifest = await this.configService.getCapabilitiesManifest();
        if (!manifest.capabilities['STRUCTURAL.variants']) {
            throw new ForbiddenException(
                'La generación de matriz de variantes solo está disponible para el rubro Indumentaria y Calzado.',
            );
        }

        const parent = await this.findOne(parentId);
        if (!parent.isVariantParent) {
            parent.isVariantParent = true;
            await this.productsRepository.save(parent);
        }

        const dimensions = Object.entries(attributes)
            .map(([key, values]) => [key.trim(), [...new Set(values.map((value) => value.trim()).filter(Boolean))]] as const)
            .filter(([, values]) => values.length > 0);
        if (dimensions.length === 0) {
            throw new BadRequestException('Debe indicar al menos un atributo con valores');
        }

        const combinations = dimensions.reduce<Array<Record<string, string>>>((rows, [key, values]) =>
            rows.flatMap((row) => values.map((value) => ({ ...row, [key]: value }))),
        [{}]);

        const variants = combinations.map((attributesByKey) => this.productsRepository.create({
            name: `${parent.name} ${Object.values(attributesByKey).join(' ')}`,
            description: parent.description,
            cost: parent.cost,
            price: parent.price,
            profitMargin: parent.profitMargin,
            useCustomMargin: parent.useCustomMargin,
            stock: 0,
            category: parent.category,
            categoryId: parent.categoryId,
            brand: parent.brand,
            brandId: parent.brandId,
            isActive: parent.isActive,
            parentProductId: parent.id,
            isVariantParent: false,
            variantAttributes: Object.entries(attributesByKey).map(([attributeKey, attributeValue]) => ({
                attributeKey,
                attributeValue,
            }) as ProductVariantAttribute),
        }));
        return this.productsRepository.save(variants);
    }

    /**
     * Crea de forma atómica un modelo de indumentaria/calzado y todas sus variantes de color x talle
     */
    async createMatrixProduct(dto: CreateApparelMatrixProductDto): Promise<{ parent: Product; variants: Product[]; totalVariants: number }> {
        const manifest = await this.configService.getCapabilitiesManifest();
        if (!manifest.capabilities['STRUCTURAL.variants']) {
            throw new ForbiddenException(
                'La creación de matriz de productos solo está disponible para el rubro Indumentaria y Calzado.',
            );
        }

        if (!dto.matrixCells || dto.matrixCells.length === 0) {
            throw new BadRequestException('Debe incluir al menos una celda en la matriz');
        }

        // Cargar categoría si se proporciona
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

        // Procesar marca si se proporciona
        let brand: Brand | null = null;
        if (dto.brandName && dto.brandName.trim().length > 0) {
            brand = await this.brandsRepository.findOrCreateByName(dto.brandName);
        }

        // Calcular precios base
        const useManualPrice = dto.useManualPrice ?? (dto.price !== undefined && dto.price !== null);
        let price: number | null;
        let profitMargin: number | null;
        let useCustomMargin: boolean;

        if (useManualPrice) {
            price = dto.price ?? null;
            profitMargin = null;
            useCustomMargin = false;
        } else {
            useCustomMargin = dto.useCustomMargin ?? false;
            profitMargin = await this.getEffectiveProfitMargin(
                useCustomMargin,
                dto.profitMargin ?? undefined,
                category,
            );
            price = this.calculatePrice(dto.cost ?? 0, profitMargin);
        }

        // Verificar unicidad de códigos de barra en el payload
        const providedBarcodes = dto.matrixCells
            .map((c) => c.barcode?.trim())
            .filter((b): b is string => Boolean(b && b.length > 0));

        const duplicateInPayload = providedBarcodes.find((b, idx) => providedBarcodes.indexOf(b) !== idx);
        if (duplicateInPayload) {
            throw new ConflictException(`El código de barras "${duplicateInPayload}" está duplicado en la matriz enviada.`);
        }

        if (providedBarcodes.length > 0) {
            const existingBarcode = await this.productsRepository.findOne({
                where: { barcode: In(providedBarcodes) },
            });
            if (existingBarcode) {
                throw new ConflictException(`El código de barras "${existingBarcode.barcode}" ya está registrado en el producto "${existingBarcode.name}".`);
            }
        }

        // Transacción atómica
        const result = await this.productsRepository.manager.transaction(async (manager) => {
            const productRepo = manager.getRepository(Product);
            const variantAttrRepo = manager.getRepository(ProductVariantAttribute);

            // 1. Crear producto padre
            const parentEntity = productRepo.create({
                name: dto.name.trim(),
                description: dto.description?.trim() || null,
                sku: dto.styleCode?.trim() || null,
                isVariantParent: true,
                season: dto.season?.trim() || null,
                collection: dto.collection?.trim() || null,
                composition: dto.composition?.trim() || null,
                careInstructions: dto.careInstructions?.trim() || null,
                originCountry: dto.originCountry?.trim() || null,
                returnPolicy: dto.returnPolicy || 'standard',
                categoryId: category?.id || null,
                brandId: brand?.id || null,
                cost: dto.cost ?? null,
                price,
                profitMargin,
                useCustomMargin,
                useManualPrice,
                stock: 0,
                imageUrl: dto.imageUrl?.trim() || null,
                isActive: true,
            });

            const savedParent = await productRepo.save(parentEntity);

            // 2. Crear las variantes hijas
            const createdVariants: Product[] = [];
            const baseStyleCode = (dto.styleCode?.trim() || dto.name.trim().substring(0, 6))
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '');

            for (const cell of dto.matrixCells) {
                const colorClean = cell.color.trim();
                const sizeClean = cell.size.trim();
                const variantName = `${savedParent.name} ${colorClean} ${sizeClean}`;

                const variantSku = cell.sku?.trim() || `${baseStyleCode}-${colorClean.substring(0, 3).toUpperCase()}-${sizeClean.toUpperCase()}`;
                const variantBarcode = cell.barcode?.trim() || null;

                const variantCost = cell.cost !== undefined && cell.cost !== null ? cell.cost : (dto.cost ?? null);
                const variantPrice = cell.price !== undefined && cell.price !== null ? cell.price : price;
                const variantMargin = cell.customProfitMargin !== undefined && cell.customProfitMargin !== null
                    ? cell.customProfitMargin
                    : profitMargin;
                const variantUseCustomMargin = cell.customProfitMargin !== undefined && cell.customProfitMargin !== null;
                const variantUseManualPrice = cell.price !== undefined && cell.price !== null ? true : useManualPrice;

                const variantEntity = productRepo.create({
                    name: variantName,
                    description: savedParent.description,
                    sku: variantSku,
                    barcode: variantBarcode,
                    cost: variantCost,
                    price: variantPrice,
                    profitMargin: variantMargin,
                    useCustomMargin: variantUseCustomMargin,
                    useManualPrice: variantUseManualPrice,
                    stock: 0,
                    categoryId: savedParent.categoryId,
                    brandId: savedParent.brandId,
                    season: savedParent.season,
                    collection: savedParent.collection,
                    composition: savedParent.composition,
                    careInstructions: savedParent.careInstructions,
                    originCountry: savedParent.originCountry,
                    returnPolicy: savedParent.returnPolicy,
                    parentProductId: savedParent.id,
                    isVariantParent: false,
                    imageUrl: savedParent.imageUrl,
                    isActive: true,
                });

                const savedVariant = await productRepo.save(variantEntity);

                // Atributos de la variante
                const attributesToSave = [
                    variantAttrRepo.create({
                        productId: savedVariant.id,
                        attributeKey: 'Color',
                        attributeValue: colorClean,
                    }),
                    variantAttrRepo.create({
                        productId: savedVariant.id,
                        attributeKey: 'Talle',
                        attributeValue: sizeClean,
                    }),
                ];

                if (cell.colorHex?.trim()) {
                    attributesToSave.push(
                        variantAttrRepo.create({
                            productId: savedVariant.id,
                            attributeKey: 'ColorHex',
                            attributeValue: cell.colorHex.trim(),
                        }),
                    );
                }

                await variantAttrRepo.save(attributesToSave);
                createdVariants.push(savedVariant);
            }

            return {
                parent: savedParent,
                variants: createdVariants,
                totalVariants: createdVariants.length,
            };
        });

        // Registrar movimientos de stock una vez commiteada la transacción
        for (let i = 0; i < result.variants.length; i++) {
            const variant = result.variants[i];
            const cell = dto.matrixCells[i];
            const initialCellStock = cell?.stock ?? 0;

            if (initialCellStock > 0) {
                await this.inventoryService.createMovement({
                    productId: variant.id,
                    type: StockMovementType.IN,
                    source: StockMovementSource.INITIAL_LOAD,
                    quantity: initialCellStock,
                    cost: variant.cost ?? 0,
                    notes: `Carga inicial de stock en matriz (${cell.color} / ${cell.size})`,
                    date: new Date().toISOString(),
                });
                variant.stock = initialCellStock;
            }
        }

        return result;
    }

    /**
     * Obtiene listas de temporadas y colecciones distintas existentes en el catálogo
     */
    async getApparelSuggestions(): Promise<{ seasons: string[]; collections: string[] }> {
        const rawSeasons = await this.productsRepository
            .createQueryBuilder('p')
            .select('DISTINCT p.season', 'season')
            .where('p.season IS NOT NULL AND p.season != :empty', { empty: '' })
            .getRawMany<{ season: string }>();

        const rawCollections = await this.productsRepository
            .createQueryBuilder('p')
            .select('DISTINCT p.collection', 'collection')
            .where('p.collection IS NOT NULL AND p.collection != :empty', { empty: '' })
            .getRawMany<{ collection: string }>();

        return {
            seasons: rawSeasons.map((r) => r.season).filter(Boolean),
            collections: rawCollections.map((r) => r.collection).filter(Boolean),
        };
    }

    /**
     * Obtiene todas las escalas de talles maestras
     */
    async getSizeScales(): Promise<SizeScaleTemplate[]> {
        return this.sizeScaleRepository.find({
            order: { sortOrder: 'ASC', name: 'ASC' },
        });
    }

    /**
     * Crea una nueva escala de talles personalizada
     */
    async createSizeScale(dto: CreateSizeScaleDto): Promise<SizeScaleTemplate> {
        const trimmedName = dto.name.trim();
        if (!trimmedName) {
            throw new BadRequestException('El nombre de la escala no puede estar vacío');
        }

        const existing = await this.sizeScaleRepository.findOne({
            where: { name: ILike(trimmedName) },
        });
        if (existing) {
            throw new ConflictException(`Ya existe una escala con el nombre "${trimmedName}"`);
        }

        const template = this.sizeScaleRepository.create({
            name: trimmedName,
            category: dto.category ?? null,
            sizes: dto.sizes.map((s) => s.trim()).filter(Boolean),
            sortOrder: dto.sortOrder ?? 0,
            isSystemPreset: false,
        });

        return this.sizeScaleRepository.save(template);
    }

    /**
     * Actualiza una escala de talles personalizada
     */
    async updateSizeScale(id: string, dto: UpdateSizeScaleDto): Promise<SizeScaleTemplate> {
        const template = await this.sizeScaleRepository.findOne({ where: { id } });
        if (!template) {
            throw new NotFoundException('Escala de talles no encontrada');
        }

        if (template.isSystemPreset) {
            throw new ForbiddenException('Las plantillas del sistema no pueden modificarse');
        }

        const trimmedName = dto.name.trim();
        if (trimmedName.toLowerCase() !== template.name.toLowerCase()) {
            const existing = await this.sizeScaleRepository.findOne({
                where: { name: ILike(trimmedName) },
            });
            if (existing && existing.id !== id) {
                throw new ConflictException(`Ya existe una escala con el nombre "${trimmedName}"`);
            }
        }

        template.name = trimmedName;
        template.category = dto.category ?? null;
        template.sizes = dto.sizes.map((s) => s.trim()).filter(Boolean);
        if (dto.sortOrder !== undefined) {
            template.sortOrder = dto.sortOrder;
        }

        return this.sizeScaleRepository.save(template);
    }

    /**
     * Elimina una escala de talles personalizada
     */
    async deleteSizeScale(id: string): Promise<{ message: string }> {
        const template = await this.sizeScaleRepository.findOne({ where: { id } });
        if (!template) {
            throw new NotFoundException('Escala de talles no encontrada');
        }

        if (template.isSystemPreset) {
            throw new ForbiddenException('Las plantillas del sistema no pueden ser eliminadas');
        }

        await this.sizeScaleRepository.remove(template);
        return { message: 'Escala de talles eliminada correctamente' };
    }

    /**
     * Obtiene todas las paletas de colores maestras
     */
    async getColorPalettes(): Promise<ColorPaletteTemplate[]> {
        return this.colorPaletteRepository.find({
            order: { sortOrder: 'ASC', name: 'ASC' },
        });
    }

    /**
     * Crea una nueva paleta de colores personalizada
     */
    async createColorPalette(dto: CreateColorPaletteDto): Promise<ColorPaletteTemplate> {
        const trimmedName = dto.name.trim();
        if (!trimmedName) {
            throw new BadRequestException('El nombre de la paleta no puede estar vacío');
        }

        const existing = await this.colorPaletteRepository.findOne({
            where: { name: ILike(trimmedName) },
        });
        if (existing) {
            throw new ConflictException(`Ya existe una paleta con el nombre "${trimmedName}"`);
        }

        const template = this.colorPaletteRepository.create({
            name: trimmedName,
            colors: dto.colors,
            sortOrder: dto.sortOrder ?? 0,
            isSystemPreset: false,
        });

        return this.colorPaletteRepository.save(template);
    }

    /**
     * Actualiza una paleta de colores personalizada
     */
    async updateColorPalette(id: string, dto: UpdateColorPaletteDto): Promise<ColorPaletteTemplate> {
        const template = await this.colorPaletteRepository.findOne({ where: { id } });
        if (!template) {
            throw new NotFoundException('Paleta de colores no encontrada');
        }

        if (template.isSystemPreset) {
            throw new ForbiddenException('Las plantillas del sistema no pueden modificarse');
        }

        const trimmedName = dto.name.trim();
        if (trimmedName.toLowerCase() !== template.name.toLowerCase()) {
            const existing = await this.colorPaletteRepository.findOne({
                where: { name: ILike(trimmedName) },
            });
            if (existing && existing.id !== id) {
                throw new ConflictException(`Ya existe una paleta con el nombre "${trimmedName}"`);
            }
        }

        template.name = trimmedName;
        template.colors = dto.colors;
        if (dto.sortOrder !== undefined) {
            template.sortOrder = dto.sortOrder;
        }

        return this.colorPaletteRepository.save(template);
    }

    /**
     * Elimina una paleta de colores personalizada
     */
    async deleteColorPalette(id: string): Promise<{ message: string }> {
        const template = await this.colorPaletteRepository.findOne({ where: { id } });
        if (!template) {
            throw new NotFoundException('Paleta de colores no encontrada');
        }

        if (template.isSystemPreset) {
            throw new ForbiddenException('Las plantillas del sistema no pueden ser eliminadas');
        }

        await this.colorPaletteRepository.remove(template);
        return { message: 'Paleta de colores eliminada correctamente' };
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
