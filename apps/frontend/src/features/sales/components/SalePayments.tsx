import {
    Banknote,
    Wallet,
    Plus,
    Trash2,
    Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    FormField,
} from '@/components/ui/form';
import { Control, UseFormReturn } from 'react-hook-form';
import { PaymentMethod } from '../types';
import { PaymentMethodIcons } from '../constants';
import { Badge } from '@/components/ui/badge';
import { CreateSaleFormValues } from '../schemas/sale.schema';

interface SalePaymentsProps {
    readonly paymentFields: readonly {
        id: string;
        name: string;
    }[];
    readonly appendPayment: (value: CreateSaleFormValues['payments'][number]) => void;
    readonly removePayment: (index: number) => void;
    readonly paymentMethods?: readonly PaymentMethod[];
    readonly total: number;
    readonly pendingAmount: number;
    readonly isOnAccount: boolean;
    readonly control: Control<CreateSaleFormValues>;
    readonly form?: UseFormReturn<CreateSaleFormValues>;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

const QUICK_BILLS = [1000, 2000, 5000, 10000, 20000];

export function SalePayments({
    paymentFields,
    appendPayment,
    removePayment,
    paymentMethods,
    total,
    pendingAmount,
    isOnAccount,
    control,
    form,
}: SalePaymentsProps) {

    if (isOnAccount) {
        return (
            <div className="bg-card border rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">Forma de Pago</h3>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg border border-dashed flex flex-col items-center justify-center text-center">
                    <Badge variant="outline" className="mb-2 bg-primary/5 text-primary border-primary/20">
                        Cuenta Corriente
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                        La venta se registrará en la cuenta corriente del cliente.
                        El saldo pendiente es de <strong>{formatCurrency(total)}</strong>.
                    </p>
                </div>
            </div>
        );
    }

    const hasCashPayment = paymentFields.some((_, i) => form?.getValues(`payments.${i}.paymentMethod`) === PaymentMethod.CASH);
    const cashAmount = paymentFields.reduce((sum, _, i) => {
        const method = form?.getValues(`payments.${i}.paymentMethod`);
        const amt = form?.getValues(`payments.${i}.amount`) || 0;
        return method === PaymentMethod.CASH ? sum + amt : sum;
    }, 0);

    const changeAmount = cashAmount > total ? cashAmount - total : 0;

    const handleQuickBill = (amount: number, isExact = false) => {
        if (!form) return;
        const cashIndex = paymentFields.findIndex((_, i) => form.getValues(`payments.${i}.paymentMethod`) === PaymentMethod.CASH);
        if (cashIndex >= 0) {
            if (isExact) {
                form.setValue(`payments.${cashIndex}.amount`, amount);
            } else {
                const currentAmount = form.getValues(`payments.${cashIndex}.amount`) || 0;
                const newAmount = (currentAmount === 0 || currentAmount === total) ? amount : currentAmount + amount;
                form.setValue(`payments.${cashIndex}.amount`, newAmount);
            }
        } else {
            appendPayment({ paymentMethod: PaymentMethod.CASH, amount });
        }
    };

    return (
        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Banknote className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Pagos</h3>
                        <p className={`text-xs ${total <= 0 ? 'text-red-600 font-medium' : Math.abs(pendingAmount) < 0.01 ? 'text-green-600 font-medium' : 'text-amber-600'}`}>
                            {total <= 0
                                ? 'Total inválido: el descuento no puede superar el subtotal'
                                : Math.abs(pendingAmount) < 0.01
                                    ? 'Total cubierto'
                                    : `Faltan: ${formatCurrency(pendingAmount)}`
                            }
                        </p>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendPayment({ paymentMethod: PaymentMethod.CASH, amount: Math.max(pendingAmount, 0) })}
                    disabled={pendingAmount <= 0.01}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Pago
                </Button>
            </div>

            {/* Botonera de Billetes Rápidos */}
            {hasCashPayment && (
                <div className="p-3 bg-muted/40 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                            <Coins className="h-3.5 w-3.5 text-amber-500" /> Cobro Exprés / Billetes
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleQuickBill(0, true)}
                                className="text-xs text-muted-foreground hover:text-destructive underline"
                            >
                                Limpiar ($0)
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickBill(total, true)}
                                className="text-xs text-primary hover:underline font-bold bg-primary/10 px-2 py-0.5 rounded"
                            >
                                Monto Exacto (${total.toLocaleString('es-AR')})
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                        {QUICK_BILLS.map((bill) => (
                            <Button
                                key={bill}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickBill(bill, false)}
                                className="h-9 text-xs font-bold bg-background hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950 transition-all shadow-sm"
                            >
                                +${bill.toLocaleString('es-AR')}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Cartel de Vuelto Gigante */}
            {changeAmount > 0 && (
                <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white shadow-xl flex items-center justify-between border border-emerald-400/30 animate-in fade-in zoom-in-95 duration-200">
                    <div>
                        <span className="text-xs uppercase font-extrabold tracking-wider opacity-90 block mb-0.5">💵 Vuelto a Entregar</span>
                        <p className="text-3xl font-black tracking-tight drop-shadow-sm">{formatCurrency(changeAmount)}</p>
                    </div>
                    <div className="text-right">
                        <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none font-bold text-xs uppercase px-2.5 py-1">
                            Efectivo
                        </Badge>
                        <p className="text-[11px] opacity-80 mt-1">Abonó: {formatCurrency(cashAmount)}</p>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {paymentFields.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-lg">
                        No hay pagos registrados
                    </div>
                ) : (
                    paymentFields.map((field, index) => (
                        <div key={field.id} className="flex flex-col sm:flex-row gap-3 p-3 bg-muted/20 rounded-lg border">
                            <div className="flex-1 min-w-[140px]">
                                <FormField
                                    control={control}
                                    name={`payments.${index}.paymentMethod`}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger className="bg-background">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {paymentMethods?.map((method) => {
                                                    const Icon = PaymentMethodIcons[method.code as PaymentMethod] || Banknote;
                                                    return (
                                                        <SelectItem key={method.id} value={method.code}>
                                                            <div className="flex items-center gap-2">
                                                                <Icon className="h-4 w-4" />
                                                                <span>{method.name}</span>
                                                            </div>
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="flex gap-2 flex-1">
                                <FormField
                                    control={control}
                                    name={`payments.${index}.amount`}
                                    render={({ field }) => (
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                                            <NumericInput
                                                id={index === 0 ? "pos-payment-amount-input" : undefined}
                                                name={field.name}
                                                className="pl-7 bg-background"
                                                value={field.value}
                                                onFocus={(e) => e.target.select()}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Tab' && e.shiftKey && index === 0) {
                                                        e.preventDefault();
                                                        const productSearchBtn = document.getElementById('pos-product-search-button')
                                                            || document.querySelector<HTMLButtonElement>('[data-pos-product-search] button, [role="combobox"]');
                                                        if (productSearchBtn) {
                                                            productSearchBtn.focus();
                                                        }
                                                    }
                                                }}
                                                onChange={(e) => {
                                                    const val = Number.parseFloat(e.target.value) || 0;
                                                    field.onChange(val);
                                                }}
                                            />
                                        </div>
                                    )}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() => removePayment(index)}
                                    disabled={paymentFields.length === 1 && index === 0}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
