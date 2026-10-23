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
import { expenseService } from './services/expenseService';
import { ExpenseCategory, ExpensePaymentMethod } from './types';
import { AlertCircle } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  branchId: string;
  onExpenseRecorded: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  branchId,
  onExpenseRecorded,
}) => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [categoryName, setCategoryName] = useState<string>('');
  const [newCategoryMode, setNewCategoryMode] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('card');
  const [payeeName, setPayeeName] = useState<string>('');
  const [incurredDate, setIncurredDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      expenseService.getCategories(organizationId).then((cats) => {
        setCategories(cats);
        if (cats.length > 0) {
          setCategoryId(cats[0].id);
          setCategoryName(cats[0].name);
        }
      });
      setError(null);
    }
  }, [isOpen, organizationId]);

  const handleCategorySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'NEW') {
      setNewCategoryMode(true);
      setCategoryId('');
      setCategoryName('');
    } else {
      setNewCategoryMode(false);
      setCategoryId(val);
      const cat = categories.find((c) => c.id === val);
      setCategoryName(cat ? cat.name : '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please provide a valid expense amount greater than 0.');
      return;
    }
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    let finalCatName = categoryName;
    let finalCatId = categoryId;

    setIsSubmitting(true);
    setError(null);

    try {
      if (newCategoryMode) {
        if (!newCategoryName.trim()) {
          setError('Category name is required.');
          setIsSubmitting(false);
          return;
        }
        const createdCat = await expenseService.createCategory(
          organizationId,
          newCategoryName.trim()
        );
        finalCatId = createdCat.id;
        finalCatName = createdCat.name;
      }

      await expenseService.recordExpense({
        organizationId,
        branchId,
        categoryId: finalCatId || null,
        categoryName: finalCatName || 'General',
        description: description.trim(),
        amount: numAmount,
        paymentMethod,
        paymentStatus: 'paid',
        payeeName: payeeName.trim() || null,
        incurredDate,
        idempotencyKey: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      });

      onExpenseRecorded();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle>Record Operating Expense (OPEX)</ModalTitle>
          <ModalDescription>
            Log administrative, utility, maintenance, or supply overhead.
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Expense Category
            </label>
            {!newCategoryMode ? (
              <select
                value={categoryId}
                onChange={handleCategorySelect}
                className="w-full bg-surface-elevated border border-surface-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="NEW">+ Create New Category</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="New Category Name (e.g. Cleaning Supplies)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setNewCategoryMode(false);
                    if (categories.length > 0) {
                      setCategoryId(categories[0].id);
                      setCategoryName(categories[0].name);
                    }
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Description / Item Details
            </label>
            <Input
              placeholder="e.g. Monthly Wi-Fi broadband router bill"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Amount ($)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Expense Date
              </label>
              <Input
                type="date"
                value={incurredDate}
                onChange={(e) => setIncurredDate(e.target.value)}
              />
            </div>
          </div>

          {/* Payment Method & Payee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
                className="w-full bg-surface-elevated border border-surface-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="card">Company Card</option>
                <option value="cash">Register Cash / Petty</option>
                <option value="bank_transfer">Bank Wire</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Vendor / Payee Name (Optional)
              </label>
              <Input
                placeholder="e.g. Metro Power Corp"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
              />
            </div>
          </div>

          {paymentMethod === 'cash' && (
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-300 text-[11px] leading-relaxed">
              Note: Cash expenses paid out of the register will be recorded against the active cash shift drawer balance.
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-surface-border">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Record Expense'}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};
