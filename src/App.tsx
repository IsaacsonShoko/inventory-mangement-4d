import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AdminRoute } from "@/components/ProtectedRoute";
import { OfflineIndicator } from "@/components/OfflineIndicator";
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
import NotFound from "./pages/NotFound";

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

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{ persister }}
  >
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineIndicator />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/stock-order" element={<StockOrder />} />
            <Route path="/asset-management" element={<AssetManagement />} />
            <Route path="/stock-ingestion" element={<StockIngestion />} />
            <Route path="/stock-admin" element={<StockAdmin />} />
            <Route path="/stock-counts" element={<StockCounts />} />
            <Route path="/stock-counts-cart" element={<StockCountsCart />} />
            <Route path="/stock-counts-report" element={<StockCountsReport />} />
            <Route path="/exceptions-report" element={<ExceptionsReport />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/point-of-presence" element={<PointOfPresence />} />
            <Route path="/stock-alerts" element={<StockAlerts />} />
            <Route path="/picking" element={<PickingQueue />} />
            <Route path="/picking/cart/:recordId" element={<PickingCart />} />
            <Route path="/dispatching" element={<DispatchQueue />} />
            <Route path="/dispatching/cart/:recordId" element={<DispatchCart />} />
            <Route path="/kpi" element={<KPIDashboard />} />
            <Route path="/supabase-test" element={<SupabaseTest />} />
            <Route path="/admin/users" element={
              <AdminRoute>
                <UserManagement />
              </AdminRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;
