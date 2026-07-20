import { useState, useMemo, useCallback } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Tags, RefreshCw, Receipt, Repeat, X } from 'lucide-react';
import { useShortcutAction } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { FormDialog } from '@/components/ui/form-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ExpenseList,
    ExpenseForm,
    ExpenseStatsCards,
    ExpenseCategoryBreakdown,
} from '@/features/expenses/components';
import {
    expensesApi,
    expenseCategoriesApi,
} from '@/features/expenses/api/expenses.api';
import { Expense, ExpenseFilters, RecurringSuggestion } from '@/features/expenses/types';
import { ExpenseFormValues } from '@/features/expenses/schemas/expense.schema';
import {
    getCurrentMonthRange,
    getTodayRange,
    getCurrentWeekRange,
    formatDateForDisplay,
    getTodayLocal,
} from '@/lib/date-utils';
import { useOpenCashRegister } from '@/features/cash-register/hooks';
import { UnclosedCashAlertDialog } from '@/features/cash-register/components/UnclosedCashAlertDialog';

/**
 * Página principal de gestión de gastos
 */
export default function ExpensesPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryRecurring, setNewCategoryRecurring] = useState(false);
    // Estado para controlar si el usuario decidió continuar a pesar de la alerta de caja
    const [dismissedCashAlert, setDismissedCashAlert] = useState(false);

    // FIX 2.2: Prefill del form de creación desde sugerencia recurrente + dismissed state
    const [createPrefill, setCreatePrefill] = useState<Partial<ExpenseFormValues> | null>(null);
    const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);

    // Inicializar filtros con el mes actual por defecto
    const defaultMonthRange = useMemo(() => getCurrentMonthRange(), []);
    const [filters, setFilters] = useState<ExpenseFilters>({
        startDate: defaultMonthRange.startDate,
        endDate: defaultMonthRange.endDate,
    });

    const queryClient = useQueryClient();
    const confirm = useConfirm();

    // Estado de la caja actual (si hay caja abierta hoy)
    const { data: openRegister } = useOpenCashRegister();

    // Callback para abrir modal de nuevo gasto (usado por botón y atajo F2)
    const openCreateModal = useCallback(() => {
        if (!openRegister) {
            toast.error('La caja de hoy está cerrada. Abrí la caja para registrar gastos.');
            return;
        }
        setIsCreateOpen(true);
    }, [openRegister]);

    // Atajo de teclado F2 para nuevo gasto
    useShortcutAction('NEW_EXPENSE', openCreateModal);

    // Query para categorías
    const { data: categories } = useQuery({
        queryKey: ['expense-categories'],
        queryFn: expenseCategoriesApi.getAll,
    });

    // FIX 2.2: Query para sugerencias de gastos recurrentes del mes
    const { data: recurringSuggestions } = useQuery<RecurringSuggestion[]>({
        queryKey: ['expense-recurring-suggestions'],
        queryFn: expensesApi.getRecurringSuggestions,
        staleTime: 1000 * 60 * 5, // 5 minutos
    });

    // Mutaciones
    const createMutation = useMutation({
        mutationFn: expensesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
            // FIX 2.2: Refrescar sugerencias recurrentes al crear un gasto
            queryClient.invalidateQueries({ queryKey: ['expense-recurring-suggestions'] });
            // Invalidate cash register query to update movements immediately
            queryClient.invalidateQueries({ queryKey: ['cash-register', 'current'] });
            toast.success('Gasto registrado');
            setIsCreateOpen(false);
            setCreatePrefill(null);
        },
        onError: () => {
            toast.error('Error al registrar gasto');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: ExpenseFormValues }) =>
            expensesApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
            toast.success('Gasto actualizado');
            setEditingExpense(null);
        },
        onError: () => {
            toast.error('Error al actualizar gasto');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: expensesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
            toast.success('Gasto eliminado');
        },
        onError: () => {
            toast.error('Error al eliminar gasto');
        },
    });

    const createCategoryMutation = useMutation({
        mutationFn: expenseCategoriesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            toast.success('Categoría creada');
            setNewCategoryName('');
            setNewCategoryRecurring(false);
        },
        onError: () => {
            toast.error('Error al crear categoría');
        },
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: expenseCategoriesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            toast.success('Categoría eliminada');
        },
        onError: () => {
            toast.error('Error al eliminar categoría');
        },
    });

    const seedCategoriesMutation = useMutation({
        mutationFn: expenseCategoriesApi.seed,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            toast.success(`${data.created} categorías inicializadas`);
        },
        onError: () => {
            toast.error('Error al inicializar categorías');
        },
    });

    // Handlers
    const handleCreate = (data: ExpenseFormValues) => {
        createMutation.mutate(data);
    };

    const handleUpdate = (data: ExpenseFormValues) => {
        if (editingExpense) {
            updateMutation.mutate({ id: editingExpense.id, data });
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Eliminar gasto',
            description: '¿Estás seguro de eliminar este gasto?',
            variant: 'danger',
            confirmLabel: 'Eliminar',
        });
        if (confirmed) {
            deleteMutation.mutate(id);
        }
    };

    const handleCreateCategory = () => {
        if (!newCategoryName.trim()) {
            toast.error('Ingresá un nombre para la categoría');
            return;
        }
        createCategoryMutation.mutate({
            name: newCategoryName.trim(),
            isRecurring: newCategoryRecurring,
        });
    };

    const handleFilterChange = (key: keyof ExpenseFilters, value: string | boolean | undefined) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value === '' ? undefined : value,
        }));
    };

    // Funciones helper para obtener fechas de cada período (usando utilidades centralizadas)

    // Funciones para detectar qué filtro está activo
    const isTodayActive = () => {
        const todayRange = getTodayRange();
        return filters.startDate === todayRange.startDate &&
            filters.endDate === todayRange.endDate;
    };

    const isCurrentWeekActive = () => {
        const weekRange = getCurrentWeekRange();
        return filters.startDate === weekRange.startDate &&
            filters.endDate === weekRange.endDate;
    };

    const isCurrentMonthActive = () => {
        const monthRange = getCurrentMonthRange();
        return filters.startDate === monthRange.startDate &&
            filters.endDate === monthRange.endDate;
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
            return 'Mostrando todos los gastos';
        }

        const todayRange = getTodayRange();
        const weekRange = getCurrentWeekRange();
        const monthRange = getCurrentMonthRange();

        // Verificar si es "Hoy"
        if (
            filters.startDate === todayRange.startDate &&
            filters.endDate === todayRange.endDate
        ) {
            return `Mostrando gastos de hoy (${formatDateForDisplay(filters.startDate)})`;
        }

        // Verificar si es "Esta Semana"
        if (
            filters.startDate === weekRange.startDate &&
            filters.endDate === weekRange.endDate
        ) {
            return `Mostrando gastos de esta semana (${formatDateForDisplay(filters.startDate)} - ${formatDateForDisplay(filters.endDate)})`;
        }

        // Verificar si es "Mes Actual"
        if (
            filters.startDate === monthRange.startDate &&
            filters.endDate === monthRange.endDate
        ) {
            return `Mostrando gastos del mes actual (${formatDateForDisplay(filters.startDate)} - ${formatDateForDisplay(filters.endDate)})`;
        }

        // Rango personalizado
        if (filters.startDate && filters.endDate) {
            if (filters.startDate === filters.endDate) {
                return `Mostrando gastos del ${formatDateForDisplay(filters.startDate)}`;
            }
            return `Mostrando gastos del ${formatDateForDisplay(filters.startDate)} al ${formatDateForDisplay(filters.endDate)}`;
        }

        // Solo fecha de inicio
        if (filters.startDate && !filters.endDate) {
            return `Mostrando gastos desde el ${formatDateForDisplay(filters.startDate)}`;
        }

        // Solo fecha de fin
        if (!filters.startDate && filters.endDate) {
            return `Mostrando gastos hasta el ${formatDateForDisplay(filters.endDate)}`;
        }

        return 'Mostrando todos los gastos';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Gastos</h1>
                    <p className="text-muted-foreground">
                        Registra y controla los gastos operativos del negocio
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* Botón Categorías */}
                    <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Tags className="mr-2 h-4 w-4" />
                                Categorías
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[450px]">
                            <DialogHeader>
                                <DialogTitle>Categorías de Gastos</DialogTitle>
                                <DialogDescription>
                                    Organiza tus gastos por categorías
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                {/* Inicializar categorías por defecto */}
                                {(!categories || categories.length === 0) && (
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => seedCategoriesMutation.mutate()}
                                        disabled={seedCategoriesMutation.isPending}
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Inicializar Categorías por Defecto
                                    </Button>
                                )}

                                {/* Lista de categorías */}
                                <div className="space-y-2">
                                    <Label>Categorías actuales</Label>
                                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                                        {categories && categories.length > 0 ? (
                                            categories.map((cat) => (
                                                <Badge
                                                    key={cat.id}
                                                    variant="secondary"
                                                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground flex items-center gap-1"
                                                    onClick={async () => {
                                                        const confirmed = await confirm({
                                                            title: 'Eliminar categoría',
                                                            description: `¿Estás seguro de eliminar "${cat.name}"?`,
                                                            variant: 'danger',
                                                            confirmLabel: 'Eliminar',
                                                        });
                                                        if (confirmed) {
                                                            deleteCategoryMutation.mutate(cat.id);
                                                        }
                                                    }}
                                                    title="Click para eliminar"
                                                >
                                                    {cat.name}
                                                    {cat.isRecurring && (
                                                        <RefreshCw className="h-3 w-3 ml-1" />
                                                    )}
                                                    <span className="ml-1">×</span>
                                                </Badge>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                No hay categorías creadas
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Crear nueva categoría */}
                                <div className="space-y-3 pt-4 border-t">
                                    <Label>Nueva categoría</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Ej: Servicios"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleCreateCategory();
                                            }}
                                        />
                                        <Button
                                            onClick={handleCreateCategory}
                                            disabled={createCategoryMutation.isPending}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="recurring"
                                            checked={newCategoryRecurring}
                                            onCheckedChange={(checked) =>
                                                setNewCategoryRecurring(checked === true)
                                            }
                                        />
                                        <label
                                            htmlFor="recurring"
                                            className="text-sm text-muted-foreground"
                                        >
                                            Es categoría de gastos recurrentes
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Botón Nuevo Gasto (valida caja antes de abrir) */}
                    <div>
                        <Button onClick={openCreateModal}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Gasto
                        </Button>

                        <FormDialog
                            open={isCreateOpen}
                            onOpenChange={(open) => {
                                setIsCreateOpen(open);
                                if (!open) setCreatePrefill(null);
                            }}
                            title={createPrefill ? `Registrar Gasto (${createPrefill.description ?? 'recurrente'})` : 'Registrar Gasto'}
                            description="Completa los datos del nuevo gasto"
                            icon={Receipt}
                            variant="danger"
                            maxWidth="md"
                        >
                            <ExpenseForm
                                onSubmit={handleCreate}
                                isLoading={createMutation.isPending}
                                initialData={createPrefill ?? undefined}
                            />
                        </FormDialog>
                    </div>
                </div>
            </div>

            {/* Indicador de rango de fechas */}
            <div className="bg-muted/50 border rounded-lg px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                    {getDateRangeText()}
                </p>
            </div>

            {/* FIX 2.2: Banner de sugerencias de gastos recurrentes */}
            {recurringSuggestions && recurringSuggestions.length > 0 && (
                <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-blue-500/10 rounded-md">
                            <Repeat className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">
                                Gastos recurrentes pendientes este mes
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Tocá "Crear" para registrar con los datos del último mes.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDismissedSuggestions(recurringSuggestions.map(s => s.categoryId))}
                            title="Descartar todas las sugerencias"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {recurringSuggestions
                            .filter(s => !dismissedSuggestions.includes(s.categoryId))
                            .map((suggestion) => (
                                <div
                                    key={suggestion.categoryId}
                                    className="bg-background border rounded-md p-3 flex items-center justify-between gap-2"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-sm truncate">{suggestion.categoryName}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {suggestion.lastExpense.description} · {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(suggestion.lastExpense.amount)}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setCreatePrefill({
                                                description: suggestion.lastExpense.description,
                                                amount: suggestion.lastExpense.amount,
                                                categoryId: suggestion.categoryId,
                                                paymentMethodId: suggestion.lastExpense.paymentMethodId ?? undefined,
                                                receiptNumber: suggestion.lastExpense.receiptNumber ?? '',
                                                notes: suggestion.lastExpense.notes ?? '',
                                                isPaid: true,
                                                expenseDate: getTodayLocal(),
                                            });
                                            setIsCreateOpen(true);
                                        }}
                                    >
                                        Crear
                                    </Button>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Estadísticas */}
            <ExpenseStatsCards
                startDate={filters.startDate}
                endDate={filters.endDate}
            />

            {/* Filtros */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Filtros rápidos de fecha */}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant={isTodayActive() ? "default" : "outline"}
                                size="sm"
                                onClick={setTodayFilter}
                            >
                                Hoy
                            </Button>
                            <Button
                                variant={isCurrentWeekActive() ? "default" : "outline"}
                                size="sm"
                                onClick={setCurrentWeekFilter}
                            >
                                Esta Semana
                            </Button>
                            <Button
                                variant={isCurrentMonthActive() ? "default" : "outline"}
                                size="sm"
                                onClick={setCurrentMonthFilter}
                            >
                                Mes Actual
                            </Button>
                            <Button
                                variant={isAllDatesActive() ? "default" : "ghost"}
                                size="sm"
                                onClick={clearDateFilters}
                            >
                                Todas las Fechas
                            </Button>
                        </div>

                        {/* Filtros detallados */}
                        <div className="flex flex-wrap gap-4">
                            {/* Categoría */}
                            <div className="w-48">
                                <Label className="text-xs text-muted-foreground">Categoría</Label>
                                <Select
                                    value={filters.categoryId ?? '__all__'}
                                    onValueChange={(v) => handleFilterChange('categoryId', v === '__all__' ? undefined : v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">Todas</SelectItem>
                                        {categories?.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Fecha desde */}
                            <div className="w-40">
                                <Label className="text-xs text-muted-foreground">Desde</Label>
                                <Input
                                    type="date"
                                    value={filters.startDate ?? ''}
                                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                />
                            </div>

                            {/* Fecha hasta */}
                            <div className="w-40">
                                <Label className="text-xs text-muted-foreground">Hasta</Label>
                                <Input
                                    type="date"
                                    value={filters.endDate ?? ''}
                                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                />
                            </div>

                            {/* Estado */}
                            <div className="w-32">
                                <Label className="text-xs text-muted-foreground">Estado</Label>
                                <Select
                                    value={filters.isPaid === undefined ? '__all__' : String(filters.isPaid)}
                                    onValueChange={(v) =>
                                        handleFilterChange('isPaid', v === '__all__' ? undefined : v === 'true')
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__all__">Todos</SelectItem>
                                        <SelectItem value="true">Pagados</SelectItem>
                                        <SelectItem value="false">Pendientes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Limpiar todos los filtros */}
                            {Object.values(filters).some((v) => v !== undefined) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="self-end"
                                    onClick={() => {
                                        const range = getCurrentMonthRange();
                                        setFilters({
                                            startDate: range.startDate,
                                            endDate: range.endDate,
                                        });
                                    }}
                                >
                                    Restablecer
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Contenido principal: Lista + Desglose */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Lista de gastos */}
                <div className="lg:col-span-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Listado de Gastos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ExpenseList
                                filters={filters}
                                onEdit={setEditingExpense}
                                onDelete={handleDelete}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Desglose por categoría */}
                <div className="lg:col-span-1">
                    <ExpenseCategoryBreakdown
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                    />
                </div>
            </div>

            {/* Dialog para editar */}
            <FormDialog
                open={!!editingExpense}
                onOpenChange={(open) => !open && setEditingExpense(null)}
                title="Editar Gasto"
                description="Modifica los datos del gasto"
                icon={Receipt}
                variant="danger"
                maxWidth="md"
            >
                {editingExpense ? (
                    <ExpenseForm
                        initialData={{
                            description: editingExpense.description,
                            amount: editingExpense.amount,
                            expenseDate: editingExpense.expenseDate.split('T')[0],
                            categoryId: editingExpense.categoryId ?? undefined,
                            paymentMethodId: editingExpense.paymentMethodId ?? editingExpense.paymentMethod?.id,
                            receiptNumber: editingExpense.receiptNumber ?? '',
                            isPaid: editingExpense.isPaid,
                            notes: editingExpense.notes ?? '',
                        }}
                        onSubmit={handleUpdate}
                        isLoading={updateMutation.isPending}
                        isEditing
                    />
                ) : null}
            </FormDialog>

            {/* Alerta de caja del día anterior sin cerrar */}
            {!dismissedCashAlert && (
                <UnclosedCashAlertDialog
                    onContinue={() => setDismissedCashAlert(true)}
                />
            )}
        </div>
    );
}

