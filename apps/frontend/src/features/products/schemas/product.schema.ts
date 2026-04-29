import { z } from 'zod';

/**
 * Esquema de validación simplificado para formulario de producto
 * - Nombre (requerido)
 * - Costo (requerido)
 * - Stock (requerido para carga inicial)
 * - Categoría (opcional, una sola)
 * - Margen personalizado (opcional)
 */
export const productSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido').max(255),
    description: z.string().max(1000).optional().nullable(),
    barcode: z.string().max(100).optional().nullable(),
    cost: z.coerce.number().min(0, 'El costo debe ser 0 o mayor'),
    stock: z.coerce.number().int().min(0, 'El stock debe ser 0 o mayor').default(0),
    categoryId: z.string().uuid().optional().nullable(),
    brandName: z.string().max(100).optional().nullable(),
    isActive: z.boolean().default(true),
    // Margen de ganancia personalizado
    useCustomMargin: z.boolean().default(false),
    customProfitMargin: z.coerce.number().min(0, 'El margen debe ser 0 o mayor').max(1000000).optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;


