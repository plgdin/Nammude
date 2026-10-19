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
