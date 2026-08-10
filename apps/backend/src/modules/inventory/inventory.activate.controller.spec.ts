/**
 * Tests unitarios para InventoryController.activate (PR3).
 *
 * Cubre:
 * - Happy path: delega en ActivationService.activate y devuelve el resultado.
 * - 409 cuando el servicio lanza ConflictException.
 * - 400 cuando el servicio lanza BadRequestException.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { ActivationService } from './activation.service';

describe('InventoryController.activate (PR3)', () => {
    let controller: InventoryController;
    let activationService: jest.Mocked<ActivationService>;
    let inventoryService: jest.Mocked<InventoryService>;

    beforeEach(async () => {
        activationService = {
            activate: jest.fn(),
        } as unknown as jest.Mocked<ActivationService>;
        inventoryService = {} as unknown as jest.Mocked<InventoryService>;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [InventoryController],
            providers: [
                { provide: InventoryService, useValue: inventoryService },
                { provide: ActivationService, useValue: activationService },
            ],
        }).compile();

        controller = module.get<InventoryController>(InventoryController);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('delega en activationService.activate y devuelve el resultado', async () => {
        const dto = {
            locations: [
                { name: 'Salón', function: 'SALE', isPrimarySale: true },
                { name: 'Depósito', function: 'STORAGE', isDefaultReceive: true },
            ],
            initialStockLocationName: 'Salón',
        } as unknown as Parameters<typeof controller.activate>[0];
        const expected = { ok: true as const, products: 10, locations: 2 };
        activationService.activate.mockResolvedValue(expected);

        const result = await controller.activate(dto);

        expect(activationService.activate).toHaveBeenCalledWith(dto);
        expect(result).toEqual(expected);
    });

    it('propaga ConflictException cuando el modo ya está activo (409)', async () => {
        const dto = { locations: [], initialStockLocationName: 'x' } as unknown as Parameters<typeof controller.activate>[0];
        activationService.activate.mockRejectedValue(new ConflictException('ya está activo'));

        await expect(controller.activate(dto)).rejects.toThrow(ConflictException);
    });

    it('propaga BadRequestException cuando los datos son inválidos (400)', async () => {
        const dto = { locations: [], initialStockLocationName: 'x' } as unknown as Parameters<typeof controller.activate>[0];
        activationService.activate.mockRejectedValue(new BadRequestException('Datos inválidos'));

        await expect(controller.activate(dto)).rejects.toThrow(BadRequestException);
    });
});
