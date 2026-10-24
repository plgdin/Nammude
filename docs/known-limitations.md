# Known Limitations & Architecture Disclosures

The following items are documented release limitations for Release Candidate 1:

## 1. Authentication Live Verification
- **Status**: **BLOCKED — REQUIRES LIVE VERIFICATION**.
- **Context**: The database grant fixes for the GoTrue `Database error querying schema` HTTP 500 issue have been encoded into migration `20261024000008_phase9_production_hardening.sql`. However, because the test suite runs in a local mock-auth environment without an active Supabase daemon/PostgreSQL remote instance, live verification with actual Supabase Auth tokens must be executed against the staging/production instance.

## 2. Mock Integrations
- **Payment Processing**: Subscription records and order payments are handled via database records and frontend state transitions. Production direct debits, card capture, and webhook HMAC signature verifications require deploying a Razorpay/Stripe Edge Function with live provider keys.
- **Document OCR**: Document ingestion accepts file uploads and stores metadata securely. Optical Character Recognition utilizes a simulated parsing adapter with confidence scores. Connecting live AWS Textract or Google Cloud Vision requires provisioning provider credentials.
- **Transactional Email**: Staff invitation and receipt email sending is prepared in service contracts but relies on local mock dispatcher until Resend or SendGrid SMTP credentials are bound.

## 3. Database Migration Execution
- Migrations 1 through 8 have been reviewed for syntax, constraints, triggers, and foreign keys. Local clean-database execution is pending connection to a live PostgreSQL 15+ container or Supabase cloud instance.
