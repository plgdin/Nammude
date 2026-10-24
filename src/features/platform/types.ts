export interface PlatformMetrics {
  total_organizations: number;
  active_organizations: number;
  suspended_organizations: number;
  trial_organizations: number;
  active_subscriptions: number;
  past_due_subscriptions: number;
  verified_revenue_total: number;
  recent_onboarding_count_30d: number;
}

export interface PlatformOrganization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'trialing' | 'closed';
  default_currency: string;
  timezone: string;
  created_at: string;
  branches_count: number;
  subscription?: {
    plan_id: string;
    plan_name: string;
    status: 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired';
    billing_cycle: 'monthly' | 'annual';
    current_period_end: string;
  } | null;
  onboarding?: {
    is_completed: boolean;
    current_step: number;
  } | null;
}

export interface PlatformAuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_org_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  created_at: string;
}
