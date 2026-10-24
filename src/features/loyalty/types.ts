export interface LoyaltyConfig {
  id: string;
  organization_id: string;
  is_enabled: boolean;
  points_per_currency_unit: number; // e.g. 1 point per $1
  currency_value_per_point: number; // e.g. $0.01 per point (100 pts = $1)
  min_redemption_points: number; // e.g. 50
  max_redemption_percentage: number; // e.g. 50% of subtotal
}

export interface LoyaltyLedgerEntry {
  id: string;
  customer_id: string;
  organization_id: string;
  order_id: string | null;
  entry_type: 'earn' | 'redeem' | 'reversal' | 'manual_adjustment';
  points: number; // + for earn/adjustment+, - for redeem/reversal
  balance_after: number;
  idempotency_key: string;
  notes: string | null;
  created_at: string;
}
