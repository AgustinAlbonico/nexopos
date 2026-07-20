import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/common/DataTable';
import { productsApi, categoriesApi, brandsApi } from '../api/products.api';
import { Product } from '../types';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
    ArrowUpDown,
    Edit,
    Trash,
    MoreHorizontal,
    AlertTriangle,
    Eye,
    History,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StockHistoryDialog } from './StockHistoryDialog';
import { BrandSelect } from './BrandSelect';

interface ProductListProps {
    readonly onEdit: (product: Product) => void;
    readonly onDelete: (id: string) => void;
    readonly onView: (product: Product) => void;
}

/**
 * Componente para mostrar la lista de productos con acciones
 */
export function ProductList({ onEdit, onDelete, onView }: ProductListProps) {
    const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');
    const [stockStatus, setStockStatus] = useState<'all' | 'critical'>('all');

    // Query para categorías
    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => categoriesApi.getAll(),
    });

    // Query para marcas
    const { data: brands } = useQuery({
        queryKey: ['brands'],
        queryFn: () => brandsApi.getAll(),
    });

    // Query para configuración global (stock mínimo)
    const { data: config } = useQuery({
        queryKey: ['configuration'],
        queryFn: async () => {
            const res = await import('@/lib/axios').then(m => m.api.get('/api/configuration'));
            return res.data as { minStockAlert: number };
        },
    });
    const globalMinStock = config?.minStockAlert ?? 5;

    const { data, isLoading, error } = useQuery({
        queryKey: ['products', { categoryId: selectedCategoryId, brandId: selectedBrandId, stockStatus }],
        queryFn: () => productsApi.getAll({
            limit: 10000, // Aumentado para soportar catálogos grandes
            categoryId: selectedCategoryId && selectedCategoryId !== 'all' ? selectedCategoryId : undefined,
            brandId: selectedBrandId || undefined,
            stockStatus: stockStatus === 'all' ? undefined : stockStatus,
        }),
    });

    // Componente de los filtros
    const filtersSlot = (
        <div className="flex items-center gap-2">
            {/* Filtro de categorías */}
            <Select
                value={selectedCategoryId || 'all'}
                onValueChange={setSelectedCategoryId}
            >
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                                {cat.color ? (
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: cat.color }}
                                    />
                                ) : null}
                                {cat.name}
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Filtro de marcas con búsqueda y scroll */}
            <BrandSelect
                selectedId={selectedBrandId || null}
                onSelect={(id) => setSelectedBrandId(id || '')}
                brands={brands || []}
                placeholder="Todas las marcas"
            />

            {/* Filtro de stock */}
            <Select
                value={stockStatus}
                onValueChange={(value) => setStockStatus(value as 'all' | 'critical')}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todo el stock" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todo el stock</SelectItem>
                    <SelectItem value="critical">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            Bajo / Sin Stock
                        </div>
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );

    const columns: ColumnDef<Product>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Producto
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const product = row.original;
                return (
                    <div>
                        <p className="font-medium">{product.name}</p>
                    </div>
                );
            },
        },
        {
            id: 'category',
            header: 'Categoría',
            cell: ({ row }) => {
                const product = row.original;
                if (!product.category) {
                    return <span className="text-muted-foreground">-</span>;
                }
                return (
                    <Badge
                        variant="outline"
                        className="text-xs font-bold"
                        style={{
                            borderColor: product.category.color || undefined,
                            backgroundColor: product.category.color ? `${product.category.color}15` : undefined,
                            color: product.category.color || undefined,
                        }}
                    >
                        {product.category.name}
                        {product.category.profitMargin !== null && product.category.profitMargin !== undefined ? (
                            <span className="ml-1 opacity-70">({product.category.profitMargin}%)</span>
                        ) : null}
                    </Badge>
                );
            },
        },
        {
            id: 'brand',
            header: 'Marca',
            cell: ({ row }) => {
                const product = row.original;
                return product.brand ? (
                    <span className="text-sm font-medium">{product.brand.name}</span>
                ) : (
                    <span className="text-muted-foreground">-</span>
                );
            },
        },
        {
            accessorKey: 'cost',
            header: 'Costo',
            cell: ({ row }) => (
                <span className="text-muted-foreground">
                    {formatCurrency(row.getValue('cost'))}
                </span>
            ),
        },
        {
            accessorKey: 'price',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Precio
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const product = row.original;
                const profitMargin = product.profitMargin ?? 0;

                return (
                    <div className="flex flex-col">
                        <span className="font-semibold text-green-600">
                            {formatCurrency(row.getValue('price'))}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {profitMargin.toFixed(1)}% ganancia
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: 'stock',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Stock
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const stock = row.original.stock;
                const isLow = stock <= globalMinStock && stock > 0;
                const isOut = stock === 0;

                return (
                    <div className="flex items-center gap-1">
                        <span className={
                            (() => {
                                if (isOut) return 'text-destructive font-medium';
                                if (isLow) return 'text-yellow-600 font-medium';
                                return '';
                            })()
                        }>
                            {stock}
                        </span>
                        {(isLow || isOut) ? (
                            <AlertTriangle className={`h-4 w-4 ${isOut ? 'text-destructive' : 'text-yellow-600'}`} />
                        ) : null}
                    </div>
                );
            },
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const product = row.original;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => onView(product)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setHistoryProduct(product)}>
                                <History className="mr-2 h-4 w-4" />
                                Historial de Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(product)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => onDelete(product.id)}
                                className="text-destructive"
                            >
                                <Trash className="mr-2 h-4 w-4" />
                                Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    if (isLoading) return <div className="flex items-center justify-center p-8">Cargando...</div>;
    if (error) return <div className="text-destructive p-4">Error al cargar productos</div>;

    const getRowClassName = (product: Product): string => {
        if (product.stock === 0) {
            return 'bg-destructive/5 hover:bg-destructive/10';
        }
        if (product.stock <= globalMinStock) {
            return 'bg-yellow-500/5 hover:bg-yellow-500/10';
        }
        return '';
    };

    return (
        <>
            <DataTable
                columns={columns}
                data={data?.data || []}
                searchKey="name"
                searchPlaceholder="Buscar producto..."
                filterSlot={filtersSlot}
                getRowClassName={getRowClassName}
            />
            <StockHistoryDialog
                product={historyProduct}
                open={!!historyProduct}
                onClose={() => setHistoryProduct(null)}
            />
        </>
    );
}
