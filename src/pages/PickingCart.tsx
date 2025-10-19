import { useEffect, useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { useDispatchLog, useStockOrderItems, useUniqueOrderRecord, useUpdateUniqueOrder } from '@/hooks/useAirtable';
import { useToast } from '@/hooks/use-toast';
import { expandLineItemUnits, formatOrderNumber, getLineItemImageUrl, type ExpandedLineItemUnit } from '@/lib/orders';
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

  const expandedUnits = useMemo(() => expandLineItemUnits(lineItems), [lineItems]);

  const unitsByLineItemId = useMemo<Record<string, ExpandedLineItemUnit[]>>(() => {
    const map: Record<string, ExpandedLineItemUnit[]> = {};
    expandedUnits.forEach((unit) => {
      if (!map[unit.lineItemId]) {
        map[unit.lineItemId] = [];
      }
      map[unit.lineItemId].push(unit);
    });
    return map;
  }, [expandedUnits]);

  const serialRequiredUnits = useMemo(
    () => expandedUnits.filter((unit) => unit.isSerialised),
    [expandedUnits],
  );

  const [serialValues, setSerialValues] = useState<Record<string, string>>({});
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    setSerialValues((previous) => {
      const next: Record<string, string> = {};
      expandedUnits.forEach((unit) => {
        next[unit.unitId] = previous[unit.unitId] ?? '';
      });
      return next;
    });
    setShowValidation(false);
  }, [expandedUnits]);

  const trimmedSerialMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(serialValues).forEach(([unitId, value]) => {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        map[unitId] = trimmed;
      }
    });
    return map;
  }, [serialValues]);

  const missingSerialUnitIds = useMemo(() => {
    const missing = new Set<string>();
    serialRequiredUnits.forEach((unit) => {
      if (!trimmedSerialMap[unit.unitId]) {
        missing.add(unit.unitId);
      }
    });
    return missing;
  }, [serialRequiredUnits, trimmedSerialMap]);

  const duplicateSerialUnitIds = useMemo(() => {
    const duplicates = new Set<string>();
    const seen = new Map<string, string[]>();

    serialRequiredUnits.forEach((unit) => {
      const value = trimmedSerialMap[unit.unitId];
      if (!value) return;
      const normalised = value.toUpperCase();
      const existing = seen.get(normalised) ?? [];
      existing.push(unit.unitId);
      seen.set(normalised, existing);
    });

    seen.forEach((unitIds) => {
      if (unitIds.length > 1) {
        unitIds.forEach((id) => duplicates.add(id));
      }
    });

    return duplicates;
  }, [serialRequiredUnits, trimmedSerialMap]);

  const totalSerialRequired = serialRequiredUnits.length;
  const totalSerialCaptured = serialRequiredUnits.filter((unit) =>
    Boolean(trimmedSerialMap[unit.unitId])
  ).length;

  const canSubmitSerials =
    totalSerialRequired === 0 || (missingSerialUnitIds.size === 0 && duplicateSerialUnitIds.size === 0);

  const updateSerialValue = (unitId: string, value: string) => {
    setSerialValues((previous) => ({
      ...previous,
      [unitId]: value,
    }));
  };

  const handleMarkPicked = () => {
    if (!recordId) return;

    setShowValidation(true);

    if (!canSubmitSerials) {
      const description = missingSerialUnitIds.size > 0
        ? 'Capture serial numbers for all required units before marking this order as picked.'
        : 'Resolve duplicate serial numbers before marking this order as picked.';

      toast({
        title: 'Serial capture incomplete',
        description,
        variant: 'destructive',
      });
      return;
    }

    const safeRecordId = recordId as string;

    const serialUnitsPayload = expandedUnits.map((unit) => ({
      unitId: unit.unitId,
      lineItemId: unit.lineItemId,
      unitIndex: unit.unitIndex,
      totalUnits: unit.totalUnits,
      deviceType: unit.deviceType,
      itemCode: unit.itemCode,
      isSerialised: unit.isSerialised,
      serialNumber: trimmedSerialMap[unit.unitId] ?? null,
    }));

    const itemsPayload = lineItems.map((item) => {
      const unitsForItem = unitsByLineItemId[item.id] ?? [];
      const serialNumbers = unitsForItem
        .map((unit) => trimmedSerialMap[unit.unitId])
        .filter((value): value is string => Boolean(value));

      const quantityOrdered = item.fields['Quantity ordered'] ?? unitsForItem.length;

      return {
        deviceType: item.fields['Device Type'] ?? 'Unknown',
        quantityOrdered,
        itemUrl: getLineItemImageUrl(item),
        itemCode: item.fields['Item Code'] as string | undefined,
        itemDescription: item.fields['Item Description'] as string | undefined,
        itemCategory: item.fields['Item Category'] as string | undefined,
        itemNature: item.fields['Item Nature'] as string | undefined,
        itemId: item.id,
        serialNumbers,
        units: unitsForItem.map((unit) => ({
          unitId: unit.unitId,
          unitIndex: unit.unitIndex,
          totalUnits: unit.totalUnits,
          serialNumber: trimmedSerialMap[unit.unitId] ?? null,
          isSerialised: unit.isSerialised,
          itemCode: unit.itemCode,
        })),
      };
    });

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

          void n8nService
            .notifyOrderPicked({
              orderId: orderNumber ?? safeRecordId,
              uniqueOrderRecordId: safeRecordId,
              items: itemsPayload,
              metadata: {
                pickStatus: 'Picked',
                dispatchStatus: uniqueOrder?.fields['Dispatch Status'] ?? 'Pending',
                dateOrdered: uniqueOrder?.fields['Date Ordered'],
                serialCapture: {
                  requiredUnits: totalSerialRequired,
                  capturedUnits: totalSerialCaptured,
                  units: serialUnitsPayload,
                },
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
  const inputsDisabled = pickStatus === 'Picked' || updateMutation.isPending;

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
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Items to Pick
            </CardTitle>
            <div className="flex flex-col items-stretch gap-1 sm:items-end">
              <Button
                onClick={handleMarkPicked}
                disabled={pickStatus === 'Picked' || updateMutation.isPending || !recordId}
                className="gap-2"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="h-4 w-4" />
                )}
                {pickStatus === 'Picked' ? 'Already Picked' : 'Mark Order as Picked'}
              </Button>
              {totalSerialRequired > 0 && (
                <p className="text-xs text-muted-foreground">
                  Serial units captured: {totalSerialCaptured}/{totalSerialRequired}
                </p>
              )}
              {totalSerialRequired > 0 && !canSubmitSerials && (
                <p className="text-xs text-destructive">
                  {duplicateSerialUnitIds.size > 0
                    ? 'Resolve duplicate serial numbers before marking as picked.'
                    : 'Capture all required serial numbers to continue.'}
                </p>
              )}
            </div>
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
              <div className="space-y-6 p-4">
                {lineItems.map((item) => {
                  const unitsForItem = unitsByLineItemId[item.id] ?? [];
                  const imageUrl = getLineItemImageUrl(item);
                  const quantityOrdered = item.fields['Quantity ordered'] ?? unitsForItem.length;
                  const requiresSerial = unitsForItem.some((unit) => unit.isSerialised);

                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border/40 bg-card/40 p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={item.fields['Device Type'] ?? 'Inventory item'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <PackageSearch className="h-6 w-6 text-primary" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-foreground">
                              {item.fields['Device Type'] ?? 'Unknown device'}
                            </p>
                            <p className="text-xs text-muted-foreground max-w-md">
                              {item.fields['Item Description'] ?? 'No description captured.'}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                              <span>Qty: {quantityOrdered}</span>
                              {(item.fields['Item Code'] as string | undefined) && (
                                <span className="font-semibold">
                                  {item.fields['Item Code'] as string}
                                </span>
                              )}
                              {requiresSerial ? (
                                <span className="rounded-full border border-emerald-400 px-1.5 py-0.5 font-semibold text-emerald-600">
                                  Serial Capture
                                </span>
                              ) : (
                                <span className="rounded-full border border-muted-foreground/40 px-1.5 py-0.5 font-semibold text-muted-foreground">
                                  Stock Item
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 md:text-right">
                          <p>Bin / Package: {item.fields['Package Reference'] ?? item.fields['Order Location'] ?? '—'}</p>
                          {item.fields['Item Category'] && <p>Category: {item.fields['Item Category']}</p>}
                          {item.fields['Item Nature'] && <p>Nature: {item.fields['Item Nature']}</p>}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {unitsForItem.map((unit) => {
                          const serialValue = serialValues[unit.unitId] ?? '';
                          const hasDuplicate = duplicateSerialUnitIds.has(unit.unitId);
                          const hasMissing = unit.isSerialised && showValidation && missingSerialUnitIds.has(unit.unitId);
                          const hasError = unit.isSerialised && (hasDuplicate || hasMissing);
                          const helperText = hasDuplicate
                            ? 'Duplicate serial captured'
                            : hasMissing
                              ? 'Serial required'
                              : '';

                          return (
                            <div
                              key={unit.unitId}
                              className={`rounded-lg border bg-background p-3 shadow-sm transition-colors ${
                                hasError
                                  ? 'border-destructive/70 ring-1 ring-destructive/30'
                                  : 'border-border/40 hover:border-primary/40'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                                  {unit.imageUrl ? (
                                    <img
                                      src={unit.imageUrl}
                                      alt={unit.deviceType}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <PackageSearch className="h-5 w-5 text-primary" />
                                  )}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <p className="text-sm font-medium text-foreground">{unit.deviceType}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {unit.description ?? 'No description'}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                                    <span>
                                      Unit {unit.unitIndex} of {unit.totalUnits}
                                    </span>
                                    {unit.itemCode && <span className="font-semibold">{unit.itemCode}</span>}
                                    <span
                                      className={`rounded-full border px-1.5 py-0.5 font-semibold ${
                                        unit.isSerialised
                                          ? 'border-emerald-400 text-emerald-600'
                                          : 'border-muted-foreground/40 text-muted-foreground'
                                      }`}
                                    >
                                      {unit.isSerialised ? 'Serial' : 'Stock'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {unit.isSerialised ? (
                                <div className="mt-3 space-y-1">
                                  <p className="text-xs font-semibold text-muted-foreground">Serial Number</p>
                                  <Input
                                    value={serialValue}
                                    onChange={(event) => updateSerialValue(unit.unitId, event.target.value)}
                                    placeholder="Scan or enter serial"
                                    autoComplete="off"
                                    inputMode="text"
                                    aria-invalid={hasError}
                                    disabled={inputsDisabled}
                                    className={hasError ? 'border-destructive focus-visible:ring-destructive' : undefined}
                                  />
                                  {hasError && (
                                    <p className="text-xs text-destructive">{helperText}</p>
                                  )}
                                </div>
                              ) : (
                                <p className="mt-3 text-xs text-muted-foreground">No serial capture required.</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
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
