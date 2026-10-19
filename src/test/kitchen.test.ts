import { describe, it, expect, beforeEach } from 'vitest';
import { kotService } from '@/features/pos/services/kotService';
import { KotTicketRecord } from '@/features/pos/types';

describe('Phase 4: Kitchen Order Tickets (KOT) & KDS Workflow', () => {
  const branchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const orgId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    kotService._resetMockStore();
  });

  it('retrieves active kitchen tickets filtered by branch', async () => {
    const testTicket: KotTicketRecord = {
      id: 'kot-test-1',
      organization_id: orgId,
      branch_id: branchId,
      order_id: 'ord-test-1',
      kot_number: 'KOT-201',
      station: 'barista_station',
      status: 'queued',
      items_snapshot: [{ item_name: 'Nitro Cold Brew', quantity: 1 }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      bumped_at: null,
    };

    kotService._addMockTicket(testTicket);

    const tickets = await kotService.getActiveTickets(branchId);
    expect(tickets.length).toBe(1);
    expect(tickets[0].kot_number).toBe('KOT-201');
    expect(tickets[0].station).toBe('barista_station');
  });

  it('advances kitchen ticket status through lifecycle and bumps when completed', async () => {
    const ticketId = 'kot-adv-1';
    kotService._addMockTicket({
      id: ticketId,
      organization_id: orgId,
      branch_id: branchId,
      order_id: 'ord-adv-1',
      kot_number: 'KOT-301',
      station: 'main_kitchen',
      status: 'queued',
      items_snapshot: [{ item_name: 'Almond Croissant', quantity: 2 }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      bumped_at: null,
    });

    // 1. Advance queued -> in_progress
    await kotService.advanceTicketStatus(ticketId, 'in_progress');
    let active = await kotService.getActiveTickets(branchId);
    expect(active.find((t) => t.id === ticketId)?.status).toBe('in_progress');

    // 2. Advance in_progress -> ready
    await kotService.advanceTicketStatus(ticketId, 'ready');
    active = await kotService.getActiveTickets(branchId);
    expect(active.find((t) => t.id === ticketId)?.status).toBe('ready');

    // 3. Advance ready -> bumped (removes from active kitchen board)
    await kotService.advanceTicketStatus(ticketId, 'bumped');
    active = await kotService.getActiveTickets(branchId);
    expect(active.some((t) => t.id === ticketId)).toBe(false);
  });
});
