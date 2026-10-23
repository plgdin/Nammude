import { describe, it, expect } from 'vitest';
import { checklistService } from '@/features/checklists/services/checklistService';
import { documentService } from '@/features/ocr/services/documentService';
import { financialReportService } from '@/features/financials/services/financialReportService';

describe('Phase 6 & Phase 7 Security Hardening & Blocker Verification', () => {
  const orgId = '11111111-1111-1111-1111-111111111111';
  const branchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const userId = 'u1111111-0000-0000-0000-000000000001';

  describe('1. Server-Side Temperature Bounds & Exception Protection', () => {
    it('server automatically flags exception when reading is below template minimum', async () => {
      const templates = await checklistService.getTemplates(orgId);
      const tempTmpl = templates.find((t) => t.category === 'food_temperature')!;

      const instRes = await checklistService.instantiateChecklist({
        organizationId: orgId,
        branchId,
        templateId: tempTmpl.id,
        shiftName: 'Morning Cold Prep',
      });

      const instance = instRes.instance!;
      // Cooler minimum is 33°F. Reading submitted: 28°F (Freezing danger)
      const coolerItem = (instance.items || []).find((i) =>
        i.task_description.toLowerCase().includes('walk-in')
      )!;

      // Note: Client attempts to submit isException: false
      const result = await checklistService.toggleItem({
        instanceId: instance.id,
        itemId: coolerItem.id,
        isCompleted: true,
        temperatureReading: 28.0,
        isException: false, // Client attempts to hide exception
        userId,
      });

      expect(result.success).toBe(true);
      const updatedItem = result.instance?.items?.find((i) => i.id === coolerItem.id);
      expect(updatedItem?.is_exception).toBe(true); // Server overrides and enforces exception
      expect(updatedItem?.exception_reason).toContain('below minimum safe threshold');
    });

    it('server automatically flags exception when reading exceeds template maximum', async () => {
      const templates = await checklistService.getTemplates(orgId);
      const tempTmpl = templates.find((t) => t.category === 'food_temperature')!;

      const instRes = await checklistService.instantiateChecklist({
        organizationId: orgId,
        branchId,
        templateId: tempTmpl.id,
        shiftName: 'Afternoon Heat Audit',
      });

      const instance = instRes.instance!;
      const coolerItem = (instance.items || []).find((i) =>
        i.task_description.toLowerCase().includes('walk-in')
      )!;

      // Cooler maximum is 40°F. Reading submitted: 48°F
      const result = await checklistService.toggleItem({
        instanceId: instance.id,
        itemId: coolerItem.id,
        isCompleted: true,
        temperatureReading: 48.0,
        userId,
      });

      expect(result.success).toBe(true);
      const updatedItem = result.instance?.items?.find((i) => i.id === coolerItem.id);
      expect(updatedItem?.is_exception).toBe(true);
      expect(updatedItem?.exception_reason).toContain('exceeds maximum safe threshold');
    });

    it('blocks item modification on a completed checklist instance', async () => {
      const templates = await checklistService.getTemplates(orgId);
      const openingTmpl = templates.find((t) => t.category === 'opening')!;

      const instRes = await checklistService.instantiateChecklist({
        organizationId: orgId,
        branchId,
        templateId: openingTmpl.id,
        shiftName: 'Locked Audit Shift',
      });

      const instance = instRes.instance!;

      // Complete all items
      for (const itm of instance.items || []) {
        await checklistService.toggleItem({
          instanceId: instance.id,
          itemId: itm.id,
          isCompleted: true,
          userId,
        });
      }

      // Finalize instance
      await checklistService.completeInstance({
        instanceId: instance.id,
        userId,
      });

      // Attempt to tamper with completed checklist
      await expect(
        checklistService.toggleItem({
          instanceId: instance.id,
          itemId: instance.items![0].id,
          isCompleted: false,
          userId,
        })
      ).rejects.toThrow('Cannot modify items in a completed checklist instance');
    });
  });

  describe('2. Idempotent Checklist Instantiation', () => {
    it('returns existing instance instead of creating duplicates for same shift', async () => {
      const templates = await checklistService.getTemplates(orgId);
      const openingTmpl = templates.find((t) => t.category === 'opening')!;

      const firstCall = await checklistService.instantiateChecklist({
        organizationId: orgId,
        branchId,
        templateId: openingTmpl.id,
        shiftName: 'Breakfast Rush 1',
      });

      const secondCall = await checklistService.instantiateChecklist({
        organizationId: orgId,
        branchId,
        templateId: openingTmpl.id,
        shiftName: 'Breakfast Rush 1',
      });

      expect(firstCall.success).toBe(true);
      expect(secondCall.success).toBe(true);
      expect(secondCall.instanceId).toBe(firstCall.instanceId);
    });
  });

  describe('3. Document Review State Transition Gating', () => {
    it('prohibits repeated or conflicting review of already decided documents', async () => {
      const upload = await documentService.uploadAndProcessDocument({
        organizationId: orgId,
        branchId,
        documentType: 'supplier_invoice',
        file: {
          name: 'produce_bill_locked.pdf',
          size: 150000,
          type: 'application/pdf',
        },
      });

      const docId = upload.documentId;

      // First manager review: verify document
      const firstReview = await documentService.reviewDocument({
        documentId: docId,
        action: 'verify',
        userId,
      });
      expect(firstReview.success).toBe(true);
      expect(firstReview.status).toBe('verified');

      // Second review attempt: should be rejected by legal state transition gate
      await expect(
        documentService.reviewDocument({
          documentId: docId,
          action: 'reject',
          rejectionReason: 'Late rejection attempt',
          userId,
        })
      ).rejects.toThrow('cannot be reviewed from its current state (verified)');
    });

    it('requires a mandatory non-empty rejection reason on reject action', async () => {
      const upload = await documentService.uploadAndProcessDocument({
        organizationId: orgId,
        branchId,
        documentType: 'supplier_invoice',
        file: {
          name: 'blurry_invoice_test.pdf',
          size: 110000,
          type: 'application/pdf',
        },
      });

      await expect(
        documentService.reviewDocument({
          documentId: upload.documentId,
          action: 'reject',
          rejectionReason: '', // Empty reason
          userId,
        })
      ).rejects.toThrow('A valid rejection reason is mandatory when rejecting a document');
    });
  });

  describe('4. Phase 6 COGS & Cancelled-Order Stock Reversal Fix', () => {
    it('correctly deducts order reversals attributable to cancellations from realized COGS', () => {
      // Stock movement simulation
      const stockMovements = [
        { movement_type: 'sale_consumption', reference_type: 'order_sale', total_cost: 150.0 },
        { movement_type: 'sale_consumption', reference_type: 'order_sale', total_cost: 85.5 },
        // Cancelled order reversal:
        { movement_type: 'return', reference_type: 'order_reversal', total_cost: 85.5 },
        // Regular supplier return (not attributable to order cancellation):
        { movement_type: 'return', reference_type: 'supplier_rma', total_cost: 200.0 },
      ];

      const cogs = financialReportService.calculateRealizedCOGS(stockMovements);
      // Net COGS = 150 + 85.5 - 85.5 = 150.0 (supplier RMA must not be deducted)
      expect(cogs).toBe(150.0);
    });

    it('prevents negative COGS when reversals match or exceed consumptions', () => {
      const stockMovements = [
        { movement_type: 'sale_consumption', reference_type: 'order_sale', total_cost: 50.0 },
        { movement_type: 'return', reference_type: 'order_reversal', total_cost: 75.0 },
      ];

      const cogs = financialReportService.calculateRealizedCOGS(stockMovements);
      expect(cogs).toBe(0.0);
    });
  });

  describe('5. Phase 6 Cumulative Supplier Accounts Payable Fix', () => {
    it('calculates cumulative AP as of end date including prior-period unpaid liabilities', () => {
      // Verified receipts
      const receipts = [
        // Prior month invoice (unpaid)
        { total_amount: 1000.0, status: 'verified', received_at: '2026-08-15T10:00:00Z' },
        // Current period invoice
        { total_amount: 500.0, status: 'verified', received_at: '2026-09-10T10:00:00Z' },
        // Future invoice outside reporting window
        { total_amount: 700.0, status: 'verified', received_at: '2026-10-15T10:00:00Z' },
      ];

      // Disbursements made
      const payments = [
        // Payment made in prior period
        { amount: 300.0, payment_date: '2026-08-20' },
        // Payment made in current period
        { amount: 400.0, payment_date: '2026-09-15' },
      ];

      // Report as of 2026-09-30
      const ap = financialReportService.calculateCumulativeSupplierAP(receipts, payments, '2026-09-30');

      // Cumulative Invoiced as of Sep 30 = 1000 + 500 = 1500
      expect(ap.cumulativeInvoiced).toBe(1500.0);
      // Cumulative Paid as of Sep 30 = 300 + 400 = 700
      expect(ap.cumulativePaid).toBe(700.0);
      // Outstanding Payable as of Sep 30 = 1500 - 700 = 800
      expect(ap.outstandingPayable).toBe(800.0);
    });
  });
});
