import { useState } from 'react';
import { Control } from 'react-hook-form';
import {
    ShoppingCart,
    Package,
    Minus,
    Plus,
    X,
    FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form';
import { toast } from 'sonner';
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
    readonly pendingItemIndex?: number | null;
    readonly onConfirmPending?: () => void;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
}

export function SaleItemsList({
    items,
    itemFields,
    onUpdateQuantity,
    onRemoveItem,
    subtotal,
    control,
    pendingItemIndex,
    onConfirmPending,
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
                                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors group ${
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
                                    <div className="flex items-center gap-1 bg-background rounded-lg border p-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => onUpdateQuantity(index, -1)}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <FormField
                                            control={control}
                                            name={`items.${index}.quantity`}
                                            render={({ field }) => (
                                                <NumericInput
                                                    allowDecimals={false}
                                                    className="h-8 w-14 text-center border-0 bg-transparent"
                                                    value={field.value}
                                                    onFocus={(e) => e.target.select()}
                                                    onChange={(e) => {
                                                        const val = Number.parseInt(e.target.value) || 1;
                                                        const maxStock = item?.stock;
                                                        if (maxStock !== undefined && val > maxStock) {
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
                                            onClick={() => onUpdateQuantity(index, 1)}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    {/* Total del item */}
                                    <div className="w-24 text-right">
                                        <span className="font-semibold">
                                            {formatCurrency(itemTotal)}
                                        </span>
                                    </div>

                                    {/* Eliminar */}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => onRemoveItem(index)}
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
