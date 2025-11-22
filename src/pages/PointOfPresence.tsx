import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Search,
  Plus,
  Trash2,
  Edit,
  User,
  Users,
  Loader2,
  X,
  MapPin,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type PointOfPresenceRecord = Tables<'point_of_presence'>;
type PointOfPresenceInsert = TablesInsert<'point_of_presence'>;
type PointOfPresenceUpdate = TablesUpdate<'point_of_presence'>;

// Form validation schema
const technicianSchema = z.object({
  name_surname: z.string().min(1, 'Name is required'),
  contractor: z.string().min(1, 'Contractor is required'),
  region: z.string().optional(),
  email_address: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_number: z.string().optional(),
  mobile: z.string().optional(),
  area_based: z.string().optional(),
  location_code: z.string().optional(),
  physical_address: z.string().optional(),
  tech_id: z.string().optional(),
});

type TechnicianFormValues = z.infer<typeof technicianSchema>;

const PointOfPresence = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState<'technicians' | 'resources'>('technicians');
  const [resourceTab, setResourceTab] = useState<'contractor' | 'technician' | 'other'>('technician');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState<PointOfPresenceRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [technicianToDelete, setTechnicianToDelete] = useState<PointOfPresenceRecord | null>(null);

  // Form
  const form = useForm<TechnicianFormValues>({
    resolver: zodResolver(technicianSchema),
    defaultValues: {
      name_surname: '',
      contractor: '',
      region: '',
      email_address: '',
      contact_number: '',
      mobile: '',
      area_based: '',
      location_code: '',
      physical_address: '',
      tech_id: '',
    },
  });

  // Fetch all technicians
  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ['pointOfPresence'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('point_of_presence')
        .select('*')
        .order('name_surname', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch unique contractors for dropdown
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

  // Fetch unique regions for dropdown
  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('point_of_presence')
        .select('region')
        .not('region', 'is', null);

      if (error) throw error;
      const unique = [...new Set(data?.map((r) => r.region).filter(Boolean))] as string[];
      return unique.sort();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: PointOfPresenceInsert) => {
      const { data: result, error } = await supabase
        .from('point_of_presence')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pointOfPresence'] });
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast({
        title: 'Success',
        description: 'Technician added successfully',
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add technician',
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PointOfPresenceUpdate }) => {
      const { data: result, error } = await supabase
        .from('point_of_presence')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pointOfPresence'] });
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast({
        title: 'Success',
        description: 'Technician updated successfully',
      });
      setSelectedTechnician(result);
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update technician',
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('point_of_presence')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pointOfPresence'] });
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast({
        title: 'Success',
        description: 'Technician deleted successfully',
      });
      setSelectedTechnician(null);
      setShowDeleteDialog(false);
      setTechnicianToDelete(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete technician',
        variant: 'destructive',
      });
    },
  });

  // Filter technicians based on search
  const filteredTechnicians = technicians.filter((tech) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      tech.name_surname?.toLowerCase().includes(search) ||
      tech.contractor?.toLowerCase().includes(search) ||
      tech.email_address?.toLowerCase().includes(search) ||
      tech.region?.toLowerCase().includes(search)
    );
  });

  // Reset form
  const resetForm = () => {
    form.reset({
      name_surname: '',
      contractor: '',
      region: '',
      email_address: '',
      contact_number: '',
      mobile: '',
      area_based: '',
      location_code: '',
      physical_address: '',
      tech_id: '',
    });
    setIsEditing(false);
    setSelectedTechnician(null);
  };

  // Load technician data into form for editing
  useEffect(() => {
    if (selectedTechnician && isEditing) {
      form.reset({
        name_surname: selectedTechnician.name_surname || '',
        contractor: selectedTechnician.contractor || '',
        region: selectedTechnician.region || '',
        email_address: selectedTechnician.email_address || '',
        contact_number: selectedTechnician.contact_number || '',
        mobile: selectedTechnician.mobile || '',
        area_based: selectedTechnician.area_based || '',
        location_code: selectedTechnician.location_code || '',
        physical_address: selectedTechnician.physical_address || '',
        tech_id: selectedTechnician.tech_id || '',
      });
    }
  }, [selectedTechnician, isEditing, form]);

  // Handle form submission
  const onSubmit = (data: TechnicianFormValues) => {
    const formData = {
      name_surname: data.name_surname,
      contractor: data.contractor || null,
      region: data.region || null,
      email_address: data.email_address || null,
      contact_number: data.contact_number || null,
      mobile: data.mobile || null,
      area_based: data.area_based || null,
      location_code: data.location_code || null,
      physical_address: data.physical_address || null,
      tech_id: data.tech_id || null,
    };

    if (isEditing && selectedTechnician) {
      updateMutation.mutate({ id: selectedTechnician.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (technicianToDelete) {
      deleteMutation.mutate(technicianToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading technicians...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <MapPin className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Point of Presence</h1>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'technicians' | 'resources')}>
        <TabsList>
          <TabsTrigger value="technicians" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Technicians
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            PoP Resources
          </TabsTrigger>
        </TabsList>

        {/* Technicians Tab */}
        <TabsContent value="technicians" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Search & List */}
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, company, email, or region..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Technicians List */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Technicians ({filteredTechnicians.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    {filteredTechnicians.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No technicians found
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredTechnicians.map((tech) => (
                          <div
                            key={tech.id}
                            className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                              selectedTechnician?.id === tech.id ? 'bg-muted' : ''
                            }`}
                            onClick={() => {
                              setSelectedTechnician(tech);
                              setIsEditing(false);
                            }}
                          >
                            <div className="font-medium text-sm">
                              {tech.name_surname}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {tech.contractor && `Company: ${tech.contractor}`}
                            </div>
                            {tech.region && (
                              <div className="text-xs text-muted-foreground">
                                Region: {tech.region}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Details/Edit Form */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {isEditing
                      ? 'Edit Technician'
                      : selectedTechnician
                      ? 'Technician Details'
                      : 'Select a Technician'}
                  </CardTitle>
                  {selectedTechnician && !isEditing && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setTechnicianToDelete(selectedTechnician);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedTechnician && !isEditing ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Select a technician to view details</p>
                  </div>
                ) : isEditing ? (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name_surname"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Full name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contractor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contractor/Company *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Contractor company" />
                            </FormControl>
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
                              value={field.value || ''}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select region" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {regions.map((region) => (
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
                        name="email_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="email@example.com" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contact_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Number</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Contact number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="mobile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mobile</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Mobile number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="area_based"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Area Based</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Area" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="physical_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Physical Address</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tech_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tech ID</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Tech ID" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            if (!selectedTechnician) resetForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateMutation.isPending || createMutation.isPending}
                        >
                          {(updateMutation.isPending || createMutation.isPending) && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {isEditing && selectedTechnician ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  // View mode
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Name</label>
                      <p className="text-sm">{selectedTechnician.name_surname}</p>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Contractor</label>
                      <p className="text-sm">{selectedTechnician.contractor || '-'}</p>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Region</label>
                      <p className="text-sm">{selectedTechnician.region || '-'}</p>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-sm">{selectedTechnician.email_address || '-'}</p>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Contact Number</label>
                      <p className="text-sm">{selectedTechnician.contact_number || '-'}</p>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Mobile</label>
                      <p className="text-sm">{selectedTechnician.mobile || '-'}</p>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Area Based</label>
                      <p className="text-sm">{selectedTechnician.area_based || '-'}</p>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Physical Address</label>
                      <p className="text-sm">{selectedTechnician.physical_address || '-'}</p>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tech ID</label>
                      <p className="text-sm">{selectedTechnician.tech_id || '-'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PoP Resources Tab - Add New */}
        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left - Sub-tabs */}
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  resetForm();
                  setActiveTab('resources');
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>

              <div className="space-y-2">
                <Button
                  variant={resourceTab === 'contractor' ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setResourceTab('contractor')}
                >
                  Contractor Details
                </Button>
                <Button
                  variant={resourceTab === 'technician' ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setResourceTab('technician')}
                >
                  Technician Details
                </Button>
                <Button
                  variant={resourceTab === 'other' ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setResourceTab('other')}
                >
                  Other Details
                </Button>
              </div>
            </div>

            {/* Right - Add Form */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Add New Technician</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {resourceTab === 'contractor' && (
                      <>
                        <FormField
                          control={form.control}
                          name="contractor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contractor/Company *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Contractor company name" />
                              </FormControl>
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
                              <FormControl>
                                <Input {...field} placeholder="Region" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {resourceTab === 'technician' && (
                      <>
                        <FormField
                          control={form.control}
                          name="name_surname"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Technician Name *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Full name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="contractor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contractor *</FormLabel>
                              <Select
                                value={field.value || ''}
                                onValueChange={field.onChange}
                              >
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
                        <FormField
                          control={form.control}
                          name="email_address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" placeholder="email@example.com" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="contact_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Number</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Contact number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="tech_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tech ID</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Tech ID" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {resourceTab === 'other' && (
                      <>
                        <FormField
                          control={form.control}
                          name="area_based"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Area Based</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Area" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="location_code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location Code</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Location code" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="physical_address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Physical Address</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Address" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="mobile"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mobile</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Mobile number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

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
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this technician?
              <br />
              <strong>{technicianToDelete?.name_surname}</strong>
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PointOfPresence;
