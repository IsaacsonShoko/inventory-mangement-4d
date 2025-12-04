import { useState } from 'react';
import { format } from 'date-fns';
import { Search, Filter, MoreHorizontal, Eye, Wrench, Edit, Plus, Camera } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useRepairTickets, useRepairMetrics, useUpdateRepairTicket, useCreateRepairTicket, useDeviceBySerial, useCreateDeviceMovement } from '@/hooks/useAssetManagement';
import { useAuth } from '@/hooks/useAuth';
import { deviceRegistryService, type RepairStatusEnum, type FaultCategoryEnum } from '@/integrations/supabase/services-asset';
import { BarcodeScanner } from '@/components/BarcodeScanner';

// Status badge colors
const statusColors: Record<RepairStatusEnum, string> = {
  'Reported': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  'Assessing': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  'In-Repair': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
  'Repaired': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  'Quality-Check': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  'Returned': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
  'Decommissioned': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
};

// Fault categories for filter
const faultCategories: FaultCategoryEnum[] = [
  'Dead On Arrival',
  'Screen Damaged',
  'Cradle/Charger Damaged',
  'Enclosure Damaged',
  'Port/Connector Damaged',
  'Battery Failure',
  'Printer Malfunction',
  'Card Reader Failure',
  'Keypad Malfunction',
  'Speaker/Mic Failure',
  'Software Error',
  'Connectivity Issues',
  'Firmware Corruption',
  'SIM/Network Failure',
  'Water Damage',
  'Heat Damage',
  'Theft/Tampering',
  'Unknown',
  'Other',
];

export function RepairsTab() {
  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [faultFilter, setFaultFilter] = useState<string | undefined>(undefined);

  // Detail view
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  // Edit state
  const [editTicket, setEditTicket] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    fault_category: '',
    fault_description: '',
    assessment_notes: '',
  });

  // Create ticket state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    business_line: '',
    // Serial numbers
    serial_number: '',
    qr_code_serial: '',
    xlink_serial: '',
    cradle_serial: '',
    charger_serial: '',
    // Fault fields
    fault_category: '',
    fault_description: '',
    fault_severity: '',
    // Item fields
    item_status: '' as 'Functional' | 'Faulty' | '',
    overall_condition: '' as 'New' | 'Good' | 'Fair' | 'Poor' | '',
  });
  const [serialLookup, setSerialLookup] = useState('');
  const [qrScanInput, setQrScanInput] = useState('');

  // Barcode scanner state
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [activeSerialField, setActiveSerialField] = useState<'qr' | 'manufacture' | 'xlink' | 'cradle' | 'charger' | null>(null);

  // Queries
  const { data: tickets, isLoading } = useRepairTickets({
    status: statusFilter || undefined,
    faultCategory: faultFilter || undefined,
  });

  const { data: metrics } = useRepairMetrics();

  // Auth
  const { profile } = useAuth();

  // Mutations
  const updateTicket = useUpdateRepairTicket();
  const createTicket = useCreateRepairTicket();
  const createDeviceMovement = useCreateDeviceMovement();

  // Device lookup query
  const { data: deviceLookup, isLoading: isLoadingDevice } = useDeviceBySerial(serialLookup);

  // Status options
  const statuses: RepairStatusEnum[] = [
    'Reported',
    'Assessing',
    'In-Repair',
    'Repaired',
    'Quality-Check',
    'Returned',
    'Decommissioned',
  ];

  const clearFilters = () => {
    setSearch('');
    setStatusFilter(undefined);
    setFaultFilter(undefined);
  };

  // Helper to check if business line is Cash Connect
  const isCashConnect = () =>
    createFormData.business_line?.includes('Cash Connect') ?? false;

  // Parse comma-separated QR code input for Cash Connect
  const parseQrCodeInput = (input: string) => {
    const commaCount = (input.match(/,/g) || []).length;

    if (commaCount >= 1) {
      const firstCommaIndex = input.indexOf(',');
      const itemCode = input.substring(0, firstCommaIndex).trim();

      let cashConnectSerial = '';
      if (commaCount > 1) {
        // More than 1 comma: extract characters 14-18 (positions 13-17 in 0-based index)
        cashConnectSerial = input.substring(13, 18);
      } else if (commaCount === 1) {
        // Exactly 1 comma: extract everything after the first comma
        cashConnectSerial = input.substring(firstCommaIndex + 1).trim();
      }

      return { itemCode, cashConnectSerial };
    }

    // No comma: use entire input as item code
    return { itemCode: input.trim(), cashConnectSerial: '' };
  };

  // Handle QR code scan input change for Cash Connect
  const handleQrScanChange = (value: string) => {
    setQrScanInput(value);

    if (value && isCashConnect()) {
      const { cashConnectSerial } = parseQrCodeInput(value);
      setCreateFormData(prev => ({
        ...prev,
        qr_code_serial: cashConnectSerial,
      }));
    }
  };

  // Handle barcode scan from camera
  const handleBarcodeScan = (result: string) => {
    setShowBarcodeScanner(false);

    if (!activeSerialField) return;

    if (activeSerialField === 'qr') {
      // Handle Cash Connect QR code
      handleQrScanChange(result);
      setQrScanInput(result);
    } else if (activeSerialField === 'manufacture') {
      setCreateFormData(prev => ({ ...prev, serial_number: result }));
    } else if (activeSerialField === 'xlink') {
      setCreateFormData(prev => ({ ...prev, xlink_serial: result }));
    } else if (activeSerialField === 'cradle') {
      setCreateFormData(prev => ({ ...prev, cradle_serial: result }));
    } else if (activeSerialField === 'charger') {
      setCreateFormData(prev => ({ ...prev, charger_serial: result }));
    }

    toast.success(`Scanned successfully: ${result}`);
    setActiveSerialField(null);
  };

  // Open barcode scanner for specific field
  const openBarcodeScanner = (field: 'qr' | 'manufacture' | 'xlink' | 'cradle' | 'charger') => {
    setActiveSerialField(field);
    setShowBarcodeScanner(true);
  };

  const handleEditClick = (ticket: any) => {
    setEditTicket(ticket);
    setEditFormData({
      fault_category: ticket.fault_category || '',
      fault_description: ticket.fault_description || '',
      assessment_notes: ticket.assessment_notes || '',
    });
  };

  const handleEditSave = async () => {
    if (!editTicket) return;

    try {
      await updateTicket.mutateAsync({
        id: editTicket.id,
        updates: {
          fault_category: editFormData.fault_category as FaultCategoryEnum,
          fault_description: editFormData.fault_description,
          assessment_notes: editFormData.assessment_notes,
        },
      });

      toast.success('Repair ticket updated successfully');
      setEditTicket(null);
    } catch (error) {
      console.error('Failed to update repair ticket:', error);
      toast.error('Failed to update repair ticket');
    }
  };

  const handleSerialLookup = () => {
    const primarySerial = isCashConnect()
      ? createFormData.qr_code_serial
      : createFormData.serial_number;

    if (primarySerial?.trim()) {
      setSerialLookup(primarySerial.trim());
    }
  };

  const handleCreateTicket = async () => {
    if (!deviceLookup) {
      toast.error('Device not found. Please verify the serial number.');
      return;
    }

    if (!createFormData.fault_category) {
      toast.error('Please select a fault category');
      return;
    }

    try {
      await createTicket.mutateAsync({
              device_id: deviceLookup.id,
              reported_by: profile?.full_name || profile?.email || 'Unknown',
              fault_category: createFormData.fault_category as FaultCategoryEnum,
              fault_description: createFormData.fault_description || null,
              fault_severity: createFormData.fault_severity || null,
              status: 'Reported',
            });

            // Update device status to Maintenance
            await deviceRegistryService.updateStatus(
              deviceLookup.id,
              'Maintenance'
            );

            // Log device movement
            await createDeviceMovement.mutateAsync({
              device_id: deviceLookup.id,
              movement_type: 'Repair-In',
              movement_date: new Date().toISOString(),
              from_holder_type: 'Technician', // Assuming coming from tech/field
              from_holder_id: null, // We might not know the exact tech without more context, or could use profile.id if they are the tech
              to_holder_type: 'Warehouse', // Repairs usually happen at warehouse/hub
              to_holder_id: 'Main',
              performed_by: profile?.id || 'System',
              notes: `Device submitted for repair: ${createFormData.fault_category}`,
            });

            toast.success('Repair ticket created successfully');
      setShowCreateDialog(false);
      setCreateFormData({
        serial_number: '',
        fault_category: '',
        fault_description: '',
        fault_severity: '',
      });
      setSerialLookup('');
    } catch (error) {
      console.error('Failed to create repair ticket:', error);
      toast.error('Failed to create repair ticket');
    }
  };

  // Filter tickets by search
  const filteredTickets = tickets?.filter((ticket: any) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      ticket.device?.serial_number?.toLowerCase().includes(searchLower) ||
      ticket.reported_by?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {(metrics.byStatus?.['Reported'] ?? 0) +
                  (metrics.byStatus?.['Assessing'] ?? 0) +
                  (metrics.byStatus?.['In-Repair'] ?? 0) +
                  (metrics.byStatus?.['Quality-Check'] ?? 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics.byStatus?.['Returned'] ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Repair Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(metrics.avgRepairTimeHours ?? 0) > 0
                  ? `${Math.round(metrics.avgRepairTimeHours)}h`
                  : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Log Repair Ticket
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search serial or reporter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === 'all' ? undefined : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={faultFilter} onValueChange={(value) => setFaultFilter(value === 'all' ? undefined : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Fault Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fault Types</SelectItem>
                {faultCategories.map((fault) => (
                  <SelectItem key={fault} value={fault}>{fault}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Repair Tickets ({filteredTickets?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Device Type</TableHead>
                  <TableHead>Business Line</TableHead>
                  <TableHead>Fault Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets?.map((ticket: any) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">
                      #{ticket.ticket_number}
                    </TableCell>
                    <TableCell className="font-mono">
                      {ticket.device?.serial_number || 'N/A'}
                    </TableCell>
                    <TableCell>{ticket.device?.device_type || 'N/A'}</TableCell>
                    <TableCell>{ticket.device?.item_category || 'N/A'}</TableCell>
                    <TableCell>{ticket.fault_category}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[ticket.status as RepairStatusEnum] || ''}>
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{ticket.reported_by}</TableCell>
                    <TableCell>
                      {format(new Date(ticket.reported_date), 'PP')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedTicket(ticket)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditClick(ticket)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Fault Assessment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTickets?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No repair tickets found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={() => {
        setShowCreateDialog(false);
        setCreateFormData({
          business_line: '',
          serial_number: '',
          qr_code_serial: '',
          xlink_serial: '',
          cradle_serial: '',
          charger_serial: '',
          fault_category: '',
          fault_description: '',
          fault_severity: '',
          item_status: '',
          overall_condition: '',
        });
        setSerialLookup('');
        setQrScanInput('');
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Repair Ticket</DialogTitle>
            <DialogDescription>
              Scan device serial numbers and capture fault details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Business Line Selection */}
            <div className="space-y-2">
              <Label>Business Line *</Label>
              <Select
                value={createFormData.business_line}
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, business_line: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business line..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash Connect">Cash Connect</SelectItem>
                  <SelectItem value="ABSA">ABSA</SelectItem>
                  <SelectItem value="VPS">VPS</SelectItem>
                  <SelectItem value="Accessories">Accessories</SelectItem>
                  <SelectItem value="Modems">Modems</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Item Status and Overall Condition */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item Status *</Label>
                <Select
                  value={createFormData.item_status}
                  onValueChange={(value) => setCreateFormData(prev => ({ ...prev, item_status: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Functional">Functional</SelectItem>
                    <SelectItem value="Faulty">Faulty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Overall Condition *</Label>
                <Select
                  value={createFormData.overall_condition}
                  onValueChange={(value) => setCreateFormData(prev => ({ ...prev, overall_condition: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Serial Number Fields - Conditional based on business line */}
            {createFormData.business_line && (
              <>
                {isCashConnect() ? (
                  <>
                    {/* Cash Connect: QR Code Scan */}
                    <p className="text-sm font-semibold text-center">Scan Cash Connect QR Code</p>

                    <div className="space-y-2">
                      <Label>QR Code Scan (Comma-separated format)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={qrScanInput}
                          onChange={(e) => handleQrScanChange(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          placeholder="Scan QR code here"
                          autoFocus
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          inputMode="text"
                          data-1p-ignore
                          className="flex-1"
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
                      <Label>QR Code Serial Number</Label>
                      <Input
                        value={createFormData.qr_code_serial}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, qr_code_serial: e.target.value }))}
                        onFocus={(e) => e.target.select()}
                        placeholder="Auto-populated from scan or enter manually"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        inputMode="text"
                        data-1p-ignore
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* All other business lines: Individual serial number fields */}
                    <p className="text-sm font-semibold text-center">Scan Device Serial Numbers</p>

                    <div className="space-y-2">
                      <Label>Manufacture Serial Number</Label>
                      <div className="flex gap-2">
                        <Input
                          value={createFormData.serial_number}
                          onChange={(e) => setCreateFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                          onFocus={(e) => e.target.select()}
                          placeholder="Scan or enter manufacture serial"
                          autoFocus
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          inputMode="text"
                          data-1p-ignore
                          className="flex-1"
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

                    <div className="space-y-2">
                      <Label>Xlink Serial Number</Label>
                      <div className="flex gap-2">
                        <Input
                          value={createFormData.xlink_serial}
                          onChange={(e) => setCreateFormData(prev => ({ ...prev, xlink_serial: e.target.value }))}
                          onFocus={(e) => e.target.select()}
                          placeholder="Scan or enter xlink serial"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          inputMode="text"
                          data-1p-ignore
                          className="flex-1"
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
                      <Label>Cradle Serial Number</Label>
                      <div className="flex gap-2">
                        <Input
                          value={createFormData.cradle_serial}
                          onChange={(e) => setCreateFormData(prev => ({ ...prev, cradle_serial: e.target.value }))}
                          onFocus={(e) => e.target.select()}
                          placeholder="Scan or enter cradle serial"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          inputMode="text"
                          data-1p-ignore
                          className="flex-1"
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

                    <div className="space-y-2">
                      <Label>Charger Serial Number</Label>
                      <div className="flex gap-2">
                        <Input
                          value={createFormData.charger_serial}
                          onChange={(e) => setCreateFormData(prev => ({ ...prev, charger_serial: e.target.value }))}
                          onFocus={(e) => e.target.select()}
                          placeholder="Scan or enter charger serial"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          inputMode="text"
                          data-1p-ignore
                          className="flex-1"
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

                {/* Device Lookup Button and Status */}
                <div className="space-y-2">
                  <Button onClick={handleSerialLookup} disabled={isLoadingDevice} className="w-full">
                    {isLoadingDevice ? 'Looking up device...' : 'Lookup Device in Registry'}
                  </Button>
                  {deviceLookup && (
                    <p className="text-sm text-green-600">
                      Device found: {deviceLookup.device_type} - {deviceLookup.item_category}
                    </p>
                  )}
                  {serialLookup && !deviceLookup && !isLoadingDevice && (
                    <p className="text-sm text-red-600">
                      Device not found in registry
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Fault Category *</Label>
              <Select
                value={createFormData.fault_category}
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, fault_category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fault category" />
                </SelectTrigger>
                <SelectContent>
                  {faultCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fault Severity</Label>
              <Select
                value={createFormData.fault_severity}
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, fault_severity: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fault Description</Label>
              <Textarea
                value={createFormData.fault_description}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, fault_description: e.target.value }))}
                placeholder="Describe the fault in detail..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setCreateFormData({
                business_line: '',
                serial_number: '',
                qr_code_serial: '',
                xlink_serial: '',
                cradle_serial: '',
                charger_serial: '',
                fault_category: '',
                fault_description: '',
                fault_severity: '',
                item_status: '',
                overall_condition: '',
              });
              setSerialLookup('');
              setQrScanInput('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateTicket} disabled={createTicket.isPending || !deviceLookup}>
              {createTicket.isPending ? 'Creating...' : 'Create Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Ticket Dialog */}
      <Dialog open={!!editTicket} onOpenChange={() => setEditTicket(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Repair Ticket #{editTicket?.ticket_number}</DialogTitle>
            <DialogDescription>
              Update fault assessment for {editTicket?.device?.serial_number}
            </DialogDescription>
          </DialogHeader>

          {editTicket && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fault Category *</Label>
                <Select
                  value={editFormData.fault_category}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, fault_category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fault category" />
                  </SelectTrigger>
                  <SelectContent>
                    {faultCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fault Description</Label>
                <Textarea
                  value={editFormData.fault_description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, fault_description: e.target.value }))}
                  placeholder="Describe the fault in detail..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Assessment Notes</Label>
                <Textarea
                  value={editFormData.assessment_notes}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, assessment_notes: e.target.value }))}
                  placeholder="Add assessment notes..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTicket(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={updateTicket.isPending}>
              {updateTicket.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Repair Ticket #{selectedTicket?.ticket_number}</DialogTitle>
            <DialogDescription>
              Device: {selectedTicket?.device?.serial_number}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              {/* Fault Info */}
              <div>
                <h4 className="font-medium mb-2">Fault Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Category</span>
                    <p className="font-medium">{selectedTicket.fault_category}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Severity</span>
                    <p className="font-medium">{selectedTicket.fault_severity || 'Not specified'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">Description</span>
                    <p className="font-medium">{selectedTicket.fault_description || 'No description'}</p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h4 className="font-medium mb-2">Status</h4>
                <Badge className={statusColors[selectedTicket.status as RepairStatusEnum] || ''}>
                  {selectedTicket.status}
                </Badge>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="font-medium mb-2">Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reported</span>
                    <span>{format(new Date(selectedTicket.reported_date), 'PPp')}</span>
                  </div>
                  {selectedTicket.assessment_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assessed</span>
                      <span>{format(new Date(selectedTicket.assessment_date), 'PPp')}</span>
                    </div>
                  )}
                  {selectedTicket.repair_start_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Repair Started</span>
                      <span>{format(new Date(selectedTicket.repair_start_date), 'PPp')}</span>
                    </div>
                  )}
                  {selectedTicket.repair_end_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Repair Completed</span>
                      <span>{format(new Date(selectedTicket.repair_end_date), 'PPp')}</span>
                    </div>
                  )}
                  {selectedTicket.quality_check_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quality Check</span>
                      <span>{format(new Date(selectedTicket.quality_check_date), 'PPp')}</span>
                    </div>
                  )}
                  {selectedTicket.returned_to_stock_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Returned to Stock</span>
                      <span>{format(new Date(selectedTicket.returned_to_stock_date), 'PPp')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assessment */}
              {selectedTicket.assessment_notes && (
                <div>
                  <h4 className="font-medium mb-2">Assessment</h4>
                  <p className="text-sm">{selectedTicket.assessment_notes}</p>
                  {selectedTicket.is_repairable !== null && (
                    <Badge variant={selectedTicket.is_repairable ? 'default' : 'destructive'} className="mt-2">
                      {selectedTicket.is_repairable ? 'Repairable' : 'Not Repairable'}
                    </Badge>
                  )}
                </div>
              )}

              {/* Repair Details */}
              {selectedTicket.repair_actions && (
                <div>
                  <h4 className="font-medium mb-2">Repair Actions</h4>
                  <p className="text-sm">{selectedTicket.repair_actions}</p>
                  {selectedTicket.parts_used && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Parts used: {selectedTicket.parts_used}
                    </p>
                  )}
                  {selectedTicket.repair_cost && (
                    <p className="text-sm text-muted-foreground">
                      Cost: R{selectedTicket.repair_cost}
                    </p>
                  )}
                </div>
              )}

              {/* Quality Check */}
              {selectedTicket.quality_check_notes && (
                <div>
                  <h4 className="font-medium mb-2">Quality Check</h4>
                  <p className="text-sm">{selectedTicket.quality_check_notes}</p>
                  <Badge
                    variant={selectedTicket.quality_check_passed ? 'default' : 'destructive'}
                    className="mt-2"
                  >
                    {selectedTicket.quality_check_passed ? 'Passed' : 'Failed'}
                  </Badge>
                </div>
              )}
            </div>
          )}
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
