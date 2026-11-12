import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { Database } from '@/types/database.types';

type ReservationRow = Database['public']['Tables']['reservations']['Row'];
type ReservationInsert = Database['public']['Tables']['reservations']['Insert'];

let mockReservations: ReservationRow[] = [
  {
    id: 'res-001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    customer_id: null,
    customer_name: 'Aarav Mehta',
    customer_phone: '+91 98765 43210',
    party_size: 4,
    reservation_time: new Date(Date.now() + 2 * 3600000).toISOString(),
    duration_minutes: 90,
    table_id: null,
    status: 'booked',
    notes: 'Window seat preferred',
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const reservationService = {
  _resetMockStore() {
    mockReservations = mockReservations.filter(() => false);
  },

  async getReservations(branchId: string, date?: string): Promise<ReservationRow[]> {
    if (!env.isConfigured || env.isMockAuthEnabled) {
      let result = mockReservations.filter((r) => r.branch_id === branchId);
      if (date) {
        result = result.filter((r) => r.reservation_time.startsWith(date));
      }
      return [...result].sort((a, b) => a.reservation_time.localeCompare(b.reservation_time));
    }
    try {
      let query = (supabase.from('reservations') as any)
        .select('*')
        .eq('branch_id', branchId)
        .order('reservation_time', { ascending: true });
      if (date) {
        query = query.gte('reservation_time', `${date}T00:00:00.000Z`).lte('reservation_time', `${date}T23:59:59.999Z`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ReservationRow[];
    } catch {
      let result = mockReservations.filter((r) => r.branch_id === branchId);
      if (date) result = result.filter((r) => r.reservation_time.startsWith(date));
      return [...result];
    }
  },

  async createReservation(payload: Omit<ReservationInsert, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; reservation?: ReservationRow; error?: string }> {
    if (!env.isConfigured || env.isMockAuthEnabled) {
      const newRes: ReservationRow = {
        id: `res-${Date.now()}`,
        organization_id: payload.organization_id,
        branch_id: payload.branch_id,
        customer_id: payload.customer_id ?? null,
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone ?? null,
        party_size: payload.party_size ?? 2,
        reservation_time: payload.reservation_time,
        duration_minutes: payload.duration_minutes ?? 90,
        table_id: payload.table_id ?? null,
        status: payload.status ?? 'booked',
        notes: payload.notes ?? null,
        created_by: payload.created_by ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockReservations.unshift(newRes);
      return { success: true, reservation: newRes };
    }
    try {
      const { data, error } = await (supabase.from('reservations') as any)
        .insert(payload)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, reservation: data as ReservationRow };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateStatus(id: string, status: ReservationRow['status']): Promise<{ success: boolean; error?: string }> {
    if (!env.isConfigured || env.isMockAuthEnabled) {
      const idx = mockReservations.findIndex((r) => r.id === id);
      if (idx === -1) return { success: false, error: 'Not found' };
      mockReservations[idx] = { ...mockReservations[idx], status, updated_at: new Date().toISOString() };
      return { success: true };
    }
    try {
      const { error } = await (supabase.from('reservations') as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async assignTable(id: string, tableId: string | null): Promise<{ success: boolean; error?: string }> {
    if (!env.isConfigured || env.isMockAuthEnabled) {
      const idx = mockReservations.findIndex((r) => r.id === id);
      if (idx === -1) return { success: false, error: 'Not found' };
      mockReservations[idx] = { ...mockReservations[idx], table_id: tableId, updated_at: new Date().toISOString() };
      return { success: true };
    }
    try {
      const { error } = await (supabase.from('reservations') as any)
        .update({ table_id: tableId, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};
