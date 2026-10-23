-- ==============================================================================
-- PHASE 6: FINANCIAL MANAGEMENT, CASH RECONCILIATION & COGS REPORTING
-- Migration: 20261023000004_phase6_financial_cogs_cash_reporting.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Expense Categories
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_expense_category_org_name UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_org ON public.expense_categories(organization_id, is_active);

-- ------------------------------------------------------------------------------
-- 2. Operating Expenses (OPEX)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    category_name VARCHAR(64) NOT NULL, -- Denormalized category name for stable reports
    description TEXT NOT NULL,
    amount NUMERIC(12, 4) NOT NULL CHECK (amount > 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(32) NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'cheque', 'petty_cash', 'other')),
    payment_status VARCHAR(16) NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'cancelled')),
    payee_name VARCHAR(255),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    incurred_date DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_date DATE,
    receipt_url TEXT,
    idempotency_key VARCHAR(64),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_expense_idempotency UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_expenses_branch_date ON public.expenses(branch_id, incurred_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_org_status ON public.expenses(organization_id, payment_status);

-- ------------------------------------------------------------------------------
-- 3. Cash Shifts & Drawer Sessions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    shift_number VARCHAR(32) NOT NULL, -- Daily sequence e.g. SHIFT-101
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    opening_float NUMERIC(12, 4) NOT NULL DEFAULT 0.0000 CHECK (opening_float >= 0),
    cash_sales_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    cash_refunds_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    cash_in_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    cash_out_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    cash_expenses_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    expected_cash NUMERIC(12, 4) DEFAULT 0.0000,
    actual_cash NUMERIC(12, 4),
    variance NUMERIC(12, 4),
    status VARCHAR(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'reconciled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_shift_branch_number UNIQUE (branch_id, shift_number)
);

CREATE INDEX IF NOT EXISTS idx_cash_shifts_branch_status ON public.cash_shifts(branch_id, status, opened_at DESC);

-- ------------------------------------------------------------------------------
-- 4. Cash Shift Movements (Cash In / Cash Out Log)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_shift_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    cash_shift_id UUID NOT NULL REFERENCES public.cash_shifts(id) ON DELETE CASCADE,
    movement_type VARCHAR(16) NOT NULL CHECK (movement_type IN ('cash_in', 'cash_out', 'petty_expense')),
    amount NUMERIC(12, 4) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    idempotency_key VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cash_movement_idempotency UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_cash_shift_movements_shift ON public.cash_shift_movements(cash_shift_id, created_at ASC);

-- ------------------------------------------------------------------------------
-- 5. Supplier Payments (Disbursements against GRN Invoices)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    goods_receipt_id UUID REFERENCES public.goods_receipts(id) ON DELETE SET NULL,
    amount NUMERIC(12, 4) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(32) NOT NULL CHECK (payment_method IN ('bank_transfer', 'cheque', 'cash', 'card', 'other')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number VARCHAR(128),
    notes TEXT,
    idempotency_key VARCHAR(64),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_supplier_payment_idempotency UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON public.supplier_payments(supplier_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_branch ON public.supplier_payments(branch_id, payment_date DESC);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_shift_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

-- 1. Expense Categories RLS
CREATE POLICY "Expense Categories: org members can read"
    ON public.expense_categories FOR SELECT
    USING (public.has_org_role(organization_id, 'viewer'));

CREATE POLICY "Expense Categories: managers can manage"
    ON public.expense_categories FOR ALL
    USING (public.has_org_role(organization_id, 'manager'))
    WITH CHECK (public.has_org_role(organization_id, 'manager'));

-- 2. Expenses RLS
CREATE POLICY "Expenses: branch staff can read"
    ON public.expenses FOR SELECT
    USING (public.has_branch_role(branch_id, 'cashier'));

CREATE POLICY "Expenses: manager/owner can manage"
    ON public.expenses FOR ALL
    USING (public.has_branch_role(branch_id, 'manager'))
    WITH CHECK (public.has_branch_role(branch_id, 'manager'));

-- 3. Cash Shifts RLS
CREATE POLICY "Cash Shifts: branch staff can read"
    ON public.cash_shifts FOR SELECT
    USING (public.has_branch_role(branch_id, 'cashier'));

CREATE POLICY "Cash Shifts: branch staff can open and operate"
    ON public.cash_shifts FOR ALL
    USING (public.has_branch_role(branch_id, 'cashier'))
    WITH CHECK (public.has_branch_role(branch_id, 'cashier'));

-- 4. Cash Shift Movements RLS
CREATE POLICY "Cash Shift Movements: branch staff can read"
    ON public.cash_shift_movements FOR SELECT
    USING (public.has_branch_role(branch_id, 'cashier'));

CREATE POLICY "Cash Shift Movements: branch staff can insert"
    ON public.cash_shift_movements FOR INSERT
    WITH CHECK (public.has_branch_role(branch_id, 'cashier'));

-- 5. Supplier Payments RLS
CREATE POLICY "Supplier Payments: branch staff can read"
    ON public.supplier_payments FOR SELECT
    USING (public.has_branch_role(branch_id, 'cashier'));

CREATE POLICY "Supplier Payments: manager/owner can manage"
    ON public.supplier_payments FOR ALL
    USING (public.has_branch_role(branch_id, 'manager'))
    WITH CHECK (public.has_branch_role(branch_id, 'manager'));


-- ==============================================================================
-- 7. STORED PROCEDURES & RECONCILIATION ENGINES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- A. Open Cash Shift Procedure
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.open_cash_shift(
    p_organization_id UUID,
    p_branch_id UUID,
    p_opening_float NUMERIC(12, 4),
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_existing_shift RECORD;
    v_seq INT;
    v_shift_number VARCHAR(32);
    v_shift_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- Authorization check
    IF v_user_id IS NOT NULL AND NOT public.has_branch_role(p_branch_id, 'cashier') THEN
        RAISE EXCEPTION 'Access denied. Cashier permissions required to open cash shift.';
    END IF;

    -- Concurrency lock per branch
    PERFORM pg_advisory_xact_lock(hashtext('cash_shift_branch_' || p_branch_id::TEXT));

    -- Check if an active open shift already exists for this branch
    SELECT * INTO v_existing_shift
    FROM public.cash_shifts
    WHERE branch_id = p_branch_id AND status = 'open'
    LIMIT 1;

    IF v_existing_shift IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'already_open',
            'shift_id', v_existing_shift.id,
            'shift_number', v_existing_shift.shift_number,
            'opening_float', v_existing_shift.opening_float,
            'message', 'An open cash shift is already active on this branch.'
        );
    END IF;

    -- Generate sequential shift number
    SELECT COALESCE(COUNT(*), 0) + 101 INTO v_seq
    FROM public.cash_shifts
    WHERE branch_id = p_branch_id AND opened_at >= date_trunc('day', NOW());

    v_shift_number := 'SHIFT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || v_seq::TEXT;

    INSERT INTO public.cash_shifts (
        organization_id,
        branch_id,
        opened_by,
        shift_number,
        opening_float,
        status,
        notes,
        opened_at
    )
    VALUES (
        p_organization_id,
        p_branch_id,
        v_user_id,
        v_shift_number,
        COALESCE(p_opening_float, 0.0000),
        'open',
        p_notes,
        NOW()
    )
    RETURNING id INTO v_shift_id;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'opened',
        'shift_id', v_shift_id,
        'shift_number', v_shift_number,
        'opening_float', p_opening_float
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- B. Record Cash-In / Cash-Out Movement
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_shift_cash_movement(
    p_shift_id UUID,
    p_movement_type VARCHAR(16),
    p_amount NUMERIC(12, 4),
    p_reason TEXT,
    p_idempotency_key VARCHAR(64) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_shift RECORD;
    v_movement_id UUID;
BEGIN
    v_user_id := auth.uid();

    SELECT * INTO v_shift
    FROM public.cash_shifts
    WHERE id = p_shift_id;

    IF v_shift IS NULL THEN
        RAISE EXCEPTION 'Cash shift % not found', p_shift_id;
    END IF;

    IF v_shift.status != 'open' THEN
        RAISE EXCEPTION 'Cannot record cash movement on a closed cash shift (status: %)', v_shift.status;
    END IF;

    IF v_user_id IS NOT NULL AND NOT public.has_branch_role(v_shift.branch_id, 'cashier') THEN
        RAISE EXCEPTION 'Access denied. Cashier permissions required.';
    END IF;

    -- Concurrency lock
    PERFORM pg_advisory_xact_lock(hashtext('cash_shift_' || p_shift_id::TEXT));

    -- Insert movement
    INSERT INTO public.cash_shift_movements (
        organization_id,
        branch_id,
        cash_shift_id,
        movement_type,
        amount,
        reason,
        performed_by,
        idempotency_key
    )
    VALUES (
        v_shift.organization_id,
        v_shift.branch_id,
        p_shift_id,
        p_movement_type,
        p_amount,
        p_reason,
        v_user_id,
        p_idempotency_key
    )
    RETURNING id INTO v_movement_id;

    -- Update shift running totals
    IF p_movement_type = 'cash_in' THEN
        UPDATE public.cash_shifts
        SET cash_in_amount = cash_in_amount + p_amount, updated_at = NOW()
        WHERE id = p_shift_id;
    ELSIF p_movement_type = 'cash_out' THEN
        UPDATE public.cash_shifts
        SET cash_out_amount = cash_out_amount + p_amount, updated_at = NOW()
        WHERE id = p_shift_id;
    ELSIF p_movement_type = 'petty_expense' THEN
        UPDATE public.cash_shifts
        SET cash_expenses_amount = cash_expenses_amount + p_amount, updated_at = NOW()
        WHERE id = p_shift_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'shift_id', p_shift_id,
        'type', p_movement_type,
        'amount', p_amount
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- C. Close Cash Shift & Calculate Drawer Variance
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_cash_shift(
    p_shift_id UUID,
    p_actual_cash NUMERIC(12, 4),
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_shift RECORD;
    v_cash_sales NUMERIC(12, 4) := 0.0000;
    v_cash_refunds NUMERIC(12, 4) := 0.0000;
    v_expected_cash NUMERIC(12, 4);
    v_variance NUMERIC(12, 4);
BEGIN
    v_user_id := auth.uid();

    SELECT * INTO v_shift
    FROM public.cash_shifts
    WHERE id = p_shift_id;

    IF v_shift IS NULL THEN
        RAISE EXCEPTION 'Cash shift % not found', p_shift_id;
    END IF;

    IF v_shift.status != 'open' THEN
        RAISE EXCEPTION 'Shift % is already closed', p_shift_id;
    END IF;

    IF v_user_id IS NOT NULL AND NOT public.has_branch_role(v_shift.branch_id, 'cashier') THEN
        RAISE EXCEPTION 'Access denied. Cashier permissions required to close shift.';
    END IF;

    -- Concurrency lock
    PERFORM pg_advisory_xact_lock(hashtext('cash_shift_' || p_shift_id::TEXT));

    -- 1. Calculate actual cash sales collected during this shift period
    -- Exclude simulated payments (reference_number LIKE 'SIM-%')
    SELECT COALESCE(SUM(amount), 0.0000) INTO v_cash_sales
    FROM public.payments
    WHERE branch_id = v_shift.branch_id
      AND payment_method = 'cash'
      AND status = 'completed'
      AND (reference_number IS NULL OR reference_number NOT ILIKE 'SIM-%')
      AND created_at >= v_shift.opened_at
      AND created_at <= NOW();

    -- 2. Calculate actual cash refunds issued during this shift period
    SELECT COALESCE(SUM(pr.refund_amount), 0.0000) INTO v_cash_refunds
    FROM public.payment_refunds pr
    JOIN public.payments p ON p.id = pr.payment_id
    WHERE p.branch_id = v_shift.branch_id
      AND p.payment_method = 'cash'
      AND pr.created_at >= v_shift.opened_at
      AND pr.created_at <= NOW();

    -- 3. Calculate expected cash
    -- Formula: Opening Float + Cash Sales - Cash Refunds + Cash In - Cash Out - Cash Expenses
    v_expected_cash := ROUND(
        v_shift.opening_float + v_cash_sales - v_cash_refunds +
        v_shift.cash_in_amount - v_shift.cash_out_amount - v_shift.cash_expenses_amount,
        4
    );

    v_variance := ROUND(p_actual_cash - v_expected_cash, 4);

    -- 4. Update Shift
    UPDATE public.cash_shifts
    SET
        closed_by = v_user_id,
        closed_at = NOW(),
        cash_sales_amount = v_cash_sales,
        cash_refunds_amount = v_cash_refunds,
        expected_cash = v_expected_cash,
        actual_cash = p_actual_cash,
        variance = v_variance,
        status = 'closed',
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_shift_id;

    RETURN jsonb_build_object(
        'success', true,
        'shift_id', p_shift_id,
        'shift_number', v_shift.shift_number,
        'opening_float', v_shift.opening_float,
        'cash_sales', v_cash_sales,
        'cash_refunds', v_cash_refunds,
        'cash_in', v_shift.cash_in_amount,
        'cash_out', v_shift.cash_out_amount,
        'cash_expenses', v_shift.cash_expenses_amount,
        'expected_cash', v_expected_cash,
        'actual_cash', p_actual_cash,
        'variance', v_variance,
        'is_balanced', (v_variance = 0.0000)
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- D. Comprehensive Financial Report RPC (Accrual & Cash Aggregation)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_financial_report(
    p_organization_id UUID,
    p_branch_id UUID DEFAULT NULL, -- NULL aggregates entire organization
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
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
    v_tax_collected NUMERIC(12, 4) := 0.0000;
    v_net_sales NUMERIC(12, 4) := 0.0000;
    v_total_billed NUMERIC(12, 4) := 0.0000;
    v_orders_count INT := 0;
    v_realized_cogs NUMERIC(12, 4) := 0.0000;
    v_wasted_loss NUMERIC(12, 4) := 0.0000;
    v_gross_profit NUMERIC(12, 4) := 0.0000;
    v_gross_margin_pct NUMERIC(6, 2) := 0.00;
    v_opex NUMERIC(12, 4) := 0.0000;
    v_net_operating_profit NUMERIC(12, 4) := 0.0000;
    v_collections_real NUMERIC(12, 4) := 0.0000;
    v_collections_simulated NUMERIC(12, 4) := 0.0000;
    v_refunds_total NUMERIC(12, 4) := 0.0000;
    v_payments_by_method JSONB;
    v_expenses_by_category JSONB;
    v_supplier_invoiced NUMERIC(12, 4) := 0.0000;
    v_supplier_paid NUMERIC(12, 4) := 0.0000;
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

    -- 1. Sales & Revenue Aggregation (Orders confirmed, served, completed)
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

    -- 2. Realized COGS from Stock Movement Ledger
    SELECT COALESCE(SUM(total_cost), 0.0000) INTO v_realized_cogs
    FROM public.stock_movements
    WHERE organization_id = p_organization_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND movement_type = 'sale_consumption'
      AND created_at::DATE >= p_start_date
      AND created_at::DATE <= p_end_date;

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

    -- 6. Net Operating Profit (Operational EBITDA Proxy)
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

    -- 8. Supplier Accounts Payable (Purchases Invoiced vs Paid)
    SELECT COALESCE(SUM(total_amount), 0.0000) INTO v_supplier_invoiced
    FROM public.goods_receipts
    WHERE organization_id = p_organization_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND status = 'verified'
      AND received_at::DATE >= p_start_date
      AND received_at::DATE <= p_end_date;

    SELECT COALESCE(SUM(amount), 0.0000) INTO v_supplier_paid
    FROM public.supplier_payments
    WHERE organization_id = p_organization_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND payment_date >= p_start_date
      AND payment_date <= p_end_date;

    v_supplier_payable_balance := v_supplier_invoiced - v_supplier_paid;

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
            'total_invoiced', v_supplier_invoiced,
            'total_paid', v_supplier_paid,
            'outstanding_payable', v_supplier_payable_balance
        )
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. Execution Grants
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.open_cash_shift TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_shift_cash_movement TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_cash_shift TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_report TO authenticated;
