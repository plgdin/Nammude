import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { SEED_ORGANIZATIONS } from '@/mocks/auth.fixtures';
import { OrganizationRecord } from '@/features/organization/OrganizationContext';

export interface OrganizationSettingsUpdate {
  name: string;
  slug: string;
  timezone: string;
  default_currency: string;
  brandColor: string;
  accentColor?: string;
}

export const ORG_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const settingsService = {
  /**
   * Persist restaurant profile settings to the organizations record.
   * Live mode updates the database row; mock mode updates the seed fixture
   * so the organization context refresh reflects the change.
   */
  async updateOrganizationSettings(
    organizationId: string,
    settings: OrganizationSettingsUpdate
  ): Promise<{ success: boolean; organization?: OrganizationRecord; error?: string }> {
    const name = settings.name.trim();
    const slug = settings.slug.trim().toLowerCase();
    if (name.length < 2) {
      return { success: false, error: 'Restaurant name must be at least 2 characters.' };
    }
    if (!ORG_SLUG_PATTERN.test(slug)) {
      return {
        success: false,
        error: 'Slug must use lowercase letters, numbers, and single hyphens (e.g. harbor-cafe).',
      };
    }
    if (!settings.timezone) {
      return { success: false, error: 'Timezone is required.' };
    }
    if (!settings.default_currency) {
      return { success: false, error: 'Currency is required.' };
    }

    const currencySymbols: Record<string, string> = {
      INR: '₹',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };

    const branding = {
      brandColor: settings.brandColor || '#2563eb',
      accentColor: settings.accentColor || '#f59e0b',
    };

    if (env.isConfigured && !env.isMockAuthEnabled) {
      try {
        const { data, error } = await (supabase.from('organizations') as any)
          .update({
            name,
            slug,
            timezone: settings.timezone,
            default_currency: settings.default_currency,
            currency_symbol: currencySymbols[settings.default_currency] || settings.default_currency,
            branding,
            updated_at: new Date().toISOString(),
          })
          .eq('id', organizationId)
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true, organization: data as OrganizationRecord };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to save settings.' };
      }
    }

    const seedOrg = SEED_ORGANIZATIONS.find((o) => o.id === organizationId);
    if (!seedOrg) {
      return { success: false, error: 'Organization not found.' };
    }
    seedOrg.name = name;
    seedOrg.slug = slug;
    seedOrg.timezone = settings.timezone;
    seedOrg.default_currency = settings.default_currency;
    seedOrg.currency_symbol = currencySymbols[settings.default_currency] || settings.default_currency;
    seedOrg.branding = branding;
    seedOrg.updated_at = new Date().toISOString();

    return { success: true, organization: seedOrg };
  },
};
