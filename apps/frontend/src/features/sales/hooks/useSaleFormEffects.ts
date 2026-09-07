/**
 * Hook personalizado para efectos del formulario de venta
 * Extrae la lógica de useEffect del componente principal para reducir complejidad cognitiva
 */
import { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CreateSaleFormValues } from '../schemas/sale.schema';

interface UseSaleFormEffectsParams {
    form: UseFormReturn<CreateSaleFormValues>;
    subtotal: number;
    total: number;
    totalTaxAmount: number;
    discountType: 'FIXED' | 'PERCENTAGE';
    discountPercentage: number | string;
    discount: number;
    surchargeType: 'FIXED' | 'PERCENTAGE';
    surchargePercentage: number | string;
    surcharge: number;
    taxes: CreateSaleFormValues['taxes'];
    payments: CreateSaleFormValues['payments'];
    isOnAccount: boolean;
    customerId: string | undefined;
    isMonotributista: boolean;
    fiscalConfigured: boolean;
}

/**
 * Sincroniza el campo tax con el total de impuestos calculado
 */
export function useTaxSync(
    form: UseFormReturn<CreateSaleFormValues>,
    totalTaxAmount: number
): void {
    useEffect(() => {
        form.setValue('tax', totalTaxAmount);
    }, [totalTaxAmount, form]);
}

/**
 * Actualiza el monto del primer pago cuando cambia el total
 */
export function usePaymentAmountSync(
    form: UseFormReturn<CreateSaleFormValues>,
    total: number,
    isOnAccount: boolean,
    paymentsLength: number | undefined
): void {
    useEffect(() => {
        if (!isOnAccount && paymentsLength === 1) {
            form.setValue('payments.0.amount', Math.max(total, 0));
        }
    }, [total, isOnAccount, paymentsLength, form]);
}

/**
 * Recalcula el descuento cuando es porcentual
 */
export function useDiscountCalculation(
    form: UseFormReturn<CreateSaleFormValues>,
    subtotal: number,
    discountType: 'FIXED' | 'PERCENTAGE',
    discountPercentage: number | string,
    currentDiscount: number
): void {
    useEffect(() => {
        if (discountType === 'PERCENTAGE') {
            const percentage = typeof discountPercentage === 'string' ? 0 : Math.min(100, Math.max(0, discountPercentage));
            const calculatedDiscount = (subtotal * percentage) / 100;
            if (Math.abs(currentDiscount - calculatedDiscount) > 0.01) {
                form.setValue('discount', Number(calculatedDiscount.toFixed(2)));
            }
        }
    }, [subtotal, discountPercentage, discountType, form, currentDiscount]);
}

/**
 * Recalcula el recargo cuando es porcentual
 */
export function useSurchargeCalculation(
    form: UseFormReturn<CreateSaleFormValues>,
    subtotal: number,
    surchargeType: 'FIXED' | 'PERCENTAGE',
    surchargePercentage: number | string,
    currentSurcharge: number
): void {
    useEffect(() => {
        if (surchargeType === 'PERCENTAGE') {
            const percentage = typeof surchargePercentage === 'string' ? 0 : surchargePercentage;
            const calculatedSurcharge = (subtotal * percentage) / 100;
            if (Math.abs(currentSurcharge - calculatedSurcharge) > 0.01) {
                form.setValue('surcharge', Number(calculatedSurcharge.toFixed(2)));
            }
        }
    }, [subtotal, surchargePercentage, surchargeType, form, currentSurcharge]);
}

/**
 * Recalcula los montos de impuestos cuando cambia el subtotal
 */
export function useTaxAmountCalculation(
    form: UseFormReturn<CreateSaleFormValues>,
    subtotal: number,
    taxes: CreateSaleFormValues['taxes'] | undefined
): void {
    useEffect(() => {
        taxes?.forEach((tax, index) => {
            if (tax.percentage) {
                const amount = (subtotal * tax.percentage) / 100;
                if (Math.abs((tax.amount || 0) - amount) > 0.01) {
                    form.setValue(`taxes.${index}.amount`, Number(amount.toFixed(2)));
                }
            }
        });
    }, [subtotal, taxes, form]);
}

/**
 * Si se deselecciona cuenta corriente sin cliente, resetear el flag
 */
export function useOnAccountValidation(
    form: UseFormReturn<CreateSaleFormValues>,
    customerId: string | undefined,
    isOnAccount: boolean
): void {
    useEffect(() => {
        if (!customerId && isOnAccount) {
            form.setValue('isOnAccount', false);
        }
    }, [customerId, isOnAccount, form]);
}

/**
 * Limpia impuestos si es monotributista
 */
export function useMonotributistaCleanup(
    form: UseFormReturn<CreateSaleFormValues>,
    isMonotributista: boolean
): void {
    useEffect(() => {
        if (isMonotributista) {
            form.setValue('taxes', []);
            form.setValue('tax', 0);
        }
    }, [isMonotributista, form]);
}

/**
 * Asegura que generateInvoice sea false si AFIP no está configurado
 */
export function useFiscalConfigValidation(
    form: UseFormReturn<CreateSaleFormValues>,
    fiscalConfigured: boolean | undefined
): void {
    useEffect(() => {
        if (fiscalConfigured === false) {
            form.setValue('generateInvoice', false);
        }
    }, [fiscalConfigured, form]);
}
