import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthContext';
import { OrganizationProvider } from '@/features/organization/OrganizationContext';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';

// Lazy-loaded routes
const DashboardScreen = lazy(() =>
  import('@/features/dashboard/DashboardScreen').then((m) => ({
    default: m.DashboardScreen,
  }))
);
const PosScreen = lazy(() =>
  import('@/features/pos/PosScreen').then((m) => ({
    default: m.PosScreen,
  }))
);
const InventoryScreen = lazy(() =>
  import('@/features/inventory/InventoryScreen').then((m) => ({
    default: m.InventoryScreen,
  }))
);
const KitchenScreen = lazy(() =>
  import('@/features/kitchen/KitchenScreen').then((m) => ({
    default: m.KitchenScreen,
  }))
);
const FinancialsScreen = lazy(() =>
  import('@/features/financials/FinancialsScreen').then((m) => ({
    default: m.FinancialsScreen,
  }))
);
const LoginScreen = lazy(() =>
  import('@/features/auth/LoginScreen').then((m) => ({
    default: m.LoginScreen,
  }))
);
const PublicMenuScreen = lazy(() =>
  import('@/features/public-menu/PublicMenuScreen').then((m) => ({
    default: m.PublicMenuScreen,
  }))
);

// Loading Fallback
const RouteLoadingFallback: React.FC = () => (
  <div className="flex h-64 w-full items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      <span className="text-xs text-gray-400 font-medium">Loading interface...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrganizationProvider>
          <Routes>
            {/* Public Digital Menu Routes (No Auth Required) */}
            <Route
              path="/menu"
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <PublicMenuScreen />
                </Suspense>
              }
            />
            <Route
              path="/menu/:slug"
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <PublicMenuScreen />
                </Suspense>
              }
            />

            {/* Public Auth Route */}
            <Route
              path="/login"
              element={
                <Suspense fallback={<RouteLoadingFallback />}>
                  <LoginScreen />
                </Suspense>
              }
            />

            {/* Protected Multi-Tenant Operational Shell */}
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route
                path="/"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <DashboardScreen />
                  </Suspense>
                }
              />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route
                path="/pos"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <PosScreen />
                  </Suspense>
                }
              />
              <Route
                path="/kitchen"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <KitchenScreen />
                  </Suspense>
                }
              />
              <Route path="/kds" element={<Navigate to="/kitchen" replace />} />
              <Route
                path="/inventory"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <InventoryScreen />
                  </Suspense>
                }
              />
              <Route
                path="/financials"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <FinancialsScreen />
                  </Suspense>
                }
              />
              <Route path="/reports" element={<Navigate to="/financials" replace />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </OrganizationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
