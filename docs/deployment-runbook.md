# Production Deployment Runbook

## 1. Prerequisites
- Remote Supabase project provisioned (Postgres 15+).
- Node.js 20+ LTS environment.
- Supabase CLI installed (`npx supabase`).
- Access to production secrets (Supabase URL, Anon Key, Service Role Key).

## 2. Deployment Sequence

### Step 1: Database Migration Execution
Ensure migrations are executed in strict chronological order:
```bash
# Verify pending migrations against target
supabase db push --dry-run

# Apply all migrations
supabase db push
```
Migration inventory:
1. `20261023000001_phase3_saas_foundation.sql`
2. `20261023000002_phase4_pos_orders_payments.sql`
3. `20261023000003_phase5_inventory_recipes_purchasing.sql`
4. `20261023000004_phase6_financial_cogs_cash_reporting.sql`
5. `20261023000005_phase7_ocr_documents_staff_checklists.sql`
6. `20261023000006_phase6_phase7_security_hardening.sql`
7. `20261024000007_phase8_saas_crm_subscriptions.sql`
8. `20261024000008_phase9_production_hardening.sql`

### Step 2: Storage Bucket Provisioning
Create private storage bucket `restaurant-documents`:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-documents', 'restaurant-documents', FALSE)
ON CONFLICT (id) DO NOTHING;
```

### Step 3: Frontend Build & CDN Deployment
```bash
# Install production dependencies
npm ci

# Typecheck and production bundle build
npm run build

# Deploy dist/ directory to edge hosting (Vercel, Cloudflare Pages, AWS Amplify)
```

## 3. Rollback Procedure
If database migration or deployment fails:
1. Do NOT execute destructive commands (`DROP TABLE CASCADE`).
2. Rollback frontend traffic immediately via hosting provider deployment rollback.
3. If migration requires schema rollback, apply forward-compatible compensating SQL migration.
