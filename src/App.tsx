import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, AdminRoute, BackOfficeRoute } from "@/components/ProtectedRoute";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { SessionTimeoutDialog } from "@/components/SessionTimeoutDialog";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
// Import the bot component
import { SystemGuideBot } from "@/components/SystemGuideBot";

import Landing from "./pages/Landing";
import StockOrder from "./pages/StockOrder";
import AssetManagement from "./pages/AssetManagement";
import StockCounts from "./pages/StockCountsNew";
import StockCountsCart from "./pages/StockCountsCart";
import StockCountsReport from "./pages/StockCountsReport";
import ExceptionsReport from "./pages/ExceptionsReport";
import Tracking from "./pages/Tracking";
import PointOfPresence from "./pages/PointOfPresence";
import StockAlerts from "./pages/StockAlerts";
import PickingQueue from "./pages/PickingQueue";
import PickingCart from "./pages/PickingCartNew";
import DispatchQueue from "./pages/DispatchQueue";
import DispatchCart from "./pages/DispatchCart";
import SupabaseTest from "./pages/SupabaseTest";
import UserManagement from "./pages/UserManagement";
import KPIDashboard from "./pages/KPIDashboard";
import StockIngestion from "./pages/StockIngestion";
import StockAdmin from "./pages/StockAdmin";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import "./App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      networkMode: 'offlineFirst',
    },
  },
});

// Persist cache to localStorage
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: '4d-inventory-cache',
});

function AppContent() {
  // Session timeout: 30 minutes of inactivity with 2-minute warning
  const { showWarning, timeRemaining, extendSession, logout } = useSessionTimeout({
    timeout: 30 * 60 * 1000, // 30 minutes
    warningTime: 2 * 60 * 1000, // 2 minutes warning
    enabled: true,
  });

  // Global keyboard shortcuts
  useKeyboardShortcuts({ enabled: true });

  return (
    <>
      <Toaster />
      <Sonner />
      <OfflineIndicator />
      <SessionTimeoutDialog
        open={showWarning}
        timeRemaining={timeRemaining}
        onExtend={extendSession}
        onLogout={logout}
      />
      <BrowserRouter>
        <Routes>
          {/* Public routes - No authentication required */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Landing page - Protected (requires authentication) */}
          <Route path="/" element={<ProtectedRoute><Landing /></ProtectedRoute>} />

          {/* General authenticated routes - All approved users */}
          <Route path="/stock-order" element={<ProtectedRoute><StockOrder /></ProtectedRoute>} />
          <Route path="/asset-management" element={<ProtectedRoute><AssetManagement /></ProtectedRoute>} />
          <Route path="/stock-counts" element={<ProtectedRoute><StockCounts /></ProtectedRoute>} />
          <Route path="/stock-counts-cart" element={<ProtectedRoute><StockCountsCart /></ProtectedRoute>} />
          <Route path="/stock-counts-report" element={<ProtectedRoute><StockCountsReport /></ProtectedRoute>} />
          <Route path="/tracking" element={<ProtectedRoute><Tracking /></ProtectedRoute>} />
          <Route path="/point-of-presence" element={<ProtectedRoute><PointOfPresence /></ProtectedRoute>} />

          {/* Back Office routes - Back office users and admins only */}
          <Route path="/stock-ingestion" element={<BackOfficeRoute><StockIngestion /></BackOfficeRoute>} />
          <Route path="/stock-admin" element={<BackOfficeRoute><StockAdmin /></BackOfficeRoute>} />
          <Route path="/exceptions-report" element={<BackOfficeRoute><ExceptionsReport /></BackOfficeRoute>} />
          <Route path="/stock-alerts" element={<BackOfficeRoute><StockAlerts /></BackOfficeRoute>} />
          <Route path="/picking" element={<BackOfficeRoute><PickingQueue /></BackOfficeRoute>} />
          <Route path="/picking/cart/:recordId" element={<BackOfficeRoute><PickingCart /></BackOfficeRoute>} />
          <Route path="/dispatching" element={<BackOfficeRoute><DispatchQueue /></BackOfficeRoute>} />
          <Route path="/dispatching/cart/:recordId" element={<BackOfficeRoute><DispatchCart /></BackOfficeRoute>} />
          <Route path="/kpi" element={<BackOfficeRoute><KPIDashboard /></BackOfficeRoute>} />

          {/* Admin routes - Admins only */}
          <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
          <Route path="/supabase-test" element={<AdminRoute><SupabaseTest /></AdminRoute>} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        {/* Chatbot added here - safe inside BrowserRouter */}
        <SystemGuideBot />
        
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister }}
  >
    <AuthProvider>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;