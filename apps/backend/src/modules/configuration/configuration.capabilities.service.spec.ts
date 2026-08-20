import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import type { DataSource, Repository } from 'typeorm';

import { ConfigurationService } from './configuration.service';
import { ConfigurationAuditService } from './configuration-audit.service';
import { CURRENT_CAPABILITIES_SCHEMA_VERSION } from './capabilities/presets';
import { SystemConfiguration } from './entities/system-configuration.entity';

type ConfigRepository = Pick<Repository<SystemConfiguration>, 'count' | 'find' | 'save' | 'update'>;

const baseConfig: SystemConfiguration = {
    id: 'config-1',
    defaultProfitMargin: 30,
    minStockAlert: 5,
    sistemaHabilitado: true,
    barcodeScannerEnabled: false,
    barcodeScannerTimeoutMs: 100,
    allowOutOfStockSale: false,
    stockSectorizado: true,
    primarySaleLocationId: '11111111-1111-1111-1111-111111111111',
    defaultReceiveLocationId: '22222222-2222-2222-2222-222222222222',
    stockMinimoVenta: 7,
    profileKey: 'simple-retail',
    profileVersion: 1,
    capabilitiesJson: {},
    capabilitiesSchemaVersion: CURRENT_CAPABILITIES_SCHEMA_VERSION,
    onboardingCompleted: false,
    selectedBusinessType: null,
    ticketAutoPrintEnabled: true,
    ticketPrinterName: null,
    ticketPaperWidth: '80mm',
    ticketHeaderTitle: null,
    ticketHeaderAddress: null,
    ticketHeaderPhone: null,
    ticketFooterText: '¡Gracias por su compra!',
    ticketShowCustomerData: true,
    ticketLogoUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

function config(overrides: Partial<SystemConfiguration> = {}): SystemConfiguration {
    return { ...baseConfig, ...overrides };
}

describe('ConfigurationService capabilities boundary', () => {
    let service: ConfigurationService;
    let configRepository: jest.Mocked<ConfigRepository>;

    beforeEach(async () => {
        configRepository = {
            count: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
        };

        const dataSource: Pick<DataSource, 'getRepository'> = {
            getRepository: jest.fn(),
        };

        const auditService = {
            auditProfileSwitch: jest.fn().mockResolvedValue({ canSwitch: true, blockingReasons: [] }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConfigurationService,
                { provide: getRepositoryToken(SystemConfiguration), useValue: configRepository },
                { provide: getDataSourceToken(), useValue: dataSource },
                { provide: ConfigurationAuditService, useValue: auditService },
            ],
        }).compile();

        service = module.get(ConfigurationService);
    });

    afterEach(() => jest.clearAllMocks());

    it('Given persisted metadata When getCapabilitiesManifest Then resolves overrides and deterministic routes', async () => {
        const persisted = config({
            profileKey: 'simple-retail',
            capabilitiesJson: {
                'APP_ROUTES.products': false,
                'STRUCTURAL.decimal_quantities': true,
            },
        });
        configRepository.find.mockResolvedValue([persisted]);

        const result = await service.getCapabilitiesManifest();

        expect(result.profileKey).toBe('simple-retail');
        expect(result.profileVersion).toBe(1);
        expect(result.capabilitiesSchemaVersion).toBe(CURRENT_CAPABILITIES_SCHEMA_VERSION);
        expect(result.capabilities['STRUCTURAL.decimal_quantities']).toBe(true);
        expect(result.capabilities['APP_ROUTES.inventory_replenishment']).toBe(true);
        expect(result.appRoutes.enabled).toContain('inventory/replenishment');
        expect(result.appRoutes.disabled).toEqual(['products']);
        expect(result.appRoutes.enabled.slice(0, 3)).toEqual(['dashboard', 'customers', 'suppliers']);
    });

    it('Given persisted metadata When getLegacyResponse Then hides metadata and preserves existing fields', async () => {
        configRepository.find.mockResolvedValue([config()]);

        const result = await service.getLegacyResponse();

        expect(result).toEqual({
            id: 'config-1',
            defaultProfitMargin: 30,
            minStockAlert: 5,
            sistemaHabilitado: true,
            barcodeScannerEnabled: false,
            barcodeScannerTimeoutMs: 100,
            allowOutOfStockSale: false,
            stockSectorizado: true,
            primarySaleLocationId: '11111111-1111-1111-1111-111111111111',
            defaultReceiveLocationId: '22222222-2222-2222-2222-222222222222',
            stockMinimoVenta: 7,
            ticketAutoPrintEnabled: true,
            ticketPrinterName: null,
            ticketPaperWidth: '80mm',
            ticketHeaderTitle: null,
            ticketHeaderAddress: null,
            ticketHeaderPhone: null,
            ticketFooterText: '¡Gracias por su compra!',
            ticketShowCustomerData: true,
            ticketLogoUrl: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        });
        expect(Object.keys(result)).not.toContain('profileKey');
        expect(Object.keys(result)).not.toContain('profileVersion');
        expect(Object.keys(result)).not.toContain('capabilitiesJson');
        expect(Object.keys(result)).not.toContain('capabilitiesSchemaVersion');
    });

    it('Given profile and overrides When updateCapabilities Then writes once and returns override precedence', async () => {
        configRepository.find
            .mockResolvedValueOnce([config()])
            .mockResolvedValueOnce([config({
                profileKey: 'weight',
                capabilitiesJson: { 'APP_ROUTES.products': false },
            })]);
        configRepository.update.mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] });

        const result = await service.updateCapabilities({
            profileKey: 'weight',
            capabilitiesSchemaVersion: CURRENT_CAPABILITIES_SCHEMA_VERSION,
            capabilities: { 'APP_ROUTES.products': false },
        });

        expect(configRepository.update).toHaveBeenCalledTimes(1);
        expect(configRepository.update).toHaveBeenCalledWith('config-1', {
            profileKey: 'weight',
            capabilitiesJson: { 'APP_ROUTES.products': false },
            capabilitiesSchemaVersion: CURRENT_CAPABILITIES_SCHEMA_VERSION,
        });
        expect(result.capabilities['STRUCTURAL.weight_scale']).toBe(true);
        expect(result.capabilities['APP_ROUTES.products']).toBe(false);
    });

    it('Given wrong schema version When updateCapabilities Then throws ConflictException and does not update', async () => {
        configRepository.find.mockResolvedValue([config()]);

        await expect(service.updateCapabilities({ capabilitiesSchemaVersion: 2 })).rejects.toBeInstanceOf(ConflictException);

        expect(configRepository.update).not.toHaveBeenCalled();
    });

    it('Given invalid profile/key/nonboolean When updateCapabilities Then throws BadRequestException and does not update', async () => {
        configRepository.find.mockResolvedValue([config()]);

        await expect(service.updateCapabilities({
            profileKey: 'missing',
            capabilitiesSchemaVersion: CURRENT_CAPABILITIES_SCHEMA_VERSION,
            capabilities: { 'APP_ROUTES.products': 'yes', 'APP_ROUTES.nope': true },
        })).rejects.toBeInstanceOf(BadRequestException);

        expect(configRepository.update).not.toHaveBeenCalled();
    });

    it('Given disabled capability When assertCapabilityEnabled Then throws ForbiddenException before mutation', async () => {
        configRepository.find.mockResolvedValue([config({
            capabilitiesJson: { 'APP_ROUTES.sales': false },
        })]);

        await expect(service.assertCapabilityEnabled('APP_ROUTES.sales')).rejects.toBeInstanceOf(ForbiddenException);

        expect(configRepository.update).not.toHaveBeenCalled();
    });
});
