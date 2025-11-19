import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Plus, Package, Trash2, CheckCircle2, Loader2, ArrowLeft, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  useInventoryItems,
  useItemCategories,
  useContractors,
  useRegions,
  useTechnicians,
} from "@/hooks/useAirtable";
import { Skeleton } from "@/components/ui/skeleton";
import ThemeToggle from "@/components/theme-toggle";
import { stockCountService, type StockCountSubmission } from "@/services/stockCountService";

type CountType = 'Monthly' | 'Mid-Month' | 'Daily';
type StockHolderType = 'Technician' | 'Warehouse' | 'OEM' | '';

interface CartItem {
  id: string;
  deviceType: string;
  itemDescription: string;
  itemCategory: string;
  itemNature: string;
  quantity: number;
  itemUrl?: string;
  thumbnail?: string;
}

// Stock holder options (simulating Profiles table from PowerApp)
const STOCK_HOLDERS = ['Warehouse', 'OEM', 'Technician'];

// Name/Location options per stock holder (simulating Profiles table)
const LOCATION_OPTIONS: Record<string, string[]> = {
  'Warehouse': ['Johannesburg Main', 'Cape Town', 'Durban', 'Pretoria'],
  'OEM': ['Manufacturer A', 'Manufacturer B', 'Manufacturer C'],
  'Technician': [] // Will be populated from contractor/technician selection
};

const createFormSchema = (stockHolder: StockHolderType, itemNature: string) => {
  const baseSchema = {
    countType: z.enum(['Monthly', 'Mid-Month', 'Daily']),
    stockHolder: z.string().min(1, "Stock holder is required"),
    itemCategory: z.string().min(1, "Item category is required").refine(val => val !== "select", "Please select a category"),
    itemNature: z.string().min(1, "Item nature is required").refine(val => val !== "select", "Please select item nature"),
    binLocation: z.string().optional(),
  };

  if (stockHolder === 'Technician') {
    return z.object({
      ...baseSchema,
      contractorCompany: z.string().min(1, "Contractor company is required").refine(val => val !== "select", "Please select a contractor"),
      contractorRegion: z.string().min(1, "Region is required").refine(val => val !== "select", "Please select a region"),
      technicianName: z.string().min(1, "Technician is required").refine(val => val !== "select", "Please select a technician"),
      techId: z.string().min(1, "Tech ID is required"),
    });
  } else {
    return z.object({
      ...baseSchema,
      nameOrLocation: z.string().min(1, "Name or location is required"),
    });
  }
};

const StockCounts = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(createFormSchema('', '')),
    defaultValues: {
      countType: "Monthly",
      stockHolder: "",
      nameOrLocation: "",
      itemCategory: "select",
      itemNature: "select",
      binLocation: "",
      contractorCompany: "select",
      contractorRegion: "select",
      technicianName: "select",
      techId: "",
    },
  });

  const stockHolder = form.watch("stockHolder") as StockHolderType;
  const selectedCategory = form.watch("itemCategory");
  const selectedNature = form.watch("itemNature");
  const selectedContractor = form.watch("contractorCompany");
  const selectedRegion = form.watch("contractorRegion");
  const selectedTechnician = form.watch("technicianName");
  const countType = form.watch("countType");

  // Update form schema when stockHolder or itemNature changes
  useEffect(() => {
    const newSchema = createFormSchema(stockHolder, selectedNature);
    form.clearErrors();
  }, [stockHolder, selectedNature]);

  // Normalize values for API calls
  const normalizedCategory = selectedCategory && selectedCategory !== "select" ? selectedCategory : undefined;
  const normalizedNature = selectedNature && selectedNature !== "select" ? selectedNature : undefined;
  const normalizedContractor = selectedContractor && selectedContractor !== "select" ? selectedContractor : undefined;
  const normalizedRegion = selectedRegion && selectedRegion !== "select" ? selectedRegion : undefined;

  // Handle special case for Xlink -> MODEM category
  const categoryForFilter = normalizedCategory === "Xlink" ? "MODEM" : normalizedCategory;

  const inventoryFilters = categoryForFilter
    ? {
        category: categoryForFilter,
        ...(normalizedNature ? { serialized: normalizedNature } : {}),
      }
    : undefined;

  const shouldRefetchInventory = Boolean(inventoryFilters);

  // Data fetching
  const { data: categories, isLoading: categoriesLoading } = useItemCategories();
  const { data: contractors, isLoading: contractorsLoading } = useContractors();
  const { data: regions, isLoading: regionsLoading } = useRegions(normalizedContractor, undefined);
  const { data: technicians, isLoading: techniciansLoading } = useTechnicians(normalizedContractor, normalizedRegion);
  const {
    data: inventory,
    isLoading: inventoryLoading,
    isFetching: inventoryFetching,
  } = useInventoryItems(inventoryFilters);

  const isInventoryLoading = inventoryLoading || inventoryFetching;

  // Handle count type selection
  useEffect(() => {
    if (countType) {
      setFormVisible(true);
    }
  }, [countType]);

  // Auto-populate Tech ID when technician is selected
  useEffect(() => {
    if (selectedTechnician && selectedTechnician !== "select" && technicians) {
      const tech = technicians.find(t => t.fields['Name & Surname'] === selectedTechnician);
      if (tech) {
        form.setValue("techId", tech.id || "");
      }
    }
  }, [selectedTechnician, technicians, form]);

  // Filter inventory by search
  const filteredInventory = inventory?.filter((item) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      item.fields['Device Type']?.toLowerCase().includes(search) ||
      item.fields['Item_Description']?.toLowerCase().includes(search)
    );
  }) || [];

  const addToCart = (item: any) => {
    const quantity = quantities[item.id] || 0;
    if (quantity <= 0) return;

    // For Cash Connect, use Item Description as Device Type
    const deviceType = selectedCategory === "Cash Connect"
      ? item.fields['Item_Description']
      : item.fields['Device Type'];

    const cartItem: CartItem = {
      id: item.id,
      deviceType: deviceType,
      itemDescription: item.fields['Item_Description'],
      itemCategory: item.fields['Item_Category'],
      itemNature: item.fields['Item_Nature'],
      quantity: quantity,
      itemUrl: item.fields['Item_Url'] || item.fields['Item Url'] || item.fields['Item_Url'],
      thumbnail: item.fields.Thumbnail?.[0]?.url,
    };

    setCart([...cart, cartItem]);
    setQuantities({ ...quantities, [item.id]: 0 });
    setShowSuccessModal(true);

    toast({
      title: "Item added",
      description: `${deviceType} has been added to your cart.`,
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
    toast({
      title: "Item removed",
      description: "Item has been removed from your cart.",
    });
  };

  const proceedToCart = async () => {
    // Validate form
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: "Form incomplete",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your cart before proceeding.",
        variant: "destructive",
      });
      return;
    }

    // Navigate to cart with all data
    const formValues = form.getValues();
    navigate('/stock-counts-cart', {
      state: {
        cart,
        formData: formValues,
      }
    });
  };

  const isSearchEnabled = Boolean(
    normalizedCategory &&
    normalizedNature &&
    formVisible
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-4 shadow-sm">
        <div className="container mx-auto px-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Xlink Stock Count</h1>
          </div>
          <ThemeToggle variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/20" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* Left Panel: Form */}
          <Card className="h-fit bg-card border border-border/50 shadow-sm sticky top-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Enter Stock Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto">
              <Form {...form}>
                <form className="space-y-4">
                  {/* Count Type */}
                  <FormField
                    control={form.control}
                    name="countType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">
                          Select the Cycle you want to perform <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Monthly" id="monthly" />
                              <Label htmlFor="monthly" className="text-sm cursor-pointer">Monthly</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Mid-Month" id="mid-month" />
                              <Label htmlFor="mid-month" className="text-sm cursor-pointer">Mid-Month</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="Daily" id="daily" />
                              <Label htmlFor="daily" className="text-sm cursor-pointer">Daily</Label>
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
                        <FormLabel>Stock Holder</FormLabel>
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

                  {/* Name or Location (Hidden if Technician) */}
                  {stockHolder && stockHolder !== 'Technician' && (
                    <FormField
                      control={form.control}
                      name="nameOrLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>OEM Name or Warehouse Location</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {LOCATION_OPTIONS[stockHolder]?.map((location) => (
                                <SelectItem key={location} value={location}>
                                  {location}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Technician-specific fields */}
                  {stockHolder === 'Technician' && (
                    <>
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <h3 className="font-semibold text-primary text-center">Technician Details</h3>
                      </div>

                      <FormField
                        control={form.control}
                        name="contractorCompany"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contractor Company</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={contractorsLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select contractor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="select">Select...</SelectItem>
                                {contractorsLoading && (
                                  <SelectItem value="loading" disabled>
                                    Loading...
                                  </SelectItem>
                                )}
                                {!contractorsLoading && contractors?.length ? (
                                  contractors.map((contractor) => (
                                    <SelectItem key={contractor} value={contractor}>
                                      {contractor}
                                    </SelectItem>
                                  ))
                                ) : null}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contractorRegion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Region</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={!normalizedContractor || regionsLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select region" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="select">Select...</SelectItem>
                                {regionsLoading && (
                                  <SelectItem value="loading" disabled>
                                    Loading...
                                  </SelectItem>
                                )}
                                {!regionsLoading && normalizedContractor && regions?.length ? (
                                  regions.map((region) => (
                                    <SelectItem key={region} value={region}>
                                      {region}
                                    </SelectItem>
                                  ))
                                ) : null}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="technicianName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Technician</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={!normalizedRegion || techniciansLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select technician" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="select">Select...</SelectItem>
                                {techniciansLoading && (
                                  <SelectItem value="loading" disabled>
                                    Loading...
                                  </SelectItem>
                                )}
                                {!techniciansLoading && normalizedRegion && technicians?.length ? (
                                  technicians.map((tech) => (
                                    <SelectItem key={tech.id} value={tech.fields['Name & Surname']}>
                                      {tech.fields['Name & Surname']}
                                    </SelectItem>
                                  ))
                                ) : null}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {/* Item Category */}
                  <FormField
                    control={form.control}
                    name="itemCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="select">Select...</SelectItem>
                            {categoriesLoading ? (
                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : (
                              categories?.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))
                            )}
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
                        <FormLabel>Is this product serialised?</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select nature" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="select">Select...</SelectItem>
                            <SelectItem value="Serialised">Serialised</SelectItem>
                            <SelectItem value="Non-serialised">Non - serialised</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Bin Location (Optional) */}
                  <FormField
                    control={form.control}
                    name="binLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bin Location (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter bin location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Right Panel: Gallery */}
          <div className="space-y-4">
            <Card className="bg-card border border-border/50 shadow-sm">
              <CardContent className="p-4">
                <h2 className="text-xl font-semibold text-center mb-4 text-primary">
                  Add Items to Order
                </h2>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search Devices using Item Code or Item Description"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      disabled={!isSearchEnabled}
                    />
                  </div>
                  <Button
                    onClick={proceedToCart}
                    disabled={cart.length === 0}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Review Cart ({cart.length})
                  </Button>
                </div>
                {!isSearchEnabled && (
                  <p className="mt-2 text-sm text-muted-foreground text-center">
                    Please enter Order Details to activate device gallery
                  </p>
                )}

                {cart.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Cart Items ({cart.length})
                    </h3>
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm bg-background p-2 rounded border border-border/60">
                          <div className="flex-1">
                            <p className="font-medium">{item.deviceType}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Device Gallery */}
            {isInventoryLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="bg-card border border-border/50">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <Skeleton className="h-24 w-24 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredInventory.map((item) => {
                  const thumbnailUrl = item.fields.Thumbnail?.[0]?.url;
                  const imageUrl = thumbnailUrl ?? item.fields['Item_Url'];

                  return (
                    <Card
                      key={item.id}
                      className="bg-card border border-primary/40 hover:border-primary/60 transition-colors shadow-sm"
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={item.fields['Device Type']}
                                className="h-full w-full object-cover rounded-lg"
                              />
                            ) : (
                              <Package className="h-12 w-12 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold">
                                Item code: {item.fields['Device Type']}
                              </p>
                              <p className="text-sm font-semibold">
                                Item category: {item.fields['Item_Category']}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-semibold">Quantity:</label>
                              <Input
                                type="number"
                                min="0"
                                max="999"
                                value={quantities[item.id] || 0}
                                onChange={(e) => setQuantities({
                                  ...quantities,
                                  [item.id]: parseInt(e.target.value) || 0
                                })}
                                className="w-20 h-8 text-sm"
                                disabled={!isSearchEnabled}
                              />
                              <Button
                                size="sm"
                                onClick={() => addToCart(item)}
                                disabled={!isSearchEnabled || (quantities[item.id] || 0) <= 0}
                                className="bg-green-600 hover:bg-green-700 h-8"
                                title="Add item to Cart"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {filteredInventory.length === 0 && isSearchEnabled && (
                  <div className="col-span-full text-center text-muted-foreground py-8">
                    No inventory items match your selection.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary text-xl">
              <CheckCircle2 className="h-6 w-6" />
              Action successful!
            </DialogTitle>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowSuccessModal(false)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Add more items
            </Button>
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                proceedToCart();
              }}
              className="bg-primary hover:bg-primary/90"
            >
              Review Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockCounts;
