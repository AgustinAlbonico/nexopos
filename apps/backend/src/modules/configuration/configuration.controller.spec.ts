/**
 * Tests unitarios para ConfigurationController
 * Cubre: getConfiguration, updateConfiguration, updateAllPrices
 * Enfoque: Pruebas de comportamiento usando mocks directos
 */
import { ConfigurationController } from './configuration.controller';
import { ConfigurationService } from './configuration.service';
import { SystemConfiguration } from './entities/system-configuration.entity';

describe('ConfigurationController', () => {
    let controller: ConfigurationController;
    let configurationService: jest.Mocked<ConfigurationService>;

    const mockConfig: SystemConfiguration = {
        id: 'config-uuid-123',
        defaultProfitMargin: 30,
        minStockAlert: 5,
        sistemaHabilitado: true,
        barcodeScannerEnabled: false,
        barcodeScannerTimeoutMs: 100,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
    };

    beforeEach(() => {
        configurationService = {
            getConfiguration: jest.fn(),
            updateConfiguration: jest.fn(),
            updateAllProductsPrices: jest.fn(),
        } as unknown as jest.Mocked<ConfigurationService>;

        controller = new ConfigurationController(configurationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getConfiguration()', () => {
        it('debe llamar a configurationService.getConfiguration y retornar el resultado', async () => {
            configurationService.getConfiguration.mockResolvedValue(mockConfig);

            const result = await controller.getConfiguration();

            expect(configurationService.getConfiguration).toHaveBeenCalled();
            expect(result).toEqual(mockConfig);
        });

        it('debe propagar errores del servicio', async () => {
            const error = new Error('Database connection failed');
            configurationService.getConfiguration.mockRejectedValue(error);

            await expect(controller.getConfiguration()).rejects.toThrow(error);
            expect(configurationService.getConfiguration).toHaveBeenCalled();
        });
    });

    describe('updateConfiguration()', () => {
        it('debe llamar a configurationService.updateConfiguration con el DTO proporcionado', async () => {
            const updateDto = { defaultProfitMargin: 40 };
            const updatedConfig = { ...mockConfig, defaultProfitMargin: 40 };
            configurationService.updateConfiguration.mockResolvedValue(updatedConfig);

            const result = await controller.updateConfiguration(updateDto);

            expect(configurationService.updateConfiguration).toHaveBeenCalledWith(updateDto);
            expect(result).toEqual(updatedConfig);
        });

        it('debe aceptar actualizaciones parciales de configuración', async () => {
            const updateDto = { minStockAlert: 10 };
            const updatedConfig = { ...mockConfig, minStockAlert: 10 };
            configurationService.updateConfiguration.mockResolvedValue(updatedConfig);

            const result = await controller.updateConfiguration(updateDto);

            expect(configurationService.updateConfiguration).toHaveBeenCalledWith(updateDto);
            expect(result.minStockAlert).toBe(10);
        });

        it('debe propagar errores del servicio', async () => {
            const updateDto = { defaultProfitMargin: 40 };
            const error = new Error('Invalid configuration value');
            configurationService.updateConfiguration.mockRejectedValue(error);

            await expect(controller.updateConfiguration(updateDto)).rejects.toThrow(error);
        });
    });

    describe('updateAllPrices()', () => {
        it('debe llamar a configurationService.updateAllProductsPrices con el margen proporcionado', async () => {
            const updateDto = { defaultProfitMargin: 35 };
            const expectedResult = {
                updated: 10,
                margin: 35,
                skipped: 2,
                skippedByCategory: 1,
            };
            configurationService.updateAllProductsPrices.mockResolvedValue(expectedResult);

            const result = await controller.updateAllPrices(updateDto);

            expect(configurationService.updateAllProductsPrices).toHaveBeenCalledWith(35);
            expect(result).toEqual(expectedResult);
        });

        it('debe manejar el caso cuando no se proporciona margen', async () => {
            const updateDto = {};
            const expectedResult = {
                updated: 5,
                margin: 30,
                skipped: 0,
                skippedByCategory: 0,
            };
            configurationService.updateAllProductsPrices.mockResolvedValue(expectedResult);

            const result = await controller.updateAllPrices(updateDto);

            expect(configurationService.updateAllProductsPrices).toHaveBeenCalledWith(undefined);
            expect(result.updated).toBe(5);
        });

        it('debe propagar errores del servicio', async () => {
            const updateDto = { defaultProfitMargin: 35 };
            const error = new Error('Failed to update prices');
            configurationService.updateAllProductsPrices.mockRejectedValue(error);

            await expect(controller.updateAllPrices(updateDto)).rejects.toThrow(error);
        });

        it('debe reportar correctamente productos omitidos', async () => {
            const updateDto = { defaultProfitMargin: 25 };
            const expectedResult = {
                updated: 8,
                margin: 25,
                skipped: 5,
                skippedByCategory: 2,
            };
            configurationService.updateAllProductsPrices.mockResolvedValue(expectedResult);

            const result = await controller.updateAllPrices(updateDto);

            expect(result.skipped).toBe(5);
            expect(result.skippedByCategory).toBe(2);
        });
    });
});
