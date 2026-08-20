/**
 * Schemas de validación para ventas
 */
import { z } from 'zod';
import { SaleStatus, PaymentMethod } from '../types';

/**
 * Schema para item de venta
 */
export const saleItemSchema = z.object({
    productId: z.string().min(1, 'Seleccione un producto'),
    productName: z.string().optional(), // Para mostrar en UI
    quantity: z.number().min(1, 'Cantidad mínima: 1'),
    unitPrice: z.number().min(0, 'Precio debe ser mayor o igual a 0'),
    discount: z.number().min(0).optional().default(0),
    discountPercent: z.number().min(0).max(100).optional().default(0),
    notes: z.string().optional(),
    stock: z.number().optional(), // Para validación en frontend
});

/**
 * Schema para pago de venta
 * Nota: Se permite amount >= 0 aquí porque la validación de montos > 0
 * se hace a nivel de createSaleSchema según isOnAccount
 */
export const salePaymentSchema = z.object({
    paymentMethod: z.nativeEnum(PaymentMethod),
    amount: z.number().min(0, 'El monto debe ser mayor o igual a 0'),
    installments: z.number().min(1).optional(),
    cardLastFourDigits: z.string().max(4).optional(),
    authorizationCode: z.string().optional(),
    referenceNumber: z.string().optional(),
    notes: z.string().optional(),
});

/**
 * Schema para impuestos de venta
 */
export const saleTaxSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido'),
    percentage: z.number().min(0).optional(),
    amount: z.number().min(0),
});

/**
 * Schema para crear venta
 */
export const createSaleSchema = z
    .object({
        customerId: z.string().optional(),
        customerName: z.string().max(200).optional(),
        saleDate: z.string().optional(),
        discount: z.number().min(0).optional().default(0),
        surcharge: z.number().min(0).optional().default(0),
        tax: z.number().min(0).optional().default(0), // Se mantiene para compatibilidad
        taxes: z.array(saleTaxSchema).optional(),
        status: z.nativeEnum(SaleStatus).optional(),
        isOnAccount: z.boolean().optional().default(false),
        generateInvoice: z.boolean().optional().default(false), // Si true, genera factura fiscal AFIP
        ivaPercentage: z.number().optional(), // Porcentaje de IVA (21, 10.5, 27)
        sellerId: z.string().optional(),
        sellerName: z.string().max(255).optional(),
        isReservation: z.boolean().optional().default(false),
        reservationDeposit: z.number().min(0).optional(),
        reservationExpiresAt: z.string().optional(),
        notes: z.string().max(1000).optional(),
        items: z.array(saleItemSchema).min(1, 'Agregue al menos un producto'),
        payments: z.array(salePaymentSchema).optional(),
    })
    .refine(
        (data) => {
            // Si es cuenta corriente, debe haber cliente
            if (data.isOnAccount && !data.customerId) {
                return false;
            }
            return true;
        },
        {
            message: 'Debe seleccionar un cliente para venta en cuenta corriente',
            path: ['isOnAccount'],
        }
    )
    .refine(
        (data) => {
            // Si NO es cuenta corriente, los pagos deben tener monto > 0
            if (!data.isOnAccount && data.payments) {
                return data.payments.every((p) => p.amount > 0);
            }
            return true;
        },
        {
            message: 'Todos los pagos deben tener un monto mayor a 0',
            path: ['payments'],
        }
    );

/**
 * Tipos inferidos de los schemas
 */
export type SaleItemFormValues = z.infer<typeof saleItemSchema>;
export type SalePaymentFormValues = z.infer<typeof salePaymentSchema>;
export type SaleTaxFormValues = z.infer<typeof saleTaxSchema>;
export type CreateSaleFormValues = z.infer<typeof createSaleSchema>;

