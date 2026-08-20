import { Sale } from '../types';

export interface TicketConfig {
    ticketHeaderTitle?: string | null;
    ticketHeaderAddress?: string | null;
    ticketHeaderPhone?: string | null;
    ticketFooterText?: string | null;
    ticketShowCustomerData?: boolean;
    ticketLogoUrl?: string | null;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(value);
}

function formatDate(dateStr: string | Date): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return String(dateStr);
    }
}

function formatDateOnly(dateStr: string | Date): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-AR');
    } catch {
        return String(dateStr);
    }
}

function getInvoiceTypeName(type?: number): { name: string; letter: string; code: string } {
    switch (type) {
        case 1:
            return { name: 'FACTURA A', letter: 'A', code: 'COD. 001' };
        case 6:
            return { name: 'FACTURA B', letter: 'B', code: 'COD. 006' };
        case 11:
            return { name: 'FACTURA C', letter: 'C', code: 'COD. 011' };
        case 3:
            return { name: 'NOTA DE CRÉDITO A', letter: 'A', code: 'COD. 003' };
        case 8:
            return { name: 'NOTA DE CRÉDITO B', letter: 'B', code: 'COD. 008' };
        case 13:
            return { name: 'NOTA DE CRÉDITO C', letter: 'C', code: 'COD. 013' };
        default:
            return { name: 'FACTURA FISCAL', letter: 'F', code: '' };
    }
}

/**
 * Genera el HTML formateado para tiqueteras térmicas (58mm / 80mm)
 */
export function generateSaleTicketHtml(sale: Sale, config?: TicketConfig): string {
    const title = config?.ticketHeaderTitle || 'NEXOPOS';
    const address = config?.ticketHeaderAddress || '';
    const phone = config?.ticketHeaderPhone || '';
    const footer = config?.ticketFooterText || '¡Gracias por su compra!';
    const showCustomer = config?.ticketShowCustomerData ?? true;
    const logoUrl = config?.ticketLogoUrl || '';

    const totalPaid = sale.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const change = totalPaid - sale.total;
    const hasChange = change > 0.01;

    // Logo HTML
    const logoHtml = logoUrl
        ? `<div style="text-align: center; margin-bottom: 6px;">
            <img src="${logoUrl}" style="max-width: 130px; max-height: 60px; object-fit: contain; margin: 0 auto; display: block;" alt="Logo" />
           </div>`
        : '';

    // Encabezado y datos fiscales vs no-fiscales
    let headerBlock = '';
    let footerFiscalBlock = '';

    if (sale.invoice?.invoiceNumber) {
        const invInfo = getInvoiceTypeName(sale.invoice.invoiceType);
        const pointOfSaleStr = String(sale.invoice.pointOfSale || 1).padStart(4, '0');
        const invoiceNumStr = String(sale.invoice.invoiceNumber).padStart(8, '0');
        const formattedInvoiceNum = `${pointOfSaleStr}-${invoiceNumStr}`;

        headerBlock = `
            <div style="border: 1px solid #000; text-align: center; padding: 4px; margin: 4px 0;">
                <div style="font-size: 16px; font-weight: bold;">[ ${invInfo.letter} ]</div>
                <div style="font-size: 9px;">${invInfo.code}</div>
                <div style="font-size: 12px; font-weight: bold; margin-top: 2px;">${invInfo.name}</div>
                <div style="font-size: 11px;">Nº ${formattedInvoiceNum}</div>
            </div>

            <div style="font-size: 10px; margin-top: 4px;">
                ${sale.invoice.emitterBusinessName ? `<div><b>Razón Social:</b> ${sale.invoice.emitterBusinessName}</div>` : `<div><b>Comercio:</b> ${title}</div>`}
                ${sale.invoice.emitterCuit ? `<div><b>CUIT:</b> ${sale.invoice.emitterCuit}</div>` : ''}
                ${sale.invoice.emitterIvaCondition ? `<div><b>Condición IVA:</b> ${sale.invoice.emitterIvaCondition}</div>` : ''}
                ${sale.invoice.emitterAddress || address ? `<div><b>Domicilio:</b> ${sale.invoice.emitterAddress || address}</div>` : ''}
                ${sale.invoice.emitterGrossIncome ? `<div><b>Ing. Brutos:</b> ${sale.invoice.emitterGrossIncome}</div>` : ''}
                ${sale.invoice.emitterActivityStartDate ? `<div><b>Inicio Act:</b> ${formatDateOnly(sale.invoice.emitterActivityStartDate)}</div>` : ''}
            </div>
        `;

        if (showCustomer) {
            headerBlock += `
                <div class="divider"></div>
                <div style="font-size: 10px;">
                    <div><b>Cliente:</b> ${sale.invoice.receiverName || (sale.customer ? `${sale.customer.firstName} ${sale.customer.lastName}` : 'Consumidor Final')}</div>
                    ${sale.invoice.receiverDocumentNumber ? `<div><b>CUIT/DNI:</b> ${sale.invoice.receiverDocumentNumber}</div>` : (sale.customer?.documentNumber ? `<div><b>Doc:</b> ${sale.customer.documentNumber}</div>` : '')}
                    ${sale.invoice.receiverIvaCondition ? `<div><b>Condición IVA:</b> ${sale.invoice.receiverIvaCondition}</div>` : ''}
                </div>
            `;
        }

        footerFiscalBlock = `
            <div class="divider"></div>
            <div style="font-size: 10px; text-align: center;" class="bold">
                ${sale.invoice.cae ? `<div>CAE Nº: ${sale.invoice.cae}</div>` : ''}
                ${sale.invoice.caeExpiration ? `<div>Fecha Vto. CAE: ${formatDateOnly(sale.invoice.caeExpiration)}</div>` : ''}
                <div style="font-size: 9px; font-weight: normal; margin-top: 2px;">Comprobante Autorizado por AFIP</div>
            </div>
        `;
    } else {
        headerBlock = `
            <div class="text-center bold" style="font-size: 14px; text-transform: uppercase;">${title}</div>
            ${address ? `<div class="text-center text-muted" style="font-size: 10px;">${address}</div>` : ''}
            ${phone ? `<div class="text-center text-muted" style="font-size: 10px;">Tel: ${phone}</div>` : ''}

            <div class="divider"></div>
            <div class="bold text-center" style="margin-top: 2px;">COMPROBANTE NO FISCAL</div>
            <div class="text-center" style="font-size: 10px;">Venta Nº: ${sale.saleNumber}</div>
        `;

        if (showCustomer && sale.customer) {
            headerBlock += `
                <div style="font-size: 10px; margin-top: 2px;">
                    Cliente: ${sale.customer.firstName} ${sale.customer.lastName}
                    ${sale.customer.documentNumber ? `<br>Doc: ${sale.customer.documentNumber}` : ''}
                </div>
            `;
        }
    }

    // Detalle de ítems (precio unitario solo si cantidad > 1)
    const itemsHtml = sale.items.map(item => {
        const unitPrice = item.unitPrice ?? (item.quantity > 0 ? item.subtotal / item.quantity : 0);
        const hasMultiple = item.quantity > 1;
        return `
            <tr>
                <td style="padding: 3px 0;">
                    <div style="font-weight: bold;">${item.productDescription}</div>
                    ${hasMultiple ? `<div style="font-size: 10px; color: #333;">${item.quantity} u. x ${formatCurrency(unitPrice)}</div>` : ''}
                </td>
                <td class="text-right bold" style="padding: 3px 0; vertical-align: top;">
                    ${formatCurrency(item.subtotal)}
                </td>
            </tr>
        `;
    }).join('');

    const paymentsHtml = sale.payments?.map(p => `
        <div class="flex justify-between" style="font-size: 10px;">
            <span>Pago (${p.paymentMethod}):</span>
            <span>${formatCurrency(p.amount)}</span>
        </div>
    `).join('') || '';

    return `
        ${logoHtml}
        ${headerBlock}

        <div class="text-center" style="font-size: 10px; margin-top: 2px;">Fecha: ${formatDate(sale.saleDate)}</div>

        <div class="divider"></div>

        <table>
            <thead>
                <tr>
                    <th style="border-bottom: 1px solid #000; padding-bottom: 2px;">CANT / DETALLE</th>
                    <th class="text-right" style="border-bottom: 1px solid #000; padding-bottom: 2px;">SUBTOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="divider"></div>

        ${sale.discount > 0 ? `
            <div class="flex justify-between" style="font-size: 11px;">
                <span>Subtotal:</span>
                <span>${formatCurrency(sale.subtotal)}</span>
            </div>
            <div class="flex justify-between" style="font-size: 11px;">
                <span>Descuento:</span>
                <span>-${formatCurrency(sale.discount)}</span>
            </div>
        ` : ''}

        <div class="flex justify-between bold" style="font-size: 14px; margin-top: 4px;">
            <span>TOTAL:</span>
            <span>${formatCurrency(sale.total)}</span>
        </div>

        ${paymentsHtml ? `<div style="margin-top: 4px;">${paymentsHtml}</div>` : ''}

        ${hasChange ? `
            <div class="flex justify-between bold" style="font-size: 11px; margin-top: 2px;">
                <span>CAMBIO:</span>
                <span>${formatCurrency(change)}</span>
            </div>
        ` : ''}

        ${footerFiscalBlock}

        <div class="divider"></div>

        <div class="text-center font-medium" style="margin-top: 6px; font-size: 11px;">
            ${footer}
        </div>
    `;
}

