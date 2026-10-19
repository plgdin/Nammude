import { describe, it, expect, beforeEach } from 'vitest';
import { paymentService } from '@/features/pos/services/paymentService';

describe('Phase 4: Payment Records & Settlement Lifecycle', () => {
  const orgId = '11111111-1111-1111-1111-111111111111';
  const branchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const orderId = 'ord-pay-test-100';

  beforeEach(() => {
    paymentService._resetMockStore();
  });

  it('records payment settlement with idempotency guarantee', async () => {
    const payload = {
      organization_id: orgId,
      branch_id: branchId,
      order_id: orderId,
      payment_method: 'card' as const,
      amount: 24.50,
      idempotency_key: 'idem-pay-token-999',
    };

    const first = await paymentService.recordPayment(payload);
    expect(first.success).toBe(true);
    expect(first.payment_id).toBeDefined();

    // Repeated call with same idempotency key must not create duplicate payment
    const second = await paymentService.recordPayment(payload);
    expect(second.success).toBe(true);
    expect(second.payment_id).toBe(first.payment_id);

    const payments = await paymentService.getOrderPayments(orderId);
    expect(payments.length).toBe(1);
    expect(payments[0].amount).toBe(24.50);
    expect(payments[0].status).toBe('completed');
  });

  it('supports cash and digital tender types', async () => {
    const resCash = await paymentService.recordPayment({
      organization_id: orgId,
      branch_id: branchId,
      order_id: 'ord-cash-2',
      payment_method: 'cash',
      amount: 15.00,
      idempotency_key: 'idem-cash-key',
    });
    expect(resCash.success).toBe(true);

    const resUpi = await paymentService.recordPayment({
      organization_id: orgId,
      branch_id: branchId,
      order_id: 'ord-upi-3',
      payment_method: 'upi_qr',
      amount: 32.00,
      idempotency_key: 'idem-upi-key',
    });
    expect(resUpi.success).toBe(true);
  });
});
