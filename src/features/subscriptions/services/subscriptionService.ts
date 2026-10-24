import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { SubscriptionPlan, OrganizationSubscription } from '../types';

const isMock = (): boolean => !env.isConfigured || env.isMockAuthEnabled;

let mockPlans: SubscriptionPlan[] = [
  {
    id: 'plan-starter',
    slug: 'starter',
    name: 'Starter',
    description: 'Ideal for single-location cafes and food trucks.',
    price_monthly: 29.0,
    price_annual: 290.0,
    max_branches: 1,
    max_staff: 5,
    allowed_modules: ['pos', 'orders', 'menu', 'tables'],
    feature_flags: { crm: false, loyalty: false, inventory: false, ocr: false },
    trial_period_days: 14,
    is_active: true,
  },
  {
    id: 'plan-growth',
    slug: 'growth',
    name: 'Growth',
    description: 'Designed for growing restaurants needing stock control and basic CRM.',
    price_monthly: 79.0,
    price_annual: 790.0,
    max_branches: 3,
    max_staff: 20,
    allowed_modules: ['pos', 'orders', 'menu', 'tables', 'inventory', 'crm'],
    feature_flags: { crm: true, loyalty: false, inventory: true, ocr: false },
    trial_period_days: 14,
    is_active: true,
  },
  {
    id: 'plan-pro',
    slug: 'professional',
    name: 'Professional',
    description: 'Full suite for multi-branch dining, loyalty, recipes, and OCR.',
    price_monthly: 149.0,
    price_annual: 1490.0,
    max_branches: 10,
    max_staff: 50,
    allowed_modules: ['pos', 'orders', 'menu', 'tables', 'inventory', 'finance', 'ocr', 'crm', 'loyalty'],
    feature_flags: { crm: true, loyalty: true, inventory: true, ocr: true },
    trial_period_days: 14,
    is_active: true,
  },
  {
    id: 'plan-enterprise',
    slug: 'enterprise',
    name: 'Enterprise',
    description: 'Custom enterprise scale with bespoke support and integrations.',
    price_monthly: 299.0,
    price_annual: 2990.0,
    max_branches: 99,
    max_staff: 500,
    allowed_modules: ['pos', 'orders', 'menu', 'tables', 'inventory', 'finance', 'ocr', 'crm', 'loyalty', 'api_access'],
    feature_flags: { crm: true, loyalty: true, inventory: true, ocr: true, custom_integrations: true },
    trial_period_days: 30,
    is_active: true,
  },
];

let mockSubscriptions: Record<string, OrganizationSubscription> = {
  '11111111-1111-1111-1111-111111111111': {
    id: 'sub-001',
    organization_id: '11111111-1111-1111-1111-111111111111',
    plan_id: 'plan-pro',
    status: 'active',
    billing_cycle: 'monthly',
    current_period_start: '2026-10-01T00:00:00Z',
    current_period_end: '2026-11-01T00:00:00Z',
    trial_ends_at: null,
    cancelled_at: null,
    plan: mockPlans[2],
  },
};

export const subscriptionService = {
  async getPlans(): Promise<SubscriptionPlan[]> {
    if (isMock()) {
      return [...mockPlans];
    }

    try {
      const { data, error } = await (supabase.from('subscription_plans') as any)
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        allowed_modules: Array.isArray(p.allowed_modules) ? p.allowed_modules : [],
        feature_flags: typeof p.feature_flags === 'object' && p.feature_flags ? p.feature_flags : {},
      }));
    } catch {
      return [...mockPlans];
    }
  },

  async getCurrentSubscription(orgId: string): Promise<OrganizationSubscription | null> {
    if (isMock()) {
      return mockSubscriptions[orgId] || null;
    }

    try {
      const { data, error } = await (supabase.from('organization_subscriptions') as any)
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        plan: data.plan
          ? {
              ...data.plan,
              allowed_modules: Array.isArray(data.plan.allowed_modules) ? data.plan.allowed_modules : [],
              feature_flags: typeof data.plan.feature_flags === 'object' ? data.plan.feature_flags : {},
            }
          : undefined,
      };
    } catch {
      return mockSubscriptions[orgId] || null;
    }
  },

  async subscribeToPlan(
    orgId: string,
    planId: string,
    billingCycle: 'monthly' | 'annual' = 'monthly'
  ): Promise<OrganizationSubscription> {
    const plan = mockPlans.find((p) => p.id === planId) || mockPlans[0];

    if (isMock()) {
      const newSub: OrganizationSubscription = {
        id: `sub-${Date.now()}`,
        organization_id: orgId,
        plan_id: planId,
        status: 'active',
        billing_cycle: billingCycle,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        trial_ends_at: null,
        cancelled_at: null,
        plan,
      };
      mockSubscriptions[orgId] = newSub;
      return newSub;
    }

    const { data, error } = await (supabase.from('organization_subscriptions') as any)
      .upsert(
        {
          organization_id: orgId,
          plan_id: planId,
          status: 'active',
          billing_cycle: billingCycle,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return { ...data, plan };
  },

  async checkEntitlement(orgId: string, featureKey: string): Promise<boolean> {
    const sub = await this.getCurrentSubscription(orgId);
    if (!sub || sub.status !== 'active') {
      return false;
    }
    const plan = sub.plan || mockPlans.find((p) => p.id === sub.plan_id);
    if (!plan) return false;

    if (plan.allowed_modules.includes(featureKey)) return true;
    if (plan.feature_flags && plan.feature_flags[featureKey]) return true;

    return false;
  },

  async checkBranchLimit(orgId: string, currentBranchCount: number): Promise<boolean> {
    const sub = await this.getCurrentSubscription(orgId);
    if (!sub) return currentBranchCount < 1;
    const plan = sub.plan || mockPlans.find((p) => p.id === sub.plan_id);
    const maxBranches = plan?.max_branches ?? 1;
    return currentBranchCount < maxBranches;
  },
};
