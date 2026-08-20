/**
 * Formulario para crear/editar ingresos
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { incomeSchema, IncomeFormValues } from '../schemas/income.schema';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
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
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { CustomerSearch } from '@/components/common/CustomerSearch';
import { CustomerForm } from '@/features/customers/components/CustomerForm';
import { CustomerFormValues } from '@/features/customers/schemas/customer.schema';
import { incomeCategoriesApi } from '../api/incomes.api';
import { customersApi } from '@/features/customers/api/customers.api';
import { Customer } from '@/features/customers/types';
import { Loader2, UserPlus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentMethodSelect } from '@/components/shared/PaymentMethodSelect';
import { IvaCondition } from '@/types/iva-condition';

interface IncomeFormProps {
    readonly initialData?: Partial<IncomeFormValues>;
    readonly onSubmit: (data: IncomeFormValues) => void;
    readonly isLoading?: boolean;
    readonly isEditing?: boolean;
}

/**
 * Componente de formulario para crear o editar un ingreso
 */
export function IncomeForm({
    initialData,
    onSubmit,
    isLoading,
    isEditing,
}: IncomeFormProps) {
    // Estado para el diálogo de crear cliente
    const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
    const [_selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    void _selectedCustomer; // Se usa para actualización del estado

    // Estado para el diálogo de crear categoría
    const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDescription, setNewCategoryDescription] = useState('');

    const queryClient = useQueryClient();

    const form = useForm<IncomeFormValues>({
        resolver: zodResolver(incomeSchema),
        defaultValues: {
            description: initialData?.description ?? '',
            amount: initialData?.amount ?? 0,
            incomeDate: initialData?.incomeDate ?? new Date().toISOString().split('T')[0],
            categoryId: initialData?.categoryId,
            customerId: initialData?.customerId,
            customerName: initialData?.customerName ?? '',
            isOnAccount: initialData?.isOnAccount ?? false,
            paymentMethodId: initialData?.paymentMethodId,
            receiptNumber: initialData?.receiptNumber ?? '',
            isPaid: initialData?.isPaid ?? true,
            notes: initialData?.notes ?? '',
        },
    });

    // Query para categorías
    const { data: categories = [] } = useQuery({
        queryKey: ['income-categories'],
        queryFn: incomeCategoriesApi.getAll,
    });

    // Los métodos de pago ahora se manejan en PaymentMethodSelect

    // Mutación para crear cliente
    const createCustomerMutation = useMutation({
        mutationFn: customersApi.create,
        onSuccess: (newCustomer) => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Cliente creado exitosamente');
            setCreateCustomerOpen(false);
            handleCustomerSelect(newCustomer.id, newCustomer);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Error al crear cliente');
        },
    });

    // Mutación para crear categoría de ingreso
    const createCategoryMutation = useMutation({
        mutationFn: (data: { name: string; description?: string }) =>
            incomeCategoriesApi.create(data),
        onSuccess: (newCat) => {
            queryClient.invalidateQueries({ queryKey: ['income-categories'] });
            form.setValue('categoryId', newCat.id, { shouldDirty: true, shouldValidate: true });
            toast.success(`Categoría "${newCat.name}" creada`);
            setCreateCategoryOpen(false);
            setNewCategoryName('');
            setNewCategoryDescription('');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Error al crear categoría');
        },
    });

    const handleCreateIncomeCategory = (e?: React.FormEvent) => {
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

    const isOnAccount = form.watch('isOnAccount');
    const selectedCustomerId = form.watch('customerId');

    // Handlers para el selector de cliente
    const handleCustomerSelect = (customerId: string, customer: Customer) => {
        form.setValue('customerId', customerId);
        form.setValue('customerName', `${customer.firstName} ${customer.lastName}`);
        setSelectedCustomer(customer);
    };

    const handleCustomerClear = () => {
        form.setValue('customerId', undefined);
        form.setValue('customerName', '');
        form.setValue('isOnAccount', false);
        setSelectedCustomer(null);
    };

    const handleOpenCreateCustomer = () => {
        setCreateCustomerOpen(true);
    };

    const handleCreateCustomer = (data: CustomerFormValues) => {
        const cleanData = {
            ...data,
            documentType: data.documentType || undefined,
        };
        createCustomerMutation.mutate(cleanData as any);
    };

    const handleSubmit = (data: IncomeFormValues) => {
        // Si es a cuenta corriente, quitar método de pago
        if (data.isOnAccount) {
            data.paymentMethodId = undefined;
            data.isPaid = false;
        }
        onSubmit(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {/* Fila 1: Descripción del servicio (ocupa todo el ancho) */}
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descripción del Servicio *</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Ej: Servicio de consultoría - Diciembre"
                                    {...field}
                                    autoFocus
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Fila 2: Monto, Fecha, Categoría (vertical) */}
                <div className="flex flex-col gap-4">
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Monto *</FormLabel>
                                <FormControl>
                                    <NumericInput
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="0.00"
                                        min={0}
                                        allowDecimals
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="incomeDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fecha *</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Categoría</FormLabel>
                                <div className="flex gap-2">
                                    <Select
                                        onValueChange={(v) => field.onChange(v === '__none__' ? undefined : v)}
                                        value={field.value ?? '__none__'}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Sin categoría" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="__none__">Sin categoría</SelectItem>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setCreateCategoryOpen(true)}
                                        title="Crear nueva categoría"
                                        aria-label="Crear nueva categoría"
                                        className="shrink-0"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Fila 3: Cliente y Cuenta Corriente (2 columnas) */}
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="customerId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cliente</FormLabel>
                                <FormControl>
                                    <CustomerSearch
                                        value={field.value}
                                        onSelect={handleCustomerSelect}
                                        onClear={handleCustomerClear}
                                        placeholder="Consumidor Final"
                                        allowCreate
                                        onCreateClick={handleOpenCreateCustomer}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Cuenta Corriente (solo si hay cliente) */}
                    {selectedCustomerId ? (
                        <FormField
                            control={form.control}
                            name="isOnAccount"
                            render={({ field }) => (
                                <FormItem className="flex items-end">
                                    <Card
                                        className={`w-full cursor-pointer transition-colors ${field.value
                                            ? 'border-primary bg-primary/5'
                                            : 'hover:border-muted-foreground/50'
                                            }`}
                                        onClick={() => field.onChange(!field.value)}
                                    >
                                        <CardContent className="flex items-center gap-3 p-3">
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                            <div>
                                                <p className="font-medium text-sm">Cuenta Corriente</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Registrar como cargo en cuenta del cliente
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </FormItem>
                            )}
                        />
                    ) : (
                        <div /> /* Placeholder para mantener la grilla */
                    )}
                </div>

                {/* Método de Pago (solo si NO es a cuenta corriente) - Componente compartido */}
                {!isOnAccount && (
                    <FormField
                        control={form.control}
                        name="paymentMethodId"
                        render={({ field }) => (
                            <PaymentMethodSelect
                                value={field.value}
                                onChange={field.onChange}
                                label="Método de Pago"
                                required={true}
                                variant="select"
                            />
                        )}
                    />
                )}

                {/* Fila 4: Comprobante y Notas (2 columnas) */}
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="receiptNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Número de Comprobante</FormLabel>
                                <FormControl>
                                    <Input placeholder="Opcional" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notas</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Notas adicionales..."
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Botón de envío */}
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isEditing ? 'Actualizar Ingreso' : 'Registrar Ingreso'}
                </Button>
            </form>

            {/* Diálogo para crear cliente */}
            <Dialog open={createCustomerOpen} onOpenChange={setCreateCustomerOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5" />
                            Crear Cliente Nuevo
                        </DialogTitle>
                        <DialogDescription>
                            Completá los datos del cliente. Se seleccionará automáticamente después de crearlo.
                        </DialogDescription>
                    </DialogHeader>
                    <CustomerForm
                        initialData={{
                            firstName: '',
                            lastName: '',
                            ivaCondition: IvaCondition.CONSUMIDOR_FINAL,
                            isActive: true,
                        }}
                        onSubmit={handleCreateCustomer}
                        isLoading={createCustomerMutation.isPending}
                        compact
                    />
                </DialogContent>
            </Dialog>

            {/* Diálogo para crear categoría */}
            <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Nueva Categoría de Ingresos</DialogTitle>
                        <DialogDescription>
                            Creá una categoría para organizar y segmentar los ingresos.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="quickIncomeCatName">
                                Nombre <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="quickIncomeCatName"
                                placeholder="Ej: Servicios, Alquileres, Comisiones..."
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCreateIncomeCategory();
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quickIncomeCatDesc">Descripción (opcional)</Label>
                            <Input
                                id="quickIncomeCatDesc"
                                placeholder="Detalle de la categoría..."
                                value={newCategoryDescription}
                                onChange={(e) => setNewCategoryDescription(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCreateIncomeCategory();
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
                                setCreateCategoryOpen(false);
                                setNewCategoryName('');
                                setNewCategoryDescription('');
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleCreateIncomeCategory()}
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
