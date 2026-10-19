import { describe, it, expect } from 'vitest';
import { formatCurrency, formatNumber, roundMoney } from '@/lib/currency';

describe('Currency and Financial Utility', () => {
  it('formats currency with symbol and 2 decimal places', () => {
    const formatted = formatCurrency(24.5);
    expect(formatted).toBe('$24.50');
  });

  it('handles zero and decimal amounts correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(1250.75)).toBe('$1,250.75');
    expect(formatNumber(1250.75)).toBe('1,250.75');
  });

  it('performs decimal-safe rounding without floating point drift', () => {
    // Standard JS 0.1 + 0.2 is 0.30000000000000004
    const sum = 0.1 + 0.2;
    expect(roundMoney(sum)).toBe(0.3);

    // Multi-item sales tax rounding test: 19.99 * 0.0825 = 1.649175 -> 1.65
    const tax = 19.99 * 0.0825;
    expect(roundMoney(tax)).toBe(1.65);
  });
});
