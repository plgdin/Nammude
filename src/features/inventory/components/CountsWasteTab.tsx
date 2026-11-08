import React, { useCallback, useEffect, useState } from 'react';
import { inventoryService } from '../services/inventoryService';
import { purchasingService } from '../services/purchasingService';
import { IngredientRecord, WastageRecord, StockCountRecord, StockCountItemRecord, ReorderSuggestion, ExpiringBatch, WastageReasonCategory } from '../types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import {
  ClipboardList,
  Trash2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  organizationId: string;
  branchId: string;
  ingredients: IngredientRecord[];
}

const REASON_OPTIONS: { value: WastageReasonCategory; label: string }[] = [
  { value: 'spoiled', label: 'Spoiled' },
  { value: 'burnt', label: 'Burnt' },
  { value: 'expired', label: 'Expired' },
  { value: 'spilled', label: 'Spilled' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'other', label: 'Other' },
];

export const CountsWasteTab: React.FC<Props> = ({ organizationId, branchId, ingredients }) => {
  const [wastage, setWastage] = useState<WastageRecord[]>([]);
  const [counts, setCounts] = useState<StockCountRecord[]>([]);
  const [countItems, setCountItems] = useState<StockCountItemRecord[]>([]);
  const [activeCountId, setActiveCountId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [expiring, setExpiring] = useState<ExpiringBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [isWasteOpen, setIsWasteOpen] = useState(false);
  const [wasteIngredientId, setWasteIngredientId] = useState('');
  const [wasteQuantity, setWasteQuantity] = useState('');
  const [wasteReason, setWasteReason] = useState<WastageReasonCategory>('spoiled');
  const [wasteError, setWasteError] = useState<string | null>(null);
  const [isSavingWaste, setIsSavingWaste] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [wasteData, countData, suggestionData, expiringData] = await Promise.all([
        inventoryService.getWastageRecords({ organizationId, branchId }),
        inventoryService.getStockCounts(branchId),
        inventoryService.getReorderSuggestions(branchId, organizationId),
        purchasingService.getExpiringBatches(branchId, 7),
      ]);
      setWastage(wasteData);
      setCounts(countData);
      setSuggestions(suggestionData);
      setExpiring(expiringData);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, branchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!activeCountId) {
      setCountItems([]);
      return;
    }
    inventoryService.getStockCountItems(activeCountId).then(setCountItems);
  }, [activeCountId]);

  const ingredientName = (id: string) =>
    ingredients.find((i) => i.id === id)?.name || id;

  const handleSaveWaste = async () => {
    setIsSavingWaste(true);
    setWasteError(null);
    const result = await inventoryService.recordWastage({
      organizationId,
      branchId,
      ingredientId: wasteIngredientId,
      quantity: Number(wasteQuantity),
      reasonCategory: wasteReason,
    });
    setIsSavingWaste(false);
    if (!result.success) {
      setWasteError(result.error || 'Unable to record wastage.');
      return;
    }
    setIsWasteOpen(false);
    setWasteQuantity('');
    setToast('Wastage recorded and stock deducted.');
    await loadData();
  };

  const handleStartCount = async () => {
    const result = await inventoryService.createStockCount({ organizationId, branchId });
    if (result.success && result.count) {
      setActiveCountId(result.count.id);
      setToast('Stock count started — enter counted quantities and complete.');
      await loadData();
    }
  };

  const handleUpdateCounted = async (item: StockCountItemRecord, value: string) => {
    const parsed = Number(value);
    if (value === '' || !Number.isFinite(parsed) || parsed < 0) return;
    await inventoryService.setCountedQuantity(item.id, parsed);
    setCountItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, counted_quantity: parsed } : i))
    );
  };

  const handleCompleteCount = async (countId: string) => {
    const result = await inventoryService.completeStockCount(countId);
    if (result.success) {
      setToast('Stock count completed — variances posted to the ledger.');
      setActiveCountId(null);
      await loadData();
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-sm rounded-lg flex items-center justify-between border border-emerald-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-xs text-emerald-700 hover:underline font-semibold">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center space-x-2">
            <ClipboardList className="w-6 h-6 text-amber-600" />
            <span>Counts, Wastage & Reorder</span>
          </h2>
          <p className="text-sm text-stone-500">
            Physical stock counts, attributed wastage, expiry watch, and reorder suggestions.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={() => {
              setWasteIngredientId(ingredients[0]?.id || '');
              setWasteError(null);
              setIsWasteOpen(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white flex items-center space-x-1.5 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>Record Wastage</span>
          </Button>
          <Button
            onClick={handleStartCount}
            className="bg-amber-600 hover:bg-amber-700 text-white flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Start Stock Count</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-stone-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-xs">Loading counts & wastage...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reorder suggestions */}
          <Card className="p-5">
            <h3 className="font-bold text-stone-900 text-md flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Reorder Suggestions ({suggestions.length})</span>
            </h3>
            <div className="mt-3 space-y-2">
              {suggestions.length === 0 && (
                <p className="text-xs text-stone-500">All stock levels are above reorder thresholds.</p>
              )}
              {suggestions.map((s) => (
                <div key={s.ingredient_id} className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs">
                  <div>
                    <p className="font-semibold text-stone-900">{s.name}</p>
                    <p className="text-stone-500">
                      {s.current_stock} {s.unit} left (reorder at {s.reorder_level})
                      {s.supplier_name ? ` • ${s.supplier_name}` : ''}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-stone-900">
                    Order {s.suggested_quantity} {s.unit}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Expiring batches */}
          <Card className="p-5">
            <h3 className="font-bold text-stone-900 text-md flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>Expiring Batches (7 days) ({expiring.length})</span>
            </h3>
            <div className="mt-3 space-y-2">
              {expiring.length === 0 && (
                <p className="text-xs text-stone-500">No batches expiring in the next 7 days.</p>
              )}
              {expiring.map((b, idx) => (
                <div key={`${b.ingredient_id}-${b.batch_number}-${idx}`} className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs">
                  <div>
                    <p className="font-semibold text-stone-900">{b.ingredient_name}</p>
                    <p className="text-stone-500">
                      Batch {b.batch_number || '—'} • {b.remaining_quantity} {b.purchase_unit} remaining
                    </p>
                  </div>
                  <Badge variant="danger" size="sm">Expires {b.expiry_date}</Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Wastage ledger */}
          <Card className="p-5">
            <h3 className="font-bold text-stone-900 text-md">Wastage Ledger ({wastage.length})</h3>
            <div className="mt-3 space-y-2">
              {wastage.length === 0 && (
                <p className="text-xs text-stone-500">No wastage recorded yet.</p>
              )}
              {wastage.map((w) => (
                <div key={w.id} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs">
                  <div>
                    <p className="font-semibold text-stone-900">{ingredientName(w.ingredient_id)}</p>
                    <p className="text-stone-500">
                      {w.reason_category} • {new Date(w.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-red-600">
                    -{w.quantity} {w.unit}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Stock counts */}
          <Card className="p-5">
            <h3 className="font-bold text-stone-900 text-md">Physical Stock Counts ({counts.length})</h3>
            <div className="mt-3 space-y-2">
              {counts.length === 0 && (
                <p className="text-xs text-stone-500">No stock counts yet. Start one to reconcile physical vs system stock.</p>
              )}
              {counts.map((count) => (
                <div key={count.id} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-stone-900">
                      {new Date(count.created_at).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant={count.status === 'completed' ? 'success' : 'warning'} size="sm">
                        {count.status.replace('_', ' ')}
                      </Badge>
                      {count.status === 'in_progress' && (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => setActiveCountId(count.id)}>
                            Enter Counts
                          </Button>
                          <Button variant="primary" size="sm" onClick={() => handleCompleteCount(count.id)}>
                            Complete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {activeCountId === count.id && (
                    <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
                      {countItems.map((item) => {
                        const variance = item.counted_quantity - item.system_quantity;
                        return (
                          <div key={item.id} className="flex items-center justify-between gap-2 rounded bg-stone-50 px-2 py-1.5">
                            <span className="font-medium text-stone-800 truncate max-w-[150px]">
                              {ingredientName(item.ingredient_id)}
                            </span>
                            <span className="text-stone-500 font-mono">sys {item.system_quantity}</span>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              defaultValue={item.counted_quantity}
                              onBlur={(e) => handleUpdateCounted(item, e.target.value)}
                              className="w-20 rounded border border-stone-300 px-2 py-1 font-mono text-xs text-stone-900"
                            />
                            <span className={`font-mono font-bold ${variance === 0 ? 'text-stone-400' : variance > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {variance > 0 ? `+${variance}` : variance}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Wastage modal */}
      <Modal open={isWasteOpen} onOpenChange={(open) => !open && !isSavingWaste && setIsWasteOpen(false)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Record Wastage</ModalTitle>
            <ModalDescription>Deducts stock immediately and keeps an attributed audit record.</ModalDescription>
          </ModalHeader>

          {wasteError && (
            <div className="rounded-lg border border-rose-800/60 bg-rose-950/50 px-3 py-2 text-xs text-rose-300">
              {wasteError}
            </div>
          )}

          <label className="text-xs font-medium text-gray-300">Ingredient</label>
          <select
            value={wasteIngredientId}
            onChange={(e) => setWasteIngredientId(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
          >
            {ingredients.map((i) => (
              <option key={i.id} value={i.id}>{i.name} ({i.base_unit})</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Quantity</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={wasteQuantity}
                onChange={(e) => setWasteQuantity(e.target.value)}
                placeholder="0.50"
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-mono text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Reason</label>
              <select
                value={wasteReason}
                onChange={(e) => setWasteReason(e.target.value as WastageReasonCategory)}
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {REASON_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setIsWasteOpen(false)} disabled={isSavingWaste}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveWaste}
              disabled={isSavingWaste || !wasteIngredientId || Number(wasteQuantity) <= 0}
            >
              {isSavingWaste ? 'Recording...' : 'Record Wastage'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
