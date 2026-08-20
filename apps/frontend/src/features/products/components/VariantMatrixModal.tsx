import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Loader2, Pencil, Plus, Trash2, X, Sparkles } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

import { attributeOptionsApi, productsApi } from '../api/products.api';
import type { VariantAttributeOption } from '../types';
import { useCapabilities } from '@/hooks/useCapabilities';

interface VariantMatrixModalProps {
    readonly parentProductId: string;
    readonly parentProductName: string;
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onSuccess: () => void;
}

type AttributeType = 'color' | 'size';

export function VariantMatrixModal({
    parentProductId,
    parentProductName,
    open,
    onClose,
    onSuccess,
}: VariantMatrixModalProps) {
    const queryClient = useQueryClient();
    const { data: capabilities } = useCapabilities(open);
    const hasVariantsCapability = capabilities.capabilities['STRUCTURAL.variants'] === true;

    // Selected se trackea por nombre (string), igual que el contrato original
    // de `generateVariants`. Map<id, name> permite resolver nombres en
    // generate() aunque el catálogo esté stale después de create/edit/delete.
    const [selectedTalleIds, setSelectedTalleIds] = useState<string[]>([]);
    const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
    const [nameById, setNameById] = useState<Record<string, string>>({});
    const [newTalle, setNewTalle] = useState('');
    const [newColor, setNewColor] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Edit / delete UI state (uno a la vez, simplifica la lógica)
    const [editingOption, setEditingOption] = useState<VariantAttributeOption | null>(null);
    const [editName, setEditName] = useState('');
    const [editHex, setEditHex] = useState('');
    const [optionToDelete, setOptionToDelete] = useState<VariantAttributeOption | null>(null);
    const [usageCount, setUsageCount] = useState<number>(0);
    const [loadingUsage, setLoadingUsage] = useState(false);

    // --- Catalog queries (gateados por capability) ---
    const sizesQuery = useQuery({
        queryKey: ['variant-attribute-options', 'size'],
        queryFn: () => attributeOptionsApi.getAll('size'),
        enabled: hasVariantsCapability && open,
        staleTime: 0,
    });
    const colorsQuery = useQuery({
        queryKey: ['variant-attribute-options', 'color'],
        queryFn: () => attributeOptionsApi.getAll('color'),
        enabled: hasVariantsCapability && open,
        staleTime: 0,
    });

    const sizes = sizesQuery.data ?? [];
    const colors = colorsQuery.data ?? [];

    const refreshCatalog = () => {
        queryClient.invalidateQueries({ queryKey: ['variant-attribute-options'] });
    };

    const rememberName = (opt: VariantAttributeOption) => {
        setNameById((prev) => ({ ...prev, [opt.id]: opt.name }));
    };

    const isSelected = (id: string, kind: AttributeType) =>
        kind === 'size' ? selectedTalleIds.includes(id) : selectedColorIds.includes(id);

    const toggleSelected = (opt: VariantAttributeOption) => {
        rememberName(opt);
        const setter = opt.type === 'size' ? setSelectedTalleIds : setSelectedColorIds;
        setter((prev) => (prev.includes(opt.id) ? prev.filter((x) => x !== opt.id) : [...prev, opt.id]));
    };

    // --- Mutations ---
    const createMutation = useMutation({
        mutationFn: (data: { type: AttributeType; name: string }) =>
            attributeOptionsApi.create({ type: data.type, name: data.name, colorHex: null }),
        onSuccess: (created, vars) => {
            rememberName(created);
            const setter = vars.type === 'size' ? setSelectedTalleIds : setSelectedColorIds;
            setter((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
            refreshCatalog();
        },
        onError: (error: Error) => toast.error(error.message || 'No se pudo crear la opción'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, name, colorHex }: { id: string; name: string; colorHex: string | null }) =>
            attributeOptionsApi.update(id, { name, colorHex }),
        onSuccess: (updated) => {
            rememberName(updated);
            setNameById((prev) => ({ ...prev, [updated.id]: updated.name }));
            setEditingOption(null);
            refreshCatalog();
            toast.success(`Opción actualizada a "${updated.name}"`);
        },
        onError: (error: Error) => toast.error(error.message || 'No se pudo actualizar la opción'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => attributeOptionsApi.delete(id),
        onSuccess: (res) => {
            if (res.usageCount > 0) {
                toast.warning(`${res.usageCount} variante(s) quedarán sin esta opción.`);
            } else {
                toast.success('Opción eliminada');
            }
            setNameById((prev) => {
                const next = { ...prev };
                delete next[optionToDelete?.id ?? ''];
                return next;
            });
            setSelectedTalleIds((prev) => prev.filter((x) => x !== optionToDelete?.id));
            setSelectedColorIds((prev) => prev.filter((x) => x !== optionToDelete?.id));
            setOptionToDelete(null);
            refreshCatalog();
        },
        onError: (error: Error) => toast.error(error.message || 'No se pudo eliminar la opción'),
    });

    // --- On-the-fly create ---
    const handleCreate = (type: AttributeType, raw: string) => {
        const name = raw.trim();
        if (!name) return;
        const existing = (type === 'size' ? sizes : colors).find(
            (o) => o.name.toLowerCase() === name.toLowerCase(),
        );
        if (existing) {
            // Dedup case-insensitive: solo seleccionar, NO crear
            rememberName(existing);
            const setter = type === 'size' ? setSelectedTalleIds : setSelectedColorIds;
            setter((prev) => (prev.includes(existing.id) ? prev : [...prev, existing.id]));
        } else {
            createMutation.mutate({ type, name });
        }
        if (type === 'size') setNewTalle('');
        else setNewColor('');
    };

    const handleCreateKey = (type: AttributeType, raw: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCreate(type, raw);
        }
    };

    // --- Edit inline ---
    const startEdit = (opt: VariantAttributeOption) => {
        setEditingOption(opt);
        setEditName(opt.name);
        setEditHex(opt.colorHex ?? '');
    };

    const cancelEdit = () => setEditingOption(null);

    const saveEdit = () => {
        if (!editingOption) return;
        const trimmed = editName.trim();
        if (!trimmed) return;
        updateMutation.mutate({
            id: editingOption.id,
            name: trimmed,
            colorHex: editingOption.type === 'color' && editHex ? editHex : null,
        });
    };

    const handleEditKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    };

    // --- Delete flow ---
    const askDelete = async (opt: VariantAttributeOption) => {
        setLoadingUsage(true);
        try {
            const { usageCount: count } = await attributeOptionsApi.getUsageCount(opt.id);
            setUsageCount(count);
        } catch {
            setUsageCount(0);
        }
        setLoadingUsage(false);
        setOptionToDelete(opt);
    };

    const confirmDelete = () => {
        if (optionToDelete) deleteMutation.mutate(optionToDelete.id);
    };

    // --- Generate (contract unchanged: {Talle, Color} as string[] of names) ---
    const totalCombinations = selectedTalleIds.length * selectedColorIds.length;

    const handleGenerate = async () => {
        if (selectedTalleIds.length === 0 || selectedColorIds.length === 0) {
            toast.error('Debes seleccionar al menos 1 talle y 1 color');
            return;
        }
        const talles = selectedTalleIds.map((id) => nameById[id]).filter(Boolean);
        const colores = selectedColorIds.map((id) => nameById[id]).filter(Boolean);
        if (talles.length !== selectedTalleIds.length || colores.length !== selectedColorIds.length) {
            toast.error('Faltan nombres de opciones. Refrescá el catálogo e intentá de nuevo.');
            return;
        }
        try {
            setIsLoading(true);
            // @ts-expect-error generateVariants es gap pre-existente del modal borrado
            await productsApi.generateVariants(parentProductId, { Talle: talles, Color: colores });
            toast.success(`¡Se generaron ${totalCombinations} variantes de "${parentProductName}" con éxito!`);
            onSuccess();
            onClose();
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Error al generar la matriz de variantes';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Render helpers ---
    const renderCatalogRow = (opt: VariantAttributeOption) => {
        const isEditing = editingOption?.id === opt.id;
        const selected = isSelected(opt.id, opt.type);
        return (
            <div
                key={opt.id}
                className={cn(
                    'flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors',
                    selected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/40',
                )}
                data-testid={`catalog-row-${opt.id}`}
            >
                {opt.type === 'color' && (
                    <span
                        className="inline-block h-4 w-4 shrink-0 rounded-full border border-border"
                        style={{ backgroundColor: opt.colorHex ?? 'transparent' }}
                        aria-hidden
                        data-testid={`catalog-swatch-${opt.id}`}
                    />
                )}
                {isEditing ? (
                    <div className="flex flex-1 items-center gap-2">
                        <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-7 text-xs"
                            autoFocus
                            onKeyDown={handleEditKey}
                            data-testid={`edit-name-${opt.id}`}
                        />
                        {opt.type === 'color' && (
                            <Input
                                value={editHex}
                                onChange={(e) => setEditHex(e.target.value)}
                                placeholder="#000000"
                                className="h-7 w-24 text-xs font-mono"
                                onKeyDown={handleEditKey}
                                data-testid={`edit-hex-${opt.id}`}
                            />
                        )}
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={saveEdit}
                            disabled={updateMutation.isPending}
                            aria-label="Guardar cambios"
                            data-testid={`save-edit-${opt.id}`}
                        >
                            {updateMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                            )}
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={cancelEdit}
                            aria-label="Cancelar edición"
                            data-testid={`cancel-edit-${opt.id}`}
                        >
                            <X className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                    </div>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => toggleSelected(opt)}
                            className="flex-1 text-left"
                            data-testid={`catalog-toggle-${opt.id}`}
                        >
                            <span className="font-medium">{opt.name}</span>
                        </button>
                        <div className="flex items-center gap-1">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => startEdit(opt)}
                                aria-label={`Editar ${opt.name}`}
                                data-testid={`catalog-edit-${opt.id}`}
                            >
                                <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => askDelete(opt)}
                                aria-label={`Eliminar ${opt.name}`}
                                data-testid={`catalog-delete-${opt.id}`}
                            >
                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                            </Button>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const catalogByType = (type: AttributeType) => {
        const list = type === 'size' ? sizes : colors;
        const loading = type === 'size' ? sizesQuery.isLoading : colorsQuery.isLoading;
        return { list, loading };
    };

    const renderSection = (type: AttributeType, placeholder: string, inputValue: string, setInput: (v: string) => void) => {
        const { list, loading } = catalogByType(type);
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="font-semibold text-sm">
                        {type === 'size' ? '1. Talles' : '2. Colores'}
                    </Label>
                    <span className="text-xs text-muted-foreground">{list.length} opciones</span>
                </div>

                {/* Selected chips */}
                <div
                    className="flex flex-wrap gap-1.5 rounded-lg border bg-muted/20 p-3 min-h-[52px]"
                    data-testid={`selected-${type}`}
                >
                    {(type === 'size' ? selectedTalleIds : selectedColorIds).map((id) => {
                        const opt = list.find((o) => o.id === id);
                        const name = opt?.name ?? nameById[id] ?? id;
                        return (
                            <Badge
                                key={id}
                                variant="secondary"
                                className="gap-1 text-sm py-1 px-2.5"
                                data-testid={`selected-chip-${type}-${id}`}
                            >
                                {type === 'color' && (
                                    <span
                                        className="inline-block h-3 w-3 rounded-full border border-border"
                                        style={{ backgroundColor: opt?.colorHex ?? 'transparent' }}
                                        aria-hidden
                                    />
                                )}
                                {name}
                                <button
                                    type="button"
                                    onClick={() => toggleSelected(opt ?? ({ id, name, type, colorHex: null, createdAt: '', updatedAt: '' } as VariantAttributeOption))}
                                    className="hover:text-destructive"
                                    aria-label={`Quitar ${name}`}
                                    data-testid={`remove-chip-${type}-${id}`}
                                >
                                    &times;
                                </button>
                            </Badge>
                        );
                    })}
                </div>

                {/* Free-input high al vuelo */}
                <div className="flex gap-2">
                    <Input
                        placeholder={placeholder}
                        value={inputValue}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleCreateKey(type, inputValue)}
                        data-testid={`input-new-${type}`}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleCreate(type, inputValue)}
                        disabled={createMutation.isPending}
                        aria-label="Agregar opción"
                        data-testid={`add-${type}`}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {/* Catalog list con edit/delete inline */}
                <div
                    className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2"
                    data-testid={`catalog-${type}`}
                >
                    {loading && <p className="text-xs text-muted-foreground p-2">Cargando catálogo...</p>}
                    {!loading && list.length === 0 && (
                        <p className="text-xs text-muted-foreground p-2">
                            Sin opciones todavía. Usá el campo de arriba para crear la primera.
                        </p>
                    )}
                    {!loading && list.map(renderCatalogRow)}
                </div>
            </div>
        );
    };

    const capabilityBlocked = !hasVariantsCapability;

    return (
        <>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[640px]">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-primary">
                            <Sparkles className="h-5 w-5" />
                            <DialogTitle>Generar Matriz de Variantes</DialogTitle>
                        </div>
                        <DialogDescription>
                            Crea variantes de <strong>{parentProductName}</strong> combinando talles y colores
                            del catálogo maestro.
                        </DialogDescription>
                    </DialogHeader>

                    {capabilityBlocked ? (
                        <div
                            className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
                            data-testid="capability-blocked"
                        >
                            <p className="font-medium">El catálogo de variantes no está disponible</p>
                            <p className="text-xs mt-1">
                                El perfil de negocio activo no incluye la capacidad STRUCTURAL.variants.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6 py-3">
                            {renderSection(
                                'size',
                                'Agregar talle (ej: XXXL o 39)',
                                newTalle,
                                setNewTalle,
                            )}
                            {renderSection(
                                'color',
                                'Agregar color (ej: Camel)',
                                newColor,
                                setNewColor,
                            )}

                            <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                                        Resultado de la Matriz
                                    </p>
                                    <p className="text-sm font-medium text-foreground mt-0.5">
                                        Se crearán <strong>{totalCombinations}</strong> variantes independientes en el catálogo.
                                    </p>
                                </div>
                                <Badge className="text-base px-3 py-1 bg-primary text-primary-foreground font-bold">
                                    {totalCombinations} SKUs
                                </Badge>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                            data-testid="cancel-button"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleGenerate}
                            disabled={isLoading || totalCombinations === 0 || capabilityBlocked}
                            className="gap-2 font-semibold"
                            data-testid="generate-button"
                        >
                            {isLoading
                                ? 'Generando...'
                                : `Generar ${totalCombinations} ${totalCombinations === 1 ? 'Variante' : 'Variantes'}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* AlertDialog de confirmación de borrado */}
            <AlertDialog
                open={!!optionToDelete && !loadingUsage}
                onOpenChange={(o) => !o && setOptionToDelete(null)}
            >
                <AlertDialogContent data-testid="delete-dialog">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar opción?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                <p>
                                    ¿Eliminar <strong>{optionToDelete?.name}</strong> del catálogo?
                                </p>
                                {usageCount > 0 ? (
                                    <p className="text-amber-600 font-medium" data-testid="usage-warning">
                                        ⚠️ {usageCount} variante{usageCount > 1 ? 's' : ''} usan este {optionToDelete?.type === 'color' ? 'color' : 'talle'}.
                                    </p>
                                ) : (
                                    <p className="text-muted-foreground">
                                        Esta opción no tiene variantes asociadas.
                                    </p>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-500 hover:bg-red-600"
                            disabled={deleteMutation.isPending}
                            data-testid="confirm-delete"
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                'Eliminar'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}