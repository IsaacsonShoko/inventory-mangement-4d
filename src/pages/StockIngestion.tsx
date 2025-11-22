import { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Trash2, Check, X, ScanLine, Upload, ArrowLeft } from 'lucide-react';

import { BarcodeScanner } from '@/components/BarcodeScanner';
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

// Validation schema for batch info
const batchInfoSchema = z.object({
  receivingWarehouse: z.string().min(1, 'Warehouse is required'),
  supplier: z.string().optional(),
  dateReceived: z.date(),
  purchaseOrderNumber: z.string().optional(),
  notes: z.string().optional(),
});

// Validation schema for device entry
const deviceEntrySchema = z.object({
  deviceType: z.string().min(1, 'Device type is required'),
  itemCategory: z.string().min(1, 'Category is required'),
  itemNature: z.string().min(1, 'Item nature is required'),
  serialNumber: z.string().min(1, 'Serial number is required'),
  cradleSerialNumber: z.string().optional(),
  chargerSerialNumber: z.string().optional(),
  warrantyExpiry: z.date().optional(),
});

type BatchInfoForm = z.infer<typeof batchInfoSchema>;
type DeviceEntryForm = z.infer<typeof deviceEntrySchema>;

interface PendingDevice {
  id: string;
  serialNumber: string;
  deviceType: string;
  itemCategory: string;
  itemNature: string;
  itemDescription?: string;
  cradleSerialNumber?: string;
  chargerSerialNumber?: string;
  warrantyExpiry?: Date;
  status: 'valid' | 'duplicate' | 'error';
  errorMessage?: string;
}

function StockIngestionContent() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // State
  const [pendingDevices, setPendingDevices] = useState<PendingDevice[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [entryMode, setEntryMode] = useState<'scan' | 'manual' | 'bulk'>('scan');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

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

  const deviceForm = useForm<DeviceEntryForm>({
    resolver: zodResolver(deviceEntrySchema),
  });

  // Warehouse options
  const warehouses = ['Warehouse A', 'Warehouse B', 'Warehouse C'];

  // Parse Cash Connect QR code
  const parseCashConnectSerial = (qrCode: string): string => {
    if (!qrCode.includes(',')) return qrCode;

    const commaCount = (qrCode.match(/,/g) || []).length;
    if (commaCount > 1) {
      // Multiple commas: Extract characters 14-18
      return qrCode.substring(13, 18);
    } else {
      // Single comma: Everything after comma
      return qrCode.split(',')[1] || qrCode;
    }
  };

  // Handle barcode scan
  const handleScan = async (result: string) => {
    setShowScanner(false);

    let serialNumber = result;

    // Parse Cash Connect QR codes
    if (selectedCategory === 'Cash Connect' && result.includes(',')) {
      serialNumber = parseCashConnectSerial(result);
    }

    // Check for duplicate
    const exists = await checkSerial.mutateAsync(serialNumber);

    const selectedItem = inventoryItems?.find(i => i.item_name === selectedDevice);

    const newDevice: PendingDevice = {
      id: crypto.randomUUID(),
      serialNumber,
      deviceType: selectedDevice,
      itemCategory: selectedCategory,
      itemNature: selectedItem?.item_nature || 'Serialised',
      itemDescription: selectedItem?.item_description || '',
      status: exists ? 'duplicate' : 'valid',
      errorMessage: exists ? 'Serial already exists in registry' : undefined,
    };

    setPendingDevices(prev => [...prev, newDevice]);

    if (exists) {
      toast.error(`Duplicate serial: ${serialNumber}`);
    } else {
      toast.success(`Added: ${serialNumber}`);
    }
  };

  // Handle manual device entry
  const handleAddDevice = async (data: DeviceEntryForm) => {
    let serialNumber = data.serialNumber;

    // Parse Cash Connect QR codes
    if (data.itemCategory === 'Cash Connect' && data.serialNumber.includes(',')) {
      serialNumber = parseCashConnectSerial(data.serialNumber);
    }

    // Check for duplicate
    const exists = await checkSerial.mutateAsync(serialNumber);

    const selectedItem = inventoryItems?.find(i => i.item_name === data.deviceType);

    const newDevice: PendingDevice = {
      id: crypto.randomUUID(),
      serialNumber,
      deviceType: data.deviceType,
      itemCategory: data.itemCategory,
      itemNature: data.itemNature,
      itemDescription: selectedItem?.item_description || '',
      cradleSerialNumber: data.cradleSerialNumber,
      chargerSerialNumber: data.chargerSerialNumber,
      warrantyExpiry: data.warrantyExpiry,
      status: exists ? 'duplicate' : 'valid',
      errorMessage: exists ? 'Serial already exists in registry' : undefined,
    };

    setPendingDevices(prev => [...prev, newDevice]);

    // Reset serial field for next entry
    deviceForm.setValue('serialNumber', '');
    deviceForm.setValue('cradleSerialNumber', '');
    deviceForm.setValue('chargerSerialNumber', '');
  };

  // Remove device from pending list
  const removeDevice = (id: string) => {
    setPendingDevices(prev => prev.filter(d => d.id !== id));
  };

  // Submit ingestion
  const handleSubmit = async () => {
    const batchData = batchForm.getValues();

    // Filter valid devices only
    const validDevices = pendingDevices.filter(d => d.status === 'valid');

    if (validDevices.length === 0) {
      toast.error('No valid devices to ingest');
      return;
    }

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

      // Create device registry entries
      const deviceRecords: DeviceRegistryInsert[] = validDevices.map(d => ({
        serial_number: d.serialNumber,
        device_type: d.deviceType,
        item_category: d.itemCategory,
        item_nature: d.itemNature,
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

      const createdDevices = await createDevices.mutateAsync(deviceRecords);

      // Create movement records for each device
      for (const device of createdDevices) {
        await createMovement.mutateAsync({
          device_id: device.id,
          movement_type: 'Ingestion',
          movement_date: new Date().toISOString(),
          to_holder_type: 'Warehouse',
          to_holder_id: batchData.receivingWarehouse,
          performed_by: profile?.email || '',
          reference_id: batch.id,
          reference_type: 'Ingestion Batch',
          notes: `Ingested from ${batchData.supplier || 'supplier'} - PO: ${batchData.purchaseOrderNumber || 'N/A'}`,
        });
      }

      toast.success(`Successfully ingested ${validDevices.length} devices`);

      // Reset form
      setPendingDevices([]);
      batchForm.reset();
      deviceForm.reset();

    } catch (error) {
      console.error('Ingestion error:', error);
      toast.error('Failed to ingest devices');
    }
  };

  const validCount = pendingDevices.filter(d => d.status === 'valid').length;
  const errorCount = pendingDevices.filter(d => d.status !== 'valid').length;

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
            <CardDescription>Add devices to this batch</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Device Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business Line *</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    deviceForm.setValue('itemCategory', value);
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
                  value={deviceForm.watch('itemNature')}
                  onValueChange={(value) => deviceForm.setValue('itemNature', value)}
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

            {/* Device Type Selection (Gallery) */}
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
                          deviceForm.setValue('deviceType', item.item_name || '');
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

            {/* Entry Mode */}
            <Tabs value={entryMode} onValueChange={(v) => setEntryMode(v as 'scan' | 'manual' | 'bulk')}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="scan">
                  <ScanLine className="h-4 w-4 mr-2" />
                  Scan
                </TabsTrigger>
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="bulk">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scan" className="space-y-4">
                <Button
                  onClick={() => setShowScanner(true)}
                  disabled={!selectedDevice}
                  className="w-full"
                >
                  <ScanLine className="h-4 w-4 mr-2" />
                  Open Scanner
                </Button>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <div className="space-y-2">
                  <Label>Serial Number *</Label>
                  <Input
                    {...deviceForm.register('serialNumber')}
                    placeholder="Enter or paste serial"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cradle Serial</Label>
                    <Input
                      {...deviceForm.register('cradleSerialNumber')}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Charger Serial</Label>
                    <Input
                      {...deviceForm.register('chargerSerialNumber')}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <Button
                  onClick={deviceForm.handleSubmit(handleAddDevice)}
                  disabled={!selectedDevice}
                  className="w-full"
                >
                  Add to Batch
                </Button>
              </TabsContent>

              <TabsContent value="bulk" className="space-y-4">
                <div className="space-y-2">
                  <Label>Paste Serial Numbers (one per line)</Label>
                  <textarea
                    className="w-full h-32 p-2 border rounded-md bg-background"
                    placeholder="Serial1&#10;Serial2&#10;Serial3"
                    onChange={async (e) => {
                      const serials = e.target.value.split('\n').filter(s => s.trim());
                      // Process each serial
                      for (const serial of serials) {
                        await handleScan(serial.trim());
                      }
                      e.target.value = '';
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>
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
              {errorCount > 0 && (
                <span className="text-red-600 ml-4">Errors: {errorCount}</span>
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
                      <TableCell>
                        {device.status === 'valid' ? (
                          <Badge variant="outline" className="text-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Valid
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

            <div className="flex justify-between mt-4">
              <Button
                variant="outline"
                onClick={() => setPendingDevices([])}
              >
                Clear Batch
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={validCount === 0 || createBatch.isPending}
              >
                Submit Ingestion ({validCount} devices)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
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
