import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  MapPin,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Loader2,
  PackageCheck,
  ClipboardList,
  Navigation,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

// Collivery API Configuration
const COLLIVERY_CONFIG = {
  baseUrl: 'https://api.collivery.co.za/v3',
  // API key will be configured here for production
  apiKey: import.meta.env.VITE_COLLIVERY_API_KEY || '',
  headers: {
    'X-App-Name': '4D-Analytics-Inventory',
    'X-App-Version': '1.0.0',
    'X-App-Host': 'React-Vite',
    'X-App-Lang': 'TypeScript',
  },
};

// Order stage definitions
type OrderStage = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
};

const ORDER_STAGES: OrderStage[] = [
  {
    id: 'ordered',
    label: 'Order Placed',
    description: 'Order has been submitted',
    icon: ClipboardList,
  },
  {
    id: 'picked',
    label: 'Picked',
    description: 'Items picked from warehouse',
    icon: PackageCheck,
  },
  {
    id: 'dispatched',
    label: 'Dispatched',
    description: 'Handed to courier',
    icon: Truck,
  },
  {
    id: 'in_transit',
    label: 'In Transit',
    description: 'On the way to destination',
    icon: Navigation,
  },
  {
    id: 'delivered',
    label: 'Delivered',
    description: 'Successfully delivered',
    icon: CheckCircle2,
  },
];

// Courier tracking event type
interface CourierEvent {
  timestamp: string;
  status: string;
  description: string;
  location?: string;
}

// Order tracking data type
interface OrderTracking {
  orderId: number;
  waybillNumber: string | null;
  dateOrdered: string;
  dispatchStatus: string | null;
  pickStatus: string | null;
  dispatchMethod: string | null;
  recipientName: string | null;
  recipientAddress: string | null;
  technicianName: string | null;
  contractorCompany: string | null;
  itemCategory: string | null;
  currentStage: number;
}

const Tracking = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'waybill' | 'order'>('waybill');
  const [activeSearch, setActiveSearch] = useState('');
  const [courierEvents, setCourierEvents] = useState<CourierEvent[]>([]);
  const [courierLoading, setCourierLoading] = useState(false);
  const [courierError, setCourierError] = useState<string | null>(null);

  // Fetch order tracking data
  const { data: orderData, isLoading, refetch } = useQuery({
    queryKey: ['orderTracking', activeSearch, searchType],
    queryFn: async () => {
      if (!activeSearch) return null;

      let query = supabase
        .from('unique_orders')
        .select('*');

      if (searchType === 'waybill') {
        query = query.eq('waybill_number', activeSearch);
      } else {
        query = query.eq('order_id', parseInt(activeSearch));
      }

      const { data, error } = await query.single();

      if (error) throw error;
      if (!data) throw new Error('Order not found');

      // Calculate current stage based on status
      let currentStage = 0;
      if (data.pick_status === 'Picked' || data.pick_status === 'Partially Picked') {
        currentStage = 1;
      }
      if (data.dispatch_status === 'Dispatched' || data.dispatch_status === 'Partial') {
        currentStage = 2;
      }
      // If dispatched and has waybill, assume in transit
      if (data.dispatch_status === 'Dispatched' && data.waybill_number) {
        currentStage = 3;
      }

      const tracking: OrderTracking = {
        orderId: data.order_id,
        waybillNumber: data.waybill_number,
        dateOrdered: data.date_ordered,
        dispatchStatus: data.dispatch_status,
        pickStatus: data.pick_status,
        dispatchMethod: data.dispatch_method,
        recipientName: data.recipient_name,
        recipientAddress: data.recipient_address,
        technicianName: data.technician,
        contractorCompany: data.contractor_company,
        itemCategory: data.item_category,
        currentStage,
      };

      return tracking;
    },
    enabled: !!activeSearch,
  });

  // Fetch courier tracking from Collivery API
  const fetchCourierTracking = async (waybillNumber: string) => {
    if (!COLLIVERY_CONFIG.apiKey) {
      setCourierError('Courier API key not configured. Contact administrator.');
      return;
    }

    setCourierLoading(true);
    setCourierError(null);

    try {
      const response = await fetch(
        `${COLLIVERY_CONFIG.baseUrl}/status_tracking/${waybillNumber}?api_token=${COLLIVERY_CONFIG.apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...COLLIVERY_CONFIG.headers,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Courier API error: ${response.status}`);
      }

      const result = await response.json();

      // Transform API response to our event format
      if (result.data && Array.isArray(result.data)) {
        const events: CourierEvent[] = result.data.map((event: any) => ({
          timestamp: event.created_at || event.timestamp,
          status: event.status || event.status_text,
          description: event.description || event.status_text,
          location: event.location || event.town,
        }));
        setCourierEvents(events);
      }
    } catch (error: any) {
      setCourierError(error.message || 'Failed to fetch courier tracking');
    } finally {
      setCourierLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a waybill number or order ID',
        variant: 'destructive',
      });
      return;
    }

    setActiveSearch(searchQuery.trim());
    setCourierEvents([]);
    setCourierError(null);
  };

  // Determine stage status
  const getStageStatus = (stageIndex: number, currentStage: number) => {
    if (stageIndex < currentStage) return 'completed';
    if (stageIndex === currentStage) return 'current';
    return 'pending';
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <MapPin className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Order Tracking</h1>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Track Your Order</CardTitle>
          <CardDescription>
            Enter your waybill number or order ID to track delivery status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchType === 'waybill' ? 'Enter waybill number...' : 'Enter order ID...'}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={searchType === 'waybill' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchType('waybill')}
              >
                Waybill
              </Button>
              <Button
                variant={searchType === 'order' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchType('order')}
              >
                Order ID
              </Button>
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Track'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {orderData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Timeline */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Order #{orderData.orderId}</CardTitle>
                  <CardDescription>
                    {new Date(orderData.dateOrdered).toLocaleDateString('en-ZA', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Animated Timeline */}
              <div className="relative">
                {ORDER_STAGES.map((stage, index) => {
                  const status = getStageStatus(index, orderData.currentStage);
                  const Icon = stage.icon;

                  return (
                    <div key={stage.id} className="relative pb-8 last:pb-0">
                      {/* Connector Line */}
                      {index < ORDER_STAGES.length - 1 && (
                        <div
                          className={`absolute left-5 top-10 w-0.5 h-full -ml-px transition-all duration-700 ease-out ${
                            status === 'completed'
                              ? 'bg-primary'
                              : status === 'current'
                              ? 'bg-gradient-to-b from-primary to-muted'
                              : 'bg-muted'
                          }`}
                        />
                      )}

                      {/* Stage Item */}
                      <div className="relative flex items-start group">
                        {/* Icon Circle */}
                        <div
                          className={`
                            flex items-center justify-center w-10 h-10 rounded-full border-2
                            transition-all duration-500 ease-out
                            ${status === 'completed'
                              ? 'bg-primary border-primary text-primary-foreground scale-100'
                              : status === 'current'
                              ? 'bg-background border-primary text-primary scale-110 shadow-lg shadow-primary/25'
                              : 'bg-muted border-muted-foreground/20 text-muted-foreground scale-90'
                            }
                          `}
                          style={{
                            animation: status === 'current' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                          }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        {/* Content */}
                        <div className="ml-4 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3
                              className={`text-sm font-semibold transition-colors duration-300 ${
                                status === 'pending' ? 'text-muted-foreground' : ''
                              }`}
                            >
                              {stage.label}
                            </h3>
                            {status === 'current' && (
                              <Badge
                                variant="secondary"
                                className="text-xs animate-pulse bg-primary/10 text-primary"
                              >
                                Current
                              </Badge>
                            )}
                            {status === 'completed' && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                          <p
                            className={`text-xs mt-0.5 transition-colors duration-300 ${
                              status === 'pending' ? 'text-muted-foreground/60' : 'text-muted-foreground'
                            }`}
                          >
                            {stage.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Order Details & Courier Tracking */}
          <div className="space-y-6">
            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Waybill Number</p>
                  <p className="text-sm font-medium font-mono">
                    {orderData.waybillNumber || 'Not assigned'}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Dispatch Method</p>
                  <p className="text-sm font-medium">
                    {orderData.dispatchMethod || 'Not specified'}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Recipient</p>
                  <p className="text-sm font-medium">
                    {orderData.recipientName || orderData.technicianName || 'N/A'}
                  </p>
                </div>
                {orderData.recipientAddress && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">Delivery Address</p>
                      <p className="text-sm">{orderData.recipientAddress}</p>
                    </div>
                  </>
                )}
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <Badge variant="outline">{orderData.itemCategory || 'N/A'}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Courier Tracking */}
            {orderData.waybillNumber && orderData.dispatchMethod === 'Courier' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Courier Tracking</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      MDS / Collivery
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {!COLLIVERY_CONFIG.apiKey ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>API Key Required</AlertTitle>
                      <AlertDescription className="text-xs">
                        Configure VITE_COLLIVERY_API_KEY environment variable to enable live courier tracking.
                      </AlertDescription>
                    </Alert>
                  ) : courierLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : courierError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {courierError}
                      </AlertDescription>
                    </Alert>
                  ) : courierEvents.length > 0 ? (
                    <div className="space-y-3">
                      {courierEvents.map((event, index) => (
                        <div key={index} className="flex gap-3 text-sm">
                          <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
                          <div>
                            <p className="font-medium">{event.status}</p>
                            <p className="text-xs text-muted-foreground">
                              {event.description}
                            </p>
                            {event.location && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(event.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => fetchCourierTracking(orderData.waybillNumber!)}
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Get Courier Updates
                    </Button>
                  )}

                  {orderData.waybillNumber && (
                    <Button
                      variant="link"
                      size="sm"
                      className="w-full mt-2 text-xs"
                      asChild
                    >
                      <a
                        href={`https://www.collivery.co.za/track/${orderData.waybillNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Track on Collivery.net
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!activeSearch && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Track Your Delivery</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Enter your waybill number or order ID above to see real-time tracking
              information and delivery status updates.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Not Found */}
      {activeSearch && !isLoading && !orderData && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Order Not Found</AlertTitle>
          <AlertDescription>
            No order found with {searchType === 'waybill' ? 'waybill number' : 'order ID'}: {activeSearch}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default Tracking;
