import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import {
  IngredientRecord,
  StockMovementRecord,
} from '../types';
import { mockIngredients, mockStockMovements } from '@/mocks/inventory.data';

// In-memory fallback store for offline / dev mock mode
let localIngredients: IngredientRecord[] = mockIngredients.map((m) => ({
  id: m.id,
  organization_id: '11111111-1111-1111-1111-111111111111',
  name: m.name,
  sku: m.sku,
  category: m.category,
  base_unit: m.unit === 'L' ? 'ml' : m.unit === 'kg' ? 'g' : m.unit,
  purchase_unit: m.unit,
  purchase_unit_factor: m.unit === 'L' || m.unit === 'kg' ? 1000 : 1,
  density_g_per_ml: m.unit === 'L' ? 1.03 : null,
  reorder_level: m.reorderLevel * (m.unit === 'L' || m.unit === 'kg' ? 1000 : 1),
  ideal_stock: m.idealStock * (m.unit === 'L' || m.unit === 'kg' ? 1000 : 1),
  current_cost_price: m.unitCost / (m.unit === 'L' || m.unit === 'kg' ? 1000 : 1),
  preferred_supplier_id: 's1111111-0000-0000-0000-000000000001',
  is_perishable: m.isPerishable,
  expiry_days: 14,
  is_active: true,
  current_stock: m.currentStock * (m.unit === 'L' || m.unit === 'kg' ? 1000 : 1),
  status: m.status,
  supplier_name: m.supplierName,
  storage_location: m.storageLocation,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

let localMovements: StockMovementRecord[] = mockStockMovements.map((mov) => ({
  id: mov.id,
  organization_id: '11111111-1111-1111-1111-111111111111',
  branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  ingredient_id: mov.ingredientId,
  location_id: 'l1111111-0000-0000-0000-000000000001',
  movement_type: mov.type,
  quantity: mov.quantityDelta,
  unit: 'g',
  unit_cost: 0.02,
  total_cost: Math.abs(mov.quantityDelta * 0.02),
  resulting_stock: mov.resultingQuantity,
  reference_id: null,
  reference_type: 'manual_adjustment',
  idempotency_key: null,
  reason: mov.reason,
  created_by: mov.recordedBy,
  created_at: mov.timestamp,
}));

const SEED_UUID_MAP: Record<string, string> = {
  'i1111111-0000-0000-0000-000000000001': 'ing_whole_milk',
  'i1111111-0000-0000-0000-000000000002': 'ing_oat_milk',
  'i1111111-0000-0000-0000-000000000003': 'ing_espresso_beans',
  'i1111111-0000-0000-0000-000000000004': 'ing_sourdough_bread',
  'i1111111-0000-0000-0000-000000000005': 'ing_mushrooms',
};

const resolveIngId = (id?: string) => (id && SEED_UUID_MAP[id]) ? SEED_UUID_MAP[id] : id;

export const inventoryService = {
  /**
   * Fetch all ingredients with current stock balances for a given branch
   */
  async getIngredients(branchId: string, _orgId?: string): Promise<IngredientRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data: ingData, error: ingError } = await supabase
          .from('ingredients')
          .select(`
            *,
            suppliers(company_name),
            branch_inventory_stocks(current_stock, branch_id)
          `)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (!ingError && ingData && ingData.length > 0) {
          return ingData.map((raw: any) => {
            const branchStock = raw.branch_inventory_stocks?.find(
              (b: any) => b.branch_id === branchId
            )?.current_stock ?? 0;

            let status: 'ok' | 'low' | 'critical' = 'ok';
            if (branchStock <= raw.reorder_level * 0.5) {
              status = 'critical';
            } else if (branchStock <= raw.reorder_level) {
              status = 'low';
            }

            return {
              ...raw,
              current_stock: branchStock,
              status,
              supplier_name: raw.suppliers?.company_name || 'Direct Wholesale',
            };
          });
        }
      } catch (err) {
        console.warn('[inventoryService] Remote fetch failed, falling back to local store:', err);
      }
    }

    return localIngredients;
  },

  /**
   * Fetch stock movements for a branch or specific ingredient
   */
  async getStockMovements(branchId: string, ingredientId?: string): Promise<StockMovementRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        let query = supabase
          .from('stock_movements')
          .select('*, ingredients(name)')
          .eq('branch_id', branchId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (ingredientId) {
          query = query.eq('ingredient_id', ingredientId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            ...d,
            ingredient_name: d.ingredients?.name || 'Unknown Ingredient',
          }));
        }
      } catch (err) {
        console.warn('[inventoryService] Remote movements fetch failed, falling back:', err);
      }
    }

    const targetId = resolveIngId(ingredientId);
    return localMovements.filter((m) =>
      targetId ? (m.ingredient_id === targetId || m.ingredient_id === ingredientId) : true
    );
  },

  /**
   * Record manual stock adjustment, wastage, or physical stock count
   */
  async recordAdjustment(params: {
    organizationId: string;
    branchId: string;
    ingredientId: string;
    locationId?: string | null;
    movementType: 'manual_adjustment' | 'waste' | 'stock_count';
    quantityDelta: number;
    reason: string;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; newStock: number; movementId?: string }> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.rpc as any)('record_stock_adjustment', {
          p_organization_id: params.organizationId,
          p_branch_id: params.branchId,
          p_ingredient_id: params.ingredientId,
          p_location_id: params.locationId || null,
          p_movement_type: params.movementType,
          p_quantity_delta: params.quantityDelta,
          p_reason: params.reason,
          p_idempotency_key: params.idempotencyKey || `adj_${Date.now()}_${params.ingredientId}`,
        });

        if (!error && data && data.success) {
          return {
            success: true,
            newStock: data.new_stock,
            movementId: data.movement_id,
          };
        }
      } catch (err) {
        console.warn('[inventoryService] Remote adjustment RPC failed, using local store:', err);
      }
    }

    // Local in-memory update
    const resolvedId = resolveIngId(params.ingredientId);
    const ingIndex = localIngredients.findIndex(
      (i) => i.id === params.ingredientId || i.id === resolvedId
    );
    let newStock = 0;
    if (ingIndex !== -1) {
      const current = localIngredients[ingIndex].current_stock ?? 0;
      newStock = Math.max(0, current + params.quantityDelta);

      let status: 'ok' | 'low' | 'critical' = 'ok';
      if (newStock <= localIngredients[ingIndex].reorder_level * 0.5) {
        status = 'critical';
      } else if (newStock <= localIngredients[ingIndex].reorder_level) {
        status = 'low';
      }

      localIngredients[ingIndex] = {
        ...localIngredients[ingIndex],
        current_stock: newStock,
        status,
        updated_at: new Date().toISOString(),
      };
    }

    const newMov: StockMovementRecord = {
      id: `mov_${Date.now()}`,
      organization_id: params.organizationId,
      branch_id: params.branchId,
      ingredient_id: params.ingredientId,
      location_id: params.locationId || null,
      movement_type: params.movementType,
      quantity: params.quantityDelta,
      unit: localIngredients[ingIndex]?.base_unit || 'g',
      unit_cost: localIngredients[ingIndex]?.current_cost_price || 0.02,
      total_cost: Math.abs(params.quantityDelta * (localIngredients[ingIndex]?.current_cost_price || 0.02)),
      resulting_stock: newStock,
      reference_id: null,
      reference_type: 'manual_adjustment',
      idempotency_key: params.idempotencyKey || null,
      reason: params.reason,
      created_by: 'Staff User',
      created_at: new Date().toISOString(),
    };

    localMovements.unshift(newMov);

    return { success: true, newStock, movementId: newMov.id };
  },
};
