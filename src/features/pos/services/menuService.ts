import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import {
  MenuCategoryRecord,
  MenuItemWithModifiers,
  ModifierGroupRecord,
  ModifierRecord,
} from '../types';

// Mock Seed Fixtures for local testing & offline development
export const MOCK_CATEGORIES: MenuCategoryRecord[] = [
  {
    id: '33333333-1111-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    name: 'Hot Coffee',
    slug: 'hot-coffee',
    icon: 'Coffee',
    display_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '33333333-1111-0000-0000-000000000002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    name: 'Cold Brew & Iced',
    slug: 'cold-brew',
    icon: 'CupSoda',
    display_order: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '33333333-1111-0000-0000-000000000003',
    organization_id: '11111111-1111-1111-1111-111111111111',
    name: 'Artisanal Tea',
    slug: 'artisanal-tea',
    icon: 'Leaf',
    display_order: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '33333333-1111-0000-0000-000000000004',
    organization_id: '11111111-1111-1111-1111-111111111111',
    name: 'Bakery & Pastries',
    slug: 'bakery',
    icon: 'Cake',
    display_order: 4,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '33333333-1111-0000-0000-000000000005',
    organization_id: '11111111-1111-1111-1111-111111111111',
    name: 'Savory & Sandwiches',
    slug: 'savory',
    icon: 'Sandwich',
    display_order: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // Marian Bistro Categories
  {
    id: '33333333-2222-0000-0000-000000000001',
    organization_id: '22222222-2222-2222-2222-222222222222',
    name: 'Starters',
    slug: 'starters',
    icon: 'UtensilsCrossed',
    display_order: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '33333333-2222-0000-0000-000000000002',
    organization_id: '22222222-2222-2222-2222-222222222222',
    name: 'Mains',
    slug: 'mains',
    icon: 'Utensils',
    display_order: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const MOCK_MODIFIER_GROUPS: ModifierGroupRecord[] = [
  {
    id: '55555555-1111-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    name: 'Milk Choice',
    min_selection: 0,
    max_selection: 1,
    is_required: false,
    display_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: '55555555-1111-0000-0000-000000000002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    name: 'Extra Shots & Syrups',
    min_selection: 0,
    max_selection: 3,
    is_required: false,
    display_order: 2,
    created_at: new Date().toISOString(),
  },
];

export const MOCK_MODIFIERS: ModifierRecord[] = [
  {
    id: '66666666-1111-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    group_id: '55555555-1111-0000-0000-000000000001',
    name: 'Organic Oat Milk',
    additional_price: 0.75,
    cost_price: 0.2,
    is_available: true,
    display_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: '66666666-1111-0000-0000-000000000002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    group_id: '55555555-1111-0000-0000-000000000001',
    name: 'Almond Milk',
    additional_price: 0.75,
    cost_price: 0.22,
    is_available: true,
    display_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: '66666666-1111-0000-0000-000000000003',
    organization_id: '11111111-1111-1111-1111-111111111111',
    group_id: '55555555-1111-0000-0000-000000000002',
    name: 'Extra Espresso Shot',
    additional_price: 1.0,
    cost_price: 0.25,
    is_available: true,
    display_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: '66666666-1111-0000-0000-000000000004',
    organization_id: '11111111-1111-1111-1111-111111111111',
    group_id: '55555555-1111-0000-0000-000000000002',
    name: 'Bourbon Vanilla Syrup',
    additional_price: 0.5,
    cost_price: 0.1,
    is_available: true,
    display_order: 2,
    created_at: new Date().toISOString(),
  },
];

export const MOCK_MENU_ITEMS: MenuItemWithModifiers[] = [
  {
    id: '44444444-1111-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    category_id: '33333333-1111-0000-0000-000000000001',
    name: 'Signature Double Espresso',
    slug: 'double-espresso',
    sku: 'HC-COF-001',
    description: 'Rich double extraction with hazelnut crema and chocolate finish',
    base_price: 3.75,
    cost_price: 0.45,
    tax_rate: 0.0825,
    is_available: true,
    display_order: 1,
    image_url: null,
    kitchen_station: 'barista_station',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    modifier_groups: [
      {
        group: MOCK_MODIFIER_GROUPS[1],
        modifiers: [MOCK_MODIFIERS[2], MOCK_MODIFIERS[3]],
      },
    ],
  },
  {
    id: '44444444-1111-0000-0000-000000000002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    category_id: '33333333-1111-0000-0000-000000000001',
    name: 'Vanilla Oat Flat White',
    slug: 'vanilla-oat-flat-white',
    sku: 'HC-COF-002',
    description: 'Velvety microfoam over organic oat milk with Madagascar bourbon vanilla',
    base_price: 5.5,
    cost_price: 0.95,
    tax_rate: 0.0825,
    is_available: true,
    display_order: 2,
    image_url: null,
    kitchen_station: 'barista_station',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    modifier_groups: [
      {
        group: MOCK_MODIFIER_GROUPS[0],
        modifiers: [MOCK_MODIFIERS[0], MOCK_MODIFIERS[1]],
      },
      {
        group: MOCK_MODIFIER_GROUPS[1],
        modifiers: [MOCK_MODIFIERS[2], MOCK_MODIFIERS[3]],
      },
    ],
  },
  {
    id: '44444444-1111-0000-0000-000000000003',
    organization_id: '11111111-1111-1111-1111-111111111111',
    category_id: '33333333-1111-0000-0000-000000000002',
    name: 'Nitro Cold Brew Citrus Tonic',
    slug: 'nitro-cold-brew-citrus',
    sku: 'HC-COF-003',
    description: '18-hour cold brew infused with nitrogen, yuzu splash and blood orange',
    base_price: 6.25,
    cost_price: 1.1,
    tax_rate: 0.0825,
    is_available: true,
    display_order: 3,
    image_url: null,
    kitchen_station: 'barista_station',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    modifier_groups: [],
  },
  {
    id: '44444444-1111-0000-0000-000000000004',
    organization_id: '11111111-1111-1111-1111-111111111111',
    category_id: '33333333-1111-0000-0000-000000000003',
    name: 'Ceremonial Matcha Cloud Latte',
    slug: 'matcha-cloud-latte',
    sku: 'HC-TEA-001',
    description: 'Stone-ground Uji matcha whisked with oat foam and blossom honey',
    base_price: 6.0,
    cost_price: 1.25,
    tax_rate: 0.0825,
    is_available: true,
    display_order: 4,
    image_url: null,
    kitchen_station: 'barista_station',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    modifier_groups: [
      {
        group: MOCK_MODIFIER_GROUPS[0],
        modifiers: [MOCK_MODIFIERS[0], MOCK_MODIFIERS[1]],
      },
    ],
  },
  {
    id: '44444444-1111-0000-0000-000000000005',
    organization_id: '11111111-1111-1111-1111-111111111111',
    category_id: '33333333-1111-0000-0000-000000000004',
    name: 'Handmade Almond Croissant',
    slug: 'almond-croissant',
    sku: 'HC-BAK-001',
    description: 'Flaky double-baked French pastry filled with frangipane almond cream',
    base_price: 4.5,
    cost_price: 0.85,
    tax_rate: 0.0825,
    is_available: true,
    display_order: 5,
    image_url: null,
    kitchen_station: 'bakery_station',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    modifier_groups: [],
  },
  {
    id: '44444444-1111-0000-0000-000000000006',
    organization_id: '11111111-1111-1111-1111-111111111111',
    category_id: '33333333-1111-0000-0000-000000000005',
    name: 'Truffle Mushroom Sourdough Melt',
    slug: 'truffle-mushroom-melt',
    sku: 'HC-SAV-001',
    description: 'Caramelized wild forest mushrooms, melted Gruyère and white truffle oil on sourdough',
    base_price: 11.5,
    cost_price: 3.2,
    tax_rate: 0.0825,
    is_available: true,
    display_order: 6,
    image_url: null,
    kitchen_station: 'kitchen_grill',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    modifier_groups: [],
  },
  // Marian Bistro Items
  {
    id: '44444444-2222-0000-0000-000000000001',
    organization_id: '22222222-2222-2222-2222-222222222222',
    category_id: '33333333-2222-0000-0000-000000000001',
    name: 'French Onion Soup Gratinée',
    slug: 'french-onion-soup',
    sku: 'MB-STA-001',
    description: 'Slow-caramelized sweet onions with rich beef broth and melted Gruyère crouton',
    base_price: 9.5,
    cost_price: 2.1,
    tax_rate: 0.095,
    is_available: true,
    display_order: 1,
    image_url: null,
    kitchen_station: 'main_kitchen',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    modifier_groups: [],
  },
  {
    id: '44444444-2222-0000-0000-000000000002',
    organization_id: '22222222-2222-2222-2222-222222222222',
    category_id: '33333333-2222-0000-0000-000000000002',
    name: 'Steak Frites Béarnaise',
    slug: 'steak-frites',
    sku: 'MB-MAI-001',
    description: 'Prime hanger steak grilled medium-rare with duck fat fries and house tarragon béarnaise',
    base_price: 28.0,
    cost_price: 7.8,
    tax_rate: 0.095,
    is_available: true,
    display_order: 2,
    image_url: null,
    kitchen_station: 'main_kitchen',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    modifier_groups: [],
  },
];

export const menuService = {
  /**
   * Fetch active categories for an organization
   */
  async getCategories(organizationId: string): Promise<MenuCategoryRecord[]> {
    if (env.isMockAuthEnabled || !env.isConfigured) {
      return MOCK_CATEGORIES.filter((c) => c.organization_id === organizationId);
    }

    try {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.warn('[menuService] Error fetching categories from Supabase, using fallback:', error.message);
        return MOCK_CATEGORIES.filter((c) => c.organization_id === organizationId);
      }

      return data && data.length > 0 ? (data as MenuCategoryRecord[]) : MOCK_CATEGORIES.filter((c) => c.organization_id === organizationId);
    } catch {
      return MOCK_CATEGORIES.filter((c) => c.organization_id === organizationId);
    }
  },

  /**
   * Fetch menu items with their modifier groups for an organization
   */
  async getMenuItems(organizationId: string, onlyAvailable = false): Promise<MenuItemWithModifiers[]> {
    if (env.isMockAuthEnabled || !env.isConfigured) {
      return MOCK_MENU_ITEMS.filter((item) => {
        const matchesOrg = item.organization_id === organizationId;
        return onlyAvailable ? matchesOrg && item.is_available : matchesOrg;
      });
    }

    try {
      let query = supabase
        .from('menu_items')
        .select(`
          *,
          menu_item_modifier_groups (
            modifier_groups (
              *,
              modifiers (*)
            )
          )
        `)
        .eq('organization_id', organizationId)
        .order('display_order', { ascending: true });

      if (onlyAvailable) {
        query = query.eq('is_available', true);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        return MOCK_MENU_ITEMS;
      }

      // Map Supabase nested relation to MenuItemWithModifiers
      return data.map((item: any) => {
        const groups = (item.menu_item_modifier_groups || [])
          .map((m: any) => m.modifier_groups)
          .filter(Boolean)
          .map((g: any) => ({
            group: {
              id: g.id,
              organization_id: g.organization_id,
              name: g.name,
              min_selection: g.min_selection,
              max_selection: g.max_selection,
              is_required: g.is_required,
              display_order: g.display_order,
              created_at: g.created_at,
            },
            modifiers: (g.modifiers || []).map((mod: any) => ({
              id: mod.id,
              organization_id: mod.organization_id,
              group_id: mod.group_id,
              name: mod.name,
              additional_price: Number(mod.additional_price),
              cost_price: Number(mod.cost_price),
              is_available: mod.is_available,
              display_order: mod.display_order,
              created_at: mod.created_at,
            })),
          }));

        return {
          id: item.id,
          organization_id: item.organization_id,
          category_id: item.category_id,
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          description: item.description,
          base_price: Number(item.base_price),
          cost_price: Number(item.cost_price),
          tax_rate: Number(item.tax_rate),
          is_available: item.is_available,
          display_order: item.display_order,
          image_url: item.image_url,
          kitchen_station: item.kitchen_station,
          created_at: item.created_at,
          updated_at: item.updated_at,
          modifier_groups: groups,
        };
      });
    } catch {
      return MOCK_MENU_ITEMS;
    }
  },

  /**
   * Create a menu category. Slug is derived from the name when not provided.
   */
  async createCategory(params: {
    organizationId: string;
    name: string;
    slug?: string;
    icon?: string;
    displayOrder?: number;
  }): Promise<{ success: boolean; category?: MenuCategoryRecord; error?: string }> {
    const name = params.name.trim();
    if (name.length < 2) return { success: false, error: 'Category name must be at least 2 characters.' };
    const slug = (params.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).trim();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      return { success: false, error: 'Slug must use lowercase letters, numbers, and single hyphens.' };
    }

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.from('menu_categories') as any)
          .insert({
            organization_id: params.organizationId,
            name,
            slug,
            icon: params.icon || 'Utensils',
            display_order: params.displayOrder ?? 0,
            is_active: true,
          })
          .select()
          .single();
        if (error) return { success: false, error: error.message };
        return { success: true, category: data as MenuCategoryRecord };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to create category.' };
      }
    }

    const duplicate = MOCK_CATEGORIES.find(
      (c) => c.organization_id === params.organizationId && c.slug === slug
    );
    if (duplicate) return { success: false, error: 'A category with this slug already exists.' };

    const category: MenuCategoryRecord = {
      id: `cat-${Date.now()}`,
      organization_id: params.organizationId,
      name,
      slug,
      icon: params.icon || 'Utensils',
      display_order: params.displayOrder ?? MOCK_CATEGORIES.length + 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_CATEGORIES.push(category);
    return { success: true, category };
  },

  /**
   * Update a menu category (name, slug, icon, display order, active flag).
   */
  async updateCategory(
    categoryId: string,
    updates: Partial<Pick<MenuCategoryRecord, 'name' | 'slug' | 'icon' | 'display_order' | 'is_active'>>
  ): Promise<{ success: boolean; error?: string }> {
    if (updates.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(updates.slug)) {
      return { success: false, error: 'Slug must use lowercase letters, numbers, and single hyphens.' };
    }

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const [key, value] of Object.entries(updates)) {
          if (value !== undefined) payload[key] = value;
        }
        const { error } = await (supabase.from('menu_categories') as any)
          .update(payload)
          .eq('id', categoryId);
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to update category.' };
      }
    }

    const target = MOCK_CATEGORIES.find((c) => c.id === categoryId);
    if (!target) return { success: false, error: 'Category not found.' };
    if (updates.slug) {
      const duplicate = MOCK_CATEGORIES.find(
        (c) => c.organization_id === target.organization_id && c.slug === updates.slug && c.id !== categoryId
      );
      if (duplicate) return { success: false, error: 'A category with this slug already exists.' };
    }
    Object.assign(target, updates, { updated_at: new Date().toISOString() });
    return { success: true };
  },

  /**
   * Delete a menu category. Categories that still contain items cannot be deleted.
   */
  async deleteCategory(categoryId: string): Promise<{ success: boolean; error?: string }> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { error } = await (supabase.from('menu_categories') as any)
          .delete()
          .eq('id', categoryId);
        if (error) {
          return {
            success: false,
            error: 'Category cannot be deleted because it still contains menu items.',
          };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to delete category.' };
      }
    }

    const hasItems = MOCK_MENU_ITEMS.some((i) => i.category_id === categoryId);
    if (hasItems) {
      return { success: false, error: 'Category cannot be deleted because it still contains menu items.' };
    }
    const idx = MOCK_CATEGORIES.findIndex((c) => c.id === categoryId);
    if (idx === -1) return { success: false, error: 'Category not found.' };
    MOCK_CATEGORIES.splice(idx, 1);
    return { success: true };
  },

  /**
   * Create a menu item.
   */
  async createMenuItem(params: {
    organizationId: string;
    categoryId: string;
    name: string;
    sku: string;
    description?: string | null;
    basePrice: number;
    costPrice?: number;
    taxRate?: number;
    kitchenStation?: string;
    displayOrder?: number;
  }): Promise<{ success: boolean; item?: MenuItemWithModifiers; error?: string }> {
    const name = params.name.trim();
    const sku = params.sku.trim();
    if (name.length < 2) return { success: false, error: 'Item name must be at least 2 characters.' };
    if (sku.length < 1) return { success: false, error: 'SKU is required.' };
    if (!Number.isFinite(params.basePrice) || params.basePrice < 0) {
      return { success: false, error: 'Base price must be zero or greater.' };
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.from('menu_items') as any)
          .insert({
            organization_id: params.organizationId,
            category_id: params.categoryId,
            name,
            slug: `${slug}-${Date.now().toString(36)}`,
            sku,
            description: params.description || null,
            base_price: params.basePrice,
            cost_price: params.costPrice ?? 0,
            tax_rate: params.taxRate ?? 0.0825,
            kitchen_station: params.kitchenStation || 'main_kitchen',
            display_order: params.displayOrder ?? 0,
            is_available: true,
          })
          .select()
          .single();
        if (error) {
          return {
            success: false,
            error: error.message.includes('uq_menu_item_sku')
              ? 'An item with this SKU already exists.'
              : error.message,
          };
        }
        return {
          success: true,
          item: { ...(data as MenuItemWithModifiers), modifier_groups: [] },
        };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to create menu item.' };
      }
    }

    const duplicateSku = MOCK_MENU_ITEMS.find(
      (i) => i.organization_id === params.organizationId && i.sku === sku
    );
    if (duplicateSku) return { success: false, error: 'An item with this SKU already exists.' };

    const item: MenuItemWithModifiers = {
      id: `mi-${Date.now()}`,
      organization_id: params.organizationId,
      category_id: params.categoryId,
      name,
      slug: `${slug}-${Date.now().toString(36)}`,
      sku,
      description: params.description || null,
      base_price: params.basePrice,
      cost_price: params.costPrice ?? 0,
      tax_rate: params.taxRate ?? 0.0825,
      is_available: true,
      display_order: params.displayOrder ?? 0,
      image_url: null,
      kitchen_station: params.kitchenStation || 'main_kitchen',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      modifier_groups: [],
    };
    MOCK_MENU_ITEMS.push(item);
    return { success: true, item };
  },

  /**
   * Update a menu item (price, cost, tax, station, description, category).
   */
  async updateMenuItem(
    itemId: string,
    updates: Partial<
      Pick<
        MenuItemWithModifiers,
        'name' | 'category_id' | 'description' | 'base_price' | 'cost_price' | 'tax_rate' | 'kitchen_station' | 'display_order'
      >
    >
  ): Promise<{ success: boolean; error?: string }> {
    if (updates.base_price !== undefined && (!Number.isFinite(updates.base_price) || updates.base_price < 0)) {
      return { success: false, error: 'Base price must be zero or greater.' };
    }
    if (updates.name !== undefined && updates.name.trim().length < 2) {
      return { success: false, error: 'Item name must be at least 2 characters.' };
    }

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const [key, value] of Object.entries(updates)) {
          if (value !== undefined) payload[key] = value;
        }
        const { error } = await (supabase.from('menu_items') as any)
          .update(payload)
          .eq('id', itemId);
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to update menu item.' };
      }
    }

    const target = MOCK_MENU_ITEMS.find((i) => i.id === itemId);
    if (!target) return { success: false, error: 'Menu item not found.' };
    Object.assign(target, updates, { updated_at: new Date().toISOString() });
    return { success: true };
  },

  /**
   * Delete a menu item. Items with order history cannot be deleted (use availability instead).
   */
  async deleteMenuItem(itemId: string): Promise<{ success: boolean; error?: string }> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { error } = await (supabase.from('menu_items') as any)
          .delete()
          .eq('id', itemId);
        if (error) {
          return {
            success: false,
            error: 'Item cannot be deleted because it has order history. Mark it unavailable instead.',
          };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to delete menu item.' };
      }
    }

    const idx = MOCK_MENU_ITEMS.findIndex((i) => i.id === itemId);
    if (idx === -1) return { success: false, error: 'Menu item not found.' };
    MOCK_MENU_ITEMS.splice(idx, 1);
    return { success: true };
  },

  /**
   * Fetch modifier groups with their modifiers for an organization.
   */
  async getModifierGroups(organizationId: string): Promise<
    { group: ModifierGroupRecord; modifiers: ModifierRecord[] }[]
  > {
    if (env.isMockAuthEnabled || !env.isConfigured) {
      return MOCK_MODIFIER_GROUPS.filter((g) => g.organization_id === organizationId).map((group) => ({
        group,
        modifiers: MOCK_MODIFIERS.filter((m) => m.group_id === group.id),
      }));
    }

    try {
      const { data, error } = await supabase
        .from('modifier_groups')
        .select('*, modifiers(*)')
        .eq('organization_id', organizationId)
        .order('display_order', { ascending: true });
      if (error || !data) return [];
      return data.map((g: any) => ({
        group: g as ModifierGroupRecord,
        modifiers: ((g.modifiers || []) as ModifierRecord[]).sort(
          (a, b) => a.display_order - b.display_order
        ),
      }));
    } catch {
      return [];
    }
  },

  /**
   * Create a modifier group.
   */
  async createModifierGroup(params: {
    organizationId: string;
    name: string;
    minSelection?: number;
    maxSelection?: number;
    isRequired?: boolean;
  }): Promise<{ success: boolean; group?: ModifierGroupRecord; error?: string }> {
    const name = params.name.trim();
    if (name.length < 2) return { success: false, error: 'Group name must be at least 2 characters.' };
    const min = params.minSelection ?? 0;
    const max = params.maxSelection ?? 1;
    if (min < 0 || max < min) {
      return { success: false, error: 'Max selection must be greater than or equal to min selection.' };
    }

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.from('modifier_groups') as any)
          .insert({
            organization_id: params.organizationId,
            name,
            min_selection: min,
            max_selection: max,
            is_required: params.isRequired ?? false,
            display_order: 0,
          })
          .select()
          .single();
        if (error) return { success: false, error: error.message };
        return { success: true, group: data as ModifierGroupRecord };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to create modifier group.' };
      }
    }

    const group: ModifierGroupRecord = {
      id: `mg-${Date.now()}`,
      organization_id: params.organizationId,
      name,
      min_selection: min,
      max_selection: max,
      is_required: params.isRequired ?? false,
      display_order: MOCK_MODIFIER_GROUPS.length + 1,
      created_at: new Date().toISOString(),
    };
    MOCK_MODIFIER_GROUPS.push(group);
    return { success: true, group };
  },

  /**
   * Add a modifier option to a group.
   */
  async createModifier(params: {
    organizationId: string;
    groupId: string;
    name: string;
    additionalPrice?: number;
    costPrice?: number;
  }): Promise<{ success: boolean; modifier?: ModifierRecord; error?: string }> {
    const name = params.name.trim();
    if (name.length < 2) return { success: false, error: 'Modifier name must be at least 2 characters.' };
    if (params.additionalPrice !== undefined && (!Number.isFinite(params.additionalPrice) || params.additionalPrice < 0)) {
      return { success: false, error: 'Additional price must be zero or greater.' };
    }

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.from('modifiers') as any)
          .insert({
            organization_id: params.organizationId,
            group_id: params.groupId,
            name,
            additional_price: params.additionalPrice ?? 0,
            cost_price: params.costPrice ?? 0,
            is_available: true,
            display_order: 0,
          })
          .select()
          .single();
        if (error) return { success: false, error: error.message };
        return { success: true, modifier: data as ModifierRecord };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to create modifier.' };
      }
    }

    const modifier: ModifierRecord = {
      id: `mod-${Date.now()}`,
      organization_id: params.organizationId,
      group_id: params.groupId,
      name,
      additional_price: params.additionalPrice ?? 0,
      cost_price: params.costPrice ?? 0,
      is_available: true,
      display_order: MOCK_MODIFIERS.filter((m) => m.group_id === params.groupId).length + 1,
      created_at: new Date().toISOString(),
    };
    MOCK_MODIFIERS.push(modifier);
    return { success: true, modifier };
  },

  /**
   * Replace the modifier groups attached to a menu item.
   */
  async setItemModifierGroups(
    itemId: string,
    organizationId: string,
    groupIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { error: delErr } = await (supabase.from('menu_item_modifier_groups') as any)
          .delete()
          .eq('menu_item_id', itemId);
        if (delErr) return { success: false, error: delErr.message };
        if (groupIds.length > 0) {
          const rows = groupIds.map((groupId) => ({
            organization_id: organizationId,
            menu_item_id: itemId,
            modifier_group_id: groupId,
          }));
          const { error: insErr } = await (supabase.from('menu_item_modifier_groups') as any).insert(rows);
          if (insErr) return { success: false, error: insErr.message };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to update modifier groups.' };
      }
    }

    const target = MOCK_MENU_ITEMS.find((i) => i.id === itemId);
    if (!target) return { success: false, error: 'Menu item not found.' };
    target.modifier_groups = groupIds
      .map((id) => MOCK_MODIFIER_GROUPS.find((g) => g.id === id))
      .filter((g): g is ModifierGroupRecord => Boolean(g))
      .map((group) => ({
        group,
        modifiers: MOCK_MODIFIERS.filter((m) => m.group_id === group.id),
      }));
    return { success: true };
  },

  /**
   * Toggle item availability (staff operation)
   */
  async setItemAvailability(itemId: string, isAvailable: boolean): Promise<boolean> {
    if (env.isMockAuthEnabled || !env.isConfigured) {
      const target = MOCK_MENU_ITEMS.find((i) => i.id === itemId);
      if (target) target.is_available = isAvailable;
      return true;
    }

    const { error } = await (supabase.from('menu_items') as any)
      .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
      .eq('id', itemId);

    return !error;
  },
};
