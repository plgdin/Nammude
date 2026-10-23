/**
 * Pure, dimensionally-safe unit conversion and quantity precision engine.
 * Supports mass (g, kg), volume (ml, L), and discrete counts (pcs, units, bottles, cans, packs).
 * Prevents invalid cross-dimensional conversions unless density is explicitly provided.
 */

export type MeasurementDimension = 'mass' | 'volume' | 'count';

export interface UnitDefinition {
  symbol: string;
  name: string;
  dimension: MeasurementDimension;
  toBaseFactor: number; // Factor to convert to base unit (g for mass, ml for volume, pcs for count)
}

export const SUPPORTED_UNITS: Record<string, UnitDefinition> = {
  // Mass (Base: g)
  g: { symbol: 'g', name: 'Grams', dimension: 'mass', toBaseFactor: 1 },
  kg: { symbol: 'kg', name: 'Kilograms', dimension: 'mass', toBaseFactor: 1000 },
  mg: { symbol: 'mg', name: 'Milligrams', dimension: 'mass', toBaseFactor: 0.001 },

  // Volume (Base: ml)
  ml: { symbol: 'ml', name: 'Milliliters', dimension: 'volume', toBaseFactor: 1 },
  l: { symbol: 'l', name: 'Liters', dimension: 'volume', toBaseFactor: 1000 },
  L: { symbol: 'L', name: 'Liters', dimension: 'volume', toBaseFactor: 1000 },

  // Count (Base: pcs)
  pcs: { symbol: 'pcs', name: 'Pieces', dimension: 'count', toBaseFactor: 1 },
  units: { symbol: 'units', name: 'Units', dimension: 'count', toBaseFactor: 1 },
  portions: { symbol: 'portions', name: 'Portions', dimension: 'count', toBaseFactor: 1 },
  bottles: { symbol: 'bottles', name: 'Bottles', dimension: 'count', toBaseFactor: 1 },
  cans: { symbol: 'cans', name: 'Cans', dimension: 'count', toBaseFactor: 1 },
  packs: { symbol: 'packs', name: 'Packs', dimension: 'count', toBaseFactor: 1 },
  boxes: { symbol: 'boxes', name: 'Boxes', dimension: 'count', toBaseFactor: 1 },
};

export class DimensionMismatchError extends Error {
  constructor(fromUnit: string, toUnit: string, message?: string) {
    super(
      message ||
        `Dimension mismatch: Cannot convert '${fromUnit}' to '${toUnit}' without an explicit ingredient conversion factor or density.`
    );
    this.name = 'DimensionMismatchError';
  }
}

/**
 * Standard 4-decimal precision rounding for stock calculations to avoid floating point drift.
 */
export function roundQuantity(value: number, decimals: number = 4): number {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Normalizes unit string to standard lowercase format.
 */
export function normalizeUnit(unit: string): string {
  const trimmed = unit.trim();
  if (trimmed === 'L') return 'L';
  return trimmed.toLowerCase();
}

/**
 * Converts a quantity from one unit to another with dimensional safety.
 *
 * @param quantity The numeric quantity to convert
 * @param fromUnit Source unit (e.g. 'kg', 'g', 'ml', 'L', 'pcs')
 * @param toUnit Destination unit (e.g. 'g', 'kg', 'L', 'ml')
 * @param densityGPerMl Optional density in g/ml for volume <-> mass conversions (e.g. Whole milk ~1.03 g/ml, Oil ~0.92 g/ml)
 * @returns Converted quantity rounded to 4 decimals
 */
export function convertUnit(
  quantity: number,
  fromUnit: string,
  toUnit: string,
  densityGPerMl?: number
): number {
  if (quantity < 0) {
    throw new Error(`Invalid quantity: ${quantity}. Quantities must be non-negative for conversion.`);
  }

  const normFrom = normalizeUnit(fromUnit);
  const normTo = normalizeUnit(toUnit);

  if (normFrom === normTo) {
    return roundQuantity(quantity);
  }

  const defFrom = SUPPORTED_UNITS[normFrom] || SUPPORTED_UNITS[normFrom.toLowerCase()];
  const defTo = SUPPORTED_UNITS[normTo] || SUPPORTED_UNITS[normTo.toLowerCase()];

  if (!defFrom) {
    throw new Error(`Unsupported source unit: '${fromUnit}'`);
  }
  if (!defTo) {
    throw new Error(`Unsupported destination unit: '${toUnit}'`);
  }

  // 1. Same dimensional family (e.g. mass -> mass, volume -> volume, count -> count)
  if (defFrom.dimension === defTo.dimension) {
    const baseValue = quantity * defFrom.toBaseFactor;
    const targetValue = baseValue / defTo.toBaseFactor;
    return roundQuantity(targetValue);
  }

  // 2. Cross-family conversion between Volume (ml) and Mass (g)
  if (
    (defFrom.dimension === 'volume' && defTo.dimension === 'mass') ||
    (defFrom.dimension === 'mass' && defTo.dimension === 'volume')
  ) {
    if (!densityGPerMl || densityGPerMl <= 0) {
      throw new DimensionMismatchError(
        fromUnit,
        toUnit,
        `Cannot convert volume '${fromUnit}' and mass '${toUnit}' without ingredient density (g/ml).`
      );
    }

    if (defFrom.dimension === 'volume' && defTo.dimension === 'mass') {
      // volume in ml -> mass in g = ml * density
      const ml = quantity * defFrom.toBaseFactor;
      const g = ml * densityGPerMl;
      const target = g / defTo.toBaseFactor;
      return roundQuantity(target);
    } else {
      // mass in g -> volume in ml = g / density
      const g = quantity * defFrom.toBaseFactor;
      const ml = g / densityGPerMl;
      const target = ml / defTo.toBaseFactor;
      return roundQuantity(target);
    }
  }

  // 3. Count vs Mass/Volume is invalid without an item-specific packaging factor
  throw new DimensionMismatchError(
    fromUnit,
    toUnit,
    `Cannot convert between count ('${fromUnit}') and measurement ('${toUnit}') without an item-specific packaging factor.`
  );
}

/**
 * Calculates recipe ingredient required quantity accounting for wastage percentage.
 * Formula: net_quantity * (1 + wastage_percent / 100)
 */
export function calculateRequiredIngredientQuantity(
  recipeQtyPerServing: number,
  orderServings: number,
  wastagePercent: number = 0
): number {
  if (recipeQtyPerServing <= 0 || orderServings <= 0) return 0;
  const netQty = recipeQtyPerServing * orderServings;
  const grossQty = netQty * (1 + Math.max(0, wastagePercent) / 100);
  return roundQuantity(grossQty);
}
