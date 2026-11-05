import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Permission, hasPermission, ROUTE_PERMISSION_MAP } from '@/lib/permissions';
import { ShieldX } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const { isAuthenticated, isLoading, activeRole, isPlatformAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span className="text-xs text-gray-400 font-medium tracking-wide">
            Verifying security session...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Platform SuperAdmin has platform-wide access to all routes
  if (isPlatformAdmin) {
    return <>{children}</>;
  }

  // Check route-level permission from map if no explicit prop passed
  const permToCheck = requiredPermission || ROUTE_PERMISSION_MAP[location.pathname];

  if (permToCheck && !hasPermission(activeRole, permToCheck)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
};

/** Inline access denied screen – no redirect, just a clear message */
const AccessDenied: React.FC = () => (
  <div className="flex h-screen w-full items-center justify-center bg-canvas">
    <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
      <div className="h-16 w-16 rounded-2xl bg-rose-950/60 border border-rose-800/40 flex items-center justify-center">
        <ShieldX className="h-8 w-8 text-rose-400" />
      </div>
      <h2 className="text-xl font-bold text-white">Access Restricted</h2>
      <p className="text-sm text-gray-400">
        Your current role doesn't have permission to access this section. Contact your restaurant admin to request access.
      </p>
      <a
        href="/"
        className="mt-2 px-5 py-2.5 rounded-xl bg-brand text-brand-fg text-sm font-semibold hover:opacity-90 transition"
      >
        Back to Dashboard
      </a>
    </div>
  </div>
);
