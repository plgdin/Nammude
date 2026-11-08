import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { PaymentRecord, PaymentRefundRecord } from '../types';

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

let mockRefundsStore: PaymentRefundRecord[] = [];

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

        // Accumulate paid amount; complete the order only when fully paid.
        const { data: orderRow } = await supabase
          .from('orders')
          .select('paid_amount,total_amount,status')
          .eq('id', payload.order_id)
          .maybeSingle();
        if (orderRow) {
          const paidSoFar = Number((orderRow as any).paid_amount || 0);
          const newPaid = Number((paidSoFar + payload.amount).toFixed(2));
          const fullyPaid = newPaid >= Number((orderRow as any).total_amount) - 0.005;
          await (supabase.from('orders') as any)
            .update({
              status: fullyPaid ? 'completed' : (orderRow as any).status,
              paid_amount: newPaid,
              updated_at: new Date().toISOString(),
            })
            .eq('id', payload.order_id);
        }

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

    // Accumulate paid amount on the order; complete only when fully paid.
    const { orderService } = await import('./orderService');
    await orderService.recordPaidAmount(payload.order_id, payload.amount);

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
   * Fetch all payments recorded for a branch (order management / reporting).
   */
  async getBranchPayments(branchId: string): Promise<PaymentRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as PaymentRecord[];
    }
    return mockPaymentsStore.filter((p) => p.branch_id === branchId);
  },

  /**
   * Fetch refunds issued against a branch's payments.
   */
  async getRefundsForBranch(branchId: string): Promise<PaymentRefundRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      const { data: payments } = await supabase
        .from('payments')
        .select('id')
        .eq('branch_id', branchId);
      const paymentIds = (payments || []).map((p: { id: string }) => p.id);
      if (paymentIds.length === 0) return [];
      const { data, error } = await supabase
        .from('payment_refunds')
        .select('*')
        .in('payment_id', paymentIds)
        .order('created_at', { ascending: false });
      if (!error && data) return data as PaymentRefundRecord[];
    }
    const paymentIds = mockPaymentsStore
      .filter((p) => p.branch_id === branchId)
      .map((p) => p.id);
    return mockRefundsStore.filter((r) => paymentIds.includes(r.payment_id));
  },

  /**
   * Fetch payments for a financial report window (org-scoped, optional branch).
   */
  async getPaymentsForReport(params: {
    organizationId: string;
    branchId?: string | null;
    startDate: string;
    endDate: string;
  }): Promise<PaymentRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        let query = supabase
          .from('payments')
          .select('*')
          .eq('organization_id', params.organizationId)
          .gte('created_at', `${params.startDate}T00:00:00.000Z`)
          .lte('created_at', `${params.endDate}T23:59:59.999Z`)
          .order('created_at', { ascending: true });
        if (params.branchId) query = query.eq('branch_id', params.branchId);
        const { data, error } = await query;
        if (!error && data) return data as PaymentRecord[];
      } catch (err) {
        console.warn('[paymentService] Failed to load report payments:', err);
      }
      return [];
    }
    return mockPaymentsStore.filter((p) => {
      if (p.organization_id !== params.organizationId) return false;
      if (params.branchId && p.branch_id !== params.branchId) return false;
      const day = p.created_at.slice(0, 10);
      return day >= params.startDate && day <= params.endDate;
    });
  },

  /**
   * Fetch refunds issued in a financial report window (org-scoped).
   */
  async getRefundsForReport(params: {
    organizationId: string;
    startDate: string;
    endDate: string;
  }): Promise<PaymentRefundRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await supabase
          .from('payment_refunds')
          .select('*')
          .eq('organization_id', params.organizationId)
          .gte('created_at', `${params.startDate}T00:00:00.000Z`)
          .lte('created_at', `${params.endDate}T23:59:59.999Z`)
          .order('created_at', { ascending: true });
        if (!error && data) return data as PaymentRefundRecord[];
      } catch (err) {
        console.warn('[paymentService] Failed to load report refunds:', err);
      }
      return [];
    }
    return mockRefundsStore.filter((r) => {
      if (r.organization_id !== params.organizationId) return false;
      const day = r.created_at.slice(0, 10);
      return day >= params.startDate && day <= params.endDate;
    });
  },

  /**
   * Refund an order across its captured payments (oldest payment first).
   * Idempotent per (organization, payment, idempotency key).
   */
  async refundOrder(params: {
    organization_id: string;
    branch_id: string;
    order_id: string;
    amount: number;
    reason: string;
    approved_by: string;
    idempotency_key: string;
  }): Promise<{ success: boolean; refunded_amount: number; refund_ids: string[]; error?: string }> {
    const requested = Number(params.amount.toFixed(2));
    if (!Number.isFinite(requested) || requested <= 0) {
      return { success: false, refunded_amount: 0, refund_ids: [], error: 'Refund amount must be greater than zero.' };
    }
    if (!params.reason || params.reason.trim().length < 3) {
      return { success: false, refunded_amount: 0, refund_ids: [], error: 'A refund reason is required.' };
    }

    const live = env.isConfigured && !env.isMockAuthEnabled;

    let payments: PaymentRecord[];
    let existingRefunds: PaymentRefundRecord[];

    if (live) {
      const { data: payData, error: payErr } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', params.order_id)
        .eq('organization_id', params.organization_id)
        .order('created_at', { ascending: true });
      if (payErr) {
        return { success: false, refunded_amount: 0, refund_ids: [], error: payErr.message };
      }
      payments = (payData || []) as PaymentRecord[];

      const ids = payments.map((p) => p.id);
      if (ids.length > 0) {
        const { data: refData } = await supabase
          .from('payment_refunds')
          .select('*')
          .in('payment_id', ids);
        existingRefunds = (refData || []) as PaymentRefundRecord[];
      } else {
        existingRefunds = [];
      }
    } else {
      payments = mockPaymentsStore
        .filter((p) => p.order_id === params.order_id && p.organization_id === params.organization_id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      const ids = payments.map((p) => p.id);
      existingRefunds = mockRefundsStore.filter((r) => ids.includes(r.payment_id));
    }

    if (payments.length === 0) {
      return { success: false, refunded_amount: 0, refund_ids: [], error: 'No captured payments found for this order.' };
    }

    // Idempotent retry: the same key must return the previously recorded result.
    const replayPrefix = `${params.idempotency_key}-`;
    const replay = existingRefunds.filter((r) => r.idempotency_key.startsWith(replayPrefix));
    if (replay.length > 0) {
      const replayTotal = Number(
        replay.reduce((sum, r) => sum + Number(r.refund_amount), 0).toFixed(2)
      );
      if (Math.abs(replayTotal - requested) > 0.005) {
        return {
          success: false,
          refunded_amount: 0,
          refund_ids: [],
          error: 'This idempotency key was already used for a different refund amount.',
        };
      }
      return {
        success: true,
        refunded_amount: replayTotal,
        refund_ids: replay.map((r) => r.id),
      };
    }

    const refundedFor = (paymentId: string) =>
      Number(
        existingRefunds
          .filter((r) => r.payment_id === paymentId)
          .reduce((sum, r) => sum + Number(r.refund_amount), 0)
          .toFixed(2)
      );

    const totalAvailable = Number(
      payments
        .filter((p) => p.status !== 'failed')
        .reduce((sum, p) => sum + Math.max(0, Number(p.amount) - refundedFor(p.id)), 0)
        .toFixed(2)
    );

    if (requested > totalAvailable + 0.005) {
      return {
        success: false,
        refunded_amount: 0,
        refund_ids: [],
        error: `Refund exceeds captured balance. Maximum refundable is ${totalAvailable.toFixed(2)}.`,
      };
    }

    let remaining = requested;
    let refundedTotal = 0;
    const refundIds: string[] = [];
    const refundedByPayment = new Map<string, number>(
      payments.map((p) => [p.id, refundedFor(p.id)])
    );

    for (const payment of payments) {
      if (remaining <= 0) break;
      if (payment.status === 'failed') continue;

      const alreadyRefunded = refundedByPayment.get(payment.id) || 0;
      const available = Number((Number(payment.amount) - alreadyRefunded).toFixed(2));
      if (available <= 0) continue;

      const take = Number(Math.min(remaining, available).toFixed(2));
      const idempotencyKey = `${params.idempotency_key}-${payment.id}`;

      if (live) {
        const { data: inserted, error: insertErr } = await (supabase.from('payment_refunds') as any)
          .insert({
            organization_id: params.organization_id,
            payment_id: payment.id,
            refund_amount: take,
            reason: params.reason.trim(),
            approved_by: params.approved_by,
            idempotency_key: idempotencyKey,
          })
          .select('id')
          .single();

        if (insertErr) {
          // Unique violation means this leg was already recorded by a previous attempt.
          if (insertErr.code !== '23505') {
            return {
              success: false,
              refunded_amount: refundedTotal,
              refund_ids: refundIds,
              error: insertErr.message,
            };
          }
        } else if (inserted?.id) {
          refundIds.push(inserted.id);
        }

        const newRefundedTotal = Number((alreadyRefunded + take).toFixed(2));
        refundedByPayment.set(payment.id, newRefundedTotal);

        if (newRefundedTotal >= Number(payment.amount) - 0.005) {
          await (supabase.from('payments') as any)
            .update({ status: 'refunded' })
            .eq('id', payment.id);
        }
      } else {
        const exists = mockRefundsStore.find(
          (r) => r.payment_id === payment.id && r.idempotency_key === idempotencyKey
        );
        if (!exists) {
          const refundId = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          mockRefundsStore.unshift({
            id: refundId,
            organization_id: params.organization_id,
            payment_id: payment.id,
            refund_amount: take,
            reason: params.reason.trim(),
            approved_by: params.approved_by,
            idempotency_key: idempotencyKey,
            created_at: new Date().toISOString(),
          });
          refundIds.push(refundId);
        }

        const newRefundedTotal = Number((alreadyRefunded + take).toFixed(2));
        refundedByPayment.set(payment.id, newRefundedTotal);

        if (newRefundedTotal >= Number(payment.amount) - 0.005) {
          const stored = mockPaymentsStore.find((p) => p.id === payment.id);
          if (stored) stored.status = 'refunded';
        }
      }

      remaining = Number((remaining - take).toFixed(2));
      refundedTotal = Number((refundedTotal + take).toFixed(2));
    }

    return { success: true, refunded_amount: refundedTotal, refund_ids: refundIds };
  },

  /**
   * Reset mock store
   */
  _resetMockStore() {
    mockPaymentsStore = [];
    mockRefundsStore = [];
  },
};
