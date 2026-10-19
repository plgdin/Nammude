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
      case '/inventory':
        return {
          title: 'Stock & Ingredients',
          subtitle: `${currentBranch?.name || 'Main Branch'} • Perpetual ingredient tracking`,
        };
      default:
        return {
          title: currentOrganization?.name || 'Restaurant Platform',
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
