/**
 * Página de Compras
 * Gestión completa de compras a proveedores con integración a inventario y gastos
 */
import { useState, useMemo, useCallback } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Filter, Package, RotateCcw, ShoppingCart } from 'lucide-react';
import { useShortcutAction } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormDialog } from '@/components/ui/form-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ProductSearch } from '@/components/common/ProductSearch';
import {
    PurchaseList,
    PurchaseForm,
    PurchaseStatsCards,
    PurchaseDetail,
    MarkAsPaidDialog,
} from '@/features/purchases/components';
import { purchasesApi } from '@/features/purchases/api/purchases.api';
import {
    Purchase,
    PurchaseFilters,
    PurchaseStatus,
    PurchaseStatusLabels,
} from '@/features/purchases/types';
import { useOpenCashRegister } from '@/features/cash-register/hooks';
import { UnclosedCashAlertDialog } from '@/features/cash-register/components/UnclosedCashAlertDialog';
import { CreatePurchaseFormValues } from '@/features/purchases/schemas/purchase.schema';
import {
    getCurrentMonthRange,
    getTodayRange,
    getCurrentWeekRange,
    formatDateForDisplay,
} from '@/lib/date-utils';

/**
 * Página principal de gestión de compras
 */
export default function PurchasesPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
    const [purchaseToMarkPaid, setPurchaseToMarkPaid] = useState<Purchase | null>(null);
    // Estado para controlar si el usuario decidió continuar a pesar de la alerta de caja
    const [dismissedCashAlert, setDismissedCashAlert] = useState(false);

    // Inicializar filtros con el mes actual por defecto
    const defaultMonthRange = useMemo(() => getCurrentMonthRange(), []);
    const [filters, setFilters] = useState<PurchaseFilters>({
        startDate: defaultMonthRange.startDate,
        endDate: defaultMonthRange.endDate,
    });

    const queryClient = useQueryClient();
    const confirm = useConfirm();

    // Estado de la caja actual (si hay caja abierta hoy)
    const { data: openRegister } = useOpenCashRegister();

    const openCreateModal = useCallback(() => {
        setIsCreateOpen(true);
    }, []);

    // Atajo de teclado F3 para nueva compra
    useShortcutAction('NEW_PURCHASE', openCreateModal);

    // Mutaciones
    const createMutation = useMutation({
        mutationFn: purchasesApi.create,
        // Creating expenses from purchases removed
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchases'] });
            queryClient.invalidateQueries({ queryKey: ['purchase-stats'] });
            toast.success('Compra registrada');
            setIsCreateOpen(false);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Error al registrar compra');
        },
    });

    const payMutation = useMutation({
        mutationFn: ({ id, paymentMethodId }: { id: string; paymentMethodId: string }) =>
            purchasesApi.markAsPaid(id, paymentMethodId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchases'] });
            queryClient.invalidateQueries({ queryKey: ['purchase-stats'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['cashRegister'] });
            toast.success('Compra marcada como pagada e inventario actualizado');
            setPurchaseToMarkPaid(null);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Error al pagar compra');
        },
    });

    // Creating expenses from purchases removed

    const deleteMutation = useMutation({
        mutationFn: purchasesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchases'] });
            queryClient.invalidateQueries({ queryKey: ['purchase-stats'] });
            toast.success('Compra eliminada');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Error al eliminar compra');
        },
    });

    // Handlers
    const handleCreate = (data: CreatePurchaseFormValues) => {
        createMutation.mutate(data as any);
    };

    const handleView = (purchase: Purchase) => {
        setViewingPurchase(purchase);
    };

    const handlePay = (purchase: Purchase) => {
        setPurchaseToMarkPaid(purchase);
    };

    const handleConfirmPay = (purchaseId: string, paymentMethodId: string) => {
        payMutation.mutate({ id: purchaseId, paymentMethodId });
    };

    // Creating expenses from purchases removed

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Eliminar compra',
            description: '¿Eliminar esta compra? Esta acción no se puede deshacer.',
            variant: 'danger',
            confirmLabel: 'Eliminar',
        });
        if (confirmed) {
            deleteMutation.mutate(id);
        }
    };

    const handleFilterChange = (
        key: keyof PurchaseFilters,
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
     * Formatea el rango de fechas para mostrar en la UI
     */
    const getDateRangeText = (): string => {
        if (!filters.startDate && !filters.endDate) {
            return 'Mostrando todas las compras';
        }

        const todayRange = getTodayRange();
        const weekRange = getCurrentWeekRange();
        const monthRange = getCurrentMonthRange();

        // Verificar si es "Hoy"
        if (
            filters.startDate === todayRange.startDate &&
            filters.endDate === todayRange.endDate
        ) {
            return `Mostrando compras de hoy (${formatDateForDisplay(filters.startDate)})`;
        }

        // Verificar si es "Esta Semana"
        if (
            filters.startDate === weekRange.startDate &&
            filters.endDate === weekRange.endDate
        ) {
            return `Mostrando compras de esta semana (${formatDateForDisplay(filters.startDate)} - ${formatDateForDisplay(filters.endDate)})`;
        }

        // Verificar si es "Mes Actual"
        if (
            filters.startDate === monthRange.startDate &&
            filters.endDate === monthRange.endDate
        ) {
            return `Mostrando compras del mes actual (${formatDateForDisplay(filters.startDate)} - ${formatDateForDisplay(filters.endDate)})`;
        }

        // Rango personalizado
        if (filters.startDate && filters.endDate) {
            if (filters.startDate === filters.endDate) {
                return `Mostrando compras del ${formatDateForDisplay(filters.startDate)}`;
            }
            return `Mostrando compras del ${formatDateForDisplay(filters.startDate)} al ${formatDateForDisplay(filters.endDate)}`;
        }

        // Solo fecha de inicio
        if (filters.startDate && !filters.endDate) {
            return `Mostrando compras desde el ${formatDateForDisplay(filters.startDate)}`;
        }

        // Solo fecha de fin
        if (!filters.startDate && filters.endDate) {
            return `Mostrando compras hasta el ${formatDateForDisplay(filters.endDate)}`;
        }

        return 'Mostrando todas las compras';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Compras</h1>
                    <p className="text-muted-foreground">
                        Registra compras a proveedores y actualiza automáticamente el stock
                    </p>
                </div>
                {/* Botón que verifica si la caja está abierta antes de abrir el modal */}
                <div>
                    <Button onClick={openCreateModal}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Compra
                    </Button>

                    <FormDialog
                        open={isCreateOpen}
                        onOpenChange={setIsCreateOpen}
                        title="Registrar Compra"
                        description="Completa los datos de la compra. El stock se actualizará al marcar como pagada."
                        icon={ShoppingCart}
                        variant="warning"
                        maxWidth="2xl"
                    >
                        <div className="max-h-[60vh] overflow-y-auto pr-2">
                            <PurchaseForm
                                onSubmit={handleCreate}
                                isLoading={createMutation.isPending}
                            />
                        </div>
                    </FormDialog>
                </div>
            </div>

            {/* Indicador de rango de fechas */}
            <div className="bg-muted/50 border rounded-lg px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                    {getDateRangeText()}
                </p>
            </div>

            {/* Estadísticas */}
            <PurchaseStatsCards
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
                        <div className="flex flex-wrap items-end gap-4">
                            {/* Búsqueda */}
                            <div className="w-56">
                                <Label className="text-xs text-muted-foreground">Buscar</Label>
                                <Input
                                    placeholder="Nº, proveedor, factura..."
                                    value={filters.search ?? ''}
                                    onChange={(e) =>
                                        handleFilterChange('search', e.target.value)
                                    }
                                />
                            </div>

                            {/* Estado */}
                            <div className="w-36">
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
                                        {Object.values(PurchaseStatus).map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {PurchaseStatusLabels[status]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Fecha desde */}
                            <div className="w-36">
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
                            <div className="w-36">
                                <Label className="text-xs text-muted-foreground">Hasta</Label>
                                <Input
                                    type="date"
                                    value={filters.endDate ?? ''}
                                    onChange={(e) =>
                                        handleFilterChange('endDate', e.target.value)
                                    }
                                />
                            </div>

                            {/* Filtro por producto - Buscador */}
                            <div className="w-56">
                                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Package className="h-3 w-3" />
                                    <p>Producto incluido</p>
                                </Label>
                                <ProductSearch
                                    value={filters.productId}
                                    onSelect={(productId) => {
                                        handleFilterChange('productId', productId);
                                    }}
                                    onClear={() => {
                                        handleFilterChange('productId', undefined);
                                    }}
                                    placeholder="Buscar producto..."
                                    showStock
                                    showSKU
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

            {/* Lista de compras */}
            <Card>
                <CardHeader>
                    <CardTitle>Listado de Compras</CardTitle>
                </CardHeader>
                <CardContent>
                    <PurchaseList
                        filters={filters}
                        onView={handleView}
                        onDelete={handleDelete}
                        onPay={handlePay}
                    />
                </CardContent>
            </Card>

            {/* Dialog de detalle */}
            {viewingPurchase && (
                <PurchaseDetail
                    purchase={viewingPurchase}
                    open={!!viewingPurchase}
                    onClose={() => setViewingPurchase(null)}
                />
            )}

            {/* Dialog de marcar como pagado */}
            <MarkAsPaidDialog
                purchase={purchaseToMarkPaid}
                open={!!purchaseToMarkPaid}
                onClose={() => setPurchaseToMarkPaid(null)}
                onConfirm={handleConfirmPay}
                isLoading={payMutation.isPending}
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

