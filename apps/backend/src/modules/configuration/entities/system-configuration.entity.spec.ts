import { getMetadataArgsStorage } from 'typeorm';
import { SystemConfiguration } from './system-configuration.entity';

describe('SystemConfiguration entity metadata', () => {
    const columns = getMetadataArgsStorage().columns.filter(column => column.target === SystemConfiguration);

    function column(propertyName: string): (typeof columns)[number] {
        const metadata = columns.find(item => item.propertyName === propertyName);
        if (metadata === undefined) {
            throw new Error(`Column metadata not found for ${propertyName}`);
        }
        return metadata;
    }

    it('matches the capability metadata migration contract', () => {
        expect(column('profileKey').options).toEqual(expect.objectContaining({
            name: 'profile_key', type: 'varchar', length: 64, default: 'simple-retail',
        }));
        expect(column('profileVersion').options).toEqual(expect.objectContaining({
            name: 'profile_version', type: 'int', default: 1,
        }));

        const capabilitiesDefault = column('capabilitiesJson').options.default;
        expect(column('capabilitiesJson').options).toEqual(expect.objectContaining({
            name: 'capabilities_json', type: 'jsonb',
        }));
        expect(typeof capabilitiesDefault).toBe('function');
        expect(capabilitiesDefault()).toBe("'{}'::jsonb");

        expect(column('capabilitiesSchemaVersion').options).toEqual(expect.objectContaining({
            name: 'capabilities_schema_version', type: 'int', default: 1,
        }));
    });

    it('keeps stock-sectorized metadata present', () => {
        expect(column('stockSectorizado').options).toEqual(expect.objectContaining({ type: 'boolean', default: false }));
        expect(column('primarySaleLocationId').options).toEqual(expect.objectContaining({ type: 'uuid', nullable: true }));
        expect(column('defaultReceiveLocationId').options).toEqual(expect.objectContaining({ type: 'uuid', nullable: true }));
        expect(column('stockMinimoVenta').options).toEqual(expect.objectContaining({ type: 'int', default: 5 }));
    });

    it('stores an optional local variable-barcode layout', () => {
        expect(column('variableBarcodeLayout').options).toEqual(expect.objectContaining({
            name: 'variable_barcode_layout', type: 'jsonb', nullable: true,
        }));
    });
});
