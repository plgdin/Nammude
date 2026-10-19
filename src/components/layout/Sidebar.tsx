import React from 'react';
import { NavLink } from 'react-router-dom';
import { currentTenant } from '@/config/tenant.config';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Boxes,
  CookingPot,
  ReceiptText,
  ScanText,
  Coffee,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export const Sidebar: React.FC = () => {
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
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-surface-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-fg shadow">
          <Coffee className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">{currentTenant.name}</h2>
          <p className="text-[11px] text-gray-400 font-medium">{currentTenant.tagline}</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex flex-1 flex-col justify-between p-4 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Phase 2 Active Screens
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
              M
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">Marco S.</p>
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Cashier • Shift Active
              </p>
            </div>
            <ShieldCheck className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>
    </aside>
  );
};
