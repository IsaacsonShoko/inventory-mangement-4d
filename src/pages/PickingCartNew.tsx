import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  Building2,
  Package as PackageIcon,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Plus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  useStockOrderItems,
  useUniqueOrderRecord,
  useUpdateUniqueOrder,
  useUpdateStockOrderLines,
} from '@/hooks/useAirtable';

import { formatOrderNumber, getLineItemImageUrl } from '@/lib/orders';
import { n8nService } from '@/integrations/n8n';
import ThemeToggle from '@/components/theme-toggle';
import type { StockOrderLineItem } from '@/types/airtable';
import type { StockOrderPickedUpdateInput } from '@/integrations/airtable';

interface PickedItemData {
  stockOrderId: string;
  deviceType: string;
  quantity: number;
  stockAvailability: 'In Stock' | 'Out of stock' | '';
  pickStatus: 'Picked in full' | 'Partially picked' | 'Not picked' | '';
  packer: string;
  // Serial numbers
  terminalSerialNumber?: string;
  cradleSerialNumber?: string;
  chargerSerialNumber?: string;
  cashConnectSerialNumber?: string;
  // Accessories
  chargerPacked?: 'Y' | 'N' | '';
  cables?: 'Y' | 'N' | '';
  itemCode?: string;
  itemDescription?: string;
}

const PickingCartNew = () => {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    data: uniqueOrder,
    isLoading: orderLoading,
  } = useUniqueOrderRecord(recordId!);

  const orderNumber = useMemo(() => formatOrderNumber(uniqueOrder), [uniqueOrder]);

  const {
    data: lineItems = [],
    isLoading: itemsLoading,
  } = useStockOrderItems(orderNumber);

  const updateMutation = useUpdateUniqueOrder();
  const stockOrderUpdateMutation = useUpdateStockOrderLines();

  const [pickedItems, setPickedItems] = useState<PickedItemData[]>([]);
  const [selectedLineItem, setSelectedLineItem] = useState<StockOrderLineItem | null>(null);
  const [showPickDialog, setShowPickDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<PickedItemData>>({
    stockAvailability: '',
    pickStatus: '',
    packer: '', // Will default to user email in real implementation
    chargerPacked: '',
    cables: '',
  });

  const totalQuantity = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.fields['Quantity ordered'] ?? 0), 0);
  }, [lineItems]);

  const pickedQuantity = useMemo(() => {
    return pickedItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [pickedItems]);

  const progressPercent = totalQuantity > 0 ? (pickedQuantity / totalQuantity) * 100 : 0;

  const handleOpenPickDialog = (item: StockOrderLineItem) => {
    setSelectedLineItem(item);
    setFormData({
      stockAvailability: '',
      pickStatus: '',
      packer: 'user@example.com', // Replace with actual user email
      chargerPacked: '',
      cables: '',
      quantity: 1,
    });
    setShowPickDialog(true);
  };

  const handleAddPickedItem = () => {
    if (!selectedLineItem || !formData.stockAvailability || !formData.pickStatus) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in Stock Availability and Pick Status',
        variant: 'destructive',
      });
      return;
    }

    const isSerialised = selectedLineItem.fields['Item Nature']?.toLowerCase().includes('serial');

    // Check for duplicate serial numbers
    if (isSerialised && formData.terminalSerialNumber) {
      const duplicate = pickedItems.find(
        (item) =>
          item.terminalSerialNumber &&
          item.terminalSerialNumber.toUpperCase() === formData.terminalSerialNumber!.toUpperCase()
      );
      if (duplicate) {
        toast({
          title: 'Duplicate serial number',
          description: 'This serial number has already been scanned',
          variant: 'destructive',
        });
        return;
      }
    }

    const newItem: PickedItemData = {
      stockOrderId: selectedLineItem.id,
      deviceType: selectedLineItem.fields['Device Type'],
      quantity: isSerialised ? 1 : (formData.quantity ?? 1),
      stockAvailability: formData.stockAvailability!,
      pickStatus: formData.pickStatus!,
      packer: formData.packer!,
      terminalSerialNumber: formData.terminalSerialNumber,
      cradleSerialNumber: formData.cradleSerialNumber,
      chargerSerialNumber: formData.chargerSerialNumber,
      cashConnectSerialNumber: formData.cashConnectSerialNumber,
      chargerPacked: formData.chargerPacked,
      cables: formData.cables,
      itemCode: formData.itemCode,
      itemDescription: formData.itemDescription,
    };

    setPickedItems([...pickedItems, newItem]);
    setShowPickDialog(false);
    setSelectedLineItem(null);

    toast({
      title: 'Item added',
      description: 'Item has been added to the picking cart',
    });
  };

  const handleRemovePickedItem = (index: number) => {
    setPickedItems(pickedItems.filter((_, i) => i !== index));
  };

  const handleSubmitPick = async () => {
    if (pickedItems.length === 0) {
      toast({
        title: 'No items picked',
        description: 'Please pick at least one item',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const stockOrderUpdates: StockOrderPickedUpdateInput[] = pickedItems.map((item) => ({
        stockOrderId: item.stockOrderId,
        quantity: item.quantity,
        stockAvailability: item.stockAvailability,
        pickStatus: item.pickStatus,
      }));

      // Prepare comprehensive payload for n8n webhook
      const uniqueOrderFields = uniqueOrder?.fields ?? null;
      const lineItemLookup = new Map(lineItems.map((item) => [item.id, item]));

      const stockOrderItemsPayload = lineItems.map((item) => ({
        id: item.id,
        fields: item.fields,
      }));

      const itemsPayload = pickedItems.map((item) => {
        const sourceFields = lineItemLookup.get(item.stockOrderId)?.fields as
          | StockOrderLineItem['fields']
          | undefined;

        const serialNumbers = [
          item.terminalSerialNumber,
          item.cradleSerialNumber,
          item.chargerSerialNumber,
          item.cashConnectSerialNumber,
        ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

        return {
          deviceType: item.deviceType,
          quantityOrdered: item.quantity,
          itemDescription: item.itemDescription ?? sourceFields?.['Item Description'],
          itemCategory: sourceFields?.['Item Category'],
          itemNature: sourceFields?.['Item Nature'],
          itemId: item.stockOrderId,
          itemCode: item.itemCode ?? sourceFields?.['Item Code'],
          serialNumbers: serialNumbers.length > 0 ? serialNumbers : undefined,
        };
      });

      const payload = {
        orderId: orderNumber ?? 'unknown',
        uniqueOrderRecordId: recordId!,
        uniqueOrderFields,
        stockOrderItems: stockOrderItemsPayload,
        totalQuantity: totalQuantity,
        pickedQuantity: pickedQuantity,
        dateOrdered: uniqueOrder?.fields['Date Ordered'],
        orderedBy: uniqueOrder?.fields['Ordered by'],
        deliveryParty: uniqueOrder?.fields['Deliver to Part'],
        items: itemsPayload,
        // Send ALL picked items in an array for n8n to loop through
        pickedItems: pickedItems.map((item) => ({
          stockOrderId: item.stockOrderId,
          deviceType: item.deviceType,
          quantity: item.quantity,
          stockAvailability: item.stockAvailability,
          pickStatus: item.pickStatus,
          packer: item.packer,
          terminalSerialNumber: item.terminalSerialNumber || null,
          cradleSerialNumber: item.cradleSerialNumber || null,
          chargerSerialNumber: item.chargerSerialNumber || null,
          cashConnectSerialNumber: item.cashConnectSerialNumber || null,
          chargerPacked: item.chargerPacked || null,
          cables: item.cables || null,
          itemCode: item.itemCode || null,
          itemDescription: item.itemDescription || null,
        })),
        metadata: {
          pickedAt: new Date().toISOString(),
          pickerEmail: pickedItems[0]?.packer || 'unknown',
          contractorCompany: uniqueOrder?.fields['Contractor Company'] ?? null,
          region: uniqueOrder?.fields['Region'] ?? null,
          technician: uniqueOrder?.fields['Technician'] ?? null,
          dispatchMethod: uniqueOrder?.fields['Dispatch Method'] ?? null,
          warehouseFulfilling: uniqueOrder?.fields['Warehouse Fulfilling'] ?? null,
          waybillNumber: uniqueOrder?.fields['WayBill Number'] ?? null,
          packageReference: uniqueOrder?.fields['Package Reference'] ?? null,
          dispatchStatus: uniqueOrder?.fields['Dispatch Status'] ?? null,
          recordLinks: {
            stockOrder: uniqueOrder?.fields['Stock Order'] ?? null,
            dispatchLog: uniqueOrder?.fields['Dispatch Log'] ?? null,
          },
        }
      };

      console.log('[Picking Cart] Submitting payload:', payload);

      // Send to n8n webhook
      await n8nService.notifyOrderPicked(payload);

      let stockOrderUpdateError: Error | null = null;

      try {
        await stockOrderUpdateMutation.mutateAsync({
          pickedItems: stockOrderUpdates,
          orderNumber: orderNumber ?? undefined,
        });
      } catch (updateError) {
        console.error('[Picking Cart] Stock order update failed:', updateError);
        stockOrderUpdateError = updateError instanceof Error
          ? updateError
          : new Error('Unknown stock order update error');
      }

      // Update unique order status
      await updateMutation.mutateAsync({
        recordId: recordId!,
        fields: {
          'Pick Status': pickedQuantity === totalQuantity ? 'Picked' : 'Partially Picked',
        },
      });

      toast({
        title: 'Order picked successfully',
        description: `${pickedQuantity} items have been picked`,
      });

      if (stockOrderUpdateError) {
        toast({
          title: 'Stock order update failed',
          description:
            stockOrderUpdateError.message ||
            'Stock order lines could not be updated in Airtable. Please review the record manually.',
          variant: 'destructive',
          duration: 10000,
        });
      }
      setPickedItems([]);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('[Picking Cart] Submission error:', error);
      
      let errorMessage = 'An error occurred while submitting the order';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more specific error messages
        if (error.message.includes('fetch')) {
          errorMessage = 'Unable to connect to webhook. Please check your network connection and webhook URL configuration.';
        } else if (error.message.includes('webhook')) {
          errorMessage = 'Webhook error: ' + error.message;
        } else if (error.message.includes('Airtable')) {
          errorMessage = 'Database error: ' + error.message;
        }
      }
      
      toast({
        title: 'Failed to submit',
        description: errorMessage,
        variant: 'destructive',
        duration: 10000, // Show error longer
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessNavigation = (path: string) => {
    setShowSuccessModal(false);
    navigate(path);
  };

  const getOrderDate = (value?: string) => {
    if (!value) return undefined;
    try {
      return format(parseISO(value), 'dd MMM yyyy');
    } catch {
      return value;
    }
  };

  const isSerialised = (item: StockOrderLineItem) =>
    item.fields['Item Nature']?.toLowerCase().includes('serial');

  if (orderLoading || itemsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const orderDate = getOrderDate(uniqueOrder?.fields['Date Ordered']);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-4 shadow-sm">
        <div className="container mx-auto px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/picking-queue">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Picking Cart</h1>
              <p className="text-sm text-primary-foreground/80">{orderNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">
              Pick Status: {uniqueOrder?.fields['Pick Status'] ?? 'Not Picked'}
            </Badge>
            <Badge variant="outline" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">
              Dispatch Status: {uniqueOrder?.fields['Dispatch Status'] ?? 'Pending'}
            </Badge>
            <ThemeToggle variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/20" />
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Pick and Prep Progress</span>
              <span>
                {pickedQuantity} / {totalQuantity} items ({Math.round(progressPercent)}%)
              </span>
            </div>
            <Progress 
              value={progressPercent} 
              className="h-3 [&>div]:bg-green-600 [&>div]:transition-all [&>div]:duration-500 [&>div]:ease-out" 
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Overview */}
          <Card className="lg:col-span-1">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PackageIcon className="h-5 w-5" />
                Order Overview
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Recipient</p>
                  <p className="font-medium">{uniqueOrder?.fields['Recipient Name'] ?? '—'}</p>
                  <p className="text-sm text-muted-foreground">
                    {uniqueOrder?.fields['Recipient Company Name'] ?? 'No company captured'}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Logistics</p>
                  <div className="space-y-1 text-sm">
                    {orderDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{orderDate}</span>
                      </div>
                    )}
                    {uniqueOrder?.fields['Region'] && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>Region: {uniqueOrder.fields['Region']}</span>
                      </div>
                    )}
                    <p>Deliver to: {uniqueOrder?.fields['Deliver to Part'] ?? '—'}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Order Metrics</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm">Total Items</span>
                    <span className="text-2xl font-bold">{totalQuantity}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge>{uniqueOrder?.fields['Item Category']}</Badge>
                    <Badge variant="outline">{uniqueOrder?.fields['Item Nature']}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items to Pick */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Items to Pick</h2>
                <Button onClick={handleSubmitPick} disabled={pickedItems.length === 0 || isSubmitting} size="lg">
                  {isSubmitting ? 'Submitting...' : 'Mark Order as Picked'}
                </Button>
              </div>

              {lineItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No line items found for this order</div>
              ) : (
                <div className="space-y-3">
                  {lineItems.map((item) => {
                    const imageUrl = getLineItemImageUrl(item);
                    const itemPicked = pickedItems.filter((p) => p.stockOrderId === item.id);
                    const quantityOrdered = item.fields['Quantity ordered'] ?? 0;
                    const quantityPicked = itemPicked.reduce((sum, p) => sum + p.quantity, 0);
                    const isComplete = quantityPicked >= quantityOrdered;

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-4 p-4 border rounded-lg ${
                          isComplete ? 'bg-green-50 border-green-200' : 'bg-card'
                        }`}
                      >
                        <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {imageUrl ? (
                            <img src={imageUrl} alt={item.fields['Device Type']} className="h-full w-full object-cover" />
                          ) : (
                            <PackageIcon className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{item.fields['Device Type']}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.fields['Item Description'] ?? 'No description'}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs">
                              Qty: <span className="font-semibold">{quantityOrdered}</span>
                            </span>
                            {item.fields['Item Code'] && (
                              <span className="text-xs text-muted-foreground">{item.fields['Item Code']}</span>
                            )}
                            <Badge variant="outline" className="text-[10px]">
                              {isSerialised(item) ? 'Serial' : 'Stock'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Picked:</span>{' '}
                            <span className={`font-semibold ${isComplete ? 'text-green-600' : ''}`}>
                              {quantityPicked}
                            </span>
                          </div>
                          {isComplete ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Complete
                            </Badge>
                          ) : (
                            <Button size="sm" onClick={() => handleOpenPickDialog(item)}>
                              <Plus className="h-4 w-4 mr-1" />
                              Pick Item
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Picked Items Summary */}
              {pickedItems.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Picked Items ({pickedItems.length})
                  </h3>
                  <div className="space-y-2">
                    {pickedItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md text-sm">
                        <div className="flex-1">
                          <p className="font-medium">{item.deviceType}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span>Qty: {item.quantity}</span>
                            <span>{item.pickStatus}</span>
                            {item.terminalSerialNumber && <span>SN: {item.terminalSerialNumber}</span>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePickedItem(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="w-[min(90vw,36rem)] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Order marked as picked
            </DialogTitle>
            <DialogDescription>
              Choose where to go next. You can return to the picking queue, jump to the dispatch queue, or head back home.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button variant="outline" onClick={() => handleSuccessNavigation('/')}>Home</Button>
            <Button variant="outline" onClick={() => handleSuccessNavigation('/dispatching')}>
              Go to Dispatch Queue
            </Button>
            <Button onClick={() => handleSuccessNavigation('/picking')}>Back to Picking Queue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pick Item Dialog */}
      <Dialog open={showPickDialog} onOpenChange={setShowPickDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pick Item: {selectedLineItem?.fields['Device Type']}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Stock Availability */}
            <div className="space-y-2">
              <Label htmlFor="stockAvailability">
                Stock Availability <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.stockAvailability}
                onValueChange={(value) => {
                  setFormData({ ...formData, stockAvailability: value as any, pickStatus: '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In Stock">In Stock</SelectItem>
                  <SelectItem value="Out of stock">Out of stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pick Status */}
            <div className="space-y-2">
              <Label htmlFor="pickStatus">
                Pick Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.pickStatus}
                onValueChange={(value) => setFormData({ ...formData, pickStatus: value as any })}
                disabled={!formData.stockAvailability}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {formData.stockAvailability === 'In Stock' ? (
                    <>
                      <SelectItem value="Picked in full">Picked in full</SelectItem>
                      <SelectItem value="Partially picked">Partially picked</SelectItem>
                    </>
                  ) : (
                    <SelectItem value="Not picked">Not picked</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity (for non-serialised) */}
            {selectedLineItem && !isSerialised(selectedLineItem) && (
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
            )}

            {/* Packer */}
            <div className="space-y-2">
              <Label htmlFor="packer">Packer</Label>
              <Input
                id="packer"
                type="email"
                value={formData.packer}
                onChange={(e) => setFormData({ ...formData, packer: e.target.value })}
              />
            </div>

            {/* Serial Numbers (for serialised items) */}
            {selectedLineItem && isSerialised(selectedLineItem) && (
              <>
                <Separator />
                <p className="text-sm font-semibold text-center">Scan Device Serial Numbers</p>

                <div className="space-y-2">
                  <Label htmlFor="terminalSerial">Manufacture Serial Number</Label>
                  <Input
                    id="terminalSerial"
                    value={formData.terminalSerialNumber}
                    onChange={(e) => setFormData({ ...formData, terminalSerialNumber: e.target.value })}
                    placeholder="Scan or enter serial number"
                  />
                </div>

                {/* Cash Connect Serial */}
                {selectedLineItem.fields['Item Category']?.includes('Cash Connect') && (
                  <div className="space-y-2">
                    <Label htmlFor="cashConnectSerial">CashConnect Serial Number</Label>
                    <Input
                      id="cashConnectSerial"
                      value={formData.cashConnectSerialNumber}
                      onChange={(e) => setFormData({ ...formData, cashConnectSerialNumber: e.target.value })}
                    />
                  </div>
                )}

                {/* Accessories */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="charger">Charger</Label>
                    <Select
                      value={formData.chargerPacked}
                      onValueChange={(value) => setFormData({ ...formData, chargerPacked: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Y">Yes</SelectItem>
                        <SelectItem value="N">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cables">Cables</Label>
                    <Select
                      value={formData.cables}
                      onValueChange={(value) => setFormData({ ...formData, cables: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Y">Yes</SelectItem>
                        <SelectItem value="N">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.chargerPacked === 'Y' && (
                  <div className="space-y-2">
                    <Label htmlFor="chargerSerial">Charger Serial Number</Label>
                    <Input
                      id="chargerSerial"
                      value={formData.chargerSerialNumber}
                      onChange={(e) => setFormData({ ...formData, chargerSerialNumber: e.target.value })}
                    />
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPickDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPickedItem}>Add to Cart</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PickingCartNew;
