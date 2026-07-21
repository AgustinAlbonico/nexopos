/**
 * Formulario profesional de Punto de Venta (POS)
 * Diseño moderno y optimizado para velocidad de uso
 */
import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Calendar,
    FileText,
    Package,
    Loader2,
    ShoppingCart,
    AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from '@/components/ui/form';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { ProductSearch } from '@/components/common/ProductSearch';
import { CustomerSearch } from '@/components/common/CustomerSearch';
import { CustomerForm } from '@/features/customers/components/CustomerForm';
import { customersApi } from '@/features/customers/api';
import { Customer, CreateCustomerDTO } from '@/features/customers/types';
import { createSaleSchema, CreateSaleFormValues } from '../schemas/sale.schema';
import { PaymentMethod, CreateSaleDTO, CreateSalePaymentDTO, CreateSaleItemDTO } from '../types';
import { getTodayLocal } from '@/lib/date-utils';
import { api } from '@/lib/axios';
import { fiscalApi } from '@/features/configuration/api/fiscal.api';
import { IvaCondition } from '@/features/configuration/types/fiscal';
import { paymentMethodsApi } from '@/features/configuration/api/payment-methods.api';
import {
    usePaymentAmountSync,
    useOnAccountValidation,
    useMonotributistaCleanup,
    useFiscalConfigValidation,
} from '../hooks/useSaleFormEffects';

// Nuevos componentes refactorizados
import { SaleItemsList } from './SaleItemsList';
import { SaleTotals } from './SaleTotals';
import { SalePayments } from './SalePayments';
import { useParkedSales, ParkedSale } from '../hooks/useParkedSales';
import { ParkedSalesDialog } from './ParkedSalesDialog';
import { ProductFormDialog } from '@/features/products/components/ProductFormDialog';
import { PauseCircle, History } from 'lucide-react';
import { Product } from '@/features/products/types';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { productsApi } from '@/features/products/api/products.api';

interface SaleFormProps {
    readonly onSubmit: (data: CreateSaleDTO) => void;
    readonly onParkSale?: () => void;
    readonly isLoading?: boolean;
    readonly initialData?: CreateSaleFormValues;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

export function SaleForm({ onSubmit, onParkSale, isLoading, initialData }: SaleFormProps) {
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
        initialData?.customerName
            ? ({
                id: initialData.customerId ?? '',
                firstName: initialData.customerName,
                lastName: '',
                fullName: initialData.customerName,
                documentNumber: '',
                email: '',
                phone: '',
                address: '',
                city: '',
                category: undefined,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            } as Customer)
            : null
    ); // Mock customer if only name is present, ideally pass full customer object if available
    const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
    const ivaPercentage = 21; // IVA por defecto 21%

    const queryClient = useQueryClient();

    // Obtener métodos de pago
    const { data: paymentMethods } = useQuery({
        queryKey: ['payment-methods'],
        queryFn: paymentMethodsApi.getAll,
    });

    // Obtener configuración fiscal
    const { data: fiscalConfig } = useQuery({
        queryKey: ['fiscal-config'],
        queryFn: fiscalApi.getConfiguration,
    });

    const isMonotributista = fiscalConfig?.ivaCondition === IvaCondition.RESPONSABLE_MONOTRIBUTO;

    // Parked Sales
    const { parkSale, parkedSales, retrieveSale, removeSale } = useParkedSales();
    const [showParkedSales, setShowParkedSales] = useState(false);

    // Inline Product Creation
    const [showCreateProduct, setShowCreateProduct] = useState(false);

    // Scanner state
    const [pendingItemIndex, setPendingItemIndex] = useState<number | null>(null);

    // Obtener configuración del sistema para saber si el scanner está habilitado
    const { data: systemConfig } = useQuery({
        queryKey: ['configuration'],
        queryFn: async () => {
            const res = await api.get('/api/configuration');
            return res.data as {
                barcodeScannerEnabled: boolean;
                barcodeScannerTimeoutMs: number;
                allowOutOfStockSale: boolean;
            };
        },
    });

    const scannerEnabled = systemConfig?.barcodeScannerEnabled ?? false;
    const scannerTimeout = systemConfig?.barcodeScannerTimeoutMs ?? 100;
    const allowOutOfStockSale = systemConfig?.allowOutOfStockSale ?? false;

    const form = useForm<CreateSaleFormValues>({
        resolver: zodResolver(createSaleSchema),
        defaultValues: initialData || {
            customerId: undefined,
            customerName: '',
            saleDate: getTodayLocal(),
            discount: 0,
            surcharge: 0,
            tax: 0,
            isOnAccount: false,
            generateInvoice: false,
            notes: '',
            items: [],
            taxes: [],
            payments: [{ paymentMethod: PaymentMethod.CASH, amount: 0 }],
        },
    });

    const {
        fields: itemFields,
        append: appendItem,
        remove: removeItem,
    } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    const {
        fields: paymentFields,
        append: appendPayment,
        remove: removePayment,
    } = useFieldArray({
        control: form.control,
        name: 'payments',
    });

    // Observar valores del formulario
    const items = form.watch('items');
    const payments = form.watch('payments');
    const taxes = form.watch('taxes');
    const discount = form.watch('discount') || 0;
    const surcharge = form.watch('surcharge') || 0;
    const isOnAccount = form.watch('isOnAccount');
    const customerId = form.watch('customerId');

    // Calcular totales (necesario para validaciones y props)
    const subtotal = items.reduce((sum, item) => {
        const itemSubtotal = (item.quantity || 0) * (item.unitPrice || 0);
        return sum + itemSubtotal - (item.discount || 0);
    }, 0);

    const totalTaxAmount = taxes?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    const total = subtotal + totalTaxAmount - discount + surcharge;

    const totalPayments = payments?.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0
    ) || 0;

    const pendingAmount = total - totalPayments;

    // === EFECTOS / HOOKS ===
    // Actualizar monto del primer pago cuando cambia el total
    usePaymentAmountSync(form, total, isOnAccount, payments?.length);

    // Si se deselecciona cuenta corriente, limpiar cliente si no hay cliente seleccionado
    useOnAccountValidation(form, customerId, isOnAccount);

    // Si es monotributista, limpiar impuestos
    useMonotributistaCleanup(form, isMonotributista);

    // Si AFIP no está configurado, asegurar que generateInvoice sea false
    useFiscalConfigValidation(form, fiscalConfig?.isConfigured);

    // Handlers
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

    const handleProductSelect = (productId: string, product: any) => {
        addItemToSale(productId, product);
    };

    const addItemToSale = useCallback((productId: string, product: any): number => {
        // Verificar si el producto ya está en la lista
        const existingIndex = items.findIndex(item => item.productId === productId);

        if (existingIndex >= 0) {
            // Incrementar cantidad
            const currentQty = items[existingIndex].quantity || 1;
            const maxStock = items[existingIndex].stock;

            if (!allowOutOfStockSale && maxStock !== undefined && currentQty >= maxStock) {
                toast.error(`Stock máximo alcanzado: ${maxStock}`);
                return existingIndex;
            }

            form.setValue(`items.${existingIndex}.quantity`, currentQty + 1);
            toast.success(`${product.name} x${currentQty + 1}`);
            return existingIndex;
        } else {
            // Agregar nuevo producto
            appendItem({
                productId: productId,
                productName: product.name,
                quantity: 1,
                unitPrice: product.price,
                discount: 0,
                discountPercent: 0,
                stock: product.stock,
            });
            toast.success(`${product.name} agregado`);
            return items.length;
        }
    }, [items, form, appendItem, allowOutOfStockSale]);

    const handleCreateProduct = () => {
        setShowCreateProduct(true);
    };

    const handleProductCreated = (product: Product) => {
        // Agregar el producto creado a la venta automáticamente
        addItemToSale(product.id, product);
    };

    // Procesar barcode escaneado (scanner rápido)
    const handleBarcodeScan = useCallback(async (barcode: string) => {
        try {
            // Si hay un item pendiente, confirmarlo con qty=1 antes de agregar el nuevo
            if (pendingItemIndex !== null) {
                setPendingItemIndex(null);
            }

            // Buscar producto por barcode usando endpoint dedicado
            const matched = await productsApi.findByBarcode(barcode);

            if (!matched) {
                toast.error(`Producto no encontrado: ${barcode}`);
                return;
            }

            const newIndex = addItemToSale(matched.id, matched);
            // El nuevo item queda pendiente para edición de cantidad
            setPendingItemIndex(newIndex);
        } catch {
            toast.error('Error al buscar producto por código de barras');
        }
    }, [pendingItemIndex, addItemToSale]);

    // Procesar entrada manual lenta + Enter (cantidad)
    const handleManualEnter = useCallback((buffer: string) => {
        if (pendingItemIndex === null) return;

        const qty = Number.parseInt(buffer, 10);
        if (!Number.isNaN(qty) && qty > 0) {
            const maxStock = items[pendingItemIndex]?.stock;
            const finalQty = (!allowOutOfStockSale && maxStock !== undefined)
                ? Math.min(qty, maxStock)
                : qty;
            form.setValue(`items.${pendingItemIndex}.quantity`, finalQty);
            toast.success(`Cantidad actualizada: ${finalQty}`);
        }
        setPendingItemIndex(null);
    }, [pendingItemIndex, items, form, allowOutOfStockSale]);

    // Hook de scanner de códigos de barras (unificado: scanner + cantidad manual)
    useBarcodeScanner({
        enabled: scannerEnabled,
        timeoutMs: scannerTimeout,
        onScan: handleBarcodeScan,
        onManualEnter: handleManualEnter,
    });

    // Listener para Escape (cancelar item pendiente)
    useEffect(() => {
        if (pendingItemIndex === null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setPendingItemIndex(null);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [pendingItemIndex]);

    const updateQuantity = (index: number, delta: number) => {
        const currentQty = items[index]?.quantity || 1;
        const newQty = currentQty + delta;
        const maxStock = items[index]?.stock;

        if (newQty < 1) {
            removeItem(index);
            return;
        }

        if (!allowOutOfStockSale && maxStock !== undefined && newQty > maxStock) {
            toast.error(`Stock máximo: ${maxStock}`);
            return;
        }

        form.setValue(`items.${index}.quantity`, newQty);
    };

    const handleParkSale = () => {
        if (items.length === 0) {
            toast.error('Agregá productos antes de posponer la venta');
            return;
        }

        parkSale(form.getValues(), total, selectedCustomer);

        // Reset form
        form.reset({
            customerId: undefined,
            customerName: '',
            saleDate: getTodayLocal(),
            discount: 0,
            surcharge: 0,
            tax: 0,
            isOnAccount: false,
            generateInvoice: false,
            notes: '',
            items: [],
            taxes: [],
            payments: [{ paymentMethod: PaymentMethod.CASH, amount: 0 }],
        });
        setSelectedCustomer(null);
        toast.success('Venta pospuesta correctamente');
        onParkSale?.();
    };

    const handleRetrieveParkedSale = (sale: ParkedSale) => {
        retrieveSale(sale.id);

        // Restore form data
        form.reset(sale.data);

        // Restore specific state
        if (sale.customer) {
            setSelectedCustomer(sale.customer);
        } else {
            setSelectedCustomer(null);
        }

        setShowParkedSales(false);
        toast.info('Venta recuperada');
    };

    const handleSubmit = (data: CreateSaleFormValues) => {
        // Validar que hay productos
        if (data.items.length === 0) {
            toast.error('Agregá al menos un producto');
            return;
        }

        // Validar que los pagos cubran el total si no es cuenta corriente
        if (!data.isOnAccount) {
            const totalPaid = data.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
            if (Math.abs(totalPaid - total) > 0.01) {
                form.setError('payments', {
                    message: `El total de pagos debe ser igual a ${formatCurrency(total)}`,
                });
                return;
            }
        }

        // Validar cuenta corriente solo con cliente
        if (data.isOnAccount && !data.customerId) {
            form.setError('isOnAccount', {
                message: 'Debe seleccionar un cliente para venta en cuenta corriente',
            });
            return;
        }

        // Transformar pagos
        let paymentsWithIds: CreateSalePaymentDTO[] | undefined = undefined;
        if (!data.isOnAccount && data.payments) {
            paymentsWithIds = data.payments.map((payment) => {
                const method = paymentMethods?.find((pm) => pm.code === payment.paymentMethod);
                if (!method) {
                    toast.error(`Error: Método de pago ${payment.paymentMethod} no encontrado`);
                    throw new Error(`Payment method not found: ${payment.paymentMethod}`);
                }
                const { paymentMethod, ...rest } = payment;
                return { ...rest, paymentMethodId: method.id };
            });
        }

        const itemsForApi: CreateSaleItemDTO[] = data.items.map(({ stock: _stock, productName: _productName, ...item }) => item);

        // Solo enviar ivaPercentage cuando es RI→RI (Factura A)
        const shouldIncludeIva = fiscalConfig?.ivaCondition === IvaCondition.RESPONSABLE_INSCRIPTO &&
            selectedCustomer?.ivaCondition === IvaCondition.RESPONSABLE_INSCRIPTO;

        const payload: CreateSaleDTO = {
            ...data,
            items: itemsForApi,
            payments: data.isOnAccount ? undefined : paymentsWithIds,
            ivaPercentage: shouldIncludeIva ? ivaPercentage : undefined,
        };

        onSubmit(payload);
    };

    return (
        <div className="h-full">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit, (errors) => {
                    console.log('Form validation errors:', errors);
                    toast.error('Por favor verificá los campos del formulario');
                })} className="h-full">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
                        {/* COLUMNA IZQUIERDA: Búsqueda y Productos */}
                        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
                            {/* Nueva Barra superior integrada en el Header */}
                            <DialogHeader className="px-6 py-4 border-b grid grid-cols-12 gap-4 items-start -mx-6 -mt-6 mb-6 bg-muted/30">
                                <div className="col-span-12 xl:col-span-4">
                                    <DialogTitle className="flex items-center gap-2 text-xl">
                                        <ShoppingCart className="h-5 w-5" />
                                        Nueva Venta
                                        {parkedSales.length > 0 && (
                                            <Badge
                                                variant="secondary"
                                                className="ml-2 cursor-pointer hover:bg-secondary/80 bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200"
                                                onClick={() => setShowParkedSales(true)}
                                            >
                                                <History className="h-3 w-3 mr-1" />
                                                {parkedSales.length} pendiente{parkedSales.length !== 1 ? 's' : ''}
                                            </Badge>
                                        )}
                                    </DialogTitle>
                                    <DialogDescription className="mt-1">
                                        Stock automático
                                    </DialogDescription>
                                </div>

                                <div className="col-span-12 xl:col-span-8 flex flex-wrap items-center gap-4 justify-end">
                                    <div className="flex-1 min-w-[200px] max-w-[350px]">
                                        <FormField
                                            control={form.control}
                                            name="customerId"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <FormLabel className="text-xs font-medium text-muted-foreground">
                                                            Cliente
                                                        </FormLabel>
                                                        {selectedCustomer && (
                                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                {selectedCustomer.documentNumber ? (
                                                                    <><FileText className="h-3 w-3" /> {selectedCustomer.documentNumber}</>
                                                                ) : null}
                                                            </span>
                                                        )}
                                                    </div>
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
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="w-36">
                                        <FormField
                                            control={form.control}
                                            name="saleDate"
                                            render={({ field }) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" /> Fecha
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input type="date" {...field} className="h-9" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="flex items-center pt-5 shrink-0">
                                        <FormField
                                            control={form.control}
                                            name="generateInvoice"
                                            render={({ field }) => {
                                                const isDisabled = !fiscalConfig?.isConfigured;
                                                const checkboxContent = (
                                                    <FormItem className={`flex items-center space-x-2 space-y-0 bg-background border rounded-lg px-3 py-2 shadow-sm ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value}
                                                                onCheckedChange={field.onChange}
                                                                disabled={isDisabled}
                                                                className="h-4 w-4"
                                                            />
                                                        </FormControl>
                                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                            <FormLabel className={`text-sm font-medium ${isDisabled ? 'cursor-not-allowed' : ''}`}>
                                                                Fiscal
                                                            </FormLabel>
                                                            {field.value && !isDisabled && (
                                                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200">
                                                                    AFIP
                                                                </Badge>
                                                            )}
                                                            {isDisabled && (
                                                                <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                                                            )}
                                                        </div>
                                                    </FormItem>
                                                );

                                                if (isDisabled) {
                                                    return (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div>{checkboxContent}</div>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="bottom" className="max-w-[250px]">
                                                                    <p className="text-xs">
                                                                        Configurá los datos fiscales y certificados AFIP en Configuración → Fiscal para habilitar la facturación electrónica.
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    );
                                                }

                                                return checkboxContent;
                                            }}
                                        />
                                    </div>
                                </div>
                            </DialogHeader>

                            {/* Búsqueda de productos */}
                            <div className="bg-gradient-to-r from-primary/5 to-primary/10 border-2 border-primary/20 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Package className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Agregar Productos</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Buscá por nombre, código o SKU
                                        </p>
                                    </div>
                                </div>
                                <ProductSearch
                                    onSelect={handleProductSelect}
                                    placeholder="Escribí para buscar productos..."
                                    showStock
                                    showSKU
                                    limit={20}
                                    className="h-12 text-lg"
                                    excludeIds={items.map(item => item.productId).filter(id => id !== '')}
                                    excludeOutOfStock={!allowOutOfStockSale}
                                    allowCreate
                                    onCreateClick={handleCreateProduct}
                                />
                            </div>

                            {/* Lista de productos (Componente Extraído) */}
                            <SaleItemsList
                                items={items}
                                itemFields={itemFields}
                                onUpdateQuantity={updateQuantity}
                                onRemoveItem={removeItem}
                                subtotal={subtotal}
                                control={form.control}
                                pendingItemIndex={pendingItemIndex}
                                onConfirmPending={() => setPendingItemIndex(null)}
                            />
                        </div>

                        {/* COLUMNA DERECHA: Totales y Pagos */}
                        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
                            {/* Totales (Componente Extraído) */}
                            <SaleTotals subtotal={subtotal} form={form} />

                            {/* Opciones de venta */}
                            <div className="bg-card border rounded-xl p-4 shadow-sm">
                                <FormField
                                    control={form.control}
                                    name="isOnAccount"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                    disabled={!customerId}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className={customerId ? '' : 'text-muted-foreground'}>
                                                    Venta en Cuenta Corriente
                                                </FormLabel>
                                                <p className="text-xs text-muted-foreground">
                                                    Registrar deuda en la cuenta del cliente
                                                </p>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Pagos (Componente Extraído) */}
                            <SalePayments
                                paymentFields={paymentFields}
                                appendPayment={appendPayment}
                                removePayment={removePayment}
                                paymentMethods={paymentMethods}
                                total={total}
                                pendingAmount={pendingAmount}
                                isOnAccount={isOnAccount}
                                control={form.control}
                            />

                            {/* Botón de Confirmar */}
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20"
                                disabled={isLoading || items.length === 0 || (!isOnAccount && pendingAmount > 0.01)}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    'CONFIRMAR VENTA'
                                )}
                            </Button>

                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                                    onClick={handleParkSale}
                                    disabled={items.length === 0}
                                >
                                    <PauseCircle className="mr-2 h-4 w-4" />
                                    Posponer
                                </Button>

                                {parkedSales.length > 0 ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="text-muted-foreground"
                                        onClick={() => setShowParkedSales(true)}
                                    >
                                        <History className="mr-2 h-4 w-4" />
                                        Recuperar ({parkedSales.length})
                                    </Button>
                                ) : (
                                    <div />
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </Form>

            {/* Modal para crear cliente rápido */}
            <Dialog open={createCustomerOpen} onOpenChange={setCreateCustomerOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Nuevo Cliente</DialogTitle>
                        <DialogDescription>
                            Creá un cliente rápido desde la venta
                        </DialogDescription>
                    </DialogHeader>
                    <CustomerForm
                        onSubmit={(data) => createCustomerMutation.mutate(data as CreateCustomerDTO)}
                        isLoading={createCustomerMutation.isPending}
                        compact
                    />
                </DialogContent>
            </Dialog>

            <ParkedSalesDialog
                open={showParkedSales}
                onOpenChange={setShowParkedSales}
                parkedSales={parkedSales}
                onSelect={handleRetrieveParkedSale}
                onDelete={(id) => {
                    removeSale(id);
                    toast.success('Venta pendiente eliminada');
                }}
            />

            <ProductFormDialog
                open={showCreateProduct}
                onOpenChange={setShowCreateProduct}
                onProductCreated={handleProductCreated}
            />
        </div>
    );
}
