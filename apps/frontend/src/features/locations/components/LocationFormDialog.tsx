/**
 * Diálogo de alta / edición de ubicación.
 * Usa react-hook-form + zod (mismo stack que el resto del módulo de productos).
 * Sigue el patrón usado en SuppliersPage / ProductsPage: el FormDialog
 * contiene el formulario y los botones Cancelar/Enviar viven al pie.
 */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Boxes } from 'lucide-react';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { locationFormSchema, type LocationFormValues } from '../schemas/location.schema';
import type { Location } from '../types';
import { FUNCTION_LABEL, LocationFunction } from '../types';

interface LocationFormDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly onSubmit: (values: LocationFormValues) => void | Promise<void>;
    readonly initial?: Location | null;
    readonly isSubmitting?: boolean;
    /** Deshabilita los flags (true en edición para evitar switches accidentales). */
    readonly disableFlags?: boolean;
}

export function LocationFormDialog({
    open,
    onOpenChange,
    onSubmit,
    initial,
    isSubmitting = false,
    disableFlags = false,
}: LocationFormDialogProps) {
    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<LocationFormValues>({
        resolver: zodResolver(locationFormSchema),
        defaultValues: {
            name: initial?.name ?? '',
            function: initial?.function ?? LocationFunction.STORAGE,
            isPrimarySale: initial?.isPrimarySale ?? false,
            isDefaultReceive: initial?.isDefaultReceive ?? false,
        },
    });

    useEffect(() => {
        if (open) {
            reset({
                name: initial?.name ?? '',
                function: initial?.function ?? LocationFunction.STORAGE,
                isPrimarySale: initial?.isPrimarySale ?? false,
                isDefaultReceive: initial?.isDefaultReceive ?? false,
            });
        }
    }, [open, initial, reset]);

    const isPrimarySale = watch('isPrimarySale');
    const isDefaultReceive = watch('isDefaultReceive');

    return (
        <FormDialog
            open={open}
            onOpenChange={onOpenChange}
            title={initial ? 'Editar ubicación' : 'Nueva ubicación'}
            description={
                initial
                    ? 'Modificá el nombre o la función.'
                    : 'Creá una nueva ubicación física (salón o depósito).'
            }
            icon={Boxes}
            variant="primary"
        >
            <form
                id="location-form"
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
            >
                <div className="space-y-1.5">
                    <Label htmlFor="loc-name">Nombre</Label>
                    <Input
                        id="loc-name"
                        placeholder="Salón / Depósito / Mostrador…"
                        autoFocus
                        aria-invalid={Boolean(errors.name)}
                        {...register('name')}
                    />
                    {errors.name && (
                        <p className="text-xs text-destructive">{errors.name.message}</p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="loc-function">Función</Label>
                    <select
                        id="loc-function"
                        className="flex h-10 w-full rounded-md border border-input bg-white dark:bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        {...register('function')}
                    >
                        {Object.values(LocationFunction).map((fn) => (
                            <option key={fn} value={fn}>
                                {FUNCTION_LABEL[fn]}
                            </option>
                        ))}
                    </select>
                </div>

                {!disableFlags && (
                    <div className="space-y-2 pt-2">
                        <p className="text-xs text-muted-foreground">Flags (opcionales)</p>
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={isPrimarySale}
                                onCheckedChange={(c) => setValue('isPrimarySale', Boolean(c))}
                            />
                            Es la ubicación principal de venta
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                                checked={isDefaultReceive}
                                onCheckedChange={(c) => setValue('isDefaultReceive', Boolean(c))}
                            />
                            Es el destino predeterminado de compras
                        </label>
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Guardando…' : initial ? 'Guardar' : 'Crear'}
                    </Button>
                </div>
            </form>
        </FormDialog>
    );
}
