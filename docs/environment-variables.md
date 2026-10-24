# Environment Variables Specification

## Client-Side Variables (Vite - Publicly Exposed in Bundle)
All client variables are prefixed with `VITE_`. Never store confidential API keys or service role secrets in these variables.

| Variable | Description | Required | Default / Example |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project API gateway endpoint | **Yes** (Prod) | `https://xyzcompany.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase anonymous client JWT | **Yes** (Prod) | `eyJhbGciOi...` |
| `VITE_APP_NAME` | Display name of the platform | No | `Nammude Restaurant OS` |
| `VITE_ENABLE_MOCK_AUTH` | Toggles mock auth mode for development | No | `false` |
| `VITE_DEFAULT_CURRENCY` | System default currency code | No | `INR` |
| `VITE_DEFAULT_LOCALE` | System default locale code | No | `en-IN` |

## Server-Side / Edge Secrets (Confidential - Never Commit)
Stored strictly in Supabase Dashboard / Cloud Secret Manager / Edge Function environment.

| Variable | Description | Destination |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Administrative database bypass token | Edge Functions / Backend Workers |
| `RAZORPAY_KEY_ID` | Payment gateway public API ID | Edge Functions |
| `RAZORPAY_KEY_SECRET` | Payment gateway secret signing key | Edge Functions |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC signature validation secret | Edge Functions |
| `DOCUMENT_OCR_API_KEY` | Vision OCR provider secret (AWS Textract / Google Cloud Vision) | Edge Functions |
