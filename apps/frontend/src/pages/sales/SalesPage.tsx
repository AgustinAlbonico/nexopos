/**
 * Página de Ventas (POS)
 * Gestión completa de ventas con punto de venta integrado
 */
import { useState, useMemo, useCallback } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Filter, RotateCcw } from 'lucide-react';
import { useShortcutAction } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useParkedSales, ParkedSale } from '@/features/sales/hooks/useParkedSales';
import {
    SaleForm,
    SaleList,
    SaleDetail,
    SaleStatsCards,
    SaleConfirmationModal,
} from '@/features/sales/components';
import { salesApi } from '@/features/sales/api/sales.api';
import {
    Sale,
    SaleFilters,
    SaleStatus,
    SaleStatusLabels,
    InvoiceFilterStatus,
    InvoiceFilterStatusLabels,
    CreateSaleDTO,
} from '@/features/sales/types';
import {
    getCurrentMonthRange,
    getTodayRange,
    getCurrentWeekRange,
    formatDateForDisplay,
} from '@/lib/date-utils';
import { useOpenCashRegister, useCashStatus } from '@/features/cash-register/hooks';
import { UnclosedCashAlertDialog } from '@/features/cash-register/components/UnclosedCashAlertDialog';

/**
 * Página principal de gestión de ventas
 */
export default function SalesPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [viewingSale, setViewingSale] = useState<Sale | null>(null);
    const [confirmedSale, setConfirmedSale] = useState<Sale | null>(null);
    // Estado para controlar si el usuario decidió continuar a pesar de la alerta de caja
    const [dismissedCashAlert, setDismissedCashAlert] = useState(false);

    // Estado para recuperar venta pendiente
    const [resumingSale, setResumingSale] = useState<ParkedSale | null>(null);
    const { retrieveSale } = useParkedSales();

    // Inicializar filtros con el mes actual por defecto
    const defaultMonthRange = useMemo(() => getCurrentMonthRange(), []);
    const [filters, setFilters] = useState<SaleFilters>({
        startDate: defaultMonthRange.startDate,
        endDate: defaultMonthRange.endDate,
    });

    const queryClient = useQueryClient();
    const confirm = useConfirm();

    // Estado de la caja actual (si hay caja abierta hoy)
    const { data: openRegister } = useOpenCashRegister();

    // Estado de la caja para detectar si es del día anterior
    const { data: cashStatus, isLoading: isCashStatusLoading } = useCashStatus();

    // Estado para trackear si el usuario descartó la alerta de caja del día anterior dentro del modal
    const [dismissedModalCashAlert, setDismissedModalCashAlert] = useState(false);

    // Callback para abrir modal de nueva venta (usado por botón y atajo F1)
    const openCreateModal = useCallback(() => {
        if (!openRegister) {
            toast.error('La caja de hoy está cerrada. Abrí la caja para registrar ventas.');
            return;
        }
        setIsCreateOpen(true);
    }, [openRegister]);

    // Atajo de teclado F1 para nueva venta
    useShortcutAction('NEW_SALE', openCreateModal);

    // Mutaciones
    const createMutation = useMutation({
        mutationFn: salesApi.create,
        onSuccess: (newSale) => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['sale-stats'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            // Invalidar cuentas corrientes si es venta a cuenta
            if (newSale.isOnAccount) {
                // Invalidar todas las queries de cuentas corrientes para refrescar la data
                queryClient.invalidateQueries({ queryKey: ['customer-accounts'] });
            }
            toast.success('Venta registrada exitosamente');
            setIsCreateOpen(false);
            // Mostrar modal de confirmación con la venta creada
            setConfirmedSale(newSale);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Error al registrar venta');
        },
    });

    const cancelMutation = useMutation({
        mutationFn: salesApi.cancel,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['sale-stats'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Venta cancelada');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Error al cancelar venta');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: salesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['sale-stats'] });
            toast.success('Venta eliminada');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Error al eliminar venta');
        },
    });

    // Handlers
    const handleCreate = (data: CreateSaleDTO) => {
        createMutation.mutate(data);
    };

    const handleResumeParkedSale = (parkedSale: ParkedSale) => {
        if (!openRegister) {
            toast.error('La caja de hoy está cerrada. Abrí la caja para registrar ventas.');
            return;
        }
        setResumingSale(parkedSale);
        retrieveSale(parkedSale.id); // Mark as retrieved/remove if needed by logic, but mostly to sync state
        setIsCreateOpen(true);
    };

    const handleView = (sale: Sale) => {
        setViewingSale(sale);
    };

    const handleCancel = async (id: string) => {
        const confirmed = await confirm({
            title: 'Cancelar venta',
            description: '¿Cancelar esta venta? Si ya se actualizó el inventario, se revertirá.',
            variant: 'warning',
            confirmLabel: 'Cancelar venta',
        });
        if (confirmed) {
            cancelMutation.mutate(id);
        }
    };

    const handlePay = (sale: Sale) => {
        // Por ahora solo mostrar mensaje
        toast.info('Funcionalidad de pago pendiente en próxima versión');
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Eliminar venta',
            description: '¿Eliminar esta venta? Esta acción no se puede deshacer.',
            variant: 'danger',
            confirmLabel: 'Eliminar',
        });
        if (confirmed) {
            deleteMutation.mutate(id);
        }
    };

    const handleFilterChange = (
        key: keyof SaleFilters,
        value: string | undefined
    ) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value === '' ? undefined : value,
        }));
    };

    // Funciones para detectar qué filtro está activo
    const isTodayActive = () => {
        const todayRange = getTodayRange();
        return (
            filters.startDate === todayRange.startDate &&
            filters.endDate === todayRange.endDate
        );
    };

    const isCurrentWeekActive = () => {
        const weekRange = getCurrentWeekRange();
        return (
            filters.startDate === weekRange.startDate &&
            filters.endDate === weekRange.endDate
        );
    };

    const isCurrentMonthActive = () => {
        const monthRange = getCurrentMonthRange();
        return (
            filters.startDate === monthRange.startDate &&
            filters.endDate === monthRange.endDate
        );
    };

    const isAllDatesActive = () => {
        return !filters.startDate && !filters.endDate;
    };

    // Funciones para filtros rápidos
    const setTodayFilter = () => {
        const todayRange = getTodayRange();
        setFilters({
            ...filters,
            startDate: todayRange.startDate,
            endDate: todayRange.endDate,
        });
    };

    const setCurrentMonthFilter = () => {
        const range = getCurrentMonthRange();
        setFilters({
            ...filters,
            startDate: range.startDate,
            endDate: range.endDate,
        });
    };

    const setCurrentWeekFilter = () => {
        const weekRange = getCurrentWeekRange();
        setFilters({
            ...filters,
            startDate: weekRange.startDate,
            endDate: weekRange.endDate,
        });
    };

    const clearDateFilters = () => {
        setFilters({
            ...filters,
            startDate: undefined,
            endDate: undefined,
        });
    };

    /**
     * Verifica si el rango coincide con un período predefinido
     */
    const matchesPredefinedRange = (
        start: string | undefined,
        end: string | undefined,
        range: { startDate: string; endDate: string }
    ): boolean => {
        return start === range.startDate && end === range.endDate;
    };

    /**
     * Formatea el rango de fechas para mostrar en la UI
     */
    const getDateRangeText = (): string => {
        const { startDate, endDate } = filters;

        // Sin filtros de fecha
        if (!startDate && !endDate) {
            return 'Mostrando todas las ventas';
        }

        // Verificar rangos predefinidos
        if (matchesPredefinedRange(startDate, endDate, getTodayRange())) {
            return `Mostrando ventas de hoy (${formatDateForDisplay(startDate!)})`;
        }

        if (matchesPredefinedRange(startDate, endDate, getCurrentWeekRange())) {
            return `Mostrando ventas de esta semana (${formatDateForDisplay(startDate!)} - ${formatDateForDisplay(endDate!)})`;
        }

        if (matchesPredefinedRange(startDate, endDate, getCurrentMonthRange())) {
            return `Mostrando ventas del mes actual (${formatDateForDisplay(startDate!)} - ${formatDateForDisplay(endDate!)})`;
        }

        // Rango personalizado
        if (startDate && endDate) {
            return startDate === endDate
                ? `Mostrando ventas del ${formatDateForDisplay(startDate)}`
                : `Mostrando ventas del ${formatDateForDisplay(startDate)} al ${formatDateForDisplay(endDate)}`;
        }

        // Solo fecha inicio o solo fecha fin
        if (startDate) {
            return `Mostrando ventas desde el ${formatDateForDisplay(startDate)}`;
        }

        return `Mostrando ventas hasta el ${formatDateForDisplay(endDate!)}`;
    };

    return (
        <div className="space-y-4 xl:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <h1 className="text-xl xl:text-2xl font-bold tracking-tight text-foreground">
                        Ventas
                    </h1>
                    <p className="text-sm xl:text-base text-muted-foreground">
                        Punto de venta y registro de ventas
                    </p>
                </div>
                <div className="w-full xl:w-auto">
                    <Button
                        size="default"
                        className="shadow-lg w-full xl:w-auto"
                        onClick={openCreateModal}
                    >
                        <Plus className="mr-2 h-4 w-4 xl:h-5 xl:w-5" />
                        Nueva Venta
                    </Button>

                    <Dialog
                        open={isCreateOpen}
                        onOpenChange={(open) => {
                            setIsCreateOpen(open);
                            if (!open) {
                                setResumingSale(null); // Limpiar al cerrar
                                setDismissedModalCashAlert(false);
                            }
                        }}
                    >
                        <DialogContent className="max-w-[98vw] w-full h-[95vh] overflow-hidden p-0 gap-0">
                            {/* Alerta de caja del día anterior dentro del modal */}
                            {!isCashStatusLoading &&
                                cashStatus?.hasOpenRegister &&
                                cashStatus?.isFromPreviousDay &&
                                !dismissedModalCashAlert && (
                                    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                                        <UnclosedCashAlertDialog
                                            onContinue={() => setDismissedModalCashAlert(true)}
                                            embedded={true}
                                            cashStatusData={cashStatus}
                                        />
                                    </div>
                                )}
                            <div className="flex-1 overflow-auto p-6">
                                <SaleForm
                                    onSubmit={handleCreate}
                                    onParkSale={() => setIsCreateOpen(false)}
                                    isLoading={createMutation.isPending}
                                    initialData={resumingSale?.data}
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Indicador de rango de fechas */}
            <div className="bg-muted/50 border rounded-lg px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                    {getDateRangeText()}
                </p>
            </div>

            {/* Estadísticas */}
            <SaleStatsCards
                startDate={filters.startDate}
                endDate={filters.endDate}
            />

            {/* Filtros */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filtros
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Filtros rápidos de fecha */}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant={isTodayActive() ? 'default' : 'outline'}
                                size="sm"
                                onClick={setTodayFilter}
                            >
                                Hoy
                            </Button>
                            <Button
                                variant={isCurrentWeekActive() ? 'default' : 'outline'}
                                size="sm"
                                onClick={setCurrentWeekFilter}
                            >
                                Esta Semana
                            </Button>
                            <Button
                                variant={isCurrentMonthActive() ? 'default' : 'outline'}
                                size="sm"
                                onClick={setCurrentMonthFilter}
                            >
                                Mes Actual
                            </Button>
                            <Button
                                variant={isAllDatesActive() ? 'default' : 'ghost'}
                                size="sm"
                                onClick={clearDateFilters}
                            >
                                Todas las Fechas
                            </Button>
                        </div>

                        {/* Filtros detallados */}
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.4fr)_repeat(4,minmax(9rem,1fr))_auto]">
                            {/* Búsqueda */}
                            <div className="min-w-0">
                                <Label className="text-xs text-muted-foreground">Buscar</Label>
                                <Input
                                    placeholder="Nº, cliente..."
                                    value={filters.search ?? ''}
                                    onChange={(e) =>
                                        handleFilterChange('search', e.target.value)
                                    }
                                />
                            </div>

                            {/* Estado */}
                            <div className="min-w-0">
                                <Label className="text-xs text-muted-foreground">Estado</Label>
                                <Select
                                    value={filters.status ?? '__all__'}
                                    onValueChange={(v) =>
                                        handleFilterChange(
                                            'status',
                                            v === '__all__' ? undefined : v
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">Todos</SelectItem>
                                        {Object.values(SaleStatus).map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {SaleStatusLabels[status]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Facturación */}
                            <div className="min-w-0">
                                <Label className="text-xs text-muted-foreground">Facturación</Label>
                                <Select
                                    value={filters.invoiceStatus ?? '__all__'}
                                    onValueChange={(v) =>
                                        handleFilterChange(
                                            'invoiceStatus',
                                            v === '__all__' ? undefined : v
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">Todas</SelectItem>
                                        {Object.values(InvoiceFilterStatus).map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {InvoiceFilterStatusLabels[status]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Fecha desde */}
                            <div className="min-w-0">
                                <Label className="text-xs text-muted-foreground">Desde</Label>
                                <Input
                                    type="date"
                                    value={filters.startDate ?? ''}
                                    onChange={(e) =>
                                        handleFilterChange('startDate', e.target.value)
                                    }
                                />
                            </div>

                            {/* Fecha hasta */}
                            <div className="min-w-0">
                                <Label className="text-xs text-muted-foreground">Hasta</Label>
                                <Input
                                    type="date"
                                    value={filters.endDate ?? ''}
                                    onChange={(e) =>
                                        handleFilterChange('endDate', e.target.value)
                                    }
                                />
                            </div>

                            {/* Limpiar filtros */}
                            {Object.values(filters).some((v) => v !== undefined) && (
                                <Button
                                    variant="outline"
                                    className="border-dashed hover:border-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    onClick={() => {
                                        const range = getCurrentMonthRange();
                                        setFilters({
                                            startDate: range.startDate,
                                            endDate: range.endDate,
                                        });
                                    }}
                                >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Restablecer
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de ventas */}
            <Card>
                <CardHeader>
                    <CardTitle>Listado de Ventas</CardTitle>
                </CardHeader>
                <CardContent>
                    <SaleList
                        filters={filters}
                        onView={handleView}
                        onDelete={handleDelete}
                        onCancel={handleCancel}
                        onPay={handlePay}
                        onResume={handleResumeParkedSale}
                    />
                </CardContent>
            </Card>

            {/* Dialog de detalle */}
            {viewingSale && (
                <SaleDetail
                    sale={viewingSale}
                    open={!!viewingSale}
                    onClose={() => setViewingSale(null)}
                />
            )}

            {/* Modal de confirmación de venta */}
            <SaleConfirmationModal
                sale={confirmedSale}
                open={!!confirmedSale}
                onClose={() => setConfirmedSale(null)}
            />

            {/* Alerta de caja del día anterior sin cerrar */}
            {!dismissedCashAlert && (
                <UnclosedCashAlertDialog
                    onContinue={() => setDismissedCashAlert(true)}
                />
            )}
        </div>
    );
}

