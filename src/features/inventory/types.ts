
export type StockMovementType =
  | 'purchase_receipt'
  | 'sale_consumption'
  | 'waste'
  | 'manual_adjustment'
  | 'transfer_in'
  | 'transfer_out'
  | 'return'
  | 'stock_count';

export type PurchaseOrderStatus = 'draft' | 'issued' | 'partially_received' | 'received' | 'cancelled';
export type GoodsReceiptStatus = 'draft' | 'verified' | 'disputed';

export interface SupplierRecord {
  id: string;
  organization_id: string;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  tax_number: string | null;
  payment_terms_days: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IngredientRecord {
  id: string;
  organization_id: string;
  name: string;
  normalized_name?: string;
  sku: string | null;
  category: string;
  base_unit: string;
  purchase_unit: string;
  purchase_unit_factor: number;
  density_g_per_ml: number | null;
  reorder_level: number;
  ideal_stock: number;
  current_cost_price: number;
  preferred_supplier_id: string | null;
  is_perishable: boolean;
  expiry_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed / joined fields
  current_stock?: number;
  status?: 'ok' | 'low' | 'critical';
  supplier_name?: string;
  storage_location?: string;
}

export interface StockLocationRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface BranchInventoryStockRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  ingredient_id: string;
  location_id: string | null;
  current_stock: number;
  last_movement_at: string;
  updated_at: string;
}

export interface RecipeRecord {
  id: string;
  organization_id: string;
  menu_item_id: string;
  version: number;
  yield_servings: number;
  preparation_instructions: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  menu_item_name?: string;
  ingredients?: RecipeIngredientRecord[];
  calculated_cost?: number;
}

export interface RecipeIngredientRecord {
  id: string;
  organization_id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  wastage_percentage: number;
  created_at: string;
  // Joined fields
  ingredient_name?: string;
  base_unit?: string;
  unit_cost?: number;
}

export interface StockMovementRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  ingredient_id: string;
  location_id: string | null;
  movement_type: StockMovementType;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  resulting_stock: number | null;
  reference_id: string | null;
  reference_type: string | null;
  idempotency_key: string | null;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  // Joined
  ingredient_name?: string;
}

export interface PurchaseOrderItemRecord {
  id: string;
  organization_id: string;
  purchase_order_id: string;
  ingredient_id: string;
  quantity: number;
  purchase_unit: string;
  conversion_factor: number;
  unit_price: number;
  total_price: number;
  received_quantity: number;
  created_at: string;
  // Joined
  ingredient_name?: string;
}

export interface PurchaseOrderRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  supplier_id: string;
  po_number: string;
  status: PurchaseOrderStatus;
  total_amount: number;
  expected_delivery_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  supplier_name?: string;
  items?: PurchaseOrderItemRecord[];
}

export interface GoodsReceiptItemRecord {
  id: string;
  organization_id: string;
  goods_receipt_id: string;
  ingredient_id: string;
  received_quantity: number;
  rejected_quantity: number;
  purchase_unit: string;
  conversion_factor: number;
  normalized_quantity: number;
  unit_cost: number;
  total_cost: number;
  batch_number: string | null;
  expiry_date: string | null;
  created_at: string;
  // Joined
  ingredient_name?: string;
}

export interface GoodsReceiptRecord {
  id: string;
  organization_id: string;
  branch_id: string;
  purchase_order_id: string | null;
  supplier_id: string;
  location_id: string | null;
  grn_number: string;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: number;
  status: GoodsReceiptStatus;
  notes: string | null;
  received_by: string | null;
  idempotency_key: string | null;
  received_at: string;
  created_at: string;
  // Joined
  supplier_name?: string;
  items?: GoodsReceiptItemRecord[];
}
