import { describe, it, expect } from 'vitest';
import { documentService } from '@/features/ocr/services/documentService';
import { defaultOCRAdapter } from '@/features/ocr/services/ocrAdapter';
import { ExtractedInvoiceData, ExtractedExpenseData } from '@/features/ocr/types';

describe('Phase 7: Secure Document Ingestion & OCR Processing', () => {
  const orgId = '11111111-1111-1111-1111-111111111111';
  const branchId = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const otherOrgId = '22222222-2222-2222-2222-222222222222';

  describe('Workstream A: File Ingestion & Validation Security', () => {
    it('validates allowed MIME types (PDF, JPEG, PNG, WebP)', () => {
      const pdf = documentService.validateFile({
        name: 'invoice.pdf',
        size: 1024 * 500,
        type: 'application/pdf',
      });
      expect(pdf.valid).toBe(true);

      const jpeg = documentService.validateFile({
        name: 'receipt.jpg',
        size: 1024 * 300,
        type: 'image/jpeg',
      });
      expect(jpeg.valid).toBe(true);

      const png = documentService.validateFile({
        name: 'slip.png',
        size: 1024 * 200,
        type: 'image/png',
      });
      expect(png.valid).toBe(true);
    });

    it('rejects unsupported MIME types safely', () => {
      const zip = documentService.validateFile({
        name: 'archive.zip',
        size: 1024 * 500,
        type: 'application/zip',
      });
      expect(zip.valid).toBe(false);
      expect(zip.error).toContain('Unsupported file type');

      const wordDoc = documentService.validateFile({
        name: 'invoice.docx',
        size: 1024 * 500,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      expect(wordDoc.valid).toBe(false);
    });

    it('strictly rejects executable file extensions regardless of spoofed MIME type', () => {
      const badExtensions = ['script.exe', 'payload.bat', 'hook.sh', 'macro.cmd', 'exploit.vbs'];
      for (const fname of badExtensions) {
        const res = documentService.validateFile({
          name: fname,
          size: 1024 * 100,
          type: 'application/pdf', // spoofed mime type
        });
        expect(res.valid).toBe(false);
        expect(res.error).toContain('is strictly prohibited');
      }
    });

    it('enforces maximum file size limit (10MB)', () => {
      const oversized = documentService.validateFile({
        name: 'large_scan.pdf',
        size: 11 * 1024 * 1024,
        type: 'application/pdf',
      });
      expect(oversized.valid).toBe(false);
      expect(oversized.error).toContain('exceeds maximum permitted');
    });

    it('enforces tenant-isolated storage path generation', async () => {
      const res = await documentService.uploadAndProcessDocument({
        organizationId: orgId,
        branchId,
        documentType: 'supplier_invoice',
        file: {
          name: 'produce_delivery_101.pdf',
          size: 250000,
          type: 'application/pdf',
        },
      });

      expect(res.success).toBe(true);
      expect(res.document).toBeDefined();
      expect(res.document?.file_path).toContain(`org_${orgId}/branch_${branchId}/`);
      // Path must NOT leak or reference another organization
      expect(res.document?.file_path).not.toContain(otherOrgId);
    });
  });

  describe('Workstream B: OCR Extraction & Confidence Representation', () => {
    it('extracts candidate fields with explicit confidence scores via OCR adapter', async () => {
      const ocrResult = await defaultOCRAdapter.processDocument(
        {
          name: 'metro_supply_invoice.pdf',
          size: 450000,
          mimeType: 'application/pdf',
        },
        'supplier_invoice'
      );

      expect(ocrResult.isSimulated).toBe(true);
      expect(ocrResult.provider).toContain('mock_adapter');
      expect(ocrResult.overallConfidence).toBeGreaterThan(0.7);

      const invData = ocrResult.data as ExtractedInvoiceData;
      expect(invData.supplier_name.value).toBeDefined();
      expect(invData.supplier_name.confidence).toBeGreaterThan(0.8);
      expect(invData.invoice_number.value).toBeDefined();
      expect(invData.total_amount.value).toBeGreaterThan(0);
      expect(Array.isArray(invData.line_items)).toBe(true);
      expect(invData.line_items.length).toBeGreaterThan(0);
    });

    it('extracts candidate expense receipts with category recommendation', async () => {
      const ocrResult = await defaultOCRAdapter.processDocument(
        {
          name: 'hardware_repair_receipt.png',
          size: 120000,
          mimeType: 'image/png',
        },
        'expense_receipt'
      );

      const expData = ocrResult.data as ExtractedExpenseData;
      expect(expData.merchant_name.value).toBeDefined();
      expect(expData.amount.value).toBeGreaterThan(0);
      expect(expData.suggested_category_name?.value).toBeDefined();
    });
  });

  describe('Workstream C: Human Verification & Financial Posting Guard', () => {
    it('prevents direct financial posting from unverified documents', async () => {
      // Create an unverified uploaded document
      const upload = await documentService.uploadAndProcessDocument({
        organizationId: orgId,
        branchId,
        documentType: 'expense_receipt',
        file: {
          name: 'coffee_beans_sample.jpg',
          size: 85000,
          type: 'image/jpeg',
        },
      });

      expect(upload.success).toBe(true);
      const doc = upload.document!;
      expect(doc.status).toBe('needs_review');

      // Attempting to post unverified document to expense ledger must fail
      const postAttempt = await documentService.confirmAndPostExpense({
        documentId: doc.id,
        organizationId: orgId,
        branchId,
        amount: 45.0,
        expenseCategory: 'kitchen_supplies',
        merchantName: 'Sample Roasters',
      });

      expect(postAttempt.success).toBe(false);
      expect(postAttempt.error).toContain('Document must be verified');
    });

    it('requires human review and transitions status to verified before posting', async () => {
      const upload = await documentService.uploadAndProcessDocument({
        organizationId: orgId,
        branchId,
        documentType: 'expense_receipt',
        file: {
          name: 'sanitizer_purchase.png',
          size: 95000,
          type: 'image/png',
        },
      });

      const docId = upload.document!.id;

      // Human review action
      const reviewRes = await documentService.reviewDocument({
        documentId: docId,
        action: 'verify',
        correctedData: {
          merchant_name: 'Sanitary Supplies Direct',
          total: 82.5,
          expense_category: 'kitchen_supplies',
        },
        userId: 'u1111111-0000-0000-0000-000000000001',
      });

      expect(reviewRes.success).toBe(true);
      expect(reviewRes.document?.status).toBe('verified');
      expect(reviewRes.document?.reviewed_at).toBeDefined();

      // Now authorized staff can post to expense ledger
      const postRes = await documentService.confirmAndPostExpense({
        documentId: docId,
        organizationId: orgId,
        branchId,
        amount: 82.5,
        expenseCategory: 'kitchen_supplies',
        merchantName: 'Sanitary Supplies Direct',
      });

      expect(postRes.success).toBe(true);
      expect(postRes.expenseId).toBeDefined();

      // Preventing double posting of same receipt
      const doublePostRes = await documentService.confirmAndPostExpense({
        documentId: docId,
        organizationId: orgId,
        branchId,
        amount: 82.5,
        expenseCategory: 'kitchen_supplies',
        merchantName: 'Sanitary Supplies Direct',
      });

      expect(doublePostRes.success).toBe(false);
      expect(doublePostRes.error).toContain('already been posted');
    });

    it('handles document rejection with required reason', async () => {
      const upload = await documentService.uploadAndProcessDocument({
        organizationId: orgId,
        branchId,
        documentType: 'supplier_invoice',
        file: {
          name: 'blurry_unreadable_bill.pdf',
          size: 150000,
          type: 'application/pdf',
        },
      });

      const docId = upload.document!.id;

      const rejectRes = await documentService.reviewDocument({
        documentId: docId,
        action: 'reject',
        rejectionReason: 'Total amount is illegible due to water damage on scan',
        userId: 'u1111111-0000-0000-0000-000000000001',
      });

      expect(rejectRes.success).toBe(true);
      expect(rejectRes.document?.status).toBe('rejected');
      expect(rejectRes.document?.rejection_reason).toBe(
        'Total amount is illegible due to water damage on scan'
      );
    });
  });
});
