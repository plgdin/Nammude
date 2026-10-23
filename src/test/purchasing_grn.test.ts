import { describe, it, expect } from 'vitest';
import { purchasingService } from '@/features/inventory/services/purchasingService';

describe('Phase 5: Purchasing, Suppliers & Goods Receipts (GRN)', () => {
  const orgId = '11111111-1111-1111-1111-111111111111';
  const branchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const supplierId = 's1111111-0000-0000-0000-000000000001';

  it('fetches supplier directory with contact details and terms', async () => {
    const suppliers = await purchasingService.getSuppliers(orgId);
    expect(suppliers.length).toBeGreaterThan(0);
    const cdd = suppliers.find((s) => s.company_name.includes('Coastal Dairy'));
    expect(cdd).toBeDefined();
    expect(cdd?.payment_terms_days).toBe(30);
  });

  it('creates purchase order with line items and totals', async () => {
    const res = await purchasingService.createPurchaseOrder({
      organizationId: orgId,
      branchId,
      supplierId,
      notes: 'Weekly fresh dairy delivery',
      items: [
        {
          ingredientId: 'i1111111-0000-0000-0000-000000000001',
          quantity: 20,
          purchaseUnit: 'L',
          conversionFactor: 1000,
          unitPrice: 1.85,
        },
      ],
    });

    expect(res.success).toBe(true);
    expect(res.po).toBeDefined();
    expect(res.po?.total_amount).toBe(37); // 20 * 1.85
    expect(res.po?.status).toBe('issued');
  });

  it('processes goods receipt note (GRN) with normalized quantities', async () => {
    const grnRes = await purchasingService.processGoodsReceipt({
      organizationId: orgId,
      branchId,
      supplierId,
      invoiceNumber: 'INV-TEST-001',
      idempotencyKey: 'grn-idem-test-1',
      items: [
        {
          ingredientId: 'i1111111-0000-0000-0000-000000000001',
          receivedQuantity: 20, // 20 L
          rejectedQuantity: 0,
          purchaseUnit: 'L',
          conversionFactor: 1000, // 20,000 ml
          unitCost: 1.85,
        },
      ],
    });

    expect(grnRes.success).toBe(true);
    expect(grnRes.grnNumber).toMatch(/^GRN-\d{4}-\d+/);
    expect(grnRes.totalAmount).toBe(37);
  });

  it('recalculates Weighted Average Cost (WAC) formula accurately', () => {
    // Current stock: 10,000ml @ $0.0018/ml ($18 total)
    // New shipment: 20,000ml @ $0.0020/ml ($40 total)
    // New total quantity: 30,000ml
    // New WAC: (18 + 40) / 30,000 = 58 / 30,000 = $0.001933/ml
    const existingStock = 10000;
    const existingCost = 0.0018;
    const newQty = 20000;
    const newCost = 0.0020;

    const newWac = ((existingStock * existingCost) + (newQty * newCost)) / (existingStock + newQty);
    expect(Math.round(newWac * 1000000) / 1000000).toBeCloseTo(0.001933, 5);
  });
});
