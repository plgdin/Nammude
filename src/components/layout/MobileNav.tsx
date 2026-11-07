import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { hasPermission, Permission, PERMISSIONS } from '@/lib/permissions';
import { LayoutDashboard, UtensilsCrossed, Boxes, ReceiptText, CookingPot, ClipboardCheck, ClipboardList, ShieldCheck, Settings } from 'lucide-react';
import { cn } from '@/lib/cn';

interface MobileRoute {
  name: string;
  path: string;
  icon: React.ElementType;
  permission: Permission;
}

/** Mobile nav shows max ~5 most relevant items for the user's role */
const ALL_MOBILE_ROUTES: MobileRoute[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD },
  { name: 'POS', path: '/pos', icon: UtensilsCrossed, permission: PERMISSIONS.POS },
  { name: 'Orders', path: '/orders', icon: ClipboardList, permission: PERMISSIONS.POS },
  { name: 'Kitchen', path: '/kitchen', icon: CookingPot, permission: PERMISSIONS.KITCHEN },
  { name: 'Inventory', path: '/inventory', icon: Boxes, permission: PERMISSIONS.INVENTORY },
  { name: 'Financials', path: '/financials', icon: ReceiptText, permission: PERMISSIONS.FINANCIALS },
  { name: 'Tasks', path: '/checklists', icon: ClipboardCheck, permission: PERMISSIONS.CHECKLISTS },
  { name: 'Settings', path: '/settings', icon: Settings, permission: PERMISSIONS.SETTINGS },
  { name: 'Admin', path: '/platform-admin', icon: ShieldCheck, permission: PERMISSIONS.PLATFORM_ADMIN },
];

export const MobileNav: React.FC = () => {
  const { activeRole } = useAuth();

  const visibleRoutes = ALL_MOBILE_ROUTES
    .filter((route) => hasPermission(activeRole, route.permission))
    .slice(0, 5); // Max 5 items on mobile bottom nav

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-surface-border bg-surface/95 px-2 backdrop-blur lg:hidden select-none">
      {visibleRoutes.map((route) => (
        <NavLink
          key={route.path}
          to={route.path}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center h-full min-h-[48px] py-1 text-xs font-medium transition-colors touch-manipulation',
              isActive
                ? 'text-brand font-semibold'
                : 'text-gray-400 hover:text-gray-200'
            )
          }
        >
          <route.icon className="h-5 w-5 mb-1" />
          <span className="text-[11px] leading-none">{route.name}</span>
        </NavLink>
      ))}
    </nav>
  );
};
