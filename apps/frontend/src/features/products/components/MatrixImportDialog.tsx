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
    Upload,
    FileSpreadsheet,
    Download,
    CheckCircle2,
    AlertCircle,
    Loader2,
    PackageCheck,
    Layers,
    X,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { matrixImportApi, MatrixPreviewResponse } from '../api/products.api';

interface MatrixImportDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly onSuccess?: () => void;
}

export function MatrixImportDialog({
    open,
    onOpenChange,
    onSuccess,
}: MatrixImportDialogProps) {
    const queryClient = useQueryClient();
    const [rawCsv, setRawCsv] = useState<string>('');
    const [fileName, setFileName] = useState<string>('');
    const [previewData, setPreviewData] = useState<MatrixPreviewResponse | null>(null);

    // Mutación de Preview
    const previewMutation = useMutation({
        mutationFn: (csv: string) => matrixImportApi.preview(csv),
        onSuccess: (data) => {
            setPreviewData(data);
            if (data.errors && data.errors.length > 0) {
                toast.warning(`Se encontraron ${data.errors.length} advertencias en el archivo.`);
            } else {
                toast.success('Archivo analizado con éxito');
            }
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Error al procesar el archivo CSV');
            setPreviewData(null);
        },
    });

    // Mutación de Commit
    const commitMutation = useMutation({
        mutationFn: (csv: string) => matrixImportApi.commit(csv),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success(
                `¡Importación completada! Se crearon ${result.importedModels} modelos con ${result.importedVariants} variantes y ${result.totalStockUnits} unidades de stock.`
            );
            handleClose();
            onSuccess?.();
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || 'Error al importar los productos');
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setRawCsv(content);
            previewMutation.mutate(content);
        };
        reader.readAsText(file, 'UTF-8');
    };

    const handleDownloadTemplate = async () => {
        try {
            await matrixImportApi.downloadTemplate();
            toast.success('Plantilla descargada');
        } catch (error) {
            toast.error('Error al descargar la plantilla');
        }
    };

    const handleClose = () => {
        setRawCsv('');
        setFileName('');
        setPreviewData(null);
        onOpenChange(false);
    };

    const handleCommit = () => {
        if (!rawCsv) return;
        commitMutation.mutate(rawCsv);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                        Importación Masiva de Indumentaria (Matriz 2D)
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Cargá múltiples modelos, colores y curvas de talles en un solo archivo CSV o Excel bidimensional.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Botón de Descarga de Plantilla y Zona de Carga */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                ¿No tenés la plantilla oficial?
                            </h4>
                            <p className="text-[11px] text-slate-500">
                                Descargá el formato con ejemplos de modelos, colores y columnas de talles.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadTemplate}
                            className="h-8 text-xs gap-1.5 shrink-0 bg-white dark:bg-slate-950"
                        >
                            <Download className="h-3.5 w-3.5 text-blue-600" />
                            Descargar Plantilla CSV
                        </Button>
                    </div>

                    {/* Drag & Drop / Input de Archivo */}
                    {!previewData ? (
                        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                            <Upload className="h-8 w-8 text-blue-500 mb-2" />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {fileName ? fileName : 'Seleccioná o arrastrá tu archivo CSV matricial'}
                            </span>
                            <span className="text-xs text-slate-400 mt-1">
                                Formato soportado: .csv delimitado por comas
                            </span>
                            <input
                                type="file"
                                accept=".csv,text/csv"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            {previewMutation.isPending && (
                                <div className="flex items-center gap-2 mt-3 text-xs text-blue-600 font-medium">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Analizando estructura...
                                </div>
                            )}
                        </label>
                    ) : (
                        <div className="space-y-4">
                            {/* Resumen de Datos Analizados */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800">
                                <div className="flex flex-wrap items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1.5 font-semibold text-blue-900 dark:text-blue-100">
                                        <Layers className="h-4 w-4 text-blue-600" />
                                        <span>Modelos detectados: <strong>{previewData.totalModels}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-semibold text-blue-900 dark:text-blue-100">
                                        <PackageCheck className="h-4 w-4 text-blue-600" />
                                        <span>Variantes a crear: <strong>{previewData.totalVariants}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                                        <span>Talles: {previewData.sizeColumns.join(', ')}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-0.5">
                                        {previewData.totalStockUnits} unidades totales
                                    </Badge>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setPreviewData(null);
                                            setRawCsv('');
                                            setFileName('');
                                        }}
                                        className="h-7 text-xs text-slate-500 hover:text-slate-700"
                                    >
                                        Cambiar archivo
                                    </Button>
                                </div>
                            </div>

                            {/* Errores / Advertencias */}
                            {previewData.errors && previewData.errors.length > 0 && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <AlertCircle className="h-4 w-4 text-amber-600" />
                                        <span>Advertencias encontradas ({previewData.errors.length}):</span>
                                    </div>
                                    <ul className="list-disc list-inside space-y-0.5 pl-2">
                                        {previewData.errors.map((err, i) => (
                                            <li key={i}>Línea {err.line}: {err.message}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Tabla de Preview de Modelos */}
                            <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-[300px]">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-100 dark:bg-slate-900 border-b sticky top-0 font-semibold text-slate-700 dark:text-slate-300">
                                        <tr>
                                            <th className="p-2.5 pl-3">Modelo / Estilo</th>
                                            <th className="p-2.5">Categoría / Marca</th>
                                            <th className="p-2.5">Costo / Precio</th>
                                            <th className="p-2.5">Variantes (Color × Talle)</th>
                                            <th className="p-2.5 text-right pr-3">Stock Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                                        {previewData.models.map((m, idx) => {
                                            const modelStock = m.variants.reduce((acc, v) => acc + v.stock, 0);
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30">
                                                    <td className="p-2.5 pl-3">
                                                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {m.name}
                                                        </div>
                                                        {m.styleCode && (
                                                            <div className="text-[10px] text-slate-400">
                                                                Código: {m.styleCode}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                                        <div>{m.categoryName || '—'}</div>
                                                        <div className="text-[10px] text-slate-400">{m.brandName || ''}</div>
                                                    </td>
                                                    <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                                        {m.price ? `$${m.price}` : '—'}
                                                        {m.cost ? <span className="text-[10px] text-slate-400 block">C: ${m.cost}</span> : null}
                                                    </td>
                                                    <td className="p-2.5">
                                                        <div className="flex flex-wrap gap-1 max-w-[300px]">
                                                            {m.variants.map((v, vIdx) => (
                                                                <span
                                                                    key={vIdx}
                                                                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium"
                                                                >
                                                                    {v.color} ({v.size}): <strong>{v.stock}u</strong>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-2.5 text-right pr-3 font-bold text-emerald-600 dark:text-emerald-400">
                                                        {modelStock} u.
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        disabled={!previewData || commitMutation.isPending}
                        onClick={handleCommit}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {commitMutation.isPending && (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        )}
                        Confirmar e Importar al Catálogo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
