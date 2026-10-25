import React from 'react';
import { Check } from 'lucide-react';
import { CustomerCartItem, OrderSubmissionStatus } from '../types';
import { formatCurrency, roundMoney } from '@/lib/currency';
import { TablewiseAlert } from './TablewiseAlert';

interface OrderConfirmationViewProps {
  restaurantName: string;
  tableNumber: string;
  orderNumber: string;
  cartItems: CustomerCartItem[];
  submissionStatus: OrderSubmissionStatus;
  errorMessage?: string;
  onReturnToMenu: () => void;
  onRetry: () => void;
  onBackToBasket: () => void;
}

export const OrderConfirmationView: React.FC<OrderConfirmationViewProps> = ({
  restaurantName,
  tableNumber,
  orderNumber,
  cartItems,
  submissionStatus,
  errorMessage,
  onReturnToMenu,
  onRetry,
  onBackToBasket,
}) => {
  const subtotal = cartItems.reduce((acc, item) => acc + item.lineTotal, 0);
  const taxAmount = roundMoney(subtotal * 0.1);
  const serviceChargeAmount = roundMoney(subtotal * 0.05);
  const totalAmount = roundMoney(subtotal + taxAmount + serviceChargeAmount);

  // 1. Submitting state (Frame 06b)
  if (submissionStatus === 'submitting') {
    return (
      <div className="min-h-screen bg-[#2D2D2D] text-white flex flex-col font-poppins select-none max-w-md mx-auto relative pb-32 shadow-2xl p-5">
        <header className="flex items-center justify-between pb-2">
          <h1 className="font-bebas text-3xl text-white tracking-wide uppercase">
            PLACING ORDER
          </h1>
          <div className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold">
            Pending
          </div>
        </header>

        <p className="text-sm text-[#2FDBBC] font-normal mb-4">
          {restaurantName} • Table {tableNumber}
        </p>

        {/* Sending Kitchen Card */}
        <div className="rounded-3xl border border-[#2FDBBC] bg-white/[0.04] p-5 flex flex-col gap-3 shadow-md mb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs text-white">
              <span className="w-2 h-2 rounded-full bg-[#2FDBBC] animate-pulse" />
              <span>Sending</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/10 text-xs text-white">
              Table {tableNumber}
            </span>
          </div>

          <h2 className="font-bebas text-2xl text-white tracking-wider uppercase mt-1">
            SENDING YOUR ORDER TO THE KITCHEN
          </h2>

          <p className="text-xs text-white/80 leading-relaxed font-normal">
            Please wait. Don't close this screen or tap again.
          </p>
        </div>

        {/* Basket Summary Review */}
        <div className="rounded-3xl bg-white/[0.08] border border-white/10 p-5 flex flex-col gap-3 shadow-sm mb-4">
          <h3 className="font-bebas text-base tracking-wider uppercase text-white/90">
            YOUR BASKET
          </h3>

          <div className="flex flex-col gap-2.5">
            {cartItems.map((item) => (
              <div key={item.id} className="flex flex-col gap-0.5 text-xs text-white">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.menuItem.name}</span>
                  <span className="font-semibold text-white/90">{formatCurrency(item.lineTotal)}</span>
                </div>
                <div className="text-[11px] text-white/60">
                  {item.quantity} × {item.selectedVariant ? item.selectedVariant.name : 'Regular'}{' '}
                  <span className="text-white/40">· {formatCurrency(item.unitPrice)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-2 flex items-center justify-between text-xs">
            <span className="text-white/70">TOTAL</span>
            <span className="font-bold text-sm text-[#2FDBBC]">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Bottom Back Button */}
        <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#2D2D2D] via-[#2D2D2D]/95 to-transparent z-30 max-w-md mx-auto">
          <button
            type="button"
            onClick={onBackToBasket}
            className="w-full py-3.5 px-6 rounded-full bg-[#1e4d44] hover:bg-[#256055] text-[#2FDBBC] font-bebas text-xl tracking-wider uppercase transition-all duration-150 active:scale-[0.98] shadow-lg flex items-center justify-center font-normal"
          >
            BACK TO BASKET
          </button>
        </div>
      </div>
    );
  }

  // 2. Failed state (Frame 06c)
  if (submissionStatus === 'failed') {
    return (
      <div className="min-h-screen bg-[#2D2D2D] text-white flex flex-col font-poppins select-none max-w-md mx-auto relative pb-32 shadow-2xl p-5">
        <header className="flex items-center justify-between pb-2">
          <h1 className="font-bebas text-3xl text-white tracking-wide uppercase">
            ORDER NOT PLACED
          </h1>
          <div className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold">
            No order #
          </div>
        </header>

        <p className="text-sm text-[#2FDBBC] font-normal mb-4">
          {restaurantName} • Table {tableNumber}
        </p>

        {/* Failed Card */}
        <div className="rounded-3xl border border-[#F77272] bg-white/[0.04] p-5 flex flex-col gap-3 shadow-md mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs text-white">
              <span className="w-2 h-2 rounded-full bg-[#F77272]" />
              <span>Failed</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/10 text-xs text-white">
              Table {tableNumber}
            </span>
          </div>

          <h2 className="font-bebas text-2xl text-white tracking-wider uppercase mt-1">
            WE COULDN'T PLACE YOUR ORDER
          </h2>

          <p className="text-xs text-white/80 leading-relaxed font-normal">
            Your basket is saved. No payment has been taken. Try again or ask staff for help.
          </p>
        </div>

        {/* Error Alert */}
        <TablewiseAlert type="error" className="mb-4">
          {errorMessage || 'Order creation failed. Please try again.'}
        </TablewiseAlert>

        {/* Basket breakdown */}
        <div className="rounded-3xl bg-white/[0.08] border border-white/10 p-5 flex flex-col gap-3 shadow-sm mb-4">
          <h3 className="font-bebas text-base tracking-wider uppercase text-white/90">
            YOUR BASKET
          </h3>

          <div className="flex flex-col gap-2.5">
            {cartItems.map((item) => (
              <div key={item.id} className="flex flex-col gap-0.5 text-xs text-white">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.menuItem.name}</span>
                  <span className="font-semibold text-white/90">{formatCurrency(item.lineTotal)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-2 flex items-center justify-between text-xs">
            <span className="text-white/70">TOTAL</span>
            <span className="font-bold text-sm text-[#2FDBBC]">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Bottom Try Again Button */}
        <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#2D2D2D] via-[#2D2D2D]/95 to-transparent z-30 max-w-md mx-auto">
          <button
            type="button"
            onClick={onRetry}
            className="w-full py-3.5 px-6 rounded-full bg-[#2FDBBC] hover:bg-[#28c5a9] text-[#2D2D2D] font-bebas text-xl tracking-wider uppercase transition-all duration-150 active:scale-[0.98] shadow-xl flex items-center justify-center font-normal"
          >
            TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  // 3. Normal / Order Placed Success State (Frame 06)
  return (
    <div className="min-h-screen bg-[#2D2D2D] text-white flex flex-col font-poppins select-none max-w-md mx-auto relative pb-32 shadow-2xl p-5">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-2">
        <h1 className="font-bebas text-3xl text-white tracking-wide uppercase">
          ORDER PLACED
        </h1>
        <div className="px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold">
          #{orderNumber}
        </div>
      </header>

      <p className="text-sm text-[#2FDBBC] font-normal mb-4">
        {restaurantName} • Table {tableNumber}
      </p>

      {/* Kitchen Card */}
      <div className="rounded-3xl border border-[#2FDBBC] bg-white/[0.04] p-5 flex flex-col gap-3 shadow-md mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs text-white">
            <span className="w-2 h-2 rounded-full bg-[#2FDBBC] animate-pulse" />
            <span>Preparing</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-white/10 text-xs text-white">
            Table {tableNumber}
          </span>
        </div>

        <h2 className="font-bebas text-2xl text-white tracking-wider uppercase mt-1">
          ORDER SENT TO THE KITCHEN
        </h2>

        <p className="text-xs text-white/80 leading-relaxed font-normal">
          Your food will be brought to Table {tableNumber}. Status below shows the latest update from the restaurant.
        </p>
      </div>

      {/* Order Status Stepper */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex items-center justify-between">
          <span className="font-bebas text-base tracking-wider uppercase text-white/90">
            ORDER STATUS
          </span>
          <span className="text-xs text-[#2FDBBC] font-normal cursor-pointer hover:underline">
            Latest update
          </span>
        </div>

        <div className="flex items-center justify-between px-4 py-3 bg-white/[0.05] rounded-2xl border border-white/5">
          {/* Step 1: Accepted */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-[#2FDBBC] flex items-center justify-center text-[#2D2D2D] shadow-sm">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <span className="text-xs font-medium text-white/90">Accepted</span>
          </div>

          {/* Connector */}
          <div className="h-0.5 flex-1 bg-[#2FDBBC]/40 mx-2" />

          {/* Step 2: Preparing */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-[#2FDBBC] flex items-center justify-center shadow-md">
              <div className="w-3 h-3 rounded-full bg-[#2D2D2D] animate-ping" />
            </div>
            <span className="text-xs font-semibold text-[#2FDBBC]">Preparing</span>
          </div>

          {/* Connector */}
          <div className="h-0.5 flex-1 bg-white/15 mx-2" />

          {/* Step 3: Ready */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/60">
              3
            </div>
            <span className="text-xs font-normal text-white/50">Ready</span>
          </div>
        </div>
      </div>

      {/* Order Summary Breakdown Card */}
      <div className="rounded-3xl bg-white/[0.08] border border-white/10 p-5 flex flex-col gap-3 shadow-sm mb-4">
        <h3 className="font-bebas text-base tracking-wider uppercase text-white/90">
          ORDER SUMMARY
        </h3>

        <div className="flex flex-col gap-3">
          {cartItems.map((cartItem) => (
            <div key={cartItem.id} className="flex items-start justify-between text-xs text-white">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{cartItem.menuItem.name}</span>
                <span className="text-[11px] text-white/60">
                  {cartItem.selectedVariant ? cartItem.selectedVariant.name : 'Regular'}
                  {cartItem.selectedAddons.length > 0 &&
                    ` • ${cartItem.selectedAddons.map((a) => a.name).join(', ')}`}
                </span>
                {cartItem.specialInstructions && (
                  <span className="text-[11px] text-white/40 italic">
                    "{cartItem.specialInstructions}"
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="text-white/60 block">{cartItem.quantity} × {formatCurrency(cartItem.unitPrice)}</span>
                <span className="font-semibold">{formatCurrency(cartItem.lineTotal)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-3 flex flex-col gap-1.5 text-xs text-white/80">
          <div className="flex items-center justify-between">
            <span>Item subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tax (example 10%)</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Service charge (example 5%)</span>
            <span>{formatCurrency(serviceChargeAmount)}</span>
          </div>
        </div>

        <div className="border-t border-white/10 pt-2 flex items-center justify-between">
          <span className="font-bebas text-base tracking-wider uppercase text-white">
            TOTAL
          </span>
          <span className="font-poppins font-bold text-xl text-[#2FDBBC]">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {/* Payment Status Card */}
      <div className="rounded-3xl bg-white/[0.08] border border-white/10 p-5 flex flex-col gap-2.5 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bebas text-base tracking-wider uppercase text-white">
            PAYMENT STATUS
          </h3>
          <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium">
            Due at counter
          </span>
        </div>

        <p className="text-xs text-white/70 leading-relaxed font-normal">
          {formatCurrency(totalAmount)} is still to be paid at the counter. Order confirmation is separate from payment.
        </p>
      </div>

      {/* Sticky Bottom Return Button */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-[#2D2D2D] border-t border-white/10 z-30 max-w-md mx-auto">
        <button
          type="button"
          onClick={onReturnToMenu}
          className="w-full py-3.5 px-6 rounded-full bg-[#2FDBBC] hover:bg-[#28c5a9] text-[#2D2D2D] font-bebas text-xl tracking-wider uppercase transition-all duration-150 active:scale-[0.98] shadow-xl flex items-center justify-center font-normal"
        >
          RETURN TO MENU
        </button>
      </div>
    </div>
  );
};
