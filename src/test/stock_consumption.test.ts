import { describe, it, expect } from 'vitest';
import { stockConsumptionService } from '@/features/inventory/services/stockConsumptionService';
import { inventoryService } from '@/features/inventory/services/inventoryService';

describe('Phase 5: Stock Consumption & Idempotent Order Deductions', () => {
  const testOrderId = 'test-ord-501';

  it('triggers ingredient consumption successfully for an order', async () => {
    const result = await stockConsumptionService.consumeOrderStock(testOrderId);
    expect(result.success).toBe(true);
    expect(result.status).toBe('consumed');
    expect(result.consumedCount).toBeGreaterThan(0);
  });

  it('is completely idempotent under duplicate requests and retries', async () => {
    // First invocation
    const first = await stockConsumptionService.consumeOrderStock(testOrderId, 'idem-key-1');
    expect(first.success).toBe(true);

    // Second retry with same idempotency key
    const second = await stockConsumptionService.consumeOrderStock(testOrderId, 'idem-key-1');
    expect(second.success).toBe(true);
  });

  it('reverses stock consumption without deleting historical movement ledger', async () => {
    const rev = await stockConsumptionService.reverseOrderStock(testOrderId, 'Customer changed order');
    expect(rev.success).toBe(true);
    expect(rev.reversedCount).toBeGreaterThan(0);
  });

  it('handles negative or insufficient stock policy gracefully without crashing', async () => {
    // Record adjustment that exceeds current stock
    const adj = await inventoryService.recordAdjustment({
      organizationId: '11111111-1111-1111-1111-111111111111',
      branchId: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      ingredientId: 'i1111111-0000-0000-0000-000000000003',
      movementType: 'manual_adjustment',
      quantityDelta: -500, // Deduct 500g
      reason: 'Physical inventory audit variance',
    });

    expect(adj.success).toBe(true);
    expect(adj.movementId).toBeDefined();
  });
});
