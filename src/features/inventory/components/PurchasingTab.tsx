import React, { useState, useEffect } from 'react';
import { SupplierRecord, PurchaseOrderRecord, IngredientRecord, SupplierInvoiceRecord } from '../types';
import { purchasingService } from '../services/purchasingService';
import { GoodsReceiptModal } from './GoodsReceiptModal';
import { formatCurrency } from '@/lib/currency';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import {
  Truck,
  Calendar,
  Building,
  Phone,
  Mail,
  FileText,
  Clock,
  CheckCircle2,
  ReceiptText,
  Wallet,
} from 'lucide-react';

interface Props {
  organizationId: string;
  branchId: string;
  ingredients: IngredientRecord[];
}

export const PurchasingTab: React.FC<Props> = ({ organizationId, branchId, ingredients }) => {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoiceRecord[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<Awaited<ReturnType<typeof purchasingService.getSupplierPayments>>>([]);
  const [isGrnOpen, setIsGrnOpen] = useState<boolean>(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState<boolean>(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [paymentInvoice, setPaymentInvoice] = useState<SupplierInvoiceRecord | null>(null);
  const [invSupplierId, setInvSupplierId] = useState('');
  const [invNumber, setInvNumber] = useState('');
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [invAmount, setInvAmount] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'bank_transfer' | 'cheque' | 'cash' | 'card' | 'other'>('bank_transfer');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = async () => {
    const [sups, pos, invs, pays] = await Promise.all([
      purchasingService.getSuppliers(organizationId),
      purchasingService.getPurchaseOrders(branchId),
      purchasingService.getSupplierInvoices(branchId),
      purchasingService.getSupplierPayments(branchId),
    ]);
    setSuppliers(sups);
    setPurchaseOrders(pos);
    setInvoices(invs);
    setSupplierPayments(pays);
  };

  const paidForInvoice = (invoice: SupplierInvoiceRecord) =>
    supplierPayments
      .filter((p) => p.goods_receipt_id === invoice.goods_receipt_id)
      .reduce((sum, p) => sum + Number(p.amount), 0);

  const handleSaveInvoice = async () => {
    setIsSaving(true);
    setFormError(null);
    const result = await purchasingService.createSupplierInvoice({
      organizationId,
      branchId,
      supplierId: invSupplierId,
      invoiceNumber: invNumber,
      invoiceDate: invDate,
      totalAmount: Number(invAmount),
    });
    setIsSaving(false);
    if (!result.success) {
      setFormError(result.error || 'Unable to record invoice.');
      return;
    }
    setIsInvoiceOpen(false);
    setInvNumber('');
    setInvAmount('');
    setSuccessToast('Supplier invoice recorded.');
    await loadData();
  };

  const handleSavePayment = async () => {
    if (!paymentInvoice) return;
    setIsSaving(true);
    setFormError(null);
    const result = await purchasingService.recordSupplierPayment({
      organizationId,
      branchId,
      supplierId: paymentInvoice.supplier_id,
      goodsReceiptId: paymentInvoice.goods_receipt_id,
      invoiceId: paymentInvoice.id,
      amount: Number(payAmount),
      paymentMethod: payMethod,
      idempotencyKey: `ap-${paymentInvoice.id}-${Date.now()}`,
    });
    setIsSaving(false);
    if (!result.success) {
      setFormError(result.error || 'Unable to record payment.');
      return;
    }
    setIsPaymentOpen(false);
    setPayAmount('');
    setSuccessToast('Supplier payment recorded.');
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, [organizationId, branchId]);

  return (
    <div className="space-y-6">
      {successToast && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-sm rounded-lg flex items-center justify-between border border-emerald-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-xs text-emerald-700 hover:underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center space-x-2">
            <Truck className="w-6 h-6 text-amber-600" />
            <span>Suppliers & Purchase Orders</span>
          </h2>
          <p className="text-sm text-stone-500">
            Manage vendor directories, issue purchase orders, and record received goods.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={() => {
              setInvSupplierId(suppliers[0]?.id || '');
              setFormError(null);
              setIsInvoiceOpen(true);
            }}
            className="bg-stone-800 hover:bg-stone-900 text-white flex items-center space-x-1.5 shadow-sm"
          >
            <ReceiptText className="w-4 h-4" />
            <span>Record Invoice</span>
          </Button>
          <Button
            onClick={() => setIsGrnOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white flex items-center space-x-1.5 shadow-sm"
          >
            <Truck className="w-4 h-4" />
            <span>Receive Goods (GRN)</span>
          </Button>
        </div>
      </div>

      {/* Two Column Layout: Suppliers on Left, Purchase Orders on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suppliers List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-md flex items-center space-x-2">
              <Building className="w-4 h-4 text-stone-500" />
              <span>Approved Suppliers ({suppliers.length})</span>
            </h3>
          </div>

          <div className="space-y-3">
            {suppliers.map((s) => (
              <Card key={s.id} className="p-4 hover:border-amber-400 transition-colors">
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-stone-900 text-sm">{s.company_name}</h4>
                  <Badge variant="neutral" className="text-xs">
                    {s.payment_terms_days}d terms
                  </Badge>
                </div>
                {s.contact_person && (
                  <p className="text-xs text-stone-600 mt-1">Contact: {s.contact_person}</p>
                )}
                <div className="mt-2 space-y-1 text-xs text-stone-500">
                  {s.phone && (
                    <div className="flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-stone-400" />
                      <span>{s.email}</span>
                    </div>
                  )}
                </div>
                {s.notes && (
                  <p className="text-xs text-stone-500 bg-stone-50 p-2 rounded mt-2 border border-stone-100">
                    {s.notes}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Purchase Orders List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-md flex items-center space-x-2">
              <FileText className="w-4 h-4 text-stone-500" />
              <span>Purchase Orders ({purchaseOrders.length})</span>
            </h3>
          </div>

          <div className="space-y-3">
            {purchaseOrders.map((po) => (
              <Card key={po.id} className="p-4 hover:border-amber-400 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-sm text-stone-900">
                        {po.po_number}
                      </span>
                      <Badge
                        variant={
                          po.status === 'received'
                            ? 'success'
                            : po.status === 'partially_received'
                            ? 'warning'
                            : 'neutral'
                        }
                        className="text-xs capitalize"
                      >
                        {po.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-stone-600 mt-1 font-medium">{po.supplier_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-stone-500 block">Total Amount</span>
                    <span className="font-mono font-bold text-stone-900 text-base">
                      {formatCurrency(po.total_amount)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Issued: {new Date(po.created_at).toLocaleDateString()}</span>
                    </span>
                    {po.expected_delivery_date && (
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Expected: {po.expected_delivery_date}</span>
                      </span>
                    )}
                  </div>

                  {po.items && po.items.length > 0 && (
                    <span className="text-stone-600 font-medium">
                      {po.items.length} line item(s)
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Supplier Invoices & Payables */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-stone-900 text-md flex items-center space-x-2">
            <ReceiptText className="w-4 h-4 text-stone-500" />
            <span>Supplier Invoices ({invoices.length})</span>
          </h3>
        </div>

        <div className="space-y-3">
          {invoices.length === 0 && (
            <p className="text-xs text-stone-500">No supplier invoices recorded yet.</p>
          )}
          {invoices.map((invoice) => {
            const paid = paidForInvoice(invoice);
            const balance = Math.max(0, invoice.total_amount - paid);
            const supplierName = suppliers.find((s) => s.id === invoice.supplier_id)?.company_name || 'Supplier';
            return (
              <Card key={invoice.id} className="p-4 hover:border-amber-400 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-sm text-stone-900">
                        {invoice.invoice_number}
                      </span>
                      <Badge
                        variant={
                          invoice.status === 'paid'
                            ? 'success'
                            : invoice.status === 'partially_paid'
                              ? 'warning'
                              : 'neutral'
                        }
                        className="text-xs capitalize"
                      >
                        {invoice.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-stone-600 mt-1 font-medium">{supplierName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-stone-500 block">Total Amount</span>
                    <span className="font-mono font-bold text-stone-900 text-base">
                      {formatCurrency(invoice.total_amount)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Issued: {invoice.invoice_date}</span>
                    </span>
                    <span className="font-medium text-stone-600">
                      Paid: {formatCurrency(paid)} • Balance: {formatCurrency(balance)}
                    </span>
                  </div>
                  {balance > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setPaymentInvoice(invoice);
                        setPayAmount(String(balance));
                        setFormError(null);
                        setIsPaymentOpen(true);
                      }}
                    >
                      <Wallet className="w-3.5 h-3.5 mr-1" /> Record Payment
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Record Invoice Modal */}
      <Modal open={isInvoiceOpen} onOpenChange={(open) => !open && !isSaving && setIsInvoiceOpen(false)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Record Supplier Invoice</ModalTitle>
            <ModalDescription>Creates an accounts-payable record. Payments are recorded separately.</ModalDescription>
          </ModalHeader>

          {formError && (
            <div className="rounded-lg border border-rose-800/60 bg-rose-950/50 px-3 py-2 text-xs text-rose-300">
              {formError}
            </div>
          )}

          <label className="text-xs font-medium text-gray-300">Supplier</label>
          <select
            value={invSupplierId}
            onChange={(e) => setInvSupplierId(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.company_name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Invoice number</label>
              <input
                value={invNumber}
                onChange={(e) => setInvNumber(e.target.value)}
                placeholder="INV-..."
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-mono text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Invoice date</label>
              <input
                type="date"
                value={invDate}
                onChange={(e) => setInvDate(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <label className="text-xs font-medium text-gray-300">Total amount</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={invAmount}
            onChange={(e) => setInvAmount(e.target.value)}
            placeholder="92.50"
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-mono text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
          />

          <ModalFooter>
            <Button variant="secondary" onClick={() => setIsInvoiceOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveInvoice}
              disabled={isSaving || !invSupplierId || invNumber.trim().length < 2 || Number(invAmount) < 0 || invAmount === ''}
            >
              {isSaving ? 'Saving...' : 'Record Invoice'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Record Supplier Payment Modal */}
      <Modal open={isPaymentOpen} onOpenChange={(open) => !open && !isSaving && setIsPaymentOpen(false)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Record Supplier Payment</ModalTitle>
            <ModalDescription>
              {paymentInvoice ? `Invoice ${paymentInvoice.invoice_number} • Balance ${formatCurrency(Math.max(0, paymentInvoice.total_amount - paidForInvoice(paymentInvoice)))}` : ''}
            </ModalDescription>
          </ModalHeader>

          {formError && (
            <div className="rounded-lg border border-rose-800/60 bg-rose-950/50 px-3 py-2 text-xs text-rose-300">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Amount</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setIsPaymentOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSavePayment}
              disabled={isSaving || Number(payAmount) <= 0}
            >
              {isSaving ? 'Recording...' : 'Record Payment'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Goods Receipt Modal */}
      <GoodsReceiptModal
        isOpen={isGrnOpen}
        onClose={() => setIsGrnOpen(false)}
        onSuccess={(msg) => {
          setSuccessToast(msg);
          loadData();
        }}
        organizationId={organizationId}
        branchId={branchId}
        suppliers={suppliers}
        ingredients={ingredients}
      />
    </div>
  );
};
