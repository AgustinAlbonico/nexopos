import { BadRequestException } from '@nestjs/common';

interface MeasuredQuantityInput {
    readonly quantity: number;
    readonly grossQuantity?: number;
    readonly tareGrams?: number;
}

export function validateMeasuredQuantity(quantity: number, isMeasure: boolean): void {
    if (!isMeasure && !Number.isInteger(quantity)) {
        throw new BadRequestException('El producto no admite cantidades fraccionarias');
    }
}

export function resolveMeasuredQuantity(
    { quantity, grossQuantity, tareGrams = 0 }: MeasuredQuantityInput,
    isMeasure: boolean,
): number {
    if (!isMeasure || grossQuantity === undefined) return quantity;

    const netQuantity = grossQuantity - tareGrams / 1000;
    if (netQuantity <= 0) {
        throw new BadRequestException('El peso neto debe ser mayor a cero');
    }
    if (Math.abs(quantity - netQuantity) > 0.000001) {
        throw new BadRequestException('La cantidad neta no coincide con el peso bruto menos la tara');
    }
    return netQuantity;
}
