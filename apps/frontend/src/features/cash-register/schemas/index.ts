import { z } from 'zod';

// Sprint 1: Schema actualizado para apertura de caja
export const openCashRegisterSchema = z.object({
    initialAmount: z.coerce
        .number({
            required_error: 'El monto inicial es requerido',
            invalid_type_error: 'El monto debe ser un número',
        })
        .min(0, 'El monto debe ser mayor o igual a 0'),
    manuallyAdjusted: z.boolean().optional(),
    adjustmentReason: z.string().max(500, 'La razón no puede exceder 500 caracteres').optional(),
    openingNotes: z.string().max(1000, 'Las notas no pueden exceder 1000 caracteres').optional(),
});

// Sprint 1: Schema de montos por método de pago
export const actualAmountsSchema = z.object({
    debit_card: z.coerce.number().min(0).optional(),
    credit_card: z.coerce.number().min(0).optional(),
    transfer: z.coerce.number().min(0).optional(),
    qr: z.coerce.number().min(0).optional(),
    check: z.coerce.number().min(0).optional(),
    other: z.coerce.number().min(0).optional(),
});

// Sprint 1: Schema actualizado para cierre de caja con arqueo detallado
export const closeCashRegisterSchema = z.object({
    actualCashAmount: z.coerce
        .number({
            required_error: 'El monto de efectivo es requerido',
            invalid_type_error: 'El monto debe ser un número',
        })
        .min(0, 'El monto debe ser mayor o igual a 0'),
    actualAmounts: actualAmountsSchema.optional(),
    closingNotes: z.string().max(1000, 'Las notas no pueden exceder 1000 caracteres').optional(),
});

export const createCashMovementSchema = z.object({
    movementType: z.enum(['income', 'expense'], {
        required_error: 'El tipo de movimiento es requerido',
    }),
    paymentMethodId: z.string({
        required_error: 'El método de pago es requerido',
    }).uuid('El método de pago es inválido'),
    amount: z.coerce
        .number({
            required_error: 'El monto es requerido',
            invalid_type_error: 'El monto debe ser un número',
        })
        .positive('El monto debe ser mayor a 0'),
    description: z
        .string({
            required_error: 'La descripción es requerida',
        })
        .min(1, 'La descripción es requerida')
        .max(200, 'La descripción no puede exceder 200 caracteres'),
    notes: z.string().max(1000, 'Las notas no pueden exceder 1000 caracteres').optional(),
});

// Sprint 1: Schema para filtros de reporte
export const cashFlowReportFiltersSchema = z.object({
    startDate: z.string().min(1, 'La fecha de inicio es requerida'),
    endDate: z.string().min(1, 'La fecha de fin es requerida'),
    paymentMethod: z.string().optional(),
    includeComparison: z.boolean().optional(),
});

export type OpenCashRegisterFormData = z.infer<typeof openCashRegisterSchema>;
export type CloseCashRegisterFormData = z.infer<typeof closeCashRegisterSchema>;
export type CreateCashMovementFormData = z.infer<typeof createCashMovementSchema>;
export type CashFlowReportFiltersFormData = z.infer<typeof cashFlowReportFiltersSchema>;
