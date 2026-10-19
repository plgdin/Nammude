import React from 'react';
import { NavLink } from 'react-router-dom';
import { useOrganization } from '@/features/organization/OrganizationContext';
import { useAuth } from '@/features/auth/AuthContext';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Boxes,
  CookingPot,
  ReceiptText,
  ScanText,
  Coffee,
  ShieldCheck,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export const Sidebar: React.FC = () => {
  const {
    currentOrganization,
    permittedOrganizations,
    switchOrganization,
    currentMembership,
  } = useOrganization();
  const { profile, user } = useAuth();

  const activeRoutes = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Point of Sale (POS)', path: '/pos', icon: UtensilsCrossed },
    { name: 'Inventory & Stock', path: '/inventory', icon: Boxes },
  ];

  const futureRoutes = [
    { name: 'Kitchen KDS', icon: CookingPot, phase: 'Phase 4' },
    { name: 'Financial Ledger', icon: ReceiptText, phase: 'Phase 6' },
    { name: 'OCR Ingestion', icon: ScanText, phase: 'Phase 7' },
  ];

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-surface-border bg-surface select-none">
      {/* Brand & Organization Switcher */}
      <div className="flex h-16 items-center justify-between border-b border-surface-border px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-fg shadow">
            <Coffee className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-white tracking-tight truncate">
              {currentOrganization?.name || 'Restaurant OS'}
            </h2>
            <p className="text-[10px] text-gray-400 font-mono truncate">
              {currentOrganization?.slug || 'platform'}
            </p>
          </div>
        </div>

        {/* Multi-Tenant Switcher if user belongs to >1 organization */}
        {permittedOrganizations.length > 1 && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-surface-elevated"
                title="Switch Organization"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[200px] overflow-hidden rounded-xl border border-surface-border bg-surface p-1.5 shadow-xl animate-in fade-in-50"
                align="start"
                sideOffset={5}
              >
                <DropdownMenu.Label className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Switch Organization
                </DropdownMenu.Label>
                {permittedOrganizations.map((org) => (
                  <DropdownMenu.Item
                    key={org.id}
                    onClick={() => switchOrganization(org.id)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-gray-200 cursor-pointer hover:bg-surface-elevated hover:text-white focus:bg-surface-elevated focus:outline-none"
                  >
                    <Building2 className="h-3.5 w-3.5 text-brand" />
                    <span className="font-medium truncate">{org.name}</span>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex flex-1 flex-col justify-between p-4 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Operational Views
            </p>
            <nav className="space-y-1">
              {activeRoutes.map((route) => (
                <NavLink
                  key={route.path}
                  to={route.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-brand text-brand-fg shadow-sm'
                        : 'text-gray-300 hover:bg-surface-elevated hover:text-white'
                    )
                  }
                >
                  <route.icon className="h-4 w-4" />
                  <span>{route.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Planned Capabilities
            </p>
            <div className="space-y-1">
              {futureRoutes.map((route) => (
                <div
                  key={route.name}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-gray-500 cursor-not-allowed hover:bg-surface-elevated/40"
                  title={`${route.name} is scheduled for ${route.phase}`}
                >
                  <div className="flex items-center gap-3">
                    <route.icon className="h-4 w-4 text-gray-500" />
                    <span>{route.name}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-gray-400 font-mono">
                    {route.phase}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User / Session Card */}
        <div className="rounded-xl border border-surface-border bg-surface-elevated p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-semibold text-xs">
              {(profile?.full_name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {profile?.full_name || 'Staff User'}
              </p>
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="uppercase font-mono">
                  {currentMembership?.role || 'staff'}
                </span>
              </p>
            </div>
            <ShieldCheck className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>
    </aside>
  );
};
