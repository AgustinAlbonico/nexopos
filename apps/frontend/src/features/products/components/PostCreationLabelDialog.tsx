import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Printer,
    Tag,
    Layers,
    FileText,
    CheckCircle2,
    Loader2,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';

export type LabelTemplate = 'hangtag_50x90' | 'thermal_50x30' | 'qr_text_price';

interface LabelVariantItem {
    id?: string;
    size: string;
    color: string;
    stock: number;
    sku?: string;
    barcode?: string;
    price?: number | null;
}

interface PostCreationLabelDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly productName: string;
    readonly brandName?: string;
    readonly variants: LabelVariantItem[];
}

export function PostCreationLabelDialog({
    open,
    onOpenChange,
    productName,
    brandName,
    variants,
}: PostCreationLabelDialogProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate>('hangtag_50x90');
    const [quantityMode, setQuantityMode] = useState<'stock_units' | 'one_per_variant'>('stock_units');
    const [isLoading, setIsLoading] = useState(false);

    const totalStockUnits = variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
    const totalVariantsCount = variants.length;
    const totalLabelsToPrint = quantityMode === 'stock_units' ? totalStockUnits : totalVariantsCount;

    const handlePrint = async () => {
        try {
            setIsLoading(true);
            const items = variants
                .filter((v) => (quantityMode === 'stock_units' ? (Number(v.stock) || 0) > 0 : true))
                .map((v) => ({
                    name: productName,
                    brandName: brandName || undefined,
                    size: v.size,
                    color: v.color,
                    sku: v.sku,
                    barcode: v.barcode,
                    price: v.price ?? null,
                    copies: quantityMode === 'stock_units' ? Math.max(1, Number(v.stock) || 1) : 1,
                }));

            if (items.length === 0) {
                toast.warning('No hay etiquetas para generar con la configuración seleccionada.');
                setIsLoading(false);
                return;
            }

            const response = await api.post(
                '/api/products/labels/preview',
                {
                    template: selectedTemplate,
                    items,
                },
                {
                    responseType: 'blob',
                }
            );

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            toast.success(`Se generaron ${totalLabelsToPrint} etiquetas para impresión.`);
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Error al generar las etiquetas de impresión.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                        <Printer className="h-5 w-5 text-blue-600" />
                        Impresión de Etiquetas Post-Guardado
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        ¡Modelo <strong>"{productName}"</strong> guardado con éxito! Elegí el formato de impresión para tus prendas.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Resumen del modelo */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">{productName}</span>
                            <span className="text-slate-500 text-[11px]">{totalVariantsCount} variantes generadas</span>
                        </div>
                        <Badge className="bg-emerald-600 text-white text-xs px-2.5 py-0.5 font-bold">
                            {totalStockUnits} u. stock total
                        </Badge>
                    </div>

                    {/* 1. Selector de Formato de Etiqueta */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                            Formato de Etiqueta
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {/* Hangtag Textil */}
                            <button
                                type="button"
                                onClick={() => setSelectedTemplate('hangtag_50x90')}
                                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                                    selectedTemplate === 'hangtag_50x90'
                                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500 text-blue-950 dark:text-blue-100'
                                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <Tag className="h-4 w-4 text-blue-600" />
                                    {selectedTemplate === 'hangtag_50x90' && (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                                    )}
                                </div>
                                <div>
                                    <div className="font-bold text-xs">Hangtag de Colgar</div>
                                    <div className="text-[10px] text-slate-500">50×90mm • Talle Gigante</div>
                                </div>
                            </button>

                            {/* Térmica Autoadhesiva */}
                            <button
                                type="button"
                                onClick={() => setSelectedTemplate('thermal_50x30')}
                                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                                    selectedTemplate === 'thermal_50x30'
                                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500 text-blue-950 dark:text-blue-100'
                                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <Printer className="h-4 w-4 text-blue-600" />
                                    {selectedTemplate === 'thermal_50x30' && (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                                    )}
                                </div>
                                <div>
                                    <div className="font-bold text-xs">Térmica Rollo</div>
                                    <div className="text-[10px] text-slate-500">50×30mm • Zebra/Argox</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* 2. Cantidad de Etiquetas a Imprimir */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                            Cantidad a Emitir
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setQuantityMode('stock_units')}
                                className={`py-2 px-3 rounded-lg border text-xs text-left transition-all ${
                                    quantityMode === 'stock_units'
                                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 font-semibold text-blue-900 dark:text-blue-100'
                                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                <div>1 por unidad de stock</div>
                                <div className="text-[10px] text-slate-500 font-normal">({totalStockUnits} etiquetas)</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuantityMode('one_per_variant')}
                                className={`py-2 px-3 rounded-lg border text-xs text-left transition-all ${
                                    quantityMode === 'one_per_variant'
                                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 font-semibold text-blue-900 dark:text-blue-100'
                                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                <div>1 por variante / muestra</div>
                                <div className="text-[10px] text-slate-500 font-normal">({totalVariantsCount} etiquetas)</div>
                            </button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="text-slate-500"
                    >
                        Ahora no
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        disabled={isLoading || totalLabelsToPrint === 0}
                        onClick={handlePrint}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                    >
                        {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Printer className="h-3.5 w-3.5" />
                        )}
                        Imprimir {totalLabelsToPrint} Etiquetas
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
