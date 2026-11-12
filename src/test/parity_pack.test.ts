import { describe, it, expect, beforeEach } from 'vitest';
import { buildUpiUri, isValidVpa, generateUpiQrDataUrl } from '@/lib/upi';
import { computeLineTax, buildInvoice, buildInvoiceNumber, ordersToGstr1Csv, invoicesToTallyXml } from '@/features/financials/services/gstInvoiceService';
import { offlineQueue } from '@/features/pos/services/offlineQueue';
import { orderService } from '@/features/pos/services/orderService';
import { paymentService } from '@/features/pos/services/paymentService';
import { reservationService } from '@/features/reservations/services/reservationService';

const orgId = '11111111-1111-1111-1111-111111111111';
const branchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('Parity pack: UPI QR', () => {
  it('validates VPA', () => {
    expect(isValidVpa('merchant@upi')).toBe(true);
    expect(isValidVpa('bad')).toBe(false);
    expect(isValidVpa('ab@bc')).toBe(true);
  });

  it('builds UPI URI', () => {
    const uri = buildUpiUri({ pa: 'merchant@upi', pn: 'Shop', am: 100.5, tn: 'Order #1', tr: 'tx1' });
    expect(uri).toContain('upi://pay');
    expect(uri).toContain('pa=merchant%40upi');
    expect(uri).toContain('am=100.50');
  });

  it('returns null for invalid VPA', () => {
    expect(buildUpiUri({ pa: 'invalid' })).toBeNull();
  });

  it('generates QR data URL', async () => {
    const dataUrl = await generateUpiQrDataUrl('upi://pay?pa=x@y');
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });
});

describe('Parity pack: GST invoice', () => {
  it('computes intra-state tax split', () => {
    const t = computeLineTax(2, 10, 18, false);
    expect(t.taxableAmount).toBe(20);
    expect(t.cgst).toBeCloseTo(1.8, 5);
    expect(t.sgst).toBeCloseTo(1.8, 5);
    expect(t.igst).toBe(0);
  });

  it('computes inter-state tax as IGST', () => {
    const t = computeLineTax(1, 100, 18, true);
    expect(t.igst).toBe(18);
    expect(t.cgst).toBe(0);
  });

  it('builds invoice with totals', () => {
    const inv = buildInvoice({
      invoiceNumber: 'INV/24-25/0001',
      supplier: { name: 'Shop', state: 'Karnataka' },
      recipient: { name: 'Buyer', state: 'Karnataka' },
      lines: [{ description: 'Tea', quantity: 2, unitPrice: 50, taxRate: 5 }],
    });
    expect(inv.subtotal).toBe(100);
    expect(inv.grandTotal).toBeGreaterThan(100);
    expect(inv.isInterState).toBe(false);
    expect(inv.cgstTotal).toBeGreaterThan(0);
  });

  it('builds invoice number', () => {
    const n = buildInvoiceNumber('HC', new Date('2026-05-10'), 7);
    expect(n).toContain('HC/');
    expect(n).toContain('/0007');
  });

  it('exports GSTR-1 CSV and Tally XML', () => {
    const inv = buildInvoice({
      invoiceNumber: 'INV/24-25/0001',
      supplier: { name: 'Shop', state: 'Karnataka' },
      recipient: { name: 'Buyer', state: 'Tamil Nadu' },
      lines: [{ description: 'Tea', quantity: 1, unitPrice: 100, taxRate: 18 }],
    });
    const csv = ordersToGstr1Csv([inv]);
    expect(csv).toContain('InvoiceNumber');
    expect(csv).toContain('INV/24-25/0001');
    const xml = invoicesToTallyXml([inv]);
    expect(xml).toContain('<ENVELOPE>');
    expect(xml).toContain('INV/24-25/0001');
  });
});

describe('Parity pack: offline queue', () => {
  beforeEach(() => {
    orderService._resetMockStore();
    paymentService._resetMockStore();
    offlineQueue._reset();
  });

  it('enqueues and flushes', async () => {
    const res = await orderService.createOrder({
      organization_id: orgId,
      branch_id: branchId,
      order_type: 'takeaway',
      idempotency_key: 'off-1',
      items: [{ menu_item_id: 'menu-item-1', quantity: 1 }],
    });
    expect(res.success).toBe(true);

    // simulate offline by directly enqueuing a payload
    const queued = offlineQueue.enqueue({
      organization_id: orgId,
      branch_id: branchId,
      order_type: 'takeaway',
      idempotency_key: 'off-queued-1',
      items: [{ menu_item_id: 'menu-item-1', quantity: 2 }],
    });
    expect(offlineQueue.getPending().length).toBe(1);

    const flushRes = await offlineQueue.flush();
    expect(flushRes.processed).toBe(1);
    expect(offlineQueue.getPending().length).toBe(0);

    // remove test artifact id (none)
    offlineQueue.remove(queued.id);
  });
});

describe('Parity pack: reservations', () => {
  it('creates and lists reservations', async () => {
    const created = await reservationService.createReservation({
      organization_id: orgId,
      branch_id: branchId,
      customer_name: 'Test Guest',
      party_size: 2,
      reservation_time: new Date(Date.now() + 3600000).toISOString(),
      duration_minutes: 60,
      status: 'booked',
    });
    expect(created.success).toBe(true);
    const list = await reservationService.getReservations(branchId);
    expect(list.length).toBeGreaterThan(0);
    if (created.reservation) {
      await reservationService.updateStatus(created.reservation.id, 'confirmed');
      const updated = await reservationService.getReservations(branchId);
      const found = updated.find((r) => r.id === created.reservation!.id);
      expect(found?.status).toBe('confirmed');
    }
  });
});
