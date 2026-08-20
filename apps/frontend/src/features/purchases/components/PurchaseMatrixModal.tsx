import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/features/products/types';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/features/products/api/products.api';
import { Layers, Plus, Sparkles, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

interface PurchaseMatrixModalProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onAddVariantsToPurchase: (items: Array<{ product: Product; quantity: number; unitCost: number }>) => void;
}

export function PurchaseMatrixModal({
    open,
    onClose,
    onAddVariantsToPurchase,
}: PurchaseMatrixModalProps) {
    const [selectedParentId, setSelectedParentId] = useState<string>('');
    const [matrixQuantities, setMatrixQuantities] = useState<Record<string, number>>({});
    const [defaultCost, setDefaultCost] = useState<number>(0);

    const { data: productsData } = useQuery({
        queryKey: ['products', 'matrix-parents'],
        queryFn: () => productsApi.getAll({ limit: 1000 }),
    });

    const allProducts = productsData?.data || [];
    const parentProducts = allProducts.filter((p) => p.isVariantParent);
    const selectedParent = allProducts.find((p) => p.id === selectedParentId);

    // Variantes pertenecientes a este producto padre
    const childVariants = selectedParentId
        ? allProducts.filter((p) => p.parentProductId === selectedParentId)
        : [];

    const handleQuantityChange = (variantId: string, qty: number) => {
        setMatrixQuantities((prev) => ({
            ...prev,
            [variantId]: Math.max(0, qty),
        }));
    };

    const setUniformQuantity = (qty: number) => {
        const updated: Record<string, number> = {};
        for (const v of childVariants) {
            updated[v.id] = qty;
        }
        setMatrixQuantities(updated);
    };

    const handleAddItems = () => {
        const itemsToAdd: Array<{ product: Product; quantity: number; unitCost: number }> = [];

        for (const v of childVariants) {
            const qty = matrixQuantities[v.id] ?? 0;
            if (qty > 0) {
                itemsToAdd.push({
                    product: v,
                    quantity: qty,
                    unitCost: defaultCost > 0 ? defaultCost : (v.cost || selectedParent?.cost || 0),
                });
            }
        }

        if (itemsToAdd.length === 0) {
            toast.error('Ingresá una cantidad mayor a 0 para al menos una variante');
            return;
        }

        onAddVariantsToPurchase(itemsToAdd);
        toast.success(`Se agregaron ${itemsToAdd.length} variantes a la orden de compra`);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-primary">
                        <ShoppingBag className="h-5 w-5" />
                        <DialogTitle>Carga de Compra por Curva / Matriz de Talles</DialogTitle>
                    </div>
                    <DialogDescription>
                        Ingresá cantidades masivas por variante para cargar una curva completa de producto en un solo paso.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Selector de Producto Padre */}
                    <div className="space-y-2">
                        <Label className="font-semibold text-sm">1. Seleccionar Modelo / Producto Padre</Label>
                        <select
                            value={selectedParentId}
                            onChange={(e) => {
                                setSelectedParentId(e.target.value);
                                setMatrixQuantities({});
                                const parent = allProducts.find((p) => p.id === e.target.value);
                                if (parent) setDefaultCost(parent.cost || 0);
                            }}
                            className="w-full h-10 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">-- Seleccionar producto padre --</option>
                            {parentProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} {p.brand ? `(${p.brand.name})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedParent ? (
                        <>
                            {/* Costo Unitario por defecto */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Costo Unitario por Defecto ($)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={defaultCost}
                                        onChange={(e) => setDefaultCost(Number.parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col justify-end">
                                    <Label className="text-xs text-muted-foreground mb-1">Cargar Curva Uniforme</Label>
                                    <div className="flex gap-1.5">
                                        {[1, 2, 3, 5, 10].map((n) => (
                                            <Button
                                                key={n}
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setUniformQuantity(n)}
                                                className="text-xs h-9 px-2.5"
                                            >
                                                +{n} c/u
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Grilla de Variantes */}
                            <div className="space-y-2 pt-2 border-t">
                                <div className="flex items-center justify-between">
                                    <Label className="font-semibold text-sm">2. Cantidades por Variante ({childVariants.length} disponibles)</Label>
                                </div>

                                {childVariants.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                                        {childVariants.map((variant) => (
                                            <div
                                                key={variant.id}
                                                className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <p className="text-sm font-medium truncate">{variant.name}</p>
                                                    <p className="text-xs text-muted-foreground">Stock actual: {variant.stock}</p>
                                                </div>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    className="w-20 text-center font-bold"
                                                    placeholder="0"
                                                    value={matrixQuantities[variant.id] ?? ''}
                                                    onChange={(e) => handleQuantityChange(variant.id, Number.parseInt(e.target.value, 10) || 0)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground py-4 text-center">
                                        Este producto no tiene variantes generadas. Podés generarlas desde la sección de Productos.
                                    </p>
                                )}
                            </div>
                        </>
                    ) : null}
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleAddItems}
                        disabled={!selectedParentId || childVariants.length === 0}
                        className="gap-2 font-semibold"
                    >
                        <Layers className="h-4 w-4" />
                        Agregar Curva a la Compra
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
