import { describe, it, expect, beforeEach } from 'vitest';
import { orderService } from '@/features/pos/services/orderService';
import { roundMoney } from '@/lib/currency';

describe('Phase 4: Orders & Cart Calculations', () => {
  const orgId = '11111111-1111-1111-1111-111111111111';
  const branchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  beforeEach(() => {
    orderService._resetMockStore();
  });

  it('creates an order with authoritative calculation and dispatches KOT', async () => {
    const result = await orderService.createOrder({
      organization_id: orgId,
      branch_id: branchId,
      order_type: 'dine_in',
      table_id: '77777777-1111-0000-0000-000000000001',
      guest_count: 2,
      discount_percent: 10,
      idempotency_key: 'test-order-key-1',
      items: [
        {
          menu_item_id: '44444444-1111-0000-0000-000000000001',
          quantity: 2,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.order_number).toMatch(/^#[0-9]+/);
    expect(result.total_amount).toBeGreaterThan(0);
    expect(result.kot_number).toMatch(/^KOT-[0-9]+/);
    expect(result.is_idempotent_replay).toBe(false);
  });

  it('prevents duplicate orders using idempotency key replay', async () => {
    const payload = {
      organization_id: orgId,
      branch_id: branchId,
      order_type: 'takeaway' as const,
      idempotency_key: 'idempotent-unique-token-abc',
      items: [
        {
          menu_item_id: '44444444-1111-0000-0000-000000000001',
          quantity: 1,
        },
      ],
    };

    const first = await orderService.createOrder(payload);
    expect(first.success).toBe(true);
    expect(first.is_idempotent_replay).toBe(false);

    // Replay with identical idempotency token
    const second = await orderService.createOrder(payload);
    expect(second.success).toBe(true);
    expect(second.order_id).toBe(first.order_id);
    expect(second.is_idempotent_replay).toBe(true);
  });

  it('tracks order status transitions', async () => {
    const created = await orderService.createOrder({
      organization_id: orgId,
      branch_id: branchId,
      order_type: 'takeaway',
      idempotency_key: 'order-status-test-key',
      items: [{ menu_item_id: 'item-1', quantity: 1 }],
    });

    expect(created.success).toBe(true);

    // Update to in_prep
    const okPrep = await orderService.updateOrderStatus(created.order_id, 'in_prep');
    expect(okPrep).toBe(true);

    const orders = await orderService.getBranchOrders(branchId);
    const updated = orders.find((o) => o.id === created.order_id);
    expect(updated?.status).toBe('in_prep');
  });

  it('validates financial math rounding and discounts', () => {
    const subtotal = 25.50;
    const discountPct = 10;
    const discountAmt = roundMoney(subtotal * (discountPct / 100));
    expect(discountAmt).toBe(2.55);

    const taxable = subtotal - discountAmt;
    const taxRate = 0.0825;
    const taxAmt = roundMoney(taxable * taxRate);
    expect(taxAmt).toBe(1.89);

    const total = roundMoney(taxable + taxAmt);
    expect(total).toBe(24.84);
  });
});
