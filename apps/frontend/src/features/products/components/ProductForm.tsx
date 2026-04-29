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
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../api/products.api';
import { api } from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';
import { Percent, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { BrandCombobox } from './BrandCombobox';

interface ProductFormProps {
    readonly initialData?: ProductFormValues;
    readonly onSubmit: (data: ProductFormValues) => void;
    readonly isLoading?: boolean;
    readonly isEditing?: boolean;
}

/**
 * Formulario de producto con lógica de margen de ganancia jerárquico:
 * 1. Margen personalizado del producto (si useCustomMargin = true)
 * 2. Margen de la categoría (si la categoría tiene profitMargin)
 * 3. Margen general del sistema
 */
export function ProductForm({ initialData, onSubmit, isLoading, isEditing }: ProductFormProps) {
    const [defaultMargin, setDefaultMargin] = useState<number>(30);

    // Obtener el % de ganancia por defecto de la configuración
    useEffect(() => {
        api.get('/api/configuration')
            .then(res => {
                const margin = Number(res.data.defaultProfitMargin);
                setDefaultMargin(margin);
            })
            .catch(() => setDefaultMargin(30));
    }, []);

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: initialData || {
            name: '',
            description: null,
            cost: 0,
            stock: 0,
            categoryId: null,
            isActive: true,
            useCustomMargin: false,
            customProfitMargin: undefined,
            brandName: null,
        },
    });

    const { data: categories } = useQuery({
        queryKey: ['categories', 'active'],
        queryFn: () => categoriesApi.getActive(),
    });

    // Watch cost, categoría y margen personalizado para calcular precio
    const cost = form.watch('cost');
    const categoryId = form.watch('categoryId');
    const useCustomMargin = form.watch('useCustomMargin');
    const customProfitMargin = form.watch('customProfitMargin');

    // Obtener la categoría seleccionada
    const selectedCategory = useMemo(() => {
        if (!categoryId || !categories) return null;
        return categories.find(c => c.id === categoryId) || null;
    }, [categoryId, categories]);

    // Determinar el margen efectivo y su origen
    const marginInfo = useMemo(() => {
        // 1. Margen personalizado del producto
        if (useCustomMargin && customProfitMargin !== undefined) {
            return {
                margin: customProfitMargin,
                source: 'personalizado' as const,
                description: 'Margen personalizado del producto'
            };
        }

        // 2. Margen de la categoría
        if (selectedCategory?.profitMargin !== null && selectedCategory?.profitMargin !== undefined) {
            return {
                margin: selectedCategory.profitMargin,
                source: 'categoria' as const,
                description: `Margen de la categoría "${selectedCategory.name}"`
            };
        }

        // 3. Margen general del sistema
        return {
            margin: defaultMargin,
            source: 'general' as const,
            description: 'Margen general del sistema'
        };
    }, [useCustomMargin, customProfitMargin, selectedCategory, defaultMargin]);

    const calculatedPrice = cost > 0 ? cost * (1 + marginInfo.margin / 100) : 0;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Nombre del producto */}
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre del Producto <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Ej: Shampoo Sedal 400ml"
                                    {...field}
                                    autoFocus
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Descripción del producto */}
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Ej: Shampoo reparador para cabello dañado"
                                    {...field}
                                    value={field.value || ''}
                                />
                            </FormControl>
                            <FormDescription>Información adicional sobre el producto (opcional)</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Código de barras */}
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
                                />
                            </FormControl>
                            <FormDescription>Código de barras del producto (opcional)</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Marca (Autocomplete / Nueva) */}
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

                {/* Categoría (única) */}
                <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Categoría</FormLabel>
                            <Select
                                onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                                value={field.value || 'none'}
                            >
                                <FormControl>
                                    <SelectTrigger>
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
                            <FormDescription>
                                {selectedCategory?.profitMargin !== null && selectedCategory?.profitMargin !== undefined ? (
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

                {/* Costo y Stock en una fila */}
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="cost"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Costo <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <NumericInput
                                        placeholder="0.00"
                                        value={field.value}
                                        onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number.parseFloat(e.target.value) || 0)}
                                    />
                                </FormControl>
                                <FormDescription>Precio de compra</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="stock"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{isEditing ? 'Stock Actual' : 'Stock Inicial'} <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <NumericInput
                                        allowDecimals={false}
                                        placeholder="0"
                                        value={field.value}
                                        onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number.parseInt(e.target.value) || 0)}
                                    />
                                </FormControl>
                                <FormDescription>Cantidad disponible</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Preview del precio calculado con indicador de origen del margen */}
                <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-green-700 dark:text-green-300">Precio de Venta</p>
                            <p className="text-xs text-green-600 dark:text-green-400">
                                Costo + {marginInfo.margin}%
                                <span className="ml-1">
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

                {/* Toggle de margen personalizado */}
                <FormField
                    control={form.control}
                    name="useCustomMargin"
                    render={({ field }) => (
                        <FormItem className="rounded-lg border p-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base flex items-center gap-2">
                                        <Percent className="h-4 w-4" />
                                        Margen de Ganancia Personalizado
                                    </FormLabel>
                                    <FormDescription>
                                        {field.value
                                            ? 'Este producto usa un margen diferente'
                                            : marginInfo.source === 'categoria'
                                                ? `Usando margen de categoría (${marginInfo.margin}%)`
                                                : `Usando margen general del sistema (${defaultMargin}%)`
                                        }
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={(checked) => {
                                            field.onChange(checked);
                                            // Si desactiva, limpiar el margen personalizado
                                            if (!checked) {
                                                form.setValue('customProfitMargin', undefined);
                                            }
                                        }}
                                    />
                                </FormControl>
                            </div>

                            {/* Campo de margen personalizado - visible solo si está activo */}
                            {field.value ? (
                                <div className="mt-4 pt-4 border-t">
                                    <FormField
                                        control={form.control}
                                        name="customProfitMargin"
                                        render={({ field: marginField }) => (
                                            <FormItem>
                                                <FormLabel>Margen de Ganancia (%)</FormLabel>
                                                <div className="flex items-center gap-2">
                                                    <FormControl>
                                                        <NumericInput
                                                            placeholder="Ej: 50"
                                                            className="max-w-[150px]"
                                                            value={marginField.value ?? ''}
                                                            onChange={(e) => marginField.onChange(e.target.value === '' ? undefined : Number.parseFloat(e.target.value) || 0)}
                                                        />
                                                    </FormControl>
                                                    <span className="text-muted-foreground">%</span>
                                                </div>
                                                <FormDescription>
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

                <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Guardando...' : 'Guardar Producto'}
                </Button>
            </form>
        </Form>
    );
}
