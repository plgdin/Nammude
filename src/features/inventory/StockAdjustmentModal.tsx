import React, { useState } from 'react';
import { InventoryIngredient } from '@/mocks/inventory.data';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { roundMoney } from '@/lib/currency';
import { AlertCircle } from 'lucide-react';

interface StockAdjustmentModalProps {
  ingredient: InventoryIngredient | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveAdjustment: (ingredientId: string, delta: number, newTotal: number, reason: string) => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  ingredient,
  isOpen,
  onClose,
  onSaveAdjustment,
}) => {
  const [adjustmentType, setAdjustmentType] = useState<'exact' | 'add' | 'deduct'>('exact');
  const [inputVal, setInputVal] = useState<string>('');
  const [reason, setReason] = useState<string>('Physical Count Discrepancy');
  const [error, setError] = useState<string | null>(null);

  if (!ingredient) return null;

  const current = ingredient.currentStock;
  const numVal = parseFloat(inputVal) || 0;

  let delta = 0;
  let resultingTotal = current;

  if (adjustmentType === 'exact') {
    resultingTotal = numVal;
    delta = roundMoney(numVal - current);
  } else if (adjustmentType === 'add') {
    delta = numVal;
    resultingTotal = roundMoney(current + numVal);
  } else if (adjustmentType === 'deduct') {
    delta = -numVal;
    resultingTotal = roundMoney(current - numVal);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(numVal) || inputVal.trim() === '') {
      setError('Please enter a valid numeric quantity.');
      return;
    }
    if (resultingTotal < 0) {
      setError('Resulting stock cannot be less than zero.');
      return;
    }
    if (!reason.trim()) {
      setError('An audit reason is required for inventory adjustments.');
      return;
    }

    onSaveAdjustment(ingredient.id, delta, resultingTotal, reason);
    setInputVal('');
    setError(null);
    onClose();
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle>Adjust Stock: {ingredient.name}</ModalTitle>
          <ModalDescription>
            Current On-Hand Balance: <span className="font-semibold text-white">{current} {ingredient.unit}</span>
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Mode Switcher */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'exact', label: 'Set Exact Count' },
              { id: 'add', label: '+ Add Stock' },
              { id: 'deduct', label: '- Deduct Waste' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setAdjustmentType(mode.id as any);
                  setError(null);
                }}
                className={`py-2 px-1 text-xs font-medium rounded-lg border transition-all ${
                  adjustmentType === mode.id
                    ? 'border-brand bg-brand/15 text-white shadow-sm'
                    : 'border-surface-border bg-surface-elevated text-gray-400 hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              {adjustmentType === 'exact'
                ? `Counted Quantity (${ingredient.unit})`
                : adjustmentType === 'add'
                ? `Quantity to Add (${ingredient.unit})`
                : `Quantity to Deduct (${ingredient.unit})`}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setError(null);
              }}
              placeholder={`Enter value in ${ingredient.unit}...`}
              className="w-full h-11 rounded-lg border border-surface-border bg-surface-elevated px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
              autoFocus
            />
          </div>

          {/* Calculation Preview Banner */}
          <div className="rounded-xl border border-surface-border bg-surface-elevated/80 p-3 text-xs space-y-1">
            <div className="flex justify-between text-gray-400">
              <span>Current Stock:</span>
              <span className="font-mono text-gray-200">{current} {ingredient.unit}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Calculated Delta:</span>
              <span className={`font-mono font-semibold ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {delta > 0 ? `+${delta}` : delta} {ingredient.unit}
              </span>
            </div>
            <div className="flex justify-between font-bold text-white pt-1.5 border-t border-surface-border">
              <span>New Resulting Stock:</span>
              <span className="font-mono text-brand text-sm">{resultingTotal} {ingredient.unit}</span>
            </div>
          </div>

          {/* Reason Selection / Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-300">
              Adjustment Audit Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 rounded-lg border border-surface-border bg-surface-elevated px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="Physical Count Discrepancy">Physical Count Discrepancy</option>
              <option value="Spoilage / Expired Product">Spoilage / Expired Product</option>
              <option value="Delivery Receipt (Unrecorded PO)">Delivery Receipt (Unrecorded PO)</option>
              <option value="Kitchen Spillage / Breakage">Kitchen Spillage / Breakage</option>
              <option value="Transfer to Other Branch">Transfer to Other Branch</option>
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-[11px] text-gray-500 italic">
            Note: This action records an immutable stock movement log for audit traceability.
          </div>

          <ModalFooter>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Apply Stock Adjustment
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
