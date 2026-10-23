import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import {
  DocumentRecord,
  DocumentExtractionRecord,
  DocumentType,
  DocumentStatus,
} from '../types';
import { defaultOCRAdapter } from './ocrAdapter';
import { expenseService } from '@/features/financials/services/expenseService';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// In-memory fallback store for offline / dev mock mode
let localDocuments: DocumentRecord[] = [
  {
    id: 'doc-11111111-0000-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    document_type: 'supplier_invoice',
    file_name: 'Metro_Supply_Invoice_48291.pdf',
    file_path: 'org_11111111-1111-1111-1111-111111111111/branch_11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa/doc-1_invoice.pdf',
    file_size_bytes: 421800,
    mime_type: 'application/pdf',
    file_hash: 'hash-mock-inv-001',
    status: 'needs_review',
    rejection_reason: null,
    error_message: null,
    uploaded_by: null,
    reviewed_by: null,
    reviewed_at: null,
    verified_at: null,
    metadata: {
      is_potential_duplicate: false,
      extracted_supplier_name: 'Metro Restaurant Supply Co.',
      extracted_total_amount: 525.01,
    },
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'doc-11111111-0000-0000-0000-000000000002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    document_type: 'expense_receipt',
    file_name: 'Hardware_Store_Receipt.png',
    file_path: 'org_11111111-1111-1111-1111-111111111111/branch_11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa/doc-2_receipt.png',
    file_size_bytes: 185400,
    mime_type: 'image/png',
    file_hash: 'hash-mock-rec-002',
    status: 'needs_review',
    rejection_reason: null,
    error_message: null,
    uploaded_by: null,
    reviewed_by: null,
    reviewed_at: null,
    verified_at: null,
    metadata: {
      is_potential_duplicate: false,
      extracted_supplier_name: 'City Hardware & Tools',
      extracted_total_amount: 64.5,
    },
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

let localExtractions: DocumentExtractionRecord[] = [
  {
    id: 'ext-001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    document_id: 'doc-11111111-0000-0000-0000-000000000001',
    provider: 'mock_adapter (Simulated Heuristic OCR)',
    raw_text: 'INVOICE: INV-482910\nSUPPLIER: Metro Restaurant Supply Co.\nDATE: 2026-10-23\nSUBTOTAL: $485.00\nTAX: $40.01\nTOTAL: $525.01',
    confidence_score: 0.94,
    extracted_data: {
      supplier_name: { value: 'Metro Restaurant Supply Co.', confidence: 0.96 },
      invoice_number: { value: 'INV-482910', confidence: 0.98 },
      invoice_date: { value: '2026-10-23', confidence: 0.95 },
      due_date: { value: '2026-11-22', confidence: 0.88 },
      currency: { value: 'USD', confidence: 0.99 },
      subtotal: { value: 485.0, confidence: 0.92 },
      tax: { value: 40.01, confidence: 0.90 },
      total_amount: { value: 525.01, confidence: 0.96 },
      po_reference: { value: 'PO-20261023-01', confidence: 0.79, is_flagged_uncertain: true },
      line_items: [
        {
          description: 'Commercial Bleach & Sanitizer (4x1 Gal)',
          quantity: 2,
          unit_price: 35.0,
          total_price: 70.0,
          confidence: 0.93,
        },
        {
          description: 'Heavy Duty Kitchen Foil Roll (18" x 500\')',
          quantity: 3,
          unit_price: 45.0,
          total_price: 135.0,
          confidence: 0.89,
        },
      ],
    },
    corrected_data: null,
    matched_entity_type: 'supplier',
    matched_entity_id: 's1111111-0000-0000-0000-000000000001',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'ext-002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    document_id: 'doc-11111111-0000-0000-0000-000000000002',
    provider: 'mock_adapter (Simulated Heuristic OCR)',
    raw_text: 'RECEIPT: City Hardware & Tools\nDATE: 2026-10-23\nTOTAL PAID: $64.50\nTAX: $5.32\nTENDER: VISA ending 4012',
    confidence_score: 0.92,
    extracted_data: {
      merchant_name: { value: 'City Hardware & Tools', confidence: 0.94 },
      transaction_date: { value: '2026-10-23', confidence: 0.96 },
      currency: { value: 'USD', confidence: 0.99 },
      amount: { value: 64.5, confidence: 0.95 },
      tax: { value: 5.32, confidence: 0.89 },
      payment_method: { value: 'card', confidence: 0.95 },
      suggested_category_name: { value: 'Repairs & Maintenance', confidence: 0.85 },
    },
    corrected_data: null,
    matched_entity_type: 'expense',
    matched_entity_id: null,
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

export const documentService = {
  /**
   * Validate file parameters before transmission
   */
  validateFile(file: { name: string; size: number; type: string }): { valid: boolean; error?: string } {
    if (!file || !file.name) {
      return { valid: false, error: 'No file provided.' };
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    const disallowedExtensions = ['exe', 'bat', 'sh', 'cmd', 'js', 'vbs', 'php', 'py'];
    if (ext && disallowedExtensions.includes(ext)) {
      return { valid: false, error: `Executable or script format (.${ext}) is strictly prohibited.` };
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported file type (${file.type}). Allowed formats: PDF, JPEG, PNG, WEBP.`,
      };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum permitted 10MB limit.`,
      };
    }
    return { valid: true };
  },

  /**
   * Upload, queue, and process document through OCR extraction pipeline
   */
  async uploadAndProcessDocument(params: {
    organizationId: string;
    branchId: string;
    documentType: DocumentType;
    file: { name: string; size: number; type: string };
  }): Promise<{ success: boolean; documentId: string; document?: DocumentRecord; status: DocumentStatus; isDuplicate?: boolean }> {
    const val = this.validateFile(params.file);
    if (!val.valid) {
      throw new Error(val.error);
    }

    // Generate tenant-scoped storage path
    const docId = `doc-${Date.now()}`;
    const cleanFileName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const tenantScopedPath = `org_${params.organizationId}/branch_${params.branchId}/${docId}_${cleanFileName}`;

    // Fingerprint simulation for idempotency
    const fileHash = `hash-${params.file.name}-${params.file.size}`;

    // Run OCR Extraction via adapter
    const ocrResult = await defaultOCRAdapter.processDocument(
      {
        name: params.file.name,
        size: params.file.size,
        mimeType: params.file.type,
      },
      params.documentType
    );

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.rpc as any)('ingest_document', {
          p_organization_id: params.organizationId,
          p_branch_id: params.branchId,
          p_document_type: params.documentType,
          p_file_name: params.file.name,
          p_file_path: tenantScopedPath,
          p_file_size_bytes: params.file.size,
          p_mime_type: params.file.type,
          p_file_hash: fileHash,
          p_initial_extracted_data: ocrResult.data,
          p_confidence_score: ocrResult.overallConfidence,
        });

        if (!error && data) {
          return {
            success: true,
            documentId: data.document_id,
            status: data.status,
            isDuplicate: data.is_duplicate,
          };
        }
      } catch (err) {
        console.warn('[documentService] Remote ingest_document failed, using local store:', err);
      }
    }

    // Local fallback
    const isDuplicate = localDocuments.some(
      (d) => d.organization_id === params.organizationId && d.file_hash === fileHash
    );

    const newDoc: DocumentRecord = {
      id: docId,
      organization_id: params.organizationId,
      branch_id: params.branchId,
      document_type: params.documentType,
      file_name: params.file.name,
      file_path: tenantScopedPath,
      file_size_bytes: params.file.size,
      mime_type: params.file.type as any,
      file_hash: fileHash,
      status: 'needs_review',
      rejection_reason: null,
      error_message: null,
      uploaded_by: null,
      reviewed_by: null,
      reviewed_at: null,
      verified_at: null,
      metadata: {
        is_potential_duplicate: isDuplicate,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localDocuments.unshift(newDoc);

    const newExtraction: DocumentExtractionRecord = {
      id: `ext-${Date.now()}`,
      organization_id: params.organizationId,
      document_id: docId,
      provider: ocrResult.provider,
      raw_text: ocrResult.rawText,
      confidence_score: ocrResult.overallConfidence,
      extracted_data: ocrResult.data,
      corrected_data: null,
      matched_entity_type: params.documentType === 'supplier_invoice' ? 'supplier' : params.documentType === 'expense_receipt' ? 'expense' : null,
      matched_entity_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localExtractions.push(newExtraction);

    return {
      success: true,
      documentId: docId,
      document: newDoc,
      status: 'needs_review',
      isDuplicate,
    };
  },

  /**
   * Get documents for branch inbox
   */
  async getDocuments(params: {
    organizationId: string;
    branchId?: string;
    status?: DocumentStatus;
    type?: DocumentType;
  }): Promise<DocumentRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        let query = (supabase.from('documents') as any)
          .select('*')
          .eq('organization_id', params.organizationId)
          .order('created_at', { ascending: false });

        if (params.branchId) query = query.eq('branch_id', params.branchId);
        if (params.status) query = query.eq('status', params.status);
        if (params.type) query = query.eq('document_type', params.type);

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data as DocumentRecord[];
        }
      } catch (err) {
        console.warn('[documentService] Remote fetch documents failed, falling back:', err);
      }
    }

    return localDocuments.filter((d) => {
      if (params.branchId && d.branch_id !== params.branchId) return false;
      if (params.status && d.status !== params.status) return false;
      if (params.type && d.document_type !== params.type) return false;
      return true;
    });
  },

  /**
   * Get document and associated extraction data
   */
  async getDocumentDetail(documentId: string): Promise<{
    document: DocumentRecord;
    extraction: DocumentExtractionRecord | null;
  } | null> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data: docData } = await (supabase.from('documents') as any)
          .select('*')
          .eq('id', documentId)
          .single();

        const { data: extData } = await (supabase.from('document_extractions') as any)
          .select('*')
          .eq('document_id', documentId)
          .maybeSingle();

        if (docData) {
          return {
            document: docData as DocumentRecord,
            extraction: extData as DocumentExtractionRecord | null,
          };
        }
      } catch (err) {
        console.warn('[documentService] Remote getDocumentDetail failed, falling back:', err);
      }
    }

    const doc = localDocuments.find((d) => d.id === documentId);
    if (!doc) return null;
    const ext = localExtractions.find((e) => e.document_id === documentId) || null;
    return { document: doc, extraction: ext };
  },

  /**
   * Human review gate: verify with corrections or reject
   */
  async reviewDocument(params: {
    documentId: string;
    action: 'verify' | 'reject';
    correctedData?: any;
    rejectionReason?: string;
    userId?: string;
  }): Promise<{ success: boolean; status: DocumentStatus; document?: DocumentRecord }> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.rpc as any)('review_document', {
          p_document_id: params.documentId,
          p_action: params.action,
          p_corrected_data: params.correctedData || null,
          p_rejection_reason: params.rejectionReason || null,
        });

        if (!error && data) {
          return { success: true, status: data.status };
        }
      } catch (err) {
        console.warn('[documentService] Remote review_document failed, falling back:', err);
      }
    }

    const doc = localDocuments.find((d) => d.id === params.documentId);
    if (!doc) throw new Error(`Document ${params.documentId} not found`);

    const ext = localExtractions.find((e) => e.document_id === params.documentId);

    if (params.action === 'verify') {
      doc.status = 'verified';
      doc.reviewed_by = params.userId || null;
      doc.reviewed_at = new Date().toISOString();
      doc.verified_at = new Date().toISOString();
      if (ext && params.correctedData) {
        ext.corrected_data = params.correctedData;
        ext.updated_at = new Date().toISOString();
      }
    } else {
      doc.status = 'rejected';
      doc.reviewed_by = params.userId || null;
      doc.rejection_reason = params.rejectionReason || 'Rejected during review';
      doc.reviewed_at = new Date().toISOString();
    }
    doc.updated_at = new Date().toISOString();

    return { success: true, status: doc.status, document: doc };
  },

  /**
   * Workstream C: Two-stage confirmation converting verified receipt to recorded OPEX expense
   */
  async confirmAndPostExpense(params: {
    documentId: string;
    organizationId: string;
    branchId: string;
    expenseData?: {
      categoryName: string;
      description: string;
      amount: number;
      paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other';
      payeeName: string;
      incurredDate: string;
    };
    amount?: number;
    expenseCategory?: string;
    merchantName?: string;
    paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'other';
    incurredDate?: string;
  }): Promise<{ success: boolean; expenseId?: string; error?: string }> {
    const doc = localDocuments.find((d) => d.id === params.documentId);
    if (!doc) {
      return { success: false, error: `Document ${params.documentId} not found` };
    }

    // Gating: Document must be in 'verified' status before posting to financials
    if (doc.status !== 'verified') {
      return {
        success: false,
        error: 'Document must be verified by staff before posting to expenses.',
      };
    }

    // Duplicate check: Prevent same receipt from being posted twice
    if (doc.metadata?.posted_expense_id) {
      return {
        success: false,
        error: 'This document has already been posted to the expense ledger.',
      };
    }

    const category = params.expenseData?.categoryName || params.expenseCategory || 'kitchen_supplies';
    const amountVal = params.expenseData?.amount ?? params.amount ?? 0;
    const payee = params.expenseData?.payeeName || params.merchantName || 'Supplier';
    const payMethod = params.expenseData?.paymentMethod || params.paymentMethod || 'card';
    const dateVal = params.expenseData?.incurredDate || params.incurredDate || new Date().toISOString().split('T')[0];
    const desc = params.expenseData?.description || `${payee} - Document ${doc.file_name}`;

    // Post to Phase 6 expense ledger
    const expense = await expenseService.recordExpense({
      organizationId: params.organizationId,
      branchId: params.branchId,
      categoryName: category,
      description: `[OCR Verified] ${desc}`,
      amount: amountVal,
      paymentMethod: payMethod as any,
      paymentStatus: 'paid',
      payeeName: payee,
      incurredDate: dateVal,
      idempotencyKey: `ocr-exp-${params.documentId}`,
    });

    doc.metadata = {
      ...(doc.metadata || {}),
      posted_expense_id: expense.id,
    };
    doc.updated_at = new Date().toISOString();

    return { success: true, expenseId: expense.id };
  },
};
