import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { CustomerCartItem, OrderSubmissionStatus } from '../types';
import { formatCurrency, roundMoney } from '@/lib/currency';
import { TablewiseAlert } from './TablewiseAlert';

interface ReviewOrderViewProps {
  restaurantName: string;
  tableNumber: string;
  cartItems: CustomerCartItem[];
  submissionStatus: OrderSubmissionStatus;
  errorMessage?: string;
  onBack: () => void;
  onPlaceOrder: () => void;
}

export const ReviewOrderView: React.FC<ReviewOrderViewProps> = ({
  restaurantName,
  tableNumber,
  cartItems,
  submissionStatus,
  errorMessage,
  onBack,
  onPlaceOrder,
}) => {
  const subtotal = cartItems.reduce((acc, item) => acc + item.lineTotal, 0);
  const taxAmount = roundMoney(subtotal * 0.1);
  const serviceChargeAmount = roundMoney(subtotal * 0.05);
  const totalAmount = roundMoney(subtotal + taxAmount + serviceChargeAmount);

  const isPlacing = submissionStatus === 'submitting';
  const isFailed = submissionStatus === 'failed';

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

  return (
    <div className="min-h-screen bg-[#2D2D2D] text-white flex flex-col font-poppins select-none max-w-md mx-auto relative pb-36 shadow-2xl p-5">
      {/* Top Header */}
      <header className="flex items-center gap-3 pb-5">
        <button
          type="button"
          disabled={isPlacing}
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 flex items-center justify-center text-white transition-all active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bebas text-3xl text-white tracking-wide uppercase">
          REVIEW ORDER
        </h1>
      </header>

      <div className="flex flex-col gap-4">
        {/* Card 1: Restaurant & Table Details */}
        <div className="rounded-3xl bg-white text-[#2D2D2D] p-5 flex flex-col gap-3 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="font-bebas text-xl text-[#2D2D2D] tracking-wider uppercase">
              {restaurantName}
            </h2>
            <span className="px-3 py-1 rounded-full bg-[#F4F4F4] text-xs font-medium text-[#2D2D2D]">
              Dine-in
            </span>
          </div>

          <div className="text-sm font-normal text-[#2D2D2D]/80">
            Table {tableNumber}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="w-11 h-11 rounded-full bg-[#F4F4F4] text-[#2D2D2D] font-bold text-base flex items-center justify-center shrink-0">
              {tableNumber}
            </div>
            <div className="text-xs text-[#2D2D2D]/80 leading-relaxed font-normal">
              <p>Your order will be served at Table {tableNumber}.</p>
              <p>No account or saved card required.</p>
            </div>
          </div>
        </div>

        {/* Card 2: Order Summary */}
        <div className="rounded-3xl bg-white text-[#2D2D2D] p-5 flex flex-col gap-3 shadow-md">
          <h2 className="font-bebas text-base tracking-wider uppercase text-[#2D2D2D]">
            ORDER SUMMARY
          </h2>

          <div className="flex flex-col gap-3">
            {cartItems.map((cartItem) => (
              <div key={cartItem.id} className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <img
                    src={getDishImage(cartItem)}
                    alt={cartItem.menuItem.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1 text-xs font-semibold text-[#2D2D2D]">
                    <span className="truncate">{cartItem.menuItem.name}</span>
                    <span className="shrink-0">{cartItem.quantity} × {formatCurrency(cartItem.unitPrice)}</span>
                  </div>
                  <div className="text-[11px] text-[#2D2D2D]/70 font-normal">
                    {cartItem.selectedVariant ? cartItem.selectedVariant.name : 'Regular'}
                    {cartItem.selectedAddons.length > 0 &&
                      ` • ${cartItem.selectedAddons.map((a) => a.name).join(', ')}`}
                  </div>
                  {cartItem.specialInstructions && (
                    <div className="text-[11px] text-[#2D2D2D]/50 italic">
                      "{cartItem.specialInstructions}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-3 flex flex-col gap-1.5 text-xs text-[#2D2D2D]/80 font-normal">
            <div className="flex items-center justify-between">
              <span>Item subtotal</span>
              <span className="font-medium text-[#2D2D2D]">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tax (example 10%)</span>
              <span className="font-medium text-[#2D2D2D]">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Service charge (example 5%)</span>
              <span className="font-medium text-[#2D2D2D]">{formatCurrency(serviceChargeAmount)}</span>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
            <span className="font-bebas text-base tracking-wider uppercase text-[#2D2D2D]">
              TOTAL
            </span>
            <span className="font-bebas text-2xl text-[#2D2D2D]">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>

        {/* Card 3: Payment Method */}
        <div className="rounded-3xl bg-white text-[#2D2D2D] p-5 flex flex-col gap-3 shadow-md">
          <h2 className="font-bebas text-base tracking-wider uppercase text-[#2D2D2D]">
            PAYMENT METHOD
          </h2>

          <div className="rounded-2xl bg-[#F4F4F4] p-3.5 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-[#2FDBBC] flex items-center justify-center shrink-0 mt-0.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#2FDBBC]" />
            </div>
            <div className="text-xs text-[#2D2D2D]">
              <p className="font-medium">Pay at counter</p>
              <p className="text-[#2D2D2D]/70 font-normal mt-0.5">
                Pay at the counter after ordering.
              </p>
            </div>
          </div>

          <p className="text-[11px] text-[#2D2D2D]/60 leading-relaxed font-normal">
            Only payment methods enabled by the restaurant are shown here.
          </p>
        </div>

        {/* Card 4: Amount Due */}
        <div className="rounded-3xl bg-white text-[#2D2D2D] p-5 flex flex-col gap-1 shadow-md">
          <span className="text-xs text-[#2D2D2D]/70 font-normal">Amount due</span>
          <span className="font-bebas text-4xl text-[#2D2D2D] leading-none my-1">
            {formatCurrency(totalAmount)}
          </span>
          <p className="text-xs text-[#2D2D2D]/80 leading-relaxed font-normal">
            Nothing is paid yet. You pay at the counter after placing your order.
          </p>
        </div>
      </div>

      {/* Sticky Bottom Placement Area */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-[#2D2D2D] border-t border-white/10 z-30 max-w-md mx-auto flex flex-col gap-2.5">
        {/* Placing state alert (Frame 05b) */}
        {isPlacing && (
          <TablewiseAlert type="info">
            Placing your order. Please don't close this screen or tap again.
          </TablewiseAlert>
        )}

        {/* Failed state alert (Frame 05c) */}
        {isFailed && (
          <TablewiseAlert type="error">
            {errorMessage || "We couldn't place your order. No payment has been taken. Please try again."}
          </TablewiseAlert>
        )}

        {isFailed ? (
          <button
            type="button"
            onClick={onPlaceOrder}
            className="w-full py-3.5 px-6 rounded-full bg-[#2FDBBC] hover:bg-[#28c5a9] text-[#2D2D2D] font-bebas text-xl tracking-wider uppercase transition-all duration-150 active:scale-[0.98] shadow-xl flex items-center justify-center font-normal"
          >
            TRY AGAIN
          </button>
        ) : (
          <button
            type="button"
            disabled={isPlacing}
            onClick={onPlaceOrder}
            className={`w-full py-3.5 px-6 rounded-full font-bebas text-xl tracking-wider uppercase transition-all duration-150 shadow-xl flex items-center justify-center font-normal ${
              isPlacing
                ? 'bg-[#2FDBBC]/60 text-[#2D2D2D] cursor-wait'
                : 'bg-[#2FDBBC] hover:bg-[#28c5a9] text-[#2D2D2D] active:scale-[0.98]'
            }`}
          >
            {isPlacing ? 'PLACING ORDER...' : 'PLACE ORDER'}
          </button>
        )}
      </div>
    </div>
  );
};
