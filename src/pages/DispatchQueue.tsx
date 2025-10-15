import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Truck,
  Calendar,
  Building2,
  Package as PackageIcon,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  Loader2,
  Home as HomeIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useDispatchQueue, useStockOrderItemsByOrders } from '@/hooks/useAirtable';
import { BUSINESS_LINES, formatOrderNumber, normaliseBusinessLine, getLineItemImageUrl } from '@/lib/orders';
import type { UniqueOrder } from '@/types/airtable';
import ThemeToggle from '@/components/theme-toggle';

const dispatchTone: Record<string, string> = {
  Dispatched: 'border-emerald-200 text-emerald-600 bg-emerald-50',
  Pending: 'border-sky-200 text-sky-600 bg-sky-50',
  Partial: 'border-amber-200 text-amber-600 bg-amber-50',
  'Not Dispatched': 'border-rose-200 text-rose-600 bg-rose-50',
};

const pickTone: Record<string, string> = {
  Picked: 'border-emerald-200 text-emerald-600 bg-emerald-50',
  Pending: 'border-amber-200 text-amber-600 bg-amber-50',
};

const businessLineDisplay = [...BUSINESS_LINES];

const getOrderDate = (value?: string) => {
  if (!value) return undefined;
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
};

const sumQuantities = (orders: UniqueOrder[]) =>
  orders.reduce((total, order) => total + (order.fields['Quantity Ordered'] ?? 0), 0);

const DispatchQueue = () => {
  const navigate = useNavigate();
  const { data: orders = [], isLoading, error, refetch, isFetching } = useDispatchQueue();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<string>(() => businessLineDisplay[0]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const queueStats = useMemo(() => {
    return businessLineDisplay.map((line) => {
      const lineOrders = orders.filter(
        (order) => normaliseBusinessLine(order.fields['Item Category']) === line
      );

      return {
        businessLine: line,
        totalOrders: lineOrders.length,
        totalItems: sumQuantities(lineOrders),
      };
    });
  }, [orders]);

  const populatedLines = queueStats.filter((stat) => stat.totalOrders > 0);

  const orderNumbers = useMemo(
    () =>
      orders
        .map((order) => formatOrderNumber(order))
        .filter((value): value is string => Boolean(value)),
    [orders],
  );

  const { data: lineItemsMap = {}, isLoading: lineItemsLoading } = useStockOrderItemsByOrders(orderNumbers);

  const effectiveSelectedLine = useMemo(() => {
    if (!orders.length) return selectedLine;
    if (queueStats.find((stat) => stat.businessLine === selectedLine)?.totalOrders) {
      return selectedLine;
    }
    return populatedLines[0]?.businessLine ?? selectedLine;
  }, [orders.length, populatedLines, queueStats, selectedLine]);

  const filteredOrders = useMemo(() => {
    if (!orders.length) return [];
    return orders.filter(
      (order) => normaliseBusinessLine(order.fields['Item Category']) === effectiveSelectedLine
    );
  }, [orders, effectiveSelectedLine]);

  const handleNavigateToCart = (recordId: string) => {
    navigate(`/dispatching/cart/${recordId}`);
  };

  const renderStatusBadge = (status?: string, toneMap?: Record<string, string>) => {
    if (!status) return null;
    const tone = toneMap?.[status] ?? 'border-border';
    return (
      <Badge variant="outline" className={`${tone} border text-xs font-semibold uppercase`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground py-4">
        <div className="container mx-auto px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-primary-foreground hover:bg-primary-foreground/20">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>Dispatch Queues</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-1">
                  {businessLineDisplay.map((line) => (
                    <button
                      key={line}
                      onClick={() => {
                        setSelectedLine(line);
                        setExpandedOrderId(null);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                        effectiveSelectedLine === line
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'hover:bg-accent text-foreground'
                      }`}
                    >
                      {line}
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-semibold">Dispatch Queue</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/20" />
            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20" data-testid="button-home">
                <HomeIcon className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {queueStats.map((stat) => (
              <Card key={stat.businessLine} className={`border-2 ${
                stat.businessLine === effectiveSelectedLine ? 'border-primary/60' : 'border-primary/10'
              }`}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-1 text-xs text-muted-foreground">
                    <span>Total Orders</span>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold">{stat.totalOrders}</div>
                    <div className="text-xs text-muted-foreground">Items: {stat.totalItems}</div>
                  </div>
                  <div className="text-xs font-semibold text-primary truncate">
                    {stat.businessLine}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Unable to load dispatch queue. Please try again.
          </div>
        )}

        <div className="grid md:grid-cols-12 gap-6">
          <div className="hidden md:block md:col-span-3 space-y-1">
            <div className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-semibold">
              Business Lines
            </div>
            {businessLineDisplay.map((line) => (
              <button
                key={line}
                onClick={() => {
                  setSelectedLine(line);
                  setExpandedOrderId(null);
                }}
                className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                  effectiveSelectedLine === line
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'hover:bg-accent text-foreground'
                }`}
              >
                {line}
              </button>
            ))}
          </div>

          <div className="md:col-span-9">
            <div className="bg-primary text-primary-foreground px-4 py-2 font-semibold rounded-t-md">
              Select an Order to Dispatch
            </div>
            <div className="border border-t-0 rounded-b-md bg-card min-h-[320px]">
              {isLoading ? (
                <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Loading dispatch queue...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No picked orders ready for dispatch in this queue
                </div>
              ) : (
                <div>
                  {filteredOrders.map((order) => {
                    const orderNumber = formatOrderNumber(order);
                    const dateOrdered = getOrderDate(order.fields['Date Ordered']);
                    const isExpanded = expandedOrderId === order.id;
                    const lineItems = orderNumber ? lineItemsMap[orderNumber] ?? [] : [];

                    return (
                      <div key={order.id} className="border-b">
                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="w-full p-4 text-left hover:bg-accent/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <PackageIcon className="h-5 w-5 text-primary mt-0.5" />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground">
                                    {orderNumber ?? 'Unknown Order'}
                                  </span>
                                  {renderStatusBadge(order.fields['Dispatch Status'], dispatchTone)}
                                  {renderStatusBadge(order.fields['Pick Status'], pickTone)}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                                  {dateOrdered && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3.5 w-3.5" />
                                      {dateOrdered}
                                    </span>
                                  )}
                                  {order.fields['Recipient Company Name'] && (
                                    <span className="flex items-center gap-1">
                                      <Building2 className="h-3.5 w-3.5" />
                                      {order.fields['Recipient Company Name']}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1 font-medium text-foreground">
                                    Qty: {order.fields['Quantity Ordered'] ?? 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="bg-muted/30 border-t">
                            <div className="px-5 py-4 space-y-4 text-sm">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground uppercase">Recipient</p>
                                  <p className="font-medium text-foreground">
                                    {order.fields['Recipient Name'] ?? '—'}
                                  </p>
                                  <p className="text-muted-foreground">
                                    {order.fields['Recipient Company Name'] ?? 'No company captured'}
                                  </p>
                                  {order.fields['Recipient Contact Number'] && (
                                    <p className="text-muted-foreground">
                                      {order.fields['Recipient Contact Number']}
                                    </p>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground uppercase">Logistics</p>
                                  <p>Dispatch Method: {order.fields['Dispatch Method'] ?? '—'}</p>
                                  <p>Waybill: {order.fields['WayBill Number'] ?? '—'}</p>
                                  <p>Warehouse: {order.fields['Warehouse Fulfilling'] ?? '—'}</p>
                                </div>
                              </div>

                              {order.fields['Order Notes'] && (
                                <div className="rounded-md bg-background border p-3 text-muted-foreground">
                                  <p className="text-xs uppercase font-semibold mb-1">Order Notes</p>
                                  <p>{order.fields['Order Notes']}</p>
                                </div>
                              )}

                              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                                <div className="text-xs text-muted-foreground">
                                  Delivery Party: {order.fields['Deliver to Part'] ?? '—'}
                                </div>
                                <Button size="sm" onClick={() => handleNavigateToCart(order.id)}>
                                  Open Dispatch Cart
                                </Button>
                              </div>

                              <div className="space-y-2">
                                <p className="text-xs uppercase font-semibold text-muted-foreground">Line Items</p>
                                {lineItemsLoading && lineItems.length === 0 ? (
                                  <div className="text-xs text-muted-foreground">Loading line items...</div>
                                ) : lineItems.length === 0 ? (
                                  <div className="text-xs text-muted-foreground">No line items captured for this order yet.</div>
                                ) : (
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    {lineItems.map((item) => {
                                      const imageUrl = getLineItemImageUrl(item);
                                      return (
                                        <div
                                          key={item.id}
                                          className="flex items-center gap-3 rounded-md border border-border/40 bg-background p-3"
                                        >
                                          <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                                            {imageUrl ? (
                                              <img src={imageUrl} alt={item.fields['Device type'] ?? 'Inventory item'} className="h-full w-full object-cover" />
                                            ) : (
                                              <PackageIcon className="h-6 w-6 text-primary" />
                                            )}
                                          </div>
                                          <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium text-foreground">
                                              {item.fields['Device type'] ?? 'Unknown device'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              Qty: {item.fields['Quantity ordered'] ?? 0}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispatchQueue;
