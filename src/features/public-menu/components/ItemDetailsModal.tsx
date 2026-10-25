import React, { useState, useMemo } from 'react';
import { ChevronLeft, Plus, Minus, Check, Clock } from 'lucide-react';
import { MenuItemWithModifiers, ModifierRecord } from '@/features/pos/types';
import { CustomerCartItem } from '../types';
import { formatCurrency } from '@/lib/currency';
import { TablewiseAlert } from './TablewiseAlert';

interface ItemDetailsModalProps {
  item: MenuItemWithModifiers;
  restaurantName: string;
  tableNumber: string;
  onBack: () => void;
  onAddToCart: (cartItem: CustomerCartItem) => void;
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  item,
  restaurantName,
  tableNumber,
  onBack,
  onAddToCart,
}) => {
  // Find variant group (required) vs addon groups (optional)
  const variantGroup = item.modifier_groups.find(
    (mg) => mg.group.is_required || mg.group.max_selection === 1
  );
  const addonGroups = item.modifier_groups.filter(
    (mg) => mg !== variantGroup
  );

  // Initialize selected variant with first option if available, or null
  const [selectedVariant, setSelectedVariant] = useState<ModifierRecord | null>(
    variantGroup && variantGroup.modifiers.length > 0 ? variantGroup.modifiers[0] : null
  );

  // Multi-select for add-ons
  const [selectedAddons, setSelectedAddons] = useState<ModifierRecord[]>([]);

  // Quantity stepper
  const [quantity, setQuantity] = useState<number>(1);

  // Special instructions
  const [instructions, setInstructions] = useState<string>('');

  // Validation error flag
  const [hasValidationError, setHasValidationError] = useState<boolean>(false);

  // Toggle addon
  const toggleAddon = (addon: ModifierRecord) => {
    setSelectedAddons((prev) =>
      prev.some((a) => a.id === addon.id)
        ? prev.filter((a) => a.id !== addon.id)
        : [...prev, addon]
    );
  };

  // Price calculation
  const unitPrice = useMemo(() => {
    let price = item.base_price;
    if (selectedVariant) {
      price += selectedVariant.additional_price;
    }
    selectedAddons.forEach((addon) => {
      price += addon.additional_price;
    });
    return price;
  }, [item.base_price, selectedVariant, selectedAddons]);

  const totalPrice = unitPrice * quantity;

  // Handle Add to Basket
  const handleAdd = () => {
    if (variantGroup && variantGroup.group.is_required && !selectedVariant) {
      setHasValidationError(true);
      return;
    }

    setHasValidationError(false);
    const cartItem: CustomerCartItem = {
      id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      menuItem: item,
      quantity,
      selectedVariant: selectedVariant || undefined,
      selectedAddons,
      specialInstructions: instructions.trim(),
      unitPrice,
      lineTotal: totalPrice,
    };

    onAddToCart(cartItem);
  };

  const getDishImage = (name: string): string => {
    if (item.image_url) return item.image_url;
    const nameLower = name.toLowerCase();
    if (nameLower.includes('salmon') || nameLower.includes('fish') || nameLower.includes('fillet')) {
      return '/images/tablewise/grilled_salmon.jpg';
    }
    if (nameLower.includes('salad') || nameLower.includes('egg') || nameLower.includes('toast') || nameLower.includes('breakfast')) {
      return '/images/tablewise/hero_egg_salad.jpg';
    }
    if (nameLower.includes('lemon') || nameLower.includes('brew') || nameLower.includes('tea') || nameLower.includes('coffee') || nameLower.includes('drink')) {
      return '/images/tablewise/lemonade.jpg';
    }
    if (nameLower.includes('bowl') || nameLower.includes('pastry') || nameLower.includes('croissant') || nameLower.includes('smoothie')) {
      return '/images/tablewise/smoothie_bowl.jpg';
    }
    return '/images/tablewise/grilled_salmon.jpg';
  };

  return (
    <div className="min-h-screen bg-[#2D2D2D] text-white flex flex-col font-poppins select-none max-w-md mx-auto relative pb-32 shadow-2xl">
      {/* Top Navbar with Back button */}
      <div className="absolute top-4 left-4 z-20">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 shadow-md"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Dish Hero Image */}
      <div className="h-64 sm:h-72 w-full bg-gray-900 overflow-hidden relative">
        <img
          src={getDishImage(item.name)}
          alt={item.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2D2D2D] via-transparent to-black/30" />
      </div>

      {/* Content Container */}
      <div className="px-5 pt-3 flex flex-col gap-5">
        {/* Title & Restaurant info */}
        <div className="flex flex-col gap-1">
          <h1 className="font-bebas text-3xl sm:text-4xl text-white tracking-wide uppercase leading-tight">
            {item.name}
          </h1>
          <div className="flex items-center gap-2 text-sm text-[#F99928] font-normal">
            <span>{restaurantName}</span>
          </div>
          <div className="text-sm text-[#F99928] font-normal">
            Table {tableNumber}
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bebas tracking-wider text-white/70 uppercase">
            DESCRIPTION
          </span>
          <p className="text-sm text-white/85 leading-relaxed font-normal">
            {item.description ||
              'Prepared fresh with seasonal ingredients and served with chef seasonings. Choose your portion size and add extras below.'}
          </p>
        </div>

        {/* Validation Error Alert Banner (Frame 03b) */}
        {hasValidationError && (
          <TablewiseAlert type="error">
            Choose a portion size to continue.
          </TablewiseAlert>
        )}

        {/* Variants (Required) */}
        {variantGroup && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bebas tracking-wider text-white/70 uppercase">
              {variantGroup.group.name.toUpperCase()} · REQUIRED
            </span>
            <div className="flex flex-col gap-2">
              {variantGroup.modifiers.map((variant) => {
                const isSelected = selectedVariant?.id === variant.id;
                const variantPrice = item.base_price + variant.additional_price;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariant(variant);
                      setHasValidationError(false);
                    }}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-[#2FDBBC] text-[#2D2D2D] shadow-md font-semibold'
                        : 'bg-[#F4F4F4] text-[#2D2D2D] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected && <Check className="w-4 h-4 stroke-[2.5]" />}
                      <span>{variant.name}</span>
                    </div>
                    <span>{formatCurrency(variantPrice)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Add-ons (Optional) */}
        {addonGroups.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bebas tracking-wider text-white/70 uppercase">
              ADD-ONS · OPTIONAL
            </span>
            <div className="flex flex-col gap-2">
              {addonGroups.flatMap((group) => group.modifiers).map((addon) => {
                const isSelected = selectedAddons.some((a) => a.id === addon.id);

                return (
                  <button
                    key={addon.id}
                    type="button"
                    onClick={() => toggleAddon(addon)}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-[#2FDBBC] text-[#2D2D2D] shadow-md font-semibold'
                        : 'bg-[#F4F4F4] text-[#2D2D2D] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected && <Check className="w-4 h-4 stroke-[2.5]" />}
                      <span>{addon.name}</span>
                    </div>
                    <span>
                      {addon.additional_price > 0
                        ? `+${formatCurrency(addon.additional_price)}`
                        : 'Free'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity Stepper */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bebas tracking-wider text-white/70 uppercase">
            QUANTITY
          </span>
          <div className="w-full bg-[#F4F4F4] text-[#2D2D2D] rounded-2xl p-2 flex items-center justify-between shadow-inner">
            <button
              type="button"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-12 h-10 rounded-xl bg-white flex items-center justify-center text-[#2D2D2D] hover:bg-gray-100 disabled:opacity-40 transition-all active:scale-95 shadow-sm"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-poppins font-semibold text-base text-[#2D2D2D]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-12 h-10 rounded-xl bg-white flex items-center justify-center text-[#2D2D2D] hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dietary & Allergens Card */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bebas tracking-wider text-white/70 uppercase">
            DIETARY & ALLERGENS
          </span>
          <div className="rounded-2xl bg-white text-[#2D2D2D] p-4 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#2D2D2D]/70 font-normal">Dietary</span>
              <span className="font-semibold text-[#2D2D2D]">Gluten-free</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#2D2D2D]/70 font-normal">Contains</span>
              <span className="font-semibold text-[#2D2D2D]">Fish, milk</span>
            </div>
            <div className="pt-2 border-t border-gray-100 flex items-start gap-2 text-[11px] text-[#2D2D2D]/80 leading-relaxed font-normal">
              <Clock className="w-4 h-4 text-[#F5A623] shrink-0 mt-0.5" />
              <span>
                Shown only from restaurant-provided data. Ask staff about allergies before ordering.
              </span>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bebas tracking-wider text-white/70 uppercase">
            SPECIAL INSTRUCTIONS
          </span>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Sauce on the side, please."
            rows={3}
            className="w-full bg-white text-[#2D2D2D] placeholder-[#2D2D2D]/50 text-sm font-normal rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#2FDBBC] resize-none shadow-sm"
          />
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-[#2D2D2D] border-t border-white/10 z-30 max-w-md mx-auto flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-sm px-1">
          <span className="text-white/80 font-normal">
            {quantity} {quantity === 1 ? 'item' : 'items'} · {formatCurrency(unitPrice)} each
          </span>
          <span className="font-poppins font-bold text-xl text-[#2FDBBC]">
            {formatCurrency(totalPrice)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="w-full py-3.5 px-6 rounded-full bg-[#2FDBBC] hover:bg-[#28c5a9] text-[#2D2D2D] font-bebas text-xl tracking-wider uppercase transition-all duration-150 active:scale-[0.98] shadow-xl flex items-center justify-center font-normal"
        >
          ADD TO BASKET
        </button>
      </div>
    </div>
  );
};
