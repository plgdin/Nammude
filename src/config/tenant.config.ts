export interface BranchConfig {
  id: string;
  name: string;
  code: string;
  address: string;
  taxRate: number; // e.g. 0.08 for 8%
  serviceChargeRate: number;
}

export interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  baseCurrency: string;
  currencySymbol: string;
  currencyDecimals: number;
  locale: string;
  brandColor: string;
  accentColor: string;
  branches: BranchConfig[];
  currentBranchId: string;
}

export const currentTenant: TenantConfig = {
  id: 'org_harbor_01',
  name: 'Harbor Café',
  slug: 'harbor-cafe',
  tagline: 'Artisan Coffee & Kitchen',
  baseCurrency: 'USD',
  currencySymbol: '$',
  currencyDecimals: 2,
  locale: 'en-US',
  brandColor: '#2563eb',
  accentColor: '#f59e0b',
  branches: [
    {
      id: 'br_main',
      name: 'Main Branch',
      code: 'MAIN-01',
      address: '104 Pier Ave, Harbor District',
      taxRate: 0.0825, // 8.25% Sales Tax
      serviceChargeRate: 0.00,
    },
    {
      id: 'br_uptown',
      name: 'Uptown Kiosk',
      code: 'UP-02',
      address: '450 North Promenade',
      taxRate: 0.0825,
      serviceChargeRate: 0.00,
    },
  ],
  currentBranchId: 'br_main',
};
