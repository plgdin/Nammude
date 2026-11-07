import { describe, it, expect } from 'vitest';
import { settingsService } from '@/features/settings/services/settingsService';
import { SEED_ORGANIZATIONS } from '@/mocks/auth.fixtures';

const orgId = '11111111-1111-1111-1111-111111111111';

describe('Settings: organization profile persistence', () => {
  it('saves restaurant profile settings and updates the organization record', async () => {
    const result = await settingsService.updateOrganizationSettings(orgId, {
      name: 'Harbor Café Updated',
      slug: 'harbor-cafe-updated',
      timezone: 'Asia/Kolkata',
      default_currency: 'INR',
      brandColor: '#123456',
      accentColor: '#f59e0b',
    });

    expect(result.success).toBe(true);
    expect(result.organization?.name).toBe('Harbor Café Updated');
    expect(result.organization?.slug).toBe('harbor-cafe-updated');
    expect(result.organization?.branding?.brandColor).toBe('#123456');

    const stored = SEED_ORGANIZATIONS.find((o) => o.id === orgId);
    expect(stored?.name).toBe('Harbor Café Updated');
  });

  it('rejects invalid slugs', async () => {
    const result = await settingsService.updateOrganizationSettings(orgId, {
      name: 'Harbor Café',
      slug: 'Harbor Café!',
      timezone: 'Asia/Kolkata',
      default_currency: 'INR',
      brandColor: '#2563eb',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/slug/i);
  });

  it('rejects empty restaurant names', async () => {
    const result = await settingsService.updateOrganizationSettings(orgId, {
      name: ' ',
      slug: 'harbor-cafe',
      timezone: 'Asia/Kolkata',
      default_currency: 'INR',
      brandColor: '#2563eb',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/name/i);
  });

  it('rejects unknown organizations', async () => {
    const result = await settingsService.updateOrganizationSettings('00000000-0000-0000-0000-000000000000', {
      name: 'Unknown Café',
      slug: 'unknown-cafe',
      timezone: 'Asia/Kolkata',
      default_currency: 'INR',
      brandColor: '#2563eb',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});
