# Known Limitations & Architecture Disclosures

The following items are documented release limitations for Release Candidate 1:

## 0. Implemented Since RC-1 (Blueprint Gap Closure)
- **Order Management** (`/orders`): order search, cancellation with stock/loyalty reversal, auditable multi-tender refunds with idempotency.
- **Menu Management** (`/menu-admin`): categories, items, pricing, kitchen stations, modifier groups/options, availability (86) toggles.
- **Financial Reporting**: computed from source records (orders, payments, refunds, expenses, stock ledger, GRNs, supplier payments) — no invented totals; simulated gateway payments quarantined.
- **Dashboard & Settings**: live data aggregation; settings persist to the `organizations` record; QR codes from real dining tables.
- **Staff Operations** (`/staff`): employee roster, shifts, clock in/out attendance, compliance documents with expiry reminders. Added `waiter` and `operations` roles.
- **Inventory Depth**: attributed wastage records, physical stock counts with variance posting, reorder suggestions, expiring-batch watch, supplier invoices, AP payment recording with partial/full settlement tracking.
- **POS**: delivery ordering with address, hold/resume carts (localStorage), split/partial payments with accumulated `paid_amount`, printable receipts, realtime KDS (channel live / polling mock).
- **CRM**: guest feedback with follow-up workflow, per-customer marketing consent with source + timestamp, promotions with code validation.
- **Platform**: metered usage records and billing webhook event visibility (`/platform-admin` → Usage & Webhooks).
- **Ops**: CI workflow (typecheck + tests + build), Vercel deploy config with SPA fallback, PWA app-shell service worker (production only).
- **Schema**: migration `20261024000009_staff_inventory_crm_platform.sql` adds employees, shifts, attendance, compliance, stock counts, wastage, supplier invoices, feedback, consents, promotions, usage, webhooks (all RLS-enabled).
- **Parity pack (2026-10-25)**: migration `20261025000010_parity_pack.sql` adds organization compliance/billing fields (UPI VPA, GSTIN, legal name, FSSAI, invoice prefix, place of supply) and a `reservations` table with RLS.
- **UPI QR**: dynamic QR generation from a configured VPA via `qrcode`, rendered in the payment modal for UPI tenders.
- **GST & Tally**: GST invoice builder with CGST/SGST vs IGST split, GSTR-1 CSV export and Tally XML export in Financials.
- **Thermal receipts**: ESC/POS byte-stream builder and 58/80mm text receipt generator; download from payment success state.
- **Reservations**: new `/reservations` screen with booking, confirmation, seating, completion, cancellation.
- **Offline order queue**: orders placed while offline are queued in localStorage and flushed automatically on reconnect.

## 1. Authentication Live Verification
- **Status**: **BLOCKED — REQUIRES LIVE VERIFICATION**.
- **Context**: The database grant fixes for the GoTrue `Database error querying schema` HTTP 500 issue have been encoded into migration `20261024000008_phase9_production_hardening.sql`. However, because the test suite runs in a local mock-auth environment without an active Supabase daemon/PostgreSQL remote instance, live verification with actual Supabase Auth tokens must be executed against the staging/production instance.

## 2. Mock Integrations
- **Payment Processing**: Subscription records and order payments are handled via database records and frontend state transitions. Production direct debits, card capture, and webhook HMAC signature verifications require deploying a Razorpay/Stripe Edge Function with live provider keys.
- **Document OCR**: Document ingestion accepts file uploads and stores metadata securely. Optical Character Recognition utilizes a simulated parsing adapter with confidence scores. Connecting live AWS Textract or Google Cloud Vision requires provisioning provider credentials.
- **Transactional Email**: Staff invitation and receipt email sending is prepared in service contracts but relies on local mock dispatcher until Resend or SendGrid SMTP credentials are bound.

## 3. Database Migration Execution
- Migrations 1 through 9 have been reviewed for syntax, constraints, triggers, and foreign keys. Local clean-database execution is pending connection to a live PostgreSQL 15+ container or Supabase cloud instance.

## 4. Still Outstanding (Post-RC-1)
- **Live verification**: migrations 1–9 never executed against a live database; auth (GoTrue) fix unproven; RLS tests are still JS simulations, not DB-backed.
- **Offline POS**: PWA caches the app shell only; order creation now queues locally and syncs on reconnect, but payment posting and inventory reconciliation remain online-only by design.
- **Hardware**: thermal printer/USB/network, cash drawer, barcode scanner untested; software now emits ESC/POS streams, but physical device integration is unverified. Printing still falls back to the browser print dialog.
- **Rate limiting, backups/PITR drills, monitoring/alerts**: not implemented (no Edge Functions, no backup verification).
- **Settings staff tab** still uses seed fixtures; the employee roster of record is the Staff screen (`/staff`).
