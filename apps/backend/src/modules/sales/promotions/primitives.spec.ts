import {
    allocateStoreCredit,
    applyCoupon,
    applyQuantityBreak,
    createLoyaltyAccrual,
    applyApparelPromotion,
} from './primitives';

describe('promotion primitives', () => {
    it('applies the best explicit quantity break without future tables', () => {
        // Given
        const input = {
            productId: 'product-1',
            quantity: 10,
            unitPrice: 100,
            breaks: [
                { minQuantity: 5, unitPrice: 90 },
                { minQuantity: 10, unitPrice: 80 },
            ],
        };

        // When
        const result = applyQuantityBreak(input);

        // Then
        expect(result).toEqual({
            baseAmount: 1000,
            adjustments: [{ kind: 'discount', source: 'quantity_break', amount: 200 }],
            total: 800,
        });
    });

    it('applies a percent coupon as a pure price adjustment', () => {
        // Given
        const input = {
            baseAmount: 200,
            coupon: { code: 'PROMO10', percent: 10 },
        };

        // When
        const result = applyCoupon(input);

        // Then
        expect(result).toEqual({
            baseAmount: 200,
            adjustments: [{ kind: 'discount', source: 'coupon', amount: 20, code: 'PROMO10' }],
            total: 180,
        });
    });

    it('models loyalty accrual without persistence or automatic enforcement', () => {
        // Given
        const input = { customerId: 'customer-1', saleTotal: 125, pointsPerCurrency: 0.1 };

        // When
        const result = createLoyaltyAccrual(input);

        // Then
        expect(result).toEqual({
            kind: 'loyalty_accrual',
            customerId: 'customer-1',
            points: 12,
        });
    });

    it('models store credit as payment allocation, not discount or tax basis change', () => {
        // Given
        const input = { customerId: 'customer-1', available: 50, requested: 30, saleTotal: 100 };

        // When
        const result = allocateStoreCredit(input);

        // Then
        expect(result).toEqual({
            kind: 'store_credit_payment',
            customerId: 'customer-1',
            amount: 30,
            discountBasisChange: 0,
            taxBasisChange: 0,
        });
    });

    describe('applyApparelPromotion', () => {
        it('applies 2x1 promotion discounting the cheapest item', () => {
            const input = {
                items: [
                    { productId: 'remera-1', unitPrice: 20000, quantity: 1 },
                    { productId: 'remera-2', unitPrice: 15000, quantity: 1 },
                ],
                promoType: '2x1' as const,
            };

            const result = applyApparelPromotion(input);
            expect(result.baseAmount).toBe(35000);
            expect(result.adjustments).toEqual([
                { kind: 'discount', source: 'coupon', amount: 15000, code: 'PROMO_2X1' },
            ]);
            expect(result.total).toBe(20000);
        });

        it('applies 2nd unit at 50% off', () => {
            const input = {
                items: [
                    { productId: 'jean-1', unitPrice: 40000, quantity: 2 },
                ],
                promoType: 'second_unit_50' as const,
            };

            const result = applyApparelPromotion(input);
            expect(result.baseAmount).toBe(80000);
            expect(result.adjustments).toEqual([
                { kind: 'discount', source: 'coupon', amount: 20000, code: 'PROMO_SECOND_UNIT_50' },
            ]);
            expect(result.total).toBe(60000);
        });

        it('applies 3x2 promotion correctly', () => {
            const input = {
                items: [
                    { productId: 'buzo-1', unitPrice: 30000, quantity: 3 },
                ],
                promoType: '3x2' as const,
            };

            const result = applyApparelPromotion(input);
            expect(result.baseAmount).toBe(90000);
            expect(result.adjustments).toEqual([
                { kind: 'discount', source: 'coupon', amount: 30000, code: 'PROMO_3X2' },
            ]);
            expect(result.total).toBe(60000);
        });

        it('2x1 with 4 units discounts exactly 1 cheapest unit, not one per pair', () => {
            const input = {
                items: [
                    { productId: 'coca', unitPrice: 1500, quantity: 2 },
                    { productId: 'agua', unitPrice: 800, quantity: 2 },
                ],
                promoType: '2x1' as const,
            };

            const result = applyApparelPromotion(input);
            expect(result.baseAmount).toBe(4600);
            expect(result.adjustments[0].amount).toBe(800);
            expect(result.total).toBe(3800);
        });

        it('second_unit_50 with 4 units discounts 50% of exactly 1 cheapest unit', () => {
            const input = {
                items: [
                    { productId: 'coca', unitPrice: 1500, quantity: 2 },
                    { productId: 'agua', unitPrice: 800, quantity: 2 },
                ],
                promoType: 'second_unit_50' as const,
            };

            const result = applyApparelPromotion(input);
            expect(result.adjustments[0].amount).toBe(400);
            expect(result.total).toBe(4200);
        });

        it('3x2 with 5 units discounts exactly 1 cheapest unit', () => {
            const input = {
                items: [
                    { productId: 'buzo', unitPrice: 30000, quantity: 3 },
                    { productId: 'gorro', unitPrice: 5000, quantity: 2 },
                ],
                promoType: '3x2' as const,
            };

            const result = applyApparelPromotion(input);
            expect(result.adjustments[0].amount).toBe(5000);
            expect(result.total).toBe(95000);
        });

        it('2x1 with a single unit applies no discount', () => {
            const input = {
                items: [{ productId: 'sola', unitPrice: 1000, quantity: 1 }],
                promoType: '2x1' as const,
            };

            const result = applyApparelPromotion(input);
            expect(result.adjustments).toEqual([]);
            expect(result.total).toBe(1000);
        });
    });
});
