import { useState } from 'react';
import { format } from 'date-fns';
import { Search, Filter, MoreHorizontal, Eye } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useDeviceRegistry, useDeviceMovements, useDeviceCategories, useDeviceTypes } from '@/hooks/useAssetManagement';
import type { DeviceRegistry, DeviceStatusEnum } from '@/integrations/supabase/services-asset';

// Status badge colors
const statusColors: Record<DeviceStatusEnum, string> = {
  'Available': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  'Installed': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  'Faulty': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  'In-Repair': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
  'Decommissioned': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
  'Unverified': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  'Missing': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
};

export function DeviceRegistryTab() {
  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('');

  // Detail view
  const [selectedDevice, setSelectedDevice] = useState<DeviceRegistry | null>(null);

  // Queries
  const { data: devices, isLoading } = useDeviceRegistry({
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
    deviceType: deviceTypeFilter || undefined,
    search: search || undefined,
  });

  const { data: categories } = useDeviceCategories();
  const { data: deviceTypes } = useDeviceTypes();
  const { data: movements } = useDeviceMovements(selectedDevice?.id);

  // Status options
  const statuses: DeviceStatusEnum[] = [
    'Available',
    'Installed',
    'Faulty',
    'In-Repair',
    'Decommissioned',
    'Unverified',
    'Missing',
  ];

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setDeviceTypeFilter('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search serial..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={deviceTypeFilter} onValueChange={setDeviceTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Device Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Device Types</SelectItem>
                {deviceTypes?.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
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
          <CardTitle className="text-sm font-medium">
            Devices ({devices?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Device Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Holder</TableHead>
                  <TableHead>Acquired</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices?.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-mono font-medium">
                      {device.serial_number}
                    </TableCell>
                    <TableCell>{device.device_type}</TableCell>
                    <TableCell>{device.item_category}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[device.status as DeviceStatusEnum] || ''}>
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {device.current_holder_type && device.current_holder_id && (
                        <span className="text-sm">
                          {device.current_holder_type}: {device.current_holder_id}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {device.date_acquired && format(new Date(device.date_acquired), 'PP')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedDevice(device)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {devices?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No devices found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Device Detail Dialog */}
      <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Device Details</DialogTitle>
            <DialogDescription>
              Serial: {selectedDevice?.serial_number}
            </DialogDescription>
          </DialogHeader>

          {selectedDevice && (
            <div className="space-y-4">
              {/* Device Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Device Type</span>
                  <p className="font-medium">{selectedDevice.device_type}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Category</span>
                  <p className="font-medium">{selectedDevice.item_category}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status</span>
                  <p>
                    <Badge className={statusColors[selectedDevice.status as DeviceStatusEnum] || ''}>
                      {selectedDevice.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Current Holder</span>
                  <p className="font-medium">
                    {selectedDevice.current_holder_type}: {selectedDevice.current_holder_id || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Date Acquired</span>
                  <p className="font-medium">
                    {selectedDevice.date_acquired
                      ? format(new Date(selectedDevice.date_acquired), 'PPP')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Warranty Expiry</span>
                  <p className="font-medium">
                    {selectedDevice.warranty_expiry
                      ? format(new Date(selectedDevice.warranty_expiry), 'PPP')
                      : 'N/A'}
                  </p>
                </div>
                {selectedDevice.supplier && (
                  <div>
                    <span className="text-sm text-muted-foreground">Supplier</span>
                    <p className="font-medium">{selectedDevice.supplier}</p>
                  </div>
                )}
                {selectedDevice.purchase_order_number && (
                  <div>
                    <span className="text-sm text-muted-foreground">PO Number</span>
                    <p className="font-medium">{selectedDevice.purchase_order_number}</p>
                  </div>
                )}
              </div>

              {/* Additional Serials */}
              {(selectedDevice.cradle_serial_number || selectedDevice.charger_serial_number) && (
                <div>
                  <h4 className="font-medium mb-2">Additional Serials</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedDevice.cradle_serial_number && (
                      <div>
                        <span className="text-muted-foreground">Cradle:</span>{' '}
                        <span className="font-mono">{selectedDevice.cradle_serial_number}</span>
                      </div>
                    )}
                    {selectedDevice.charger_serial_number && (
                      <div>
                        <span className="text-muted-foreground">Charger:</span>{' '}
                        <span className="font-mono">{selectedDevice.charger_serial_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Movement History */}
              <div>
                <h4 className="font-medium mb-2">Movement History</h4>
                {movements && movements.length > 0 ? (
                  <ScrollArea className="h-48 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell className="text-sm">
                              {format(new Date(movement.movement_date), 'PP')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{movement.movement_type}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {movement.from_holder_type
                                ? `${movement.from_holder_type}: ${movement.from_holder_id}`
                                : '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {movement.to_holder_type
                                ? `${movement.to_holder_type}: ${movement.to_holder_id}`
                                : '-'}
                            </TableCell>
                            <TableCell className="text-sm">{movement.performed_by}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground">No movements recorded</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
