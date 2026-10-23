export type DocumentType =
  | 'supplier_invoice'
  | 'expense_receipt'
  | 'goods_receipt_support'
  | 'operational_doc';

export type DocumentStatus =
  | 'uploaded'
  | 'queued'
  | 'processing'
  | 'needs_review'
  | 'verified'
  | 'rejected'
  | 'failed';

export interface DocumentRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  mime_type: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
  file_hash: string | null;
  status: DocumentStatus;
  rejection_reason: string | null;
  error_message: string | null;
  uploaded_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  verified_at: string | null;
  metadata: {
    is_potential_duplicate?: boolean;
    extracted_supplier_name?: string;
    extracted_total_amount?: number;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface CandidateField<T> {
  value: T;
  confidence: number; // 0.00 to 1.00
  is_flagged_uncertain?: boolean;
}

export interface ExtractedLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  confidence: number;
}

export interface ExtractedInvoiceData {
  supplier_name: CandidateField<string>;
  invoice_number: CandidateField<string>;
  invoice_date: CandidateField<string>;
  due_date?: CandidateField<string | null>;
  currency: CandidateField<string>;
  subtotal: CandidateField<number>;
  tax: CandidateField<number>;
  total_amount: CandidateField<number>;
  po_reference?: CandidateField<string | null>;
  line_items: ExtractedLineItem[];
  suggested_supplier_id?: string | null;
  suggested_po_id?: string | null;
  raw_text?: string;
}

export interface ExtractedExpenseData {
  merchant_name: CandidateField<string>;
  transaction_date: CandidateField<string>;
  currency: CandidateField<string>;
  amount: CandidateField<number>;
  tax: CandidateField<number>;
  payment_method: CandidateField<'cash' | 'card' | 'bank_transfer' | 'other'>;
  suggested_category_name?: CandidateField<string>;
  suggested_category_id?: string | null;
  raw_text?: string;
}

export interface ExtractedGoodsReceiptData {
  supplier_name: CandidateField<string>;
  document_reference: CandidateField<string>;
  delivery_date: CandidateField<string>;
  line_items: Array<{
    item_name: string;
    received_quantity: number;
    unit: string;
    confidence: number;
    batch_number?: string;
    expiry_date?: string;
  }>;
  suggested_supplier_id?: string | null;
  raw_text?: string;
}

export interface DocumentExtractionRecord {
  id: string;
  organization_id: string;
  document_id: string;
  provider: string; // 'mock_adapter' | 'aws_textract' | 'google_vision'
  raw_text: string | null;
  confidence_score: number | null;
  extracted_data: ExtractedInvoiceData | ExtractedExpenseData | ExtractedGoodsReceiptData | any;
  corrected_data: any | null;
  matched_entity_type: 'supplier' | 'expense' | 'purchase_order' | 'goods_receipt' | null;
  matched_entity_id: string | null;
  created_at: string;
  updated_at: string;
}
