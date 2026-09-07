/**
 * S2 H4 T10 & CAP-6 — QR + textual SKU/barcode + price + Hangtag/Thermal apparel labels.
 */

import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';

import { Product } from '../entities/product.entity';

export const LABEL_TEMPLATE_NAMES = [
    'qr_text_price',
    'qr_text',
    'qr_only',
    'hangtag_50x90',
    'thermal_50x30',
] as const;

export type LabelTemplate = (typeof LABEL_TEMPLATE_NAMES)[number];

export interface ApparelLabelItem {
    name: string;
    brandName?: string;
    size?: string;
    color?: string;
    sku?: string;
    barcode?: string;
    price?: number | null;
    copies?: number;
}

export interface LabelJob {
    readonly id: string;
    readonly status: 'pending' | 'done' | 'failed';
    readonly template: LabelTemplate;
    readonly products: ReadonlyArray<{ readonly id: string; readonly name: string; readonly sku: string | null; readonly barcode: string | null; readonly price: number | null }>;
    readonly createdAt: Date;
    readonly finishedAt?: Date;
    readonly errorMessage?: string;
}

@Injectable()
export class LabelsService {
    private readonly logger = new Logger(LabelsService.name);
    private readonly queue = new Map<string, LabelJob>();
    private jobCounter = 0;

    /**
     * Build standard A4 label PDF from Products entities
     */
    async buildPreviewPdf(
        template: LabelTemplate,
        products: ReadonlyArray<Product>,
    ): Promise<Buffer> {
        if (products.length === 0) {
            throw new Error('At least one product is required for a label preview');
        }

        if (template === 'hangtag_50x90' || template === 'thermal_50x30') {
            const items: ApparelLabelItem[] = products.map((p) => ({
                name: p.name,
                sku: p.sku ?? undefined,
                barcode: p.barcode ?? undefined,
                price: p.price ? Number(p.price) : null,
                copies: 1,
            }));
            return this.buildApparelLabelsPdf(template, items);
        }

        const productsWithQr = await Promise.all(
            products.map(async (product) => {
                const qrPayload = product.barcode ?? product.sku ?? product.id;
                const qrPng = await QRCode.toBuffer(qrPayload, {
                    type: 'png',
                    width: 160,
                    margin: 1,
                    errorCorrectionLevel: 'M',
                });
                return { product, qrPng };
            })
        );

        return new Promise<Buffer>((resolve, reject) => {
            try {
                const chunks: Buffer[] = [];
                const doc = new PDFDocument({ size: 'A4', margin: 36, autoFirstPage: false });

                doc.on('data', (chunk: Buffer) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                for (const { product, qrPng } of productsWithQr) {
                    doc.addPage({ size: 'A4', margin: 36 });
                    doc.image(qrPng, 36, 36, { width: 160, height: 160 });

                    const textX = 220;
                    doc.fontSize(14).font('Helvetica-Bold').text(product.name, textX, 40, { width: 320 });
                    doc.fontSize(10).font('Helvetica').text(`Código: ${product.barcode ?? '—'}`, textX, 64, { width: 320 });
                    doc.fontSize(10).font('Helvetica').text(`SKU: ${product.sku ?? '—'}`, textX, 80, { width: 320 });
                    if (template !== 'qr_only') {
                        const priceLabel = product.price !== null ? `$${Number(product.price).toFixed(2)}` : '—';
                        doc.fontSize(12).font('Helvetica-Bold').text(priceLabel, textX, 110, { width: 320 });
                    }
                }

                doc.end();
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Genera PDF optimizado para Hangtags de Colgar (50x90mm) o Térmicas (50x30mm) con soporte multi-copia
     */
    async buildApparelLabelsPdf(
        template: 'hangtag_50x90' | 'thermal_50x30' | LabelTemplate,
        items: ReadonlyArray<ApparelLabelItem>,
    ): Promise<Buffer> {
        if (items.length === 0) {
            throw new Error('At least one label item is required');
        }

        const isHangtag = template === 'hangtag_50x90';
        // 50mm = 141.73 pt, 90mm = 255.12 pt, 30mm = 85.04 pt
        const pageSize: [number, number] = isHangtag ? [141.73, 255.12] : [141.73, 85.04];
        const pageMargin = isHangtag ? 8 : 4;

        const itemsWithQr = await Promise.all(
            items.map(async (item) => {
                const qrPayload = item.barcode || item.sku || item.name;
                const qrPng = await QRCode.toBuffer(qrPayload, {
                    type: 'png',
                    width: isHangtag ? 90 : 50,
                    margin: 0,
                    errorCorrectionLevel: 'M',
                });
                return { item, qrPng };
            })
        );

        return new Promise<Buffer>((resolve, reject) => {
            try {
                const chunks: Buffer[] = [];
                const doc = new PDFDocument({
                    size: pageSize,
                    margin: pageMargin,
                    autoFirstPage: false,
                });

                doc.on('data', (chunk: Buffer) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                for (const { item, qrPng } of itemsWithQr) {
                    const count = Math.max(1, item.copies || 1);

                    for (let i = 0; i < count; i++) {
                        doc.addPage({ size: pageSize, margin: pageMargin });

                        if (isHangtag) {
                            // === FORMATO HANGTAG TEXTIL (50x90mm) ===
                            const pageWidth = 141.73;

                            // 1. Marca / Logo
                            if (item.brandName) {
                                doc.fontSize(8)
                                    .font('Helvetica-Bold')
                                    .fillColor('#475569')
                                    .text(item.brandName.toUpperCase(), pageMargin, 10, {
                                        align: 'center',
                                        width: pageWidth - pageMargin * 2,
                                    });
                            }

                            // 2. Nombre del Producto
                            doc.fontSize(9)
                                .font('Helvetica-Bold')
                                .fillColor('#0f172a')
                                .text(item.name, pageMargin, item.brandName ? 22 : 12, {
                                    align: 'center',
                                    width: pageWidth - pageMargin * 2,
                                });

                            // 3. RECUADRO GIGANTE DE TALLE
                            const boxY = item.brandName ? 42 : 36;
                            const boxHeight = 46;
                            const boxWidth = 90;
                            const boxX = (pageWidth - boxWidth) / 2;

                            doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 4)
                                .fillAndStroke('#f1f5f9', '#0f172a');

                            doc.fontSize(8)
                                .font('Helvetica')
                                .fillColor('#64748b')
                                .text('TALLE', boxX, boxY + 4, { align: 'center', width: boxWidth });

                            const sizeDisplay = item.size || 'U';
                            doc.fontSize(24)
                                .font('Helvetica-Bold')
                                .fillColor('#0f172a')
                                .text(sizeDisplay, boxX, boxY + 16, { align: 'center', width: boxWidth });

                            // 4. Color
                            if (item.color) {
                                doc.fontSize(8)
                                    .font('Helvetica')
                                    .fillColor('#334155')
                                    .text(`Color: ${item.color}`, pageMargin, boxY + boxHeight + 6, {
                                        align: 'center',
                                        width: pageWidth - pageMargin * 2,
                                    });
                            }

                            // 5. Código QR
                            const qrSize = 70;
                            const qrX = (pageWidth - qrSize) / 2;
                            const qrY = boxY + boxHeight + (item.color ? 20 : 8);
                            doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize });

                            // 6. SKU y Precio
                            if (item.sku) {
                                doc.fontSize(7)
                                    .font('Helvetica')
                                    .fillColor('#64748b')
                                    .text(item.sku, pageMargin, qrY + qrSize + 2, {
                                        align: 'center',
                                        width: pageWidth - pageMargin * 2,
                                    });
                            }

                            if (item.price !== null && item.price !== undefined) {
                                doc.fontSize(12)
                                    .font('Helvetica-Bold')
                                    .fillColor('#0f172a')
                                    .text(`$${Number(item.price).toLocaleString('es-AR')}`, pageMargin, qrY + qrSize + 14, {
                                        align: 'center',
                                        width: pageWidth - pageMargin * 2,
                                    });
                            }
                        } else {
                            // === FORMATO TÉRMICO AUTOADHESIVO (50x30mm) ===
                            const pageWidth = 141.73;

                            // Nombre prenda arriba
                            doc.fontSize(7.5)
                                .font('Helvetica-Bold')
                                .fillColor('#0f172a')
                                .text(item.name, pageMargin, 4, {
                                    align: 'left',
                                    width: pageWidth - pageMargin * 2,
                                    height: 10,
                                });

                            // Subtítulo talle y color
                            const talleColorStr = `${item.size ? `T: ${item.size}` : ''} ${item.color ? `| ${item.color}` : ''}`.trim();
                            doc.fontSize(8)
                                .font('Helvetica-Bold')
                                .fillColor('#1e40af')
                                .text(talleColorStr || 'TALLES/COLORES', pageMargin, 16, {
                                    align: 'left',
                                    width: 80,
                                });

                            // QR a la derecha
                            const qrSize = 48;
                            doc.image(qrPng, pageWidth - qrSize - 4, 16, { width: qrSize, height: qrSize });

                            // SKU a la izquierda abajo
                            if (item.sku) {
                                doc.fontSize(6.5)
                                    .font('Helvetica')
                                    .fillColor('#64748b')
                                    .text(`SKU: ${item.sku}`, pageMargin, 34, { width: 80 });
                            }

                            // Precio a la izquierda abajo destacado
                            if (item.price !== null && item.price !== undefined) {
                                doc.fontSize(11)
                                    .font('Helvetica-Bold')
                                    .fillColor('#0f172a')
                                    .text(`$${Number(item.price).toLocaleString('es-AR')}`, pageMargin, 48, { width: 80 });
                            }
                        }
                    }
                }

                doc.end();
            } catch (err) {
                reject(err);
            }
        });
    }

    enqueue(template: LabelTemplate, products: ReadonlyArray<Product>): LabelJob {
        this.jobCounter += 1;
        const job: LabelJob = {
            id: `label-${this.jobCounter}-${Date.now()}`,
            status: 'pending',
            template,
            products: products.map((product) => ({
                id: product.id,
                name: product.name,
                sku: product.sku ?? null,
                barcode: product.barcode ?? null,
                price: product.price === null || product.price === undefined
                    ? null
                    : Number(product.price),
            })),
            createdAt: new Date(),
        };
        this.queue.set(job.id, job);
        return job;
    }

    status(id: string): LabelJob | undefined {
        return this.queue.get(id);
    }

    listTemplates(): readonly LabelTemplate[] {
        return LABEL_TEMPLATE_NAMES;
    }
}