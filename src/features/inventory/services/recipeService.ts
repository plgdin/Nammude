import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { RecipeRecord, RecipeIngredientRecord } from '../types';
import { calculateRequiredIngredientQuantity } from '@/lib/units';

let localRecipes: RecipeRecord[] = [
  {
    id: 'r1111111-0000-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    menu_item_id: '44444444-1111-0000-0000-000000000002',
    menu_item_name: 'Vanilla Oat Flat White',
    version: 1,
    yield_servings: 1.0,
    preparation_instructions: 'Double shot espresso extracted over steamed oat milk, microfoam silky texture',
    is_active: true,
    calculated_cost: 0.95,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ingredients: [
      {
        id: 'ri1',
        organization_id: '11111111-1111-1111-1111-111111111111',
        recipe_id: 'r1111111-0000-0000-0000-000000000001',
        ingredient_id: 'i1111111-0000-0000-0000-000000000003',
        ingredient_name: 'Harbor House Espresso Beans',
        quantity: 18.0,
        unit: 'g',
        wastage_percentage: 3.0,
        unit_cost: 0.0225,
        created_at: new Date().toISOString(),
      },
      {
        id: 'ri2',
        organization_id: '11111111-1111-1111-1111-111111111111',
        recipe_id: 'r1111111-0000-0000-0000-000000000001',
        ingredient_id: 'i1111111-0000-0000-0000-000000000002',
        ingredient_name: 'Oatly Barista Edition Oat Milk',
        quantity: 220.0,
        unit: 'ml',
        wastage_percentage: 5.0,
        unit_cost: 0.0029,
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'r1111111-0000-0000-0000-000000000002',
    organization_id: '11111111-1111-1111-1111-111111111111',
    menu_item_id: '44444444-1111-0000-0000-000000000006',
    menu_item_name: 'Truffle Mushroom Sourdough Melt',
    version: 1,
    yield_servings: 1.0,
    preparation_instructions: 'Sauteed wild mushrooms on buttered artisan sourdough with melted gruyere',
    is_active: true,
    calculated_cost: 2.45,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ingredients: [
      {
        id: 'ri3',
        organization_id: '11111111-1111-1111-1111-111111111111',
        recipe_id: 'r1111111-0000-0000-0000-000000000002',
        ingredient_id: 'i1111111-0000-0000-0000-000000000004',
        ingredient_name: 'Artisan Sourdough Loaves',
        quantity: 2.0,
        unit: 'pcs',
        wastage_percentage: 0.0,
        unit_cost: 0.35,
        created_at: new Date().toISOString(),
      },
      {
        id: 'ri4',
        organization_id: '11111111-1111-1111-1111-111111111111',
        recipe_id: 'r1111111-0000-0000-0000-000000000002',
        ingredient_id: 'i1111111-0000-0000-0000-000000000005',
        ingredient_name: 'Wild Forest Truffle Mushrooms',
        quantity: 80.0,
        unit: 'g',
        wastage_percentage: 5.0,
        unit_cost: 0.015,
        created_at: new Date().toISOString(),
      },
    ],
  },
];

export const recipeService = {
  /**
   * Fetch recipes with joined ingredient definitions for an organization
   */
  async getRecipes(_organizationId: string): Promise<RecipeRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select(`
            *,
            menu_items(name),
            recipe_ingredients(
              *,
              ingredients(name, base_unit, current_cost_price)
            )
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((r: any) => {
            let totalCost = 0;
            const ingList: RecipeIngredientRecord[] = (r.recipe_ingredients || []).map((ri: any) => {
              const uCost = ri.ingredients?.current_cost_price || 0;
              const grossQty = calculateRequiredIngredientQuantity(ri.quantity, 1, ri.wastage_percentage);
              const lineCost = grossQty * uCost;
              totalCost += lineCost;
              return {
                ...ri,
                ingredient_name: ri.ingredients?.name || 'Ingredient',
                base_unit: ri.ingredients?.base_unit || ri.unit,
                unit_cost: uCost,
              };
            });

            return {
              ...r,
              menu_item_name: r.menu_items?.name || 'Menu Item',
              ingredients: ingList,
              calculated_cost: Math.round(totalCost * 100) / 100,
            };
          });
        }
      } catch (err) {
        console.warn('[recipeService] Remote fetch failed, using fallback:', err);
      }
    }

    return localRecipes;
  },

  /**
   * Get recipe for a single menu item
   */
  async getRecipeForMenuItem(menuItemId: string): Promise<RecipeRecord | null> {
    const list = await this.getRecipes('');
    return list.find((r) => r.menu_item_id === menuItemId) || null;
  },

  /**
   * Calculate ingredient cost for a recipe
   */
  calculateRecipeCost(ingredients: RecipeIngredientRecord[]): number {
    return ingredients.reduce((sum, ing) => {
      const gross = calculateRequiredIngredientQuantity(ing.quantity, 1, ing.wastage_percentage);
      return sum + gross * (ing.unit_cost || 0);
    }, 0);
  },
};
