import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Sparkles,
    Trash2,
    Layers,
    Barcode,
    CheckCircle2,
    PackageCheck,
    Plus,
    X,
    BookmarkPlus,
    Palette,
    Loader2,
    Zap,
    SlidersHorizontal,
    Table2,
    DollarSign,
    Percent,
    ArrowUpDown,
    Keyboard,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { sizeScalesApi, colorPalettesApi } from '../api/products.api';
import {
    SIZE_RUN_PRESETS,
    COLOR_PRESETS,
    DISTRIBUTION_CURVES,
    calculateCurveStock,
    generateStructuredSku,
    ColorPreset,
} from '../utils/matrix-presets';
import { ApparelMatrixCellDTO, SizeScaleTemplate, ColorPaletteTemplate } from '../types';

export interface SpecialSizeRule {
    size: string;
    type: 'percentage' | 'fixed';
    value: number;
    applyTo: 'price' | 'cost' | 'both';
}

interface BulkEditState {
    open: boolean;
    axis: 'size' | 'color';
    targetName: string;
    field: 'stock' | 'price' | 'cost';
    value: number | '';
}

interface ProductVariantMatrixGridProps {
    readonly styleCode?: string;
    readonly defaultPrice?: number;
    readonly defaultCost?: number;
    readonly defaultProfitMargin?: number;
    readonly onMatrixChange: (cells: ApparelMatrixCellDTO[]) => void;
}

export function ProductVariantMatrixGrid({
    styleCode = 'MOD',
    defaultPrice = 0,
    defaultCost = 0,
    defaultProfitMargin = 0,
    onMatrixChange,
}: ProductVariantMatrixGridProps) {
    const queryClient = useQueryClient();

    // Consultas React Query para escalas y paletas
    const { data: serverSizeScales } = useQuery({
        queryKey: ['products', 'size-scales'],
        queryFn: () => sizeScalesApi.getAll(),
        staleTime: 1000 * 60 * 5,
    });

    const { data: serverColorPalettes } = useQuery({
        queryKey: ['products', 'color-palettes'],
        queryFn: () => colorPalettesApi.getAll(),
        staleTime: 1000 * 60 * 5,
    });

    // Modales de guardado on-the-fly
    const [isSaveScaleOpen, setIsSaveScaleOpen] = useState(false);
    const [newScaleName, setNewScaleName] = useState('');
    const [isSavePaletteOpen, setIsSavePaletteOpen] = useState(false);
    const [newPaletteName, setNewPaletteName] = useState('');

    // Modal de Reglas de Talles Especiales (CAP-2)
    const [isSpecialSizesOpen, setIsSpecialSizesOpen] = useState(false);
    const [specialRuleSelectedSizes, setSpecialRuleSelectedSizes] = useState<string[]>([]);
    const [specialRuleType, setSpecialRuleType] = useState<'percentage' | 'fixed'>('percentage');
    const [specialRuleValue, setSpecialRuleValue] = useState<number | ''>(15);
    const [specialRuleApplyTo, setSpecialRuleApplyTo] = useState<'price' | 'cost' | 'both'>('both');
    const [specialSizeRules, setSpecialSizeRules] = useState<Record<string, SpecialSizeRule>>({});

    // Modal de Edición Masiva por Eje (CAP-2)
    const [bulkEdit, setBulkEdit] = useState<BulkEditState>({
        open: false,
        axis: 'size',
        targetName: '',
        field: 'stock',
        value: '',
    });

    // Modo de vista: Rápida (solo Stock) vs Detallada (Stock + Precios + Costos + SKU)
    const [isDetailedView, setIsDetailedView] = useState(false);

    // Talles seleccionados (Columnas)
    const [sizes, setSizes] = useState<string[]>(['S', 'M', 'L', 'XL']);
    const [customSizeInput, setCustomSizeInput] = useState('');

    // Colores seleccionados (Filas)
    const [colors, setColors] = useState<ColorPreset[]>([
        { name: 'Negro', hex: '#18181b' },
        { name: 'Blanco', hex: '#ffffff', border: true },
        { name: 'Azul Marino', hex: '#1e3a8a' },
    ]);
    const [customColorName, setCustomColorName] = useState('');
    const [customColorHex, setCustomColorHex] = useState('#2563eb');

    // Celdas: Clave `${colorName}__${sizeName}` => ApparelMatrixCellDTO
    const [cells, setCells] = useState<Record<string, ApparelMatrixCellDTO>>(() => {
        const initial: Record<string, ApparelMatrixCellDTO> = {};
        for (const c of [{ name: 'Negro', hex: '#18181b' }, { name: 'Blanco', hex: '#ffffff' }, { name: 'Azul Marino', hex: '#1e3a8a' }]) {
            for (const s of ['S', 'M', 'L', 'XL']) {
                const key = `${c.name}__${s}`;
                initial[key] = {
                    color: c.name,
                    size: s,
                    colorHex: c.hex,
                    stock: 0,
                    cost: defaultCost || null,
                    price: defaultPrice || null,
                    customProfitMargin: defaultProfitMargin || null,
                    sku: generateStructuredSku(styleCode, c.name, s),
                    barcode: null,
                };
            }
        }
        return initial;
    });

    const notifyChange = (updated: Record<string, ApparelMatrixCellDTO>) => {
        setCells(updated);
        onMatrixChange(Object.values(updated));
    };

    // Notificar celdas iniciales al montar
    useEffect(() => {
        onMatrixChange(Object.values(cells));
    }, []);

    // Atajos globales de teclado (CAP-3: Alt+S, Alt+L, Alt+D, Alt+C)
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (!e.altKey) return;
            const key = e.key.toLowerCase();
            if (key === 's') {
                e.preventDefault();
                handleGenerateBarcodes();
                toast.info('SKUs auto-generados (Alt+S)');
            } else if (key === 'l') {
                e.preventDefault();
                handleFillAllStock(0);
                toast.info('Matriz limpiada a 0 unidades (Alt+L)');
            } else if (key === 'd') {
                e.preventDefault();
                setIsDetailedView((prev) => !prev);
            } else if (key === 'c') {
                e.preventDefault();
                setSpecialRuleSelectedSizes(sizes.filter((s) => ['XXL', '3XL', '4XL', '48', '50', '52'].includes(s)));
                setIsSpecialSizesOpen(true);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [colors, sizes, cells, styleCode]);

    // Sincronizar precios base cuando cambian los defaults de entrada (si no fueron modificados individualmente)
    useEffect(() => {
        if (defaultPrice > 0 || defaultCost > 0) {
            setCells((prev) => {
                const updated = { ...prev };
                for (const key of Object.keys(updated)) {
                    const item = updated[key];
                    const rule = specialSizeRules[item.size];
                    let cellPrice = defaultPrice || null;
                    let cellCost = defaultCost || null;

                    if (rule) {
                        if (rule.type === 'percentage') {
                            if (rule.applyTo === 'price' || rule.applyTo === 'both') {
                                cellPrice = defaultPrice ? Math.round(defaultPrice * (1 + rule.value / 100)) : null;
                            }
                            if (rule.applyTo === 'cost' || rule.applyTo === 'both') {
                                cellCost = defaultCost ? Math.round(defaultCost * (1 + rule.value / 100)) : null;
                            }
                        } else {
                            if (rule.applyTo === 'price' || rule.applyTo === 'both') {
                                cellPrice = defaultPrice ? defaultPrice + rule.value : null;
                            }
                            if (rule.applyTo === 'cost' || rule.applyTo === 'both') {
                                cellCost = defaultCost ? defaultCost + rule.value : null;
                            }
                        }
                    }

                    updated[key] = {
                        ...item,
                        price: item.price === 0 || item.price === null ? cellPrice : item.price,
                        cost: item.cost === 0 || item.cost === null ? cellCost : item.cost,
                    };
                }
                return updated;
            });
        }
    }, [defaultPrice, defaultCost]);

    // Lista unificada de escalas (servidor + presets locales como fallback)
    const availableSizeScales = useMemo(() => {
        if (serverSizeScales && serverSizeScales.length > 0) {
            return serverSizeScales;
        }
        return SIZE_RUN_PRESETS.map((p) => ({
            id: p.key,
            name: p.label,
            sizes: p.sizes,
            isSystemPreset: true,
            sortOrder: 0,
            createdAt: '',
            updatedAt: '',
        })) as SizeScaleTemplate[];
    }, [serverSizeScales]);

    // Lista unificada de paletas (servidor + presets)
    const availableColorPalettes = useMemo(() => {
        if (serverColorPalettes && serverColorPalettes.length > 0) {
            return serverColorPalettes;
        }
        return [
            {
                id: 'basics',
                name: 'Básicos Neutros',
                colors: COLOR_PRESETS.slice(0, 5),
                isSystemPreset: true,
                sortOrder: 1,
                createdAt: '',
                updatedAt: '',
            },
        ] as ColorPaletteTemplate[];
    }, [serverColorPalettes]);

    // Mutaciones para guardar plantillas
    const createSizeScaleMutation = useMutation({
        mutationFn: (data: { name: string; sizes: string[] }) => sizeScalesApi.create(data),
        onSuccess: (newScale) => {
            queryClient.invalidateQueries({ queryKey: ['products', 'size-scales'] });
            toast.success(`Escala "${newScale.name}" guardada como plantilla`);
            setIsSaveScaleOpen(false);
            setNewScaleName('');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Error al guardar la escala');
        },
    });

    const deleteSizeScaleMutation = useMutation({
        mutationFn: (id: string) => sizeScalesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products', 'size-scales'] });
            toast.success('Plantilla de escala eliminada');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'No se pudo eliminar la escala');
        },
    });

    const createColorPaletteMutation = useMutation({
        mutationFn: (data: { name: string; colors: Array<{ name: string; hex: string; border?: boolean }> }) =>
            colorPalettesApi.create(data),
        onSuccess: (newPalette) => {
            queryClient.invalidateQueries({ queryKey: ['products', 'color-palettes'] });
            toast.success(`Paleta "${newPalette.name}" guardada como plantilla`);
            setIsSavePaletteOpen(false);
            setNewPaletteName('');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Error al guardar la paleta');
        },
    });

    const deleteColorPaletteMutation = useMutation({
        mutationFn: (id: string) => colorPalettesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products', 'color-palettes'] });
            toast.success('Plantilla de paleta eliminada');
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'No se pudo eliminar la paleta');
        },
    });

    // Helper para recalcular celda con regla de recargo
    const getCellPriceCostForSize = (size: string, basePrice: number, baseCost: number) => {
        const rule = specialSizeRules[size];
        if (!rule) {
            return { price: basePrice || null, cost: baseCost || null };
        }

        let calculatedPrice = basePrice;
        let calculatedCost = baseCost;

        if (rule.type === 'percentage') {
            if (rule.applyTo === 'price' || rule.applyTo === 'both') {
                calculatedPrice = basePrice ? Math.round(basePrice * (1 + rule.value / 100)) : basePrice;
            }
            if (rule.applyTo === 'cost' || rule.applyTo === 'both') {
                calculatedCost = baseCost ? Math.round(baseCost * (1 + rule.value / 100)) : baseCost;
            }
        } else {
            if (rule.applyTo === 'price' || rule.applyTo === 'both') {
                calculatedPrice = basePrice ? basePrice + rule.value : basePrice;
            }
            if (rule.applyTo === 'cost' || rule.applyTo === 'both') {
                calculatedCost = baseCost ? baseCost + rule.value : baseCost;
            }
        }

        return {
            price: calculatedPrice || null,
            cost: calculatedCost || null,
        };
    };

    // Navegación fluida por teclado 2D (CAP-3)
    const handleCellKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        rowIndex: number,
        colIndex: number
    ) => {
        const totalRows = colors.length;
        const totalCols = sizes.length;

        let nextRow = rowIndex;
        let nextCol = colIndex;

        if (e.key === 'ArrowRight' || e.key === 'Enter') {
            e.preventDefault();
            if (colIndex < totalCols - 1) {
                nextCol = colIndex + 1;
            } else if (rowIndex < totalRows - 1) {
                nextRow = rowIndex + 1;
                nextCol = 0;
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (colIndex > 0) {
                nextCol = colIndex - 1;
            } else if (rowIndex > 0) {
                nextRow = rowIndex - 1;
                nextCol = totalCols - 1;
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (rowIndex < totalRows - 1) {
                nextRow = rowIndex + 1;
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (rowIndex > 0) {
                nextRow = rowIndex - 1;
            }
        } else {
            return;
        }

        const nextInput = document.getElementById(`matrix-cell-${nextRow}-${nextCol}`) as HTMLInputElement | null;
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        }
    };

    // Agregar / Quitar Talles
    const handleApplySizePreset = (presetSizes: string[]) => {
        setSizes(presetSizes);
        const updated: Record<string, ApparelMatrixCellDTO> = {};
        for (const c of colors) {
            for (const s of presetSizes) {
                const key = `${c.name}__${s}`;
                const { price, cost } = getCellPriceCostForSize(s, defaultPrice, defaultCost);
                updated[key] = cells[key] || {
                    color: c.name,
                    size: s,
                    colorHex: c.hex,
                    stock: 0,
                    cost,
                    price,
                    customProfitMargin: defaultProfitMargin || null,
                    sku: generateStructuredSku(styleCode, c.name, s),
                    barcode: null,
                };
            }
        }
        notifyChange(updated);
    };

    const handleAddCustomSize = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = customSizeInput.trim().toUpperCase();
        if (!trimmed || sizes.includes(trimmed)) return;

        const newSizes = [...sizes, trimmed];
        setSizes(newSizes);
        setCustomSizeInput('');

        const updated = { ...cells };
        for (const c of colors) {
            const key = `${c.name}__${trimmed}`;
            const { price, cost } = getCellPriceCostForSize(trimmed, defaultPrice, defaultCost);
            updated[key] = {
                color: c.name,
                size: trimmed,
                colorHex: c.hex,
                stock: 0,
                cost,
                price,
                customProfitMargin: defaultProfitMargin || null,
                sku: generateStructuredSku(styleCode, c.name, trimmed),
                barcode: null,
            };
        }
        notifyChange(updated);
    };

    const handleRemoveSize = (sizeToRemove: string) => {
        if (sizes.length <= 1) return;
        const newSizes = sizes.filter((s) => s !== sizeToRemove);
        setSizes(newSizes);

        const updated: Record<string, ApparelMatrixCellDTO> = {};
        for (const c of colors) {
            for (const s of newSizes) {
                const key = `${c.name}__${s}`;
                if (cells[key]) updated[key] = cells[key];
            }
        }
        notifyChange(updated);
    };

    // Aplicar paleta de colores completa
    const handleApplyColorPalette = (paletteColors: ColorPreset[]) => {
        setColors(paletteColors);
        const updated: Record<string, ApparelMatrixCellDTO> = {};
        for (const c of paletteColors) {
            for (const s of sizes) {
                const key = `${c.name}__${s}`;
                const { price, cost } = getCellPriceCostForSize(s, defaultPrice, defaultCost);
                updated[key] = cells[key] || {
                    color: c.name,
                    size: s,
                    colorHex: c.hex,
                    stock: 0,
                    cost,
                    price,
                    customProfitMargin: defaultProfitMargin || null,
                    sku: generateStructuredSku(styleCode, c.name, s),
                    barcode: null,
                };
            }
        }
        notifyChange(updated);
    };

    // Agregar / Quitar Colores individuales
    const handleTogglePresetColor = (preset: ColorPreset) => {
        const exists = colors.some((c) => c.name.toLowerCase() === preset.name.toLowerCase());
        let newColors: ColorPreset[];
        if (exists) {
            if (colors.length <= 1) return;
            newColors = colors.filter((c) => c.name.toLowerCase() !== preset.name.toLowerCase());
        } else {
            newColors = [...colors, preset];
        }
        setColors(newColors);

        const updated: Record<string, ApparelMatrixCellDTO> = {};
        for (const c of newColors) {
            for (const s of sizes) {
                const key = `${c.name}__${s}`;
                const { price, cost } = getCellPriceCostForSize(s, defaultPrice, defaultCost);
                updated[key] = cells[key] || {
                    color: c.name,
                    size: s,
                    colorHex: c.hex,
                    stock: 0,
                    cost,
                    price,
                    customProfitMargin: defaultProfitMargin || null,
                    sku: generateStructuredSku(styleCode, c.name, s),
                    barcode: null,
                };
            }
        }
        notifyChange(updated);
    };

    const handleAddCustomColor = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = customColorName.trim();
        if (!trimmed || colors.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return;

        const newColor: ColorPreset = { name: trimmed, hex: customColorHex };
        const newColors = [...colors, newColor];
        setColors(newColors);
        setCustomColorName('');

        const updated = { ...cells };
        for (const s of sizes) {
            const key = `${trimmed}__${s}`;
            const { price, cost } = getCellPriceCostForSize(s, defaultPrice, defaultCost);
            updated[key] = {
                color: trimmed,
                size: s,
                colorHex: customColorHex,
                stock: 0,
                cost,
                price,
                customProfitMargin: defaultProfitMargin || null,
                sku: generateStructuredSku(styleCode, trimmed, s),
                barcode: null,
            };
        }
        notifyChange(updated);
    };

    const handleRemoveColor = (colorName: string) => {
        if (colors.length <= 1) return;
        const newColors = colors.filter((c) => c.name !== colorName);
        setColors(newColors);

        const updated: Record<string, ApparelMatrixCellDTO> = {};
        for (const c of newColors) {
            for (const s of sizes) {
                const key = `${c.name}__${s}`;
                if (cells[key]) updated[key] = cells[key];
            }
        }
        notifyChange(updated);
    };

    // Guardar escala actual como plantilla
    const handleSaveScale = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = newScaleName.trim();
        if (!trimmed) {
            toast.error('Ingresá un nombre para la escala');
            return;
        }
        createSizeScaleMutation.mutate({
            name: trimmed,
            sizes,
        });
    };

    // Guardar paleta actual como plantilla
    const handleSavePalette = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = newPaletteName.trim();
        if (!trimmed) {
            toast.error('Ingresá un nombre para la paleta');
            return;
        }
        createColorPaletteMutation.mutate({
            name: trimmed,
            colors,
        });
    };

    // Aplicar Regla de Talles Especiales (CAP-2)
    const handleApplySpecialSizeRule = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (specialRuleSelectedSizes.length === 0) {
            toast.error('Seleccioná al menos un talle para aplicar el recargo');
            return;
        }
        const numericVal = Number(specialRuleValue) || 0;
        if (numericVal <= 0) {
            toast.error('Ingresá un valor de recargo válido mayor a 0');
            return;
        }

        const newRules = { ...specialSizeRules };
        const updatedCells = { ...cells };

        for (const size of specialRuleSelectedSizes) {
            newRules[size] = {
                size,
                type: specialRuleType,
                value: numericVal,
                applyTo: specialRuleApplyTo,
            };

            // Aplicar a todas las celdas de ese talle
            for (const c of colors) {
                const key = `${c.name}__${size}`;
                if (updatedCells[key]) {
                    const currentCell = updatedCells[key];
                    let calculatedPrice = currentCell.price ?? defaultPrice;
                    let calculatedCost = currentCell.cost ?? defaultCost;

                    if (specialRuleType === 'percentage') {
                        if (specialRuleApplyTo === 'price' || specialRuleApplyTo === 'both') {
                            calculatedPrice = defaultPrice ? Math.round(defaultPrice * (1 + numericVal / 100)) : calculatedPrice;
                        }
                        if (specialRuleApplyTo === 'cost' || specialRuleApplyTo === 'both') {
                            calculatedCost = defaultCost ? Math.round(defaultCost * (1 + numericVal / 100)) : calculatedCost;
                        }
                    } else {
                        if (specialRuleApplyTo === 'price' || specialRuleApplyTo === 'both') {
                            calculatedPrice = (defaultPrice || 0) + numericVal;
                        }
                        if (specialRuleApplyTo === 'cost' || specialRuleApplyTo === 'both') {
                            calculatedCost = (defaultCost || 0) + numericVal;
                        }
                    }

                    updatedCells[key] = {
                        ...currentCell,
                        price: calculatedPrice,
                        cost: calculatedCost,
                    };
                }
            }
        }

        setSpecialSizeRules(newRules);
        notifyChange(updatedCells);
        setIsSpecialSizesOpen(false);
        toast.success(`Recargo de ${specialRuleType === 'percentage' ? `+${numericVal}%` : `+$${numericVal}`} aplicado a: ${specialRuleSelectedSizes.join(', ')}`);
    };

    // Restablecer recargos de talles especiales
    const handleResetSpecialRules = () => {
        setSpecialSizeRules({});
        const updated = { ...cells };
        for (const key of Object.keys(updated)) {
            updated[key] = {
                ...updated[key],
                price: defaultPrice || null,
                cost: defaultCost || null,
            };
        }
        notifyChange(updated);
        setIsSpecialSizesOpen(false);
        toast.success('Reglas de recargos eliminadas. Precios base restaurados.');
    };

    // Ejecutar Edición Masiva por Eje (CAP-2)
    const handleExecuteBulkEdit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const { axis, targetName, field, value } = bulkEdit;
        const numVal = value === '' ? 0 : Number(value);

        const updated = { ...cells };

        if (axis === 'size') {
            for (const c of colors) {
                const key = `${c.name}__${targetName}`;
                if (updated[key]) {
                    updated[key] = {
                        ...updated[key],
                        [field]: numVal,
                    };
                }
            }
            toast.success(`Columna ${targetName}: ${field} actualizado a ${numVal} en todos los colores`);
        } else {
            for (const s of sizes) {
                const key = `${targetName}__${s}`;
                if (updated[key]) {
                    updated[key] = {
                        ...updated[key],
                        [field]: numVal,
                    };
                }
            }
            toast.success(`Fila ${targetName}: ${field} actualizado a ${numVal} en todos los talles`);
        }

        notifyChange(updated);
        setBulkEdit((prev) => ({ ...prev, open: false, value: '' }));
    };

    // Actualización de Celda Individual
    const handleCellChange = (color: string, size: string, field: keyof ApparelMatrixCellDTO, value: any) => {
        const key = `${color}__${size}`;
        const current = cells[key] || {
            color,
            size,
            stock: 0,
            cost: defaultCost || null,
            price: defaultPrice || null,
            sku: generateStructuredSku(styleCode, color, size),
            barcode: null,
        };

        const updated = {
            ...cells,
            [key]: {
                ...current,
                [field]: value,
            },
        };
        notifyChange(updated);
    };

    // Aplicar Curva Masiva a Todas las Filas
    const handleApplyGlobalCurve = (ratio: number[]) => {
        const stockDistribution = calculateCurveStock(sizes.length, ratio, 1);
        const updated = { ...cells };

        for (const c of colors) {
            sizes.forEach((s, idx) => {
                const key = `${c.name}__${s}`;
                if (updated[key]) {
                    updated[key] = {
                        ...updated[key],
                        stock: stockDistribution[idx] || 0,
                    };
                }
            });
        }
        notifyChange(updated);
    };

    // Aplicar Curva a una Fila Específica
    const handleApplyRowCurve = (colorName: string, ratio: number[]) => {
        const stockDistribution = calculateCurveStock(sizes.length, ratio, 1);
        const updated = { ...cells };

        sizes.forEach((s, idx) => {
            const key = `${colorName}__${s}`;
            if (updated[key]) {
                updated[key] = {
                    ...updated[key],
                    stock: stockDistribution[idx] || 0,
                };
            }
        });
        notifyChange(updated);
    };

    // Rellenar todo con X unidades fijas
    const handleFillAllStock = (qty: number) => {
        const updated = { ...cells };
        for (const key of Object.keys(updated)) {
            updated[key] = { ...updated[key], stock: qty };
        }
        notifyChange(updated);
    };

    // Auto-generar SKUs y códigos
    const handleGenerateBarcodes = () => {
        const updated = { ...cells };
        for (const key of Object.keys(updated)) {
            const item = updated[key];
            const autoSku = generateStructuredSku(styleCode, item.color, item.size);
            updated[key] = {
                ...item,
                sku: autoSku,
            };
        }
        notifyChange(updated);
    };

    // Cálculos de Resumen
    const totalVariants = colors.length * sizes.length;
    const totalStockUnits = Object.values(cells).reduce((acc, c) => acc + (Number(c.stock) || 0), 0);
    const variantsWithStock = Object.values(cells).filter((c) => (Number(c.stock) || 0) > 0).length;
    const specialSizesCount = Object.keys(specialSizeRules).length;

    return (
        <div className="space-y-6">
            {/* 1. Selector de Curva de Talles */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            1. Curva de Talles (Columnas)
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Elegí una plantilla guardada, agregá talles individuales o guardá la combinación activa.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* Botón Guardar Plantilla */}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsSaveScaleOpen(true)}
                            className="h-8 text-xs gap-1 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 border-dashed"
                            title="Guardar los talles actuales como plantilla reutilizable"
                        >
                            <BookmarkPlus className="h-3.5 w-3.5 text-blue-600" /> Guardar plantilla
                        </Button>

                        {/* Añadir Talle Manual */}
                        <Input
                            placeholder="Nuevo talle (ej: 3XL)"
                            value={customSizeInput}
                            onChange={(e) => setCustomSizeInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSize(e)}
                            className="h-8 w-36 text-xs bg-white dark:bg-slate-950"
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleAddCustomSize}
                            className="h-8 text-xs gap-1"
                        >
                            <Plus className="h-3.5 w-3.5" /> Agregar
                        </Button>
                    </div>
                </div>

                {/* Chips de Plantillas de Talles */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {availableSizeScales.map((preset) => {
                        const isSelected = JSON.stringify(sizes) === JSON.stringify(preset.sizes);
                        return (
                            <div key={preset.id || preset.name} className="inline-flex items-center group">
                                <button
                                    type="button"
                                    onClick={() => handleApplySizePreset(preset.sizes)}
                                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors border ${
                                        isSelected
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {preset.name}
                                    {!preset.isSystemPreset && (
                                        <span className="ml-1 text-[10px] opacity-75">(Personalizada)</span>
                                    )}
                                </button>
                                {!preset.isSystemPreset && preset.id && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`¿Eliminar la plantilla de talles "${preset.name}"?`)) {
                                                deleteSizeScaleMutation.mutate(preset.id);
                                            }
                                        }}
                                        className="ml-0.5 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Eliminar esta plantilla personalizada"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Talles Activos */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-slate-500 font-medium mr-1">Talles en grilla:</span>
                    {sizes.map((size) => (
                        <Badge
                            key={size}
                            variant="outline"
                            className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 pl-2.5 pr-1.5 py-0.5 text-xs font-semibold flex items-center gap-1.5"
                        >
                            <span>{size}</span>
                            {specialSizeRules[size] && (
                                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold px-1 rounded">
                                    {specialSizeRules[size].type === 'percentage' ? `+${specialSizeRules[size].value}%` : `+$${specialSizeRules[size].value}`}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => handleRemoveSize(size)}
                                disabled={sizes.length <= 1}
                                className="text-slate-400 hover:text-red-500 disabled:opacity-30"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            </div>

            {/* 2. Paleta de Colores */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <Palette className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            2. Paleta de Colores (Filas)
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Elegí una paleta completa, seleccioná colores individuales o guardá tu propia combinación.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* Botón Guardar Paleta */}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsSavePaletteOpen(true)}
                            className="h-8 text-xs gap-1 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 border-dashed"
                            title="Guardar los colores actuales como paleta reutilizable"
                        >
                            <BookmarkPlus className="h-3.5 w-3.5 text-blue-600" /> Guardar paleta
                        </Button>

                        {/* Añadir Color Personalizado */}
                        <input
                            type="color"
                            value={customColorHex}
                            onChange={(e) => setCustomColorHex(e.target.value)}
                            className="h-8 w-8 rounded cursor-pointer border border-slate-300 p-0.5 bg-white"
                            title="Elegir color personalizado"
                        />
                        <Input
                            placeholder="Nombre (ej: Verde Oliva)"
                            value={customColorName}
                            onChange={(e) => setCustomColorName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomColor(e)}
                            className="h-8 w-44 text-xs bg-white dark:bg-slate-950"
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleAddCustomColor}
                            className="h-8 text-xs gap-1"
                        >
                            <Plus className="h-3.5 w-3.5" /> Agregar
                        </Button>
                    </div>
                </div>

                {/* Selector de Paletas Completas */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-xs text-slate-500 font-medium self-center mr-1">Paletas:</span>
                    {availableColorPalettes.map((palette) => (
                        <button
                            key={palette.id || palette.name}
                            type="button"
                            onClick={() => handleApplyColorPalette(palette.colors)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <div className="flex -space-x-1">
                                {palette.colors.slice(0, 3).map((c, i) => (
                                    <span
                                        key={i}
                                        className="h-2.5 w-2.5 rounded-full border border-white dark:border-slate-900"
                                        style={{ backgroundColor: c.hex }}
                                    />
                                ))}
                            </div>
                            <span>{palette.name}</span>
                        </button>
                    ))}
                </div>

                {/* Swatches de Colores Rápidos Individuales */}
                <div className="flex flex-wrap gap-2 pt-1">
                    {COLOR_PRESETS.map((preset) => {
                        const isSelected = colors.some((c) => c.name.toLowerCase() === preset.name.toLowerCase());
                        return (
                            <button
                                key={preset.name}
                                type="button"
                                onClick={() => handleTogglePresetColor(preset)}
                                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                    isSelected
                                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 shadow-sm'
                                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                }`}
                            >
                                <span
                                    className="h-3 w-3 rounded-full border border-slate-300 dark:border-slate-600 shadow-xs shrink-0"
                                    style={{ backgroundColor: preset.hex }}
                                />
                                <span>{preset.name}</span>
                                {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0 ml-0.5" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 3. Grilla 2D Interactiva */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
                {/* Barra de Acciones Rápidas y Herramientas */}
                <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 px-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Atajos de Curvas */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Curvas:
                            </span>
                            <div className="flex flex-wrap gap-1">
                                {DISTRIBUTION_CURVES.map((curve) => (
                                    <button
                                        key={curve.key}
                                        type="button"
                                        onClick={() => handleApplyGlobalCurve(curve.ratio)}
                                        className="px-2 py-1 text-xs rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                                    >
                                        {curve.key}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => handleFillAllStock(5)}
                                    className="px-2 py-1 text-xs rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
                                >
                                    Todo 5u
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleFillAllStock(0)}
                                    className="px-2 py-1 text-xs rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Limpiar stock (Alt+L)"
                                >
                                    Limpiar
                                </button>
                            </div>
                        </div>

                        {/* Botón Reglas de Talles Especiales (CAP-2) */}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setSpecialRuleSelectedSizes(sizes.filter((s) => ['XXL', '3XL', '4XL', '48', '50', '52'].includes(s)));
                                setIsSpecialSizesOpen(true);
                            }}
                            className={`h-7 text-xs gap-1.5 ${
                                specialSizesCount > 0
                                    ? 'border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/40 font-semibold'
                                    : 'text-slate-700 dark:text-slate-300'
                            }`}
                            title="Configurar recargos para talles especiales (Alt+C)"
                        >
                            <Zap className={`h-3.5 w-3.5 ${specialSizesCount > 0 ? 'text-amber-600 fill-amber-500' : 'text-amber-500'}`} />
                            Talles Especiales {specialSizesCount > 0 ? `(${specialSizesCount})` : ''}
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Toggle Vista Rápida / Detallada */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsDetailedView((prev) => !prev)}
                            className="h-7 text-xs gap-1.5 text-slate-600 dark:text-slate-300"
                            title={isDetailedView ? 'Cambiar a vista compacta de solo stock (Alt+D)' : 'Ver y editar costos y precios por celda (Alt+D)'}
                        >
                            <Table2 className="h-3.5 w-3.5" />
                            {isDetailedView ? 'Vista Compacta' : 'Vista Detallada'}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateBarcodes}
                            className="h-7 text-xs gap-1 text-slate-600 dark:text-slate-300"
                            title="Auto-generar códigos SKU estructurados (Alt+S)"
                        >
                            <Barcode className="h-3.5 w-3.5" /> Generar SKUs
                        </Button>
                    </div>
                </div>

                {/* Tabla de Matriz 2D con Navegación por Teclado */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                                <th className="p-3 pl-4 text-xs font-semibold text-slate-600 dark:text-slate-400 w-52 min-w-[200px]">
                                    Color / Variante
                                </th>
                                {sizes.map((size) => {
                                    const rule = specialSizeRules[size];
                                    return (
                                        <th
                                            key={size}
                                            className="p-3 text-center text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[110px]"
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-xs font-bold">
                                                    <span>{size}</span>
                                                    {rule && (
                                                        <span className="text-[10px] text-amber-700 dark:text-amber-300">
                                                            {rule.type === 'percentage' ? `+${rule.value}%` : `+$${rule.value}`}
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Botón de Edición Masiva por Columna */}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setBulkEdit({
                                                            open: true,
                                                            axis: 'size',
                                                            targetName: size,
                                                            field: 'stock',
                                                            value: '',
                                                        })
                                                    }
                                                    className="text-[10px] text-slate-400 hover:text-blue-600 flex items-center gap-0.5 font-normal transition-colors"
                                                    title={`Editar masivamente la columna ${size}`}
                                                >
                                                    <SlidersHorizontal className="h-2.5 w-2.5" /> Masivo
                                                </button>
                                            </div>
                                        </th>
                                    );
                                })}
                                <th className="p-3 text-center text-xs font-semibold text-slate-500 w-24">
                                    Subtotal
                                </th>
                                <th className="p-3 text-center text-xs font-semibold text-slate-500 w-12 pr-4">
                                    Acción
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                            {colors.map((color, rowIndex) => {
                                const rowCells = sizes.map((s) => cells[`${color.name}__${s}`]);
                                const rowStockSum = rowCells.reduce((acc, c) => acc + (Number(c?.stock) || 0), 0);

                                return (
                                    <tr
                                        key={color.name}
                                        className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                                    >
                                        {/* Cabecera de Fila (Color) */}
                                        <td className="p-3 pl-4">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-600 shadow-xs shrink-0"
                                                    style={{ backgroundColor: color.hex }}
                                                />
                                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                    {color.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleApplyRowCurve(color.name, [1, 2, 2, 1])}
                                                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                                >
                                                    +Curva 1-2-2-1
                                                </button>
                                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setBulkEdit({
                                                            open: true,
                                                            axis: 'color',
                                                            targetName: color.name,
                                                            field: 'stock',
                                                            value: '',
                                                        })
                                                    }
                                                    className="text-[10px] text-slate-400 hover:text-blue-600 flex items-center gap-0.5 font-normal transition-colors"
                                                    title={`Editar masivamente la fila de color ${color.name}`}
                                                >
                                                    <SlidersHorizontal className="h-2.5 w-2.5" /> Masivo
                                                </button>
                                            </div>
                                        </td>

                                        {/* Celdas de Talles */}
                                        {sizes.map((size, colIndex) => {
                                            const cellKey = `${color.name}__${size}`;
                                            const cell = cells[cellKey] || {
                                                color: color.name,
                                                size,
                                                stock: 0,
                                                price: defaultPrice || null,
                                                cost: defaultCost || null,
                                            };
                                            const hasStock = Number(cell.stock) > 0;

                                            return (
                                                <td key={size} className="p-2 text-center align-top">
                                                    <div className="inline-flex flex-col items-center gap-1 w-full max-w-[100px]">
                                                        {/* Input de Stock con Navegación 2D por Teclado */}
                                                        <Input
                                                            id={`matrix-cell-${rowIndex}-${colIndex}`}
                                                            data-row={rowIndex}
                                                            data-col={colIndex}
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            value={cell.stock === 0 ? '' : cell.stock}
                                                            placeholder="0"
                                                            title={`Stock para ${color.name} - ${size} (Enter/Flechas para navegar)`}
                                                            onFocus={(e) => e.target.select()}
                                                            onKeyDown={(e) => handleCellKeyDown(e, rowIndex, colIndex)}
                                                            onChange={(e) =>
                                                                handleCellChange(
                                                                    color.name,
                                                                    size,
                                                                    'stock',
                                                                    e.target.value === '' ? 0 : Number.parseInt(e.target.value, 10) || 0
                                                                )
                                                            }
                                                            className={`h-8 text-center font-bold text-xs rounded-lg transition-all ${
                                                                hasStock
                                                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 text-emerald-900 dark:text-emerald-200 shadow-xs'
                                                                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                                            } focus-visible:ring-1 focus-visible:ring-blue-500`}
                                                        />

                                                        {/* Vista Detallada (Precio y Costo por Celda) */}
                                                        {isDetailedView && (
                                                            <div className="w-full space-y-1 pt-0.5">
                                                                <div className="flex items-center gap-0.5">
                                                                    <span className="text-[10px] text-slate-400 font-medium">$</span>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        placeholder="Precio"
                                                                        value={cell.price ?? ''}
                                                                        title="Precio de venta unitario"
                                                                        onChange={(e) =>
                                                                            handleCellChange(
                                                                                color.name,
                                                                                size,
                                                                                'price',
                                                                                e.target.value === '' ? null : Number.parseFloat(e.target.value) || 0
                                                                            )
                                                                        }
                                                                        className="h-6 text-[11px] p-1 text-center bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-0.5">
                                                                    <span className="text-[10px] text-slate-400 font-medium">C</span>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        placeholder="Costo"
                                                                        value={cell.cost ?? ''}
                                                                        title="Costo de compra unitario"
                                                                        onChange={(e) =>
                                                                            handleCellChange(
                                                                                color.name,
                                                                                size,
                                                                                'cost',
                                                                                e.target.value === '' ? null : Number.parseFloat(e.target.value) || 0
                                                                            )
                                                                        }
                                                                        className="h-6 text-[11px] p-1 text-center bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}

                                        {/* Subtotal Fila */}
                                        <td className="p-3 text-center align-middle">
                                            <span
                                                className={`text-xs font-bold px-2 py-0.5 rounded ${
                                                    rowStockSum > 0
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                                                        : 'text-slate-400 bg-slate-100 dark:bg-slate-900'
                                                }`}
                                            >
                                                {rowStockSum} u.
                                            </span>
                                        </td>

                                        {/* Eliminar Fila */}
                                        <td className="p-3 text-center pr-4 align-middle">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveColor(color.name)}
                                                disabled={colors.length <= 1}
                                                className="text-slate-400 hover:text-red-500 disabled:opacity-20 transition-colors p-1"
                                                title="Eliminar este color de la matriz"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Resumen al pie de la Grilla con Atajos */}
                <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-3.5 px-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                            <PackageCheck className="h-4 w-4 text-blue-600" />
                            <span>Variantes a generar: <strong>{totalVariants} SKUs</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span>Con stock inicial: <strong>{variantsWithStock} variantes</strong></span>
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Keyboard className="h-3.5 w-3.5" />
                            <span>Navegación: <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Enter</kbd> / <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Flechas</kbd></span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-medium">Stock Total Consolidado:</span>
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-0.5 font-bold">
                            {totalStockUnits} unidades
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Modal: Reglas de Talles Especiales (CAP-2) */}
            <Dialog open={isSpecialSizesOpen} onOpenChange={setIsSpecialSizesOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                            Reglas de Recargo para Talles Especiales
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Definí recargos automáticos para talles grandes o medidas especiales sin alterar los talles estándar base.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleApplySpecialSizeRule} className="space-y-4 py-2">
                        {/* 1. Seleccionar Talles Especiales */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Talles a los que aplica el recargo:</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {sizes.map((s) => {
                                    const isSelected = specialRuleSelectedSizes.includes(s);
                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSpecialRuleSelectedSizes(specialRuleSelectedSizes.filter((item) => item !== s));
                                                } else {
                                                    setSpecialRuleSelectedSizes([...specialRuleSelectedSizes, s]);
                                                }
                                            }}
                                            className={`px-2.5 py-1 text-xs rounded-lg font-semibold border transition-all ${
                                                isSelected
                                                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                                    : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Tipo de Recargo y Valor */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Tipo de Recargo</Label>
                                <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-900">
                                    <button
                                        type="button"
                                        onClick={() => setSpecialRuleType('percentage')}
                                        className={`flex-1 py-1 text-xs rounded font-semibold flex items-center justify-center gap-1 transition-all ${
                                            specialRuleType === 'percentage'
                                                ? 'bg-white dark:bg-slate-950 text-blue-600 shadow-xs'
                                                : 'text-slate-500'
                                        }`}
                                    >
                                        <Percent className="h-3 w-3" /> Porcentaje (+%)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSpecialRuleType('fixed')}
                                        className={`flex-1 py-1 text-xs rounded font-semibold flex items-center justify-center gap-1 transition-all ${
                                            specialRuleType === 'fixed'
                                                ? 'bg-white dark:bg-slate-950 text-blue-600 shadow-xs'
                                                : 'text-slate-500'
                                        }`}
                                    >
                                        <DollarSign className="h-3 w-3" /> Monto Fijo (+$)
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="ruleValue" className="text-xs font-semibold">
                                    {specialRuleType === 'percentage' ? 'Porcentaje de Recargo (%)' : 'Monto de Recargo ($)'}
                                </Label>
                                <Input
                                    id="ruleValue"
                                    type="number"
                                    min="0"
                                    step={specialRuleType === 'percentage' ? '1' : '100'}
                                    placeholder={specialRuleType === 'percentage' ? '15' : '2000'}
                                    value={specialRuleValue}
                                    onChange={(e) => setSpecialRuleValue(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        {/* 3. Aplicar a Precio / Costo */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Aplicar recargo a:</Label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSpecialRuleApplyTo('both')}
                                    className={`py-1.5 text-xs rounded-lg border font-medium transition-all ${
                                        specialRuleApplyTo === 'both'
                                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 font-semibold'
                                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    Precio y Costo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSpecialRuleApplyTo('price')}
                                    className={`py-1.5 text-xs rounded-lg border font-medium transition-all ${
                                        specialRuleApplyTo === 'price'
                                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 font-semibold'
                                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    Solo Precio
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSpecialRuleApplyTo('cost')}
                                    className={`py-1.5 text-xs rounded-lg border font-medium transition-all ${
                                        specialRuleApplyTo === 'cost'
                                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 font-semibold'
                                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    Solo Costo
                                </button>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-3">
                            {specialSizesCount > 0 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResetSpecialRules}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs"
                                >
                                    Restablecer todo
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsSpecialSizesOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={specialRuleSelectedSizes.length === 0 || !specialRuleValue}
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                Aplicar Recargo
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Edición Masiva por Eje (CAP-2) */}
            <Dialog
                open={bulkEdit.open}
                onOpenChange={(open) => setBulkEdit((prev) => ({ ...prev, open }))}
            >
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <SlidersHorizontal className="h-5 w-5 text-blue-600" />
                            Edición Masiva — {bulkEdit.axis === 'size' ? `Talle ${bulkEdit.targetName}` : `Color ${bulkEdit.targetName}`}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Modificá en lote un campo para todas las celdas de este {bulkEdit.axis === 'size' ? 'talle en todos los colores' : 'color en todos los talles'}.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleExecuteBulkEdit} className="space-y-4 py-2">
                        {/* Selector de campo */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Campo a modificar</Label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setBulkEdit((prev) => ({ ...prev, field: 'stock' }))}
                                    className={`py-1.5 text-xs rounded-lg border font-medium transition-all ${
                                        bulkEdit.field === 'stock'
                                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 font-semibold'
                                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    Stock
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBulkEdit((prev) => ({ ...prev, field: 'price' }))}
                                    className={`py-1.5 text-xs rounded-lg border font-medium transition-all ${
                                        bulkEdit.field === 'price'
                                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 font-semibold'
                                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    Precio ($)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBulkEdit((prev) => ({ ...prev, field: 'cost' }))}
                                    className={`py-1.5 text-xs rounded-lg border font-medium transition-all ${
                                        bulkEdit.field === 'cost'
                                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 font-semibold'
                                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    Costo ($)
                                </button>
                            </div>
                        </div>

                        {/* Input de Valor */}
                        <div className="space-y-1.5">
                            <Label htmlFor="bulkValue" className="text-xs font-semibold">
                                Nuevo valor para {bulkEdit.field === 'stock' ? 'Stock (unidades)' : bulkEdit.field === 'price' ? 'Precio de Venta ($)' : 'Costo de Compra ($)'}
                            </Label>
                            <Input
                                id="bulkValue"
                                type="number"
                                min="0"
                                placeholder={bulkEdit.field === 'stock' ? '10' : '15000'}
                                value={bulkEdit.value}
                                onChange={(e) => setBulkEdit((prev) => ({ ...prev, value: e.target.value === '' ? '' : Number(e.target.value) }))}
                                autoFocus
                                className="h-9 text-xs"
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setBulkEdit((prev) => ({ ...prev, open: false }))}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={bulkEdit.value === ''}
                            >
                                Aplicar a {bulkEdit.axis === 'size' ? `${colors.length} Colores` : `${sizes.length} Talles`}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Guardar Escala de Talles */}
            <Dialog open={isSaveScaleOpen} onOpenChange={setIsSaveScaleOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <BookmarkPlus className="h-5 w-5 text-blue-600" />
                            Guardar Escala de Talles
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Guardá los talles ({sizes.join(', ')}) como una plantilla reutilizable para otros productos.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveScale} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="scaleName" className="text-xs font-semibold">
                                Nombre de la Plantilla
                            </Label>
                            <Input
                                id="scaleName"
                                placeholder="Ej: Remeras Oversize, Calzado Dama..."
                                value={newScaleName}
                                onChange={(e) => setNewScaleName(e.target.value)}
                                autoFocus
                                className="h-9 text-xs"
                            />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setIsSaveScaleOpen(false);
                                    setNewScaleName('');
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={createSizeScaleMutation.isPending || !newScaleName.trim()}
                            >
                                {createSizeScaleMutation.isPending && (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                )}
                                Guardar Plantilla
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Guardar Paleta de Colores */}
            <Dialog open={isSavePaletteOpen} onOpenChange={setIsSavePaletteOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Palette className="h-5 w-5 text-blue-600" />
                            Guardar Paleta de Colores
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Guardá los colores seleccionados ({colors.map((c) => c.name).join(', ')}) como una paleta reutilizable.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSavePalette} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="paletteName" className="text-xs font-semibold">
                                Nombre de la Paleta
                            </Label>
                            <Input
                                id="paletteName"
                                placeholder="Ej: Cápsula Verano, Tonos Pastel..."
                                value={newPaletteName}
                                onChange={(e) => setNewPaletteName(e.target.value)}
                                autoFocus
                                className="h-9 text-xs"
                            />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setIsSavePaletteOpen(false);
                                    setNewPaletteName('');
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={createColorPaletteMutation.isPending || !newPaletteName.trim()}
                            >
                                {createColorPaletteMutation.isPending && (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                )}
                                Guardar Paleta
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
