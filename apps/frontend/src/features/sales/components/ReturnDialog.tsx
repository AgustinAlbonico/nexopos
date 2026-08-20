import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CreateSaleReturnDTO, Sale } from '../types';

interface ReturnDialogProps {
    readonly open: boolean;
    readonly sale: Sale;
    readonly onOpenChange: (open: boolean) => void;
    readonly onPreview: (input: CreateSaleReturnDTO) => Promise<{ totalRefund: number }>;
    readonly onConfirm: (input: CreateSaleReturnDTO) => Promise<void>;
    readonly isSubmitting: boolean;
}

export function ReturnDialog({ open, sale, onOpenChange, onPreview, onConfirm, isSubmitting }: ReturnDialogProps) {
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [dispositions, setDispositions] = useState<Record<string, CreateSaleReturnDTO['items'][number]['disposition']>>({});
    const [previewTotal, setPreviewTotal] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setQuantities({});
        setDispositions({});
        setPreviewTotal(null);
        setError(null);
    }, [open, sale.id]);

    const payload = useMemo<CreateSaleReturnDTO | null>(() => {
        const items = sale.items.flatMap((item) => {
            const quantity = quantities[item.id] ?? 0;
            if (quantity <= 0) return [];
            return [{ originalSaleItemId: item.id, quantityReturned: quantity, unitRefundAmount: item.unitPrice, disposition: dispositions[item.id] ?? 'restock' }];
        });
        if (items.length === 0) return null;
        return { originalSaleId: sale.id, items };
    }, [dispositions, quantities, sale]);

    const preview = async () => {
        if (!payload || isSubmitting) return;
        try {
            setError(null);
            setPreviewTotal((await onPreview(payload)).totalRefund);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'No se pudo previsualizar la devolución');
        }
    };

    const confirm = async () => {
        if (!payload || isSubmitting) return;
        try {
            setError(null);
            await onConfirm(payload);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'No se pudo confirmar la devolución');
        }
    };

    return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5 text-primary" />Devolver venta {sale.saleNumber}</DialogTitle>
                <DialogDescription>Indicá qué artículos vuelven y su destino de inventario.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[55vh] overflow-y-auto">
                {sale.items.map((item) => <div key={item.id} className="rounded-lg border bg-card p-3 grid gap-3 sm:grid-cols-[1fr_9rem_10rem] sm:items-end">
                    <div><p className="font-medium">{item.productDescription}</p><p className="text-sm text-muted-foreground">Vendidos: {item.quantity} · ${item.unitPrice}</p></div>
                    <div><Label htmlFor={`return-quantity-${item.id}`}>Cantidad a devolver</Label><Input id={`return-quantity-${item.id}`} type="number" min="0" max={item.quantity} step="0.001" value={quantities[item.id] ?? ''} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Math.min(item.quantity, Math.max(0, Number(event.target.value) || 0)) }))} /></div>
                    <div><Label>Destino</Label><Select value={dispositions[item.id] ?? 'restock'} onValueChange={(value: CreateSaleReturnDTO['items'][number]['disposition']) => setDispositions((current) => ({ ...current, [item.id]: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="restock">Reintegrar stock</SelectItem><SelectItem value="quarantine">Cuarentena</SelectItem><SelectItem value="scrap">Merma</SelectItem><SelectItem value="supplier">Proveedor</SelectItem></SelectContent></Select></div>
                </div>)}
            </div>
            {previewTotal !== null ? <p className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">Reintegro estimado: ${previewTotal.toFixed(2)}</p> : null}
            {error ? <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert> : null}
            <DialogFooter className="gap-2 sm:gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>{previewTotal === null ? <Button type="button" onClick={preview} disabled={!payload || isSubmitting}>Previsualizar</Button> : <Button type="button" onClick={confirm} disabled={!payload || isSubmitting}>{isSubmitting ? 'Confirmando...' : 'Confirmar devolución'}</Button>}</DialogFooter>
        </DialogContent>
    </Dialog>;
}
