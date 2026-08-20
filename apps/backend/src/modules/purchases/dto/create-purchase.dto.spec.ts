/**
 * Tests unitarios para CreatePurchaseDto.
 * Cubre: providerName opcional cuando hay supplierId, ambos, solo providerName.
 */
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreatePurchaseDto, CreatePurchaseItemDto } from './create-purchase.dto';
import { PurchaseStatus } from '../entities/purchase.entity';

const baseItem = (): CreatePurchaseItemDto =>
    plainToInstance(CreatePurchaseItemDto, {
        productId: 'product-1',
        quantity: 2,
        unitPrice: 100,
    });

const baseDto = (overrides: Partial<CreatePurchaseDto> = {}): CreatePurchaseDto =>
    plainToInstance(CreatePurchaseDto, {
        supplierId: 'supplier-1',
        providerName: 'Proveedor X',
        purchaseDate: '2026-08-19',
        items: [baseItem()],
        ...overrides,
    });

async function validateDto(dto: CreatePurchaseDto) {
    return validate(dto, { whitelist: true });
}

describe('CreatePurchaseDto — providerName handling (F1)', () => {
    it('acepta DTO con supplierId y sin providerName (legacy FE)', async () => {
        const dto = baseDto({ supplierId: 'supplier-1' });
        delete (dto as { providerName?: string }).providerName;

        const errors = await validateDto(dto);
        expect(errors).toEqual([]);
    });

    it('acepta DTO con supplierId y providerName vacíos', async () => {
        const dto = baseDto({ supplierId: 'supplier-1', providerName: '' });

        const errors = await validateDto(dto);
        expect(errors).toEqual([]);
    });

    it('acepta DTO con ambos supplierId y providerName', async () => {
        const dto = baseDto({ supplierId: 'supplier-1', providerName: 'Proveedor X' });

        const errors = await validateDto(dto);
        expect(errors).toEqual([]);
    });

    it('acepta DTO solo con providerName (sin supplierId)', async () => {
        const dto = baseDto({ providerName: 'Proveedor X' });
        delete (dto as { supplierId?: string }).supplierId;

        const errors = await validateDto(dto);
        expect(errors).toEqual([]);
    });

    it('rechaza DTO sin purchaseDate (sigue siendo requerido)', async () => {
        const dto = baseDto();
        delete (dto as { purchaseDate?: string }).purchaseDate;

        const errors = await validateDto(dto);
        const purchaseDateError = errors.find(e => e.property === 'purchaseDate');
        expect(purchaseDateError).toBeDefined();
    });

    it('rechaza DTO sin items (sigue siendo requerido)', async () => {
        const dto = baseDto();
        delete (dto as { items?: CreatePurchaseItemDto[] }).items;

        const errors = await validateDto(dto);
        const itemsError = errors.find(e => e.property === 'items');
        expect(itemsError).toBeDefined();
    });

    it('rechaza providerName que excede 200 caracteres', async () => {
        const dto = baseDto({ providerName: 'a'.repeat(201) });

        const errors = await validateDto(dto);
        const providerNameError = errors.find(e => e.property === 'providerName');
        expect(providerNameError).toBeDefined();
    });

    it('acepta status y paymentMethodId (PENDING con paymentMethodId opcional)', async () => {
        const dto = baseDto({ status: PurchaseStatus.PENDING, paymentMethodId: 'pm-1' });

        const errors = await validateDto(dto);
        expect(errors).toEqual([]);
    });
});
