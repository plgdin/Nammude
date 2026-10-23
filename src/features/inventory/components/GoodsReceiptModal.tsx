import React, { useState } from 'react';
import { SupplierRecord, IngredientRecord } from '../types';
import { purchasingService } from '../services/purchasingService';
import { Button } from '@/components/ui/Button';
import { X, CheckCircle2, Truck, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  organizationId: string;
  branchId: string;
  suppliers: SupplierRecord[];
  ingredients: IngredientRecord[];
}

export const GoodsReceiptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  organizationId,
  branchId,
  suppliers,
  ingredients,
}) => {
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [ingredientId, setIngredientId] = useState<string>(ingredients[0]?.id || '');
  const [receivedQty, setReceivedQty] = useState<number>(10);
  const [purchaseUnit, setPurchaseUnit] = useState<string>('kg');
  const [unitCost, setUnitCost] = useState<number>(5.0);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [batchNumber, setBatchNumber] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (receivedQty <= 0) {
      setError('Received quantity must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const conversionFactor = purchaseUnit === 'kg' || purchaseUnit === 'L' ? 1000 : 1;

    try {
      const res = await purchasingService.processGoodsReceipt({
        organizationId,
        branchId,
        supplierId,
        invoiceNumber: invoiceNumber || null,
        invoiceDate: new Date().toISOString().split('T')[0],
        items: [
          {
            ingredientId,
            receivedQuantity: receivedQty,
            purchaseUnit,
            conversionFactor,
            unitCost,
            batchNumber: batchNumber || null,
            expiryDate: expiryDate || null,
          },
        ],
      });

      if (res.success) {
        onSuccess(`Goods Receipt ${res.grnNumber} processed successfully! Stock updated.`);
        onClose();
      } else {
        setError(res.error || 'Failed to process Goods Receipt.');
      }
    } catch (err: any) {
      setError(err.message || 'Error processing goods receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-stone-900 text-lg">Receive Goods (GRN)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center space-x-2 border border-red-200">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
              Supplier
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company_name} ({s.payment_terms_days}d terms)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
              Received Ingredient
            </label>
            <select
              value={ingredientId}
              onChange={(e) => {
                setIngredientId(e.target.value);
                const selected = ingredients.find((i) => i.id === e.target.value);
                if (selected) {
                  setPurchaseUnit(selected.purchase_unit || 'kg');
                }
              }}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} ({ing.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                Quantity Received
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                required
                value={receivedQty}
                onChange={(e) => setReceivedQty(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                Purchase Unit
              </label>
              <select
                value={purchaseUnit}
                onChange={(e) => setPurchaseUnit(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="kg">kg</option>
                <option value="L">L (Liters)</option>
                <option value="pcs">pcs (Pieces)</option>
                <option value="box">box</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                Unit Cost Price ($)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={unitCost}
                onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                Invoice / Bill #
              </label>
              <input
                type="text"
                placeholder="INV-98124"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                Batch / Lot #
              </label>
              <input
                type="text"
                placeholder="LOT-2026-A"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-lg text-xs text-stone-600 border border-amber-200/50">
            <strong>Weighted Average Cost (WAC):</strong> Saving this GRN will automatically normalize quantities, add to branch perpetual stock, and recalculate WAC cost basis.
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white flex items-center space-x-2"
            >
              {isSubmitting ? (
                <span>Processing...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Receipt & Update Stock</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
