/**
 * Formulario para crear/editar compras
 * Permite crear productos nuevos directamente desde el formulario
 */
import { useState, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, PackagePlus, ScanBarcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// Checkbox removed: purchases cannot be registered as expense from the form
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { ProductSearch } from '@/components/common/ProductSearch';
import { SupplierSearch } from '@/components/common/SupplierSearch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { productsApi } from '@/features/products/api/products.api';
import { SupplierForm } from '@/features/suppliers/components/SupplierForm';
import { ProductForm } from '@/features/products/components/ProductForm';
import { ProductFormValues } from '@/features/products/schemas/product.schema';
// expenseCategoriesApi removed: no longer needed in purchase form
import { purchasesApi } from '../api/purchases.api';
import { suppliersApi } from '@/features/suppliers/api/suppliers.api';
import { createPurchaseSchema, CreatePurchaseFormValues } from '../schemas/purchase.schema';
import { PurchaseStatus } from '../types';
import { PurchaseMatrixModal } from './PurchaseMatrixModal';
import { useCapabilities } from '@/hooks/useCapabilities';
import { getTodayLocal } from '@/lib/date-utils';
import { PaymentMethodSelect } from '@/components/shared/PaymentMethodSelect';

interface PurchaseFormProps {
    readonly onSubmit: (data: CreatePurchaseFormValues) => void;
    readonly isLoading?: boolean;
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

export function PurchaseForm({ onSubmit, isLoading }: PurchaseFormProps) {
    const { data: capabilitiesData } = useCapabilities();
    const hasVariantsCapability = capabilitiesData?.capabilities['STRUCTURAL.variants'] ?? false;

    const [isMatrixOpen, setIsMatrixOpen] = useState(false);
    // Estado para crear producto
    const [createProductOpen, setCreateProductOpen] = useState(false);
    const [createProductIndex, setCreateProductIndex] = useState<number | null>(null);
    const [initialProductName, setInitialProductName] = useState('');

    // FIX 2.1: Escaneo de código de barras en compras (campo dedicado autoFocus)
    const [barcodeValue, setBarcodeValue] = useState('');
    const [isScanningBarcode, setIsScanningBarcode] = useState(false);
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    const queryClient = useQueryClient();

    const form = useForm<CreatePurchaseFormValues>({
        resolver: zodResolver(createPurchaseSchema as any),
        mode: 'onChange',
        defaultValues: {
            supplierId: '',
            providerName: '',
            providerDocument: '',
            providerPhone: '',
            purchaseDate: getTodayLocal(),
            tax: 0,
            discount: 0,
            status: PurchaseStatus.PAID,
            paymentMethodId: '',
            invoiceNumber: '',
            notes: '',
            items: [{ productId: '', quantity: 1, unitPrice: 0, notes: '' }],
            // createExpense and expenseCategoryId removed: purchases are not registered as expenses here
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    // Queries - prefetch para el cache
    useQuery({
        queryKey: ['purchase-providers'],
        queryFn: purchasesApi.getProviders,
    });

    useQuery({
        queryKey: ['suppliers-active'],
        queryFn: suppliersApi.getActive,
    });

    // Los métodos de pago ahora se manejan en PaymentMethodSelect

    // expenseCategories query removed

    // Mutación para crear producto
    const createProductMutation = useMutation({
        mutationFn: productsApi.create,
        onSuccess: (newProduct) => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success(`Producto "${newProduct.name}" creado`);

            // Seleccionar el producto en el item actual
            if (createProductIndex !== null) {
                form.setValue(`items.${createProductIndex}.productId`, newProduct.id);
                form.setValue(`items.${createProductIndex}.unitPrice`, newProduct.cost);
            }

            // Cerrar diálogo y limpiar
            setCreateProductOpen(false);
            setCreateProductIndex(null);
            setInitialProductName('');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Error al crear producto');
        },
    });

    // Estado y mutación para crear proveedor desde el modal de compras
    const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
    const [initialSupplierName, setInitialSupplierName] = useState('');

    const createSupplierMutation = useMutation({
        mutationFn: suppliersApi.create,
        onSuccess: (newSupplier) => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast.success(`Proveedor "${newSupplier.name}" creado`);

            // Seleccionar el proveedor en el formulario
            form.setValue('supplierId', newSupplier.id);
            form.setValue('providerName', newSupplier.name);
            form.setValue('providerDocument', newSupplier.documentNumber || '');
            form.setValue('providerPhone', newSupplier.phone || newSupplier.mobile || '');

            setCreateSupplierOpen(false);
            setInitialSupplierName('');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Error al crear proveedor');
        },
    });

    // Calcular totales
    const items = form.watch('items');
    const tax = form.watch('tax') || 0;
    const discount = form.watch('discount') || 0;
    const status = form.watch('status');
    // supplierId se usa internamente en el form
    form.watch('supplierId');

    const subtotal = items.reduce((sum, item) => {
        return sum + (item.quantity || 0) * (item.unitPrice || 0);
    }, 0);

    const total = subtotal + tax - discount;



    // Abrir diálogo de crear producto
    const handleOpenCreateProduct = (index: number) => {
        setCreateProductIndex(index);
        setInitialProductName('');
        setCreateProductOpen(true);
    };

    // Crear producto desde el formulario completo
    const handleCreateProduct = (data: ProductFormValues) => {
        createProductMutation.mutate(data);
    };

    // FIX 2.1: Manejar el código de barras escaneado o tipeado + Enter
    const handleBarcodeScan = async (barcode: string) => {
        const trimmed = barcode.trim();
        if (!trimmed) return;

        try {
            setIsScanningBarcode(true);
            const product = await productsApi.findByBarcode(trimmed);

            if (!product) {
                toast.error(`Producto no encontrado: ${trimmed}`, {
                    description: 'Podés crearlo desde el botón "Crear Producto"',
                });
                setBarcodeValue('');
                return;
            }

            // Verificar si el producto ya está en la lista (evitar duplicar líneas)
            const existingIndex = fields.findIndex(f => f.productId === product.id);
            if (existingIndex >= 0) {
                toast.info(`${product.name} ya está en la compra (línea ${existingIndex + 1})`);
                setBarcodeValue('');
                barcodeInputRef.current?.focus();
                return;
            }

            // Agregar nueva línea con el costo del producto
            append({
                productId: product.id,
                quantity: 1,
                unitPrice: product.cost,
                notes: '',
            });
            toast.success(`${product.name} agregado`);
            setBarcodeValue('');
            barcodeInputRef.current?.focus();
        } catch {
            toast.error('Error al buscar producto por código de barras');
        } finally {
            setIsScanningBarcode(false);
        }
    };

    const handleSubmit = (data: CreatePurchaseFormValues) => {
        const cleaned = {
            ...data,
            paymentMethodId: data.paymentMethodId === '' ? undefined : data.paymentMethodId,
        };
        onSubmit(cleaned);
    };

    return (
        <>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    {/* Datos del proveedor */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Datos del Proveedor</h3>

                        {/* Selector de proveedor registrado (buscador con creación inline) */}
                        <FormField
                            control={form.control}
                            name="supplierId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proveedor Registrado <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <SupplierSearch
                                            value={field.value}
                                            onSelect={(supplierId, supplier) => {
                                                field.onChange(supplierId);
                                                form.setValue('providerName', supplier.name);
                                                form.setValue('providerDocument', supplier.documentNumber || '');
                                                form.setValue('providerPhone', supplier.phone || supplier.mobile || '');
                                            }}
                                            onClear={() => {
                                                field.onChange('');
                                                form.setValue('providerName', '');
                                                form.setValue('providerDocument', '');
                                                form.setValue('providerPhone', '');
                                            }}
                                            allowCreate
                                            onCreateClick={() => setCreateSupplierOpen(true)}
                                            placeholder="Buscar proveedor o crear nuevo"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Manual provider fields removed — use 'Proveedor Registrado' search/create only */}
                    </div>

                    {/* Datos de la compra */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Datos de la Compra</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <FormField
                                control={form.control}
                                name="purchaseDate"
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
                            <FormField
                                control={form.control}
                                name="invoiceNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nº Factura</FormLabel>
                                        <FormControl>
                                            <Input placeholder="0001-00001234" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Estado</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={PurchaseStatus.PENDING}>
                                                    Pendiente
                                                </SelectItem>
                                                <SelectItem value={PurchaseStatus.PAID}>
                                                    Pagada
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="paymentMethodId"
                                render={({ field }) => (
                                    <PaymentMethodSelect
                                        value={field.value}
                                        onChange={field.onChange}
                                        label="Método de Pago"
                                        required={status === PurchaseStatus.PAID}
                                        disabled={status !== PurchaseStatus.PAID}
                                        variant="select"
                                    />
                                )}
                            />
                        </div>
                    </div>

                    {/* Items de compra */}
                    <div className="space-y-4">
                        {/* FIX 2.1: Campo de escaneo de código de barras */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    ref={barcodeInputRef}
                                    value={barcodeValue}
                                    onChange={(e) => setBarcodeValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleBarcodeScan(barcodeValue);
                                        }
                                    }}
                                    placeholder="Escaneá el código de barras o escribí + Enter"
                                    className="pl-9"
                                    disabled={isScanningBarcode}
                                    aria-label="Escanear código de barras"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => handleBarcodeScan(barcodeValue)}
                                disabled={isScanningBarcode || !barcodeValue.trim()}
                                title="Buscar por código"
                            >
                                {isScanningBarcode ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <ScanBarcode className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        <div className="flex justify-between items-center flex-wrap gap-2">
                            <h3 className="font-semibold text-lg">Productos <span className="text-red-500">*</span></h3>
                            <div className="flex gap-2">
                                {hasVariantsCapability ? (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setIsMatrixOpen(true)}
                                        className="bg-blue-600/10 text-blue-700 hover:bg-blue-600/20 dark:text-blue-300 font-medium"
                                    >
                                        <PackagePlus className="h-4 w-4 mr-1 text-blue-600" />
                                        Cargar por Matriz (Curvero)
                                    </Button>
                                ) : null}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        append({ productId: '', quantity: 1, unitPrice: 0, notes: '' })
                                    }
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Agregar Línea
                                </Button>
                            </div>
                        </div>

                        {/* Modal de Matriz de Compras */}
                        {isMatrixOpen ? (
                            <PurchaseMatrixModal
                                open={isMatrixOpen}
                                onClose={() => setIsMatrixOpen(false)}
                                onAddVariantsToPurchase={(itemsToAdd) => {
                                    for (const item of itemsToAdd) {
                                        append({
                                            productId: item.product.id,
                                            quantity: item.quantity,
                                            unitPrice: item.unitCost,
                                            notes: `Curva variante ${item.product.name}`,
                                        });
                                    }
                                }}
                            />
                        ) : null}

                        <div className="space-y-3">
                            {fields.map((field, index) => (
                                <Card key={field.id}>
                                    <CardContent className="p-4">
                                        <div className="grid grid-cols-12 gap-3 items-end">
                                            {/* Selector de producto */}
                                            <div className="col-span-5">
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.productId`}
                                                    render={({ field: productField }) => (
                                                        <FormItem className="flex flex-col">
                                                            <FormLabel>Producto</FormLabel>
                                                            <FormControl>
                                                                <ProductSearch
                                                                    value={productField.value}
                                                                    onSelect={(productId, product) => {
                                                                        productField.onChange(productId);
                                                                        // Auto-completar precio de costo
                                                                        form.setValue(
                                                                            `items.${index}.unitPrice`,
                                                                            product.cost
                                                                        );
                                                                    }}
                                                                    onClear={() => {
                                                                        productField.onChange('');
                                                                        form.setValue(`items.${index}.unitPrice`, 0);
                                                                    }}
                                                                    placeholder="Buscar producto..."
                                                                    showStock
                                                                    showSKU
                                                                    showCost
                                                                    allowCreate
                                                                    onCreateClick={() => handleOpenCreateProduct(index)}
                                                                    limit={20}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            {/* Cantidad */}
                                            <div className="col-span-2">
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.quantity`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Cantidad</FormLabel>
                                                            <FormControl>
                                                                <NumericInput
                                                                    allowDecimals={false}
                                                                    value={field.value}
                                                                    onChange={(e) =>
                                                                        field.onChange(Number.parseInt(e.target.value) || 1)
                                                                    }
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            {/* Precio unitario */}
                                            <div className="col-span-2">
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.unitPrice`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Precio Unit.</FormLabel>
                                                            <FormControl>
                                                                <NumericInput
                                                                    value={field.value}
                                                                    onChange={(e) =>
                                                                        field.onChange(Number.parseFloat(e.target.value) || 0)
                                                                    }
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            {/* Subtotal */}
                                            <div className="col-span-2">
                                                <Label>Subtotal</Label>
                                                <div className="h-10 flex items-center px-3 bg-muted rounded-md font-medium">
                                                    {formatCurrency(
                                                        (items[index]?.quantity || 0) *
                                                        (items[index]?.unitPrice || 0)
                                                    )}
                                                </div>
                                            </div>

                                            {/* Eliminar */}
                                            <div className="col-span-1">
                                                {fields.length > 1 ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive"
                                                        onClick={() => remove(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Totales */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField
                            control={form.control}
                            name="tax"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Impuestos (+)</FormLabel>
                                    <FormControl>
                                        <NumericInput
                                            value={field.value}
                                            onChange={(e) =>
                                                field.onChange(Number.parseFloat(e.target.value) || 0)
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="discount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descuento (-)</FormLabel>
                                    <FormControl>
                                        <NumericInput
                                            value={field.value}
                                            onChange={(e) =>
                                                field.onChange(Number.parseFloat(e.target.value) || 0)
                                            }
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div>
                            <Label>Subtotal</Label>
                            <div className="h-10 flex items-center px-3 bg-muted rounded-md">
                                {formatCurrency(subtotal)}
                            </div>
                        </div>
                        <div>
                            <Label className="font-semibold">TOTAL</Label>
                            <div className="h-10 flex items-center px-3 bg-primary text-primary-foreground rounded-md font-bold text-lg">
                                {formatCurrency(total)}
                            </div>
                        </div>
                    </div>

                    {/* Purchases are not registered as expenses here (feature removed) */}

                    {/* Notas */}
                    <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Notas / Observaciones</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Notas adicionales sobre la compra..."
                                        className="resize-none"
                                        rows={3}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Botón submit */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="submit" disabled={isLoading || !form.formState.isValid}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Registrar Compra
                        </Button>
                    </div>
                </form>
            </Form>

            {/* Diálogo para crear producto (usa el mismo formulario que en Productos) */}
            <Dialog open={createProductOpen} onOpenChange={setCreateProductOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PackagePlus className="h-5 w-5 text-blue-600" />
                            Crear Producto Nuevo
                        </DialogTitle>
                        <DialogDescription>
                            Completá los datos del producto o modelo con matriz. Se agregará al catálogo para seleccionarlo en la compra.
                        </DialogDescription>
                    </DialogHeader>
                    <ProductForm
                        initialData={{
                            name: initialProductName,
                            cost: 0,
                            stock: 0,
                            categoryIds: [],
                            isActive: true,
                        }}
                        onSubmit={handleCreateProduct}
                        isLoading={createProductMutation.isPending}
                        onSuccess={() => {
                            setCreateProductOpen(false);
                            setCreateProductIndex(null);
                            setInitialProductName('');
                            queryClient.invalidateQueries({ queryKey: ['products'] });
                        }}
                    />
                </DialogContent>
            </Dialog>

            {/* Diálogo para crear proveedor desde compras */}
            <Dialog open={createSupplierOpen} onOpenChange={setCreateSupplierOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PackagePlus className="h-5 w-5" />
                            Crear Proveedor
                        </DialogTitle>
                        <DialogDescription>
                            Completá los datos del proveedor. Se seleccionará automáticamente al crearlo.
                        </DialogDescription>
                    </DialogHeader>
                    <SupplierForm
                        initialData={{ name: initialSupplierName, isActive: true }}
                        onSubmit={(data) => createSupplierMutation.mutate(data)}
                        isLoading={createSupplierMutation.isPending}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
