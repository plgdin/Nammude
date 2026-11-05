import { MembershipRole } from '@/types/database.types';

/**
 * Module-level permission keys used throughout the app.
 * Each key maps to a sidebar route / feature area.
 */
export const PERMISSIONS = {
  DASHBOARD: 'dashboard',
  POS: 'pos',
  KITCHEN: 'kitchen',
  INVENTORY: 'inventory',
  FINANCIALS: 'financials',
  DOCUMENTS: 'documents',
  CHECKLISTS: 'checklists',
  CUSTOMERS: 'customers',
  ONBOARDING: 'onboarding',
  SETTINGS: 'settings',
  PLATFORM_ADMIN: 'platform_admin',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Role → permitted modules map.
 * '*' means all permissions (superadmin / platform_admin).
 */
const ROLE_PERMISSIONS: Record<MembershipRole, readonly Permission[] | '*'> = {
  platform_admin: '*',
  owner: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.POS,
    PERMISSIONS.KITCHEN,
    PERMISSIONS.INVENTORY,
    PERMISSIONS.FINANCIALS,
    PERMISSIONS.DOCUMENTS,
    PERMISSIONS.CHECKLISTS,
    PERMISSIONS.CUSTOMERS,
    PERMISSIONS.ONBOARDING,
    PERMISSIONS.SETTINGS,
  ],
  general_manager: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.POS,
    PERMISSIONS.KITCHEN,
    PERMISSIONS.INVENTORY,
    PERMISSIONS.FINANCIALS,
    PERMISSIONS.DOCUMENTS,
    PERMISSIONS.CHECKLISTS,
    PERMISSIONS.CUSTOMERS,
    PERMISSIONS.SETTINGS,
  ],
  branch_manager: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.POS,
    PERMISSIONS.KITCHEN,
    PERMISSIONS.INVENTORY,
    PERMISSIONS.FINANCIALS,
    PERMISSIONS.CHECKLISTS,
    PERMISSIONS.CUSTOMERS,
  ],
  cashier: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.POS,
  ],
  kitchen: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.KITCHEN,
  ],
  inventory: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.INVENTORY,
  ],
  auditor: [
    PERMISSIONS.DASHBOARD,
    PERMISSIONS.FINANCIALS,
    PERMISSIONS.DOCUMENTS,
  ],
};

/** Check if a role has a given permission */
export function hasPermission(role: MembershipRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (perms === '*') return true;
  return perms.includes(permission);
}

/** Check if a role has ALL of the given permissions */
export function hasAllPermissions(role: MembershipRole | undefined | null, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/** Check if a role has ANY of the given permissions */
export function hasAnyPermission(role: MembershipRole | undefined | null, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/** Get all permissions for a role */
export function getPermissionsForRole(role: MembershipRole): readonly Permission[] | '*' {
  return ROLE_PERMISSIONS[role];
}

/**
 * Route → required permission mapping for sidebar filtering + route guards.
 */
export const ROUTE_PERMISSION_MAP: Record<string, Permission> = {
  '/': PERMISSIONS.DASHBOARD,
  '/dashboard': PERMISSIONS.DASHBOARD,
  '/pos': PERMISSIONS.POS,
  '/kitchen': PERMISSIONS.KITCHEN,
  '/kds': PERMISSIONS.KITCHEN,
  '/inventory': PERMISSIONS.INVENTORY,
  '/financials': PERMISSIONS.FINANCIALS,
  '/reports': PERMISSIONS.FINANCIALS,
  '/documents': PERMISSIONS.DOCUMENTS,
  '/ocr': PERMISSIONS.DOCUMENTS,
  '/checklists': PERMISSIONS.CHECKLISTS,
  '/customers': PERMISSIONS.CUSTOMERS,
  '/crm': PERMISSIONS.CUSTOMERS,
  '/onboarding': PERMISSIONS.ONBOARDING,
  '/settings': PERMISSIONS.SETTINGS,
  '/platform-admin': PERMISSIONS.PLATFORM_ADMIN,
};

/**
 * After login, redirect the user to the best landing page for their role.
 */
export function getDefaultRouteForRole(role: MembershipRole): string {
  switch (role) {
    case 'platform_admin':
      return '/platform-admin';
    case 'cashier':
      return '/pos';
    case 'kitchen':
      return '/kitchen';
    case 'inventory':
      return '/inventory';
    case 'auditor':
      return '/financials';
    default:
      return '/';
  }
}
