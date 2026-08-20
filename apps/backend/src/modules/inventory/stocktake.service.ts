import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { StocktakeSession, StocktakeStatusValue } from './entities/stocktake-session.entity';
import { StocktakeLine } from './entities/stocktake-line.entity';
import { Product } from '../products/entities/product.entity';
import { StockMovement, StockMovementSource, StockMovementType } from './entities/stock-movement.entity';

/**
 * Plan reference: `apps/backend/src/modules/inventory/stocktake.service.ts` (T9).
 *
 * Concurrency model: `expectedQuantity` is the snapshot of `Product.stock`
 * at `start`. At approval the expected is recomputed as
 *
 *     adjustedExpected = snapshotQuantity
 *                     + SUM(stock_movements.quantity) WHERE productId = line.productId
 *                                                 AND source IN ('PURCHASE','INITIAL_LOAD','TRANSFER')
 *                                                 AND createdAt >= session.startedAt
 *                     - SUM(stock_movements.quantity) WHERE productId = line.productId
 *                                                 AND source = 'SALE'
 *                                                 AND createdAt >= session.startedAt
 *
 * `variance = counted - adjustedExpected`. Approval produces exactly one
 * `ADJUSTMENT` stock movement per changed line equal to the variance.
 * Idempotent re-approval finds no further variance.
 */

export interface CreateStocktakeSessionInput {
    readonly name: string;
    readonly startedById: string;
    readonly products: ReadonlyArray<{ readonly productId: string }>;
}

export interface RecordCountInput {
    readonly lineId: string;
    readonly countedQuantity: number;
    readonly countedById: string;
    readonly reasonCode?: string | null;
}

export interface ApprovalResult {
    readonly sessionId: string;
    readonly adjustments: number;
}

interface InflowsRow {
    total: number | string;
}

@Injectable()
export class StocktakeService {
    private readonly logger = new Logger(StocktakeService.name);

    constructor(
        @InjectRepository(StocktakeSession)
        private readonly sessionRepo: Repository<StocktakeSession>,
        @InjectRepository(StocktakeLine)
        private readonly lineRepo: Repository<StocktakeLine>,
        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,
        private readonly dataSource: DataSource,
    ) {}

    async start(input: CreateStocktakeSessionInput): Promise<StocktakeSession> {
        if (input.products.length === 0) {
            throw new BadRequestException({
                code: 'EmptyStocktake',
                message: 'At least one product is required to start a stocktake',
            });
        }

        return this.dataSource.transaction(async (manager) => {
            const sessionRepo = manager.getRepository(StocktakeSession);
            const session = sessionRepo.create({
                name: input.name,
                status: 'open',
                startedById: input.startedById,
            });
            const saved = await sessionRepo.save(session);

            const productRepo = manager.getRepository(Product);
            for (const item of input.products) {
                const product = await productRepo.findOne({ where: { id: item.productId } });
                if (!product) {
                    throw new NotFoundException(`Product ${item.productId} not found`);
                }
                const stockValue = Number((product as unknown as { stock: number }).stock);
                const lineRepo = manager.getRepository(StocktakeLine);
                await lineRepo.save(
                    lineRepo.create({
                        sessionId: saved.id,
                        productId: product.id,
                        expectedQuantity: stockValue,
                        countedQuantity: 0,
                    }),
                );
            }

            return saved;
        });
    }

    async recordCount(input: RecordCountInput): Promise<StocktakeLine> {
        const line = await this.lineRepo.findOne({ where: { id: input.lineId } });
        if (!line) {
            throw new NotFoundException(`Stocktake line ${input.lineId} not found`);
        }
        const session = await this.sessionRepo.findOne({ where: { id: line.sessionId } });
        if (!session) {
            throw new NotFoundException(`Stocktake session ${line.sessionId} not found`);
        }
        if (session.status !== 'open') {
            throw new ConflictException({
                code: 'SessionNotOpen',
                message: `Cannot record counts on a session in status "${session.status}"`,
            });
        }
        if (!Number.isFinite(input.countedQuantity) || input.countedQuantity < 0) {
            throw new BadRequestException({
                code: 'InvalidCountedQuantity',
                message: 'countedQuantity must be a non-negative finite number',
            });
        }
        line.countedQuantity = input.countedQuantity;
        line.countedAt = new Date();
        line.countedById = input.countedById;
        line.reasonCode = input.reasonCode ?? null;
        return this.lineRepo.save(line);
    }

    async approve(sessionId: string, approvedById: string): Promise<ApprovalResult> {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session) {
            throw new NotFoundException(`Stocktake session ${sessionId} not found`);
        }
        if (session.status !== 'open') {
            throw new ConflictException({
                code: 'SessionNotOpen',
                message: `Cannot approve a session in status "${session.status}"`,
            });
        }

        return this.dataSource.transaction(async (manager) => {
            const lines = await this.loadLinesWithProduct(manager, sessionId);
            if (lines.length === 0) {
                throw new ConflictException({
                    code: 'EmptyStocktake',
                    message: 'Session has no lines to approve',
                });
            }

            let adjustments = 0;
            for (const line of lines) {
                const adjustedExpected = await this.computeAdjustedExpected(
                    manager,
                    line.productId,
                    Number(line.expectedQuantity),
                    session.startedAt,
                );
                const variance = Number(line.countedQuantity) - adjustedExpected;
                if (Math.abs(variance) > Number.EPSILON) {
                    const product = await manager.getRepository(Product).findOne({
                        where: { id: line.productId },
                    });
                    if (!product) continue;
                    const updated = (product as unknown as { stock: number });
                    updated.stock = Number(updated.stock) + variance;
                    await manager.getRepository(Product).save(product);

                    await manager.getRepository(StockMovement).save(
                        manager.getRepository(StockMovement).create({
                            productId: line.productId,
                            type: variance > 0 ? StockMovementType.IN : StockMovementType.OUT,
                            source: StockMovementSource.ADJUSTMENT,
                            quantity: Math.abs(variance),
                            date: new Date(),
                            notes: `Stocktake adjustment for session ${sessionId}`,
                        }),
                    );
                    adjustments += 1;
                }
            }

            const sessionEntity = session;
            sessionEntity.status = 'approved';
            sessionEntity.approvedAt = new Date();
            sessionEntity.approvedById = approvedById;
            await manager.getRepository(StocktakeSession).save(sessionEntity);

            this.logger.log(
                `Approved stocktake ${sessionId} by ${approvedById} with ${adjustments} adjustment(s)`,
            );

            return { sessionId, adjustments };
        });
    }

    async cancel(sessionId: string, cancelledById: string): Promise<StocktakeSession> {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session) {
            throw new NotFoundException(`Stocktake session ${sessionId} not found`);
        }
        if (session.status === 'approved') {
            throw new ConflictException({
                code: 'SessionAlreadyApproved',
                message: 'Approved sessions cannot be cancelled',
            });
        }
        session.status = 'cancelled';
        session.approvedById = cancelledById;
        session.approvedAt = new Date();
        return this.sessionRepo.save(session);
    }

    async findOneWithLines(sessionId: string): Promise<StocktakeSession | null> {
        return this.sessionRepo.findOne({
            where: { id: sessionId },
            relations: { lines: true },
        });
    }

    private async loadLinesWithProduct(
        manager: EntityManager,
        sessionId: string,
    ): Promise<Array<StocktakeLine & { product: Product }>> {
        const repo = manager.getRepository(StocktakeLine);
        const lines = await repo.find({ where: { sessionId } });
        const productRepo = manager.getRepository(Product);
        const enriched: Array<StocktakeLine & { product: Product }> = [];
        for (const line of lines) {
            const product = await productRepo.findOne({ where: { id: line.productId } });
            if (product) enriched.push(Object.assign(line, { product }));
        }
        return enriched;
    }

    /**
     * Replay every stock movement whose creation timestamp is at or after
     * the session `startedAt`. `PURCHASE` / `INITIAL_LOAD` / `TRANSFER` are
     * positive deltas; `SALE` is negative. `ADJUSTMENT` rows are skipped
     * here because the stocktake itself produces `ADJUSTMENT` rows at
     * approval time — including them would double-count the variance we are
     * about to record. `RETURN` is also skipped: returns are out of scope
     * for the snapshot reconciliation (the seller-facing refund flow lives
     * in S3 / `SaleReturnService`).
     */
    private async computeAdjustedExpected(
        manager: EntityManager,
        productId: string,
        snapshotQuantity: number,
        startedAt: Date,
    ): Promise<number> {
        const inflows = (await manager.query(
            `SELECT COALESCE(SUM("quantity"), 0)::float AS total
             FROM "stock_movements"
             WHERE "productId" = $1
               AND "createdAt" >= $2
               AND "source" IN ('PURCHASE','INITIAL_LOAD','TRANSFER')`,
            [productId, startedAt],
        )) as InflowsRow[];
        const outflows = (await manager.query(
            `SELECT COALESCE(SUM("quantity"), 0)::float AS total
             FROM "stock_movements"
             WHERE "productId" = $1
               AND "createdAt" >= $2
               AND "source" = 'SALE'`,
            [productId, startedAt],
        )) as InflowsRow[];
        const inTotal = Number(inflows[0]?.total ?? 0);
        const outTotal = Number(outflows[0]?.total ?? 0);
        return snapshotQuantity + inTotal - outTotal;
    }

    async adjustmentMovements(sessionId: string): Promise<StockMovement[]> {
        return this.dataSource.getRepository(StockMovement).find({
            where: {
                source: StockMovementSource.ADJUSTMENT,
                notes: `Stocktake adjustment for session ${sessionId}`,
            },
            order: { createdAt: 'ASC' },
        });
    }

    async statusOf(sessionId: string): Promise<StocktakeStatusValue | null> {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        return session?.status ?? null;
    }
}
