/**
 * Diálogo de confirmación para reponer stock proactivamente (PR9).
 * Recibe un `ReplenishmentAlertDTO` + la ubicación primaria (para saber
 * el destino) y pre-rellena origen/cantidad sugeridos por el backend. La
 * cantidad es editable (capada al saldo real del origen). Al confirmar,
 * llama al mutation `useCreateTransfer`.
 */
import { useMemo, useState } from 'react';
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
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useCreateTransfer } from '../hooks/useLocations';
import { useSystemConfig } from '../hooks/useLocations';
import type { ReplenishmentAlertDTO, Location } from '../types';

interface ReponerConfirmDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly alert: ReplenishmentAlertDTO | null;
    readonly locations: Location[];
}

export function ReponerConfirmDialog({
    open,
    onOpenChange,
    alert,
    locations,
}: ReponerConfirmDialogProps) {
    const { data: systemConfig } = useSystemConfig();
    const transfer = useCreateTransfer();

    const primaryId = systemConfig?.primarySaleLocationId ?? null;

    const sourceLocation = useMemo(
        () =>
            alert?.suggestedSourceLocationId
                ? locations.find((l) => l.id === alert.suggestedSourceLocationId) ?? null
                : null,
        [alert, locations],
    );

    const [override, setOverride] = useState<number | null>(null);
    const quantity = override ?? alert?.suggestedQuantity ?? 0;
    const setQuantity = (v: number) => setOverride(v);

    if (!alert) return null;

    const canSubmit =
        !transfer.isPending &&
        Boolean(sourceLocation) &&
        Boolean(primaryId) &&
        sourceLocation?.id !== primaryId &&
        quantity > 0 &&
        quantity <= alert.reserveStock;

    const handleConfirm = async () => {
        if (!sourceLocation || !primaryId) return;
        await transfer.mutateAsync({
            productId: alert.productId,
            fromLocationId: sourceLocation.id,
            toLocationId: primaryId,
            quantity,
            reason: 'Reposición proactiva',
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>Reponer stock</DialogTitle>
                    <DialogDescription>
                        {alert.productName} — trasladá unidades del depósito al
                        salón.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="rounded-lg border bg-card p-3 text-sm space-y-1">
                        <p className="flex items-center gap-2">
                            <span className="text-muted-foreground">Stock en venta:</span>
                            <span className="font-medium">{alert.currentLocationStock}</span>
                        </p>
                        <p className="flex items-center gap-2">
                            <span className="text-muted-foreground">Mínimo de reposición:</span>
                            <span className="font-medium">{alert.minimum}</span>
                        </p>
                        <p className="flex items-center gap-2">
                            <span className="text-muted-foreground">Stock en reserva:</span>
                            <span className="font-medium">{alert.reserveStock}</span>
                        </p>
                    </div>

                    {sourceLocation && primaryId ? (
                        <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/40 p-3 text-sm">
                            <span className="font-medium">{sourceLocation.name}</span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                                {locations.find((l) => l.id === primaryId)?.name ?? 'Venta'}
                            </span>
                        </div>
                    ) : (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                No hay una ubicación de origen con stock disponible
                                para este producto.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-1">
                        <Label htmlFor="transfer-quantity">Cantidad a trasladar</Label>
                        <NumericInput
                            id="transfer-quantity"
                            value={quantity}
                            onChange={(v) =>
                                setQuantity(typeof v === 'number' ? v : Number.parseFloat(String(v)) || 0)
                            }
                            min={0.01}
                            max={alert.reserveStock}
                            disabled={!sourceLocation}
                        />
                        {quantity > alert.reserveStock && (
                            <p className="text-xs text-destructive">
                                Supera el stock disponible en reserva ({alert.reserveStock}).
                            </p>
                        )}
                    </div>

                    {transfer.isError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {(transfer.error as { response?: { data?: { message?: string } } })
                                    ?.response?.data?.message ?? 'No se pudo crear el traslado'}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={transfer.isPending}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!canSubmit}
                    >
                        {transfer.isPending ? 'Trasladando…' : 'Reponer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}