import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockMovement, StockMovementType, StockMovementSource } from './entities/stock-movement.entity';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { Product } from '../products/entities/product.entity';
import { ConfigurationService } from '../configuration/configuration.service';

/**
 * Servicio de inventario - Gestiona movimientos de stock y alertas
 */
@Injectable()
export class InventoryService {
    constructor(
        @InjectRepository(StockMovement)
        private readonly stockMovementRepository: Repository<StockMovement>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        private readonly dataSource: DataSource,
        private readonly configurationService: ConfigurationService,
    ) { }

    /**
     * Crea un movimiento de stock (entrada o salida)
     */
    async createMovement(dto: CreateStockMovementDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const product = await this.productRepository.findOne({ where: { id: dto.productId } });
            if (!product) {
                throw new NotFoundException('Producto no encontrado');
            }

            // Validar stock suficiente para salidas (los movimientos de venta respetan allowOutOfStockSale)
            if (dto.type === StockMovementType.OUT && product.stock < dto.quantity) {
                const allowOutOfStock =
                    dto.source === StockMovementSource.SALE &&
                    await this.configurationService.isOutOfStockSaleAllowed();
                if (!allowOutOfStock) {
                    throw new BadRequestException(
                        `Stock insuficiente. Disponible: ${product.stock}, Solicitado: ${dto.quantity}`
                    );
                }
            }

            // Crear movimiento con source (default: ADJUSTMENT)
            const movement = this.stockMovementRepository.create({
                ...dto,
                source: dto.source ?? StockMovementSource.ADJUSTMENT,
                date: new Date(dto.date),
            });
            await queryRunner.manager.save(movement);

            // Actualizar stock del producto
            if (dto.type === StockMovementType.IN) {
                product.stock += dto.quantity;
                // Actualizar costo del producto si es un ingreso y trae costo (solo para compras)
                if (dto.cost && dto.source === StockMovementSource.PURCHASE) {
                    product.cost = dto.cost;
                    // Recalcular precio si tiene margen
                    if (product.profitMargin) {
                        product.price = product.cost * (1 + product.profitMargin / 100);
                        product.price = Math.round(product.price * 100) / 100;
                    }
                }
            } else {
                product.stock -= dto.quantity;
            }

            await queryRunner.manager.save(product);
            await queryRunner.commitTransaction();

            // Retornar movimiento con producto actualizado
            return {
                ...movement,
                product: {
                    id: product.id,
                    name: product.name,
                    stock: product.stock,
                },
            };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Obtiene el historial de movimientos de un producto
     */
    async getProductHistory(productId: string) {
        const product = await this.productRepository.findOne({ where: { id: productId } });
        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        const movements = await this.stockMovementRepository.find({
            where: { productId },
            order: { date: 'DESC', createdAt: 'DESC' },
        });

        return {
            product: {
                id: product.id,
                name: product.name,
                stock: product.stock,
            },
            movements,
        };
    }

    /**
     * Obtiene productos con stock bajo (menor o igual al mínimo configurado globalmente)
     */
    async getLowStockProducts() {
        const globalMinStock = await this.configurationService.getMinStockAlert();

        const products = await this.productRepository
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .where('product.isActive = :isActive', { isActive: true })
            .andWhere('product.stock <= :globalMinStock', { globalMinStock })
            .orderBy('product.stock', 'ASC')
            .getMany();

        return products;
    }

    /**
     * Obtiene productos sin stock
     */
    async getOutOfStockProducts() {
        return this.productRepository.find({
            where: { stock: 0, isActive: true },
            relations: ['category'],
            order: { name: 'ASC' },
        });
    }

    /**
     * Obtiene estadísticas generales de inventario
     */
    async getInventoryStats() {
        const globalMinStock = await this.configurationService.getMinStockAlert();

        const allProducts = await this.productRepository.find({
            where: { isActive: true },
        });

        const totalProducts = allProducts.length;
        const productsWithStock = allProducts.filter(p => p.stock > 0).length;
        const productsOutOfStock = allProducts.filter(p => p.stock === 0).length;
        const productsLowStock = allProducts.filter(p => p.stock > 0 && p.stock <= globalMinStock).length;

        // Calcular valor total del inventario (stock * costo)
        const totalInventoryValue = allProducts.reduce(
            (sum, p) => sum + (p.stock * p.cost),
            0
        );

        // Calcular valor total a precio de venta
        const totalInventorySaleValue = allProducts.reduce(
            (sum, p) => sum + (p.stock * (p.price ?? p.cost)),
            0
        );

        return {
            totalProducts,
            productsWithStock,
            productsOutOfStock,
            productsLowStock,
            totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
            totalInventorySaleValue: Math.round(totalInventorySaleValue * 100) / 100,
        };
    }

    /**
     * Obtiene todos los productos con su información de stock
     */
    async getAllProductsStock() {
        return this.productRepository.find({
            where: { isActive: true },
            relations: ['category'],
            order: { name: 'ASC' },
            select: ['id', 'name', 'sku', 'stock', 'cost', 'price'],
        });
    }

    /**
     * Valida si hay stock suficiente para múltiples productos
     */
    async validateStockAvailability(items: { productId: string; quantity: number }[]) {
        const insufficientProducts: { productId: string; name: string; requested: number; available: number }[] = [];

        for (const item of items) {
            const product = await this.productRepository.findOne({ where: { id: item.productId } });
            if (!product) {
                insufficientProducts.push({
                    productId: item.productId,
                    name: 'Producto no encontrado',
                    requested: item.quantity,
                    available: 0,
                });
                continue;
            }

            if (product.stock < item.quantity) {
                insufficientProducts.push({
                    productId: item.productId,
                    name: product.name,
                    requested: item.quantity,
                    available: product.stock,
                });
            }
        }

        return {
            available: insufficientProducts.length === 0,
            insufficientProducts,
        };
    }
}
