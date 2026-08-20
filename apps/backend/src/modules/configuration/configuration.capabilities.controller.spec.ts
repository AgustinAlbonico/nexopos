import { Test, type TestingModule } from '@nestjs/testing';
import { DECORATORS } from '@nestjs/swagger/dist/constants';

import { ConfigurationController } from './configuration.controller';
import { ConfigurationService, type CapabilitiesResponse } from './configuration.service';
import { CAPABILITY_PRESETS, CURRENT_CAPABILITIES_SCHEMA_VERSION } from './capabilities/presets';
import type { UpdateCapabilitiesDto } from './dto/update-capabilities.dto';
import type { UpdateConfigurationDto } from './dto/update-configuration.dto';
import type { SystemConfiguration } from './entities/system-configuration.entity';

function okResponseTypeName(method: object): string | undefined {
    const metadata: unknown = Reflect.getMetadata(DECORATORS.API_RESPONSE, method);
    const response: unknown = typeof metadata === 'object' && metadata !== null
        ? Object.getOwnPropertyDescriptor(metadata, '200')?.value
        : undefined;
    const typeValue: unknown = typeof response === 'object' && response !== null
        ? Object.getOwnPropertyDescriptor(response, 'type')?.value
        : undefined;
    return typeof typeValue === 'function' ? typeValue.name : undefined;
}

type ControllerService = Pick<
    ConfigurationService,
    'getCapabilitiesManifest' | 'getCapabilitiesResponse' | 'getLegacyResponse' | 'updateAllProductsPrices' | 'updateCapabilities' | 'updateConfiguration'
>;

const legacyResponse = {
    id: 'config-1',
    defaultProfitMargin: 30,
    minStockAlert: 5,
    sistemaHabilitado: true,
    barcodeScannerEnabled: false,
    barcodeScannerTimeoutMs: 100,
    allowOutOfStockSale: false,
    stockSectorizado: true,
    primarySaleLocationId: null,
    defaultReceiveLocationId: null,
    stockMinimoVenta: 5,
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

const capabilitiesResponse: CapabilitiesResponse = {
    profileKey: 'simple-retail',
    profileVersion: 1,
    capabilitiesSchemaVersion: CURRENT_CAPABILITIES_SCHEMA_VERSION,
    capabilities: CAPABILITY_PRESETS['simple-retail'],
    onboardingCompleted: false,
    selectedBusinessType: null,
};

const systemConfig: SystemConfiguration = {
    ...legacyResponse,
    profileKey: 'simple-retail',
    profileVersion: 1,
    capabilitiesJson: {},
    capabilitiesSchemaVersion: CURRENT_CAPABILITIES_SCHEMA_VERSION,
    onboardingCompleted: false,
    selectedBusinessType: null,
};

describe('ConfigurationController capabilities boundary', () => {
    let controller: ConfigurationController;
    let service: jest.Mocked<ControllerService>;

    beforeEach(async () => {
        service = {
            getCapabilitiesManifest: jest.fn(),
            getCapabilitiesResponse: jest.fn(),
            getLegacyResponse: jest.fn(),
            updateAllProductsPrices: jest.fn(),
            updateCapabilities: jest.fn(),
            updateConfiguration: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ConfigurationController],
            providers: [{ provide: ConfigurationService, useValue: service }],
        }).compile();

        controller = module.get(ConfigurationController);
    });

    afterEach(() => jest.clearAllMocks());

    it('Given Nest runtime metadata When controller is reflected Then ConfigurationService is the DI token', () => {
        expect(Reflect.getMetadata('design:paramtypes', ConfigurationController)).toEqual([ConfigurationService]);
    });

    it('Given capability routes When Swagger metadata is reflected Then concrete response DTOs are documented', () => {
        expect(okResponseTypeName(ConfigurationController.prototype.getCapabilities)).toBe('CapabilitiesResponseDto');
        expect(okResponseTypeName(ConfigurationController.prototype.getCapabilitiesManifest)).toBe('CapabilitiesManifestResponseDto');
        expect(okResponseTypeName(ConfigurationController.prototype.updateCapabilities)).toBe('CapabilitiesResponseDto');
    });

    it('Given GET configuration When called Then returns legacy response without metadata', async () => {
        service.getLegacyResponse.mockResolvedValue(legacyResponse);

        const result = await controller.getConfiguration();

        expect(service.getLegacyResponse).toHaveBeenCalledTimes(1);
        expect(Object.keys(result)).not.toContain('profileKey');
        expect(result).toEqual(legacyResponse);
    });

    it('Given PATCH configuration When called Then preserves update-all-prices behavior and returns legacy response', async () => {
        const updateDto: UpdateConfigurationDto = { defaultProfitMargin: 40 };
        const updated = { ...legacyResponse, defaultProfitMargin: 40 };
        service.updateConfiguration.mockResolvedValue({ ...systemConfig, defaultProfitMargin: 40 });
        service.getLegacyResponse.mockResolvedValue(updated);

        const result = await controller.updateConfiguration(updateDto);

        expect(service.updateConfiguration).toHaveBeenCalledWith(updateDto);
        expect(service.getLegacyResponse).toHaveBeenCalledWith({ ...systemConfig, defaultProfitMargin: 40 });
        expect(result.defaultProfitMargin).toBe(40);
    });

    it('Given capability endpoints When called Then delegates to exact service helpers', async () => {
        const dto: UpdateCapabilitiesDto = {
            profileKey: 'weight',
            capabilitiesSchemaVersion: CURRENT_CAPABILITIES_SCHEMA_VERSION,
            capabilities: { 'APP_ROUTES.products': false },
        };
        const manifest = { ...capabilitiesResponse, appRoutes: { enabled: ['dashboard'], disabled: ['products'] } };
        service.getCapabilitiesResponse.mockResolvedValue(capabilitiesResponse);
        service.getCapabilitiesManifest.mockResolvedValue(manifest);
        service.updateCapabilities.mockResolvedValue({ ...capabilitiesResponse, profileKey: 'weight' });

        await expect(controller.getCapabilities()).resolves.toEqual(capabilitiesResponse);
        await expect(controller.getCapabilitiesManifest()).resolves.toEqual(manifest);
        await expect(controller.updateCapabilities(dto)).resolves.toEqual({ ...capabilitiesResponse, profileKey: 'weight' });
        expect(service.updateCapabilities).toHaveBeenCalledWith(dto);
    });
});
