import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { PlatformMetrics, PlatformOrganization, PlatformAuditLog } from '../types';

const isMock = (): boolean => !env.isConfigured || env.isMockAuthEnabled;

let mockOrganizations: PlatformOrganization[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Bella Italia Bistro',
    slug: 'bella-italia',
    status: 'active',
    default_currency: 'INR',
    timezone: 'Asia/Kolkata',
    created_at: '2026-09-01T10:00:00Z',
    branches_count: 2,
    subscription: {
      plan_id: 'plan-pro',
      plan_name: 'Professional',
      status: 'active',
      billing_cycle: 'monthly',
      current_period_end: '2026-11-01T00:00:00Z',
    },
    onboarding: {
      is_completed: true,
      current_step: 9,
    },
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Artisan Sourdough Bakery',
    slug: 'artisan-bakery',
    status: 'active',
    default_currency: 'EUR',
    timezone: 'Europe/Paris',
    created_at: '2026-09-15T14:30:00Z',
    branches_count: 1,
    subscription: {
      plan_id: 'plan-growth',
      plan_name: 'Growth',
      status: 'active',
      billing_cycle: 'annual',
      current_period_end: '2027-09-15T00:00:00Z',
    },
    onboarding: {
      is_completed: true,
      current_step: 9,
    },
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Zenith Ramen Bar',
    slug: 'zenith-ramen',
    status: 'suspended',
    default_currency: 'INR',
    timezone: 'Asia/Kolkata',
    created_at: '2026-10-01T08:00:00Z',
    branches_count: 1,
    subscription: {
      plan_id: 'plan-starter',
      plan_name: 'Starter',
      status: 'suspended',
      billing_cycle: 'monthly',
      current_period_end: '2026-10-15T00:00:00Z',
    },
    onboarding: {
      is_completed: false,
      current_step: 4,
    },
  },
];

let mockAuditLogs: PlatformAuditLog[] = [
  {
    id: 'log-001',
    actor_id: '00000000-0000-0000-0000-000000000001',
    action: 'ORGANIZATION_SUSPENDED',
    target_org_id: '33333333-3333-3333-3333-333333333333',
    details: { reason: 'Past due balance on billing cycle 2026-10', by: 'platform_operator' },
    ip_address: '127.0.0.1',
    created_at: '2026-10-15T09:12:00Z',
  },
  {
    id: 'log-002',
    actor_id: '00000000-0000-0000-0000-000000000001',
    action: 'SUBSCRIPTION_PLAN_CHANGED',
    target_org_id: '11111111-1111-1111-1111-111111111111',
    details: { old_plan: 'growth', new_plan: 'professional', reason: 'Upgraded for OCR and Multi-branch' },
    ip_address: '127.0.0.1',
    created_at: '2026-10-18T16:45:00Z',
  },
];

export const platformAdminService = {
  async getMetrics(): Promise<PlatformMetrics> {
    if (isMock()) {
      const active = mockOrganizations.filter((o) => o.status === 'active').length;
      const suspended = mockOrganizations.filter((o) => o.status === 'suspended').length;
      return {
        total_organizations: mockOrganizations.length,
        active_organizations: active,
        suspended_organizations: suspended,
        trial_organizations: 0,
        active_subscriptions: active,
        past_due_subscriptions: suspended,
        verified_revenue_total: 4270.0,
        recent_onboarding_count_30d: mockOrganizations.length,
      };
    }

    try {
      const { data, error } = await (supabase.rpc as any)('get_platform_metrics');
      if (error) throw error;
      return data as PlatformMetrics;
    } catch {
      return {
        total_organizations: mockOrganizations.length,
        active_organizations: mockOrganizations.filter((o) => o.status === 'active').length,
        suspended_organizations: mockOrganizations.filter((o) => o.status === 'suspended').length,
        trial_organizations: 0,
        active_subscriptions: 2,
        past_due_subscriptions: 1,
        verified_revenue_total: 4270.0,
        recent_onboarding_count_30d: mockOrganizations.length,
      };
    }
  },

  async getOrganizations(): Promise<PlatformOrganization[]> {
    if (isMock()) {
      return [...mockOrganizations];
    }

    try {
      const { data: orgs, error: orgError } = await (supabase.from('organizations') as any)
        .select(`
          id,
          name,
          slug,
          status,
          default_currency,
          timezone,
          created_at,
          branches:branches(id),
          subscription:organization_subscriptions(
            plan_id,
            status,
            billing_cycle,
            current_period_end,
            plan:subscription_plans(name)
          ),
          onboarding:organization_onboarding(
            is_completed,
            current_step
          )
        `)
        .order('created_at', { ascending: false });

      if (orgError) throw orgError;

      return (orgs || []).map((o: any) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        status: o.status,
        default_currency: o.default_currency,
        timezone: o.timezone,
        created_at: o.created_at,
        branches_count: o.branches ? o.branches.length : 0,
        subscription: o.subscription
          ? {
              plan_id: o.subscription.plan_id,
              plan_name: o.subscription.plan?.name || 'Custom',
              status: o.subscription.status,
              billing_cycle: o.subscription.billing_cycle,
              current_period_end: o.subscription.current_period_end,
            }
          : null,
        onboarding: o.onboarding
          ? {
              is_completed: o.onboarding.is_completed,
              current_step: o.onboarding.current_step,
            }
          : null,
      }));
    } catch {
      return [...mockOrganizations];
    }
  },

  async suspendOrganization(orgId: string, reason: string): Promise<void> {
    if (isMock()) {
      mockOrganizations = mockOrganizations.map((o) =>
        o.id === orgId ? { ...o, status: 'suspended' as const } : o
      );
      mockAuditLogs.unshift({
        id: `log-${Date.now()}`,
        actor_id: null,
        action: 'ORGANIZATION_SUSPENDED',
        target_org_id: orgId,
        details: { reason },
        ip_address: null,
        created_at: new Date().toISOString(),
      });
      return;
    }

    const { error } = await (supabase.rpc as any)('admin_suspend_organization', {
      p_org_id: orgId,
      p_reason: reason,
    });
    if (error) throw error;
  },

  async reactivateOrganization(orgId: string, reason: string): Promise<void> {
    if (isMock()) {
      mockOrganizations = mockOrganizations.map((o) =>
        o.id === orgId ? { ...o, status: 'active' as const } : o
      );
      mockAuditLogs.unshift({
        id: `log-${Date.now()}`,
        actor_id: null,
        action: 'ORGANIZATION_REACTIVATED',
        target_org_id: orgId,
        details: { reason },
        ip_address: null,
        created_at: new Date().toISOString(),
      });
      return;
    }

    const { error } = await (supabase.rpc as any)('admin_reactivate_organization', {
      p_org_id: orgId,
      p_reason: reason,
    });
    if (error) throw error;
  },

  async changePlan(orgId: string, newPlanId: string, planSlug: string, reason: string): Promise<void> {
    if (isMock()) {
      mockOrganizations = mockOrganizations.map((o) => {
        if (o.id === orgId) {
          return {
            ...o,
            subscription: {
              plan_id: newPlanId,
              plan_name: planSlug.toUpperCase(),
              status: 'active',
              billing_cycle: 'monthly',
              current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
            },
          };
        }
        return o;
      });
      mockAuditLogs.unshift({
        id: `log-${Date.now()}`,
        actor_id: null,
        action: 'SUBSCRIPTION_PLAN_CHANGED',
        target_org_id: orgId,
        details: { new_plan: planSlug, reason },
        ip_address: null,
        created_at: new Date().toISOString(),
      });
      return;
    }

    const { error } = await (supabase.rpc as any)('admin_change_subscription_plan', {
      p_org_id: orgId,
      p_new_plan_id: newPlanId,
      p_reason: reason,
    });
    if (error) throw error;
  },

  async getAuditLogs(): Promise<PlatformAuditLog[]> {
    if (isMock()) {
      return [...mockAuditLogs];
    }

    try {
      const { data, error } = await (supabase.from('platform_audit_logs') as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as PlatformAuditLog[];
    } catch {
      return [...mockAuditLogs];
    }
  },

  async createOrganization(params: {
    name: string;
    slug: string;
    currency?: string;
    planId?: string;
    planName?: string;
    ownerEmail?: string;
    ownerPassword?: string;
    ownerName?: string;
    branchName?: string;
  }): Promise<PlatformOrganization> {
    const slug = params.slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-');
    const currency = params.currency || 'INR';
    const planName = params.planName || 'Professional';
    const planId = params.planId || 'plan-pro';
    const orgId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `org-${Date.now()}`;

    if (isMock()) {
      const newOrg: PlatformOrganization = {
        id: orgId,
        name: params.name,
        slug,
        status: 'active',
        default_currency: currency,
        timezone: 'Asia/Kolkata',
        created_at: new Date().toISOString(),
        branches_count: 1,
        subscription: {
          plan_id: planId,
          plan_name: planName,
          status: 'active',
          billing_cycle: 'monthly',
          current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        },
        onboarding: {
          is_completed: true,
          current_step: 9,
        },
      };

      mockOrganizations.unshift(newOrg);
      mockAuditLogs.unshift({
        id: `log-${Date.now()}`,
        actor_id: null,
        action: 'ORGANIZATION_CREATED',
        target_org_id: orgId,
        details: { name: params.name, slug, owner: params.ownerEmail },
        ip_address: null,
        created_at: new Date().toISOString(),
      });

      return newOrg;
    }

    try {
      const { data: org, error: orgErr } = await (supabase.from('organizations') as any)
        .insert({
          id: orgId,
          name: params.name,
          slug,
          status: 'active',
          default_currency: currency,
          currency_symbol: currency === 'USD' ? '$' : '₹',
          timezone: 'Asia/Kolkata',
          branding: { brandColor: '#2563eb', accentColor: '#f59e0b' },
        })
        .select()
        .single();

      if (orgErr) throw orgErr;

      // Create primary branch
      const branchId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `br-${Date.now()}`;
      await (supabase.from('branches') as any).insert({
        id: branchId,
        organization_id: org.id,
        name: params.branchName || 'Main Branch',
        slug: 'main',
        code: `${slug.substring(0, 3).toUpperCase()}-01`,
        address_line1: '123 Main Street',
        city: 'Kochi',
        country: 'IN',
        status: 'active',
      });

      // Create starter dining tables
      const starterTables = Array.from({ length: 6 }, (_, i) => ({
        organization_id: org.id,
        branch_id: branchId,
        table_number: `T${i + 1}`,
        section: i < 3 ? 'Indoor' : 'Outdoor',
        capacity: 4,
        current_status: 'available',
      }));
      await (supabase.from('dining_tables') as any).insert(starterTables);

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        default_currency: org.default_currency,
        timezone: org.timezone,
        created_at: org.created_at,
        branches_count: 1,
        subscription: {
          plan_id: planId,
          plan_name: planName,
          status: 'active',
          billing_cycle: 'monthly',
          current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        },
        onboarding: {
          is_completed: true,
          current_step: 9,
        },
      };
    } catch (err) {
      console.error('Failed to create organization in database:', err);
      throw err;
    }
  },
};
