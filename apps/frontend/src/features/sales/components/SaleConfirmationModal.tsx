/**
 * Modal de Confirmación de Venta (POS)
 * Rediseño minimalista de alta velocidad: Vuelto claro, resumen compacto y acciones unificadas.
 */
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    CheckCircle2,
    User,
    Calendar,
    Receipt,
    Download,
    Loader2,
    AlertTriangle,
    Printer,
    Sparkles,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { Sale, InvoiceStatus, InvoiceTypeLabels, PaymentMethodLabels } from '../types';
import { formatDateForDisplay } from '@/lib/date-utils';
import { invoicesApi } from '../api/sales.api';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { generateSaleTicketHtml } from '../utils/ticketGenerator';
import { PaymentMethodIcons } from '../constants';

interface SaleConfirmationModalProps {
    readonly sale: Sale | null;
    readonly open: boolean;
    readonly onClose: () => void;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(value);
}

export function SaleConfirmationModal({
    sale,
    open,
    onClose,
}: SaleConfirmationModalProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPrintingTicket, setIsPrintingTicket] = useState(false);
    const [showItemsDetail, setShowItemsDetail] = useState(false);
    const newSaleBtnRef = useRef<HTMLButtonElement>(null);

    // Configuración del sistema (tiquetera)
    const { data: config } = useQuery({
        queryKey: ['configuration'],
        queryFn: async () => {
            const res = await api.get('/api/configuration');
            return res.data;
        },
        enabled: open,
    });

    // Auto-enfocar botón "Nueva Venta" al abrir y permitir atajos (Enter / Esc / F8)
    useEffect(() => {
        if (!open) return;

        const timer = setTimeout(() => {
            newSaleBtnRef.current?.focus();
        }, 100);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F8') {
                e.preventDefault();
                e.stopPropagation();
                handlePrintTicket();
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [open, onClose]);

    const handlePrintTicket = async () => {
        if (!sale) return;
        setIsPrintingTicket(true);
        try {
            const html = generateSaleTicketHtml(sale, config);
            if (window.electronAPI?.printTicket) {
                const res = await window.electronAPI.printTicket({
                    html,
                    printerName: config?.ticketPrinterName,
                    paperWidth: config?.ticketPaperWidth || '80mm',
                });
                if (res.success) {
                    toast.success('Ticket enviado a la tiquetera');
                } else {
                    toast.error(`Error al imprimir ticket: ${res.error || 'Verifique la tiquetera'}`);
                }
            } else {
                const printWin = window.open('', '_blank', 'width=350,height=500');
                if (printWin) {
                    printWin.document.write(`
                        <html>
                            <head>
                                <style>
                                    body { font-family: monospace; font-size: 12px; padding: 10px; }
                                    .text-center { text-align: center; }
                                    .text-right { text-align: right; }
                                    .bold { font-weight: bold; }
                                    .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
                                    table { width: 100%; border-collapse: collapse; }
                                </style>
                            </head>
                            <body onload="window.print(); window.close();">
                                ${html}
                            </body>
                        </html>
                    `);
                    printWin.document.close();
                }
            }
        } catch {
            toast.error('Error al imprimir ticket');
        } finally {
            setIsPrintingTicket(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (!sale) return;
        setIsDownloading(true);
        try {
            const isFiscal = sale.isFiscal || sale.invoice?.status === InvoiceStatus.AUTHORIZED;
            const endpoint = isFiscal && sale.invoice?.id
                ? invoicesApi.getInvoicePdf(sale.invoice.id)
                : invoicesApi.getSaleNotePdfUrl(sale.id);

            const fileName = isFiscal && sale.invoice
                ? `factura-${String(sale.invoice.pointOfSale).padStart(4, '0')}-${String(sale.invoice.invoiceNumber).padStart(8, '0')}.pdf`
                : `nota-venta-${sale.saleNumber}.pdf`;

            const response = await api.get(endpoint, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            toast.success('Comprobante descargado');
        } catch {
            toast.error('Error al descargar comprobante');
        } finally {
            setIsDownloading(false);
        }
    };

    if (!sale) return null;

    const totalPaid = sale.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const change = totalPaid - sale.total;
    const hasChange = change > 0.01;

    const isFiscal = sale.isFiscal || sale.invoice?.status === InvoiceStatus.AUTHORIZED;
    const hasFiscalError = sale.fiscalPending ||
        sale.invoice?.status === InvoiceStatus.REJECTED ||
        sale.invoice?.status === InvoiceStatus.ERROR;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-md w-full p-6 space-y-4 rounded-2xl shadow-2xl">
                {/* Cabecera limpia de éxito */}
                <DialogHeader className="space-y-2 text-center pb-2 border-b">
                    <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center border-2 border-emerald-500/30">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-black tracking-tight">
                            ¡Venta {sale.saleNumber} Completada!
                        </DialogTitle>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            {isFiscal && sale.invoice ? (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-300 font-semibold text-xs">
                                    Factura {InvoiceTypeLabels[sale.invoice.invoiceType]} Autorizada
                                </Badge>
                            ) : hasFiscalError ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1 text-amber-600" /> Nota de Venta
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="text-xs">
                                    Nota de Venta (No Fiscal)
                                </Badge>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                {/* BANNER DESTACADO DE VUELTO GIGANTE */}
                {hasChange && (
                    <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white shadow-lg flex items-center justify-between border border-emerald-400/30">
                        <div>
                            <span className="text-xs uppercase font-extrabold tracking-wider opacity-90 block mb-0.5">
                                💵 Vuelto a Entregar
                            </span>
                            <p className="text-3xl font-black tracking-tight drop-shadow-sm">
                                {formatCurrency(change)}
                            </p>
                        </div>
                        <div className="text-right opacity-90 text-xs font-medium">
                            <p>Abonó: <strong>{formatCurrency(totalPaid)}</strong></p>
                            <p>Total: {formatCurrency(sale.total)}</p>
                        </div>
                    </div>
                )}

                {/* Resumen compacto de la transacción */}
                <Card className="border bg-card shadow-sm">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Total Cobrado</span>
                            <span className="text-xl font-extrabold text-foreground font-mono">
                                {formatCurrency(sale.total)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-2">
                            <span className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                {sale.customer ? `${sale.customer.firstName} ${sale.customer.lastName}` : 'Consumidor Final'}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDateForDisplay(sale.saleDate.toString())}
                            </span>
                        </div>

                        {/* Detalle de pagos */}
                        {sale.payments && sale.payments.length > 0 && (
                            <div className="border-t pt-2 space-y-1">
                                {sale.payments.map((p, idx) => {
                                    const Icon = PaymentMethodIcons[(p.paymentMethod as any)?.code] || PaymentMethodIcons[p.paymentMethod] || Receipt;
                                    return (
                                        <div key={idx} className="flex justify-between items-center text-xs">
                                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                                <Icon className="h-3.5 w-3.5" />
                                                {(p.paymentMethod as any)?.name || PaymentMethodLabels[p.paymentMethod]}
                                            </span>
                                            <span className="font-semibold text-foreground">{formatCurrency(p.amount)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Detalle desplegable opcional de ítems */}
                <div className="border rounded-lg overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowItemsDetail(!showItemsDetail)}
                        className="w-full px-3 py-2 bg-muted/40 hover:bg-muted/70 text-xs font-medium text-muted-foreground flex items-center justify-between transition-colors"
                    >
                        <span className="flex items-center gap-1.5">
                            <Receipt className="h-3.5 w-3.5" />
                            Detalle de productos ({sale.items.length})
                        </span>
                        {showItemsDetail ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    {showItemsDetail && (
                        <div className="p-3 max-h-40 overflow-y-auto space-y-1.5 bg-background text-xs">
                            {sale.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center py-1 border-b last:border-0">
                                    <span className="truncate pr-2 font-medium">{item.quantity}x {item.productDescription}</span>
                                    <span className="font-semibold font-mono">{formatCurrency(item.subtotal)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Botón Principal y Acciones secundarias */}
                <div className="space-y-2 pt-2">
                    <Button
                        ref={newSaleBtnRef}
                        type="button"
                        onClick={onClose}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 h-12 text-base shadow-lg transition-all"
                    >
                        <Sparkles className="mr-2 h-5 w-5" />
                        Nueva Venta (Enter / Esc)
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handlePrintTicket}
                            disabled={isPrintingTicket}
                            className="h-10 text-xs font-semibold"
                        >
                            {isPrintingTicket ? (
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Printer className="mr-2 h-3.5 w-3.5" />
                            )}
                            Imprimir Ticket (F8)
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleDownloadPdf}
                            disabled={isDownloading}
                            className="h-10 text-xs font-semibold"
                        >
                            {isDownloading ? (
                                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Download className="mr-2 h-3.5 w-3.5" />
                            )}
                            Descargar PDF
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
