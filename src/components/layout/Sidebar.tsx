import React from 'react';
import { NavLink } from 'react-router-dom';
import { useOrganization } from '@/features/organization/OrganizationContext';
import { useAuth } from '@/features/auth/AuthContext';
import { hasPermission, Permission, PERMISSIONS } from '@/lib/permissions';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Boxes,
  CookingPot,
  ReceiptText,
  ScanText,
  ClipboardCheck,
  Coffee,
  ShieldCheck,
  Building2,
  ChevronDown,
  Users,
  Compass,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface SidebarRoute {
  name: string;
  path: string;
  icon: React.ElementType;
  permission: Permission;
}

const ALL_ROUTES: SidebarRoute[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD },
  { name: 'Point of Sale (POS)', path: '/pos', icon: UtensilsCrossed, permission: PERMISSIONS.POS },
  { name: 'Kitchen KDS', path: '/kitchen', icon: CookingPot, permission: PERMISSIONS.KITCHEN },
  { name: 'Inventory & Stock', path: '/inventory', icon: Boxes, permission: PERMISSIONS.INVENTORY },
  { name: 'Financials & Reports', path: '/financials', icon: ReceiptText, permission: PERMISSIONS.FINANCIALS },
  { name: 'OCR Ingestion', path: '/documents', icon: ScanText, permission: PERMISSIONS.DOCUMENTS },
  { name: 'Staff Checklists', path: '/checklists', icon: ClipboardCheck, permission: PERMISSIONS.CHECKLISTS },
  { name: 'Customer CRM', path: '/customers', icon: Users, permission: PERMISSIONS.CUSTOMERS },
  { name: 'Restaurant Setup', path: '/onboarding', icon: Compass, permission: PERMISSIONS.ONBOARDING },
  { name: 'Settings', path: '/settings', icon: Settings, permission: PERMISSIONS.SETTINGS },
  { name: 'Platform Admin', path: '/platform-admin', icon: ShieldCheck, permission: PERMISSIONS.PLATFORM_ADMIN },
];

export const Sidebar: React.FC = () => {
  const {
    currentOrganization,
    permittedOrganizations,
    switchOrganization,
    currentMembership,
  } = useOrganization();
  const { profile, user, activeRole, signOut } = useAuth();

  // Filter routes by role permissions
  const visibleRoutes = ALL_ROUTES.filter((route) => hasPermission(activeRole, route.permission));

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
              {currentOrganization?.name || 'Tablewise'}
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
              {visibleRoutes.map((route) => (
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
        </div>

        {/* User / Session Card */}
        <div className="space-y-3">
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
                    {activeRole || currentMembership?.role || 'staff'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
