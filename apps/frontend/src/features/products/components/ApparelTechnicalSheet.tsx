import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tag, ShieldAlert } from 'lucide-react';
import { ProductFormValues } from '../schemas/product.schema';

interface ApparelTechnicalSheetProps {
    readonly form: UseFormReturn<ProductFormValues>;
    readonly seasonSuggestions: string[];
    readonly collectionSuggestions: string[];
}

const DEFAULT_COMPOSITIONS = [
    '100% Algodón Peinado 24/1',
    '98% Algodón / 2% Elastano',
    'Rústico con Lycra',
    'Frisa Invisible',
    'Piqué de Algodón',
    'Lino Natural',
];

const DEFAULT_CARE_INSTRUCTIONS = [
    'Lavar con agua fría a mano',
    'No usar blanqueador / cloro',
    'No planchar sobre estampas',
    'Secar a la sombra',
    'Lavado delicado en lavarropas',
];

export function ApparelTechnicalSheet({
    form,
    seasonSuggestions,
    collectionSuggestions,
}: ApparelTechnicalSheetProps) {
    return (
        <div className="space-y-4 pt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400 border-b border-blue-200 dark:border-blue-900 pb-1.5 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Ficha Técnica de Indumentaria & Calzado
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Temporada */}
                <FormField
                    control={form.control}
                    name="season"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-medium text-slate-700 dark:text-slate-300">Temporada</FormLabel>
                            <FormControl>
                                <Input
                                    list="season-suggestions-list"
                                    placeholder="Ej: Primavera-Verano 2026"
                                    {...field}
                                    value={field.value || ''}
                                    className="h-9 text-xs"
                                />
                            </FormControl>
                            <datalist id="season-suggestions-list">
                                {seasonSuggestions.map((s) => (
                                    <option key={s} value={s} />
                                ))}
                            </datalist>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                                {seasonSuggestions.slice(0, 3).map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => field.onChange(s)}
                                        className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors"
                                    >
                                        + {s}
                                    </button>
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Colección */}
                <FormField
                    control={form.control}
                    name="collection"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-medium text-slate-700 dark:text-slate-300">Colección / Línea</FormLabel>
                            <FormControl>
                                <Input
                                    list="collection-suggestions-list"
                                    placeholder="Ej: Línea Urbana #1"
                                    {...field}
                                    value={field.value || ''}
                                    className="h-9 text-xs"
                                />
                            </FormControl>
                            <datalist id="collection-suggestions-list">
                                {collectionSuggestions.map((c) => (
                                    <option key={c} value={c} />
                                ))}
                            </datalist>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                                {collectionSuggestions.slice(0, 3).map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => field.onChange(c)}
                                        className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors"
                                    >
                                        + {c}
                                    </button>
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Composición */}
                <FormField
                    control={form.control}
                    name="composition"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-medium text-slate-700 dark:text-slate-300">Composición Textil</FormLabel>
                            <FormControl>
                                <Input
                                    list="composition-suggestions-list"
                                    placeholder="Ej: 100% Algodón Peinado"
                                    {...field}
                                    value={field.value || ''}
                                    className="h-9 text-xs"
                                />
                            </FormControl>
                            <datalist id="composition-suggestions-list">
                                {DEFAULT_COMPOSITIONS.map((comp) => (
                                    <option key={comp} value={comp} />
                                ))}
                            </datalist>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                                {DEFAULT_COMPOSITIONS.slice(0, 3).map((comp) => (
                                    <button
                                        key={comp}
                                        type="button"
                                        onClick={() => field.onChange(comp)}
                                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                                    >
                                        + {comp}
                                    </button>
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Instrucciones de Lavado */}
                <FormField
                    control={form.control}
                    name="careInstructions"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-medium text-slate-700 dark:text-slate-300">Instrucciones de Cuidado / Lavado</FormLabel>
                            <FormControl>
                                <Input
                                    list="care-suggestions-list"
                                    placeholder="Ej: Lavar con agua fría"
                                    {...field}
                                    value={field.value || ''}
                                    className="h-9 text-xs"
                                />
                            </FormControl>
                            <datalist id="care-suggestions-list">
                                {DEFAULT_CARE_INSTRUCTIONS.map((care) => (
                                    <option key={care} value={care} />
                                ))}
                            </datalist>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                                {DEFAULT_CARE_INSTRUCTIONS.slice(0, 2).map((care) => (
                                    <button
                                        key={care}
                                        type="button"
                                        onClick={() => field.onChange(care)}
                                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                                    >
                                        + {care}
                                    </button>
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Política de Devolución */}
                <FormField
                    control={form.control}
                    name="returnPolicy"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <ShieldAlert className="h-3.5 w-3.5 text-blue-600" />
                                Política de Cambio
                            </FormLabel>
                            <Select
                                value={field.value || 'standard'}
                                onValueChange={field.onChange}
                            >
                                <FormControl>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Seleccionar política" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="standard">Estándar (30 días de cambio)</SelectItem>
                                    <SelectItem value="final_sale">Sin cambio (Liquidación / Sale)</SelectItem>
                                    <SelectItem value="size_exchange_only">Solo cambio por talle</SelectItem>
                                    <SelectItem value="time_limited">Tiempo limitado (15 días)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* País de Origen */}
                <FormField
                    control={form.control}
                    name="originCountry"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-medium text-slate-700 dark:text-slate-300">País de Origen</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Ej: Argentina"
                                    {...field}
                                    value={field.value || ''}
                                    className="h-9 text-xs"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
}
