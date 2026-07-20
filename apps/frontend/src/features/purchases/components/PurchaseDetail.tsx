/**
 * Componente de detalle de compra con diseño premium
 */
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Receipt,
    Package,
    Building2,
    FileText,
    Calendar,
    CreditCard,
    CheckCircle2,
    Clock,
    XCircle,
    Boxes,
    Phone,
    User,
    DollarSign,
    TrendingDown,
    Percent,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
    Purchase,
} from '../types';
import { formatDateForDisplay } from '@/lib/date-utils';

interface PurchaseDetailProps {
    readonly purchase: Purchase;
    readonly open: boolean;
    readonly onClose: () => void;
}

/**
 * Formatea un número como moneda ARS
 */
function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(value);
}

/**
 * Obtiene el icono y color del estado
 */
function getStatusStyle(status: Purchase['status']) {
    switch (status) {
        case 'paid':
            return {
                icon: CheckCircle2,
                bgClass: 'bg-green-500/30 text-white border-green-400/50',
                label: 'Pagada',
            };
        case 'pending':
            return {
                icon: Clock,
                bgClass: 'bg-yellow-500/30 text-white border-yellow-400/50',
                label: 'Pendiente',
            };
        case 'cancelled':
            return {
                icon: XCircle,
                bgClass: 'bg-red-500/30 text-white border-red-400/50',
                label: 'Cancelada',
            };
        default:
            return {
                icon: Clock,
                bgClass: 'bg-slate-500/30 text-white border-slate-400/50',
                label: status,
            };
    }
}

export function PurchaseDetail({ purchase, open, onClose }: PurchaseDetailProps) {
    const statusStyle = getStatusStyle(purchase.status);
    const StatusIcon = statusStyle.icon;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
                {/* Header con gradiente */}
                <div className="bg-gradient-to-br from-primary/90 via-primary to-primary/80 px-6 py-5 text-primary-foreground sticky top-0 z-10">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Receipt className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold tracking-tight">
                                Compra {purchase.purchaseNumber}
                            </h2>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge
                                    variant="secondary"
                                    className={statusStyle.bgClass}
                                >
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {statusStyle.label}
                                </Badge>
                                {purchase.inventoryUpdated ? (
                                    <Badge
                                        variant="secondary"
                                        className="bg-emerald-500/30 text-white border-emerald-400/50"
                                    >
                                        <Boxes className="h-3 w-3 mr-1" />
                                        Stock Actualizado
                                    </Badge>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contenido principal */}
                <div className="p-6 space-y-5">
                    {/* Información del proveedor y datos de compra */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Proveedor */}
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-3">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Proveedor
                                </span>
                            </div>
                            <p className="font-semibold text-lg">{purchase.providerName}</p>
                            {purchase.providerDocument ? (
                                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                    <CreditCard className="h-3.5 w-3.5" />
                                    <span>CUIT/DNI: {purchase.providerDocument}</span>
                                </div>
                            ) : null}
                            {purchase.providerPhone ? (
                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                    <Phone className="h-3.5 w-3.5" />
                                    <span>{purchase.providerPhone}</span>
                                </div>
                            ) : null}
                        </div>

                        {/* Datos de compra */}
                        <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800/50">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                    Datos de Compra
                                </span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Fecha:</span>
                                    <span className="font-medium">
                                        {formatDateForDisplay(purchase.purchaseDate, 'long')}
                                    </span>
                                </div>
                                {purchase.invoiceNumber ? (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Factura:</span>
                                        <span className="font-mono text-sm">{purchase.invoiceNumber}</span>
                                    </div>
                                ) : null}
                                {purchase.paymentMethod ? (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Método de pago:</span>
                                        <span className="font-medium">{purchase.paymentMethod.name}</span>
                                    </div>
                                ) : null}
                                {purchase.paidAt ? (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Fecha de pago:</span>
                                        <span className="font-medium">{formatDateForDisplay(purchase.paidAt, 'short')}</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Productos */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Productos ({purchase.items.length})
                            </span>
                        </div>

                        <div className="rounded-xl border border-border/50 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="font-semibold">Producto</TableHead>
                                        <TableHead className="text-center font-semibold">Cantidad</TableHead>
                                        <TableHead className="text-right font-semibold">Precio Unit.</TableHead>
                                        <TableHead className="text-right font-semibold">Subtotal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchase.items.map((item, index) => (
                                        <TableRow
                                            key={item.id}
                                            className={index % 2 === 0 ? 'bg-transparent' : 'bg-muted/10'}
                                        >
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{item.product.name}</p>
                                                    {item.product.sku ? (
                                                        <p className="text-xs text-muted-foreground">
                                                            SKU: {item.product.sku}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="font-medium">{item.quantity}</span>
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {formatCurrency(item.unitPrice)}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {formatCurrency(item.subtotal)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <Separator />

                    {/* Totales */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Resumen de Pago
                            </span>
                        </div>

                        <div className="rounded-xl bg-muted/40 p-4 border border-border/50 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Subtotal:</span>
                                <span className="font-medium">{formatCurrency(purchase.subtotal)}</span>
                            </div>

                            {purchase.tax > 0 ? (
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Percent className="h-3.5 w-3.5" />
                                        <span>Impuestos:</span>
                                    </div>
                                    <span className="font-medium">+ {formatCurrency(purchase.tax)}</span>
                                </div>
                            ) : null}

                            {purchase.discount > 0 ? (
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                        <TrendingDown className="h-3.5 w-3.5" />
                                        <span>Descuento:</span>
                                    </div>
                                    <span className="font-medium text-green-600 dark:text-green-400">
                                        - {formatCurrency(purchase.discount)}
                                    </span>
                                </div>
                            ) : null}
                        </div>

                        {/* Total destacado */}
                        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 p-4 border border-emerald-200 dark:border-emerald-800/50 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                                    TOTAL
                                </span>
                                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(purchase.total)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Notas */}
                    {purchase.notes ? (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Notas
                                    </span>
                                </div>

                                <div className="rounded-xl bg-muted/40 p-4 border border-border/50">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                        {purchase.notes}
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : null}

                    {/* Metadata */}
                    <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            <span>
                                Registrado por:{' '}
                                {purchase.createdBy
                                    ? `${purchase.createdBy.firstName} ${purchase.createdBy.lastName}`
                                    : 'Sistema'}
                            </span>
                        </div>
                        <span className="text-muted-foreground/50">•</span>
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                                Creado: {format(new Date(purchase.createdAt), 'PPpp', { locale: es })}
                            </span>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
