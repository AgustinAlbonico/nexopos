import { useState } from 'react';
import {
    ShoppingCart,
    Package,
    Minus,
    Plus,
    X,
    FileText,
    BadgePercent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form';
import { toast } from 'sonner';
import { Control, UseFormReturn } from 'react-hook-form';
import { CreateSaleFormValues } from '../schemas/sale.schema';

interface SaleItemsListProps {
    readonly items: CreateSaleFormValues['items'];
    readonly itemFields: readonly {
        id: string;
        header: string;
        accessor: string;
        cell?: (item: CreateSaleFormValues['items'][number]) => React.ReactNode;
    }[];
    readonly onUpdateQuantity: (index: number, delta: number) => void;
    readonly onRemoveItem: (index: number) => void;
    readonly subtotal: number;
    readonly control: Control<CreateSaleFormValues>;
    readonly form: UseFormReturn<CreateSaleFormValues>;
    readonly pendingItemIndex?: number | null;
    readonly onConfirmPending?: () => void;
    readonly onSelectItem?: (index: number) => void;
    readonly allowOutOfStockSale?: boolean;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

function ItemDiscountInput({
    form,
    index,
    gross,
}: {
    form: UseFormReturn<CreateSaleFormValues>;
    index: number;
    gross: number;
}) {
    const [mode, setMode] = useState<'PERCENT' | 'FIXED'>('PERCENT');
    const [percentValue, setPercentValue] = useState<number | string>(0);

    const applyDiscount = (amount: number, percent: number) => {
        form.setValue(`items.${index}.discount`, Number(amount.toFixed(2)));
        form.setValue(`items.${index}.discountPercent`, Number(percent.toFixed(2)));
    };

    return (
        <div
            className="flex items-center gap-0.5 bg-background rounded-lg border p-0.5"
            onClick={(e) => e.stopPropagation()}
            title="Descuento del ítem (F2)"
        >
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 px-0 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                aria-label={mode === 'PERCENT' ? 'Cambiar descuento a monto fijo' : 'Cambiar descuento a porcentaje'}
                onClick={() => setMode(mode === 'PERCENT' ? 'FIXED' : 'PERCENT')}
            >
                {mode === 'PERCENT' ? '%' : '$'}
            </Button>
            {mode === 'PERCENT' ? (
                <NumericInput
                    name={`items.${index}.discount`}
                    aria-label={`Descuento porcentual del ítem ${index + 1}`}
                    className="h-7 w-12 text-center border-0 bg-transparent text-xs"
                    value={percentValue}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            (e.target as HTMLInputElement).blur();
                        }
                    }}
                    onChange={(e) => {
                        if (e.target.value === '') {
                            setPercentValue('');
                            applyDiscount(0, 0);
                            return;
                        }
                        const raw = Number.parseFloat(e.target.value) || 0;
                        const capped = Math.min(100, Math.max(0, raw));
                        if (raw > 100) {
                            toast.error('El descuento no puede superar el 100%');
                        }
                        setPercentValue(capped);
                        applyDiscount((gross * capped) / 100, capped);
                    }}
                />
            ) : (
                <FormField
                    control={form.control}
                    name={`items.${index}.discount`}
                    render={({ field }) => (
                        <NumericInput
                            aria-label={`Descuento en pesos del ítem ${index + 1}`}
                            className="h-7 w-16 text-center border-0 bg-transparent text-xs"
                            value={field.value ?? 0}
                            placeholder="0"
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    (e.target as HTMLInputElement).blur();
                                }
                            }}
                            onChange={(e) => {
                                const raw = e.target.value === '' ? 0 : Number.parseFloat(e.target.value) || 0;
                                const capped = Math.min(gross, Math.max(0, raw));
                                if (raw > gross) {
                                    toast.error('El descuento no puede superar el subtotal del ítem');
                                }
                                field.onChange(capped);
                                form.setValue(`items.${index}.discountPercent`, gross > 0 ? Number(((capped / gross) * 100).toFixed(2)) : 0);
                            }}
                        />
                    )}
                />
            )}
        </div>
    );
}

export function SaleItemsList({
    items,
    itemFields,
    onUpdateQuantity,
    onRemoveItem,
    subtotal,
    control,
    form,
    pendingItemIndex,
    onConfirmPending,
    onSelectItem,
    allowOutOfStockSale = false,
}: SaleItemsListProps) {
    const [showNotes, setShowNotes] = useState(false);

    return (
        <div className="flex-1 bg-card border rounded-xl overflow-hidden flex flex-col">
            <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                        Productos ({items.length})
                    </span>
                </div>
                {items.length > 0 ? (
                    <span className="text-xs text-muted-foreground">
                        Subtotal: {formatCurrency(subtotal)}
                    </span>
                ) : null}
            </div>

            <div className="flex-1 overflow-auto p-2">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12">
                        <Package className="h-12 w-12 mb-3 opacity-20" />
                        <p className="text-sm">No hay productos agregados</p>
                        <p className="text-xs mt-1">Usá el buscador de arriba para agregar</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {itemFields.map((field, index) => {
                            const item = items[index];
                            const itemTotal = (item?.quantity || 0) * (item?.unitPrice || 0) - (item?.discount || 0);

                            const isPending = pendingItemIndex === index;

                            return (
                                <div
                                    key={field.id}
                                    onClick={() => onSelectItem?.(index)}
                                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors group cursor-pointer ${
                                        isPending
                                            ? 'bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-700 animate-pulse'
                                            : 'bg-muted/30 hover:bg-muted/50'
                                    }`}
                                >
                                    {/* Info del producto */}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate flex items-center gap-2">
                                            {item?.productName || 'Producto sin nombre'}
                                            {isPending && (
                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                                                    PENDIENTE
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                            <span>{formatCurrency(item?.unitPrice || 0)} c/u</span>
                                            {item?.stock === undefined ? null : (
                                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                                    Stock: {item.stock}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Controles de cantidad */}
                                    <div
                                        className="flex items-center gap-1 bg-background rounded-lg border p-1"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateQuantity(index, -1);
                                            }}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <FormField
                                            control={control}
                                            name={`items.${index}.quantity`}
                                            render={({ field }) => (
                                                <NumericInput
                                                    name={field.name}
                                                    ref={field.ref}
                                                    allowDecimals={false}
                                                    className="h-8 w-14 text-center border-0 bg-transparent"
                                                    value={field.value}
                                                    onFocus={(e) => {
                                                        onSelectItem?.(index);
                                                        e.target.select();
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            onConfirmPending?.();
                                                            const searchBtn = document.querySelector<HTMLButtonElement>('[data-pos-product-search] button')
                                                                || document.querySelector<HTMLButtonElement>('[role="combobox"]');
                                                            searchBtn?.click();
                                                        }
                                                    }}
                                                    onChange={(e) => {
                                                        const val = Number.parseInt(e.target.value) || 1;
                                                        const maxStock = item?.stock;
                                                        if (!allowOutOfStockSale && maxStock !== undefined && val > maxStock) {
                                                            toast.error(`Stock máximo: ${maxStock}`);
                                                            field.onChange(maxStock);
                                                            return;
                                                        }
                                                        field.onChange(val);
                                                    }}
                                                />
                                            )}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdateQuantity(index, 1);
                                            }}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    {/* Descuento del ítem */}
                                    <ItemDiscountInput
                                        form={form}
                                        index={index}
                                        gross={(item?.quantity || 0) * (item?.unitPrice || 0)}
                                    />

                                    {/* Total del item */}
                                    <div className="w-24 text-right">
                                        <span className={`font-semibold ${itemTotal < 0 ? 'text-red-600' : ''}`}>
                                            {formatCurrency(itemTotal)}
                                        </span>
                                        {(item?.discount || 0) > 0 ? (
                                            <span className="block text-[10px] text-red-500 leading-tight">
                                                <BadgePercent className="inline h-2.5 w-2.5 mr-0.5" />
                                                -{formatCurrency(item.discount || 0)}
                                            </span>
                                        ) : null}
                                    </div>

                                    {/* Eliminar */}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveItem(index);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Notas (colapsable) */}
            <div className="border-t">
                <button
                    type="button"
                    onClick={() => setShowNotes(!showNotes)}
                    className="w-full p-2 text-xs text-muted-foreground hover:bg-muted/50 flex items-center justify-center gap-1"
                >
                    <FileText className="h-3 w-3" />
                    {showNotes ? 'Ocultar notas' : 'Agregar notas'}
                </button>
                {showNotes ? (
                    <div className="p-3 pt-0">
                        <FormField
                            control={control}
                            name="notes"
                            render={({ field }) => (
                                <Textarea
                                    placeholder="Observaciones de la venta..."
                                    className="resize-none text-sm"
                                    rows={2}
                                    {...field}
                                />
                            )}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
