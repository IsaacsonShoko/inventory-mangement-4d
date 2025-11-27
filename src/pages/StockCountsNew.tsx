import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Search,
  Plus,
  ShoppingCart,
  ClipboardList,
  Loader2,
  ArrowRight,
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
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import ThemeToggle from '@/components/theme-toggle';

import type { Tables, Enums } from '@/integrations/supabase/types';

type InventoryItem = Tables<'inventory_items'>;
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
  inventoryItemId: string;
  deviceType: string;
  itemDescription: string;
  itemCategory: BusinessLineEnum;
  itemNature: ItemNatureEnum;
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
  contractorRegion: z.string().optional(),
  technicianName: z.string().optional(),
  techId: z.string().optional(),
  binLocation: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function StockCountsNew() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BusinessLineEnum | 'all'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

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

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    let items = inventoryItems;

    // Filter by category
    if (selectedCategory !== 'all') {
      items = items.filter((item) => item.item_category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(
        (item) =>
          item.item_name.toLowerCase().includes(term) ||
          item.item_description?.toLowerCase().includes(term)
      );
    }

    return items;
  }, [inventoryItems, searchTerm, selectedCategory]);

  // Add item to cart
  const addToCart = (item: InventoryItem, quantity: number) => {
    // Check if item already in cart
    const existingItem = cart.find((cartItem) => cartItem.inventoryItemId === item.id.toString());

    if (existingItem) {
      // Update quantity
      setCart((prev) =>
        prev.map((cartItem) =>
          cartItem.inventoryItemId === item.id.toString()
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        )
      );
    } else {
      // Add new item
      const cartItem: CartItem = {
        id: `${item.id}-${Date.now()}`,
        inventoryItemId: item.id.toString(),
        deviceType: item.item_name,
        itemDescription: item.item_description || '',
        itemCategory: item.item_category as BusinessLineEnum,
        itemNature: item.item_nature as ItemNatureEnum,
        quantity,
        itemCode: item.item_name,
        itemUrl: item.item_url || undefined,
      };

      setCart((prev) => [...prev, cartItem]);
    }

    toast({
      title: 'Added to cart',
      description: `${quantity}x ${item.item_name}`,
    });
  };

  // Remove item from cart
  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Update cart item quantity
  const updateCartQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  // Proceed to scanning cart
  const proceedToScanningCart = () => {
    if (cart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add items to cart before proceeding',
        variant: 'destructive',
      });
      return;
    }

    // Validate form
    const formData = form.getValues();
    if (!formData.countType || !formData.stockHolder) {
      toast({
        title: 'Missing details',
        description: 'Please fill in Count Type and Stock Holder',
        variant: 'destructive',
      });
      return;
    }

    // Navigate to scanning cart with state
    navigate('/stock-counts-cart', {
      state: {
        cart,
        formData,
        userEmail: user?.email,
      },
    });
  };

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loadingItems) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading inventory...</span>
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
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCart(!showCart)}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Cart ({cart.length} items, {totalQuantity} units)
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Stock Details Form */}
      <Card>
        <CardHeader className="bg-primary text-primary-foreground">
          <CardTitle className="text-sm">Stock Count Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Form {...form}>
            <form className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Count Type - Radio Buttons */}
              <FormField
                control={form.control}
                name="countType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Count Cycle *</FormLabel>
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
                          <SelectValue placeholder="Select" />
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

              {/* Location */}
              <FormField
                control={form.control}
                name="nameOrLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Main Warehouse" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contractor */}
              <FormField
                control={form.control}
                name="contractorCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contractor</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="4D Analytics" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Category Filter & Search */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select
          value={selectedCategory}
          onValueChange={(value) => setSelectedCategory(value as BusinessLineEnum | 'all')}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product Catalog */}
      <Card>
        <CardHeader>
          <CardTitle>Product Catalog ({filteredItems.length} items)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No items found</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="p-4 hover:shadow-lg transition-shadow">
                    {item.item_url && (
                      <img
                        src={item.item_url}
                        alt={item.item_name}
                        className="w-full h-32 object-cover rounded mb-3"
                      />
                    )}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">{item.item_name}</h3>
                      {item.item_description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.item_description}
                        </p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {item.item_category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {item.item_nature}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Input
                          type="number"
                          min="1"
                          defaultValue="1"
                          className="w-16 h-8 text-sm"
                          id={`qty-${item.id}`}
                        />
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            const qty = parseInt(
                              (
                                document.getElementById(`qty-${item.id}`) as HTMLInputElement
                              )?.value || '1'
                            );
                            addToCart(item, qty);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Cart Summary (Floating) */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="w-96 shadow-2xl">
            <CardHeader className="bg-primary text-primary-foreground pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  Cart ({cart.length} items)
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground hover:text-primary-foreground/80"
                  onClick={() => setShowCart(!showCart)}
                >
                  {showCart ? 'Hide' : 'Show'}
                </Button>
              </div>
            </CardHeader>
            {showCart && (
              <CardContent className="pt-4">
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.deviceType}</p>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {item.itemNature}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateCartQuantity(item.id, parseInt(e.target.value))
                            }
                            className="w-16 h-8 text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-3">
                    Total: {totalQuantity} units
                  </p>
                  <Button onClick={proceedToScanningCart} className="w-full">
                    Proceed to Scan
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
