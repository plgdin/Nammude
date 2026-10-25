import React from 'react';
import { Search, Plus } from 'lucide-react';
import { MenuItemWithModifiers, MenuCategoryRecord } from '@/features/pos/types';
import { formatCurrency } from '@/lib/currency';

interface MenuViewProps {
  restaurantName: string;
  tableNumber: string;
  categories: MenuCategoryRecord[];
  menuItems: MenuItemWithModifiers[];
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectItem: (item: MenuItemWithModifiers) => void;
  cartCount: number;
  cartTotal: number;
  onOpenBasket: () => void;
}

export const MenuView: React.FC<MenuViewProps> = ({
  restaurantName,
  tableNumber,
  categories,
  menuItems,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onSelectItem,
  cartCount,
  cartTotal,
  onOpenBasket,
}) => {
  // Helper to resolve dish image matching Figma references
  const getDishImage = (item: MenuItemWithModifiers): string => {
    if (item.image_url) return item.image_url;
    const nameLower = item.name.toLowerCase();
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

  const filteredItems = menuItems.filter((item) => {
    const matchCategory =
      selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#2D2D2D] text-white flex flex-col font-poppins select-none max-w-md mx-auto relative pb-28 shadow-2xl">
      {/* Top Header */}
      <header className="px-5 pt-6 pb-4 flex items-center justify-between sticky top-0 bg-[#2D2D2D]/95 backdrop-blur-md z-20">
        <h1 className="font-bebas text-2xl tracking-wide uppercase text-white truncate max-w-[240px]">
          {restaurantName}
        </h1>
        <div className="px-3.5 py-1.5 rounded-full bg-[#F4F4F4] text-[#2D2D2D] text-xs font-semibold shadow-sm">
          Table {tableNumber}
        </div>
      </header>

      {/* Search Input */}
      <div className="px-5 mt-2">
        <label className="block text-[11px] font-bebas tracking-wider text-white/70 uppercase mb-1.5">
          SEARCH
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search menu"
            className="w-full bg-[#F4F4F4] text-[#2D2D2D] placeholder-[#2D2D2D]/60 text-sm font-normal rounded-full pl-5 pr-11 py-3 focus:outline-none focus:ring-2 focus:ring-[#2FDBBC] shadow-inner"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2D2D2D]/60 pointer-events-none" />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="px-5 mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${
            selectedCategory === 'all'
              ? 'bg-[#2FDBBC] text-[#2D2D2D] font-semibold shadow-sm'
              : 'bg-[#F4F4F4] text-[#2D2D2D] hover:bg-white'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${
              selectedCategory === cat.id
                ? 'bg-[#2FDBBC] text-[#2D2D2D] font-semibold shadow-sm'
                : 'bg-[#F4F4F4] text-[#2D2D2D] hover:bg-white'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu Grid Header */}
      <div className="px-5 mt-5">
        <h2 className="font-bebas text-lg tracking-wider uppercase text-white/90">Menu</h2>
      </div>

      {/* 2-Column Food Card Grid */}
      <div className="px-5 mt-3 grid grid-cols-2 gap-3.5">
        {filteredItems.map((item) => {
          const isSoldOut = !item.is_available;
          const dishImg = getDishImage(item);

          return (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="flex flex-col rounded-2xl overflow-hidden bg-white text-[#2D2D2D] shadow-md hover:shadow-lg transition-all cursor-pointer group active:scale-[0.98]"
            >
              {/* Dish Thumbnail */}
              <div className="h-32 w-full overflow-hidden bg-gray-100 relative">
                <img
                  src={dishImg}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Dish Meta */}
              <div className="p-3 flex flex-col justify-between flex-1 gap-2.5">
                <div className="flex flex-col gap-1">
                  <h3 className="font-poppins font-medium text-xs sm:text-sm text-[#2D2D2D] line-clamp-1 leading-snug">
                    {item.name}
                  </h3>
                  <div>
                    {isSoldOut ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F77272] text-white">
                        Sold out
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F4F4F4] text-[#2D2D2D]">
                        Available
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-auto">
                  <span className="font-poppins font-semibold text-sm text-[#2D2D2D]">
                    {formatCurrency(item.base_price)}
                  </span>

                  <button
                    type="button"
                    disabled={isSoldOut}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectItem(item);
                    }}
                    className={`w-full py-2 px-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                      isSoldOut
                        ? 'bg-[#F4F4F4] text-[#2D2D2D]/50 cursor-not-allowed'
                        : 'bg-[#2FDBBC] hover:bg-[#28c5a9] text-[#2D2D2D] shadow-sm active:scale-95'
                    }`}
                  >
                    {isSoldOut ? (
                      'Sold out'
                    ) : (
                      <>
                        <span>Add</span>
                        <Plus className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Basket Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#2D2D2D] via-[#2D2D2D]/95 to-transparent z-30 max-w-md mx-auto">
          <button
            type="button"
            onClick={onOpenBasket}
            className="w-full py-3.5 px-6 rounded-full bg-[#2FDBBC] hover:bg-[#28c5a9] text-[#2D2D2D] font-poppins font-semibold text-sm flex items-center justify-center transition-all duration-150 active:scale-[0.98] shadow-xl"
          >
            View basket · {cartCount} {cartCount === 1 ? 'item' : 'items'} · {formatCurrency(cartTotal)}
          </button>
        </div>
      )}
    </div>
  );
};
