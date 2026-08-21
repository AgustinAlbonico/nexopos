import { SupplierSchema } from './supplier.schema';

describe('SupplierSchema', () => {
    const validSupplier = {
        name: 'Proveedor Distribuidora SA',
        tradeName: 'Distribuidora SA',
        documentType: 'CUIT' as const,
        documentNumber: '30-12345678-9',
        ivaCondition: 'RESPONSABLE_INSCRIPTO' as const,
        email: 'contacto@distribuidora.com',
        phone: '1145678901',
        mobile: '1198765432',
        address: 'Av. Corrientes 1234',
        city: 'CABA',
        state: 'CABA',
        postalCode: '1043',
        website: 'https://distribuidora.com',
        contactName: 'Juan Pérez',
        bankAccount: '0170000000000000000000',
        notes: 'Proveedor principal de insumos',
        classification: 'Mayorista',
        isActive: true,
    };

    it('valida exitosamente un proveedor con todos los campos incluyendo clasificación', () => {
        const result = SupplierSchema.safeParse(validSupplier);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.classification).toBe('Mayorista');
        }
    });

    it('permite clasificación vacía, null o undefined (campo opcional)', () => {
        const withNull = { ...validSupplier, classification: null };
        const withEmpty = { ...validSupplier, classification: '' };
        const withoutField = { ...validSupplier };
        delete (withoutField as any).classification;

        expect(SupplierSchema.safeParse(withNull).success).toBe(true);
        expect(SupplierSchema.safeParse(withEmpty).success).toBe(true);
        expect(SupplierSchema.safeParse(withoutField).success).toBe(true);
    });

    it('rechaza nombres mayores a 200 caracteres', () => {
        const invalid = { ...validSupplier, name: 'A'.repeat(201) };
        const result = SupplierSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it('rechaza clasificación mayor a 100 caracteres', () => {
        const invalid = { ...validSupplier, classification: 'A'.repeat(101) };
        const result = SupplierSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });
});
