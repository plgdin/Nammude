import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { PaymentRecord } from '../types';

let mockPaymentsStore: PaymentRecord[] = [
  {
    id: 'aaaaaaaa-1111-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    order_id: '88888888-1111-0000-0000-000000000001',
    payment_method: 'card',
    amount: 18.4,
    tip_amount: 0.0,
    reference_number: 'TXN-9021-CARD',
    status: 'completed',
    idempotency_key: 'demo-seed-payment-101',
    settled_by: 'a2222222-2222-2222-2222-222222222222',
    created_at: new Date().toISOString(),
  },
];

export interface RecordPaymentPayload {
  organization_id: string;
  branch_id: string;
  order_id: string;
  payment_method: PaymentRecord['payment_method'];
  amount: number;
  tip_amount?: number;
  reference_number?: string;
  idempotency_key: string;
  settled_by?: string;
}

export const paymentService = {
  /**
   * Record a payment with idempotency guarantee
   */
  async recordPayment(payload: RecordPaymentPayload): Promise<{ success: boolean; payment_id: string; error?: string }> {
    // 1. Idempotency Check
    const existing = mockPaymentsStore.find(
      (p) => p.organization_id === payload.organization_id && p.idempotency_key === payload.idempotency_key
    );
    if (existing) {
      return { success: true, payment_id: existing.id };
    }

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.from('payments') as any)
          .insert({
            organization_id: payload.organization_id,
            branch_id: payload.branch_id,
            order_id: payload.order_id,
            payment_method: payload.payment_method,
            amount: payload.amount,
            tip_amount: payload.tip_amount || 0.0,
            reference_number: payload.reference_number || null,
            status: 'completed',
            idempotency_key: payload.idempotency_key,
            settled_by: payload.settled_by || null,
          })
          .select('id')
          .single();

        if (error) {
          console.warn('[paymentService] Live payment record failed:', error.message);
          return { success: false, payment_id: '', error: error.message };
        }

        // Also update order status to completed and paid_amount
        await (supabase.from('orders') as any)
          .update({
            status: 'completed',
            paid_amount: payload.amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.order_id);

        return { success: true, payment_id: data?.id || '' };
      } catch (err: any) {
        return { success: false, payment_id: '', error: err.message };
      }
    }

    // Mock record
    const paymentId = `pay-${Date.now()}`;
    const newPayment: PaymentRecord = {
      id: paymentId,
      organization_id: payload.organization_id,
      branch_id: payload.branch_id,
      order_id: payload.order_id,
      payment_method: payload.payment_method,
      amount: payload.amount,
      tip_amount: payload.tip_amount || 0.0,
      reference_number: payload.reference_number || `SIM-${Date.now().toString().slice(-4)}`,
      status: 'completed',
      idempotency_key: payload.idempotency_key,
      settled_by: payload.settled_by || null,
      created_at: new Date().toISOString(),
    };

    mockPaymentsStore.push(newPayment);
    return { success: true, payment_id: paymentId };
  },

  /**
   * Fetch payments for an order
   */
  async getOrderPayments(orderId: string): Promise<PaymentRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      const { data } = await supabase.from('payments').select('*').eq('order_id', orderId);
      if (data) return data as PaymentRecord[];
    }
    return mockPaymentsStore.filter((p) => p.order_id === orderId);
  },

  /**
   * Reset mock store
   */
  _resetMockStore() {
    mockPaymentsStore = [];
  },
};
