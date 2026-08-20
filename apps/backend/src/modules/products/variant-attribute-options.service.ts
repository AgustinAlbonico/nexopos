import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { ILike } from 'typeorm';
import { VariantAttributeOptionsRepository } from './variant-attribute-options.repository';
import {
    CreateVariantAttributeOptionDto,
    UpdateVariantAttributeOptionDto,
} from './dto';
import {
    VariantAttributeOption,
    VariantAttributeType,
} from './entities/variant-attribute-option.entity';
import { ConfigurationService } from '../configuration/configuration.service';

@Injectable()
export class VariantAttributeOptionsService {
    constructor(
        private readonly repository: VariantAttributeOptionsRepository,
        private readonly configurationService: ConfigurationService,
    ) { }

    async findOrCreate(
        type: VariantAttributeType,
        name: string,
        colorHex?: string | null,
    ): Promise<VariantAttributeOption> {
        await this.gate();
        return this.repository.findOrCreateByName(type, name, colorHex);
    }

    async findAll(type?: VariantAttributeType): Promise<VariantAttributeOption[]> {
        await this.gate();
        return this.repository.findAllByType(type);
    }

    async search(type: VariantAttributeType, query: string): Promise<VariantAttributeOption[]> {
        await this.gate();
        return this.repository.searchByName(type, query);
    }

    async findOne(id: string): Promise<VariantAttributeOption> {
        await this.gate();
        const option = await this.repository.findOne({ where: { id } });
        if (!option) {
            throw new NotFoundException('Opción de variante no encontrada');
        }
        return option;
    }

    async getUsageCount(id: string): Promise<{ usageCount: number }> {
        await this.gate();
        const option = await this.findOne(id);
        const usageCount = await this.repository.countUsage(option.type, option.name);
        return { usageCount };
    }

    async create(dto: CreateVariantAttributeOptionDto): Promise<VariantAttributeOption> {
        await this.gate();
        return this.repository.findOrCreateByName(dto.type, dto.name, dto.colorHex ?? null);
    }

    async update(
        id: string,
        dto: UpdateVariantAttributeOptionDto,
    ): Promise<VariantAttributeOption> {
        await this.gate();
        const option = await this.findOne(id);

        if (dto.name !== undefined) {
            const trimmedName = dto.name.trim();
            if (!trimmedName) {
                throw new ConflictException(
                    'El nombre de la opción de variante no puede estar vacío',
                );
            }
            if (trimmedName !== option.name) {
                const duplicate = await this.repository.findOne({
                    where: { type: option.type, name: ILike(trimmedName) },
                });
                if (duplicate && duplicate.id !== id) {
                    throw new ConflictException(
                        'Ya existe otra opción con ese nombre en este tipo',
                    );
                }
                option.name = trimmedName;
            }
        }

        if (dto.colorHex !== undefined) {
            option.colorHex = dto.colorHex;
        }

        return this.repository.save(option);
    }

    async remove(id: string): Promise<{ message: string; usageCount: number }> {
        await this.gate();
        const option = await this.findOne(id);
        const usageCount = await this.repository.countUsage(option.type, option.name);
        await this.repository.remove(option);
        return { message: 'Opción de variante eliminada', usageCount };
    }

    private async gate(): Promise<void> {
        await this.configurationService.assertCapabilityEnabled('STRUCTURAL.variants');
    }
}