import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { ALL_CAPABILITY_KEYS } from '../../src/modules/configuration/capabilities/keys';
import { CURRENT_CAPABILITIES_SCHEMA_VERSION } from '../../src/modules/configuration/capabilities/presets';
import { ConfigurationController } from '../../src/modules/configuration/configuration.controller';
import { ConfigurationService } from '../../src/modules/configuration/configuration.service';
import { SystemConfiguration } from '../../src/modules/configuration/entities/system-configuration.entity';
import { testDataSource } from '../setup-integration';

const legacyKeys = [
    'id',
    'defaultProfitMargin',
    'minStockAlert',
    'sistemaHabilitado',
    'barcodeScannerEnabled',
    'barcodeScannerTimeoutMs',
    'allowOutOfStockSale',
    'stockSectorizado',
    'primarySaleLocationId',
    'defaultReceiveLocationId',
    'stockMinimoVenta',
    'createdAt',
    'updatedAt',
] as const;

const metadataKeys = ['profileKey', 'profileVersion', 'capabilitiesJson', 'capabilitiesSchemaVersion'] as const;

type JsonObject = Readonly<Record<string, unknown>>;

function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectJsonObject(value: unknown): JsonObject {
    if (!isJsonObject(value)) {
        throw new Error('Expected JSON object');
    }
    return value;
}

function legacyValues(body: JsonObject): JsonObject {
    return {
        defaultProfitMargin: body.defaultProfitMargin,
        minStockAlert: body.minStockAlert,
        sistemaHabilitado: body.sistemaHabilitado,
        barcodeScannerEnabled: body.barcodeScannerEnabled,
        barcodeScannerTimeoutMs: body.barcodeScannerTimeoutMs,
        allowOutOfStockSale: body.allowOutOfStockSale,
        stockSectorizado: body.stockSectorizado,
        primarySaleLocationId: body.primarySaleLocationId,
        defaultReceiveLocationId: body.defaultReceiveLocationId,
        stockMinimoVenta: body.stockMinimoVenta,
    };
}

describe('Integración: configuration capabilities HTTP contracts', () => {
    let app: INestApplication;
    let moduleRef: TestingModule;
    let service: ConfigurationService;

    beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
            controllers: [ConfigurationController],
            providers: [
                ConfigurationService,
                { provide: DataSource, useValue: testDataSource },
                { provide: getRepositoryToken(SystemConfiguration), useValue: testDataSource.getRepository(SystemConfiguration) },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        service = moduleRef.get(ConfigurationService);
        app = moduleRef.createNestApplication();
        app.setGlobalPrefix('api');
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        await app.init();
    });

    beforeEach(async () => {
        await service.onModuleInit();
    });

    afterAll(async () => {
        await app.close();
        await moduleRef.close();
    });

    it('Given default config When GET /api/configuration Then returns legacy fields and no capability metadata', async () => {
        const response = await request(app.getHttpServer()).get('/api/configuration').expect(200);

        const body = expectJsonObject(response.body);
        expect(Object.keys(body).sort()).toEqual([...legacyKeys].sort());
        for (const key of metadataKeys) {
            expect(body).not.toHaveProperty(key);
        }
        expect(body.stockSectorizado).toBe(false);
        expect(body.primarySaleLocationId).toBeNull();
        expect(body.defaultReceiveLocationId).toBeNull();
        expect(body.stockMinimoVenta).toBe(5);
    });

    it('Given default config When capability endpoints are read Then responses are deterministic and legacy enables replenishment', async () => {
        const firstCapabilities = await request(app.getHttpServer()).get('/api/configuration/capabilities').expect(200);
        const secondCapabilities = await request(app.getHttpServer()).get('/api/configuration/capabilities').expect(200);
        const firstManifest = await request(app.getHttpServer()).get('/api/configuration/manifest').expect(200);
        const secondManifest = await request(app.getHttpServer()).get('/api/configuration/manifest').expect(200);

        expect(firstCapabilities.body).toEqual(secondCapabilities.body);
        expect(firstManifest.body).toEqual(secondManifest.body);
        const capabilities = expectJsonObject(expectJsonObject(firstCapabilities.body).capabilities);
        expect(Object.keys(capabilities)).toEqual([...ALL_CAPABILITY_KEYS]);
        expect(capabilities['APP_ROUTES.inventory_replenishment']).toBe(true);
        const appRoutes = expectJsonObject(expectJsonObject(firstManifest.body).appRoutes);
        expect(appRoutes.enabled).toContain('inventory/replenishment');
    });

    it('Given a valid profile and override When PATCH /api/configuration/capabilities Then returns effective capabilities and persists one config row', async () => {
        const beforeLegacy = expectJsonObject((await request(app.getHttpServer()).get('/api/configuration').expect(200)).body);

        const response = await request(app.getHttpServer())
            .patch('/api/configuration/capabilities')
            .send({
                profileKey: 'weight',
                capabilitiesSchemaVersion: CURRENT_CAPABILITIES_SCHEMA_VERSION,
                capabilities: { 'APP_ROUTES.sales': false },
            })
            .expect(200);

        const body = expectJsonObject(response.body);
        const capabilities = expectJsonObject(body.capabilities);
        expect(body.profileKey).toBe('weight');
        expect(capabilities['STRUCTURAL.weight_scale']).toBe(true);
        expect(capabilities['APP_ROUTES.sales']).toBe(false);

        const repo = testDataSource.getRepository(SystemConfiguration);
        expect(await repo.count()).toBe(1);
        const stored = await repo.findOneOrFail({ where: {} });
        expect(stored.profileKey).toBe('weight');
        expect(stored.capabilitiesJson).toEqual({ 'APP_ROUTES.sales': false });

        const afterLegacy = expectJsonObject((await request(app.getHttpServer()).get('/api/configuration').expect(200)).body);
        expect(legacyValues(afterLegacy)).toEqual(legacyValues(beforeLegacy));
        for (const key of metadataKeys) {
            expect(afterLegacy).not.toHaveProperty(key);
        }
    });

    it('Given invalid capability patch bodies When PATCH /api/configuration/capabilities Then returns contract status codes', async () => {
        await request(app.getHttpServer())
            .patch('/api/configuration/capabilities')
            .send({ capabilities: { 'UNKNOWN.capability': true } })
            .expect(400);
        await request(app.getHttpServer())
            .patch('/api/configuration/capabilities')
            .send({ capabilities: { 'APP_ROUTES.sales': 'no' } })
            .expect(400);
        await request(app.getHttpServer())
            .patch('/api/configuration/capabilities')
            .send({ profileKey: 'unknown-preset' })
            .expect(400);
        await request(app.getHttpServer())
            .patch('/api/configuration/capabilities')
            .send({ capabilitiesSchemaVersion: CURRENT_CAPABILITIES_SCHEMA_VERSION + 1 })
            .expect(409);
    });
});
