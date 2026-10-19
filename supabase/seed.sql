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

-- Clean existing token columns in case previously inserted with NULL
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  recovery_token = COALESCE(recovery_token, '')
WHERE 
  confirmation_token IS NULL 
  OR email_change IS NULL 
  OR email_change_token_new IS NULL 
  OR recovery_token IS NULL;

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
    updated_at,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone_change,
    phone_change_token
) VALUES
('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sarah.owner@harborcafe.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Sarah Jenkins"}'::jsonb, now(), now(), '', '', '', '', '', '', ''),
('a2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marco.cashier@harborcafe.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Marco Silva"}'::jsonb, now(), now(), '', '', '', '', '', '', ''),
('a3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'elena.kitchen@harborcafe.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Elena Rostova"}'::jsonb, now(), now(), '', '', '', '', '', '', ''),
('b1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marian.owner@marianbistro.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Marian Vance"}'::jsonb, now(), now(), '', '', '', '', '', '', ''),
('b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'david.cashier@marianbistro.com', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"David Lopez"}'::jsonb, now(), now(), '', '', '', '', '', '', '')
ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    confirmation_token = '',
    recovery_token = '',
    email_change = '',
    email_change_token_new = '',
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
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'owner', 'active'),
('c1111111-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'cashier', 'active'),
('c1111111-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'a3333333-3333-3333-3333-333333333333', 'kitchen', 'active');

-- Marian Bistro Memberships
INSERT INTO public.memberships (id, organization_id, user_id, role, status) VALUES
('c2222222-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'owner', 'active'),
('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'cashier', 'active');

-- ------------------------------------------------------------------------------
-- 5. Branch Assignments
-- ------------------------------------------------------------------------------
-- Harbor Owner has org-wide access; Cashier Marco assigned to Main Branch only
INSERT INTO public.user_branch_assignments (organization_id, membership_id, branch_id) VALUES
('11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', '11111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
('11111111-1111-1111-1111-111111111111', 'c1111111-2222-2222-2222-222222222222', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('22222222-2222-2222-2222-222222222222', 'c2222222-1111-1111-1111-111111111111', '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- ------------------------------------------------------------------------------
-- 6. Initial Audit Events
-- ------------------------------------------------------------------------------
INSERT INTO public.audit_logs (organization_id, branch_id, actor_id, actor_role, action, entity_name, entity_id, metadata) VALUES
('11111111-1111-1111-1111-111111111111', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111', 'owner', 'SEED_INITIALIZED', 'organizations', '11111111-1111-1111-1111-111111111111', '{"environment": "development"}'::jsonb),
('22222222-2222-2222-2222-222222222222', '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b1111111-1111-1111-1111-111111111111', 'owner', 'SEED_INITIALIZED', 'organizations', '22222222-2222-2222-2222-222222222222', '{"environment": "development"}'::jsonb);

-- ------------------------------------------------------------------------------
-- 7. Phase 4: Menu Categories
-- ------------------------------------------------------------------------------
INSERT INTO public.menu_categories (id, organization_id, name, slug, icon, display_order, is_active) VALUES
('33333333-1111-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Hot Coffee', 'hot-coffee', 'Coffee', 1, TRUE),
('33333333-1111-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Cold Brew & Iced', 'cold-brew', 'CupSoda', 2, TRUE),
('33333333-1111-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Artisanal Tea', 'artisanal-tea', 'Leaf', 3, TRUE),
('33333333-1111-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Bakery & Pastries', 'bakery', 'Cake', 4, TRUE),
('33333333-1111-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Savory & Sandwiches', 'savory', 'Sandwich', 5, TRUE),
-- Marian Bistro categories
('33333333-2222-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Starters', 'starters', 'UtensilsCrossed', 1, TRUE),
('33333333-2222-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Mains', 'mains', 'Utensils', 2, TRUE)
ON CONFLICT (organization_id, slug) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 8. Phase 4: Menu Items
-- ------------------------------------------------------------------------------
INSERT INTO public.menu_items (id, organization_id, category_id, name, slug, sku, description, base_price, cost_price, tax_rate, is_available, display_order, kitchen_station) VALUES
('44444444-1111-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '33333333-1111-0000-0000-000000000001', 'Signature Double Espresso', 'double-espresso', 'HC-COF-001', 'Rich double extraction with hazelnut crema and chocolate finish', 3.7500, 0.4500, 0.0825, TRUE, 1, 'barista_station'),
('44444444-1111-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '33333333-1111-0000-0000-000000000001', 'Vanilla Oat Flat White', 'vanilla-oat-flat-white', 'HC-COF-002', 'Velvety microfoam over organic oat milk with Madagascar bourbon vanilla', 5.5000, 0.9500, 0.0825, TRUE, 2, 'barista_station'),
('44444444-1111-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '33333333-1111-0000-0000-000000000002', 'Nitro Cold Brew Citrus Tonic', 'nitro-cold-brew-citrus', 'HC-COF-003', '18-hour cold brew infused with nitrogen, yuzu splash and blood orange', 6.2500, 1.1000, 0.0825, TRUE, 3, 'barista_station'),
('44444444-1111-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '33333333-1111-0000-0000-000000000003', 'Ceremonial Matcha Cloud Latte', 'matcha-cloud-latte', 'HC-TEA-001', 'Stone-ground Uji matcha whisked with oat foam and blossom honey', 6.0000, 1.2500, 0.0825, TRUE, 4, 'barista_station'),
('44444444-1111-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '33333333-1111-0000-0000-000000000004', 'Handmade Almond Croissant', 'almond-croissant', 'HC-BAK-001', 'Flaky double-baked French pastry filled with frangipane almond cream', 4.5000, 0.8500, 0.0825, TRUE, 5, 'bakery_station'),
('44444444-1111-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '33333333-1111-0000-0000-000000000005', 'Truffle Mushroom Sourdough Melt', 'truffle-mushroom-melt', 'HC-SAV-001', 'Caramelized wild forest mushrooms, melted Gruyère and white truffle oil on sourdough', 11.5000, 3.2000, 0.0825, TRUE, 6, 'kitchen_grill'),
-- Marian Bistro Items
('44444444-2222-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '33333333-2222-0000-0000-000000000001', 'French Onion Soup', 'french-onion-soup', 'MB-STA-001', 'Slow-caramelized onions with beef broth and melted Gruyère crouton', 9.5000, 2.1000, 0.0950, TRUE, 1, 'main_kitchen'),
('44444444-2222-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '33333333-2222-0000-0000-000000000002', 'Steak Frites Béarnaise', 'steak-frites', 'MB-MAI-001', 'Prime hanger steak with duck fat fries and house tarragon béarnaise', 28.0000, 7.8000, 0.0950, TRUE, 2, 'main_kitchen')
ON CONFLICT (organization_id, sku) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 9. Phase 4: Modifier Groups & Modifiers
-- ------------------------------------------------------------------------------
INSERT INTO public.modifier_groups (id, organization_id, name, min_selection, max_selection, is_required, display_order) VALUES
('55555555-1111-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Milk Choice', 0, 1, FALSE, 1),
('55555555-1111-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Extra Shots & Syrups', 0, 3, FALSE, 2)
ON CONFLICT DO NOTHING;

INSERT INTO public.modifiers (id, organization_id, group_id, name, additional_price, cost_price, is_available) VALUES
('66666666-1111-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '55555555-1111-0000-0000-000000000001', 'Organic Oat Milk', 0.7500, 0.2000, TRUE),
('66666666-1111-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '55555555-1111-0000-0000-000000000001', 'Almond Milk', 0.7500, 0.2200, TRUE),
('66666666-1111-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '55555555-1111-0000-0000-000000000002', 'Extra Espresso Shot', 1.0000, 0.2500, TRUE),
('66666666-1111-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '55555555-1111-0000-0000-000000000002', 'Bourbon Vanilla Syrup', 0.5000, 0.1000, TRUE)
ON CONFLICT DO NOTHING;

-- Link coffee items to modifier groups
INSERT INTO public.menu_item_modifier_groups (organization_id, menu_item_id, modifier_group_id) VALUES
('11111111-1111-1111-1111-111111111111', '44444444-1111-0000-0000-000000000001', '55555555-1111-0000-0000-000000000002'),
('11111111-1111-1111-1111-111111111111', '44444444-1111-0000-0000-000000000002', '55555555-1111-0000-0000-000000000001'),
('11111111-1111-1111-1111-111111111111', '44444444-1111-0000-0000-000000000002', '55555555-1111-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 10. Phase 4: Dining Tables
-- ------------------------------------------------------------------------------
INSERT INTO public.dining_tables (id, organization_id, branch_id, table_number, section, capacity, current_status) VALUES
('77777777-1111-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'T-01', 'Window Bay', 2, 'vacant'),
('77777777-1111-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'T-02', 'Main Dining', 4, 'vacant'),
('77777777-1111-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'T-03', 'Main Dining', 4, 'vacant'),
('77777777-1111-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'T-04', 'Patio Terrace', 6, 'vacant'),
('77777777-1111-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', '11111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Bar-01', 'Espresso Bar', 2, 'vacant'),
-- Marian Bistro Tables
('77777777-2222-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'B-10', 'Bistro Hall', 4, 'vacant')
ON CONFLICT (branch_id, table_number) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 11. Phase 4: Sample Confirmed Order & KOT Ticket
-- ------------------------------------------------------------------------------
INSERT INTO public.orders (
    id, organization_id, branch_id, table_id, order_number, order_type,
    status, guest_count, subtotal_amount, discount_amount, tax_amount,
    total_amount, paid_amount, cashier_user_id, notes, idempotency_key
) VALUES (
    '88888888-1111-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '77777777-1111-0000-0000-000000000004',
    '#101',
    'dine_in',
    'in_prep',
    2,
    17.0000,
    0.0000,
    1.4025,
    18.4025,
    18.4025,
    'a2222222-2222-2222-2222-222222222222',
    'Table 04 - Window seat',
    'demo-seed-order-101'
) ON CONFLICT (organization_id, idempotency_key) DO NOTHING;

INSERT INTO public.order_items (
    organization_id, order_id, menu_item_id, item_name,
    unit_price, quantity, total_price, status
) VALUES
('11111111-1111-1111-1111-111111111111', '88888888-1111-0000-0000-000000000001', '44444444-1111-0000-0000-000000000002', 'Vanilla Oat Flat White', 5.5000, 1, 5.5000, 'preparing'),
('11111111-1111-1111-1111-111111111111', '88888888-1111-0000-0000-000000000001', '44444444-1111-0000-0000-000000000006', 'Truffle Mushroom Sourdough Melt', 11.5000, 1, 11.5000, 'preparing')
ON CONFLICT DO NOTHING;

INSERT INTO public.kot_tickets (
    id, organization_id, branch_id, order_id, kot_number, station, status, items_snapshot
) VALUES (
    '99999999-1111-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '88888888-1111-0000-0000-000000000001',
    'KOT-101',
    'main_kitchen',
    'in_progress',
    '[{"item_name": "Vanilla Oat Flat White", "quantity": 1}, {"item_name": "Truffle Mushroom Sourdough Melt", "quantity": 1}]'::jsonb
) ON CONFLICT DO NOTHING;

INSERT INTO public.payments (
    id, organization_id, branch_id, order_id, payment_method, amount, status, idempotency_key, settled_by
) VALUES (
    'aaaaaaaa-1111-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '88888888-1111-0000-0000-000000000001',
    'card',
    18.4025,
    'completed',
    'demo-seed-payment-101',
    'a2222222-2222-2222-2222-222222222222'
) ON CONFLICT (organization_id, idempotency_key) DO NOTHING;

