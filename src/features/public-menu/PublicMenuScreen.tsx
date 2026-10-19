import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { menuService } from '@/features/pos/services/menuService';
import { MenuCategoryRecord, MenuItemWithModifiers } from '@/features/pos/types';
import { formatCurrency } from '@/lib/currency';
import {
  Utensils,
  Search,
  Coffee,
  ShieldCheck,
} from 'lucide-react';

export const PublicMenuScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const params = useParams();

  // Tenant Resolution: from URL path slug or query param 'tenant'
  const tenantSlug = params.slug || searchParams.get('tenant') || 'harbor-cafe';
  const tableParam = searchParams.get('table');

  const [categories, setCategories] = useState<MenuCategoryRecord[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemWithModifiers[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Tenant mock metadata for branding header
  const isHarbor = tenantSlug.toLowerCase().includes('harbor');
  const restaurantName = isHarbor ? 'Harbor Café' : 'Marian Bistro';
  const restaurantTagline = isHarbor
    ? 'Specialty Coffee, Fresh Bakery & Sourdough Melts'
    : 'Classic French Bistro & Steak Frites';

  useEffect(() => {
    let isMounted = true;
    async function loadPublicCatalog() {
      setIsLoading(true);
      // Public query passes tenant org id
      const orgId = isHarbor
        ? '11111111-1111-1111-1111-111111111111'
        : '22222222-2222-2222-2222-222222222222';

      try {
        const [cats, items] = await Promise.all([
          menuService.getCategories(orgId),
          menuService.getMenuItems(orgId, true), // only available items for public
        ]);

        if (isMounted) {
          setCategories(cats);
          setMenuItems(items);
        }
      } catch (err) {
        console.warn('[PublicMenu] Failed to load catalog:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPublicCatalog();
    return () => {
      isMounted = false;
    };
  }, [tenantSlug]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category_id === selectedCategory;
      const matchSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-canvas text-canvas-fg flex flex-col font-sans select-none">
      {/* Brand Header */}
      <header className="border-b border-surface-border bg-surface px-4 py-6 sticky top-0 z-20 shadow-sm backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-fg shadow-md">
              <Coffee className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">{restaurantName}</h1>
                {tableParam && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand/20 text-brand border border-brand/30">
                    Table {tableParam}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{restaurantTagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Kitchen Open</span>
            </div>
            <span>•</span>
            <span className="text-gray-400">Digital Menu</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto mt-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, drinks, ingredients..."
              className="w-full rounded-2xl border border-surface-border bg-surface-elevated pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {/* Category Horizontal Filter */}
        <div className="max-w-3xl mx-auto mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-brand text-brand-fg shadow'
                : 'bg-surface-elevated text-gray-400 hover:text-white'
            }`}
          >
            All Items
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                selectedCategory === c.id
                  ? 'bg-brand text-brand-fg shadow'
                  : 'bg-surface-elevated text-gray-400 hover:text-white'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </header>

      {/* Main Menu Grid */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-xs text-gray-500">
            <span>Loading published menu...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center text-gray-500">
            <Utensils className="h-10 w-10 stroke-[1.5] mb-2" />
            <p className="text-sm font-medium">No items found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-surface-border bg-surface-elevated p-4 transition-all hover:border-brand/40 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white">{item.name}</h3>
                    <span className="text-sm font-bold text-brand font-mono shrink-0">
                      {formatCurrency(item.base_price)}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Modifiers List (if any) */}
                {item.modifier_groups && item.modifier_groups.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-surface-border/50 text-[11px] text-gray-400">
                    <span className="font-semibold text-gray-300">Customizations: </span>
                    <span>
                      {item.modifier_groups
                        .map((g) => g.modifiers.map((m) => m.name).join(', '))
                        .join(' • ')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border bg-surface py-6 px-4 text-center text-xs text-gray-500">
        <div className="flex items-center justify-center gap-1.5 mb-1 text-gray-400">
          <ShieldCheck className="h-4 w-4 text-brand" />
          <span className="font-bold">{restaurantName} Official Digital Menu</span>
        </div>
        <p className="text-[11px]">Powered by Restaurant SaaS OS • Direct live kitchen dispatch</p>
      </footer>
    </div>
  );
};
