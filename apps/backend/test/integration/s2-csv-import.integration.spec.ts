import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { entities } from '../../src/entities';
import { ImportController } from '../../src/modules/products/import/import.controller';
import { ImportService } from '../../src/modules/products/import/import.service';
import { ImportPreviewCache } from '../../src/modules/products/import/preview-cache';

/**
 * S2 H2 integration: full CSV preview/commit flow against a real
 * PostgreSQL test database. We mount only the ImportController with its
 * direct dependencies (DataSource + ImportPreviewCache); loading the full
 * ProductsModule pulls in `forwardRef(() => InventoryService)` which is
 * outside the scope of this integration test.
 *
 * Routes are exposed through `app.useGlobalPrefix('api')` to keep the
 * URL shape (`/api/products/import/preview|commit`) identical to the
 * production Nest application.
 */

describe('S2 H2 catalog CSV import', () => {
    let app: INestApplication;
    let dataSource: DataSource;

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
            ],
            controllers: [ImportController],
            providers: [ImportService, ImportPreviewCache],
        }).compile();

        app = moduleRef.createNestApplication({ logger: false });
        app.setGlobalPrefix('api');
        app.useGlobalPipes(
            new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
        );
        await app.init();
        dataSource = moduleRef.get(DataSource);
    });

    afterAll(async () => {
        await app?.close();
    });

    beforeEach(async () => {
        await dataSource.query(`SET session_replication_role = 'replica'`);
        await dataSource.query(`TRUNCATE TABLE "products" CASCADE`);
        await dataSource.query(`SET session_replication_role = 'origin'`);
    });

    it('Given a valid CSV When preview Then returns parsed rows and a previewId', async () => {
        const csv = ['name,sku,cost,stock', 'Coca,CC-1,1.5,10', 'Pepsi,PP-1,1.2,8'].join('\n');

        const res = await request(app.getHttpServer())
            .post('/api/products/import/preview')
            .send({ csv })
            .expect(200);

        expect(res.body.previewId).toMatch(/^[0-9a-f-]{36}$/i);
        expect(res.body.rows).toHaveLength(2);
        expect(res.body.rows[0].key).toBe('sku:CC-1');
        expect(res.body.rows[0].payload.name).toBe('Coca');
        expect(res.body.rows[0].payload.cost).toBeCloseTo(1.5);
        expect(res.body.rows[0].payload.stock).toBe(10);
        expect(res.body.errors).toEqual([]);
        expect(res.body.duplicates).toEqual([]);
    });

    it('Given a CSV with a quoted comma When preview Then parses the embedded comma', async () => {
        const csv = ['name,cost,description', '"Acme, Inc.",1.5,"hello, world"'].join('\n');

        const res = await request(app.getHttpServer())
            .post('/api/products/import/preview')
            .send({ csv })
            .expect(200);

        expect(res.body.rows[0].payload.name).toBe('Acme, Inc.');
        expect(res.body.rows[0].payload.description).toBe('hello, world');
        expect(res.body.rows[0].payload.cost).toBeCloseTo(1.5);
    });

    it('Given an embedded newline When preview Then rejects with EmbeddedNewlineInQuotedField', async () => {
        const csv = 'name,note\n"line1\nline2","ok"';
        const res = await request(app.getHttpServer())
            .post('/api/products/import/preview')
            .send({ csv })
            .expect(400);
        expect(res.body.code).toBe('EmbeddedNewlineInQuotedField');
    });

    it('Given a CSV with a duplicate barcode When preview Then surfaces a duplicate', async () => {
        await dataSource.query(
            `INSERT INTO "products" ("name", "cost", "price", "useCustomMargin", "isActive", "barcode")
             VALUES ('Existing', 1, 1, false, true, '111')`,
        );

        const csv = 'name,barcode,cost\nNew,111,1';
        const res = await request(app.getHttpServer())
            .post('/api/products/import/preview')
            .send({ csv })
            .expect(200);

        expect(res.body.duplicates).toHaveLength(1);
        expect(res.body.duplicates[0].existingProductId).toBeDefined();
    });

    it('Given a preview When commit with skip Then duplicates are skipped', async () => {
        await dataSource.query(
            `INSERT INTO "products" ("name", "cost", "price", "useCustomMargin", "isActive", "barcode")
             VALUES ('Existing', 1, 1, false, true, '111')`,
        );

        const csv = 'name,barcode,cost\nNew,111,1\nAnother,222,2';
        const preview = await request(app.getHttpServer())
            .post('/api/products/import/preview')
            .send({ csv })
            .expect(200);

        const commit = await request(app.getHttpServer())
            .post('/api/products/import/commit')
            .send({ previewId: preview.body.previewId, duplicates: 'skip' })
            .expect(200);

        expect(commit.body).toEqual({ created: 1, updated: 0, duplicated: 0, skipped: 1 });
        expect((await dataSource.query(`SELECT COUNT(*)::int AS c FROM "products"`))[0].c).toBe(2);
    });

    it('Given a preview When commit with overwrite Then duplicates are updated', async () => {
        const existing = await dataSource.query(
            `INSERT INTO "products" ("name", "cost", "price", "useCustomMargin", "isActive", "barcode")
             VALUES ('Existing', 1, 1, false, true, '111') RETURNING "id"::text AS id`,
        );
        const existingId = existing[0].id;

        const csv = `name,barcode,cost,stock\nReplaced,111,2.5,42`;
        const preview = await request(app.getHttpServer())
            .post('/api/products/import/preview')
            .send({ csv })
            .expect(200);

        const commit = await request(app.getHttpServer())
            .post('/api/products/import/commit')
            .send({ previewId: preview.body.previewId, duplicates: 'overwrite' })
            .expect(200);

        expect(commit.body.updated).toBe(1);
        const updated = await dataSource.query(
            `SELECT "cost"::float AS cost, "stock" FROM "products" WHERE "id" = $1`,
            [existingId],
        );
        expect(Number(updated[0].cost)).toBeCloseTo(2.5);
        expect(Number(updated[0].stock)).toBe(42);
    });

    it('Given a preview When commit with duplicate Then a second row is created', async () => {
        await dataSource.query(
            `INSERT INTO "products" ("name", "cost", "price", "useCustomMargin", "isActive", "barcode")
             VALUES ('Existing', 1, 1, false, true, '111')`,
        );

        const csv = 'name,barcode,cost\nExisting,111,1';
        const preview = await request(app.getHttpServer())
            .post('/api/products/import/preview')
            .send({ csv })
            .expect(200);

        const commit = await request(app.getHttpServer())
            .post('/api/products/import/commit')
            .send({ previewId: preview.body.previewId, duplicates: 'duplicate' })
            .expect(200);

        expect(commit.body.duplicated).toBe(1);
        expect((await dataSource.query(`SELECT COUNT(*)::int AS c FROM "products"`))[0].c).toBe(2);
    });

    it('Given a partial-invalid CSV When preview Then returns per-row errors', async () => {
        const csv = ['name,cost', ',5', 'Good,1'].join('\n');

        const res = await request(app.getHttpServer())
            .post('/api/products/import/preview')
            .send({ csv })
            .expect(200);

        expect(res.body.rows).toHaveLength(1);
        expect(res.body.errors).toHaveLength(1);
        expect(res.body.errors[0].code).toBe('MissingRequiredField');
        expect(res.body.errors[0].line).toBe(2);
    });

    it('Given a missing previewId When commit Then rejects with PreviewNotFound', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/products/import/commit')
            .send({ previewId: '00000000-0000-0000-0000-000000000000', duplicates: 'skip' })
            .expect(400);
        expect(res.body.code).toBe('PreviewNotFound');
    });
});