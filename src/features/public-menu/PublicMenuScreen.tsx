import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { menuService } from '@/features/pos/services/menuService';
import { orderService } from '@/features/pos/services/orderService';
import { MenuCategoryRecord, MenuItemWithModifiers } from '@/features/pos/types';
import {
  CustomerCartItem,
  OrderingScreenState,
  OrderSubmissionStatus,
} from './types';
import { WelcomeView } from './components/WelcomeView';
import { MenuView } from './components/MenuView';
import { ItemDetailsModal } from './components/ItemDetailsModal';
import { BasketView } from './components/BasketView';
import { ReviewOrderView } from './components/ReviewOrderView';
import { OrderConfirmationView } from './components/OrderConfirmationView';

export const PublicMenuScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const params = useParams();

  // Tenant & Table Resolution
  const tenantSlug = params.slug || searchParams.get('tenant') || 'harbor-cafe';
  const tableNumber = searchParams.get('table') || '12';

  const isHarbor = tenantSlug.toLowerCase().includes('harbor');
  const orgId = isHarbor
    ? '11111111-1111-1111-1111-111111111111'
    : '22222222-2222-2222-2222-222222222222';
  const branchId = isHarbor
    ? '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    : '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const restaurantName = isHarbor ? 'Harbor Café' : 'Marian Bistro';

  // Navigation State
  // If user arrives via direct link or QR code, start at welcome or menu
  const [currentScreen, setCurrentScreen] = useState<OrderingScreenState>('welcome');
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<MenuItemWithModifiers | null>(null);

  // Menu Data State
  const [categories, setCategories] = useState<MenuCategoryRecord[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemWithModifiers[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cart State with Session Storage persistence
  const [cartItems, setCartItems] = useState<CustomerCartItem[]>(() => {
    try {
      const saved = sessionStorage.getItem(`tablewise_cart_${orgId}_${tableNumber}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Order Submission State
  const [submissionStatus, setSubmissionStatus] = useState<OrderSubmissionStatus>('idle');
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string>('0128');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Persist cart to session storage
  useEffect(() => {
    try {
      sessionStorage.setItem(`tablewise_cart_${orgId}_${tableNumber}`, JSON.stringify(cartItems));
    } catch (err) {
      console.warn('[Tablewise] Failed to persist cart to storage:', err);
    }
  }, [cartItems, orgId, tableNumber]);

  // Load Catalog
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      setIsLoading(true);
      try {
        const [cats, items] = await Promise.all([
          menuService.getCategories(orgId),
          menuService.getMenuItems(orgId, false), // Fetch all items to show availability statuses
        ]);

        if (isMounted) {
          setCategories(cats);
          setMenuItems(items);
        }
      } catch (err) {
        console.warn('[Tablewise] Failed to load menu catalog:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, [orgId]);

  // Cart calculations
  const cartTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.lineTotal, 0);
  }, [cartItems]);

  const cartCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  // Cart actions
  const handleAddToCart = (newItem: CustomerCartItem) => {
    setCartItems((prev) => {
      // Check if identical item (same menuItem id, variant, addons, and instructions) exists
      const existingIndex = prev.findIndex(
        (i) =>
          i.menuItem.id === newItem.menuItem.id &&
          i.selectedVariant?.id === newItem.selectedVariant?.id &&
          i.specialInstructions === newItem.specialInstructions &&
          JSON.stringify(i.selectedAddons.map((a) => a.id).sort()) ===
            JSON.stringify(newItem.selectedAddons.map((a) => a.id).sort())
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const existing = updated[existingIndex];
        const newQty = existing.quantity + newItem.quantity;
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          lineTotal: existing.unitPrice * newQty,
        };
        return updated;
      }

      return [newItem, ...prev];
    });

    // Close details and return to menu
    setSelectedItemForDetails(null);
    setCurrentScreen('menu');
  };

  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.id === cartItemId
          ? {
              ...item,
              quantity: newQty,
              lineTotal: item.unitPrice * newQty,
            }
          : item
      )
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  // Order Placement
  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;

    setSubmissionStatus('submitting');
    setErrorMessage('');

    const idempotencyKey = `tw-ord-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const payload = {
        organization_id: orgId,
        branch_id: branchId,
        order_type: 'qr_self_order' as const,
        table_id: null,
        guest_count: 1,
        notes: `Tablewise Dine-in Table ${tableNumber}`,
        idempotency_key: idempotencyKey,
        items: cartItems.map((ci) => ({
          menu_item_id: ci.menuItem.id,
          quantity: ci.quantity,
          special_instructions: ci.specialInstructions || undefined,
          selected_modifiers: [
            ...(ci.selectedVariant
              ? [
                  {
                    modifier_id: ci.selectedVariant.id,
                    name: ci.selectedVariant.name,
                    additional_price: ci.selectedVariant.additional_price,
                  },
                ]
              : []),
            ...ci.selectedAddons.map((addon) => ({
              modifier_id: addon.id,
              name: addon.name,
              additional_price: addon.additional_price,
            })),
          ],
        })),
      };

      const result = await orderService.createOrder(payload);

      if (result.success) {
        setPlacedOrderNumber(result.order_number.replace('#', '') || '0128');
        setSubmissionStatus('success');
        setCurrentScreen('confirmation');
      } else {
        setSubmissionStatus('failed');
        setErrorMessage(result.error || "We couldn't place your order. No payment has been taken. Please try again.");
      }
    } catch (err: any) {
      setSubmissionStatus('failed');
      setErrorMessage(err.message || 'Order creation failed. Please try again.');
    }
  };

  const handleResetAfterOrder = () => {
    setCartItems([]);
    try {
      sessionStorage.removeItem(`tablewise_cart_${orgId}_${tableNumber}`);
    } catch {}
    setSubmissionStatus('idle');
    setCurrentScreen('menu');
  };

  // Render current screen state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#2D2D2D] text-white flex flex-col items-center justify-center p-6 select-none font-poppins">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#2FDBBC] border-t-transparent rounded-full animate-spin" />
          <span className="font-bebas text-xl tracking-wider uppercase text-white/80">
            LOADING TABLEWISE MENU...
          </span>
        </div>
      </div>
    );
  }

  // 1. Welcome Screen (Frame 01)
  if (currentScreen === 'welcome') {
    return (
      <WelcomeView
        restaurantName={restaurantName}
        tableNumber={tableNumber}
        onViewMenu={() => setCurrentScreen('menu')}
      />
    );
  }

  // 2. Item Details & Options Modal/View (Frame 03 & 03b)
  if (currentScreen === 'item_details' && selectedItemForDetails) {
    return (
      <ItemDetailsModal
        item={selectedItemForDetails}
        restaurantName={restaurantName}
        tableNumber={tableNumber}
        onBack={() => {
          setSelectedItemForDetails(null);
          setCurrentScreen('menu');
        }}
        onAddToCart={handleAddToCart}
      />
    );
  }

  // 3. Basket View (Frame 04, 04b, 04c)
  if (currentScreen === 'basket') {
    return (
      <BasketView
        restaurantName={restaurantName}
        tableNumber={tableNumber}
        cartItems={cartItems}
        onBackToMenu={() => setCurrentScreen('menu')}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToReview={() => setCurrentScreen('review')}
      />
    );
  }

  // 4. Review & Payment View (Frame 05, 05b, 05c)
  if (currentScreen === 'review') {
    return (
      <ReviewOrderView
        restaurantName={restaurantName}
        tableNumber={tableNumber}
        cartItems={cartItems}
        submissionStatus={submissionStatus}
        errorMessage={errorMessage}
        onBack={() => setCurrentScreen('basket')}
        onPlaceOrder={handlePlaceOrder}
      />
    );
  }

  // 5. Order Confirmation & Kitchen Preparation View (Frame 06, 06b, 06c)
  if (currentScreen === 'confirmation') {
    return (
      <OrderConfirmationView
        restaurantName={restaurantName}
        tableNumber={tableNumber}
        orderNumber={placedOrderNumber}
        cartItems={cartItems}
        submissionStatus={submissionStatus}
        errorMessage={errorMessage}
        onReturnToMenu={handleResetAfterOrder}
        onRetry={handlePlaceOrder}
        onBackToBasket={() => setCurrentScreen('basket')}
      />
    );
  }

  // Default: Menu View (Frame 02)
  return (
    <MenuView
      restaurantName={restaurantName}
      tableNumber={tableNumber}
      categories={categories}
      menuItems={menuItems}
      selectedCategory={selectedCategory}
      onSelectCategory={setSelectedCategory}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSelectItem={(item) => {
        setSelectedItemForDetails(item);
        setCurrentScreen('item_details');
      }}
      cartCount={cartCount}
      cartTotal={cartTotal}
      onOpenBasket={() => setCurrentScreen('basket')}
    />
  );
};
