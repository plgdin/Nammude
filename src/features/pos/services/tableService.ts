import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { DiningTableRecord } from '../types';

export const MOCK_TABLES: DiningTableRecord[] = [
  {
    id: '77777777-1111-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    table_number: 'T-01',
    section: 'Window Bay',
    capacity: 2,
    current_status: 'vacant',
    qr_token: '11111111-0000-0000-0000-000000000001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '77777777-1111-0000-0000-000000000002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    table_number: 'T-02',
    section: 'Main Dining',
    capacity: 4,
    current_status: 'vacant',
    qr_token: '11111111-0000-0000-0000-000000000002',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '77777777-1111-0000-0000-000000000003',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    table_number: 'T-03',
    section: 'Main Dining',
    capacity: 4,
    current_status: 'vacant',
    qr_token: '11111111-0000-0000-0000-000000000003',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '77777777-1111-0000-0000-000000000004',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    table_number: 'T-04',
    section: 'Patio Terrace',
    capacity: 6,
    current_status: 'occupied',
    qr_token: '11111111-0000-0000-0000-000000000004',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '77777777-1111-0000-0000-000000000005',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    table_number: 'Bar-01',
    section: 'Espresso Bar',
    capacity: 2,
    current_status: 'vacant',
    qr_token: '11111111-0000-0000-0000-000000000005',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const tableService = {
  /**
   * Fetch all tables for a branch
   */
  async getTablesByBranch(branchId: string): Promise<DiningTableRecord[]> {
    if (env.isMockAuthEnabled || !env.isConfigured) {
      return MOCK_TABLES.filter((t) => t.branch_id === branchId || branchId.startsWith('1111'));
    }

    try {
      const { data, error } = await supabase
        .from('dining_tables')
        .select('*')
        .eq('branch_id', branchId)
        .order('table_number', { ascending: true });

      if (error || !data || data.length === 0) {
        return MOCK_TABLES.filter((t) => t.branch_id === branchId || branchId.startsWith('1111'));
      }

      return data as DiningTableRecord[];
    } catch {
      return MOCK_TABLES;
    }
  },

  /**
   * Update table status (e.g., mark vacant after bill settlement or cleaning)
   */
  async updateTableStatus(
    tableId: string,
    status: DiningTableRecord['current_status']
  ): Promise<boolean> {
    if (env.isMockAuthEnabled || !env.isConfigured) {
      const t = MOCK_TABLES.find((table) => table.id === tableId);
      if (t) {
        t.current_status = status;
        t.updated_at = new Date().toISOString();
      }
      return true;
    }

    const { error } = await (supabase.from('dining_tables') as any)
      .update({ current_status: status, updated_at: new Date().toISOString() })
      .eq('id', tableId);

    return !error;
  },
};
