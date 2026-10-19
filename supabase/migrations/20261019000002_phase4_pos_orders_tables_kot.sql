-- ==============================================================================
-- Migration: 20261019000002_phase4_pos_orders_tables_kot.sql
-- Description: Phase 4 Restaurant Operations Schema
--              (Menu Categories, Items, Modifiers, Dining Tables,
--               Orders, Order Items, KOT Tickets, Payments & RLS Policies)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Menu Categories
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    icon VARCHAR(64) DEFAULT 'Utensils',
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_menu_cat_slug_per_org UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_menu_categories_org ON public.menu_categories(organization_id, display_order);

-- ------------------------------------------------------------------------------
-- 2. Menu Items
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    description TEXT,
    base_price NUMERIC(12, 4) NOT NULL CHECK (base_price >= 0),
    cost_price NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    tax_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.0825,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    image_url TEXT,
    kitchen_station VARCHAR(32) NOT NULL DEFAULT 'main_kitchen',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_menu_item_sku_per_org UNIQUE (organization_id, sku),
    CONSTRAINT uq_menu_item_slug_per_org UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_menu_items_org_cat ON public.menu_items(organization_id, category_id, display_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(organization_id, is_available);

-- ------------------------------------------------------------------------------
-- 3. Modifier Groups & Modifiers
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.modifier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL, -- e.g., 'Milk Choice', 'Syrup Flavors', 'Temperature'
    min_selection INT NOT NULL DEFAULT 0,
    max_selection INT NOT NULL DEFAULT 1,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modifier_groups_org ON public.modifier_groups(organization_id);

CREATE TABLE IF NOT EXISTS public.modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    group_id UUID NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    additional_price NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    cost_price NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modifiers_group ON public.modifiers(group_id, display_order);

-- Junction: Menu Items to Modifier Groups
CREATE TABLE IF NOT EXISTS public.menu_item_modifier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_item_mod_group UNIQUE (menu_item_id, modifier_group_id)
);

-- ------------------------------------------------------------------------------
-- 4. Dining Tables
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dining_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    table_number VARCHAR(32) NOT NULL,
    section VARCHAR(64) NOT NULL DEFAULT 'Main Dining',
    capacity INT NOT NULL DEFAULT 4,
    current_status VARCHAR(32) NOT NULL DEFAULT 'vacant' CHECK (current_status IN ('vacant', 'occupied', 'billed', 'reserved', 'cleaning')),
    qr_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_branch_table_number UNIQUE (branch_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_dining_tables_branch ON public.dining_tables(branch_id, current_status);
CREATE INDEX IF NOT EXISTS idx_dining_tables_qr_token ON public.dining_tables(qr_token);

-- ------------------------------------------------------------------------------
-- 5. Orders
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    table_id UUID REFERENCES public.dining_tables(id) ON DELETE SET NULL,
    order_number VARCHAR(32) NOT NULL,
    order_type VARCHAR(32) NOT NULL CHECK (order_type IN ('dine_in', 'takeaway', 'delivery', 'qr_self_order')),
    status VARCHAR(32) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('draft', 'confirmed', 'in_prep', 'ready', 'served', 'completed', 'cancelled')),
    guest_count INT DEFAULT 1,
    subtotal_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    discount_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_reason TEXT,
    tax_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    service_charge_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    total_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    paid_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    cashier_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    idempotency_key VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_order_idempotency UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_orders_org_branch_status ON public.orders(organization_id, branch_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_table ON public.orders(table_id, status);

-- ------------------------------------------------------------------------------
-- 6. Order Line Items (Immutable Historical Snapshot)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
    item_name VARCHAR(255) NOT NULL,
    unit_price NUMERIC(12, 4) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    discount_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    tax_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    total_price NUMERIC(12, 4) NOT NULL,
    selected_modifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
    special_instructions TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'sent_to_kitchen' CHECK (status IN ('pending', 'sent_to_kitchen', 'preparing', 'ready', 'served', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- ------------------------------------------------------------------------------
-- 7. Kitchen Order Tickets (KOT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kot_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    kot_number VARCHAR(32) NOT NULL,
    station VARCHAR(32) NOT NULL DEFAULT 'main_kitchen',
    status VARCHAR(32) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'ready', 'bumped')),
    items_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    bumped_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kot_tickets_branch_status ON public.kot_tickets(branch_id, status, created_at ASC);

-- ------------------------------------------------------------------------------
-- 8. Payments & Settlement Ledger
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    payment_method VARCHAR(32) NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi_qr', 'wallet', 'account')),
    amount NUMERIC(12, 4) NOT NULL CHECK (amount > 0),
    tip_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    reference_number VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    idempotency_key VARCHAR(64) NOT NULL,
    settled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payment_idempotency UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_payments_org_branch ON public.payments(organization_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);

CREATE TABLE IF NOT EXISTS public.payment_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
    refund_amount NUMERIC(12, 4) NOT NULL CHECK (refund_amount > 0),
    reason TEXT NOT NULL,
    approved_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    idempotency_key VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_refund_idempotency UNIQUE (organization_id, idempotency_key)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 1. Menu Categories RLS
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories FORCE ROW LEVEL SECURITY;

CREATE POLICY menu_categories_select_policy ON public.menu_categories
    FOR SELECT
    USING (
        -- Staff can see all active categories; Public visitors see active categories of active orgs
        public.is_org_member(organization_id)
        OR (is_active = TRUE AND EXISTS (
            SELECT 1 FROM public.organizations o WHERE o.id = menu_categories.organization_id AND o.status = 'active'
        ))
    );

CREATE POLICY menu_categories_admin_policy ON public.menu_categories
    FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

-- 2. Menu Items RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items FORCE ROW LEVEL SECURITY;

CREATE POLICY menu_items_select_policy ON public.menu_items
    FOR SELECT
    USING (
        -- Staff see all; Public sees available items of active organizations
        public.is_org_member(organization_id)
        OR (is_available = TRUE AND EXISTS (
            SELECT 1 FROM public.organizations o WHERE o.id = menu_items.organization_id AND o.status = 'active'
        ))
    );

CREATE POLICY menu_items_admin_policy ON public.menu_items
    FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

-- 3. Modifier Groups & Modifiers RLS
ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_groups FORCE ROW LEVEL SECURITY;
ALTER TABLE public.modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifiers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_modifier_groups FORCE ROW LEVEL SECURITY;

CREATE POLICY modifier_groups_select ON public.modifier_groups FOR SELECT
    USING (
        public.is_org_member(organization_id)
        OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = modifier_groups.organization_id AND o.status = 'active')
    );

CREATE POLICY modifier_groups_admin ON public.modifier_groups FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

CREATE POLICY modifiers_select ON public.modifiers FOR SELECT
    USING (
        public.is_org_member(organization_id)
        OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = modifiers.organization_id AND o.status = 'active')
    );

CREATE POLICY modifiers_admin ON public.modifiers FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

CREATE POLICY item_mod_groups_select ON public.menu_item_modifier_groups FOR SELECT
    USING (
        public.is_org_member(organization_id)
        OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = menu_item_modifier_groups.organization_id AND o.status = 'active')
    );

CREATE POLICY item_mod_groups_admin ON public.menu_item_modifier_groups FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

-- 4. Dining Tables RLS
ALTER TABLE public.dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dining_tables FORCE ROW LEVEL SECURITY;

CREATE POLICY dining_tables_select ON public.dining_tables FOR SELECT
    USING (
        public.has_branch_permission(branch_id)
        OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = dining_tables.organization_id AND o.status = 'active')
    );

CREATE POLICY dining_tables_write ON public.dining_tables FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

-- 5. Orders & Order Items RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items FORCE ROW LEVEL SECURITY;

CREATE POLICY orders_select ON public.orders FOR SELECT
    USING (public.has_branch_permission(branch_id));

CREATE POLICY orders_insert ON public.orders FOR INSERT
    WITH CHECK (public.has_branch_permission(branch_id));

CREATE POLICY orders_update ON public.orders FOR UPDATE
    USING (public.has_branch_permission(branch_id))
    WITH CHECK (public.has_branch_permission(branch_id));

CREATE POLICY orders_delete ON public.orders FOR DELETE
    USING (public.is_org_owner_or_manager(organization_id));

CREATE POLICY order_items_select ON public.order_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND public.has_branch_permission(o.branch_id)
    ));

CREATE POLICY order_items_insert ON public.order_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND public.has_branch_permission(o.branch_id)
    ));

CREATE POLICY order_items_update ON public.order_items FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND public.has_branch_permission(o.branch_id)
    ));

-- 6. KOT Tickets RLS
ALTER TABLE public.kot_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kot_tickets FORCE ROW LEVEL SECURITY;

CREATE POLICY kot_select ON public.kot_tickets FOR SELECT
    USING (public.has_branch_permission(branch_id));

CREATE POLICY kot_write ON public.kot_tickets FOR ALL
    USING (public.has_branch_permission(branch_id))
    WITH CHECK (public.has_branch_permission(branch_id));

-- 7. Payments & Refunds RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds FORCE ROW LEVEL SECURITY;

CREATE POLICY payments_select ON public.payments FOR SELECT
    USING (public.has_branch_permission(branch_id));

CREATE POLICY payments_insert ON public.payments FOR INSERT
    WITH CHECK (public.has_branch_permission(branch_id));

CREATE POLICY payments_update ON public.payments FOR UPDATE
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

CREATE POLICY refunds_select ON public.payment_refunds FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY refunds_write ON public.payment_refunds FOR INSERT
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

-- ==============================================================================
-- STORED PROCEDURE: Transactional Order Creation with Authoritative Price Calculation
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_order_transactional(
    p_organization_id UUID,
    p_branch_id UUID,
    p_order_type VARCHAR(32),
    p_table_id UUID,
    p_guest_count INT,
    p_discount_percent NUMERIC(5, 2),
    p_discount_reason TEXT,
    p_notes TEXT,
    p_idempotency_key VARCHAR(64),
    p_items JSONB -- Array of { menu_item_id, quantity, special_instructions, selected_modifiers }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_existing_order_id UUID;
    v_order_id UUID;
    v_order_number VARCHAR(32);
    v_daily_seq INT;
    v_branch_tax_rate NUMERIC(6, 4);
    v_subtotal NUMERIC(12, 4) := 0.0000;
    v_discount_amt NUMERIC(12, 4) := 0.0000;
    v_tax_amt NUMERIC(12, 4) := 0.0000;
    v_total_amt NUMERIC(12, 4) := 0.0000;
    v_item JSONB;
    v_db_item RECORD;
    v_unit_price NUMERIC(12, 4);
    v_line_total NUMERIC(12, 4);
    v_kot_id UUID;
    v_kot_number VARCHAR(32);
BEGIN
    -- 1. Idempotency Check: return existing order if previously created
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id, order_number, total_amount INTO v_existing_order_id, v_order_number, v_total_amt
        FROM public.orders
        WHERE organization_id = p_organization_id AND idempotency_key = p_idempotency_key;
        
        IF v_existing_order_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', TRUE,
                'order_id', v_existing_order_id,
                'order_number', v_order_number,
                'total_amount', v_total_amt,
                'is_idempotent_replay', TRUE
            );
        END IF;
    END IF;

    -- 2. Authorization Check (Branch Access)
    IF NOT (public.has_branch_permission(p_branch_id) OR public.is_platform_admin()) THEN
        RAISE EXCEPTION 'Access denied: User does not have permission for branch %', p_branch_id;
    END IF;

    -- 3. Retrieve Branch Tax Rate
    SELECT tax_rate INTO v_branch_tax_rate
    FROM public.branches
    WHERE id = p_branch_id AND organization_id = p_organization_id;

    IF v_branch_tax_rate IS NULL THEN
        RAISE EXCEPTION 'Branch not found or inactive';
    END IF;

    -- 4. Generate Daily Order Sequence Number (e.g. #101, #102)
    SELECT COALESCE(COUNT(*), 0) + 101 INTO v_daily_seq
    FROM public.orders
    WHERE branch_id = p_branch_id AND created_at >= date_trunc('day', NOW());

    v_order_number := '#' || v_daily_seq::TEXT;

    -- 5. Calculate Authoritative Totals from Database Prices
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT id, name, base_price, is_available INTO v_db_item
        FROM public.menu_items
        WHERE id = (v_item->>'menu_item_id')::UUID AND organization_id = p_organization_id;

        IF v_db_item IS NULL THEN
            RAISE EXCEPTION 'Menu item % not found in organization', (v_item->>'menu_item_id');
        END IF;

        IF NOT v_db_item.is_available THEN
            RAISE EXCEPTION 'Item % is currently out of stock', v_db_item.name;
        END IF;

        v_unit_price := v_db_item.base_price;
        v_line_total := v_unit_price * (v_item->>'quantity')::INT;
        v_subtotal := v_subtotal + v_line_total;
    END LOOP;

    -- Apply Discount
    IF p_discount_percent > 0 THEN
        v_discount_amt := ROUND(v_subtotal * (p_discount_percent / 100.0), 4);
    END IF;

    -- Apply Tax (on post-discount subtotal)
    v_tax_amt := ROUND((v_subtotal - v_discount_amt) * v_branch_tax_rate, 4);
    v_total_amt := v_subtotal - v_discount_amt + v_tax_amt;

    -- 6. Insert Order
    INSERT INTO public.orders (
        organization_id,
        branch_id,
        table_id,
        order_number,
        order_type,
        status,
        guest_count,
        subtotal_amount,
        discount_amount,
        discount_percent,
        discount_reason,
        tax_amount,
        total_amount,
        cashier_user_id,
        notes,
        idempotency_key
    ) VALUES (
        p_organization_id,
        p_branch_id,
        p_table_id,
        v_order_number,
        p_order_type,
        'confirmed',
        COALESCE(p_guest_count, 1),
        v_subtotal,
        v_discount_amt,
        COALESCE(p_discount_percent, 0.00),
        p_discount_reason,
        v_tax_amt,
        v_total_amt,
        v_user_id,
        p_notes,
        p_idempotency_key
    )
    RETURNING id INTO v_order_id;

    -- 7. Insert Order Line Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT id, name, base_price INTO v_db_item
        FROM public.menu_items
        WHERE id = (v_item->>'menu_item_id')::UUID;

        v_unit_price := v_db_item.base_price;
        v_line_total := v_unit_price * (v_item->>'quantity')::INT;

        INSERT INTO public.order_items (
            organization_id,
            order_id,
            menu_item_id,
            item_name,
            unit_price,
            quantity,
            total_price,
            selected_modifiers,
            special_instructions,
            status
        ) VALUES (
            p_organization_id,
            v_order_id,
            v_db_item.id,
            v_db_item.name,
            v_unit_price,
            (v_item->>'quantity')::INT,
            v_line_total,
            COALESCE(v_item->'selected_modifiers', '[]'::jsonb),
            v_item->>'special_instructions',
            'sent_to_kitchen'
        );
    END LOOP;

    -- 8. Automatically Dispatch Kitchen Order Ticket (KOT)
    v_kot_number := 'KOT-' || substring(v_order_number from 2);
    INSERT INTO public.kot_tickets (
        organization_id,
        branch_id,
        order_id,
        kot_number,
        station,
        status,
        items_snapshot
    ) VALUES (
        p_organization_id,
        p_branch_id,
        v_order_id,
        v_kot_number,
        'main_kitchen',
        'queued',
        p_items
    )
    RETURNING id INTO v_kot_id;

    -- 9. Update Dining Table status to occupied if Dine-In
    IF p_table_id IS NOT NULL AND p_order_type = 'dine_in' THEN
        UPDATE public.dining_tables
        SET current_status = 'occupied', updated_at = NOW()
        WHERE id = p_table_id AND branch_id = p_branch_id;
    END IF;

    -- 10. Audit Log
    INSERT INTO public.audit_logs (
        organization_id,
        branch_id,
        actor_id,
        actor_role,
        action,
        entity_name,
        entity_id,
        metadata
    ) VALUES (
        p_organization_id,
        p_branch_id,
        v_user_id,
        'staff',
        'ORDER_CREATED',
        'orders',
        v_order_id,
        jsonb_build_object(
            'order_number', v_order_number,
            'total_amount', v_total_amt,
            'kot_number', v_kot_number
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_amount', v_total_amt,
        'kot_id', v_kot_id,
        'kot_number', v_kot_number,
        'is_idempotent_replay', FALSE
    );
END;
$$;
