import { Database } from '@/types/database.types';

export interface SeedUserFixture {
  id: string;
  email: string;
  fullName: string;
  role: Database['public']['Tables']['memberships']['Row']['role'];
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  branchIds: string[];
  isPlatformAdmin?: boolean;
}

export const SEED_USERS: SeedUserFixture[] = [
  // ── Harbor Café – Owner (index 0) ──
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    email: 'sarah.owner@harborcafe.com',
    fullName: 'Sarah Jenkins',
    role: 'owner',
    organizationId: '11111111-1111-1111-1111-111111111111',
    organizationName: 'Harbor Café',
    organizationSlug: 'harbor-cafe',
    branchIds: ['11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb'],
  },
  // ── Harbor Café – Cashier (index 1) ──
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    email: 'marco.cashier@harborcafe.com',
    fullName: 'Marco Silva',
    role: 'cashier',
    organizationId: '11111111-1111-1111-1111-111111111111',
    organizationName: 'Harbor Café',
    organizationSlug: 'harbor-cafe',
    branchIds: ['11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
  },
  // ── Marian Bistro – Owner (index 2) ──
  {
    id: 'b1111111-1111-1111-1111-111111111111',
    email: 'marian.owner@marianbistro.com',
    fullName: 'Marian Vance',
    role: 'owner',
    organizationId: '22222222-2222-2222-2222-222222222222',
    organizationName: 'Marian Bistro',
    organizationSlug: 'marian-bistro',
    branchIds: ['22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
  },
  // ── Marian Bistro – Cashier (index 3) ──
  {
    id: 'b2222222-2222-2222-2222-222222222222',
    email: 'david.cashier@marianbistro.com',
    fullName: 'David Lopez',
    role: 'cashier',
    organizationId: '22222222-2222-2222-2222-222222222222',
    organizationName: 'Marian Bistro',
    organizationSlug: 'marian-bistro',
    branchIds: ['22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
  },
  // ── Platform SuperAdmin (index 4) ──
  {
    id: 'p0000000-0000-0000-0000-000000000000',
    email: 'superadmin@tablewise.io',
    fullName: 'Alan (SuperAdmin)',
    role: 'platform_admin',
    organizationId: '11111111-1111-1111-1111-111111111111',
    organizationName: 'Tablewise Platform',
    organizationSlug: 'tablewise-platform',
    branchIds: [],
    isPlatformAdmin: true,
  },
  // ── Harbor Café – Kitchen Staff ──
  {
    id: 'a3333333-3333-3333-3333-333333333333',
    email: 'chef.raj@harborcafe.com',
    fullName: 'Raj Patel',
    role: 'kitchen',
    organizationId: '11111111-1111-1111-1111-111111111111',
    organizationName: 'Harbor Café',
    organizationSlug: 'harbor-cafe',
    branchIds: ['11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
  },
  // ── Harbor Café – Inventory Staff ──
  {
    id: 'a4444444-4444-4444-4444-444444444444',
    email: 'nisha.inventory@harborcafe.com',
    fullName: 'Nisha Mehra',
    role: 'inventory',
    organizationId: '11111111-1111-1111-1111-111111111111',
    organizationName: 'Harbor Café',
    organizationSlug: 'harbor-cafe',
    branchIds: ['11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
  },
  // ── Marian Bistro – Auditor ──
  {
    id: 'b3333333-3333-3333-3333-333333333333',
    email: 'accounts@marianbistro.com',
    fullName: 'Priya Sharma',
    role: 'auditor',
    organizationId: '22222222-2222-2222-2222-222222222222',
    organizationName: 'Marian Bistro',
    organizationSlug: 'marian-bistro',
    branchIds: ['22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
  },
];

export const SEED_ORGANIZATIONS: Database['public']['Tables']['organizations']['Row'][] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Harbor Café',
    slug: 'harbor-cafe',
    status: 'active',
    default_currency: 'INR',
    currency_symbol: '₹',
    currency_decimals: 2,
    timezone: 'Asia/Kolkata',
    branding: { brandColor: '#2563eb', accentColor: '#f59e0b' },
    upi_vpa: 'harborcafe@upi',
    gstin: '29ABCDE1234F1Z5',
    legal_name: 'Harbor Café Pvt Ltd',
    fssai_license: '12345678901234',
    invoice_prefix: 'HC',
    place_of_supply_state: 'Karnataka',
    created_at: '2026-10-19T00:00:00Z',
    updated_at: '2026-10-19T00:00:00Z',
    version: 1,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Marian Bistro',
    slug: 'marian-bistro',
    status: 'active',
    default_currency: 'INR',
    currency_symbol: '₹',
    currency_decimals: 2,
    timezone: 'Asia/Kolkata',
    branding: { brandColor: '#059669', accentColor: '#e11d48' },
    upi_vpa: 'marianbistro@upi',
    gstin: '29FGHIJ5678K2L6',
    legal_name: 'Marian Bistro LLP',
    fssai_license: '98765432109876',
    invoice_prefix: 'MB',
    place_of_supply_state: 'Karnataka',
    created_at: '2026-10-19T00:00:00Z',
    updated_at: '2026-10-19T00:00:00Z',
    version: 1,
  },
];

export const SEED_BRANCHES: Database['public']['Tables']['branches']['Row'][] = [
  {
    id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    organization_id: '11111111-1111-1111-1111-111111111111',
    name: 'Main Branch',
    slug: 'main-branch',
    code: 'MAIN-01',
    address_line1: '104 Pier Ave',
    address_line2: null,
    city: 'Harbor District',
    state: 'Karnataka',
    postal_code: '560001',
    country: 'US',
    phone: '+1 (555) 101-2001',
    email: 'main@harborcafe.com',
    tax_rate: 0.0825,
    service_charge_rate: 0.0,
    status: 'active',
    created_at: '2026-10-19T00:00:00Z',
    updated_at: '2026-10-19T00:00:00Z',
  },
  {
    id: '11111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    organization_id: '11111111-1111-1111-1111-111111111111',
    name: 'Uptown Kiosk',
    slug: 'uptown-kiosk',
    code: 'UP-02',
    address_line1: '450 North Promenade',
    address_line2: null,
    city: 'Harbor District',
    state: 'Karnataka',
    postal_code: '560002',
    country: 'US',
    phone: '+1 (555) 101-2002',
    email: 'uptown@harborcafe.com',
    tax_rate: 0.0825,
    service_charge_rate: 0.0,
    status: 'active',
    created_at: '2026-10-19T00:00:00Z',
    updated_at: '2026-10-19T00:00:00Z',
  },
  {
    id: '22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    organization_id: '22222222-2222-2222-2222-222222222222',
    name: 'Downtown Bistro',
    slug: 'downtown-bistro',
    code: 'MB-01',
    address_line1: '800 Michigan Ave',
    address_line2: null,
    city: 'Chicago',
    state: 'IL',
    postal_code: '60611',
    country: 'US',
    phone: '+1 (555) 202-3001',
    email: 'contact@marianbistro.com',
    tax_rate: 0.095,
    service_charge_rate: 0.0,
    status: 'active',
    created_at: '2026-10-19T00:00:00Z',
    updated_at: '2026-10-19T00:00:00Z',
  },
];
