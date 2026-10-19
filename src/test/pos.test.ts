import { describe, it, expect } from 'vitest';
import { roundMoney } from '@/lib/currency';

describe('Point of Sale Business Logic Calculations', () => {
  it('correctly calculates subtotal, line item modifiers, and tax', () => {
    // 2 Flat Whites @ $4.75 + Oat Milk ($0.75) = $5.50 each = $11.00
    const flatWhiteBase = 4.75;
    const oatMilkMod = 0.75;
    const flatWhiteUnit = flatWhiteBase + oatMilkMod;
    const flatWhiteQty = 2;
    const lineTotal1 = roundMoney(flatWhiteUnit * flatWhiteQty);

    // 1 Avocado Toast @ $13.50
    const lineTotal2 = 13.5;

    const subtotal = roundMoney(lineTotal1 + lineTotal2);
    expect(subtotal).toBe(24.5);

    // 10% discount test
    const discountPercent = 10;
    const discountAmount = roundMoney((subtotal * discountPercent) / 100);
    expect(discountAmount).toBe(2.45);

    const discountedSubtotal = roundMoney(subtotal - discountAmount);
    expect(discountedSubtotal).toBe(22.05);

    // 8.25% tax test
    const taxRate = 0.0825;
    const taxAmount = roundMoney(discountedSubtotal * taxRate);
    expect(taxAmount).toBe(1.82);

    const totalPayable = roundMoney(discountedSubtotal + taxAmount);
    expect(totalPayable).toBe(23.87);
  });

  it('calculates change due correctly for cash tender', () => {
    const totalPayable = 23.87;
    const tenderedFifty = 50.0;
    const change = roundMoney(tenderedFifty - totalPayable);
    expect(change).toBe(26.13);
  });
});
