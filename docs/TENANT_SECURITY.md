# Tenant Isolation, Authorization & Security Architecture

## 1. Zero-Trust Multi-Tenant Security Model

In our shared-database multi-tenant architecture, the frontend client is treated as completely untrusted. 
- **Rule 1**: A client **cannot** specify or override its `tenant_id` via HTTP request headers or JSON payloads to access data.
- **Rule 2**: All authorization boundaries are enforced at the database kernel level through **PostgreSQL Row Level Security (RLS)** and validated inside cryptographic JWT claims.
- **Rule 3**: Privileged mutations (e.g., payment capture, ledger reconciliation) run via backend Edge Functions with service-role privileges that validate tenant ownership prior to execution.

---

## 2. Authentication & Tenant Session Lifecycle

### 2.1 JWT Claim Structure
When a user authenticates via Supabase Auth, custom database claims are injected into the issued JWT. The claim includes:
- `sub`: User UUID.
- `active_tenant_id`: The UUID of the currently selected organization.
- `active_branch_id`: The UUID of the assigned branch (or `*` for multi-branch managers).
- `role`: The user's role in this organization (`owner`, `general_manager`, `branch_manager`, `cashier`, `kitchen`, `waiter`).
- `permissions`: Granular permission flags (e.g., `["orders:create", "discounts:apply", "reports:read"]`).

### 2.2 Secure Tenant Switching
A user (such as an owner with multiple restaurant brands or an auditor) may belong to multiple tenants.
1. When navigating between subdomains (e.g., `marian.platform.com` to `cafeone.platform.com`), the application detects a tenant context change.
2. The client requests a scoped session refresh via an Edge Function (`refresh-tenant-session`).
3. The server checks the `memberships` table: `WHERE user_id = auth.uid() AND tenant_id = :target_tenant_id AND is_active = TRUE`.
4. If valid, a new JWT is issued with the updated `active_tenant_id`. If invalid, access is immediately rejected.

---

## 3. PostgreSQL Row Level Security (RLS) Implementation

### 3.1 Session Helper Functions
To avoid redundant joins and ensure lightning-fast policy execution, PostgreSQL reads session claims directly from `auth.jwt()`:

```sql
-- Retrieve active tenant UUID from the JWT
CREATE OR REPLACE FUNCTION auth.current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'active_tenant_id', '')::UUID;
$$;

-- Retrieve active role from the JWT
CREATE OR REPLACE FUNCTION auth.current_user_role()
RETURNS VARCHAR
LANGUAGE sql STABLE
AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role', '');
$$;

-- Check if user is assigned to a specific branch
CREATE OR REPLACE FUNCTION auth.has_branch_access(target_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_branch_assignments uba
        JOIN memberships m ON m.id = uba.membership_id
        WHERE m.user_id = auth.uid()
          AND m.tenant_id = auth.current_tenant_id()
          AND (uba.branch_id = target_branch_id OR m.role IN ('owner', 'general_manager'))
    );
$$;
```

### 3.2 Canonical Table RLS Policy Template
Every tenant table must enable RLS and apply restrictive isolation policies:

```sql
-- Enable RLS on Orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- 1. Read Policy: Only read orders belonging to active tenant and accessible branch
CREATE POLICY tenant_isolation_orders_select ON orders
    FOR SELECT
    USING (
        tenant_id = auth.current_tenant_id()
        AND auth.has_branch_access(branch_id)
    );

-- 2. Insert Policy: Prevent injecting a foreign tenant_id
CREATE POLICY tenant_isolation_orders_insert ON orders
    FOR INSERT
    WITH CHECK (
        tenant_id = auth.current_tenant_id()
        AND auth.has_branch_access(branch_id)
    );

-- 3. Update Policy: Updates restricted to matching tenant
CREATE POLICY tenant_isolation_orders_update ON orders
    FOR UPDATE
    USING (
        tenant_id = auth.current_tenant_id()
        AND auth.has_branch_access(branch_id)
    )
    WITH CHECK (
        tenant_id = auth.current_tenant_id()
        AND auth.has_branch_access(branch_id)
    );

-- 4. Delete Policy: Prohibited for operational financial tables (Soft-delete or status change only)
CREATE POLICY tenant_isolation_orders_delete ON orders
    FOR DELETE
    USING (FALSE);
```

---

## 4. Threat Modeling & Attack Surface Defenses

| Threat Vector | Potential Impact | Architectural Defense |
| :--- | :--- | :--- |
| **Insecure Direct Object Reference (IDOR)** | Tenant B attempts to read/modify Tenant A's order by guessing UUID `order_id`. | Blocked at database engine: RLS filters `WHERE tenant_id = auth.current_tenant_id()`. The query returns `404 Not Found` or `0 rows affected`. |
| **Tenant Slug Spoofing / Hostname Manipulation** | Attacker alters Host header to bypass subdomain checks. | Vercel Edge Middleware verifies host header against database index of valid tenant slugs. Unrecognized hosts redirect to `platform.com`. |
| **JWT Claim Tampering** | Attacker modifies `active_tenant_id` inside JWT payload. | Signature verification fails: Supabase Auth validates RS256 / HS256 signatures with secret key. |
| **Privileged Key Exposure in Browser** | Attacker extracts `SUPABASE_SERVICE_ROLE_KEY` from client bundle. | **Zero Tolerance**: Service-role keys are strictly forbidden in client builds. Only the public `SUPABASE_ANON_KEY` is bundled. |
| **Malicious File Upload (OCR Bombs / Malware)** | Attacker uploads executable or script disguised as receipt. | Storage bucket validation: Whitelisted MIME types (`image/jpeg`, `image/png`, `application/pdf`), 15MB file cap, files stored in isolated private buckets with virus scanning hook. |

---

## 5. Automated Negative Cross-Tenant Test Suite Specification

Prior to deploying or onboarding a second tenant, the CI/CD pipeline executes automated negative tests using Vitest and direct PostgreSQL connection harnesses:

```typescript
// Example Isolation Suite: tests/security/tenant_isolation.test.ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Cross-Tenant Data Isolation Gate', () => {
  const tenantA_Client = createAuthenticatedClient(TENANT_A_USER_JWT);
  const tenantB_Client = createAuthenticatedClient(TENANT_B_USER_JWT);

  it('PREVENTS Tenant B from reading orders belonging to Tenant A', async () => {
    // 1. Tenant A creates an order
    const { data: orderA } = await tenantA_Client
      .from('orders')
      .insert({ order_number: 'ORD-A-001', total_amount: 50.00 })
      .select()
      .single();

    // 2. Tenant B queries the exact UUID of Tenant A's order
    const { data: leakedOrder, error } = await tenantB_Client
      .from('orders')
      .select('*')
      .eq('id', orderA.id)
      .maybeSingle();

    // 3. Must return null with no data leaked
    expect(leakedOrder).toBeNull();
  });

  it('REJECTS Tenant B modifying Tenant A order total', async () => {
    const { data: orderA } = await tenantA_Client.from('orders').select('id').limit(1).single();

    const { error, count } = await tenantB_Client
      .from('orders')
      .update({ total_amount: 0.00 })
      .eq('id', orderA.id);

    expect(count).toBe(0);
  });

  it('REJECTS unauthorized document download across tenants', async () => {
    const { data: docA } = await tenantA_Client.storage.from('documents').list('invoices');
    const privateFile = docA[0].name;

    const { data: fileData, error } = await tenantB_Client.storage
      .from('documents')
      .download(`invoices/${privateFile}`);

    expect(error).not.toBeNull();
    expect(fileData).toBeNull();
  });
});
```
