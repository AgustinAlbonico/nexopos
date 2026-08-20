import { createPurchaseSchema } from './purchase.schema';
import { PurchaseStatus } from '../types';

const baseValid = () => ({
    supplierId: '',
    providerName: '',
    providerDocument: '',
    providerPhone: '',
    purchaseDate: '2026-08-19',
    tax: 0,
    discount: 0,
    status: PurchaseStatus.PAID,
    paymentMethodId: 'pm-1',
    paidAt: '',
    invoiceNumber: '',
    notes: '',
    items: [{ productId: 'product-1', quantity: 1, unitPrice: 100, notes: '' }],
});

describe('createPurchaseSchema — provider validation (F1)', () => {
    it('falla cuando supplierId y providerName están vacíos', () => {
        const result = createPurchaseSchema.safeParse(baseValid());
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = result.error.issues.find(i => i.path.includes('providerName'));
            expect(issue?.message).toBe('Seleccioná un proveedor o ingresá un nombre');
        }
    });

    it('pasa con supplierId válido y providerName vacío (BE lo deriva)', () => {
        const data = { ...baseValid(), supplierId: 'supplier-1' };
        const result = createPurchaseSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('pasa con providerName válido y sin supplierId', () => {
        const data = { ...baseValid(), providerName: 'Proveedor X' };
        const result = createPurchaseSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('pasa con ambos (supplierId + providerName)', () => {
        const data = { ...baseValid(), supplierId: 'supplier-1', providerName: 'Proveedor X' };
        const result = createPurchaseSchema.safeParse(data);
        expect(result.success).toBe(true);
    });

    it('rechaza providerName solo con espacios (trim vacío)', () => {
        const data = { ...baseValid(), providerName: '   ' };
        const result = createPurchaseSchema.safeParse(data);
        expect(result.success).toBe(false);
    });

    it('sigue exigiendo paymentMethodId cuando status=PAID', () => {
        const data = { ...baseValid(), status: PurchaseStatus.PAID, paymentMethodId: '' };
        const result = createPurchaseSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = result.error.issues.find(i => i.path.includes('paymentMethodId'));
            expect(issue?.message).toBe('El método de pago es requerido cuando la compra está pagada');
        }
    });

    it('permite status=PENDING sin paymentMethodId (siempre que haya proveedor)', () => {
        const data = {
            ...baseValid(),
            status: PurchaseStatus.PENDING,
            paymentMethodId: '',
            supplierId: 'supplier-1',
        };
        const result = createPurchaseSchema.safeParse(data);
        expect(result.success).toBe(true);
    });
});
