-- ==============================================================================
-- PHASE 6 & PHASE 7 SECURITY HARDENING AND PRODUCTION BLOCKERS PATCH
-- Migration: 20261023000006_phase6_phase7_security_hardening.sql
-- ==============================================================================

-- ==============================================================================
-- 1. FIX CHECKLIST ITEMS RLS (CRITICAL TENANT ISOLATION)
-- ==============================================================================

-- Drop permissive TRUE policies on checklist_template_items
DROP POLICY IF EXISTS "Checklist Template Items: org members can read" ON public.checklist_template_items;
DROP POLICY IF EXISTS "Checklist Template Items: managers can manage" ON public.checklist_template_items;

-- Secure Checklist Template Items RLS (derived from parent template)
CREATE POLICY "Checklist Template Items: org members can read"
    ON public.checklist_template_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.checklist_templates t
            WHERE t.id = checklist_template_items.template_id
              AND public.has_org_role(t.organization_id, 'viewer')
        )
    );

CREATE POLICY "Checklist Template Items: managers can insert"
    ON public.checklist_template_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.checklist_templates t
            WHERE t.id = checklist_template_items.template_id
              AND public.has_org_role(t.organization_id, 'manager')
        )
    );

CREATE POLICY "Checklist Template Items: managers can update"
    ON public.checklist_template_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.checklist_templates t
            WHERE t.id = checklist_template_items.template_id
              AND public.has_org_role(t.organization_id, 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.checklist_templates t
            WHERE t.id = checklist_template_items.template_id
              AND public.has_org_role(t.organization_id, 'manager')
        )
    );

CREATE POLICY "Checklist Template Items: managers can delete"
    ON public.checklist_template_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.checklist_templates t
            WHERE t.id = checklist_template_items.template_id
              AND public.has_org_role(t.organization_id, 'manager')
        )
    );

-- Drop permissive TRUE policies on checklist_instance_items
DROP POLICY IF EXISTS "Checklist Instance Items: branch staff can read" ON public.checklist_instance_items;
DROP POLICY IF EXISTS "Checklist Instance Items: branch staff can update" ON public.checklist_instance_items;

-- Secure Checklist Instance Items RLS (derived from parent instance)
CREATE POLICY "Checklist Instance Items: branch staff can read"
    ON public.checklist_instance_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.checklist_instances i
            WHERE i.id = checklist_instance_items.instance_id
              AND public.has_branch_role(i.branch_id, 'cashier')
        )
    );

CREATE POLICY "Checklist Instance Items: branch staff can update"
    ON public.checklist_instance_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.checklist_instances i
            WHERE i.id = checklist_instance_items.instance_id
              AND i.status = 'in_progress'
              AND public.has_branch_role(i.branch_id, 'cashier')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.checklist_instances i
            WHERE i.id = checklist_instance_items.instance_id
              AND i.status = 'in_progress'
              AND public.has_branch_role(i.branch_id, 'cashier')
        )
    );

-- Direct client INSERT or DELETE on checklist_instance_items is prohibited (RPC only)
REVOKE INSERT, DELETE ON public.checklist_instance_items FROM authenticated, anon;


-- ==============================================================================
-- 2. PROTECT DOCUMENT VERIFICATION & EXTRACTION DIRECT WRITES
-- ==============================================================================

-- Restrict direct documents INSERT to initial states only (uploaded, queued)
DROP POLICY IF EXISTS "Documents: branch staff can upload" ON public.documents;
CREATE POLICY "Documents: branch staff can upload"
    ON public.documents FOR INSERT
    WITH CHECK (
        public.has_branch_role(branch_id, 'cashier')
        AND status IN ('uploaded', 'queued')
    );

-- Restrict document extractions: Cashiers may only read; no direct INSERT or UPDATE
DROP POLICY IF EXISTS "Extractions: staff can insert and update" ON public.document_extractions;
DROP POLICY IF EXISTS "Extractions: branch staff can read" ON public.document_extractions;

CREATE POLICY "Extractions: org staff can read"
    ON public.document_extractions FOR SELECT
    USING (public.has_org_role(organization_id, 'cashier'));

CREATE POLICY "Extractions: managers can update corrected data"
    ON public.document_extractions FOR UPDATE
    USING (public.has_org_role(organization_id, 'manager'))
    WITH CHECK (public.has_org_role(organization_id, 'manager'));

REVOKE INSERT, DELETE ON public.document_extractions FROM authenticated, anon;


-- ==============================================================================
-- 3. TIGHTEN CASH-SHIFT RLS (PHASE 6 BLOCKER)
-- ==============================================================================

-- Remove cashier FOR ALL unrestricted access
DROP POLICY IF EXISTS "Cash Shifts: branch staff can open and operate" ON public.cash_shifts;

-- Restrict direct UPDATE and DELETE on cash_shifts. Cashiers may only SELECT.
-- Mutations are strictly gated through open_cash_shift, record_shift_cash_movement, and close_cash_shift RPCs.
CREATE POLICY "Cash Shifts: managers can update open shifts"
    ON public.cash_shifts FOR UPDATE
    USING (
        public.has_branch_role(branch_id, 'manager')
        AND status = 'open'
    )
    WITH CHECK (
        public.has_branch_role(branch_id, 'manager')
        AND status = 'open'
    );

REVOKE INSERT, DELETE ON public.cash_shifts FROM authenticated, anon;

-- Add partial unique index: Exactly one open cash shift per branch
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_open_cash_shift_per_branch
    ON public.cash_shifts(branch_id)
    WHERE status = 'open';


-- ==============================================================================
-- 4. PREVENT DUPLICATE CHECKLIST INSTANCES & ENFORCE UNIQUENESS
-- ==============================================================================

-- Guarantee single instance per branch, template, date, and shift
CREATE UNIQUE INDEX IF NOT EXISTS uq_checklist_instance_shift
    ON public.checklist_instances (branch_id, template_id, scheduled_date, COALESCE(shift_name, 'DEFAULT'));


-- ==============================================================================
-- 5. HARDENED STORED PROCEDURES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- A. Ingest Document: Validates Org-Branch Consistency
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ingest_document(
    p_organization_id UUID,
    p_branch_id UUID,
    p_document_type VARCHAR(32),
    p_file_name VARCHAR(255),
    p_file_path TEXT,
    p_file_size_bytes INT,
    p_mime_type VARCHAR(64),
    p_file_hash VARCHAR(64) DEFAULT NULL,
    p_initial_extracted_data JSONB DEFAULT NULL,
    p_confidence_score NUMERIC(5, 4) DEFAULT 0.9500
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_doc_id UUID;
    v_duplicate_count INT := 0;
BEGIN
    v_user_id := auth.uid();

    -- 1. Authentication check
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- 2. Validate branch belongs to organization
    IF NOT EXISTS (
        SELECT 1 FROM public.branches
        WHERE id = p_branch_id AND organization_id = p_organization_id
    ) THEN
        RAISE EXCEPTION 'Branch % does not belong to organization %', p_branch_id, p_organization_id;
    END IF;

    -- 3. Authorization check
    IF NOT public.has_branch_role(p_branch_id, 'cashier') THEN
        RAISE EXCEPTION 'Access denied. Cashier permissions required to upload operational documents.';
    END IF;

    -- 4. Duplicate check within same organization
    IF p_file_hash IS NOT NULL THEN
        SELECT COUNT(*) INTO v_duplicate_count
        FROM public.documents
        WHERE organization_id = p_organization_id
          AND file_hash = p_file_hash
          AND status NOT IN ('rejected', 'failed');
    END IF;

    -- 5. Insert Document with safe initial status
    INSERT INTO public.documents (
        organization_id,
        branch_id,
        document_type,
        file_name,
        file_path,
        file_size_bytes,
        mime_type,
        file_hash,
        status,
        uploaded_by,
        metadata
    )
    VALUES (
        p_organization_id,
        p_branch_id,
        p_document_type,
        p_file_name,
        p_file_path,
        p_file_size_bytes,
        p_mime_type,
        p_file_hash,
        CASE WHEN p_initial_extracted_data IS NOT NULL THEN 'needs_review' ELSE 'queued' END,
        v_user_id,
        jsonb_build_object('is_potential_duplicate', v_duplicate_count > 0)
    )
    RETURNING id INTO v_doc_id;

    -- 6. Insert extraction record
    IF p_initial_extracted_data IS NOT NULL THEN
        INSERT INTO public.document_extractions (
            organization_id,
            document_id,
            provider,
            confidence_score,
            extracted_data,
            raw_text
        )
        VALUES (
            p_organization_id,
            v_doc_id,
            'mock_adapter',
            p_confidence_score,
            p_initial_extracted_data,
            p_initial_extracted_data->>'raw_text'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'document_id', v_doc_id,
        'status', CASE WHEN p_initial_extracted_data IS NOT NULL THEN 'needs_review' ELSE 'queued' END,
        'is_duplicate', v_duplicate_count > 0
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- B. Review Document: Locked Rows, Legal Transitions, Gated Manager Permissions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_document(
    p_document_id UUID,
    p_action VARCHAR(16), -- 'verify' or 'reject'
    p_corrected_data JSONB DEFAULT NULL,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_doc RECORD;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Row lock to prevent concurrent reviews
    SELECT * INTO v_doc
    FROM public.documents
    WHERE id = p_document_id
    FOR UPDATE;

    IF v_doc IS NULL THEN
        RAISE EXCEPTION 'Document % not found', p_document_id;
    END IF;

    -- Manager authorization check
    IF NOT public.has_branch_role(v_doc.branch_id, 'manager') THEN
        RAISE EXCEPTION 'Access denied. Manager role required to review and verify documents.';
    END IF;

    -- Legal state transition check: Only documents awaiting review can be decided
    IF v_doc.status NOT IN ('needs_review', 'queued') THEN
        RAISE EXCEPTION 'Document % cannot be reviewed from its current state (%)', p_document_id, v_doc.status;
    END IF;

    IF p_action = 'verify' THEN
        IF p_corrected_data IS NOT NULL THEN
            UPDATE public.document_extractions
            SET corrected_data = p_corrected_data, updated_at = NOW()
            WHERE document_id = p_document_id;
        END IF;

        UPDATE public.documents
        SET
            status = 'verified',
            reviewed_by = v_user_id,
            reviewed_at = NOW(),
            verified_at = NOW(),
            updated_at = NOW()
        WHERE id = p_document_id;

    ELSIF p_action = 'reject' THEN
        IF p_rejection_reason IS NULL OR TRIM(p_rejection_reason) = '' THEN
            RAISE EXCEPTION 'A valid rejection reason is mandatory when rejecting a document.';
        END IF;

        UPDATE public.documents
        SET
            status = 'rejected',
            rejection_reason = p_rejection_reason,
            reviewed_by = v_user_id,
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_document_id;
    ELSE
        RAISE EXCEPTION 'Invalid review action: %. Allowed: verify, reject', p_action;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'document_id', p_document_id,
        'status', CASE WHEN p_action = 'verify' THEN 'verified' ELSE 'rejected' END
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- C. Instantiate Checklist: Idempotent Concurrency & Org Consistency
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.instantiate_checklist(
    p_organization_id UUID,
    p_branch_id UUID,
    p_template_id UUID,
    p_shift_name VARCHAR(32) DEFAULT 'Morning'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_instance_id UUID;
    v_tmpl RECORD;
    v_count INT := 0;
    v_existing_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Validate branch belongs to organization
    IF NOT EXISTS (
        SELECT 1 FROM public.branches
        WHERE id = p_branch_id AND organization_id = p_organization_id
    ) THEN
        RAISE EXCEPTION 'Branch % does not belong to organization %', p_branch_id, p_organization_id;
    END IF;

    -- Validate caller has cashier role on branch
    IF NOT public.has_branch_role(p_branch_id, 'cashier') THEN
        RAISE EXCEPTION 'Access denied. Cashier permissions required on branch to instantiate checklist.';
    END IF;

    -- Validate template exists in organization
    SELECT * INTO v_tmpl
    FROM public.checklist_templates
    WHERE id = p_template_id AND organization_id = p_organization_id;

    IF v_tmpl IS NULL THEN
        RAISE EXCEPTION 'Template % not found in organization %', p_template_id, p_organization_id;
    END IF;

    -- Idempotency check: Return existing instance if already created for this shift today
    SELECT id INTO v_existing_id
    FROM public.checklist_instances
    WHERE branch_id = p_branch_id
      AND template_id = p_template_id
      AND scheduled_date = CURRENT_DATE
      AND COALESCE(shift_name, 'DEFAULT') = COALESCE(p_shift_name, 'DEFAULT')
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        SELECT total_items INTO v_count FROM public.checklist_instances WHERE id = v_existing_id;
        RETURN jsonb_build_object(
            'success', true,
            'status', 'already_exists',
            'instance_id', v_existing_id,
            'total_items', v_count,
            'message', 'Checklist instance already active for this shift.'
        );
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.checklist_template_items
    WHERE template_id = p_template_id;

    INSERT INTO public.checklist_instances (
        organization_id,
        branch_id,
        template_id,
        scheduled_date,
        shift_name,
        status,
        total_items,
        completed_items
    )
    VALUES (
        p_organization_id,
        p_branch_id,
        p_template_id,
        CURRENT_DATE,
        p_shift_name,
        'in_progress',
        v_count,
        0
    )
    RETURNING id INTO v_instance_id;

    -- Copy template items into instance
    INSERT INTO public.checklist_instance_items (
        instance_id,
        template_item_id,
        task_description,
        is_completed
    )
    SELECT
        v_instance_id,
        id,
        task_description,
        FALSE
    FROM public.checklist_template_items
    WHERE template_id = p_template_id
    ORDER BY item_order ASC;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'created',
        'instance_id', v_instance_id,
        'total_items', v_count
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- D. Toggle Checklist Item: Server-Side Temperature Limits & Branch Role Gating
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_checklist_item(
    p_item_id UUID,
    p_is_completed BOOLEAN,
    p_notes TEXT DEFAULT NULL,
    p_temperature NUMERIC(5, 2) DEFAULT NULL,
    p_is_exception BOOLEAN DEFAULT FALSE,
    p_exception_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_rec RECORD;
    v_completed_count INT;
    v_total_count INT;
    v_has_exception BOOLEAN;
    v_calculated_exception BOOLEAN := FALSE;
    v_calculated_reason TEXT := NULL;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Lock row and load parent instance + template configuration
    SELECT
        ii.id AS item_id,
        ii.instance_id,
        ii.is_completed AS previous_completed,
        ii.is_exception AS previous_exception,
        i.branch_id,
        i.organization_id,
        i.status AS instance_status,
        ti.min_temperature,
        ti.max_temperature,
        ti.requires_temperature_reading,
        ti.is_required
    INTO v_rec
    FROM public.checklist_instance_items ii
    JOIN public.checklist_instances i ON i.id = ii.instance_id
    LEFT JOIN public.checklist_template_items ti ON ti.id = ii.template_item_id
    WHERE ii.id = p_item_id
    FOR UPDATE;

    IF v_rec IS NULL THEN
        RAISE EXCEPTION 'Checklist item % not found', p_item_id;
    END IF;

    -- Authorize caller against the parent instance's branch
    IF NOT public.has_branch_role(v_rec.branch_id, 'cashier') THEN
        RAISE EXCEPTION 'Access denied. Cashier permissions required on branch % to execute checklist items.', v_rec.branch_id;
    END IF;

    -- Completed checklist instances cannot be altered
    IF v_rec.instance_status = 'completed' THEN
        RAISE EXCEPTION 'Cannot modify items in a completed checklist instance.';
    END IF;

    -- Server-authoritative temperature validation
    IF p_temperature IS NOT NULL THEN
        IF v_rec.min_temperature IS NOT NULL AND p_temperature < v_rec.min_temperature THEN
            v_calculated_exception := TRUE;
            v_calculated_reason := 'Temperature ' || p_temperature || '° is below minimum safe threshold (' || v_rec.min_temperature || '°).';
        ELSIF v_rec.max_temperature IS NOT NULL AND p_temperature > v_rec.max_temperature THEN
            v_calculated_exception := TRUE;
            v_calculated_reason := 'Temperature ' || p_temperature || '° exceeds maximum safe threshold (' || v_rec.max_temperature || '°).';
        END IF;
    END IF;

    -- Preserve manual exception reason if client flagged legitimate operational defect
    IF p_is_exception IS TRUE AND NOT v_calculated_exception THEN
        v_calculated_exception := TRUE;
        v_calculated_reason := p_exception_reason;
    END IF;

    UPDATE public.checklist_instance_items
    SET
        is_completed = p_is_completed,
        completed_at = CASE WHEN p_is_completed THEN NOW() ELSE NULL END,
        completed_by = CASE WHEN p_is_completed THEN v_user_id ELSE NULL END,
        notes = p_notes,
        temperature_reading = p_temperature,
        is_exception = v_calculated_exception,
        exception_reason = CASE WHEN v_calculated_exception THEN COALESCE(v_calculated_reason, p_exception_reason) ELSE NULL END
    WHERE id = p_item_id;

    -- Recalculate instance totals
    SELECT
        COUNT(*),
        COALESCE(SUM(CASE WHEN is_completed THEN 1 ELSE 0 END), 0),
        COALESCE(BOOL_OR(is_exception), FALSE)
    INTO v_total_count, v_completed_count, v_has_exception
    FROM public.checklist_instance_items
    WHERE instance_id = v_rec.instance_id;

    UPDATE public.checklist_instances
    SET
        total_items = v_total_count,
        completed_items = v_completed_count,
        status = CASE
            WHEN v_completed_count = v_total_count AND v_has_exception THEN 'flagged_exceptions'
            WHEN v_completed_count = v_total_count THEN 'completed'
            ELSE 'in_progress'
        END,
        completed_at = CASE WHEN v_completed_count = v_total_count THEN NOW() ELSE NULL END,
        completed_by = CASE WHEN v_completed_count = v_total_count THEN v_user_id ELSE NULL END,
        updated_at = NOW()
    WHERE id = v_rec.instance_id;

    RETURN jsonb_build_object(
        'success', true,
        'item_id', p_item_id,
        'instance_id', v_rec.instance_id,
        'completed_items', v_completed_count,
        'total_items', v_total_count,
        'is_fully_completed', v_completed_count = v_total_count,
        'is_exception', v_calculated_exception,
        'exception_reason', v_calculated_reason
    );
END;
$$;


-- ==============================================================================
-- 6. CORRECTED FINANCIAL REPORT RPC (PHASE 6 BLOCKERS: COGS & CUMULATIVE AP)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_financial_report(
    p_organization_id UUID,
    p_branch_id UUID DEFAULT NULL,
    p_start_date DATE DEFAULT CURRENT_DATE - 30,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_gross_sales NUMERIC(12, 4) := 0.0000;
    v_discounts NUMERIC(12, 4) := 0.0000;
    v_net_sales NUMERIC(12, 4) := 0.0000;
    v_tax_collected NUMERIC(12, 4) := 0.0000;
    v_total_billed NUMERIC(12, 4) := 0.0000;
    v_orders_count INT := 0;

    v_realized_cogs NUMERIC(12, 4) := 0.0000;
    v_wasted_loss NUMERIC(12, 4) := 0.0000;
    v_gross_profit NUMERIC(12, 4) := 0.0000;
    v_gross_margin_pct NUMERIC(5, 2) := 0.00;

    v_opex NUMERIC(12, 4) := 0.0000;
    v_net_operating_profit NUMERIC(12, 4) := 0.0000;
    v_expenses_by_category JSONB := '{}'::jsonb;

    v_collections_real NUMERIC(12, 4) := 0.0000;
    v_collections_simulated NUMERIC(12, 4) := 0.0000;
    v_payments_by_method JSONB := '{}'::jsonb;
    v_refunds_total NUMERIC(12, 4) := 0.0000;

    -- Period Activity
    v_supplier_invoiced_period NUMERIC(12, 4) := 0.0000;
    v_supplier_paid_period NUMERIC(12, 4) := 0.0000;
    -- Cumulative as of p_end_date
    v_supplier_invoiced_cumulative NUMERIC(12, 4) := 0.0000;
    v_supplier_paid_cumulative NUMERIC(12, 4) := 0.0000;
    v_supplier_payable_balance NUMERIC(12, 4) := 0.0000;
BEGIN
    v_user_id := auth.uid();

    -- Authorization check
    IF v_user_id IS NOT NULL THEN
        IF p_branch_id IS NOT NULL THEN
            IF NOT public.has_branch_role(p_branch_id, 'manager') THEN
                RAISE EXCEPTION 'Access denied. Manager role required for financial reports.';
            END IF;
        ELSE
            IF NOT public.has_org_role(p_organization_id, 'manager') THEN
                RAISE EXCEPTION 'Access denied. Organization manager role required for organization-wide financial reports.';
            END IF;
        END IF;
    END IF;

    -- 1. Sales & Revenue Aggregation
    SELECT
        COALESCE(SUM(subtotal_amount), 0.0000),
        COALESCE(SUM(discount_amount), 0.0000),
        COALESCE(SUM(tax_amount), 0.0000),
        COALESCE(COUNT(*), 0)
    INTO
        v_gross_sales,
        v_discounts,
        v_tax_collected,
        v_orders_count
    FROM public.orders
    WHERE organization_id = p_organization_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND status IN ('confirmed', 'in_prep', 'ready', 'served', 'completed')
      AND created_at::DATE >= p_start_date
      AND created_at::DATE <= p_end_date;

    v_net_sales := v_gross_sales - v_discounts;
    v_total_billed := v_net_sales + v_tax_collected;

    -- 2. Corrected Realized COGS: Deduct stock reversals from cancelled orders
    SELECT COALESCE(
        SUM(
            CASE
                WHEN movement_type = 'sale_consumption' THEN total_cost
                WHEN movement_type = 'return' AND reference_type = 'order_reversal' THEN -total_cost
                ELSE 0.0000
            END
        ), 0.0000) INTO v_realized_cogs
    FROM public.stock_movements
    WHERE organization_id = p_organization_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (
          movement_type = 'sale_consumption'
          OR (movement_type = 'return' AND reference_type = 'order_reversal')
      )
      AND created_at::DATE >= p_start_date
      AND created_at::DATE <= p_end_date;

    v_realized_cogs := GREATEST(0.0000, v_realized_cogs);

    -- 3. Inventory Wastage Loss
    SELECT COALESCE(SUM(total_cost), 0.0000) INTO v_wasted_loss
    FROM public.stock_movements
    WHERE organization_id = p_organization_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND movement_type = 'waste'
      AND created_at::DATE >= p_start_date
      AND created_at::DATE <= p_end_date;

    -- 4. Gross Profit & Margin
    v_gross_profit := v_net_sales - v_realized_cogs;
    IF v_net_sales > 0 THEN
        v_gross_margin_pct := ROUND((v_gross_profit / v_net_sales) * 100.0, 2);
    ELSE
        v_gross_margin_pct := 0.00;
    END IF;

    -- 5. Operating Expenses (OPEX)
    SELECT COALESCE(SUM(amount), 0.0000) INTO v_opex
    FROM public.expenses
    WHERE organization_id = p_organization_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND payment_status = 'paid'
      AND incurred_date >= p_start_date
      AND incurred_date <= p_end_date;

    -- Expenses Breakdown by Category
    SELECT jsonb_object_agg(COALESCE(category_name, 'Uncategorized'), total_cat) INTO v_expenses_by_category
    FROM (
        SELECT category_name, ROUND(SUM(amount), 2) AS total_cat
        FROM public.expenses
        WHERE organization_id = p_organization_id
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)
          AND payment_status = 'paid'
          AND incurred_date >= p_start_date
          AND incurred_date <= p_end_date
        GROUP BY category_name
    ) t;

    -- 6. Net Operating Profit
    v_net_operating_profit := v_gross_profit - v_opex;

    -- 7. Payment Collections by Tender (Real vs Simulated Separation)
    SELECT
        COALESCE(SUM(CASE WHEN reference_number IS NULL OR reference_number NOT ILIKE 'SIM-%' THEN amount ELSE 0 END), 0.0000),
        COALESCE(SUM(CASE WHEN reference_number ILIKE 'SIM-%' THEN amount ELSE 0 END), 0.0000)
    INTO
        v_collections_real,
        v_collections_simulated
    FROM public.payments
    WHERE organization_id = p_organization_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND status = 'completed'
      AND created_at::DATE >= p_start_date
      AND created_at::DATE <= p_end_date;

    -- Payment Methods Breakdown (Real Only)
    SELECT jsonb_object_agg(payment_method, total_method) INTO v_payments_by_method
    FROM (
        SELECT payment_method, ROUND(SUM(amount), 2) AS total_method
        FROM public.payments
        WHERE organization_id = p_organization_id
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)
          AND status = 'completed'
          AND (reference_number IS NULL OR reference_number NOT ILIKE 'SIM-%')
          AND created_at::DATE >= p_start_date
          AND created_at::DATE <= p_end_date
        GROUP BY payment_method
    ) t;

    -- Refunds Total
    SELECT COALESCE(SUM(pr.refund_amount), 0.0000) INTO v_refunds_total
    FROM public.payment_refunds pr
    JOIN public.payments p ON p.id = pr.payment_id
    WHERE p.organization_id = p_organization_id
      AND (p_branch_id IS NULL OR p.branch_id = p_branch_id)
      AND pr.created_at::DATE >= p_start_date
      AND pr.created_at::DATE <= p_end_date;

    -- 8. Supplier Accounts Payable: Period Activity
    SELECT COALESCE(SUM(total_amount), 0.0000) INTO v_supplier_invoiced_period
    FROM public.goods_receipts
    WHERE organization_id = p_organization_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND status = 'verified'
      AND received_at::DATE >= p_start_date
      AND received_at::DATE <= p_end_date;

    SELECT COALESCE(SUM(amount), 0.0000) INTO v_supplier_paid_period
    FROM public.supplier_payments
    WHERE organization_id = p_organization_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND payment_date >= p_start_date
      AND payment_date <= p_end_date;

    -- 8b. Supplier Accounts Payable: Cumulative Outstanding as of p_end_date (Includes Prior Periods)
    SELECT COALESCE(SUM(total_amount), 0.0000) INTO v_supplier_invoiced_cumulative
    FROM public.goods_receipts
    WHERE organization_id = p_organization_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND status = 'verified'
      AND received_at::DATE <= p_end_date;

    SELECT COALESCE(SUM(amount), 0.0000) INTO v_supplier_paid_cumulative
    FROM public.supplier_payments
    WHERE organization_id = p_organization_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND payment_date <= p_end_date;

    v_supplier_payable_balance := GREATEST(0.0000, v_supplier_invoiced_cumulative - v_supplier_paid_cumulative);

    RETURN jsonb_build_object(
        'organization_id', p_organization_id,
        'branch_id', p_branch_id,
        'start_date', p_start_date,
        'end_date', p_end_date,
        'orders_count', v_orders_count,
        'revenue', jsonb_build_object(
            'gross_sales', v_gross_sales,
            'discounts', v_discounts,
            'tax_collected', v_tax_collected,
            'net_sales', v_net_sales,
            'total_billed', v_total_billed
        ),
        'cogs', jsonb_build_object(
            'realized_cogs', v_realized_cogs,
            'wasted_loss', v_wasted_loss,
            'food_cost_percentage', CASE WHEN v_net_sales > 0 THEN ROUND((v_realized_cogs / v_net_sales) * 100.0, 2) ELSE 0.00 END
        ),
        'profitability', jsonb_build_object(
            'gross_profit', v_gross_profit,
            'gross_margin_percentage', v_gross_margin_pct,
            'operating_expenses', v_opex,
            'net_operating_profit', v_net_operating_profit,
            'net_margin_percentage', CASE WHEN v_net_sales > 0 THEN ROUND((v_net_operating_profit / v_net_sales) * 100.0, 2) ELSE 0.00 END
        ),
        'cash_and_collections', jsonb_build_object(
            'real_collections_total', v_collections_real,
            'simulated_collections_total', v_collections_simulated,
            'refunds_total', v_refunds_total,
            'net_collections', v_collections_real - v_refunds_total,
            'by_payment_method', COALESCE(v_payments_by_method, '{}'::jsonb)
        ),
        'operating_expenses_breakdown', COALESCE(v_expenses_by_category, '{}'::jsonb),
        'supplier_payables', jsonb_build_object(
            'period_invoiced', v_supplier_invoiced_period,
            'period_paid', v_supplier_paid_period,
            'cumulative_invoiced', v_supplier_invoiced_cumulative,
            'cumulative_paid', v_supplier_paid_cumulative,
            'outstanding_payable', v_supplier_payable_balance
        )
    );
END;
$$;


-- ==============================================================================
-- 7. SUPABASE STORAGE BUCKET & STORAGE RLS POLICIES
-- ==============================================================================

-- Create private 'documents' bucket in storage schema (if storage extension present)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'documents',
            'documents',
            FALSE,
            10485760, -- 10MB limit
            ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
        )
        ON CONFLICT (id) DO UPDATE SET
            public = FALSE,
            file_size_limit = 10485760,
            allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

        -- Drop old policies on documents bucket if any
        DROP POLICY IF EXISTS "Documents Bucket: branch staff can read" ON storage.objects;
        DROP POLICY IF EXISTS "Documents Bucket: branch staff can upload" ON storage.objects;

        -- Read policy: Path must match org_{org_id}/branch_{branch_id}/... and caller must have branch access
        CREATE POLICY "Documents Bucket: branch staff can read"
            ON storage.objects FOR SELECT
            USING (
                bucket_id = 'documents'
                AND name ~ '^org_[0-9a-fA-F-]+/branch_[0-9a-fA-F-]+/'
                AND public.has_branch_role(
                    (SUBSTRING(name FROM 'branch_([0-9a-fA-F-]+)'))::UUID,
                    'cashier'
                )
            );

        -- Upload policy: Path must match org_{org_id}/branch_{branch_id}/... and caller must have branch cashier role
        CREATE POLICY "Documents Bucket: branch staff can upload"
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id = 'documents'
                AND name ~ '^org_[0-9a-fA-F-]+/branch_[0-9a-fA-F-]+/'
                AND public.has_branch_role(
                    (SUBSTRING(name FROM 'branch_([0-9a-fA-F-]+)'))::UUID,
                    'cashier'
                )
            );
    END IF;
END $$;
