import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { KotTicketRecord } from '../types';

let mockKotStore: KotTicketRecord[] = [
  {
    id: '99999999-1111-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    order_id: '88888888-1111-0000-0000-000000000001',
    kot_number: 'KOT-101',
    station: 'main_kitchen',
    status: 'in_progress',
    items_snapshot: [
      { item_name: 'Vanilla Oat Flat White', quantity: 1, instructions: 'Extra hot' },
      { item_name: 'Truffle Mushroom Sourdough Melt', quantity: 1, instructions: 'Crispy edges' },
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // 12 mins ago
    updated_at: new Date().toISOString(),
    bumped_at: null,
  },
];

export const kotService = {
  /**
   * Fetch active KOT tickets for a kitchen station or branch
   */
  async getActiveTickets(branchId: string, station?: string): Promise<KotTicketRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        let query = supabase
          .from('kot_tickets')
          .select('*')
          .eq('branch_id', branchId)
          .neq('status', 'bumped')
          .order('created_at', { ascending: true });

        if (station) {
          query = query.eq('station', station);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data as KotTicketRecord[];
        }
      } catch (err) {
        console.warn('[kotService] Live tickets fetch failed, using fallback:', err);
      }
    }

    return mockKotStore.filter((t) => {
      const matchBranch = t.branch_id === branchId || branchId.startsWith('1111');
      const matchStatus = t.status !== 'bumped';
      const matchStation = station ? t.station === station : true;
      return matchBranch && matchStatus && matchStation;
    });
  },

  /**
   * Advance ticket status (queued -> in_progress -> ready -> bumped)
   */
  async advanceTicketStatus(ticketId: string, nextStatus: KotTicketRecord['status']): Promise<boolean> {
    const bumpedAt = nextStatus === 'bumped' ? new Date().toISOString() : null;

    if (env.isConfigured && !env.isMockAuthEnabled) {
      const { error } = await (supabase.from('kot_tickets') as any)
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
          bumped_at: bumpedAt,
        })
        .eq('id', ticketId);

      return !error;
    }

    const ticket = mockKotStore.find((t) => t.id === ticketId);
    if (ticket) {
      ticket.status = nextStatus;
      ticket.updated_at = new Date().toISOString();
      if (bumpedAt) ticket.bumped_at = bumpedAt;
      return true;
    }

    return false;
  },

  /**
   * Add a ticket to mock store (for testing)
   */
  _addMockTicket(ticket: KotTicketRecord) {
    mockKotStore.push(ticket);
  },

  /**
   * Reset mock store
   */
  _resetMockStore() {
    mockKotStore = [];
  },
};
