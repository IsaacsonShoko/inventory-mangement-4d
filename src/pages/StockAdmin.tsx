import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Search,
  Plus,
  Edit,
  Package,
  Loader2,
  Upload,
  Image as ImageIcon,
  Home,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
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

import type { Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';

type InventoryItem = Tables<'inventory_items'>;
type InventoryItemInsert = TablesInsert<'inventory_items'>;
type InventoryItemUpdate = TablesUpdate<'inventory_items'>;
type BusinessLineEnum = Enums<'business_line_enum'>;
type ItemNatureEnum = Enums<'item_nature_enum'>;

// Categories in order
const CATEGORIES: { label: string; value: BusinessLineEnum }[] = [
  { label: 'ABSA', value: 'Absa' },
  { label: 'Cash Connect', value: 'Cash Connect' },
  { label: 'VPS', value: 'VPS' },
  { label: 'Modems', value: 'Modems' },
  { label: 'Accessories', value: 'Accessories' },
  { label: 'SIM Management', value: 'Sim Management' },
  { label: 'Other', value: 'Other' },
];

// Form validation schema
const itemSchema = z.object({
  item_name: z.string().min(1, 'Device type/name is required'),
  item_category: z.enum(['Absa', 'Cash Connect', 'VPS', 'Modems', 'Accessories', 'Sim Management', 'Other'] as const, {
    required_error: 'Item category is required',
  }),
  item_description: z.string().min(1, 'Item description is required'),
  item_nature: z.enum(['Serialised', 'Non-serialised'] as const, {
    required_error: 'Serialized status is required',
  }),
  item_url: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

const StockAdmin = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState<'edit' | 'add'>('edit');
  const [selectedCategory, setSelectedCategory] = useState<BusinessLineEnum | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      item_name: '',
      item_category: undefined,
      item_description: '',
      item_nature: 'Serialised',
      item_url: '',
    },
  });

  // Fetch all inventory items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('id, item_name, item_category, item_description, item_nature')
          .order('item_name', { ascending: true });

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching items:', error);
        return [];
      }
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InventoryItemInsert) => {
      const { data: result, error } = await supabase
        .from('inventory_items')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      toast({
        title: 'Success',
        description: 'Item added successfully',
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add item',
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InventoryItemUpdate }) => {
      const { data: result, error } = await supabase
        .from('inventory_items')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      toast({
        title: 'Success',
        description: 'Item updated successfully',
      });
      setSelectedItem(result);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update item',
        variant: 'destructive',
      });
    },
  });

  // Filter items based on category and search
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.item_category === selectedCategory;
    const matchesSearch = !searchTerm ||
      item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Reset form
  const resetForm = () => {
    form.reset({
      item_name: '',
      item_category: undefined,
      item_description: '',
      item_nature: 'Serialised',
      item_url: '',
    });
    setSelectedItem(null);
    setImageFile(null);
    setImagePreview(null);
  };

  // Load item data into form when selected (edit mode)
  const handleItemSelect = (item: InventoryItem) => {
    setSelectedItem(item);
    form.reset({
      item_name: item.item_name || '',
      item_category: item.item_category as BusinessLineEnum || undefined,
      item_description: item.item_description || '',
      item_nature: item.item_nature as ItemNatureEnum || 'Serialised',
      item_url: item.item_url || '',
    });
  };

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const onSubmit = async (data: ItemFormValues) => {
    let imageUrl = data.item_url;

    // If there's a new image file, upload it (works for both add and edit)
    if (imageFile) {
      try {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${data.item_name.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
        const filePath = `inventory-images/${fileName}`;

        console.log('Uploading image to Inventory Gallery:', filePath);

        const { error: uploadError } = await supabase.storage
          .from('Inventory Gallery')
          .upload(filePath, imageFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: 'Image upload failed',
            description: uploadError.message,
            variant: 'destructive',
          });
          // Continue without image if upload fails
        } else {
          const { data: urlData } = supabase.storage
            .from('Inventory Gallery')
            .getPublicUrl(filePath);
          imageUrl = urlData.publicUrl;
          console.log('Image uploaded successfully:', imageUrl);
        }
      } catch (err) {
        console.error('Image upload error:', err);
        toast({
          title: 'Image upload error',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    }

    const formData = {
      item_name: data.item_name,
      item_category: data.item_category,
      item_description: data.item_description,
      item_nature: data.item_nature,
      item_url: imageUrl || null,
    };

    if (activeTab === 'edit' && selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Sync stock levels from device registry
  const handleSyncStock = async () => {
    try {
      toast({
        title: 'Syncing Stock Levels',
        description: 'Recalculating stock levels from device registry...',
      });

      // 1. Fetch all warehouse devices
      const { data: devices, error: fetchError } = await supabase
        .from('device_registry')
        .select('device_type, item_category, item_nature, item_code, item_description, holder_id')
        .eq('holder_type', 'Warehouse')
        .in('status', ['In Stock', 'Available']);

      if (fetchError) throw fetchError;

      // 2. Aggregate
      const stockMap = new Map<string, any>();

      devices?.forEach(device => {
        const key = `${device.device_type}-${device.holder_id || 'Main'}`;
        if (!stockMap.has(key)) {
          stockMap.set(key, {
            device_type: device.device_type,
            item_category: device.item_category,
            item_nature: device.item_nature,
            item_code: device.item_code,
            item_description: device.item_description,
            location: device.holder_id || 'Main',
            quantity: 0
          });
        }
        stockMap.get(key).quantity++;
      });

      // 3. Update stock_levels
      for (const level of stockMap.values()) {
        // Check if exists
        const { data: existing } = await supabase
          .from('stock_levels')
          .select('id')
          .eq('device_type', level.device_type)
          .eq('location', level.location)
          .eq('stock_holder', 'Warehouse')
          .maybeSingle();

        if (existing) {
          await supabase
            .from('stock_levels')
            .update({
              quantity: level.quantity,
              quantity_on_hand: level.quantity,
              quantity_available: level.quantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('stock_levels')
            .insert({
              device_type: level.device_type,
              item_category: level.item_category,
              item_nature: level.item_nature,
              item_code: level.item_code,
              item_description: level.item_description,
              quantity: level.quantity,
                    quantity_on_hand: level.quantity,
                    quantity_available: level.quantity,
                    item_status: 'Available',
                    stock_holder: 'Warehouse',
                    location: level.location,
                    updated_at: new Date().toISOString()
                  });
        }
      }

      toast({
        title: 'Success',
        description: 'Stock levels synced successfully',
      });
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync stock levels: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading inventory items...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Package className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Stock Admin Module</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSyncStock}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Stock
          </Button>
          <Link to="/">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel - Mode Selection */}
        <div className="space-y-4">
          {/* Primary Tabs - Edit/Add */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Button
                  variant={activeTab === 'edit' ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveTab('edit');
                    resetForm();
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Existing
                </Button>
                <Button
                  variant={activeTab === 'add' ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveTab('add');
                    resetForm();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Category Filter (Edit mode only) */}
          {activeTab === 'edit' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Filter by Category</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1 p-2">
                    <Button
                      variant={selectedCategory === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setSelectedCategory('all')}
                    >
                      All Categories
                    </Button>
                    {CATEGORIES.map((cat) => (
                      <Button
                        key={cat.value}
                        variant={selectedCategory === cat.value ? 'secondary' : 'ghost'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setSelectedCategory(cat.value)}
                      >
                        {cat.label}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Center Panel - Item Gallery (Edit mode) or Form (Add mode) */}
        {activeTab === 'edit' ? (
          <>
            {/* Item Gallery */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Items ({filteredItems.length})
                  </CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items..."
                      className="pl-8 h-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {filteredItems.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No items found
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredItems.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                            selectedItem?.id === item.id ? 'bg-muted' : ''
                          }`}
                          onClick={() => handleItemSelect(item)}
                        >
                          <div className="flex items-center gap-3">
                            {item.item_url ? (
                              <img
                                src={item.item_url}
                                alt={item.item_name}
                                className="h-10 w-10 object-cover rounded"
                              />
                            ) : (
                              <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {item.item_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.item_category} • {item.item_nature}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right Panel - Edit Form */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedItem ? 'Edit Item' : 'Select an Item'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedItem ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Select an item to edit</p>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      {/* Name - View Only in Edit Mode */}
                      <div>
                        <Label className="text-sm font-medium">Name</Label>
                        <p className="text-sm mt-1 p-2 bg-muted rounded">
                          {selectedItem.item_name}
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="item_category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Category *</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
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

                      <FormField
                        control={form.control}
                        name="item_description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Description *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="item_nature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Serialized *</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Serialised">Yes (Serialised)</SelectItem>
                                <SelectItem value="Non-serialised">No (Non-serialised)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end pt-4">
                        <Button
                          type="submit"
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Submit
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          /* Add New Mode - Full Width Form */
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Add New Item</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="item_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Type / Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Device type or name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="item_category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Category *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
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

                  <FormField
                    control={form.control}
                    name="item_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Description *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="item_nature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serialized *</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Serialised">Yes (Serialised)</SelectItem>
                            <SelectItem value="Non-serialised">No (Non-serialised)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Add Device Picture</Label>
                    <div className="border-2 border-dashed rounded-lg p-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className="flex flex-col items-center cursor-pointer"
                      >
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-32 w-32 object-cover rounded mb-2"
                          />
                        ) : (
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {imageFile ? imageFile.name : 'Click to upload or drag and drop'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Submit
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StockAdmin;
