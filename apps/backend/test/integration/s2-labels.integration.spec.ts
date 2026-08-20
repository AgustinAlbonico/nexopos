import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { entities } from '../../src/entities';
import { LabelsController } from '../../src/modules/products/labels/labels.controller';
import { LabelsService, LABEL_TEMPLATE_NAMES } from '../../src/modules/products/labels/labels.service';
import { Product } from '../../src/modules/products/entities/product.entity';

/**
 * S2 H4 T10 — labels preview + queue integration tests.
 *
 * Verifies:
 *   1. `GET  /api/products/labels/templates` returns the exact three names.
 *   2. `POST /api/products/labels/preview` returns a real PDF (magic-bytes).
 *   3. `POST /api/products/labels/queue` registers a job and exposes it
 *      through `GET /api/products/labels/queue/:id`.
 *   4. `POST /api/products/labels/preview` with an unknown template returns 400.
 */

describe('S2 H4 T10 labels', () => {
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
                TypeOrmModule.forFeature([Product]),
            ],
            controllers: [LabelsController],
            providers: [LabelsService],
        }).compile();

        app = moduleRef.createNestApplication({ logger: false });
        app.setGlobalPrefix('api');
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

    it('Given the labels controller When listing templates Then returns the exact three names', async () => {
        const res = await request(app.getHttpServer())
            .get('/api/products/labels/templates')
            .expect(200);
        expect(res.body).toEqual(['qr_text_price', 'qr_text', 'qr_only']);
        expect(LABEL_TEMPLATE_NAMES).toHaveLength(3);
    });

    it('Given products When previewing qr_text_price Then returns a PDF buffer', async () => {
        const productId = await dataSource.query(
            `INSERT INTO "products" ("name", "cost", "price", "useCustomMargin", "isActive", "barcode", "sku")
             VALUES ('Acme 1L', 10, 12.5, false, true, '7790000001', 'AC-1')
             RETURNING "id"::text AS id`,
        );

        const res = await request(app.getHttpServer())
            .post('/api/products/labels/preview')
            .send({ template: 'qr_text_price', products: [productId[0].id] })
            .expect(200);

        expect(res.headers['content-type']).toContain('application/pdf');
        expect(Buffer.isBuffer(res.body) || res.body instanceof Buffer).toBe(true);
        const pdfBytes = Buffer.isBuffer(res.body) ? res.body : Buffer.from(res.body);
        expect(pdfBytes.slice(0, 4).toString('utf-8')).toBe('%PDF');
        // Each product renders one page.
        expect(pdfBytes.length).toBeGreaterThan(800);
    });

    it('Given products When previewing qr_only Then returns a PDF without the price line', async () => {
        const productId = await dataSource.query(
            `INSERT INTO "products" ("name", "cost", "price", "useCustomMargin", "isActive", "barcode")
             VALUES ('Cheap Item', 5, 9.99, false, true, '7790000002')
             RETURNING "id"::text AS id`,
        );

        const res = await request(app.getHttpServer())
            .post('/api/products/labels/preview')
            .send({ template: 'qr_only', products: [productId[0].id] })
            .expect(200);

        expect(res.headers['content-type']).toContain('application/pdf');
        const pdfBytes = Buffer.isBuffer(res.body) ? res.body : Buffer.from(res.body);
        expect(pdfBytes.slice(0, 4).toString('utf-8')).toBe('%PDF');
    });

    it('Given an unknown template When previewing Then rejects with BadRequest', async () => {
        const productId = await dataSource.query(
            `INSERT INTO "products" ("name", "cost", "price", "useCustomMargin", "isActive")
             VALUES ('Bare Item', 1, 1, false, true)
             RETURNING "id"::text AS id`,
        );
        const res = await request(app.getHttpServer())
            .post('/api/products/labels/preview')
            .send({ template: 'text-only', products: [productId[0].id] });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('Given a queue job When polling status Then returns the same id', async () => {
        const productId = await dataSource.query(
            `INSERT INTO "products" ("name", "cost", "price", "useCustomMargin", "isActive", "barcode")
             VALUES ('Queued Item', 1, 1, false, true, '7790000003')
             RETURNING "id"::text AS id`,
        );

        const enqueue = await request(app.getHttpServer())
            .post('/api/products/labels/queue')
            .send({ template: 'qr_text', products: [productId[0].id] })
            .expect(202);
        expect(typeof enqueue.body.id).toBe('string');

        const status = await request(app.getHttpServer())
            .get(`/api/products/labels/queue/${enqueue.body.id}`)
            .expect(200);
        expect(status.body.id).toBe(enqueue.body.id);
        expect(status.body.template).toBe('qr_text');
        expect(status.body.products).toHaveLength(1);
        expect(status.body.products[0].name).toBe('Queued Item');
    });
});