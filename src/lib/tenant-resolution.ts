import { env } from './env';

export interface TenantResolutionResult {
  slug: string | null;
  isReserved: boolean;
  isPlatformRoot: boolean;
  source: 'subdomain' | 'query_param' | 'default';
}

export const RESERVED_SLUGS = new Set([
  'app',
  'admin',
  'api',
  'auth',
  'billing',
  'status',
  'www',
  'platform',
  'mail',
  'support',
  'staging',
]);

/**
 * Resolves the candidate tenant slug from the incoming hostname or local query params.
 * Note: Hostname resolution is solely an identity hint.
 * Authorization MUST always be verified against the user's authenticated database memberships.
 */
export function resolveTenantFromHostname(
  hostname: string,
  searchParams?: URLSearchParams
): TenantResolutionResult {
  const normalizedHost = hostname.toLowerCase().trim();
  const baseDomain = env.tenantBaseDomain.toLowerCase().trim();

  // 1. Check local query parameter fallback (e.g., http://localhost:5173/?tenant=harbor-cafe)
  if (searchParams && searchParams.has('tenant')) {
    const querySlug = searchParams.get('tenant')?.toLowerCase().trim() || '';
    if (querySlug) {
      return {
        slug: querySlug,
        isReserved: RESERVED_SLUGS.has(querySlug),
        isPlatformRoot: false,
        source: 'query_param',
      };
    }
  }

  // 2. Check for exact match with base domain or platform entry point
  if (
    normalizedHost === baseDomain ||
    normalizedHost === `www.${baseDomain}` ||
    normalizedHost === `app.${baseDomain}` ||
    normalizedHost === 'localhost' ||
    normalizedHost === '127.0.0.1'
  ) {
    return {
      slug: null,
      isReserved: false,
      isPlatformRoot: true,
      source: 'default',
    };
  }

  // 3. Extract Subdomain (e.g., harbor-cafe.platform.com or harbor-cafe.localhost)
  if (normalizedHost.endsWith(`.${baseDomain}`)) {
    const subdomainPart = normalizedHost.slice(0, -(baseDomain.length + 1));
    const parts = subdomainPart.split('.');
    const candidateSlug = parts[parts.length - 1];

    const isReserved = RESERVED_SLUGS.has(candidateSlug);
    return {
      slug: isReserved ? null : candidateSlug,
      isReserved,
      isPlatformRoot: false,
      source: 'subdomain',
    };
  }

  // Fallback
  return {
    slug: null,
    isReserved: false,
    isPlatformRoot: true,
    source: 'default',
  };
}
