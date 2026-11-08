-- ==============================================================================
-- PHASE 10: STAFF OPERATIONS, INVENTORY DEPTH, CRM EXTRAS & PLATFORM SUPPORT
-- Migration: 20261024000009_staff_inventory_crm_platform.sql
-- Adds: employees, shifts, attendance, compliance documents, stock counts,
-- wastage records, supplier invoices, feedback, consents, promotions,
-- usage records, webhook events. All tables are tenant-scoped with RLS.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Employees (HR roster; optionally linked to a platform user account)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(32),
    role VARCHAR(32) NOT NULL DEFAULT 'staff',
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'inactive')),
    hire_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_org_branch ON public.employees(organization_id, branch_id, status);

-- ------------------------------------------------------------------------------
-- 2. Shifts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    role_on_shift VARCHAR(32),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_shift_time_range CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_shifts_branch_date ON public.shifts(branch_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_employee ON public.shifts(employee_id, shift_date);

-- ------------------------------------------------------------------------------
-- 3. Attendance Events (clock in / out)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
    clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clock_out TIMESTAMPTZ,
    method VARCHAR(32) NOT NULL DEFAULT 'manual' CHECK (method IN ('manual', 'pin', 'qr', 'system')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_attendance_clock_range CHECK (clock_out IS NULL OR clock_out >= clock_in)
);

CREATE INDEX IF NOT EXISTS idx_attendance_branch_date ON public.attendance_events(branch_id, clock_in DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON public.attendance_events(employee_id, clock_in DESC);

-- ------------------------------------------------------------------------------
-- 4. Compliance Documents (health license, food handler, etc.)
-- Sensitive: org owner/manager + auditor read only; writes owner/manager.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    doc_type VARCHAR(64) NOT NULL,
    document_number VARCHAR(128),
    issued_date DATE,
    expires_date DATE,
    file_path TEXT,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_expiry ON public.compliance_documents(organization_id, expires_date);

-- ------------------------------------------------------------------------------
-- 5. Physical Stock Counts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
    counted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    counted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_count_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    stock_count_id UUID NOT NULL REFERENCES public.stock_counts(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    system_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0,
    counted_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0,
    unit VARCHAR(16) NOT NULL DEFAULT 'g',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_stock_count_ingredient UNIQUE (stock_count_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_counts_branch ON public.stock_counts(branch_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. Wastage Records (with staff attribution and reason classification)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wastage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 4) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(16) NOT NULL DEFAULT 'g',
    reason_category VARCHAR(32) NOT NULL DEFAULT 'other' CHECK (
        reason_category IN ('spoiled', 'burnt', 'expired', 'spilled', 'damaged', 'other')
    ),
    reason TEXT,
    stock_movement_id UUID REFERENCES public.stock_movements(id) ON DELETE SET NULL,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wastage_branch_created ON public.wastage_records(branch_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. Supplier Invoices (first-class AP records, distinct from GRNs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    goods_receipt_id UUID REFERENCES public.goods_receipts(id) ON DELETE SET NULL,
    invoice_number VARCHAR(128) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    total_amount NUMERIC(12, 4) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'received' CHECK (
        status IN ('received', 'verified', 'partially_paid', 'paid', 'disputed')
    ),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_supplier_invoice_number UNIQUE (organization_id, supplier_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoices_branch ON public.supplier_invoices(branch_id, status);

-- ------------------------------------------------------------------------------
-- 8. CRM: Feedback, Consents, Promotions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    channel VARCHAR(32) NOT NULL DEFAULT 'in_store',
    status VARCHAR(32) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_org_created ON public.feedback(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.customer_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    consent_type VARCHAR(32) NOT NULL CHECK (consent_type IN ('marketing_email', 'marketing_sms', 'loyalty')),
    granted BOOLEAN NOT NULL DEFAULT FALSE,
    granted_at TIMESTAMPTZ,
    source VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customer_consent_type UNIQUE (customer_id, consent_type)
);

CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) NOT NULL,
    discount_type VARCHAR(16) NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
    discount_value NUMERIC(12, 4) NOT NULL CHECK (discount_value >= 0),
    min_order_value NUMERIC(12, 4) NOT NULL DEFAULT 0,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    usage_limit INT,
    used_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_promotion_code_per_org UNIQUE (organization_id, code)
);

-- ------------------------------------------------------------------------------
-- 9. Platform: Usage Records & Webhook Events (support/billing operations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    metric VARCHAR(64) NOT NULL,
    quantity NUMERIC(12, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_usage_period_metric UNIQUE (organization_id, period_start, metric)
);

CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(32) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(128),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_webhook_provider_event UNIQUE (provider, event_id)
);

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================

-- Helper pattern (existing): is_org_member / is_org_owner_or_manager / has_branch_permission

-- 1. Employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees FORCE ROW LEVEL SECURITY;
CREATE POLICY employees_select ON public.employees FOR SELECT
    USING (public.is_org_member(organization_id));
CREATE POLICY employees_write ON public.employees FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

-- 2. Shifts
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts FORCE ROW LEVEL SECURITY;
CREATE POLICY shifts_select ON public.shifts FOR SELECT
    USING (public.is_org_member(organization_id));
CREATE POLICY shifts_write ON public.shifts FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

-- 3. Attendance
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_events FORCE ROW LEVEL SECURITY;
CREATE POLICY attendance_select ON public.attendance_events FOR SELECT
    USING (public.is_org_member(organization_id));
CREATE POLICY attendance_write ON public.attendance_events FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

-- 4. Compliance (sensitive: owner/manager + auditor read)
ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY compliance_select ON public.compliance_documents FOR SELECT
    USING (
        public.is_org_owner_or_manager(organization_id)
        OR public.has_org_role(organization_id, 'auditor')
    );
CREATE POLICY compliance_write ON public.compliance_documents FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

-- 5. Stock counts
ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_counts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.stock_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_count_items FORCE ROW LEVEL SECURITY;
CREATE POLICY stock_counts_select ON public.stock_counts FOR SELECT
    USING (public.is_org_member(organization_id));
CREATE POLICY stock_counts_write ON public.stock_counts FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));
CREATE POLICY stock_count_items_select ON public.stock_count_items FOR SELECT
    USING (public.is_org_member(organization_id));
CREATE POLICY stock_count_items_write ON public.stock_count_items FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

-- 6. Wastage records
ALTER TABLE public.wastage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wastage_records FORCE ROW LEVEL SECURITY;
CREATE POLICY wastage_select ON public.wastage_records FOR SELECT
    USING (public.is_org_member(organization_id));
CREATE POLICY wastage_write ON public.wastage_records FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

-- 7. Supplier invoices
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices FORCE ROW LEVEL SECURITY;
CREATE POLICY supplier_invoices_select ON public.supplier_invoices FOR SELECT
    USING (public.is_org_member(organization_id));
CREATE POLICY supplier_invoices_write ON public.supplier_invoices FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

-- 8. CRM extras
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback FORCE ROW LEVEL SECURITY;
CREATE POLICY feedback_select ON public.feedback FOR SELECT
    USING (public.is_org_member(organization_id));
CREATE POLICY feedback_write ON public.feedback FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

ALTER TABLE public.customer_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_consents FORCE ROW LEVEL SECURITY;
CREATE POLICY consents_select ON public.customer_consents FOR SELECT
    USING (public.is_org_member(organization_id));
CREATE POLICY consents_write ON public.customer_consents FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions FORCE ROW LEVEL SECURITY;
CREATE POLICY promotions_select ON public.promotions FOR SELECT
    USING (public.is_org_member(organization_id));
CREATE POLICY promotions_write ON public.promotions FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

-- 9. Platform usage + webhooks (platform-admin governed)
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records FORCE ROW LEVEL SECURITY;
CREATE POLICY usage_select ON public.usage_records FOR SELECT
    USING (public.is_org_member(organization_id) OR public.is_platform_admin());
CREATE POLICY usage_write ON public.usage_records FOR ALL
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events FORCE ROW LEVEL SECURITY;
CREATE POLICY webhooks_admin ON public.webhook_events FOR ALL
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());

-- ==============================================================================
-- STORED PROCEDURE: Complete a stock count and post variance adjustments
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.complete_stock_count(p_stock_count_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_count public.stock_counts%ROWTYPE;
    v_item public.stock_count_items%ROWTYPE;
    v_variance NUMERIC(12, 4);
BEGIN
    SELECT * INTO v_count FROM public.stock_counts WHERE id = p_stock_count_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Stock count not found');
    END IF;
    IF v_count.status = 'completed' THEN
        RETURN jsonb_build_object('success', TRUE, 'already_completed', TRUE);
    END IF;
    IF NOT (public.is_org_owner_or_manager(v_count.organization_id) OR public.is_platform_admin()) THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Unauthorized');
    END IF;

    FOR v_item IN SELECT * FROM public.stock_count_items WHERE stock_count_id = p_stock_count_id LOOP
        v_variance := v_item.counted_quantity - v_item.system_quantity;
        IF v_variance <> 0 THEN
            PERFORM public.record_stock_movement_internal(
                v_count.organization_id,
                v_count.branch_id,
                v_item.ingredient_id,
                NULL,
                'stock_count',
                v_variance,
                v_item.unit,
                0,
                v_count.id,
                'stock_count',
                NULL,
                'count-' || v_count.id::TEXT || '-' || v_item.ingredient_id::TEXT,
                'Physical stock count variance',
                NULL
            );
        END IF;
    END LOOP;

    UPDATE public.stock_counts
    SET status = 'completed', counted_at = NOW(), updated_at = NOW()
    WHERE id = p_stock_count_id;

    RETURN jsonb_build_object('success', TRUE);
END;
$$;
