import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In } from 'typeorm';
import { StockMovement, StockMovementType, StockMovementSource } from './entities/stock-movement.entity';
import { Location } from './entities/location.entity';
import { ProductLocationStock } from './entities/product-location-stock.entity';
import { StockTransfer, StockTransferStatus } from './entities/stock-transfer.entity';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { Product } from '../products/entities/product.entity';
import { ConfigurationService } from '../configuration/configuration.service';

/**
 * Servicio de inventario - Gestiona movimientos de stock y alertas.
 *
 * Modo simple (default): `Product.stock` es la única verdad y se escribe
 * directamente acá, igual que antes.
 *
 * Modo sectorizado: cada escritura pasa por `recordMovementInLocation`, que
 * debita/acredita `product_location_stock`, recalcula el cache
 * `Product.stock = SUM(...)`, y registra `StockMovement.locationId`.
 * Los traslados entre ubicaciones van por `transfer`, atómico.
 */
@Injectable()
export class InventoryService {
    constructor(
        @InjectRepository(StockMovement)
        private readonly stockMovementRepository: Repository<StockMovement>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @InjectRepository(Location)
        private readonly locationRepository: Repository<Location>,
        @InjectRepository(ProductLocationStock)
        private readonly plsRepository: Repository<ProductLocationStock>,
        private readonly dataSource: DataSource,
        private readonly configurationService: ConfigurationService,
    ) { }

    // Modo sectorizado: detectores de configuración. Sin cache intencionalmente:
    // el volumen no lo justifica; si en el futuro el costo es relevante, cachear
    // en una capa superior. ponytail: skip cache, add when measured.

    async isSectorizedMode(): Promise<boolean> {
        const config = await this.configurationService.getConfiguration();
        return Boolean(config?.stockSectorizado);
    }

    async getPrimarySaleLocationId(): Promise<string | null> {
        const config = await this.configurationService.getConfiguration();
        return config?.primarySaleLocationId ?? null;
    }

    async getDefaultReceiveLocationId(): Promise<string | null> {
        const config = await this.configurationService.getConfiguration();
        return config?.defaultReceiveLocationId ?? null;
    }

    async getStockMinimoVenta(): Promise<number> {
        const config = await this.configurationService.getConfiguration();
        return Number(config?.stockMinimoVenta ?? 5);
    }

    /**
     * Lista ubicaciones alternativas (distintas de la primaria de venta)
     * que tienen stock del producto. Si hay coincidencias exactas
     * (available >= qty), devuelve esas, ordenadas de mayor a menor
     * disponible. Si no hay ninguna coincidencia exacta, devuelve el top-3
     * por disponible (parciales) para que la UI muestre opciones aunque
     * ninguna cubra el total.
     *
     * Solo aplica en modo sectorizado; en modo simple devuelve [].
     * Read-only; sin side-effects.
     */
    async findReplenishmentOptions(
        productId: string,
        qty: number,
    ): Promise<Array<{ locationId: string; locationName: string; available: number }>> {
        if (!(await this.isSectorizedMode())) {
            return [];
        }
        const primaryId = await this.getPrimarySaleLocationId();

        const locations = await this.dataSource.getRepository(Location).find({
            where: { isActive: true },
        });
        const candidateLocations = locations.filter((l) => l.id !== primaryId);
        if (candidateLocations.length === 0) {
            return [];
        }

        const pls = await this.dataSource.getRepository(ProductLocationStock).find({
            where: {
                productId,
                locationId: In(candidateLocations.map((l) => l.id)),
            },
        });

        const enriched = candidateLocations.map((loc) => {
            const stock = pls.find((s) => s.locationId === loc.id);
            return {
                locationId: loc.id,
                locationName: loc.name,
                available: stock ? Number(stock.quantity) : 0,
            };
        });

        const full = enriched
            .filter((o) => o.available >= qty)
            .sort((a, b) => b.available - a.available);
        if (full.length > 0) {
            return full;
        }

        return enriched
            .filter((o) => o.available > 0)
            .sort((a, b) => b.available - a.available)
            .slice(0, 3);
    }

    /**
     * Saldo de un producto en una ubicación.
     * - Modo sectorizado: lee `product_location_stock`.
     * - Modo simple: el stock vive en `Product.stock`; sin
     *   desglose por ubicación.
     */
    async findStockByLocation(productId: string, locationId: string): Promise<number | null> {
        const pls = await this.productRepository
            .createQueryBuilder()
            .relation(Product, 'productLocationStocks')
            .of(productId)
            .loadMany<unknown>()
            .catch(() => null);
        // Más directo: query al repo via manager (sectorizado) o
        // product.stock (simple).
        if (await this.isSectorizedMode()) {
            const stock = await this.dataSource
                .getRepository(ProductLocationStock)
                .findOne({ where: { productId, locationId } });
            return stock ? Number(stock.quantity) : 0;
        }
        // Modo simple: no hay desglose; lo dejamos explícito.
        if (pls === null) return null;
        return null;
    }

    /**
     * Crea un movimiento de stock (entrada o salida).
     * Back-compat: la firma y el comportamiento simple-mode son idénticos a la
     * versión previa. Si el modo sectorizado está activo, delega en
     * `recordMovementInLocation` para escribir el saldo por ubicación.
     */
    async createMovement(dto: CreateStockMovementDto) {
        if (await this.isSectorizedMode()) {
            const locationId = await this.getPrimarySaleLocationId();
            if (!locationId) {
                throw new BadRequestException(
                    'Modo sectorizado activo pero no hay ubicación principal de venta configurada',
                );
            }
            const allowOutOfStock =
                dto.source === StockMovementSource.SALE &&
                await this.configurationService.isOutOfStockSaleAllowed();
            return this.recordMovementInLocation({
                productId: dto.productId,
                locationId,
                type: dto.type,
                source: dto.source ?? StockMovementSource.ADJUSTMENT,
                quantity: dto.quantity,
                cost: dto.cost,
                notes: dto.notes,
                allowOutOfStock,
                date: new Date(dto.date),
            });
        }

        // --- Modo simple: comportamiento original intacto ---
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
     * Registra un movimiento tocando `product_location_stock` y
     * `Product.stock` (modo sectorizado) o solo `Product.stock` (modo simple).
     * Una sola transacción.
     *
     * Acepta `locationId` opcional: si no viene y el modo sectorizado está
     * activo, usa la ubicación principal de venta.
     * Acepta `manager` opcional: si viene, NO abre tx propia — opera dentro
     * de la transacción del caller (usado por `completeSaleAfterReplenishment`
     * para garantizar atomicidad total).
     */
    async recordMovementInLocation(opts: {
        productId: string;
        locationId?: string;
        type: StockMovementType;
        source?: StockMovementSource;
        quantity: number;
        cost?: number;
        notes?: string;
        allowOutOfStock?: boolean;
        date?: Date;
        manager?: EntityManager;
    }) {
        if (opts.manager) {
            return this.executeRecordMovement(opts, opts.manager);
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const result = await this.executeRecordMovement(opts, queryRunner.manager);
            await queryRunner.commitTransaction();
            return result;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    private async executeRecordMovement(
        opts: {
            productId: string;
            locationId?: string;
            type: StockMovementType;
            source?: StockMovementSource;
            quantity: number;
            cost?: number;
            notes?: string;
            allowOutOfStock?: boolean;
            date?: Date;
        },
        manager: EntityManager,
    ) {
        const product = await manager.findOne(Product, { where: { id: opts.productId } });
        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        const sectorized = await this.isSectorizedMode();
        const source = opts.source ?? StockMovementSource.ADJUSTMENT;
        const allowOutOfStock = opts.allowOutOfStock ?? false;
        const date = opts.date ?? new Date();

        let locationId: string | null = null;
        if (sectorized) {
            locationId = opts.locationId ?? null;
            if (!locationId) {
                locationId = await this.getPrimarySaleLocationId();
                if (!locationId) {
                    throw new BadRequestException(
                        'Modo sectorizado activo pero no hay ubicación principal de venta configurada',
                    );
                }
            }
        }

        // Saldo por ubicación (solo sectorizado).
        let locationStock: ProductLocationStock | null = null;
        if (sectorized && locationId) {
            locationStock = await manager.findOne(ProductLocationStock, {
                where: { productId: opts.productId, locationId },
            }) ?? null;
            if (!locationStock) {
                locationStock = manager.create(ProductLocationStock, {
                    productId: opts.productId,
                    locationId,
                    quantity: 0,
                });
            }
        }

        // Validación de stock (sale contra el saldo aplicable: ubicación en
        // sectorizado, total en simple).
        const currentAvailable = sectorized && locationStock
            ? Number(locationStock.quantity)
            : product.stock;

        if (opts.type === StockMovementType.OUT && currentAvailable < opts.quantity && !allowOutOfStock) {
            const msg = sectorized
                ? `Stock insuficiente en la ubicación. Disponible: ${currentAvailable}, Solicitado: ${opts.quantity}`
                : `Stock insuficiente. Disponible: ${currentAvailable}, Solicitado: ${opts.quantity}`;
            throw new BadRequestException(msg);
        }

        // Aplicar el cambio sobre el saldo correspondiente.
        if (opts.type === StockMovementType.IN) {
            product.stock += opts.quantity;
            if (opts.cost && source === StockMovementSource.PURCHASE) {
                product.cost = opts.cost;
                if (product.profitMargin) {
                    product.price = Math.round(product.cost * (1 + product.profitMargin / 100) * 100) / 100;
                }
            }
            if (locationStock) {
                locationStock.quantity = Number(locationStock.quantity) + opts.quantity;
            }
        } else {
            product.stock -= opts.quantity;
            if (locationStock) {
                locationStock.quantity = Number(locationStock.quantity) - opts.quantity;
            }
        }

        await manager.save(product);
        if (locationStock) {
            await manager.save(locationStock);
        }

        // Movimiento (con locationId en sectorizado, null en simple).
        const movement = manager.create(StockMovement, {
            productId: opts.productId,
            type: opts.type,
            source,
            quantity: opts.quantity,
            cost: opts.cost,
            notes: opts.notes,
            date,
            locationId,
        });
        await manager.save(movement);

        return {
            ...movement,
            product: {
                id: product.id,
                name: product.name,
                stock: product.stock,
            },
        };
    }

    /**
     * Traslado atómico entre dos ubicaciones (modo sectorizado).
     *
     * En una sola transacción:
     *  - valida origen y destino (activos, distintos)
     *  - valida saldo suficiente en origen
     *  - debita `ProductLocationStock` origen
     *  - acredita `ProductLocationStock` destino
     *  - recalcula `Product.stock = SUM(...)` (sin cambio: traslados no
     *    modifican el total)
     *  - registra `StockTransfer` (status COMPLETADO)
     *  - registra dos `StockMovement` (OUT en origen, IN en destino) con
     *    `source = TRANSFER`
     *
     * Acepta `manager` opcional: si viene, NO abre tx propia — opera dentro
     * de la transacción del caller. Usado por `SalesService.completeSaleAfterReplenishment`
     * para garantizar atomicidad total (transfer + sale en una sola tx).
     *
     * Falla rápido: cualquier validación rota la transacción entera y
     * devuelve el error original.
     */
    async transfer(opts: {
        productId: string;
        fromLocationId: string;
        toLocationId: string;
        quantity: number;
        reason?: string;
        userId?: string;
        manager?: EntityManager;
    }): Promise<StockTransfer> {
        if (opts.quantity <= 0) {
            throw new BadRequestException('La cantidad a trasladar debe ser mayor a 0');
        }
        if (opts.fromLocationId === opts.toLocationId) {
            throw new BadRequestException('La ubicación de origen y destino deben ser distintas');
        }

        if (opts.manager) {
            return this.executeTransfer(opts, opts.manager);
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const saved = await this.executeTransfer(opts, queryRunner.manager);
            await queryRunner.commitTransaction();
            return saved;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Cuerpo de `transfer` reutilizable por callers que ya tienen un
     * `EntityManager` (sin abrir/cerrar tx propia).
     */
    private async executeTransfer(
        opts: {
            productId: string;
            fromLocationId: string;
            toLocationId: string;
            quantity: number;
            reason?: string;
            userId?: string;
        },
        manager: EntityManager,
    ): Promise<StockTransfer> {
        // Verificar producto.
        const product = await manager.findOne(Product, { where: { id: opts.productId } });
        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        // Verificar ubicaciones activas.
        const from = await manager.findOne(Location, { where: { id: opts.fromLocationId } });
        const to = await manager.findOne(Location, { where: { id: opts.toLocationId } });
        if (!from || !from.isActive) {
            throw new BadRequestException('Ubicación de origen inactiva o inexistente');
        }
        if (!to || !to.isActive) {
            throw new BadRequestException('Ubicación de destino inactiva o inexistente');
        }

        // Obtener/crear saldos por ubicación.
        const fromStock = await this.getOrCreatePls(manager, opts.productId, opts.fromLocationId);
        const toStock = await this.getOrCreatePls(manager, opts.productId, opts.toLocationId);

        // Validar saldo.
        if (Number(fromStock.quantity) < opts.quantity) {
            throw new BadRequestException(
                `Saldo insuficiente en origen. Disponible: ${fromStock.quantity}, Solicitado: ${opts.quantity}`,
            );
        }

        // Aplicar el traslado.
        fromStock.quantity = Number(fromStock.quantity) - opts.quantity;
        toStock.quantity = Number(toStock.quantity) + opts.quantity;
        await manager.save([fromStock, toStock]);

        // Recalcular Product.stock = SUM(product_location_stock) — el
        // total no cambia, pero lo persistimos igual para mantener el
        // cache en sync.
        const rows: Array<{ total: string }> = await manager.query(
            `SELECT COALESCE(SUM("quantity"), 0)::text AS total
             FROM "product_location_stocks"
             WHERE "productId" = $1`,
            [opts.productId],
        );
        product.stock = Number.parseFloat(rows[0]?.total ?? '0');
        await manager.save(product);

        // Registrar el StockTransfer (status COMPLETADO por default).
        const transfer = manager.create(StockTransfer, {
            productId: opts.productId,
            fromLocationId: opts.fromLocationId,
            toLocationId: opts.toLocationId,
            quantity: opts.quantity,
            reason: opts.reason ?? null,
            createdById: opts.userId ?? null,
            status: StockTransferStatus.COMPLETADO,
        });
        const savedTransfer = await manager.save(transfer);

        // Dos movimientos: OUT en origen, IN en destino (source = TRANSFER).
        const movements = [
            manager.create(StockMovement, {
                productId: opts.productId,
                type: StockMovementType.OUT,
                source: StockMovementSource.TRANSFER,
                quantity: opts.quantity,
                locationId: opts.fromLocationId,
                notes: `Traslado a ${to.name}`,
                date: new Date(),
            }),
            manager.create(StockMovement, {
                productId: opts.productId,
                type: StockMovementType.IN,
                source: StockMovementSource.TRANSFER,
                quantity: opts.quantity,
                locationId: opts.toLocationId,
                notes: `Traslado desde ${from.name}`,
                date: new Date(),
            }),
        ];
        await manager.save(movements);

        return savedTransfer;
    }

    /**
     * Helper interno: obtiene o crea la fila de `product_location_stock` para
     * el par (producto, ubicación) dentro del manager transaccional.
     */
    private async getOrCreatePls(
        manager: EntityManager,
        productId: string,
        locationId: string,
    ): Promise<ProductLocationStock> {
        const existing = await manager.findOne(ProductLocationStock, { where: { productId, locationId } });
        if (existing) return existing;
        return manager.create(ProductLocationStock, {
            productId,
            locationId,
            quantity: 0,
        });
    }

    /**
     * Wrapper público de `transfer` para el endpoint `POST /inventory/transfers`
     * (PR9). Toma el usuario autenticado del request y delega. Misma
     * atomicidad que el flujo POS (PR4/8).
     */
    async createTransfer(
        dto: CreateStockTransferDto,
        userId?: string,
    ): Promise<StockTransfer> {
        return this.transfer({
            productId: dto.productId,
            fromLocationId: dto.fromLocationId,
            toLocationId: dto.toLocationId,
            quantity: dto.quantity,
            reason: dto.reason,
            userId,
        });
    }

    /**
     * Desglose de stock por ubicación para un producto (PR9).
     * Devuelve TODAS las ubicaciones activas con su saldo; el frontend
     * decide si mostrar la primaria como referencia o no. En modo simple
     * devuelve un solo row "global" derivado de `Product.stock` con
     * `locationId: null` para que la UI pueda degradar el componente sin
     * condicionales por modo.
     */
    async getProductStockByLocation(
        productId: string,
    ): Promise<Array<{ locationId: string; locationName: string; function: string; quantity: number }>> {
        const product = await this.productRepository.findOne({ where: { id: productId } });
        if (!product) {
            throw new NotFoundException('Producto no encontrado');
        }

        if (!(await this.isSectorizedMode())) {
            return [
                {
                    locationId: '',
                    locationName: 'Stock total',
                    function: 'SALE',
                    quantity: Number(product.stock),
                },
            ];
        }

        const locations = await this.locationRepository.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });
        const plsRows = await this.plsRepository.find({ where: { productId } });
        const plsMap = new Map(plsRows.map((p) => [p.locationId, Number(p.quantity)]));

        return locations.map((l) => ({
            locationId: l.id,
            locationName: l.name,
            function: l.function,
            quantity: plsMap.get(l.id) ?? 0,
        }));
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
     * Obtiene productos con stock bajo (menor o igual al mínimo configurado globalmente).
     *
     * @deprecated Mantenido para back-compat del endpoint `GET /inventory/low-stock`.
     * Usar `getStockAlerts()` que separa compra (total) vs reposición (salón).
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
     * Alertas separadas para modo sectorizado.
     *
     * - `purchaseAlerts`: productos con `product.stock <= minStockAlert`.
     *   Lista plana de productos a reponer vía compra. Mismo cálculo que
     *   `getLowStockProducts` (total consolidado), con shape explícito.
     * - `replenishmentAlerts`: solo modo sectorizado. Productos donde el
     *   stock en la ubicación principal de venta es `<= stockMinimoVenta`.
     *   En modo simple la lista es siempre vacía.
     *
     * Cada `replenishmentAlert` viene enriquecida (PR9) con:
     *  - `suggestedSourceLocationId`: ubicación (≠ primaria de venta) con
     *    mayor saldo del producto. `null` si no hay de dónde sacar.
     *  - `suggestedQuantity`: `max(0, minimum - currentLocationStock)`.
     *  - `reserveStock`: suma de saldos en ubicaciones distintas de la
     *    primaria (incluye orígenes inactivos solo si su `quantity > 0`,
     *    no se filtran acá — `findReplenishmentOptions` ya filtra activas).
     *
     * El cálculo se hace con UNA consulta adicional por producto usando
     * `In(productIds)` para mantener el costo acotado.
     */
    async getStockAlerts(): Promise<{
        purchaseAlerts: Array<{ productId: string; productName: string; currentStock: number; minimum: number }>;
        replenishmentAlerts: Array<{
            productId: string;
            productName: string;
            currentLocationStock: number;
            minimum: number;
            suggestedSourceLocationId: string | null;
            suggestedQuantity: number;
            reserveStock: number;
        }>;
    }> {
        const globalMinStock = await this.configurationService.getMinStockAlert();

        const lowStockProducts = await this.productRepository
            .createQueryBuilder('product')
            .where('product.isActive = :isActive', { isActive: true })
            .andWhere('product.stock <= :globalMinStock', { globalMinStock })
            .orderBy('product.stock', 'ASC')
            .getMany();

        const purchaseAlerts = lowStockProducts.map((p) => ({
            productId: p.id,
            productName: p.name,
            currentStock: Number(p.stock),
            minimum: globalMinStock,
        }));

        let replenishmentAlerts: Array<{
            productId: string;
            productName: string;
            currentLocationStock: number;
            minimum: number;
            suggestedSourceLocationId: string | null;
            suggestedQuantity: number;
            reserveStock: number;
        }> = [];

        if (await this.isSectorizedMode()) {
            const primaryId = await this.getPrimarySaleLocationId();
            if (primaryId) {
                const stockMinimoVenta = await this.getStockMinimoVenta();
                const rows: Array<{ productId: string; quantity: string | number; product: { id: string; name: string } }> = await this.dataSource
                    .getRepository(ProductLocationStock)
                    .createQueryBuilder('pls')
                    .innerJoinAndSelect('pls.product', 'product')
                    .where('pls.locationId = :locId', { locId: primaryId })
                    .andWhere('product.isActive = :isActive', { isActive: true })
                    .andWhere('pls.quantity <= :min', { min: stockMinimoVenta })
                    .orderBy('pls.quantity', 'ASC')
                    .getMany();

                if (rows.length > 0) {
                    const productIds = rows.map((r) => r.productId);
                    const altRows: Array<{
                        productId: string;
                        locationId: string;
                        quantity: string | number;
                    }> = await this.dataSource
                        .getRepository(ProductLocationStock)
                        .createQueryBuilder('pls')
                        .where('pls.productId IN (:...productIds)', { productIds })
                        .andWhere('pls.locationId <> :primaryId', { primaryId })
                        .orderBy('pls.quantity', 'DESC')
                        .getMany();

                    const byProduct = new Map<string, typeof altRows>();
                    for (const r of altRows) {
                        const arr = byProduct.get(r.productId) ?? [];
                        arr.push(r);
                        byProduct.set(r.productId, arr);
                    }

                    replenishmentAlerts = rows.map((r) => {
                        const alts = byProduct.get(r.productId) ?? [];
                        const top = alts[0] ?? null;
                        const reserveStock = alts.reduce(
                            (sum, a) => sum + Number(a.quantity),
                            0,
                        );
                        const currentLocationStock = Number(r.quantity);
                        return {
                            productId: r.productId,
                            productName: r.product.name,
                            currentLocationStock,
                            minimum: stockMinimoVenta,
                            suggestedSourceLocationId: top ? top.locationId : null,
                            suggestedQuantity: Math.max(
                                0,
                                stockMinimoVenta - currentLocationStock,
                            ),
                            reserveStock,
                        };
                    });
                }
            }
        }

        return { purchaseAlerts, replenishmentAlerts };
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

    // --- Locations CRUD (PR7) -------------------------------------------
    // CRUD mínimo de ubicaciones para el frontend (PR7). Las partial unique
    // indexes UQ_locations_name / UQ_locations_primary_sale /
    // UQ_locations_default_receive ya están definidas en la migración
    // 1770000000000; este servicio solo traduce las QueryFailedError en 409.
    // ponytail: si la lista crece, extraer a LocationsService. Por ahora
    // conviven con el resto del módulo de inventario.

    /** Lista ubicaciones (activas primero, inactivas al final). */
    async listLocations(): Promise<Location[]> {
        return this.locationRepository.find({
            order: { isActive: 'DESC', name: 'ASC' },
        });
    }

    /** Crea una ubicación. */
    async createLocation(dto: CreateLocationDto): Promise<Location> {
        try {
            const loc = this.locationRepository.create({
                name: dto.name.trim(),
                function: dto.function,
                isActive: true,
                isPrimarySale: Boolean(dto.isPrimarySale),
                isDefaultReceive: Boolean(dto.isDefaultReceive),
            });
            return await this.locationRepository.save(loc);
        } catch (err) {
            if (this.isUniqueViolation(err)) {
                throw new ConflictException(
                    'Ya existe una ubicación con ese nombre o con ese rol (primaria de venta / destino de compras)',
                );
            }
            throw err;
        }
    }

    /** Actualiza una ubicación. */
    async updateLocation(id: string, dto: UpdateLocationDto): Promise<Location> {
        const loc = await this.locationRepository.findOne({ where: { id } });
        if (!loc) {
            throw new NotFoundException('Ubicación no encontrada');
        }
        if (dto.name !== undefined) {
            loc.name = dto.name.trim();
        }
        if (dto.function !== undefined) {
            loc.function = dto.function;
        }
        if (dto.isPrimarySale !== undefined) {
            // Solo se puede promover a primaria si la ubicación está activa.
            if (dto.isPrimarySale && !loc.isActive) {
                throw new BadRequestException(
                    'No se puede marcar como primaria de venta una ubicación inactiva',
                );
            }
            loc.isPrimarySale = dto.isPrimarySale;
        }
        if (dto.isDefaultReceive !== undefined) {
            if (dto.isDefaultReceive && !loc.isActive) {
                throw new BadRequestException(
                    'No se puede marcar como destino de compras una ubicación inactiva',
                );
            }
            loc.isDefaultReceive = dto.isDefaultReceive;
        }
        try {
            return await this.locationRepository.save(loc);
        } catch (err) {
            if (this.isUniqueViolation(err)) {
                throw new ConflictException(
                    'Ya existe una ubicación con ese nombre o con ese rol',
                );
            }
            throw err;
        }
    }

    /**
     * Desactiva una ubicación. Falla con 409 si tiene saldo > 0 en
     * cualquier producto (no se puede desactivar sin vaciarla primero —
     * los traslados los maneja PR9).
     */
    async deactivateLocation(id: string): Promise<Location> {
        const loc = await this.locationRepository.findOne({ where: { id } });
        if (!loc) {
            throw new NotFoundException('Ubicación no encontrada');
        }
        if (!loc.isActive) {
            return loc; // idempotente
        }
        const nonZero = await this.plsRepository
            .createQueryBuilder('pls')
            .where('pls.locationId = :id', { id })
            .andWhere('pls.quantity <> 0')
            .getCount();
        if (nonZero > 0) {
            throw new ConflictException(
                'No se puede desactivar la ubicación: tiene productos con saldo distinto de 0. Trasladá o vendé todo el stock antes de desactivarla.',
            );
        }
        loc.isActive = false;
        return this.locationRepository.save(loc);
    }

    private isUniqueViolation(err: unknown): boolean {
        // postgres unique_violation = 23510; sqlite CONSTRAINT = 'SQLITE_CONSTRAINT'
        const code = (err as { code?: string })?.code;
        return code === '23510' || code === 'SQLITE_CONSTRAINT' || code === '23505';
    }
}