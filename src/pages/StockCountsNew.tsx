import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Search,
  Plus,
  ClipboardList,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import ThemeToggle from '@/components/theme-toggle';

import type { Tables, Enums } from '@/integrations/supabase/types';

type InventoryItem = Tables<'inventory_items'>;
type BusinessLineEnum = Enums<'business_line_enum'>;
type ItemNatureEnum = Enums<'item_nature_enum'>;
type CountTypeEnum = Enums<'count_type'>;

// Categories in order
const CATEGORIES: { label: string; value: BusinessLineEnum }[] = [
  { label: 'Cash Connect', value: 'Cash Connect' },
  { label: 'ABSA', value: 'Absa' },
  { label: 'VPS', value: 'VPS' },
  { label: 'Modems', value: 'Modems' },
  { label: 'Accessories', value: 'Accessories' },
  { label: 'SIM Management', value: 'Sim Management' },
  { label: 'Other', value: 'Other' },
];

// Stock holder options
const STOCK_HOLDERS = ['Warehouse', 'Technician', 'OEM'];

// Scanned item type (individual unit scanned)
interface ScannedItem {
  id: string;
  deviceType: string;
  itemDescription: string;
  itemCategory: BusinessLineEnum;
  itemNature: ItemNatureEnum;
  itemCode: string;
  // Serial numbers
  manufactureSerialNumber?: string;
  qrCodeSerialNumber?: string;
  xlinkSerialNumber?: string;
  cradleSerialNumber?: string;
  chargerSerialNumber?: string;
  // Status
  itemStatus: 'Functional' | 'Faulty';
  faultReason?: string;
  overallCondition: string;
}

// Form validation schema
const formSchema = z.object({
  countType: z.enum(['Monthly', 'Mid-Month', 'Daily']),
  stockHolder: z.string().min(1, 'Stock holder is required'),
  nameOrLocation: z.string().optional(),
  contractorCompany: z.string().optional(),
  contractorRegion: z.string().optional(),
  technicianName: z.string().optional(),
  techId: z.string().optional(),
  binLocation: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Scan dialog form
const scanFormSchema = z.object({
  manufactureSerialNumber: z.string().optional(),
  qrCodeSerialNumber: z.string().optional(),
  xlinkSerialNumber: z.string().optional(),
  cradleSerialNumber: z.string().optional(),
  chargerSerialNumber: z.string().optional(),
  itemStatus: z.enum(['Functional', 'Faulty']),
  faultReason: z.string().optional(),
  overallCondition: z.string().min(1, 'Overall condition is required'),
});

type ScanFormValues = z.infer<typeof scanFormSchema>;

export default function StockCountsNew() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantityNeeded, setQuantityNeeded] = useState(1);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [qrScanInput, setQrScanInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Main form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      countType: 'Monthly',
      stockHolder: '',
      nameOrLocation: '',
      contractorCompany: '',
      contractorRegion: '',
      technicianName: '',
      techId: '',
      binLocation: '',
    },
  });

  // Scan form
  const scanForm = useForm<ScanFormValues>({
    resolver: zodResolver(scanFormSchema),
    defaultValues: {
      manufactureSerialNumber: '',
      qrCodeSerialNumber: '',
      xlinkSerialNumber: '',
      cradleSerialNumber: '',
      chargerSerialNumber: '',
      itemStatus: 'Functional',
      faultReason: '',
      overallCondition: 'Good',
    },
  });

  // Fetch inventory items
  const { data: inventoryItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['inventory_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('item_name', { ascending: true });

      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return inventoryItems.filter(
      (item) =>
        item.item_name.toLowerCase().includes(term) ||
        item.item_description?.toLowerCase().includes(term)
    );
  }, [inventoryItems, searchTerm]);

  // Helper: Check if Cash Connect
  const isCashConnect = (category: string | null) =>
    category?.includes('Cash Connect') ?? false;

  // Parse Cash Connect QR code (comma-separated format)
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

      return { itemCode, qrSerial: cashConnectSerial };
    }

    // No comma: use entire input as item code
    return { itemCode: input.trim(), qrSerial: '' };
  };

  // Handle QR code scan for Cash Connect
  const handleQrScanChange = (value: string) => {
    setQrScanInput(value);

    if (value && selectedItem && isCashConnect(selectedItem.item_category)) {
      const { itemCode, qrSerial } = parseQrCodeInput(value);
      scanForm.setValue('qrCodeSerialNumber', qrSerial);
      // You might also want to validate itemCode matches selectedItem
    }
  };

  // Select item and set quantity
  const handleSelectItem = (item: InventoryItem, quantity: number) => {
    setSelectedItem(item);
    setQuantityNeeded(quantity);

    // If non-serialized, skip scanning dialog
    if (item.item_nature === 'Non-serialised') {
      // Create a single scanned item record with quantity
      const scannedItem: ScannedItem = {
        id: `${item.id}-${Date.now()}`,
        deviceType: item.item_name,
        itemDescription: item.item_description || '',
        itemCategory: item.item_category as BusinessLineEnum,
        itemNature: item.item_nature as ItemNatureEnum,
        itemCode: item.item_name,
        itemStatus: 'Functional',
        overallCondition: 'Good',
      };

      // Add to scanned items multiple times based on quantity
      const items = Array(quantity).fill(null).map((_, idx) => ({
        ...scannedItem,
        id: `${scannedItem.id}-${idx}`,
      }));

      setScannedItems((prev) => [...prev, ...items]);
      setSelectedItem(null);

      toast({
        title: 'Item added',
        description: `Added ${quantity}x ${item.item_name}`,
      });
    } else {
      // Serialized: open scan dialog
      setShowScanDialog(true);
    }
  };

  // Add scanned item
  const handleAddScannedItem = () => {
    if (!selectedItem) return;

    const scanData = scanForm.getValues();

    // Check for duplicate serial numbers (for serialized items)
    if (selectedItem.item_nature === 'Serialised') {
      const duplicate = scannedItems.find((item) => {
        if (isCashConnect(selectedItem.item_category)) {
          // Cash Connect: Check QR code serial
          return (
            scanData.qrCodeSerialNumber &&
            item.qrCodeSerialNumber &&
            item.qrCodeSerialNumber.toUpperCase() === scanData.qrCodeSerialNumber.toUpperCase()
          );
        } else {
          // Other business lines: Check manufacture serial OR xlink serial
          if (
            scanData.manufactureSerialNumber &&
            item.manufactureSerialNumber &&
            item.manufactureSerialNumber.toUpperCase() === scanData.manufactureSerialNumber.toUpperCase()
          ) {
            return true;
          }
          if (
            scanData.xlinkSerialNumber &&
            item.xlinkSerialNumber &&
            item.xlinkSerialNumber.toUpperCase() === scanData.xlinkSerialNumber.toUpperCase()
          ) {
            return true;
          }
          return false;
        }
      });

      if (duplicate) {
        toast({
          title: 'Duplicate detected',
          description: 'This serial number has already been scanned',
          variant: 'destructive',
        });
        return;
      }
    }

    const scannedItem: ScannedItem = {
      id: `${selectedItem.id}-${Date.now()}`,
      deviceType: selectedItem.item_name,
      itemDescription: selectedItem.item_description || '',
      itemCategory: selectedItem.item_category as BusinessLineEnum,
      itemNature: selectedItem.item_nature as ItemNatureEnum,
      itemCode: selectedItem.item_name,
      manufactureSerialNumber: scanData.manufactureSerialNumber,
      qrCodeSerialNumber: scanData.qrCodeSerialNumber,
      xlinkSerialNumber: scanData.xlinkSerialNumber,
      cradleSerialNumber: scanData.cradleSerialNumber,
      chargerSerialNumber: scanData.chargerSerialNumber,
      itemStatus: scanData.itemStatus,
      faultReason: scanData.faultReason,
      overallCondition: scanData.overallCondition,
    };

    setScannedItems((prev) => [...prev, scannedItem]);

    // Check if we've scanned enough items
    const currentScannedCount = scannedItems.filter(
      (item) => item.deviceType === selectedItem.item_name
    ).length + 1;

    if (currentScannedCount >= quantityNeeded) {
      // Done scanning this item
      setShowScanDialog(false);
      setSelectedItem(null);
      scanForm.reset();
      setQrScanInput('');

      toast({
        title: 'Scanning complete',
        description: `Scanned ${currentScannedCount}/${quantityNeeded} items`,
      });
    } else {
      // Reset form for next scan
      scanForm.reset();
      setQrScanInput('');

      toast({
        title: 'Item scanned',
        description: `Scanned ${currentScannedCount}/${quantityNeeded} items`,
      });
    }
  };

  // Remove scanned item
  const removeScannedItem = (id: string) => {
    setScannedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Submit stock count
  const submitStockCount = async () => {
    if (scannedItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Please scan items before submitting',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = form.getValues();

      // Create stock count records for each scanned item
      const stockCountRecords = scannedItems.map((item) => ({
        count_type: formData.countType as CountTypeEnum,
        stock_holder: formData.stockHolder,
        name_or_location: formData.nameOrLocation || null,
        contractor_company: formData.contractorCompany || null,
        contractor_region: formData.contractorRegion || null,
        technician_name: formData.technicianName || null,
        tech_id: formData.techId || null,
        bin_location: formData.binLocation || null,
        device_type: item.deviceType,
        item_category: item.itemCategory,
        item_nature: item.itemNature,
        item_code: item.itemCode,
        item_description: item.itemDescription,
        quantity: 1, // Each record represents 1 scanned unit
        manufacture_serial_number: item.manufactureSerialNumber || null,
        qr_code_serial_number: item.qrCodeSerialNumber || null,
        xlink_serial_number: item.xlinkSerialNumber || null,
        cradle_serial_number: item.cradleSerialNumber || null,
        charger_serial_number: item.chargerSerialNumber || null,
        item_status: item.itemStatus,
        fault_reason: item.faultReason || null,
        overall_condition: item.overallCondition,
        user_email: user?.email || null,
        count_period: `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
      }));

      const { error } = await supabase
        .from('stock_counts')
        .insert(stockCountRecords);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Stock count submitted successfully with ${scannedItems.length} scanned items`,
      });

      // Clear scanned items and form
      setScannedItems([]);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['stockCounts'] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit stock count',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingItems) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  const currentScannedCount = selectedItem
    ? scannedItems.filter((item) => item.deviceType === selectedItem.item_name).length
    : 0;

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ClipboardList className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Stock Count - Serial Scanning</h1>
        </div>
        <div className="flex items-center gap-2">
          {scannedItems.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {scannedItems.length} items scanned
            </Badge>
          )}
          <ThemeToggle />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Stock Details Form */}
        <Card>
          <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
            <CardTitle className="text-sm">Enter Stock Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Form {...form}>
              <form className="space-y-4">
                {/* Count Type - Radio Buttons */}
                <FormField
                  control={form.control}
                  name="countType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select the Cycle *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Monthly" id="monthly" />
                            <Label htmlFor="monthly" className="text-sm">
                              Monthly
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Mid-Month" id="midmonth" />
                            <Label htmlFor="midmonth" className="text-sm">
                              Mid-Month
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Daily" id="daily" />
                            <Label htmlFor="daily" className="text-sm">
                              Daily
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Stock Holder */}
                <FormField
                  control={form.control}
                  name="stockHolder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Holder *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select stock holder" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STOCK_HOLDERS.map((holder) => (
                            <SelectItem key={holder} value={holder}>
                              {holder}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Name or Location */}
                <FormField
                  control={form.control}
                  name="nameOrLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name or Location</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Main Warehouse" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contractor Company */}
                <FormField
                  control={form.control}
                  name="contractorCompany"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contractor Company</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 4D Analytics" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Technician Name */}
                <FormField
                  control={form.control}
                  name="technicianName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Technician Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., John Doe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Bin Location */}
                <FormField
                  control={form.control}
                  name="binLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bin Location</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., A-12-3" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Middle Panel - Item Search */}
        <Card>
          <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
            <CardTitle className="text-sm">Search & Select Items</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by device name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              {searchTerm && (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-2">
                    {filteredItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No items found
                      </p>
                    ) : (
                      filteredItems.map((item) => (
                        <Card
                          key={item.id}
                          className="p-3 hover:bg-accent cursor-pointer transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.item_name}</p>
                              {item.item_description && (
                                <p className="text-xs text-muted-foreground">
                                  {item.item_description}
                                </p>
                              )}
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {item.item_category}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {item.item_nature}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              defaultValue="1"
                              className="w-20 h-8"
                              id={`qty-${item.id}`}
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                const qty = parseInt(
                                  (document.getElementById(`qty-${item.id}`) as HTMLInputElement)
                                    ?.value || '1'
                                );
                                handleSelectItem(item, qty);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Scanned Items */}
        <Card>
          <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
            <CardTitle className="text-sm">Scanned Items ({scannedItems.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {scannedItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No items scanned yet</p>
              </div>
            ) : (
              <>
                <ScrollArea className="h-[450px] pr-4">
                  <div className="space-y-2">
                    {scannedItems.map((item) => (
                      <Card key={item.id} className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.deviceType}</p>
                            {item.manufactureSerialNumber && (
                              <p className="text-xs text-muted-foreground">
                                S/N: {item.manufactureSerialNumber}
                              </p>
                            )}
                            {item.qrCodeSerialNumber && (
                              <p className="text-xs text-muted-foreground">
                                QR: {item.qrCodeSerialNumber}
                              </p>
                            )}
                            <div className="flex gap-1 mt-1">
                              <Badge
                                variant={item.itemStatus === 'Functional' ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {item.itemStatus}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {item.overallCondition}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeScannedItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                <div className="mt-4">
                  <Button
                    onClick={submitStockCount}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Submit Stock Count ({scannedItems.length} items)
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scan Dialog for Serialized Items */}
      <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Scan Item {currentScannedCount + 1} of {quantityNeeded}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.item_name} - {selectedItem?.item_nature}
            </DialogDescription>
          </DialogHeader>

          <Form {...scanForm}>
            <form className="space-y-4">
              {/* Cash Connect QR Code */}
              {selectedItem && isCashConnect(selectedItem.item_category) && (
                <div className="space-y-2">
                  <Label>Scan Cash Connect QR Code</Label>
                  <Input
                    value={qrScanInput}
                    onChange={(e) => handleQrScanChange(e.target.value)}
                    placeholder="Scan QR code (comma-separated)"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: ItemCode,SerialNumber or multi-comma format
                  </p>
                </div>
              )}

              {/* Regular Serial Numbers */}
              {selectedItem && !isCashConnect(selectedItem.item_category) && (
                <>
                  <FormField
                    control={scanForm.control}
                    name="manufactureSerialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacture Serial Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Scan or enter S/N" autoFocus />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={scanForm.control}
                    name="xlinkSerialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Xlink Serial Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Scan or enter Xlink S/N" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={scanForm.control}
                    name="cradleSerialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cradle Serial Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Scan or enter cradle S/N" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={scanForm.control}
                    name="chargerSerialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Charger Serial Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Scan or enter charger S/N" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Item Status */}
              <FormField
                control={scanForm.control}
                name="itemStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Functional">Functional</SelectItem>
                        <SelectItem value="Faulty">Faulty</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fault Reason (conditional) */}
              {scanForm.watch('itemStatus') === 'Faulty' && (
                <FormField
                  control={scanForm.control}
                  name="faultReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fault Reason</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Describe the fault" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Overall Condition */}
              <FormField
                control={scanForm.control}
                name="overallCondition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Overall Condition *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowScanDialog(false);
                setSelectedItem(null);
                scanForm.reset();
                setQrScanInput('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddScannedItem}>
              <Check className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
