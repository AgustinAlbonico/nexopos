/**
 * ActivationWizardPage (PR7) — asistente de activación del modo sectorizado.
 *
 * 6 pasos:
 *  1. Explicación.
 *  2. Cargar ubicaciones iniciales (alta múltiple en este paso).
 *  3. Marcar la ubicación primaria de venta.
 *  4. Marcar el destino predeterminado de compras.
 *  5. Elegir qué ubicación recibe todo el stock existente.
 *  6. Confirmar y enviar.
 *
 * El estado vive en este componente (no en zustand) — el wizard es un flujo
 * de un solo uso, ephemeral por naturaleza. La forma es la misma de
 * LocationsPage (react-hook-form + zod), sin abstracciones nuevas.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Plus, Trash2, CheckCircle2, Loader2, Boxes } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import type { ActivationResult, CreateLocationDTO } from '../types';
import { LocationFunction } from '../types';

const locationInputSchema = z.object({
    name: z.string().min(1, 'Nombre requerido'),
    function: z.enum(['SALE', 'STORAGE']),
});
const locationsStepSchema = z.object({
    locations: z.array(locationInputSchema).min(1, 'Cargá al menos una ubicación'),
});
type LocationsStepValues = z.infer<typeof locationsStepSchema>;

const pickSchema = (n: number) =>
    z.object({
        picked: z.string().min(1, 'Elegí una opción'),
        _n: z.number().optional(),
    }).refine((v) => v.picked.length > 0, { message: 'Elegí una opción', path: ['picked'] });

interface DraftLocation extends CreateLocationDTO {
    /** ID local temporal; el backend lo asigna al crear. */
    tempId: string;
}

const STEPS = ['Explicación', 'Ubicaciones', 'Primaria venta', 'Destino compras', 'Stock inicial', 'Confirmar'] as const;

function genTempId() {
    return `tmp-${Math.random().toString(36).slice(2, 9)}`;
}

export function ActivationWizardPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [locations, setLocations] = useState<DraftLocation[]>([]);
    const [primarySaleTempId, setPrimarySaleTempId] = useState<string>('');
    const [defaultReceiveTempId, setDefaultReceiveTempId] = useState<string>('');
    const [initialStockTempId, setInitialStockTempId] = useState<string>('');

    const submit = useMutation({
        mutationFn: async (): Promise<ActivationResult> => {
            const res = await api.post<ActivationResult>('/api/inventory/activate', {
                locations: locations.map((l) => ({
                    name: l.name,
                    function: l.function,
                    isPrimarySale: l.tempId === primarySaleTempId,
                    isDefaultReceive: l.tempId === defaultReceiveTempId,
                })),
                initialStockLocationName:
                    locations.find((l) => l.tempId === initialStockTempId)?.name ?? '',
            });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(
                `Modo sectorizado activado. ${data.products} productos migrados a ${data.locations} ubicaciones.`,
            );
            navigate('/inventory/locations');
        },
        onError: (err: { response?: { data?: { message?: string } } }) => {
            toast.error(
                err?.response?.data?.message || 'No se pudo activar el modo sectorizado',
            );
        },
    });

    const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
    const prev = () => setStep((s) => Math.max(s - 1, 0));

    return (
        <div className="container mx-auto p-4 sm:p-6 max-w-3xl space-y-6">
            <header>
                <h1 className="text-2xl font-bold tracking-tight">Asistente de activación</h1>
                <p className="text-sm text-muted-foreground">
                    Activá el modo sectorizado paso a paso. Podés cancelar en cualquier momento.
                </p>
            </header>

            <Stepper currentStep={step} />

            <Card>
                <CardContent className="pt-6">
                    {step === 0 && <Step1Explanation onCancel={() => navigate('/settings')} onNext={next} />}
                    {step === 1 && (
                        <Step2Locations
                            locations={locations}
                            setLocations={setLocations}
                            onNext={next}
                            onPrev={prev}
                        />
                    )}
                    {step === 2 && (
                        <Step3PickRole
                            title="Ubicación primaria de venta"
                            description="Las ventas van a descontar de esta ubicación. Elegí una."
                            locations={locations}
                            selected={primarySaleTempId}
                            onChange={setPrimarySaleTempId}
                            onNext={next}
                            onPrev={prev}
                        />
                    )}
                    {step === 3 && (
                        <Step3PickRole
                            title="Destino predeterminado de compras"
                            description="Las compras sin destino explícito caerán acá. Puede ser la misma que la primaria."
                            locations={locations}
                            selected={defaultReceiveTempId}
                            onChange={setDefaultReceiveTempId}
                            onNext={next}
                            onPrev={prev}
                        />
                    )}
                    {step === 4 && (
                        <Step3PickRole
                            title="Stock inicial"
                            description="Elegí la ubicación que recibe todo el stock existente hoy."
                            locations={locations}
                            selected={initialStockTempId}
                            onChange={setInitialStockTempId}
                            onNext={next}
                            onPrev={prev}
                        />
                    )}
                    {step === 5 && (
                        <Step6Confirm
                            locations={locations}
                            primarySaleTempId={primarySaleTempId}
                            defaultReceiveTempId={defaultReceiveTempId}
                            initialStockTempId={initialStockTempId}
                            isSubmitting={submit.isPending}
                            onSubmit={() => submit.mutate()}
                            onPrev={prev}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function Stepper({ currentStep }: { currentStep: number }) {
    return (
        <ol className="flex flex-wrap gap-2 text-xs">
            {STEPS.map((label, i) => (
                <li
                    key={label}
                    className={`px-2 py-1 rounded-full border ${
                        i === currentStep
                            ? 'bg-primary text-primary-foreground border-primary'
                            : i < currentStep
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'text-muted-foreground'
                    }`}
                >
                    {i + 1}. {label}
                </li>
            ))}
        </ol>
    );
}

function Step1Explanation({ onCancel, onNext }: { onCancel: () => void; onNext: () => void }) {
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <Boxes className="h-6 w-6 text-primary mt-1" />
                <div>
                    <h2 className="font-semibold">¿Qué cambia al activar el modo sectorizado?</h2>
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        <li>Las ventas van a descontar de una ubicación específica (no del total).</li>
                        <li>Las compras reciben un destino predeterminado.</li>
                        <li>Si el salón no alcanza, el POS puede proponer una reposición desde otra ubicación.</li>
                        <li>El stock total actual se conserva y se asigna a la ubicación que elijas.</li>
                    </ul>
                    <p className="mt-3 text-sm">
                        Esta operación es <strong>transaccional</strong>: si algo falla, no queda nada a medias.
                    </p>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button onClick={onNext}>
                    Continuar
                    <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function Step2Locations({
    locations,
    setLocations,
    onNext,
    onPrev,
}: {
    locations: DraftLocation[];
    setLocations: (l: DraftLocation[]) => void;
    onNext: () => void;
    onPrev: () => void;
}) {
    const { register, control, handleSubmit, formState: { errors } } = useForm<LocationsStepValues>({
        resolver: zodResolver(locationsStepSchema),
        defaultValues: { locations: [] },
    });
    const { fields, append, remove } = useFieldArray({ control, name: 'locations' });

    const addRow = () => append({ name: '', function: LocationFunction.SALE });
    const removeRow = (i: number) => remove(i);

    const onSubmit = (values: LocationsStepValues) => {
        // Mapear el form (que usa `function: string`) al DTO del backend.
        const draft: DraftLocation[] = values.locations.map((l) => ({
            name: l.name.trim(),
            function: l.function as LocationFunction,
            tempId: genTempId(),
        }));
        setLocations(draft);
        onNext();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <h2 className="font-semibold">Cargá las ubicaciones iniciales</h2>
                <p className="text-sm text-muted-foreground">
                    Sumá al menos una. Después vas a elegir cuál es la primaria de venta y el destino de compras.
                </p>
            </div>

            {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                    Todavía no agregaste ubicaciones.
                </p>
            ) : (
                <div className="space-y-2">
                    {fields.map((field, i) => (
                        <div key={field.id} className="flex items-end gap-2">
                            <div className="flex-1 space-y-1">
                                <Label htmlFor={`loc-name-${i}`} className="sr-only">Nombre</Label>
                                <Input
                                    id={`loc-name-${i}`}
                                    placeholder="Salón / Depósito / Mostrador…"
                                    {...register(`locations.${i}.name` as const)}
                                    aria-invalid={Boolean(errors.locations?.[i]?.name)}
                                />
                                {errors.locations?.[i]?.name && (
                                    <p className="text-xs text-destructive">
                                        {errors.locations[i]?.name?.message}
                                    </p>
                                )}
                            </div>
                            <div className="w-40 space-y-1">
                                <Label htmlFor={`loc-fn-${i}`} className="sr-only">Función</Label>
                                <select
                                    id={`loc-fn-${i}`}
                                    className="flex h-10 w-full rounded-md border border-input bg-white dark:bg-card px-3 py-2 text-sm"
                                    {...register(`locations.${i}.function` as const)}
                                >
                                    <option value={LocationFunction.SALE}>Venta</option>
                                    <option value={LocationFunction.STORAGE}>Depósito</option>
                                </select>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeRow(i)}
                                aria-label={`Quitar fila ${i + 1}`}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <Button type="button" variant="outline" onClick={addRow}>
                <Plus className="mr-1 h-4 w-4" />
                Agregar ubicación
            </Button>

            {errors.locations?.message && (
                <p className="text-sm text-destructive">{errors.locations.message}</p>
            )}

            <div className="flex justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={onPrev}>
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Volver
                </Button>
                <Button type="submit" disabled={fields.length === 0}>
                    Continuar
                    <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
            </div>
        </form>
    );
}

function Step3PickRole({
    title,
    description,
    locations,
    selected,
    onChange,
    onNext,
    onPrev,
}: {
    title: string;
    description: string;
    locations: DraftLocation[];
    selected: string;
    onChange: (id: string) => void;
    onNext: () => void;
    onPrev: () => void;
}) {
    const { handleSubmit, setValue, formState: { errors } } = useForm<{ picked: string }>({
        resolver: zodResolver(pickSchema(locations.length)),
        defaultValues: { picked: selected },
    });
    const canProceed = Boolean(selected);
    return (
        <form onSubmit={handleSubmit(() => onNext())} className="space-y-4">
            <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <RadioGroup
                value={selected}
                onValueChange={(v) => {
                    setValue('picked', v, { shouldValidate: true });
                    onChange(v);
                }}
                className="space-y-2"
                aria-label={title}
            >
                {locations.map((l) => (
                    <label
                        key={l.tempId}
                        htmlFor={`r-${l.tempId}`}
                        className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer"
                    >
                        <RadioGroupItem value={l.tempId} id={`r-${l.tempId}`} aria-label={l.name} />
                        <div className="flex-1">
                            <p className="text-sm font-medium">{l.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {l.function === LocationFunction.SALE ? 'Venta' : 'Depósito'}
                            </p>
                        </div>
                    </label>
                ))}
            </RadioGroup>
            {errors.picked && (
                <p className="text-sm text-destructive">{errors.picked.message}</p>
            )}
            <div className="flex justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={onPrev}>
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Volver
                </Button>
                <Button type="submit" disabled={!canProceed}>
                    Continuar
                    <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
            </div>
        </form>
    );
}

function Step6Confirm({
    locations,
    primarySaleTempId,
    defaultReceiveTempId,
    initialStockTempId,
    isSubmitting,
    onSubmit,
    onPrev,
}: {
    locations: DraftLocation[];
    primarySaleTempId: string;
    defaultReceiveTempId: string;
    initialStockTempId: string;
    isSubmitting: boolean;
    onSubmit: () => void;
    onPrev: () => void;
}) {
    const find = (id: string) => locations.find((l) => l.tempId === id);
    const primary = find(primarySaleTempId);
    const receive = find(defaultReceiveTempId);
    const initial = find(initialStockTempId);
    return (
        <div className="space-y-4">
            <div>
                <h2 className="font-semibold">Confirmar y activar</h2>
                <p className="text-sm text-muted-foreground">
                    Revisá el resumen. Al confirmar, se ejecuta la transacción única.
                </p>
            </div>
            <dl className="text-sm space-y-2 rounded-md border p-4 bg-muted/30">
                <div className="flex justify-between">
                    <dt className="text-muted-foreground">Ubicaciones a crear</dt>
                    <dd>{locations.length}</dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-muted-foreground">Primaria de venta</dt>
                    <dd className="font-medium">{primary?.name ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-muted-foreground">Destino de compras</dt>
                    <dd className="font-medium">{receive?.name ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-muted-foreground">Recibe stock inicial</dt>
                    <dd className="font-medium">{initial?.name ?? '—'}</dd>
                </div>
            </dl>
            <div className="flex justify-between pt-4 border-t">
                <Button type="button" variant="outline" onClick={onPrev} disabled={isSubmitting}>
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Volver
                </Button>
                <Button onClick={onSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Activando…
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Activar modo sectorizado
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

export default ActivationWizardPage;
