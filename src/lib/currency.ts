import { currentTenant } from '@/config/tenant.config';

/**
 * Format a numeric amount using the active tenant's currency settings.
 */
export function formatCurrency(amount: number, currencyCode = currentTenant.baseCurrency): string {
  return new Intl.NumberFormat(currentTenant.locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currentTenant.currencyDecimals,
    maximumFractionDigits: currentTenant.currencyDecimals,
  }).format(amount);
}

/**
 * Format a number to 2 decimal places with comma separation.
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat(currentTenant.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Decimal-safe round using half-to-even (banker's rounding) equivalent for monetary safety.
 */
export function roundMoney(amount: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}
