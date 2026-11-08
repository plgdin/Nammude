import { describe, it, expect, beforeEach } from 'vitest';
import { orderService } from '@/features/pos/services/orderService';
import { paymentService } from '@/features/pos/services/paymentService';

const orgId = '11111111-1111-1111-1111-111111111111';
const branchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('POS Gaps: split payments accumulate toward completion', () => {
  beforeEach(() => {
    orderService._resetMockStore();
    paymentService._resetMockStore();
  });

  async function createOrder(key: string) {
    const result = await orderService.createOrder({
      organization_id: orgId,
      branch_id: branchId,
      order_type: 'takeaway',
      idempotency_key: key,
      items: [{ menu_item_id: 'menu-item-1', quantity: 4 }],
    });
    expect(result.success).toBe(true);
    return result;
  }

  it('accumulates partial payments and completes the order only when fully paid', async () => {
    const created = await createOrder('split-1');
    const total = created.total_amount;
    expect(total).toBeGreaterThan(0);

    const part1 = await paymentService.recordPayment({
      organization_id: orgId,
      branch_id: branchId,
      order_id: created.order_id,
      payment_method: 'card',
      amount: Math.round(total / 2),
      idempotency_key: 'split-pay-1',
    });
    expect(part1.success).toBe(true);

    let order = await orderService.getOrderById(created.order_id);
    expect(order?.paid_amount).toBe(Math.round(total / 2));
    expect(order?.status).not.toBe('completed');

    const part2 = await paymentService.recordPayment({
      organization_id: orgId,
      branch_id: branchId,
      order_id: created.order_id,
      payment_method: 'cash',
      amount: Math.round(total - Math.round(total / 2)),
      idempotency_key: 'split-pay-2',
    });
    expect(part2.success).toBe(true);

    order = await orderService.getOrderById(created.order_id);
    expect(order?.status).toBe('completed');
    expect(order?.paid_amount).toBeGreaterThanOrEqual(total - 1);

    const payments = await paymentService.getOrderPayments(created.order_id);
    expect(payments).toHaveLength(2);
  });

  it('supports delivery order type', async () => {
    const result = await orderService.createOrder({
      organization_id: orgId,
      branch_id: branchId,
      order_type: 'delivery',
      notes: 'Delivery: 12 Harbor Road',
      idempotency_key: 'delivery-1',
      items: [{ menu_item_id: 'menu-item-1', quantity: 1 }],
    });
    expect(result.success).toBe(true);

    const order = await orderService.getOrderById(result.order_id);
    expect(order?.order_type).toBe('delivery');
    expect(order?.notes).toContain('Harbor Road');
  });
});
