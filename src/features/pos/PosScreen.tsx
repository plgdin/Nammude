import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { mockCategories, mockMenuItems, MenuItem, MenuItemModifier } from '@/mocks/menu.data';
import { BranchConfig } from '@/config/tenant.config';
import { formatCurrency, roundMoney } from '@/lib/currency';
import { Button } from '@/components/ui/Button';
import { ModifierModal } from './ModifierModal';
import { PaymentModal } from './PaymentModal';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CreditCard,
  X,
  ChevronRight,
  Percent,
} from 'lucide-react';

export interface CartLineItem {
  id: string; // Unique cart line ID
  item: MenuItem;
  quantity: number;
  selectedModifiers: MenuItemModifier[];
  instructions?: string;
  unitPriceWithModifiers: number;
  lineTotal: number;
}

export const PosScreen: React.FC = () => {
  const { selectedBranch } = useOutletContext<{ selectedBranch: BranchConfig }>();

  // State
  const [selectedCategory, setSelectedCategory] = useState<string>('cat_all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orderType, setOrderType] = useState<'Dine-In' | 'Takeaway' | 'Bar'>('Dine-In');
  const [selectedTable, setSelectedTable] = useState<string>('T-04');
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);

  // Modals
  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [simulatedOrderNum, setSimulatedOrderNum] = useState<string>('#143');

  // Filtered Menu Items
  const filteredItems = mockMenuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === 'cat_all' || item.categoryId === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Add Item to Cart (opens modifiers if item has them)
  const handleItemClick = (item: MenuItem) => {
    if (!item.isAvailable) return;

    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setModifierItem(item);
    } else {
      addCartLine(item, [], '');
    }
  };

  const addCartLine = (
    item: MenuItem,
    selectedModifiers: MenuItemModifier[],
    instructions: string
  ) => {
    const modTotal = selectedModifiers.reduce((acc, m) => acc + m.additionalPrice, 0);
    const unitPrice = item.price + modTotal;

    // Check if identical item with identical modifiers exists
    const modIds = selectedModifiers.map((m) => m.id).sort().join('-');
    const existingIndex = cart.findIndex(
      (c) =>
        c.item.id === item.id &&
        c.selectedModifiers.map((m) => m.id).sort().join('-') === modIds &&
        (c.instructions || '') === (instructions || '')
    );

    if (existingIndex > -1) {
      setCart((prev) => {
        const next = [...prev];
        next[existingIndex].quantity += 1;
        next[existingIndex].lineTotal = roundMoney(
          next[existingIndex].quantity * next[existingIndex].unitPriceWithModifiers
        );
        return next;
      });
    } else {
      const newLine: CartLineItem = {
        id: `cart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        item,
        quantity: 1,
        selectedModifiers,
        instructions,
        unitPriceWithModifiers: unitPrice,
        lineTotal: unitPrice,
      };
      setCart((prev) => [...prev, newLine]);
    }
  };

  // Quantity adjustments
  const handleUpdateQuantity = (lineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.id === lineId) {
            const newQty = line.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...line,
              quantity: newQty,
              lineTotal: roundMoney(newQty * line.unitPriceWithModifiers),
            };
          }
          return line;
        })
        .filter((l): l is CartLineItem => l !== null)
    );
  };

  const handleRemoveLine = (lineId: string) => {
    setCart((prev) => prev.filter((l) => l.id !== lineId));
  };

  // Financial Calculations
  const subtotal = roundMoney(cart.reduce((sum, line) => sum + line.lineTotal, 0));
  const discountAmount = roundMoney((subtotal * discountPercent) / 100);
  const discountedSubtotal = Math.max(0, roundMoney(subtotal - discountAmount));
  const taxRate = selectedBranch.taxRate; // e.g. 0.0825
  const taxAmount = roundMoney(discountedSubtotal * taxRate);
  const totalPayable = roundMoney(discountedSubtotal + taxAmount);
  const totalItemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const handleCheckoutSuccess = (_method: string, _tendered: number, _change: number) => {
    // Clear cart and increment order sequence
    setCart([]);
    setDiscountPercent(0);
    setSimulatedOrderNum((prev) => {
      const num = parseInt(prev.replace('#', ''), 10) + 1;
      return `#${num}`;
    });
    setIsMobileCartOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full">
      {/* LEFT SECTION: Catalog, Categories & Search */}
      <div className="flex-1 flex flex-col p-3 sm:p-5 overflow-y-auto space-y-4">
        {/* Top Controls: Order Type & Dining Table */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-surface-border">
          {/* Order Type Toggle */}
          <div className="flex rounded-lg border border-surface-border bg-surface-elevated p-1">
            {(['Dine-In', 'Takeaway', 'Bar'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setOrderType(type)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[36px] ${
                  orderType === type
                    ? 'bg-brand text-brand-fg shadow-sm'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Table Selector (when Dine-In) */}
          {orderType === 'Dine-In' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Table:</span>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="rounded-lg border border-surface-border bg-surface-elevated px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07', 'T-08', 'T-09', 'T-10'].map(
                  (tbl) => (
                    <option key={tbl} value={tbl}>
                      {tbl} (Indoor)
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          <div className="text-xs text-gray-400 font-mono">
            Active Order: <span className="text-white font-semibold">{simulatedOrderNum}</span>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by name or SKU (e.g. Flat White, Croissant)..."
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

        {/* Horizontal Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {mockCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors min-h-[40px] border ${
                selectedCategory === cat.id
                  ? 'bg-brand text-brand-fg border-brand shadow-sm'
                  : 'bg-surface-elevated text-gray-300 border-surface-border hover:bg-surface-active'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              disabled={!item.isAvailable}
              className={`flex flex-col justify-between text-left p-3 rounded-xl border transition-all text-xs select-none touch-manipulation min-h-[120px] ${
                item.isAvailable
                  ? 'border-surface-border bg-surface hover:bg-surface-elevated hover:border-gray-600 active:scale-[0.98]'
                  : 'border-surface-border/50 bg-surface/40 opacity-50 cursor-not-allowed'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1">
                  <h4 className="font-semibold text-white leading-tight line-clamp-2">
                    {item.name}
                  </h4>
                  {!item.isAvailable && (
                    <span className="text-[10px] text-rose-400 font-mono whitespace-nowrap">
                      86'd
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 line-clamp-2 mt-1">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 mt-2 border-t border-surface-border/60">
                <span className="font-bold text-white text-sm">
                  {formatCurrency(item.price)}
                </span>
                {item.modifierGroups && item.modifierGroups.length > 0 ? (
                  <span className="text-[10px] text-brand-fg bg-brand/30 px-1.5 py-0.5 rounded">
                    Customize
                  </span>
                ) : (
                  <span className="h-6 w-6 rounded-md bg-surface-elevated flex items-center justify-center text-gray-300">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT SECTION: Cart Drawer (Desktop sticky panel, mobile modal sheet) */}
      <div
        className={`fixed inset-0 z-40 lg:relative lg:inset-auto lg:z-auto lg:w-96 flex flex-col border-l border-surface-border bg-surface select-none transition-transform duration-200 ${
          isMobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
        }`}
      >
        {/* Cart Header */}
        <div className="flex h-16 items-center justify-between border-b border-surface-border px-4 sm:px-5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-brand" />
            <h3 className="font-bold text-white text-sm">Active Order</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-elevated text-gray-300 font-mono">
              {totalItemCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-gray-400 hover:text-rose-400 transition-colors"
                title="Clear Cart"
              >
                Clear
              </button>
            )}
            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileCartOpen(false)}
              className="lg:hidden p-1.5 rounded-md text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Cart Line Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 text-gray-400">
              <ShoppingBag className="h-10 w-10 text-gray-600 mb-2 stroke-1" />
              <p className="text-xs font-medium text-gray-300">Cart is empty</p>
              <p className="text-[11px] text-gray-500 max-w-[180px] mt-0.5">
                Tap items on the menu to add to this ticket
              </p>
            </div>
          ) : (
            cart.map((line) => (
              <div
                key={line.id}
                className="flex items-start justify-between gap-3 p-2.5 rounded-xl border border-surface-border bg-surface-elevated/70 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-white truncate">{line.item.name}</p>
                    <span className="font-bold text-white ml-2">
                      {formatCurrency(line.lineTotal)}
                    </span>
                  </div>

                  {/* Modifiers List */}
                  {line.selectedModifiers.length > 0 && (
                    <p className="text-[11px] text-brand-fg/80 mt-0.5">
                      + {line.selectedModifiers.map((m) => m.name).join(', ')}
                    </p>
                  )}

                  {/* Special Note */}
                  {line.instructions && (
                    <p className="text-[10px] text-amber-300/80 italic mt-0.5">
                      Note: {line.instructions}
                    </p>
                  )}

                  {/* Quantity Stepper & Delete */}
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-surface-border/40">
                    <span className="text-[11px] text-gray-400">
                      {formatCurrency(line.unitPriceWithModifiers)} each
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQuantity(line.id, -1)}
                        className="h-7 w-7 rounded-lg bg-surface flex items-center justify-center text-gray-300 hover:text-white border border-surface-border active:scale-95"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-bold text-white min-w-[16px] text-center font-mono">
                        {line.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(line.id, 1)}
                        className="h-7 w-7 rounded-lg bg-surface flex items-center justify-center text-gray-300 hover:text-white border border-surface-border active:scale-95"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveLine(line.id)}
                        className="h-7 w-7 rounded-lg text-gray-500 hover:text-rose-400 ml-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pricing Summary & Checkout Button */}
        <div className="border-t border-surface-border bg-surface-elevated/40 p-4 space-y-3">
          {/* Quick Discount Selector */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 flex items-center gap-1">
              <Percent className="h-3.5 w-3.5 text-gray-500" /> Discount:
            </span>
            <div className="flex gap-1.5">
              {[0, 10, 15].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setDiscountPercent(pct)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                    discountPercent === pct
                      ? 'border-brand bg-brand/20 text-brand-fg font-semibold'
                      : 'border-surface-border text-gray-400 hover:text-white'
                  }`}
                >
                  {pct === 0 ? 'None' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span className="text-gray-200 font-mono">{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount ({discountPercent}%)</span>
                <span className="font-mono">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-400">
              <span>Sales Tax ({roundMoney(selectedBranch.taxRate * 100)}%)</span>
              <span className="text-gray-200 font-mono">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-surface-border">
              <span>Total Payable</span>
              <span className="text-brand font-mono text-lg">{formatCurrency(totalPayable)}</span>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            disabled={cart.length === 0}
            onClick={() => setIsPaymentOpen(true)}
            className="w-full text-base font-bold shadow-lg h-12"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Charge {formatCurrency(totalPayable)}
          </Button>
        </div>
      </div>

      {/* MOBILE FLOATING CART BAR (Shown when items in cart on mobile) */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 p-3 bg-gradient-to-t from-canvas to-transparent pointer-events-none">
        <button
          type="button"
          onClick={() => setIsMobileCartOpen(true)}
          className="pointer-events-auto w-full flex items-center justify-between rounded-xl bg-brand p-3.5 text-white shadow-xl active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[11px]">
              {totalItemCount}
            </span>
            <span>View Order Ticket</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-sm">
            <span>{formatCurrency(totalPayable)}</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </button>
      </div>

      {/* Modals */}
      <ModifierModal
        item={modifierItem}
        isOpen={modifierItem !== null}
        onClose={() => setModifierItem(null)}
        onConfirm={addCartLine}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        totalPayable={totalPayable}
        orderNumber={simulatedOrderNum}
        orderType={orderType}
        tableNumber={selectedTable}
        onPaymentSuccess={handleCheckoutSuccess}
      />
    </div>
  );
};
