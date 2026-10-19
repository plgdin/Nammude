/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_TENANT_BASE_DOMAIN: string;
  readonly VITE_ENABLE_DEV_MOCK_AUTH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
