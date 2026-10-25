import React, { useMemo } from 'react';
import { ChevronLeft, Plus, Minus, Trash2 } from 'lucide-react';
import { CustomerCartItem } from '../types';
import { formatCurrency, roundMoney } from '@/lib/currency';
import { TablewiseAlert } from './TablewiseAlert';

interface BasketViewProps {
  restaurantName: string;
  tableNumber: string;
  cartItems: CustomerCartItem[];
  onBackToMenu: () => void;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onProceedToReview: () => void;
}

export const BasketView: React.FC<BasketViewProps> = ({
  restaurantName,
  tableNumber,
  cartItems,
  onBackToMenu,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToReview,
}) => {
  // Check if any items are flagged unavailable
  const unavailableItems = useMemo(
    () => cartItems.filter((i) => i.isUnavailable),
    [cartItems]
  );

  // Financial calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.lineTotal, 0);
  }, [cartItems]);

  const taxRate = 0.1; // 10% tax example from Figma
  const serviceChargeRate = 0.05; // 5% service charge example from Figma
  const taxAmount = roundMoney(subtotal * taxRate);
  const serviceChargeAmount = roundMoney(subtotal * serviceChargeRate);
  const totalAmount = roundMoney(subtotal + taxAmount + serviceChargeAmount);

  const totalItemCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const getDishImage = (item: CustomerCartItem): string => {
    if (item.menuItem.image_url) return item.menuItem.image_url;
    const nameLower = item.menuItem.name.toLowerCase();
    if (nameLower.includes('salmon') || nameLower.includes('fish')) {
      return '/images/tablewise/grilled_salmon.jpg';
    }
    if (nameLower.includes('salad') || nameLower.includes('egg') || nameLower.includes('toast')) {
      return '/images/tablewise/hero_egg_salad.jpg';
    }
    if (nameLower.includes('lemon') || nameLower.includes('brew') || nameLower.includes('tea') || nameLower.includes('drink')) {
      return '/images/tablewise/lemonade.jpg';
    }
    if (nameLower.includes('bowl') || nameLower.includes('pastry') || nameLower.includes('smoothie')) {
      return '/images/tablewise/smoothie_bowl.jpg';
    }
    return '/images/tablewise/grilled_salmon.jpg';
  };

  // 1. Empty Basket State (Frame 04b)
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#2D2D2D] text-white flex flex-col font-poppins select-none max-w-md mx-auto relative p-5 shadow-2xl">
        {/* Header */}
        <header className="flex items-center justify-between pb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToMenu}
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bebas text-3xl text-white tracking-wide uppercase">
              BASKET
            </h1>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold">
            Table {tableNumber}
          </div>
        </header>

        <p className="text-sm text-white/70 font-normal">
          {restaurantName} · Dine-in
        </p>

        {/* Empty Content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-4 my-auto">
          <h2 className="font-poppins font-semibold text-xl text-white">
            Your basket is empty
          </h2>
          <p className="text-sm text-white/70 leading-relaxed font-normal max-w-xs">
            Add items from the menu to start your order.
          </p>

          <button
            type="button"
            onClick={onBackToMenu}
            className="mt-4 w-full py-3.5 px-6 rounded-full bg-[#2FDBBC] hover:bg-[#28c5a9] text-[#2D2D2D] font-bebas text-xl tracking-wider uppercase transition-all duration-150 active:scale-[0.98] shadow-lg flex items-center justify-center font-normal"
          >
            BROWSE MENU
          </button>
          <span className="text-xs text-white/50 font-normal">
            Items you add will appear here.
          </span>
        </div>
      </div>
    );
  }

  // 2. Normal / Review Needed Basket State (Frame 04 and 04c)
  return (
    <div className="min-h-screen bg-[#2D2D2D] text-white flex flex-col font-poppins select-none max-w-md mx-auto relative pb-36 shadow-2xl p-5">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToMenu}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bebas text-3xl text-white tracking-wide uppercase">
            BASKET
          </h1>
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold">
          Table {tableNumber}
        </div>
      </header>

      <p className="text-sm text-white/70 font-normal mb-4">
        {restaurantName} · Dine-in
      </p>

      {/* Warning/Error Banners if review needed (Frame 04c) */}
      {unavailableItems.length > 0 && (
        <div className="flex flex-col gap-2.5 mb-4">
          <TablewiseAlert type="warning">
            Some prices changed since you added items. Review before continuing.
          </TablewiseAlert>
          <TablewiseAlert type="error">
            {unavailableItems.map((i) => i.menuItem.name).join(', ')} is no longer available. Remove it to continue.
          </TablewiseAlert>
        </div>
      )}

      {/* Cart Items List */}
      <div className="flex flex-col gap-3.5">
        {cartItems.map((cartItem) => {
          const isDrink = cartItem.menuItem.category_id?.includes('drink') || cartItem.menuItem.name.toLowerCase().includes('lemonade');

          return (
            <div
              key={cartItem.id}
              className="rounded-2xl bg-white/[0.08] border border-white/10 p-4 flex flex-col gap-3 shadow-sm"
            >
              {/* Item Info Row */}
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 shrink-0 relative flex items-center justify-center">
                  {isDrink ? (
                    <div className="w-full h-full bg-white/10 flex flex-col items-center justify-center p-1 text-center">
                      <span className="text-[9px] font-bebas text-white/60 tracking-wider">DRINK</span>
                      <span className="text-[10px] font-medium text-white truncate max-w-full">
                        {cartItem.menuItem.name}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={getDishImage(cartItem)}
                      alt={cartItem.menuItem.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-poppins font-medium text-sm text-white truncate">
                      {cartItem.menuItem.name}
                    </h3>
                    <span className="font-poppins font-semibold text-sm text-[#2FDBBC] shrink-0">
                      {formatCurrency(cartItem.lineTotal)}
                    </span>
                  </div>

                  {/* Variant info */}
                  <div className="text-xs text-white/70">
                    {cartItem.quantity} × {cartItem.selectedVariant ? cartItem.selectedVariant.name : 'Regular'}{' '}
                    <span className="text-white/50">· {formatCurrency(cartItem.unitPrice)} / item</span>
                  </div>

                  {/* Add-ons */}
                  {cartItem.selectedAddons.length > 0 && (
                    <div className="text-xs text-white/60">
                      {cartItem.selectedAddons.map((a) => `${a.name} (+${formatCurrency(a.additional_price)} each)`).join(', ')}
                    </div>
                  )}

                  {/* Special Instructions */}
                  {cartItem.specialInstructions && (
                    <div className="text-xs text-white/50 italic">
                      "{cartItem.specialInstructions}"
                    </div>
                  )}

                  {/* Unavailable warning indicator */}
                  {cartItem.isUnavailable && (
                    <span className="text-xs font-semibold text-[#F77272]">
                      Unavailable
                    </span>
                  )}
                </div>
              </div>

              {/* Stepper & Actions Row */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-xs text-white/60 font-medium">Qty</span>
                <div className="flex items-center gap-2">
                  <div className="bg-white/10 rounded-xl flex items-center p-1 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (cartItem.quantity <= 1) {
                          onRemoveItem(cartItem.id);
                        } else {
                          onUpdateQuantity(cartItem.id, cartItem.quantity - 1);
                        }
                      }}
                      className="w-8 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
                    >
                      {cartItem.quantity <= 1 ? (
                        <Trash2 className="w-3.5 h-3.5 text-[#F77272]" />
                      ) : (
                        <Minus className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <span className="font-poppins font-semibold text-xs text-white px-1">
                      {cartItem.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(cartItem.id, cartItem.quantity + 1)}
                      className="w-8 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SUMMARY Card */}
      <div className="mt-5 rounded-2xl bg-white/[0.08] border border-white/10 p-5 flex flex-col gap-2.5 shadow-sm">
        <h2 className="font-bebas text-base tracking-wider uppercase text-white/90">
          SUMMARY
        </h2>

        <div className="flex items-center justify-between text-xs text-white/80">
          <span>Item subtotal</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-white/80">
          <span>Tax (example 10%)</span>
          <span className="font-medium">{formatCurrency(taxAmount)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-white/80">
          <span>Service charge (example 5%)</span>
          <span className="font-medium">{formatCurrency(serviceChargeAmount)}</span>
        </div>

        <div className="border-t border-white/10 my-1" />

        <div className="flex items-center justify-between">
          <span className="font-bebas text-lg tracking-wider uppercase text-white">
            TOTAL
          </span>
          <span className="font-poppins font-bold text-2xl text-[#2FDBBC]">
            {formatCurrency(totalAmount)}
          </span>
        </div>

        <p className="text-[11px] text-white/50 leading-relaxed font-normal mt-1">
          {totalItemCount} items · Taxes and charges appear only if the restaurant has configured them.
        </p>
      </div>

      {/* Sticky Bottom Checkout Area */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-[#2D2D2D] border-t border-white/10 z-30 max-w-md mx-auto flex flex-col items-center gap-2">
        {unavailableItems.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              unavailableItems.forEach((item) => onRemoveItem(item.id));
            }}
            className="w-full py-3.5 px-6 rounded-full bg-[#1e4d44] hover:bg-[#256055] text-[#2FDBBC] font-bebas text-lg tracking-wider uppercase transition-all duration-150 active:scale-[0.98] shadow-lg flex items-center justify-center font-normal"
          >
            REMOVE UNAVAILABLE ITEMS
          </button>
        ) : (
          <button
            type="button"
            onClick={onProceedToReview}
            className="w-full py-3.5 px-6 rounded-full bg-[#2FDBBC] hover:bg-[#28c5a9] text-[#2D2D2D] font-bebas text-xl tracking-wider uppercase transition-all duration-150 active:scale-[0.98] shadow-xl flex items-center justify-center font-normal"
          >
            REVIEW & CHECKOUT
          </button>
        )}
        <p className="text-[11px] text-white/60 text-center font-normal">
          Prices are checked again when you place your order.
        </p>
      </div>
    </div>
  );
};
