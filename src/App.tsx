import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import StockOrder from "./pages/StockOrder";
import AssetManagement from "./pages/AssetManagement";
import StockCounts from "./pages/StockCounts";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/stock-order" element={<StockOrder />} />
          <Route path="/asset-management" element={<AssetManagement />} />
          <Route path="/stock-counts" element={<StockCounts />} />
          <Route path="/stock-counts-report" element={<StockCountsReport />} />
          <Route path="/exceptions-report" element={<ExceptionsReport />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/point-of-presence" element={<PointOfPresence />} />
          <Route path="/stock-alerts" element={<StockAlerts />} />
          <Route path="/picking" element={<PickingQueue />} />
          <Route path="/picking/cart/:recordId" element={<PickingCart />} />
          <Route path="/dispatching" element={<DispatchQueue />} />
          <Route path="/dispatching/cart/:recordId" element={<DispatchCart />} />
          <Route path="/supabase-test" element={<SupabaseTest />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
