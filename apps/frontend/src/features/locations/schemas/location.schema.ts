import { z } from 'zod';

/**
 * Esquema del formulario de alta/edición de ubicación.
 * `name` único y no vacío; `function` obligatoria; los flags son opcionales
 * (el backend valida la unicidad de primaria/destino).
 */
export const locationFormSchema = z.object({
    name: z
        .string()
        .min(1, 'El nombre es requerido')
        .max(120, 'Máximo 120 caracteres'),
    function: z.enum(['SALE', 'STORAGE'], {
        errorMap: () => ({ message: 'Función requerida' }),
    }),
    isPrimarySale: z.boolean().default(false),
    isDefaultReceive: z.boolean().default(false),
});

export type LocationFormValues = z.infer<typeof locationFormSchema>;
