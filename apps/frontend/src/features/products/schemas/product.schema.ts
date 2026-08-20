import { z } from 'zod';

/**
 * Esquema de validación para formulario de producto.
 *
 * Modo Precio Fijo (default ON para productos nuevos):
 * - El usuario carga `price` directamente.
 * - `cost` es opcional.
 * - No se calcula nada desde costo + margen.
 *
 * Modo clásico (default OFF):
 * - El usuario carga `cost` y el sistema calcula `price` desde profitMargin.
 * - Se puede activar `useCustomMargin` + `customProfitMargin` para override.
 */
export const productSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido').max(255),
    description: z.string().max(1000).optional().nullable(),
    barcode: z.string().max(100).optional().nullable(),
    isMeasure: z.boolean().default(false),
    tareGrams: z.coerce.number().min(0, 'La tara debe ser 0 o mayor').optional().nullable(),
    variableBarcodeFormat: z.enum(['gs1_weight', 'gs1_price', 'local_weight', 'local_price']).optional().nullable(),
    cost: z.coerce.number().min(0, 'El costo debe ser 0 o mayor').optional().nullable(),
    price: z.coerce.number().min(0, 'El precio debe ser 0 o mayor').optional(),
    stock: z.coerce.number().min(0, 'El stock debe ser 0 o mayor').default(0),
    categoryId: z.string().uuid().optional().nullable(),
    brandName: z.string().max(100).optional().nullable(),
    isActive: z.boolean().default(true),
    useManualPrice: z.boolean().default(true),
    useCustomMargin: z.boolean().default(false),
    customProfitMargin: z.coerce.number().min(0, 'El margen debe ser 0 o mayor').max(1000000).optional(),
    season: z.string().max(100).optional().nullable(),
    collection: z.string().max(100).optional().nullable(),
    composition: z.string().max(255).optional().nullable(),
    careInstructions: z.string().max(255).optional().nullable(),
    originCountry: z.string().max(100).optional().nullable(),
    returnPolicy: z.enum(['standard', 'final_sale', 'size_exchange_only', 'time_limited']).optional().nullable(),
}).superRefine((data, ctx) => {
    if (data.useManualPrice) {
        if (data.price === undefined || data.price === null || Number.isNaN(data.price)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['price'],
                message: 'El precio final es requerido cuando Precio Fijo está activado',
            });
        }
    } else {
        if (data.cost === undefined || data.cost === null || Number.isNaN(data.cost)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['cost'],
                message: 'El costo es requerido cuando Precio Fijo está desactivado',
            });
        }
    }
});

export type ProductFormValues = z.infer<typeof productSchema>;
