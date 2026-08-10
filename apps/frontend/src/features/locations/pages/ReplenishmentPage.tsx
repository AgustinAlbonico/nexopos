/**
 * ReplenishmentPage (PR9) — lista proactiva de reposiciones del salón.
 *
 * En modo sectorizado: tabla con productos a reponer (origen sugerido,
 * cantidad sugerida, stock en reserva). Cada fila tiene un botón "Reponer"
 * que abre `ReponerConfirmDialog`. Soporta selección múltiple + acción
 * masiva "Reponer seleccionados" que ejecuta cada traslado por separado;
 * si uno falla muestra error en el banner global y detiene el resto.
 *
 * En modo simple: banner explicativo + tabla con las alertas de compra.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Boxes, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ActivationBanner } from '../components/ActivationBanner';
import { ReponerConfirmDialog } from '../components/ReponerConfirmDialog';
import {
    useCreateTransfer,
    useLocations,
    useStockAlerts,
    useSystemConfig,
} from '../hooks/useLocations';
import type { ReplenishmentAlertDTO, PurchaseAlertDTO } from '../types';

export function ReplenishmentPage() {
    const { data: systemConfig } = useSystemConfig();
    const sectorized = Boolean(systemConfig?.stockSectorizado);
    const { data: locations } = useLocations();
    const { data: alerts, isLoading } = useStockAlerts();
    const transfer = useCreateTransfer();

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [dialogAlert, setDialogAlert] = useState<ReplenishmentAlertDTO | null>(null);
    const [bulkErrors, setBulkErrors] = useState<Map<string, string>>(new Map());

    const repAlerts = alerts?.replenishmentAlerts ?? [];
    const purAlerts = alerts?.purchaseAlerts ?? [];

    const locationsById = useMemo(() => {
        const map = new Map<string, string>();
        (locations ?? []).forEach((l) => map.set(l.id, l.name));
        return map;
    }, [locations]);

    const toggleSelected = (productId: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(productId)) next.delete(productId);
            else next.add(productId);
            return next;
        });
    };

    const handleSingle = (alert: ReplenishmentAlertDTO) => {
        setBulkErrors(new Map());
        setDialogAlert(alert);
    };

    const handleBulk = async () => {
        if (!systemConfig?.primarySaleLocationId) {
            toast.error('No hay ubicación principal de venta configurada');
            return;
        }
        const errors = new Map<string, string>();
        const successfulIds: string[] = [];
        // ponytail: sequential on purpose — spec says "stop on first error".
        // Promise.all would need an all-or-nothing batch tx which we don't have.
        for (const alert of repAlerts) {
            if (!selected.has(alert.productId)) continue;
            if (!alert.suggestedSourceLocationId || alert.suggestedQuantity <= 0) {
                errors.set(alert.productId, 'Sin origen o cantidad sugerida');
                continue;
            }
            try {
                await transfer.mutateAsync({
                    productId: alert.productId,
                    fromLocationId: alert.suggestedSourceLocationId,
                    toLocationId: systemConfig.primarySaleLocationId,
                    quantity: alert.suggestedQuantity,
                    reason: 'Reposición proactiva (masiva)',
                });
                successfulIds.push(alert.productId);
            } catch (err) {
                const msg =
                    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                    'Error al reponer';
                errors.set(alert.productId, msg);
                break;
            }
        }
        setBulkErrors(errors);
        setSelected((prev) => {
            const next = new Set(prev);
            successfulIds.forEach((id) => next.delete(id));
            return next;
        });
        if (errors.size === 0 && successfulIds.length > 0) {
            toast.success('Reposiciones completadas');
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 space-y-4">
            <header>
                <h1 className="text-2xl font-bold tracking-tight">Reposición</h1>
                <p className="text-sm text-muted-foreground">
                    Productos con stock bajo en el salón que tienen reserva
                    disponible para trasladar.
                </p>
            </header>

            {!systemConfig ? null : !sectorized ? (
                <>
                    <ActivationBanner description="El modo sectorizado está desactivado. La reposición proactiva entre ubicaciones no aplica. Mostrando las alertas de compra." />
                    {<PurchaseAlertsTable items={purAlerts} />}
                </>
            ) : (
                <>
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">
                            {repAlerts.length === 0
                                ? 'No hay productos a reponer.'
                                : `${repAlerts.length} producto${repAlerts.length === 1 ? '' : 's'} a reponer`}
                        </p>
                        {selected.size > 0 && (
                            <Button
                                onClick={handleBulk}
                                disabled={transfer.isPending}
                                data-testid="bulk-reponer-btn"
                            >
                                {transfer.isPending ? (
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                ) : (
                                    <Boxes className="mr-1 h-4 w-4" />
                                )}
                                Reponer seleccionados ({selected.size})
                            </Button>
                        )}
                    </div>

                    {bulkErrors.size > 0 && (
                        <Alert variant="destructive" data-testid="bulk-errors">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Algunas reposiciones fallaron:
                                <ul className="mt-1 list-disc pl-5 text-xs">
                                    {[...bulkErrors].map(([id, msg]) => (
                                        <li key={id}>
                                            {repAlerts.find((a) => a.productId === id)?.productName ?? id}: {msg}
                                        </li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="rounded-md border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10" />
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-right">Stock en venta</TableHead>
                                    <TableHead className="text-right">Mínimo</TableHead>
                                    <TableHead className="text-right">Stock en reserva</TableHead>
                                    <TableHead>Origen sugerido</TableHead>
                                    <TableHead className="text-right">Cantidad sugerida</TableHead>
                                    <TableHead className="w-32 text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                                            Cargando alertas…
                                        </TableCell>
                                    </TableRow>
                                ) : repAlerts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            <CheckCircle2 className="inline h-5 w-5 mr-2 text-emerald-500" />
                                            Todo el salón está por encima del mínimo.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    repAlerts.map((a) => {
                                        const originName = a.suggestedSourceLocationId
                                            ? locationsById.get(a.suggestedSourceLocationId) ?? '—'
                                            : null;
                                        const isSelected = selected.has(a.productId);
                                        return (
                                            <TableRow
                                                key={a.productId}
                                                data-testid={`replenishment-row-${a.productName}`}
                                            >
                                                <TableCell>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleSelected(a.productId)}
                                                        disabled={!a.suggestedSourceLocationId || a.suggestedQuantity <= 0}
                                                        aria-label={`Seleccionar ${a.productName}`}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">{a.productName}</TableCell>
                                                <TableCell className="text-right tabular-nums">{a.currentLocationStock}</TableCell>
                                                <TableCell className="text-right tabular-nums">{a.minimum}</TableCell>
                                                <TableCell className="text-right tabular-nums">{a.reserveStock}</TableCell>
                                                <TableCell>
                                                    {originName ? (
                                                        <Badge variant="outline">{originName}</Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">Sin origen</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {a.suggestedQuantity > 0 ? a.suggestedQuantity : '—'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSingle(a)}
                                                        disabled={
                                                            !a.suggestedSourceLocationId ||
                                                            a.suggestedQuantity <= 0
                                                        }
                                                        data-testid={`reponer-btn-${a.productName}`}
                                                    >
                                                        Reponer
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}

            <ReponerConfirmDialog
                key={dialogAlert?.productId ?? 'none'}
                open={dialogAlert !== null}
                onOpenChange={(o) => !o && setDialogAlert(null)}
                alert={dialogAlert}
                locations={locations ?? []}
            />
        </div>
    );
}

export default ReplenishmentPage;

function PurchaseAlertsTable({ items }: { readonly items: PurchaseAlertDTO[] }) {
    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Stock actual</TableHead>
                        <TableHead className="text-right">Mínimo</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                                No hay productos para comprar.
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map((p) => (
                            <TableRow key={p.productId} data-testid={`purchase-row-${p.productName}`}>
                                <TableCell className="font-medium">{p.productName}</TableCell>
                                <TableCell className="text-right tabular-nums">{p.currentStock}</TableCell>
                                <TableCell className="text-right tabular-nums">{p.minimum}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}