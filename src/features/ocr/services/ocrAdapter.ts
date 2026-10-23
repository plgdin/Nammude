import {
  DocumentType,
  ExtractedInvoiceData,
  ExtractedExpenseData,
  ExtractedGoodsReceiptData,
} from '../types';

export interface OCRProcessingResult {
  provider: string;
  isSimulated: boolean;
  rawText: string;
  overallConfidence: number;
  data: ExtractedInvoiceData | ExtractedExpenseData | ExtractedGoodsReceiptData;
}

export interface OCRAdapter {
  readonly providerName: string;
  readonly isSimulated: boolean;
  processDocument(
    fileMeta: { name: string; size: number; mimeType: string },
    docType: DocumentType
  ): Promise<OCRProcessingResult>;
}

/**
 * Clearly labelled Mock OCR Adapter for development & offline environments.
 * Generates realistic candidate fields with explicit confidence scores.
 *
 * PRODUCTION SETUP NOTE:
 * To configure a production OCR provider:
 * 1. Deploy a secure Supabase Edge Function (e.g. `supabase/functions/ocr-extractor`).
 * 2. Store AWS Textract / Google Document AI credentials in Supabase Vault / Secrets.
 * 3. Never expose cloud OCR API credentials or service role keys in the browser bundle.
 */
export class MockOCRAdapter implements OCRAdapter {
  readonly providerName = 'mock_adapter (Simulated Heuristic OCR)';
  readonly isSimulated = true;

  async processDocument(
    fileMeta: { name: string; size: number; mimeType: string },
    docType: DocumentType
  ): Promise<OCRProcessingResult> {
    // Simulate lightweight extraction latency (300ms)
    await new Promise((r) => setTimeout(r, 300));

    const today = new Date().toISOString().split('T')[0];
    const fileName = fileMeta.name.toLowerCase();

    if (docType === 'supplier_invoice') {
      const isProduce = fileName.includes('produce') || fileName.includes('farm');
      const supplierName = isProduce ? 'Organic Farms Direct' : 'Metro Restaurant Supply Co.';
      const invNum = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
      const subtotal = isProduce ? 240.5 : 485.0;
      const tax = Number((subtotal * 0.0825).toFixed(2));
      const total = subtotal + tax;

      const data: ExtractedInvoiceData = {
        supplier_name: { value: supplierName, confidence: 0.94 },
        invoice_number: { value: invNum, confidence: 0.98 },
        invoice_date: { value: today, confidence: 0.95 },
        due_date: { value: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], confidence: 0.88 },
        currency: { value: 'USD', confidence: 0.99 },
        subtotal: { value: subtotal, confidence: 0.92 },
        tax: { value: tax, confidence: 0.90 },
        total_amount: { value: total, confidence: 0.96 },
        po_reference: { value: 'PO-20261023-01', confidence: 0.78, is_flagged_uncertain: true },
        line_items: [
          {
            description: isProduce ? 'Organic Hass Avocados (Case of 24)' : 'Commercial Bleach & Sanitizer (4x1 Gal)',
            quantity: 2,
            unit_price: isProduce ? 45.0 : 35.0,
            total_price: isProduce ? 90.0 : 70.0,
            confidence: 0.93,
          },
          {
            description: isProduce ? 'Fresh Roma Tomatoes (25 lb box)' : 'Heavy Duty Kitchen Foil Roll (18" x 500\')',
            quantity: 3,
            unit_price: isProduce ? 32.5 : 45.0,
            total_price: isProduce ? 97.5 : 135.0,
            confidence: 0.89,
          },
        ],
        raw_text: `INVOICE: ${invNum}\nSUPPLIER: ${supplierName}\nDATE: ${today}\nSUBTOTAL: $${subtotal}\nTAX: $${tax}\nTOTAL: $${total}\nPO REF: PO-20261023-01`,
      };

      return {
        provider: this.providerName,
        isSimulated: true,
        rawText: data.raw_text || '',
        overallConfidence: 0.92,
        data,
      };
    } else if (docType === 'expense_receipt') {
      const isHardware = fileName.includes('hardware') || fileName.includes('depot');
      const merchant = isHardware ? 'City Hardware & Tools' : 'Office & Kitchen Supercenter';
      const amount = isHardware ? 64.5 : 42.8;
      const tax = Number((amount * 0.0825).toFixed(2));

      const data: ExtractedExpenseData = {
        merchant_name: { value: merchant, confidence: 0.91 },
        transaction_date: { value: today, confidence: 0.96 },
        currency: { value: 'USD', confidence: 0.99 },
        amount: { value: amount, confidence: 0.94 },
        tax: { value: tax, confidence: 0.88 },
        payment_method: { value: 'card', confidence: 0.95 },
        suggested_category_name: {
          value: isHardware ? 'Repairs & Maintenance' : 'Kitchen Supplies & Disposables',
          confidence: 0.82,
        },
        raw_text: `RECEIPT: ${merchant}\nDATE: ${today}\nTOTAL PAID: $${amount}\nTAX: $${tax}\nTENDER: VISA ending 4012`,
      };

      return {
        provider: this.providerName,
        isSimulated: true,
        rawText: data.raw_text || '',
        overallConfidence: 0.91,
        data,
      };
    } else {
      // goods_receipt_support or operational_doc
      const data: ExtractedGoodsReceiptData = {
        supplier_name: { value: 'Regional Foods Distribution', confidence: 0.88 },
        document_reference: { value: `DEL-${Date.now().toString().slice(-6)}`, confidence: 0.93 },
        delivery_date: { value: today, confidence: 0.94 },
        line_items: [
          {
            item_name: 'Espresso Whole Milk',
            received_quantity: 12,
            unit: 'L',
            confidence: 0.92,
            batch_number: 'B-9921',
            expiry_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          },
        ],
        raw_text: `DELIVERY NOTE\nSUPPLIER: Regional Foods\nDATE: ${today}\nITEM: Espresso Whole Milk (12L)\nBATCH: B-9921`,
      };

      return {
        provider: this.providerName,
        isSimulated: true,
        rawText: data.raw_text || '',
        overallConfidence: 0.90,
        data,
      };
    }
  }
}

export const defaultOCRAdapter: OCRAdapter = new MockOCRAdapter();
