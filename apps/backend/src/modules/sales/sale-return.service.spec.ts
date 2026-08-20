import { BadRequestException, NotFoundException } from '@nestjs/common';

import { SaleReturnService } from './sale-return.service';
import { StockMovementSource, StockMovementType } from '../inventory/entities/stock-movement.entity';

describe('SaleReturnService', () => {
    const saleRepo = {
        findOne: jest.fn(),
    };
    const returnRepo = {
        create: jest.fn((value) => value),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
    };
    const returnItemRepo = {
        create: jest.fn((value) => value),
    };
    const dataSource = {
        transaction: jest.fn((callback) => callback(manager)),
    };
    const manager = {
        createQueryBuilder: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        save: jest.fn(async (value) => value),
    };
    const inventoryService = {
        recordMovementInLocation: jest.fn(),
    };
    const cashRegisterService = {
        registerRefundWithManager: jest.fn(),
    };
    const customerAccountsService = {
        createAdjustmentWithManager: jest.fn(),
    };
    const pdfGeneratorService = {
        generateSaleReturnReceiptPdf: jest.fn(),
    };
    const creditNoteService = {
        authorizeReturn: jest.fn(),
    };

    let service: SaleReturnService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new (SaleReturnService as unknown as { new(...args: unknown[]): SaleReturnService })(
            saleRepo as never,
            returnRepo as never,
            returnItemRepo as never,
            dataSource as never,
            inventoryService as never,
            cashRegisterService as never,
            customerAccountsService as never,
            pdfGeneratorService as never,
            creditNoteService,
        );
    });

    function mockLockedSale(sale: Record<string, unknown>) {
        const saleBuilder = { leftJoinAndSelect: jest.fn().mockReturnThis(), setLock: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(sale) };
        const returnBuilder = { leftJoinAndSelect: jest.fn().mockReturnThis(), setLock: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne: jest.fn() };
        manager.createQueryBuilder
            .mockReturnValueOnce(returnBuilder)
            .mockReturnValueOnce(saleBuilder);
        return { saleBuilder, returnBuilder };
    }

    it('creates a partial return when remaining sold quantity covers it', async () => {
        saleRepo.findOne.mockResolvedValue({
            id: 'sale-1',
            customerId: 'customer-1',
            cashRegisterSessionId: 'cash-1',
            items: [{ id: 'item-1', quantity: 5 }],
        });
        returnRepo.find.mockResolvedValue([
            { items: [{ originalSaleItemId: 'item-1', quantityReturned: 2 }] },
        ]);
        returnRepo.save.mockImplementation(async (saleReturn) => ({ id: 'return-1', ...saleReturn }));

        const result = await service.create({
            originalSaleId: 'sale-1',
            totalRefund: 30,
            totalExchangeAmount: 0,
            items: [{
                originalSaleItemId: 'item-1',
                quantityReturned: 3,
                unitRefundAmount: 10,
                disposition: 'restock',
                taxSnapshot: { iva: 21 },
                capabilitySnapshot: { unit: 'u' },
            }],
        });

        expect(result.id).toBe('return-1');
        expect(returnRepo.save).toHaveBeenCalledWith(expect.objectContaining({
            originalSaleId: 'sale-1',
            customerId: 'customer-1',
            cashRegisterSessionId: 'cash-1',
            status: 'draft',
            items: [expect.objectContaining({ disposition: 'restock' })],
        }));
    });

    it('rejects cumulative partial returns above the net sold quantity', async () => {
        saleRepo.findOne.mockResolvedValue({
            id: 'sale-1',
            items: [{ id: 'item-1', quantity: 5 }],
        });
        returnRepo.find.mockResolvedValue([
            { status: 'committed', items: [{ originalSaleItemId: 'item-1', quantityReturned: 4 }] },
        ]);

        await expect(service.create({
            originalSaleId: 'sale-1',
            items: [{
                originalSaleItemId: 'item-1',
                quantityReturned: 2,
                unitRefundAmount: 10,
                disposition: 'quarantine',
            }],
        })).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate lines in the same request when their total exceeds net sold quantity', async () => {
        saleRepo.findOne.mockResolvedValue({
            id: 'sale-1',
            items: [{ id: 'item-1', quantity: 5 }],
        });
        returnRepo.find.mockResolvedValue([]);

        await expect(service.create({
            originalSaleId: 'sale-1',
            items: [
                {
                    originalSaleItemId: 'item-1',
                    quantityReturned: 3,
                    unitRefundAmount: 10,
                    disposition: 'restock',
                },
                {
                    originalSaleItemId: 'item-1',
                    quantityReturned: 3,
                    unitRefundAmount: 10,
                    disposition: 'quarantine',
                },
            ],
        })).rejects.toThrow(BadRequestException);
    });

    it('rejects unknown sale items', async () => {
        saleRepo.findOne.mockResolvedValue({ id: 'sale-1', items: [] });
        returnRepo.find.mockResolvedValue([]);

        await expect(service.create({
            originalSaleId: 'sale-1',
            items: [{
                originalSaleItemId: 'missing-item',
                quantityReturned: 1,
                unitRefundAmount: 10,
                disposition: 'scrap',
            }],
        })).rejects.toThrow(NotFoundException);
    });

    it('finds returns by original sale id', async () => {
        returnRepo.find.mockResolvedValue([{ id: 'return-1' }]);

        await expect(service.findByOriginalSale('sale-1')).resolves.toEqual([{ id: 'return-1' }]);
        expect(returnRepo.find).toHaveBeenCalledWith({
            where: { originalSaleId: 'sale-1' },
            relations: ['items'],
            order: { createdAt: 'DESC' },
        });
    });

    it('previews return totals without saving', async () => {
        saleRepo.findOne.mockResolvedValue({
            id: 'sale-1',
            items: [{ id: 'item-1', quantity: 5 }],
        });
        returnRepo.find.mockResolvedValue([]);

        await expect(service.preview({
            originalSaleId: 'sale-1',
            items: [{ originalSaleItemId: 'item-1', quantityReturned: 2, unitRefundAmount: 10, disposition: 'restock' }],
        })).resolves.toEqual(expect.objectContaining({ totalRefund: 20, totalExchangeAmount: 0 }));
        expect(returnRepo.save).not.toHaveBeenCalled();
    });

    it('commits a draft return atomically with restock inventory and cash refund', async () => {
        const sale = {
            id: 'sale-1',
            saleNumber: 'V-1',
            isOnAccount: false,
            payments: [{ amount: 20, paymentMethodId: 'pm-1' }],
            items: [{ id: 'item-1', productId: 'product-1', quantity: 5 }],
        };
        const draft = {
            id: 'return-1',
            originalSaleId: 'sale-1',
            totalRefund: 20,
            totalExchangeAmount: 0,
            status: 'draft',
            items: [{ originalSaleItemId: 'item-1', quantityReturned: 2, disposition: 'restock' }],
        };
        const { returnBuilder } = mockLockedSale(sale);
        returnBuilder.getOne.mockResolvedValue(draft);
        manager.find.mockResolvedValue([]);

        await expect(service.commit('return-1', 'user-1')).resolves.toEqual(expect.objectContaining({ status: 'committed' }));
        expect(inventoryService.recordMovementInLocation).toHaveBeenCalledWith(expect.objectContaining({
            productId: 'product-1',
            type: StockMovementType.IN,
            source: StockMovementSource.RETURN,
            quantity: 2,
            manager,
        }));
        expect(cashRegisterService.registerRefundWithManager).toHaveBeenCalledWith(expect.objectContaining({ amount: 20, paymentMethodId: 'pm-1', referenceId: 'return-1' }), 'user-1', manager);
    });

    it('distribuye proporcionalmente el reembolso entre múltiples medios de pago de la venta original (C2 / #37)', async () => {
        const sale = {
            id: 'sale-1',
            saleNumber: 'V-1',
            isOnAccount: false,
            payments: [
                { amount: 60, paymentMethodId: 'pm-cash' },
                { amount: 40, paymentMethodId: 'pm-card' },
            ],
            items: [{ id: 'item-1', productId: 'product-1', quantity: 5 }],
        };
        const draft = {
            id: 'return-1',
            originalSaleId: 'sale-1',
            totalRefund: 50,
            totalExchangeAmount: 0,
            refundPayments: null,
            status: 'draft',
            items: [{ originalSaleItemId: 'item-1', quantityReturned: 2, disposition: 'restock' }],
        };
        const { returnBuilder } = mockLockedSale(sale);
        returnBuilder.getOne.mockResolvedValue(draft);
        manager.find.mockResolvedValue([]);

        await service.commit('return-1', 'user-1');

        expect(cashRegisterService.registerRefundWithManager).toHaveBeenCalledTimes(2);
        expect(cashRegisterService.registerRefundWithManager).toHaveBeenCalledWith(
            expect.objectContaining({ amount: 30, paymentMethodId: 'pm-cash' }), 'user-1', manager
        );
        expect(cashRegisterService.registerRefundWithManager).toHaveBeenCalledWith(
            expect.objectContaining({ amount: 20, paymentMethodId: 'pm-card' }), 'user-1', manager
        );
    });

    it('authorizes a credit note after committing a fiscal sale return', async () => {
        const invoice = { id: 'invoice-1', saleId: 'sale-1', invoiceType: 6, invoiceNumber: 123, pointOfSale: 1, receiverDocumentType: 80, receiverDocumentNumber: '20123456789' };
        const sale = {
            id: 'sale-1',
            saleNumber: 'V-1',
            isFiscal: true,
            invoice,
            isOnAccount: false,
            payments: [{ amount: 20, paymentMethodId: 'pm-1' }],
            items: [{ id: 'item-1', productId: 'product-1', quantity: 5 }],
        };
        const draft = { id: 'return-1', originalSaleId: 'sale-1', totalRefund: 20, status: 'draft', items: [{ originalSaleItemId: 'item-1', quantityReturned: 2, disposition: 'restock' }] };
        const { returnBuilder } = mockLockedSale(sale);
        returnBuilder.getOne.mockResolvedValue(draft);
        manager.find.mockResolvedValue([]);
        creditNoteService.authorizeReturn.mockResolvedValue({ id: 'credit-note-1' });

        await expect(service.commit('return-1', 'user-1')).resolves.toEqual(expect.objectContaining({ status: 'committed' }));
        expect(dataSource.transaction.mock.invocationCallOrder[0]).toBeLessThan(creditNoteService.authorizeReturn.mock.invocationCallOrder[0]);
        expect(creditNoteService.authorizeReturn).toHaveBeenCalledWith({
            saleReturn: expect.objectContaining({ id: 'return-1', status: 'committed' }),
            originalInvoice: invoice,
            userId: 'user-1',
        });
    });

    it('does not authorize a credit note when committing a non-fiscal sale return', async () => {
        const sale = { id: 'sale-1', saleNumber: 'V-1', isFiscal: false, invoice: null, isOnAccount: false, payments: [{ amount: 20, paymentMethodId: 'pm-1' }], items: [{ id: 'item-1', productId: 'product-1', quantity: 5 }] };
        const draft = { id: 'return-1', originalSaleId: 'sale-1', totalRefund: 20, status: 'draft', items: [{ originalSaleItemId: 'item-1', quantityReturned: 2, disposition: 'restock' }] };
        const { returnBuilder } = mockLockedSale(sale);
        returnBuilder.getOne.mockResolvedValue(draft);
        manager.find.mockResolvedValue([]);

        await service.commit('return-1', 'user-1');

        expect(creditNoteService.authorizeReturn).not.toHaveBeenCalled();
    });

    it('rejects over-return races during commit under lock', async () => {
        const sale = { id: 'sale-1', items: [{ id: 'item-1', productId: 'product-1', quantity: 5 }] };
        const draft = { id: 'return-1', originalSaleId: 'sale-1', status: 'draft', items: [{ originalSaleItemId: 'item-1', quantityReturned: 2, disposition: 'restock' }] };
        const { returnBuilder } = mockLockedSale(sale);
        returnBuilder.getOne.mockResolvedValue(draft);
        manager.find.mockResolvedValue([{ id: 'return-2', status: 'committed', items: [{ originalSaleItemId: 'item-1', quantityReturned: 4 }] }]);

        await expect(service.commit('return-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('does not count another draft return as already committed quantity', async () => {
        const sale = { id: 'sale-1', items: [{ id: 'item-1', productId: 'product-1', quantity: 5 }] };
        const draft = { id: 'return-1', originalSaleId: 'sale-1', status: 'draft', items: [{ originalSaleItemId: 'item-1', quantityReturned: 2, disposition: 'restock' }] };
        const { returnBuilder } = mockLockedSale(sale);
        returnBuilder.getOne.mockResolvedValue(draft);
        manager.find.mockResolvedValue([{ id: 'return-2', status: 'draft', items: [{ originalSaleItemId: 'item-1', quantityReturned: 4 }] }]);

        await expect(service.commit('return-1', 'user-1')).resolves.toEqual(expect.objectContaining({ status: 'committed' }));
    });

    it('preserves decimal restock quantities instead of truncating them', async () => {
        const sale = { id: 'sale-1', items: [{ id: 'item-1', productId: 'product-1', quantity: 5 }] };
        const draft = { id: 'return-1', originalSaleId: 'sale-1', status: 'draft', items: [{ originalSaleItemId: 'item-1', quantityReturned: 1.5, disposition: 'restock' }] };
        const { returnBuilder } = mockLockedSale(sale);
        returnBuilder.getOne.mockResolvedValue(draft);
        manager.find.mockResolvedValue([]);

        await service.commit('return-1', 'user-1');
        expect(inventoryService.recordMovementInLocation).toHaveBeenCalledWith(expect.objectContaining({ quantity: 1.5 }));
    });

    it('restocks the original inventory effects when returning a bundle', async () => {
        const sale = {
            id: 'sale-1',
            items: [{
                id: 'item-1',
                productId: 'bundle-1',
                quantity: 1,
                inventoryEffects: [
                    { productId: 'coffee-1', quantity: 1 },
                    { productId: 'milk-1', quantity: 2 },
                    { productId: 'sugar-1', quantity: 3 },
                ],
            }],
        };
        const draft = { id: 'return-1', originalSaleId: 'sale-1', status: 'draft', items: [{ originalSaleItemId: 'item-1', quantityReturned: 1, disposition: 'restock' }] };
        const { returnBuilder } = mockLockedSale(sale);
        returnBuilder.getOne.mockResolvedValue(draft);
        manager.find.mockResolvedValue([]);

        await service.commit('return-1', 'user-1');

        expect(inventoryService.recordMovementInLocation).toHaveBeenCalledWith(expect.objectContaining({ productId: 'coffee-1', quantity: 1 }));
        expect(inventoryService.recordMovementInLocation).toHaveBeenCalledWith(expect.objectContaining({ productId: 'milk-1', quantity: 2 }));
        expect(inventoryService.recordMovementInLocation).toHaveBeenCalledWith(expect.objectContaining({ productId: 'sugar-1', quantity: 3 }));
    });

    it('does not restock quarantine returns on commit', async () => {
        const sale = { id: 'sale-1', isOnAccount: true, customerId: 'customer-1', items: [{ id: 'item-1', productId: 'product-1', quantity: 5 }] };
        const draft = { id: 'return-1', originalSaleId: 'sale-1', customerId: 'customer-1', totalRefund: 10, status: 'draft', items: [{ originalSaleItemId: 'item-1', quantityReturned: 1, disposition: 'quarantine' }] };
        const { returnBuilder } = mockLockedSale(sale);
        returnBuilder.getOne.mockResolvedValue(draft);
        manager.find.mockResolvedValue([]);

        await service.commit('return-1', 'user-1');
        expect(inventoryService.recordMovementInLocation).not.toHaveBeenCalled();
        expect(customerAccountsService.createAdjustmentWithManager).toHaveBeenCalledWith('customer-1', expect.objectContaining({ amount: -10, referenceId: 'return-1' }), 'user-1', manager);
    });

    it('rejects committing an already committed return', async () => {
        const { returnBuilder } = mockLockedSale({ id: 'sale-1', items: [] });
        returnBuilder.getOne.mockResolvedValue({ id: 'return-1', status: 'committed', items: [] });

        await expect(service.commit('return-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('cancels only draft returns', async () => {
        returnRepo.findOne.mockResolvedValue({ id: 'return-1', status: 'draft' });
        returnRepo.save.mockImplementation(async (value) => value);

        await expect(service.cancel('return-1')).resolves.toEqual(expect.objectContaining({ status: 'cancelled' }));
    });

    it('rejects cancelling committed returns', async () => {
        returnRepo.findOne.mockResolvedValue({ id: 'return-1', status: 'committed' });

        await expect(service.cancel('return-1')).rejects.toThrow(BadRequestException);
    });

    it('delegates receipt pdf rendering to the sale note pdf infrastructure', async () => {
        returnRepo.findOne.mockResolvedValue({ id: 'return-1', items: [] });
        pdfGeneratorService.generateSaleReturnReceiptPdf.mockResolvedValue(Buffer.from('pdf'));

        await expect(service.renderReceiptPdf('return-1')).resolves.toEqual(Buffer.from('pdf'));
        expect(pdfGeneratorService.generateSaleReturnReceiptPdf).toHaveBeenCalledWith(expect.objectContaining({ id: 'return-1' }));
    });
});
