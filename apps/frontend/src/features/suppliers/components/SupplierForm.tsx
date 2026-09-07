import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { suppliersApi } from '../api/suppliers.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { SupplierSchema, SupplierFormValues } from '../schemas/supplier.schema';
import { Loader2, ChevronsUpDown, Check, X, Tag, Search, Plus } from 'lucide-react';
import { IvaConditionOptions} from '@/types/iva-condition';
import { cn } from '@/lib/utils';

interface SupplierFormProps {
    readonly initialData?: SupplierFormValues;
    readonly onSubmit: (data: SupplierFormValues) => void;
    readonly isLoading?: boolean;
    readonly isEditing?: boolean;
}

const DOCUMENT_TYPES = [
    { value: 'DNI', label: 'DNI' },
    { value: 'CUIT', label: 'CUIT' },
    { value: 'CUIL', label: 'CUIL' },
    { value: 'OTRO', label: 'Otro' },
];

const PROVINCES = [
    'Buenos Aires',
    'CABA',
    'Catamarca',
    'Chaco',
    'Chubut',
    'Córdoba',
    'Corrientes',
    'Entre Ríos',
    'Formosa',
    'Jujuy',
    'La Pampa',
    'La Rioja',
    'Mendoza',
    'Misiones',
    'Neuquén',
    'Río Negro',
    'Salta',
    'San Juan',
    'San Luis',
    'Santa Cruz',
    'Santa Fe',
    'Santiago del Estero',
    'Tierra del Fuego',
    'Tucumán',
];

/**
 * Capitaliza la primera letra de cada palabra
 */
function capitalizeWords(text: string): string {
    if (!text) return text;
    return text
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

interface ClassificationInputProps {
    readonly value?: string;
    readonly onChange: (val: string) => void;
    readonly classifications?: string[];
}

function ClassificationInput({
    value = '',
    onChange,
    classifications = [],
}: ClassificationInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value || '');
    const containerRef = useRef<HTMLDivElement>(null);

    // Sincronizar searchTerm cuando el valor exterior cambia (ej: reset o edición)
    useEffect(() => {
        setSearchTerm(value || '');
    }, [value]);

    // Debounce de 250ms para no filtrar en cada tecla presionada
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 250);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Cerrar el menú flotante al hacer clic afuera
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const query = debouncedSearch.trim().toLowerCase();

    // Clasificaciones que coinciden con la búsqueda debounced
    const matchingClassifications = query
        ? classifications.filter((c) => c.toLowerCase().includes(query))
        : [];

    const isExactMatch = classifications.some(
        (c) => c.toLowerCase() === query
    );

    const handleSelect = (selectedValue: string) => {
        onChange(selectedValue);
        setSearchTerm(selectedValue);
        setIsOpen(false);
    };

    return (
        <div className="space-y-2" ref={containerRef}>
            <div className="relative">
                <Input
                    placeholder="Escribí para buscar o crear una clasificación..."
                    value={searchTerm}
                    onChange={(e) => {
                        const val = e.target.value;
                        setSearchTerm(val);
                        onChange(val);
                        setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (searchTerm.trim()) {
                            setIsOpen(true);
                        }
                    }}
                    className="pr-8"
                />
                {searchTerm ? (
                    <button
                        type="button"
                        onClick={() => handleSelect('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="Limpiar"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                ) : null}

                {/* Desplegable flotante que aparece automáticamente cuando el usuario busca */}
                {isOpen && query ? (
                    <div className="absolute left-0 top-full mt-1 w-full z-50 rounded-md border bg-popover p-1 shadow-lg text-popover-foreground animate-in fade-in-0 zoom-in-95 max-h-60 overflow-y-auto">
                        <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground flex items-center justify-between border-b pb-1 mb-1">
                            <span className="flex items-center gap-1">
                                <Search className="h-3 w-3 text-blue-500" />
                                Coincidencias ({matchingClassifications.length})
                            </span>
                        </div>

                        {matchingClassifications.length > 0 ? (
                            <div className="space-y-0.5">
                                {matchingClassifications.map((c) => {
                                    const isSelected =
                                        searchTerm.trim().toLowerCase() === c.toLowerCase();
                                    return (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => handleSelect(c)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-sm text-left transition-colors",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground font-medium"
                                                    : "hover:bg-muted text-foreground"
                                            )}
                                        >
                                            <div className="flex items-center gap-1.5 truncate">
                                                <Tag className="h-3 w-3 shrink-0 opacity-70" />
                                                <span className="truncate">{c}</span>
                                            </div>
                                            {isSelected ? (
                                                <Check className="h-3.5 w-3.5 shrink-0" />
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}

                        {/* Opción para usar la nueva clasificación escrita */}
                        {!isExactMatch && query ? (
                            <button
                                type="button"
                                onClick={() => handleSelect(searchTerm.trim())}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-sm text-left bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800 transition-colors mt-1"
                            >
                                <Plus className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                                <span className="truncate">
                                    Usar nueva: &quot;{searchTerm.trim()}&quot;
                                </span>
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>

            {/* Chips de los más frecuentes (como venías haciendo) */}
            {classifications && classifications.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                        <Tag className="h-3 w-3" /> Frecuentes:
                    </span>
                    {classifications.slice(0, 10).map((c) => {
                        const isSelected =
                            searchTerm.trim().toLowerCase() === c.toLowerCase();
                        return (
                            <button
                                key={c}
                                type="button"
                                onClick={() => handleSelect(c)}
                                className={cn(
                                    "text-xs px-2.5 py-0.5 rounded-full border transition-all duration-150 font-medium",
                                    isSelected
                                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700"
                                )}
                            >
                                {c}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

export function SupplierForm({
    initialData,
    onSubmit,
    isLoading = false,
    isEditing = false,
}: SupplierFormProps) {
    const { data: classifications } = useQuery({
        queryKey: ['supplier-classifications'],
        queryFn: () => suppliersApi.getClassifications(),
    });

    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(SupplierSchema as any),
        defaultValues: initialData || {
            name: '',
            tradeName: '',
            documentType: null,
            documentNumber: '',
            ivaCondition: null,
            email: '',
            phone: '',
            mobile: '',
            address: '',
            city: '',
            state: '',
            postalCode: '',
            website: '',
            contactName: '',
            bankAccount: '',
            notes: '',
            classification: '',
            isActive: true,
        },
    });

    const handleSubmit = (data: SupplierFormValues) => {
        // Limpiar campos vacíos y capitalizar nombre
        const cleanedData = {
            ...data,
            name: capitalizeWords(data.name.trim()),
            tradeName: data.tradeName?.trim() || undefined,
            documentType: data.documentType || undefined,
            documentNumber: data.documentNumber?.trim() || undefined,
            ivaCondition: data.ivaCondition || undefined,
            email: data.email?.trim().toLowerCase() || undefined,
            phone: data.phone?.trim() || undefined,
            mobile: data.mobile?.trim() || undefined,
            address: data.address?.trim() || undefined,
            city: data.city?.trim() || undefined,
            state: data.state?.trim() || undefined,
            postalCode: data.postalCode?.trim() || undefined,
            website: data.website?.trim() || undefined,
            contactName: capitalizeWords(data.contactName?.trim() || '') || undefined,
            bankAccount: data.bankAccount?.trim() || undefined,
            notes: data.notes?.trim() || undefined,
            classification: data.classification?.trim() || undefined,
        };
        onSubmit(cleanedData);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {/* Nombre comercial y nombre fantasía */}
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Razón Social / Nombre <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Nombre del proveedor"
                                        {...field}
                                        onBlur={(e) => {
                                            const capitalized = capitalizeWords(e.target.value);
                                            field.onChange(capitalized);
                                            field.onBlur();
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="tradeName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre de Fantasía</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Nombre comercial"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Documento */}
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="documentType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tipo de Documento</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value || undefined}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {DOCUMENT_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="documentNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Número de Documento</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="20-12345678-9"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Condición IVA */}
                <FormField
                    control={form.control}
                    name="ivaCondition"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Condición IVA</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value || undefined}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {IvaConditionOptions.map((condition) => (
                                        <SelectItem key={condition.value} value={condition.value}>
                                            {condition.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Contacto */}
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="email@ejemplo.com"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="contactName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Persona de Contacto</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Nombre del contacto"
                                        {...field}
                                        value={field.value || ''}
                                        onBlur={(e) => {
                                            const capitalized = capitalizeWords(e.target.value);
                                            field.onChange(capitalized);
                                            field.onBlur();
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Teléfonos */}
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Teléfono</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="(011) 1234-5678"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="mobile"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Celular</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="(011) 15-1234-5678"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Dirección */}
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Dirección</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Calle, número, piso, depto."
                                    {...field}
                                    value={field.value || ''}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Ciudad, Provincia, CP */}
                <div className="grid grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ciudad</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Ciudad"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Provincia</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value || undefined}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {PROVINCES.map((province) => (
                                            <SelectItem key={province} value={province}>
                                                {province}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Código Postal</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="1234"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Website y Cuenta Bancaria */}
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sitio Web</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="https://www.ejemplo.com"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="bankAccount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>CBU / Alias</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="CBU o Alias"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Clasificación */}
                <FormField
                    control={form.control}
                    name="classification"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Clasificación</FormLabel>
                            <FormControl>
                                <ClassificationInput
                                    value={field.value || ''}
                                    onChange={field.onChange}
                                    classifications={classifications}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Notas */}
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notas</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Observaciones sobre el proveedor..."
                                    className="resize-none"
                                    rows={3}
                                    {...field}
                                    value={field.value || ''}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Estado activo */}
                {isEditing && (
                    <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                    <FormLabel>Estado Activo</FormLabel>
                                    <p className="text-sm text-muted-foreground">
                                        Desactivar oculta el proveedor de las listas
                                    </p>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                )}

                {/* Botón submit */}
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditing ? 'Actualizar' : 'Crear'} Proveedor
                    </Button>
                </div>
            </form>
        </Form>
    );
}
