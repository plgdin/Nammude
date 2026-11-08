import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import {
  Customer,
  CustomerFilter,
  FeedbackRecord,
  FeedbackStatus,
  CustomerConsentRecord,
  ConsentType,
  PromotionRecord,
} from '../types';

const isMock = (): boolean => !env.isConfigured || env.isMockAuthEnabled;

let mockCustomers: Customer[] = [
  {
    id: 'cust-001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    display_name: 'Sophia Lorenzi',
    email: 'sophia@example.com',
    phone: '+1 (555) 349-2041',
    notes: 'Prefers outdoor patio table. Vegetarian preferences.',
    tags: ['VIP', 'Wine Lover'],
    total_orders_count: 14,
    total_spend_amount: 840.5,
    last_order_at: '2026-10-22T19:30:00Z',
    loyalty_points_balance: 840,
    created_at: '2026-08-10T12:00:00Z',
    updated_at: '2026-10-22T21:00:00Z',
  },
  {
    id: 'cust-002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    display_name: 'Marcus Sterling',
    email: 'marcus.s@example.com',
    phone: '+1 (555) 782-1109',
    notes: 'Regular lunch diner. Loves the margherita pizza.',
    tags: ['Regular', 'Lunch Club'],
    total_orders_count: 22,
    total_spend_amount: 550.0,
    last_order_at: '2026-10-24T12:45:00Z',
    loyalty_points_balance: 550,
    created_at: '2026-07-04T11:20:00Z',
    updated_at: '2026-10-24T13:30:00Z',
  },
  {
    id: 'cust-003',
    organization_id: '11111111-1111-1111-1111-111111111111',
    display_name: 'Elena Rostova',
    email: 'elena.rostova@example.com',
    phone: '+1 (555) 992-0044',
    notes: 'Occasional dinner guest.',
    tags: ['Dinner'],
    total_orders_count: 3,
    total_spend_amount: 195.0,
    last_order_at: '2026-10-18T20:15:00Z',
    loyalty_points_balance: 195,
    created_at: '2026-09-12T18:00:00Z',
    updated_at: '2026-10-18T21:40:00Z',
  },
];

export const crmService = {
  async getCustomers(orgId: string, filter?: CustomerFilter): Promise<Customer[]> {
    if (isMock()) {
      let result = mockCustomers.filter((c) => c.organization_id === orgId);
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        result = result.filter(
          (c) =>
            c.display_name.toLowerCase().includes(q) ||
            (c.email && c.email.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q))
        );
      }
      if (filter?.tag && filter.tag !== 'all') {
        result = result.filter((c) => c.tags.includes(filter.tag!));
      }
      if (filter?.sortBy === 'spend') {
        result.sort((a, b) => b.total_spend_amount - a.total_spend_amount);
      } else if (filter?.sortBy === 'orders') {
        result.sort((a, b) => b.total_orders_count - a.total_orders_count);
      } else if (filter?.sortBy === 'recent') {
        result.sort((a, b) => (b.last_order_at || '').localeCompare(a.last_order_at || ''));
      } else {
        result.sort((a, b) => a.display_name.localeCompare(b.display_name));
      }
      return result;
    }

    try {
      let query = (supabase.from('customers') as any).select('*').eq('organization_id', orgId);

      if (filter?.search) {
        query = query.or(
          `display_name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,phone.ilike.%${filter.search}%`
        );
      }

      if (filter?.sortBy === 'spend') {
        query = query.order('total_spend_amount', { ascending: false });
      } else if (filter?.sortBy === 'orders') {
        query = query.order('total_orders_count', { ascending: false });
      } else if (filter?.sortBy === 'recent') {
        query = query.order('last_order_at', { ascending: false, nullsFirst: false });
      } else {
        query = query.order('display_name', { ascending: true });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        tags: Array.isArray(c.tags) ? c.tags : [],
      }));
    } catch {
      return mockCustomers.filter((c) => c.organization_id === orgId);
    }
  },

  async createCustomer(
    orgId: string,
    data: { display_name: string; email?: string | null; phone?: string | null; notes?: string | null; tags?: string[] }
  ): Promise<Customer> {
    if (isMock()) {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        organization_id: orgId,
        display_name: data.display_name,
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        tags: data.tags || [],
        total_orders_count: 0,
        total_spend_amount: 0.0,
        last_order_at: null,
        loyalty_points_balance: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockCustomers.unshift(newCust);
      return newCust;
    }

    const { data: created, error } = await (supabase.from('customers') as any)
      .insert({
        organization_id: orgId,
        display_name: data.display_name,
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        tags: data.tags || [],
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...created,
      tags: Array.isArray(created.tags) ? created.tags : [],
    };
  },

  async updateCustomer(
    orgId: string,
    customerId: string,
    updates: Partial<Customer>
  ): Promise<Customer> {
    if (isMock()) {
      mockCustomers = mockCustomers.map((c) =>
        c.id === customerId ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
      );
      return mockCustomers.find((c) => c.id === customerId)!;
    }

    const { data, error } = await (supabase.from('customers') as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw error;
    return { ...data, tags: Array.isArray(data.tags) ? data.tags : [] };
  },

  async deleteCustomer(orgId: string, customerId: string): Promise<void> {
    if (isMock()) {
      mockCustomers = mockCustomers.filter((c) => c.id !== customerId);
      return;
    }

    const { error } = await (supabase.from('customers') as any)
      .delete()
      .eq('id', customerId)
      .eq('organization_id', orgId);
    if (error) throw error;
  },

  // --- Feedback ---
  async getFeedback(orgId: string): Promise<FeedbackRecord[]> {
    if (isMock()) {
      return localFeedback.filter((f) => f.organization_id === orgId);
    }
    try {
      const { data, error } = await (supabase.from('feedback') as any)
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as FeedbackRecord[];
    } catch (err) {
      console.warn('[crmService] Failed to load feedback:', err);
    }
    return [];
  },

  async createFeedback(params: {
    organizationId: string;
    customerId?: string | null;
    orderId?: string | null;
    rating?: number | null;
    comment?: string | null;
    channel?: string;
  }): Promise<{ success: boolean; feedback?: FeedbackRecord; error?: string }> {
    if (params.rating !== undefined && params.rating !== null) {
      if (!Number.isInteger(params.rating) || params.rating < 1 || params.rating > 5) {
        return { success: false, error: 'Rating must be a whole number between 1 and 5.' };
      }
    }
    if (!params.comment || params.comment.trim().length < 3) {
      return { success: false, error: 'Feedback comment is required.' };
    }

    if (isMock()) {
      const feedback: FeedbackRecord = {
        id: `fb-${Date.now()}`,
        organization_id: params.organizationId,
        customer_id: params.customerId || null,
        order_id: params.orderId || null,
        rating: params.rating ?? null,
        comment: params.comment.trim(),
        channel: params.channel || 'in_store',
        status: 'new',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localFeedback.unshift(feedback);
      return { success: true, feedback };
    }

    try {
      const { data, error } = await (supabase.from('feedback') as any)
        .insert({
          organization_id: params.organizationId,
          customer_id: params.customerId || null,
          order_id: params.orderId || null,
          rating: params.rating ?? null,
          comment: params.comment.trim(),
          channel: params.channel || 'in_store',
          status: 'new',
        })
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, feedback: data as FeedbackRecord };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to record feedback.' };
    }
  },

  async updateFeedbackStatus(
    feedbackId: string,
    status: FeedbackStatus
  ): Promise<{ success: boolean; error?: string }> {
    if (isMock()) {
      const target = localFeedback.find((f) => f.id === feedbackId);
      if (!target) return { success: false, error: 'Feedback not found.' };
      target.status = status;
      target.updated_at = new Date().toISOString();
      return { success: true };
    }
    try {
      const { error } = await (supabase.from('feedback') as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', feedbackId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update feedback.' };
    }
  },

  // --- Consents ---
  async getConsents(orgId: string, customerId: string): Promise<CustomerConsentRecord[]> {
    if (isMock()) {
      return localConsents.filter((c) => c.customer_id === customerId);
    }
    try {
      const { data, error } = await (supabase.from('customer_consents') as any)
        .select('*')
        .eq('organization_id', orgId)
        .eq('customer_id', customerId);
      if (!error && data) return data as CustomerConsentRecord[];
    } catch (err) {
      console.warn('[crmService] Failed to load consents:', err);
    }
    return [];
  },

  async setConsent(params: {
    organizationId: string;
    customerId: string;
    consentType: ConsentType;
    granted: boolean;
    source?: string | null;
  }): Promise<{ success: boolean; error?: string }> {
    if (isMock()) {
      const existing = localConsents.find(
        (c) => c.customer_id === params.customerId && c.consent_type === params.consentType
      );
      if (existing) {
        existing.granted = params.granted;
        existing.granted_at = params.granted ? new Date().toISOString() : null;
        existing.source = params.source || existing.source;
        existing.updated_at = new Date().toISOString();
      } else {
        localConsents.push({
          id: `consent-${Date.now()}`,
          organization_id: params.organizationId,
          customer_id: params.customerId,
          consent_type: params.consentType,
          granted: params.granted,
          granted_at: params.granted ? new Date().toISOString() : null,
          source: params.source || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      return { success: true };
    }

    try {
      const { error } = await (supabase.from('customer_consents') as any).upsert(
        {
          organization_id: params.organizationId,
          customer_id: params.customerId,
          consent_type: params.consentType,
          granted: params.granted,
          granted_at: params.granted ? new Date().toISOString() : null,
          source: params.source || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'customer_id,consent_type' }
      );
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update consent.' };
    }
  },

  // --- Promotions ---
  async getPromotions(orgId: string): Promise<PromotionRecord[]> {
    if (isMock()) {
      return localPromotions.filter((p) => p.organization_id === orgId);
    }
    try {
      const { data, error } = await (supabase.from('promotions') as any)
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as PromotionRecord[];
    } catch (err) {
      console.warn('[crmService] Failed to load promotions:', err);
    }
    return [];
  },

  async createPromotion(params: {
    organizationId: string;
    name: string;
    code: string;
    discountType: 'percent' | 'fixed';
    discountValue: number;
    minOrderValue?: number;
    endsAt?: string | null;
    usageLimit?: number | null;
  }): Promise<{ success: boolean; promotion?: PromotionRecord; error?: string }> {
    const name = params.name.trim();
    const code = params.code.trim().toUpperCase();
    if (name.length < 2) return { success: false, error: 'Promotion name is required.' };
    if (!/^[A-Z0-9-]{3,}$/.test(code)) {
      return { success: false, error: 'Promo code must be at least 3 characters (letters, numbers, hyphens).' };
    }
    if (!Number.isFinite(params.discountValue) || params.discountValue <= 0) {
      return { success: false, error: 'Discount value must be greater than zero.' };
    }
    if (params.discountType === 'percent' && params.discountValue > 100) {
      return { success: false, error: 'Percent discount cannot exceed 100.' };
    }

    if (isMock()) {
      const duplicate = localPromotions.find(
        (p) => p.organization_id === params.organizationId && p.code === code
      );
      if (duplicate) return { success: false, error: 'A promotion with this code already exists.' };
      const promotion: PromotionRecord = {
        id: `promo-${Date.now()}`,
        organization_id: params.organizationId,
        name,
        code,
        discount_type: params.discountType,
        discount_value: params.discountValue,
        min_order_value: params.minOrderValue || 0,
        starts_at: new Date().toISOString(),
        ends_at: params.endsAt || null,
        is_active: true,
        usage_limit: params.usageLimit || null,
        used_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localPromotions.unshift(promotion);
      return { success: true, promotion };
    }

    try {
      const { data, error } = await (supabase.from('promotions') as any)
        .insert({
          organization_id: params.organizationId,
          name,
          code,
          discount_type: params.discountType,
          discount_value: params.discountValue,
          min_order_value: params.minOrderValue || 0,
          ends_at: params.endsAt || null,
          is_active: true,
          usage_limit: params.usageLimit || null,
          used_count: 0,
        })
        .select()
        .single();
      if (error) {
        return {
          success: false,
          error: error.message.includes('uq_promotion_code')
            ? 'A promotion with this code already exists.'
            : error.message,
        };
      }
      return { success: true, promotion: data as PromotionRecord };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create promotion.' };
    }
  },

  async togglePromotion(promotionId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
    if (isMock()) {
      const target = localPromotions.find((p) => p.id === promotionId);
      if (!target) return { success: false, error: 'Promotion not found.' };
      target.is_active = isActive;
      target.updated_at = new Date().toISOString();
      return { success: true };
    }
    try {
      const { error } = await (supabase.from('promotions') as any)
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', promotionId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update promotion.' };
    }
  },

  /**
   * Validate a promo code for an order total (read-only check).
   */
  async validatePromotionCode(
    orgId: string,
    code: string,
    orderTotal: number
  ): Promise<{ valid: boolean; discount: number; error?: string }> {
    const promotions = await this.getPromotions(orgId);
    const promo = promotions.find((p) => p.code === code.trim().toUpperCase());
    if (!promo) return { valid: false, discount: 0, error: 'Invalid promo code.' };
    if (!promo.is_active) return { valid: false, discount: 0, error: 'Promo code is not active.' };
    const now = new Date();
    if (new Date(promo.starts_at) > now) return { valid: false, discount: 0, error: 'Promo code has not started yet.' };
    if (promo.ends_at && new Date(promo.ends_at) < now) {
      return { valid: false, discount: 0, error: 'Promo code has expired.' };
    }
    if (promo.usage_limit !== null && promo.used_count >= promo.usage_limit) {
      return { valid: false, discount: 0, error: 'Promo code usage limit reached.' };
    }
    if (orderTotal < promo.min_order_value) {
      return {
        valid: false,
        discount: 0,
        error: `Requires minimum order value of ${promo.min_order_value}.`,
      };
    }
    const discount =
      promo.discount_type === 'percent'
        ? Number((orderTotal * (promo.discount_value / 100)).toFixed(2))
        : Number(Math.min(promo.discount_value, orderTotal).toFixed(2));
    return { valid: true, discount };
  },
};

let localFeedback: FeedbackRecord[] = [
  {
    id: 'fb-00000000-0000-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    customer_id: 'cust-001',
    order_id: null,
    rating: 5,
    comment: 'Best flat white in the city. The patio seating is lovely.',
    channel: 'in_store',
    status: 'new',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let localConsents: CustomerConsentRecord[] = [];

let localPromotions: PromotionRecord[] = [];
