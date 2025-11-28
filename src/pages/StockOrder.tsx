import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Menu, Search, ShoppingCart, Plus, Package, Trash2, CheckCircle2, Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { 
  useInventoryItems, 
  useItemCategories, 
  useItemNatures,
  useContractors,
  useRegions,
  useTechnicians,
  useCreateOrder
} from "@/hooks/useAirtable";
import type { CartItem, OrderFormData } from "@/hooks/useAirtable";
import { Skeleton } from "@/components/ui/skeleton";
import ThemeToggle from "@/components/theme-toggle";

type DeliveryParty = 'Technician' | 'Regional Warehouse' | 'Non Technician' | 'select' | '';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const rawError = error as { message?: unknown; error?: { message?: unknown; type?: unknown } };

    const messages = [
      rawError?.message,
      rawError?.error?.message,
      rawError?.error?.type,
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    if (messages.length > 0) {
      return messages.join(' - ');
    }
  }

  return 'An unexpected error occurred.';
};

const createFormSchema = (deliveryParty: DeliveryParty) => {
  const baseSchema = {
    dateOrdered: z.date({ required_error: "Date is required" }),
    itemCategory: z.string().min(1, "Item category is required").refine(val => val !== "select", "Please select a category"),
    itemNature: z.string().min(1, "Item nature is required").refine(val => val !== "select", "Please select a nature"),
    deliveryParty: z.string().min(1, "Delivery party is required").refine(val => val !== "select", "Please select a delivery party"),
    orderedBy: z.string().email("Valid email is required"),
  };

  if (deliveryParty === 'Technician') {
    return z.object({
      ...baseSchema,
      contractorCompany: z.string().min(1, "Contractor company is required").refine(val => val !== "select", "Please select a contractor"),
      region: z.string().min(1, "Region is required").refine(val => val !== "select", "Please select a region"),
      technician: z.string().min(1, "Technician is required").refine(val => val !== "select", "Please select a technician"),
      onBehalfOf: z.string().email("Valid email is required"),
      orderLocation: z.string().optional(),
      popId: z.string().optional(),
    });
  } else if (deliveryParty === 'Regional Warehouse') {
    return z.object({
      ...baseSchema,
      region: z.string().min(1, "Region is required").refine(val => val !== "select", "Please select a region"),
      recipientName: z.string().min(1, "Recipient name is required"),
      recipientEmail: z.string().email("Valid email is required"),
    });
  } else if (deliveryParty === 'Non Technician') {
    return z.object({
      ...baseSchema,
      recipientName: z.string().min(1, "Recipient name is required"),
      recipientCompanyName: z.string().optional(),
      recipientAddress: z.string().min(1, "Recipient address is required"),
      recipientContactNumber: z.string().optional(),
      recipientEmail: z.string().email("Valid email is required"),
    });
  }

  return z.object(baseSchema);
};

const StockOrder = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userEmail = profile?.email || "";

  const form = useForm<any>({
    resolver: zodResolver(createFormSchema('')),
    defaultValues: {
      dateOrdered: new Date(),
      itemCategory: "select",
      itemNature: "select",
      deliveryParty: "select",
      orderedBy: userEmail,
      contractorCompany: "select",
      region: "select",
      technician: "select",
      onBehalfOf: userEmail,
      orderLocation: "",
      popId: "",
      recipientName: "",
      recipientCompanyName: "",
      recipientAddress: "",
      recipientContactNumber: "",
      recipientEmail: userEmail,
      cellPhoneNumber: "",
    },
  });

  const deliveryParty = form.watch("deliveryParty") as DeliveryParty;
  const selectedCategory = form.watch("itemCategory");
  const selectedNature = form.watch("itemNature");
  const selectedContractor = form.watch("contractorCompany");
  const selectedRegion = form.watch("region");
  const selectedTechnician = form.watch("technician");

  const normalizedCategory = selectedCategory && selectedCategory !== "select" ? selectedCategory : undefined;
  const normalizedNature = selectedNature && selectedNature !== "select" ? selectedNature : undefined;
  const natureFilter = normalizedNature;
  const normalizedContractor = selectedContractor && selectedContractor !== "select" ? selectedContractor : undefined;
  const normalizedRegion = selectedRegion && selectedRegion !== "select" ? selectedRegion : undefined;

  const inventoryFilters = normalizedCategory
    ? {
        category: normalizedCategory,
        ...(natureFilter ? { serialized: natureFilter } : {}),
      }
    : undefined;
  const shouldRefetchInventory = Boolean(inventoryFilters);

  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useItemCategories();
  const { data: natures, isLoading: naturesLoading, error: naturesError } = useItemNatures(normalizedCategory);
  const { data: contractors, isLoading: contractorsLoading, error: contractorsError } = useContractors();
  const { data: regions, isLoading: regionsLoading, error: regionsError } = useRegions(normalizedContractor, deliveryParty);
  const { data: technicians, isLoading: techniciansLoading, error: techniciansError } = useTechnicians(normalizedContractor, normalizedRegion);
  const { 
    data: inventory, 
    isLoading: inventoryLoading, 
    isFetching: inventoryFetching, 
    refetch: refetchInventory,
    error: inventoryError 
  } = useInventoryItems(inventoryFilters);

  const isInventoryLoading = inventoryLoading || inventoryFetching;
  
  const createOrderMutation = useCreateOrder();

  // Fetch stock levels to show availability
  const { data: stockLevels = [] } = useQuery({
    queryKey: ['stockLevelsForOrdering'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_levels')
        .select('device_type, quantity, item_status')
        .not('item_status', 'eq', 'Faulty');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create a map of device type to total available quantity
  const stockAvailabilityMap = useMemo(() => {
    const map = new Map<string, number>();
    stockLevels.forEach(level => {
      if (level.device_type) {
        const current = map.get(level.device_type) || 0;
        map.set(level.device_type, current + (level.quantity || 0));
      }
    });
    return map;
  }, [stockLevels]);

  // Helper to get stock status for an item
  const getStockStatus = (itemName: string): { status: 'in_stock' | 'low_stock' | 'out_of_stock'; quantity: number } => {
    const quantity = stockAvailabilityMap.get(itemName) || 0;
    if (quantity === 0) {
      return { status: 'out_of_stock', quantity };
    } else if (quantity <= 5) {
      return { status: 'low_stock', quantity };
    }
    return { status: 'in_stock', quantity };
  };

  useEffect(() => {
    const errorContexts = [
      { error: categoriesError, context: 'item categories' },
      { error: naturesError, context: 'item natures' },
      { error: contractorsError, context: 'contractors' },
      { error: regionsError, context: 'regions' },
      { error: techniciansError, context: 'technicians' },
      { error: inventoryError, context: 'inventory' },
    ];

    errorContexts.forEach(({ error, context }) => {
      if (error) {
        toast({
          title: `Failed to load ${context}`,
          description: getErrorMessage(error),
          variant: "destructive",
        });
      }
    });
  }, [
    categoriesError,
    naturesError,
    contractorsError,
    regionsError,
    techniciansError,
    inventoryError,
    toast,
  ]);

  // Auto-fill email fields when user profile loads
  useEffect(() => {
    if (userEmail) {
      form.setValue('orderedBy', userEmail);
      form.setValue('onBehalfOf', userEmail);
      form.setValue('recipientEmail', userEmail);
    }
  }, [userEmail, form]);

  const isFormLocked = cart.length > 0;

  useEffect(() => {
    form.clearErrors();

    if (deliveryParty !== 'Technician') {
      form.setValue('contractorCompany', 'select');
      form.setValue('technician', 'select');
      form.setValue('onBehalfOf', userEmail);
      form.setValue('orderLocation', '');
      form.setValue('popId', '');
    }
    if (deliveryParty !== 'Regional Warehouse' && deliveryParty !== 'Technician') {
      form.setValue('region', 'select');
    }
    if (deliveryParty !== 'Regional Warehouse' && deliveryParty !== 'Non Technician') {
      form.setValue('recipientName', '');
      form.setValue('recipientEmail', userEmail);
    }
    if (deliveryParty !== 'Non Technician') {
      form.setValue('recipientCompanyName', '');
      form.setValue('recipientAddress', '');
      form.setValue('recipientContactNumber', '');
    }
  }, [deliveryParty, userEmail, form]);

  useEffect(() => {
    if (deliveryParty === 'Regional Warehouse' && selectedRegion && selectedRegion !== 'select') {
      const defaultEmails: Record<string, string> = {
        'KZN': 'modestam@xlink.co.za',
        'WC': 'waynef@xlcontractor.co.za'
      };
      const defaultNames: Record<string, string> = {
        'KZN': 'Modesta Maphumulo',
        'WC': 'Wayne Fuller'
      };
      form.setValue('recipientEmail', defaultEmails[selectedRegion] || '');
      form.setValue('recipientName', defaultNames[selectedRegion] || '');
    }
  }, [deliveryParty, selectedRegion]);

  useEffect(() => {
    if (deliveryParty === 'Technician' && selectedTechnician && selectedTechnician !== 'select' && technicians) {
      const tech = technicians.find(t => t.name_surname === selectedTechnician);
      if (tech) {
        form.setValue('onBehalfOf', tech.email_address || '');
        form.setValue('orderLocation', tech.area_based || '');
        form.setValue('popId', tech.location_code || tech.id || '');
      }
    }
  }, [selectedTechnician, technicians, deliveryParty]);

  const filteredInventory = inventory?.filter(item => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      item.item_name?.toLowerCase().includes(search) ||
      item.item_description?.toLowerCase().includes(search)
    );
  }) || [];

  const addToCart = (item: typeof filteredInventory[0]) => {
    const quantity = quantities[item.id] || 0;
    if (quantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a quantity greater than 0",
        variant: "destructive",
      });
      return;
    }

    const itemImageUrl =
      item.item_url ||
      item.item_url ||
      null?.[0]?.url;

    const cartItem: CartItem = {
      id: item.id,
      itemName: item.item_name,
      itemDescription: item.item_description,
      itemCategory: item.item_category,
      quantity,
      itemNature: selectedNature,
      itemUrl: itemImageUrl ?? undefined,
    };

    setCart([...cart, cartItem]);
    setQuantities({ ...quantities, [item.id]: 0 });
    setShowSuccessModal(true);
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your order",
        variant: "destructive",
      });
      return;
    }

    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: "Form incomplete",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setShowCheckoutDialog(true);
  };

  const submitOrder = async () => {
    setIsSubmitting(true);
    
    const formValues = form.getValues();
    const formData: OrderFormData = {
      dateOrdered: formValues.dateOrdered,
      itemCategory: formValues.itemCategory,
      itemNature: formValues.itemNature,
      deliveryParty: formValues.deliveryParty,
      orderedBy: formValues.orderedBy,
      cellPhoneNumber: formValues.cellPhoneNumber,
      ...(deliveryParty === 'Technician' && {
        contractorCompany: formValues.contractorCompany,
        region: formValues.region,
        technician: formValues.technician,
        onBehalfOf: formValues.onBehalfOf,
        orderLocation: formValues.orderLocation,
        popId: formValues.popId,
      }),
      ...(deliveryParty === 'Regional Warehouse' && {
        region: formValues.region,
        recipientName: formValues.recipientName,
        recipientEmail: formValues.recipientEmail,
      }),
      ...(deliveryParty === 'Non Technician' && {
        recipientName: formValues.recipientName,
        recipientCompanyName: formValues.recipientCompanyName,
        recipientAddress: formValues.recipientAddress,
        recipientContactNumber: formValues.recipientContactNumber,
        recipientEmail: formValues.recipientEmail,
      }),
    };

    try {
      const result = await createOrderMutation.mutateAsync({ formData, cartItems: cart });
      
      toast({
        title: "Order submitted successfully!",
        description: `Order ID: ${result.orderId}. ${cart.length} item(s) have been ordered.`,
      });

      if (shouldRefetchInventory) {
        refetchInventory();
      }

      const savedEmail = formValues.orderedBy;

      form.reset({
        dateOrdered: new Date(),
        itemCategory: "select",
        itemNature: "select",
        deliveryParty: "select",
        orderedBy: savedEmail,
        contractorCompany: "select",
        region: "select",
        technician: "select",
        onBehalfOf: "",
        orderLocation: "",
        popId: "",
        recipientName: "",
        recipientCompanyName: "",
        recipientAddress: "",
        recipientContactNumber: "",
        recipientEmail: "",
        cellPhoneNumber: "",
      });
      
      setCart([]);
      setQuantities({});
      setShowCheckoutDialog(false);
    } catch (error) {
      console.error("Order submission error:", error);
      toast({
        title: "Order submission failed",
        description: error instanceof Error ? error.message : "There was an error submitting your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSearchEnabled = Boolean(normalizedCategory && normalizedNature && deliveryParty && deliveryParty !== "select");

  return (
    <div className="min-h-screen bg-background">
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
            <h1 className="text-xl font-semibold">Stock Order Workspace</h1>
          </div>
          <ThemeToggle variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/20" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <Card className="h-fit bg-card border border-border/50 shadow-sm sticky top-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto">
              <Form {...form}>
                <form className="space-y-4">
                  <FormField
                    control={form.control}
                    name="dateOrdered"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Ordered</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : "Pick a date"}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
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
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={isFormLocked}
                        >
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

                  <FormField
                    control={form.control}
                    name="itemNature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Nature</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!normalizedCategory || isFormLocked || naturesLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select nature" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="select">Select...</SelectItem>
                            {naturesLoading && (
                              <SelectItem value="loading" disabled>
                                Loading...
                              </SelectItem>
                            )}
                            {!naturesLoading && normalizedCategory && natures?.length ? (
                              natures.map((nature) => (
                                <SelectItem key={nature} value={nature}>
                                  {nature}
                                </SelectItem>
                              ))
                            ) : null}
                            {!naturesLoading && normalizedCategory && !natures?.length && (
                              <SelectItem value="empty" disabled>
                                No item natures found
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryParty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Party</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select delivery party" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="select">Select...</SelectItem>
                            <SelectItem value="Technician">Technician</SelectItem>
                            <SelectItem value="Regional Warehouse">Regional Warehouse</SelectItem>
                            <SelectItem value="Non Technician">Non Technician</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {deliveryParty === 'Technician' && (
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
                                {!contractorsLoading && !contractors?.length && (
                                  <SelectItem value="empty" disabled>
                                    No contractors available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="region"
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
                                {!regionsLoading && normalizedContractor && !regions?.length && (
                                  <SelectItem value="empty" disabled>
                                    No regions found
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="technician"
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
                                    <SelectItem key={tech.id} value={tech.name_surname}>
                                      {tech.name_surname}
                                    </SelectItem>
                                  ))
                                ) : null}
                                {!techniciansLoading && normalizedRegion && !technicians?.length && (
                                  <SelectItem value="empty" disabled>
                                    No technicians found
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="onBehalfOf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>On Behalf of (Email)</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly className="bg-muted" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="orderLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Order Location</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly className="bg-muted" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {deliveryParty === 'Regional Warehouse' && (
                    <>
                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Region</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              disabled={regionsLoading}
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
                                {!regionsLoading && regions?.length ? (
                                  regions.map((region) => (
                                    <SelectItem key={region} value={region}>
                                      {region}
                                    </SelectItem>
                                  ))
                                ) : null}
                                {!regionsLoading && !regions?.length && (
                                  <SelectItem value="empty" disabled>
                                    No regions available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recipientName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recipientEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Email Address</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {deliveryParty === 'Non Technician' && (
                    <>
                      <div className="bg-primary/10 p-3 rounded-lg">
                        <h3 className="font-semibold text-primary text-center">Recipient Details</h3>
                      </div>

                      <FormField
                        control={form.control}
                        name="recipientName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recipientCompanyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Company Name (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recipientAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Address</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recipientContactNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Contact Number (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recipientEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Email Address</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <FormField
                    control={form.control}
                    name="cellPhoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CellPhone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+27..." {...field} type="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="orderedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ordered by</FormLabel>
                        <FormControl>
                          <Input placeholder="email@example.com" {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>

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
                      placeholder="Search a product"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      disabled={!isSearchEnabled}
                    />
                  </div>
                  <Button 
                    onClick={handleCheckout}
                    disabled={cart.length === 0}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Checkout ({cart.length})
                  </Button>
                </div>
                {!isSearchEnabled && (
                  <p className="mt-2 text-sm text-muted-foreground text-center">
                    Please enter Order Details to activate device gallery
                  </p>
                )}

                {cart.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Cart Items ({cart.length})
                    </h3>
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm bg-background p-2 rounded border border-border/60">
                          <div className="flex-1">
                            <p className="font-medium">{item.itemName}</p>
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
                  const thumbnailUrl = null?.[0]?.url;
                  const imageUrl = thumbnailUrl ?? item.item_url;
                  const stockStatus = getStockStatus(item.item_name);

                  return (
                  <Card
                    key={item.id}
                    className={`bg-card border transition-colors shadow-sm ${
                      stockStatus.status === 'out_of_stock'
                        ? 'border-red-200 bg-red-50/30'
                        : stockStatus.status === 'low_stock'
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'border-border/60 hover:border-primary/60'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-primary/10 overflow-hidden relative">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.item_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-12 w-12 text-primary" />
                          )}
                          {stockStatus.status === 'out_of_stock' && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <AlertTriangle className="h-6 w-6 text-red-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">
                                Device Type: {item.item_name}
                              </p>
                              {stockStatus.status === 'out_of_stock' ? (
                                <Badge variant="destructive" className="text-[10px]">
                                  Out of Stock
                                </Badge>
                              ) : stockStatus.status === 'low_stock' ? (
                                <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">
                                  Low Stock ({stockStatus.quantity})
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">
                                  In Stock ({stockStatus.quantity})
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {item.item_description}
                            </p>
                            <p className="text-xs">
                              Category: {item.item_category}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold">Quantity:</label>
                            <Input
                              type="number"
                              min="0"
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
                              className={`h-8 ${
                                stockStatus.status === 'out_of_stock'
                                  ? 'bg-amber-600 hover:bg-amber-700'
                                  : 'bg-green-600 hover:bg-green-700'
                              }`}
                              title={stockStatus.status === 'out_of_stock' ? 'Item will be backordered' : undefined}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {stockStatus.status === 'out_of_stock' && (
                            <p className="text-[10px] text-amber-600">
                              Item will be backordered if added to cart
                            </p>
                          )}
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

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              Action successful!
            </DialogTitle>
            <DialogDescription>
              Item has been added to your cart.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSuccessModal(false)}
            >
              Add more items
            </Button>
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                handleCheckout();
              }}
              className="bg-primary"
            >
              Check Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Order</DialogTitle>
            <DialogDescription>
              You are about to submit an order with {cart.length} item(s). Do you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between text-sm p-2 bg-muted rounded">
                <span>{item.itemName}</span>
                <span className="font-medium">Qty: {item.quantity}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCheckoutDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitOrder}
              disabled={isSubmitting}
              className="bg-primary"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockOrder;