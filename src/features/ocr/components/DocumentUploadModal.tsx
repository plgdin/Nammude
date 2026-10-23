import React, { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DocumentType } from '../types';
import { documentService } from '../services/documentService';
import { UploadCloud, FileText, AlertCircle, ShieldCheck } from 'lucide-react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  branchId: string;
  onUploaded: () => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  branchId,
  onUploaded,
}) => {
  const [docType, setDocType] = useState<DocumentType>('supplier_invoice');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setDuplicateWarning(false);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const val = documentService.validateFile(file);
      if (!val.valid) {
        setError(val.error || 'Invalid file.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a document file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const res = await documentService.uploadAndProcessDocument({
        organizationId,
        branchId,
        documentType: docType,
        file: selectedFile,
      });

      if (res.isDuplicate) {
        setDuplicateWarning(true);
      }

      onUploaded();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to process document.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-brand" />
            Upload Document for OCR
          </ModalTitle>
          <ModalDescription>
            Supported formats: PDF, PNG, JPEG, WEBP (Max 10MB).
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleUpload} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-950/40 border border-amber-800 text-amber-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Notice: A document with identical file signature was previously uploaded.</span>
            </div>
          )}

          {/* Document Type Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Document Classification
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              className="w-full bg-surface-elevated border border-surface-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="supplier_invoice">Supplier Invoice (A/P Bill)</option>
              <option value="expense_receipt">Expense Receipt (OPEX Receipt)</option>
              <option value="goods_receipt_support">Goods Receipt / Delivery Note</option>
              <option value="operational_doc">Other Operational Document</option>
            </select>
          </div>

          {/* File Picker Zone */}
          <div className="border-2 border-dashed border-surface-border hover:border-brand/60 rounded-2xl p-6 text-center transition-colors bg-surface-elevated/40">
            <input
              type="file"
              id="file-upload-input"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="file-upload-input"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <FileText className="h-8 w-8 text-brand" />
              <span className="text-xs font-semibold text-white">
                {selectedFile ? selectedFile.name : 'Click to select invoice or receipt'}
              </span>
              <span className="text-[11px] text-gray-400">
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                  : 'PDF, JPG, PNG or WEBP up to 10MB'}
              </span>
            </label>
          </div>

          {/* OCR Security & Privacy Box */}
          <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border text-xs text-gray-400 space-y-1">
            <div className="flex items-center gap-1.5 text-gray-300 font-semibold text-[11px]">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Two-Stage Human Verification Policy
            </div>
            <p className="text-[10px] leading-relaxed">
              OCR extraction generates draft candidate fields only. Extracted values will not create financial transactions or stock movements until verified by an authorized staff member.
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-surface-border">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isUploading || !selectedFile}>
              {isUploading ? 'Extracting OCR...' : 'Upload & Extract'}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};
