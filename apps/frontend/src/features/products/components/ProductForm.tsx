import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, ProductFormValues } from '../schemas/product.schema';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NumericInput } from '@/components/ui/numeric-input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCapabilities } from '@/hooks/useCapabilities';
import { toast } from 'sonner';
import { categoriesApi, productsApi } from '../api/products.api';
import { api } from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';
import { Percent, Info, Tag, Plus, Loader2, Sparkles, Layers, Shirt } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { BrandCombobox } from './BrandCombobox';
import { ApparelTechnicalSheet } from './ApparelTechnicalSheet';
import { ProductVariantMatrixGrid } from './ProductVariantMatrixGrid';
import { ApparelMatrixCellDTO } from '../types';

interface ProductFormProps {
    readonly initialData?: ProductFormValues;
    readonly onSubmit: (data: ProductFormValues) => void;
    readonly isLoading?: boolean;
    readonly isEditing?: boolean;
    readonly currentProductId?: string;
    readonly onSuccess?: () => void;
}

/**
 * Formulario de producto con dos modos:
 *
 * 1. Modo Precio Fijo (default ON): el usuario carga el precio de venta directamente.
 *    El costo es opcional. No se aplica jerarquía de márgenes.
 *
 * 2. Modo Calculado (default OFF): el usuario carga el costo y el sistema calcula
 *    el precio desde el margen efectivo (personalizado > categoría > general).
 */
export function ProductForm({ initialData, onSubmit, isLoading, isEditing, currentProductId, onSuccess }: ProductFormProps) {
    const [defaultMargin, setDefaultMargin] = useState<number>(30);
    const [isMatrixMode, setIsMatrixMode] = useState<boolean>(false);
    const [matrixStyleCode, setMatrixStyleCode] = useState<string>('');
    const [matrixCells, setMatrixCells] = useState<ApparelMatrixCellDTO[]>([]);
    const [isSubmittingMatrix, setIsSubmittingMatrix] = useState<boolean>(false);

    // Obtener el % de ganancia por defecto de la configuración
    useEffect(() => {
        api.get('/api/configuration')
            .then(res => {
                const margin = Number(res.data.defaultProfitMargin);
                setDefaultMargin(margin);
            })
            .catch(() => setDefaultMargin(30));
    }, []);

    // Detectar modo inicial: si initialData es de un producto existente que NO usa manual price
    // (productos cargados antes de esta feature), defaulteamos a manual=true (nuevo comportamiento).
    const initialUseManualPrice = initialData?.useManualPrice ?? true;

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: initialData
            ? { ...initialData, useManualPrice: initialUseManualPrice }
            : {
                name: '',
                description: null,
                barcode: null,
                isMeasure: false,
                tareGrams: null,
                variableBarcodeFormat: null,
                cost: null,
                price: undefined,
                stock: 0,
                categoryId: null,
                isActive: true,
                useManualPrice: true,
                useCustomMargin: false,
                customProfitMargin: undefined,
                brandName: null,
                season: null,
                collection: null,
            },
    });

    const { data: capabilitiesData } = useCapabilities();
    const hasVariantsCapability = capabilitiesData?.capabilities['STRUCTURAL.variants'] ?? false;

    const queryClient = useQueryClient();
    const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryMargin, setNewCategoryMargin] = useState<number | undefined>(undefined);

    const { data: categories } = useQuery({
        queryKey: ['categories', 'active'],
        queryFn: () => categoriesApi.getActive(),
    });

    const { data: apparelSuggestions } = useQuery({
        queryKey: ['products', 'apparel-suggestions'],
        queryFn: () => (typeof productsApi.getApparelSuggestions === 'function' ? productsApi.getApparelSuggestions() : Promise.resolve({ seasons: [], collections: [] })),
        enabled: hasVariantsCapability,
    });

    const seasonSuggestions = useMemo(() => {
        const DEFAULT_SEASONS = ['Primavera-Verano 2026', 'Otoño-Invierno 2026', 'Atemporal', 'Colección Permanente'];
        return Array.from(new Set([...(apparelSuggestions?.seasons || []), ...DEFAULT_SEASONS]));
    }, [apparelSuggestions?.seasons]);

    const collectionSuggestions = useMemo(() => {
        const DEFAULT_COLLECTIONS = ['Línea Básica', 'Línea Urbana', 'Cápsula #1', 'Edición Limitada'];
        return Array.from(new Set([...(apparelSuggestions?.collections || []), ...DEFAULT_COLLECTIONS]));
    }, [apparelSuggestions?.collections]);

    const createCategoryMutation = useMutation({
        mutationFn: (data: { name: string; profitMargin: number | null }) => categoriesApi.create(data),
        onSuccess: (newCategory) => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            form.setValue('categoryId', newCategory.id, { shouldDirty: true, shouldValidate: true });
            toast.success(`Categoría "${newCategory.name}" creada`);
            setIsCreateCategoryOpen(false);
            setNewCategoryName('');
            setNewCategoryMargin(undefined);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Error al crear categoría');
        },
    });

    const handleCreateCategory = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = newCategoryName.trim();
        if (!trimmed) {
            toast.error('Ingresá un nombre para la categoría');
            return;
        }
        createCategoryMutation.mutate({
            name: trimmed,
            profitMargin: newCategoryMargin ?? null,
        });
    };

    // Watchers
    const useManualPrice = form.watch('useManualPrice');
    const cost = form.watch('cost');
    const categoryId = form.watch('categoryId');
    const useCustomMargin = form.watch('useCustomMargin');
    const customProfitMargin = form.watch('customProfitMargin');
    const isMeasure = form.watch('isMeasure');

    // Obtener la categoría seleccionada
    const selectedCategory = useMemo(() => {
        if (!categoryId || !categories) return null;
        return categories.find(c => c.id === categoryId) || null;
    }, [categoryId, categories]);

    // Determinar el margen efectivo y su origen (modo clásico)
    const marginInfo = useMemo(() => {
        if (useCustomMargin && customProfitMargin !== undefined) {
            return {
                margin: customProfitMargin,
                source: 'personalizado' as const,
                description: 'Margen personalizado del producto'
            };
        }

        if (selectedCategory?.profitMargin !== null && selectedCategory?.profitMargin !== undefined) {
            return {
                margin: selectedCategory.profitMargin,
                source: 'categoria' as const,
                description: `Margen de la categoría "${selectedCategory.name}"`
            };
        }

        return {
            margin: defaultMargin,
            source: 'general' as const,
            description: 'Margen general del sistema'
        };
    }, [useCustomMargin, customProfitMargin, selectedCategory, defaultMargin]);

    const calculatedPrice = useMemo(() => {
        const numericCost = typeof cost === 'number' && !Number.isNaN(cost) ? cost : 0;
        return numericCost > 0 ? numericCost * (1 + marginInfo.margin / 100) : 0;
    }, [cost, marginInfo.margin]);

    // Verificar barcode duplicado al perder foco
    const handleBarcodeBlur = async (barcode: string | null | undefined) => {
        const trimmed = (barcode ?? '').trim();
        if (!trimmed) return;

        try {
            const existing = await productsApi.findByBarcode(trimmed);
            if (existing && existing.id !== currentProductId) {
                toast.warning(`Ya existe el producto "${existing.name}" con ese código`, {
                    description: 'Considerá editar el producto existente en vez de crear uno nuevo.',
                });
            }
        } catch {
            // Silenciar errores de red
        }
    };

    const handleMatrixSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = form.getValues('name')?.trim();
        if (!name) {
            toast.error('El nombre del modelo es requerido');
            return;
        }
        if (matrixCells.length === 0) {
            toast.error('La matriz debe contener al menos una variante');
            return;
        }

        try {
            setIsSubmittingMatrix(true);
            const result = await productsApi.createMatrix({
                name,
                styleCode: matrixStyleCode.trim() || undefined,
                description: form.getValues('description') || null,
                categoryId: form.getValues('categoryId') || null,
                brandName: form.getValues('brandName') || null,
                season: form.getValues('season') || null,
                collection: form.getValues('collection') || null,
                composition: form.getValues('composition') || null,
                careInstructions: form.getValues('careInstructions') || null,
                originCountry: form.getValues('originCountry') || null,
                returnPolicy: form.getValues('returnPolicy') || 'standard',
                cost: form.getValues('cost') ?? null,
                price: form.getValues('price') ?? null,
                profitMargin: form.getValues('customProfitMargin') ?? null,
                useCustomMargin: form.getValues('useCustomMargin') ?? false,
                useManualPrice: form.getValues('useManualPrice') ?? true,
                matrixCells,
            });

            toast.success(`¡Modelo "${result.parent.name}" y ${result.totalVariants} variantes creadas con éxito!`);
            queryClient.invalidateQueries({ queryKey: ['products'] });
            onSuccess?.();
        } catch (error: any) {
            console.error('[ProductForm createMatrix Error]:', error?.response?.data || error);
            toast.error(error?.response?.data?.message || error?.message || 'Error al crear la matriz de productos');
        } finally {
            setIsSubmittingMatrix(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.error('[ProductForm Validation Errors]', errors))} className="space-y-6">
                {/* Selector de Modo Textil (Simple vs Matriz 2D) */}
                {hasVariantsCapability && !isEditing ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
                                <Shirt className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    Modo de Carga Textil
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Seleccioná si ingresás un artículo individual o un modelo con matriz de talles y colores.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setIsMatrixMode(false)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    !isMatrixMode
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                                }`}
                            >
                                Producto Simple
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsMatrixMode(true)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    isMatrixMode
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                                }`}
                            >
                                Matriz de Talles y Colores
                            </button>
                        </div>
                    </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Columna Izquierda: Información Principal del Producto / Modelo */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
                            {isMatrixMode ? 'Información del Modelo Base' : 'Información Principal'}
                        </h3>

                        {/* Nombre del producto / modelo */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {isMatrixMode ? 'Nombre del Modelo / Prenda' : 'Nombre del Producto'}{' '}
                                        <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={isMatrixMode ? 'Ej: Remera Lisa Cuello Redondo' : 'Ej: Shampoo Sedal 400ml'}
                                            {...field}
                                            autoFocus
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Código de Estilo / Modelo (Solo en modo matriz) */}
                        {isMatrixMode ? (
                            <div className="space-y-2">
                                <Label htmlFor="matrixStyleCode" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Código de Estilo / SKU Base (opcional)
                                </Label>
                                <Input
                                    id="matrixStyleCode"
                                    placeholder="Ej: REM-100"
                                    value={matrixStyleCode}
                                    onChange={(e) => setMatrixStyleCode(e.target.value)}
                                    className="h-9 text-xs"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Se usará como prefijo para generar los códigos de variantes (ej: REM-100-NEG-M).
                                </p>
                            </div>
                        ) : null}

                        {/* Descripción del producto */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Ej: Confeccionada en algodón peinado premium"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                    </FormControl>
                                    <FormDescription>Información adicional (opcional)</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Marca */}
                        <FormField
                            control={form.control}
                            name="brandName"
                            render={({ field }) => (
                                <FormItem className="flex flex-col gap-1">
                                    <FormLabel>Marca</FormLabel>
                                    <FormControl>
                                        <BrandCombobox
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Buscar o crear marca..."
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Selecciona una existente o escribe para crear una nueva
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Categoría */}
                        <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Categoría</FormLabel>
                                    <div className="flex gap-2">
                                        <Select
                                            onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                                            value={field.value || 'none'}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue placeholder="Seleccionar categoría..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    <span className="text-muted-foreground">Sin categoría</span>
                                                </SelectItem>
                                                {categories?.map((category) => (
                                                    <SelectItem key={category.id} value={category.id}>
                                                        <span className="flex items-center gap-2">
                                                            {category.color && (
                                                                <span
                                                                    className="w-3 h-3 rounded-full"
                                                                    style={{ backgroundColor: category.color }}
                                                                />
                                                            )}
                                                            {category.name}
                                                            {category.profitMargin !== null && category.profitMargin !== undefined && (
                                                                <span className="text-xs text-muted-foreground ml-1">
                                                                    ({category.profitMargin}%)
                                                                </span>
                                                            )}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setIsCreateCategoryOpen(true)}
                                            title="Crear nueva categoría"
                                            aria-label="Crear nueva categoría"
                                            className="shrink-0"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <FormDescription>
                                        {selectedCategory?.profitMargin !== null && selectedCategory?.profitMargin !== undefined && !useManualPrice ? (
                                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                                <Info className="h-3 w-3" />
                                                Esta categoría tiene {selectedCategory.profitMargin}% de ganancia configurado
                                            </span>
                                        ) : (
                                            'Categoría del producto (opcional)'
                                        )}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Código de barras (solo para producto simple) */}
                        {!isMatrixMode ? (
                            <FormField
                                control={form.control}
                                name="barcode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Código de Barras</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ej: 7791234567890"
                                                {...field}
                                                value={field.value || ''}
                                                onBlur={() => handleBarcodeBlur(field.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                        <FormDescription>Código de barras del producto (opcional)</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : null}

                        {/* Ficha Técnica Textil (para indumentaria) */}
                        {hasVariantsCapability ? (
                            <ApparelTechnicalSheet
                                form={form}
                                seasonSuggestions={seasonSuggestions}
                                collectionSuggestions={collectionSuggestions}
                            />
                        ) : null}
                    </div>

                    {/* Columna Derecha: Precios, Ganancia y Stock */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1.5">
                            {isMatrixMode ? 'Precios Base del Modelo' : 'Precios, Ganancia y Stock'}
                        </h3>

                        {isMatrixMode ? (
                            <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-800 dark:text-blue-200">
                                Los precios y márgenes definidos aquí servirán como valor base por defecto para todas las variantes de la matriz.
                            </div>
                        ) : null}

                        {/* Toggle de modo Precio Fijo */}
                        <FormField
                            control={form.control}
                            name="useManualPrice"
                            render={({ field }) => (
                                <FormItem className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 p-3.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-0.5 flex-1">
                                            <FormLabel className="text-sm font-medium flex items-center gap-2">
                                                <Tag className="h-4 w-4 text-blue-600" />
                                                Precio Fijo
                                            </FormLabel>
                                            <FormDescription className="text-xs">
                                                Cuando está activado, cargás el precio de venta directamente.
                                                Cuando está desactivado, el sistema calcula el precio desde el costo y el margen.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={(checked) => {
                                                    field.onChange(checked);
                                                    if (!checked) {
                                                        form.setValue('price', undefined);
                                                        form.trigger('cost');
                                                    } else {
                                                        form.setValue('useCustomMargin', false);
                                                        form.setValue('customProfitMargin', undefined);
                                                        form.trigger('price');
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                    </div>
                                </FormItem>
                            )}
                        />

                        {/* Campos dinámicos de Precios y Stock */}
                        <div className="grid grid-cols-2 gap-4">
                            {useManualPrice ? (
                                <FormField
                                    control={form.control}
                                    name="price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Precio Final <span className="text-red-500">*</span></FormLabel>
                                            <FormControl>
                                                <NumericInput
                                                    name="price"
                                                    placeholder="0.00"
                                                    value={field.value ?? ''}
                                                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number.parseFloat(e.target.value) || 0)}
                                                />
                                            </FormControl>
                                            <FormDescription>Precio de venta directo</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="cost"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Costo <span className="text-red-500">*</span></FormLabel>
                                            <FormControl>
                                                <NumericInput
                                                    name="cost"
                                                    placeholder="0.00"
                                                    value={field.value ?? ''}
                                                    onChange={(e) => field.onChange(e.target.value === '' ? null : Number.parseFloat(e.target.value) || 0)}
                                                />
                                            </FormControl>
                                            <FormDescription>Precio de compra</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            <FormField
                                control={form.control}
                                name="stock"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{isEditing ? 'Stock Actual' : 'Stock Inicial'} <span className="text-red-500">*</span></FormLabel>
                                        <FormControl>
                                            <NumericInput
                                                allowDecimals={isMeasure}
                                                placeholder="0"
                                                value={field.value}
                                                onChange={(e) => field.onChange(e.target.value === '' ? 0 : isMeasure ? Number.parseFloat(e.target.value) || 0 : Number.parseInt(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormDescription>Cantidad disponible</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Preview del precio calculado + toggle margen personalizado: SOLO en modo clásico */}
                        {!useManualPrice && (
                            <>
                                <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-green-700 dark:text-green-300">Precio de Venta Sugerido</p>
                                            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                                                Costo + {marginInfo.margin}%
                                                <span className="ml-1 font-normal">
                                                    ({marginInfo.source === 'personalizado'
                                                        ? 'margen personalizado'
                                                        : marginInfo.source === 'categoria'
                                                            ? `categoría: ${selectedCategory?.name}`
                                                            : 'margen general'})
                                                </span>
                                            </p>
                                        </div>
                                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            {formatCurrency(calculatedPrice)}
                                        </span>
                                    </div>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="useCustomMargin"
                                    render={({ field }) => (
                                        <FormItem className="rounded-lg border p-3.5">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-sm font-medium flex items-center gap-2">
                                                        <Percent className="h-4 w-4 text-emerald-600" />
                                                        Margen Personalizado
                                                    </FormLabel>
                                                    <FormDescription className="text-xs">
                                                        {field.value
                                                            ? 'Este producto usa un margen específico'
                                                            : marginInfo.source === 'categoria'
                                                                ? `Usando categoría (${marginInfo.margin}%)`
                                                                : `Usando margen general (${defaultMargin}%)`
                                                        }
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={(checked) => {
                                                            field.onChange(checked);
                                                            if (!checked) {
                                                                form.setValue('customProfitMargin', undefined);
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                            </div>

                                            {field.value ? (
                                                <div className="mt-3 pt-3 border-t">
                                                    <FormField
                                                        control={form.control}
                                                        name="customProfitMargin"
                                                        render={({ field: marginField }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs">Margen de Ganancia (%)</FormLabel>
                                                                <div className="flex items-center gap-2">
                                                                    <FormControl>
                                                                        <NumericInput
                                                                            placeholder="Ej: 50"
                                                                            className="max-w-[150px]"
                                                                            value={marginField.value ?? ''}
                                                                            onChange={(e) => marginField.onChange(e.target.value === '' ? undefined : Number.parseFloat(e.target.value) || 0)}
                                                                        />
                                                                    </FormControl>
                                                                    <span className="text-muted-foreground text-sm">%</span>
                                                                </div>
                                                                <FormDescription className="text-xs">
                                                                    {marginInfo.source === 'categoria'
                                                                        ? `Sobrescribe el margen de la categoría (${selectedCategory?.profitMargin}%)`
                                                                        : `Sobrescribe el margen general (${defaultMargin}%)`
                                                                    }
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            ) : null}
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        {/* Venta por peso / tara (solo producto simple) */}
                        {!isMatrixMode ? (
                            <>
                                <FormField
                                    control={form.control}
                                    name="isMeasure"
                                    render={({ field }) => (
                                        <FormItem className="rounded-lg border p-3.5">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <FormLabel className="text-sm font-medium">Venta por peso o medida</FormLabel>
                                                    <FormDescription className="text-xs">Permite decimales y códigos pesables.</FormDescription>
                                                </div>
                                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                {isMeasure ? <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="tareGrams"
                                        render={({ field }) => <FormItem><FormLabel className="text-xs">Tara (g)</FormLabel><FormControl><NumericInput placeholder="0" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value === '' ? null : Number.parseFloat(event.target.value) || 0)} /></FormControl><FormMessage /></FormItem>}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="variableBarcodeFormat"
                                        render={({ field }) => <FormItem><FormLabel className="text-xs">Código variable</FormLabel><Select value={field.value ?? 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}><FormControl><SelectTrigger><SelectValue placeholder="Sin código" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Sin código variable</SelectItem><SelectItem value="gs1_weight">GS1 peso</SelectItem><SelectItem value="gs1_price">GS1 precio</SelectItem><SelectItem value="local_weight">EAN-13 local peso</SelectItem><SelectItem value="local_price">EAN-13 local precio</SelectItem></SelectContent></Select><FormMessage /></FormItem>}
                                    />
                                </div> : null}
                            </>
                        ) : null}
                    </div>
                </div>

                {/* Sección Matriz 2D Interactiva */}
                {isMatrixMode ? (
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                Matriz Bidimensional de Variantes y Stock Inicial
                            </h3>
                        </div>
                        <ProductVariantMatrixGrid
                            styleCode={matrixStyleCode || form.watch('name')}
                            defaultPrice={form.watch('price') || 0}
                            defaultCost={form.watch('cost') || 0}
                            defaultProfitMargin={marginInfo.margin || 0}
                            onMatrixChange={setMatrixCells}
                        />
                    </div>
                ) : null}

                <div className="pt-2 border-t flex justify-end">
                    {isMatrixMode ? (
                        <Button
                            type="button"
                            onClick={handleMatrixSubmit}
                            disabled={isLoading || isSubmittingMatrix}
                            className="w-full sm:w-auto sm:min-w-[240px] text-base py-5 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        >
                            {isLoading || isSubmittingMatrix ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generando Matriz...
                                </>
                            ) : (
                                'Guardar Modelo y Generar Variantes'
                            )}
                        </Button>
                    ) : (
                        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto sm:min-w-[200px] text-base py-5 font-semibold">
                            {isLoading ? 'Guardando...' : 'Guardar Producto'}
                        </Button>
                    )}
                </div>
            </form>

            {/* Modal para crear categoría rápida */}
            <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Nueva Categoría</DialogTitle>
                        <DialogDescription>
                            Creá una categoría para organizar tus productos y asignarle un margen de ganancia.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="quickCategoryName">
                                Nombre <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="quickCategoryName"
                                placeholder="Ej: Bebidas, Almacén, Limpieza..."
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCreateCategory();
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quickCategoryMargin">% Ganancia (opcional)</Label>
                            <NumericInput
                                id="quickCategoryMargin"
                                placeholder="Ej: 30"
                                value={newCategoryMargin ?? ''}
                                onChange={(e) =>
                                    setNewCategoryMargin(
                                        e.target.value === '' ? undefined : Number.parseFloat(e.target.value) || 0
                                    )
                                }
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCreateCategory();
                                    }
                                }}
                            />
                            <p className="text-xs text-muted-foreground">
                                Si no asignás un %, los productos de esta categoría usarán el margen general ({defaultMargin}%).
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsCreateCategoryOpen(false);
                                setNewCategoryName('');
                                setNewCategoryMargin(undefined);
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleCreateCategory()}
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
