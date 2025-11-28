import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { CalendarIcon, Trash2, Check, X, ArrowLeft } from 'lucide-react';

import { BackOfficeRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { useInventoryItems, useItemCategories } from '@/hooks/useSupabase';
import {
  useCreateIngestionBatch,
  useCreateDevicesBulk,
  useCheckSerialExists,
  useCreateDeviceMovement,
} from '@/hooks/useAssetManagement';
import type { DeviceRegistryInsert } from '@/integrations/supabase/services-asset';

// Constants
const BATCH_SIZE = 100;

// Validation schema for batch info
const batchInfoSchema = z.object({
  receivingWarehouse: z.string().min(1, 'Warehouse is required'),
  supplier: z.string().optional(),
  dateReceived: z.date(),
  purchaseOrderNumber: z.string().optional(),
  notes: z.string().optional(),
});

type BatchInfoForm = z.infer<typeof batchInfoSchema>;

interface PendingDevice {
  id: string;
  serialNumber: string;
  deviceType: string;
  itemCategory: string;
  itemNature: string;
  itemCode?: string;
  itemDescription?: string;
  cradleSerialNumber?: string;
  chargerSerialNumber?: string;
  warrantyExpiry?: Date;
  status: 'valid' | 'duplicate' | 'checking';
  errorMessage?: string;
}

function StockIngestionContent() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const serialInputRef = useRef<HTMLInputElement>(null);

  // State
  const [pendingDevices, setPendingDevices] = useState<PendingDevice[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedNature, setSelectedNature] = useState<string>('');
  const [serialInput, setSerialInput] = useState<string>('');
  const [cradleSerial, setCradleSerial] = useState<string>('');
  const [chargerSerial, setChargerSerial] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);

  // Queries
  const { data: categories } = useItemCategories();
  const { data: inventoryItems } = useInventoryItems({ category: selectedCategory });

  // Mutations
  const createBatch = useCreateIngestionBatch();
  const createDevices = useCreateDevicesBulk();
  const checkSerial = useCheckSerialExists();
  const createMovement = useCreateDeviceMovement();

  // Forms
  const batchForm = useForm<BatchInfoForm>({
    resolver: zodResolver(batchInfoSchema),
    defaultValues: {
      dateReceived: new Date(),
    },
  });

  // Warehouse options
  const warehouses = ['KZN', 'JHB', 'WC'];

  // Get selected item details
  const selectedItem = inventoryItems?.find(i => i.item_name === selectedDevice);

  // Auto-focus serial input after adding device
  useEffect(() => {
    if (serialInputRef.current && selectedDevice) {
      serialInputRef.current.focus();
    }
  }, [pendingDevices.length, selectedDevice]);

  // Parse Cash Connect QR code - EXACT logic from PickingCartNew.tsx (lines 99-120)
  const parseCashConnectSerial = (qrCode: string): { itemCode: string; serialNumber: string } => {
    const commaCount = (qrCode.match(/,/g) || []).length;

    if (commaCount >= 1) {
      const firstCommaIndex = qrCode.indexOf(',');
      const itemCode = qrCode.substring(0, firstCommaIndex).trim();

      let serialNumber = '';
      if (commaCount > 1) {
        // More than 1 comma: extract characters 14-18 (positions 13-17 in 0-based index)
        serialNumber = qrCode.substring(13, 18);
      } else if (commaCount === 1) {
        // Exactly 1 comma: extract everything after the first comma
        serialNumber = qrCode.substring(firstCommaIndex + 1).trim();
      }

      return { itemCode, serialNumber };
    }

    // No comma: use entire input as serial number
    return { itemCode: '', serialNumber: qrCode.trim() };
  };

  // Handle serial number input (Enter key or paste multiple)
  const handleSerialInput = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();

    // Validate device selection
    if (!selectedDevice || !selectedCategory || !selectedNature) {
      toast.error('Please select business line, item nature, and device type first');
      return;
    }

    if (!serialInput.trim()) {
      toast.error('Please enter a serial number');
      return;
    }

    await addDevice(serialInput.trim());
  };

  // Add device to pending list
  const addDevice = async (rawSerial: string) => {
    let serialNumber = rawSerial;
    let itemCode = '';

    // Parse Cash Connect QR codes
    if (selectedCategory === 'Cash Connect' && rawSerial.includes(',')) {
      const parsed = parseCashConnectSerial(rawSerial);
      serialNumber = parsed.serialNumber;
      itemCode = parsed.itemCode;
    }

    // Add device with 'checking' status first
    const tempId = crypto.randomUUID();
    const tempDevice: PendingDevice = {
      id: tempId,
      serialNumber,
      deviceType: selectedDevice,
      itemCategory: selectedCategory,
      itemNature: selectedNature,
      itemCode: itemCode || selectedItem?.item_code || undefined,
      itemDescription: selectedItem?.item_description || undefined,
      cradleSerialNumber: cradleSerial || undefined,
      chargerSerialNumber: chargerSerial || undefined,
      status: 'checking',
    };

    setPendingDevices(prev => [...prev, tempDevice]);

    // Clear input
    setSerialInput('');
    setCradleSerial('');
    setChargerSerial('');

    // Check for duplicate in background
    try {
      const exists = await checkSerial.mutateAsync(serialNumber);

      // Update device status
      setPendingDevices(prev =>
        prev.map(d =>
          d.id === tempId
            ? {
                ...d,
                status: exists ? 'duplicate' : 'valid',
                errorMessage: exists ? 'Serial already exists in registry' : undefined,
              }
            : d
        )
      );

      if (exists) {
        toast.error(`Duplicate serial: ${serialNumber}`);
      } else {
        toast.success(`Added: ${serialNumber}`);
      }
    } catch (error) {
      console.error('Error checking serial:', error);
      // Mark as valid if check fails (optimistic)
      setPendingDevices(prev =>
        prev.map(d =>
          d.id === tempId
            ? {
                ...d,
                status: 'valid',
              }
            : d
        )
      );
      toast.success(`Added: ${serialNumber}`);
    }

    // Auto-focus back to input
    setTimeout(() => {
      serialInputRef.current?.focus();
    }, 100);
  };

  // Handle paste of multiple serials
  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const lines = pastedText.split('\n').filter(line => line.trim());

    // If multiple lines, process them
    if (lines.length > 1) {
      e.preventDefault();

      // Validate device selection
      if (!selectedDevice || !selectedCategory || !selectedNature) {
        toast.error('Please select business line, item nature, and device type first');
        return;
      }

      toast.info(`Processing ${lines.length} serial numbers...`);

      for (const line of lines) {
        await addDevice(line.trim());
        // Small delay to avoid overwhelming the UI
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      toast.success(`Processed ${lines.length} serial numbers`);
    }
  };

  // Remove device from pending list
  const removeDevice = (id: string) => {
    setPendingDevices(prev => prev.filter(d => d.id !== id));
  };

  // Submit ingestion with batch processing
  const handleSubmit = async () => {
    const batchData = batchForm.getValues();

    // Filter valid devices only
    const validDevices = pendingDevices.filter(d => d.status === 'valid');

    if (validDevices.length === 0) {
      toast.error('No valid devices to ingest');
      return;
    }

    // Check if still checking any devices
    const checkingDevices = pendingDevices.filter(d => d.status === 'checking');
    if (checkingDevices.length > 0) {
      toast.warning(`Still checking ${checkingDevices.length} devices. Please wait...`);
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress(0);

    try {
      // Create batch record
      const batch = await createBatch.mutateAsync({
        receiving_warehouse: batchData.receivingWarehouse,
        supplier: batchData.supplier || undefined,
        date_received: format(batchData.dateReceived, 'yyyy-MM-dd'),
        purchase_order_number: batchData.purchaseOrderNumber || undefined,
        notes: batchData.notes || undefined,
        ingested_by: profile?.email || '',
        total_devices: pendingDevices.length,
        successful_count: validDevices.length,
        failed_count: pendingDevices.length - validDevices.length,
      });

      // Prepare device records
      const deviceRecords: DeviceRegistryInsert[] = validDevices.map(d => ({
        serial_number: d.serialNumber,
        device_type: d.deviceType,
        item_category: d.itemCategory,
        item_nature: d.itemNature,
        item_code: d.itemCode || undefined,
        item_description: d.itemDescription || undefined,
        status: 'Available',
        current_holder_type: 'Warehouse',
        current_holder_id: batchData.receivingWarehouse,
        date_acquired: format(batchData.dateReceived, 'yyyy-MM-dd'),
        warranty_expiry: d.warrantyExpiry ? format(d.warrantyExpiry, 'yyyy-MM-dd') : undefined,
        supplier: batchData.supplier || undefined,
        purchase_order_number: batchData.purchaseOrderNumber || undefined,
        ingestion_batch_id: batch.id,
        cradle_serial_number: d.cradleSerialNumber || undefined,
        charger_serial_number: d.chargerSerialNumber || undefined,
        created_by: profile?.email || undefined,
      }));

      // Process in batches of 100
      const totalBatches = Math.ceil(deviceRecords.length / BATCH_SIZE);
      const allCreatedDevices: typeof deviceRecords = [];

      for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, deviceRecords.length);
        const batchRecords = deviceRecords.slice(start, end);

        toast.info(`Processing batch ${i + 1} of ${totalBatches} (${batchRecords.length} devices)...`);

        const createdDevices = await createDevices.mutateAsync(batchRecords);
        allCreatedDevices.push(...createdDevices);

        // Update progress
        const progress = ((i + 1) / totalBatches) * 80; // Use 80% for device creation
        setSubmitProgress(progress);

        // Small delay between batches
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Create movement records for each device (in batches)
      toast.info('Creating movement records...');
      const movementBatches = Math.ceil(allCreatedDevices.length / BATCH_SIZE);

      for (let i = 0; i < movementBatches; i++) {
        const start = i * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, allCreatedDevices.length);
        const batchDevices = allCreatedDevices.slice(start, end);

        await Promise.all(
          batchDevices.map(device =>
            createMovement.mutateAsync({
              device_id: device.id,
              movement_type: 'Ingestion',
              movement_date: new Date().toISOString(),
              to_holder_type: 'Warehouse',
              to_holder_id: batchData.receivingWarehouse,
              performed_by: profile?.email || '',
              reference_id: batch.id,
              reference_type: 'Ingestion Batch',
              notes: `Ingested from ${batchData.supplier || 'supplier'} - PO: ${batchData.purchaseOrderNumber || 'N/A'}`,
            })
          )
        );

        // Update progress
        const progress = 80 + ((i + 1) / movementBatches) * 20; // Use remaining 20% for movements
        setSubmitProgress(progress);
      }

      setSubmitProgress(100);
      toast.success(`Successfully ingested ${validDevices.length} devices in ${totalBatches} batches`);

      // Reset form
      setPendingDevices([]);
      batchForm.reset({ dateReceived: new Date() });
      setSelectedCategory('');
      setSelectedDevice('');
      setSelectedNature('');
      setSerialInput('');
      setCradleSerial('');
      setChargerSerial('');
    } catch (error) {
      console.error('Ingestion error:', error);
      toast.error('Failed to ingest devices');
    } finally {
      setIsSubmitting(false);
      setSubmitProgress(0);
    }
  };

  const validCount = pendingDevices.filter(d => d.status === 'valid').length;
  const duplicateCount = pendingDevices.filter(d => d.status === 'duplicate').length;
  const checkingCount = pendingDevices.filter(d => d.status === 'checking').length;

  const isCashConnect = selectedCategory === 'Cash Connect';

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Ingestion</h1>
          <p className="text-muted-foreground">Register new devices into inventory</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batch Information */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Information</CardTitle>
            <CardDescription>Details about this stock delivery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Receiving Warehouse *</Label>
              <Select
                value={batchForm.watch('receivingWarehouse')}
                onValueChange={(value) => batchForm.setValue('receivingWarehouse', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input
                {...batchForm.register('supplier')}
                placeholder="Supplier name"
              />
            </div>

            <div className="space-y-2">
              <Label>Date Received *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {batchForm.watch('dateReceived')
                      ? format(batchForm.watch('dateReceived'), 'PPP')
                      : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={batchForm.watch('dateReceived')}
                    onSelect={(date) => date && batchForm.setValue('dateReceived', date)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Purchase Order #</Label>
              <Input
                {...batchForm.register('purchaseOrderNumber')}
                placeholder="PO number"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                {...batchForm.register('notes')}
                placeholder="Additional notes"
              />
            </div>
          </CardContent>
        </Card>

        {/* Device Entry */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Device Entry</CardTitle>
            <CardDescription>Select device type and enter serial numbers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Device Selection Gallery */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business Line *</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    setSelectedDevice('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Item Nature *</Label>
                <Select
                  value={selectedNature}
                  onValueChange={(value) => setSelectedNature(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select nature" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Serialised">Serialised</SelectItem>
                    <SelectItem value="Non-serialised">Non-serialised</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Device Type Gallery */}
            {selectedCategory && (
              <div className="space-y-2">
                <Label>Device Type *</Label>
                <ScrollArea className="h-32 border rounded-md p-2">
                  <div className="grid grid-cols-3 gap-2">
                    {inventoryItems?.map((item) => (
                      <Button
                        key={item.id}
                        variant={selectedDevice === item.item_name ? 'default' : 'outline'}
                        className="h-auto py-2 flex flex-col items-center"
                        onClick={() => {
                          setSelectedDevice(item.item_name || '');
                          // Auto-focus serial input after selection
                          setTimeout(() => serialInputRef.current?.focus(), 100);
                        }}
                      >
                        <span className="text-xs truncate w-full text-center">
                          {item.item_name}
                        </span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Serial Number Entry */}
            {selectedDevice && (
              <>
                <div className="space-y-2">
                  <Label>
                    Serial Number *
                    {isCashConnect && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (Scan QR code or paste multiple serials)
                      </span>
                    )}
                  </Label>
                  <Input
                    ref={serialInputRef}
                    value={serialInput}
                    onChange={(e) => setSerialInput(e.target.value)}
                    onKeyDown={handleSerialInput}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    placeholder={
                      isCashConnect
                        ? 'Scan QR: ItemCode,Serial or paste multiple'
                        : 'Enter serial and press Enter (or paste multiple)'
                    }
                    className="font-mono"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    inputMode="text"
                    data-1p-ignore
                  />
                  <p className="text-xs text-muted-foreground">
                    Press Enter to add each serial. Auto-fills device metadata.
                  </p>
                </div>

                {/* Optional cradle/charger serials for non-Cash Connect */}
                {!isCashConnect && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cradle Serial (Optional)</Label>
                      <Input
                        value={cradleSerial}
                        onChange={(e) => setCradleSerial(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="Cradle serial"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        inputMode="text"
                        data-1p-ignore
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Charger Serial (Optional)</Label>
                      <Input
                        value={chargerSerial}
                        onChange={(e) => setChargerSerial(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="Charger serial"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        inputMode="text"
                        data-1p-ignore
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Auto-filled metadata display */}
            {selectedDevice && selectedItem && (
              <div className="p-4 bg-muted rounded-md space-y-2">
                <p className="text-sm font-semibold">Auto-filled Metadata:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Device Type:</span>{' '}
                    <span className="font-mono">{selectedDevice}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category:</span>{' '}
                    <span className="font-mono">{selectedCategory}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nature:</span>{' '}
                    <span className="font-mono">{selectedNature}</span>
                  </div>
                  {selectedItem.item_code && (
                    <div>
                      <span className="text-muted-foreground">Item Code:</span>{' '}
                      <span className="font-mono">{selectedItem.item_code}</span>
                    </div>
                  )}
                  {selectedItem.item_description && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Description:</span>{' '}
                      <span className="text-xs">{selectedItem.item_description}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Devices Table */}
      {pendingDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Ingestion Batch ({pendingDevices.length} devices)
            </CardTitle>
            <CardDescription>
              <span className="text-green-600">Valid: {validCount}</span>
              {duplicateCount > 0 && (
                <span className="text-red-600 ml-4">Duplicates: {duplicateCount}</span>
              )}
              {checkingCount > 0 && (
                <span className="text-yellow-600 ml-4">Checking: {checkingCount}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Device Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingDevices.map((device, index) => (
                    <TableRow key={device.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-mono">{device.serialNumber}</TableCell>
                      <TableCell>{device.deviceType}</TableCell>
                      <TableCell>{device.itemCategory}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {device.itemCode || '-'}
                      </TableCell>
                      <TableCell>
                        {device.status === 'valid' ? (
                          <Badge variant="outline" className="text-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        ) : device.status === 'checking' ? (
                          <Badge variant="outline" className="text-yellow-600">
                            Checking...
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <X className="h-3 w-3 mr-1" />
                            {device.errorMessage}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDevice(device.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Progress Bar during submission */}
            {isSubmitting && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing batch...</span>
                  <span>{Math.round(submitProgress)}%</span>
                </div>
                <Progress value={submitProgress} className="h-2" />
              </div>
            )}

            <div className="flex justify-between mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setPendingDevices([]);
                  setSerialInput('');
                  setCradleSerial('');
                  setChargerSerial('');
                }}
                disabled={isSubmitting}
              >
                Clear Batch
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={validCount === 0 || checkingCount > 0 || isSubmitting}
              >
                {isSubmitting
                  ? `Processing... (${Math.round(submitProgress)}%)`
                  : `Submit Ingestion (${validCount} devices)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function StockIngestion() {
  return (
    <BackOfficeRoute>
      <StockIngestionContent />
    </BackOfficeRoute>
  );
}
