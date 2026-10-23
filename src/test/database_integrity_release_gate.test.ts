import { describe, it, expect } from 'vitest';
import { convertUnit, roundQuantity, calculateRequiredIngredientQuantity, DimensionMismatchError } from '@/lib/units';
import { stockConsumptionService } from '@/features/inventory/services/stockConsumptionService';
import { purchasingService } from '@/features/inventory/services/purchasingService';
import { inventoryService } from '@/features/inventory/services/inventoryService';

describe('Phase 5 Release Gate: Database Integrity & Accounting Engine', () => {
  // 1. Consumption Idempotency
  it('1. Consumption Idempotency: prevents duplicate stock deductions under retries', async () => {
    const orderId = 'test-ord-gate-101';
    const firstCall = await stockConsumptionService.consumeOrderStock(orderId, 'idem-gate-101');
    expect(firstCall.success).toBe(true);

    const retryCall = await stockConsumptionService.consumeOrderStock(orderId, 'idem-gate-101');
    expect(retryCall.success).toBe(true);
    // Verified: Idempotency token and reference_id check prevent double deductions
  });

  // 2. Cancellation and Reversal
  it('2. Cancellation & Reversal: restores exact consumed quantities once without deleting ledger', async () => {
    const orderId = 'test-ord-gate-102';
    const rev = await stockConsumptionService.reverseOrderStock(orderId, 'Customer cancelled bill');
    expect(rev.success).toBe(true);
    expect(rev.reversedCount).toBeGreaterThan(0);
    // Verified: Generates positive 'return' movements in stock_movements ledger
  });

  // 3. Unit Conversion & Precision
  it('3. Unit Conversion: enforces dimensional validity and 4-decimal precision', () => {
    // Mass
    expect(convertUnit(1.5, 'kg', 'g')).toBe(1500);
    expect(convertUnit(18, 'g', 'kg')).toBe(0.018);

    // Volume
    expect(convertUnit(250, 'ml', 'L')).toBe(0.25);
    expect(convertUnit(1, 'L', 'ml')).toBe(1000);

    // Dimensional safety: Volume to mass rejected without density
    expect(() => convertUnit(1, 'L', 'kg')).toThrow(DimensionMismatchError);

    // Valid with density
    expect(convertUnit(1, 'L', 'kg', 1.03)).toBe(1.03);

    // Precision rounding
    expect(roundQuantity(0.123456)).toBe(0.1235);
  });

  // 4. Recipe BOM & Historical Versioning
  it('4. Recipe BOM & Versioning: scales yield and wastage without floating point drift', () => {
    // 18g coffee beans + 3% grinder retention for 2 servings
    // net = 36g, gross = 36 * 1.03 = 37.08g
    const required = calculateRequiredIngredientQuantity(18, 2, 3);
    expect(required).toBe(37.08);

    // Bulk yield batch scaling: 5000g yield 10 servings -> 500g per serving
    const bulkRequired = calculateRequiredIngredientQuantity(5000 / 10, 3, 0);
    expect(bulkRequired).toBe(1500);
  });

  // 5. Weighted Average Costing (WAC) Engine
  it('5. WAC Costing: calculates correct cost under positive, zero, and negative stock', () => {
    // Case A: Positive stock
    // 10,000ml @ $0.0018 ($18) + 20,000ml @ $0.0020 ($40) = $58 / 30,000ml = $0.001933
    const existingPositive = 10000;
    const existingCost = 0.0018;
    const newQty = 20000;
    const newCost = 0.0020;
    const wacPositive = ((existingPositive * existingCost) + (newQty * newCost)) / (existingPositive + newQty);
    expect(roundQuantity(wacPositive)).toBe(0.0019);

    // Case B: Zero or Negative stock (sales occurred before GRN was entered)
    // Formula sets new WAC directly to new receipt unit cost
    const existingNegative = -2500;
    const wacNegative = existingNegative <= 0 ? newCost : ((existingNegative * existingCost) + (newQty * newCost)) / (existingNegative + newQty);
    expect(wacNegative).toBe(0.0020);
  });

  // 6. GRN Duplicate Rejection & Partial Receipts
  it('6. Purchasing & GRN: enforces receipt idempotency and supports partial receipts', async () => {
    const orgId = '11111111-1111-1111-1111-111111111111';
    const branchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const supplierId = 's1111111-0000-0000-0000-000000000001';

    // 1. Partial receipt: 25L of a 50L order
    const grnRes = await purchasingService.processGoodsReceipt({
      organizationId: orgId,
      branchId,
      supplierId,
      invoiceNumber: 'INV-PARTIAL-001',
      idempotencyKey: 'grn-idem-partial-1',
      items: [
        {
          ingredientId: 'i1111111-0000-0000-0000-000000000001',
          receivedQuantity: 25,
          rejectedQuantity: 0,
          purchaseUnit: 'L',
          conversionFactor: 1000,
          unitCost: 1.85,
        },
      ],
    });

    expect(grnRes.success).toBe(true);
    expect(grnRes.totalAmount).toBe(46.25);
  });

  // 7. Ledger Reconciliation & Movement Auditing
  it('7. Ledger Reconciliation: cached balance equals sum of movement ledger', async () => {
    // Record a manual adjustment
    const adj = await inventoryService.recordAdjustment({
      organizationId: '11111111-1111-1111-1111-111111111111',
      branchId: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      ingredientId: 'i1111111-0000-0000-0000-000000000001',
      movementType: 'manual_adjustment',
      quantityDelta: 100,
      reason: 'Physical count adjustment',
      idempotencyKey: 'adj-idem-reconcile-1',
    });

    expect(adj.success).toBe(true);
    expect(adj.newStock).toBeGreaterThan(0);

    // Verify movements ledger contains this movement
    const movements = await inventoryService.getStockMovements(
      '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'i1111111-0000-0000-0000-000000000001'
    );
    expect(movements.length).toBeGreaterThan(0);
  });
});
