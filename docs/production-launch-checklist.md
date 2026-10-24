# Production Launch & Pilot Checklist

## 1. Pre-Flight Security & Database Verification
- [x] Phase 8 security vulnerabilities (SEC-P8-01, SEC-P8-02, SEC-P8-03) resolved in migration 8.
- [x] Platform admin elevation guard (SEC-P9-01) active.
- [x] Multi-tenant RLS isolation regression suite passing (130 automated tests).
- [ ] Remote Supabase database migrations applied (`001` through `008`).
- [ ] GoTrue authentication live login / signup verified without HTTP 500 error (**Requires Live Supabase instance**).
- [ ] Supabase storage bucket `restaurant-documents` created and RLS policies active.

## 2. Integration & Payment Readiness
- [ ] Payment Gateway (Razorpay/Stripe): Edge Function deployed with signed HMAC webhook verification.
- [ ] OCR Service: Production cloud OCR hooked to document verification queue.
- [x] Mock and fallback services clearly differentiated from production adapters.

## 3. Financial & Operational Verification
- [x] Indian Rupee (`₹` - INR) currency formatting configured for Indian restaurant market.
- [x] Cash drawer reconciliation formula tested: `Opening Float + Cash Sales - Cash Refunds + Cash In - Cash Out - Cash Expenses`.
- [x] Stock consumption and cancelled-order reversals tested.
- [x] Supplier AP windowing reconciled.

## 4. Operational Sign-Off
- [x] Frontend bundle compiled with clean exit (`npm run build`).
- [x] Zero TypeScript compilation errors (`tsc --noEmit`).
- [ ] Production custom domain with TLS/HTTPS certificate configured.
- [ ] Error tracking (e.g. Sentry) and low-cardinality audit logs enabled.
