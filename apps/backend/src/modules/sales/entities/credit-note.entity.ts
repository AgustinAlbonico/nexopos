import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Invoice } from './invoice.entity';
import { SaleReturn } from './sale-return.entity';

export const CREDIT_NOTE_STATUSES = ['PENDING', 'AUTHORIZED', 'REJECTED', 'ERROR'] as const;
export type CreditNoteStatus = typeof CREDIT_NOTE_STATUSES[number];

@Entity('credit_notes')
export class CreditNote {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'sale_return_id', unique: true })
    saleReturnId!: string;

    @ManyToOne(() => SaleReturn)
    @JoinColumn({ name: 'sale_return_id' })
    saleReturn!: SaleReturn;

    @Column({ name: 'original_invoice_id' })
    originalInvoiceId!: string;

    @ManyToOne(() => Invoice)
    @JoinColumn({ name: 'original_invoice_id' })
    originalInvoice!: Invoice;

    @Column({ name: 'afip_document_type_code', type: 'int' })
    afipDocumentTypeCode!: number;

    @Column({ name: 'afip_associated_document_type_code', type: 'int', nullable: true })
    afipAssociatedDocumentTypeCode!: number | null;

    @Column({ name: 'afip_associated_invoice_number', type: 'bigint', nullable: true })
    afipAssociatedInvoiceNumber!: number | null;

    @Column({ name: 'afip_associated_point_of_sale', type: 'int', nullable: true })
    afipAssociatedPointOfSale!: number | null;

    @Column({ name: 'receiver_cuit', type: 'varchar', length: 13 })
    receiverCuit!: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    cae!: string | null;

    @Column({ name: 'cae_expiration_date', type: 'date', nullable: true })
    caeExpirationDate!: Date | null;

    @Column({ name: 'invoice_number', type: 'bigint', nullable: true })
    invoiceNumber!: number | null;

    @Column({ name: 'point_of_sale', type: 'int', nullable: true })
    pointOfSale!: number | null;

    @Column({ type: 'varchar', length: 16 })
    status!: CreditNoteStatus;

    @Column({ name: 'attempt_id', type: 'uuid', nullable: true })
    attemptId!: string | null;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage!: string | null;

    @Column({ name: 'payload_snapshot', type: 'jsonb' })
    payloadSnapshot!: Record<string, unknown>;
}
