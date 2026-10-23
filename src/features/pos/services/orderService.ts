import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { roundMoney } from '@/lib/currency';
import { CreateOrderPayload, OrderCreationResult, OrderRecord } from '../types';
import { stockConsumptionService } from '@/features/inventory/services/stockConsumptionService';

// In-memory mock store for developer evaluation and tests
let mockOrdersStore: OrderRecord[] = [
  {
    id: '88888888-1111-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    table_id: '77777777-1111-0000-0000-000000000004',
    order_number: '#101',
    order_type: 'dine_in',
    status: 'in_prep',
    guest_count: 2,
    subtotal_amount: 17.0,
    discount_amount: 0.0,
    discount_percent: 0.0,
    discount_reason: null,
    tax_amount: 1.4025,
    service_charge_amount: 0.0,
    total_amount: 18.4,
    paid_amount: 18.4,
    cashier_user_id: 'a2222222-2222-2222-2222-222222222222',
    notes: 'Table 04 - Window seat',
    idempotency_key: 'demo-seed-order-101',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let nextDailyOrderSeq = 102;

export const orderService = {
  /**
   * Create an order transactionally with authoritative price validation and idempotency
   */
  async createOrder(payload: CreateOrderPayload): Promise<OrderCreationResult> {
    // 1. Idempotency Check in mock store
    const existing = mockOrdersStore.find(
      (o) => o.organization_id === payload.organization_id && o.idempotency_key === payload.idempotency_key
    );
    if (existing) {
      return {
        success: true,
        order_id: existing.id,
        order_number: existing.order_number,
        total_amount: existing.total_amount,
        is_idempotent_replay: true,
      };
    }

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.rpc as any)('create_order_transactional', {
          p_organization_id: payload.organization_id,
          p_branch_id: payload.branch_id,
          p_order_type: payload.order_type,
          p_table_id: payload.table_id || null,
          p_guest_count: payload.guest_count || 1,
          p_discount_percent: payload.discount_percent || 0.0,
          p_discount_reason: payload.discount_reason || null,
          p_notes: payload.notes || null,
          p_idempotency_key: payload.idempotency_key,
          p_items: payload.items,
        });

        if (error) {
          console.warn('[orderService] Supabase RPC failed:', error.message);
          return {
            success: false,
            order_id: '',
            order_number: '',
            total_amount: 0,
            is_idempotent_replay: false,
            error: error.message,
          };
        }

        const res = data as any;
        return {
          success: res.success,
          order_id: res.order_id,
          order_number: res.order_number,
          total_amount: Number(res.total_amount),
          kot_id: res.kot_id,
          kot_number: res.kot_number,
          is_idempotent_replay: Boolean(res.is_idempotent_replay),
        };
      } catch (err: any) {
        return {
          success: false,
          order_id: '',
          order_number: '',
          total_amount: 0,
          is_idempotent_replay: false,
          error: err.message || 'Transaction execution failed',
        };
      }
    }

    // Mock Execution Fallback
    const orderNumber = `#${nextDailyOrderSeq++}`;
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const kotNumber = `KOT-${orderNumber.substring(1)}`;

    // Calculate subtotal from items
    let subtotal = 0;
    for (const item of payload.items) {
      // In mock, unit prices are estimated if not looked up
      const modifierSum = (item.selected_modifiers || []).reduce((acc, m) => acc + m.additional_price, 0);
      const estPrice = 5.0 + modifierSum;
      subtotal += estPrice * item.quantity;
    }

    const discountAmt = payload.discount_percent
      ? roundMoney(subtotal * (payload.discount_percent / 100))
      : 0;
    const taxAmt = roundMoney((subtotal - discountAmt) * 0.0825);
    const totalAmt = roundMoney(subtotal - discountAmt + taxAmt);

    const newOrder: OrderRecord = {
      id: orderId,
      organization_id: payload.organization_id,
      branch_id: payload.branch_id,
      table_id: payload.table_id || null,
      order_number: orderNumber,
      order_type: payload.order_type,
      status: 'confirmed',
      guest_count: payload.guest_count || 1,
      subtotal_amount: subtotal,
      discount_amount: discountAmt,
      discount_percent: payload.discount_percent || 0.0,
      discount_reason: payload.discount_reason || null,
      tax_amount: taxAmt,
      service_charge_amount: 0,
      total_amount: totalAmt,
      paid_amount: 0,
      cashier_user_id: null,
      notes: payload.notes || null,
      idempotency_key: payload.idempotency_key,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockOrdersStore.unshift(newOrder);

    // Trigger ingredient stock consumption
    stockConsumptionService.consumeOrderStock(orderId, payload.idempotency_key).catch((err) => {
      console.warn('[orderService] Stock consumption trigger warning:', err);
    });

    return {
      success: true,
      order_id: orderId,
      order_number: orderNumber,
      total_amount: totalAmt,
      kot_id: `kot-${orderId}`,
      kot_number: kotNumber,
      is_idempotent_replay: false,
    };
  },

  /**
   * Fetch active orders for a branch
   */
  async getBranchOrders(branchId: string): Promise<OrderRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('branch_id', branchId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as OrderRecord[];
        }
      } catch (err) {
        console.warn('[orderService] Failed to load live orders, using mock fallback:', err);
      }
    }

    return mockOrdersStore.filter((o) => o.branch_id === branchId || branchId.startsWith('1111'));
  },

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: OrderRecord['status']): Promise<boolean> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      const { error } = await (supabase.from('orders') as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      return !error;
    }

    const order = mockOrdersStore.find((o) => o.id === orderId);
    if (order) {
      order.status = status;
      order.updated_at = new Date().toISOString();
      return true;
    }
    return false;
  },

  /**
   * Reset mock store (useful for tests)
   */
  _resetMockStore() {
    mockOrdersStore = [];
    nextDailyOrderSeq = 101;
  },
};
