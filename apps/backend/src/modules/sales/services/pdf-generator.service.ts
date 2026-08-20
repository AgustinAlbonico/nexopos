/**
 * Servicio de generación de PDFs para facturas
 * Utiliza el servidor HTTP de Electron (printToPDF)
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as Handlebars from 'handlebars';
import { Invoice, InvoiceType } from '../entities/invoice.entity';
import { IvaCondition } from '../../../common/enums/iva-condition.enum';
import { SaleItem } from '../entities';
import { QrGeneratorService } from './qr-generator.service';
import { PaymentMethod } from '../../configuration/entities/payment-method.entity';
import { SaleReturn } from '../entities/sale-return.entity';

/**
 * Datos para renderizar la factura
 */
interface InvoiceRenderData {
    // Tipo de comprobante
    invoiceType: string;
    invoiceTypeLetter: string;

    // Datos del emisor
    emitter: {
        businessName: string;
        address: string;
        cuit: string;
        ivaCondition: string;
        grossIncome: string;
        activityStartDate: string;
    };

    // Datos del comprobante
    pointOfSale: string;
    invoiceNumber: string;
    issueDate: string;

    // Datos del receptor
    receiver: {
        documentType: string;
        documentNumber: string;
        name: string;
        address: string;
        ivaCondition: string;
    };

    // Items
    items: {
        code: string;
        description: string;
        quantity: string;
        unitOfMeasure: string;
        unitPrice: string;
        discount: string;
        discountAmount: string;
        subtotal: string;
    }[];

    // Totales
    subtotal: string;
    discount: string;
    otherTaxes: string;
    total: string;

    // IVA (para RI)
    showIva: boolean;
    netAmount: string;
    iva21: string;
    iva105: string;
    iva27: string;

    // CAE
    cae: string;
    caeExpirationDate: string;

    // QR
    qrImage: string;

    // Condición de venta
    saleCondition: string;
}

@Injectable()
export class PdfGeneratorService {
    private readonly logger = new Logger(PdfGeneratorService.name);
    private templateA: Handlebars.TemplateDelegate | null = null;
    private templateB: Handlebars.TemplateDelegate | null = null;
    private templateC: Handlebars.TemplateDelegate | null = null;
    private templateNotaVenta: Handlebars.TemplateDelegate | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly qrGeneratorService: QrGeneratorService,
    ) {
        this.loadTemplates();
        this.registerHandlebarsHelpers();
    }

    /**
     * Carga los templates de factura y nota de venta
     */
    private loadTemplates(): void {
        try {
            // En producción (bundle), __dirname apunta donde está main.js
            // Los assets están en ./assets/ relativo a main.js
            // En desarrollo, __dirname es el directorio del archivo .ts compilado
            let assetsPath: string;

            // Primero intentamos la ruta de producción (bundle)
            const prodAssetsPath = path.join(__dirname, 'assets');
            const devAssetsPath = path.join(__dirname, '../../..', 'assets');

            if (fs.existsSync(path.join(prodAssetsPath, 'factura-c.html'))) {
                assetsPath = prodAssetsPath;
                this.logger.log(`Usando assets de producción: ${assetsPath}`);
            } else if (fs.existsSync(path.join(devAssetsPath, 'factura-c.html'))) {
                assetsPath = devAssetsPath;
                this.logger.log(`Usando assets de desarrollo: ${assetsPath}`);
            } else {
                this.logger.error('No se encontró la carpeta de assets en ninguna ubicación');
                this.logger.error(`Buscado en: ${prodAssetsPath} y ${devAssetsPath}`);
                return;
            }

            // Template Factura C (default, también usado para A y B)
            const templateCPath = path.join(assetsPath, 'factura-c.html');
            if (fs.existsSync(templateCPath)) {
                const templateContent = fs.readFileSync(templateCPath, 'utf-8');
                this.templateC = Handlebars.compile(templateContent);
                this.templateB = this.templateC;
                this.templateA = this.templateC;
                this.logger.log('Templates de factura cargados correctamente');
            } else {
                this.logger.warn(`Template no encontrado: ${templateCPath}`);
            }

            // Template Nota de Venta (no fiscal)
            const templateNotaVentaPath = path.join(assetsPath, 'nota-venta.html');
            if (fs.existsSync(templateNotaVentaPath)) {
                const templateContent = fs.readFileSync(templateNotaVentaPath, 'utf-8');
                this.templateNotaVenta = Handlebars.compile(templateContent);
                this.logger.log('Template de nota de venta cargado correctamente');
            } else {
                this.logger.warn(`Template no encontrado: ${templateNotaVentaPath}`);
            }
        } catch (error) {
            this.logger.error('Error al cargar templates:', error);
        }
    }

    /**
     * Registra helpers de Handlebars
     */
    private registerHandlebarsHelpers(): void {
        Handlebars.registerHelper('if', function (this: unknown, conditional, options) {
            if (conditional) {
                return options.fn(this);
            }
            return options.inverse(this);
        });
    }

    /**
     * Genera el PDF de una factura
     * @param invoice - Factura con CAE
     * @param items - Items de la venta
     * @returns Buffer del PDF generado
     */
    async generateInvoicePdf(invoice: Invoice, items: SaleItem[]): Promise<Buffer> {
        if (!invoice.cae) {
            throw new Error('La factura debe tener CAE para generar el PDF');
        }

        const template = this.getTemplate(invoice.invoiceType);
        if (!template) {
            throw new Error('Template de factura no disponible');
        }

        // Generar QR
        const qrImage = await this.qrGeneratorService.generateQrImage(invoice);

        // Preparar datos para el template
        const renderData = this.prepareRenderData(invoice, items, qrImage);

        // Renderizar HTML
        const html = template(renderData);

        // Generar PDF
        return this.htmlToPdf(html);
    }

    /**
     * Obtiene el template según el tipo de factura
     */
    private getTemplate(invoiceType: InvoiceType): Handlebars.TemplateDelegate | null {
        switch (invoiceType) {
            case InvoiceType.FACTURA_A:
                return this.templateA;
            case InvoiceType.FACTURA_B:
                return this.templateB;
            case InvoiceType.FACTURA_C:
                return this.templateC;
            default:
                return this.templateC;
        }
    }

    /**
     * Prepara los datos para renderizar
     */
    private prepareRenderData(
        invoice: Invoice,
        items: SaleItem[],
        qrImage: string
    ): InvoiceRenderData {
        return {
            invoiceType: this.getInvoiceTypeName(invoice.invoiceType),
            invoiceTypeLetter: this.getInvoiceTypeLetter(invoice.invoiceType),

            emitter: {
                businessName: invoice.emitterBusinessName,
                address: invoice.emitterAddress,
                cuit: this.formatCuit(invoice.emitterCuit),
                ivaCondition: this.formatIvaCondition(invoice.emitterIvaCondition),
                grossIncome: invoice.emitterGrossIncome || '-',
                activityStartDate: invoice.emitterActivityStartDate
                    ? this.formatDate(invoice.emitterActivityStartDate)
                    : '-',
            },

            pointOfSale: String(invoice.pointOfSale).padStart(4, '0'),
            invoiceNumber: String(invoice.invoiceNumber || 0).padStart(8, '0'),
            issueDate: this.formatDate(invoice.issueDate),

            receiver: {
                documentType: this.getDocumentTypeName(invoice.receiverDocumentType),
                // Si es tipo 99 (Sin Identificar) o el número es 0 o -, no enviamos documentNumber
                // para que el template pueda mostrar "Sin Identificar" correctamente
                documentNumber: this.isValidDocumentNumber(invoice.receiverDocumentType, invoice.receiverDocumentNumber)
                    ? this.formatDocumentNumber(invoice.receiverDocumentType, invoice.receiverDocumentNumber ?? '')
                    : '',
                name: invoice.receiverName || 'Consumidor Final',
                address: invoice.receiverAddress || '-',
                ivaCondition: invoice.receiverIvaCondition
                    ? this.formatIvaCondition(invoice.receiverIvaCondition)
                    : 'Consumidor Final',
            },

            items: items.map(item => ({
                code: item.product?.sku || '-',
                description: item.product?.name || 'Producto',
                quantity: this.formatNumber(item.quantity),
                unitOfMeasure: 'Unidad',
                unitPrice: this.formatCurrency(item.unitPrice),
                discount: this.formatNumber(item.discount || 0),
                discountAmount: this.formatCurrency(item.unitPrice * item.quantity * ((item.discount || 0) / 100)),
                subtotal: this.formatCurrency(item.subtotal),
            })),

            subtotal: this.formatCurrency(invoice.subtotal),
            discount: this.formatCurrency(invoice.discount),
            otherTaxes: this.formatCurrency(invoice.otherTaxes),
            total: this.formatCurrency(invoice.total),

            showIva: invoice.invoiceType === InvoiceType.FACTURA_A,
            netAmount: this.formatCurrency(invoice.netAmount),
            iva21: this.formatCurrency(invoice.iva21),
            iva105: this.formatCurrency(invoice.iva105),
            iva27: this.formatCurrency(invoice.iva27),

            cae: invoice.cae || '',
            caeExpirationDate: invoice.caeExpirationDate
                ? this.formatDate(invoice.caeExpirationDate)
                : '-',

            qrImage,

            saleCondition: invoice.saleCondition,
        };
    }

    /**
     * Convierte HTML a PDF usando el servidor HTTP de Electron
     * El servidor corre en localhost:3001 y usa printToPDF internamente
     */
    private async htmlToPdf(html: string): Promise<Buffer> {
        const PDF_SERVER_PORT = process.env.PDF_SERVER_PORT || '3001';
        const PDF_SERVER_HOST = process.env.PDF_SERVER_HOST || '127.0.0.1';

        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({ html });

            const options: http.RequestOptions = {
                hostname: PDF_SERVER_HOST,
                port: Number.parseInt(PDF_SERVER_PORT, 10),
                path: '/pdf/generate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                },
            };

            const req = http.request(options, (res) => {
                const chunks: Buffer[] = [];

                res.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                });

                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);

                    if (res.statusCode !== 200) {
                        // Intentar parsear error
                        try {
                            const error = JSON.parse(buffer.toString());
                            reject(new Error(`PDF Server error: ${error.error || 'Unknown error'}`));
                        } catch {
                            reject(new Error(`PDF Server error: HTTP ${res.statusCode}`));
                        }
                        return;
                    }

                    resolve(buffer);
                });
            });

            req.on('error', (error) => {
                this.logger.error('Error connecting to PDF server:', error);
                reject(new Error(`Cannot connect to PDF server at ${PDF_SERVER_HOST}:${PDF_SERVER_PORT}. Is Electron running?`));
            });

            // Timeout de 30 segundos
            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error('PDF generation timeout'));
            });

            req.write(postData);
            req.end();
        });
    }

    /**
     * Obtiene el nombre del tipo de factura
     */
    private getInvoiceTypeName(type: InvoiceType): string {
        switch (type) {
            case InvoiceType.FACTURA_A: return 'FACTURA A';
            case InvoiceType.FACTURA_B: return 'FACTURA B';
            case InvoiceType.FACTURA_C: return 'FACTURA C';
            default: return 'FACTURA';
        }
    }

    /**
     * Obtiene la letra del tipo de factura
     */
    private getInvoiceTypeLetter(type: InvoiceType): string {
        switch (type) {
            case InvoiceType.FACTURA_A: return 'A';
            case InvoiceType.FACTURA_B: return 'B';
            case InvoiceType.FACTURA_C: return 'C';
            default: return 'C';
        }
    }

    /**
     * Obtiene el nombre del tipo de documento
     */
    private getDocumentTypeName(type: number): string {
        const types: Record<number, string> = {
            80: 'CUIT',
            86: 'CUIL',
            96: 'DNI',
            87: 'CDI',
            89: 'LE',
            90: 'LC',
            91: 'CI Extranjera',
            94: 'Pasaporte',
            99: 'Sin Identificar',
        };
        return types[type] || 'Documento';
    }

    /**
     * Verifica si el número de documento es válido para mostrarse
     * Devuelve false para tipo 99 (Sin Identificar) o números inválidos
     */
    private isValidDocumentNumber(docType: number, docNumber: string | null | undefined): boolean {
        // Tipo 99 es "Sin Identificar"
        if (docType === 99) {
            return false;
        }
        // Si no hay número o es inválido
        if (!docNumber || docNumber === '-' || docNumber === '0') {
            return false;
        }
        return true;
    }

    /**
     * Formatea condición IVA
     */
    private formatIvaCondition(condition: string): string {
        const conditions: Record<string, string> = {
            [IvaCondition.RESPONSABLE_INSCRIPTO]: 'Responsable Inscripto',
            [IvaCondition.RESPONSABLE_MONOTRIBUTO]: 'Responsable Monotributo',
            [IvaCondition.EXENTO]: 'Exento',
            [IvaCondition.CONSUMIDOR_FINAL]: 'Consumidor Final',
        };
        return conditions[condition] || condition;
    }

    /**
     * Formatea CUIT con guiones
     */
    private formatCuit(cuit: string): string {
        if (cuit.length !== 11) return cuit;
        return `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`;
    }

    /**
     * Formatea número de documento según tipo
     * CUIT/CUIL: XX-XXXXXXXX-X
     * Otros: se devuelven sin cambios
     */
    private formatDocumentNumber(docType: number, docNumber: string): string {
        // Códigos AFIP: 80 = CUIT, 86 = CUIL
        if ((docType === 80 || docType === 86) && docNumber.length === 11) {
            return `${docNumber.slice(0, 2)}-${docNumber.slice(2, 10)}-${docNumber.slice(10)}`;
        }
        return docNumber;
    }

    /**
     * Formatea fecha a DD/MM/YYYY
     * Usa UTC para evitar desfase por zona horaria
     */
    private formatDate(date: Date): string {
        const d = new Date(date);
        // Usar UTC para evitar que la zona horaria local reste un día
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Formatea número con decimales
     */
    private formatNumber(num: number): string {
        return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    /**
     * Formatea moneda
     */
    private formatCurrency(amount: number): string {
        return amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }



    /**
     * Genera el PDF de una nota de venta (no fiscal)
     * @param sale - Venta con items y cliente
     * @param fiscalConfig - Configuración fiscal del emisor
     * @returns Buffer del PDF generado
     */
    async generateSaleNotePdf(
        sale: {
            saleNumber: string;
            saleDate: Date;
            customer?: {
                firstName: string;
                lastName: string;
                documentType?: string | null;
                documentNumber?: string | null;
                address?: string | null;
                ivaCondition?: string | null;
            } | null;
            customerName?: string | null;
            items: SaleItem[];
            payments?: {
                paymentMethod: PaymentMethod;
                amount: number;
            }[];
            subtotal: number;
            discount: number;
            tax: number;
            total: number;
            isOnAccount: boolean;
        },
        fiscalConfig?: {
            businessName: string | null;
            businessAddress: string | null;
            cuit: string | null;
            ivaCondition: string;
            grossIncome?: string | null;
            activityStartDate?: Date | null;
            pointOfSale: number;
        } | null
    ): Promise<Buffer> {
        if (!this.templateNotaVenta) {
            throw new Error('Template de nota de venta no disponible');
        }

        // Preparar datos para el template
        const renderData = this.prepareSaleNoteRenderData(sale, fiscalConfig);

        // Renderizar HTML
        const html = this.templateNotaVenta(renderData);

        // Generar PDF
        return this.htmlToPdf(html);
    }

    async generateSaleReturnReceiptPdf(saleReturn: SaleReturn): Promise<Buffer> {
        const originalSale = saleReturn.originalSale;
        if (!originalSale) {
            throw new Error('La devolución debe incluir la venta original para generar el PDF');
        }
        return this.generateSaleNotePdf({
            saleNumber: `DEV-${saleReturn.id}`,
            saleDate: saleReturn.committedAt ?? saleReturn.createdAt ?? new Date(),
            customer: originalSale.customer,
            customerName: originalSale.customerName,
            items: saleReturn.items.map((item) => {
                const originalItem = originalSale.items.find((saleItem) => saleItem.id === item.originalSaleItemId);
                return {
                    ...(originalItem ?? {}),
                    quantity: item.quantityReturned,
                    unitPrice: item.unitRefundAmount,
                    subtotal: Number(item.quantityReturned) * Number(item.unitRefundAmount),
                    productDescription: `Devolución - ${originalItem?.productDescription ?? 'Producto'}`,
                } as SaleItem;
            }),
            payments: [],
            subtotal: Number(saleReturn.totalRefund),
            discount: 0,
            tax: 0,
            total: Number(saleReturn.totalRefund),
            isOnAccount: originalSale.isOnAccount,
        });
    }

    /**
     * Prepara los datos para renderizar la nota de venta
     */
    private prepareSaleNoteRenderData(
        sale: {
            saleNumber: string;
            saleDate: Date;
            customer?: {
                firstName: string;
                lastName: string;
                documentType?: string | null;
                documentNumber?: string | null;
                address?: string | null;
                ivaCondition?: string | null;
            } | null;
            customerName?: string | null;
            items: SaleItem[];
            payments?: {
                paymentMethod: PaymentMethod;
                amount: number;
            }[];
            subtotal: number;
            discount: number;
            tax: number;
            total: number;
            isOnAccount: boolean;
        },
        fiscalConfig?: {
            businessName: string | null;
            businessAddress: string | null;
            cuit: string | null;
            ivaCondition: string;
            grossIncome?: string | null;
            activityStartDate?: Date | null;
            pointOfSale: number;
        } | null
    ): Record<string, unknown> {
        // Nombre del cliente
        const customerName = sale.customer
            ? `${sale.customer.firstName} ${sale.customer.lastName}`
            : sale.customerName || 'Consumidor Final';

        // Tipo y número de documento del cliente
        const customerDocType = sale.customer?.documentType || 'DNI';
        const customerDocNumber = sale.customer?.documentNumber || '-';

        // Condición IVA del cliente
        const customerIvaCondition = sale.customer?.ivaCondition
            ? this.formatIvaCondition(sale.customer.ivaCondition)
            : 'Consumidor Final';

        // Mapeo de métodos de pago (los valores del enum son en minúscula)
        const paymentMethodLabels: Record<string, string> = {
            'cash': 'Efectivo',
            'debit_card': 'Tarjeta de Débito',
            'credit_card': 'Tarjeta de Crédito',
            'transfer': 'Transferencia',
            'qr': 'Código QR',
            'check': 'Cheque',
            'other': 'Otro',
        };

        return {
            // Datos del emisor
            businessName: fiscalConfig?.businessName || 'Mi Negocio',
            businessAddress: fiscalConfig?.businessAddress || '-',
            cuit: fiscalConfig?.cuit ? this.formatCuit(fiscalConfig.cuit) : '-',
            ivaCondition: fiscalConfig?.ivaCondition
                ? this.formatIvaCondition(fiscalConfig.ivaCondition)
                : '-',
            grossIncome: fiscalConfig?.grossIncome || null,
            activityStartDate: fiscalConfig?.activityStartDate
                ? this.formatDate(fiscalConfig.activityStartDate)
                : null,
            pointOfSale: fiscalConfig?.pointOfSale
                ? String(fiscalConfig.pointOfSale).padStart(4, '0')
                : '0001',

            // Datos del comprobante
            saleNumber: sale.saleNumber,
            issueDate: this.formatDate(sale.saleDate),

            // Datos del cliente
            customerName,
            customerDocType,
            customerDocNumber,
            customerAddress: sale.customer?.address || null,
            customerIvaCondition,

            // Condición de venta
            saleCondition: sale.isOnAccount ? 'Cuenta Corriente' : 'Contado',

            // Items
            items: sale.items.map(item => ({
                code: item.product?.sku || item.productCode || '-',
                description: item.product?.name || item.productDescription || 'Producto',
                quantity: this.formatNumber(item.quantity),
                unitOfMeasure: 'Unidad',
                unitPrice: this.formatCurrency(Number(item.unitPrice)),
                discountPercent: this.formatNumber(item.discountPercent || 0),
                discountAmount: this.formatCurrency(Number(item.discount) || 0),
                subtotal: this.formatCurrency(Number(item.subtotal)),
            })),

            // Totales
            subtotal: this.formatCurrency(Number(sale.subtotal)),
            discount: this.formatCurrency(Number(sale.discount)),
            tax: this.formatCurrency(Number(sale.tax)),
            total: this.formatCurrency(Number(sale.total)),
            hasDiscount: Number(sale.discount) > 0,
            hasTax: Number(sale.tax) > 0,

            // Pagos
            hasPayments: sale.payments && sale.payments.length > 0,
            payments: sale.payments?.map(p => {
                // Normalizar el método de pago a minúsculas para el mapeo
                const methodKey = p.paymentMethod?.code?.toLowerCase() || 'unknown';
                const methodLabel = paymentMethodLabels[methodKey] || p.paymentMethod?.name || 'Desconocido';
                return {
                    method: methodLabel,
                    amount: this.formatCurrency(Number(p.amount)),
                };
            }) || [],
        };
    }
}
