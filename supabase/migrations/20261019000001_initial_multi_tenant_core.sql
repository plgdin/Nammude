-- ==============================================================================
-- Migration: 20261019000001_initial_multi_tenant_core.sql
-- Description: Core Multi-Tenant SaaS Schema (Organizations, Branches, Profiles,
--              Memberships, Branch Access, Audit Logs, RLS Policies & Onboarding)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Organizations (Tenants)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(63) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trialing', 'closed')),
    default_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    currency_symbol VARCHAR(8) NOT NULL DEFAULT '$',
    currency_decimals SMALLINT NOT NULL DEFAULT 2,
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    branding JSONB NOT NULL DEFAULT '{"brandColor": "#2563eb", "accentColor": "#f59e0b"}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INT NOT NULL DEFAULT 1,
    CONSTRAINT chk_org_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);

-- ------------------------------------------------------------------------------
-- 2. Branches
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(63) NOT NULL,
    code VARCHAR(32) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(32),
    country VARCHAR(2) NOT NULL DEFAULT 'US',
    phone VARCHAR(32),
    email VARCHAR(255),
    tax_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.0825,
    service_charge_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'temporarily_closed', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_branch_slug_per_org UNIQUE (organization_id, slug),
    CONSTRAINT uq_branch_code_per_org UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_branches_organization ON public.branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_branches_status ON public.branches(organization_id, status);

-- ------------------------------------------------------------------------------
-- 3. User Profiles (Extends auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(32),
    is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ------------------------------------------------------------------------------
-- 4. Organization Memberships
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL CHECK (role IN ('platform_admin', 'owner', 'general_manager', 'branch_manager', 'cashier', 'kitchen', 'inventory', 'auditor')),
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended', 'revoked')),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_membership_user_org UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON public.memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_user ON public.memberships(organization_id, user_id, status);

-- ------------------------------------------------------------------------------
-- 5. User Branch Assignments (Branch Scoped Access)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_branch_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_branch_assignment UNIQUE (membership_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_assignments_membership ON public.user_branch_assignments(membership_id);
CREATE INDEX IF NOT EXISTS idx_branch_assignments_branch ON public.user_branch_assignments(branch_id);

-- ------------------------------------------------------------------------------
-- 6. Tamper-Evident Security Audit Logs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role VARCHAR(32),
    action VARCHAR(64) NOT NULL,
    entity_name VARCHAR(64) NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON public.audit_logs(organization_id, created_at DESC);

-- ==============================================================================
-- AUTHORIZATION HELPER FUNCTIONS (Strict SECURITY DEFINER, Explicit search_path)
-- ==============================================================================

-- Check if current authenticated user is a platform administrator
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_platform_admin = TRUE
    );
$$;

-- Check if current authenticated user is an active member of organization
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.memberships m
        JOIN public.organizations o ON o.id = m.organization_id
        WHERE m.user_id = auth.uid()
          AND m.organization_id = target_org_id
          AND m.status = 'active'
          AND o.status = 'active'
    ) OR public.is_platform_admin();
$$;

-- Check if user is an owner or manager in the organization
CREATE OR REPLACE FUNCTION public.is_org_owner_or_manager(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.memberships m
        WHERE m.user_id = auth.uid()
          AND m.organization_id = target_org_id
          AND m.role IN ('owner', 'general_manager')
          AND m.status = 'active'
    ) OR public.is_platform_admin();
$$;

-- Check if user has permission to access a specific branch
CREATE OR REPLACE FUNCTION public.has_branch_permission(target_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.branches b
        JOIN public.memberships m ON m.organization_id = b.organization_id
        LEFT JOIN public.user_branch_assignments uba ON uba.membership_id = m.id AND uba.branch_id = b.id
        WHERE b.id = target_branch_id
          AND m.user_id = auth.uid()
          AND m.status = 'active'
          AND (m.role IN ('owner', 'general_manager') OR uba.branch_id IS NOT NULL)
    ) OR public.is_platform_admin();
$$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 1. Organizations RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;

CREATE POLICY org_select_policy ON public.organizations
    FOR SELECT
    USING (public.is_org_member(id));

CREATE POLICY org_insert_policy ON public.organizations
    FOR INSERT
    WITH CHECK (public.is_platform_admin());

CREATE POLICY org_update_policy ON public.organizations
    FOR UPDATE
    USING (public.is_org_owner_or_manager(id))
    WITH CHECK (public.is_org_owner_or_manager(id));

CREATE POLICY org_delete_policy ON public.organizations
    FOR DELETE
    USING (FALSE);

-- 2. Branches RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches FORCE ROW LEVEL SECURITY;

CREATE POLICY branch_select_policy ON public.branches
    FOR SELECT
    USING (public.has_branch_permission(id));

CREATE POLICY branch_insert_policy ON public.branches
    FOR INSERT
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

CREATE POLICY branch_update_policy ON public.branches
    FOR UPDATE
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

CREATE POLICY branch_delete_policy ON public.branches
    FOR DELETE
    USING (FALSE);

-- 3. Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY profile_select_policy ON public.profiles
    FOR SELECT
    USING (
        id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.memberships m1
            JOIN public.memberships m2 ON m1.organization_id = m2.organization_id
            WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id
        )
        OR public.is_platform_admin()
    );

CREATE POLICY profile_insert_policy ON public.profiles
    FOR INSERT
    WITH CHECK (id = auth.uid() OR public.is_platform_admin());

CREATE POLICY profile_update_policy ON public.profiles
    FOR UPDATE
    USING (id = auth.uid() OR public.is_platform_admin())
    WITH CHECK (id = auth.uid() OR public.is_platform_admin());

CREATE POLICY profile_delete_policy ON public.profiles
    FOR DELETE
    USING (public.is_platform_admin());

-- 4. Memberships RLS
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships FORCE ROW LEVEL SECURITY;

CREATE POLICY membership_select_policy ON public.memberships
    FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY membership_insert_policy ON public.memberships
    FOR INSERT
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

CREATE POLICY membership_update_policy ON public.memberships
    FOR UPDATE
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

CREATE POLICY membership_delete_policy ON public.memberships
    FOR DELETE
    USING (public.is_org_owner_or_manager(organization_id));

-- 5. User Branch Assignments RLS
ALTER TABLE public.user_branch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branch_assignments FORCE ROW LEVEL SECURITY;

CREATE POLICY branch_assignment_select_policy ON public.user_branch_assignments
    FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY branch_assignment_insert_policy ON public.user_branch_assignments
    FOR INSERT
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

CREATE POLICY branch_assignment_update_policy ON public.user_branch_assignments
    FOR UPDATE
    USING (public.is_org_owner_or_manager(organization_id))
    WITH CHECK (public.is_org_owner_or_manager(organization_id));

CREATE POLICY branch_assignment_delete_policy ON public.user_branch_assignments
    FOR DELETE
    USING (public.is_org_owner_or_manager(organization_id));

-- 6. Audit Logs RLS (Immutable)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_select_policy ON public.audit_logs
    FOR SELECT
    USING (public.is_org_owner_or_manager(organization_id));

CREATE POLICY audit_logs_insert_policy ON public.audit_logs
    FOR INSERT
    WITH CHECK (organization_id = organization_id);

CREATE POLICY audit_logs_update_policy ON public.audit_logs
    FOR UPDATE
    USING (FALSE);

CREATE POLICY audit_logs_delete_policy ON public.audit_logs
    FOR DELETE
    USING (FALSE);

-- ==============================================================================
-- ATOMIC ONBOARDING PROCEDURE (SECURITY DEFINER with strict search_path)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
    p_org_name VARCHAR(255),
    p_org_slug VARCHAR(63),
    p_default_currency VARCHAR(3),
    p_timezone VARCHAR(64),
    p_branch_name VARCHAR(255),
    p_branch_slug VARCHAR(63),
    p_branch_code VARCHAR(32),
    p_branch_address VARCHAR(255),
    p_branch_city VARCHAR(100),
    p_branch_country VARCHAR(2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_branch_id UUID;
    v_membership_id UUID;
    v_normalized_slug VARCHAR(63);
BEGIN
    -- Authenticate caller
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to onboard organization' USING ERRCODE = '42501';
    END IF;

    -- Normalize slug (lowercase, trim)
    v_normalized_slug := lower(trim(p_org_slug));

    -- Validate slug format
    IF v_normalized_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
        RAISE EXCEPTION 'Invalid slug format. Use lowercase alphanumeric and hyphens.' USING ERRCODE = '22000';
    END IF;

    -- Check reserved slugs
    IF v_normalized_slug IN ('app', 'admin', 'api', 'auth', 'billing', 'status', 'www', 'platform', 'mail') THEN
        RAISE EXCEPTION 'Slug % is reserved and cannot be used.', v_normalized_slug USING ERRCODE = '23505';
    END IF;

    -- Check slug uniqueness
    IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = v_normalized_slug) THEN
        RAISE EXCEPTION 'Organization slug % is already registered.', v_normalized_slug USING ERRCODE = '23505';
    END IF;

    -- 1. Insert Organization
    INSERT INTO public.organizations (
        name,
        slug,
        default_currency,
        timezone,
        status
    ) VALUES (
        trim(p_org_name),
        v_normalized_slug,
        COALESCE(p_default_currency, 'USD'),
        COALESCE(p_timezone, 'UTC'),
        'active'
    )
    RETURNING id INTO v_org_id;

    -- 2. Insert Initial Primary Branch
    INSERT INTO public.branches (
        organization_id,
        name,
        slug,
        code,
        address_line1,
        city,
        country,
        status
    ) VALUES (
        v_org_id,
        trim(p_branch_name),
        lower(trim(p_branch_slug)),
        upper(trim(p_branch_code)),
        trim(p_branch_address),
        trim(p_branch_city),
        COALESCE(p_branch_country, 'US'),
        'active'
    )
    RETURNING id INTO v_branch_id;

    -- 3. Create Owner Membership for Calling User
    INSERT INTO public.memberships (
        organization_id,
        user_id,
        role,
        status
    ) VALUES (
        v_org_id,
        v_user_id,
        'owner',
        'active'
    )
    RETURNING id INTO v_membership_id;

    -- 4. Assign Owner to Primary Branch
    INSERT INTO public.user_branch_assignments (
        organization_id,
        membership_id,
        branch_id
    ) VALUES (
        v_org_id,
        v_membership_id,
        v_branch_id
    );

    -- 5. Record Audit Event
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
        v_org_id,
        v_branch_id,
        v_user_id,
        'owner',
        'ORGANIZATION_ONBOARDED',
        'organizations',
        v_org_id,
        jsonb_build_object(
            'org_name', p_org_name,
            'slug', v_normalized_slug,
            'branch_name', p_branch_name
        )
    );

    RETURN jsonb_build_object(
        'organization_id', v_org_id,
        'slug', v_normalized_slug,
        'primary_branch_id', v_branch_id,
        'membership_id', v_membership_id
    );
END;
$$;
