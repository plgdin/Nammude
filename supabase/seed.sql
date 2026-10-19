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
-- 1. Create Test Users in auth.users & auth.identities
-- ------------------------------------------------------------------------------
-- Required for public.profiles(id) and public.memberships(user_id) foreign key references
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES
('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sarah.owner@harborcafe.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Sarah Jenkins"}'::jsonb, now(), now()),
('a2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marco.cashier@harborcafe.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Marco Silva"}'::jsonb, now(), now()),
('a3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'elena.kitchen@harborcafe.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Elena Rostova"}'::jsonb, now(), now()),
('b1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marian.owner@marianbistro.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Marian Vance"}'::jsonb, now(), now()),
('b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'david.cashier@marianbistro.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"David Lopez"}'::jsonb, now(), now())
ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id'
    ) THEN
        INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
        VALUES
        ('a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', format('{"sub":"%s","email":"%s"}', 'a1111111-1111-1111-1111-111111111111', 'sarah.owner@harborcafe.com')::jsonb, 'email', 'sarah.owner@harborcafe.com', now(), now(), now()),
        ('a2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', format('{"sub":"%s","email":"%s"}', 'a2222222-2222-2222-2222-222222222222', 'marco.cashier@harborcafe.com')::jsonb, 'email', 'marco.cashier@harborcafe.com', now(), now(), now()),
        ('a3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', format('{"sub":"%s","email":"%s"}', 'a3333333-3333-3333-3333-333333333333', 'elena.kitchen@harborcafe.com')::jsonb, 'email', 'elena.kitchen@harborcafe.com', now(), now(), now()),
        ('b1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', format('{"sub":"%s","email":"%s"}', 'b1111111-1111-1111-1111-111111111111', 'marian.owner@marianbistro.com')::jsonb, 'email', 'marian.owner@marianbistro.com', now(), now(), now()),
        ('b2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', format('{"sub":"%s","email":"%s"}', 'b2222222-2222-2222-2222-222222222222', 'david.cashier@marianbistro.com')::jsonb, 'email', 'david.cashier@marianbistro.com', now(), now(), now())
        ON CONFLICT DO NOTHING;
    ELSE
        INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        VALUES
        ('a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', format('{"sub":"%s","email":"%s"}', 'a1111111-1111-1111-1111-111111111111', 'sarah.owner@harborcafe.com')::jsonb, 'email', now(), now(), now()),
        ('a2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', format('{"sub":"%s","email":"%s"}', 'a2222222-2222-2222-2222-222222222222', 'marco.cashier@harborcafe.com')::jsonb, 'email', now(), now(), now()),
        ('a3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', format('{"sub":"%s","email":"%s"}', 'a3333333-3333-3333-3333-333333333333', 'elena.kitchen@harborcafe.com')::jsonb, 'email', now(), now(), now()),
        ('b1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', format('{"sub":"%s","email":"%s"}', 'b1111111-1111-1111-1111-111111111111', 'marian.owner@marianbistro.com')::jsonb, 'email', now(), now(), now()),
        ('b2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', format('{"sub":"%s","email":"%s"}', 'b2222222-2222-2222-2222-222222222222', 'david.cashier@marianbistro.com')::jsonb, 'email', now(), now(), now())
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Create Profiles for Test Users
-- ------------------------------------------------------------------------------
INSERT INTO public.profiles (id, email, full_name, phone, is_platform_admin) VALUES
('a1111111-1111-1111-1111-111111111111', 'sarah.owner@harborcafe.com', 'Sarah Jenkins', '+1 (555) 101-2001', FALSE),
('a2222222-2222-2222-2222-222222222222', 'marco.cashier@harborcafe.com', 'Marco Silva', '+1 (555) 101-2002', FALSE),
('a3333333-3333-3333-3333-333333333333', 'elena.kitchen@harborcafe.com', 'Elena Rostova', '+1 (555) 101-2003', FALSE),
('b1111111-1111-1111-1111-111111111111', 'marian.owner@marianbistro.com', 'Marian Vance', '+1 (555) 202-3001', FALSE),
('b2222222-2222-2222-2222-222222222222', 'david.cashier@marianbistro.com', 'David Lopez', '+1 (555) 202-3002', FALSE)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;

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
