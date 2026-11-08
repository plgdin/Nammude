import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import {
  IngredientRecord,
  StockMovementRecord,
  WastageRecord,
  WastageReasonCategory,
  StockCountRecord,
  StockCountItemRecord,
  ReorderSuggestion,
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
   * Fetch stock movements for a financial report window (org-scoped, optional branch).
   */
  async getMovementsForReport(params: {
    organizationId: string;
    branchId?: string | null;
    startDate: string;
    endDate: string;
  }): Promise<StockMovementRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        let query = supabase
          .from('stock_movements')
          .select('*')
          .eq('organization_id', params.organizationId)
          .gte('created_at', `${params.startDate}T00:00:00.000Z`)
          .lte('created_at', `${params.endDate}T23:59:59.999Z`)
          .order('created_at', { ascending: true })
          .limit(5000);
        if (params.branchId) query = query.eq('branch_id', params.branchId);
        const { data, error } = await query;
        if (!error && data) return data as StockMovementRecord[];
      } catch (err) {
        console.warn('[inventoryService] Failed to load report movements:', err);
      }
      return [];
    }
    return localMovements.filter((m) => {
      if (m.organization_id !== params.organizationId) return false;
      if (params.branchId && m.branch_id !== params.branchId) return false;
      const day = m.created_at.slice(0, 10);
      return day >= params.startDate && day <= params.endDate;
    });
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

  // --- Wastage records ---
  async getWastageRecords(params: {
    organizationId: string;
    branchId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<WastageRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        let query = (supabase.from('wastage_records') as any)
          .select('*')
          .eq('organization_id', params.organizationId)
          .order('created_at', { ascending: false })
          .limit(200);
        if (params.branchId) query = query.eq('branch_id', params.branchId);
        if (params.startDate) query = query.gte('created_at', `${params.startDate}T00:00:00.000Z`);
        if (params.endDate) query = query.lte('created_at', `${params.endDate}T23:59:59.999Z`);
        const { data, error } = await query;
        if (!error && data) return data as WastageRecord[];
      } catch (err) {
        console.warn('[inventoryService] Failed to load wastage records:', err);
      }
      return [];
    }
    return localWastage.filter(
      (w) =>
        w.organization_id === params.organizationId &&
        (!params.branchId || w.branch_id === params.branchId)
    );
  },

  async recordWastage(params: {
    organizationId: string;
    branchId: string;
    ingredientId: string;
    quantity: number;
    reasonCategory: WastageReasonCategory;
    reason?: string | null;
    recordedBy?: string | null;
  }): Promise<{ success: boolean; record?: WastageRecord; error?: string }> {
    if (!Number.isFinite(params.quantity) || params.quantity <= 0) {
      return { success: false, error: 'Wastage quantity must be greater than zero.' };
    }

    if (env.isConfigured && !env.isMockAuthEnabled) {
      const adjustment = await this.recordAdjustment({
        organizationId: params.organizationId,
        branchId: params.branchId,
        ingredientId: params.ingredientId,
        movementType: 'waste',
        quantityDelta: -params.quantity,
        reason: params.reason || `Wastage: ${params.reasonCategory}`,
        idempotencyKey: `waste-${Date.now()}-${params.ingredientId}`,
      });
      if (!adjustment.success) {
        return { success: false, error: 'Failed to deduct wasted stock.' };
      }
      try {
        const { data, error } = await (supabase.from('wastage_records') as any)
          .insert({
            organization_id: params.organizationId,
            branch_id: params.branchId,
            ingredient_id: params.ingredientId,
            quantity: params.quantity,
            unit: 'g',
            reason_category: params.reasonCategory,
            reason: params.reason || null,
            stock_movement_id: adjustment.movementId || null,
            recorded_by: params.recordedBy || null,
          })
          .select()
          .single();
        if (error) return { success: false, error: error.message };
        return { success: true, record: data as WastageRecord };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to record wastage.' };
      }
    }

    const ingredient = localIngredients.find((i) => i.id === params.ingredientId);
    const unit = ingredient?.base_unit || 'g';
    const record: WastageRecord = {
      id: `waste-${Date.now()}`,
      organization_id: params.organizationId,
      branch_id: params.branchId,
      ingredient_id: params.ingredientId,
      quantity: params.quantity,
      unit,
      reason_category: params.reasonCategory,
      reason: params.reason || null,
      stock_movement_id: null,
      recorded_by: params.recordedBy || null,
      created_at: new Date().toISOString(),
    };
    localWastage.unshift(record);
    await this.recordAdjustment({
      organizationId: params.organizationId,
      branchId: params.branchId,
      ingredientId: params.ingredientId,
      movementType: 'waste',
      quantityDelta: -params.quantity,
      reason: params.reason || `Wastage: ${params.reasonCategory}`,
      idempotencyKey: `waste-${record.id}`,
    });
    return { success: true, record };
  },

  // --- Physical stock counts ---
  async getStockCounts(branchId: string): Promise<StockCountRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.from('stock_counts') as any)
          .select('*')
          .eq('branch_id', branchId)
          .order('created_at', { ascending: false });
        if (!error && data) return data as StockCountRecord[];
      } catch (err) {
        console.warn('[inventoryService] Failed to load stock counts:', err);
      }
      return [];
    }
    return localStockCounts.filter((c) => c.branch_id === branchId);
  },

  async getStockCountItems(stockCountId: string): Promise<StockCountItemRecord[]> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.from('stock_count_items') as any)
          .select('*')
          .eq('stock_count_id', stockCountId)
          .order('created_at', { ascending: true });
        if (!error && data) return data as StockCountItemRecord[];
      } catch (err) {
        console.warn('[inventoryService] Failed to load stock count items:', err);
      }
      return [];
    }
    return localStockCountItems.filter((i) => i.stock_count_id === stockCountId);
  },

  async createStockCount(params: {
    organizationId: string;
    branchId: string;
  }): Promise<{ success: boolean; count?: StockCountRecord; error?: string }> {
    const ingredients = await this.getIngredients(params.branchId, params.organizationId);

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data: header, error: headerErr } = await (supabase.from('stock_counts') as any)
          .insert({
            organization_id: params.organizationId,
            branch_id: params.branchId,
            status: 'in_progress',
          })
          .select()
          .single();
        if (headerErr || !header) return { success: false, error: headerErr?.message || 'Failed to start count.' };

        const rows = ingredients.map((ing) => ({
          organization_id: params.organizationId,
          stock_count_id: (header as StockCountRecord).id,
          ingredient_id: ing.id,
          system_quantity: ing.current_stock ?? 0,
          counted_quantity: ing.current_stock ?? 0,
          unit: ing.base_unit,
        }));
        if (rows.length > 0) {
          const { error: itemsErr } = await (supabase.from('stock_count_items') as any).insert(rows);
          if (itemsErr) return { success: false, error: itemsErr.message };
        }
        return { success: true, count: header as StockCountRecord };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to start stock count.' };
      }
    }

    const count: StockCountRecord = {
      id: `count-${Date.now()}`,
      organization_id: params.organizationId,
      branch_id: params.branchId,
      status: 'in_progress',
      counted_by: null,
      counted_at: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localStockCounts.unshift(count);
    for (const ing of ingredients) {
      localStockCountItems.push({
        id: `counti-${Date.now()}-${ing.id}`,
        organization_id: params.organizationId,
        stock_count_id: count.id,
        ingredient_id: ing.id,
        system_quantity: ing.current_stock ?? 0,
        counted_quantity: ing.current_stock ?? 0,
        unit: ing.base_unit,
        created_at: new Date().toISOString(),
      });
    }
    return { success: true, count };
  },

  async setCountedQuantity(
    countItemId: string,
    countedQuantity: number
  ): Promise<{ success: boolean; error?: string }> {
    if (!Number.isFinite(countedQuantity) || countedQuantity < 0) {
      return { success: false, error: 'Counted quantity must be zero or greater.' };
    }
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { error } = await (supabase.from('stock_count_items') as any)
          .update({ counted_quantity: countedQuantity })
          .eq('id', countItemId);
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to update count.' };
      }
    }
    const target = localStockCountItems.find((i) => i.id === countItemId);
    if (!target) return { success: false, error: 'Count item not found.' };
    target.counted_quantity = countedQuantity;
    return { success: true };
  },

  async completeStockCount(stockCountId: string): Promise<{ success: boolean; error?: string }> {
    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.rpc as any)('complete_stock_count', {
          p_stock_count_id: stockCountId,
        });
        if (error) return { success: false, error: error.message };
        if (data && data.success === false) return { success: false, error: data.error || 'Unable to complete count.' };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to complete stock count.' };
      }
    }

    const count = localStockCounts.find((c) => c.id === stockCountId);
    if (!count) return { success: false, error: 'Stock count not found.' };
    if (count.status === 'completed') return { success: true };

    for (const item of localStockCountItems.filter((i) => i.stock_count_id === stockCountId)) {
      const variance = item.counted_quantity - item.system_quantity;
      if (variance !== 0) {
        await this.recordAdjustment({
          organizationId: count.organization_id,
          branchId: count.branch_id,
          ingredientId: item.ingredient_id,
          movementType: 'stock_count',
          quantityDelta: variance,
          reason: `Physical stock count variance (${item.system_quantity} → ${item.counted_quantity})`,
          idempotencyKey: `count-${stockCountId}-${item.ingredient_id}`,
        });
      }
    }
    count.status = 'completed';
    count.counted_at = new Date().toISOString();
    count.updated_at = new Date().toISOString();
    return { success: true };
  },

  /**
   * Reorder suggestions: ingredients at or below reorder level,
   * suggested quantity tops up to ideal stock.
   */
  async getReorderSuggestions(
    branchId: string,
    organizationId?: string
  ): Promise<ReorderSuggestion[]> {
    const ingredients = await this.getIngredients(branchId, organizationId);
    return ingredients
      .filter((i) => (i.current_stock ?? 0) <= i.reorder_level)
      .map((i) => ({
        ingredient_id: i.id,
        name: i.name,
        current_stock: i.current_stock ?? 0,
        reorder_level: i.reorder_level,
        ideal_stock: i.ideal_stock,
        suggested_quantity: Math.max(0, Number((i.ideal_stock - (i.current_stock ?? 0)).toFixed(2))),
        unit: i.base_unit,
        supplier_id: i.preferred_supplier_id,
        supplier_name: i.supplier_name || null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
};

// Local mock stores for wastage / stock counts
let localWastage: WastageRecord[] = [
  {
    id: 'waste-00000000-0000-0000-0000-000000000001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    branch_id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    ingredient_id: 'i1111111-0000-0000-0000-000000000005',
    quantity: 0.5,
    unit: 'kg',
    reason_category: 'spoiled',
    reason: 'Bruised during morning prep inspection',
    stock_movement_id: null,
    recorded_by: null,
    created_at: new Date().toISOString(),
  },
];

let localStockCounts: StockCountRecord[] = [];

let localStockCountItems: StockCountItemRecord[] = [];
