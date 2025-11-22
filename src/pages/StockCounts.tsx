import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, Plus, RefreshCw, Check, X, ClipboardList, Loader2, Barcode, Camera, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

import { stockCountSupabaseService as stockCountService } from '@/services/stockCountSupabaseService';
import { StockItem, StockCountFormData } from '@/types/stock';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { useAuth } from '@/hooks/useAuth';
import { Separator } from '@/components/ui/separator';

// Helper to check if item is Cash Connect
const isCashConnect = (itemCategory: string | undefined) =>
  itemCategory?.includes('Cash Connect') ?? false;

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

// Form validation schema
const formSchema = z.object({
  countType: z.enum(['Monthly', 'Mid-Month', 'Daily']),
  stockHolder: z.string().min(1, 'Stock holder is required'),
  nameOrLocation: z.string().min(1, 'Name or location is required'),
  itemCategory: z.string().min(1, 'Item category is required'),
  binLocation: z.string().optional(),
  deviceType: z.string().min(1, 'Device type is required'),
  itemNature: z.enum(['Serialised', 'Non-serialised']),
  itemCode: z.string().min(1, 'Item code is required'),
  itemDescription: z.string().min(1, 'Item description is required'),
  quantity: z.number().min(0, 'Quantity must be 0 or greater'),
  manufactureSerialNumber: z.string().optional(),
  qrCodeSerialNumber: z.string().optional(),
  xlinkSerialNumber: z.string().optional(),
  cradleSerialNumber: z.string().optional(),
  chargerSerialNumber: z.string().optional(),
  itemStatus: z.string().min(1, 'Item status is required'),
  faultReason: z.string().optional(),
  overallCondition: z.string().optional(),
  xliCaseRef: z.string().optional(),
  contractorCompany: z.string().min(1, 'Contractor company is required'),
  contractorRegion: z.string().min(1, 'Contractor region is required'),
  technicianName: z.string().min(1, 'Technician name is required'),
  techId: z.string().min(1, 'Tech ID is required'),
});

type FormValues = z.infer<typeof formSchema>;

const StockCounts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [isSerialized, setIsSerialized] = useState<boolean | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [currentScanField, setCurrentScanField] = useState<string | null>(null);
  const scannerRef = useRef<{ closeScanner: () => void }>(null);
  const [qrScanInput, setQrScanInput] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      countType: 'Monthly',
      itemNature: 'Non-serialised',
      quantity: 1,
    },
  });

  // Fetch stock items
  const { data: stockItems = [], isLoading, refetch } = useQuery({
    queryKey: ['stockItems', { searchTerm, itemCategory, isSerialized }],
    queryFn: () =>
      stockCountService.getStockItems({
        searchTerm,
        itemCategory: itemCategory || undefined,
        isSerialized,
      }),
  });

  // Fetch existing stock levels for duplicate checking
  const { data: existingStockLevels = [] } = useQuery({
    queryKey: ['stockLevelsForDuplicateCheck'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_levels')
        .select('id, manufacture_serial_number, qr_code_serial_number, xlink_serial_number, cradle_serial_number, charger_serial_number, item_category');
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Handle QR code scan input change for Cash Connect
  const handleQrScanChange = (value: string) => {
    setQrScanInput(value);

    if (value && isCashConnect(form.watch('itemCategory'))) {
      const { itemCode, cashConnectSerial } = parseQrCodeInput(value);
      form.setValue('itemCode', itemCode);
      form.setValue('qrCodeSerialNumber', cashConnectSerial);
    }
  };

  // Check for duplicate serial numbers
  const checkDuplicateSerials = (data: FormValues): string | null => {
    if (data.itemNature !== 'Serialised') return null;

    const isCashConnectItem = isCashConnect(data.itemCategory);

    if (isCashConnectItem) {
      // Cash Connect: Check only QR Code Serial Number (CashConnect Serial)
      if (data.qrCodeSerialNumber) {
        const duplicate = existingStockLevels.find(
          (item) =>
            item.id !== editingId &&
            item.qr_code_serial_number &&
            item.qr_code_serial_number.toUpperCase() === data.qrCodeSerialNumber!.toUpperCase()
        );
        if (duplicate) {
          return `Duplicate CashConnect Serial Number detected: "${data.qrCodeSerialNumber}" already exists in inventory.`;
        }
      }
    } else {
      // All other business lines: Check Manufacture OR Cradle OR Charger serial numbers
      if (data.manufactureSerialNumber) {
        const duplicate = existingStockLevels.find(
          (item) =>
            item.id !== editingId &&
            item.manufacture_serial_number &&
            item.manufacture_serial_number.toUpperCase() === data.manufactureSerialNumber!.toUpperCase()
        );
        if (duplicate) {
          return `Duplicate Manufacture Serial Number detected: "${data.manufactureSerialNumber}" already exists in inventory.`;
        }
      }

      if (data.cradleSerialNumber) {
        const duplicate = existingStockLevels.find(
          (item) =>
            item.id !== editingId &&
            item.cradle_serial_number &&
            item.cradle_serial_number.toUpperCase() === data.cradleSerialNumber!.toUpperCase()
        );
        if (duplicate) {
          return `Duplicate Cradle Serial Number detected: "${data.cradleSerialNumber}" already exists in inventory.`;
        }
      }

      if (data.chargerSerialNumber) {
        const duplicate = existingStockLevels.find(
          (item) =>
            item.id !== editingId &&
            item.charger_serial_number &&
            item.charger_serial_number.toUpperCase() === data.chargerSerialNumber!.toUpperCase()
        );
        if (duplicate) {
          return `Duplicate Charger Serial Number detected: "${data.chargerSerialNumber}" already exists in inventory.`;
        }
      }
    }

    return null;
  };

  // Create or update stock count
  const mutation = useMutation({
    mutationFn: async (data: StockCountFormData) => {
      if (!user?.email) {
        throw new Error('User email not available');
      }
      if (editingId) {
        return stockCountService.updateStockCount(editingId, data);
      }
      return stockCountService.createStockCount(data, user.email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stockItems'] });
      toast({
        title: 'Success',
        description: editingId ? 'Stock count updated successfully' : 'Stock count created successfully',
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: FormValues) => {
    // Check for duplicate serial numbers before submission
    const duplicateErrorMsg = checkDuplicateSerials(data);
    if (duplicateErrorMsg) {
      setDuplicateError(duplicateErrorMsg);
      toast({
        title: 'Duplicate Serial Number Detected',
        description: duplicateErrorMsg,
        variant: 'destructive',
      });
      return;
    }

    setDuplicateError(null);
    mutation.mutate(data as StockCountFormData);
  };

  // Handle barcode scan result
  const handleBarcodeScanned = (result: string) => {
    if (currentScanField) {
      form.setValue(currentScanField as any, result, { shouldValidate: true });
      setCurrentScanField(null);
    }
    setShowScanner(false);
  };

  // Open scanner for a specific field
  const openScanner = (fieldName: string) => {
    setCurrentScanField(fieldName);
    setShowScanner(true);
  };

  // Reset form
  const resetForm = () => {
    form.reset();
    setEditingId(null);
    setIsFormOpen(false);
    setShowScanner(false);
    setCurrentScanField(null);
    setQrScanInput('');
    setDuplicateError(null);
  };

  // Edit stock count
  const handleEdit = (item: StockItem) => {
    form.reset({
      countType: item.countType,
      stockHolder: item.stockHolder,
      nameOrLocation: item.nameOrLocation,
      itemCategory: item.itemCategory,
      binLocation: item.binLocation,
      deviceType: item.deviceType,
      itemNature: item.itemNature,
      itemCode: item.itemCode,
      itemDescription: item.itemDescription,
      quantity: item.quantity,
      manufactureSerialNumber: item.manufactureSerialNumber,
      qrCodeSerialNumber: item.qrCodeSerialNumber,
      xlinkSerialNumber: item.xlinkSerialNumber,
      cradleSerialNumber: item.cradleSerialNumber,
      chargerSerialNumber: item.chargerSerialNumber,
      itemStatus: item.itemStatus,
      faultReason: item.faultReason,
      overallCondition: item.overallCondition,
      xliCaseRef: item.xliCaseRef,
      contractorCompany: item.contractorCompany,
      contractorRegion: item.contractorRegion,
      technicianName: item.technicianName,
      techId: item.techId,
    });
    setEditingId(item.id);
    setIsFormOpen(true);
  };

  // Get unique categories for filter
  const categories = [...new Set(stockItems.map(item => item.itemCategory))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading stock items...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ClipboardList className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Stock Counts</h1>
        </div>
        <Button onClick={() => {
          resetForm();
          setIsFormOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          New Count
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search items..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="itemCategory">Category</Label>
              <Select
                value={itemCategory}
                onValueChange={(value) => setItemCategory(value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Item Nature</Label>
              <Select
                value={isSerialized === undefined ? 'all' : isSerialized ? 'serialized' : 'non-serialized'}
                onValueChange={(value) => {
                  if (value === 'all') setIsSerialized(undefined);
                  else setIsSerialized(value === 'serialized');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="serialized">Serialized</SelectItem>
                  <SelectItem value="non-serialized">Non-serialized</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setSearchTerm('');
                  setItemCategory('');
                  setIsSerialized(undefined);
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Items Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Stock Items</CardTitle>
            <div className="text-sm text-muted-foreground">
              {stockItems.length} {stockItems.length === 1 ? 'item' : 'items'} found
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Device Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Bin Location</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockItems.length > 0 ? (
                  stockItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.deviceType}</TableCell>
                      <TableCell>{item.itemDescription}</TableCell>
                      <TableCell>{item.itemCategory}</TableCell>
                      <TableCell>{item.binLocation || '-'}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.itemStatus === 'In Stock' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.itemStatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No stock items found. Try adjusting your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add/Edit Stock Count Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-3xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editingId ? 'Edit Stock Count' : 'New Stock Count'}
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetForm}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="countType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Count Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select count type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Monthly">Monthly</SelectItem>
                              <SelectItem value="Mid-Month">Mid-Month</SelectItem>
                              <SelectItem value="Daily">Daily</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="stockHolder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Holder</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nameOrLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name or Location</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="itemCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Category</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deviceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Device Type</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="itemNature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Nature</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select item nature" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Serialised">Serialised</SelectItem>
                              <SelectItem value="Non-serialised">Non-serialised</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="itemStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Status</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch('itemNature') === 'Serialised' && (
                      <>
                        <div className="col-span-2">
                          <Separator className="my-2" />
                          <p className="text-sm font-semibold text-center mb-4">
                            {isCashConnect(form.watch('itemCategory'))
                              ? 'Scan QR Code / Capture Item details separated by a comma (,)'
                              : 'Scan Device Serial Numbers'}
                          </p>
                        </div>

                        {/* Duplicate Error Display */}
                        {duplicateError && (
                          <div className="col-span-2 flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm">{duplicateError}</span>
                          </div>
                        )}

                        {/* Cash Connect: QR Code Scanning */}
                        {isCashConnect(form.watch('itemCategory')) ? (
                          <>
                            <div className="col-span-2 space-y-2">
                              <Label htmlFor="qrScan">QR Code Scan Input</Label>
                              <Input
                                id="qrScan"
                                value={qrScanInput}
                                onChange={(e) => handleQrScanChange(e.target.value)}
                                placeholder="Scan QR code or enter: ItemCode,SerialNumber"
                                className="font-mono"
                              />
                              <p className="text-xs text-muted-foreground">
                                Format: ItemCode,CashConnectSerial (e.g., ABC123,SN456789)
                              </p>
                            </div>

                            <FormField
                              control={form.control}
                              name="qrCodeSerialNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>CashConnect Serial Number</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input {...field} placeholder="Auto-populated from scan" />
                                      {field.value && (
                                        <button
                                          type="button"
                                          onClick={() => form.setValue('qrCodeSerialNumber', '')}
                                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        ) : (
                          <>
                            {/* All other business lines: Individual serial number fields */}
                            <FormField
                              control={form.control}
                              name="manufactureSerialNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center justify-between">
                                    <FormLabel>Manufacture S/N (Terminal)</FormLabel>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        openScanner('manufactureSerialNumber');
                                      }}
                                    >
                                      <Camera className="h-3 w-3 mr-1" />
                                      Scan
                                    </Button>
                                  </div>
                                  <FormControl>
                                    <div className="relative">
                                      <Input {...field} placeholder="Scan or enter serial number" />
                                      {field.value && (
                                        <button
                                          type="button"
                                          onClick={() => form.setValue('manufactureSerialNumber', '')}
                                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="cradleSerialNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center justify-between">
                                    <FormLabel>Cradle S/N</FormLabel>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        openScanner('cradleSerialNumber');
                                      }}
                                    >
                                      <Camera className="h-3 w-3 mr-1" />
                                      Scan
                                    </Button>
                                  </div>
                                  <FormControl>
                                    <div className="relative">
                                      <Input {...field} placeholder="Scan or enter cradle serial" />
                                      {field.value && (
                                        <button
                                          type="button"
                                          onClick={() => form.setValue('cradleSerialNumber', '')}
                                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="chargerSerialNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center justify-between">
                                    <FormLabel>Charger S/N</FormLabel>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        openScanner('chargerSerialNumber');
                                      }}
                                    >
                                      <Camera className="h-3 w-3 mr-1" />
                                      Scan
                                    </Button>
                                  </div>
                                  <FormControl>
                                    <div className="relative">
                                      <Input {...field} placeholder="Scan or enter charger serial" />
                                      {field.value && (
                                        <button
                                          type="button"
                                          onClick={() => form.setValue('chargerSerialNumber', '')}
                                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={resetForm}
                      disabled={mutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {editingId ? 'Updating...' : 'Creating...'}
                        </>
                      ) : editingId ? (
                        'Update Count'
                      ) : (
                        'Create Count'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => {
            setShowScanner(false);
            setCurrentScanField(null);
          }}
          ref={scannerRef}
        />
      )}
    </div>
  );
};

export default StockCounts;
