import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigurationService } from '../../configuration/configuration.service';
import { parseMatrixCsv, MatrixParseResult, MatrixParsedModel } from './parser-matrix-csv';
import { Product } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { Brand } from '../entities/brand.entity';
import { ProductVariantAttribute } from '../entities/product-variant-attribute.entity';

@Injectable()
export class MatrixImportService {
    private readonly logger = new Logger(MatrixImportService.name);

    constructor(
        private readonly dataSource: DataSource,
        private readonly configService: ConfigurationService,
    ) {}

    /**
     * Genera la plantilla CSV de ejemplo para carga matricial 2D
     */
    getTemplateCsv(): string {
        return `CODIGO_ESTILO,NOMBRE_MODELO,CATEGORIA,MARCA,TEMPORADA,COLECCION,COLOR,HEX_COLOR,COSTO_BASE,PRECIO_BASE,XS,S,M,L,XL,XXL
REM-101,Remera Lisa Algodón,Remeras,Levis,Primavera-Verano 2026,Línea Urbana,Negro,#18181b,4500,8900,2,5,10,10,5,2
REM-101,Remera Lisa Algodón,Remeras,Levis,Primavera-Verano 2026,Línea Urbana,Blanco,#ffffff,4500,8900,2,4,8,8,4,2
PAN-204,Jean Regular Fit,Pantalones,Taverniti,Otoño-Invierno 2026,Classic,Azul Marino,#1e3a8a,9500,18500,0,2,6,6,4,2`;
    }

    /**
     * Valida y genera la previsualización del CSV matricial sin persistir en BD
     */
    async preview(csv: string): Promise<MatrixParseResult> {
        const manifest = await this.configService.getCapabilitiesManifest();
        if (!manifest.capabilities['STRUCTURAL.variants']) {
            throw new ForbiddenException(
                'La importación matricial solo está habilitada para el rubro Indumentaria y Calzado.'
            );
        }

        if (!csv || csv.trim().length === 0) {
            throw new BadRequestException('El contenido del archivo CSV está vacío.');
        }

        return parseMatrixCsv(csv);
    }

    /**
     * Impacta de forma atómica todos los modelos y sus variantes en la base de datos
     */
    async commit(csv: string): Promise<{
        success: boolean;
        importedModels: number;
        importedVariants: number;
        totalStockUnits: number;
    }> {
        const previewResult = await this.preview(csv);

        if (previewResult.models.length === 0) {
            throw new BadRequestException('No se encontraron modelos válidos para importar en el archivo.');
        }

        return this.dataSource.transaction(async (manager) => {
            const productRepo = manager.getRepository(Product);
            const categoryRepo = manager.getRepository(Category);
            const brandRepo = manager.getRepository(Brand);
            const variantAttrRepo = manager.getRepository(ProductVariantAttribute);

            let totalVariants = 0;
            let totalStock = 0;

            for (const model of previewResult.models) {
                // 1. Resolver o buscar categoría
                let category: Category | null = null;
                if (model.categoryName) {
                    category = await categoryRepo.findOne({
                        where: { name: model.categoryName },
                    });
                    if (!category) {
                        category = await categoryRepo.save(
                            categoryRepo.create({ name: model.categoryName, isActive: true })
                        );
                    }
                }

                // 2. Resolver o buscar marca
                let brand: Brand | null = null;
                if (model.brandName) {
                    brand = await brandRepo.findOne({
                        where: { name: model.brandName },
                    });
                    if (!brand) {
                        const newBrand = brandRepo.create({ name: model.brandName });
                        brand = await brandRepo.save(newBrand);
                    }
                }

                // 3. Crear Producto Padre
                const parent = productRepo.create({
                    name: model.name,
                    sku: model.styleCode || null,
                    cost: model.cost ?? 0,
                    price: model.price ?? null,
                    stock: 0, // Se consolida con las variantes
                    categoryId: category?.id ?? null,
                    brandId: brand?.id ?? null,
                    season: model.season ?? null,
                    collection: model.collection ?? null,
                    isVariantParent: true,
                    isActive: true,
                    isMeasure: false,
                    useManualPrice: model.price !== undefined && model.price !== null,
                });

                const savedParent = await productRepo.save(parent);

                // 4. Crear Variantes
                for (const variant of model.variants) {
                    const variantSku = variant.sku || `${model.styleCode || 'PROD'}-${variant.color.substring(0, 3).toUpperCase()}-${variant.size}`;
                    const variantName = `${model.name} - ${variant.color} / ${variant.size}`;

                    const variantProduct = productRepo.create({
                        name: variantName,
                        sku: variantSku,
                        cost: variant.cost ?? model.cost ?? 0,
                        price: variant.price ?? model.price ?? null,
                        stock: variant.stock,
                        categoryId: category?.id ?? null,
                        brandId: brand?.id ?? null,
                        season: model.season ?? null,
                        collection: model.collection ?? null,
                        parentProductId: savedParent.id,
                        isVariantParent: false,
                        isActive: true,
                        isMeasure: false,
                        useManualPrice: variant.price !== undefined && variant.price !== null,
                    });

                    const savedVariant = await productRepo.save(variantProduct);

                    // Atributos normalizados (Color y Talle)
                    const colorAttr = variantAttrRepo.create({
                        productId: savedVariant.id,
                        attributeKey: 'color',
                        attributeValue: variant.color,
                    });
                    const sizeAttr = variantAttrRepo.create({
                        productId: savedVariant.id,
                        attributeKey: 'size',
                        attributeValue: variant.size,
                    });

                    await variantAttrRepo.save([colorAttr, sizeAttr]);

                    totalVariants++;
                    totalStock += variant.stock;
                }
            }

            return {
                success: true,
                importedModels: previewResult.models.length,
                importedVariants: totalVariants,
                totalStockUnits: totalStock,
            };
        });
    }
}
