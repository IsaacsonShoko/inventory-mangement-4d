import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Map, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { pointOfPresenceService, type PointOfPresenceRecord, type PointOfPresenceFormData } from '@/services/pointOfPresenceService';

const formSchema = z.object({
  Contractor: z.string().optional(),
  Customer: z.string().optional(),
  'Company Name': z.string().min(1, 'Company Name is required'),
  'Technician First Name': z.string().min(1, 'First Name is required'),
  'Technician Last Name': z.string().min(1, 'Last Name is required'),
  'Technician Email': z.string().email('Invalid email').optional().or(z.literal('')),
  'Tech Contact Number': z.string().optional(),
  'Vehicle Reg Number': z.string().optional(),
  'PoP User Groups': z.string().optional(),
  Hub: z.string().optional(),
  Region: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const PointOfPresence = () => {
  const [activeTab, setActiveTab] = useState<'technicians' | 'resources'>('technicians');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<PointOfPresenceRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<PointOfPresenceRecord | null>(null);

  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      Contractor: '',
      Customer: '',
      'Company Name': '',
      'Technician First Name': '',
      'Technician Last Name': '',
      'Technician Email': '',
      'Tech Contact Number': '',
      'Vehicle Reg Number': '',
      'PoP User Groups': '',
      Hub: '',
      Region: '',
    },
  });

  // Fetch all records
  const { data: allRecords = [], isLoading } = useQuery({
    queryKey: ['pointOfPresence'],
    queryFn: () => pointOfPresenceService.getAll(),
  });

  // Search records
  const { data: searchResults = [] } = useQuery({
    queryKey: ['pointOfPresence', 'search', searchTerm],
    queryFn: () => pointOfPresenceService.search(searchTerm),
    enabled: searchTerm.length > 0,
  });

  const displayRecords = searchTerm.length > 0 ? searchResults : allRecords;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: PointOfPresenceFormData) => pointOfPresenceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pointOfPresence'] });
      toast.success('Technician created successfully');
      handleCancelEdit();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PointOfPresenceFormData }) =>
      pointOfPresenceService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pointOfPresence'] });
      toast.success('Technician updated successfully');
      handleCancelEdit();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => pointOfPresenceService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pointOfPresence'] });
      toast.success('Technician deleted successfully');
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      if (selectedRecord?.id === recordToDelete?.id) {
        setSelectedRecord(null);
        form.reset();
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Load selected record into form
  useEffect(() => {
    if (selectedRecord && !isCreating) {
      form.reset({
        Contractor: selectedRecord.Contractor || '',
        Customer: selectedRecord.Customer || '',
        'Company Name': selectedRecord['Company Name'] || '',
        'Technician First Name': selectedRecord['Technician First Name'] || '',
        'Technician Last Name': selectedRecord['Technician Last Name'] || '',
        'Technician Email': selectedRecord['Technician Email'] || '',
        'Tech Contact Number': selectedRecord['Tech Contact Number'] || '',
        'Vehicle Reg Number': selectedRecord['Vehicle Reg Number'] || '',
        'PoP User Groups': selectedRecord['PoP User Groups'] || '',
        Hub: selectedRecord.Hub || '',
        Region: selectedRecord.Region || '',
      });
      setIsEditing(false);
    }
  }, [selectedRecord, isCreating, form]);

  const handleRecordClick = (record: PointOfPresenceRecord) => {
    setSelectedRecord(record);
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleNewRecord = () => {
    setSelectedRecord(null);
    setIsCreating(true);
    setIsEditing(true);
    form.reset({
      Contractor: '',
      Customer: '',
      'Company Name': '',
      'Technician First Name': '',
      'Technician Last Name': '',
      'Technician Email': '',
      'Tech Contact Number': '',
      'Vehicle Reg Number': '',
      'PoP User Groups': '',
      Hub: '',
      Region: '',
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (isCreating) {
      setIsCreating(false);
      setSelectedRecord(null);
      form.reset();
    } else if (selectedRecord) {
      // Reload the selected record data
      form.reset({
        Contractor: selectedRecord.Contractor || '',
        Customer: selectedRecord.Customer || '',
        'Company Name': selectedRecord['Company Name'] || '',
        'Technician First Name': selectedRecord['Technician First Name'] || '',
        'Technician Last Name': selectedRecord['Technician Last Name'] || '',
        'Technician Email': selectedRecord['Technician Email'] || '',
        'Tech Contact Number': selectedRecord['Tech Contact Number'] || '',
        'Vehicle Reg Number': selectedRecord['Vehicle Reg Number'] || '',
        'PoP User Groups': selectedRecord['PoP User Groups'] || '',
        Hub: selectedRecord.Hub || '',
        Region: selectedRecord.Region || '',
      });
    }
  };

  const handleDelete = (record: PointOfPresenceRecord) => {
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (recordToDelete) {
      deleteMutation.mutate(recordToDelete.id);
    }
  };

  const onSubmit = (data: FormValues) => {
    if (isCreating) {
      createMutation.mutate(data);
    } else if (selectedRecord) {
      updateMutation.mutate({ id: selectedRecord.id, data });
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500 p-2 text-white">
              <Map className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Point of Presence</h1>
              <p className="text-sm text-gray-600">Manage technicians and PoP resources</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Gallery */}
        <div className="flex w-1/2 flex-col border-r bg-white">
          <div className="border-b p-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'technicians' | 'resources')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="technicians">Technicians</TabsTrigger>
                <TabsTrigger value="resources">PoP Resources</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by company name or technician..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm text-gray-600">
              {displayRecords.length} {displayRecords.length === 1 ? 'record' : 'records'}
            </p>
            <Button onClick={handleNewRecord} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Record
            </Button>
          </div>

          {/* Gallery Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : displayRecords.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-500">
                <Map className="mb-2 h-12 w-12 opacity-20" />
                <p>No records found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {displayRecords.map((record) => (
                  <Card
                    key={record.id}
                    className={`cursor-pointer p-4 transition-all hover:shadow-md ${
                      selectedRecord?.id === record.id
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => handleRecordClick(record)}
                  >
                    <div className="space-y-2">
                      <div className="font-semibold text-gray-900">
                        {record['Company Name'] || 'No Company Name'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {record['Technician First Name']} {record['Technician Last Name']}
                      </div>
                      {record['Technician Email'] && (
                        <div className="text-xs text-gray-500">{record['Technician Email']}</div>
                      )}
                      {record.Region && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">Region:</span> {record.Region}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Details Form */}
        <div className="flex w-1/2 flex-col bg-white">
          <div className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {isCreating ? 'New Record' : selectedRecord ? 'Record Details' : 'Select a Record'}
              </h2>
              {selectedRecord && !isEditing && (
                <div className="flex gap-2">
                  <Button onClick={handleEdit} variant="outline" size="sm" className="gap-2">
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(selectedRecord)}
                    variant="outline"
                    size="sm"
                    className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!selectedRecord && !isCreating ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-500">
                <Map className="mb-4 h-16 w-16 opacity-20" />
                <p className="text-lg">Select a record to view details</p>
                <p className="text-sm">or create a new one</p>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="Company Name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="Technician First Name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isEditing} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="Technician Last Name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!isEditing} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="Technician Email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="Tech Contact Number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="Vehicle Reg Number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Reg Number</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="Contractor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contractor</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="Customer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="PoP User Groups"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PoP User Groups</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="Hub"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hub</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="Region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isEditing && (
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        className="flex-1 gap-2"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                        {isCreating ? 'Create' : 'Save Changes'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="gap-2"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </form>
              </Form>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this record for{' '}
              <span className="font-semibold">
                {recordToDelete?.['Technician First Name']} {recordToDelete?.['Technician Last Name']}
              </span>{' '}
              at <span className="font-semibold">{recordToDelete?.['Company Name']}</span>?
              This action will move the record to the deleted table.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PointOfPresence;
