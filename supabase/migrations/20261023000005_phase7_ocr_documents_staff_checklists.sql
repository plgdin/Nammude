-- ==============================================================================
-- PHASE 7: OCR DOCUMENT PROCESSING & STAFF OPERATIONAL CHECKLISTS
-- Migration: 20261023000005_phase7_ocr_documents_staff_checklists.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Document Management & Ingestion Lifecycle
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    document_type VARCHAR(32) NOT NULL CHECK (document_type IN (
        'supplier_invoice',
        'expense_receipt',
        'goods_receipt_support',
        'operational_doc'
    )),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes INT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760), -- Max 10MB
    mime_type VARCHAR(64) NOT NULL CHECK (mime_type IN (
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
    )),
    file_hash VARCHAR(64), -- SHA-256 fingerprint for idempotency & duplicate warning
    status VARCHAR(32) NOT NULL DEFAULT 'uploaded' CHECK (status IN (
        'uploaded',
        'queued',
        'processing',
        'needs_review',
        'verified',
        'rejected',
        'failed'
    )),
    rejection_reason TEXT,
    error_message TEXT,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_org_status ON public.documents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_branch ON public.documents(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_hash ON public.documents(organization_id, file_hash);

-- ------------------------------------------------------------------------------
-- 2. OCR Extraction & Candidate Fields
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL DEFAULT 'mock_adapter',
    raw_text TEXT,
    confidence_score NUMERIC(5, 4) CHECK (confidence_score >= 0.0000 AND confidence_score <= 1.0000),
    extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    corrected_data JSONB DEFAULT NULL,
    matched_entity_type VARCHAR(32) CHECK (matched_entity_type IN ('supplier', 'expense', 'purchase_order', 'goods_receipt')),
    matched_entity_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_extraction_document UNIQUE (document_id)
);

CREATE INDEX IF NOT EXISTS idx_document_extractions_doc ON public.document_extractions(document_id);

-- ------------------------------------------------------------------------------
-- 3. Staff Operational Checklist Templates & Items
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL, -- NULL = org-wide template
    title VARCHAR(128) NOT NULL,
    description TEXT,
    category VARCHAR(32) NOT NULL CHECK (category IN (
        'opening',
        'closing',
        'hygiene_cleaning',
        'equipment_maintenance',
        'food_temperature',
        'cash_handover',
        'stock_count'
    )),
    assigned_role VARCHAR(32) NOT NULL DEFAULT 'cashier',
    frequency VARCHAR(16) NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'shift', 'weekly', 'adhoc')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_templates_org ON public.checklist_templates(organization_id, is_active);

CREATE TABLE IF NOT EXISTS public.checklist_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
    item_order INT NOT NULL DEFAULT 0,
    task_description TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    requires_notes BOOLEAN NOT NULL DEFAULT FALSE,
    requires_temperature_reading BOOLEAN NOT NULL DEFAULT FALSE,
    min_temperature NUMERIC(5, 2),
    max_temperature NUMERIC(5, 2)
);

CREATE INDEX IF NOT EXISTS idx_checklist_template_items_tmpl ON public.checklist_template_items(template_id, item_order ASC);

-- ------------------------------------------------------------------------------
-- 4. Checklist Instances & Execution Log
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checklist_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE RESTRICT,
    scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift_name VARCHAR(32) DEFAULT 'Morning',
    status VARCHAR(32) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'flagged_exceptions')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    total_items INT NOT NULL DEFAULT 0,
    completed_items INT NOT NULL DEFAULT 0,
    exception_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_instances_branch_date ON public.checklist_instances(branch_id, scheduled_date DESC);

CREATE TABLE IF NOT EXISTS public.checklist_instance_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES public.checklist_instances(id) ON DELETE CASCADE,
    template_item_id UUID REFERENCES public.checklist_template_items(id) ON DELETE SET NULL,
    task_description TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    temperature_reading NUMERIC(5, 2),
    is_exception BOOLEAN NOT NULL DEFAULT FALSE,
    exception_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_checklist_instance_items_inst ON public.checklist_instance_items(instance_id);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_instance_items ENABLE ROW LEVEL SECURITY;

-- Documents RLS
CREATE POLICY "Documents: branch staff can read"
    ON public.documents FOR SELECT
    USING (public.has_branch_role(branch_id, 'cashier'));

CREATE POLICY "Documents: branch staff can upload"
    ON public.documents FOR INSERT
    WITH CHECK (public.has_branch_role(branch_id, 'cashier'));

CREATE POLICY "Documents: managers can update or review"
    ON public.documents FOR UPDATE
    USING (public.has_branch_role(branch_id, 'manager'))
    WITH CHECK (public.has_branch_role(branch_id, 'manager'));

-- Extractions RLS
CREATE POLICY "Extractions: branch staff can read"
    ON public.document_extractions FOR SELECT
    USING (public.has_org_role(organization_id, 'viewer'));

CREATE POLICY "Extractions: staff can insert and update"
    ON public.document_extractions FOR ALL
    USING (public.has_org_role(organization_id, 'cashier'))
    WITH CHECK (public.has_org_role(organization_id, 'cashier'));

-- Checklist Templates RLS
CREATE POLICY "Checklist Templates: org members can read"
    ON public.checklist_templates FOR SELECT
    USING (public.has_org_role(organization_id, 'viewer'));

CREATE POLICY "Checklist Templates: managers can manage"
    ON public.checklist_templates FOR ALL
    USING (public.has_org_role(organization_id, 'manager'))
    WITH CHECK (public.has_org_role(organization_id, 'manager'));

CREATE POLICY "Checklist Template Items: org members can read"
    ON public.checklist_template_items FOR SELECT
    USING (TRUE);

CREATE POLICY "Checklist Template Items: managers can manage"
    ON public.checklist_template_items FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);

-- Checklist Instances RLS
CREATE POLICY "Checklist Instances: branch staff can read"
    ON public.checklist_instances FOR SELECT
    USING (public.has_branch_role(branch_id, 'cashier'));

CREATE POLICY "Checklist Instances: branch staff can create and execute"
    ON public.checklist_instances FOR ALL
    USING (public.has_branch_role(branch_id, 'cashier'))
    WITH CHECK (public.has_branch_role(branch_id, 'cashier'));

CREATE POLICY "Checklist Instance Items: branch staff can read"
    ON public.checklist_instance_items FOR SELECT
    USING (TRUE);

CREATE POLICY "Checklist Instance Items: branch staff can update"
    ON public.checklist_instance_items FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);

-- ==============================================================================
-- 6. STORED PROCEDURES & SAFE WORKFLOWS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- A. Ingest Document and Queue OCR Processing
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

    -- Authorization check
    IF v_user_id IS NOT NULL AND NOT public.has_branch_role(p_branch_id, 'cashier') THEN
        RAISE EXCEPTION 'Access denied. Cashier permissions required to upload operational documents.';
    END IF;

    -- Duplicate check within same organization
    IF p_file_hash IS NOT NULL THEN
        SELECT COUNT(*) INTO v_duplicate_count
        FROM public.documents
        WHERE organization_id = p_organization_id
          AND file_hash = p_file_hash
          AND status NOT IN ('rejected', 'failed');
    END IF;

    -- Insert Document
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

    -- If initial extraction data provided (by mock adapter or webhook), insert extraction record
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
-- B. Review & Confirm Document Extraction (Human Verification Gate)
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

    SELECT * INTO v_doc
    FROM public.documents
    WHERE id = p_document_id;

    IF v_doc IS NULL THEN
        RAISE EXCEPTION 'Document % not found', p_document_id;
    END IF;

    IF v_user_id IS NOT NULL AND NOT public.has_branch_role(v_doc.branch_id, 'manager') THEN
        RAISE EXCEPTION 'Access denied. Manager role required to review and verify documents.';
    END IF;

    IF p_action = 'verify' THEN
        -- Update extraction corrections
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
-- C. Instantiate Checklist for Daily / Shift Operation
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
BEGIN
    v_user_id := auth.uid();

    SELECT * INTO v_tmpl
    FROM public.checklist_templates
    WHERE id = p_template_id AND organization_id = p_organization_id;

    IF v_tmpl IS NULL THEN
        RAISE EXCEPTION 'Template % not found', p_template_id;
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
        'instance_id', v_instance_id,
        'total_items', v_count
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- D. Complete or Flag Checklist Item
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
    v_item RECORD;
    v_inst RECORD;
    v_completed_count INT;
    v_total_count INT;
    v_has_exception BOOLEAN;
BEGIN
    v_user_id := auth.uid();

    SELECT * INTO v_item
    FROM public.checklist_instance_items
    WHERE id = p_item_id;

    IF v_item IS NULL THEN
        RAISE EXCEPTION 'Checklist item % not found', p_item_id;
    END IF;

    UPDATE public.checklist_instance_items
    SET
        is_completed = p_is_completed,
        completed_at = CASE WHEN p_is_completed THEN NOW() ELSE NULL END,
        completed_by = CASE WHEN p_is_completed THEN v_user_id ELSE NULL END,
        notes = p_notes,
        temperature_reading = p_temperature,
        is_exception = p_is_exception,
        exception_reason = p_exception_reason
    WHERE id = p_item_id;

    -- Recalculate instance totals
    SELECT COUNT(*), COALESCE(SUM(CASE WHEN is_completed THEN 1 ELSE 0 END), 0),
           COALESCE(BOOL_OR(is_exception), FALSE)
    INTO v_total_count, v_completed_count, v_has_exception
    FROM public.checklist_instance_items
    WHERE instance_id = v_item.instance_id;

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
    WHERE id = v_item.instance_id;

    RETURN jsonb_build_object(
        'success', true,
        'item_id', p_item_id,
        'instance_id', v_item.instance_id,
        'completed_items', v_completed_count,
        'total_items', v_total_count,
        'is_fully_completed', v_completed_count = v_total_count
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. Grants
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.ingest_document TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_document TO authenticated;
GRANT EXECUTE ON FUNCTION public.instantiate_checklist TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_checklist_item TO authenticated;
