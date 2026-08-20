import { CreditNoteService } from './credit-note.service';
import { InvoiceType } from '../entities/invoice.entity';

describe('CreditNoteService', () => {
    const creditNoteRepo = {
        create: jest.fn((value) => value),
        findOne: jest.fn(),
        save: jest.fn(),
    };
    const afipService = {
        authorizeInvoice: jest.fn(),
        parseAfipDate: jest.fn((dateStr: string) => new Date(Number(dateStr.slice(0, 4)), Number(dateStr.slice(4, 6)) - 1, Number(dateStr.slice(6, 8)))),
    };
    const auditService = {
        logSilent: jest.fn(),
    };

    let service: CreditNoteService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CreditNoteService(
            creditNoteRepo as never,
            afipService as never,
            auditService as never,
        );
    });

    const invoice = {
        id: 'invoice-1',
        invoiceType: InvoiceType.FACTURA_B,
        invoiceNumber: 123,
        pointOfSale: 1,
        saleId: 'sale-1',
        receiverDocumentNumber: '20123456789',
        receiverDocumentType: 80,
        receiverIvaCondition: 'CONSUMIDOR_FINAL',
    };

    it.each([
        [InvoiceType.FACTURA_A, 3],
        [InvoiceType.FACTURA_B, 8],
        [InvoiceType.FACTURA_C, 13],
    ])('maps original invoice type %s to standard credit note type %s', async (invoiceType, creditNoteType) => {
        creditNoteRepo.findOne.mockResolvedValue(null);
        creditNoteRepo.save.mockImplementation(async (note) => note);
        afipService.authorizeInvoice.mockResolvedValue({ success: true, cae: 'CAE1', invoiceNumber: 77 });

        await service.authorizeReturn({
            saleReturn: { id: 'return-1', totalRefund: 10, originalSaleId: 'sale-1' },
            originalInvoice: { ...invoice, invoiceType },
            userId: 'user-1',
            afipDocumentTypeCode: 0,
        });

        expect(afipService.authorizeInvoice).toHaveBeenCalledWith(expect.objectContaining({
            invoiceType: creditNoteType,
            associatedDocument: {
                type: invoiceType,
                pointOfSale: invoice.pointOfSale,
                number: invoice.invoiceNumber,
            },
        }));
    });

    it('persists CAE expiration returned by AFIP', async () => {
        creditNoteRepo.findOne.mockResolvedValue(null);
        creditNoteRepo.save.mockImplementation(async (note) => note);
        afipService.authorizeInvoice.mockResolvedValue({ success: true, cae: 'CAE1', caeExpirationDate: '20250203', invoiceNumber: 77 });

        const result = await service.authorizeReturn({
            saleReturn: { id: 'return-1', totalRefund: 10, originalSaleId: 'sale-1' },
            originalInvoice: invoice,
            userId: 'user-1',
            afipDocumentTypeCode: 8,
        });

        expect(result.caeExpirationDate).toEqual(new Date(2025, 1, 3));
    });

    it('creates separate credit notes for separate partial returns against one invoice', async () => {
        creditNoteRepo.findOne.mockResolvedValue(null);
        creditNoteRepo.save.mockImplementation(async (note) => ({ id: note.id ?? 'note-1', ...note }));
        afipService.authorizeInvoice.mockResolvedValue({ success: true, cae: 'CAE1', invoiceNumber: 77 });

        await service.authorizeReturn({
            saleReturn: { id: 'return-1', totalRefund: 10 },
            originalInvoice: invoice,
            userId: 'user-1',
            afipDocumentTypeCode: 8,
        });
        await service.authorizeReturn({
            saleReturn: { id: 'return-2', totalRefund: 5 },
            originalInvoice: invoice,
            userId: 'user-1',
            afipDocumentTypeCode: 8,
        });

        expect(creditNoteRepo.create).toHaveBeenCalledTimes(2);
        expect(creditNoteRepo.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
            saleReturnId: 'return-1',
            originalInvoiceId: 'invoice-1',
        }));
        expect(creditNoteRepo.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
            saleReturnId: 'return-2',
            originalInvoiceId: 'invoice-1',
        }));
    });

    it('updates the same row on retry and audit-logs every attempt', async () => {
        creditNoteRepo.findOne.mockResolvedValue({ id: 'note-1', saleReturnId: 'return-1' });
        creditNoteRepo.save.mockImplementation(async (note) => note);
        afipService.authorizeInvoice.mockResolvedValue({ success: false, errors: ['AFIP timeout'] });

        const result = await service.authorizeReturn({
            saleReturn: { id: 'return-1', totalRefund: 10, originalSaleId: 'sale-1' },
            originalInvoice: invoice,
            userId: 'user-1',
            afipDocumentTypeCode: 8,
        });

        expect(result.status).toBe('REJECTED');
        expect(creditNoteRepo.create).not.toHaveBeenCalled();
        expect(auditService.logSilent).toHaveBeenCalledWith(expect.objectContaining({
            entityType: 'credit_note',
            entityId: 'note-1',
            action: 'ATTEMPT',
            userId: 'user-1',
            newValues: expect.not.objectContaining({ payloadSnapshot: expect.anything() }),
        }));
    });

    it('rejects invoice and return pairs from different original sales', async () => {
        await expect(service.authorizeReturn({
            saleReturn: { id: 'return-1', totalRefund: 10, originalSaleId: 'sale-2' },
            originalInvoice: invoice,
            userId: 'user-1',
            afipDocumentTypeCode: 8,
        })).rejects.toThrow(/no pertenece/);
    });
});
