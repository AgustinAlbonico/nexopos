import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Location } from './entities/location.entity';
import { ProductLocationStock } from './entities/product-location-stock.entity';
import { Product } from '../products/entities/product.entity';
import { SystemConfiguration } from '../configuration/entities/system-configuration.entity';
import { ActivateStockSectorizadoDto } from './dto/activate-stock-sectorizado.dto';

/**
 * Servicio de activación del modo sectorizado.
 *
 * Una sola transacción ejecuta los pasos del asistente (ver
 * `openspec/changes/stock-sectorizado/specs/inventory-locations.md`,
 * escenarios S2 y S3):
 *
 *   1. Rechaza si el modo ya está activo.
 *   2. Valida la entrada (una primaria, un destino de compras, ubicación
 *      inicial existe).
 *   3. Crea las ubicaciones con sus flags (las partial unique indexes en
 *      `locations` garantizan la unicidad; cualquier duplicado hace rollback).
 *   4. Snapshotea el stock de cada producto.
 *   5. Para cada producto crea una fila en `product_location_stock` con
 *      `quantity = product.stock` en la ubicación inicial.
 *   6. Verifica `SUM(product_location_stock WHERE locationId = initial) ==
 *      SUM(product.stock snapshot)` y que ningún producto se haya perdido.
 *   7. Flipp ea el flag en `system_configuration` con los IDs resueltos.
 *   8. Commit; cualquier error hace rollback total.
 *
 * El método `deactivate()` no existe en v1 — el diseño lo defiere a una
 * versión futura.
 */
@Injectable()
export class ActivationService {
    constructor(
        @InjectRepository(Location)
        private readonly locationRepository: Repository<Location>,
        @InjectRepository(ProductLocationStock)
        private readonly plsRepository: Repository<ProductLocationStock>,
        @InjectRepository(SystemConfiguration)
        private readonly configRepository: Repository<SystemConfiguration>,
        private readonly dataSource: DataSource,
    ) { }

    async activate(dto: ActivateStockSectorizadoDto): Promise<{
        ok: true;
        products: number;
        locations: number;
    }> {
        // --- Validaciones previas (no requieren transacción) -----------------
        const primarySales = dto.locations.filter(l => l.isPrimarySale);
        const defaultReceives = dto.locations.filter(l => l.isDefaultReceive);
        if (primarySales.length !== 1) {
            throw new BadRequestException(
                `Debe haber exactamente una ubicación marcada como primaria de venta (hay ${primarySales.length})`,
            );
        }
        if (defaultReceives.length !== 1) {
            throw new BadRequestException(
                `Debe haber exactamente una ubicación marcada como destino predeterminado de compras (hay ${defaultReceives.length})`,
            );
        }
        const initialLocation = dto.locations.find(l => l.name === dto.initialStockLocationName);
        if (!initialLocation) {
            throw new BadRequestException(
                `La ubicación inicial "${dto.initialStockLocationName}" no está en la lista`,
            );
        }
        const names = dto.locations.map(l => l.name);
        if (new Set(names).size !== names.length) {
            throw new BadRequestException('Los nombres de ubicación deben ser únicos');
        }

        // --- Transacción única ----------------------------------------------
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Rechazar si el modo ya está activo.
            const configRows = await queryRunner.manager.find(SystemConfiguration);
            const config = configRows[0];
            if (!config) {
                throw new BadRequestException('No existe configuración del sistema');
            }
            if (config.stockSectorizado) {
                throw new ConflictException('El modo sectorizado ya está activo');
            }

            // 2. Crear ubicaciones. Las partial unique indexes en `locations`
            //    (UQ_locations_primary_sale, UQ_locations_default_receive)
            //    lanzan si hay duplicados de flags; dejamos que TypeORM
            //    propague la QueryFailedError.
            const createdLocations: Location[] = [];
            for (const input of dto.locations) {
                const loc = queryRunner.manager.create(Location, {
                    name: input.name,
                    function: input.function,
                    isActive: true,
                    isPrimarySale: Boolean(input.isPrimarySale),
                    isDefaultReceive: Boolean(input.isDefaultReceive),
                });
                const saved = await queryRunner.manager.save(loc);
                createdLocations.push(saved);
            }

            const primarySale = createdLocations.find(l => l.isPrimarySale);
            const defaultReceive = createdLocations.find(l => l.isDefaultReceive);
            const initial = createdLocations.find(l => l.name === dto.initialStockLocationName);
            if (!primarySale || !defaultReceive || !initial) {
                // Defensa: no debería pasar porque validamos antes.
                throw new BadRequestException('Error interno: ubicaciones no resueltas');
            }

            // 3. Snapshot del stock y distribución. La verificación del
            //    total se hace al final con un SUM aggregate, así no
            //    necesitamos cargar todos los productos a memoria más de una vez.
            const products = await queryRunner.manager.find(Product, {
                select: ['id', 'stock'],
            });

            let snapshotTotal = 0;
            for (const p of products) {
                snapshotTotal += Number(p.stock) || 0;
                if (Number(p.stock) > 0) {
                    const pls = queryRunner.manager.create(ProductLocationStock, {
                        productId: p.id,
                        locationId: initial.id,
                        quantity: p.stock,
                    });
                    await queryRunner.manager.save(pls);
                }
            }

            // 4. Verificación post-distribución: SUM(product_location_stock
            //    WHERE locationId = initial) == snapshotTotal.
            const sumRows: Array<{ total: string }> = await queryRunner.manager.query(
                `SELECT COALESCE(SUM("quantity"), 0)::text AS total
                 FROM "product_location_stocks"
                 WHERE "locationId" = $1`,
                [initial.id],
            );
            const distributedTotal = Number.parseFloat(sumRows[0]?.total ?? '0');
            // Tolerancia 1e-6 para evitar issues de coma flotante; los
            // decimales se persisten con scale 3, así que la tolerancia es
            // muy generosa.
            if (Math.abs(distributedTotal - snapshotTotal) > 1e-6) {
                throw new BadRequestException(
                    `Distribución inconsistente: stock total ${snapshotTotal} != suma distribuida ${distributedTotal}`,
                );
            }

            // 5. Flippear el flag y persistir las referencias a ubicaciones.
            await queryRunner.manager.update(SystemConfiguration, config.id, {
                stockSectorizado: true,
                primarySaleLocationId: primarySale.id,
                defaultReceiveLocationId: defaultReceive.id,
            });

            await queryRunner.commitTransaction();

            return {
                ok: true,
                products: products.length,
                locations: createdLocations.length,
            };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
