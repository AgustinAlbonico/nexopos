import { useState } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { ProductList } from '@/features/products/components/ProductList';
import { ProductForm } from '@/features/products/components/ProductForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Plus,
    Tags,
    Percent,
    Pencil,
    Trash2,
    Package,
    Tag,
    Boxes,
    TrendingUp,
    DollarSign,
    FileText,
    CheckCircle2,
    XCircle,
    AlertTriangle,
} from 'lucide-react';
import { FormDialog } from '@/components/ui/form-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '@/features/products/api/products.api';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { Product, Category, CreateCategoryDTO } from '@/features/products/types';
import { ProductFormValues } from '@/features/products/schemas/product.schema';
import { NumericInput } from '@/components/ui/numeric-input';
import { formatCurrency } from '@/lib/utils';

interface Configuration {
    minStockAlert: number;
    barcodeScannerEnabled: boolean;
    barcodeScannerTimeoutMs: number;
}

const EMPTY_CREATE_DEFAULTS: ProductFormValues = {
    name: '',
    description: null,
    barcode: null,
    cost: 0,
    stock: 0,
    categoryId: null,
    isActive: true,
    useCustomMargin: false,
    customProfitMargin: undefined,
    brandName: null,
};

/**
 * Modal read-only para ver detalle de un producto (movido desde ProductList
 * para que pueda ser disparado también por el escaneo de código de barras).
 */
function ProductDetailDialog({
    product,
    open,
    onClose,
    globalMinStock = 5,
}: {
    readonly product: Product | null;
    readonly open: boolean;
    readonly onClose: () => void;
    readonly globalMinStock?: number;
}) {
    if (!product) return null;

    const margin = product.profitMargin ?? 0;
    const ganancia = product.price - product.cost;
    const isLowStock = product.stock <= globalMinStock && product.stock > 0;
    const isOutOfStock = product.stock === 0;

    const getStockStatus = () => {
        if (isOutOfStock) return { label: 'Sin Stock', variant: 'destructive' as const, className: 'bg-red-500/10 text-red-600 border-red-200' };
        if (isLowStock) return { label: 'Stock Bajo', variant: 'outline' as const, className: 'bg-yellow-500/10 text-yellow-600 border-yellow-300' };
        return { label: 'En Stock', variant: 'outline' as const, className: 'bg-green-500/10 text-green-600 border-green-300' };
    };
    const stockStatus = getStockStatus();

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
                <div className="bg-gradient-to-br from-primary/90 via-primary to-primary/80 px-6 py-5 text-primary-foreground">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Package className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold tracking-tight truncate">
                                {product.name}
                            </h2>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                {product.category ? (
                                    <div
                                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-full backdrop-blur-sm"
                                        style={{
                                            backgroundColor: product.category.color ? `${product.category.color}40` : 'rgba(255,255,255,0.1)',
                                            border: product.category.color ? `1px solid ${product.category.color}60` : 'none'
                                        }}
                                    >
                                        <Tag className="h-3.5 w-3.5 opacity-80" />
                                        <span className="text-sm font-medium opacity-90">{product.category.name}</span>
                                    </div>
                                ) : null}
                                {product.brand ? (
                                    <div className="flex items-center gap-1.5 bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                        <Boxes className="h-3.5 w-3.5 opacity-80" />
                                        <span className="text-sm font-medium opacity-90">{product.brand.name}</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {product.description ? (
                        <div className="rounded-xl bg-muted/40 p-4 border border-border/50">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Descripción
                                </span>
                            </div>
                            <p className="text-sm leading-relaxed">{product.description}</p>
                        </div>
                    ) : null}

                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Información de Precios
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-200 dark:border-slate-800">
                                <p className="text-xs text-muted-foreground mb-1">Costo</p>
                                <p className="text-lg font-semibold">{formatCurrency(product.cost)}</p>
                            </div>

                            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-800/50">
                                <div className="flex items-center gap-1 mb-1">
                                    <TrendingUp className="h-3 w-3 text-blue-500" />
                                    <p className="text-xs text-blue-600 dark:text-blue-400">Margen</p>
                                </div>
                                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                                    {margin.toFixed(1)}%
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 p-4 border border-emerald-200 dark:border-emerald-800/50 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-0.5">
                                        Precio de Venta
                                    </p>
                                    <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                                        Ganancia: {formatCurrency(ganancia)}/unidad
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(product.price)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Boxes className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Inventario y Estado
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className={`rounded-lg p-3 border transition-colors ${(() => {
                                if (isOutOfStock) return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50';
                                if (isLowStock) return 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800/50';
                                return 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800';
                            })()
                                }`}>
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-xs text-muted-foreground">Stock Actual</p>
                                    {(isLowStock || isOutOfStock) ? (
                                        <AlertTriangle className={`h-3.5 w-3.5 ${isOutOfStock ? 'text-red-500' : 'text-yellow-500'}`} />
                                    ) : null}
                                </div>
                                <p className={`text-lg font-semibold ${(() => {
                                    if (isOutOfStock) return 'text-red-600 dark:text-red-400';
                                    if (isLowStock) return 'text-yellow-600 dark:text-yellow-400';
                                    return '';
                                })()
                                    }`}>
                                    {product.stock} <span className="text-sm font-normal text-muted-foreground">unidades</span>
                                </p>
                            </div>

                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-200 dark:border-slate-800">
                                <p className="text-xs text-muted-foreground mb-1">Estado</p>
                                <div className="flex items-center gap-2">
                                    {product.isActive ? (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            <span className="text-sm font-medium text-green-600 dark:text-green-400">Activo</span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="h-4 w-4 text-slate-400" />
                                            <span className="text-sm font-medium text-muted-foreground">Inactivo</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center pt-2">
                            <Badge
                                variant={stockStatus.variant}
                                className={`${stockStatus.className} px-4 py-1`}
                            >
                                {stockStatus.label}
                            </Badge>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Página de Productos - Gestión completa de productos y stock
 */
export default function ProductsPage() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [viewProduct, setViewProduct] = useState<Product | null>(null);
    const [createBarcode, setCreateBarcode] = useState<string | null>(null);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);

    // Estado para crear/editar categorías
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryMargin, setNewCategoryMargin] = useState<number | undefined>(undefined);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editCategoryName, setEditCategoryName] = useState('');
    const [editCategoryMargin, setEditCategoryMargin] = useState<number | undefined>(undefined);

    const queryClient = useQueryClient();
    const confirm = useConfirm();

    // Query para categorías
    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => categoriesApi.getAll(),
    });

    // Query para configuración global (toggles del scanner + min stock)
    const { data: config } = useQuery<Configuration>({
        queryKey: ['configuration'],
        queryFn: async () => {
            const res = await api.get('/api/configuration');
            return res.data;
        },
    });
    const globalMinStock = config?.minStockAlert ?? 5;
    const scannerEnabled = config?.barcodeScannerEnabled ?? false;
    const scannerTimeoutMs = config?.barcodeScannerTimeoutMs ?? 100;

    // Scanner deshabilitado cuando hay cualquier modal abierto
    const modalOpen =
        isCreateOpen ||
        !!editingProduct ||
        !!viewProduct ||
        isCategoryOpen ||
        !!editingCategory;
    const scannerActive = scannerEnabled && !modalOpen;

    // Handler de scan: bifurca según existencia
    // El backend devuelve 200 con null cuando el barcode no existe
    // (contrato de findByBarcode: Promise<Product | null>).
    const handleBarcodeScan = async (barcode: string) => {
        try {
            const existing = await productsApi.findByBarcode(barcode);
            if (existing) {
                setViewProduct(existing);
            } else {
                setCreateBarcode(barcode);
                setIsCreateOpen(true);
            }
        } catch {
            toast.error('Error al buscar el código', {
                description: 'No se pudo consultar el producto. Intentá de nuevo.',
            });
        }
    };

    useBarcodeScanner({
        enabled: scannerActive,
        timeoutMs: scannerTimeoutMs,
        onScan: handleBarcodeScan,
    });

    const createMutation = useMutation({
        mutationFn: productsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Producto creado');
            setIsCreateOpen(false);
        },
        onError: () => {
            toast.error('Error al crear producto');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: ProductFormValues }) =>
            productsApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Producto actualizado');
            setEditingProduct(null);
        },
        onError: () => {
            toast.error('Error al actualizar producto');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: productsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Producto eliminado');
        },
        onError: () => {
            toast.error('Error al eliminar producto');
        },
    });

    const createCategoryMutation = useMutation({
        mutationFn: categoriesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Categoría creada');
            setNewCategoryName('');
            setNewCategoryMargin(undefined);
        },
        onError: () => {
            toast.error('Error al crear categoría');
        },
    });

    const updateCategoryMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreateCategoryDTO> }) =>
            categoriesApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Categoría actualizada');
            setEditingCategory(null);
        },
        onError: () => {
            toast.error('Error al actualizar categoría');
        },
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: categoriesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Categoría eliminada');
        },
        onError: () => {
            toast.error('Error al eliminar categoría');
        },
    });

    const handleCreate = (data: ProductFormValues) => {
        createMutation.mutate(data);
    };

    const handleUpdate = (data: ProductFormValues) => {
        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct.id, data });
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Eliminar producto',
            description: '¿Estás seguro de eliminar este producto?',
            variant: 'danger',
            confirmLabel: 'Eliminar',
        });
        if (confirmed) {
            deleteMutation.mutate(id);
        }
    };

    const handleCreateCategory = () => {
        if (!newCategoryName.trim()) {
            toast.error('Ingresá un nombre para la categoría');
            return;
        }
        createCategoryMutation.mutate({
            name: newCategoryName.trim(),
            profitMargin: newCategoryMargin ?? null,
        });
    };

    const handleUpdateCategory = () => {
        if (!editingCategory) return;
        if (!editCategoryName.trim()) {
            toast.error('Ingresá un nombre para la categoría');
            return;
        }
        updateCategoryMutation.mutate({
            id: editingCategory.id,
            data: {
                name: editCategoryName.trim(),
                profitMargin: editCategoryMargin ?? null,
            },
        });
    };

    const startEditCategory = (category: Category) => {
        setEditingCategory(category);
        setEditCategoryName(category.name);
        setEditCategoryMargin(category.profitMargin ?? undefined);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Productos</h1>
                    <p className="text-muted-foreground">
                        Cargá productos con nombre, costo y stock
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* Botón Categorías */}
                    <Dialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Tags className="mr-2 h-4 w-4" />
                                Categorías
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Categorías de Productos</DialogTitle>
                                <DialogDescription>
                                    Organizá tus productos por categorías. Podés asignar un % de ganancia a cada categoría.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                {/* Lista de categorías existentes */}
                                <div className="space-y-3">
                                    <Label>Categorías actuales</Label>
                                    {categories && categories.length > 0 ? (
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                            {categories.map((cat) => (
                                                <div
                                                    key={cat.id}
                                                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-4 h-4 rounded-full"
                                                            style={{ backgroundColor: cat.color || '#6b7280' }}
                                                        />
                                                        <div>
                                                            <p className="font-medium">{cat.name}</p>
                                                            {cat.profitMargin !== null && cat.profitMargin !== undefined ? (
                                                                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                                                    <Percent className="h-3 w-3" />
                                                                    {cat.profitMargin}% de ganancia
                                                                </p>
                                                            ) : (
                                                                <p className="text-xs text-muted-foreground">
                                                                    Usa margen general
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => startEditCategory(cat)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={async () => {
                                                                try {
                                                                    // Obtener preview antes de confirmar
                                                                    const preview = await categoriesApi.getDeletionPreview(cat.id);

                                                                    const confirmed = await confirm({
                                                                        title: 'Eliminar categoría',
                                                                        description: (
                                                                            <div className="space-y-3 pt-2">
                                                                                <p>
                                                                                    ¿Estás seguro de eliminar la categoría <strong>"{cat.name}"</strong>?
                                                                                </p>
                                                                                <div className="bg-muted p-3 rounded-md text-sm space-y-2 border">
                                                                                    <p className="flex items-center gap-2">
                                                                                        <Package className="h-4 w-4 text-primary" />
                                                                                        <span>Productos en esta categoría: <strong>{preview.productCount}</strong></span>
                                                                                    </p>
                                                                                    {preview.productCount > 0 && (
                                                                                        <>
                                                                                            <p className="text-muted-foreground ml-6">
                                                                                                • Los productos perderán esta categoría.
                                                                                            </p>
                                                                                            <p className="text-muted-foreground ml-6">
                                                                                                • {preview.affectedProductsCount} productos sin margen personalizado usarán el <strong>margen global ({preview.globalMargin}%)</strong>.
                                                                                            </p>
                                                                                            <p className="text-muted-foreground ml-6">
                                                                                                • Productos con margen personalizado mantendrán su precio actual.
                                                                                            </p>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-sm font-medium text-destructive">
                                                                                    Esta acción no se puede deshacer.
                                                                                </p>
                                                                            </div>
                                                                        ),
                                                                        variant: 'danger',
                                                                        confirmLabel: 'Eliminar Categoría y Actualizar Productos',
                                                                    });

                                                                    if (confirmed) {
                                                                        deleteCategoryMutation.mutate(cat.id);
                                                                    }
                                                                } catch (error) {
                                                                    toast.error('Error al obtener información de la categoría');
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                                            No hay categorías creadas
                                        </p>
                                    )}
                                </div>

                                {/* Crear nueva categoría */}
                                <div className="space-y-3 pt-4 border-t">
                                    <Label>Nueva categoría</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label htmlFor="categoryName" className="text-xs text-muted-foreground">Nombre</Label>
                                            <Input
                                                id="categoryName"
                                                placeholder="Ej: Bebidas"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="categoryMargin" className="text-xs text-muted-foreground">% Ganancia (opcional)</Label>
                                            <div className="flex gap-2">
                                                <NumericInput
                                                    id="categoryMargin"
                                                    placeholder="Ej: 30"
                                                    value={newCategoryMargin ?? ''}
                                                    onChange={(e) => setNewCategoryMargin(e.target.value === '' ? undefined : Number.parseFloat(e.target.value) || 0)}
                                                />
                                                <Button
                                                    onClick={handleCreateCategory}
                                                    disabled={createCategoryMutation.isPending}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Si no asignás un % de ganancia, los productos usarán el margen general del sistema.
                                    </p>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Diálogo para editar categoría */}
                    <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
                        <DialogContent className="sm:max-w-[400px]">
                            <DialogHeader>
                                <DialogTitle>Editar Categoría</DialogTitle>
                                <DialogDescription>
                                    Modificá el nombre y % de ganancia de la categoría
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="editCategoryName">Nombre</Label>
                                    <Input
                                        id="editCategoryName"
                                        value={editCategoryName}
                                        onChange={(e) => setEditCategoryName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="editCategoryMargin">% de Ganancia</Label>
                                    <div className="flex items-center gap-2">
                                        <NumericInput
                                            id="editCategoryMargin"
                                            placeholder="Ej: 30 (dejar vacío para usar margen general)"
                                            value={editCategoryMargin ?? ''}
                                            onChange={(e) => setEditCategoryMargin(e.target.value === '' ? undefined : Number.parseFloat(e.target.value) || 0)}
                                        />
                                        <span className="text-muted-foreground">%</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Dejar vacío para que los productos usen el margen general del sistema.
                                        Al cambiar este valor, los precios de los productos de esta categoría se recalcularán.
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setEditingCategory(null)}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleUpdateCategory}
                                    disabled={updateCategoryMutation.isPending}
                                >
                                    {updateCategoryMutation.isPending ? 'Guardando...' : 'Guardar'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Botón Nuevo Producto */}
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Producto
                    </Button>
                </div>
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-6">
                <ProductList
                    onEdit={setEditingProduct}
                    onDelete={handleDelete}
                    onView={setViewProduct}
                />
            </div>

            {/* Modal de creación premium */}
            <FormDialog
                open={isCreateOpen}
                onOpenChange={(open) => {
                    setIsCreateOpen(open);
                    if (!open) setCreateBarcode(null);
                }}
                title="Nuevo Producto"
                description="El precio se calcula automático según la configuración o categoría"
                icon={Package}
                variant="success"
                maxWidth="md"
            >
                <ProductForm
                    key={createBarcode ?? 'create'}
                    initialData={createBarcode ? { ...EMPTY_CREATE_DEFAULTS, barcode: createBarcode } : undefined}
                    onSubmit={handleCreate}
                    isLoading={createMutation.isPending}
                />
            </FormDialog>

            {/* Modal de edición premium */}
            <FormDialog
                open={!!editingProduct}
                onOpenChange={(open) => !open && setEditingProduct(null)}
                title="Editar Producto"
                description="Modificá el costo o stock del producto"
                icon={Package}
                variant="success"
                maxWidth="md"
            >
                {editingProduct ? (
                    <ProductForm
                        initialData={{
                            name: editingProduct.name,
                            description: editingProduct.description,
                            barcode: editingProduct.barcode ?? null,
                            cost: editingProduct.cost,
                            stock: editingProduct.stock,
                            categoryId: editingProduct.categoryId || null,
                            isActive: editingProduct.isActive,
                            useCustomMargin: editingProduct.useCustomMargin ?? false,
                            customProfitMargin: editingProduct.useCustomMargin ? editingProduct.profitMargin : undefined,
                        }}
                        onSubmit={handleUpdate}
                        isLoading={updateMutation.isPending}
                        isEditing
                        currentProductId={editingProduct.id}
                    />
                ) : null}
            </FormDialog>

            {/* Vista detalle (disparada por scan o por menú de fila) */}
            <ProductDetailDialog
                product={viewProduct}
                open={!!viewProduct}
                onClose={() => setViewProduct(null)}
                globalMinStock={globalMinStock}
            />
        </div>
    );
}

