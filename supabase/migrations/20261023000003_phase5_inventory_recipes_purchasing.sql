-- ==============================================================================
-- PHASE 5: INVENTORY, RECIPES, STOCK MOVEMENTS, SUPPLIERS & PURCHASING
-- Migration: 20261023000003_phase5_inventory_recipes_purchasing.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Suppliers Catalog
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(32),
    email VARCHAR(255),
    tax_number VARCHAR(64),
    payment_terms_days INT NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_org ON public.suppliers(organization_id, is_active);

-- ------------------------------------------------------------------------------
-- 2. Ingredients / Raw Materials Master
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) GENERATED ALWAYS AS (lower(trim(name))) STORED,
    sku VARCHAR(64),
    category VARCHAR(64) NOT NULL DEFAULT 'General',
    base_unit VARCHAR(16) NOT NULL, -- 'g', 'ml', 'pcs'
    purchase_unit VARCHAR(16) NOT NULL DEFAULT 'kg', -- 'kg', 'L', 'box', 'pcs'
    purchase_unit_factor NUMERIC(12, 4) NOT NULL DEFAULT 1000.0000, -- e.g. 1 kg = 1000 g
    density_g_per_ml NUMERIC(8, 4) DEFAULT NULL, -- for liquid mass-volume conversion
    reorder_level NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    ideal_stock NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    current_cost_price NUMERIC(12, 4) NOT NULL DEFAULT 0.0000, -- Weighted Average Cost (WAC) per base unit
    preferred_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    is_perishable BOOLEAN NOT NULL DEFAULT FALSE,
    expiry_days INT DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingredients_org ON public.ingredients(organization_id, category, is_active);
CREATE INDEX IF NOT EXISTS idx_ingredients_sku ON public.ingredients(organization_id, sku);

-- ------------------------------------------------------------------------------
-- 3. Stock Locations (Per Branch)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- 'Main Walk-In Cooler', 'Dry Storage Bin', 'Bar Station'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_branch_location_name UNIQUE (branch_id, name)
);

CREATE INDEX IF NOT EXISTS idx_stock_locations_branch ON public.stock_locations(branch_id, is_active);

-- ------------------------------------------------------------------------------
-- 4. Branch Inventory Stock Balances (Cached Balance Table)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branch_inventory_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
    current_stock NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
    last_movement_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_branch_ingredient_location UNIQUE (branch_id, ingredient_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_inventory_lookup ON public.branch_inventory_stocks(branch_id, ingredient_id);

-- ------------------------------------------------------------------------------
-- 5. Recipes & Recipe Ingredients (BOM)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    yield_servings NUMERIC(8, 2) NOT NULL DEFAULT 1.00,
    preparation_instructions TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_recipe_menu_item_version UNIQUE (organization_id, menu_item_id, version)
);

CREATE INDEX IF NOT EXISTS idx_recipes_menu_item ON public.recipes(organization_id, menu_item_id, is_active);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 4) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(16) NOT NULL, -- 'g', 'ml', 'pcs'
    wastage_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON public.recipe_ingredients(ingredient_id);

-- ------------------------------------------------------------------------------
-- 6. Immutable Stock Movements Ledger
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
    movement_type VARCHAR(32) NOT NULL CHECK (movement_type IN (
        'purchase_receipt',
        'sale_consumption',
        'waste',
        'manual_adjustment',
        'transfer_in',
        'transfer_out',
        'return',
        'stock_count'
    )),
    quantity NUMERIC(14, 4) NOT NULL, -- Positive for increase, negative for deduction
    unit VARCHAR(16) NOT NULL, -- Always recorded in base_unit
    unit_cost NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    total_cost NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    resulting_stock NUMERIC(14, 4),
    reference_id UUID, -- References orders(id), goods_receipts(id), etc.
    reference_type VARCHAR(32), -- 'order', 'goods_receipt', 'manual_adjustment', 'wastage'
    recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL, -- Historical recipe snapshot linkage
    idempotency_key VARCHAR(64),
    reason TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_movement_idempotency UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_ledger ON public.stock_movements(organization_id, branch_id, ingredient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref ON public.stock_movements(reference_id, reference_type);

-- ------------------------------------------------------------------------------
-- 7. Purchase Orders (PO) & Items
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    po_number VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'partially_received', 'received', 'cancelled')),
    total_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    expected_delivery_date DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_po_branch_number UNIQUE (branch_id, po_number)
);

CREATE INDEX IF NOT EXISTS idx_po_branch_status ON public.purchase_orders(branch_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 4) NOT NULL CHECK (quantity > 0),
    purchase_unit VARCHAR(16) NOT NULL,
    conversion_factor NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
    unit_price NUMERIC(12, 4) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    received_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_items_po ON public.purchase_order_items(purchase_order_id);

-- ------------------------------------------------------------------------------
-- 8. Goods Receipts (GRN) & Items
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    location_id UUID REFERENCES public.stock_locations(id) ON DELETE SET NULL,
    grn_number VARCHAR(32) NOT NULL,
    invoice_number VARCHAR(64),
    invoice_date DATE,
    total_amount NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(32) NOT NULL DEFAULT 'verified' CHECK (status IN ('draft', 'verified', 'disputed')),
    notes TEXT,
    received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    idempotency_key VARCHAR(64),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_grn_branch_number UNIQUE (branch_id, grn_number),
    CONSTRAINT uq_grn_idempotency UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_grn_branch ON public.goods_receipts(branch_id, received_at DESC);

CREATE TABLE IF NOT EXISTS public.goods_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    goods_receipt_id UUID NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    received_quantity NUMERIC(12, 4) NOT NULL CHECK (received_quantity >= 0),
    rejected_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    purchase_unit VARCHAR(16) NOT NULL,
    conversion_factor NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
    normalized_quantity NUMERIC(14, 4) NOT NULL CHECK (normalized_quantity >= 0),
    unit_cost NUMERIC(12, 4) NOT NULL CHECK (unit_cost >= 0),
    total_cost NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    batch_number VARCHAR(64),
    expiry_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON public.goods_receipt_items(goods_receipt_id);

-- ==============================================================================
-- 9. ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Role & Permission Helper Functions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_org_role(target_org_id UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE
        WHEN required_role IN ('owner', 'manager') THEN public.is_org_owner_or_manager(target_org_id)
        ELSE public.is_org_member(target_org_id)
    END;
$$;

CREATE OR REPLACE FUNCTION public.has_branch_role(target_branch_id UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_branch_permission(target_branch_id);
$$;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_inventory_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_items ENABLE ROW LEVEL SECURITY;

-- 1. Suppliers RLS
CREATE POLICY "Suppliers: org members can read"
    ON public.suppliers FOR SELECT
    USING (public.has_org_role(organization_id, 'viewer'));

CREATE POLICY "Suppliers: manager/owner can manage"
    ON public.suppliers FOR ALL
    USING (public.has_org_role(organization_id, 'manager'))
    WITH CHECK (public.has_org_role(organization_id, 'manager'));

-- 2. Ingredients RLS
CREATE POLICY "Ingredients: org members can read"
    ON public.ingredients FOR SELECT
    USING (public.has_org_role(organization_id, 'viewer'));

CREATE POLICY "Ingredients: manager/owner can manage"
    ON public.ingredients FOR ALL
    USING (public.has_org_role(organization_id, 'manager'))
    WITH CHECK (public.has_org_role(organization_id, 'manager'));

-- 3. Stock Locations RLS
CREATE POLICY "Stock Locations: branch staff can read"
    ON public.stock_locations FOR SELECT
    USING (public.has_branch_role(branch_id, 'cashier'));

CREATE POLICY "Stock Locations: manager/owner can manage"
    ON public.stock_locations FOR ALL
    USING (public.has_branch_role(branch_id, 'manager'))
    WITH CHECK (public.has_branch_role(branch_id, 'manager'));

-- 4. Branch Inventory Stocks RLS
CREATE POLICY "Branch Stocks: branch staff can read"
    ON public.branch_inventory_stocks FOR SELECT
    USING (public.has_branch_role(branch_id, 'cashier'));

CREATE POLICY "Branch Stocks: manager/owner can manage"
    ON public.branch_inventory_stocks FOR ALL
    USING (public.has_branch_role(branch_id, 'manager'))
    WITH CHECK (public.has_branch_role(branch_id, 'manager'));

-- 5. Recipes RLS
CREATE POLICY "Recipes: org members can read"
    ON public.recipes FOR SELECT
    USING (public.has_org_role(organization_id, 'viewer'));

CREATE POLICY "Recipes: manager/owner can manage"
    ON public.recipes FOR ALL
    USING (public.has_org_role(organization_id, 'manager'))
    WITH CHECK (public.has_org_role(organization_id, 'manager'));

CREATE POLICY "Recipe Ingredients: org members can read"
    ON public.recipe_ingredients FOR SELECT
    USING (public.has_org_role(organization_id, 'viewer'));

CREATE POLICY "Recipe Ingredients: manager/owner can manage"
    ON public.recipe_ingredients FOR ALL
    USING (public.has_org_role(organization_id, 'manager'))
    WITH CHECK (public.has_org_role(organization_id, 'manager'));

-- 6. Stock Movements RLS (Immutable Ledger)
CREATE POLICY "Stock Movements: branch staff can read"
    ON public.stock_movements FOR SELECT
    USING (public.has_branch_role(branch_id, 'cashier'));

CREATE POLICY "Stock Movements: branch staff can insert"
    ON public.stock_movements FOR INSERT
    WITH CHECK (public.has_branch_role(branch_id, 'cashier'));

-- Note: No UPDATE or DELETE policy on stock_movements (immutable audit ledger)

-- 7. Purchase Orders RLS
CREATE POLICY "PO: branch staff can read"
    ON public.purchase_orders FOR SELECT
    USING (public.has_branch_role(branch_id, 'cashier'));

CREATE POLICY "PO: manager/owner can manage"
    ON public.purchase_orders FOR ALL
    USING (public.has_branch_role(branch_id, 'manager'))
    WITH CHECK (public.has_branch_role(branch_id, 'manager'));

CREATE POLICY "PO Items: branch staff can read"
    ON public.purchase_order_items FOR SELECT
    USING (public.has_org_role(organization_id, 'viewer'));

CREATE POLICY "PO Items: manager/owner can manage"
    ON public.purchase_order_items FOR ALL
    USING (public.has_org_role(organization_id, 'manager'))
    WITH CHECK (public.has_org_role(organization_id, 'manager'));

-- 8. Goods Receipts RLS
CREATE POLICY "GRN: branch staff can read"
    ON public.goods_receipts FOR SELECT
    USING (public.has_branch_role(branch_id, 'cashier'));

CREATE POLICY "GRN: manager/owner can manage"
    ON public.goods_receipts FOR ALL
    USING (public.has_branch_role(branch_id, 'manager'))
    WITH CHECK (public.has_branch_role(branch_id, 'manager'));

CREATE POLICY "GRN Items: branch staff can read"
    ON public.goods_receipt_items FOR SELECT
    USING (public.has_org_role(organization_id, 'viewer'));

CREATE POLICY "GRN Items: manager/owner can manage"
    ON public.goods_receipt_items FOR ALL
    USING (public.has_org_role(organization_id, 'manager'))
    WITH CHECK (public.has_org_role(organization_id, 'manager'));


-- ==============================================================================
-- 10. STORED PROCEDURES & BUSINESS ENGINES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- A. Internal Stock Movement & Balance Synchronization Procedure
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_stock_movement_internal(
    p_organization_id UUID,
    p_branch_id UUID,
    p_ingredient_id UUID,
    p_location_id UUID,
    p_movement_type VARCHAR(32),
    p_quantity NUMERIC(14, 4),
    p_unit VARCHAR(16),
    p_unit_cost NUMERIC(12, 4),
    p_reference_id UUID DEFAULT NULL,
    p_reference_type VARCHAR(32) DEFAULT NULL,
    p_recipe_id UUID DEFAULT NULL,
    p_idempotency_key VARCHAR(64) DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_actor_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_movement_id UUID;
    v_existing_movement_id UUID;
    v_new_stock NUMERIC(14, 4);
    v_total_cost NUMERIC(12, 4);
BEGIN
    -- 1. Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_movement_id
        FROM public.stock_movements
        WHERE organization_id = p_organization_id AND idempotency_key = p_idempotency_key;

        IF v_existing_movement_id IS NOT NULL THEN
            RETURN v_existing_movement_id;
        END IF;
    END IF;

    -- 2. Advisory lock per branch & ingredient to serialize concurrent stock updates
    PERFORM pg_advisory_xact_lock(hashtext('stock_' || p_branch_id::TEXT || '_' || p_ingredient_id::TEXT));

    -- 3. Upsert cached stock balance
    INSERT INTO public.branch_inventory_stocks (
        organization_id,
        branch_id,
        ingredient_id,
        location_id,
        current_stock,
        last_movement_at,
        updated_at
    )
    VALUES (
        p_organization_id,
        p_branch_id,
        p_ingredient_id,
        p_location_id,
        p_quantity,
        NOW(),
        NOW()
    )
    ON CONFLICT (branch_id, ingredient_id, location_id)
    DO UPDATE SET
        current_stock = public.branch_inventory_stocks.current_stock + EXCLUDED.current_stock,
        last_movement_at = NOW(),
        updated_at = NOW()
    RETURNING current_stock INTO v_new_stock;

    -- 4. Calculate total cost (absolute quantity * unit_cost)
    v_total_cost := ROUND(ABS(p_quantity) * COALESCE(p_unit_cost, 0.0000), 4);

    -- 5. Insert immutable movement ledger record
    INSERT INTO public.stock_movements (
        organization_id,
        branch_id,
        ingredient_id,
        location_id,
        movement_type,
        quantity,
        unit,
        unit_cost,
        total_cost,
        resulting_stock,
        reference_id,
        reference_type,
        recipe_id,
        idempotency_key,
        reason,
        created_by,
        created_at
    )
    VALUES (
        p_organization_id,
        p_branch_id,
        p_ingredient_id,
        p_location_id,
        p_movement_type,
        p_quantity,
        p_unit,
        COALESCE(p_unit_cost, 0.0000),
        v_total_cost,
        v_new_stock,
        p_reference_id,
        p_reference_type,
        p_recipe_id,
        p_idempotency_key,
        p_reason,
        p_actor_id,
        NOW()
    )
    RETURNING id INTO v_movement_id;

    RETURN v_movement_id;
END;
$$;


-- ------------------------------------------------------------------------------
-- B. Order Ingredient Stock Consumption Procedure (Triggered on Order Confirmation)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_order_stock(
    p_order_id UUID,
    p_idempotency_key VARCHAR(64) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_recipe RECORD;
    v_ing RECORD;
    v_default_loc UUID;
    v_required_qty NUMERIC(14, 4);
    v_consumed_count INT := 0;
    v_idem_key VARCHAR(64);
    v_user_id UUID;
BEGIN
    -- Advisory lock to guarantee atomic concurrency per order
    PERFORM pg_advisory_xact_lock(hashtext('order_stock_cons_' || p_order_id::TEXT));

    v_user_id := auth.uid();

    -- 1. Fetch Order Details
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    -- Verify permissions: User must have access to branch
    IF v_user_id IS NOT NULL AND NOT public.has_branch_role(v_order.branch_id, 'cashier') THEN
        RAISE EXCEPTION 'Access denied for branch %', v_order.branch_id;
    END IF;

    -- 2. Idempotency Check: Exit if already consumed for this order
    IF EXISTS (
        SELECT 1 FROM public.stock_movements
        WHERE reference_id = p_order_id
          AND movement_type = 'sale_consumption'
    ) THEN
        RETURN jsonb_build_object(
            'success', true,
            'status', 'already_consumed',
            'order_id', p_order_id,
            'message', 'Ingredients for this order were already consumed.'
        );
    END IF;

    -- 3. Resolve default stock location for branch
    SELECT id INTO v_default_loc
    FROM public.stock_locations
    WHERE branch_id = v_order.branch_id AND is_active = TRUE
    ORDER BY created_at ASC
    LIMIT 1;

    -- 4. Iterate over order items and find active recipes
    FOR v_item IN
        SELECT oi.id, oi.menu_item_id, oi.quantity, oi.item_name
        FROM public.order_items oi
        WHERE oi.order_id = p_order_id
    LOOP
        -- Fetch active recipe for menu item
        SELECT r.id, r.yield_servings INTO v_recipe
        FROM public.recipes r
        WHERE r.menu_item_id = v_item.menu_item_id
          AND r.organization_id = v_order.organization_id
          AND r.is_active = TRUE
        ORDER BY r.version DESC
        LIMIT 1;

        -- If recipe exists, consume ingredients
        IF v_recipe IS NOT NULL THEN
            FOR v_ing IN
                SELECT ri.ingredient_id, ri.quantity, ri.unit, ri.wastage_percentage,
                       i.base_unit, i.current_cost_price
                FROM public.recipe_ingredients ri
                JOIN public.ingredients i ON i.id = ri.ingredient_id
                WHERE ri.recipe_id = v_recipe.id
            LOOP
                -- Calculate required quantity: (item_quantity * (ri.quantity / yield)) * (1 + wastage / 100)
                v_required_qty := ROUND(
                    (v_item.quantity * (v_ing.quantity / COALESCE(v_recipe.yield_servings, 1.00))) *
                    (1.0 + (COALESCE(v_ing.wastage_percentage, 0.00) / 100.0)),
                    4
                );

                v_idem_key := COALESCE(p_idempotency_key, 'ord_cons_' || p_order_id::TEXT) || '_' || v_item.id::TEXT || '_' || v_ing.ingredient_id::TEXT;

                -- Record stock deduction (negative quantity) linking exact recipe version
                PERFORM public.record_stock_movement_internal(
                    p_organization_id => v_order.organization_id,
                    p_branch_id       => v_order.branch_id,
                    p_ingredient_id   => v_ing.ingredient_id,
                    p_location_id     => v_default_loc,
                    p_movement_type   => 'sale_consumption',
                    p_quantity        => -v_required_qty,
                    p_unit            => v_ing.base_unit,
                    p_unit_cost       => v_ing.current_cost_price,
                    p_reference_id    => p_order_id,
                    p_reference_type  => 'order',
                    p_recipe_id       => v_recipe.id,
                    p_idempotency_key => v_idem_key,
                    p_reason          => 'POS Sale: Order ' || v_order.order_number || ' (' || v_item.item_name || ' x' || v_item.quantity::TEXT || ')',
                    p_actor_id        => v_user_id
                );

                v_consumed_count := v_consumed_count + 1;
            END LOOP;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'consumed',
        'order_id', p_order_id,
        'consumed_ingredients_count', v_consumed_count
    );
END;
$$;


-- ------------------------------------------------------------------------------
-- C. Reverse Stock Consumption (On Order Cancellation / Void)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reverse_order_stock_consumption(
    p_order_id UUID,
    p_reason TEXT DEFAULT 'Order cancelled / refunded'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_mov RECORD;
    v_reversed_count INT := 0;
    v_user_id UUID;
    v_reversal_key VARCHAR(64);
BEGIN
    -- Advisory lock to serialize order reversal
    PERFORM pg_advisory_xact_lock(hashtext('order_stock_rev_' || p_order_id::TEXT));

    v_user_id := auth.uid();

    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    IF v_user_id IS NOT NULL AND NOT public.has_branch_role(v_order.branch_id, 'manager') THEN
        RAISE EXCEPTION 'Access denied. Manager role required to reverse order stock.';
    END IF;

    -- Check if there are consumption records to reverse
    FOR v_mov IN
        SELECT * FROM public.stock_movements
        WHERE reference_id = p_order_id
          AND movement_type = 'sale_consumption'
    LOOP
        v_reversal_key := 'rev_' || v_mov.id::TEXT;

        -- Reverse by adding positive quantity back
        PERFORM public.record_stock_movement_internal(
            p_organization_id => v_mov.organization_id,
            p_branch_id       => v_mov.branch_id,
            p_ingredient_id   => v_mov.ingredient_id,
            p_location_id     => v_mov.location_id,
            p_movement_type   => 'return',
            p_quantity        => ABS(v_mov.quantity), -- positive return
            p_unit            => v_mov.unit,
            p_unit_cost       => v_mov.unit_cost,
            p_reference_id    => p_order_id,
            p_reference_type  => 'order_reversal',
            p_idempotency_key => v_reversal_key,
            p_reason          => 'Reversal: ' || COALESCE(p_reason, 'Order cancelled'),
            p_actor_id        => v_user_id
        );

        v_reversed_count := v_reversed_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'reversed_movements_count', v_reversed_count
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- D. Atomic Goods Receipt (GRN) Processing & WAC Recalculation
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_goods_receipt(
    p_organization_id UUID,
    p_branch_id UUID,
    p_supplier_id UUID,
    p_purchase_order_id UUID,
    p_location_id UUID,
    p_grn_number VARCHAR(32),
    p_invoice_number VARCHAR(64),
    p_invoice_date DATE,
    p_items JSONB, -- Array of { ingredient_id, received_quantity, purchase_unit, conversion_factor, unit_cost, batch_number, expiry_date }
    p_idempotency_key VARCHAR(64) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_grn_id UUID;
    v_item JSONB;
    v_ing RECORD;
    v_ing_id UUID;
    v_rcv_qty NUMERIC(12, 4);
    v_conv_factor NUMERIC(12, 4);
    v_norm_qty NUMERIC(14, 4);
    v_unit_cost NUMERIC(12, 4);
    v_line_total NUMERIC(12, 4);
    v_grn_total NUMERIC(12, 4) := 0.0000;
    v_existing_stock NUMERIC(14, 4);
    v_new_wac NUMERIC(12, 4);
    v_item_idem_key VARCHAR(64);
BEGIN
    v_user_id := auth.uid();

    -- 1. Authorization
    IF v_user_id IS NOT NULL AND NOT public.has_branch_role(p_branch_id, 'manager') THEN
        RAISE EXCEPTION 'Access denied. Manager role required to process Goods Receipt Notes.';
    END IF;

    -- 2. Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_grn_id
        FROM public.goods_receipts
        WHERE organization_id = p_organization_id AND idempotency_key = p_idempotency_key;

        IF v_grn_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'status', 'already_processed',
                'grn_id', v_grn_id,
                'grn_number', p_grn_number
            );
        END IF;
    END IF;

    -- 3. Create Goods Receipt Header
    INSERT INTO public.goods_receipts (
        organization_id,
        branch_id,
        purchase_order_id,
        supplier_id,
        location_id,
        grn_number,
        invoice_number,
        invoice_date,
        total_amount,
        status,
        notes,
        received_by,
        idempotency_key,
        received_at
    )
    VALUES (
        p_organization_id,
        p_branch_id,
        p_purchase_order_id,
        p_supplier_id,
        p_location_id,
        p_grn_number,
        p_invoice_number,
        p_invoice_date,
        0.0000,
        'verified',
        p_notes,
        v_user_id,
        p_idempotency_key,
        NOW()
    )
    RETURNING id INTO v_grn_id;

    -- 4. Process Each Line Item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_ing_id := (v_item->>'ingredient_id')::UUID;
        v_rcv_qty := (v_item->>'received_quantity')::NUMERIC;
        v_conv_factor := COALESCE((v_item->>'conversion_factor')::NUMERIC, 1.0000);
        v_norm_qty := ROUND(v_rcv_qty * v_conv_factor, 4);
        v_unit_cost := (v_item->>'unit_cost')::NUMERIC;
        v_line_total := ROUND(v_rcv_qty * v_unit_cost, 4);
        v_grn_total := v_grn_total + v_line_total;

        -- Verify ingredient
        SELECT * INTO v_ing FROM public.ingredients WHERE id = v_ing_id AND organization_id = p_organization_id;
        IF v_ing IS NULL THEN
            RAISE EXCEPTION 'Ingredient % not found in organization', v_ing_id;
        END IF;

        -- Insert GRN line item
        INSERT INTO public.goods_receipt_items (
            organization_id,
            goods_receipt_id,
            ingredient_id,
            received_quantity,
            rejected_quantity,
            purchase_unit,
            conversion_factor,
            normalized_quantity,
            unit_cost,
            total_cost,
            batch_number,
            expiry_date
        )
        VALUES (
            p_organization_id,
            v_grn_id,
            v_ing_id,
            v_rcv_qty,
            COALESCE((v_item->>'rejected_quantity')::NUMERIC, 0.0000),
            COALESCE(v_item->>'purchase_unit', v_ing.purchase_unit),
            v_conv_factor,
            v_norm_qty,
            v_unit_cost,
            v_line_total,
            v_item->>'batch_number',
            (v_item->>'expiry_date')::DATE
        );

        -- Calculate Weighted Average Cost (WAC) per base unit
        -- Base unit cost = v_line_total / v_norm_qty
        SELECT COALESCE(SUM(current_stock), 0.0000) INTO v_existing_stock
        FROM public.branch_inventory_stocks
        WHERE branch_id = p_branch_id AND ingredient_id = v_ing_id;

        IF v_existing_stock <= 0 THEN
            v_new_wac := ROUND(v_line_total / NULLIF(v_norm_qty, 0), 4);
        ELSE
            v_new_wac := ROUND(
                ((v_existing_stock * v_ing.current_cost_price) + v_line_total) /
                (v_existing_stock + v_norm_qty),
                4
            );
        END IF;

        -- Update ingredient's current cost price with new WAC
        UPDATE public.ingredients
        SET current_cost_price = COALESCE(v_new_wac, current_cost_price),
            updated_at = NOW()
        WHERE id = v_ing_id;

        -- Record stock movement (positive)
        v_item_idem_key := COALESCE(p_idempotency_key, 'grn_' || v_grn_id::TEXT) || '_' || v_ing_id::TEXT;

        PERFORM public.record_stock_movement_internal(
            p_organization_id => p_organization_id,
            p_branch_id       => p_branch_id,
            p_ingredient_id   => v_ing_id,
            p_location_id     => p_location_id,
            p_movement_type   => 'purchase_receipt',
            p_quantity        => v_norm_qty,
            p_unit            => v_ing.base_unit,
            p_unit_cost       => ROUND(v_line_total / NULLIF(v_norm_qty, 0), 4),
            p_reference_id    => v_grn_id,
            p_reference_type  => 'goods_receipt',
            p_idempotency_key => v_item_idem_key,
            p_reason          => 'GRN ' || p_grn_number || ' (Inv #' || COALESCE(p_invoice_number, 'N/A') || ')',
            p_actor_id        => v_user_id
        );

        -- If PO was provided, update PO item received quantity
        IF p_purchase_order_id IS NOT NULL THEN
            UPDATE public.purchase_order_items
            SET received_quantity = received_quantity + v_rcv_qty
            WHERE purchase_order_id = p_purchase_order_id AND ingredient_id = v_ing_id;
        END IF;
    END LOOP;

    -- Update GRN total
    UPDATE public.goods_receipts
    SET total_amount = v_grn_total
    WHERE id = v_grn_id;

    -- Update PO status if linked
    IF p_purchase_order_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.purchase_order_items
            WHERE purchase_order_id = p_purchase_order_id AND received_quantity < quantity
        ) THEN
            UPDATE public.purchase_orders SET status = 'received', updated_at = NOW() WHERE id = p_purchase_order_id;
        ELSE
            UPDATE public.purchase_orders SET status = 'partially_received', updated_at = NOW() WHERE id = p_purchase_order_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'grn_id', v_grn_id,
        'grn_number', p_grn_number,
        'total_amount', v_grn_total
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- E. Manual Stock Adjustment & Wastage Recording Procedure
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_stock_adjustment(
    p_organization_id UUID,
    p_branch_id UUID,
    p_ingredient_id UUID,
    p_location_id UUID,
    p_movement_type VARCHAR(32), -- 'manual_adjustment', 'waste', 'stock_count'
    p_quantity_delta NUMERIC(14, 4), -- Delta to apply (or difference)
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
    v_ing RECORD;
    v_movement_id UUID;
    v_new_stock NUMERIC(14, 4);
BEGIN
    v_user_id := auth.uid();

    -- Authorization: Manager role required for manual adjustments & wastage
    IF v_user_id IS NOT NULL AND NOT public.has_branch_role(p_branch_id, 'manager') THEN
        RAISE EXCEPTION 'Access denied. Manager role required for stock adjustments.';
    END IF;

    -- Verify ingredient
    SELECT * INTO v_ing FROM public.ingredients WHERE id = p_ingredient_id AND organization_id = p_organization_id;
    IF v_ing IS NULL THEN
        RAISE EXCEPTION 'Ingredient % not found in organization', p_ingredient_id;
    END IF;

    -- Record movement
    v_movement_id := public.record_stock_movement_internal(
        p_organization_id => p_organization_id,
        p_branch_id       => p_branch_id,
        p_ingredient_id   => p_ingredient_id,
        p_location_id     => p_location_id,
        p_movement_type   => p_movement_type,
        p_quantity        => p_quantity_delta,
        p_unit            => v_ing.base_unit,
        p_unit_cost       => v_ing.current_cost_price,
        p_reference_id    => NULL,
        p_reference_type  => 'manual_adjustment',
        p_idempotency_key => p_idempotency_key,
        p_reason          => p_reason,
        p_actor_id        => v_user_id
    );

    SELECT current_stock INTO v_new_stock
    FROM public.branch_inventory_stocks
    WHERE branch_id = p_branch_id AND ingredient_id = p_ingredient_id AND (location_id = p_location_id OR (location_id IS NULL AND p_location_id IS NULL));

    RETURN jsonb_build_object(
        'success', true,
        'movement_id', v_movement_id,
        'ingredient_id', p_ingredient_id,
        'delta', p_quantity_delta,
        'new_stock', v_new_stock
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- F. Automatic Order Stock Consumption Trigger (POS Lifecycle Integration)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_order_stock_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Prohibit resurrecting or re-opening a cancelled order (clean immutable lifecycle)
    IF TG_OP = 'UPDATE' AND OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
        RAISE EXCEPTION 'Invalid state transition: Cancelled order % cannot be reopened. Create a new order.', NEW.id;
    END IF;

    -- On Order Confirmation: Deduct ingredient stock according to active recipes
    IF NEW.status = 'confirmed' AND (TG_OP = 'INSERT' OR OLD.status != 'confirmed') THEN
        PERFORM public.consume_order_stock(NEW.id, NEW.idempotency_key);
    -- On Order Cancellation: Reverse consumption without deleting history
    ELSIF NEW.status = 'cancelled' AND (TG_OP = 'UPDATE' AND OLD.status != 'cancelled') THEN
        PERFORM public.reverse_order_stock_consumption(NEW.id, 'Order cancelled');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_stock_lifecycle_hook ON public.orders;
CREATE TRIGGER trg_order_stock_lifecycle_hook
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_order_stock_lifecycle();

-- ------------------------------------------------------------------------------
-- G. Protect Confirmed Order Items From Post-Consumption Alterations
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_protect_confirmed_order_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order_status VARCHAR(32);
BEGIN
    SELECT status INTO v_order_status
    FROM public.orders
    WHERE id = COALESCE(OLD.order_id, NEW.order_id);

    IF v_order_status IN ('confirmed', 'in_prep', 'ready', 'served', 'completed') THEN
        RAISE EXCEPTION 'Cannot edit or delete line items of an active or completed order (Order status: %). Cancel or void order first.', v_order_status;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_order_items_lock ON public.order_items;
CREATE TRIGGER trg_protect_order_items_lock
BEFORE UPDATE OR DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.trg_protect_confirmed_order_items();

-- ------------------------------------------------------------------------------
-- H. Branch Inventory Reconciliation RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reconcile_branch_stock(
    p_branch_id UUID,
    p_ingredient_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_cached_stock NUMERIC(14, 4);
    v_ledger_stock NUMERIC(14, 4);
    v_variance NUMERIC(14, 4);
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL AND NOT public.has_branch_role(p_branch_id, 'manager') THEN
        RAISE EXCEPTION 'Access denied. Manager role required for stock reconciliation.';
    END IF;

    -- Calculate cached balance sum
    SELECT COALESCE(SUM(current_stock), 0.0000) INTO v_cached_stock
    FROM public.branch_inventory_stocks
    WHERE branch_id = p_branch_id AND ingredient_id = p_ingredient_id;

    -- Calculate perpetual movement ledger sum
    SELECT COALESCE(SUM(quantity), 0.0000) INTO v_ledger_stock
    FROM public.stock_movements
    WHERE branch_id = p_branch_id AND ingredient_id = p_ingredient_id;

    v_variance := ROUND(v_cached_stock - v_ledger_stock, 4);

    RETURN jsonb_build_object(
        'branch_id', p_branch_id,
        'ingredient_id', p_ingredient_id,
        'cached_stock', v_cached_stock,
        'ledger_stock', v_ledger_stock,
        'variance', v_variance,
        'is_reconciled', (v_variance = 0.0000)
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- I. Execution Grants
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.consume_order_stock TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.reverse_order_stock_consumption TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_goods_receipt TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_stock_adjustment TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_branch_stock TO authenticated;


