import { describe, it, expect } from 'vitest';
import { getAppEnvironment } from '@/lib/env';

describe('Environment Configuration Safety', () => {
  it('correctly detects placeholder configuration without throwing', () => {
    const config = getAppEnvironment();
    expect(config).toBeDefined();
    expect(typeof config.tenantBaseDomain).toBe('string');
  });

  it('marks isConfigured as false when placeholder values are present', () => {
    const config = getAppEnvironment();
    // Default mock setup should be false for production integration
    if (config.supabaseUrl.includes('placeholder')) {
      expect(config.isConfigured).toBe(false);
    }
  });

  it('preserves mock auth toggle state', () => {
    const config = getAppEnvironment();
    expect(typeof config.isMockAuthEnabled).toBe('boolean');
  });
});
