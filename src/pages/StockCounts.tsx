import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Search,
  Plus,
  ShoppingCart,
  ClipboardList,
  Loader2,
  Check,
  Camera,
  X,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
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
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { useAuth } from '@/hooks/useAuth';

import type { Tables, Enums } from '@/integrations/supabase/types';

type InventoryItem = Tables<'inventory_items'>;
type PointOfPresenceRecord = Tables<'point_of_presence'>;
type BusinessLineEnum = Enums<'business_line_enum'>;
type ItemNatureEnum = Enums<'item_nature_enum'>;

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

// Cart item type
interface CartItem {
  id: string;
  deviceType: string;
  itemDescription: string;
  itemCategory: string;
  itemNature: string;
  quantity: number;
  itemCode: string;
  itemUrl?: string;
}

// Form validation schema
const formSchema = z.object({
  countType: z.enum(['Monthly', 'Mid-Month', 'Daily']),
  stockHolder: z.string().min(1, 'Stock holder is required'),
  nameOrLocation: z.string().optional(),
  contractorCompany: z.string().optional(),
  technician: z.string().optional(),
  itemCategory: z.string().min(1, 'Item category is required'),
  itemNature: z.enum(['Serialised', 'Non-serialised']),
  binLocation: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const StockCounts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scannerRef = useRef<{ closeScanner: () => void }>(null);

  // Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      countType: 'Monthly',
      stockHolder: '',
      nameOrLocation: '',
      contractorCompany: '',
      technician: '',
      itemCategory: '',
      itemNature: 'Serialised',
      binLocation: '',
    },
  });

  const watchStockHolder = form.watch('stockHolder');
  const watchContractorCompany = form.watch('contractorCompany');
  const watchItemCategory = form.watch('itemCategory');
  const watchItemNature = form.watch('itemNature');

  // Fetch inventory items
  const { data: inventoryItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('item_name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch contractors from Point of Presence
  const { data: contractors = [] } = useQuery({
    queryKey: ['contractors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('point_of_presence')
        .select('contractor')
        .not('contractor', 'is', null);

      if (error) throw error;
      const unique = [...new Set(data?.map((r) => r.contractor).filter(Boolean))] as string[];
      return unique.sort();
    },
  });

  // Fetch technicians based on selected contractor
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians', watchContractorCompany],
    queryFn: async () => {
      if (!watchContractorCompany) return [];

      const { data, error } = await supabase
        .from('point_of_presence')
        .select('*')
        .eq('contractor', watchContractorCompany)
        .order('name_surname', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!watchContractorCompany,
  });

  // Fetch warehouse locations
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      // For now, return static warehouses - can be fetched from a table if available
      return ['JHB Warehouse', 'CPT Warehouse', 'DBN Warehouse'];
    },
  });

  // Filter inventory items based on category and nature
  const filteredItems = inventoryItems.filter((item) => {
    const matchesCategory = !watchItemCategory || item.item_category === watchItemCategory;
    const matchesNature = !watchItemNature || item.item_nature === watchItemNature;
    const matchesSearch = !searchTerm ||
      item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesNature && matchesSearch;
  });

  // Add item to cart
  const addToCart = (item: InventoryItem, quantity: number) => {
    const cartItem: CartItem = {
      id: `${item.id}-${Date.now()}`,
      deviceType: item.item_name,
      itemDescription: item.item_description || '',
      itemCategory: item.item_category || '',
      itemNature: item.item_nature || '',
      quantity,
      itemCode: item.item_name,
      itemUrl: item.item_url || undefined,
    };

    setCart((prev) => [...prev, cartItem]);
    setShowSuccessModal(true);
  };

  // Remove item from cart
  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Submit stock count
  const submitStockCount = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add items to cart before submitting',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = form.getValues();

      // Create stock count records for each cart item
      for (const item of cart) {
        const stockCountData = {
          count_type: formData.countType,
          stock_holder: formData.stockHolder,
          name_or_location: formData.stockHolder === 'Technician'
            ? formData.contractorCompany
            : formData.nameOrLocation,
          contractor_company: formData.contractorCompany || null,
          technician: formData.technician || null,
          item_category: item.itemCategory,
          item_nature: item.itemNature,
          device_type: item.deviceType,
          quantity: item.quantity,
          bin_location: formData.binLocation || null,
          user_email: user?.email || null,
          count_date: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('stock_counts')
          .insert(stockCountData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Stock count submitted successfully with ${cart.length} items`,
      });

      // Clear cart and form
      setCart([]);
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

  // Handle barcode scan
  const handleBarcodeScanned = (result: string) => {
    setSearchTerm(result);
    setShowScanner(false);
  };

  if (loadingItems) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ClipboardList className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Stock Count</h1>
        </div>
        {cart.length > 0 && (
          <Badge variant="secondary" className="text-sm">
            <ShoppingCart className="h-4 w-4 mr-1" />
            {cart.length} items in cart
          </Badge>
        )}
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
                            <Label htmlFor="monthly" className="text-sm">Monthly</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Mid-Month" id="midmonth" />
                            <Label htmlFor="midmonth" className="text-sm">Mid-Month</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Daily" id="daily" />
                            <Label htmlFor="daily" className="text-sm">Daily</Label>
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
                      <Select value={field.value} onValueChange={field.onChange}>
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

                {/* Name or Location - Visible when NOT Technician */}
                {watchStockHolder && watchStockHolder !== 'Technician' && (
                  <FormField
                    control={form.control}
                    name="nameOrLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name or Location</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {warehouses.map((wh) => (
                              <SelectItem key={wh} value={wh}>
                                {wh}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Contractor Company - Visible when Technician */}
                {watchStockHolder === 'Technician' && (
                  <>
                    <FormField
                      control={form.control}
                      name="contractorCompany"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contractor Company *</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select contractor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {contractors.map((contractor) => (
                                <SelectItem key={contractor} value={contractor}>
                                  {contractor}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Technician */}
                    <FormField
                      control={form.control}
                      name="technician"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Technician *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={!watchContractorCompany}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select technician" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {technicians.map((tech) => (
                                <SelectItem key={tech.id} value={tech.email_address || tech.name_surname}>
                                  {tech.name_surname}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <Separator />

                {/* Item Category */}
                <FormField
                  control={form.control}
                  name="itemCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Category *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Item Nature */}
                <FormField
                  control={form.control}
                  name="itemNature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Is this product serialised? *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
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

                {/* Bin Location */}
                <FormField
                  control={form.control}
                  name="binLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bin Location</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Right Panel - Device Gallery */}
        <Card className="lg:col-span-2">
          <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Add Items to Order</CardTitle>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowScanner(true)}
              >
                <Camera className="h-4 w-4 mr-1" />
                Scan
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {!watchStockHolder || !watchItemCategory ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Please enter Order Details to activate device gallery</p>
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search Devices using Item Code or Item Description"
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Device Gallery */}
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredItems.length === 0 ? (
                      <div className="col-span-2 text-center py-8 text-muted-foreground">
                        No items found matching your criteria
                      </div>
                    ) : (
                      filteredItems.map((item) => (
                        <DeviceCard
                          key={item.id}
                          item={item}
                          onAddToCart={addToCart}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Cart ({cart.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div>
                    <span className="font-medium">{item.deviceType}</span>
                    <span className="text-muted-foreground ml-2">x {item.quantity}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={submitStockCount} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Stock Count'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-primary">
              <Check className="h-8 w-8 mx-auto mb-2" />
              Action successful!
            </DialogTitle>
            <DialogDescription className="text-center">
              Item added to cart successfully
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setShowSuccessModal(false)}>
              Add more items
            </Button>
            <Button onClick={() => {
              setShowSuccessModal(false);
              // Scroll to cart
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }}>
              View Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
          ref={scannerRef}
        />
      )}
    </div>
  );
};

// Device Card Component
interface DeviceCardProps {
  item: InventoryItem;
  onAddToCart: (item: InventoryItem, quantity: number) => void;
}

const DeviceCard = ({ item, onAddToCart }: DeviceCardProps) => {
  const [quantity, setQuantity] = useState(0);

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start gap-3">
        {item.item_url ? (
          <img
            src={item.item_url}
            alt={item.item_name}
            className="h-16 w-16 object-cover rounded"
          />
        ) : (
          <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            Item code: {item.item_name}
          </p>
          <p className="text-xs text-muted-foreground">
            Item category: {item.item_category}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label className="text-xs">Quantity</Label>
          <Input
            type="number"
            min="0"
            max="999"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            className="h-8"
          />
        </div>
        <Button
          size="sm"
          className="mt-4"
          disabled={quantity <= 0}
          onClick={() => {
            onAddToCart(item, quantity);
            setQuantity(0);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default StockCounts;
