import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { roundMoney } from '@/lib/currency';
import { CreateOrderPayload, OrderCreationResult, OrderItemRecord, OrderRecord } from '../types';
import { stockConsumptionService } from '@/features/inventory/services/stockConsumptionService';
import { loyaltyService } from '@/features/loyalty/services/loyaltyService';

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
    customer_id: null,
    loyalty_points_earned: 0,
    loyalty_points_redeemed: 0,
    loyalty_discount_amount: 0,
    notes: 'Table 04 - Window seat',
    idempotency_key: 'demo-seed-order-101',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let nextDailyOrderSeq = 102;

let mockOrderItemsStore: OrderItemRecord[] = [
  {
    id: 'oi-00000000-0000-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    order_id: '88888888-1111-0000-0000-000000000001',
    menu_item_id: '44444444-1111-0000-0000-000000000001',
    item_name: 'Seed Menu Item',
    unit_price: 8.5,
    quantity: 2,
    discount_amount: 0,
    tax_amount: 1.4025,
    total_price: 18.4025,
    selected_modifiers: [],
    special_instructions: null,
    status: 'preparing',
    created_at: new Date().toISOString(),
  },
];

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
      customer_id: null,
      loyalty_points_earned: 0,
      loyalty_points_redeemed: 0,
      loyalty_discount_amount: 0,
      notes: payload.notes || null,
      idempotency_key: payload.idempotency_key,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockOrdersStore.unshift(newOrder);

    for (const item of payload.items) {
      const modifierSum = (item.selected_modifiers || []).reduce((acc, m) => acc + m.additional_price, 0);
      const unitPrice = 5.0 + modifierSum;
      mockOrderItemsStore.unshift({
        id: `oi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        organization_id: payload.organization_id,
        order_id: orderId,
        menu_item_id: item.menu_item_id,
        item_name: item.menu_item_id,
        unit_price: unitPrice,
        quantity: item.quantity,
        discount_amount: 0,
        tax_amount: 0,
        total_price: unitPrice * item.quantity,
        selected_modifiers: (item.selected_modifiers || []) as unknown as OrderItemRecord['selected_modifiers'],
        special_instructions: item.special_instructions || null,
        status: 'sent_to_kitchen',
        created_at: new Date().toISOString(),
      });
    }

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
   * Fetch orders for a financial report window (org-scoped, optional branch).
   * Live mode returns [] for an empty window; mock mode filters the local store.
   */
  async getOrdersForReport(params: {
    organizationId: string;
    branchId?: string | null;
    startDate: string;
    endDate: string;
  }): Promise<OrderRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        let query = supabase
          .from('orders')
          .select('*')
          .eq('organization_id', params.organizationId)
          .gte('created_at', `${params.startDate}T00:00:00.000Z`)
          .lte('created_at', `${params.endDate}T23:59:59.999Z`)
          .order('created_at', { ascending: true });
        if (params.branchId) query = query.eq('branch_id', params.branchId);
        const { data, error } = await query;
        if (!error && data) return data as OrderRecord[];
      } catch (err) {
        console.warn('[orderService] Failed to load report orders:', err);
      }
      return [];
    }
    return mockOrdersStore.filter((o) => {
      if (o.organization_id !== params.organizationId) return false;
      if (params.branchId && o.branch_id !== params.branchId) return false;
      const day = o.created_at.slice(0, 10);
      return day >= params.startDate && day <= params.endDate;
    });
  },

  /**
   * Fetch line items for a set of orders (best sellers, item counts).
   */
  async getOrderItemsForOrders(orderIds: string[]): Promise<OrderItemRecord[]> {
    if (orderIds.length === 0) return [];
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds)
          .order('created_at', { ascending: true });
        if (!error && data) return data as OrderItemRecord[];
      } catch (err) {
        console.warn('[orderService] Failed to load order items:', err);
      }
      return [];
    }
    return mockOrderItemsStore.filter((i) => orderIds.includes(i.order_id));
  },

  /**
   * Accumulate a payment toward an order (split/partial payments).
   * Marks the order completed only when fully paid.
   */
  async recordPaidAmount(
    orderId: string,
    amount: number,
    totalAmount?: number
  ): Promise<{ success: boolean; paid_amount: number; fully_paid: boolean }> {
    const live = env.isConfigured && !env.isMockAuthEnabled;
    let order: OrderRecord | null = null;

    if (live) {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();
      order = (data as OrderRecord | null) || null;
    } else {
      order = mockOrdersStore.find((o) => o.id === orderId) || null;
    }

    if (!order) return { success: false, paid_amount: 0, fully_paid: false };

    const total = totalAmount ?? Number(order.total_amount);
    const newPaid = Number((Number(order.paid_amount) + amount).toFixed(2));
    const fullyPaid = newPaid >= total - 0.005;

    if (live) {
      const { error } = await (supabase.from('orders') as any)
        .update({
          paid_amount: newPaid,
          status: fullyPaid ? 'completed' : order.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
      return { success: !error, paid_amount: newPaid, fully_paid: fullyPaid };
    }

    order.paid_amount = newPaid;
    if (fullyPaid) order.status = 'completed';
    order.updated_at = new Date().toISOString();
    return { success: true, paid_amount: newPaid, fully_paid: fullyPaid };
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
   * Fetch a single order by id.
   */
  async getOrderById(orderId: string): Promise<OrderRecord | null> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();
      if (!error && data) return data as OrderRecord;
    }
    return mockOrdersStore.find((o) => o.id === orderId) || null;
  },

  /**
   * Cancel an order that has not been completed.
   * Reverses stock consumption and loyalty accrual; never deletes history.
   * Completed orders must go through the refund workflow instead.
   */
  async cancelOrder(
    orderId: string,
    reason: string,
    options?: { idempotencyKey?: string }
  ): Promise<{ success: boolean; error?: string }> {
    if (!reason || reason.trim().length < 3) {
      return { success: false, error: 'A cancellation reason is required.' };
    }

    const live = env.isConfigured && !env.isMockAuthEnabled;
    let order: OrderRecord | null = null;

    if (live) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();
      if (error) return { success: false, error: error.message };
      order = (data as OrderRecord | null) || null;
    } else {
      order = mockOrdersStore.find((o) => o.id === orderId) || null;
    }

    if (!order) return { success: false, error: 'Order not found.' };
    if (order.status === 'cancelled') return { success: true };
    if (order.status === 'completed') {
      return { success: false, error: 'Completed orders must be refunded, not cancelled.' };
    }

    const cancellationNote = [
      order.notes,
      `Cancelled: ${reason.trim()}`,
    ]
      .filter(Boolean)
      .join(' | ');

    if (live) {
      const { error } = await (supabase.from('orders') as any)
        .update({
          status: 'cancelled',
          notes: cancellationNote,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);
      if (error) return { success: false, error: error.message };
    } else {
      order.status = 'cancelled';
      order.notes = cancellationNote;
      order.updated_at = new Date().toISOString();
    }

    // Restore consumed ingredients exactly once (ledger-based, idempotent).
    await stockConsumptionService.reverseOrderStock(orderId, `Order cancelled: ${reason.trim()}`);

    // Reverse loyalty points accrued on the cancelled order, if any.
    if (order.customer_id && order.loyalty_points_earned > 0) {
      try {
        await loyaltyService.reverseOrderPoints(
          order.organization_id,
          order.customer_id,
          orderId,
          order.loyalty_points_earned,
          options?.idempotencyKey || `cancel-points-${orderId}`
        );
      } catch (err) {
        console.warn('[orderService] Loyalty reversal warning:', err);
      }
    }

    return { success: true };
  },

  /**
   * Reset mock store (useful for tests)
   */
  _resetMockStore() {
    mockOrdersStore = [];
    mockOrderItemsStore = [];
    nextDailyOrderSeq = 101;
  },
};
