import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Menu, Search, ShoppingCart, Plus, Package, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
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
import type { CartItem, OrderFormData } from "@/types/airtable";
import { Skeleton } from "@/components/ui/skeleton";

// Define delivery party types
type DeliveryParty = 'Technician' | 'Regional Warehouse' | 'Non Technician' | 'select' | '';

// Form schema with conditional validation
const createFormSchema = (deliveryParty: DeliveryParty) => {
  const baseSchema = {
    dateOrdered: z.date({ required_error: "Date is required" }),
    itemCategory: z.string().min(1, "Item category is required").refine(val => val !== "select", "Please select a category"),
    itemNature: z.string().min(1, "Item nature is required").refine(val => val !== "select", "Please select a nature"),
    deliveryParty: z.string().min(1, "Delivery party is required").refine(val => val !== "select", "Please select a delivery party"),
    orderedBy: z.string().email("Valid email is required"),
  };

  // Add conditional fields based on delivery party
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
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(createFormSchema('')),
    defaultValues: {
      dateOrdered: new Date(),
      itemCategory: "select",
      itemNature: "select",
      deliveryParty: "select",
      orderedBy: "",
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
    },
  });

  // Watch form values for conditional rendering
  const deliveryParty = form.watch("deliveryParty") as DeliveryParty;
  const selectedCategory = form.watch("itemCategory");
  const selectedNature = form.watch("itemNature");
  const selectedContractor = form.watch("contractorCompany");
  const selectedRegion = form.watch("region");
  const selectedTechnician = form.watch("technician");

  // Fetch data from Airtable
  const { data: categories, isLoading: categoriesLoading } = useItemCategories();
  const { data: natures } = useItemNatures(selectedCategory);
  const { data: contractors } = useContractors();
  const { data: regions } = useRegions(selectedContractor);
  const { data: technicians } = useTechnicians(selectedContractor, selectedRegion);
  const { data: inventory, isLoading: inventoryLoading, refetch: refetchInventory } = useInventoryItems({
    category: selectedCategory,
    serialized: selectedNature === 'Serialised' ? 'Y' : selectedNature === 'Non-serialised' ? 'N' : undefined
  });
  
  const createOrderMutation = useCreateOrder();

  // Lock form fields once items are in cart
  const isFormLocked = cart.length > 0;

  // Update form validation schema when delivery party changes
  useEffect(() => {
    const currentValues = form.getValues();
    form.clearErrors();
    
    // Reset conditional fields when switching delivery party
    if (deliveryParty !== 'Technician') {
      form.setValue('contractorCompany', 'select');
      form.setValue('technician', 'select');
      form.setValue('onBehalfOf', '');
      form.setValue('orderLocation', '');
      form.setValue('popId', '');
    }
    if (deliveryParty !== 'Regional Warehouse' && deliveryParty !== 'Technician') {
      form.setValue('region', 'select');
    }
    if (deliveryParty !== 'Regional Warehouse' && deliveryParty !== 'Non Technician') {
      form.setValue('recipientName', '');
      form.setValue('recipientEmail', '');
    }
    if (deliveryParty !== 'Non Technician') {
      form.setValue('recipientCompanyName', '');
      form.setValue('recipientAddress', '');
      form.setValue('recipientContactNumber', '');
    }
  }, [deliveryParty]);

  // Regional Warehouse auto-fill
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

  // Technician details auto-fill with PoPID
  useEffect(() => {
    if (deliveryParty === 'Technician' && selectedTechnician && selectedTechnician !== 'select' && technicians) {
      const tech = technicians.find(t => t.fields['Name & Surname'] === selectedTechnician);
      if (tech) {
        form.setValue('onBehalfOf', tech.fields['Email Address'] || '');
        form.setValue('orderLocation', tech.fields['Area Based'] || '');
        form.setValue('popId', tech.id || '');
      }
    }
  }, [selectedTechnician, technicians, deliveryParty]);

  // Filter inventory by search
  const filteredInventory = inventory?.filter(item => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      item.fields['Device Type']?.toLowerCase().includes(search) ||
      item.fields['Item Description']?.toLowerCase().includes(search)
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

    const cartItem: CartItem = {
      id: item.id,
      deviceType: item.fields['Device Type'],
      itemDescription: item.fields['Item Description'],
      itemCategory: item.fields['Item Category'],
      quantity,
      itemNature: selectedNature,
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

      // Refresh inventory
      refetchInventory();

      // Save orderedBy email
      const savedEmail = formValues.orderedBy;

      // Reset form but keep orderedBy
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
      });
      
      setCart([]);
      setQuantities({});
      setShowCheckoutDialog(false);
    } catch (error) {
      toast({
        title: "Order submission failed",
        description: "There was an error submitting your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSearchEnabled = selectedCategory !== "select" && selectedNature !== "select" && deliveryParty !== "select";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent">
      <header className="bg-primary text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-bold">Xlink Stock Order</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6">
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* Order Details Form */}
          <Card className="h-fit bg-white/95 backdrop-blur sticky top-6">
            <CardHeader className="bg-primary text-white">
              <CardTitle>Order Details Form</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <Form {...form}>
                <form className="space-y-4">
                  {/* Date Ordered */}
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

                  {/* Item Category */}
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

                  {/* Item Nature */}
                  <FormField
                    control={form.control}
                    name="itemNature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Nature</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!selectedCategory || selectedCategory === 'select' || isFormLocked}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select nature" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="select">Select...</SelectItem>
                            {natures?.map((nature) => (
                              <SelectItem key={nature} value={nature}>
                                {nature}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Delivery Party */}
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

                  {/* TECHNICIAN SECTION */}
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
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select contractor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {contractors?.map((contractor) => (
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

                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Region</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              disabled={!selectedContractor}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select region" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {regions?.map((region) => (
                                  <SelectItem key={region} value={region}>
                                    {region}
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
                        name="technician"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Technician</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value}
                              disabled={!selectedRegion}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select technician" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {technicians?.map((tech) => (
                                  <SelectItem key={tech.id} value={tech.fields['Name & Surname']}>
                                    {tech.fields['Name & Surname']}
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

                  {/* REGIONAL WAREHOUSE SECTION */}
                  {deliveryParty === 'Regional Warehouse' && (
                    <>
                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Region</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select region" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="select">Select...</SelectItem>
                                <SelectItem value="KZN">KZN</SelectItem>
                                <SelectItem value="WC">WC</SelectItem>
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

                  {/* NON TECHNICIAN SECTION */}
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
                            <FormLabel>Recipient Company Name</FormLabel>
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
                            <FormLabel>Recipient Contact Number</FormLabel>
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

                  {/* Ordered By */}
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

          {/* Device Gallery */}
          <div className="space-y-4">
            <Card className="bg-white/95 backdrop-blur">
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
                      disabled={!deliveryParty}
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
                {(!deliveryParty || deliveryParty === 'select') && (
                  <p className="mt-2 text-sm text-muted-foreground text-center">
                    Please enter Order Details to activate device gallery
                  </p>
                )}

                {/* Cart Items */}
                {cart.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Cart Items ({cart.length})
                    </h3>
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm bg-white p-2 rounded">
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

            {/* Product Grid */}
            {inventoryLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="bg-white/95 backdrop-blur">
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
                {filteredInventory.map((item) => (
                  <Card 
                    key={item.id} 
                    className="bg-white/95 backdrop-blur border-2 border-primary/20 hover:border-primary/50 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                          {item.fields.Thumbnail?.[0]?.url ? (
                            <img 
                              src={item.fields.Thumbnail[0].url} 
                              alt={item.fields['Device Type']}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-12 w-12 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              Item code: {item.fields['Device Type']}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.fields['Item Description']}
                            </p>
                            <p className="text-xs">
                              Category: {item.fields['Item Category']}
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
                              disabled={!deliveryParty}
                            />
                            <Button
                              size="sm"
                              onClick={() => addToCart(item)}
                              disabled={!deliveryParty || (quantities[item.id] || 0) <= 0}
                              className="bg-green-600 hover:bg-green-700 h-8"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal */}
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

      {/* Checkout Confirmation Dialog */}
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
                <span>{item.deviceType}</span>
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
