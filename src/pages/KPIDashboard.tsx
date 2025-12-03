import { useMemo, useState, useEffect } from 'react';
import { format, parseISO, differenceInHours, differenceInDays, isAfter, setHours, setMinutes, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
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
  Calendar,
  Filter,
  Wrench,
  ThumbsUp,
  Bell,
  PackageX,
  TrendingDown,
  Activity,
  Bot,
  MessageCircle,
  Star,
  ThumbsDown,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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

// OpenAI Pricing (USD per 1K tokens)
const OPENAI_PRICING = {
  embedding: 0.00002, // text-embedding-3-small
  chatInput: 0.00015, // gpt-4o-mini input
  chatOutput: 0.00060, // gpt-4o-mini output
};

// Currency Exchange Rate Configuration
const EXCHANGE_RATE_API_KEY = '8067d57debaf72cd1e990b62';
const EXCHANGE_RATE_CACHE_KEY = 'usd-zar-exchange-rate';
const EXCHANGE_RATE_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const DEFAULT_USD_TO_ZAR = 18.5; // Fallback rate if API fails

// Fetch USD/ZAR exchange rate from API
async function fetchExchangeRate(): Promise<number> {
  try {
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/USD`);
    if (!response.ok) throw new Error('Exchange rate API request failed');

    const data = await response.json();
    if (data.result === 'success' && data.conversion_rates?.ZAR) {
      const rate = data.conversion_rates.ZAR;

      // Cache the rate with timestamp
      localStorage.setItem(EXCHANGE_RATE_CACHE_KEY, JSON.stringify({
        rate,
        timestamp: Date.now()
      }));

      console.log(`USD/ZAR rate updated: R${rate}`);
      return rate;
    }
    throw new Error('Invalid exchange rate data');
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
    return DEFAULT_USD_TO_ZAR;
  }
}

// Get USD/ZAR exchange rate (from cache or API)
async function getExchangeRate(): Promise<number> {
  try {
    const cached = localStorage.getItem(EXCHANGE_RATE_CACHE_KEY);
    if (cached) {
      const { rate, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      // Use cached rate if less than 7 days old
      if (age < EXCHANGE_RATE_CACHE_DURATION) {
        return rate;
      }
    }
  } catch (error) {
    console.error('Failed to read cached exchange rate:', error);
  }

  // Cache expired or invalid, fetch new rate
  return await fetchExchangeRate();
}

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

  // Date filter state
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth.toString());
  const [filterMode, setFilterMode] = useState<'all' | 'year' | 'month'>('all');

  // Business Line filter state
  const [selectedBusinessLine, setSelectedBusinessLine] = useState<string>('all');

  // Exchange rate state
  const [usdToZar, setUsdToZar] = useState<number>(DEFAULT_USD_TO_ZAR);
  const [exchangeRateLastUpdated, setExchangeRateLastUpdated] = useState<Date | null>(null);

  // Business Line options
  const businessLineOptions = ['Accessories', 'Absa', 'Cash Connect', 'Modems', 'Sim Management', 'VPS', 'Other'];

  // Generate year options (last 5 years)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = currentYear; i >= currentYear - 4; i--) {
      years.push(i.toString());
    }
    return years;
  }, [currentYear]);

  // Month options
  const monthOptions = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

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

  // Fetch stock levels for device condition analysis
  const { data: stockLevels = [], isLoading: stockLevelsLoading } = useQuery({
    queryKey: ['stockLevelsKPI'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_levels')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  // Fetch repair tickets for fault analysis
  const { data: repairTickets = [], isLoading: repairTicketsLoading } = useQuery({
    queryKey: ['repairTicketsKPI'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_tickets')
        .select('id, fault_category, status, created_at, device_id')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  // Fetch stock counts for exceptions analysis
  const { data: stockCounts = [], isLoading: stockCountsLoading } = useQuery({
    queryKey: ['stockCountsKPI'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_counts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  // Fetch device registry for exceptions cross-check
  const { data: deviceRegistry = [], isLoading: deviceRegistryLoading } = useQuery({
    queryKey: ['deviceRegistryKPI'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_registry')
        .select('serial_number')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  const { data: pickingQueue = [], isLoading: pickingLoading } = usePickingQueue();
  const { data: dispatchQueue = [], isLoading: dispatchQueueLoading } = useDispatchQueue();

  // Fetch bot usage logs for analytics
  const { data: botUsageLogs = [], isLoading: botLogsLoading } = useQuery({
    queryKey: ['botUsageLogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_usage_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  // Fetch exchange rate on mount
  useEffect(() => {
    const loadExchangeRate = async () => {
      const rate = await getExchangeRate();
      setUsdToZar(rate);

      // Get last updated timestamp from cache
      try {
        const cached = localStorage.getItem(EXCHANGE_RATE_CACHE_KEY);
        if (cached) {
          const { timestamp } = JSON.parse(cached);
          setExchangeRateLastUpdated(new Date(timestamp));
        }
      } catch (error) {
        console.error('Failed to read exchange rate timestamp:', error);
      }
    };

    loadExchangeRate();
  }, []);

  const isLoading = ordersLoading || stockLoading || dispatchLoading || stockLevelsLoading || pickingLoading || dispatchQueueLoading || repairTicketsLoading || stockCountsLoading || deviceRegistryLoading || botLogsLoading;
  const isFetching = ordersFetching;

  // Filter orders based on date selection AND business line
  const filteredOrders = useMemo(() => {
    let orders = allOrders;

    // Apply date filter
    if (filterMode !== 'all') {
      orders = orders.filter(order => {
        if (!order.date_ordered) return false;
        try {
          const orderDate = parseISO(order.date_ordered);
          const year = parseInt(selectedYear);
          const month = parseInt(selectedMonth);

          if (filterMode === 'year') {
            const yearStart = startOfYear(new Date(year, 0, 1));
            const yearEnd = endOfYear(new Date(year, 0, 1));
            return isWithinInterval(orderDate, { start: yearStart, end: yearEnd });
          } else if (filterMode === 'month') {
            const monthStart = startOfMonth(new Date(year, month - 1, 1));
            const monthEnd = endOfMonth(new Date(year, month - 1, 1));
            return isWithinInterval(orderDate, { start: monthStart, end: monthEnd });
          }
          return true;
        } catch {
          return false;
        }
      });
    }

    // Apply business line filter
    if (selectedBusinessLine !== 'all') {
      orders = orders.filter(order => order.item_category === selectedBusinessLine);
    }

    return orders;
  }, [allOrders, filterMode, selectedYear, selectedMonth, selectedBusinessLine]);

  // Filter dispatch logs based on date selection
  const filteredDispatchLogs = useMemo(() => {
    if (filterMode === 'all') return dispatchLogs;

    return dispatchLogs.filter(log => {
      if (!log.date_dispatched) return false;
      try {
        const dispatchDate = parseISO(log.date_dispatched);
        const year = parseInt(selectedYear);
        const month = parseInt(selectedMonth);

        if (filterMode === 'year') {
          const yearStart = startOfYear(new Date(year, 0, 1));
          const yearEnd = endOfYear(new Date(year, 0, 1));
          return isWithinInterval(dispatchDate, { start: yearStart, end: yearEnd });
        } else if (filterMode === 'month') {
          const monthStart = startOfMonth(new Date(year, month - 1, 1));
          const monthEnd = endOfMonth(new Date(year, month - 1, 1));
          return isWithinInterval(dispatchDate, { start: monthStart, end: monthEnd });
        }
        return true;
      } catch {
        return false;
      }
    });
  }, [dispatchLogs, filterMode, selectedYear, selectedMonth]);

  // Get filter description for display
  const filterDescription = useMemo(() => {
    if (filterMode === 'all') return 'All Time';
    if (filterMode === 'year') return selectedYear;
    if (filterMode === 'month') {
      const monthName = monthOptions.find(m => m.value === selectedMonth)?.label || '';
      return `${monthName} ${selectedYear}`;
    }
    return '';
  }, [filterMode, selectedYear, selectedMonth, monthOptions]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    // Order Lifecycle KPIs
    const totalOrders = filteredOrders.length;
    const dispatchedOrders = filteredOrders.filter(o => o.dispatch_status === 'Dispatched').length;
    const partialOrders = filteredOrders.filter(o => o.dispatch_status === 'Partial').length;
    const pendingOrders = filteredOrders.filter(o => o.dispatch_status === 'Pending').length;
    const cancelledOrders = filteredOrders.filter(o => o.dispatch_status === 'Cancelled').length;

    const fulfillmentRate = totalOrders > 0 ? (dispatchedOrders / totalOrders) * 100 : 0;
    const partialFulfillmentRate = totalOrders > 0 ? (partialOrders / totalOrders) * 100 : 0;
    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

    // Cycle times (using dispatch logs)
    const cycleTimesHours = filteredDispatchLogs
      .map(log => {
        const order = filteredOrders.find(o => o.order_id === log.order_id);
        return calculateCycleTime(order?.date_ordered, log.date_dispatched);
      })
      .filter((ct): ct is number => ct !== null);

    const avgCycleTime = cycleTimesHours.length > 0
      ? cycleTimesHours.reduce((a, b) => a + b, 0) / cycleTimesHours.length
      : 0;

    // Stock Availability KPIs
    const stockAvailable = filteredOrders.filter(o => o.stock_availability === 'Available').length;
    const stockNotAvailable = filteredOrders.filter(o => o.stock_availability === 'Not Available').length;
    const stockBackordered = filteredOrders.filter(o => o.stock_availability === 'Backordered').length;
    const stockPartial = filteredOrders.filter(o => o.stock_availability === 'Partial').length;

    const stockOutRate = totalOrders > 0 ? (stockNotAvailable / totalOrders) * 100 : 0;
    const backorderRate = totalOrders > 0 ? (stockBackordered / totalOrders) * 100 : 0;
    const fillRate = totalOrders > 0 ? (stockAvailable / totalOrders) * 100 : 0;

    // Pick Status KPIs
    const pickedOrders = filteredOrders.filter(o => o.pick_status === 'Picked').length;
    const pendingPick = filteredOrders.filter(o => o.pick_status === 'Pending').length;
    const partiallyPicked = filteredOrders.filter(o => o.pick_status === 'Partially Picked').length;
    const notPicked = filteredOrders.filter(o => o.pick_status === 'Not Picked').length;

    // Regional Distribution
    const ordersByRegion = filteredOrders.reduce((acc, order) => {
      const region = order.region || 'Unknown';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Category Distribution
    const ordersByCategory = filteredOrders.reduce((acc, order) => {
      const category = order.item_category || 'Unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Dispatch Method Distribution
    const ordersByDispatchMethod = filteredOrders.reduce((acc, order) => {
      const method = order.dispatch_method || 'Not Set';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Contractor Performance
    const ordersByContractor = filteredOrders.reduce((acc, order) => {
      const contractor = order.contractor_company || 'Unknown';
      acc[contractor] = (acc[contractor] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Pipeline & Aging
    const agingBuckets = filteredOrders
      .filter(o => o.dispatch_status !== 'Dispatched' && o.dispatch_status !== 'Cancelled')
      .reduce((acc, order) => {
        const bucket = getAgingBucket(order.date_ordered);
        acc[bucket] = (acc[bucket] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // SLA Breaches
    const slaBreaches = filteredOrders.filter(isOrderSLABreached).length;
    const slaComplianceRate = pendingOrders > 0
      ? ((pendingOrders - slaBreaches) / pendingOrders) * 100
      : 100;

    // Total quantities
    const totalUnitsOrdered = filteredOrders.reduce((sum, o) => sum + (o.quantity_ordered || 0), 0);
    const totalUnitsDispatched = filteredDispatchLogs.reduce((sum, l) => sum + (l.quantity || 0), 0);

    // Warehouse performance
    const ordersByWarehouse = filteredOrders.reduce((acc, order) => {
      const warehouse = order.warehouse_fulfilling || 'Not Assigned';
      acc[warehouse] = (acc[warehouse] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Device Condition Analysis (from stock_levels)
    const totalDevices = stockLevels.length;
    const functionalDevices = stockLevels.filter(s =>
      s.item_status !== 'Faulty' && s.overall_condition !== 'Faulty' && s.overall_condition !== 'Damaged'
    ).length;
    const faultyDevices = stockLevels.filter(s =>
      s.item_status === 'Faulty' || s.overall_condition === 'Faulty' || s.overall_condition === 'Damaged'
    ).length;

    // Device status breakdown
    const devicesByStatus = stockLevels.reduce((acc, item) => {
      const status = item.item_status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Device condition breakdown
    const devicesByCondition = stockLevels.reduce((acc, item) => {
      const condition = item.overall_condition || 'Unknown';
      acc[condition] = (acc[condition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Fault reasons breakdown (only for faulty devices)
    const faultReasons = stockLevels
      .filter(s => s.fault_reason)
      .reduce((acc, item) => {
        const reason = item.fault_reason || 'Unspecified';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Device health rate
    const deviceHealthRate = totalDevices > 0 ? (functionalDevices / totalDevices) * 100 : 100;

    // Stock Alerts - Aggregate by item_code and category/warehouse
    const stockAggregation = stockLevels.reduce((acc, item) => {
      const key = `${item.item_code || 'Unknown'}-${item.item_category || 'Unknown'}-${item.warehouse || 'Unknown'}`;
      if (!acc[key]) {
        acc[key] = {
          item_code: item.item_code || 'Unknown',
          item_category: item.item_category || 'Unknown',
          warehouse: item.warehouse || 'Unknown',
          quantity: 0,
        };
      }
      acc[key].quantity += 1;
      return acc;
    }, {} as Record<string, { item_code: string; item_category: string; warehouse: string; quantity: number }>);

    // Calculate velocity from dispatch logs for each item_code
    const velocityData = dispatchLogs.reduce((acc, log) => {
      const itemCode = log.item_code || 'Unknown';
      if (!acc[itemCode]) {
        acc[itemCode] = {
          totalDispatched: 0,
          firstDispatch: log.date_dispatched,
          lastDispatch: log.date_dispatched,
          dispatchCount: 0,
        };
      }
      acc[itemCode].totalDispatched += log.quantity || 1;
      acc[itemCode].dispatchCount += 1;

      // Track date range
      if (log.date_dispatched) {
        if (!acc[itemCode].firstDispatch || log.date_dispatched < acc[itemCode].firstDispatch) {
          acc[itemCode].firstDispatch = log.date_dispatched;
        }
        if (!acc[itemCode].lastDispatch || log.date_dispatched > acc[itemCode].lastDispatch) {
          acc[itemCode].lastDispatch = log.date_dispatched;
        }
      }
      return acc;
    }, {} as Record<string, { totalDispatched: number; firstDispatch: string | null; lastDispatch: string | null; dispatchCount: number }>);

    // Calculate alerts with velocity-based thresholds
    const stockAlerts = Object.values(stockAggregation).map((item) => {
      const velocityInfo = velocityData[item.item_code];

      // Calculate data maturity (days of history)
      let daysOfHistory = 0;
      let velocity = 0;
      let daysOfStock: number | null = null;
      let dataMaturity: 'manual' | 'learning' | 'stable' | 'forecast' = 'manual';
      let dataProgress = 0;

      if (velocityInfo && velocityInfo.firstDispatch && velocityInfo.lastDispatch) {
        try {
          const firstDate = parseISO(velocityInfo.firstDispatch);
          const lastDate = parseISO(velocityInfo.lastDispatch);
          const now = new Date();

          // Days since first dispatch
          daysOfHistory = differenceInDays(now, firstDate);

          // Calculate velocity (units per day)
          const dayRange = Math.max(1, differenceInDays(lastDate, firstDate) || 1);
          velocity = velocityInfo.totalDispatched / dayRange;

          // Calculate days of stock remaining
          if (velocity > 0) {
            daysOfStock = Math.round(item.quantity / velocity);
          }

          // Determine data maturity phase
          if (daysOfHistory >= 90) {
            dataMaturity = 'forecast';
            dataProgress = 100;
          } else if (daysOfHistory >= 30) {
            dataMaturity = 'stable';
            dataProgress = Math.round((daysOfHistory / 90) * 100);
          } else if (daysOfHistory >= 1) {
            dataMaturity = 'learning';
            dataProgress = Math.round((daysOfHistory / 30) * 100);
          } else {
            dataMaturity = 'manual';
            dataProgress = 0;
          }
        } catch {
          // Keep defaults if date parsing fails
        }
      }

      // Determine severity based on data maturity
      let severity: 'outOfStock' | 'critical' | 'warning' | 'ok' = 'ok';
      let alertMethod: 'static' | 'velocity' = 'static';

      if (item.quantity === 0) {
        severity = 'outOfStock';
      } else if (dataMaturity === 'stable' || dataMaturity === 'forecast') {
        // Use velocity-based thresholds when we have enough data
        alertMethod = 'velocity';
        if (daysOfStock !== null) {
          if (daysOfStock <= 3) {
            severity = 'critical';
          } else if (daysOfStock <= 7) {
            severity = 'warning';
          }
        }
      } else {
        // Fall back to static thresholds
        if (item.quantity <= 5) {
          severity = 'critical';
        } else if (item.quantity <= 10) {
          severity = 'warning';
        }
      }

      return {
        ...item,
        severity,
        velocity: Math.round(velocity * 10) / 10, // Round to 1 decimal
        daysOfStock,
        daysOfHistory,
        dataMaturity,
        dataProgress,
        alertMethod,
        dispatchCount: velocityInfo?.dispatchCount || 0,
      };
    }).filter(item => item.severity !== 'ok');

    const alertCounts = {
      outOfStock: stockAlerts.filter(a => a.severity === 'outOfStock').length,
      critical: stockAlerts.filter(a => a.severity === 'critical').length,
      warning: stockAlerts.filter(a => a.severity === 'warning').length,
      total: stockAlerts.length,
    };

    // Fault Analysis (from repair tickets)
    const faultsByCategory = repairTickets.reduce((acc, ticket) => {
      const category = ticket.fault_category || 'Unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalFaults = repairTickets.length;
    const activeFaults = repairTickets.filter(t =>
      ['Reported', 'Assessing', 'In-Repair', 'Quality-Check'].includes(t.status)
    ).length;
    const resolvedFaults = repairTickets.filter(t =>
      ['Repaired', 'Returned'].includes(t.status)
    ).length;

    // Business Line Breakdown (for comparison)
    const ordersByBusinessLine = filteredOrders.reduce((acc, order) => {
      const line = order.item_category || 'Unknown';
      if (!acc[line]) {
        acc[line] = { total: 0, dispatched: 0, pending: 0, fulfilled: 0 };
      }
      acc[line].total += 1;
      if (order.dispatch_status === 'Dispatched') {
        acc[line].dispatched += 1;
        acc[line].fulfilled += 1;
      } else if (order.dispatch_status === 'Pending') {
        acc[line].pending += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; dispatched: number; pending: number; fulfilled: number }>);

    // Stock by Business Line (from stock_levels)
    const stockByBusinessLine = stockLevels.reduce((acc, item) => {
      const line = item.item_category || 'Unknown';
      if (!acc[line]) {
        acc[line] = { total: 0, functional: 0, faulty: 0 };
      }
      acc[line].total += 1;
      if (item.item_status !== 'Faulty' && item.overall_condition !== 'Faulty' && item.overall_condition !== 'Damaged') {
        acc[line].functional += 1;
      } else {
        acc[line].faulty += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; functional: number; faulty: number }>);

    // Faults by Business Line (from repair tickets joined with device_registry)
    const faultsByBusinessLine = repairTickets.reduce((acc, ticket) => {
      // Note: We'd need device_id to join with device_registry to get business line
      // For now, we'll use a simplified approach
      const line = 'All Business Lines'; // Placeholder
      if (!acc[line]) {
        acc[line] = { total: 0, active: 0, resolved: 0 };
      }
      acc[line].total += 1;
      if (['Reported', 'Assessing', 'In-Repair', 'Quality-Check'].includes(ticket.status)) {
        acc[line].active += 1;
      } else if (['Repaired', 'Returned'].includes(ticket.status)) {
        acc[line].resolved += 1;
      }
      return acc;
    }, {} as Record<string, { total: number; active: number; resolved: number }>);

    // Exception Analysis - Data Integrity Checks
    // 1. Orphaned stock count serials (scanned but not in device registry)
    const deviceRegistrySerials = new Set(deviceRegistry.map(d => d.serial_number?.toLowerCase().trim()));

    const orphanedStockCountSerials = stockCounts
      .filter(count => {
        const serial = count.serial_number?.toLowerCase().trim();
        return serial && !deviceRegistrySerials.has(serial);
      })
      .map(count => ({
        serial: count.serial_number,
        scannedAt: count.created_at,
        location: count.location || 'Unknown',
        scannedBy: count.scanned_by || 'Unknown',
      }));

    // 2. Duplicate serials in device registry (should be unique)
    const serialCounts = deviceRegistry.reduce((acc, device) => {
      const serial = device.serial_number?.toLowerCase().trim();
      if (serial) {
        acc[serial] = (acc[serial] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const duplicateSerials = Object.entries(serialCounts)
      .filter(([, count]) => count > 1)
      .map(([serial, count]) => ({ serial, count }));

    const exceptionCounts = {
      orphanedStockCounts: orphanedStockCountSerials.length,
      duplicateSerials: duplicateSerials.length,
      total: orphanedStockCountSerials.length + duplicateSerials.length,
    };

    // Bot Analytics
    const totalBotQueries = botUsageLogs.length;
    const ratedQueries = botUsageLogs.filter(log => log.satisfaction_rating !== null);
    const averageSatisfaction = ratedQueries.length > 0
      ? ratedQueries.reduce((sum, log) => sum + (log.satisfaction_rating || 0), 0) / ratedQueries.length
      : 0;

    const queriesByRole = botUsageLogs.reduce((acc, log) => {
      const role = log.user_role || 'anonymous';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topUsers = Object.entries(
      botUsageLogs.reduce((acc, log) => {
        const email = log.user_email || 'anonymous';
        acc[email] = (acc[email] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const satisfactionBreakdown = {
      5: botUsageLogs.filter(log => log.satisfaction_rating === 5).length,
      4: botUsageLogs.filter(log => log.satisfaction_rating === 4).length,
      3: botUsageLogs.filter(log => log.satisfaction_rating === 3).length,
      2: botUsageLogs.filter(log => log.satisfaction_rating === 2).length,
      1: botUsageLogs.filter(log => log.satisfaction_rating === 1).length,
    };

    const workRelatedQueries = botUsageLogs.filter(log => log.is_work_related).length;
    const nonWorkQueries = botUsageLogs.filter(log => !log.is_work_related).length;

    const avgResponseTime = botUsageLogs.filter(log => log.response_time_ms).length > 0
      ? botUsageLogs.filter(log => log.response_time_ms).reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / botUsageLogs.filter(log => log.response_time_ms).length
      : 0;

    const totalTokensUsed = botUsageLogs.reduce((sum, log) => sum + (log.tokens_used || 0), 0);

    const sessionCount = new Set(botUsageLogs.map(log => log.session_id)).size;

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

      // Device Condition
      totalDevices,
      functionalDevices,
      faultyDevices,
      deviceHealthRate,
      devicesByStatus,
      devicesByCondition,
      faultReasons,

      // Stock Alerts
      stockAlerts,
      alertCounts,

      // Fault Analysis
      faultsByCategory,
      totalFaults,
      activeFaults,
      resolvedFaults,

      // Business Line Breakdown
      ordersByBusinessLine,
      stockByBusinessLine,
      faultsByBusinessLine,

      // Exceptions
      exceptionCounts,
      orphanedStockCountSerials,
      duplicateSerials,

      // Bot Analytics
      totalBotQueries,
      averageSatisfaction,
      queriesByRole,
      topUsers,
      satisfactionBreakdown,
      workRelatedQueries,
      nonWorkQueries,
      avgResponseTime,
      totalTokensUsed,
      sessionCount,
    };
  }, [filteredOrders, filteredDispatchLogs, pickingQueue, dispatchQueue, stockLevels, repairTickets, stockCounts, deviceRegistry, botUsageLogs]);

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
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <div className="flex gap-2">
                {selectedBusinessLine !== 'all' && (
                  <Badge variant="outline">Business Line: {selectedBusinessLine}</Badge>
                )}
                <Badge variant="secondary">{filterDescription}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Business Line Filter */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-4">
                  <Label>Business Line</Label>
                  <Select value={selectedBusinessLine} onValueChange={setSelectedBusinessLine}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select business line" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Business Lines</SelectItem>
                      {businessLineOptions.map((line) => (
                        <SelectItem key={line} value={line}>
                          {line}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Filter */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Date Filter Mode</Label>
                  <Select value={filterMode} onValueChange={(value: 'all' | 'year' | 'month') => setFilterMode(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select filter mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="year">By Year</SelectItem>
                      <SelectItem value="month">By Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(filterMode === 'year' || filterMode === 'month') && (
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <Calendar className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {filterMode === 'month' && (
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger>
                        <Calendar className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setFilterMode('all');
                      setSelectedYear(currentYear.toString());
                      setSelectedMonth(currentMonth.toString());
                      setSelectedBusinessLine('all');
                    }}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Reset All
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 md:grid-cols-9 lg:w-auto lg:inline-flex">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="devices">Devices</TabsTrigger>
              <TabsTrigger value="repairs" className="relative">
                Repairs
                {kpis.activeFaults > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-orange-500 text-[10px] text-white flex items-center justify-center">
                    {kpis.activeFaults > 9 ? '9+' : kpis.activeFaults}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="alerts" className="relative">
                Alerts
                {kpis.alertCounts.total > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                    {kpis.alertCounts.total > 9 ? '9+' : kpis.alertCounts.total}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="exceptions" className="relative">
                Exceptions
                {kpis.exceptionCounts.total > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-purple-500 text-[10px] text-white flex items-center justify-center">
                    {kpis.exceptionCounts.total > 9 ? '9+' : kpis.exceptionCounts.total}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
              <TabsTrigger value="bot-analytics">Bot Analytics</TabsTrigger>
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

              {/* Business Line Comparison - Always visible when viewing all business lines */}
              {selectedBusinessLine === 'all' && Object.keys(kpis.ordersByBusinessLine).length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Business Line Performance
                    </CardTitle>
                    <CardDescription>Order fulfillment metrics by business line</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(kpis.ordersByBusinessLine)
                        .sort(([,a], [,b]) => b.total - a.total)
                        .map(([line, metrics]) => {
                          const fulfillmentRate = metrics.total > 0 ? (metrics.fulfilled / metrics.total) * 100 : 0;
                          return (
                            <div key={line} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{line}</span>
                                  <Badge variant="outline">{metrics.total} orders</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    <span>{metrics.dispatched}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-amber-500" />
                                    <span>{metrics.pending}</span>
                                  </div>
                                  <span className={`font-medium ${fulfillmentRate < 70 ? 'text-red-600' : fulfillmentRate < 85 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {fulfillmentRate.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              <Progress
                                value={fulfillmentRate}
                                className={`h-2 ${
                                  fulfillmentRate < 70 ? '[&>div]:bg-red-500' :
                                  fulfillmentRate < 85 ? '[&>div]:bg-amber-500' :
                                  '[&>div]:bg-green-500'
                                }`}
                              />
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}
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

              {/* Business Line Pipeline Analysis */}
              {selectedBusinessLine === 'all' && Object.keys(kpis.ordersByBusinessLine).length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Business Line Pipeline Status
                    </CardTitle>
                    <CardDescription>Pending orders by business line</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2">
                      {Object.entries(kpis.ordersByBusinessLine)
                        .filter(([, metrics]) => metrics.pending > 0)
                        .sort(([,a], [,b]) => b.pending - a.pending)
                        .map(([line, metrics]) => (
                          <div key={line} className="p-3 rounded-lg border bg-muted/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{line}</span>
                              <Badge variant="outline">{metrics.pending} pending</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Total: {metrics.total}</span>
                              <span>Dispatched: {metrics.dispatched}</span>
                            </div>
                          </div>
                        ))}
                    </div>
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

            {/* Repairs Tab */}
            <TabsContent value="repairs" className="space-y-6">
              {/* Repair Summary */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Faults</CardTitle>
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis.totalFaults}</div>
                    <p className="text-xs text-muted-foreground">All repair tickets</p>
                  </CardContent>
                </Card>

                <Card className={kpis.activeFaults > 0 ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20' : ''}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Faults</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{kpis.activeFaults}</div>
                    <p className="text-xs text-muted-foreground">Needs attention</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{kpis.resolvedFaults}</div>
                    <p className="text-xs text-muted-foreground">Completed repairs</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${kpis.totalFaults > 0 && (kpis.resolvedFaults / kpis.totalFaults * 100) < 70 ? 'text-red-600' : 'text-green-600'}`}>
                      {kpis.totalFaults > 0 ? ((kpis.resolvedFaults / kpis.totalFaults) * 100).toFixed(1) : 0}%
                    </div>
                    <Progress value={kpis.totalFaults > 0 ? (kpis.resolvedFaults / kpis.totalFaults) * 100 : 0} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Fault Categories Visualization */}
              {Object.keys(kpis.faultsByCategory).length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                      <Wrench className="h-5 w-5" />
                      Fault Categories - Resource Planning
                    </CardTitle>
                    <CardDescription>
                      Distribution of device faults by category. Use this to allocate repair resources and identify training needs for support technicians.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(kpis.faultsByCategory)
                        .sort(([,a], [,b]) => b - a)
                        .map(([category, count]) => {
                          const percentage = kpis.totalFaults > 0 ? (count / kpis.totalFaults) * 100 : 0;
                          return (
                            <div key={category} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Wrench className={`h-4 w-4 ${
                                    percentage > 20 ? 'text-red-500' :
                                    percentage > 10 ? 'text-orange-500' :
                                    'text-yellow-500'
                                  }`} />
                                  <span className="text-sm font-medium">{category}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</span>
                                  <Badge variant={percentage > 20 ? 'destructive' : percentage > 10 ? 'default' : 'secondary'}>
                                    {count}
                                  </Badge>
                                </div>
                              </div>
                              <Progress
                                value={percentage}
                                className={`h-2 ${
                                  percentage > 20 ? '[&>div]:bg-red-500' :
                                  percentage > 10 ? '[&>div]:bg-orange-500' :
                                  '[&>div]:bg-yellow-500'
                                }`}
                              />
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                  <CardContent className="pt-6 text-center">
                    <ThumbsUp className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">No Repair Tickets</h3>
                    <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                      No device faults have been reported
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Resource Recommendations */}
              {Object.keys(kpis.faultsByCategory).length > 0 && (
                <div className="grid gap-4 md:grid-cols-3">
                  {Object.entries(kpis.faultsByCategory)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3)
                    .map(([category, count], index) => {
                      const percentage = kpis.totalFaults > 0 ? (count / kpis.totalFaults) * 100 : 0;
                      const priority = index === 0 ? 'High' : index === 1 ? 'Medium' : 'Standard';
                      return (
                        <Card key={category} className={`${
                          index === 0 ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
                          index === 1 ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20' :
                          'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20'
                        }`}>
                          <CardHeader>
                            <CardTitle className="text-sm flex items-center justify-between">
                              <span className="truncate">{category}</span>
                              <Badge variant={index === 0 ? 'destructive' : 'secondary'}>
                                {priority} Priority
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold mb-2">{count}</div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {percentage.toFixed(1)}% of all faults
                            </p>
                            <p className="text-xs font-medium">
                              {index === 0 && '⚠️ Allocate specialized repair resources'}
                              {index === 1 && '📊 Monitor and provide training'}
                              {index === 2 && '✓ Standard repair procedures'}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}

              {/* Note: Business line breakdown for repairs requires device_registry join */}
              {selectedBusinessLine === 'all' && Object.keys(kpis.faultsByBusinessLine).length > 0 && (
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Activity className="h-4 w-4" />
                      Business Line Fault Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Note: Repair tickets are currently tracked system-wide. To enable business line-specific fault analysis,
                      device_registry.item_category must be joined via device_id. This enhancement is pending database query optimization.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Devices Tab */}
            <TabsContent value="devices" className="space-y-6">
              {/* Device Health Summary */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis.totalDevices}</div>
                    <p className="text-xs text-muted-foreground">In inventory</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Functional</CardTitle>
                    <ThumbsUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{kpis.functionalDevices}</div>
                    <p className="text-xs text-muted-foreground">Ready for use</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Faulty</CardTitle>
                    <Wrench className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{kpis.faultyDevices}</div>
                    <p className="text-xs text-muted-foreground">Need attention</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Health Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${kpis.deviceHealthRate < 80 ? 'text-red-600' : kpis.deviceHealthRate < 95 ? 'text-amber-600' : 'text-green-600'}`}>
                      {kpis.deviceHealthRate.toFixed(1)}%
                    </div>
                    <Progress value={kpis.deviceHealthRate} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Device Status & Condition Breakdown */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Device Status
                    </CardTitle>
                    <CardDescription>Breakdown by inventory status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(kpis.devicesByStatus)
                        .sort(([,a], [,b]) => b - a)
                        .map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {status === 'In Stock' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                              {status === 'Faulty' && <XCircle className="h-4 w-4 text-red-500" />}
                              {status === 'Allocated' && <Clock className="h-4 w-4 text-blue-500" />}
                              {status === 'Dispatched' && <Truck className="h-4 w-4 text-purple-500" />}
                              {status === 'Missing' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                              {status === 'Returned' && <RefreshCcw className="h-4 w-4 text-gray-500" />}
                              {!['In Stock', 'Faulty', 'Allocated', 'Dispatched', 'Missing', 'Returned'].includes(status) &&
                                <Package className="h-4 w-4 text-muted-foreground" />}
                              <span className="text-sm">{status}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={(count / kpis.totalDevices) * 100} className="w-20" />
                              <span className="font-medium w-8 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Overall Condition
                    </CardTitle>
                    <CardDescription>Breakdown by physical condition</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(kpis.devicesByCondition)
                        .sort(([,a], [,b]) => b - a)
                        .map(([condition, count]) => (
                          <div key={condition} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {condition === 'Good' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                              {condition === 'Fair' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                              {condition === 'Poor' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                              {condition === 'Damaged' && <XCircle className="h-4 w-4 text-red-500" />}
                              {condition === 'Faulty' && <Wrench className="h-4 w-4 text-red-500" />}
                              {!['Good', 'Fair', 'Poor', 'Damaged', 'Faulty'].includes(condition) &&
                                <Package className="h-4 w-4 text-muted-foreground" />}
                              <span className="text-sm">{condition}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={(count / kpis.totalDevices) * 100} className="w-20" />
                              <span className="font-medium w-8 text-right">{count}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Fault Reasons Breakdown */}
              {Object.keys(kpis.faultReasons).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <Wrench className="h-5 w-5" />
                      Fault Reasons
                    </CardTitle>
                    <CardDescription>Breakdown of issues affecting devices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(kpis.faultReasons)
                        .sort(([,a], [,b]) => b - a)
                        .map(([reason, count]) => (
                          <div key={reason} className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                            <span className="text-sm font-medium truncate mr-2">{reason}</span>
                            <Badge variant="destructive">{count}</Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {Object.keys(kpis.faultReasons).length === 0 && kpis.faultyDevices === 0 && (
                <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                  <CardContent className="pt-6 text-center">
                    <ThumbsUp className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">All Devices Functional</h3>
                    <p className="text-sm text-green-600 dark:text-green-500 mt-1">No faulty devices reported</p>
                  </CardContent>
                </Card>
              )}

              {/* Business Line Stock Distribution */}
              {selectedBusinessLine === 'all' && Object.keys(kpis.stockByBusinessLine).length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Stock by Business Line
                    </CardTitle>
                    <CardDescription>Device inventory distribution and health by business line</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(kpis.stockByBusinessLine)
                        .sort(([,a], [,b]) => b.total - a.total)
                        .map(([line, metrics]) => {
                          const healthRate = metrics.total > 0 ? (metrics.functional / metrics.total) * 100 : 100;
                          return (
                            <div key={line} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{line}</span>
                                  <Badge variant="outline">{metrics.total} devices</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1">
                                    <ThumbsUp className="h-3 w-3 text-green-500" />
                                    <span>{metrics.functional}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Wrench className="h-3 w-3 text-red-500" />
                                    <span>{metrics.faulty}</span>
                                  </div>
                                  <span className={`font-medium ${healthRate < 80 ? 'text-red-600' : healthRate < 95 ? 'text-amber-600' : 'text-green-600'}`}>
                                    {healthRate.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              <Progress
                                value={healthRate}
                                className={`h-2 ${
                                  healthRate < 80 ? '[&>div]:bg-red-500' :
                                  healthRate < 95 ? '[&>div]:bg-amber-500' :
                                  '[&>div]:bg-green-500'
                                }`}
                              />
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts" className="space-y-6">
              {/* Alert Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis.alertCounts.total}</div>
                    <p className="text-xs text-muted-foreground">Items need attention</p>
                  </CardContent>
                </Card>

                <Card className={kpis.alertCounts.outOfStock > 0 ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : ''}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                    <PackageX className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{kpis.alertCounts.outOfStock}</div>
                    <p className="text-xs text-muted-foreground">Quantity = 0</p>
                  </CardContent>
                </Card>

                <Card className={kpis.alertCounts.critical > 0 ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20' : ''}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Critical</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{kpis.alertCounts.critical}</div>
                    <p className="text-xs text-muted-foreground">
                      {kpis.stockAlerts.some(a => a.alertMethod === 'velocity' && a.severity === 'critical')
                        ? '≤3 days stock'
                        : 'Quantity 1-5'}
                    </p>
                  </CardContent>
                </Card>

                <Card className={kpis.alertCounts.warning > 0 ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Warning</CardTitle>
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{kpis.alertCounts.warning}</div>
                    <p className="text-xs text-muted-foreground">
                      {kpis.stockAlerts.some(a => a.alertMethod === 'velocity' && a.severity === 'warning')
                        ? '≤7 days stock'
                        : 'Quantity 6-10'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Alert List */}
              {kpis.stockAlerts.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Stock Alerts
                    </CardTitle>
                    <CardDescription>Items with low stock levels requiring attention - using velocity-based thresholds when sufficient data is available</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {kpis.stockAlerts
                        .sort((a, b) => {
                          // Sort by severity: outOfStock > critical > warning
                          const severityOrder = { outOfStock: 0, critical: 1, warning: 2, ok: 3 };
                          return severityOrder[a.severity] - severityOrder[b.severity];
                        })
                        .map((alert, index) => (
                          <div
                            key={`${alert.item_code}-${alert.warehouse}-${index}`}
                            className="p-3 rounded-lg border space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {alert.severity === 'outOfStock' && <PackageX className="h-5 w-5 text-red-500" />}
                                {alert.severity === 'critical' && <AlertTriangle className="h-5 w-5 text-orange-500" />}
                                {alert.severity === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                                <div>
                                  <div className="font-medium">{alert.item_code}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {alert.item_category} • {alert.warehouse}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {alert.severity === 'outOfStock' && (
                                  <Badge variant="destructive">Out of Stock</Badge>
                                )}
                                {alert.severity === 'critical' && (
                                  <Badge className="bg-orange-500 hover:bg-orange-600">Critical</Badge>
                                )}
                                {alert.severity === 'warning' && (
                                  <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Warning</Badge>
                                )}
                              </div>
                            </div>

                            {/* Stock & Velocity Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div className="text-center p-2 rounded bg-muted">
                                <div className="font-semibold">{alert.quantity}</div>
                                <div className="text-xs text-muted-foreground">In Stock</div>
                              </div>
                              <div className="text-center p-2 rounded bg-muted">
                                <div className="font-semibold flex items-center justify-center gap-1">
                                  {alert.velocity > 0 ? (
                                    <>
                                      {alert.velocity}
                                      <TrendingDown className="h-3 w-3" />
                                    </>
                                  ) : (
                                    '—'
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">Units/Day</div>
                              </div>
                              <div className="text-center p-2 rounded bg-muted">
                                <div className={`font-semibold ${
                                  alert.daysOfStock !== null && alert.daysOfStock <= 3 ? 'text-red-600' :
                                  alert.daysOfStock !== null && alert.daysOfStock <= 7 ? 'text-yellow-600' :
                                  ''
                                }`}>
                                  {alert.daysOfStock !== null ? `${alert.daysOfStock}d` : '—'}
                                </div>
                                <div className="text-xs text-muted-foreground">Days Left</div>
                              </div>
                              <div className="text-center p-2 rounded bg-muted">
                                <div className="font-semibold">{alert.dispatchCount}</div>
                                <div className="text-xs text-muted-foreground">Dispatches</div>
                              </div>
                            </div>

                            {/* Data Maturity Indicator */}
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-muted-foreground">
                                    {alert.dataMaturity === 'manual' && 'No dispatch history'}
                                    {alert.dataMaturity === 'learning' && `Learning (${alert.daysOfHistory} days)`}
                                    {alert.dataMaturity === 'stable' && `Stable (${alert.daysOfHistory} days)`}
                                    {alert.dataMaturity === 'forecast' && `Forecast Ready (${alert.daysOfHistory} days)`}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {alert.alertMethod === 'velocity' ? 'Velocity' : 'Static'}
                                  </Badge>
                                </div>
                                <Progress value={alert.dataProgress} className="h-1.5" />
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                  <CardContent className="pt-6 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">Stock Levels Healthy</h3>
                    <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                      All items have sufficient stock (above 10 units or 7+ days)
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Alerts by Category */}
              {kpis.stockAlerts.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Alerts by Category
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(
                          kpis.stockAlerts.reduce((acc, alert) => {
                            acc[alert.item_category] = (acc[alert.item_category] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        )
                          .sort(([, a], [, b]) => b - a)
                          .map(([category, count]) => (
                            <div key={category} className="flex items-center justify-between">
                              <span className="text-sm truncate">{category}</span>
                              <Badge variant="secondary">{count}</Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Alerts by Warehouse
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(
                          kpis.stockAlerts.reduce((acc, alert) => {
                            acc[alert.warehouse] = (acc[alert.warehouse] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        )
                          .sort(([, a], [, b]) => b - a)
                          .map(([warehouse, count]) => (
                            <div key={warehouse} className="flex items-center justify-between">
                              <span className="text-sm truncate">{warehouse}</span>
                              <Badge variant="secondary">{count}</Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Exceptions Tab */}
            <TabsContent value="exceptions" className="space-y-6">
              {/* Exception Summary Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Exceptions</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis.exceptionCounts.total}</div>
                    <p className="text-xs text-muted-foreground">Data discrepancies</p>
                  </CardContent>
                </Card>

                <Card className={kpis.exceptionCounts.orphanedStockCounts > 0 ? 'border-purple-200 bg-purple-50 dark:bg-purple-950/20' : ''}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Orphaned Scans</CardTitle>
                    <PackageX className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">{kpis.exceptionCounts.orphanedStockCounts}</div>
                    <p className="text-xs text-muted-foreground">Not in device registry</p>
                  </CardContent>
                </Card>

                <Card className={kpis.exceptionCounts.duplicateSerials > 0 ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20' : ''}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Duplicate Serials</CardTitle>
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{kpis.exceptionCounts.duplicateSerials}</div>
                    <p className="text-xs text-muted-foreground">Multiple registry entries</p>
                  </CardContent>
                </Card>
              </div>

              {/* Orphaned Stock Counts */}
              {kpis.orphanedStockCountSerials.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-600">
                      <PackageX className="h-5 w-5" />
                      Orphaned Stock Count Serials
                    </CardTitle>
                    <CardDescription>
                      Devices scanned in stock counts but not found in device registry. These may need to be ingested or investigated.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {kpis.orphanedStockCountSerials.slice(0, 10).map((orphan, index) => (
                        <div
                          key={`${orphan.serial}-${index}`}
                          className="p-3 rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-950/20 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-sm">{orphan.serial}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Scanned at {orphan.location} by {orphan.scannedBy}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {orphan.scannedAt ? format(parseISO(orphan.scannedAt), 'MMM d, yyyy') : 'Unknown date'}
                          </Badge>
                        </div>
                      ))}
                      {kpis.orphanedStockCountSerials.length > 10 && (
                        <div className="text-center text-sm text-muted-foreground pt-2">
                          ... and {kpis.orphanedStockCountSerials.length - 10} more orphaned serials
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                  <CardContent className="pt-6 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">No Orphaned Scans</h3>
                    <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                      All scanned devices exist in the device registry
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Duplicate Serials */}
              {kpis.duplicateSerials.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                      <AlertCircle className="h-5 w-5" />
                      Duplicate Serial Numbers
                    </CardTitle>
                    <CardDescription>
                      Serial numbers appearing multiple times in device registry. These should be unique and need immediate attention.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {kpis.duplicateSerials.map((duplicate, index) => (
                        <div
                          key={`${duplicate.serial}-${index}`}
                          className="p-3 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate mr-2">{duplicate.serial}</span>
                            <Badge variant="destructive">{duplicate.count}x</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                  <CardContent className="pt-6 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">No Duplicate Serials</h3>
                    <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                      All serial numbers are unique in the device registry
                    </p>
                  </CardContent>
                </Card>
              )}
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

            {/* Bot Analytics Tab */}
            <TabsContent value="bot-analytics" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Queries */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis.totalBotQueries}</div>
                    <p className="text-xs text-muted-foreground">
                      Across {kpis.sessionCount} sessions
                    </p>
                  </CardContent>
                </Card>

                {/* Average Satisfaction */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Satisfaction</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis.averageSatisfaction.toFixed(2)} ⭐</div>
                    <p className="text-xs text-muted-foreground">
                      From {botUsageLogs.filter(log => log.satisfaction_rating !== null).length} ratings
                    </p>
                  </CardContent>
                </Card>

                {/* Most Active User */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Most Active User</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-bold truncate">
                      {kpis.topUsers.length > 0 ? kpis.topUsers[0][0] : 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {kpis.topUsers.length > 0 ? `${kpis.topUsers[0][1]} queries` : 'No data'}
                    </p>
                  </CardContent>
                </Card>

                {/* Avg Response Time */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                    <Timer className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(kpis.avgResponseTime / 1000).toFixed(1)}s</div>
                    <p className="text-xs text-muted-foreground">
                      {kpis.totalTokensUsed.toLocaleString()} tokens used
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* User Engagement by Role */}
              <Card>
                <CardHeader>
                  <CardTitle>User Engagement by Role</CardTitle>
                  <CardDescription>Queries by user role</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(kpis.queriesByRole)
                      .sort(([, a], [, b]) => b - a)
                      .map(([role, count]) => (
                        <div key={role} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium capitalize">{role}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-32 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${(count / kpis.totalBotQueries) * 100}%` }}
                              />
                            </div>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top 10 Users */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Users by Query Count</CardTitle>
                  <CardDescription>Most frequent bot users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {kpis.topUsers.map(([email, count], index) => (
                      <div key={email} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground w-6">#{index + 1}</span>
                          <span className="text-sm truncate max-w-[200px]">{email}</span>
                        </div>
                        <Badge variant="secondary">{count} queries</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Satisfaction Breakdown */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Satisfaction Breakdown</CardTitle>
                    <CardDescription>Distribution of ratings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[5, 4, 3, 2, 1].map((rating) => {
                        const count = kpis.satisfactionBreakdown[rating as keyof typeof kpis.satisfactionBreakdown];
                        const totalRatings = Object.values(kpis.satisfactionBreakdown).reduce((a, b) => a + b, 0);
                        const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;

                        return (
                          <div key={rating} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {rating >= 4 ? (
                                <ThumbsUp className="h-4 w-4 text-green-500" />
                              ) : rating === 3 ? (
                                <Star className="h-4 w-4 text-yellow-500" />
                              ) : (
                                <ThumbsDown className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-sm font-medium">{rating} {'⭐'.repeat(rating)}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-32 bg-muted rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    rating >= 4 ? 'bg-green-500' : rating === 3 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <Badge variant="secondary">{count}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Work Classification */}
                <Card>
                  <CardHeader>
                    <CardTitle>Work Classification</CardTitle>
                    <CardDescription>Work vs. non-work queries</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Work-Related</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-32 bg-muted rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{
                                width: `${kpis.totalBotQueries > 0 ? (kpis.workRelatedQueries / kpis.totalBotQueries) * 100 : 0}%`
                              }}
                            />
                          </div>
                          <Badge variant="secondary">{kpis.workRelatedQueries}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-medium">Non-Work</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-32 bg-muted rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full"
                              style={{
                                width: `${kpis.totalBotQueries > 0 ? (kpis.nonWorkQueries / kpis.totalBotQueries) * 100 : 0}%`
                              }}
                            />
                          </div>
                          <Badge variant="secondary">{kpis.nonWorkQueries}</Badge>
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600">
                            {kpis.totalBotQueries > 0 ? ((kpis.workRelatedQueries / kpis.totalBotQueries) * 100).toFixed(1) : 0}%
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Work-related queries</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Queries Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Queries</CardTitle>
                  <CardDescription>Latest bot interactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {botUsageLogs.slice(0, 10).map((log) => (
                      <div key={log.id} className="border-l-4 border-primary/30 pl-4 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{log.query}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {log.user_email} • {log.user_role} • {new Date(log.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {log.satisfaction_rating && (
                              <Badge variant={log.satisfaction_rating >= 4 ? 'default' : log.satisfaction_rating === 3 ? 'secondary' : 'destructive'}>
                                {log.satisfaction_rating} ⭐
                              </Badge>
                            )}
                            {log.response_time_ms && (
                              <Badge variant="outline">{(log.response_time_ms / 1000).toFixed(1)}s</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>Response times and token usage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-medium mb-3">Response Time Distribution</h4>
                      <div className="space-y-2">
                        {[
                          { label: '< 2s', min: 0, max: 2000, color: 'bg-green-500' },
                          { label: '2-4s', min: 2000, max: 4000, color: 'bg-yellow-500' },
                          { label: '4-6s', min: 4000, max: 6000, color: 'bg-orange-500' },
                          { label: '> 6s', min: 6000, max: Infinity, color: 'bg-red-500' },
                        ].map(({ label, min, max, color }) => {
                          const count = botUsageLogs.filter(
                            log => log.response_time_ms && log.response_time_ms >= min && log.response_time_ms < max
                          ).length;
                          const total = botUsageLogs.filter(log => log.response_time_ms).length;
                          const percentage = total > 0 ? (count / total) * 100 : 0;

                          return (
                            <div key={label} className="flex items-center gap-2">
                              <span className="text-xs font-medium w-12">{label}</span>
                              <div className="flex-1 bg-muted rounded-full h-2">
                                <div className={`${color} h-2 rounded-full`} style={{ width: `${percentage}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground w-8">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-3">Cost Estimate (ZAR)</h4>
                      <div className="space-y-3">
                        {(() => {
                          // Estimate token split: ~10% embeddings, ~40% chat input, ~50% chat output
                          const totalTokens = kpis.totalTokensUsed;
                          const embeddingTokens = Math.round(totalTokens * 0.1);
                          const chatInputTokens = Math.round(totalTokens * 0.4);
                          const chatOutputTokens = Math.round(totalTokens * 0.5);

                          // Calculate costs in USD
                          const embeddingCostUSD = (embeddingTokens / 1000) * OPENAI_PRICING.embedding;
                          const chatInputCostUSD = (chatInputTokens / 1000) * OPENAI_PRICING.chatInput;
                          const chatOutputCostUSD = (chatOutputTokens / 1000) * OPENAI_PRICING.chatOutput;
                          const totalCostUSD = embeddingCostUSD + chatInputCostUSD + chatOutputCostUSD;

                          // Convert to ZAR (using dynamic exchange rate)
                          const totalCostZAR = totalCostUSD * usdToZar;
                          const embeddingCostZAR = embeddingCostUSD * usdToZar;
                          const chatCostZAR = (chatInputCostUSD + chatOutputCostUSD) * usdToZar;

                          return (
                            <>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Total Tokens</span>
                                <span className="text-sm font-medium">{totalTokens.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Embeddings</span>
                                <span className="text-sm font-medium">R{embeddingCostZAR.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Chat (I/O)</span>
                                <span className="text-sm font-medium">R{chatCostZAR.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between pt-2 border-t">
                                <span className="text-sm font-semibold">Total Cost</span>
                                <span className="text-sm font-bold text-primary">
                                  R{totalCostZAR.toFixed(2)}
                                  <span className="text-xs text-muted-foreground ml-1">(${totalCostUSD.toFixed(2)})</span>
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Avg Cost/Query</span>
                                <span className="text-sm font-medium">
                                  R{kpis.totalBotQueries > 0 ? (totalCostZAR / kpis.totalBotQueries).toFixed(2) : '0.00'}
                                </span>
                              </div>
                              <div className="pt-3 border-t">
                                <p className="text-xs text-muted-foreground">
                                  💱 Exchange rate: R{usdToZar.toFixed(2)} per USD
                                </p>
                                {exchangeRateLastUpdated && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    🕐 Updated: {exchangeRateLastUpdated.toLocaleDateString()} (refreshes weekly)
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  📊 Monitor at <a href="https://platform.openai.com/usage" target="_blank" rel="noopener noreferrer" className="text-primary underline">OpenAI Dashboard</a>
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
      </main>
    </div>
  );
};

export default KPIDashboard;
