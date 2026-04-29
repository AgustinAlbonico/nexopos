/**
 * Componente reutilizable para buscar y seleccionar productos
 * Usa búsqueda en tiempo real con autocompletado
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { productsApi } from '@/features/products/api/products.api';
import { Product } from '@/features/products/types';

interface ProductSearchProps {
    readonly value?: string; // ID del producto seleccionado
    readonly onSelect: (productId: string, product: Product) => void;
    readonly onClear?: () => void;
    readonly placeholder?: string;
    readonly showClearButton?: boolean;
    readonly showStock?: boolean;
    readonly showCost?: boolean;
    readonly showSKU?: boolean;
    readonly showBarcode?: boolean;
    readonly limit?: number;
    readonly className?: string;
    readonly disabled?: boolean;
    readonly allowCreate?: boolean; // Si permite crear productos nuevos
    readonly onCreateClick?: () => void; // Callback cuando se clickea "Crear producto"
    readonly excludeIds?: string[]; // IDs de productos a excluir de los resultados
    readonly excludeOutOfStock?: boolean; // Si true, excluye productos con stock 0
}

/**
 * Formatea un número como moneda ARS
 */
function formatCurrencyValue(value: number): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(value);
}

/**
 * Componente de búsqueda de productos con autocompletado
 */
export function ProductSearch({
    value,
    onSelect,
    onClear,
    placeholder = 'Buscar producto...',
    showClearButton = true,
    showStock = true,
    showCost = false,
    showSKU = true,
    showBarcode = true,
    limit = 15,
    className = '',
    disabled = false,
    allowCreate = false,
    onCreateClick,
    excludeIds = [],
    excludeOutOfStock = false,
}: ProductSearchProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Query para buscar productos
    const { data: productsData, isLoading } = useQuery({
        queryKey: ['products', { search: searchTerm, limit }],
        queryFn: () => productsApi.getAll({ search: searchTerm, limit }),
        enabled: open, // Solo buscar cuando el popover está abierto
    });

    // Obtener el producto seleccionado para mostrar su nombre
    const { data: selectedProductData } = useQuery({
        queryKey: ['products', value],
        queryFn: () => (value ? productsApi.getOne(value) : null),
        enabled: !!value && open === false, // Solo cargar cuando hay un valor y el popover está cerrado
    });

    const selectedProductName = selectedProductData?.name || null;

    // Detectar si el término de búsqueda parece un código de barras (>8 caracteres numéricos)
    const isBarcodeSearch = /^\d{9,}$/.test(searchTerm.trim());

    // Filtrar productos excluyendo los IDs especificados y los sin stock si corresponde
    const filteredProducts = productsData?.data.filter(
        product => {
            // Excluir por ID
            if (excludeIds.includes(product.id)) return false;
            // Excluir productos sin stock si está habilitado
            if (excludeOutOfStock && product.stock <= 0) return false;
            return true;
        }
    ) || [];

    // Priorizar coincidencia exacta de barcode cuando la búsqueda parece un código de barras
    const sortedProducts = isBarcodeSearch
        ? [...filteredProducts].sort((a, b) => {
            const aExact = a.barcode === searchTerm.trim();
            const bExact = b.barcode === searchTerm.trim();
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return 0;
        })
        : filteredProducts;

    const handleSelect = (product: Product) => {
        onSelect(product.id, product);
        setOpen(false);
        setSearchTerm('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClear) {
            onClear();
        }
        setSearchTerm('');
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    className={`w-full justify-between font-normal ${className}`}
                    disabled={disabled}
                >
                    <span className="truncate">
                        {selectedProductName ?? placeholder}
                    </span>
                    {value && showClearButton && onClear ? (
                        <X
                            className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                            onClick={handleClear}
                        />
                    ) : (
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start" onWheel={(e) => e.stopPropagation()}>
                <Command shouldFilter={false} className="overflow-hidden">
                    <CommandInput
                        placeholder="Buscar producto..."
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                    />
                    <div className="max-h-[300px] overflow-y-auto overflow-x-hidden">
                        <CommandList>
                            {isLoading ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    Buscando...
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="p-4">
                                    {allowCreate && onCreateClick ? (
                                        <div className="text-center">
                                            <p className="text-sm text-muted-foreground mb-3">
                                                {searchTerm
                                                    ? `No se encontró "${searchTerm}"`
                                                    : 'Escribí para buscar...'}
                                            </p>
                                            <Button
                                                type="button"
                                                variant="default"
                                                size="sm"
                                                onClick={() => {
                                                    onCreateClick();
                                                    setOpen(false);
                                                }}
                                            >
                                                <PackagePlus className="h-4 w-4 mr-2" />
                                                Crear producto nuevo
                                            </Button>
                                        </div>
                                    ) : (
                                        <CommandEmpty>
                                            {searchTerm
                                                ? `No se encontró "${searchTerm}"`
                                                : 'Escribí para buscar...'}
                                        </CommandEmpty>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Botón de crear arriba de la lista */}
                                    {allowCreate && onCreateClick && (
                                        <div className="border-b p-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="w-full justify-start text-primary font-medium"
                                                onClick={() => {
                                                    onCreateClick();
                                                    setOpen(false);
                                                }}
                                            >
                                                <PackagePlus className="h-4 w-4 mr-2" />
                                                Crear producto nuevo
                                            </Button>
                                        </div>
                                    )}
                                    <CommandGroup>
                                        {sortedProducts.map((product) => (
                                            <CommandItem
                                                key={product.id}
                                                value={product.id}
                                                onSelect={() => handleSelect(product)}
                                            >
                                                <div className="flex flex-col flex-1">
                                                    <span className="font-medium">{product.name}</span>
                                                    <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                                                        {showBarcode && product.barcode && (
                                                            <span>BAR: {product.barcode}</span>
                                                        )}
                                                        {showSKU && (
                                                            <span>SKU: {product.sku ?? 'N/A'}</span>
                                                        )}
                                                        {showStock && (
                                                            <span>Stock: {product.stock}</span>
                                                        )}
                                                        {showCost && (
                                                            <span>Costo: {formatCurrencyValue(product.cost)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </>
                            )}
                        </CommandList>
                    </div>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
