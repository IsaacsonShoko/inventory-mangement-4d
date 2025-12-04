import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, PackageX, ArrowLeftRight, Plus, MoreHorizontal, Eye, Camera } from 'lucide-react';
import { toast } from 'sonner';

import { BarcodeScanner } from '@/components/BarcodeScanner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { useAuth } from '@/hooks/useAuth';
import { useRepairTickets, useCreateRepairTicket, useCreateDeviceMovement } from '@/hooks/useAssetManagement';
import { supabase } from '@/integrations/supabase/client';
import type { FaultCategoryEnum, MovementTypeEnum } from '@/integrations/supabase/services-asset';

// RMA Status
type RMAStatus = 'Pending' | 'Shipped' | 'Received by Supplier' | 'Replaced' | 'Refunded' | 'Rejected';

interface DOADevice {
  id?: string;
  serial_number: string;
  device_type: string;
  supplier: string;
  purchase_order_number?: string;
  date_received?: string;
  fault_description: string;
  rma_number?: string;
  rma_status?: RMAStatus;
  rma_date?: string;
  expected_resolution_date?: string;
}

export function DOAReturnsTab() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('log-doa');

  // DOA Logging state
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [businessLine, setBusinessLine] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [supplier, setSupplier] = useState('');
  const [purchaseOrder, setPurchaseOrder] = useState('');
  const [dateReceived, setDateReceived] = useState<Date>();
  const [faultDescription, setFaultDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scanning state
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [qrScanInput, setQrScanInput] = useState('');
  const [manufactureSerial, setManufactureSerial] = useState('');
  const [xlinkSerial, setXlinkSerial] = useState('');
  const [cradleSerial, setCradleSerial] = useState('');
  const [chargerSerial, setChargerSerial] = useState('');
  const [activeSerialField, setActiveSerialField] = useState<'serial' | 'qr' | 'manufacture' | 'xlink' | 'cradle' | 'charger' | null>(null);

  // RMA state
  const [showRMADialog, setShowRMADialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [rmaNumber, setRmaNumber] = useState('');
  const [rmaDate, setRmaDate] = useState<Date>();
  const [expectedResolution, setExpectedResolution] = useState<Date>();
  const [supplierNotes, setSupplierNotes] = useState('');

  // Filters
  const [searchDOA, setSearchDOA] = useState('');
  const [rmaStatusFilter, setRmaStatusFilter] = useState<string | undefined>(undefined);

  // Auto-fetch device details when serial number changes
  useEffect(() => {
    const fetchDeviceDetails = async () => {
      if (!serialNumber || serialNumber.length < 4) return;

      // Don't fetch if we're already submitting or if device type is already set (optional, but maybe we want to overwrite?)
      // Let's overwrite to ensure accuracy.

      try {
        const { data, error } = await supabase
          .from('device_registry')
          .select('device_type, item_category')
          .or(`manufacture_serial_number.eq.${serialNumber},qr_code_serial_number.eq.${serialNumber},xlink_serial_number.eq.${serialNumber},serial_number.eq.${serialNumber}`)
          .maybeSingle();

        if (data) {
          if (data.device_type) setDeviceType(data.device_type);
          
          if (data.item_category) {
            // Map item_category to Business Line if it matches
            const validLines = ['Cash Connect', 'ABSA', 'Accessories', 'Modems'];
            if (validLines.includes(data.item_category)) {
              setBusinessLine(data.item_category);
            }
          }
          
          toast.success(`Device found: ${data.device_type}`);
        }
      } catch (err) {
        console.error('Error fetching device details:', err);
      }
    };

    const timer = setTimeout(fetchDeviceDetails, 800);
    return () => clearTimeout(timer);
  }, [serialNumber]);

  // Queries
  const { data: doaTickets, isLoading, refetch } = useRepairTickets({
    faultCategory: 'Dead On Arrival',
  });
  const createTicket = useCreateRepairTicket();
  const createDeviceMovement = useCreateDeviceMovement();

  // Parse Cash Connect QR code - EXACT logic from Stock Counts
  const parseCashConnectSerial = (qrCode: string): { itemCode: string; serialNumber: string } => {
    const commaCount = (qrCode.match(/,/g) || []).length;

    if (commaCount >= 1) {
      const firstCommaIndex = qrCode.indexOf(',');
      const itemCode = qrCode.substring(0, firstCommaIndex).trim();

      let serialNumber = '';
      if (commaCount > 1) {
        serialNumber = qrCode.substring(13, 18);
      } else if (commaCount === 1) {
        serialNumber = qrCode.substring(firstCommaIndex + 1).trim();
      }

      return { itemCode, serialNumber };
    }

    return { itemCode: '', serialNumber: qrCode.trim() };
  };

  // Handle QR scan for Cash Connect
  const handleQrScanChange = (input: string) => {
    setQrScanInput(input);
    if (businessLine === 'Cash Connect' && input.includes(',')) {
      const parsed = parseCashConnectSerial(input);
      setSerialNumber(parsed.serialNumber);
    } else {
      setSerialNumber(input);
    }
  };

  // Handle barcode scan from camera
  const handleBarcodeScan = (result: string) => {
    setShowBarcodeScanner(false);
    if (!activeSerialField) return;

    if (activeSerialField === 'serial') {
      setSerialNumber(result);
    } else if (activeSerialField === 'qr') {
      handleQrScanChange(result);
      setQrScanInput(result);
    } else if (activeSerialField === 'manufacture') {
      setManufactureSerial(result);
    } else if (activeSerialField === 'xlink') {
      setXlinkSerial(result);
    } else if (activeSerialField === 'cradle') {
      setCradleSerial(result);
    } else if (activeSerialField === 'charger') {
      setChargerSerial(result);
    }

    toast.success(`Scanned: ${result}`);
    setActiveSerialField(null);
  };

  // Open barcode scanner for specific field
  const openBarcodeScanner = (field: 'serial' | 'qr' | 'manufacture' | 'xlink' | 'cradle' | 'charger') => {
    setActiveSerialField(field);
    setShowBarcodeScanner(true);
  };

  // Clear form
  const clearForm = () => {
    setSerialNumber('');
    setBusinessLine('');
    setDeviceType('');
    setSupplier('');
    setPurchaseOrder('');
    setDateReceived(undefined);
    setFaultDescription('');
    setQrScanInput('');
    setManufactureSerial('');
    setXlinkSerial('');
    setCradleSerial('');
    setChargerSerial('');
  };

  const isCashConnect = businessLine === 'Cash Connect';

  // Handle DOA logging
  const handleLogDOA = async () => {
    if (!serialNumber || !deviceType || !supplier || !faultDescription) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find device by serial number
      const { data: device, error: deviceError } = await supabase
        .from('device_registry')
        .select('id, serial_number, device_type, holder_type, holder_id')
        .eq('serial_number', serialNumber)
        .single();

      if (deviceError || !device) {
        toast.error('Device not found in registry. Please check serial number.');
        setIsSubmitting(false);
        return;
      }

      // Create repair ticket with DOA category
      await createTicket.mutateAsync({
        device_id: device.id,
        reported_by: profile?.email || '',
        fault_category: 'Dead On Arrival',
        fault_description: `DOA Device - ${faultDescription}\nSupplier: ${supplier}\nPO: ${purchaseOrder || 'N/A'}\nReceived: ${dateReceived ? format(dateReceived, 'yyyy-MM-dd') : 'N/A'}`,
        fault_severity: 'Critical',
        status: 'Reported',
      });

      // Update device status to Faulty
      await supabase
        .from('device_registry')
        .update({ status: 'Faulty' })
        .eq('id', device.id);

      // Log device movement
      await createDeviceMovement.mutateAsync({
        device_id: device.id,
        movement_type: 'Return',
        movement_date: new Date().toISOString(),
        from_holder_type: device.holder_type || 'Technician',
        from_holder_id: device.holder_id,
        to_holder_type: 'Warehouse',
        to_holder_id: 'Main',
        performed_by: profile?.id || 'System',
        notes: `DOA Return: ${faultDescription}`,
      });

      toast.success('DOA device logged successfully');
      clearForm();
      setShowLogDialog(false);
      refetch();
    } catch (error) {
      console.error('Error logging DOA:', error);
      toast.error('Failed to log DOA device');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle RMA initiation
  const handleInitiateRMA = async () => {
    if (!rmaNumber || !rmaDate) {
      toast.error('Please provide RMA number and date');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update repair ticket with RMA info (store in assessment_notes for now)
      const rmaInfo = {
        rma_number: rmaNumber,
        rma_date: format(rmaDate, 'yyyy-MM-dd'),
        rma_status: 'Shipped',
        expected_resolution: expectedResolution ? format(expectedResolution, 'yyyy-MM-dd') : null,
        supplier_notes: supplierNotes,
      };

      await supabase
        .from('repair_tickets')
        .update({
          assessment_notes: JSON.stringify(rmaInfo),
          status: 'In-Repair',
          assessed_by: profile?.email || '',
          assessment_date: new Date().toISOString(),
        })
        .eq('id', selectedDevice.id);

      toast.success('RMA initiated successfully');
      setShowRMADialog(false);
      setSelectedDevice(null);
      setRmaNumber('');
      setRmaDate(undefined);
      setExpectedResolution(undefined);
      setSupplierNotes('');
      refetch();
    } catch (error) {
      console.error('Error initiating RMA:', error);
      toast.error('Failed to initiate RMA');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Parse RMA info from assessment_notes
  const getRMAInfo = (ticket: any) => {
    try {
      if (ticket.assessment_notes) {
        return JSON.parse(ticket.assessment_notes);
      }
    } catch {
      return null;
    }
    return null;
  };

  // Filter DOA devices
  const filteredDOA = doaTickets?.filter((ticket: any) => {
    if (searchDOA) {
      const search = searchDOA.toLowerCase();
      const serialMatch = ticket.device?.serial_number?.toLowerCase().includes(search);
      const rmaInfo = getRMAInfo(ticket);
      const rmaMatch = rmaInfo?.rma_number?.toLowerCase().includes(search);
      if (!serialMatch && !rmaMatch) return false;
    }
    if (rmaStatusFilter && rmaStatusFilter !== 'all') {
      const rmaInfo = getRMAInfo(ticket);
      if (!rmaInfo || rmaInfo.rma_status !== rmaStatusFilter) return false;
    }
    return true;
  });

  // Count by RMA status
  const rmaStatusCounts = doaTickets?.reduce((acc: Record<string, number>, ticket: any) => {
    const rmaInfo = getRMAInfo(ticket);
    const status = rmaInfo?.rma_status || 'No RMA';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total DOA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{doaTickets?.length ?? 0}</div>
          </CardContent>
        </Card>

        {Object.entries(rmaStatusCounts || {}).slice(0, 4).map(([status, count]) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{status}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count as number}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button onClick={() => setShowLogDialog(true)}>
          <PackageX className="h-4 w-4 mr-2" />
          Log DOA Device
        </Button>
      </div>

      {/* DOA List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>DOA Devices & Returns</CardTitle>
              <CardDescription>Dead on arrival devices and supplier return management</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search serial or RMA..."
                  value={searchDOA}
                  onChange={(e) => setSearchDOA(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={rmaStatusFilter || 'all'} onValueChange={(v) => setRmaStatusFilter(v === 'all' ? undefined : v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="RMA Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Received by Supplier">Received</SelectItem>
                  <SelectItem value="Replaced">Replaced</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Device Type</TableHead>
                  <TableHead>Reported Date</TableHead>
                  <TableHead>Fault</TableHead>
                  <TableHead>RMA Number</TableHead>
                  <TableHead>RMA Status</TableHead>
                  <TableHead>Expected Resolution</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDOA && filteredDOA.length > 0 ? (
                  filteredDOA.map((ticket: any) => {
                    const rmaInfo = getRMAInfo(ticket);
                    return (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-sm">{ticket.device?.serial_number}</TableCell>
                        <TableCell>{ticket.device?.device_type}</TableCell>
                        <TableCell>{format(new Date(ticket.created_at), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="max-w-xs truncate">{ticket.fault_description}</TableCell>
                        <TableCell className="font-mono text-sm">{rmaInfo?.rma_number || '-'}</TableCell>
                        <TableCell>
                          {rmaInfo ? (
                            <Badge
                              variant={
                                rmaInfo.rma_status === 'Replaced' || rmaInfo.rma_status === 'Refunded'
                                  ? 'default'
                                  : rmaInfo.rma_status === 'Rejected'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {rmaInfo.rma_status}
                            </Badge>
                          ) : (
                            <Badge variant="outline">No RMA</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {rmaInfo?.expected_resolution
                            ? format(new Date(rmaInfo.expected_resolution), 'MMM dd, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!rmaInfo && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedDevice(ticket);
                                    setShowRMADialog(true);
                                  }}
                                >
                                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                                  Initiate RMA
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No DOA devices found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Log DOA Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Dead on Arrival Device</DialogTitle>
            <DialogDescription>
              Record a device that arrived defective and cannot be used
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business-line">Business Line *</Label>
              <Select value={businessLine} onValueChange={setBusinessLine}>
                <SelectTrigger>
                  <SelectValue placeholder="Select business line" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash Connect">Cash Connect</SelectItem>
                  <SelectItem value="ABSA">ABSA</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                  <SelectItem value="Modems">Modems</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cash Connect: QR Code scanning */}
            {isCashConnect ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="qr-scan">QR Code Scan (Comma-separated) *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="qr-scan"
                      value={qrScanInput}
                      onChange={(e) => handleQrScanChange(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="Scan Cash Connect QR code"
                      className="font-mono flex-1"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      inputMode="text"
                      data-1p-ignore
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => openBarcodeScanner('qr')}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serial-extracted">Extracted Serial Number</Label>
                  <Input
                    id="serial-extracted"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Auto-populated from QR"
                    className="font-mono"
                  />
                </div>
              </>
            ) : (
              <>
                {/* All other business lines: Individual serial fields */}
                <div className="space-y-2">
                  <Label htmlFor="manufacture-serial">Manufacture Serial Number *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="manufacture-serial"
                      value={manufactureSerial}
                      onChange={(e) => {
                        setManufactureSerial(e.target.value);
                        setSerialNumber(e.target.value); // Use as primary serial
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="Scan or enter manufacture serial"
                      className="font-mono flex-1"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      inputMode="text"
                      data-1p-ignore
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => openBarcodeScanner('manufacture')}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="xlink-serial">Xlink Serial</Label>
                    <div className="flex gap-2">
                      <Input
                        id="xlink-serial"
                        value={xlinkSerial}
                        onChange={(e) => setXlinkSerial(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="Scan or enter"
                        className="font-mono flex-1"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        inputMode="text"
                        data-1p-ignore
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => openBarcodeScanner('xlink')}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cradle-serial">Cradle Serial</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cradle-serial"
                        value={cradleSerial}
                        onChange={(e) => setCradleSerial(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="Scan or enter"
                        className="font-mono flex-1"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        inputMode="text"
                        data-1p-ignore
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => openBarcodeScanner('cradle')}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="charger-serial">Charger Serial</Label>
                  <div className="flex gap-2">
                    <Input
                      id="charger-serial"
                      value={chargerSerial}
                      onChange={(e) => setChargerSerial(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="Scan or enter"
                      className="font-mono flex-1"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      inputMode="text"
                      data-1p-ignore
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => openBarcodeScanner('charger')}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="device-type">Device Type *</Label>
              <Input
                id="device-type"
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                placeholder="e.g., Verifone VX520"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier *</Label>
                <Input
                  id="supplier"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Supplier name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="po">Purchase Order</Label>
                <Input
                  id="po"
                  value={purchaseOrder}
                  onChange={(e) => setPurchaseOrder(e.target.value)}
                  placeholder="PO number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date Received</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {dateReceived ? format(dateReceived, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateReceived} onSelect={setDateReceived} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fault">Fault Description *</Label>
              <Textarea
                id="fault"
                value={faultDescription}
                onChange={(e) => setFaultDescription(e.target.value)}
                placeholder="Describe what's wrong with the device..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleLogDOA} disabled={isSubmitting}>
              {isSubmitting ? 'Logging...' : 'Log DOA Device'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Initiate RMA Dialog */}
      <Dialog open={showRMADialog} onOpenChange={setShowRMADialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Initiate Supplier Return (RMA)</DialogTitle>
            <DialogDescription>
              Start the return process for: {selectedDevice?.device?.serial_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rma-number">RMA Number *</Label>
                <Input
                  id="rma-number"
                  value={rmaNumber}
                  onChange={(e) => setRmaNumber(e.target.value)}
                  placeholder="Supplier RMA number"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>RMA Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {rmaDate ? format(rmaDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={rmaDate} onSelect={setRmaDate} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Expected Resolution Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    {expectedResolution ? format(expectedResolution, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={expectedResolution} onSelect={setExpectedResolution} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier-notes">Supplier Notes</Label>
              <Textarea
                id="supplier-notes"
                value={supplierNotes}
                onChange={(e) => setSupplierNotes(e.target.value)}
                placeholder="Any notes or instructions from supplier..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRMADialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleInitiateRMA} disabled={isSubmitting}>
              {isSubmitting ? 'Initiating...' : 'Initiate RMA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => {
            setShowBarcodeScanner(false);
            setActiveSerialField(null);
          }}
        />
      )}
    </div>
  );
}
