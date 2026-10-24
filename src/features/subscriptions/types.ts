export interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  max_branches: number;
  max_staff: number;
  allowed_modules: string[];
  feature_flags: Record<string, boolean>;
  trial_period_days: number;
  is_active: boolean;
}

export interface OrganizationSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
  billing_cycle: 'monthly' | 'annual';
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  plan?: SubscriptionPlan;
}

export interface SubscriptionInvoice {
  id: string;
  organization_id: string;
  subscription_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: 'draft' | 'paid' | 'unpaid' | 'void';
  period_start: string;
  period_end: string;
  paid_at: string | null;
  created_at: string;
}
