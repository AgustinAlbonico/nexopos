/**
 * Formulario para crear/editar gastos
 */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { expenseSchema, ExpenseFormValues } from '../schemas/expense.schema';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { getTodayLocal } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseCategoriesApi } from '../api/expenses.api';
import { PaymentMethodSelect } from '@/components/shared/PaymentMethodSelect';
import { toast } from 'sonner';

interface ExpenseFormProps {
    readonly initialData?: Partial<ExpenseFormValues>;
    readonly onSubmit: (data: ExpenseFormValues) => void;
    readonly isLoading?: boolean;
    readonly isEditing?: boolean;
}

/**
 * Componente de formulario para crear o editar un gasto
 */
export function ExpenseForm({
    initialData,
    onSubmit,
    isLoading,
    isEditing,
}: ExpenseFormProps) {
    const queryClient = useQueryClient();
    const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDescription, setNewCategoryDescription] = useState('');

    // Obtener categorías
    const { data: categories, isLoading: loadingCategories } = useQuery({
        queryKey: ['expense-categories'],
        queryFn: expenseCategoriesApi.getAll,
    });

    const createCategoryMutation = useMutation({
        mutationFn: (data: { name: string; description?: string }) =>
            expenseCategoriesApi.create(data),
        onSuccess: (newCategory) => {
            queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            form.setValue('categoryId', newCategory.id, { shouldDirty: true, shouldValidate: true });
            toast.success(`Categoría "${newCategory.name}" creada`);
            setIsCreateCategoryOpen(false);
            setNewCategoryName('');
            setNewCategoryDescription('');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Error al crear categoría');
        },
    });

    const handleCreateCategory = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = newCategoryName.trim();
        if (!trimmed) {
            toast.error('Ingresá un nombre para la categoría');
            return;
        }
        createCategoryMutation.mutate({
            name: trimmed,
            description: newCategoryDescription.trim() || undefined,
        });
    };

    // Los métodos de pago ahora se manejan en PaymentMethodSelect

    // Fecha de hoy en formato YYYY-MM-DD (usando zona horaria local)
    const today = getTodayLocal();

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            description: initialData?.description ?? '',
            amount: initialData?.amount ?? 0,
            expenseDate: initialData?.expenseDate ?? today,
            categoryId: initialData?.categoryId ?? undefined,
            paymentMethodId: initialData?.paymentMethodId,
            receiptNumber: initialData?.receiptNumber ?? '',
            isPaid: initialData?.isPaid ?? true,
            notes: initialData?.notes ?? '',
        },
    });

    const isPaid = form.watch('isPaid');

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Descripción */}
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descripción <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Ej: Pago de alquiler mes de noviembre"
                                    {...field}
                                    autoFocus
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Categoría */}
                <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Categoría</FormLabel>
                            <div className="flex gap-2">
                                <Select
                                    onValueChange={(value) => field.onChange(value === '__none__' ? undefined : value)}
                                    value={field.value ?? '__none__'}
                                    disabled={loadingCategories}
                                >
                                    <FormControl>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Sin categoría (opcional)" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="__none__">Sin categoría</SelectItem>
                                        {categories?.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setIsCreateCategoryOpen(true)}
                                    title="Crear nueva categoría"
                                    aria-label="Crear nueva categoría"
                                    className="shrink-0"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <FormDescription>Opcional - Organiza tus gastos por categorías</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Monto y Fecha */}
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Monto <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <NumericInput
                                        placeholder="0.00"
                                        value={field.value}
                                        onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number.parseFloat(e.target.value) || 0)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="expenseDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fecha <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Método de pago - Componente compartido */}
                <FormField
                    control={form.control}
                    name="paymentMethodId"
                    render={({ field }) => (
                        <PaymentMethodSelect
                            value={field.value}
                            onChange={field.onChange}
                            label="Método de pago"
                            required={isPaid}
                            disabled={!isPaid}
                            variant="select"
                        />
                    )}
                />

                {/* Nro. Comprobante */}
                <FormField
                    control={form.control}
                    name="receiptNumber"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nro. Comprobante</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Ej: FAC-001234"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>Opcional</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Notas */}
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notas</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Notas adicionales..."
                                    className="resize-none"
                                    rows={2}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Checkbox: Pagado */}
                <FormField
                    control={form.control}
                    name="isPaid"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>Pagado</FormLabel>
                                <FormDescription>
                                    El gasto ya fue pagado
                                </FormDescription>
                            </div>
                        </FormItem>
                    )}
                />

                {/* Indicador de estado pendiente */}
                {!isPaid && (
                    <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-3">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            ⚠️ Este gasto quedará como <strong>pendiente de pago</strong>
                        </p>
                    </div>
                )}

                <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isEditing ? 'Actualizar Gasto' : 'Registrar Gasto'}
                </Button>
            </form>

            {/* Modal para crear categoría de gastos rápida */}
            <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Nueva Categoría de Gastos</DialogTitle>
                        <DialogDescription>
                            Creá una categoría para clasificar y organizar los egresos del negocio.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="quickExpenseCatName">
                                Nombre <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="quickExpenseCatName"
                                placeholder="Ej: Alquiler, Servicios, Mantenimiento..."
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCreateCategory();
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quickExpenseCatDesc">Descripción (opcional)</Label>
                            <Input
                                id="quickExpenseCatDesc"
                                placeholder="Detalle o uso de la categoría..."
                                value={newCategoryDescription}
                                onChange={(e) => setNewCategoryDescription(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCreateCategory();
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsCreateCategoryOpen(false);
                                setNewCategoryName('');
                                setNewCategoryDescription('');
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleCreateCategory()}
                            disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
                        >
                            {createCategoryMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Crear Categoría
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Form>
    );
}

