import { describe, it, expect } from 'vitest';
import { roundMoney } from '@/lib/currency';

describe('Inventory Calculation & Status Logic', () => {
  it('correctly assesses status threshold based on reorder levels', () => {
    const calculateStatus = (current: number, reorder: number): 'ok' | 'low' | 'critical' => {
      if (current <= reorder * 0.5) return 'critical';
      if (current <= reorder) return 'low';
      return 'ok';
    };

    // Hass Avocados: reorder 20, current 8 (8 <= 10 -> critical)
    expect(calculateStatus(8, 20)).toBe('critical');

    // Whole Milk: reorder 25, current 14.5 (14.5 <= 25 -> low)
    expect(calculateStatus(14.5, 25)).toBe('low');

    // Oat Milk: reorder 20, current 32 (32 > 20 -> ok)
    expect(calculateStatus(32, 20)).toBe('ok');
  });

  it('calculates audit adjustment delta accurately', () => {
    const currentStock = 14.5;
    const physicalCount = 18.0;
    const delta = roundMoney(physicalCount - currentStock);
    expect(delta).toBe(3.5);
  });
});
