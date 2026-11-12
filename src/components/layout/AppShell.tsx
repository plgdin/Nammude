import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { useOrganization } from '@/features/organization/OrganizationContext';

export const AppShell: React.FC = () => {
  const { currentBranch, currentOrganization, isLoading } = useOrganization();
  const location = useLocation();

  const getPageMeta = (pathname: string) => {
    switch (pathname) {
      case '/':
      case '/dashboard':
        return {
          title: 'Owner Overview',
          subtitle: `${currentOrganization?.name || 'Restaurant'} • Daily operational performance`,
        };
      case '/pos':
        return {
          title: 'POS Register',
          subtitle: `${currentBranch?.name || 'Main Branch'} • Checkout terminal`,
        };
      case '/orders':
        return {
          title: 'Orders & Refunds',
          subtitle: `${currentBranch?.name || 'Main Branch'} • Order search, corrections & auditable refunds`,
        };
      case '/menu-admin':
        return {
          title: 'Menu Management',
          subtitle: `${currentOrganization?.name || 'Restaurant'} • Categories, items, pricing & modifiers`,
        };
      case '/staff':
        return {
          title: 'Staff & Attendance',
          subtitle: `${currentBranch?.name || 'Main Branch'} • Roster, shifts & clock in/out`,
        };
      case '/inventory':
        return {
          title: 'Stock & Ingredients',
          subtitle: `${currentBranch?.name || 'Main Branch'} • Perpetual ingredient tracking`,
        };
      case '/kitchen':
      case '/kds':
        return {
          title: 'Kitchen Display',
          subtitle: `${currentBranch?.name || 'Main Branch'} • KDS order queue & prep status`,
        };
      case '/financials':
      case '/reports':
        return {
          title: 'Financials & P&L',
          subtitle: `${currentOrganization?.name || 'Restaurant'} • Operating income, cash reconciliation & costing`,
        };
      case '/documents':
      case '/ocr':
        return {
          title: 'OCR Ingestion',
          subtitle: `${currentBranch?.name || 'Main Branch'} • Automated document extraction & human verification`,
        };
      case '/checklists':
        return {
          title: 'Staff Checklists',
          subtitle: `${currentBranch?.name || 'Main Branch'} • Shift opening, food temperature & hygiene SOPs`,
        };
      case '/customers':
      case '/crm':
        return {
          title: 'Customer CRM',
          subtitle: `${currentOrganization?.name || 'Restaurant'} • Customer profiles & loyalty`,
        };
      case '/reservations':
        return {
          title: 'Reservations',
          subtitle: `${currentBranch?.name || 'Main Branch'} • Table bookings & seating`,
        };
      case '/onboarding':
        return {
          title: 'Restaurant Setup',
          subtitle: `${currentOrganization?.name || 'Restaurant'} • Initial configuration wizard`,
        };
      case '/settings':
        return {
          title: 'Settings',
          subtitle: `${currentOrganization?.name || 'Restaurant'} • Restaurant settings, staff & QR management`,
        };
      case '/platform-admin':
        return {
          title: 'Platform Administration',
          subtitle: 'Tablewise • Cross-tenant governance & tenant management',
        };
      default:
        return {
          title: currentOrganization?.name || 'Tablewise Platform',
          subtitle: 'Operating System',
        };
    }
  };

  const { title, subtitle } = getPageMeta(location.pathname);

  if (isLoading && !currentOrganization) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span className="text-xs text-gray-400 font-medium tracking-wide">
            Loading tenant organization...
          </span>
        </div>
      </div>
    );
  }

  // Fallback branch if none selected yet
  const selectedBranch = currentBranch || {
    id: 'br_default',
    organization_id: currentOrganization?.id || 'org_default',
    name: 'Primary Branch',
    slug: 'primary-branch',
    code: 'PRI-01',
    address_line1: '100 Main St',
    address_line2: null,
    city: 'City',
    state: null,
    postal_code: null,
    country: 'US',
    phone: null,
    email: null,
    tax_rate: 0.0825,
    service_charge_rate: 0.0,
    status: 'active' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Sticky Header */}
        <Header title={title} subtitle={subtitle} />

        {/* Dynamic Route Screen (Scrollable) */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          <Outlet context={{ selectedBranch }} />
        </main>

        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </div>
  );
};
