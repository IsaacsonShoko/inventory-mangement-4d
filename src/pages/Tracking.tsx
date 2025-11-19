import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  MapPin,
  Package,
  Truck,
  Calendar,
  User,
  Phone,
  Mail,
  FileText,
  Filter,
  X,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { TrackingTimeline, TrackingTimelineCompact } from '@/components/TrackingTimeline';
import {
  orderTrackingService,
  type OrderTrackingRecord,
  type OrderStage,
} from '@/services/orderTrackingService';

// Stage badge colors
const stageBadgeColors: Record<OrderStage, string> = {
  placed: 'bg-gray-100 text-gray-700',
  picking: 'bg-yellow-100 text-yellow-700',
  picked: 'bg-orange-100 text-orange-700',
  dispatching: 'bg-purple-100 text-purple-700',
  dispatched: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  collected: 'bg-green-100 text-green-700',
};

const stageLabels: Record<OrderStage, string> = {
  placed: 'Order Placed',
  picking: 'Picking',
  picked: 'Picked',
  dispatching: 'Preparing',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  collected: 'Collected',
};

const Tracking = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderTrackingRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Fetch all orders
  const {
    data: orders = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['orderTracking'],
    queryFn: () => orderTrackingService.getAllOrders(),
  });

  // Filter orders based on search and status
  const filteredOrders = orders.filter((order) => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      order.orderId.toLowerCase().includes(searchLower) ||
      order.waybillNumber.toLowerCase().includes(searchLower) ||
      order.technician.toLowerCase().includes(searchLower) ||
      order.recipientName.toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus =
      statusFilter === 'all' ||
      order.currentStage === statusFilter ||
      (statusFilter === 'active' &&
        !['delivered', 'collected'].includes(order.currentStage)) ||
      (statusFilter === 'completed' &&
        ['delivered', 'collected'].includes(order.currentStage));

    return matchesSearch && matchesStatus;
  });

  const handleOrderClick = (order: OrderTrackingRecord) => {
    setSelectedOrder(order);
    setSheetOpen(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-500 p-2 text-white">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Order Tracking</h1>
                <p className="text-sm text-gray-600">
                  Track your orders from placement to delivery
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="border-b bg-white/60 px-6 py-4">
        <div className="container mx-auto flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by Order ID, Waybill, Technician..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="placed">Placed</SelectItem>
                <SelectItem value="picking">Picking</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {searchTerm && (
            <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="container mx-auto">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                <p className="text-gray-600">Loading orders...</p>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-gray-500">
              <Package className="mb-3 h-16 w-16 opacity-20" />
              <p className="text-lg font-medium">No orders found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
              </p>
              {filteredOrders.map((order) => (
                <Card
                  key={order.id}
                  className="cursor-pointer overflow-hidden transition-all hover:shadow-lg"
                  onClick={() => handleOrderClick(order)}
                >
                  <div className="p-4">
                    {/* Order header */}
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Order #{order.orderId}
                          </h3>
                          <Badge className={stageBadgeColors[order.currentStage]}>
                            {stageLabels[order.currentStage]}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(order.dateOrdered)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {order.technician || order.recipientName || 'N/A'}
                          </span>
                          {order.waybillNumber && (
                            <span className="flex items-center gap-1">
                              <Truck className="h-3.5 w-3.5" />
                              {order.waybillNumber}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>

                    {/* Compact timeline */}
                    <TrackingTimelineCompact stages={order.stageTimestamps} />

                    {/* Order details */}
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-600">
                          <span className="font-medium">{order.quantity}</span> items
                        </span>
                        <span className="text-gray-600">{order.itemCategory}</span>
                        <Badge variant="outline" className="text-xs">
                          {order.dispatchMethod || 'TBD'}
                        </Badge>
                      </div>
                      {order.estimatedDelivery &&
                        !['delivered', 'collected'].includes(order.currentStage) && (
                          <span className="text-xs text-gray-500">
                            Est. delivery: {formatDate(order.estimatedDelivery)}
                          </span>
                        )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  Order #{selectedOrder.orderId}
                  <Badge className={stageBadgeColors[selectedOrder.currentStage]}>
                    {stageLabels[selectedOrder.currentStage]}
                  </Badge>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Timeline */}
                <div>
                  <h4 className="mb-4 text-sm font-semibold text-gray-900">
                    Order Progress
                  </h4>
                  <TrackingTimeline
                    stages={selectedOrder.stageTimestamps}
                    dispatchMethod={selectedOrder.dispatchMethod}
                  />
                </div>

                <Separator />

                {/* Order Details */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-gray-900">
                    Order Details
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date Ordered</span>
                      <span className="font-medium">
                        {formatDateTime(selectedOrder.dateOrdered)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category</span>
                      <span className="font-medium">{selectedOrder.itemCategory}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity</span>
                      <span className="font-medium">{selectedOrder.quantity} items</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dispatch Method</span>
                      <span className="font-medium">
                        {selectedOrder.dispatchMethod || 'Not assigned'}
                      </span>
                    </div>
                    {selectedOrder.waybillNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Waybill Number</span>
                        <span className="font-medium">{selectedOrder.waybillNumber}</span>
                      </div>
                    )}
                    {selectedOrder.estimatedDelivery &&
                      !['delivered', 'collected'].includes(selectedOrder.currentStage) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Est. Delivery</span>
                          <span className="font-medium text-indigo-600">
                            {formatDateTime(selectedOrder.estimatedDelivery)}
                          </span>
                        </div>
                      )}
                  </div>
                </div>

                <Separator />

                {/* Recipient Details */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-gray-900">
                    Recipient Details
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{selectedOrder.recipientName || selectedOrder.technician || 'N/A'}</span>
                    </div>
                    {selectedOrder.recipientContact && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{selectedOrder.recipientContact}</span>
                      </div>
                    )}
                    {selectedOrder.orderedBy && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span>{selectedOrder.orderedBy}</span>
                      </div>
                    )}
                    {selectedOrder.deliveryAddress && (
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
                        <span className="flex-1">{selectedOrder.deliveryAddress}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedOrder.orderNotes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-gray-900">
                        Order Notes
                      </h4>
                      <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm">
                        <FileText className="mt-0.5 h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">{selectedOrder.orderNotes}</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Action buttons for courier orders */}
                {selectedOrder.waybillNumber &&
                  selectedOrder.dispatchMethod?.toLowerCase().includes('courier') && (
                    <>
                      <Separator />
                      <div className="pt-2">
                        <Button className="w-full gap-2" variant="outline">
                          <Truck className="h-4 w-4" />
                          Track with Courier (Coming Soon)
                        </Button>
                        <p className="mt-2 text-center text-xs text-gray-500">
                          Live courier tracking will be available once MDS/Collivery API is
                          integrated
                        </p>
                      </div>
                    </>
                  )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Tracking;
