/**
 * Diálogo "Reponer y continuar" del POS — modo sectorizado (PR8).
 *
 * Recibe la lista de items bloqueados del 409 `SaleBlockedByStockError`
 * (que ya trae `options` por ítem) y deja al usuario elegir una ubicación
 * alternativa por producto. Emite la lista de traslados que el padre
 * enviará como `replenishmentTransfers` al backend.
 *
 * No consulta al backend por su cuenta: el padre dispara el refetch de
 * `useReplenishmentOptions` cuando hace falta (ver `SalesPage`).
 */
import { useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type {
    BlockedStockItemDTO,
    ReplenishmentTransferDTO,
} from '../types';

interface ReplenishmentDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly items: BlockedStockItemDTO[];
    readonly isSubmitting?: boolean;
    readonly submitError?: string | null;
    readonly onConfirm: (transfers: ReplenishmentTransferDTO[]) => void;
}

function buildInitialSelections(items: BlockedStockItemDTO[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const item of items) {
        const idx = item.options.findIndex((o) => o.available >= item.requested);
        if (idx >= 0) {
            map.set(item.productId, idx);
        }
    }
    return map;
}

export function ReplenishmentDialog({
    open,
    onOpenChange,
    items,
    isSubmitting = false,
    submitError = null,
    onConfirm,
}: ReplenishmentDialogProps) {
    // Memo depende de `items`; cuando llegan items nuevos (otro 409),
    // re-derivamos la selección inicial (primera opción full-match).
    const initialSelections = useMemo(() => buildInitialSelections(items), [items]);
    const [selections, setSelections] = useState<Map<string, number>>(initialSelections);

    useEffect(() => {
        setSelections(initialSelections);
    }, [initialSelections]);

    const allSatisfied = items.every((item) => {
        const idx = selections.get(item.productId);
        if (idx === undefined) return false;
        const opt = item.options[idx];
        return !!opt && opt.available >= item.requested;
    });

    const handleConfirm = () => {
        if (!allSatisfied || isSubmitting) return;
        const transfers: ReplenishmentTransferDTO[] = [];
        for (const item of items) {
            const idx = selections.get(item.productId);
            if (idx === undefined) continue;
            const opt = item.options[idx];
            transfers.push({
                productId: item.productId,
                fromLocationId: opt.locationId,
                quantity: item.requested,
            });
        }
        onConfirm(transfers);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        Reponer y continuar
                    </DialogTitle>
                    <DialogDescription>
                        La ubicación principal de venta no alcanza para algunos productos.
                        Elegí desde dónde reponer para completar la venta.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] -mx-2 px-2">
                    <div className="space-y-4">
                        {items.map((item) => {
                            const fullMatches = item.options
                                .map((opt, idx) => ({ opt, idx }))
                                .filter(({ opt }) => opt.available >= item.requested);
                            const partialMatches = item.options
                                .filter((o) => o.available < item.requested)
                                .slice(0, 3);

                            const hasFullMatch = fullMatches.length > 0;
                            const selectedIdx = selections.get(item.productId);

                            return (
                                <div
                                    key={item.productId}
                                    className="rounded-lg border bg-card p-3 space-y-2"
                                >
                                    <div className="flex items-baseline justify-between gap-2">
                                        <p className="font-medium">{item.productName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Solicitado {item.requested} · hay{' '}
                                            <span className="font-medium text-foreground">
                                                {item.primarySaleAvailable}
                                            </span>{' '}
                                            en venta
                                        </p>
                                    </div>

                                    {hasFullMatch ? (
                                        <ul className="space-y-1.5">
                                            {fullMatches.map(({ opt, idx }) => {
                                                const isSelected = selectedIdx === idx;
                                                return (
                                                    <li
                                                        key={opt.locationId}
                                                        className={cn(
                                                            'flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
                                                            isSelected
                                                                ? 'border-primary bg-primary/5'
                                                                : 'bg-background',
                                                        )}
                                                    >
                                                        <div>
                                                            <p className="font-medium">
                                                                {opt.locationName}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                Disponible: {opt.available}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant={isSelected ? 'default' : 'outline'}
                                                            onClick={() =>
                                                                setSelections((prev) => {
                                                                    const next = new Map(prev);
                                                                    next.set(item.productId, idx);
                                                                    return next;
                                                                })
                                                            }
                                                            disabled={isSubmitting}
                                                            aria-label={`Reponer desde ${opt.locationName}`}
                                                        >
                                                            Reponer desde acá
                                                            <ArrowRight className="ml-1 h-3 w-3" />
                                                        </Button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm">
                                            <p className="font-medium text-destructive">
                                                Stock insuficiente en el depósito
                                            </p>
                                            {partialMatches.length > 0 && (
                                                <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                                                    {partialMatches.map((p) => (
                                                        <li key={p.locationId}>
                                                            · {p.locationName}: {p.available} (no
                                                            alcanza)
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>

                {submitError && (
                    <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                )}

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!allSatisfied || isSubmitting}
                        title={!allSatisfied ? 'Falta elegir reposición para algún producto' : undefined}
                    >
                        {isSubmitting ? 'Procesando...' : 'Reponer y continuar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}