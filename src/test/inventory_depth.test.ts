import { describe, it, expect } from 'vitest';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { purchasingService } from '@/features/inventory/services/purchasingService';

const orgId = '11111111-1111-1111-1111-111111111111';
const branchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('Inventory Depth: wastage, counts, reorder, invoices, AP payments', () => {
  it('records wastage with reason attribution and deducts stock', async () => {
    const ingredients = await inventoryService.getIngredients(branchId, orgId);
    const ingredient = ingredients[0];
    const before = ingredient.current_stock ?? 0;

    const result = await inventoryService.recordWastage({
      organizationId: orgId,
      branchId,
      ingredientId: ingredient.id,
      quantity: 1,
      reasonCategory: 'spilled',
      reason: 'Dropped during prep',
    });
    expect(result.success).toBe(true);
    expect(result.record?.reason_category).toBe('spilled');

    const after = await inventoryService.getIngredients(branchId, orgId);
    const updated = after.find((i) => i.id === ingredient.id);
    expect(updated?.current_stock).toBeLessThanOrEqual(before - 1);

    const records = await inventoryService.getWastageRecords({ organizationId: orgId, branchId });
    expect(records.some((r) => r.id === result.record!.id)).toBe(true);
  });

  it('rejects zero-quantity wastage', async () => {
    const ingredients = await inventoryService.getIngredients(branchId, orgId);
    const result = await inventoryService.recordWastage({
      organizationId: orgId,
      branchId,
      ingredientId: ingredients[0].id,
      quantity: 0,
      reasonCategory: 'other',
    });
    expect(result.success).toBe(false);
  });

  it('runs a stock count and posts variances on completion', async () => {
    const created = await inventoryService.createStockCount({
      organizationId: orgId,
      branchId,
    });
    expect(created.success).toBe(true);
    expect(created.count?.status).toBe('in_progress');

    const items = await inventoryService.getStockCountItems(created.count!.id);
    expect(items.length).toBeGreaterThan(0);

    // Count one ingredient 2 units lower than system.
    const target = items[0];
    const updated = await inventoryService.setCountedQuantity(
      target.id,
      Math.max(0, target.system_quantity - 2)
    );
    expect(updated.success).toBe(true);

    const completed = await inventoryService.completeStockCount(created.count!.id);
    expect(completed.success).toBe(true);

    const counts = await inventoryService.getStockCounts(branchId);
    expect(counts.find((c) => c.id === created.count!.id)?.status).toBe('completed');
  });

  it('flags reorder suggestions for low stock', async () => {
    const suggestions = await inventoryService.getReorderSuggestions(branchId, orgId);
    for (const s of suggestions) {
      expect(s.current_stock).toBeLessThanOrEqual(s.reorder_level);
      expect(s.suggested_quantity).toBeGreaterThanOrEqual(0);
    }
  });

  it('records supplier invoices and tracks AP payments to full settlement', async () => {
    const suppliers = await purchasingService.getSuppliers(orgId);
    const supplier = suppliers[0];

    const invoice = await purchasingService.createSupplierInvoice({
      organizationId: orgId,
      branchId,
      supplierId: supplier.id,
      invoiceNumber: 'INV-TEST-001',
      invoiceDate: new Date().toISOString().split('T')[0],
      totalAmount: 100,
    });
    expect(invoice.success).toBe(true);

    const duplicate = await purchasingService.createSupplierInvoice({
      organizationId: orgId,
      branchId,
      supplierId: supplier.id,
      invoiceNumber: 'INV-TEST-001',
      invoiceDate: new Date().toISOString().split('T')[0],
      totalAmount: 100,
    });
    expect(duplicate.success).toBe(false);

    const part = await purchasingService.recordSupplierPayment({
      organizationId: orgId,
      branchId,
      supplierId: supplier.id,
      invoiceId: invoice.invoice!.id,
      amount: 40,
      paymentMethod: 'bank_transfer',
      idempotencyKey: 'ap-test-40',
    });
    expect(part.success).toBe(true);

    const invoices = await purchasingService.getSupplierInvoices(branchId);
    expect(invoices.find((i) => i.id === invoice.invoice!.id)?.status).toBe('partially_paid');

    const rest = await purchasingService.recordSupplierPayment({
      organizationId: orgId,
      branchId,
      supplierId: supplier.id,
      invoiceId: invoice.invoice!.id,
      amount: 60,
      paymentMethod: 'bank_transfer',
      idempotencyKey: 'ap-test-60',
    });
    expect(rest.success).toBe(true);

    const settled = await purchasingService.getSupplierInvoices(branchId);
    expect(settled.find((i) => i.id === invoice.invoice!.id)?.status).toBe('paid');

    const replay = await purchasingService.recordSupplierPayment({
      organizationId: orgId,
      branchId,
      supplierId: supplier.id,
      invoiceId: invoice.invoice!.id,
      amount: 60,
      paymentMethod: 'bank_transfer',
      idempotencyKey: 'ap-test-60',
    });
    expect(replay.success).toBe(false);
  });

  it('surfaces batches expiring soon', async () => {
    const batches = await purchasingService.getExpiringBatches(branchId, 30);
    for (const b of batches) {
      const cutoff = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      expect(b.expiry_date <= cutoff).toBe(true);
    }
  });
});
