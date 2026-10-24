export interface Customer {
  id: string;
  organization_id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tags: string[];
  total_orders_count: number;
  total_spend_amount: number;
  last_order_at: string | null;
  loyalty_points_balance: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerFilter {
  search?: string;
  tag?: string;
  sortBy?: 'name' | 'spend' | 'orders' | 'recent';
}
