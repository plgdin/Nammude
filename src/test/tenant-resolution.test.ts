import { describe, it, expect } from 'vitest';
import { resolveTenantFromHostname } from '@/lib/tenant-resolution';

describe('Tenant Subdomain Resolution', () => {
  it('resolves valid tenant subdomain from hostname', () => {
    const result = resolveTenantFromHostname('harbor-cafe.localhost');
    expect(result.slug).toBe('harbor-cafe');
    expect(result.isReserved).toBe(false);
    expect(result.isPlatformRoot).toBe(false);
    expect(result.source).toBe('subdomain');
  });

  it('rejects reserved subdomains such as admin or app', () => {
    const adminResult = resolveTenantFromHostname('admin.localhost');
    expect(adminResult.slug).toBeNull();
    expect(adminResult.isReserved).toBe(true);

    const appResult = resolveTenantFromHostname('app.localhost');
    expect(appResult.slug).toBeNull();
    expect(appResult.isPlatformRoot).toBe(true);
  });

  it('resolves root platform domain as platform entry point', () => {
    const rootResult = resolveTenantFromHostname('localhost');
    expect(rootResult.slug).toBeNull();
    expect(rootResult.isPlatformRoot).toBe(true);
  });

  it('supports local development query parameter fallback', () => {
    const params = new URLSearchParams('tenant=marian-bistro');
    const result = resolveTenantFromHostname('localhost', params);
    expect(result.slug).toBe('marian-bistro');
    expect(result.source).toBe('query_param');
  });
});
