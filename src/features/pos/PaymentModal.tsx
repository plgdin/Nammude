import React, { useEffect, useRef, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatCurrency, roundMoney } from '@/lib/currency';
import { CreditCard, Banknote, QrCode, CheckCircle2, ArrowRight, AlertTriangle, Printer } from 'lucide-react';
import { paymentService } from './services/paymentService';
import { useOrganization } from '@/features/organization/OrganizationContext';
import { useAuth } from '@/features/auth/AuthContext';

export interface ReceiptItem {
  name: string;
  quantity: number;
  lineTotal: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  totalPayable: number;
  orderNumber: string;
  orderType: string;
  tableNumber: string;
  receiptItems?: ReceiptItem[];
  onPaymentSuccess: (method: string, tenderAmount: number, change: number) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  orderId,
  totalPayable,
  orderNumber,
  orderType,
  tableNumber,
  receiptItems = [],
  onPaymentSuccess,
}) => {
  const { currentOrganization, currentBranch } = useOrganization();
  const { user } = useAuth();

  const [method, setMethod] = useState<'card' | 'cash' | 'upi_qr'>('card');
  const [tenderedCash, setTenderedCash] = useState<number>(Math.ceil(totalPayable));
  const [amountToPay, setAmountToPay] = useState<number>(totalPayable);
  const [paidSoFar, setPaidSoFar] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const remaining = Math.max(0, roundMoney(totalPayable - paidSoFar));
  const changeDue = Math.max(0, roundMoney(tenderedCash - amountToPay));

  // Load already-paid amounts when the modal opens (split-payment resume).
  useEffect(() => {
    if (!isOpen) return;
    setCompleted(false);
    setErrorMessage(null);
    setAmountToPay(Math.max(0, totalPayable));
    setTenderedCash(Math.ceil(Math.max(0, totalPayable)));
    if (orderId) {
      paymentService.getOrderPayments(orderId).then((payments) => {
        const captured = payments.filter((p) => p.status === 'completed' || p.status === 'refunded');
        const paid = roundMoney(captured.reduce((sum, p) => sum + Number(p.amount), 0));
        setPaidSoFar(paid);
        const rem = Math.max(0, roundMoney(totalPayable - paid));
        setAmountToPay(rem);
        setTenderedCash(Math.ceil(rem));
      });
    }
  }, [isOpen, orderId, totalPayable]);

  const handleProcessPayment = async () => {
    if (amountToPay <= 0) {
      setErrorMessage('Enter an amount greater than zero.');
      return;
    }
    if (amountToPay > remaining + 0.005) {
      setErrorMessage(`Amount exceeds the remaining balance of ${formatCurrency(remaining)}.`);
      return;
    }
    setIsProcessing(true);
    setErrorMessage(null);

    const idempotencyKey = `pay-${orderId || orderNumber}-${Date.now()}`;

    if (orderId && currentOrganization && currentBranch) {
      const res = await paymentService.recordPayment({
        organization_id: currentOrganization.id,
        branch_id: currentBranch.id,
        order_id: orderId,
        payment_method: method,
        amount: amountToPay,
        idempotency_key: idempotencyKey,
        settled_by: user?.id,
      });

      if (!res.success) {
        setIsProcessing(false);
        setErrorMessage(res.error || 'Failed to record settlement.');
        return;
      }
    }

    const newPaid = roundMoney(paidSoFar + amountToPay);
    setPaidSoFar(newPaid);
    setIsProcessing(false);

    if (newPaid >= totalPayable - 0.005) {
      setCompleted(true);
    } else {
      const rem = roundMoney(totalPayable - newPaid);
      setAmountToPay(rem);
      setTenderedCash(Math.ceil(rem));
    }
  };

  const handleFinish = () => {
    onPaymentSuccess(method, method === 'cash' ? tenderedCash : amountToPay, changeDue);
    setCompleted(false);
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <ModalContent className="max-w-lg">
        {!completed ? (
          <>
            <ModalHeader>
              <div className="flex items-center justify-between">
                <ModalTitle>Settle Order {orderNumber}</ModalTitle>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-elevated text-gray-300">
                  {orderType} {tableNumber ? `• ${tableNumber}` : ''}
                </span>
              </div>
              <ModalDescription>
                Select payment method. Development sandbox flow: no live gateway charge.
              </ModalDescription>
            </ModalHeader>

            {/* Dev Mode Banner */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Simulated Payment Gateway: Live provider integration scheduled for Phase 6.</span>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {errorMessage}
              </div>
            )}

            {/* Total Display */}
            <div className="rounded-xl border border-surface-border bg-surface-elevated/60 p-4 text-center">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Total Due
              </span>
              <div className="text-3xl font-black text-white tracking-tight mt-1">
                {formatCurrency(remaining)}
              </div>
              {paidSoFar > 0 && (
                <p className="text-[11px] text-emerald-400 mt-1 font-medium">
                  {formatCurrency(paidSoFar)} already collected • {formatCurrency(totalPayable)} total
                </p>
              )}
            </div>

            {/* Partial / split amount */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Amount to collect now:</span>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 font-mono">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={remaining}
                  value={amountToPay}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setAmountToPay(next);
                    if (tenderedCash < next) setTenderedCash(Math.ceil(next));
                  }}
                  className="w-28 text-right rounded border border-surface-border bg-canvas px-2 py-1 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand font-mono"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('card')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all min-h-[56px] ${
                  method === 'card'
                    ? 'border-brand bg-brand/15 text-white ring-1 ring-brand'
                    : 'border-surface-border bg-surface-elevated text-gray-300 hover:bg-surface-active'
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span>Credit/Debit</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all min-h-[56px] ${
                  method === 'cash'
                    ? 'border-brand bg-brand/15 text-white ring-1 ring-brand'
                    : 'border-surface-border bg-surface-elevated text-gray-300 hover:bg-surface-active'
                }`}
              >
                <Banknote className="h-5 w-5" />
                <span>Cash Tender</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('upi_qr')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all min-h-[56px] ${
                  method === 'upi_qr'
                    ? 'border-brand bg-brand/15 text-white ring-1 ring-brand'
                    : 'border-surface-border bg-surface-elevated text-gray-300 hover:bg-surface-active'
                }`}
              >
                <QrCode className="h-5 w-5" />
                <span>Digital / UPI</span>
              </button>
            </div>

            {/* Cash Tender Calculation */}
            {method === 'cash' && (
              <div className="space-y-3 p-3.5 rounded-xl border border-surface-border bg-surface-elevated">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Cash Received:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 font-mono">₹</span>
                    <input
                      type="number"
                      step="1"
                      min={amountToPay}
                      value={tenderedCash}
                      onChange={(e) => setTenderedCash(Number(e.target.value))}
                      className="w-24 text-right rounded border border-surface-border bg-canvas px-2 py-1 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-surface-border text-xs">
                  <span className="font-semibold text-gray-300">Change Due:</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {formatCurrency(changeDue)}
                  </span>
                </div>
              </div>
            )}

            <ModalFooter>
              <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleProcessPayment}
                disabled={isProcessing || amountToPay <= 0 || (method === 'cash' && tenderedCash < amountToPay)}
              >
                {isProcessing
                  ? 'Recording Settlement...'
                  : amountToPay < remaining
                    ? `Record Partial • ${formatCurrency(amountToPay)}`
                    : `Confirm Payment • ${formatCurrency(amountToPay)}`}
              </Button>
            </ModalFooter>
          </>
        ) : (
          /* Payment Success State */
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Payment Recorded</h3>
              <p className="text-xs text-gray-400 mt-1 font-mono">
                Order {orderNumber} settled via {method.toUpperCase()}
              </p>
            </div>

            {method === 'cash' && changeDue > 0 && (
              <div className="p-3 rounded-lg bg-surface-elevated border border-surface-border text-xs">
                <span className="text-gray-400">Please give customer: </span>
                <span className="font-bold text-emerald-400 font-mono">
                  {formatCurrency(changeDue)} change
                </span>
              </div>
            )}

            <div className="pt-2 space-y-2">
              <Button variant="secondary" className="w-full gap-2" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                <span>Print Receipt</span>
              </Button>
              <Button variant="primary" className="w-full gap-2" onClick={handleFinish}>
                <span>Complete Order</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Printable receipt (print stylesheet only) */}
            <div className="hidden print:block fixed inset-0 bg-white text-black p-8 z-[99999]">
              <style>{`
                @media print {
                  body * { visibility: hidden; }
                  #pos-receipt, #pos-receipt * { visibility: visible; }
                  #pos-receipt { position: absolute; left: 50%; top: 24px; transform: translateX(-50%); width: 320px; }
                }
              `}</style>
              <div id="pos-receipt" ref={printRef} className="font-mono text-sm">
                <div className="text-center border-b border-dashed border-black pb-3 mb-3">
                  <h2 className="text-lg font-bold">{currentOrganization?.name || 'Restaurant'}</h2>
                  <p className="text-xs">{currentBranch?.name || ''}</p>
                  <p className="text-xs mt-1">Order {orderNumber} • {orderType}{tableNumber ? ` • Table ${tableNumber}` : ''}</p>
                  <p className="text-xs">{new Date().toLocaleString()}</p>
                </div>

                {receiptItems.length > 0 && (
                  <div className="space-y-1 border-b border-dashed border-black pb-3 mb-3">
                    {receiptItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span>{item.quantity} × {item.name}</span>
                        <span>{formatCurrency(item.lineTotal)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span>Total</span><span>{formatCurrency(totalPayable)}</span></div>
                  <div className="flex justify-between"><span>Paid</span><span>{formatCurrency(paidSoFar)}</span></div>
                  <div className="flex justify-between"><span>Method</span><span>{method.toUpperCase()}</span></div>
                  {method === 'cash' && changeDue > 0 && (
                    <div className="flex justify-between"><span>Change</span><span>{formatCurrency(changeDue)}</span></div>
                  )}
                </div>
                <p className="text-center text-xs mt-4">Thank you for dining with us!</p>
              </div>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
};
