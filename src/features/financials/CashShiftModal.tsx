import React, { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/currency';
import { cashShiftService } from './services/cashShiftService';
import { CashShiftRecord, CashShiftMovementType } from './types';
import { DollarSign, AlertCircle, ArrowDownRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface CashShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  branchId: string;
  activeShift: CashShiftRecord | null;
  mode: 'open' | 'movement' | 'close';
  onShiftUpdated: () => void;
}

export const CashShiftModal: React.FC<CashShiftModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  branchId,
  activeShift,
  mode,
  onShiftUpdated,
}) => {
  // Open shift state
  const [openingFloat, setOpeningFloat] = useState<string>('200.00');
  const [openNotes, setOpenNotes] = useState<string>('');

  // Movement state
  const [movementType, setMovementType] = useState<CashShiftMovementType>('cash_in');
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementReason, setMovementReason] = useState<string>('');

  // Close shift state (Blind Count)
  const [countedCash, setCountedCash] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [closureResult, setClosureResult] = useState<{
    expectedCash: number;
    actualCash: number;
    variance: number;
    isBalanced: boolean;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const floatVal = parseFloat(openingFloat);
    if (isNaN(floatVal) || floatVal < 0) {
      setError('Please provide a valid opening float amount.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await cashShiftService.openShift({
        organizationId,
        branchId,
        openingFloat: floatVal,
        notes: openNotes.trim() || undefined,
      });
      onShiftUpdated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to open cash shift.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) {
      setError('No active shift to record movement on.');
      return;
    }
    const amt = parseFloat(movementAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (!movementReason.trim()) {
      setError('Please provide a reason for the cash movement.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await cashShiftService.recordMovement({
        shiftId: activeShift.id,
        movementType,
        amount: amt,
        reason: movementReason.trim(),
        idempotencyKey: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      });
      onShiftUpdated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record drawer movement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) {
      setError('No active shift found to close.');
      return;
    }
    const counted = parseFloat(countedCash);
    if (isNaN(counted) || counted < 0) {
      setError('Please input counted cash balance.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await cashShiftService.closeShift({
        shiftId: activeShift.id,
        actualCash: counted,
        notes: closeNotes.trim() || undefined,
      });
      setClosureResult(res);
      onShiftUpdated();
    } catch (err: any) {
      setError(err?.message || 'Failed to close shift.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setClosureResult(null);
    setError(null);
    onClose();
  };

  const modalTitle =
    mode === 'open'
      ? 'Open Cash Register Shift'
      : mode === 'movement'
      ? 'Record Drawer Cash Movement'
      : 'Close Shift & Blind Cash Count';

  const modalDesc =
    mode === 'open'
      ? 'Enter opening float currency balance in drawer'
      : mode === 'movement'
      ? 'Log float additions, safe drops, or petty register payouts'
      : 'Count physical drawer currency to reconcile variances';

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle>{modalTitle}</ModalTitle>
          <ModalDescription>{modalDesc}</ModalDescription>
        </ModalHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Open Mode */}
          {mode === 'open' && (
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Opening Cash Float ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Shift Notes (Optional)
                </label>
                <Input
                  placeholder="e.g. Morning opening drawer verified"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-surface-border">
                <Button type="button" variant="ghost" onClick={resetAndClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Opening Shift...' : 'Open Cash Shift'}
                </Button>
              </div>
            </form>
          )}

          {/* 2. Movement Mode */}
          {mode === 'movement' && (
            <form onSubmit={handleRecordMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Movement Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType('cash_in')}
                    className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                      movementType === 'cash_in'
                        ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300'
                        : 'bg-surface-elevated border-surface-border text-gray-400 hover:text-white'
                    }`}
                  >
                    <ArrowDownRight className="h-4 w-4" />
                    Cash In
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('cash_out')}
                    className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                      movementType === 'cash_out'
                        ? 'bg-red-950/70 border-red-600 text-red-300'
                        : 'bg-surface-elevated border-surface-border text-gray-400 hover:text-white'
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Safe Drop
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType('petty_expense')}
                    className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                      movementType === 'petty_expense'
                        ? 'bg-amber-950/70 border-amber-600 text-amber-300'
                        : 'bg-surface-elevated border-surface-border text-gray-400 hover:text-white'
                    }`}
                  >
                    <DollarSign className="h-4 w-4" />
                    Petty Cash
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Amount ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Reason / Authorizing Note
                </label>
                <Input
                  placeholder="e.g. Additional $5 bill roll from back safe"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-surface-border">
                <Button type="button" variant="ghost" onClick={resetAndClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Recording...' : 'Record Movement'}
                </Button>
              </div>
            </form>
          )}

          {/* 3. Close Mode */}
          {mode === 'close' && (
            <div>
              {!closureResult ? (
                <form onSubmit={handleCloseShift} className="space-y-4">
                  <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/60 text-blue-300 text-xs leading-relaxed">
                    <strong>Blind Cash Count Policy:</strong> System expected cash is intentionally hidden until you submit your physical count to ensure strict internal financial control.
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Counted Cash in Drawer ($)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={countedCash}
                      onChange={(e) => setCountedCash(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Closing Handover Notes (Optional)
                    </label>
                    <Input
                      placeholder="e.g. End of dinner shift, all receipts deposited in pouch"
                      value={closeNotes}
                      onChange={(e) => setCloseNotes(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2.5 pt-3 border-t border-surface-border">
                    <Button type="button" variant="ghost" onClick={resetAndClose} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={isSubmitting}>
                      {isSubmitting ? 'Reconciling...' : 'Confirm Count & Close Shift'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 ${
                      closureResult.isBalanced
                        ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                        : closureResult.variance > 0
                        ? 'bg-blue-950/40 border-blue-800 text-blue-300'
                        : 'bg-red-950/40 border-red-800 text-red-300'
                    }`}
                  >
                    <CheckCircle2 className="h-7 w-7" />
                    <h4 className="text-base font-bold text-white">Shift Closed & Reconciled</h4>
                    <p className="text-xs">
                      {closureResult.isBalanced
                        ? 'Perfect Drawer Balance! Actual cash matches expected register calculations exactly.'
                        : closureResult.variance > 0
                        ? `Cash Overage of +${formatCurrency(closureResult.variance)}. Counted more than expected.`
                        : `Cash Shortage of -${formatCurrency(Math.abs(closureResult.variance))}. Drawer short.`}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-surface-elevated border border-surface-border text-center">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-mono">Counted Cash</span>
                      <p className="text-sm font-bold text-white mt-1">
                        {formatCurrency(closureResult.actualCash)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-mono">Expected Cash</span>
                      <p className="text-sm font-bold text-white mt-1">
                        {formatCurrency(closureResult.expectedCash)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-mono">Variance</span>
                      <p
                        className={`text-sm font-bold mt-1 ${
                          closureResult.isBalanced
                            ? 'text-emerald-400'
                            : closureResult.variance > 0
                            ? 'text-blue-400'
                            : 'text-red-400'
                        }`}
                      >
                        {closureResult.variance >= 0 ? '+' : ''}
                        {formatCurrency(closureResult.variance)}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button variant="primary" onClick={resetAndClose}>
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
};
