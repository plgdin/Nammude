import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/currency';
import { DocumentRecord, DocumentExtractionRecord } from '../types';
import { documentService } from '../services/documentService';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Cpu,
} from 'lucide-react';

interface DocumentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentRecord | null;
  extraction: DocumentExtractionRecord | null;
  organizationId: string;
  branchId: string;
  onReviewCompleted: () => void;
}

export const DocumentReviewModal: React.FC<DocumentReviewModalProps> = ({
  isOpen,
  onClose,
  document,
  extraction,
  organizationId,
  branchId,
  onReviewCompleted,
}) => {
  const [vendorName, setVendorName] = useState<string>('');
  const [docNumber, setDocNumber] = useState<string>('');
  const [docDate, setDocDate] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<string>('Kitchen Supplies & Disposables');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'bank_transfer' | 'other'>('card');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document && extraction) {
      const data = extraction.corrected_data || extraction.extracted_data || {};
      setVendorName(
        data.supplier_name?.value || data.merchant_name?.value || data.supplier_name || data.merchant_name || ''
      );
      setDocNumber(
        data.invoice_number?.value || data.document_reference?.value || data.invoice_number || ''
      );
      setDocDate(
        data.invoice_date?.value || data.transaction_date?.value || data.delivery_date?.value || new Date().toISOString().split('T')[0]
      );
      setTotalAmount(
        String(data.total_amount?.value ?? data.amount?.value ?? data.total_amount ?? data.amount ?? '')
      );
      if (data.suggested_category_name?.value) {
        setExpenseCategory(data.suggested_category_name.value);
      }
      setIsRejecting(false);
      setError(null);
    }
  }, [document, extraction]);

  if (!document) return null;

  const handleVerifyAndPost = async () => {
    const numAmount = parseFloat(totalAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please provide a valid verified total amount greater than 0.');
      return;
    }
    if (!vendorName.trim()) {
      setError('Vendor / Supplier name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (document.document_type === 'expense_receipt') {
        // Stage 1: Human verification of candidate OCR extraction
        await documentService.reviewDocument({
          documentId: document.id,
          action: 'verify',
          correctedData: {
            merchant_name: vendorName,
            amount: numAmount,
            expense_category: expenseCategory,
          },
        });

        // Stage 2: Post verified receipt to Phase 6 expense ledger
        await documentService.confirmAndPostExpense({
          documentId: document.id,
          organizationId,
          branchId,
          expenseData: {
            categoryName: expenseCategory,
            description: `${vendorName} - Receipt #${docNumber || document.id.slice(0, 8)}`,
            amount: numAmount,
            paymentMethod,
            payeeName: vendorName,
            incurredDate: docDate,
          },
        });
      } else {
        // Verify invoice reference
        await documentService.reviewDocument({
          documentId: document.id,
          action: 'verify',
          correctedData: {
            supplier_name: vendorName,
            invoice_number: docNumber,
            invoice_date: docDate,
            total_amount: numAmount,
          },
        });
      }

      onReviewCompleted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to verify document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a rejection reason.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await documentService.reviewDocument({
        documentId: document.id,
        action: 'reject',
        rejectionReason: rejectionReason.trim(),
      });

      onReviewCompleted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to reject document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confidenceScore = extraction?.confidence_score ?? 0.9;
  const isHighConfidence = confidenceScore >= 0.85;

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-2xl">
        <ModalHeader>
          <div className="flex items-center justify-between">
            <ModalTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand" />
              OCR Human Review & Verification
            </ModalTitle>
            <Badge variant={isHighConfidence ? 'success' : 'warning'} size="sm">
              <Cpu className="h-3 w-3 mr-1" />
              {(confidenceScore * 100).toFixed(0)}% Confidence
            </Badge>
          </div>
          <ModalDescription>
            {document.file_name} • Classified as {document.document_type.replace('_', ' ')}
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Provider Label Note */}
          <div className="p-2.5 rounded-xl bg-surface-elevated border border-surface-border flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-brand" />
              Extracted via: <strong className="text-gray-200">{extraction?.provider || 'Mock OCR Adapter'}</strong>
            </span>
            <span className="text-[11px] text-amber-400 font-mono">Simulated Extraction Mode</span>
          </div>

          {!isRejecting ? (
            <div className="space-y-3">
              {/* Vendor / Supplier */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Vendor / Supplier Name
                </label>
                <div className="flex gap-2 items-center">
                  <Input
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="e.g. Metro Supply Co."
                  />
                  <Badge variant="neutral" size="sm">
                    {extraction?.extracted_data?.supplier_name?.confidence ? `${(extraction.extracted_data.supplier_name.confidence * 100).toFixed(0)}%` : 'Verified'}
                  </Badge>
                </div>
              </div>

              {/* Document Number & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Invoice / Receipt Number
                  </label>
                  <Input
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="e.g. INV-99021"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Document Date
                  </label>
                  <Input
                    type="date"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Total Amount & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Verified Total Amount ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    {document.document_type === 'expense_receipt' ? 'OPEX Category' : 'Payment Terms'}
                  </label>
                  {document.document_type === 'expense_receipt' ? (
                    <Input
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                    />
                  ) : (
                    <Input value="Net 30 Days" disabled />
                  )}
                </div>
              </div>

              {document.document_type === 'expense_receipt' && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Payment Tender Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-surface-elevated border border-surface-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="card">Company Card</option>
                    <option value="cash">Register Cash / Petty</option>
                    <option value="bank_transfer">Bank Wire</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {/* Extracted Line Items Preview if present */}
              {extraction?.extracted_data?.line_items && extraction.extracted_data.line_items.length > 0 && (
                <div className="border border-surface-border rounded-xl p-3 bg-surface-elevated space-y-2">
                  <span className="text-[11px] font-bold text-gray-300 uppercase font-mono">
                    Extracted Line Items ({extraction.extracted_data.line_items.length})
                  </span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 text-xs">
                    {extraction.extracted_data.line_items.map((li: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-gray-300 py-1 border-b border-surface-border/50 text-[11px]">
                        <span>{li.description || li.item_name} (x{li.quantity || li.received_quantity})</span>
                        <span className="font-semibold text-white">{formatCurrency(li.total_price || 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-red-300">
                Reason for Rejection
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Document image is blurry, illegible amounts, or missing vendor details"
                className="w-full bg-surface-elevated border border-surface-border rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500 h-24 resize-none"
                autoFocus
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-3 border-t border-surface-border">
            {!isRejecting ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => setIsRejecting(true)}
                  disabled={isSubmitting}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Reject Document
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="button" variant="primary" onClick={handleVerifyAndPost} disabled={isSubmitting}>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    {document.document_type === 'expense_receipt'
                      ? 'Verify & Post to OPEX'
                      : 'Verify & Confirm Invoice'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsRejecting(false)}
                  disabled={isSubmitting}
                >
                  Back to Review
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleReject}
                  disabled={isSubmitting}
                >
                  Confirm Rejection
                </Button>
              </>
            )}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
};
