import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { productsApi } from '../api/products.api';
import { toast } from 'sonner';
import { Layers, Plus, Trash2, CheckCircle2, Sparkles } from 'lucide-react';

interface VariantMatrixModalProps {
    readonly parentProductId: string;
    readonly parentProductName: string;
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onSuccess: () => void;
}

const TALLES_CLOTHING_PRESETS = ['S', 'M', 'L', 'XL', 'XXL'];
const TALLES_SHOES_PRESETS = ['36', '37', '38', '39', '40', '41', '42', '43', '44'];
const COLORES_PRESETS = ['Negro', 'Blanco', 'Azul', 'Rojo', 'Gris', 'Verde', 'Beige'];

export function VariantMatrixModal({
    parentProductId,
    parentProductName,
    open,
    onClose,
    onSuccess,
}: VariantMatrixModalProps) {
    const [talles, setTalles] = useState<string[]>(['S', 'M', 'L', 'XL']);
    const [colores, setColores] = useState<string[]>(['Negro', 'Blanco', 'Azul']);
    const [newTalle, setNewTalle] = useState('');
    const [newColor, setNewColor] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const addTalle = (value: string) => {
        const trimmed = value.trim().toUpperCase();
        if (trimmed && !talles.includes(trimmed)) {
            setTalles([...talles, trimmed]);
            setNewTalle('');
        }
    };

    const removeTalle = (val: string) => {
        setTalles(talles.filter((t) => t !== val));
    };

    const addColor = (value: string) => {
        const trimmed = value.trim();
        if (trimmed && !colores.includes(trimmed)) {
            setColores([...colores, trimmed]);
            setNewColor('');
        }
    };

    const removeColor = (val: string) => {
        setColores(colores.filter((c) => c !== val));
    };

    const totalCombinations = talles.length * colores.length;

    const handleGenerate = async () => {
        if (talles.length === 0 || colores.length === 0) {
            toast.error('Debes seleccionar al menos 1 talle y 1 color');
            return;
        }

        try {
            setIsLoading(true);
            await productsApi.generateVariants(parentProductId, {
                Talle: talles,
                Color: colores,
            });
            toast.success(`¡Se generaron ${totalCombinations} variantes de "${parentProductName}" con éxito!`);
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Error al generar la matriz de variantes');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-primary">
                        <Sparkles className="h-5 w-5" />
                        <DialogTitle>Generar Matriz de Variantes</DialogTitle>
                    </div>
                    <DialogDescription>
                        Crea variantes de <strong>{parentProductName}</strong> automáticamente combinando Talles y Colores.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-3">
                    {/* Talles */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold text-sm">1. Talles Seleccionados</Label>
                            <div className="flex gap-1.5 text-xs text-muted-foreground">
                                <span>Ropa:</span>
                                <button type="button" onClick={() => setTalles(TALLES_CLOTHING_PRESETS)} className="underline hover:text-primary">
                                    S-XXL
                                </button>
                                <span className="ml-2">Calzado:</span>
                                <button type="button" onClick={() => setTalles(TALLES_SHOES_PRESETS)} className="underline hover:text-primary">
                                    36-44
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border bg-muted/20 min-h-[52px]">
                            {talles.map((t) => (
                                <Badge key={t} variant="secondary" className="gap-1 text-sm py-1 px-2.5">
                                    {t}
                                    <button type="button" onClick={() => removeTalle(t)} className="hover:text-destructive">
                                        &times;
                                    </button>
                                </Badge>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <Input
                                placeholder="Agregar talle personalizado (ej: XXXL o 39)"
                                value={newTalle}
                                onChange={(e) => setNewTalle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addTalle(newTalle);
                                    }
                                }}
                            />
                            <Button type="button" variant="outline" onClick={() => addTalle(newTalle)}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Colores */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold text-sm">2. Colores Seleccionados</Label>
                            <div className="flex gap-1 text-xs text-muted-foreground">
                                {COLORES_PRESETS.slice(0, 5).map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => addColor(c)}
                                        className="px-1.5 py-0.5 rounded bg-muted hover:bg-primary/20 hover:text-primary transition-colors"
                                    >
                                        +{c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border bg-muted/20 min-h-[52px]">
                            {colores.map((c) => (
                                <Badge key={c} variant="outline" className="gap-1 text-sm py-1 px-2.5 bg-background">
                                    {c}
                                    <button type="button" onClick={() => removeColor(c)} className="hover:text-destructive">
                                        &times;
                                    </button>
                                </Badge>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <Input
                                placeholder="Agregar color personalizado (ej: Camel o estampado)"
                                value={newColor}
                                onChange={(e) => setNewColor(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addColor(newColor);
                                    }
                                }}
                            />
                            <Button type="button" variant="outline" onClick={() => addColor(newColor)}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Resumen de Combinaciones */}
                    <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Resultado de la Matriz</p>
                            <p className="text-sm font-medium text-foreground mt-0.5">
                                Se crearán <strong>{totalCombinations} variantes independientes</strong> en el catálogo.
                            </p>
                        </div>
                        <Badge className="text-base px-3 py-1 bg-primary text-primary-foreground font-bold">
                            {totalCombinations} SKUs
                        </Badge>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button type="button" onClick={handleGenerate} disabled={isLoading || totalCombinations === 0} className="gap-2 font-semibold">
                        <Layers className="h-4 w-4" />
                        {isLoading ? 'Generando...' : `Generar ${totalCombinations} Variantes`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
