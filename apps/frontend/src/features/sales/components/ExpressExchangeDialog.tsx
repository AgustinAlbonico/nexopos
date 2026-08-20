import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw, ArrowRightLeft, ArrowDownRight, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ProductSearch } from '@/components/common/ProductSearch';
import { Product } from '@/features/products/types';
import { PaymentMethod, CreateSaleDTO } from '../types';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/axios';
import { salesApi } from '../api/sales.api';
import { getTodayLocal } from '@/lib/date-utils';

interface ExpressExchangeDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly onComplete?: () => void;
}

export function ExpressExchangeDialog({
    open,
    onOpenChange,
    onComplete,
}: ExpressExchangeDialogProps) {
    const queryClient = useQueryClient();

    // Prenda devuelta
    const [returnedProduct, setReturnedProduct] = useState<Product | null>(null);
    const [returnedQuantity, setReturnedQuantity] = useState<number>(1);
    const [returnedPrice, setReturnedPrice] = useState<number>(0);
    const [restockReturned, setRestockReturned] = useState<boolean>(true);

    // Prenda nueva
    const [newProduct, setNewProduct] = useState<Product | null>(null);
    const [newQuantity, setNewQuantity] = useState<number>(1);
    const [newPrice, setNewPrice] = useState<number>(0);

    // Vendedor y pago de diferencia
    const [sellerName, setSellerName] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
    const [notes, setNotes] = useState<string>('');

    // Cálculos
    const totalCredit = (returnedPrice || 0) * (returnedQuantity || 1);
    const totalDebit = (newPrice || 0) * (newQuantity || 1);
    const difference = totalDebit - totalCredit; // > 0: cliente paga; < 0: saldo a favor; == 0: cambio directo

    const exchangeMutation = useMutation({
        mutationFn: async () => {
            if (!returnedProduct || !newProduct) {
                throw new Error('Debes seleccionar tanto la prenda devuelta como la prenda nueva.');
            }

            // 1. Registrar reingreso a stock de la prenda devuelta si corresponde
            if (restockReturned) {
                await api.post('/api/inventory/movement', {
                    productId: returnedProduct.id,
                    type: 'IN',
                    source: 'RETURN',
                    quantity: returnedQuantity,
                    notes: `Cambio express: Devuelta por cliente (${returnedProduct.name}) a cambio de ${newProduct.name}`,
                });
            }

            // 2. Registrar la salida de la nueva prenda a través del sistema de ventas
            // Si el cliente paga diferencia, la venta registra el monto neto a cobrar
            const finalSaleAmount = Math.max(0, difference);
            const discountAmount = Math.min(totalCredit, totalDebit);

            const salePayload: CreateSaleDTO = {
                saleDate: getTodayLocal(),
                sellerName: sellerName.trim() || undefined,
                items: [
                    {
                        productId: newProduct.id,
                        quantity: newQuantity,
                        unitPrice: newPrice,
                        subtotal: totalDebit,
                    },
                ],
                discount: discountAmount,
                surcharge: 0,
                tax: 0,
                isOnAccount: false,
                generateInvoice: false,
                notes: `[CAMBIO EXPRESS] Prenda devuelta: ${returnedProduct.name} (x${returnedQuantity}). ${notes}`.trim(),
                payments: [
                    {
                        paymentMethod: paymentMethod,
                        amount: finalSaleAmount,
                    },
                ],
            };

            return await salesApi.create(salePayload);
        },
        onSuccess: () => {
            toast.success('¡Cambio de prenda procesado con éxito!');
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            resetForm();
            onOpenChange(false);
            onComplete?.();
        },
        onError: (err: any) => {
            const message = err.response?.data?.message || err.message || 'Error al procesar el cambio';
            toast.error(message);
        },
    });

    const resetForm = () => {
        setReturnedProduct(null);
        setReturnedQuantity(1);
        setReturnedPrice(0);
        setNewProduct(null);
        setNewQuantity(1);
        setNewPrice(0);
        setSellerName('');
        setNotes('');
        setPaymentMethod(PaymentMethod.CASH);
    };

    const handleSelectReturned = (productId: string, product: Product) => {
        setReturnedProduct(product);
        setReturnedPrice(product.price);
    };

    const handleSelectNew = (productId: string, product: Product) => {
        setNewProduct(product);
        setNewPrice(product.price);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-primary" />
                        <DialogTitle>Cambio de Prenda Express</DialogTitle>
                    </div>
                    <DialogDescription>
                        Registrá la prenda que devuelve el cliente y la nueva que se lleva en un solo paso.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 my-2 overflow-y-auto flex-1 pr-1">
                    {/* Grilla Prenda Devuelta vs Prenda Nueva */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Prenda Devuelta */}
                        <div className="bg-amber-500/5 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 font-semibold text-sm text-amber-900 dark:text-amber-300">
                                    <ArrowDownRight className="h-4 w-4 text-amber-600" />
                                    <span>1. Prenda que Devuelve</span>
                                </div>
                                <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs">
                                    Reingreso a Stock
                                </Badge>
                            </div>

                            <div>
                                <Label className="text-xs text-muted-foreground">Buscar prenda a devolver *</Label>
                                <ProductSearch
                                    value={returnedProduct?.id}
                                    onSelect={handleSelectReturned}
                                    onClear={() => setReturnedProduct(null)}
                                    placeholder="Buscar por nombre o escanear..."
                                    className="mt-1"
                                    excludeVariantParents={true}
                                />
                            </div>

                            {returnedProduct && (
                                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                                    <div>
                                        <Label htmlFor="returned-qty" className="text-xs">Cantidad</Label>
                                        <Input
                                            id="returned-qty"
                                            type="number"
                                            min="1"
                                            value={returnedQuantity}
                                            onChange={(e) => setReturnedQuantity(Math.max(1, Number(e.target.value) || 1))}
                                            className="h-8 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="returned-price" className="text-xs">Valor Reconocido ($)</Label>
                                        <Input
                                            id="returned-price"
                                            type="number"
                                            min="0"
                                            value={returnedPrice}
                                            onChange={(e) => setReturnedPrice(Math.max(0, Number(e.target.value) || 0))}
                                            className="h-8 mt-1"
                                        />
                                    </div>
                                    <div className="col-span-2 pt-2 border-t flex justify-between items-center">
                                        <span className="text-muted-foreground">Crédito a favor:</span>
                                        <span className="font-bold text-sm text-amber-700 dark:text-amber-400">
                                            {formatCurrency(totalCredit)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Prenda Nueva */}
                        <div className="bg-emerald-500/5 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 font-semibold text-sm text-emerald-900 dark:text-emerald-300">
                                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                                    <span>2. Prenda Nueva que se Lleva</span>
                                </div>
                                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs">
                                    Egreso de Stock
                                </Badge>
                            </div>

                            <div>
                                <Label className="text-xs text-muted-foreground">Buscar nueva prenda *</Label>
                                <ProductSearch
                                    value={newProduct?.id}
                                    onSelect={handleSelectNew}
                                    onClear={() => setNewProduct(null)}
                                    placeholder="Buscar por nombre o escanear..."
                                    className="mt-1"
                                    excludeVariantParents={true}
                                />
                            </div>

                            {newProduct && (
                                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                                    <div>
                                        <Label htmlFor="new-qty" className="text-xs">Cantidad</Label>
                                        <Input
                                            id="new-qty"
                                            type="number"
                                            min="1"
                                            value={newQuantity}
                                            onChange={(e) => setNewQuantity(Math.max(1, Number(e.target.value) || 1))}
                                            className="h-8 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="new-price" className="text-xs">Precio Prenda ($)</Label>
                                        <Input
                                            id="new-price"
                                            type="number"
                                            min="0"
                                            value={newPrice}
                                            onChange={(e) => setNewPrice(Math.max(0, Number(e.target.value) || 0))}
                                            className="h-8 mt-1"
                                        />
                                    </div>
                                    <div className="col-span-2 pt-2 border-t flex justify-between items-center">
                                        <span className="text-muted-foreground">Total prenda nueva:</span>
                                        <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                                            {formatCurrency(totalDebit)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Balance de la Operación */}
                    {returnedProduct && newProduct && (
                        <div className="bg-muted/40 rounded-lg p-4 border space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-sm">Resumen del Cambio:</span>
                                <div className="text-right">
                                    {difference === 0 ? (
                                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                            <CheckCircle2 className="h-4 w-4" />
                                            <span>Cambio Directo ($0 diferencia)</span>
                                        </div>
                                    ) : difference > 0 ? (
                                        <div className="text-primary font-bold text-base">
                                            Diferencia a cobrar: {formatCurrency(difference)}
                                        </div>
                                    ) : (
                                        <div className="text-amber-600 font-bold text-base">
                                            Saldo a favor del cliente: {formatCurrency(Math.abs(difference))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t text-xs">
                                <div>
                                    <Label htmlFor="seller-name" className="text-xs">Vendedor de Salón (Opcional)</Label>
                                    <Input
                                        id="seller-name"
                                        placeholder="Nombre o Legajo..."
                                        value={sellerName}
                                        onChange={(e) => setSellerName(e.target.value)}
                                        className="h-8 mt-1"
                                    />
                                </div>

                                {difference > 0 && (
                                    <div>
                                        <Label htmlFor="payment-method" className="text-xs">Método de Pago para Diferencia</Label>
                                        <select
                                            id="payment-method"
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                            className="w-full h-8 mt-1 rounded-md border border-input bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <option value={PaymentMethod.CASH}>Efectivo</option>
                                            <option value={PaymentMethod.DEBIT_CARD}>Tarjeta de Débito</option>
                                            <option value={PaymentMethod.CREDIT_CARD}>Tarjeta de Crédito</option>
                                            <option value={PaymentMethod.TRANSFER}>Transferencia / QR</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 pt-3 border-t mt-auto">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={exchangeMutation.isPending}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={() => exchangeMutation.mutate()}
                        disabled={!returnedProduct || !newProduct || exchangeMutation.isPending}
                        className="font-bold"
                    >
                        {exchangeMutation.isPending ? (
                            <>Procesando...</>
                        ) : (
                            <>Confirmar Cambio de Prenda</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
