-- ==============================================================================
-- Development & Test Seed Data: Two Independent Restaurant Organizations
-- ==============================================================================

-- Clean existing development data (safe for dev reset)
TRUNCATE TABLE public.audit_logs CASCADE;
TRUNCATE TABLE public.user_branch_assignments CASCADE;
TRUNCATE TABLE public.memberships CASCADE;
TRUNCATE TABLE public.branches CASCADE;
TRUNCATE TABLE public.organizations CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- ------------------------------------------------------------------------------
-- 1. Create Profiles for Test Users
-- ------------------------------------------------------------------------------
-- Fixed UUIDs for predictable testing and automated isolation suites
-- Org 1 (Harbor Café) Users:
-- Owner:   a1111111-1111-1111-1111-111111111111
-- Cashier: a2222222-2222-2222-2222-222222222222
-- Kitchen: a3333333-3333-3333-3333-333333333333

-- Org 2 (Marian Bistro) Users:
-- Owner:   b1111111-1111-1111-1111-111111111111
-- Cashier: b2222222-2222-2222-2222-222222222222

INSERT INTO public.profiles (id, email, full_name, phone, is_platform_admin) VALUES
('a1111111-1111-1111-1111-111111111111', 'sarah.owner@harborcafe.com', 'Sarah Jenkins', '+1 (555) 101-2001', FALSE),
('a2222222-2222-2222-2222-222222222222', 'marco.cashier@harborcafe.com', 'Marco Silva', '+1 (555) 101-2002', FALSE),
('a3333333-3333-3333-3333-333333333333', 'elena.kitchen@harborcafe.com', 'Elena Rostova', '+1 (555) 101-2003', FALSE),
('b1111111-1111-1111-1111-111111111111', 'marian.owner@marianbistro.com', 'Marian Vance', '+1 (555) 202-3001', FALSE),
('b2222222-2222-2222-2222-222222222222', 'david.cashier@marianbistro.com', 'David Lopez', '+1 (555) 202-3002', FALSE);

-- ------------------------------------------------------------------------------
-- 2. Organizations
-- ------------------------------------------------------------------------------
INSERT INTO public.organizations (id, name, slug, status, default_currency, currency_symbol, timezone, branding) VALUES
('11111111-1111-1111-1111-111111111111', 'Harbor Café', 'harbor-cafe', 'active', 'USD', '$', 'America/New_York', '{"brandColor": "#2563eb", "accentColor": "#f59e0b"}'::jsonb),
('22222222-2222-2222-2222-222222222222', 'Marian Bistro', 'marian-bistro', 'active', 'USD', '$', 'America/Chicago', '{"brandColor": "#059669", "accentColor": "#e11d48"}'::jsonb);

-- ------------------------------------------------------------------------------
-- 3. Branches
-- ------------------------------------------------------------------------------
-- Harbor Café Branches (2 locations)
INSERT INTO public.branches (id, organization_id, name, slug, code, address_line1, city, state, postal_code, country, tax_rate, status) VALUES
('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Main Branch', 'main-branch', 'MAIN-01', '104 Pier Ave', 'Harbor District', 'NY', '10001', 'US', 0.0825, 'active'),
('11111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Uptown Kiosk', 'uptown-kiosk', 'UP-02', '450 North Promenade', 'Harbor District', 'NY', '10002', 'US', 0.0825, 'active');

-- Marian Bistro Branches (1 location)
INSERT INTO public.branches (id, organization_id, name, slug, code, address_line1, city, state, postal_code, country, tax_rate, status) VALUES
('22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Downtown Bistro', 'downtown-bistro', 'MB-01', '800 Michigan Ave', 'Chicago', 'IL', '60611', 'US', 0.0950, 'active');

-- ------------------------------------------------------------------------------
-- 4. Memberships (Role Mapping)
-- ------------------------------------------------------------------------------
-- Harbor Café Memberships
INSERT INTO public.memberships (id, organization_id, user_id, role, status) VALUES
('m1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'owner', 'active'),
('m1111111-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'cashier', 'active'),
('m1111111-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'a3333333-3333-3333-3333-333333333333', 'kitchen', 'active');

-- Marian Bistro Memberships
INSERT INTO public.memberships (id, organization_id, user_id, role, status) VALUES
('m2222222-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'owner', 'active'),
('m2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'cashier', 'active');

-- ------------------------------------------------------------------------------
-- 5. Branch Assignments
-- ------------------------------------------------------------------------------
-- Harbor Owner has org-wide access; Cashier Marco assigned to Main Branch only
INSERT INTO public.user_branch_assignments (organization_id, membership_id, branch_id) VALUES
('11111111-1111-1111-1111-111111111111', 'm1111111-1111-1111-1111-111111111111', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('11111111-1111-1111-1111-111111111111', 'm1111111-1111-1111-1111-111111111111', '11111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
('11111111-1111-1111-1111-111111111111', 'm1111111-2222-2222-2222-222222222222', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('22222222-2222-2222-2222-222222222222', 'm2222222-1111-1111-1111-111111111111', '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('22222222-2222-2222-2222-222222222222', 'm2222222-2222-2222-2222-222222222222', '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- ------------------------------------------------------------------------------
-- 6. Initial Audit Events
-- ------------------------------------------------------------------------------
INSERT INTO public.audit_logs (organization_id, branch_id, actor_id, actor_role, action, entity_name, entity_id, metadata) VALUES
('11111111-1111-1111-1111-111111111111', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111', 'owner', 'SEED_INITIALIZED', 'organizations', '11111111-1111-1111-1111-111111111111', '{"environment": "development"}'::jsonb),
('22222222-2222-2222-2222-222222222222', '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b1111111-1111-1111-1111-111111111111', 'owner', 'SEED_INITIALIZED', 'organizations', '22222222-2222-2222-2222-222222222222', '{"environment": "development"}'::jsonb);
