import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BranchConfig } from '@/config/tenant.config';
import { useOrganization } from '@/features/organization/OrganizationContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/currency';
import { DocumentRecord, DocumentStatus, DocumentType } from './types';
import { documentService } from './services/documentService';
import { DocumentUploadModal } from './components/DocumentUploadModal';
import { DocumentReviewModal } from './components/DocumentReviewModal';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Eye,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export const DocumentsScreen: React.FC = () => {
  const { selectedBranch } = useOutletContext<{ selectedBranch: BranchConfig }>();
  const { currentOrganization } = useOrganization();

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal states
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [reviewDoc, setReviewDoc] = useState<DocumentRecord | null>(null);
  const [reviewExtraction, setReviewExtraction] = useState<any | null>(null);

  const orgId = currentOrganization?.id || '11111111-1111-1111-1111-111111111111';
  const branchId = selectedBranch?.id || '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const docs = await documentService.getDocuments({
        organizationId: orgId,
        branchId,
        status: selectedStatus === 'ALL' ? undefined : (selectedStatus as DocumentStatus),
        type: selectedType === 'ALL' ? undefined : (selectedType as DocumentType),
      });
      setDocuments(docs);
    } catch (err) {
      console.error('[DocumentsScreen] Error fetching documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, branchId, selectedStatus, selectedType]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleOpenReview = async (doc: DocumentRecord) => {
    const detail = await documentService.getDocumentDetail(doc.id);
    if (detail) {
      setReviewDoc(detail.document);
      setReviewExtraction(detail.extraction);
    }
  };

  const filteredDocs = documents.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.file_name.toLowerCase().includes(q) ||
      (d.metadata?.extracted_supplier_name || '').toLowerCase().includes(q) ||
      d.document_type.toLowerCase().includes(q)
    );
  });

  const needsReviewCount = documents.filter((d) => d.status === 'needs_review').length;
  const verifiedCount = documents.filter((d) => d.status === 'verified').length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-surface-border bg-gradient-to-r from-surface to-surface-elevated p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="info" size="sm">
              Phase 7 OCR Engine
            </Badge>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs font-medium text-gray-300">
              {currentOrganization?.name || 'Restaurant Organization'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand" />
            Document Ingestion & OCR Processing
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Automated text & candidate extraction for supplier invoices, expense receipts, and delivery notes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={fetchDocuments} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="primary" onClick={() => setIsUploadOpen(true)}>
            <UploadCloud className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-surface">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Pending Human Review</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-300 mt-1">{needsReviewCount}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Requires staff verification</p>
        </Card>

        <Card className="p-4 bg-surface">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Verified Documents</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-300 mt-1">{verifiedCount}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Posted to financial/inventory</p>
        </Card>

        <Card className="p-4 bg-surface">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>OCR Adapter Mode</span>
            <Cpu className="h-4 w-4 text-brand" />
          </div>
          <p className="text-sm font-bold text-white mt-2">Mock Adapter (Simulated)</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Local development fallback</p>
        </Card>

        <Card className="p-4 bg-surface">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>Two-Stage Security</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-sm font-bold text-white mt-2">Strict Human Gate</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Zero direct automated posting</p>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by vendor, document name..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-surface-elevated border border-surface-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="ALL">All Statuses</option>
            <option value="needs_review">Needs Review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="uploaded">Uploaded</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-surface-elevated border border-surface-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="ALL">All Types</option>
            <option value="supplier_invoice">Supplier Invoices</option>
            <option value="expense_receipt">Expense Receipts</option>
            <option value="goods_receipt_support">Goods Receipt Notes</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-elevated text-gray-400 uppercase text-[10px] border-b border-surface-border">
              <tr>
                <th className="py-3 px-4">Document / File</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Extracted Vendor</th>
                <th className="py-3 px-4">Extracted Total</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border text-gray-300">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-500">
                    No documents found matching filter.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-elevated/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-brand shrink-0" />
                        <div>
                          <p className="font-semibold text-white truncate max-w-xs">{doc.file_name}</p>
                          <span className="text-[10px] text-gray-400">
                            {(doc.file_size_bytes / 1024).toFixed(1)} KB • {doc.mime_type.split('/')[1].toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 capitalize">
                      {doc.document_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 text-gray-200">
                      {doc.metadata?.extracted_supplier_name || 'Pending Extraction'}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {doc.metadata?.extracted_total_amount
                        ? formatCurrency(doc.metadata.extracted_total_amount)
                        : '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          doc.status === 'verified'
                            ? 'success'
                            : doc.status === 'needs_review'
                            ? 'warning'
                            : doc.status === 'rejected'
                            ? 'danger'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {doc.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant={doc.status === 'needs_review' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => handleOpenReview(doc)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        {doc.status === 'needs_review' ? 'Review & Post' : 'View'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        organizationId={orgId}
        branchId={branchId}
        onUploaded={fetchDocuments}
      />

      {/* Review Modal */}
      <DocumentReviewModal
        isOpen={Boolean(reviewDoc)}
        onClose={() => {
          setReviewDoc(null);
          setReviewExtraction(null);
        }}
        document={reviewDoc}
        extraction={reviewExtraction}
        organizationId={orgId}
        branchId={branchId}
        onReviewCompleted={fetchDocuments}
      />
    </div>
  );
};
