import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { Customer, CustomerFilter } from '../types';

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
};
