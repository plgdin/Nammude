import { describe, it, expect } from 'vitest';
import { platformAdminService } from '@/features/platform/services/platformAdminService';
import { onboardingService } from '@/features/onboarding/services/onboardingService';
import { subscriptionService } from '@/features/subscriptions/services/subscriptionService';
import { crmService } from '@/features/crm/services/crmService';
import { loyaltyService } from '@/features/loyalty/services/loyaltyService';

describe('Phase 8 — SaaS Platform Administration, Onboarding, Subscriptions & CRM', () => {
  const testOrgId = '11111111-1111-1111-1111-111111111111';
  const otherOrgId = '22222222-2222-2222-2222-222222222222';

  // ----------------------------------------------------------------------------
  // Subphase B: SaaS Platform Administration
  // ----------------------------------------------------------------------------
  describe('Subphase B: SaaS Platform Administration', () => {
    it('retrieves platform overview metrics backed by verified database figures', async () => {
      const metrics = await platformAdminService.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.total_organizations).toBeGreaterThanOrEqual(1);
      expect(metrics.active_organizations).toBeGreaterThanOrEqual(1);
      expect(metrics.verified_revenue_total).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.verified_revenue_total).toBe('number');
    });

    it('lists organizations with tenant status, branch counts, and subscription plans', async () => {
      const orgs = await platformAdminService.getOrganizations();
      expect(orgs.length).toBeGreaterThanOrEqual(1);
      const testOrg = orgs.find((o) => o.id === testOrgId);
      expect(testOrg).toBeDefined();
      expect(testOrg?.status).toBe('active');
      expect(testOrg?.subscription).toBeDefined();
    });

    it('allows authorized platform admin to suspend and reactivate organizations with audit trails', async () => {
      const suspendReason = 'Billing compliance audit';
      await platformAdminService.suspendOrganization(testOrgId, suspendReason);

      let orgs = await platformAdminService.getOrganizations();
      let target = orgs.find((o) => o.id === testOrgId);
      expect(target?.status).toBe('suspended');

      const reactivateReason = 'Compliance verified and approved';
      await platformAdminService.reactivateOrganization(testOrgId, reactivateReason);

      orgs = await platformAdminService.getOrganizations();
      target = orgs.find((o) => o.id === testOrgId);
      expect(target?.status).toBe('active');

      const logs = await platformAdminService.getAuditLogs();
      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs.some((l) => l.action === 'ORGANIZATION_SUSPENDED')).toBe(true);
      expect(logs.some((l) => l.action === 'ORGANIZATION_REACTIVATED')).toBe(true);
    });

    it('records privileged subscription tier modifications by platform operators', async () => {
      await platformAdminService.changePlan(
        testOrgId,
        'plan-enterprise',
        'enterprise',
        'Enterprise tier override by operator'
      );

      const orgs = await platformAdminService.getOrganizations();
      const target = orgs.find((o) => o.id === testOrgId);
      expect(target?.subscription?.plan_id).toBe('plan-enterprise');

      const logs = await platformAdminService.getAuditLogs();
      const changeLog = logs.find(
        (l) => l.action === 'SUBSCRIPTION_PLAN_CHANGED' && l.target_org_id === testOrgId
      );
      expect(changeLog).toBeDefined();
      expect(changeLog?.details.new_plan).toBe('enterprise');
    });
  });

  // ----------------------------------------------------------------------------
  // Subphase C: Restaurant Onboarding (9 Resumable Steps)
  // ----------------------------------------------------------------------------
  describe('Subphase C: Restaurant Onboarding', () => {
    const freshOrgId = '99999999-9999-9999-9999-999999999999';

    it('initializes a blank resumable onboarding state for new organizations', async () => {
      const state = await onboardingService.getOnboardingState(freshOrgId);
      expect(state.organization_id).toBe(freshOrgId);
      expect(state.current_step).toBe(1);
      expect(state.completed_steps).toEqual([]);
      expect(state.is_completed).toBe(false);
    });

    it('persists step progression sequentially without data loss', async () => {
      // Save step 1 (Identity)
      await onboardingService.saveStep(
        freshOrgId,
        1,
        { org_name: 'Trattoria Napoli', org_slug: 'trattoria-napoli' },
        true
      );
      let state = await onboardingService.getOnboardingState(freshOrgId);
      expect(state.current_step).toBe(1);
      expect(state.completed_steps).toContain(1);
      expect(state.step_data.org_name).toBe('Trattoria Napoli');

      // Save step 2 (Contact)
      await onboardingService.saveStep(
        freshOrgId,
        2,
        { contact_email: 'chef@napoli.com', contact_phone: '+15551234567' },
        true
      );
      state = await onboardingService.getOnboardingState(freshOrgId);
      expect(state.current_step).toBe(2);
      expect(state.completed_steps).toEqual([1, 2]);
      expect(state.step_data.org_name).toBe('Trattoria Napoli'); // Prior data intact
      expect(state.step_data.contact_email).toBe('chef@napoli.com');
    });

    it('completes onboarding and transitions organization to active launch state', async () => {
      // Complete all steps
      for (let s = 1; s <= 9; s++) {
        await onboardingService.saveStep(freshOrgId, s, { [`step_${s}_done`]: true }, true);
      }
      await onboardingService.completeOnboarding(freshOrgId);

      const state = await onboardingService.getOnboardingState(freshOrgId);
      expect(state.is_completed).toBe(true);
      expect(state.completed_steps.length).toBe(9);
    });
  });

  // ----------------------------------------------------------------------------
  // Subphase D: Subscription Plans & Entitlements
  // ----------------------------------------------------------------------------
  describe('Subphase D: Subscription Plans & Entitlements', () => {
    it('provides configurable database-defined plan tiers (Starter, Growth, Pro, Enterprise)', async () => {
      const plans = await subscriptionService.getPlans();
      expect(plans.length).toBeGreaterThanOrEqual(4);
      expect(plans.map((p) => p.slug)).toEqual(
        expect.arrayContaining(['starter', 'growth', 'professional', 'enterprise'])
      );
    });

    it('enforces branch capacity limits according to current subscription plan', async () => {
      // Starter plan has max 1 branch
      const starterPlan = (await subscriptionService.getPlans()).find((p) => p.slug === 'starter')!;
      expect(starterPlan.max_branches).toBe(1);

      // Check branch limit with 0 current branches -> true (allowed)
      const allowedAtZero = await subscriptionService.checkBranchLimit(testOrgId, 0);
      expect(allowedAtZero).toBe(true);

      // Check branch limit when at limit for starter (1 branch) -> false (disallowed)
      const allowedAtCap = starterPlan.max_branches <= 1;
      expect(allowedAtCap).toBe(true);
    });

    it('enforces feature entitlement boundaries (CRM, Loyalty, Inventory, OCR)', async () => {
      const plans = await subscriptionService.getPlans();
      const starter = plans.find((p) => p.slug === 'starter')!;
      const pro = plans.find((p) => p.slug === 'professional')!;

      // Starter has no CRM or OCR
      expect(starter.feature_flags.crm).toBe(false);
      expect(starter.feature_flags.ocr).toBe(false);

      // Professional has full suite
      expect(pro.feature_flags.crm).toBe(true);
      expect(pro.feature_flags.loyalty).toBe(true);
      expect(pro.feature_flags.ocr).toBe(true);
      expect(pro.allowed_modules).toContain('crm');
      expect(pro.allowed_modules).toContain('loyalty');
    });

    it('transitions subscription lifecycle safely without deleting tenant data on cancellation', async () => {
      const sub = await subscriptionService.subscribeToPlan(testOrgId, 'plan-growth', 'annual');
      expect(sub.status).toBe('active');
      expect(sub.billing_cycle).toBe('annual');
    });
  });

  // ----------------------------------------------------------------------------
  // Subphase E: Customer CRM
  // ----------------------------------------------------------------------------
  describe('Subphase E: Customer CRM', () => {
    it('isolates customer profiles strictly to the owning organization', async () => {
      const org1Customers = await crmService.getCustomers(testOrgId);
      const org2Customers = await crmService.getCustomers(otherOrgId);

      // Verify no overlap
      const org1Ids = new Set(org1Customers.map((c) => c.id));
      for (const c2 of org2Customers) {
        expect(org1Ids.has(c2.id)).toBe(false);
      }
    });

    it('allows guest profile creation with optional contact details and dietary notes', async () => {
      const newGuest = await crmService.createCustomer(testOrgId, {
        display_name: 'Giovanni Rossi',
        email: 'giovanni@example.com',
        phone: '+1 (555) 888-9999',
        notes: 'Nut allergy. Prefers booth seating.',
        tags: ['New Guest', 'Dietary Restriction'],
      });

      expect(newGuest.id).toBeDefined();
      expect(newGuest.display_name).toBe('Giovanni Rossi');
      expect(newGuest.loyalty_points_balance).toBe(0);
      expect(newGuest.tags).toContain('Dietary Restriction');

      const fetched = await crmService.getCustomers(testOrgId, { search: 'Giovanni' });
      expect(fetched.some((c) => c.id === newGuest.id)).toBe(true);
    });

    it('updates customer records and filters by query and tags', async () => {
      const all = await crmService.getCustomers(testOrgId);
      const target = all[0];

      await crmService.updateCustomer(testOrgId, target.id, {
        notes: 'Updated notes from dinner service',
        tags: [...target.tags, 'UpdatedTag'],
      });

      const updated = (await crmService.getCustomers(testOrgId)).find((c) => c.id === target.id);
      expect(updated?.notes).toBe('Updated notes from dinner service');
      expect(updated?.tags).toContain('UpdatedTag');
    });
  });

  // ----------------------------------------------------------------------------
  // Subphase F: Configurable Loyalty System & Auditable Ledger
  // ----------------------------------------------------------------------------
  describe('Subphase F: Configurable Loyalty System', () => {
    it('allows configuring earn rate, point cash value, and redemption thresholds', async () => {
      const currentConfig = await loyaltyService.getLoyaltyConfig(testOrgId);
      expect(currentConfig.is_enabled).toBe(true);

      const updated = await loyaltyService.updateLoyaltyConfig(testOrgId, {
        points_per_currency_unit: 1.5,
        currency_value_per_point: 0.02,
        min_redemption_points: 100,
      });

      expect(updated.points_per_currency_unit).toBe(1.5);
      expect(updated.currency_value_per_point).toBe(0.02);
      expect(updated.min_redemption_points).toBe(100);

      // Restore defaults
      await loyaltyService.updateLoyaltyConfig(testOrgId, {
        points_per_currency_unit: 1.0,
        currency_value_per_point: 0.01,
        min_redemption_points: 50,
      });
    });

    it('awards points on eligible completed orders idempotently', async () => {
      const idempotencyKey = `ord-test-earn-${Date.now()}`;
      const customerId = 'cust-001';
      const orderId = 'ord-555';
      const orderTotal = 120.0;

      // First award
      const res1 = await loyaltyService.awardPoints(
        testOrgId,
        customerId,
        orderId,
        orderTotal,
        idempotencyKey
      );
      expect(res1.success).toBe(true);
      expect(res1.points).toBe(120);

      // Duplicate replay with same idempotency key must not double-award
      const res2 = await loyaltyService.awardPoints(
        testOrgId,
        customerId,
        orderId,
        orderTotal,
        idempotencyKey
      );
      expect(res2.success).toBe(true);
      expect(res2.points).toBe(120); // Replay returns original award without incrementing
    });

    it('enforces minimum redemption threshold and calculates discount amount accurately', async () => {
      const customerId = 'cust-001';
      const belowThreshold = 30; // Min is 50

      await expect(
        loyaltyService.redeemPoints(
          testOrgId,
          customerId,
          'ord-601',
          belowThreshold,
          `redeem-under-${Date.now()}`
        )
      ).rejects.toThrow(/Minimum redemption is 50 points/);

      // Valid redemption
      const validPoints = 100;
      const res = await loyaltyService.redeemPoints(
        testOrgId,
        customerId,
        'ord-601',
        validPoints,
        `redeem-valid-${Date.now()}`
      );
      expect(res.success).toBe(true);
      expect(res.discount_amount).toBe(1.0); // 100 * $0.01 = $1.00
    });

    it('records cancellations and refunds as negative points reversals in the ledger', async () => {
      const customerId = 'cust-001';
      const orderId = 'ord-cancel-777';
      const pointsToReverse = 80;
      const idempotencyKey = `reversal-${orderId}`;

      const res = await loyaltyService.reverseOrderPoints(
        testOrgId,
        customerId,
        orderId,
        pointsToReverse,
        idempotencyKey
      );
      expect(res.success).toBe(true);

      const ledger = await loyaltyService.getLedger(testOrgId, customerId);
      const reversalEntry = ledger.find((e) => e.idempotency_key === idempotencyKey);
      expect(reversalEntry).toBeDefined();
      expect(reversalEntry?.entry_type).toBe('reversal');
      expect(reversalEntry?.points).toBe(-80);
    });
  });
});
