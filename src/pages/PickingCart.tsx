import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
  PackageSearch,
  Calendar,
  Building2,
  MapPin,
  Users,
  Hash,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDispatchLog, useStockOrderItems, useUniqueOrderRecord, useUpdateUniqueOrder } from '@/hooks/useAirtable';
import { useToast } from '@/hooks/use-toast';
import { formatOrderNumber, getLineItemImageUrl } from '@/lib/orders';
import { n8nService } from '@/integrations/n8n';
import ThemeToggle from '@/components/theme-toggle';

const statusBadgeTone: Record<string, string> = {
  Picked: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  Pending: 'bg-amber-100 text-amber-700 border-amber-300',
  'Not Picked': 'bg-rose-100 text-rose-700 border-rose-300',
  'Partially Picked': 'bg-amber-100 text-amber-700 border-amber-300',
};

const dispatchBadgeTone: Record<string, string> = {
  Dispatched: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  Pending: 'bg-sky-100 text-sky-700 border-sky-300',
  Partial: 'bg-amber-100 text-amber-700 border-amber-300',
  'Not Dispatched': 'bg-rose-100 text-rose-700 border-rose-300',
};

const safeFormatDate = (value?: string) => {
  if (!value) return undefined;
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
};

const PickingCart = () => {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    data: uniqueOrder,
    isLoading: orderLoading,
    error: orderError,
  } = useUniqueOrderRecord(recordId);

  const orderNumber = useMemo(() => formatOrderNumber(uniqueOrder), [uniqueOrder]);

  const {
    data: lineItems = [],
    isLoading: itemsLoading,
    error: itemsError,
  } = useStockOrderItems(orderNumber);

  const { data: dispatchLog = [] } = useDispatchLog(recordId);

  const updateMutation = useUpdateUniqueOrder();

  const handleMarkPicked = () => {
    if (!recordId) return;

    const safeRecordId = recordId as string;

    updateMutation.mutate(
      {
        recordId: safeRecordId,
        fields: {
          'Pick Status': 'Picked',
        },
      },
      {
        onSuccess: () => {
          toast({
            title: 'Order marked as picked',
            description: `${orderNumber ?? 'Order'} is ready for dispatch.`,
          });

          const itemsPayload = lineItems.map((item) => ({
            deviceType: item.fields['Device type'] ?? 'Unknown',
            quantityOrdered: item.fields['Quantity ordered'] ?? 0,
            itemUrl: getLineItemImageUrl(item),
            itemCode: item.fields['Item Code'] as string | undefined,
          }));

          void n8nService
            .notifyOrderPicked({
              orderId: orderNumber ?? safeRecordId,
              uniqueOrderRecordId: safeRecordId,
              items: itemsPayload,
              metadata: {
                pickStatus: 'Picked',
                dispatchStatus: uniqueOrder?.fields['Dispatch Status'] ?? 'Pending',
                dateOrdered: uniqueOrder?.fields['Date Ordered'],
              },
            })
            .catch((error) => {
              console.error('Failed to send order picked webhook', error);
            });
        },
        onError: (mutationError: unknown) => {
          const description =
            mutationError instanceof Error ? mutationError.message : 'Unable to update order.';
          toast({
            title: 'Pick confirmation failed',
            description,
            variant: 'destructive',
          });
        },
      },
    );
  };

  const pickStatus = uniqueOrder?.fields['Pick Status'] ?? 'Not Picked';
  const dispatchStatus = uniqueOrder?.fields['Dispatch Status'] ?? 'Pending';
  const dateOrdered = safeFormatDate(uniqueOrder?.fields['Date Ordered']);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-sm text-muted-foreground">Picking Cart</p>
              <h1 className="text-2xl font-semibold">{orderNumber ?? 'Loading...'}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle variant="ghost" />
            {pickStatus && (
              <Badge variant="outline" className={`${statusBadgeTone[pickStatus] ?? 'border-border'}`}>
                Pick Status: {pickStatus}
              </Badge>
            )}
            {dispatchStatus && (
              <Badge
                variant="outline"
                className={`${dispatchBadgeTone[dispatchStatus] ?? 'border-border'}`}
              >
                Dispatch Status: {dispatchStatus}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {orderError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Unable to load order details. Please try again later.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-primary" />
              Order Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground">Recipient</p>
              <p className="text-base font-semibold text-foreground">
                {uniqueOrder?.fields['Recipient Name'] ?? '—'}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {uniqueOrder?.fields['Recipient Company Name'] ?? 'Company not captured'}
              </p>
              {uniqueOrder?.fields['Recipient Contact Number'] && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {uniqueOrder.fields['Recipient Contact Number']}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground">Logistics</p>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {dateOrdered ?? 'Date not captured'}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {uniqueOrder?.fields['Region'] ?? 'Region unknown'}
              </p>
              {uniqueOrder?.fields['Warehouse Fulfilling'] && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  {uniqueOrder.fields['Warehouse Fulfilling']}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground">Order Metrics</p>
              <p className="text-2xl font-bold text-foreground">
                {uniqueOrder?.fields['Quantity Ordered'] ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Total items requested</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{uniqueOrder?.fields['Item Category'] ?? 'Category'}</Badge>
                <Badge variant="outline">{uniqueOrder?.fields['Item Nature'] ?? 'Nature'}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Items to Pick
            </CardTitle>
            <Button
              onClick={handleMarkPicked}
              disabled={pickStatus === 'Picked' || updateMutation.isPending || !recordId}
              className="gap-2"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />} 
              {pickStatus === 'Picked' ? 'Already Picked' : 'Mark Order as Picked'}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {itemsLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                Loading line items...
              </div>
            ) : itemsError ? (
              <div className="p-4 text-sm text-destructive bg-destructive/10">
                Unable to load line items. Please refresh.
              </div>
            ) : lineItems.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No line items found for this order.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Item</TableHead>
                    <TableHead>Device Type</TableHead>
                    <TableHead className="hidden lg:table-cell">Description</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead className="hidden lg:table-cell">Item Code</TableHead>
                    <TableHead className="hidden xl:table-cell">Bin / Package</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => {
                    const imageUrl = getLineItemImageUrl(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                            {imageUrl ? (
                              <img src={imageUrl} alt={item.fields['Device type'] ?? 'Inventory item'} className="h-full w-full object-cover" />
                            ) : (
                              <PackageSearch className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {item.fields['Device type'] ?? 'Unknown'}
                        </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {item.fields['Item Description'] ?? '—'}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{item.fields['Quantity ordered'] ?? 0}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell font-mono text-xs">
                        {item.fields['Item Code'] ?? '—'}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-muted-foreground">
                        {item.fields['Package Reference'] ?? item.fields['Order Location'] ?? '—'}
                      </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {dispatchLog.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dispatch History</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              {dispatchLog.slice(0, 3).map((entry) => (
                <div key={entry.id} className="border border-border/40 rounded-md p-3">
                  <p className="font-medium text-foreground">
                    {entry.fields['Dispatch Method'] ?? 'Dispatch Update'}
                  </p>
                  <p>{safeFormatDate(entry.fields['Date Dispatched']) ?? 'Date not set'}</p>
                  <p className="text-xs text-muted-foreground">
                    Waybill: {entry.fields['Waybill number'] ?? 'Not captured'}
                  </p>
                </div>
              ))}
              {dispatchLog.length > 3 && (
                <p className="text-xs text-muted-foreground">Showing latest 3 dispatch events.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PickingCart;
