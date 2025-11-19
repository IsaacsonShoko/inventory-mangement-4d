import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  useDispatchLog,
  useStockOrderItems,
  useUniqueOrderRecord,
  useUpdateDispatchLogEntries,
  useUpdateUniqueOrder,
} from '@/hooks/useSupabase';
import { useToast } from '@/hooks/use-toast';
import { formatOrderNumber, getLineItemImageUrl } from '@/lib/orders';
import { downloadOrderManifestPdf, type ManifestItemRow, type ManifestPayload } from '@/lib/order-manifest';
import { n8nService } from '@/integrations/n8n';
import ThemeToggle from '@/components/theme-toggle';
import { cn, coerceToString } from '@/lib/utils';
import type { DispatchLogEntry, StockOrderLineItem } from '@/integrations/supabase/services';
import type { DispatchLogUpdateInput } from '@/integrations/supabase';

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

const dispatchMethods = ['Delivery', 'Collection', 'Courier', 'In-house Delivery', 'Pickup', 'Other'];
const methodsRequiringWaybill = new Set(['Delivery', 'Courier', 'In-house Delivery']);

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

  const { data: dispatchLog = [], isLoading: dispatchLogLoading } = useDispatchLog(orderNumber);

  const updateMutation = useUpdateUniqueOrder();
  const updateDispatchLogMutation = useUpdateDispatchLogEntries();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dispatchMethod, setDispatchMethod] = useState<string>('Courier');
  const [waybillNumber, setWaybillNumber] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedLineItemId, setSelectedLineItemId] = useState<string | null>(null);
  const [isSavingItem, setIsSavingItem] = useState(false);

  type DispatchItemFormState = {
    dispatchLogId?: string;
    dispatchMethod?: string;
    waybillNumber?: string;
    packageReference?: string;
    multiplePackages?: boolean;
    dispatcher?: string;
    shipped?: boolean;
    dispatchToLocation?: string;
    timeDispatched?: string;
    chargerPacked?: 'Y' | 'N' | '';
    cables?: 'Y' | 'N' | '';
  };

  const [dispatchItemForms, setDispatchItemForms] = useState<Record<string, DispatchItemFormState>>({});
  const [referencedItemIds, setReferencedItemIds] = useState<Set<string>>(new Set());

  const pickStatus = uniqueOrder?.pick_status ?? 'Pending';
  const dispatchStatus = uniqueOrder?.dispatch_status ?? 'Pending';
  const dateOrdered = safeFormatDate(uniqueOrder?.date_ordered);

  const dispatchLogById = useMemo(() => {
    return dispatchLog.reduce<Record<string, DispatchLogEntry>>((acc, entry) => {
      acc[entry.id] = entry;
      return acc;
    }, {});
  }, [dispatchLog]);

  const stockItemsById = useMemo(() => {
    return lineItems.reduce<Record<string, StockOrderLineItem>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [lineItems]);

  const isLineItemReferenced = useCallback(
    (lineItemId: string) => referencedItemIds.has(lineItemId),
    [referencedItemIds],
  );

  const referencedCount = referencedItemIds.size;
  const totalLineItems = lineItems.length;

  // Determine if this order uses multiple packages (if any item has multiplePackages = true)
  const isMultiplePackagesMode = useMemo(() => {
    return Object.values(dispatchItemForms).some(form => form.multiplePackages === true);
  }, [dispatchItemForms]);

  // In single package mode, all items are considered referenced if any one item is referenced
  // In multiple packages mode, each item must be individually referenced
  const effectiveReferencedCount = useMemo(() => {
    if (!isMultiplePackagesMode && referencedCount > 0) {
      return totalLineItems; // All items are effectively referenced in single package mode
    }
    return referencedCount;
  }, [isMultiplePackagesMode, referencedCount, totalLineItems]);

  useEffect(() => {
    if (!dispatchLog.length) {
      return;
    }

    setDispatchItemForms((previous) => {
      const next: Record<string, DispatchItemFormState> = { ...previous };

      dispatchLog.forEach((entry) => {
        if (next[entry.id]) {
          return;
        }

        next[entry.id] = {
          dispatchLogId: entry.id,
          dispatchMethod: entry.dispatch_method,
          waybillNumber: entry.waybill_number,
          packageReference: entry.package_reference,
          multiplePackages: (entry.package_reference ?? '').toString().includes(','),
          dispatcher: entry.dispatcher,
          shipped:
            entry.shipped === true ||
            entry.shipped === 'Yes' ||
            entry.shipped === 'Y',
          dispatchToLocation: entry.dispatch_to_location,
          timeDispatched: entry.time_dispatched,
          chargerPacked: entry.charger_packed as 'Y' | 'N' | undefined,
          cables: entry.cables as 'Y' | 'N' | undefined,
        };
      });

      return next;
    });
  }, [dispatchLog]);

  const getDispatchLogIdForLineItem = useCallback(
    (lineItemId: string) => {
      const entry = dispatchLog.find((log) => {
        const itemCodeMatches =
          log.item_code && log.item_code === stockItemsById[lineItemId]?.item_code;
        const serialMatches =
          log.terminal_serial_number &&
          log.terminal_serial_number === stockItemsById[lineItemId]?.terminal_serial_number;

        if (itemCodeMatches || serialMatches) {
          return true;
        }

        const orderIdField = log.order_id;
        const orderIds = Array.isArray(orderIdField)
          ? orderIdField
          : orderIdField !== undefined && orderIdField !== null
            ? [orderIdField]
            : [];

        if (orderIds.length === 0) {
          return false;
        }

        return orderIds.some((value) => {
          const normalizedValue = value?.toString();
          const lineItemOrderId = stockItemsById[lineItemId]?.order_id?.toString();
          return normalizedValue && lineItemOrderId && normalizedValue === lineItemOrderId;
        });
      });

      return entry?.id;
    },
    [dispatchLog, stockItemsById],
  );

  useEffect(() => {
    if (!lineItems.length) {
      setReferencedItemIds(new Set());
      return;
    }

    const referenced = new Set<string>();

    lineItems.forEach((item) => {
      const logId = getDispatchLogIdForLineItem(item.id);
      if (!logId) {
        return;
      }

      const entry = dispatchLogById[logId];
      if (!entry) {
        return;
      }

      const hasDetails = Boolean(
        entry.package_reference ||
          entry.waybill_number ||
          entry.dispatch_method ||
          entry.dispatcher ||
          entry.shipped,
      );

      if (hasDetails) {
        referenced.add(item.id);
      }
    });

    // In single package mode, if any item is referenced, mark all items as referenced
    if (!isMultiplePackagesMode && referenced.size > 0) {
      const allReferenced = new Set<string>();
      lineItems.forEach((item) => allReferenced.add(item.id));
      setReferencedItemIds(allReferenced);
    } else {
      setReferencedItemIds(referenced);
    }
  }, [dispatchLogById, getDispatchLogIdForLineItem, lineItems, isMultiplePackagesMode]);

  const openLineItemSheet = useCallback(
    (lineItemId: string) => {
      const dispatchLogId = getDispatchLogIdForLineItem(lineItemId);

      if (!dispatchLogId) {
        toast({
          title: 'No dispatch log entry',
          description: 'This line item does not have a dispatch log record yet.',
          variant: 'destructive',
        });
        return;
      }

      setSelectedLineItemId(lineItemId);

      if (!dispatchItemForms[dispatchLogId]) {
        const entry = dispatchLogById[dispatchLogId];
        if (entry) {
          setDispatchItemForms((previous) => ({
            ...previous,
            [dispatchLogId]: {
              dispatchLogId,
              dispatchMethod: entry.dispatch_method,
              waybillNumber: entry.waybill_number,
              packageReference: entry.package_reference,
              multiplePackages: (entry.package_reference ?? '').toString().includes(','),
              dispatcher: entry.dispatcher,
              shipped:
                entry.shipped === true ||
                entry.shipped === 'Yes' ||
                entry.shipped === 'Y',
              dispatchToLocation: entry.dispatch_to_location,
              timeDispatched: entry.time_dispatched,
              chargerPacked: entry.charger_packed as 'Y' | 'N' | undefined,
              cables: entry.cables as 'Y' | 'N' | undefined,
            },
          }));
        }
      }

      setSheetOpen(true);
    },
    [dispatchItemForms, dispatchLogById, getDispatchLogIdForLineItem, toast],
  );

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSelectedLineItemId(null);
  }, []);

  const selectedLineItem = selectedLineItemId ? stockItemsById[selectedLineItemId] : null;
  const selectedDispatchLogId = selectedLineItem ? getDispatchLogIdForLineItem(selectedLineItem.id) : null;
  const selectedFormState = selectedDispatchLogId
    ? dispatchItemForms[selectedDispatchLogId] ?? { dispatchLogId: selectedDispatchLogId }
    : undefined;

  const handleFormChange = useCallback(
    <Field extends keyof DispatchItemFormState>(field: Field, value: DispatchItemFormState[Field]) => {
      if (!selectedDispatchLogId) {
        return;
      }

      setDispatchItemForms((previous) => ({
        ...previous,
        [selectedDispatchLogId]: {
          ...(previous[selectedDispatchLogId] ?? { dispatchLogId: selectedDispatchLogId }),
          [field]: value,
        },
      }));
    },
    [selectedDispatchLogId],
  );

  const validateItemForm = useCallback(
    (formState: DispatchItemFormState | undefined) => {
      if (!formState) {
        return 'Unable to determine dispatch details for this item. Please reopen and try again.';
      }

      const method = formState.dispatchMethod;
      const requiresWaybill = method ? methodsRequiringWaybill.has(method) : false;

      if (requiresWaybill && !formState.waybillNumber?.trim()) {
        return `Waybill number is required for ${method} dispatches.`;
      }

      return undefined;
    },
    [],
  );

  const buildDispatchLogUpdates = useCallback((): DispatchLogUpdateInput[] => {
    const updates: DispatchLogUpdateInput[] = [];

    Object.values(dispatchItemForms).forEach((form) => {
      if (!form.dispatchLogId) {
        return;
      }

      const recordId = form.dispatchLogId;
      const fields: Partial<DispatchLogEntry['fields']> = {};

      if (form.dispatchMethod) {
        fields['Dispatch Method'] = form.dispatchMethod;
      }

      if (form.waybillNumber !== undefined) {
        fields['Waybill number'] = form.waybillNumber;
      }

      if (form.packageReference !== undefined) {
        fields['Package Reference'] = form.packageReference;
      }

      if (form.dispatcher !== undefined) {
        fields['Dispatcher'] = form.dispatcher;
      }

      if (form.shipped !== undefined) {
        fields['Shipped'] = form.shipped ? 'Yes' : 'No';
      }

      if (form.dispatchToLocation !== undefined) {
        fields['Dispatch_To_Location'] = form.dispatchToLocation;
      }

      if (form.timeDispatched !== undefined) {
        fields['TimeDispatched'] = form.timeDispatched;
      }

      if (form.chargerPacked !== undefined) {
        fields['Charger Packed'] = form.chargerPacked === 'Y' ? 'Yes' : 'No';
      }

      if (form.cables !== undefined) {
        fields['Cables'] = form.cables === 'Y' ? 'Yes' : 'No';
      }

      if (Object.keys(fields).length > 0) {
        updates.push({
          recordId,
          fields,
        });
      }
    });

    return updates;
  }, [dispatchItemForms]);

  const handleMarkReferenced = useCallback(
    (lineItemId: string) => {
      setReferencedItemIds((previous) => {
        if (previous.has(lineItemId)) {
          return previous;
        }

        const next = new Set(previous);

        if (isMultiplePackagesMode) {
          // In multiple packages mode, only mark the specific item
          next.add(lineItemId);
        } else {
          // In single package mode, mark all items as referenced when any one is referenced
          lineItems.forEach((item) => next.add(item.id));
        }

        return next;
      });
    },
    [isMultiplePackagesMode, lineItems],
  );

  const handleSaveItem = useCallback(async () => {
    if (!selectedDispatchLogId) {
      toast({
        title: 'No dispatch log entry',
        description: 'Unable to locate a dispatch log record for this line item.',
        variant: 'destructive',
      });
      return;
    }

    const currentForm = dispatchItemForms[selectedDispatchLogId];
    const validationError = validateItemForm(currentForm);
    if (validationError) {
      toast({
        title: 'Missing information',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setIsSavingItem(true);

    // Auto-populate time dispatched if not already set
    const formWithTimestamp = {
      ...currentForm,
      timeDispatched: currentForm?.timeDispatched || new Date().toISOString(),
    };

    setDispatchItemForms((previous) => ({
      ...previous,
      [selectedDispatchLogId]: formWithTimestamp,
    }));

    const updatePayload: DispatchLogUpdateInput[] = buildDispatchLogUpdates().filter(
      (update) => update.recordId === selectedDispatchLogId,
    );

    if (updatePayload.length === 0) {
      setIsSavingItem(false);
      setSheetOpen(false);
      return;
    }

    updateDispatchLogMutation.mutate(
      { updates: updatePayload },
      {
        onSuccess: () => {
          toast({
            title: 'Item updated',
            description: 'Dispatch details saved for this item.',
          });
          if (selectedLineItemId) {
            handleMarkReferenced(selectedLineItemId);
          }
          setSheetOpen(false);
        },
        onError: (error: unknown) => {
          const description =
            error instanceof Error ? error.message : 'Unable to save item dispatch details. Please try again.';
          toast({
            title: 'Save failed',
            description,
            variant: 'destructive',
          });
        },
        onSettled: () => {
          setIsSavingItem(false);
        },
      },
    );
  }, [buildDispatchLogUpdates, dispatchItemForms, handleMarkReferenced, selectedDispatchLogId, selectedLineItemId, toast, updateDispatchLogMutation, validateItemForm]);

  const handleCompleteDispatch = useCallback(async () => {
    if (!recordId) return;

    const validationError = Object.values(dispatchItemForms)
      .map((form) => validateItemForm(form))
      .find((errorMessage) => Boolean(errorMessage));

    if (validationError) {
      toast({
        title: 'Missing information',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    // Check if required items are referenced based on package mode
    const requiredReferencedCount = isMultiplePackagesMode ? totalLineItems : 1;
    if (effectiveReferencedCount < requiredReferencedCount) {
      const modeText = isMultiplePackagesMode ? 'multiple packages' : 'single package';
      toast({
        title: 'Items not fully referenced',
        description: `In ${modeText} mode, ${isMultiplePackagesMode ? 'all items must be' : 'at least one item must be'} referenced before dispatch.`,
        variant: 'destructive',
      });
      return;
    }

    const pendingUpdates = buildDispatchLogUpdates();

    if (pendingUpdates.length) {
      try {
        await updateDispatchLogMutation.mutateAsync({ updates: pendingUpdates });

        setReferencedItemIds((previous) => {
          const next = new Set(previous);
          pendingUpdates.forEach((update) => {
            const lineItemId = Object.keys(stockItemsById).find((key) => {
              const logId = getDispatchLogIdForLineItem(key);
              return logId === update.recordId;
            });

            if (lineItemId) {
              next.add(lineItemId);
            }
          });
          return next;
        });
      } catch (error) {
        const description =
          error instanceof Error ? error.message : 'Unable to save item dispatch details. Please try again.';
        toast({
          title: 'Save failed',
          description,
          variant: 'destructive',
        });
        return;
      }
    }

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
      const mergedNotes = [uniqueOrder?.order_notes, additionalNotes]
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
        onSuccess: async () => {
          toast({
            title: 'Dispatch completed',
            description: `${orderNumber ?? 'Order'} has been marked as dispatched.`,
          });

          const itemsPayload = lineItems.map((item) => ({
            deviceType: item.device_type ?? 'Unknown',
            quantityOrdered: item.quantity_ordered ?? 0,
            itemUrl: getLineItemImageUrl(item),
            itemCode: item.item_code as string | undefined,
          }));

          void n8nService
            .notifyOrderDispatched({
              orderId: orderNumber ?? recordId,
              uniqueOrderRecordId: recordId,
              dateOrdered: dateOrdered,
              totalItems: lineItems.length,
              totalQuantity: lineItems.reduce((sum, item) => sum + (item.quantity_ordered ?? 0), 0),
              orderedBy: coerceToString(uniqueOrder?.ordered_by),
              deliveryParty: coerceToString(uniqueOrder?.deliver_to_part),
              contractorCompany: coerceToString(uniqueOrder?.contractor_company),
              region: coerceToString(uniqueOrder?.region),
              technician: coerceToString(uniqueOrder?.technician),
              onBehalfOf: coerceToString(uniqueOrder?.on_behalf_of),
              orderLocation: coerceToString(uniqueOrder?.order_location),
              recipientName: coerceToString(uniqueOrder?.recipient_name),
              recipientCompanyName: coerceToString(uniqueOrder?.recipient_company_name),
              recipientAddress: coerceToString(uniqueOrder?.recipient_address),
              recipientContactNumber: coerceToString(uniqueOrder?.recipient_contact_number),
              recipientEmail: coerceToString(uniqueOrder?.recipient_email_address),
              cellPhoneNumber: coerceToString(uniqueOrder?.cell_phone_number),
              warehouseFulfilling: coerceToString(uniqueOrder?.warehouse_fulfilling),
              deliverToParty: coerceToString(uniqueOrder?.deliver_to_part),
              items: itemsPayload,
              metadata: {
                dispatchMethod: dispatchMethod || coerceToString(uniqueOrder?.dispatch_method),
                waybillNumber: waybillNumber || coerceToString(uniqueOrder?.waybill_number),
                dispatchStatus: 'Dispatched',
                pickStatus: coerceToString(uniqueOrder?.pick_status),
                additionalNotes,
              },
            })
            .catch((error) => {
              console.error('Failed to send order dispatched webhook', error);
            });

          const manifestPayload = buildManifestPayload();

          if (manifestPayload) {
            try {
              await downloadOrderManifestPdf(manifestPayload);
            } catch (error) {
              console.error('Failed to generate order manifest PDF', error);
              toast({
                title: 'Manifest generation failed',
                description: 'Dispatch completed but the manifest could not be downloaded. Please try again.',
                variant: 'destructive',
              });
            }
          }

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
  }, [additionalNotes, buildDispatchLogUpdates, dispatchItemForms, dispatchMethod, effectiveReferencedCount, getDispatchLogIdForLineItem, isMultiplePackagesMode, lineItems, orderNumber, recordId, stockItemsById, toast, totalLineItems, uniqueOrder?.fields, updateDispatchLogMutation, updateMutation, validateItemForm, waybillNumber]);

  const buildManifestPayload = useCallback((): ManifestPayload | null => {
    if (!uniqueOrder) {
      return null;
    }

    const manifestItems: ManifestItemRow[] = lineItems.map((item) => {
      // Get the dispatch log entry for this line item
      const dispatchLogId = getDispatchLogIdForLineItem(item.id);
      const dispatchLogEntry = dispatchLogId ? dispatchLogById[dispatchLogId] : null;

      // Use dispatch log data if available, fallback to line item data
      const packageReference = dispatchLogEntry?.package_reference ?? item.package_reference ?? null;
      const waybillNumber = dispatchLogEntry?.waybill_number ?? item.waybill_number ?? null;

      return {
        deviceType: item.device_type ?? 'Unknown device',
        serialNumber: item.terminal_serial_number ?? item.item_code ?? null,
        packageReference: packageReference || waybillNumber,
        chargerIncluded: (dispatchLogEntry?.charger_packed ?? item.charger_packed ?? '').toString().toLowerCase() === 'yes' || (dispatchLogEntry?.charger_packed ?? item.charger_packed ?? '').toString().toLowerCase() === 'y',
        cablesIncluded: (dispatchLogEntry?.cables ?? item.cables ?? '').toString().toLowerCase() === 'yes' || (dispatchLogEntry?.cables ?? item.cables ?? '').toString().toLowerCase() === 'y',
      };
    });

    // Use dispatch log waybill if available, fallback to global waybill
    const primaryWaybill = dispatchLog.find(entry => entry.waybill_number)?.waybill_number || waybillNumber;

    const manifestPayload: ManifestPayload = {
      orderNumber: orderNumber ?? coerceToString(uniqueOrder.order_id) ?? recordId ?? 'Unknown',
      orderDate: dateOrdered,
      manifestDate: new Date(),
      totalItems: manifestItems.length,
      waybillNumber: primaryWaybill || coerceToString(uniqueOrder.waybill_number) || null,
      customerName: coerceToString(uniqueOrder.recipient_name) || null,
      addressLine1: coerceToString(uniqueOrder.recipient_address) || coerceToString(uniqueOrder.order_location) || null,
      addressLine2: coerceToString(uniqueOrder.region) || null,
      contactNumber: coerceToString(uniqueOrder.recipient_contact_number) || coerceToString(uniqueOrder.cell_phone_number) || null,
      deliveryInstructions:
        additionalNotes || coerceToString(uniqueOrder.order_notes) || coerceToString(uniqueOrder.order_summary_ai) || null,
      items: manifestItems,
    };

    return manifestPayload;
  }, [uniqueOrder, lineItems, getDispatchLogIdForLineItem, dispatchLogById, dispatchLog, waybillNumber, orderNumber, recordId, dateOrdered, additionalNotes]);

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
                {uniqueOrder?.recipient_name ?? '—'}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {uniqueOrder?.recipient_company_name ?? 'Company not captured'}
              </p>
              {uniqueOrder?.recipient_contact_number && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {uniqueOrder.recipient_contact_number}
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
                {uniqueOrder?.region ?? 'Region unknown'}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <PackageSearch className="h-4 w-4" />
                {uniqueOrder?.warehouse_fulfilling ?? 'Warehouse not set'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground">Current Dispatch</p>
              <p className="text-muted-foreground">
                Method: {uniqueOrder?.dispatch_method ?? 'Not captured'}
              </p>
              <p className="text-muted-foreground">
                Waybill: {uniqueOrder?.waybill_number ?? 'Not captured'}
              </p>
              <p className="text-muted-foreground">
                Delivery Party: {uniqueOrder?.deliver_to_part ?? '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Items to Dispatch
              </CardTitle>
              {totalLineItems > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="font-medium">
                    {effectiveReferencedCount} of {totalLineItems} items referenced
                  </Badge>
                  <span>
                    {isMultiplePackagesMode
                      ? 'Each item must be referenced individually.'
                      : 'Reference any one item to enable dispatch completion.'
                    }
                  </span>
                </div>
              )}
            </div>
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
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => {
                    const imageUrl = getLineItemImageUrl(item);
                    const isSelected = selectedLineItemId === item.id;
                    const referenced = isLineItemReferenced(item.id);
                    return (
                      <TableRow
                        key={item.id}
                        onClick={() => openLineItemSheet(item.id)}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-muted/40',
                          isSelected ? 'bg-primary/10' : undefined,
                        )}
                      >
                        <TableCell>
                          <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                            {imageUrl ? (
                              <img src={imageUrl} alt={item.device_type ?? 'Inventory item'} className="h-full w-full object-cover" />
                            ) : (
                              <PackageSearch className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {item.device_type ?? 'Unknown'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {item.item_description ?? '—'}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{item.quantity_ordered ?? 0}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell font-mono text-xs">
                          {item.item_code ?? '—'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-muted-foreground">
                          {item.waybill_number ?? item.package_reference ?? '—'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {(() => {
                            if (isMultiplePackagesMode) {
                              // In multiple packages mode, show individual status
                              return referenced ? (
                                <Badge variant="secondary" className="text-xs">
                                  Referenced
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not referenced</span>
                              );
                            } else {
                              // In single package mode, show based on effective status
                              const isEffectivelyReferenced = effectiveReferencedCount === totalLineItems;
                              return isEffectivelyReferenced ? (
                                <Badge variant="secondary" className="text-xs">
                                  Referenced
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not referenced</span>
                              );
                            }
                          })()}
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
                    {entry.dispatch_method ?? 'Dispatch Update'}
                  </p>
                  <p>{safeFormatDate(entry.date_dispatched) ?? 'Date not set'}</p>
                  <p className="text-xs text-muted-foreground">
                    Waybill: {entry.waybill_number ?? 'Not captured'}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeSheet();
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="space-y-1">
            <SheetTitle>Item dispatch details</SheetTitle>
            {selectedLineItem && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">{selectedLineItem.device_type ?? 'Inventory item'}</p>
                <p>Serial: {selectedLineItem.terminal_serial_number ?? 'N/A'}</p>
                <p>Item code: {selectedLineItem.item_code ?? 'N/A'}</p>
              </div>
            )}
          </SheetHeader>

          {selectedLineItem ? (
            <div className="space-y-6 py-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Dispatch method</Label>
                  <Select
                    value={selectedFormState?.dispatchMethod ?? dispatchMethod}
                    onValueChange={(value) => handleFormChange('dispatchMethod', value)}
                  >
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

                <div className="grid gap-2">
                  <Label htmlFor="dispatch-waybill">Waybill number</Label>
                  <Input
                    id="dispatch-waybill"
                    value={selectedFormState?.waybillNumber ?? ''}
                    onChange={(event) => handleFormChange('waybillNumber', event.target.value)}
                    placeholder="Enter courier waybill"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dispatch-package">Package reference</Label>
                  <Input
                    id="dispatch-package"
                    value={selectedFormState?.packageReference ?? ''}
                    onChange={(event) => handleFormChange('packageReference', event.target.value)}
                    placeholder="e.g. Box 1 of 2"
                  />
                  <div className="flex items-center justify-between rounded-md border border-dashed border-muted p-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Multiple packages</Label>
                      <p className="text-xs text-muted-foreground">Toggle on if this device spans multiple parcels.</p>
                    </div>
                    <Switch
                      checked={Boolean(selectedFormState?.multiplePackages)}
                      onCheckedChange={(checked) => handleFormChange('multiplePackages', checked)}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dispatch-dispatcher">Dispatcher</Label>
                  <Input
                    id="dispatch-dispatcher"
                    value={selectedFormState?.dispatcher ?? ''}
                    onChange={(event) => handleFormChange('dispatcher', event.target.value)}
                    placeholder="Who dispatched this item?"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dispatch-location">Dispatch to location</Label>
                  <Input
                    id="dispatch-location"
                    value={selectedFormState?.dispatchToLocation ?? ''}
                    onChange={(event) => handleFormChange('dispatchToLocation', event.target.value)}
                    placeholder="Destination or branch"
                  />
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center justify-between rounded-md border border-muted p-3">
                    <div className="space-y-1">
                      <Label className="text-sm">Shipped / handed over</Label>
                      <p className="text-xs text-muted-foreground">
                        Mark as shipped once courier collection or handover is complete.
                      </p>
                    </div>
                    <Switch
                      checked={Boolean(selectedFormState?.shipped)}
                      onCheckedChange={(checked) => handleFormChange('shipped', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-md border border-muted p-3">
                    <div className="space-y-1">
                      <Label className="text-sm">Charger packed</Label>
                      <p className="text-xs text-muted-foreground">Confirm the charger is inside the parcel.</p>
                    </div>
                    <Switch
                      checked={selectedFormState?.chargerPacked === 'Y'}
                      onCheckedChange={(checked) => handleFormChange('chargerPacked', checked ? 'Y' : 'N')}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-md border border-muted p-3">
                    <div className="space-y-1">
                      <Label className="text-sm">Cables included</Label>
                      <p className="text-xs text-muted-foreground">Confirm network or power cables were packed.</p>
                    </div>
                    <Switch
                      checked={selectedFormState?.cables === 'Y'}
                      onCheckedChange={(checked) => handleFormChange('cables', checked ? 'Y' : 'N')}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Select an item to capture dispatch details.
            </div>
          )}

          <SheetFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={closeSheet}>
              Close
            </Button>
            <Button onClick={() => void handleSaveItem()} disabled={isSavingItem || !selectedDispatchLogId}>
              {isSavingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save item'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
