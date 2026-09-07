/**
 * Lista de ventas con acciones
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Eye,
    Trash2,
    Ban,
    CreditCard,
    MoreVertical,
    AlertTriangle,
    FileCheck,
    FileX,
    ChevronLeft,
    ChevronRight,
    PauseCircle,
    PlayCircle,
    RotateCcw,
} from 'lucide-react';
import { useParkedSales, ParkedSale } from '../hooks/useParkedSales';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useConfirm } from '@/hooks/useConfirm';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { salesApi } from '../api/sales.api';
import {
    Sale,
    SaleFilters,
    SaleStatus,
    SaleStatusLabels,
    SaleStatusColors,
    PaymentMethodLabels,
    InvoiceStatus,
} from '../types';
import { formatDateTimeForDisplay } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/utils';

interface SaleListProps {
    readonly filters?: SaleFilters;
    readonly onView?: (sale: Sale) => void;
    readonly onDelete?: (id: string) => void;
    readonly onCancel?: (id: string) => void;
    readonly onPay?: (sale: Sale) => void;
    readonly onReturn?: (sale: Sale) => void;
    readonly onResume?: (sale: ParkedSale) => void;
}

export function SaleList({
    filters,
    onView,
    onDelete,
    onCancel,
    onPay,
    onReturn,
    onResume,
}: SaleListProps) {
    const { parkedSales, removeSale } = useParkedSales();
    const confirm = useConfirm();
    const [currentPage, setCurrentPage] = useState(1);
    const limit = 20; // 20 ventas por página por defecto

    // Resetear a página 1 cuando cambian los filtros
    useEffect(() => {
        setCurrentPage(1);
    }, [filters?.search, filters?.status, filters?.startDate, filters?.endDate, filters?.customerId, filters?.productId]);

    const { data, isLoading, error } = useQuery({
        queryKey: ['sales', { ...filters, page: currentPage, limit }],
        queryFn: () => salesApi.getAll({ ...filters, page: currentPage, limit }),
    });

    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={`skeleton-${i}`} className="h-16 w-full" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8 text-destructive">
                Error al cargar ventas
            </div>
        );
    }

    if (!data?.data?.length) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No hay ventas para mostrar
            </div>
        );
    }

    /**
     * Obtiene el resumen de métodos de pago
     */
    const getPaymentSummary = (sale: Sale): string => {
        if (!sale.payments?.length) {
            return sale.isOnAccount ? 'Cuenta Corriente' : '-';
        }

        const methods = sale.payments.map(
            (p) => (p.paymentMethod as any)?.name || PaymentMethodLabels[p.paymentMethod]
        );
        return [...new Set(methods)].join(', ');
    };

    /**
     * Obtiene el nombre del cliente
     */
    const getCustomerName = (sale: Sale): string => {
        if (sale.customer) {
            return `${sale.customer.firstName} ${sale.customer.lastName}`;
        }
        return sale.customerName || 'Consumidor Final';
    };

    /**
     * Navegar a la página anterior
     */
    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    /**
     * Navegar a la página siguiente
     */
    const handleNextPage = () => {
        if (currentPage < data.totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    /**
     * Ir a una página específica
     */
    const goToPage = (page: number) => {
        if (page >= 1 && page <= data.totalPages) {
            setCurrentPage(page);
        }
    };

    /**
     * Generar números de página para mostrar
     */
    const getPageNumbers = (): number[] => {
        const pages: number[] = [];
        const totalPages = data.totalPages;
        const current = currentPage;

        if (totalPages <= 7) {
            // Mostrar todas las páginas si son 7 o menos
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Siempre mostrar primera página
            pages.push(1);

            if (current > 3) {
                pages.push(-1); // Indicador de "..."
            }

            // Páginas alrededor de la actual
            const start = Math.max(2, current - 1);
            const end = Math.min(totalPages - 1, current + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (current < totalPages - 2) {
                pages.push(-1); // Indicador de "..."
            }

            // Siempre mostrar última página
            pages.push(totalPages);
        }

        return pages;
    };

    return (
        <div className="space-y-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nº Venta</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Productos</TableHead>
                        <TableHead>Pago</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Factura</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {/* Ventas Pendientes (Parked) - Solo en página 1 y sin filtros activos (opcional, por ahora mostrar siempre si page=1) */}
                    {currentPage === 1 && parkedSales.map((sale) => (
                        <TableRow
                            key={`parked-${sale.id}`}
                            className="bg-orange-50/50 hover:bg-orange-50 border-l-4 border-l-orange-400"
                        >
                            <TableCell className="font-medium text-orange-700">
                                <span className="flex items-center gap-1">
                                    <PauseCircle className="h-4 w-4" />
                                    Pendiente
                                </span>
                            </TableCell>
                            <TableCell>
                                {formatDateTimeForDisplay(sale.date)}
                            </TableCell>
                            <TableCell>
                                {sale.customerName || 'Cliente Ocasional'}
                            </TableCell>
                            <TableCell>
                                <span className="text-muted-foreground">
                                    {sale.itemCount} item(s)
                                </span>
                            </TableCell>
                            <TableCell>-</TableCell>
                            <TableCell className="text-right font-medium">
                                {formatCurrency(sale.total)}
                            </TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="border-orange-400 text-orange-700 bg-orange-100">
                                    POSPUESTA
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                                        onClick={() => onResume?.(sale)}
                                        title="Retomar venta"
                                    >
                                        <PlayCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                                        onClick={async () => {
                                            const confirmed = await confirm({
                                                title: 'Eliminar venta pendiente',
                                                description: '¿Estás seguro de que querés eliminar esta venta? Esta acción no se puede deshacer.',
                                                variant: 'danger',
                                                confirmLabel: 'Eliminar',
                                                cancelLabel: 'Cancelar',
                                            });
                                            if (confirmed) {
                                                removeSale(sale.id);
                                            }
                                        }}
                                        title="Eliminar venta pendiente"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}

                    {data.data.map((sale) => (
                        <TableRow
                            key={sale.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => onView?.(sale)}
                        >
                            <TableCell className="font-medium">
                                {sale.saleNumber}
                            </TableCell>
                            <TableCell>
                                {formatDateTimeForDisplay(sale.saleDate)}
                            </TableCell>
                            <TableCell>
                                <div className="max-w-[150px] truncate">
                                    {getCustomerName(sale)}
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="text-muted-foreground">
                                    {sale.items?.length || 0} item(s)
                                </span>
                            </TableCell>
                            <TableCell>
                                <span className="text-sm">
                                    {getPaymentSummary(sale)}
                                </span>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                {formatCurrency(sale.total)}
                            </TableCell>
                            <TableCell>
                                {/* Indicador de tipo de facturación */}
                                {sale.isFiscal || sale.invoice?.status === InvoiceStatus.AUTHORIZED ? (
                                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400" title="Factura fiscal autorizada">
                                        <FileCheck className="h-4 w-4" />
                                        <span className="text-xs">Fiscal</span>
                                    </div>
                                ) : sale.fiscalPending || sale.invoice?.status === InvoiceStatus.REJECTED || sale.invoice?.status === InvoiceStatus.ERROR ? (
                                    <div
                                        className="flex items-center gap-1 text-orange-600 dark:text-orange-400"
                                        title={sale.fiscalError || sale.invoice?.afipErrorMessage || 'Error en factura fiscal'}
                                    >
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="text-xs">Error</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-muted-foreground" title="Sin factura fiscal">
                                        <FileX className="h-4 w-4" />
                                        <span className="text-xs">No fiscal</span>
                                    </div>
                                )}
                            </TableCell>
                            <TableCell>
                                <Badge className={SaleStatusColors[sale.status]}>
                                    {SaleStatusLabels[sale.status]}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onView?.(sale);
                                            }}
                                        >
                                            <Eye className="mr-2 h-4 w-4" />
                                            Ver Detalle
                                        </DropdownMenuItem>

                                        {sale.status === SaleStatus.PENDING ? (
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onPay?.(sale);
                                                }}
                                            >
                                                <CreditCard className="mr-2 h-4 w-4" />
                                                Registrar Pago
                                            </DropdownMenuItem>
                                        ) : null}

                                        <DropdownMenuSeparator />

                                        {sale.status === SaleStatus.CANCELLED ? null : (
                                            <DropdownMenuItem
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onReturn?.(sale);
                                                }}
                                            >
                                                <RotateCcw className="mr-2 h-4 w-4" />
                                                Devolver
                                            </DropdownMenuItem>
                                        )}

                                        {sale.status === SaleStatus.CANCELLED ? null : (
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCancel?.(sale.id);
                                                }}
                                                className="text-yellow-600"
                                            >
                                                <Ban className="mr-2 h-4 w-4" />
                                                Cancelar
                                            </DropdownMenuItem>
                                        )}

                                        {sale.inventoryUpdated ? null : (
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete?.(sale.id);
                                                }}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Eliminar
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* Información de paginación */}
            {data.total > 0 ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                        Mostrando {((currentPage - 1) * limit) + 1} a {Math.min(currentPage * limit, data.total)} de {data.total} {data.total === 1 ? 'venta' : 'ventas'}
                    </p>

                    {/* Controles de navegación - solo si hay más de una página */}
                    {data.totalPages > 1 ? (
                        <div className="flex items-center gap-2">
                            {/* Botón anterior */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePreviousPage}
                                disabled={currentPage <= 1}
                                className="h-8"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Anterior
                            </Button>

                            {/* Números de página */}
                            <div className="hidden sm:flex items-center gap-1">
                                {getPageNumbers().map((pageNum, idx) => {
                                    if (pageNum === -1) {
                                        return (
                                            <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                                                ...
                                            </span>
                                        );
                                    }
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={currentPage === pageNum ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => goToPage(pageNum)}
                                            className="h-8 w-8 p-0"
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                            </div>

                            {/* Indicador de página en móvil */}
                            <div className="sm:hidden text-sm text-muted-foreground">
                                Página {currentPage} de {data.totalPages}
                            </div>

                            {/* Botón siguiente */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleNextPage}
                                disabled={currentPage >= data.totalPages}
                                className="h-8"
                            >
                                Siguiente
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

