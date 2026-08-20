import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InvoiceService } from './invoice.service';
import { Invoice, InvoiceType, DocumentType } from '../entities/invoice.entity';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { AfipService } from './afip.service';
import { QrGeneratorService } from './qr-generator.service';
import { PdfGeneratorService } from './pdf-generator.service';

describe('InvoiceService - Pure Logic Tests', () => {
    let service: InvoiceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InvoiceService,
                { provide: getRepositoryToken(Invoice), useValue: {} },
                { provide: getRepositoryToken(Sale), useValue: {} },
                { provide: getRepositoryToken(SaleItem), useValue: {} },
                { provide: DataSource, useValue: {} },
                { provide: AfipService, useValue: {} },
                { provide: QrGeneratorService, useValue: {} },
                { provide: PdfGeneratorService, useValue: {} },
                { provide: ConfigService, useValue: {} },
            ],
        }).compile();

        service = module.get<InvoiceService>(InvoiceService);
    });

    describe('calculateNetAmount and calculateIva21', () => {
        it('calculates net amount and IVA for 21% rate without other taxes', () => {
            const sale = { total: 121, tax: 0, ivaPercentage: 21 } as Sale;

            const net = (service as any).calculateNetAmount(sale, InvoiceType.FACTURA_A);
            const iva = (service as any).calculateIva21(sale, InvoiceType.FACTURA_A);

            expect(net).toBe(100);
            expect(iva).toBe(21);
            expect(net + iva).toBe(121);
        });

        it('deducts otherTaxes (sale.tax) from taxable base when calculating net and IVA', () => {
            // Total = 136 (Neto: 100, IVA 21%: 21, IIBB: 15)
            const sale = { total: 136, tax: 15, ivaPercentage: 21 } as Sale;

            const net = (service as any).calculateNetAmount(sale, InvoiceType.FACTURA_A);
            const iva = (service as any).calculateIva21(sale, InvoiceType.FACTURA_A);

            expect(net).toBe(100);
            expect(iva).toBe(21);
            // net + iva + otherTaxes = 100 + 21 + 15 = 136 = total
            expect(net + iva + Number(sale.tax)).toBe(136);
        });

        it('returns total as net and 0 IVA for Factura C (Monotributo)', () => {
            const sale = { total: 500, tax: 0, ivaPercentage: 21 } as Sale;

            const net = (service as any).calculateNetAmount(sale, InvoiceType.FACTURA_C);
            const iva = (service as any).calculateIva21(sale, InvoiceType.FACTURA_C);

            expect(net).toBe(500);
            expect(iva).toBe(0);
        });
    });

    describe('getDocumentType', () => {
        it('returns SIN_IDENTIFICAR when customer is null', () => {
            const docType = (service as any).getDocumentType(null);
            expect(docType).toBe(DocumentType.SIN_IDENTIFICAR);
        });

        it('returns SIN_IDENTIFICAR when documentNumber is missing or empty', () => {
            const docTypeNoNum = (service as any).getDocumentType({ documentType: 'CUIT', documentNumber: null });
            const docTypeEmptyNum = (service as any).getDocumentType({ documentType: 'DNI', documentNumber: '---' });

            expect(docTypeNoNum).toBe(DocumentType.SIN_IDENTIFICAR);
            expect(docTypeEmptyNum).toBe(DocumentType.SIN_IDENTIFICAR);
        });

        it('returns correct DocumentType code when valid document exists', () => {
            const cuitType = (service as any).getDocumentType({ documentType: 'CUIT', documentNumber: '20123456789' });
            const dniType = (service as any).getDocumentType({ documentType: 'DNI', documentNumber: '12345678' });

            expect(cuitType).toBe(DocumentType.CUIT);
            expect(dniType).toBe(DocumentType.DNI);
        });
    });
});
