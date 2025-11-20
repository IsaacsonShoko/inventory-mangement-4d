import { useMemo, useState } from 'react';
import { format, parseISO, differenceInHours, differenceInDays, isAfter, setHours, setMinutes } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Menu,
  TrendingUp,
  Clock,
  Package,
  Truck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  MapPin,
  RefreshCcw,
  Loader2,
  Home as HomeIcon,
  BarChart3,
  Timer,
  Target,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { useUniqueOrders, usePickingQueue, useDispatchQueue } from '@/hooks/useSupabase';
import { supabase } from '@/integrations/supabase/client';
import type { UniqueOrder, StockOrder, DispatchLog } from '@/integrations/supabase/services';
import ThemeToggle from '@/components/theme-toggle';

// SLA Configuration
const SLA_CONFIG = {
  beforeNoonSameDay: 12, // Orders before 12 PM must be picked/dispatched same day
  afterNoonNextDay3PM: 15, // Orders after 12 PM must be done by 3 PM next day
};

// Helper functions
const calculateCycleTime = (startDate?: string, endDate?: string): number | null => {
  if (!startDate || !endDate) return null;
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return differenceInHours(end, start);
  } catch {
    return null;
  }
};

const isOrderSLABreached = (order: UniqueOrder): boolean => {
  if (!order.date_ordered) return false;
  if (order.dispatch_status === 'Dispatched') return false;

  try {
    const orderDate = parseISO(order.date_ordered);
    const orderHour = orderDate.getHours();
    const now = new Date();

    if (orderHour < 12) {
      // Before noon - should be done same day
      const deadline = setHours(setMinutes(orderDate, 0), 23);
      return isAfter(now, deadline);
    } else {
      // After noon - should be done by 3 PM next day
      const nextDay = new Date(orderDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const deadline = setHours(setMinutes(nextDay, 0), 15);
      return isAfter(now, deadline);
    }
  } catch {
    return false;
  }
};

const getAgingBucket = (dateOrdered?: string): string => {
  if (!dateOrdered) return 'Unknown';
  try {
    const orderDate = parseISO(dateOrdered);
    const hoursAged = differenceInHours(new Date(), orderDate);
    if (hoursAged < 24) return '< 24h';
    if (hoursAged < 48) return '24-48h';
    if (hoursAged < 72) return '48-72h';
    return '> 72h';
  } catch {
    return 'Unknown';
  }
};

const KPIDashboard = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch all data
  const { data: allOrders = [], isLoading: ordersLoading, refetch: refetchOrders, isFetching: ordersFetching } = useUniqueOrders();

  // Fetch all stock orders
  const { data: stockOrders = [], isLoading: stockLoading } = useQuery({
    queryKey: ['allStockOrders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_order')
        .select('*')
        .order('date_ordered', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  // Fetch all dispatch logs
  const { data: dispatchLogs = [], isLoading: dispatchLoading } = useQuery({
    queryKey: ['allDispatchLogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispatch_log')
        .select('*')
        .order('date_dispatched', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  const { data: pickingQueue = [], isLoading: pickingLoading } = usePickingQueue();
  const { data: dispatchQueue = [], isLoading: dispatchQueueLoading } = useDispatchQueue();

  const isLoading = ordersLoading || stockLoading || dispatchLoading || pickingLoading || dispatchQueueLoading;
  const isFetching = ordersFetching;

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!allOrders.length) return null;

    // Order Lifecycle KPIs
    const totalOrders = allOrders.length;
    const dispatchedOrders = allOrders.filter(o => o.dispatch_status === 'Dispatched').length;
    const partialOrders = allOrders.filter(o => o.dispatch_status === 'Partial').length;
    const pendingOrders = allOrders.filter(o => o.dispatch_status === 'Pending').length;
    const cancelledOrders = allOrders.filter(o => o.dispatch_status === 'Cancelled').length;

    const fulfillmentRate = totalOrders > 0 ? (dispatchedOrders / totalOrders) * 100 : 0;
    const partialFulfillmentRate = totalOrders > 0 ? (partialOrders / totalOrders) * 100 : 0;
    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

    // Cycle times (using dispatch logs)
    const cycleTimesHours = dispatchLogs
      .map(log => {
        const order = allOrders.find(o => o.order_id === log.order_id);
        return calculateCycleTime(order?.date_ordered, log.date_dispatched);
      })
      .filter((ct): ct is number => ct !== null);

    const avgCycleTime = cycleTimesHours.length > 0
      ? cycleTimesHours.reduce((a, b) => a + b, 0) / cycleTimesHours.length
      : 0;

    // Stock Availability KPIs
    const stockAvailable = allOrders.filter(o => o.stock_availability === 'Available').length;
    const stockNotAvailable = allOrders.filter(o => o.stock_availability === 'Not Available').length;
    const stockBackordered = allOrders.filter(o => o.stock_availability === 'Backordered').length;
    const stockPartial = allOrders.filter(o => o.stock_availability === 'Partial').length;

    const stockOutRate = totalOrders > 0 ? (stockNotAvailable / totalOrders) * 100 : 0;
    const backorderRate = totalOrders > 0 ? (stockBackordered / totalOrders) * 100 : 0;
    const fillRate = totalOrders > 0 ? (stockAvailable / totalOrders) * 100 : 0;

    // Pick Status KPIs
    const pickedOrders = allOrders.filter(o => o.pick_status === 'Picked').length;
    const pendingPick = allOrders.filter(o => o.pick_status === 'Pending').length;
    const partiallyPicked = allOrders.filter(o => o.pick_status === 'Partially Picked').length;
    const notPicked = allOrders.filter(o => o.pick_status === 'Not Picked').length;

    // Regional Distribution
    const ordersByRegion = allOrders.reduce((acc, order) => {
      const region = order.region || 'Unknown';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Category Distribution
    const ordersByCategory = allOrders.reduce((acc, order) => {
      const category = order.item_category || 'Unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Dispatch Method Distribution
    const ordersByDispatchMethod = allOrders.reduce((acc, order) => {
      const method = order.dispatch_method || 'Not Set';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Contractor Performance
    const ordersByContractor = allOrders.reduce((acc, order) => {
      const contractor = order.contractor_company || 'Unknown';
      acc[contractor] = (acc[contractor] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Pipeline & Aging
    const agingBuckets = allOrders
      .filter(o => o.dispatch_status !== 'Dispatched' && o.dispatch_status !== 'Cancelled')
      .reduce((acc, order) => {
        const bucket = getAgingBucket(order.date_ordered);
        acc[bucket] = (acc[bucket] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // SLA Breaches
    const slaBreaches = allOrders.filter(isOrderSLABreached).length;
    const slaComplianceRate = pendingOrders > 0
      ? ((pendingOrders - slaBreaches) / pendingOrders) * 100
      : 100;

    // Total quantities
    const totalUnitsOrdered = allOrders.reduce((sum, o) => sum + (o.quantity_ordered || 0), 0);
    const totalUnitsDispatched = dispatchLogs.reduce((sum, l) => sum + (l.quantity || 0), 0);

    // Warehouse performance
    const ordersByWarehouse = allOrders.reduce((acc, order) => {
      const warehouse = order.warehouse_fulfilling || 'Not Assigned';
      acc[warehouse] = (acc[warehouse] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      // Summary
      totalOrders,
      totalUnitsOrdered,
      totalUnitsDispatched,

      // Lifecycle
      dispatchedOrders,
      partialOrders,
      pendingOrders,
      cancelledOrders,
      fulfillmentRate,
      partialFulfillmentRate,
      cancellationRate,
      avgCycleTime,

      // Stock
      stockAvailable,
      stockNotAvailable,
      stockBackordered,
      stockPartial,
      stockOutRate,
      backorderRate,
      fillRate,

      // Pick
      pickedOrders,
      pendingPick,
      partiallyPicked,
      notPicked,

      // Distributions
      ordersByRegion,
      ordersByCategory,
      ordersByDispatchMethod,
      ordersByContractor,
      ordersByWarehouse,

      // Pipeline
      agingBuckets,
      slaBreaches,
      slaComplianceRate,
      pickingQueueDepth: pickingQueue.length,
      dispatchQueueDepth: dispatchQueue.length,
    };
  }, [allOrders, dispatchLogs, pickingQueue, dispatchQueue]);

  const handleRefresh = () => {
    refetchOrders();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading KPI Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex h-14 items-center px-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-4">
                <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <HomeIcon className="mr-2 h-4 w-4" />
                    Home
                  </Button>
                </Link>
                <Link to="/stock-order" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <Package className="mr-2 h-4 w-4" />
                    New Order
                  </Button>
                </Link>
                <Link to="/picking" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <Package className="mr-2 h-4 w-4" />
                    Picking Queue
                  </Button>
                </Link>
                <Link to="/dispatch" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <Truck className="mr-2 h-4 w-4" />
                    Dispatch Queue
                  </Button>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 ml-2 md:ml-0">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-lg">KPI Dashboard</h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <ThemeToggle />
            <Link to="/">
              <Button variant="ghost" size="icon">
                <HomeIcon className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6">
        {!kpis ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No data available</p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics Row */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis.totalOrders}</div>
                    <p className="text-xs text-muted-foreground">
                      {kpis.totalUnitsOrdered} units ordered
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Fulfillment Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis.fulfillmentRate.toFixed(1)}%</div>
                    <Progress value={kpis.fulfillmentRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Cycle Time</CardTitle>
                    <Timer className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {kpis.avgCycleTime > 24
                        ? `${(kpis.avgCycleTime / 24).toFixed(1)}d`
                        : `${kpis.avgCycleTime.toFixed(0)}h`}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Order to dispatch
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${kpis.slaComplianceRate < 80 ? 'text-red-500' : kpis.slaComplianceRate < 95 ? 'text-amber-500' : 'text-green-500'}`}>
                      {kpis.slaComplianceRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {kpis.slaBreaches} breach{kpis.slaBreaches !== 1 ? 'es' : ''}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Status Breakdown */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Status</CardTitle>
                    <CardDescription>Current status breakdown</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Dispatched</span>
                      </div>
                      <span className="font-medium">{kpis.dispatchedOrders}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-sm">Pending</span>
                      </div>
                      <span className="font-medium">{kpis.pendingOrders}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">Partial</span>
                      </div>
                      <span className="font-medium">{kpis.partialOrders}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm">Cancelled</span>
                      </div>
                      <span className="font-medium">{kpis.cancelledOrders}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Stock Availability</CardTitle>
                    <CardDescription>Current stock status</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Available</span>
                      </div>
                      <span className="font-medium">{kpis.stockAvailable}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm">Not Available</span>
                      </div>
                      <span className="font-medium">{kpis.stockNotAvailable}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-sm">Backordered</span>
                      </div>
                      <span className="font-medium">{kpis.stockBackordered}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">Partial</span>
                      </div>
                      <span className="font-medium">{kpis.stockPartial}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Rates */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Fill Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-green-600">{kpis.fillRate.toFixed(1)}%</div>
                    <Progress value={kpis.fillRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Stock Out Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${kpis.stockOutRate > 10 ? 'text-red-600' : 'text-green-600'}`}>
                      {kpis.stockOutRate.toFixed(1)}%
                    </div>
                    <Progress value={kpis.stockOutRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Backorder Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${kpis.backorderRate > 5 ? 'text-amber-600' : 'text-green-600'}`}>
                      {kpis.backorderRate.toFixed(1)}%
                    </div>
                    <Progress value={kpis.backorderRate} className="mt-2" />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Pipeline Tab */}
            <TabsContent value="pipeline" className="space-y-6">
              {/* Queue Depths */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Picking Queue
                    </CardTitle>
                    <CardDescription>Orders waiting to be picked</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{kpis.pickingQueueDepth}</div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Pending Pick</span>
                        <span className="font-medium">{kpis.pendingPick}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Partially Picked</span>
                        <span className="font-medium">{kpis.partiallyPicked}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Not Picked</span>
                        <span className="font-medium">{kpis.notPicked}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Dispatch Queue
                    </CardTitle>
                    <CardDescription>Orders ready for dispatch</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{kpis.dispatchQueueDepth}</div>
                    <div className="mt-4">
                      <Link to="/dispatch">
                        <Button variant="outline" size="sm" className="w-full">
                          View Dispatch Queue
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Aging Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Order Aging (Pending Orders)
                  </CardTitle>
                  <CardDescription>
                    Orders not yet dispatched, grouped by age
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    {['< 24h', '24-48h', '48-72h', '> 72h'].map((bucket) => (
                      <div key={bucket} className="text-center p-4 rounded-lg bg-muted">
                        <div className={`text-2xl font-bold ${
                          bucket === '> 72h' ? 'text-red-500' :
                          bucket === '48-72h' ? 'text-orange-500' :
                          bucket === '24-48h' ? 'text-amber-500' :
                          'text-green-500'
                        }`}>
                          {kpis.agingBuckets[bucket] || 0}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">{bucket}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* SLA Alerts */}
              {kpis.slaBreaches > 0 && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      SLA Breaches
                    </CardTitle>
                    <CardDescription>
                      Orders past their SLA deadline
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{kpis.slaBreaches} orders</div>
                    <p className="text-sm text-muted-foreground mt-2">
                      SLA: Orders before 12 PM same day, after 12 PM by 3 PM next day
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Pick Status</CardTitle>
                    <CardDescription>Order picking performance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Picked</span>
                      <div className="flex items-center gap-2">
                        <Progress value={(kpis.pickedOrders / kpis.totalOrders) * 100} className="w-24" />
                        <span className="font-medium w-12 text-right">{kpis.pickedOrders}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pending</span>
                      <div className="flex items-center gap-2">
                        <Progress value={(kpis.pendingPick / kpis.totalOrders) * 100} className="w-24" />
                        <span className="font-medium w-12 text-right">{kpis.pendingPick}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Partially Picked</span>
                      <div className="flex items-center gap-2">
                        <Progress value={(kpis.partiallyPicked / kpis.totalOrders) * 100} className="w-24" />
                        <span className="font-medium w-12 text-right">{kpis.partiallyPicked}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Dispatch Performance</CardTitle>
                    <CardDescription>Dispatch completion metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Dispatched</span>
                      <span className="font-medium">{kpis.dispatchedOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Units Dispatched</span>
                      <span className="font-medium">{kpis.totalUnitsDispatched}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Partial Fulfillment Rate</span>
                      <span className={`font-medium ${kpis.partialFulfillmentRate > 10 ? 'text-amber-600' : ''}`}>
                        {kpis.partialFulfillmentRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cancellation Rate</span>
                      <span className={`font-medium ${kpis.cancellationRate > 5 ? 'text-red-600' : ''}`}>
                        {kpis.cancellationRate.toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Distribution Tab */}
            <TabsContent value="distribution" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {/* By Region */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Orders by Region
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(kpis.ordersByRegion)
                        .sort(([,a], [,b]) => b - a)
                        .map(([region, count]) => (
                          <div key={region} className="flex items-center justify-between">
                            <span className="text-sm truncate">{region}</span>
                            <div className="flex items-center gap-2">
                              <Progress value={(count / kpis.totalOrders) * 100} className="w-20" />
                              <span className="font-medium w-8 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* By Category */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Orders by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(kpis.ordersByCategory)
                        .sort(([,a], [,b]) => b - a)
                        .map(([category, count]) => (
                          <div key={category} className="flex items-center justify-between">
                            <span className="text-sm truncate">{category}</span>
                            <div className="flex items-center gap-2">
                              <Progress value={(count / kpis.totalOrders) * 100} className="w-20" />
                              <span className="font-medium w-8 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* By Dispatch Method */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Dispatch Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(kpis.ordersByDispatchMethod)
                        .sort(([,a], [,b]) => b - a)
                        .map(([method, count]) => (
                          <div key={method} className="flex items-center justify-between">
                            <span className="text-sm">{method}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* By Contractor */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Orders by Contractor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(kpis.ordersByContractor)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([contractor, count]) => (
                          <div key={contractor} className="flex items-center justify-between">
                            <span className="text-sm truncate">{contractor}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Warehouse Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Warehouse Distribution</CardTitle>
                  <CardDescription>Orders by fulfilling warehouse</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {Object.entries(kpis.ordersByWarehouse)
                      .sort(([,a], [,b]) => b - a)
                      .map(([warehouse, count]) => (
                        <div key={warehouse} className="text-center p-4 rounded-lg bg-muted">
                          <div className="text-xl font-bold">{count}</div>
                          <div className="text-sm text-muted-foreground mt-1">{warehouse}</div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default KPIDashboard;
