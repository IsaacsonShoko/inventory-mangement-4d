import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Loader2,
  Truck,
  ClipboardList,
  PackageSearch,
  Calendar,
  Building2,
  MapPin,
  FileText,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useDispatchLog, useStockOrderItems, useUniqueOrderRecord, useUpdateUniqueOrder } from '@/hooks/useAirtable';
import { useToast } from '@/hooks/use-toast';
import { formatOrderNumber, getLineItemImageUrl } from '@/lib/orders';
import { n8nService } from '@/integrations/n8n';
import ThemeToggle from '@/components/theme-toggle';

const dispatchBadgeTone: Record<string, string> = {
  Dispatched: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  Pending: 'bg-sky-100 text-sky-700 border-sky-300',
  Partial: 'bg-amber-100 text-amber-700 border-amber-300',
  'Not Dispatched': 'bg-rose-100 text-rose-700 border-rose-300',
};

const pickBadgeTone: Record<string, string> = {
  Picked: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  Pending: 'bg-amber-100 text-amber-700 border-amber-300',
};

const safeFormatDate = (value?: string) => {
  if (!value) return undefined;
  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
};

const dispatchMethods = ['Courier', 'In-house Delivery', 'Pickup', 'Other'];

const DispatchCart = () => {
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

  const { data: dispatchLog = [], isLoading: dispatchLogLoading } = useDispatchLog(recordId);

  const updateMutation = useUpdateUniqueOrder();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dispatchMethod, setDispatchMethod] = useState<string>('Courier');
  const [waybillNumber, setWaybillNumber] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const pickStatus = uniqueOrder?.fields['Pick Status'] ?? 'Pending';
  const dispatchStatus = uniqueOrder?.fields['Dispatch Status'] ?? 'Pending';
  const dateOrdered = safeFormatDate(uniqueOrder?.fields['Date Ordered']);

  const handleCompleteDispatch = () => {
    if (!recordId) return;

    const fields: Record<string, unknown> = {
      'Dispatch Status': 'Dispatched',
    };

    if (dispatchMethod) {
      fields['Dispatch Method'] = dispatchMethod;
    }

    if (waybillNumber) {
      fields['WayBill Number'] = waybillNumber;
    }

    if (additionalNotes) {
      const mergedNotes = [uniqueOrder?.fields['Order Notes'], additionalNotes]
        .filter(Boolean)
        .join('\n');
      fields['Order Notes'] = mergedNotes;
    }

    updateMutation.mutate(
      {
        recordId,
        fields,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Dispatch completed',
            description: `${orderNumber ?? 'Order'} has been marked as dispatched.`,
          });

          const itemsPayload = lineItems.map((item) => ({
            deviceType: item.fields['Device type'] ?? 'Unknown',
            quantityOrdered: item.fields['Quantity ordered'] ?? 0,
            itemUrl: getLineItemImageUrl(item),
            itemCode: item.fields['Item Code'] as string | undefined,
          }));

          void n8nService
            .notifyOrderDispatched({
              orderId: orderNumber ?? recordId,
              uniqueOrderRecordId: recordId,
              items: itemsPayload,
              metadata: {
                dispatchMethod: dispatchMethod || uniqueOrder?.fields['Dispatch Method'],
                waybillNumber: waybillNumber || uniqueOrder?.fields['WayBill Number'],
                dispatchStatus: 'Dispatched',
                pickStatus: uniqueOrder?.fields['Pick Status'],
                additionalNotes,
              },
            })
            .catch((error) => {
              console.error('Failed to send order dispatched webhook', error);
            });

          setDialogOpen(false);
        },
        onError: (mutationError: unknown) => {
          const description =
            mutationError instanceof Error ? mutationError.message : 'Unable to update dispatch status.';
          toast({
            title: 'Dispatch update failed',
            description,
            variant: 'destructive',
          });
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-sm text-muted-foreground">Dispatch Cart</p>
              <h1 className="text-2xl font-semibold">{orderNumber ?? 'Loading...'}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle variant="ghost" />
            <Badge variant="outline" className={`${pickBadgeTone[pickStatus] ?? 'border-border'}`}>
              Pick Status: {pickStatus}
            </Badge>
            <Badge variant="outline" className={`${dispatchBadgeTone[dispatchStatus] ?? 'border-border'}`}>
              Dispatch Status: {dispatchStatus}
            </Badge>
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
              <Truck className="h-5 w-5 text-primary" />
              Dispatch Overview
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
                  <FileText className="h-4 w-4" />
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
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <PackageSearch className="h-4 w-4" />
                {uniqueOrder?.fields['Warehouse Fulfilling'] ?? 'Warehouse not set'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground">Current Dispatch</p>
              <p className="text-muted-foreground">
                Method: {uniqueOrder?.fields['Dispatch Method'] ?? 'Not captured'}
              </p>
              <p className="text-muted-foreground">
                Waybill: {uniqueOrder?.fields['WayBill Number'] ?? 'Not captured'}
              </p>
              <p className="text-muted-foreground">
                Delivery Party: {uniqueOrder?.fields['Deliver to Part'] ?? '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Items to Dispatch
            </CardTitle>
            <Button
              onClick={() => setDialogOpen(true)}
              disabled={dispatchStatus === 'Dispatched' || updateMutation.isPending || !recordId}
              className="gap-2"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />} 
              {dispatchStatus === 'Dispatched' ? 'Already Dispatched' : 'Complete Dispatch'}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {itemsLoading ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                Loading dispatch items...
              </div>
            ) : itemsError ? (
              <div className="p-4 text-sm text-destructive bg-destructive/10">
                Unable to load line items. Please refresh.
              </div>
            ) : lineItems.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No items ready for dispatch.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Item</TableHead>
                    <TableHead>Device Type</TableHead>
                    <TableHead className="hidden lg:table-cell">Description</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead className="hidden lg:table-cell">Item Code</TableHead>
                    <TableHead className="hidden xl:table-cell">Waybill / Package</TableHead>
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
                        {item.fields['Waybill number'] ?? item.fields['Package Reference'] ?? '—'}
                      </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dispatch History</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            {dispatchLogLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading history...
              </div>
            ) : dispatchLog.length === 0 ? (
              <p>No dispatch events recorded yet.</p>
            ) : (
              dispatchLog.slice(0, 4).map((entry) => (
                <div key={entry.id} className="border border-border/40 rounded-md p-3">
                  <p className="font-medium text-foreground">
                    {entry.fields['Dispatch Method'] ?? 'Dispatch Update'}
                  </p>
                  <p>{safeFormatDate(entry.fields['Date Dispatched']) ?? 'Date not set'}</p>
                  <p className="text-xs text-muted-foreground">
                    Waybill: {entry.fields['Waybill number'] ?? 'Not captured'}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Dispatch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Dispatch Method</label>
              <Select value={dispatchMethod} onValueChange={setDispatchMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {dispatchMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="waybill-input">
                Waybill Number
              </label>
              <Input
                id="waybill-input"
                value={waybillNumber}
                onChange={(event) => setWaybillNumber(event.target.value)}
                placeholder="Enter courier waybill"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="notes-input">
                Additional Notes (optional)
              </label>
              <Textarea
                id="notes-input"
                value={additionalNotes}
                onChange={(event) => setAdditionalNotes(event.target.value)}
                rows={4}
                placeholder="Capture handover instructions, packaging references, or courier details."
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteDispatch} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Confirm Dispatch'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DispatchCart;
