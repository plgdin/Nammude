import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';

// Lazy-loaded route chunks for minimal initial bundle
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

// Loading Skeleton
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
      <Routes>
        <Route element={<AppShell />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <DashboardScreen />
              </Suspense>
            }
          />
          <Route
            path="/dashboard"
            element={<Navigate to="/" replace />}
          />
          <Route
            path="/pos"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <PosScreen />
              </Suspense>
            }
          />
          <Route
            path="/inventory"
            element={
              <Suspense fallback={<RouteLoadingFallback />}>
                <InventoryScreen />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
