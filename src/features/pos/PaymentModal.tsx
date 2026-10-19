import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatCurrency, roundMoney } from '@/lib/currency';
import { CreditCard, Banknote, QrCode, CheckCircle2, Receipt, ArrowRight } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalPayable: number;
  orderNumber: string;
  orderType: string;
  tableNumber: string;
  onPaymentSuccess: (method: string, tenderAmount: number, change: number) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  totalPayable,
  orderNumber,
  orderType,
  tableNumber,
  onPaymentSuccess,
}) => {
  const [method, setMethod] = useState<'card' | 'cash' | 'digital'>('card');
  const [tenderedCash, setTenderedCash] = useState<number>(Math.ceil(totalPayable));
  const [isProcessing, setIsProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(true);

  const changeDue = Math.max(0, roundMoney(tenderedCash - totalPayable));

  const handleProcessPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCompleted(true);
    }, 600);
  };

  const handleFinish = () => {
    onPaymentSuccess(method, tenderedCash, changeDue);
    setCompleted(false);
    onClose();
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
                Select payment tender method and finalize transaction.
              </ModalDescription>
            </ModalHeader>

            <div className="space-y-5 py-2">
              {/* Total Payable Prominent Hero */}
              <div className="rounded-xl border border-surface-border bg-surface-elevated p-4 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">
                  Total Balance Due
                </p>
                <p className="text-3xl font-extrabold text-white mt-1">
                  {formatCurrency(totalPayable)}
                </p>
              </div>

              {/* Tender Selector Tabs */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all min-h-[56px] ${
                    method === 'card'
                      ? 'border-brand bg-brand/15 text-white shadow-sm'
                      : 'border-surface-border bg-surface-elevated text-gray-300 hover:bg-surface-active'
                  }`}
                >
                  <CreditCard className="h-5 w-5 mb-1 text-blue-400" />
                  Card (EMV)
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('cash')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all min-h-[56px] ${
                    method === 'cash'
                      ? 'border-brand bg-brand/15 text-white shadow-sm'
                      : 'border-surface-border bg-surface-elevated text-gray-300 hover:bg-surface-active'
                  }`}
                >
                  <Banknote className="h-5 w-5 mb-1 text-emerald-400" />
                  Cash Drawer
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('digital')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all min-h-[56px] ${
                    method === 'digital'
                      ? 'border-brand bg-brand/15 text-white shadow-sm'
                      : 'border-surface-border bg-surface-elevated text-gray-300 hover:bg-surface-active'
                  }`}
                >
                  <QrCode className="h-5 w-5 mb-1 text-amber-400" />
                  Digital / QR
                </button>
              </div>

              {/* Cash Tender Details & Change Calculation */}
              {method === 'cash' && (
                <div className="space-y-3 rounded-xl border border-surface-border bg-surface-elevated p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 font-medium">Quick Cash Presets:</span>
                    <span className="text-gray-400">Tendered: {formatCurrency(tenderedCash)}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[totalPayable, 20, 50, 100].map((amt, idx) => {
                      const roundedAmt = idx === 0 ? Math.ceil(amt) : amt;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setTenderedCash(roundedAmt)}
                          className={`py-2 px-1 rounded-lg border text-xs font-semibold ${
                            tenderedCash === roundedAmt
                              ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                              : 'border-surface-border bg-surface text-gray-300 hover:bg-surface-active'
                          }`}
                        >
                          {idx === 0 ? 'Exact' : `$${amt}`}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-surface-border text-sm">
                    <span className="font-medium text-gray-300">Change Due:</span>
                    <span className="font-bold text-emerald-400 text-base">
                      {formatCurrency(changeDue)}
                    </span>
                  </div>
                </div>
              )}

              {/* Card Terminal Prompt */}
              {method === 'card' && (
                <div className="rounded-xl border border-surface-border bg-surface-elevated/70 p-4 text-center space-y-1">
                  <p className="text-xs font-medium text-gray-300">
                    Ready for contactless tap or chip insertion
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Simulating Pax / Verifone Ethernet Payment Terminal
                  </p>
                </div>
              )}

              {/* Digital Wallet Prompt */}
              {method === 'digital' && (
                <div className="rounded-xl border border-surface-border bg-surface-elevated/70 p-4 text-center space-y-1">
                  <p className="text-xs font-medium text-gray-300">
                    Customer Dynamic QR Display Active
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Supports Apple Pay, Google Wallet, UPI, and Venmo QR
                  </p>
                </div>
              )}

              {/* Print Receipt Toggle */}
              <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={printReceipt}
                  onChange={(e) => setPrintReceipt(e.target.checked)}
                  className="rounded border-surface-border bg-surface-elevated text-brand focus:ring-brand h-4 w-4"
                />
                <Receipt className="h-4 w-4 text-gray-400" />
                <span>Auto-print thermal customer receipt (ESC/POS 80mm)</span>
              </label>

              {/* Simulation Safety Disclaimer */}
              <div className="rounded-lg bg-blue-950/40 border border-blue-900/60 p-2.5 text-[11px] text-blue-300 text-center">
                Prototype Demonstration: Zero actual cards will be debited.
              </div>
            </div>

            <ModalFooter>
              <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleProcessPayment}
                isLoading={isProcessing}
                className="w-full sm:w-auto"
              >
                Complete Payment • {formatCurrency(totalPayable)}
              </Button>
            </ModalFooter>
          </>
        ) : (
          /* Payment Success Confirmation View */
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Payment Successful</h3>
              <p className="text-xs text-gray-400 mt-1">
                Order {orderNumber} settled via {method.toUpperCase()}
              </p>
            </div>

            <div className="rounded-xl border border-surface-border bg-surface-elevated p-4 max-w-sm mx-auto space-y-1.5 text-xs text-left">
              <div className="flex justify-between text-gray-400">
                <span>Amount Paid:</span>
                <span className="font-medium text-white">{formatCurrency(totalPayable)}</span>
              </div>
              {method === 'cash' && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Change Given:</span>
                  <span>{formatCurrency(changeDue)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-400">
                <span>Thermal Print:</span>
                <span className="text-gray-300">{printReceipt ? 'Dispatched' : 'Skipped'}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Kitchen Ticket (KOT):</span>
                <span className="text-emerald-400">Routed to Kitchen</span>
              </div>
            </div>

            <Button variant="primary" onClick={handleFinish} className="w-full max-w-sm mx-auto">
              Start Next Order <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
};
