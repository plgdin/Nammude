-- ==============================================================================
-- PHASE 10: PARITY PACK (GST/INVOICING, UPI, THERMAL RECEIPTS, RESERVATIONS, OFFLINE)
-- Migration: 20261025000010_parity_pack.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Organization compliance / billing settings
-- ------------------------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS upi_vpa TEXT,
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS fssai_license TEXT,
  ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'INV',
  ADD COLUMN IF NOT EXISTS place_of_supply_state TEXT;

-- ------------------------------------------------------------------------------
-- 2. Reservations
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32),
    party_size INTEGER NOT NULL DEFAULT 2 CHECK (party_size > 0),
    reservation_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 90 CHECK (duration_minutes > 0),
    table_id UUID REFERENCES public.dining_tables(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','confirmed','seated','completed','cancelled','no_show')),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_branch_time ON public.reservations(branch_id, reservation_time);
CREATE INDEX IF NOT EXISTS idx_reservations_org_status ON public.reservations(organization_id, status, reservation_time);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations FORCE ROW LEVEL SECURITY;
CREATE POLICY reservations_select ON public.reservations FOR SELECT
    USING (public.is_org_member(organization_id));
CREATE POLICY reservations_write ON public.reservations FOR ALL
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));
CREATE POLICY reservations_staff_insert ON public.reservations FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));
