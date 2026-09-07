/**
 * Schemas de validación para formularios de proveedores
 */
import { z } from 'zod';

export const SupplierSchema = z.object({
    name: z.string().min(1, 'El nombre es requerido').max(200, 'El nombre no puede exceder 200 caracteres'),
    tradeName: z.string().max(200).nullable().optional().or(z.literal('')),
    documentType: z.enum(['DNI', 'CUIT', 'CUIL', 'OTRO']).nullable().optional(),
    documentNumber: z.string().max(50).nullable().optional().or(z.literal('')),
    ivaCondition: z.enum(['RESPONSABLE_INSCRIPTO', 'MONOTRIBUTISTA', 'CONSUMIDOR_FINAL', 'EXENTO', 'NO_RESPONSABLE']).nullable().optional(),
    email: z.string().email('Email inválido').nullable().optional().or(z.literal('')),
    phone: z.string().max(50).nullable().optional().or(z.literal('')),
    mobile: z.string().max(50).nullable().optional().or(z.literal('')),
    address: z.string().max(255).nullable().optional().or(z.literal('')),
    city: z.string().max(100).nullable().optional().or(z.literal('')),
    state: z.string().max(100).nullable().optional().or(z.literal('')),
    postalCode: z.string().max(20).nullable().optional().or(z.literal('')),
    website: z.string().max(255).nullable().optional().or(z.literal('')),
    contactName: z.string().max(100).nullable().optional().or(z.literal('')),
    bankAccount: z.string().max(100).nullable().optional().or(z.literal('')),
    notes: z.string().max(1000).nullable().optional().or(z.literal('')),
    classification: z.string().max(100).nullable().optional().or(z.literal('')),
    isActive: z.boolean().default(true),
});

export type SupplierFormValues = z.infer<typeof SupplierSchema>;
