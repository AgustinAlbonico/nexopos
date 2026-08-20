import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { entities } from '../../src/entities';
import { StocktakeService } from '../../src/modules/inventory/stocktake.service';
import { StockMovementType, StockMovementSource } from '../../src/modules/inventory/entities/stock-movement.entity';
import { Product } from '../../src/modules/products/entities/product.entity';
import { StocktakeSession } from '../../src/modules/inventory/entities/stocktake-session.entity';
import { StocktakeLine } from '../../src/modules/inventory/entities/stocktake-line.entity';
import { AuditService } from '../../src/modules/audit/audit.service';
import { AuditAction } from '../../src/modules/audit/enums/audit.enums';

/**
 * S2 H3 T9 stocktake concurrency model.
 *
 * Scenarios covered:
 *  1. Snapshot + no movements during session → approval with matching count → no adjustment.
 *  2. Snapshot + SALE during session → approval recomputes expected → varianza captures sale.
 *  3. Idempotent re-approval → no extra movements after the first approval.
 *  4. Adjustment rows reference the session id so they are traceable.
 */

async function seedUser(dataSource: DataSource, _role: string): Promise<string> {
    const result = await dataSource.query(
        `INSERT INTO "users" ("username", "email", "passwordHash", "firstName", "lastName", "isActive")
         VALUES ($1, $2, 'seeded', 'Test', 'User', true)
         RETURNING "id"::text AS id`,
        [`tx-${Date.now()}-${Math.random()}@test.local`, `tx-${Date.now()}-${Math.random()}@test.local`],
    );
    return result[0].id;
}

async function seedProduct(dataSource: DataSource, name: string, stock: number, barcode: string): Promise<string> {
    const result = await dataSource.query(
        `INSERT INTO "products" ("name", "cost", "price", "useCustomMargin", "isActive", "barcode")
         VALUES ($1, 10, 10, false, true, $2)
         RETURNING "id"::text AS id`,
        [name, barcode],
    );
    const productId = result[0].id;
    await dataSource.query(
        `UPDATE "products" SET "stock" = $1 WHERE "id" = $2`,
        [stock, productId],
    );
    return productId;
}

async function clear(dataSource: DataSource): Promise<void> {
    await dataSource.query(`SET session_replication_role = 'replica'`);
    await dataSource.query(`TRUNCATE TABLE "stocktake_lines" CASCADE`);
    await dataSource.query(`TRUNCATE TABLE "stocktake_sessions" CASCADE`);
    await dataSource.query(`TRUNCATE TABLE "stock_movements" CASCADE`);
    await dataSource.query(`TRUNCATE TABLE "products" CASCADE`);
    await dataSource.query(`TRUNCATE TABLE "users" CASCADE`);
    await dataSource.query(`SET session_replication_role = 'origin'`);
}

describe('S2 H3 T9 stocktake', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let stocktake: StocktakeService;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'postgres',
                    host: 'localhost',
                    port: 5433,
                    username: 'test',
                    password: 'test',
                    database: 'nexopos_test',
                    entities,
                    synchronize: false,
                }),
                TypeOrmModule.forFeature([StocktakeSession, StocktakeLine, Product]),
            ],
            providers: [
                StocktakeService,
                {
                    provide: AuditService,
                    useValue: {
                        logSilent: async () => undefined,
                    },
                },
            ],
        }).compile();

        app = moduleRef.createNestApplication({ logger: false });
        await app.init();
        dataSource = moduleRef.get(DataSource);
        stocktake = moduleRef.get(StocktakeService);
    });

    afterAll(async () => {
        await app?.close();
    });

    beforeEach(async () => {
        await clear(dataSource);
    });

    it('Given snapshot 10 and no movements during session When approving with count 10 Then no adjustment movement is produced', async () => {
        const userId = await seedUser(dataSource, 'manager');
        const productId = await seedProduct(dataSource, 'Acme Widget', 10, 'st-widget-' + Date.now());

        const session = await stocktake.start({
            name: 'Cycle count',
            startedById: userId,
            products: [{ productId }],
        });

        const lines = await dataSource.getRepository(StocktakeLine).find({
            where: { sessionId: session.id },
        });
        expect(lines).toHaveLength(1);
        const expected = Number(lines[0].expectedQuantity);
        expect(expected).toBe(10);

        await stocktake.recordCount({
            lineId: lines[0].id,
            countedQuantity: 10,
            countedById: userId,
        });

        const result = await stocktake.approve(session.id, userId);
        expect(result.adjustments).toBe(0);

        const productAfter = await dataSource
            .getRepository(Product)
            .findOneByOrFail({ id: productId });
        expect(productAfter.stock).toBe(10);

        const adjustments = await stocktake.adjustmentMovements(session.id);
        expect(adjustments).toHaveLength(0);
        expect(await stocktake.statusOf(session.id)).toBe('approved');
    });

    it('Given snapshot 10 and a SALE of 2 during session When approving with count 5 Then variance is -3 and stock lands at 7', async () => {
        const userId = await seedUser(dataSource, 'manager');
        const productId = await seedProduct(dataSource, 'Saleable Item', 10, 'st-sale');

        const session = await stocktake.start({
            name: 'Mid-week',
            startedById: userId,
            products: [{ productId }],
        });

        // SALE during the session — direct SQL to avoid pulling the full sales flow.
        await dataSource.query(
            `INSERT INTO "stock_movements" ("productId", "type", "source", "quantity", "date")
             VALUES ($1, $2, $3, 2, NOW())`,
            [productId, StockMovementType.OUT, StockMovementSource.SALE],
        );

        const lines = await dataSource.getRepository(StocktakeLine).find({
            where: { sessionId: session.id },
        });
        await stocktake.recordCount({
            lineId: lines[0].id,
            countedQuantity: 5,
            countedById: userId,
        });

        const result = await stocktake.approve(session.id, userId);
        // snapshot 10 + inflows 0 - outflows 2 = 8 expected; counted 5 → variance -3.
        expect(result.adjustments).toBe(1);

        const productAfter = await dataSource
            .getRepository(Product)
            .findOneByOrFail({ id: productId });
        expect(productAfter.stock).toBe(7);

        const adjustments = await stocktake.adjustmentMovements(session.id);
        expect(adjustments).toHaveLength(1);
        expect(Number(adjustments[0].quantity)).toBeCloseTo(3);
        expect(adjustments[0].type).toBe(StockMovementType.OUT);
        expect(adjustments[0].source).toBe(StockMovementSource.ADJUSTMENT);
    });

    it('Given an approved session When approving a second time Then no additional adjustment is produced', async () => {
        const userId = await seedUser(dataSource, 'manager');
        const productId = await seedProduct(dataSource, 'Idempotent', 10, 'st-idem');

        const session = await stocktake.start({
            name: 'Idempotent run',
            startedById: userId,
            products: [{ productId }],
        });
        const lines = await dataSource.getRepository(StocktakeLine).find({
            where: { sessionId: session.id },
        });
        await stocktake.recordCount({
            lineId: lines[0].id,
            countedQuantity: 7,
            countedById: userId,
        });

        const first = await stocktake.approve(session.id, userId);
        expect(first.adjustments).toBe(1);
        const productAfterFirst = await dataSource
            .getRepository(Product)
            .findOneByOrFail({ id: productId });
        expect(productAfterFirst.stock).toBe(7);

        // Second approval must reject because the session is no longer 'open'.
        await expect(stocktake.approve(session.id, userId)).rejects.toThrow(
            /Cannot approve a session in status "approved"/,
        );
        const adjustments = await stocktake.adjustmentMovements(session.id);
        expect(adjustments).toHaveLength(1);
    });

    it('Given a cancelled session When recording counts Then the request is rejected', async () => {
        const userId = await seedUser(dataSource, 'manager');
        const productId = await seedProduct(dataSource, 'Cancelled', 10, 'st-cancel');

        const session = await stocktake.start({
            name: 'Cancelled run',
            startedById: userId,
            products: [{ productId }],
        });
        await stocktake.cancel(session.id, userId);
        const sessionAfter = await stocktake.findOneWithLines(session.id);
        expect(sessionAfter?.status).toBe('cancelled');

        const lines = await dataSource.getRepository(StocktakeLine).find({
            where: { sessionId: session.id },
        });
        await expect(
            stocktake.recordCount({
                lineId: lines[0].id,
                countedQuantity: 5,
                countedById: userId,
            }),
        ).rejects.toThrow(/Cannot record counts on a session in status "cancelled"/);
    });

    it('Given a planned session When starting with no products Then the request is rejected with EmptyStocktake', async () => {
        const userId = await seedUser(dataSource, 'manager');
        await expect(
            stocktake.start({ name: 'Empty', startedById: userId, products: [] }),
        ).rejects.toThrow(/At least one product/);
    });
});

// `AuditAction` is referenced transitively by the optional AuditService stub above;
// keep the import to satisfy `noUnusedLocals` in stricter tsconfigs.
void AuditAction;
