import { describe, it, expect, beforeEach } from 'vitest';
import { orderService } from '@/features/pos/services/orderService';
import { paymentService } from '@/features/pos/services/paymentService';

const orgId = '11111111-1111-1111-1111-111111111111';
const branchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

async function createTestOrder(key: string) {
  const result = await orderService.createOrder({
    organization_id: orgId,
    branch_id: branchId,
    order_type: 'dine_in',
    idempotency_key: key,
    items: [{ menu_item_id: 'menu-item-1', quantity: 2 }],
  });
  expect(result.success).toBe(true);
  return result;
}

async function payTestOrder(orderId: string, amount: number, key: string) {
  const result = await paymentService.recordPayment({
    organization_id: orgId,
    branch_id: branchId,
    order_id: orderId,
    payment_method: 'card',
    amount,
    idempotency_key: key,
  });
  expect(result.success).toBe(true);
  return result;
}

describe('Order Management: cancellation & refunds', () => {
  beforeEach(() => {
    orderService._resetMockStore();
    paymentService._resetMockStore();
  });

  it('cancels an uncompleted order and records the cancellation reason', async () => {
    const created = await createTestOrder('cancel-1');
    await orderService.updateOrderStatus(created.order_id, 'in_prep');

    const result = await orderService.cancelOrder(created.order_id, 'Customer left before preparation');
    expect(result.success).toBe(true);

    const order = await orderService.getOrderById(created.order_id);
    expect(order?.status).toBe('cancelled');
    expect(order?.notes).toContain('Customer left before preparation');
  });

  it('rejects cancellation of completed orders so corrections use the refund flow', async () => {
    const created = await createTestOrder('cancel-2');
    await orderService.updateOrderStatus(created.order_id, 'completed');

    const result = await orderService.cancelOrder(created.order_id, 'Late cancellation');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/refunded, not cancelled/i);

    const order = await orderService.getOrderById(created.order_id);
    expect(order?.status).toBe('completed');
  });

  it('requires a reason for cancellation', async () => {
    const created = await createTestOrder('cancel-3');
    const result = await orderService.cancelOrder(created.order_id, '');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/reason/i);
  });

  it('refunds part of a payment and reports the remaining refundable balance', async () => {
    const created = await createTestOrder('refund-1');
    await payTestOrder(created.order_id, 100, 'refund-pay-1');

    const partial = await paymentService.refundOrder({
      organization_id: orgId,
      branch_id: branchId,
      order_id: created.order_id,
      amount: 30,
      reason: 'Missing side item',
      approved_by: 'owner-1',
      idempotency_key: 'refund-key-1',
    });

    expect(partial.success).toBe(true);
    expect(partial.refunded_amount).toBe(30);

    const refunds = await paymentService.getRefundsForBranch(branchId);
    expect(refunds).toHaveLength(1);

    const payments = await paymentService.getOrderPayments(created.order_id);
    expect(payments[0].status).toBe('completed');
  });

  it('marks the payment refunded after a full refund and rejects over-refunds', async () => {
    const created = await createTestOrder('refund-2');
    await payTestOrder(created.order_id, 50, 'refund-pay-2');

    const full = await paymentService.refundOrder({
      organization_id: orgId,
      branch_id: branchId,
      order_id: created.order_id,
      amount: 50,
      reason: 'Order returned in full',
      approved_by: 'owner-1',
      idempotency_key: 'refund-key-2',
    });
    expect(full.success).toBe(true);
    expect(full.refunded_amount).toBe(50);

    const payments = await paymentService.getOrderPayments(created.order_id);
    expect(payments[0].status).toBe('refunded');

    const over = await paymentService.refundOrder({
      organization_id: orgId,
      branch_id: branchId,
      order_id: created.order_id,
      amount: 10,
      reason: 'Extra refund attempt',
      approved_by: 'owner-1',
      idempotency_key: 'refund-key-3',
    });
    expect(over.success).toBe(false);
    expect(over.error).toMatch(/maximum refundable/i);
  });

  it('returns the same result when a refund retry reuses the idempotency key', async () => {
    const created = await createTestOrder('refund-3');
    await payTestOrder(created.order_id, 80, 'refund-pay-3');

    const payload = {
      organization_id: orgId,
      branch_id: branchId,
      order_id: created.order_id,
      amount: 25,
      reason: 'Partial refund',
      approved_by: 'owner-1',
      idempotency_key: 'refund-retry-key',
    };

    const first = await paymentService.refundOrder(payload);
    const retry = await paymentService.refundOrder(payload);

    expect(first.success).toBe(true);
    expect(retry.success).toBe(true);
    expect(retry.refunded_amount).toBe(first.refunded_amount);
    expect(retry.refund_ids).toEqual(first.refund_ids);

    const refunds = await paymentService.getRefundsForBranch(branchId);
    expect(refunds).toHaveLength(1);
  });
});
