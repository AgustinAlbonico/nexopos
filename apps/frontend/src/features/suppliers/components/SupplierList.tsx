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
    ChevronsUpDown,
    Check,
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
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

interface ClassificationFilterPopoverProps {
    readonly selected: string;
    readonly onSelect: (value: string) => void;
    readonly classifications?: string[];
}

function ClassificationFilterPopover({
    selected,
    onSelect,
    classifications = [],
}: ClassificationFilterPopoverProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filtered = (classifications || []).filter((c) =>
        c.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Popover
            open={open}
            onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (isOpen) setSearch('');
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-9 justify-between border-dashed min-w-[220px] max-w-[280px] text-xs font-normal",
                        selected
                            ? "border-solid border-primary text-primary font-medium bg-primary/5"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <div className="flex items-center gap-1.5 truncate">
                        <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                            {selected || "Todas las clasificaciones"}
                        </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-2" align="start">
                <div className="space-y-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Buscar clasificación..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-8 pl-8 text-xs"
                            autoFocus
                        />
                        {search ? (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        ) : null}
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-0.5 pt-1">
                        <button
                            type="button"
                            onClick={() => {
                                onSelect('');
                                setOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-sm text-left transition-colors font-medium",
                                !selected
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted text-muted-foreground"
                            )}
                        >
                            <span>Todas las clasificaciones</span>
                            {!selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                        </button>

                        {filtered.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => {
                                    onSelect(c);
                                    setOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-sm text-left transition-colors",
                                    selected === c
                                        ? "bg-primary text-primary-foreground font-medium"
                                        : "hover:bg-muted text-foreground"
                                )}
                            >
                                <span className="truncate">{c}</span>
                                {selected === c ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                            </button>
                        ))}

                        {filtered.length === 0 ? (
                            <div className="p-2 text-center text-xs text-muted-foreground">
                                No se encontraron clasificaciones
                            </div>
                        ) : null}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

/**
 * Componente principal de lista de proveedores
 */
export function SupplierList({ onEdit, onDelete }: SupplierListProps) {
    const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
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

    const filteredData = classificationFilter
        ? (data?.data || []).filter(
            (s) => s.classification?.toLowerCase() === classificationFilter.toLowerCase()
        )
        : (data?.data || []);

    return (
        <>
            <DataTable
                columns={columns}
                data={filteredData}
                searchKey="name"
                searchPlaceholder="Buscar proveedor..."
                filterSlot={
                    <div className="flex items-center gap-2">
                        <ClassificationFilterPopover
                            selected={classificationFilter}
                            onSelect={setClassificationFilter}
                            classifications={classifications}
                        />
                        {classificationFilter ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setClassificationFilter('')}
                                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5 mr-1" />
                                Limpiar
                            </Button>
                        ) : null}
                    </div>
                }
            />
            <SupplierDetailDialog
                supplier={viewSupplier}
                open={!!viewSupplier}
                onClose={() => setViewSupplier(null)}
            />
        </>
    );
}
