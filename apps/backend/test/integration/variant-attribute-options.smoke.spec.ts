/**
 * Smoke test de integración para VariantAttributeOptions.
 *
 * Cubre los 7 endpoints REST que expone el controller, ejercitando el
 * service real contra la BD real de tests (testDataSource). La lógica de
 * capabilities vive en el service, así que este test también prueba que
 * STRUCTURAL.variants=true (default) deja pasar las operaciones.
 *
 * Casos cubiertos:
 *  - list all / list by type
 *  - search por nombre dentro de un tipo
 *  - find-or-create idempotente (mismo nombre → mismo id)
 *  - update de name y colorHex
 *  - update con nombre duplicado dentro del mismo tipo → ConflictException
 *  - usage-count devuelve { usageCount }
 *  - delete OK y delete de id inexistente → NotFoundException → 404
 */
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { testDataSource } from '../setup-integration';
import { VariantAttributeOption } from '../../src/modules/products/entities/variant-attribute-option.entity';
import { VariantAttributeOptionsRepository } from '../../src/modules/products/variant-attribute-options.repository';
import { VariantAttributeOptionsService } from '../../src/modules/products/variant-attribute-options.service';
import { ConfigurationService } from '../../src/modules/configuration/configuration.service';
import { SystemConfiguration } from '../../src/modules/configuration/entities/system-configuration.entity';

describe('Integración: variant-attribute-options (smoke)', () => {
    let dataSource: DataSource;
    let service: VariantAttributeOptionsService;

    beforeAll(async () => {
        dataSource = testDataSource;

        // El repository de variantes extiende Repository<T> con createEntityManager().
        const variantRepo = new VariantAttributeOptionsRepository(dataSource);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VariantAttributeOptionsService,
                { provide: VariantAttributeOptionsRepository, useValue: variantRepo },
                ConfigurationService,
                { provide: DataSource, useValue: dataSource },
                {
                    provide: getRepositoryToken(SystemConfiguration),
                    useValue: dataSource.getRepository(SystemConfiguration) as Repository<SystemConfiguration>,
                },
            ],
        }).compile();

        service = module.get<VariantAttributeOptionsService>(VariantAttributeOptionsService);
    });

    it('lista vacía cuando no hay opciones', async () => {
        const all = await service.findAll();
        expect(all).toEqual([]);
    });

    it('find-or-create es idempotente: dos llamadas con el mismo name devuelven el mismo id', async () => {
        const first = await service.findOrCreate('color', 'Negro', '#18181b');
        const second = await service.findOrCreate('color', 'NEGRO', '#000000');
        const third = await service.findOrCreate('color', '  negro  ', null);

        expect(second.id).toBe(first.id);
        expect(third.id).toBe(first.id);
        expect(first.colorHex).toBe('#18181b');
    });

    it('findOrCreate de size no toca colorHex', async () => {
        const talle = await service.findOrCreate('size', 'XL');
        expect(talle.type).toBe('size');
        expect(talle.colorHex).toBeNull();
    });

    it('findAll filtra por type', async () => {
        await service.findOrCreate('color', 'Negro');
        await service.findOrCreate('size', 'XL');

        const colors = await service.findAll('color');
        const sizes = await service.findAll('size');

        expect(colors.length).toBeGreaterThan(0);
        expect(sizes.length).toBeGreaterThan(0);
        expect(colors.every((o) => o.type === 'color')).toBe(true);
        expect(sizes.every((o) => o.type === 'size')).toBe(true);
    });

    it('search devuelve coincidencias por nombre dentro del tipo', async () => {
        await service.findOrCreate('color', 'Negro');

        const results = await service.search('color', 'neg');

        expect(results.length).toBeGreaterThan(0);
        expect(results.every((o) => o.type === 'color')).toBe(true);
        expect(results[0].name.toLowerCase()).toContain('neg');
    });

    it('update modifica name y/o colorHex', async () => {
        const target = await service.findOrCreate('color', 'Azul');

        const updated = await service.update(target.id, {
            name: 'Azul Marino',
            colorHex: '#1e3a8a',
        });

        expect(updated.name).toBe('Azul Marino');
        expect(updated.colorHex).toBe('#1e3a8a');

        const reloaded = await service.findOne(target.id);
        expect(reloaded.name).toBe('Azul Marino');
        expect(reloaded.colorHex).toBe('#1e3a8a');
    });

    it('update con nombre duplicado dentro del mismo tipo lanza ConflictException', async () => {
        const a = await service.findOrCreate('color', 'Verde');
        const b = await service.findOrCreate('color', 'Bermellón');

        await expect(
            service.update(b.id, { name: 'VERDE' }),
        ).rejects.toThrow(/Ya existe otra opción con ese nombre/);
    });

    it('getUsageCount devuelve { usageCount } y maneja la ausencia de product_variant_attributes', async () => {
        const target = await service.findOrCreate('size', 'M');
        const result = await service.getUsageCount(target.id);
        expect(result).toHaveProperty('usageCount');
        expect(typeof result.usageCount).toBe('number');
        expect(result.usageCount).toBeGreaterThanOrEqual(0);
    });

    it('remove devuelve { message, usageCount } y borra la fila', async () => {
        const target = await service.findOrCreate('color', 'Beige');
        const result = await service.remove(target.id);

        expect(result.message).toBe('Opción de variante eliminada');
        expect(typeof result.usageCount).toBe('number');

        await expect(service.findOne(target.id)).rejects.toThrow();
    });

    it('remove de id inexistente lanza NotFoundException (mapea a HTTP 404 en el controller)', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        await expect(service.remove(fakeId)).rejects.toThrow(/Opción de variante no encontrada/);
    });
});