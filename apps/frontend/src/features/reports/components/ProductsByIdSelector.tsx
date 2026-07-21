import { useState, useCallback } from 'react';
import { Plus, X, Package } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/features/products/api/products.api';
import { Product } from '@/features/products/types';

interface ProductChip {
    id: string;
    name: string;
    sku?: string | null;
}

interface ProductsByIdSelectorProps {
    readonly value: string[];
    readonly onChange: (ids: string[]) => void;
    readonly placeholder?: string;
}

export function ProductsByIdSelector({
    value,
    onChange,
    placeholder = 'Buscar producto para agregar...',
}: ProductsByIdSelectorProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedChips, setSelectedChips] = useState<ProductChip[]>([]);

    const { data: productsData, isLoading } = useQuery({
        queryKey: ['products', { search: searchTerm, limit: 15 }],
        queryFn: () => productsApi.getAll({ search: searchTerm, limit: 15 }),
        enabled: open,
    });

    const handleSelect = (product: Product) => {
        if (value.includes(product.id)) {
            setOpen(false);
            setSearchTerm('');
            return;
        }
        setSelectedChips(prev => {
            if (prev.some(c => c.id === product.id)) return prev;
            return [...prev, { id: product.id, name: product.name, sku: product.sku }];
        });
        onChange([...value, product.id]);
        setOpen(false);
        setSearchTerm('');
    };

    const handleRemove = useCallback((idToRemove: string) => {
        setSelectedChips(prev => prev.filter(c => c.id !== idToRemove));
        onChange(value.filter(id => id !== idToRemove));
    }, [value, onChange]);

    return (
        <div className="space-y-3">
            {selectedChips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedChips.map(chip => (
                        <Badge
                            key={chip.id}
                            variant="secondary"
                            className="flex items-center gap-1 pl-2 pr-1 py-1"
                        >
                            <Package className="h-3 w-3" />
                            <span className="text-xs">
                                {chip.name}
                                {chip.sku && (
                                    <span className="text-muted-foreground ml-1">
                                        ({chip.sku})
                                    </span>
                                )}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => handleRemove(chip.id)}
                                aria-label={`Quitar ${chip.name}`}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </Badge>
                    ))}
                </div>
            )}

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-start font-normal text-muted-foreground"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {placeholder}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
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
                                ) : (() => {
                                    const filtered = (productsData?.data || []).filter(
                                        p => !value.includes(p.id)
                                    );
                                    if (filtered.length === 0) {
                                        return (
                                            <CommandEmpty>
                                                {searchTerm
                                                    ? `No se encontró "${searchTerm}"`
                                                    : 'Escribí para buscar productos...'}
                                            </CommandEmpty>
                                        );
                                    }
                                    return (
                                        <CommandGroup>
                                            {filtered.map((product) => (
                                                <CommandItem
                                                    key={product.id}
                                                    value={product.id}
                                                    onSelect={() => handleSelect(product)}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{product.name}</span>
                                                        <div className="flex gap-2 text-xs text-muted-foreground">
                                                            {product.sku && <span>SKU: {product.sku}</span>}
                                                            <span>Stock: {product.stock}</span>
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    );
                                })()}
                            </CommandList>
                        </div>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
