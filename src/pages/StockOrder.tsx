import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Menu, Search, ShoppingCart, Plus, Package } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  dateOrdered: z.date({
    required_error: "Date is required",
  }),
  itemCategory: z.string().min(1, "Item category is required"),
  itemNature: z.string().min(1, "Item nature is required"),
  deliveryParty: z.string().min(1, "Delivery party is required"),
  orderedBy: z.string().email("Valid email is required"),
});

type OrderItem = {
  id: string;
  deviceType: string;
  itemDescription: string;
  itemCategory: string;
  quantity: number;
};

const StockOrder = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderedBy: "",
    },
  });

  const itemCategories = ["Modems", "Routers", "CPE", "Cash Connect", "Other"];
  const itemNatures = ["Serialised", "Non-serialised"];
  const deliveryParties = ["Main Warehouse", "Regional Hub", "Local Depot"];

  // Mock data - will be replaced with Airtable data
  const mockDevices = [
    { id: "1", deviceType: "RT-AC68U", itemDescription: "ASUS Dual-Band Router", itemCategory: "Routers", serialized: "Y" },
    { id: "2", deviceType: "MK-300", itemDescription: "Modem Kit 300", itemCategory: "MODEM", serialized: "Y" },
    { id: "3", deviceType: "CPE-210", itemDescription: "TP-Link CPE Outdoor", itemCategory: "CPE", serialized: "N" },
  ];

  const selectedCategory = form.watch("itemCategory");
  const selectedNature = form.watch("itemNature");
  const selectedDelivery = form.watch("deliveryParty");

  const filteredDevices = mockDevices.filter((device) => {
    const categoryMatch = !selectedCategory || 
      (selectedCategory === "Modems" ? device.itemCategory === "MODEM" : device.itemCategory === selectedCategory);
    const natureMatch = !selectedNature || 
      (selectedNature === "Serialised" ? device.serialized === "Y" : device.serialized === "N");
    const searchMatch = !searchQuery || 
      device.deviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.itemDescription.toLowerCase().includes(searchQuery.toLowerCase());
    
    return categoryMatch && natureMatch && searchMatch;
  });

  const addToCart = (device: typeof mockDevices[0]) => {
    const quantity = quantities[device.id] || 0;
    if (quantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a quantity greater than 0",
        variant: "destructive",
      });
      return;
    }

    const newItem: OrderItem = {
      id: device.id,
      deviceType: device.deviceType,
      itemDescription: device.itemDescription,
      itemCategory: device.itemCategory,
      quantity,
    };

    setCart([...cart, newItem]);
    setQuantities({ ...quantities, [device.id]: 0 });
    
    toast({
      title: "Item added",
      description: `${device.deviceType} added to cart`,
    });
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your order",
        variant: "destructive",
      });
      return;
    }

    const formData = form.getValues();
    console.log("Order submitted:", { ...formData, items: cart });
    
    toast({
      title: "Order submitted",
      description: `${cart.length} item(s) have been ordered`,
    });

    setCart([]);
    form.reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent">
      {/* Header */}
      <header className="bg-primary text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Menu className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Xlink Stock Order</h1>
          </div>
          <div className="text-sm">Welcome, Isaacson Studio</div>
        </div>
      </header>

      <div className="container mx-auto p-6">
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* Order Details Form */}
          <Card className="h-fit bg-white/95 backdrop-blur">
            <CardHeader className="bg-primary/10">
              <CardTitle className="text-primary">Order Details Form</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
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
                              className="pointer-events-auto"
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {itemCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
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
                    name="itemNature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Nature</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select nature" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {itemNatures.map((nature) => (
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
                            {deliveryParties.map((party) => (
                              <SelectItem key={party} value={party}>
                                {party}
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
                    name="orderedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ordered by</FormLabel>
                        <FormControl>
                          <Input placeholder="email@example.com" {...field} />
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
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search a product"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button 
                    onClick={handleCheckout}
                    disabled={!selectedDelivery}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Checkout ({cart.length})
                  </Button>
                </div>
                {!selectedDelivery && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Please enter Order Details to activate device gallery
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {filteredDevices.map((device) => (
                <Card 
                  key={device.id} 
                  className="bg-white/95 backdrop-blur border-2 border-primary/20 hover:border-primary/50 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-primary/10">
                        <Package className="h-12 w-12 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Item code: {device.deviceType}</p>
                          <p className="text-sm text-muted-foreground">{device.itemDescription}</p>
                          <p className="text-sm">Item category: {device.itemCategory}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-semibold">Quantity:</label>
                          <Input
                            type="number"
                            min="0"
                            value={quantities[device.id] || 0}
                            onChange={(e) => setQuantities({
                              ...quantities,
                              [device.id]: parseInt(e.target.value) || 0
                            })}
                            className="w-24"
                            disabled={!selectedDelivery}
                          />
                          <Button
                            size="icon"
                            onClick={() => addToCart(device)}
                            disabled={!selectedDelivery || (quantities[device.id] || 0) <= 0}
                            className="bg-green-600 hover:bg-green-700"
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockOrder;
