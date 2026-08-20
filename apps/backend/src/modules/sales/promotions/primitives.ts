export type PriceAdjustmentSource = 'quantity_break' | 'coupon' | 'loyalty';

export type PriceAdjustment = {
    readonly kind: 'discount' | 'surcharge';
    readonly source: PriceAdjustmentSource;
    readonly amount: number;
    readonly code?: string;
};

export type ApplyPriceResult = {
    readonly baseAmount: number;
    readonly adjustments: readonly PriceAdjustment[];
    readonly total: number;
};

export type QuantityBreak = {
    readonly minQuantity: number;
    readonly unitPrice: number;
};

export type QuantityBreakInput = {
    readonly productId: string;
    readonly quantity: number;
    readonly unitPrice: number;
    readonly breaks: readonly QuantityBreak[];
};

export type Coupon = {
    readonly code: string;
    readonly amount?: number;
    readonly percent?: number;
};

export type CouponInput = {
    readonly baseAmount: number;
    readonly coupon: Coupon;
};

export type LoyaltyAccrualInput = {
    readonly customerId: string;
    readonly saleTotal: number;
    readonly pointsPerCurrency: number;
};

export type LoyaltyAccrual = {
    readonly kind: 'loyalty_accrual';
    readonly customerId: string;
    readonly points: number;
};

export type StoreCreditAllocationInput = {
    readonly customerId: string;
    readonly available: number;
    readonly requested: number;
    readonly saleTotal: number;
};

export type StoreCreditAllocation = {
    readonly kind: 'store_credit_payment';
    readonly customerId: string;
    readonly amount: number;
    readonly discountBasisChange: 0;
    readonly taxBasisChange: 0;
};

export function applyQuantityBreak(input: QuantityBreakInput): ApplyPriceResult {
    const baseAmount = input.quantity * input.unitPrice;
    const matchingBreaks = input.breaks.filter((rule) => input.quantity >= rule.minQuantity);
    const bestBreak = matchingBreaks.reduce<QuantityBreak | undefined>(
        (best, rule) => (best === undefined || rule.minQuantity > best.minQuantity ? rule : best),
        undefined,
    );
    const discount = bestBreak === undefined ? 0 : (input.unitPrice - bestBreak.unitPrice) * input.quantity;
    return {
        baseAmount,
        adjustments: discount > 0 ? [{ kind: 'discount', source: 'quantity_break', amount: discount }] : [],
        total: baseAmount - discount,
    };
}

export function applyCoupon(input: CouponInput): ApplyPriceResult {
    const rawDiscount = input.coupon.amount ?? input.baseAmount * ((input.coupon.percent ?? 0) / 100);
    const discount = Math.min(input.baseAmount, rawDiscount);
    return {
        baseAmount: input.baseAmount,
        adjustments: discount > 0 ? [{ kind: 'discount', source: 'coupon', amount: discount, code: input.coupon.code }] : [],
        total: input.baseAmount - discount,
    };
}

export type ApparelPromoType = '2x1' | '3x2' | 'second_unit_50' | 'volume_discount';

export type ApparelPromoInput = {
    readonly items: readonly {
        productId: string;
        unitPrice: number;
        quantity: number;
    }[];
    readonly promoType: ApparelPromoType;
    readonly discountPercent?: number;
};

export function applyApparelPromotion(input: ApparelPromoInput): ApplyPriceResult {
    const individualPrices: number[] = [];
    for (const item of input.items) {
        for (let i = 0; i < item.quantity; i++) {
            individualPrices.push(item.unitPrice);
        }
    }

    const baseAmount = individualPrices.reduce((sum, p) => sum + p, 0);
    // Ordenar descendente para que la unidad bonificada sea la de menor valor
    individualPrices.sort((a, b) => b - a);
    const cheapestUnit = individualPrices.length > 0 ? individualPrices[individualPrices.length - 1] : 0;

    // Una sola aplicación de la promo, independiente de cuántas unidades haya
    // en el ticket: 2x1 = 1 unidad gratis (la más barata), 3x2 = 1 unidad
    // gratis, 2da al 50% = mitad de precio de la unidad más barata.
    let discount = 0;
    if (input.promoType === '2x1') {
        if (individualPrices.length >= 2) {
            discount = cheapestUnit;
        }
    } else if (input.promoType === '3x2') {
        if (individualPrices.length >= 3) {
            discount = cheapestUnit;
        }
    } else if (input.promoType === 'second_unit_50') {
        if (individualPrices.length >= 2) {
            discount = cheapestUnit * 0.5;
        }
    } else if (input.promoType === 'volume_discount' && input.discountPercent) {
        discount = baseAmount * (input.discountPercent / 100);
    }

    discount = Math.round(discount * 100) / 100;

    return {
        baseAmount,
        adjustments: discount > 0 ? [{ kind: 'discount', source: 'coupon', amount: discount, code: `PROMO_${input.promoType.toUpperCase()}` }] : [],
        total: Math.max(0, baseAmount - discount),
    };
}

export function createLoyaltyAccrual(input: LoyaltyAccrualInput): LoyaltyAccrual {
    return {
        kind: 'loyalty_accrual',
        customerId: input.customerId,
        points: Math.floor(input.saleTotal * input.pointsPerCurrency),
    };
}

export function allocateStoreCredit(input: StoreCreditAllocationInput): StoreCreditAllocation {
    return {
        kind: 'store_credit_payment',
        customerId: input.customerId,
        amount: Math.min(input.available, input.requested, input.saleTotal),
        discountBasisChange: 0,
        taxBasisChange: 0,
    };
}
