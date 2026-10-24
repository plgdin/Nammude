-- ==============================================================================
-- Migration: 20261024000007_phase8_saas_crm_subscriptions.sql
-- Description: Phase 8 SaaS Platform Administration, Restaurant Onboarding,
--              Subscription Plans & Entitlements, Customer CRM, and Loyalty Ledger.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Subscription Plans Definition
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(63) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    price_annual NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    max_branches INT NOT NULL DEFAULT 1,
    max_staff INT NOT NULL DEFAULT 5,
    allowed_modules JSONB NOT NULL DEFAULT '["pos", "orders", "menu"]'::jsonb,
    feature_flags JSONB NOT NULL DEFAULT '{"crm": false, "loyalty": false, "inventory": false, "ocr": false}'::jsonb,
    trial_period_days INT NOT NULL DEFAULT 14,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON public.subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active);

-- Seed Initial Configurable Plans (if not exist)
INSERT INTO public.subscription_plans (slug, name, description, price_monthly, price_annual, max_branches, max_staff, allowed_modules, feature_flags, trial_period_days)
VALUES
    ('starter', 'Starter', 'Ideal for single-location cafes and food trucks.', 29.00, 290.00, 1, 5, '["pos", "orders", "menu", "tables"]'::jsonb, '{"crm": false, "loyalty": false, "inventory": false, "ocr": false}'::jsonb, 14),
    ('growth', 'Growth', 'Designed for growing restaurants needing stock control and basic CRM.', 79.00, 790.00, 3, 20, '["pos", "orders", "menu", "tables", "inventory", "crm"]'::jsonb, '{"crm": true, "loyalty": false, "inventory": true, "ocr": false}'::jsonb, 14),
    ('professional', 'Professional', 'Full suite for multi-branch dining, loyalty, recipes, and OCR.', 149.00, 1490.00, 10, 50, '["pos", "orders", "menu", "tables", "inventory", "finance", "ocr", "crm", "loyalty"]'::jsonb, '{"crm": true, "loyalty": true, "inventory": true, "ocr": true}'::jsonb, 14),
    ('enterprise', 'Enterprise', 'Custom enterprise scale with unlimited capacity and bespoke support.', 299.00, 2990.00, 99, 500, '["pos", "orders", "menu", "tables", "inventory", "finance", "ocr", "crm", "loyalty", "api_access"]'::jsonb, '{"crm": true, "loyalty": true, "inventory": true, "ocr": true, "custom_integrations": true}'::jsonb, 30)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. Organization Subscriptions & Invoices
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT UNIQUE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired')),
    billing_cycle VARCHAR(16) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
    trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org ON public.organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON public.organization_subscriptions(status);

CREATE TABLE IF NOT EXISTS public.subscription_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    subscription_id UUID NOT NULL REFERENCES public.organization_subscriptions(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(64) NOT NULL UNIQUE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(32) NOT NULL DEFAULT 'paid' CHECK (status IN ('draft', 'paid', 'unpaid', 'void')),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_org ON public.subscription_invoices(organization_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. Platform Administration Audit Logs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    target_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_actor ON public.platform_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_org ON public.platform_audit_logs(target_org_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_action ON public.platform_audit_logs(action);

-- ------------------------------------------------------------------------------
-- 4. Organization Onboarding State (Resumable 9-Step Flow)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
    current_step INT NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 9),
    completed_steps INT[] NOT NULL DEFAULT ARRAY[]::INT[],
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    step_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_onboarding_org ON public.organization_onboarding(organization_id);

-- ------------------------------------------------------------------------------
-- 5. Customer CRM
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(32),
    notes TEXT,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_orders_count INT NOT NULL DEFAULT 0 CHECK (total_orders_count >= 0),
    total_spend_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_spend_amount >= 0),
    last_order_at TIMESTAMPTZ,
    loyalty_points_balance INT NOT NULL DEFAULT 0 CHECK (loyalty_points_balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customer_email_org UNIQUE (organization_id, email),
    CONSTRAINT uq_customer_phone_org UNIQUE (organization_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers(organization_id, display_name);
CREATE INDEX IF NOT EXISTS idx_customers_org_spend ON public.customers(organization_id, total_spend_amount DESC);
CREATE INDEX IF NOT EXISTS idx_customers_org_phone ON public.customers(organization_id, phone);

-- ------------------------------------------------------------------------------
-- 6. Configurable Loyalty System & Auditable Ledger
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    points_per_currency_unit NUMERIC(10, 4) NOT NULL DEFAULT 1.0000 CHECK (points_per_currency_unit >= 0),
    currency_value_per_point NUMERIC(10, 4) NOT NULL DEFAULT 0.0100 CHECK (currency_value_per_point >= 0),
    min_redemption_points INT NOT NULL DEFAULT 50 CHECK (min_redemption_points >= 0),
    max_redemption_percentage NUMERIC(5, 2) NOT NULL DEFAULT 50.00 CHECK (max_redemption_percentage BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_configs_org ON public.loyalty_configs(organization_id);

CREATE TABLE IF NOT EXISTS public.customer_loyalty_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    entry_type VARCHAR(32) NOT NULL CHECK (entry_type IN ('earn', 'redeem', 'reversal', 'manual_adjustment')),
    points INT NOT NULL,
    balance_after INT NOT NULL CHECK (balance_after >= 0),
    idempotency_key VARCHAR(128) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_loyalty_ledger_idempotency UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_customer ON public.customer_loyalty_ledger(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_org ON public.customer_loyalty_ledger(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_order ON public.customer_loyalty_ledger(order_id);

-- ------------------------------------------------------------------------------
-- 7. Add CRM & Loyalty Columns to Orders Table (Additive)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
        CREATE INDEX idx_orders_customer ON public.orders(customer_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'loyalty_points_earned'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN loyalty_points_earned INT NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'loyalty_points_redeemed'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN loyalty_points_redeemed INT NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'loyalty_discount_amount'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN loyalty_discount_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 8. Platform Admin RPCs & Entitlement Enforcement
-- ------------------------------------------------------------------------------

-- Platform Metrics Summary
CREATE OR REPLACE FUNCTION public.get_platform_metrics()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_orgs INT;
    v_active_orgs INT;
    v_suspended_orgs INT;
    v_trial_orgs INT;
    v_active_subscriptions INT;
    v_total_revenue NUMERIC(14, 2);
    v_recent_onboardings INT;
    v_failed_or_past_due INT;
BEGIN
    -- Verify platform administrator role
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied. Platform administrator privilege required.' USING ERRCODE = '42501';
    END IF;

    SELECT COUNT(*) INTO v_total_orgs FROM public.organizations;
    SELECT COUNT(*) INTO v_active_orgs FROM public.organizations WHERE status = 'active';
    SELECT COUNT(*) INTO v_suspended_orgs FROM public.organizations WHERE status = 'suspended';
    SELECT COUNT(*) INTO v_trial_orgs FROM public.organizations WHERE status = 'trialing';

    SELECT COUNT(*) INTO v_active_subscriptions FROM public.organization_subscriptions WHERE status IN ('active', 'trial');
    SELECT COUNT(*) INTO v_failed_or_past_due FROM public.organization_subscriptions WHERE status IN ('past_due', 'suspended');

    -- Verified subscription revenue from paid billing records
    SELECT COALESCE(SUM(amount), 0.00) INTO v_total_revenue FROM public.subscription_invoices WHERE status = 'paid';

    -- Recent onboarding count (last 30 days)
    SELECT COUNT(*) INTO v_recent_onboardings FROM public.organizations WHERE created_at >= NOW() - INTERVAL '30 days';

    RETURN jsonb_build_object(
        'total_organizations', v_total_orgs,
        'active_organizations', v_active_orgs,
        'suspended_organizations', v_suspended_orgs,
        'trial_organizations', v_trial_orgs,
        'active_subscriptions', v_active_subscriptions,
        'past_due_subscriptions', v_failed_or_past_due,
        'verified_revenue_total', v_total_revenue,
        'recent_onboarding_count_30d', v_recent_onboardings
    );
END;
$$;

-- Suspend Organization
CREATE OR REPLACE FUNCTION public.admin_suspend_organization(
    p_org_id UUID,
    p_reason TEXT DEFAULT 'Administrative suspension'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied. Platform administrator privilege required.' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
        RAISE EXCEPTION 'Organization not found' USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.organizations
    SET status = 'suspended', updated_at = NOW()
    WHERE id = p_org_id;

    -- Update subscription status if exists
    UPDATE public.organization_subscriptions
    SET status = 'suspended', updated_at = NOW()
    WHERE organization_id = p_org_id;

    -- Record in platform audit log
    INSERT INTO public.platform_audit_logs (actor_id, action, target_org_id, details)
    VALUES (
        auth.uid(),
        'ORGANIZATION_SUSPENDED',
        p_org_id,
        jsonb_build_object('reason', p_reason, 'timestamp', NOW())
    );

    RETURN jsonb_build_object('success', TRUE, 'organization_id', p_org_id, 'status', 'suspended');
END;
$$;

-- Reactivate Organization
CREATE OR REPLACE FUNCTION public.admin_reactivate_organization(
    p_org_id UUID,
    p_reason TEXT DEFAULT 'Administrative reactivation'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied. Platform administrator privilege required.' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
        RAISE EXCEPTION 'Organization not found' USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.organizations
    SET status = 'active', updated_at = NOW()
    WHERE id = p_org_id;

    UPDATE public.organization_subscriptions
    SET status = 'active', updated_at = NOW()
    WHERE organization_id = p_org_id;

    INSERT INTO public.platform_audit_logs (actor_id, action, target_org_id, details)
    VALUES (
        auth.uid(),
        'ORGANIZATION_REACTIVATED',
        p_org_id,
        jsonb_build_object('reason', p_reason, 'timestamp', NOW())
    );

    RETURN jsonb_build_object('success', TRUE, 'organization_id', p_org_id, 'status', 'active');
END;
$$;

-- Admin Change Subscription Plan
CREATE OR REPLACE FUNCTION public.admin_change_subscription_plan(
    p_org_id UUID,
    p_new_plan_id UUID,
    p_reason TEXT DEFAULT 'Plan adjusted by platform administrator'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old_plan_id UUID;
    v_plan_slug VARCHAR(63);
BEGIN
    IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Access denied. Platform administrator privilege required.' USING ERRCODE = '42501';
    END IF;

    SELECT slug INTO v_plan_slug FROM public.subscription_plans WHERE id = p_new_plan_id AND is_active = TRUE;
    IF v_plan_slug IS NULL THEN
        RAISE EXCEPTION 'Invalid or inactive target subscription plan.' USING ERRCODE = 'P0002';
    END IF;

    SELECT plan_id INTO v_old_plan_id FROM public.organization_subscriptions WHERE organization_id = p_org_id;

    INSERT INTO public.organization_subscriptions (organization_id, plan_id, status, billing_cycle, current_period_start, current_period_end)
    VALUES (p_org_id, p_new_plan_id, 'active', 'monthly', NOW(), NOW() + INTERVAL '30 days')
    ON CONFLICT (organization_id)
    DO UPDATE SET
        plan_id = p_new_plan_id,
        status = 'active',
        updated_at = NOW();

    INSERT INTO public.platform_audit_logs (actor_id, action, target_org_id, details)
    VALUES (
        auth.uid(),
        'SUBSCRIPTION_PLAN_CHANGED',
        p_org_id,
        jsonb_build_object(
            'old_plan_id', v_old_plan_id,
            'new_plan_id', p_new_plan_id,
            'new_plan_slug', v_plan_slug,
            'reason', p_reason
        )
    );

    RETURN jsonb_build_object('success', TRUE, 'organization_id', p_org_id, 'new_plan_id', p_new_plan_id);
END;
$$;

-- Check Organization Feature Entitlement
CREATE OR REPLACE FUNCTION public.check_organization_entitlement(
    p_org_id UUID,
    p_feature_key VARCHAR(64)
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_subscriptions os
        JOIN public.subscription_plans sp ON sp.id = os.plan_id
        WHERE os.organization_id = p_org_id
          AND os.status IN ('trial', 'active')
          AND (
              (sp.feature_flags->>p_feature_key)::BOOLEAN IS TRUE
              OR sp.allowed_modules @> to_jsonb(p_feature_key)
          )
    ) OR public.is_platform_admin();
$$;

-- Check Branch Limit Enforcement
CREATE OR REPLACE FUNCTION public.check_organization_branch_limit(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_max_branches INT;
    v_current_branches INT;
BEGIN
    IF public.is_platform_admin() THEN
        RETURN TRUE;
    END IF;

    SELECT sp.max_branches INTO v_max_branches
    FROM public.organization_subscriptions os
    JOIN public.subscription_plans sp ON sp.id = os.plan_id
    WHERE os.organization_id = p_org_id
      AND os.status IN ('trial', 'active');

    -- If no subscription found, default to starter limit of 1
    IF v_max_branches IS NULL THEN
        v_max_branches := 1;
    END IF;

    SELECT COUNT(*) INTO v_current_branches
    FROM public.branches
    WHERE organization_id = p_org_id AND status != 'inactive';

    RETURN v_current_branches < v_max_branches;
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. Resumable Onboarding RPCs
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_onboarding_step(
    p_org_id UUID,
    p_step INT,
    p_step_data JSONB,
    p_mark_completed BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_current_steps INT[];
    v_is_all_done BOOLEAN;
BEGIN
    -- Verify caller is owner/manager of the org
    IF NOT public.is_org_owner_or_manager(p_org_id) THEN
        RAISE EXCEPTION 'Access denied. Organization owner or manager privileges required.' USING ERRCODE = '42501';
    END IF;

    IF p_step < 1 OR p_step > 9 THEN
        RAISE EXCEPTION 'Invalid onboarding step: % (must be between 1 and 9)', p_step USING ERRCODE = '22000';
    END IF;

    -- Upsert onboarding row
    INSERT INTO public.organization_onboarding (organization_id, current_step, completed_steps, step_data)
    VALUES (
        p_org_id,
        p_step,
        CASE WHEN p_mark_completed THEN ARRAY[p_step] ELSE ARRAY[]::INT[] END,
        p_step_data
    )
    ON CONFLICT (organization_id)
    DO UPDATE SET
        current_step = p_step,
        completed_steps = CASE
            WHEN p_mark_completed AND NOT (public.organization_onboarding.completed_steps @> ARRAY[p_step])
            THEN array_append(public.organization_onboarding.completed_steps, p_step)
            ELSE public.organization_onboarding.completed_steps
        END,
        step_data = public.organization_onboarding.step_data || p_step_data,
        updated_at = NOW();

    -- Determine completion status
    SELECT completed_steps INTO v_current_steps
    FROM public.organization_onboarding
    WHERE organization_id = p_org_id;

    v_is_all_done := (ARRAY[1,2,3,4,5,6,7,8,9] <@ v_current_steps);

    IF v_is_all_done THEN
        UPDATE public.organization_onboarding
        SET is_completed = TRUE, updated_at = NOW()
        WHERE organization_id = p_org_id;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'organization_id', p_org_id,
        'current_step', p_step,
        'completed_steps', v_current_steps,
        'is_completed', v_is_all_done
    );
END;
$$;

-- Complete Onboarding
CREATE OR REPLACE FUNCTION public.complete_organization_onboarding(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_org_owner_or_manager(p_org_id) THEN
        RAISE EXCEPTION 'Access denied.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.organization_onboarding
    SET is_completed = TRUE,
        completed_steps = ARRAY[1,2,3,4,5,6,7,8,9],
        updated_at = NOW()
    WHERE organization_id = p_org_id;

    -- Update organization status to active if previously in trialing/setup
    UPDATE public.organizations
    SET status = 'active', updated_at = NOW()
    WHERE id = p_org_id AND status != 'suspended';

    RETURN jsonb_build_object('success', TRUE, 'organization_id', p_org_id, 'is_completed', TRUE);
END;
$$;

-- ------------------------------------------------------------------------------
-- 10. Atomic Loyalty Transaction Stored Procedure
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_loyalty_transaction(
    p_customer_id UUID,
    p_org_id UUID,
    p_order_id UUID,
    p_entry_type VARCHAR(32),
    p_points INT,
    p_idempotency_key VARCHAR(128),
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_customer_org_id UUID;
    v_current_balance INT;
    v_new_balance INT;
    v_ledger_id UUID;
    v_existing_ledger RECORD;
BEGIN
    -- Verify permission: caller must be member of the org
    IF NOT public.is_org_member(p_org_id) THEN
        RAISE EXCEPTION 'Access denied to organization loyalty ledger' USING ERRCODE = '42501';
    END IF;

    -- Validate entry_type
    IF p_entry_type NOT IN ('earn', 'redeem', 'reversal', 'manual_adjustment') THEN
        RAISE EXCEPTION 'Invalid loyalty entry type: %', p_entry_type USING ERRCODE = '22000';
    END IF;

    -- Check idempotency
    SELECT * INTO v_existing_ledger
    FROM public.customer_loyalty_ledger
    WHERE organization_id = p_org_id AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'idempotent_replay', TRUE,
            'ledger_id', v_existing_ledger.id,
            'points', v_existing_ledger.points,
            'balance_after', v_existing_ledger.balance_after
        );
    END IF;

    -- Lock customer row for update
    SELECT organization_id, loyalty_points_balance
    INTO v_customer_org_id, v_current_balance
    FROM public.customers
    WHERE id = p_customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found: %', p_customer_id USING ERRCODE = 'P0002';
    END IF;

    IF v_customer_org_id != p_org_id THEN
        RAISE EXCEPTION 'Customer does not belong to specified organization' USING ERRCODE = '42501';
    END IF;

    -- Calculate and validate new balance
    v_new_balance := v_current_balance + p_points;

    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient loyalty points balance. Current: %, Required: %', v_current_balance, ABS(p_points)
        USING ERRCODE = '22003';
    END IF;

    -- Update customer balance
    UPDATE public.customers
    SET loyalty_points_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_customer_id;

    -- Insert auditable ledger row
    INSERT INTO public.customer_loyalty_ledger (
        customer_id,
        organization_id,
        order_id,
        entry_type,
        points,
        balance_after,
        idempotency_key,
        notes
    ) VALUES (
        p_customer_id,
        p_org_id,
        p_order_id,
        p_entry_type,
        p_points,
        v_new_balance,
        p_idempotency_key,
        p_notes
    )
    RETURNING id INTO v_ledger_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'idempotent_replay', FALSE,
        'ledger_id', v_ledger_id,
        'points', p_points,
        'balance_after', v_new_balance
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 11. Row Level Security Policies
-- ------------------------------------------------------------------------------

-- Subscription Plans RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans FORCE ROW LEVEL SECURITY;

CREATE POLICY subscription_plans_select_policy ON public.subscription_plans
    FOR SELECT
    USING (is_active = TRUE OR public.is_platform_admin());

CREATE POLICY subscription_plans_write_policy ON public.subscription_plans
    FOR ALL
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- Organization Subscriptions RLS
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY org_subscriptions_select_policy ON public.organization_subscriptions
    FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY org_subscriptions_insert_policy ON public.organization_subscriptions
    FOR INSERT
    WITH CHECK (public.is_platform_admin() OR public.is_org_owner_or_manager(organization_id));

CREATE POLICY org_subscriptions_update_policy ON public.organization_subscriptions
    FOR UPDATE
    USING (public.is_platform_admin() OR public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_platform_admin() OR public.is_org_owner_or_manager(organization_id));

CREATE POLICY org_subscriptions_delete_policy ON public.organization_subscriptions
    FOR DELETE
    USING (FALSE);

-- Subscription Invoices RLS
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY subscription_invoices_select_policy ON public.subscription_invoices
    FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY subscription_invoices_write_policy ON public.subscription_invoices
    FOR ALL
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- Platform Audit Logs RLS
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY platform_audit_logs_select_policy ON public.platform_audit_logs
    FOR SELECT
    USING (public.is_platform_admin());

CREATE POLICY platform_audit_logs_insert_policy ON public.platform_audit_logs
    FOR INSERT
    WITH CHECK (public.is_platform_admin());

-- Organization Onboarding RLS
ALTER TABLE public.organization_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_onboarding FORCE ROW LEVEL SECURITY;

CREATE POLICY org_onboarding_select_policy ON public.organization_onboarding
    FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY org_onboarding_write_policy ON public.organization_onboarding
    FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

-- Customers RLS (CRM)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;

CREATE POLICY customers_select_policy ON public.customers
    FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY customers_insert_policy ON public.customers
    FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY customers_update_policy ON public.customers
    FOR UPDATE
    USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY customers_delete_policy ON public.customers
    FOR DELETE
    USING (public.is_org_owner_or_manager(organization_id));

-- Loyalty Configs RLS
ALTER TABLE public.loyalty_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_configs FORCE ROW LEVEL SECURITY;

CREATE POLICY loyalty_configs_select_policy ON public.loyalty_configs
    FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY loyalty_configs_write_policy ON public.loyalty_configs
    FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

-- Customer Loyalty Ledger RLS
ALTER TABLE public.customer_loyalty_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_loyalty_ledger FORCE ROW LEVEL SECURITY;

CREATE POLICY loyalty_ledger_select_policy ON public.customer_loyalty_ledger
    FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY loyalty_ledger_insert_policy ON public.customer_loyalty_ledger
    FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY loyalty_ledger_update_policy ON public.customer_loyalty_ledger
    FOR UPDATE
    USING (FALSE);

CREATE POLICY loyalty_ledger_delete_policy ON public.customer_loyalty_ledger
    FOR DELETE
    USING (FALSE);
