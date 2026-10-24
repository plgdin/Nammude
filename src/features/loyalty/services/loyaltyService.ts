import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { LoyaltyConfig, LoyaltyLedgerEntry } from '../types';
import { crmService } from '@/features/crm/services/crmService';

const isMock = (): boolean => !env.isConfigured || env.isMockAuthEnabled;

let mockLoyaltyConfigs: Record<string, LoyaltyConfig> = {
  '11111111-1111-1111-1111-111111111111': {
    id: 'cfg-001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    is_enabled: true,
    points_per_currency_unit: 1.0,
    currency_value_per_point: 0.01,
    min_redemption_points: 50,
    max_redemption_percentage: 50.0,
  },
};

let mockLedger: LoyaltyLedgerEntry[] = [
  {
    id: 'ledg-001',
    customer_id: 'cust-001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    order_id: 'ord-101',
    entry_type: 'earn',
    points: 80,
    balance_after: 840,
    idempotency_key: 'ord-101-earn',
    notes: 'Order #101 Dine-in points earn',
    created_at: '2026-10-22T20:00:00Z',
  },
  {
    id: 'ledg-002',
    customer_id: 'cust-002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    order_id: 'ord-102',
    entry_type: 'earn',
    points: 25,
    balance_after: 550,
    idempotency_key: 'ord-102-earn',
    notes: 'Order #102 Lunch earn',
    created_at: '2026-10-24T13:10:00Z',
  },
];

export const loyaltyService = {
  async getLoyaltyConfig(orgId: string): Promise<LoyaltyConfig> {
    if (isMock()) {
      return (
        mockLoyaltyConfigs[orgId] || {
          id: `cfg-${orgId.slice(0, 8)}`,
          organization_id: orgId,
          is_enabled: true,
          points_per_currency_unit: 1.0,
          currency_value_per_point: 0.01,
          min_redemption_points: 50,
          max_redemption_percentage: 50.0,
        }
      );
    }

    try {
      const { data, error } = await (supabase.from('loyalty_configs') as any)
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return {
          id: `cfg-${orgId.slice(0, 8)}`,
          organization_id: orgId,
          is_enabled: true,
          points_per_currency_unit: 1.0,
          currency_value_per_point: 0.01,
          min_redemption_points: 50,
          max_redemption_percentage: 50.0,
        };
      }
      return data as LoyaltyConfig;
    } catch {
      return (
        mockLoyaltyConfigs[orgId] || {
          id: `cfg-${orgId.slice(0, 8)}`,
          organization_id: orgId,
          is_enabled: true,
          points_per_currency_unit: 1.0,
          currency_value_per_point: 0.01,
          min_redemption_points: 50,
          max_redemption_percentage: 50.0,
        }
      );
    }
  },

  async updateLoyaltyConfig(
    orgId: string,
    updates: Partial<LoyaltyConfig>
  ): Promise<LoyaltyConfig> {
    if (isMock()) {
      const current = await this.getLoyaltyConfig(orgId);
      const updated = { ...current, ...updates };
      mockLoyaltyConfigs[orgId] = updated;
      return updated;
    }

    const { data, error } = await (supabase.from('loyalty_configs') as any)
      .upsert({
        organization_id: orgId,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as LoyaltyConfig;
  },

  async getLedger(orgId: string, customerId?: string): Promise<LoyaltyLedgerEntry[]> {
    if (isMock()) {
      let result = mockLedger.filter((l) => l.organization_id === orgId);
      if (customerId) {
        result = result.filter((l) => l.customer_id === customerId);
      }
      return [...result];
    }

    try {
      let query = (supabase.from('customer_loyalty_ledger') as any)
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as LoyaltyLedgerEntry[];
    } catch {
      return mockLedger.filter(
        (l) => l.organization_id === orgId && (!customerId || l.customer_id === customerId)
      );
    }
  },

  async awardPoints(
    orgId: string,
    customerId: string,
    orderId: string,
    orderTotal: number,
    idempotencyKey: string
  ): Promise<{ success: boolean; points: number; new_balance: number }> {
    const config = await this.getLoyaltyConfig(orgId);
    if (!config.is_enabled) {
      return { success: false, points: 0, new_balance: 0 };
    }

    // Check duplicate idempotency
    const existing = mockLedger.find(
      (l) => l.organization_id === orgId && l.idempotency_key === idempotencyKey
    );
    if (existing) {
      return {
        success: true,
        points: existing.points,
        new_balance: existing.balance_after,
      };
    }

    const pointsToAward = Math.floor(orderTotal * config.points_per_currency_unit);
    if (pointsToAward <= 0) {
      return { success: true, points: 0, new_balance: 0 };
    }

    if (isMock()) {
      const customers = await crmService.getCustomers(orgId);
      const customer = customers.find((c) => c.id === customerId);
      const currentBalance = customer?.loyalty_points_balance || 0;
      const newBalance = currentBalance + pointsToAward;

      if (customer) {
        await crmService.updateCustomer(orgId, customerId, {
          loyalty_points_balance: newBalance,
        });
      }

      const entry: LoyaltyLedgerEntry = {
        id: `ledg-${Date.now()}`,
        customer_id: customerId,
        organization_id: orgId,
        order_id: orderId,
        entry_type: 'earn',
        points: pointsToAward,
        balance_after: newBalance,
        idempotency_key: idempotencyKey,
        notes: `Awarded for qualifying order: $${orderTotal.toFixed(2)}`,
        created_at: new Date().toISOString(),
      };
      mockLedger.unshift(entry);
      return { success: true, points: pointsToAward, new_balance: newBalance };
    }

    const { data, error } = await (supabase.rpc as any)('record_loyalty_transaction', {
      p_customer_id: customerId,
      p_org_id: orgId,
      p_order_id: orderId,
      p_entry_type: 'earn',
      p_points: pointsToAward,
      p_idempotency_key: idempotencyKey,
      p_notes: `Awarded for qualifying order: $${orderTotal.toFixed(2)}`,
    });

    if (error) throw error;
    return {
      success: true,
      points: data.points,
      new_balance: data.balance_after,
    };
  },

  async redeemPoints(
    orgId: string,
    customerId: string,
    orderId: string | null,
    pointsToRedeem: number,
    idempotencyKey: string
  ): Promise<{ success: boolean; discount_amount: number; new_balance: number }> {
    const config = await this.getLoyaltyConfig(orgId);
    if (!config.is_enabled) {
      throw new Error('Loyalty program is disabled');
    }
    if (pointsToRedeem < config.min_redemption_points) {
      throw new Error(`Minimum redemption is ${config.min_redemption_points} points`);
    }

    const discountAmount = pointsToRedeem * config.currency_value_per_point;

    // Check duplicate idempotency
    const existing = mockLedger.find(
      (l) => l.organization_id === orgId && l.idempotency_key === idempotencyKey
    );
    if (existing) {
      return {
        success: true,
        discount_amount: discountAmount,
        new_balance: existing.balance_after,
      };
    }

    if (isMock()) {
      const customers = await crmService.getCustomers(orgId);
      const customer = customers.find((c) => c.id === customerId);
      const currentBalance = customer?.loyalty_points_balance || 0;

      if (currentBalance < pointsToRedeem) {
        throw new Error('Insufficient loyalty points balance');
      }

      const newBalance = currentBalance - pointsToRedeem;
      if (customer) {
        await crmService.updateCustomer(orgId, customerId, {
          loyalty_points_balance: newBalance,
        });
      }

      const entry: LoyaltyLedgerEntry = {
        id: `ledg-${Date.now()}`,
        customer_id: customerId,
        organization_id: orgId,
        order_id: orderId,
        entry_type: 'redeem',
        points: -pointsToRedeem,
        balance_after: newBalance,
        idempotency_key: idempotencyKey,
        notes: `Redeemed ${pointsToRedeem} points for $${discountAmount.toFixed(2)} discount`,
        created_at: new Date().toISOString(),
      };
      mockLedger.unshift(entry);
      return { success: true, discount_amount: discountAmount, new_balance: newBalance };
    }

    const { data, error } = await (supabase.rpc as any)('record_loyalty_transaction', {
      p_customer_id: customerId,
      p_org_id: orgId,
      p_order_id: orderId,
      p_entry_type: 'redeem',
      p_points: -pointsToRedeem,
      p_idempotency_key: idempotencyKey,
      p_notes: `Redeemed ${pointsToRedeem} points for $${discountAmount.toFixed(2)} discount`,
    });

    if (error) throw error;
    return {
      success: true,
      discount_amount: discountAmount,
      new_balance: data.balance_after,
    };
  },

  async reverseOrderPoints(
    orgId: string,
    customerId: string,
    orderId: string,
    pointsToReverse: number,
    idempotencyKey: string
  ): Promise<{ success: boolean; new_balance: number }> {
    // Check duplicate idempotency
    const existing = mockLedger.find(
      (l) => l.organization_id === orgId && l.idempotency_key === idempotencyKey
    );
    if (existing) {
      return {
        success: true,
        new_balance: existing.balance_after,
      };
    }

    if (isMock()) {
      const customers = await crmService.getCustomers(orgId);
      const customer = customers.find((c) => c.id === customerId);
      const currentBalance = customer?.loyalty_points_balance || 0;
      const newBalance = Math.max(0, currentBalance - pointsToReverse);

      if (customer) {
        await crmService.updateCustomer(orgId, customerId, {
          loyalty_points_balance: newBalance,
        });
      }

      const entry: LoyaltyLedgerEntry = {
        id: `ledg-${Date.now()}`,
        customer_id: customerId,
        organization_id: orgId,
        order_id: orderId,
        entry_type: 'reversal',
        points: -pointsToReverse,
        balance_after: newBalance,
        idempotency_key: idempotencyKey,
        notes: `Reversal of order ${orderId} points due to cancellation/refund`,
        created_at: new Date().toISOString(),
      };
      mockLedger.unshift(entry);
      return { success: true, new_balance: newBalance };
    }

    const { data, error } = await (supabase.rpc as any)('record_loyalty_transaction', {
      p_customer_id: customerId,
      p_org_id: orgId,
      p_order_id: orderId,
      p_entry_type: 'reversal',
      p_points: -pointsToReverse,
      p_idempotency_key: idempotencyKey,
      p_notes: `Reversal of order ${orderId} points due to cancellation/refund`,
    });

    if (error) throw error;
    return {
      success: true,
      new_balance: data.balance_after,
    };
  },
};
