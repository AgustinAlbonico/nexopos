/**
 * Schemas de validación para compras
 */
import { z } from 'zod';
import { PurchaseStatus} from '../types';

/**
 * Schema para un item de compra
 */
export const purchaseItemSchema = z.object({
    productId: z.string().min(1, 'Seleccione un producto'),
    quantity: z.coerce.number().min(1, 'La cantidad mínima es 1'),
    unitPrice: z.coerce.number().min(0, 'El precio no puede ser negativo'),
    notes: z.string().max(500).optional(),
});

/**
 * Schema para creación de compra
 */
export const createPurchaseSchema = z.object({
    supplierId: z.string().optional(),
    providerName: z.string().max(200).optional(),
    providerDocument: z.string().max(100).optional(),
    providerPhone: z.string().max(100).optional(),
    purchaseDate: z.string().min(1, 'La fecha es requerida'),
    tax: z.coerce.number().min(0).default(0),
    discount: z.coerce.number().min(0).default(0),
    status: z.nativeEnum(PurchaseStatus).optional(),
    paymentMethodId: z.string().optional(),
    paidAt: z.string().optional(),
    invoiceNumber: z.string().max(100).optional(),
    notes: z.string().max(1000).optional(),
    items: z.array(purchaseItemSchema).min(1, 'Debe agregar al menos un producto'),
    // createExpense and expenseCategoryId removed: purchases are handled separately from expenses
}).superRefine((data, ctx) => {
    if (data.status === PurchaseStatus.PAID && !data.paymentMethodId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'El método de pago es requerido cuando la compra está pagada',
            path: ['paymentMethodId'],
        });
    }
    if (!data.supplierId && (!data.providerName || data.providerName.trim() === '')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Seleccioná un proveedor o ingresá un nombre',
            path: ['providerName'],
        });
    }
});

/**
 * Schema para actualización de compra
 */
export const updatePurchaseSchema = z.object({
    providerName: z.string().min(1).max(200).optional(),
    providerDocument: z.string().max(100).optional(),
    providerPhone: z.string().max(100).optional(),
    tax: z.coerce.number().min(0).optional(),
    discount: z.coerce.number().min(0).optional(),
    status: z.nativeEnum(PurchaseStatus).optional(),
    paymentMethodId: z.string().optional(),
    paidAt: z.string().optional(),
    invoiceNumber: z.string().max(100).optional(),
    notes: z.string().max(1000).optional(),
});

export type PurchaseItemFormValues = z.infer<typeof purchaseItemSchema>;
export type CreatePurchaseFormValues = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseFormValues = z.infer<typeof updatePurchaseSchema>;

