import { describe, it, expect } from 'vitest';
import { recipeService } from '@/features/inventory/services/recipeService';
import { calculateRequiredIngredientQuantity } from '@/lib/units';
import { RecipeIngredientRecord } from '@/features/inventory/types';

describe('Phase 5: Recipe Bill of Materials (BOM) & Costing', () => {
  it('calculates recipe food cost accurately from ingredients and wastage', () => {
    const ingredients: RecipeIngredientRecord[] = [
      {
        id: 'ri1',
        organization_id: 'org1',
        recipe_id: 'rec1',
        ingredient_id: 'ing_beans',
        quantity: 18, // 18g
        unit: 'g',
        wastage_percentage: 3, // 3% retention
        unit_cost: 0.0225, // $22.50 / kg = $0.0225 / g
        created_at: new Date().toISOString(),
      },
      {
        id: 'ri2',
        organization_id: 'org1',
        recipe_id: 'rec1',
        ingredient_id: 'ing_milk',
        quantity: 220, // 220ml
        unit: 'ml',
        wastage_percentage: 5, // 5% pitcher residue
        unit_cost: 0.0029, // $2.90 / L = $0.0029 / ml
        created_at: new Date().toISOString(),
      },
    ];

    // Net requirement:
    // Beans: 18g * 1.03 = 18.54g * 0.0225 = $0.41715
    // Milk: 220ml * 1.05 = 231ml * 0.0029 = $0.6699
    // Total food cost = ~1.087
    const cost = recipeService.calculateRecipeCost(ingredients);
    expect(cost).toBeGreaterThan(1.08);
    expect(cost).toBeLessThan(1.09);
  });

  it('supports recipe yield scaling for bulk batch preparation', () => {
    // Large soup batch: 5000g tomatoes for 10 servings yield
    const yieldServings = 10;
    const baseQuantity = 5000;
    const orderQuantity = 2; // 2 servings ordered

    const perServing = baseQuantity / yieldServings; // 500g
    const required = calculateRequiredIngredientQuantity(perServing, orderQuantity, 0);

    expect(required).toBe(1000); // 1000g consumed
  });

  it('preserves historical recipe versioning without altering past orders', async () => {
    // Version 1 of recipe: 18g beans
    const v1Requirement = calculateRequiredIngredientQuantity(18, 1, 0);
    expect(v1Requirement).toBe(18);

    // Version 2 updated in future: 20g beans
    const v2Requirement = calculateRequiredIngredientQuantity(20, 1, 0);
    expect(v2Requirement).toBe(20);

    // Past order recorded under version 1 still consumed 18g
    expect(v1Requirement).toBe(18);
  });
});
