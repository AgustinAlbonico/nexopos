import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { VariantAttributeOptionsService } from './variant-attribute-options.service';
import { VariantAttributeOptionsRepository } from './variant-attribute-options.repository';
import { ConfigurationService } from '../configuration/configuration.service';

const mockRepository = {
    findOrCreateByName: jest.fn(),
    findAllByType: jest.fn(),
    searchByName: jest.fn(),
    findOne: jest.fn(),
    countUsage: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
};

const mockConfigurationService = {
    getCapabilitiesManifest: jest.fn(),
    assertCapabilityEnabled: jest.fn(),
};

const manifestAllOn = {
    'STRUCTURAL.variants': true,
    'STRUCTURAL.weight': false,
    'STRUCTURAL.expiry': false,
};

const manifestVariantsOff = {
    'STRUCTURAL.variants': false,
    'STRUCTURAL.weight': false,
    'STRUCTURAL.expiry': false,
};

describe('VariantAttributeOptionsService', () => {
    let service: VariantAttributeOptionsService;

    const arrangeCapabilityOn = () => {
        mockConfigurationService.getCapabilitiesManifest.mockResolvedValue(manifestAllOn);
        mockConfigurationService.assertCapabilityEnabled.mockImplementation(async (key: string) => {
            const manifest = await mockConfigurationService.getCapabilitiesManifest();
            if (manifest[key] === false) {
                throw new ForbiddenException(`La capacidad "${key}" no está habilitada`);
            }
        });
    };

    const arrangeCapabilityOff = () => {
        mockConfigurationService.getCapabilitiesManifest.mockResolvedValue(manifestVariantsOff);
        mockConfigurationService.assertCapabilityEnabled.mockImplementation(async (key: string) => {
            const manifest = await mockConfigurationService.getCapabilitiesManifest();
            if (manifest[key] === false) {
                throw new ForbiddenException(`La capacidad "${key}" no está habilitada`);
            }
        });
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        arrangeCapabilityOn();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VariantAttributeOptionsService,
                { provide: VariantAttributeOptionsRepository, useValue: mockRepository },
                { provide: ConfigurationService, useValue: mockConfigurationService },
            ],
        }).compile();

        service = module.get<VariantAttributeOptionsService>(VariantAttributeOptionsService);
    });

    it('1) findAll devuelve las opciones ordenadas alfabéticamente', async () => {
        const sorted = [
            { id: '1', type: 'color', name: 'Azul', colorHex: '#2563eb' },
            { id: '2', type: 'color', name: 'Negro', colorHex: '#18181b' },
            { id: '3', type: 'color', name: 'Rojo', colorHex: '#dc2626' },
        ];
        mockRepository.findAllByType.mockResolvedValue(sorted);

        const result = await service.findAll('color');

        expect(result).toEqual(sorted);
        expect(mockRepository.findAllByType).toHaveBeenCalledWith('color');
        expect(mockConfigurationService.assertCapabilityEnabled).toHaveBeenCalledWith('STRUCTURAL.variants');
    });

    it('2) findOrCreate encuentra existente case-insensitive', async () => {
        const existing = { id: '1', type: 'color', name: 'Negro', colorHex: '#18181b' };
        mockRepository.findOrCreateByName.mockResolvedValue(existing);

        const result = await service.findOrCreate('color', 'NEGRO', '#000000');

        expect(result).toBe(existing);
        expect(mockRepository.findOrCreateByName).toHaveBeenCalledWith('color', 'NEGRO', '#000000');
    });

    it('3) findOrCreate crea nueva cuando no existe', async () => {
        const created = { id: 'new', type: 'size', name: 'XS', colorHex: null };
        mockRepository.findOrCreateByName.mockResolvedValue(created);

        const result = await service.findOrCreate('size', 'XS');

        expect(result).toBe(created);
        expect(mockRepository.findOrCreateByName).toHaveBeenCalledWith('size', 'XS', undefined);
    });

    it('4) update lanza ConflictException en duplicado case-insensitive', async () => {
        const target = { id: '1', type: 'color', name: 'Negro', colorHex: '#18181b' };
        const duplicate = { id: '2', type: 'color', name: 'Negro', colorHex: '#000000' };
        mockRepository.findOne
            .mockResolvedValueOnce(target)
            .mockResolvedValueOnce(duplicate);

        await expect(
            service.update('1', { name: 'negro' }),
        ).rejects.toThrow(ConflictException);
        expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('5) findAll lanza ForbiddenException cuando STRUCTURAL.variants está OFF', async () => {
        jest.clearAllMocks();
        arrangeCapabilityOff();

        await expect(service.findAll('color')).rejects.toThrow(ForbiddenException);
        expect(mockRepository.findAllByType).not.toHaveBeenCalled();
    });

    it('6) remove devuelve usageCount sin tocar product_variant_attributes', async () => {
        const target = { id: '1', type: 'color', name: 'Negro', colorHex: '#18181b' };
        mockRepository.findOne.mockResolvedValue(target);
        mockRepository.countUsage.mockResolvedValue(7);
        mockRepository.remove.mockResolvedValue(target);

        const result = await service.remove('1');

        expect(result).toEqual({ message: 'Opción de variante eliminada', usageCount: 7 });
        expect(mockRepository.countUsage).toHaveBeenCalledWith('color', 'Negro');
        expect(mockRepository.remove).toHaveBeenCalledWith(target);
        expect(mockRepository.countUsage).toHaveBeenCalledTimes(1);
    });

    it('bonus) findOne lanza NotFoundException cuando el id no existe', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        await expect(service.findOne('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('bonus) search llama al repository con type y query', async () => {
        const matches = [{ id: '1', type: 'color', name: 'Azul', colorHex: '#2563eb' }];
        mockRepository.searchByName.mockResolvedValue(matches);

        const result = await service.search('color', 'az');

        expect(result).toEqual(matches);
        expect(mockRepository.searchByName).toHaveBeenCalledWith('color', 'az');
    });
});