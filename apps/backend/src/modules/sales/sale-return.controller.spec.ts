import { SaleReturnController } from './sale-return.controller';
import { CreateSaleReturnBodyDto } from './dto/create-sale-return.dto';
import { SaleReturnService } from './sale-return.service';

describe('SaleReturnController', () => {
    const service = {
        create: jest.fn(),
        findByOriginalSale: jest.fn(),
        preview: jest.fn(),
        commit: jest.fn(),
        cancel: jest.fn(),
        renderReceiptPdf: jest.fn(),
    };
    let controller: SaleReturnController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new SaleReturnController(service as never);
    });

    it('delegates create requests to the sale return service', async () => {
        const dto: CreateSaleReturnBodyDto = {
            items: [{
                originalSaleItemId: 'item-1',
                quantityReturned: 1,
                unitRefundAmount: 10,
                disposition: 'supplier',
            }],
        };
        service.create.mockResolvedValue({ id: 'return-1' });

        await expect(controller.create('sale-1', dto)).resolves.toEqual({ id: 'return-1' });
        expect(service.create).toHaveBeenCalledWith({ ...dto, originalSaleId: 'sale-1' });
    });

    it('delegates original sale lookup to the sale return service', async () => {
        service.findByOriginalSale.mockResolvedValue([{ id: 'return-1' }]);

        await expect(controller.findByOriginalSale('sale-1')).resolves.toEqual([{ id: 'return-1' }]);
        expect(service.findByOriginalSale).toHaveBeenCalledWith('sale-1');
    });

    it('delegates preview requests to the sale return service', async () => {
        service.preview.mockResolvedValue({ totalRefund: 10 });

        await expect(controller.preview({ originalSaleId: 'sale-1', items: [] })).resolves.toEqual({ totalRefund: 10 });
        expect(service.preview).toHaveBeenCalledWith({ originalSaleId: 'sale-1', items: [] });
    });

    it('delegates commit requests to the sale return service', async () => {
        service.commit.mockResolvedValue({ id: 'return-1', status: 'committed' });

        await expect(controller.commit('return-1', { user: { userId: 'user-1' } } as never)).resolves.toEqual({ id: 'return-1', status: 'committed' });
        expect(service.commit).toHaveBeenCalledWith('return-1', 'user-1');
    });

    it('delegates cancel requests to the sale return service', async () => {
        service.cancel.mockResolvedValue({ id: 'return-1', status: 'cancelled' });

        await expect(controller.cancel('return-1')).resolves.toEqual({ id: 'return-1', status: 'cancelled' });
        expect(service.cancel).toHaveBeenCalledWith('return-1');
    });

    it('delegates receipt pdf requests and writes a pdf response', async () => {
        const pdf = Buffer.from('pdf');
        const res = { setHeader: jest.fn(), send: jest.fn() };
        service.renderReceiptPdf.mockResolvedValue(pdf);

        await controller.receiptPdf('return-1', res as never);

        expect(service.renderReceiptPdf).toHaveBeenCalledWith('return-1');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
        expect(res.send).toHaveBeenCalledWith(pdf);
    });
});
