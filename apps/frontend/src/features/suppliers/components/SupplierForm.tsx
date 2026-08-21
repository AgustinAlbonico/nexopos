/**
 * Formulario de proveedor
 * Crea o edita datos de un proveedor
 */
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
import { Switch } from '@/components/ui/switch';
import { SupplierSchema, SupplierFormValues } from '../schemas/supplier.schema';
import { Loader2 } from 'lucide-react';
import { IvaConditionOptions} from '@/types/iva-condition';

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
                                <>
                                    <Input
                                        placeholder="Ej: Nacional, Importador, Distribuidor..."
                                        list="classification-options"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                    <datalist id="classification-options">
                                        {classifications?.map((c) => (
                                            <option key={c} value={c} />
                                        ))}
                                    </datalist>
                                </>
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
