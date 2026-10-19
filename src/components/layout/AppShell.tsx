import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { currentTenant, BranchConfig } from '@/config/tenant.config';

export const AppShell: React.FC = () => {
  const [selectedBranch, setSelectedBranch] = useState<BranchConfig>(
    currentTenant.branches[0]
  );
  const location = useLocation();

  const getPageMeta = (pathname: string) => {
    switch (pathname) {
      case '/':
      case '/dashboard':
        return {
          title: 'Owner Overview',
          subtitle: 'Daily operational summary & financial performance',
        };
      case '/pos':
        return {
          title: 'POS Register',
          subtitle: 'Counter & table-side checkout order terminal',
        };
      case '/inventory':
        return {
          title: 'Stock & Ingredients',
          subtitle: 'Perpetual inventory tracking & supplier orders',
        };
      default:
        return {
          title: 'Harbor Café',
          subtitle: 'Operating System',
        };
    }
  };

  const { title, subtitle } = getPageMeta(location.pathname);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Sticky Header */}
        <Header
          title={title}
          subtitle={subtitle}
          selectedBranch={selectedBranch}
          onSelectBranch={setSelectedBranch}
        />

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
