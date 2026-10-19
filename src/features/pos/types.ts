import { Database } from '@/types/database.types';

export type MenuCategoryRecord = Database['public']['Tables']['menu_categories']['Row'];
export type MenuItemRecord = Database['public']['Tables']['menu_items']['Row'];
export type ModifierGroupRecord = Database['public']['Tables']['modifier_groups']['Row'];
export type ModifierRecord = Database['public']['Tables']['modifiers']['Row'];
export type DiningTableRecord = Database['public']['Tables']['dining_tables']['Row'];
export type OrderRecord = Database['public']['Tables']['orders']['Row'];
export type OrderItemRecord = Database['public']['Tables']['order_items']['Row'];
export type KotTicketRecord = Database['public']['Tables']['kot_tickets']['Row'];
export type PaymentRecord = Database['public']['Tables']['payments']['Row'];

export interface MenuItemWithModifiers extends MenuItemRecord {
  modifier_groups: {
    group: ModifierGroupRecord;
    modifiers: ModifierRecord[];
  }[];
}

export interface SelectedModifier {
  modifier_id: string;
  name: string;
  additional_price: number;
}

export interface CartLineItem {
  id: string; // unique client line id
  menu_item: MenuItemRecord;
  quantity: number;
  selected_modifiers: SelectedModifier[];
  special_instructions?: string;
  unit_price: number;
  line_subtotal: number;
}

export interface CreateOrderPayload {
  organization_id: string;
  branch_id: string;
  order_type: 'dine_in' | 'takeaway' | 'delivery' | 'qr_self_order';
  table_id?: string | null;
  guest_count?: number;
  discount_percent?: number;
  discount_reason?: string;
  notes?: string;
  idempotency_key: string;
  items: {
    menu_item_id: string;
    quantity: number;
    special_instructions?: string;
    selected_modifiers?: SelectedModifier[];
  }[];
}

export interface OrderCreationResult {
  success: boolean;
  order_id: string;
  order_number: string;
  total_amount: number;
  kot_id?: string;
  kot_number?: string;
  is_idempotent_replay: boolean;
  error?: string;
}
