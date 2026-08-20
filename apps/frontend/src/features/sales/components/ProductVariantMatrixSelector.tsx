import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shirt, Layers, X, Plus, Check } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { productsApi } from '@/features/products/api/products.api';
import { Product } from '@/features/products/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface ProductVariantMatrixSelectorProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly onSelectVariant: (variant: Product) => void;
    readonly allowOutOfStockSale?: boolean;
}

export function ProductVariantMatrixSelector({
    open,
    onOpenChange,
    onSelectVariant,
    allowOutOfStockSale = false,
}: ProductVariantMatrixSelectorProps) {
    const [selectedParentId, setSelectedParentId] = useState<string>('');
    const [lastAddedId, setLastAddedId] = useState<string | null>(null);

    // Obtener lista de productos padre (modelos)
    const { data: parentsData, isLoading: loadingParents } = useQuery({
        queryKey: ['parent-products'],
        queryFn: () => productsApi.getAll({ limit: 100 }),
        enabled: open,
    });

    const parentProducts = useMemo(() => {
        return (parentsData?.data || []).filter((p) => p.isVariantParent);
    }, [parentsData]);

    // Seleccionar automáticamente el primer padre cuando cargue la lista
    const effectiveParentId = selectedParentId || (parentProducts.find((p) => p.name.includes('Manual Direct'))?.id ?? parentProducts[0]?.id ?? '');

    // Obtener producto padre completo con sus variantes
    const { data: parentProduct, isLoading: loadingParentDetail } = useQuery({
        queryKey: ['product-with-variants', effectiveParentId],
        queryFn: async () => {
            if (!effectiveParentId) return null;
            const parent = await productsApi.getOne(effectiveParentId);
            if (parent.variants && parent.variants.length > 0) {
                return parent;
            }
            const allProds = await productsApi.getAll({ limit: 100 });
            const children = allProds.data.filter((p) => p.parentProductId === effectiveParentId);
            return { ...parent, variants: children };
        },
        enabled: !!effectiveParentId && open,
        staleTime: 0,
        gcTime: 0,
    });

    const variants = parentProduct?.variants || [];

    // Extraer matriz de talles y colores a partir de los nombres / atributos de variantes
    const { sizes, colors, matrixMap } = useMemo(() => {
        const sizeSet = new Set<string>();
        const colorSet = new Set<string>();
        const map = new Map<string, Product>();

        for (const variant of variants) {
            let size = 'Único';
            let color = 'Estándar';

            // Buscar en variantAttributes si existen
            if (variant.variantAttributes && variant.variantAttributes.length > 0) {
                for (const attr of variant.variantAttributes) {
                    const key = attr.attributeKey.toLowerCase();
                    if (key === 'size' || key === 'talle' || key === 'talla') {
                        size = attr.attributeValue;
                    } else if (key === 'color' || key === 'tono') {
                        color = attr.attributeValue;
                    }
                }
            } else {
                // Fallback: parsear desde el nombre si sigue convención "Modelo Talle Color"
                const parts = variant.name.replace(parentProduct?.name || '', '').trim().split(' ');
                if (parts.length >= 2) {
                    size = parts[0];
                    color = parts.slice(1).join(' ');
                } else if (parts.length === 1 && parts[0]) {
                    size = parts[0];
                }
            }

            sizeSet.add(size);
            colorSet.add(color);
            map.set(`${color}__${size}`, variant);
        }

        return {
            sizes: Array.from(sizeSet),
            colors: Array.from(colorSet),
            matrixMap: map,
        };
    }, [variants, parentProduct?.name]);

    const handleCellClick = (variant: Product) => {
        if (!allowOutOfStockSale && variant.stock <= 0) {
            toast.error(`Sin stock disponible para ${variant.name}`);
            return;
        }

        onSelectVariant(variant);
        setLastAddedId(variant.id);
        toast.success(`Agregado: ${variant.name}`, { duration: 1500 });
        setTimeout(() => setLastAddedId(null), 1200);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Shirt className="h-5 w-5 text-primary" />
                            <DialogTitle>Selector Visual de Talles y Colores</DialogTitle>
                        </div>
                    </div>
                    <DialogDescription>
                        Seleccioná el modelo y hacé clic en el talle y color para sumarlo a la venta.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 my-2 overflow-y-auto flex-1 pr-1">
                    {/* Selector de Producto Padre */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-muted/40 p-3 rounded-lg border">
                        <div className="w-full sm:w-2/3">
                            <label htmlFor="model-select" className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
                                Modelo / Prenda Padre
                            </label>
                            {loadingParents ? (
                                <p className="text-sm text-muted-foreground">Cargando modelos...</p>
                            ) : parentProducts.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No hay modelos con variantes creados.</p>
                            ) : (
                                <select
                                    id="model-select"
                                    value={effectiveParentId}
                                    onChange={(e) => setSelectedParentId(e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {parentProducts.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} {p.season ? `(${p.season})` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {parentProduct && (
                            <div className="flex flex-col items-end text-xs text-muted-foreground">
                                <span>{variants.length} variantes configuradas</span>
                                {parentProduct.price ? (
                                    <span className="font-bold text-base text-foreground">
                                        {formatCurrency(parentProduct.price)}
                                    </span>
                                ) : null}
                            </div>
                        )}
                    </div>

                    {/* Grilla 2D Matriz de Variantes */}
                    {loadingParentDetail ? (
                        <div className="p-12 text-center text-muted-foreground">
                            Cargando matriz de variantes...
                        </div>
                    ) : variants.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                            <Layers className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p className="font-medium">Este modelo no tiene variantes generadas.</p>
                            <p className="text-xs mt-1">Generá la matriz desde la sección de Productos.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto border rounded-lg bg-card">
                            <table className="w-full text-sm text-center border-collapse">
                                <thead>
                                    <tr className="bg-muted/60 border-b">
                                        <th className="p-3 text-left font-semibold text-xs text-muted-foreground uppercase border-r">
                                            Color \ Talle
                                        </th>
                                        {sizes.map((size) => (
                                            <th key={size} className="p-3 font-bold text-xs uppercase min-w-[90px]">
                                                {size}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {colors.map((color) => (
                                        <tr key={color} className="border-b hover:bg-muted/10 transition-colors">
                                            <td className="p-3 text-left font-semibold text-xs uppercase border-r bg-muted/20">
                                                {color}
                                            </td>
                                            {sizes.map((size) => {
                                                const variant = matrixMap.get(`${color}__${size}`);
                                                if (!variant) {
                                                    return (
                                                        <td key={size} className="p-2 text-muted-foreground/30">
                                                            —
                                                        </td>
                                                    );
                                                }

                                                const isOutOfStock = variant.stock <= 0;
                                                const isRecentlyAdded = lastAddedId === variant.id;

                                                return (
                                                    <td key={size} className="p-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCellClick(variant)}
                                                            disabled={isOutOfStock && !allowOutOfStockSale}
                                                            className={`w-full p-2 rounded-md border flex flex-col items-center justify-center gap-1 transition-all ${
                                                                isRecentlyAdded
                                                                    ? 'bg-emerald-500 text-white border-emerald-600 scale-95'
                                                                    : isOutOfStock
                                                                    ? 'bg-muted/40 text-muted-foreground border-transparent opacity-60 cursor-not-allowed'
                                                                    : 'bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm active:scale-95'
                                                            }`}
                                                        >
                                                            {isRecentlyAdded ? (
                                                                <Check className="h-4 w-4 stroke-[3]" />
                                                            ) : (
                                                                <span className="font-bold text-xs">
                                                                    {formatCurrency(variant.price)}
                                                                </span>
                                                            )}
                                                            <Badge
                                                                variant={isOutOfStock ? 'destructive' : 'secondary'}
                                                                className="text-[10px] px-1 py-0 h-4"
                                                            >
                                                                {variant.stock} u.
                                                            </Badge>
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t mt-auto">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Listo / Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
