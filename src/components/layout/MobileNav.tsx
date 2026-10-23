import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, Boxes, ReceiptText } from 'lucide-react';
import { cn } from '@/lib/cn';

export const MobileNav: React.FC = () => {
  const routes = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'POS', path: '/pos', icon: UtensilsCrossed },
    { name: 'Inventory', path: '/inventory', icon: Boxes },
    { name: 'Financials', path: '/financials', icon: ReceiptText },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-surface-border bg-surface/95 px-2 backdrop-blur lg:hidden select-none">
      {routes.map((route) => (
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
