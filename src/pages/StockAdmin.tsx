import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Upload, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';
import {
  stockAdminService,
  type InventoryItemRecord,
  type CreateInventoryItemData,
  type UpdateInventoryItemData,
} from '@/services/stockAdminService';

// Form schema for validation
const formSchema = z.object({
  'Device Type': z.string().min(1, 'Device Type is required'),
  'Item_Description': z.string().min(1, 'Item Description is required'),
  'Item_Category': z.string().min(1, 'Item Category is required'),
  'Item_Nature': z.string().min(1, 'Serialized field is required'),
});

type FormValues = z.infer<typeof formSchema>;

type TabMode = 'edit' | 'add';

const CATEGORIES = [
  { key: 'Absa', label: 'ABSA' },
  { key: 'Cash Connect', label: 'Cash Connect' },
  { key: 'VPS', label: 'VPS' },
  { key: 'Modems', label: 'Modems' },
  { key: 'Accessories', label: 'Accessories' },
  { key: 'Sim Management', label: 'SIM Management' },
  { key: 'Other', label: 'Other' },
];

const StockAdmin = () => {
  const [mode, setMode] = useState<TabMode>('edit');
  const [selectedCategory, setSelectedCategory] = useState<string>('Absa');
  const [selectedItem, setSelectedItem] = useState<InventoryItemRecord | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      'Device Type': '',
      'Item_Description': '',
      'Item_Category': 'Absa',
      'Item_Nature': 'Y',
    },
  });

  // Fetch all inventory items
  const { data: allItems = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: () => stockAdminService.getAll(),
  });

  // Fetch items by category
  const { data: categoryItems = [], isLoading: isLoadingCategory } = useQuery({
    queryKey: ['inventoryItems', selectedCategory],
    queryFn: () => stockAdminService.getByCategory(selectedCategory),
    enabled: !!selectedCategory,
  });

  const displayItems = categoryItems;
  const isLoading = isLoadingAll || isLoadingCategory;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateInventoryItemData) => {
      return stockAdminService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      toast.success('Item created successfully');
      handleReset();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create item: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInventoryItemData }) => {
      return stockAdminService.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      toast.success('Item updated successfully');
      handleReset();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update item: ${error.message}`);
    },
  });

  // Handle mode change
  const handleModeChange = (value: string) => {
    const newMode = value === 'edit' ? 'edit' : 'add';
    setMode(newMode);
    handleReset();
  };

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedItem(null);
  };

  // Handle item selection from gallery
  const handleItemSelect = (item: InventoryItemRecord) => {
    if (mode === 'edit') {
      setSelectedItem(item);
      form.reset({
        'Device Type': item.fields['Device Type'] || '',
        'Item_Description': item.fields['Item_Description'] || '',
        'Item_Category': item.fields['Item_Category'] || '',
        'Item_Nature': item.fields['Item_Nature'] || 'Y',
      });
      // Clear image selection in edit mode
      setImageFile(null);
      setImagePreview(null);
    }
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5242880) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      // Simulate file input change
      const input = fileInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        handleFileChange({ target: input } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  // Clear file selection
  const handleClearFile = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reset form and state
  const handleReset = () => {
    form.reset({
      'Device Type': '',
      'Item_Description': '',
      'Item_Category': selectedCategory,
      'Item_Nature': 'Y',
    });
    setSelectedItem(null);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Form submit handler
  const onSubmit = async (data: FormValues) => {
    if (mode === 'add') {
      // Validate image in add mode
      if (!imageFile) {
        toast.error('Please select a device image');
        return;
      }

      const createData: CreateInventoryItemData = {
        'Device Type': data['Device Type'],
        'Item_Description': data['Item_Description'],
        'Item_Category': data['Item_Category'],
        'Item_Nature': data['Item_Nature'],
        imageFile,
      };

      createMutation.mutate(createData);
    } else if (mode === 'edit' && selectedItem) {
      const updateData: UpdateInventoryItemData = {
        'Device Type': data['Device Type'],
        'Item_Description': data['Item_Description'],
        'Item_Category': data['Item_Category'],
        'Item_Nature': data['Item_Nature'],
      };

      updateMutation.mutate({ id: selectedItem.id, data: updateData });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 to-purple-50">
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: 'rgba(40, 10, 64, 1)' }}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-600 p-2 text-white">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Stock Admin Module</h1>
              <p className="text-sm text-purple-200">Manage inventory items and images</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden p-6">
        <div className="flex w-full gap-6 rounded-lg bg-white p-6 shadow-lg">
          {/* Left Section: Tabs and Gallery */}
          <div className="flex w-7/12 flex-col gap-4">
            {/* Primary Tabs (Edit/Add) */}
            <Tabs value={mode} onValueChange={handleModeChange} className="w-48">
              <TabsList className="grid w-full grid-cols-1 gap-2">
                <TabsTrigger value="edit" className="text-lg">
                  Edit Existing
                </TabsTrigger>
                <TabsTrigger value="add" className="text-lg">
                  Add New
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Category Tabs */}
            <Tabs value={selectedCategory} onValueChange={handleCategoryChange}>
              <TabsList className="grid w-full grid-cols-7 gap-1">
                {CATEGORIES.map((cat) => (
                  <TabsTrigger key={cat.key} value={cat.key} className="text-sm">
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Gallery */}
            <div className="flex-1 overflow-y-auto rounded-lg border p-4">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : displayItems.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-gray-500">
                  <Package className="mb-2 h-12 w-12 opacity-20" />
                  <p>No items found in this category</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayItems.map((item) => {
                    const thumbnailUrl = item.fields.Thumbnail?.[0]?.url;
                    const isSelected = selectedItem?.id === item.id;

                    return (
                      <Card
                        key={item.id}
                        className={`flex cursor-pointer items-center gap-3 p-3 transition-all hover:shadow-md ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500'
                            : 'hover:border-gray-300'
                        }`}
                        onClick={() => handleItemSelect(item)}
                      >
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={item.fields['Device Type']}
                            className="h-12 w-12 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100">
                            <ImageIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {item.fields['Device Type']}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.fields['Item_Category']}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Section: Form */}
          <div className="flex w-5/12 flex-col">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {mode === 'edit' ? 'Edit Item Details' : 'Add New Item'}
              </h2>
              <p className="text-sm text-gray-600">
                {mode === 'edit'
                  ? 'Select an item from the gallery to edit'
                  : 'Fill in the details to add a new item'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Item Category */}
                  <FormField
                    control={form.control}
                    name="Item_Category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">
                          Item Category <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={mode === 'edit' && !selectedItem}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat.key} value={cat.key}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Device Type */}
                  <FormField
                    control={form.control}
                    name="Device Type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">
                          Device Type <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={mode === 'edit' && !selectedItem}
                            placeholder="Enter device type"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Item Description */}
                  <FormField
                    control={form.control}
                    name="Item_Description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">
                          Item Description <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={mode === 'edit' && !selectedItem}
                            placeholder="Enter item description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Serialized */}
                  <FormField
                    control={form.control}
                    name="Item_Nature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">
                          Serialized <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={mode === 'edit' && !selectedItem}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select serialization" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Y">Y</SelectItem>
                            <SelectItem value="N">N</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Image Upload (Add Mode Only) */}
                  {mode === 'add' && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-900">
                        Add Device Picture <span className="text-red-500">*</span>
                      </label>
                      <div
                        className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition-colors hover:border-purple-500 hover:bg-purple-50"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />

                        {imagePreview ? (
                          <div className="relative">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="h-32 w-32 rounded object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearFile();
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <p className="mt-2 text-xs text-gray-600">{imageFile?.name}</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="mb-2 h-8 w-8 text-gray-400" />
                            <p className="text-sm text-gray-600">
                              Click or drag image to upload
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || (mode === 'edit' && !selectedItem)}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {mode === 'add' ? 'Creating...' : 'Updating...'}
                      </>
                    ) : (
                      'Submit'
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAdmin;
