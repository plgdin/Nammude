# Application Security Audit Matrix & Hardening Report

## Security Audit Matrix

| Feature / Domain | Threat Model | Security Test Performed | Remediation / Database Control | Status |
|---|---|---|---|---|
| **Subscription Plan Mutation** | Tenant user attempts to escalate plan to Enterprise via direct DB write. | Evaluated direct `UPDATE organization_subscriptions` using tenant role. | Locked direct mutations to `is_platform_admin()`. Created `request_subscription_plan_change` RPC. | **RESOLVED (SEC-P8-01)** |
| **Customer Loyalty Balance** | Tenant user tampers with `customers.loyalty_points_balance` directly. | Attempted direct point inflation via client-initiated update. | Added BEFORE UPDATE trigger enforcing `app.loyalty_transaction_in_progress = 'true'`. | **RESOLVED (SEC-P8-02)** |
| **Loyalty Ledger Forgery** | Attacker inserts fraudulent reward transactions into ledger. | Attempted direct table INSERT on `customer_loyalty_ledger`. | Set RLS `WITH CHECK (FALSE)`, enforcing writes via `record_loyalty_transaction`. | **RESOLVED (SEC-P8-03)** |
| **Platform Admin Escalation** | Regular user sets `is_platform_admin = TRUE` in `profiles`. | Attempted self-promotion via profile update. | Added BEFORE INSERT/UPDATE trigger rejecting elevation unless existing platform admin. | **RESOLVED (SEC-P9-01)** |
| **Cross-Tenant Data Isolation** | Tenant A attempts to access Tenant B orders, tables, or staff checklists. | Automated multi-tenant RLS isolation suite across all 24 sensitive tables. | Strict `organization_id` checking via `auth.uid()` and branch membership helpers. | **VERIFIED** |
| **Public QR Menu Data Leakage** | External diner accesses staff notes, cost of goods, or supplier data. | Public menu endpoint audit and query projection review. | Dedicated public view `public_menu_items_view` with stripped margins and supplier IDs. | **VERIFIED** |
| **Document Storage Access** | Unauthenticated user guesses storage URL or accesses another tenant's documents. | Storage path isolation check (`/org_id/branch_id/...`) and signed URL requirement. | Private bucket policy with path-based multi-tenant prefix enforcement. | **VERIFIED** |
| **Financial Posting Guard** | Unverified OCR invoice posted directly to general ledger / expenses. | Automated verification guard test prohibiting unverified posting. | State machine gate: transition requires human review with valid confidence threshold. | **VERIFIED** |
| **Reversals & Reconciliations** | Cancelled order retains stock deductions or creates duplicate reversals. | Regression suite on stock reversal and cash shift reconciliation. | Authoritative transaction idempotency and stock movement journal balancing. | **VERIFIED** |

## Auth HTTP 500 Root Cause Diagnosis
- **Symptom**: `Database error querying schema` during Supabase Auth signup/login.
- **Root Cause**: GoTrue (`auth` schema) communicates with the `public` schema via triggers and grants. If the `anon` or `authenticated` roles lack permissions to public schema functions referenced in triggers (such as `handle_new_user()`), or if `search_path` is unset, Postgres raises internal 500 errors.
- **Fix Applied**: Added schema usage and execution grants for `anon`, `authenticated`, and `service_role` in `20261024000008_phase9_production_hardening.sql`.
- **Validation Status**: **BLOCKED — REQUIRES LIVE VERIFICATION** on remote Supabase instance (local environment runs in mock auth mode without remote GoTrue connection).
