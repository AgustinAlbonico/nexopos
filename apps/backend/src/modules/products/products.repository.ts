import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { QueryProductsDTO } from './dto/query-products.dto';
import { ProductPack } from './entities/product-pack.entity';

@Injectable()
export class ProductsRepository extends Repository<Product> {
    constructor(private readonly dataSource: DataSource) {
        super(Product, dataSource.createEntityManager());
    }

    async findWithFilters(
        filters: QueryProductsDTO,
        minStockAlert?: number,
    ): Promise<[Product[], number]> {
        const { page, limit, search, categoryId, brandId, isActive, stockStatus, sortBy, order, excludeVariantParents } = filters;

        const query = this.createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.brand', 'brand');

        // Excluir productos padre si se solicita
        if (excludeVariantParents) {
            query.andWhere('product.isVariantParent = false');
        }

        // Búsqueda por texto
        if (search) {
            query.andWhere(
                '(product.name ILIKE :search OR product.description ILIKE :search OR product.sku ILIKE :search OR product.barcode ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        // Filtro por categoría
        if (categoryId) {
            query.andWhere('product.categoryId = :categoryId', { categoryId });
        }

        // Filtro por marca
        if (brandId) {
            query.andWhere('product.brandId = :brandId', { brandId });
        }

        // Filtro por estado
        if (isActive !== undefined) {
            query.andWhere('product.isActive = :isActive', { isActive });
        }

        // Filtro por stock crítico (sin stock o bajo stock)
        if (stockStatus === 'critical' && minStockAlert !== undefined) {
            query.andWhere('product.stock <= :minStock', { minStock: minStockAlert });
        }

        // Ordenamiento
        query.orderBy(`product.${sortBy}`, order);

        // Paginación
        query.skip((page - 1) * limit).take(limit);

        return query.getManyAndCount();
    }

    async findByBarcode(barcode: string): Promise<Product | null> {
        const product = await this.findOne({ where: { barcode }, relations: ['packs', 'bundleComponents', 'bundleComponents.componentProduct'] });
        if (product) {
            return product;
        }
        const pack = await this.dataSource.getRepository(ProductPack).findOne({
            where: { packBarcode: barcode },
            relations: ['product', 'product.packs', 'product.bundleComponents', 'product.bundleComponents.componentProduct'],
        });
        return pack?.product ?? null;
    }

    async findBySku(sku: string): Promise<Product | null> {
        return this.findOne({ where: { sku } });
    }

    async findActiveProducts(): Promise<Product[]> {
        return this.find({
            where: { isActive: true },
            relations: ['category'],
            order: { name: 'ASC' },
        });
    }
}

