export interface AppEnvironment {
  supabaseUrl: string;
  supabaseAnonKey: string;
  tenantBaseDomain: string;
  isMockAuthEnabled: boolean;
  isConfigured: boolean;
}

/**
 * Validates and sanitizes environment configuration without leaking credentials.
 */
export function getAppEnvironment(): AppEnvironment {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const tenantBaseDomain = import.meta.env.VITE_TENANT_BASE_DOMAIN || 'localhost';
  const isMockAuthEnabled = import.meta.env.VITE_ENABLE_DEV_MOCK_AUTH === 'true';

  const isConfigured =
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder');

  return {
    supabaseUrl,
    supabaseAnonKey,
    tenantBaseDomain,
    isMockAuthEnabled,
    isConfigured,
  };
}

export const env = new Proxy({} as AppEnvironment, {
  get(_target, prop: keyof AppEnvironment) {
    return getAppEnvironment()[prop];
  },
});

