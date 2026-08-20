import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditService } from '../../audit/audit.service';
import { AuditAction, AuditEntityType } from '../../audit/enums';
import { CreditNote } from '../entities/credit-note.entity';
import { Invoice } from '../entities/invoice.entity';
import { SaleReturn } from '../entities/sale-return.entity';
import { AfipService, InvoiceRequest } from './afip.service';

interface AuthorizeCreditNoteInput {
    readonly saleReturn: Pick<SaleReturn, 'id' | 'totalRefund'> & { readonly originalSaleId?: string };
    readonly originalInvoice: Pick<Invoice,
        'id' | 'saleId' | 'invoiceType' | 'invoiceNumber' | 'pointOfSale' | 'receiverDocumentNumber' | 'receiverDocumentType'
    >;
    readonly userId: string;
    readonly afipDocumentTypeCode?: number;
}

@Injectable()
export class CreditNoteService {
    constructor(
        @InjectRepository(CreditNote)
        private readonly creditNoteRepo: Repository<CreditNote>,
        private readonly afipService: AfipService,
        private readonly auditService: AuditService,
    ) { }

    async authorizeReturn(input: AuthorizeCreditNoteInput): Promise<CreditNote> {
        if (input.saleReturn.originalSaleId && input.saleReturn.originalSaleId !== input.originalInvoice.saleId) {
            throw new Error('La factura no pertenece a la venta original de la devolución');
        }

        const attemptId = randomUUID();
        const payload = this.buildPayload(input);
        const existing = await this.creditNoteRepo.findOne({
            where: { saleReturnId: input.saleReturn.id },
        });
        const note = existing ?? this.creditNoteRepo.create({
            saleReturnId: input.saleReturn.id,
            originalInvoiceId: input.originalInvoice.id,
        });

        note.afipDocumentTypeCode = payload.invoiceType;
        note.afipAssociatedDocumentTypeCode = input.originalInvoice.invoiceType;
        note.afipAssociatedInvoiceNumber = input.originalInvoice.invoiceNumber ?? null;
        note.afipAssociatedPointOfSale = input.originalInvoice.pointOfSale;
        note.receiverCuit = input.originalInvoice.receiverDocumentNumber ?? '0';
        note.pointOfSale = input.originalInvoice.pointOfSale;
        note.attemptId = attemptId;
        note.payloadSnapshot = { ...payload };

        const response = await this.authorizeInvoice(payload);
        if (response.success) {
            note.status = 'AUTHORIZED';
            note.cae = response.cae ?? null;
            note.caeExpirationDate = response.caeExpirationDate ? this.afipService.parseAfipDate(response.caeExpirationDate) : null;
            note.invoiceNumber = response.invoiceNumber ?? null;
            note.errorMessage = null;
        } else {
            note.status = 'REJECTED';
            note.errorMessage = response.errors?.join(', ') ?? 'Error desconocido';
        }

        const saved = await this.creditNoteRepo.save(note);
        await this.auditService.logSilent({
            entityType: AuditEntityType.CREDIT_NOTE,
            entityId: saved.id,
            action: AuditAction.ATTEMPT,
            userId: input.userId,
            newValues: {
                status: saved.status,
                attemptId,
                afipDocumentTypeCode: saved.afipDocumentTypeCode,
                afipAssociatedDocumentTypeCode: saved.afipAssociatedDocumentTypeCode,
                afipAssociatedInvoiceNumber: saved.afipAssociatedInvoiceNumber,
            },
        });
        return saved;
    }

    private async authorizeInvoice(payload: InvoiceRequest) {
        try {
            return await this.afipService.authorizeInvoice(payload);
        } catch (error) {
            return {
                success: false,
                errors: [error instanceof Error ? error.message : 'Error desconocido'],
            };
        }
    }

    private buildPayload(input: AuthorizeCreditNoteInput): InvoiceRequest {
        if (!input.originalInvoice.invoiceNumber) {
            throw new Error('La factura original no tiene número autorizado');
        }
        return {
            invoiceType: this.getCreditNoteType(input.originalInvoice.invoiceType),
            pointOfSale: input.originalInvoice.pointOfSale,
            concept: 1,
            docType: input.originalInvoice.receiverDocumentType,
            docNumber: input.originalInvoice.receiverDocumentNumber ?? '0',
            receiverIvaCondition: 5,
            issueDate: new Date().toISOString().slice(0, 10).replaceAll('-', ''),
            total: Number(input.saleReturn.totalRefund),
            netAmount: Number(input.saleReturn.totalRefund),
            netAmountExempt: 0,
            iva: [],
            otherTaxes: 0,
            associatedDocument: {
                type: input.originalInvoice.invoiceType,
                pointOfSale: input.originalInvoice.pointOfSale,
                number: input.originalInvoice.invoiceNumber,
            },
        };
    }

    private getCreditNoteType(invoiceType: Invoice['invoiceType']): number {
        switch (invoiceType) {
            case 1:
                return 3;
            case 6:
                return 8;
            case 11:
                return 13;
            default:
                throw new Error(`Tipo de factura no soportado para nota de crédito: ${invoiceType}`);
        }
    }
}
