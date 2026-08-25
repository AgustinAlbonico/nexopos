/**
 * Lista de proveedores con tabla, filtros y acciones
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/common/DataTable';
import { suppliersApi } from '../api/suppliers.api';
import { Supplier, IvaConditionLabels } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowUpDown,
    Edit,
    Trash,
    MoreHorizontal,
    Eye,
    Phone,
    Mail,
    MapPin,
    Globe,
    Building2,
    CreditCard,
    Receipt,
    FileText,
    CheckCircle2,
    XCircle,
    Calendar,
    User,
    Landmark,
    Tag,
    Search,
    X,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SupplierListProps {
    readonly onEdit: (supplier: Supplier) => void;
    readonly onDelete: (id: string) => void;
}

/**
 * Modal para ver detalle de un proveedor con diseño mejorado
 */
function SupplierDetailDialog({
    supplier,
    open,
    onClose,
}: Readonly<{
    supplier: Supplier | null;
    open: boolean;
    onClose: () => void;
}>) {
    if (!supplier) return null;

    const hasContactInfo = supplier.email || supplier.phone || supplier.mobile || supplier.website || supplier.contactName;
    const hasAddressInfo = supplier.address || supplier.city || supplier.state;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
                {/* Header con gradiente y nombre del proveedor */}
                <div className="bg-gradient-to-br from-primary/90 via-primary to-primary/80 px-6 py-5 text-primary-foreground">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold tracking-tight truncate">
                                {supplier.name}
                            </h2>
                            {supplier.tradeName ? (
                                <p className="text-sm opacity-80 mt-0.5 truncate">
                                    {supplier.tradeName}
                                </p>
                            ) : null}
                            <div className="flex items-center gap-2 mt-2">
                                <Badge
                                    variant="secondary"
                                    className={supplier.isActive
                                        ? "bg-green-500/30 text-white border-green-400/50"
                                        : "bg-white/20 text-white/70 border-white/30"
                                    }
                                >
                                    {supplier.isActive ? (
                                        <><CheckCircle2 className="h-3 w-3 mr-1" /> Activo</>
                                    ) : (
                                        <><XCircle className="h-3 w-3 mr-1" /> Inactivo</>
                                    )}
                                </Badge>
                                {supplier.classification && (
                                    <Badge
                                        variant="secondary"
                                        className="bg-white/20 text-white border-white/30"
                                    >
                                        <Tag className="h-3 w-3 mr-1" />
                                        {supplier.classification}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contenido principal */}
                <div className="p-6 space-y-5">
                    {/* Información fiscal */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Información Fiscal
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Documento */}
                            <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <CreditCard className="h-3 w-3 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">Documento</p>
                                </div>
                                {supplier.documentNumber ? (
                                    <p className="text-sm font-semibold">
                                        {supplier.documentType}: {supplier.documentNumber}
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No especificado</p>
                                )}
                            </div>

                            {/* Condición IVA */}
                            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-800/50">
                                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Condición IVA</p>
                                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                    {supplier.ivaCondition
                                        ? IvaConditionLabels[supplier.ivaCondition]
                                        : 'No especificada'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Información de contacto */}
                    {hasContactInfo ? (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Contacto
                                    </span>
                                </div>

                                <div className="rounded-xl bg-muted/40 p-4 border border-border/50 space-y-3">
                                    {/* Nombre del contacto */}
                                    {supplier.contactName ? (
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-500/10 rounded-lg">
                                                <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                            </div>
                                            <span className="text-sm font-medium">{supplier.contactName}</span>
                                        </div>
                                    ) : null}

                                    {/* Email */}
                                    {supplier.email ? (
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                                <Mail className="h-4 w-4 text-primary" />
                                            </div>
                                            <a
                                                href={`mailto:${supplier.email}`}
                                                className="text-sm text-primary hover:underline font-medium"
                                            >
                                                {supplier.email}
                                            </a>
                                        </div>
                                    ) : null}

                                    {/* Teléfonos */}
                                    {(supplier.phone || supplier.mobile) ? (
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                                <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <span className="text-sm font-medium">
                                                {supplier.phone}
                                                {supplier.phone && supplier.mobile && ' / '}
                                                {supplier.mobile}
                                            </span>
                                        </div>
                                    ) : null}

                                    {/* Website */}
                                    {supplier.website ? (
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-violet-500/10 rounded-lg">
                                                <Globe className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                            </div>
                                            <a
                                                href={supplier.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-violet-600 dark:text-violet-400 hover:underline font-medium truncate"
                                            >
                                                {supplier.website}
                                            </a>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </>
                    ) : null}

                    {/* Dirección */}
                    {hasAddressInfo ? (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Ubicación
                                    </span>
                                </div>

                                <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-4 border border-amber-200 dark:border-amber-800/50">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-amber-500/20 rounded-lg">
                                            <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div>
                                            {supplier.address ? (
                                                <p className="text-sm font-medium">{supplier.address}</p>
                                            ) : null}
                                            <p className="text-sm text-amber-700/80 dark:text-amber-300/80">
                                                {[supplier.city, supplier.state, supplier.postalCode]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : null}

                    {/* Cuenta bancaria */}
                    {supplier.bankAccount ? (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Landmark className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Información Bancaria
                                    </span>
                                </div>

                                <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-500/10 rounded-lg">
                                            <CreditCard className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <span className="font-mono text-sm">{supplier.bankAccount}</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : null}

                    {/* Notas */}
                    {supplier.notes ? (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Notas
                                    </span>
                                </div>

                                <div className="rounded-xl bg-muted/40 p-4 border border-border/50">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                        {supplier.notes}
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : null}

                    {/* Fecha de creación */}
                    <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                            Proveedor desde{' '}
                            {new Date(supplier.createdAt).toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                            })}
                        </span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Componente principal de lista de proveedores
 */
export function SupplierList({ onEdit, onDelete }: SupplierListProps) {
    const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [classificationFilter, setClassificationFilter] = useState<string>('');

    // Query para proveedores
    const { data, isLoading, error } = useQuery({
        queryKey: ['suppliers'],
        queryFn: () =>
            suppliersApi.getAll({
                limit: 100,
                sortBy: 'name',
                order: 'ASC',
            }),
    });

    const { data: classifications } = useQuery({
        queryKey: ['supplier-classifications'],
        queryFn: () => suppliersApi.getClassifications(),
    });

    const columns: ColumnDef<Supplier>[] = [
        {
            accessorKey: 'name',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Proveedor
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const supplier = row.original;
                return (
                    <div>
                        <p className="font-medium">{supplier.name}</p>
                        {supplier.documentNumber && (
                            <p className="text-xs text-muted-foreground">
                                {supplier.documentType}: {supplier.documentNumber}
                            </p>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'email',
            header: 'Contacto',
            cell: ({ row }) => {
                const supplier = row.original;
                return (
                    <div className="text-sm">
                        {supplier.email && (
                            <p className="truncate max-w-[180px]">{supplier.email}</p>
                        )}
                        {supplier.mobile && (
                            <p className="text-muted-foreground">{supplier.mobile}</p>
                        )}
                        {!supplier.email && !supplier.mobile && (
                            <span className="text-muted-foreground">-</span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'city',
            header: 'Ubicación',
            cell: ({ row }) => {
                const supplier = row.original;
                if (!supplier.city && !supplier.state) {
                    return <span className="text-muted-foreground">-</span>;
                }
                return (
                    <span className="text-sm">
                        {[supplier.city, supplier.state].filter(Boolean).join(', ')}
                    </span>
                );
            },
        },
        {
            accessorKey: 'classification',
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Clasificación
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const classification = row.original.classification;
                if (!classification) {
                    return <span className="text-muted-foreground">-</span>;
                }
                return (
                    <Badge
                        variant="secondary"
                        className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-normal"
                    >
                        <Tag className="h-3 w-3 mr-1" />
                        {classification}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'isActive',
            header: 'Estado',
            cell: ({ row }) => {
                const isActive = row.original.isActive;
                return (
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                        {isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                );
            },
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                const supplier = row.original;

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
                            <DropdownMenuItem onClick={() => setViewSupplier(supplier)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit(supplier)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => onDelete(supplier.id)}
                                className={supplier.isActive ? 'text-destructive' : 'text-green-600'}
                            >
                                <Trash className="mr-2 h-4 w-4" />
                                {supplier.isActive ? 'Desactivar' : 'Activar'}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">Cargando...</div>
        );
    }

    if (error) {
        return (
            <div className="text-destructive p-4">Error al cargar proveedores</div>
        );
    }

    const filteredData = (data?.data || []).filter((s) => {
        // Filtro por clasificación seleccionada (chip)
        if (
            classificationFilter &&
            s.classification?.toLowerCase() !== classificationFilter.toLowerCase()
        ) {
            return false;
        }

        // Búsqueda en vivo (nombre, fantasía, CUIT/DNI, clasificación, ciudad/provincia)
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            const matchName = s.name?.toLowerCase().includes(q);
            const matchTradeName = s.tradeName?.toLowerCase().includes(q);
            const matchDoc = s.documentNumber?.toLowerCase().includes(q);
            const matchClassification = s.classification?.toLowerCase().includes(q);
            const matchCity = s.city?.toLowerCase().includes(q);
            const matchState = s.state?.toLowerCase().includes(q);

            return (
                matchName ||
                matchTradeName ||
                matchDoc ||
                matchClassification ||
                matchCity ||
                matchState
            );
        }

        return true;
    });

    return (
        <div className="space-y-3">
            {/* Buscador directo visible y Chips de clasificación sin desplegables */}
            <div className="space-y-2.5 bg-card rounded-lg border p-3">
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, CUIT o clasificación..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-8 h-9 text-sm"
                        />
                        {searchQuery ? (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                                title="Limpiar búsqueda"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                        {classificationFilter ? (
                            <Badge
                                variant="secondary"
                                className="h-8 px-2.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 flex items-center gap-1.5 font-medium"
                            >
                                <Tag className="h-3.5 w-3.5" />
                                <span>{classificationFilter}</span>
                                <button
                                    type="button"
                                    onClick={() => setClassificationFilter('')}
                                    className="ml-1 hover:text-blue-900 dark:hover:text-white"
                                    title="Quitar filtro"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ) : null}
                        <div className="text-xs text-muted-foreground font-medium">
                            {filteredData.length} proveedor(es)
                        </div>
                    </div>
                </div>

                {/* Chips de clasificación visibles directamente para filtrar en 1 clic */}
                {classifications && classifications.length > 0 ? (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-1 border-t">
                        <span className="text-muted-foreground font-medium shrink-0 flex items-center gap-1">
                            <Tag className="h-3 w-3" /> Clasificación:
                        </span>
                        <button
                            type="button"
                            onClick={() => setClassificationFilter('')}
                            className={cn(
                                "px-2.5 py-0.5 rounded-full border transition-all shrink-0 font-medium",
                                !classificationFilter
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                    : "bg-muted/60 hover:bg-muted text-muted-foreground border-border"
                            )}
                        >
                            Todas ({data?.data?.length || 0})
                        </button>
                        {classifications.map((c) => {
                            const isSelected =
                                classificationFilter.toLowerCase() === c.toLowerCase();
                            const count = (data?.data || []).filter(
                                (s) => s.classification?.toLowerCase() === c.toLowerCase()
                            ).length;

                            return (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() =>
                                        setClassificationFilter(isSelected ? '' : c)
                                    }
                                    className={cn(
                                        "px-2.5 py-0.5 rounded-full border transition-all shrink-0 font-medium flex items-center gap-1",
                                        isSelected
                                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                            : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                                    )}
                                >
                                    <span>{c}</span>
                                    {count > 0 ? (
                                        <span
                                            className={cn(
                                                "text-[10px] px-1.5 py-0.2 rounded-full",
                                                isSelected
                                                    ? "bg-blue-700 text-white"
                                                    : "bg-slate-200 dark:bg-slate-700 text-muted-foreground"
                                            )}
                                        >
                                            {count}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                ) : null}
            </div>

            <DataTable
                columns={columns}
                data={filteredData}
            />
            <SupplierDetailDialog
                supplier={viewSupplier}
                open={!!viewSupplier}
                onClose={() => setViewSupplier(null)}
            />
        </div>
    );
}
