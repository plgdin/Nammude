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

export type FeedbackStatus = 'new' | 'acknowledged' | 'resolved';
export type ConsentType = 'marketing_email' | 'marketing_sms' | 'loyalty';

export interface FeedbackRecord {
  id: string;
  organization_id: string;
  customer_id: string | null;
  order_id: string | null;
  rating: number | null;
  comment: string | null;
  channel: string;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
}

export interface CustomerConsentRecord {
  id: string;
  organization_id: string;
  customer_id: string;
  consent_type: ConsentType;
  granted: boolean;
  granted_at: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromotionRecord {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_value: number;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  usage_limit: number | null;
  used_count: number;
  created_at: string;
  updated_at: string;
}
