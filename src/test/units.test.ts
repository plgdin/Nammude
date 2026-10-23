import { describe, it, expect } from 'vitest';
import {
  convertUnit,
  roundQuantity,
  calculateRequiredIngredientQuantity,
  DimensionMismatchError,
} from '@/lib/units';

describe('Unit Conversion and Quantity Precision Engine', () => {
  it('converts within mass family (kg to g, g to kg)', () => {
    expect(convertUnit(1, 'kg', 'g')).toBe(1000);
    expect(convertUnit(500, 'g', 'kg')).toBe(0.5);
    expect(convertUnit(18.5, 'g', 'g')).toBe(18.5);
    expect(convertUnit(0.018, 'kg', 'g')).toBe(18);
  });

  it('converts within volume family (L to ml, ml to L)', () => {
    expect(convertUnit(1, 'L', 'ml')).toBe(1000);
    expect(convertUnit(250, 'ml', 'L')).toBe(0.25);
    expect(convertUnit(0.06, 'L', 'ml')).toBe(60);
  });

  it('converts within count family (pcs to units)', () => {
    expect(convertUnit(5, 'pcs', 'units')).toBe(5);
    expect(convertUnit(12, 'portions', 'pcs')).toBe(12);
  });

  it('rejects cross-dimensional conversion without density (L to kg)', () => {
    expect(() => convertUnit(1, 'L', 'kg')).toThrow(DimensionMismatchError);
    expect(() => convertUnit(500, 'g', 'ml')).toThrow(DimensionMismatchError);
    expect(() => convertUnit(2, 'pcs', 'kg')).toThrow(DimensionMismatchError);
  });

  it('allows cross-dimensional conversion when density is provided', () => {
    // Whole Milk: ~1.03 g/ml (1 L = 1000 ml * 1.03 = 1030 g = 1.03 kg)
    const milkKg = convertUnit(1, 'L', 'kg', 1.03);
    expect(milkKg).toBe(1.03);

    // 500g milk to ml = 500 / 1.03 = 485.4369 ml
    const milkMl = convertUnit(500, 'g', 'ml', 1.03);
    expect(milkMl).toBe(485.4369);
  });

  it('handles fractional coffee espresso serving (18g coffee beans)', () => {
    // 1 double shot espresso = 18g beans = 0.018kg
    const kg = convertUnit(18, 'g', 'kg');
    expect(kg).toBe(0.018);

    // 100 double shots = 1.8kg
    const totalBeansKg = kg * 100;
    expect(roundQuantity(totalBeansKg)).toBe(1.8);
  });

  it('calculates recipe requirements with wastage factor', () => {
    // 200g avocado per serving, 2 servings, 15% peel/seed wastage
    // net = 400g, gross = 400 * 1.15 = 460g
    const required = calculateRequiredIngredientQuantity(200, 2, 15);
    expect(required).toBe(460);

    // Zero wastage: 18g * 1 serving = 18g
    expect(calculateRequiredIngredientQuantity(18, 1, 0)).toBe(18);
  });

  it('rejects negative quantities', () => {
    expect(() => convertUnit(-5, 'g', 'kg')).toThrow(/Invalid quantity/);
  });
});
