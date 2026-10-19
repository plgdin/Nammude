import React from 'react';
import { currentTenant, BranchConfig } from '@/config/tenant.config';
import { Store, ChevronDown, Bell, CheckCircle2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface HeaderProps {
  title: string;
  subtitle?: string;
  selectedBranch: BranchConfig;
  onSelectBranch: (branch: BranchConfig) => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  selectedBranch,
  onSelectBranch,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-surface-border bg-surface/95 px-4 sm:px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden xs:block text-xs text-gray-400 leading-none mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Prototype Indicator Badge */}
        <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-950/80 text-blue-400 border border-blue-800/60">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          Prototype Demo State
        </span>

        {/* Branch Selector Dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-elevated px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-surface-active hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
              aria-label="Select Restaurant Branch"
            >
              <Store className="h-3.5 w-3.5 text-brand" />
              <span className="max-w-[120px] sm:max-w-[160px] truncate">{selectedBranch.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[200px] overflow-hidden rounded-xl border border-surface-border bg-surface p-1.5 shadow-xl animate-in fade-in-50"
              align="end"
              sideOffset={5}
            >
              <DropdownMenu.Label className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Switch Organization Branch
              </DropdownMenu.Label>
              {currentTenant.branches.map((branch) => (
                <DropdownMenu.Item
                  key={branch.id}
                  onClick={() => onSelectBranch(branch)}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs text-gray-200 cursor-pointer hover:bg-surface-elevated hover:text-white focus:bg-surface-elevated focus:outline-none"
                >
                  <div>
                    <p className="font-medium">{branch.name}</p>
                    <p className="text-[10px] text-gray-400">{branch.code} • {branch.address}</p>
                  </div>
                  {branch.id === selectedBranch.id && (
                    <CheckCircle2 className="h-4 w-4 text-brand" />
                  )}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Notifications Icon Button */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-elevated text-gray-300 hover:bg-surface-active hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
          aria-label="View notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand" />
        </button>
      </div>
    </header>
  );
};
