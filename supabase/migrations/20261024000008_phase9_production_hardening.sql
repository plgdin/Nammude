-- ==============================================================================
-- Migration: 20261024000008_phase9_production_hardening.sql
-- Description: Phase 9 Production Hardening, Subscription Escalation Guard,
--              Loyalty Balance Tamper Protection, Ledger Write Lockdown,
--              Platform Admin Escalation Prevention, and Schema Permissions.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SEC-P8-01: Subscription Plan Escalation Prevention
-- ------------------------------------------------------------------------------
-- Drop previously permissive insert/update policies on organization_subscriptions
DROP POLICY IF EXISTS org_subscriptions_insert_policy ON public.organization_subscriptions;
DROP POLICY IF EXISTS org_subscriptions_update_policy ON public.organization_subscriptions;

-- Lock direct table writes strictly to verified platform administrators
CREATE POLICY org_subscriptions_insert_policy ON public.organization_subscriptions
    FOR INSERT
    WITH CHECK (public.is_platform_admin());

CREATE POLICY org_subscriptions_update_policy ON public.organization_subscriptions
    FOR UPDATE
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- Controlled RPC for organization owners to update plan via verified billing workflow
CREATE OR REPLACE FUNCTION public.request_subscription_plan_change(
    p_org_id UUID,
    p_new_plan_id UUID,
    p_billing_cycle VARCHAR(16) DEFAULT 'monthly',
    p_payment_reference TEXT DEFAULT NULL
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
    -- Verify caller is organization owner
    IF NOT public.is_org_owner_or_manager(p_org_id) THEN
        RAISE EXCEPTION 'Access denied. Organization owner or manager privileges required.' USING ERRCODE = '42501';
    END IF;

    -- Validate target plan exists and is active
    SELECT slug INTO v_plan_slug FROM public.subscription_plans WHERE id = p_new_plan_id AND is_active = TRUE;
    IF v_plan_slug IS NULL THEN
        RAISE EXCEPTION 'Invalid or inactive target subscription plan.' USING ERRCODE = 'P0002';
    END IF;

    SELECT plan_id INTO v_old_plan_id FROM public.organization_subscriptions WHERE organization_id = p_org_id;

    -- Update subscription record
    INSERT INTO public.organization_subscriptions (
        organization_id, plan_id, status, billing_cycle, current_period_start, current_period_end
    )
    VALUES (
        p_org_id, p_new_plan_id, 'active', p_billing_cycle, NOW(), NOW() + INTERVAL '30 days'
    )
    ON CONFLICT (organization_id)
    DO UPDATE SET
        plan_id = p_new_plan_id,
        billing_cycle = p_billing_cycle,
        status = 'active',
        updated_at = NOW();

    -- Record in platform audit log
    INSERT INTO public.platform_audit_logs (actor_id, action, target_org_id, details)
    VALUES (
        auth.uid(),
        'TENANT_PLAN_CHANGED',
        p_org_id,
        jsonb_build_object(
            'old_plan_id', v_old_plan_id,
            'new_plan_id', p_new_plan_id,
            'new_plan_slug', v_plan_slug,
            'billing_cycle', p_billing_cycle,
            'payment_reference', p_payment_reference
        )
    );

    RETURN jsonb_build_object('success', TRUE, 'organization_id', p_org_id, 'new_plan_id', p_new_plan_id);
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. SEC-P8-02: Loyalty Balance Tamper Protection Trigger
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_manual_customer_loyalty_tamper()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.loyalty_points_balance IS DISTINCT FROM OLD.loyalty_points_balance THEN
        IF current_setting('app.loyalty_transaction_in_progress', true) IS DISTINCT FROM 'true' THEN
            RAISE EXCEPTION 'Direct manipulation of customer loyalty_points_balance is forbidden. Use record_loyalty_transaction.'
            USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_customer_loyalty_tamper ON public.customers;
CREATE TRIGGER trg_prevent_customer_loyalty_tamper
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_manual_customer_loyalty_tamper();

-- Update record_loyalty_transaction to set transaction session flag
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

    -- Set local session flag to allow authorized balance update trigger
    PERFORM set_config('app.loyalty_transaction_in_progress', 'true', true);

    -- Update customer balance
    UPDATE public.customers
    SET loyalty_points_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_customer_id;

    -- Reset session flag
    PERFORM set_config('app.loyalty_transaction_in_progress', 'false', true);

    -- Insert auditable ledger row (executed within SECURITY DEFINER context)
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
-- 3. SEC-P8-03: Fabricated Loyalty Transactions Lockdown
-- ------------------------------------------------------------------------------
-- Drop direct INSERT policy on customer_loyalty_ledger
DROP POLICY IF EXISTS loyalty_ledger_insert_policy ON public.customer_loyalty_ledger;

-- Disallow all direct table INSERTs; force all ledger mutations through record_loyalty_transaction
CREATE POLICY loyalty_ledger_insert_policy ON public.customer_loyalty_ledger
    FOR INSERT
    WITH CHECK (FALSE);

-- ------------------------------------------------------------------------------
-- 4. SEC-P9-01: Profile Platform-Admin Privilege Escalation Guard
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_platform_admin_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.is_platform_admin = TRUE) OR
       (TG_OP = 'UPDATE' AND NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin) THEN
        IF NOT public.is_platform_admin() THEN
            RAISE EXCEPTION 'Privilege escalation rejected: only platform administrators can grant platform admin status.'
            USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_platform_admin_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_platform_admin_escalation
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_platform_admin_escalation();

-- ------------------------------------------------------------------------------
-- 5. SEC-P9-02: Public Schema Grants & Function Permissions
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;

-- Public menu and pricing reads for unauthenticated guests
GRANT SELECT ON public.organizations TO anon;
GRANT SELECT ON public.branches TO anon;
GRANT SELECT ON public.dining_tables TO anon;
GRANT SELECT ON public.menu_categories TO anon;
GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT ON public.modifier_groups TO anon;
GRANT SELECT ON public.modifiers TO anon;
GRANT SELECT ON public.menu_item_modifier_groups TO anon;
GRANT SELECT ON public.subscription_plans TO anon;
