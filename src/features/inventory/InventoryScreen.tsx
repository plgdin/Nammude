import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  mockIngredients as initialIngredients,
  mockStockMovements as initialMovements,
  InventoryIngredient,
  StockMovement,
} from '@/mocks/inventory.data';
import { BranchConfig } from '@/config/tenant.config';
import { formatCurrency } from '@/lib/currency';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { IngredientDetailModal } from './IngredientDetailModal';
import {
  Search,
  AlertTriangle,
  X,
  CheckCircle2,
} from 'lucide-react';

export const InventoryScreen: React.FC = () => {
  const { selectedBranch } = useOutletContext<{ selectedBranch: BranchConfig }>();

  // State
  const [ingredients, setIngredients] = useState<InventoryIngredient[]>(initialIngredients);
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'warning'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals State
  const [selectedIngredient, setSelectedIngredient] = useState<InventoryIngredient | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState<boolean>(false);

  const categories = [
    'All',
    'Dairy & Milks',
    'Coffee & Beans',
    'Produce',
    'Dry Goods & Baking',
    'Proteins',
  ];

  // Filtering
  const filteredIngredients = ingredients.filter((item) => {
    const matchesSearch =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    const matchesStatus =
      statusFilter === 'all' || item.status === 'low' || item.status === 'critical';

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const criticalCount = ingredients.filter((i) => i.status === 'critical').length;
  const lowCount = ingredients.filter((i) => i.status === 'low').length;

  // Handle Adjustment Save
  const handleSaveAdjustment = (
    ingredientId: string,
    delta: number,
    newTotal: number,
    reason: string
  ) => {
    // 1. Update ingredient state
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.id === ingredientId) {
          let newStatus: 'ok' | 'low' | 'critical' = 'ok';
          if (newTotal <= ing.reorderLevel * 0.5) {
            newStatus = 'critical';
          } else if (newTotal <= ing.reorderLevel) {
            newStatus = 'low';
          }
          return {
            ...ing,
            currentStock: newTotal,
            status: newStatus,
          };
        }
        return ing;
      })
    );

    // 2. Prepend audit movement
    const newMovement: StockMovement = {
      id: `mov_${Date.now()}`,
      ingredientId,
      type: delta >= 0 ? 'manual_adjustment' : 'waste',
      quantityDelta: delta,
      resultingQuantity: newTotal,
      reason,
      recordedBy: 'Shift Manager (Marco S.)',
      timestamp: new Date().toISOString(),
    };
    setMovements((prev) => [newMovement, ...prev]);

    // 3. Show confirmation toast
    setToastMessage(`Stock updated successfully. Audit log #${newMovement.id} recorded.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenDetail = (ing: InventoryIngredient) => {
    setSelectedIngredient(ing);
    setIsDetailOpen(true);
  };

  const handleOpenAdjust = (ing: InventoryIngredient) => {
    setSelectedIngredient(ing);
    setIsAdjustmentOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Inventory & Ingredients
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Perpetual ingredient balances for {selectedBranch.name}
          </p>
        </div>

        {/* Quick Stock Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              statusFilter === 'all'
                ? 'border-brand bg-brand/20 text-brand-fg font-semibold'
                : 'border-surface-border bg-surface text-gray-400 hover:text-white'
            }`}
          >
            All Items ({ingredients.length})
          </button>
          <button
            onClick={() => setStatusFilter('warning')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              statusFilter === 'warning'
                ? 'border-amber-500 bg-amber-950/50 text-amber-300 font-semibold'
                : 'border-surface-border bg-surface text-gray-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            Needs Attention ({criticalCount + lowCount})
          </button>
        </div>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ingredient name, SKU, or supplier..."
            className="w-full h-11 rounded-xl border border-surface-border bg-surface px-10 text-xs sm:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors border ${
                selectedCategory === cat
                  ? 'bg-brand text-brand-fg border-brand font-semibold shadow-sm'
                  : 'bg-surface-elevated text-gray-300 border-surface-border hover:bg-surface-active'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Inventory Table (Desktop) / Cards (Mobile) */}
      <Card className="overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-surface-border bg-surface-elevated/40 text-gray-400">
                <th className="py-3 px-4 font-medium">Ingredient Name & SKU</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium text-right">On-Hand Stock</th>
                <th className="py-3 px-4 font-medium text-right">Reorder Level</th>
                <th className="py-3 px-4 font-medium text-right">Unit Cost</th>
                <th className="py-3 px-4 font-medium text-center">Status</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filteredIngredients.map((item) => (
                <tr key={item.id} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-[11px] text-gray-400 font-mono">
                      {item.sku} • {item.storageLocation}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-gray-300">{item.category}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-mono font-bold text-white text-sm">
                      {item.currentStock}
                    </span>{' '}
                    <span className="text-gray-400 text-xs">{item.unit}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-400">
                    {item.reorderLevel} {item.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-gray-200">
                    {formatCurrency(item.unitCost)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant={
                        item.status === 'critical'
                          ? 'danger'
                          : item.status === 'low'
                          ? 'warning'
                          : 'success'
                      }
                      size="sm"
                    >
                      {item.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDetail(item)}
                    >
                      Details
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenAdjust(item)}
                    >
                      Adjust
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards List (Phones <768px) */}
        <div className="md:hidden divide-y divide-surface-border">
          {filteredIngredients.map((item) => (
            <div key={item.id} className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-white text-sm">{item.name}</h4>
                  <p className="text-[11px] text-gray-400 font-mono">
                    {item.sku} • {item.category}
                  </p>
                </div>
                <Badge
                  variant={
                    item.status === 'critical'
                      ? 'danger'
                      : item.status === 'low'
                      ? 'warning'
                      : 'success'
                  }
                  size="sm"
                >
                  {item.status.toUpperCase()}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 py-1.5 px-2 rounded-lg bg-surface-elevated text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 block">Current</span>
                  <span className="font-bold text-white">
                    {item.currentStock} {item.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Reorder At</span>
                  <span className="font-medium text-gray-300">
                    {item.reorderLevel} {item.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Unit Cost</span>
                  <span className="font-medium text-gray-300">
                    {formatCurrency(item.unitCost)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOpenDetail(item)}
                >
                  View History
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOpenAdjust(item)}
                >
                  Count / Adjust
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modals */}
      <StockAdjustmentModal
        ingredient={selectedIngredient}
        isOpen={isAdjustmentOpen}
        onClose={() => setIsAdjustmentOpen(false)}
        onSaveAdjustment={handleSaveAdjustment}
      />

      <IngredientDetailModal
        ingredient={selectedIngredient}
        movements={movements}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onOpenAdjustment={handleOpenAdjust}
      />
    </div>
  );
};
