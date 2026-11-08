import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOrganization } from '@/features/organization/OrganizationContext';
import { formatCurrency } from '@/lib/currency';
import { menuService } from './services/menuService';
import {
  MenuCategoryRecord,
  MenuItemWithModifiers,
  ModifierGroupRecord,
  ModifierRecord,
} from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import {
  BookOpen,
  Layers,
  SlidersHorizontal,
  Search,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  LayoutList,
} from 'lucide-react';

type Tab = 'categories' | 'items' | 'modifiers';
type AvailabilityFilter = 'all' | 'available' | 'unavailable';

interface ModifierGroupView {
  group: ModifierGroupRecord;
  modifiers: ModifierRecord[];
}

const STATION_OPTIONS = [
  'main_kitchen',
  'barista_station',
  'bakery_station',
  'kitchen_grill',
  'cold_prep',
];

export const MenuScreen: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id || '11111111-1111-1111-1111-111111111111';

  const [activeTab, setActiveTab] = useState<Tab>('items');
  const [categories, setCategories] = useState<MenuCategoryRecord[]>([]);
  const [items, setItems] = useState<MenuItemWithModifiers[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroupView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');

  // Category modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategoryRecord | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('Utensils');
  const [categoryOrder, setCategoryOrder] = useState('0');
  const [categoryActive, setCategoryActive] = useState(true);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Item modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemWithModifiers | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemSku, setItemSku] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCost, setItemCost] = useState('');
  const [itemTaxRate, setItemTaxRate] = useState('8.25');
  const [itemStation, setItemStation] = useState('main_kitchen');
  const [itemModifierGroupIds, setItemModifierGroupIds] = useState<string[]>([]);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  // Modifier modals
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMin, setGroupMin] = useState('0');
  const [groupMax, setGroupMax] = useState('1');
  const [groupRequired, setGroupRequired] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);

  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);
  const [modifierGroupId, setModifierGroupId] = useState('');
  const [modifierName, setModifierName] = useState('');
  const [modifierPrice, setModifierPrice] = useState('0');
  const [isSavingModifier, setIsSavingModifier] = useState(false);
  const [modifierError, setModifierError] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'category'; record: MenuCategoryRecord }
    | { kind: 'item'; record: MenuItemWithModifiers }
    | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cats, menuItems, groups] = await Promise.all([
        menuService.getCategories(orgId),
        menuService.getMenuItems(orgId),
        menuService.getModifierGroups(orgId),
      ]);
      setCategories(cats);
      setItems(menuItems);
      setModifierGroups(groups);
    } catch (err: any) {
      setError(err?.message || 'Failed to load menu data.');
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter;
      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'available') === item.is_available;
      const matchesSearch =
        q.length === 0 ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q);
      return matchesCategory && matchesAvailability && matchesSearch;
    });
  }, [items, searchQuery, categoryFilter, availabilityFilter]);

  const unavailableCount = items.filter((i) => !i.is_available).length;

  // --- Category actions ---
  const openNewCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategorySlug('');
    setCategoryIcon('Utensils');
    setCategoryOrder(String(categories.length + 1));
    setCategoryActive(true);
    setCategoryError(null);
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (category: MenuCategoryRecord) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategorySlug(category.slug);
    setCategoryIcon(category.icon || 'Utensils');
    setCategoryOrder(String(category.display_order));
    setCategoryActive(category.is_active);
    setCategoryError(null);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    setIsSavingCategory(true);
    setCategoryError(null);
    let result: { success: boolean; error?: string };
    if (editingCategory) {
      result = await menuService.updateCategory(editingCategory.id, {
        name: categoryName.trim(),
        slug: categorySlug.trim() || undefined,
        icon: categoryIcon.trim() || 'Utensils',
        display_order: Number(categoryOrder) || 0,
        is_active: categoryActive,
      });
    } else {
      result = await menuService.createCategory({
        organizationId: orgId,
        name: categoryName,
        slug: categorySlug.trim() || undefined,
        icon: categoryIcon.trim() || 'Utensils',
        displayOrder: Number(categoryOrder) || 0,
      });
    }
    setIsSavingCategory(false);
    if (!result.success) {
      setCategoryError(result.error || 'Unable to save category.');
      return;
    }
    setIsCategoryModalOpen(false);
    setToast(editingCategory ? 'Category updated.' : 'Category created.');
    await fetchData();
  };

  // --- Item actions ---
  const openNewItem = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategoryId(categories[0]?.id || '');
    setItemSku('');
    setItemDescription('');
    setItemPrice('');
    setItemCost('');
    setItemTaxRate('8.25');
    setItemStation('main_kitchen');
    setItemModifierGroupIds([]);
    setItemError(null);
    setIsItemModalOpen(true);
  };

  const openEditItem = (item: MenuItemWithModifiers) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategoryId(item.category_id);
    setItemSku(item.sku);
    setItemDescription(item.description || '');
    setItemPrice(String(item.base_price));
    setItemCost(String(item.cost_price));
    setItemTaxRate(String(Number(item.tax_rate) * 100));
    setItemStation(item.kitchen_station);
    setItemModifierGroupIds(item.modifier_groups.map((g) => g.group.id));
    setItemError(null);
    setIsItemModalOpen(true);
  };

  const toggleModifierGroup = (groupId: string) => {
    setItemModifierGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSaveItem = async () => {
    setIsSavingItem(true);
    setItemError(null);
    const basePrice = Number(itemPrice);
    const costPrice = Number(itemCost) || 0;
    const taxRate = (Number(itemTaxRate) || 0) / 100;

    if (editingItem) {
      const result = await menuService.updateMenuItem(editingItem.id, {
        name: itemName.trim(),
        category_id: itemCategoryId,
        description: itemDescription.trim() || null,
        base_price: basePrice,
        cost_price: costPrice,
        tax_rate: taxRate,
        kitchen_station: itemStation,
      });
      if (!result.success) {
        setIsSavingItem(false);
        setItemError(result.error || 'Unable to update menu item.');
        return;
      }
      const linkResult = await menuService.setItemModifierGroups(
        editingItem.id,
        orgId,
        itemModifierGroupIds
      );
      setIsSavingItem(false);
      if (!linkResult.success) {
        setItemError(linkResult.error || 'Item updated, but modifier groups could not be saved.');
        return;
      }
      setIsItemModalOpen(false);
      setToast('Menu item updated.');
      await fetchData();
      return;
    }

    const result = await menuService.createMenuItem({
      organizationId: orgId,
      categoryId: itemCategoryId,
      name: itemName,
      sku: itemSku,
      description: itemDescription.trim() || null,
      basePrice,
      costPrice,
      taxRate,
      kitchenStation: itemStation,
    });
    if (!result.success || !result.item) {
      setIsSavingItem(false);
      setItemError(result.error || 'Unable to create menu item.');
      return;
    }
    if (itemModifierGroupIds.length > 0) {
      await menuService.setItemModifierGroups(result.item.id, orgId, itemModifierGroupIds);
    }
    setIsSavingItem(false);
    setIsItemModalOpen(false);
    setToast('Menu item created.');
    await fetchData();
  };

  const handleToggleAvailability = async (item: MenuItemWithModifiers) => {
    const ok = await menuService.setItemAvailability(item.id, !item.is_available);
    if (ok) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i))
      );
      setToast(item.is_available ? `${item.name} marked unavailable.` : `${item.name} is now available.`);
    }
  };

  // --- Modifier actions ---
  const handleSaveGroup = async () => {
    setIsSavingGroup(true);
    setGroupError(null);
    const result = await menuService.createModifierGroup({
      organizationId: orgId,
      name: groupName,
      minSelection: Number(groupMin) || 0,
      maxSelection: Number(groupMax) || 1,
      isRequired: groupRequired,
    });
    setIsSavingGroup(false);
    if (!result.success) {
      setGroupError(result.error || 'Unable to create modifier group.');
      return;
    }
    setIsGroupModalOpen(false);
    setGroupName('');
    setGroupMin('0');
    setGroupMax('1');
    setGroupRequired(false);
    setToast('Modifier group created.');
    await fetchData();
  };

  const openNewModifier = (groupId: string) => {
    setModifierGroupId(groupId);
    setModifierName('');
    setModifierPrice('0');
    setModifierError(null);
    setIsModifierModalOpen(true);
  };

  const handleSaveModifier = async () => {
    setIsSavingModifier(true);
    setModifierError(null);
    const result = await menuService.createModifier({
      organizationId: orgId,
      groupId: modifierGroupId,
      name: modifierName,
      additionalPrice: Number(modifierPrice) || 0,
    });
    setIsSavingModifier(false);
    if (!result.success) {
      setModifierError(result.error || 'Unable to create modifier.');
      return;
    }
    setIsModifierModalOpen(false);
    setToast('Modifier added.');
    await fetchData();
  };

  // --- Delete ---
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const result =
      deleteTarget.kind === 'category'
        ? await menuService.deleteCategory(deleteTarget.record.id)
        : await menuService.deleteMenuItem(deleteTarget.record.id);
    setIsDeleting(false);
    if (!result.success) {
      setDeleteError(result.error || 'Unable to delete.');
      return;
    }
    setDeleteTarget(null);
    setToast(deleteTarget.kind === 'category' ? 'Category deleted.' : 'Menu item deleted.');
    await fetchData();
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'items', label: 'Menu Items', icon: BookOpen },
    { id: 'modifiers', label: 'Modifier Groups', icon: SlidersHorizontal },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-surface-border bg-gradient-to-r from-surface to-surface-elevated p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="info" size="sm">Menu Configuration</Badge>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs font-medium text-gray-300">
              {currentOrganization?.name || 'Restaurant Organization'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-brand" />
            Menu Management
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Categories, items, pricing, kitchen stations, and modifier groups for POS and the public QR menu.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="primary" onClick={openNewItem}>
            <Plus className="mr-2 h-4 w-4" />
            New Item
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <span className="text-xs text-gray-400">Categories</span>
          <p className="text-2xl font-bold text-white mt-1">{categories.length}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-gray-400">Menu Items</span>
          <p className="text-2xl font-bold text-white mt-1">{items.length}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-gray-400">Available</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{items.length - unavailableCount}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-gray-400">Unavailable / 86&apos;d</span>
          <p className="text-2xl font-bold text-rose-400 mt-1">{unavailableCount}</p>
        </Card>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-surface-border pb-1 overflow-x-auto text-xs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-brand/20 text-brand border border-brand/40'
                : 'text-gray-400 hover:text-white hover:bg-surface-elevated'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {toast && (
        <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/50 px-4 py-3 text-xs text-emerald-300">
          {toast}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-800/60 bg-rose-950/50 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Categories tab */}
      {activeTab === 'categories' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Menu Categories</CardTitle>
            <Button variant="primary" size="sm" onClick={openNewCategory}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Category
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-xs">Loading categories...</span>
              </div>
            ) : categories.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium text-gray-300">No categories yet</p>
                <p className="text-xs mt-1">Create your first category to organize the menu.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-elevated/60 text-gray-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Slug</th>
                      <th className="px-4 py-3 font-medium">Order</th>
                      <th className="px-4 py-3 font-medium">Items</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {categories.map((category) => (
                      <tr key={category.id} className="hover:bg-surface-elevated/40">
                        <td className="px-4 py-3 font-semibold text-white">{category.name}</td>
                        <td className="px-4 py-3 font-mono text-gray-400">{category.slug}</td>
                        <td className="px-4 py-3 text-gray-300">{category.display_order}</td>
                        <td className="px-4 py-3 text-gray-300">
                          {items.filter((i) => i.category_id === category.id).length}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={category.is_active ? 'success' : 'neutral'} size="sm">
                            {category.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditCategory(category)}
                              className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-2 py-1 text-[10px] font-medium text-gray-300 hover:bg-surface-elevated hover:text-white"
                            >
                              <Pencil className="h-3 w-3" /> Edit
                            </button>
                            <button
                              onClick={() => { setDeleteError(null); setDeleteTarget({ kind: 'category', record: category }); }}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-800/60 bg-rose-950/40 px-2 py-1 text-[10px] font-medium text-rose-300 hover:bg-rose-950/70"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Items tab */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items by name, SKU, or description..."
                className="w-full rounded-xl border border-surface-border bg-surface-elevated pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-surface-border bg-surface-elevated px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value as AvailabilityFilter)}
              className="rounded-xl border border-surface-border bg-surface-elevated px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="all">All availability</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Menu Items</CardTitle>
              <span className="text-xs text-gray-400">{filteredItems.length} item(s)</span>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-xs">Loading menu items...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium text-gray-300">No menu items match these filters</p>
                  <p className="text-xs mt-1">Create a new item or clear the search.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-elevated/60 text-gray-400">
                      <tr>
                        <th className="px-4 py-3 font-medium">Item</th>
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium">SKU</th>
                        <th className="px-4 py-3 font-medium text-right">Price</th>
                        <th className="px-4 py-3 font-medium">Station</th>
                        <th className="px-4 py-3 font-medium">Availability</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-surface-elevated/40">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-white">{item.name}</div>
                            {item.description && (
                              <div className="text-[11px] text-gray-500 max-w-xs truncate">{item.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-300">
                            {categoryNameById.get(item.category_id) || '—'}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-400">{item.sku}</td>
                          <td className="px-4 py-3 text-right font-mono text-white">
                            {formatCurrency(item.base_price)}
                          </td>
                          <td className="px-4 py-3 text-gray-400">{item.kitchen_station.replace(/_/g, ' ')}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleAvailability(item)}
                              title="Toggle availability"
                              className="hover:opacity-80"
                            >
                              <Badge variant={item.is_available ? 'success' : 'danger'} size="sm">
                                {item.is_available ? 'Available' : 'Unavailable'}
                              </Badge>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditItem(item)}
                                className="inline-flex items-center gap-1 rounded-lg border border-surface-border px-2 py-1 text-[10px] font-medium text-gray-300 hover:bg-surface-elevated hover:text-white"
                              >
                                <Pencil className="h-3 w-3" /> Edit
                              </button>
                              <button
                                onClick={() => { setDeleteError(null); setDeleteTarget({ kind: 'item', record: item }); }}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-800/60 bg-rose-950/40 px-2 py-1 text-[10px] font-medium text-rose-300 hover:bg-rose-950/70"
                              >
                                <Trash2 className="h-3 w-3" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modifiers tab */}
      {activeTab === 'modifiers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Modifier groups (e.g. Milk Choice) with their options. Attach groups to items from the item editor.
            </p>
            <Button variant="primary" size="sm" onClick={() => { setGroupError(null); setIsGroupModalOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Group
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-xs">Loading modifier groups...</span>
            </div>
          ) : modifierGroups.length === 0 ? (
            <Card>
              <div className="py-16 text-center text-gray-400">
                <SlidersHorizontal className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium text-gray-300">No modifier groups yet</p>
                <p className="text-xs mt-1">Create a group such as &quot;Milk Choice&quot; to customize items.</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {modifierGroups.map(({ group, modifiers }) => (
                <Card key={group.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <LayoutList className="h-4 w-4 text-brand" />
                        {group.name}
                      </CardTitle>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Select {group.min_selection}–{group.max_selection}
                        {group.is_required ? ' • Required' : ' • Optional'}
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => openNewModifier(group.id)}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Option
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {modifiers.length === 0 && (
                      <p className="text-xs text-gray-500">No options yet.</p>
                    )}
                    {modifiers.map((modifier) => (
                      <div
                        key={modifier.id}
                        className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-elevated/60 px-3 py-2 text-xs"
                      >
                        <span className="font-medium text-white">{modifier.name}</span>
                        <span className="font-mono text-gray-400">
                          {modifier.additional_price > 0
                            ? `+${formatCurrency(modifier.additional_price)}`
                            : 'Included'}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category modal */}
      <Modal open={isCategoryModalOpen} onOpenChange={(open) => !open && !isSavingCategory && setIsCategoryModalOpen(false)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>{editingCategory ? 'Edit Category' : 'New Category'}</ModalTitle>
            <ModalDescription>Categories organize items in POS and the public menu.</ModalDescription>
          </ModalHeader>

          {categoryError && (
            <div className="rounded-lg border border-rose-800/60 bg-rose-950/50 px-3 py-2 text-xs text-rose-300">
              {categoryError}
            </div>
          )}

          <label className="text-xs font-medium text-gray-300">Name <span className="text-rose-400">*</span></label>
          <input
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="e.g. Hot Coffee"
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <label className="text-xs font-medium text-gray-300">Slug (optional)</label>
          <input
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            placeholder="Auto-generated from name"
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-mono text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Icon</label>
              <input
                value={categoryIcon}
                onChange={(e) => setCategoryIcon(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Display order</label>
              <input
                type="number"
                min={0}
                value={categoryOrder}
                onChange={(e) => setCategoryOrder(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-300">
            <input
              type="checkbox"
              checked={categoryActive}
              onChange={(e) => setCategoryActive(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-surface-border"
            />
            Active (visible in POS & public menu)
          </label>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setIsCategoryModalOpen(false)} disabled={isSavingCategory}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveCategory} disabled={isSavingCategory || categoryName.trim().length < 2}>
              {isSavingCategory ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Item modal */}
      <Modal open={isItemModalOpen} onOpenChange={(open) => !open && !isSavingItem && setIsItemModalOpen(false)}>
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>{editingItem ? 'Edit Menu Item' : 'New Menu Item'}</ModalTitle>
            <ModalDescription>Prices snapshot onto orders at sale time, so later edits never rewrite history.</ModalDescription>
          </ModalHeader>

          {itemError && (
            <div className="rounded-lg border border-rose-800/60 bg-rose-950/50 px-3 py-2 text-xs text-rose-300">
              {itemError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-gray-300">Name <span className="text-rose-400">*</span></label>
              <input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Vanilla Oat Flat White"
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Category</label>
              <select
                value={itemCategoryId}
                onChange={(e) => setItemCategoryId(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">SKU <span className="text-rose-400">*</span></label>
              <input
                value={itemSku}
                onChange={(e) => setItemSku(e.target.value)}
                disabled={Boolean(editingItem)}
                placeholder="HC-COF-010"
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-mono text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Base price <span className="text-rose-400">*</span></label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                placeholder="5.50"
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-mono text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Cost price</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={itemCost}
                onChange={(e) => setItemCost(e.target.value)}
                placeholder="0.95"
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-mono text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Tax rate (%)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={itemTaxRate}
                onChange={(e) => setItemTaxRate(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Kitchen station</label>
              <select
                value={itemStation}
                onChange={(e) => setItemStation(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand"
              >
                {STATION_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-gray-300">Description</label>
              <textarea
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                rows={2}
                placeholder="Short description shown on the public menu"
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-gray-300">Modifier groups</label>
              <div className="space-y-1.5">
                {modifierGroups.length === 0 && (
                  <p className="text-[11px] text-gray-500">No modifier groups yet — create one from the Modifier Groups tab.</p>
                )}
                {modifierGroups.map(({ group }) => (
                  <label key={group.id} className="flex items-center gap-2 text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={itemModifierGroupIds.includes(group.id)}
                      onChange={() => toggleModifierGroup(group.id)}
                      className="h-3.5 w-3.5 rounded border-surface-border"
                    />
                    {group.name}
                    <span className="text-gray-500">({group.min_selection}–{group.max_selection})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setIsItemModalOpen(false)} disabled={isSavingItem}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveItem}
              disabled={
                isSavingItem ||
                itemName.trim().length < 2 ||
                (!editingItem && itemSku.trim().length < 1) ||
                !itemCategoryId ||
                Number(itemPrice) < 0 ||
                itemPrice === ''
              }
            >
              {isSavingItem ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Item'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modifier group modal */}
      <Modal open={isGroupModalOpen} onOpenChange={(open) => !open && !isSavingGroup && setIsGroupModalOpen(false)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>New Modifier Group</ModalTitle>
            <ModalDescription>e.g. Milk Choice, Extra Shots, Spice Level.</ModalDescription>
          </ModalHeader>

          {groupError && (
            <div className="rounded-lg border border-rose-800/60 bg-rose-950/50 px-3 py-2 text-xs text-rose-300">
              {groupError}
            </div>
          )}

          <label className="text-xs font-medium text-gray-300">Group name <span className="text-rose-400">*</span></label>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Milk Choice"
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Min selection</label>
              <input
                type="number"
                min={0}
                value={groupMin}
                onChange={(e) => setGroupMin(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Max selection</label>
              <input
                type="number"
                min={1}
                value={groupMax}
                onChange={(e) => setGroupMax(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-300">
            <input
              type="checkbox"
              checked={groupRequired}
              onChange={(e) => setGroupRequired(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-surface-border"
            />
            Required — staff must pick at least the minimum
          </label>

          <ModalFooter>
            <Button variant="secondary" onClick={() => setIsGroupModalOpen(false)} disabled={isSavingGroup}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveGroup} disabled={isSavingGroup || groupName.trim().length < 2}>
              {isSavingGroup ? 'Saving...' : 'Create Group'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modifier modal */}
      <Modal open={isModifierModalOpen} onOpenChange={(open) => !open && !isSavingModifier && setIsModifierModalOpen(false)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Add Modifier Option</ModalTitle>
            <ModalDescription>
              {modifierGroups.find((g) => g.group.id === modifierGroupId)?.group.name || 'Modifier group'}
            </ModalDescription>
          </ModalHeader>

          {modifierError && (
            <div className="rounded-lg border border-rose-800/60 bg-rose-950/50 px-3 py-2 text-xs text-rose-300">
              {modifierError}
            </div>
          )}

          <label className="text-xs font-medium text-gray-300">Option name <span className="text-rose-400">*</span></label>
          <input
            value={modifierName}
            onChange={(e) => setModifierName(e.target.value)}
            placeholder="Organic Oat Milk"
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <label className="text-xs font-medium text-gray-300">Additional price</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={modifierPrice}
            onChange={(e) => setModifierPrice(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface-elevated px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand"
          />

          <ModalFooter>
            <Button variant="secondary" onClick={() => setIsModifierModalOpen(false)} disabled={isSavingModifier}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveModifier} disabled={isSavingModifier || modifierName.trim().length < 2}>
              {isSavingModifier ? 'Saving...' : 'Add Option'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>
              Delete {deleteTarget?.kind === 'category' ? 'Category' : 'Menu Item'}
            </ModalTitle>
            <ModalDescription>
              {deleteTarget?.kind === 'category'
                ? `"${deleteTarget?.record.name}" will be removed. Categories that still contain items cannot be deleted.`
                : `"${deleteTarget?.record.name}" will be removed. Items with order history cannot be deleted — mark them unavailable instead.`}
            </ModalDescription>
          </ModalHeader>

          {deleteError && (
            <div className="rounded-lg border border-rose-800/60 bg-rose-950/50 px-3 py-2 text-xs text-rose-300">
              {deleteError}
            </div>
          )}

          <ModalFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};
