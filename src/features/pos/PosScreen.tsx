import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BranchConfig } from '@/config/tenant.config';
import { formatCurrency, roundMoney } from '@/lib/currency';
import { Button } from '@/components/ui/Button';
import { ModifierModal } from './ModifierModal';
import { PaymentModal } from './PaymentModal';
import { TableQrModal } from './TableQrModal';
import { menuService } from './services/menuService';
import { tableService } from './services/tableService';
import { orderService } from './services/orderService';
import {
  MenuCategoryRecord,
  MenuItemWithModifiers,
  DiningTableRecord,
  CartLineItem,
  SelectedModifier,
} from './types';
import { useOrganization } from '@/features/organization/OrganizationContext';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  QrCode,
  AlertCircle,
  Loader2,
  Utensils,
  CheckCircle2,
} from 'lucide-react';

export const PosScreen: React.FC = () => {
  const { currentOrganization, currentBranch } = useOrganization();
  const outletContext = useOutletContext<{ selectedBranch?: BranchConfig }>();
  const activeBranch = currentBranch || outletContext?.selectedBranch;

  // Data Loading State
  const [categories, setCategories] = useState<MenuCategoryRecord[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemWithModifiers[]>([]);
  const [tables, setTables] = useState<DiningTableRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active View & Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [selectedTable, setSelectedTable] = useState<string>('T-01');
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderSuccessBanner, setOrderSuccessBanner] = useState<string | null>(null);

  // Modals
  const [modifierItem, setModifierItem] = useState<MenuItemWithModifiers | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [activeOrderId, setActiveOrderId] = useState<string>('');
  const [activeOrderNum, setActiveOrderNum] = useState<string>('#101');
  const [qrModalTable, setQrModalTable] = useState<DiningTableRecord | null>(null);

  // Load Categories, Items and Tables
  useEffect(() => {
    let isMounted = true;
    async function loadPosData() {
      if (!currentOrganization) return;
      setIsLoading(true);
      setError(null);

      try {
        const [cats, items, tbls] = await Promise.all([
          menuService.getCategories(currentOrganization.id),
          menuService.getMenuItems(currentOrganization.id),
          activeBranch ? tableService.getTablesByBranch(activeBranch.id) : Promise.resolve([]),
        ]);

        if (isMounted) {
          setCategories(cats);
          setMenuItems(items);
          setTables(tbls);
          if (tbls.length > 0 && !tbls.some((t) => t.table_number === selectedTable)) {
            setSelectedTable(tbls[0].table_number);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load POS catalog');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPosData();
    return () => {
      isMounted = false;
    };
  }, [currentOrganization?.id, activeBranch?.id]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category_id === selectedCategory;
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Cart Click Handlers
  const handleItemClick = (item: MenuItemWithModifiers) => {
    if (!item.is_available) return;

    if (item.modifier_groups && item.modifier_groups.length > 0) {
      setModifierItem(item);
    } else {
      addToCartDirect(item, [], '');
    }
  };

  const addToCartDirect = (
    item: MenuItemWithModifiers,
    selectedModifiers: SelectedModifier[],
    instructions: string
  ) => {
    setCart((prev) => {
      // Find if line exists with identical modifiers and instructions
      const modIds = selectedModifiers.map((m) => m.modifier_id).sort().join('-');
      const existingIndex = prev.findIndex(
        (line) =>
          line.menu_item.id === item.id &&
          line.selected_modifiers.map((m) => m.modifier_id).sort().join('-') === modIds &&
          line.special_instructions === instructions
      );

      const modTotal = selectedModifiers.reduce((acc, m) => acc + m.additional_price, 0);
      const unitPrice = item.base_price + modTotal;

      if (existingIndex > -1) {
        const next = [...prev];
        const updatedQty = next[existingIndex].quantity + 1;
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: updatedQty,
          line_subtotal: roundMoney(unitPrice * updatedQty),
        };
        return next;
      }

      const newLine: CartLineItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        menu_item: item,
        quantity: 1,
        selected_modifiers: selectedModifiers,
        special_instructions: instructions,
        unit_price: unitPrice,
        line_subtotal: roundMoney(unitPrice),
      };
      return [...prev, newLine];
    });
  };

  const updateQuantity = (lineId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.id === lineId) {
            const nextQty = line.quantity + delta;
            return {
              ...line,
              quantity: nextQty,
              line_subtotal: roundMoney(line.unit_price * nextQty),
            };
          }
          return line;
        })
        .filter((line) => line.quantity > 0)
    );
  };

  const removeFromCart = (lineId: string) => {
    setCart((prev) => prev.filter((line) => line.id !== lineId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountPercent(0);
  };

  // Authoritative Totals (Calculated locally for immediate feedback; verified transactionally by server)
  const taxRate = (activeBranch as any)?.tax_rate ?? (activeBranch as any)?.taxRate ?? 0.0825;
  const rawSubtotal = cart.reduce((acc, line) => acc + line.line_subtotal, 0);
  const subtotal = roundMoney(rawSubtotal);
  const discountAmount = roundMoney(subtotal * (discountPercent / 100));
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = roundMoney(taxableAmount * taxRate);
  const totalAmount = roundMoney(taxableAmount + taxAmount);

  // Submit Order & Dispatch KOT
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !currentOrganization || !activeBranch) return;

    setIsSubmittingOrder(true);
    setOrderSuccessBanner(null);

    const targetTable = tables.find((t) => t.table_number === selectedTable);
    const idempotencyKey = `ord-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const res = await orderService.createOrder({
      organization_id: currentOrganization.id,
      branch_id: activeBranch.id,
      order_type: orderType,
      table_id: orderType === 'dine_in' ? targetTable?.id : null,
      guest_count: 2,
      discount_percent: discountPercent,
      idempotency_key: idempotencyKey,
      items: cart.map((line) => ({
        menu_item_id: line.menu_item.id,
        quantity: line.quantity,
        special_instructions: line.special_instructions,
        selected_modifiers: line.selected_modifiers,
      })),
    });

    setIsSubmittingOrder(false);

    if (res.success) {
      setActiveOrderId(res.order_id);
      setActiveOrderNum(res.order_number);
      setOrderSuccessBanner(`Order ${res.order_number} confirmed! Dispatched to Kitchen (${res.kot_number || 'KOT'}).`);
      setIsPaymentOpen(true);
      clearCart();
    } else {
      setError(res.error || 'Failed to submit order');
    }
  };

  return (
    <div className="flex h-full flex-col lg:flex-row bg-canvas select-none overflow-hidden">
      {/* LEFT: Menu Catalog & Categories */}
      <div className="flex flex-1 flex-col overflow-hidden border-r border-surface-border">
        {/* Top Controls: Search, Order Type, Table Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border bg-surface p-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coffee, bakery, SKU..."
              className="w-full rounded-xl border border-surface-border bg-surface-elevated pl-9 pr-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          {/* Order Type Toggle */}
          <div className="flex rounded-xl bg-surface-elevated p-1 border border-surface-border">
            {(['dine_in', 'takeaway'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setOrderType(type)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                  orderType === type
                    ? 'bg-brand text-brand-fg shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Table Selector & QR Trigger (for Dine-In) */}
          {orderType === 'dine_in' && tables.length > 0 && (
            <div className="flex items-center gap-1.5 bg-surface-elevated px-2 py-1 rounded-xl border border-surface-border">
              <span className="text-[11px] text-gray-400 font-medium">Table:</span>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
              >
                {tables.map((t) => (
                  <option key={t.id} value={t.table_number} className="bg-surface text-white">
                    {t.table_number} ({t.section})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const tbl = tables.find((t) => t.table_number === selectedTable) || tables[0];
                  setQrModalTable(tbl);
                }}
                className="text-gray-400 hover:text-white p-1 rounded transition-colors"
                title="View Table QR Code"
              >
                <QrCode className="h-4 w-4 text-brand" />
              </button>
            </div>
          )}
        </div>

        {/* Success Banner */}
        {orderSuccessBanner && (
          <div className="flex items-center justify-between bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2.5 text-xs text-emerald-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{orderSuccessBanner}</span>
            </div>
            <button
              onClick={() => setOrderSuccessBanner(null)}
              className="text-gray-400 hover:text-white text-xs font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/15 border-b border-red-500/30 px-4 py-2.5 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Category Horizontal Bar */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-surface-border bg-surface/50 px-4 py-2.5 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-brand text-brand-fg shadow'
                : 'bg-surface-elevated text-gray-300 hover:bg-surface-active'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-brand text-brand-fg shadow'
                  : 'bg-surface-elevated text-gray-300 hover:bg-surface-active'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-brand" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-gray-500">
              <Utensils className="h-10 w-10 stroke-[1.5] mb-2" />
              <p className="text-sm font-medium">No menu items match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredItems.map((item) => {
                const hasModifiers = item.modifier_groups && item.modifier_groups.length > 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.is_available}
                    onClick={() => handleItemClick(item)}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all min-h-[120px] ${
                      item.is_available
                        ? 'border-surface-border bg-surface-elevated hover:border-brand/50 hover:bg-surface-active active:scale-[0.98]'
                        : 'border-surface-border/40 bg-surface/40 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-bold text-white group-hover:text-brand transition-colors line-clamp-2">
                          {item.name}
                        </span>
                        {hasModifiers && (
                          <span className="shrink-0 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-brand/20 text-brand">
                            Options
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 font-mono">
                        {item.description || item.sku}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-surface-border/50 mt-2">
                      <span className="text-xs font-bold text-white font-mono">
                        {formatCurrency(item.base_price)}
                      </span>
                      {item.is_available ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface border border-surface-border text-gray-300 group-hover:bg-brand group-hover:text-brand-fg transition-all">
                          <Plus className="h-3.5 w-3.5" />
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-rose-400">Sold Out</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Live Order Cart & Checkout */}
      <div className="w-full lg:w-96 flex flex-col border-t lg:border-t-0 border-surface-border bg-surface shrink-0">
        {/* Cart Header */}
        <div className="flex h-16 items-center justify-between border-b border-surface-border px-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-brand" />
            <h3 className="text-sm font-bold text-white">Current Order</h3>
            <span className="text-xs text-gray-400 font-mono">({cart.length})</span>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-[11px] text-gray-400 hover:text-red-400 transition-colors"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-gray-500">
              <ShoppingBag className="h-8 w-8 stroke-[1.5] mb-2 text-gray-600" />
              <p className="text-xs font-medium">Cart is empty</p>
              <p className="text-[10px] text-gray-600">Select items from the catalog</p>
            </div>
          ) : (
            cart.map((line) => (
              <div
                key={line.id}
                className="flex flex-col gap-1.5 p-3 rounded-xl border border-surface-border bg-surface-elevated/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-white leading-tight">
                    {line.menu_item.name}
                  </span>
                  <span className="text-xs font-bold text-white font-mono">
                    {formatCurrency(line.line_subtotal)}
                  </span>
                </div>

                {/* Modifiers List */}
                {line.selected_modifiers.length > 0 && (
                  <div className="text-[10px] text-gray-400 space-y-0.5">
                    {line.selected_modifiers.map((m) => (
                      <div key={m.modifier_id} className="flex justify-between">
                        <span>+ {m.name}</span>
                        {m.additional_price > 0 && (
                          <span className="font-mono">+{formatCurrency(m.additional_price)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Special Instructions */}
                {line.special_instructions && (
                  <p className="text-[10px] text-amber-300 italic">
                    "{line.special_instructions}"
                  </p>
                )}

                {/* Quantity Controls */}
                <div className="flex items-center justify-between pt-1 border-t border-surface-border/40 mt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.id, -1)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface border border-surface-border text-gray-300 hover:text-white"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-white font-mono">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.id, 1)}
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface border border-surface-border text-gray-300 hover:text-white"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(line.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculation Summary & Checkout */}
        <div className="border-t border-surface-border bg-surface-elevated/40 p-4 space-y-3">
          {/* Quick Discount Percent buttons */}
          <div className="flex items-center justify-between gap-1 text-xs">
            <span className="text-[11px] text-gray-400 font-medium">Discount:</span>
            <div className="flex items-center gap-1">
              {[0, 5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDiscountPercent(pct)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    discountPercent === pct
                      ? 'bg-brand text-brand-fg'
                      : 'bg-surface-elevated text-gray-400 hover:text-white'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal:</span>
              <span className="font-mono text-white">{formatCurrency(subtotal)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Discount ({discountPercent}%):</span>
                <span className="font-mono">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-400">
              <span>Tax ({(taxRate * 100).toFixed(2)}%):</span>
              <span className="font-mono text-white">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-surface-border">
              <span>Total Payable:</span>
              <span className="font-mono text-brand text-lg">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <Button
            variant="primary"
            disabled={cart.length === 0 || isSubmittingOrder}
            onClick={handlePlaceOrder}
            className="w-full py-3.5 text-sm font-bold shadow-lg"
          >
            {isSubmittingOrder ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Dispatching Order & KOT...
              </span>
            ) : (
              `Send Order to Kitchen • ${formatCurrency(totalAmount)}`
            )}
          </Button>
        </div>
      </div>

      {/* Modifiers Modal */}
      <ModifierModal
        item={modifierItem}
        isOpen={Boolean(modifierItem)}
        onClose={() => setModifierItem(null)}
        onConfirm={(item, mods, notes) => addToCartDirect(item, mods, notes)}
      />

      {/* Payment Settlement Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        orderId={activeOrderId}
        totalPayable={totalAmount}
        orderNumber={activeOrderNum}
        orderType={orderType}
        tableNumber={orderType === 'dine_in' ? selectedTable : ''}
        onPaymentSuccess={(_method, _tender, _change) => {
          setIsPaymentOpen(false);
          setOrderSuccessBanner(`Order ${activeOrderNum} settled successfully.`);
        }}
      />

      {/* Table QR Code Modal */}
      <TableQrModal
        isOpen={Boolean(qrModalTable)}
        onClose={() => setQrModalTable(null)}
        table={qrModalTable}
      />
    </div>
  );
};
