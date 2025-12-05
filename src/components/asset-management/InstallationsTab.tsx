import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, Calendar, MapPin, User, CheckCircle2, Plus, Camera } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

import { useAuth } from '@/hooks/useAuth';
import { useCreateDeviceMovement } from '@/hooks/useAssetManagement';
import { supabase } from '@/integrations/supabase/client';
import { deviceRegistryService } from '@/integrations/supabase/services-asset';
import { BarcodeScanner } from '@/components/BarcodeScanner';

export function InstallationsTab() {
  const { profile } = useAuth();
  
  // State
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [location, setLocation] = useState('');
  const [installDate, setInstallDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  
  // Scanner state
  const [showScanner, setShowScanner] = useState(false);

  // Installation history (mock data for now, would typically come from a query)
  // We'll query device movements of type 'Installation'
  const [installations, setInstallations] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch installation history
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('device_movements')
        .select(`
          *,
          device:device_registry(serial_number, device_type, item_category)
        `)
        .eq('movement_type', 'Installation')
        .order('movement_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setInstallations(data || []);
    } catch (error) {
      console.error('Error fetching installation history:', error);
      toast.error('Failed to load installation history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Mutations
  const createMovement = useCreateDeviceMovement();

  const handleInstall = async () => {
    if (!serialNumber || !location) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Find device
      const { data: device, error: deviceError } = await supabase
        .from('device_registry')
        .select('*')
        .or(`manufacture_serial_number.eq.${serialNumber},qr_code_serial_number.eq.${serialNumber},serial_number.eq.${serialNumber}`)
        .maybeSingle();

      if (deviceError || !device) {
        toast.error('Device not found in registry');
        setIsSubmitting(false);
        return;
      }

      // 2. Check if device is available (optional, but good practice)
      if (device.status !== 'Available' && device.status !== 'Assigned') {
         // Depending on business rules, might warn or block
         // For now, we'll just proceed but maybe show a warning?
      }

      // 3. Update device status to 'Installed' and location
      await deviceRegistryService.updateStatus(
        device.id,
        'Installed',
        'Customer', // Assuming installed at customer
        location
      );

      // 4. Log movement
      await createMovement.mutateAsync({
        device_id: device.id,
        movement_type: 'Installation',
        movement_date: installDate.toISOString(),
        from_holder_type: device.current_holder_type || 'Technician',
        from_holder_id: device.current_holder_id,
        to_holder_type: 'Customer',
        to_holder_id: location,
        performed_by: profile?.id || 'System',
        notes: notes
      });

      toast.success('Device installed successfully');
      setShowInstallDialog(false);
      
      // Reset form
      setSerialNumber('');
      setLocation('');
      setInstallDate(new Date());
      setNotes('');
      
      // Refresh history
      fetchHistory();

    } catch (error) {
      console.error('Installation failed:', error);
      toast.error('Failed to record installation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScan = (result: string) => {
    setSerialNumber(result);
    setShowScanner(false);
    toast.success('Serial number scanned');
  };

  // Filter history
  const filteredInstallations = installations.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      item.device?.serial_number?.toLowerCase().includes(s) ||
      item.to_holder_id?.toLowerCase().includes(s) ||
      item.device?.device_type?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Installations</h2>
          <p className="text-muted-foreground">
            Record new device installations and view history
          </p>
        </div>
        <Button onClick={() => setShowInstallDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Installation
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filter History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by serial, location, or device type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Installation History List */}
      <Card>
        <CardHeader>
          <CardTitle>Installation History</CardTitle>
          <CardDescription>Recent device deployments</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Location / Customer</TableHead>
                  <TableHead>Installed By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingHistory ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading history...
                    </TableCell>
                  </TableRow>
                ) : filteredInstallations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No installations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInstallations.map((install) => (
                    <TableRow key={install.id}>
                      <TableCell>
                        {format(new Date(install.movement_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{install.device?.device_type}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {install.device?.serial_number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {install.to_holder_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {/* In a real app, we'd fetch the user name or store it. For now using 'System' or ID */}
                          {install.performed_by === 'System' ? 'System' : 'Technician'}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {install.notes}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* New Installation Dialog */}
      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record New Installation</DialogTitle>
            <DialogDescription>
              Enter details of the device deployment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="serial">Serial Number *</Label>
              <div className="flex gap-2">
                <Input 
                  id="serial" 
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Scan or enter serial"
                />
                <Button size="icon" variant="outline" onClick={() => setShowScanner(true)}>
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Installation Location / Customer *</Label>
              <Input 
                id="location" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Store 123, Client HQ"
              />
            </div>

            <div className="space-y-2">
              <Label>Installation Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(installDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={installDate}
                    onSelect={(date) => date && setInstallDate(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any installation remarks..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInstallDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInstall} disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Record Installation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
