import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  Building2,
  Map,
  Home,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { HorizontalBarChart, DonutChart, CHART_PALETTE } from '@/components/charts';

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
type SortField = 'name_surname' | 'contractor' | 'region' | 'area_based';
type SortDirection = 'asc' | 'desc';

const PointOfPresence = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'technicians' | 'resources'>('overview');
  const [resourceTab, setResourceTab] = useState<'contractor' | 'technician' | 'other'>('technician');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState<PointOfPresenceRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [technicianToDelete, setTechnicianToDelete] = useState<PointOfPresenceRecord | null>(null);
  const [sortField, setSortField] = useState<SortField>('name_surname');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [contractorFilter, setContractorFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

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

  // Stats calculation
  const stats = useMemo(() => {
    const total = technicians.length;
    const uniqueContractors = [...new Set(technicians.map(t => t.contractor).filter(Boolean))].length;
    const uniqueRegions = [...new Set(technicians.map(t => t.region).filter(Boolean))].length;
    const withLocation = technicians.filter(t => t.latitude && t.longitude).length;

    // Technicians by contractor
    const byContractor = technicians.reduce((acc, tech) => {
      const contractor = tech.contractor || 'Unknown';
      acc[contractor] = (acc[contractor] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Technicians by region
    const byRegion = technicians.reduce((acc, tech) => {
      const region = tech.region || 'Unassigned';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Regional heat map data (region -> contractor breakdown)
    const regionalMatrix = technicians.reduce((acc, tech) => {
      const region = tech.region || 'Unassigned';
      const contractor = tech.contractor || 'Unknown';
      if (!acc[region]) acc[region] = {};
      acc[region][contractor] = (acc[region][contractor] || 0) + 1;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    return { total, uniqueContractors, uniqueRegions, withLocation, byContractor, byRegion, regionalMatrix };
  }, [technicians]);

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

  // Filter and sort technicians
  const filteredTechnicians = useMemo(() => {
    let result = [...technicians];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter((tech) =>
        tech.name_surname?.toLowerCase().includes(search) ||
        tech.contractor?.toLowerCase().includes(search) ||
        tech.email_address?.toLowerCase().includes(search) ||
        tech.region?.toLowerCase().includes(search) ||
        tech.area_based?.toLowerCase().includes(search)
      );
    }

    // Apply contractor filter
    if (contractorFilter !== 'all') {
      result = result.filter(t => t.contractor === contractorFilter);
    }

    // Apply region filter
    if (regionFilter !== 'all') {
      result = result.filter(t => t.region === regionFilter);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = (a[sortField] || '').toLowerCase();
      const bVal = (b[sortField] || '').toLowerCase();
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    return result;
  }, [technicians, searchTerm, contractorFilter, regionFilter, sortField, sortDirection]);

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <ChevronUp className="h-3 w-3 inline ml-1" /> :
      <ChevronDown className="h-3 w-3 inline ml-1" />;
  };

  // Get heat intensity color based on count
  const getHeatColor = (count: number, max: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    const intensity = count / max;
    if (intensity > 0.7) return 'bg-red-500 text-white';
    if (intensity > 0.5) return 'bg-orange-400 text-white';
    if (intensity > 0.3) return 'bg-yellow-400 text-black';
    if (intensity > 0.1) return 'bg-green-300 text-black';
    return 'bg-green-100 text-black dark:bg-green-900 dark:text-white';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Point of Presence</h1>
        </div>
        <Link to="/">
          <Button variant="outline" size="sm">
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
        </Link>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="technicians" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Technicians
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            PoP Resources
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Technicians</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold animate-count-up">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Field resources</p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contractors</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold animate-count-up">{stats.uniqueContractors}</div>
                <p className="text-xs text-muted-foreground">Partner companies</p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Regions Covered</CardTitle>
                <Map className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold animate-count-up">{stats.uniqueRegions}</div>
                <p className="text-xs text-muted-foreground">Geographic areas</p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">GPS Mapped</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold animate-count-up">{stats.withLocation}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 ? `${((stats.withLocation / stats.total) * 100).toFixed(0)}% coverage` : 'No data'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          {stats.total > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <HorizontalBarChart
                title="Technicians by Contractor"
                description="Distribution across partner companies"
                data={Object.entries(stats.byContractor)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([contractor, count]) => ({
                    name: contractor.length > 25 ? contractor.slice(0, 25) + '...' : contractor,
                    value: count,
                  }))}
                color={CHART_PALETTE[0]}
                height={350}
              />

              <DonutChart
                title="Technicians by Region"
                description="Geographic distribution"
                data={Object.entries(stats.byRegion)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
                  .map(([region, count]) => ({
                    name: region.length > 20 ? region.slice(0, 20) + '...' : region,
                    value: count,
                  }))}
                height={350}
                innerRadius={60}
                outerRadius={110}
              />
            </div>
          )}

          {/* Regional Heat Map */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Regional Coverage Heat Map
              </CardTitle>
              <CardDescription>
                Technician distribution by region and contractor (darker = higher concentration)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(stats.regionalMatrix).length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold min-w-[150px]">Region</TableHead>
                        {contractors.slice(0, 8).map((contractor) => (
                          <TableHead key={contractor} className="text-center text-xs min-w-[80px]">
                            {contractor.length > 12 ? contractor.slice(0, 12) + '...' : contractor}
                          </TableHead>
                        ))}
                        <TableHead className="text-center font-semibold">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(stats.byRegion)
                        .sort(([, a], [, b]) => b - a)
                        .map(([region, total]) => {
                          const maxInRegion = Math.max(...Object.values(stats.regionalMatrix[region] || {}), 1);
                          return (
                            <TableRow key={region}>
                              <TableCell className="font-medium text-sm">
                                {region}
                              </TableCell>
                              {contractors.slice(0, 8).map((contractor) => {
                                const count = stats.regionalMatrix[region]?.[contractor] || 0;
                                return (
                                  <TableCell key={contractor} className="text-center p-1">
                                    <div
                                      className={`rounded px-2 py-1 text-xs font-medium ${getHeatColor(count, maxInRegion)}`}
                                    >
                                      {count || '-'}
                                    </div>
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-center font-bold">
                                {total}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      {/* Totals row */}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>Total</TableCell>
                        {contractors.slice(0, 8).map((contractor) => (
                          <TableCell key={contractor} className="text-center">
                            {stats.byContractor[contractor] || 0}
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-bold text-primary">
                          {stats.total}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No regional data available
                </div>
              )}
              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 text-xs">
                <span className="font-medium">Intensity:</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900"></div>
                  <span>Low</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-yellow-400"></div>
                  <span>Medium</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-orange-400"></div>
                  <span>High</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-red-500"></div>
                  <span>Very High</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Technicians Tab */}
        <TabsContent value="technicians" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-[250px]">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, company, email, region..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <Select value={contractorFilter} onValueChange={setContractorFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by contractor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Contractors</SelectItem>
                    {contractors.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    {regions.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground">
                  {filteredTechnicians.length} of {technicians.length}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Table List */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Technician Directory</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 sticky top-0 z-10">
                        <TableHead
                          className="cursor-pointer hover:bg-muted/80 bg-muted/50"
                          onClick={() => handleSort('name_surname')}
                        >
                          Name <SortIcon field="name_surname" />
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-muted/80 bg-muted/50"
                          onClick={() => handleSort('contractor')}
                        >
                          Contractor <SortIcon field="contractor" />
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-muted/80 bg-muted/50"
                          onClick={() => handleSort('region')}
                        >
                          Region <SortIcon field="region" />
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-muted/80 bg-muted/50"
                          onClick={() => handleSort('area_based')}
                        >
                          Area <SortIcon field="area_based" />
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTechnicians.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No technicians found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTechnicians.map((tech) => (
                          <TableRow
                            key={tech.id}
                            className={`cursor-pointer hover:bg-muted/50 ${selectedTechnician?.id === tech.id ? 'bg-primary/10' : ''}`}
                            onClick={() => {
                              setSelectedTechnician(tech);
                              setIsEditing(false);
                            }}
                          >
                            <TableCell className="font-medium text-sm py-2">
                              {tech.name_surname}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground py-2">
                              <span className="truncate block max-w-[120px]">{tech.contractor || '-'}</span>
                            </TableCell>
                            <TableCell className="text-sm py-2">
                              {tech.region ? (
                                <Badge variant="outline" className="text-xs">{tech.region}</Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground py-2">
                              {tech.area_based || '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right Panel - Details/Edit Form */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {isEditing
                      ? 'Edit Technician'
                      : selectedTechnician
                      ? 'Details'
                      : 'Select a Technician'}
                  </CardTitle>
                  {selectedTechnician && !isEditing && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setTechnicianToDelete(selectedTechnician);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                      <FormField
                        control={form.control}
                        name="name_surname"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Full name" className="h-8" />
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
                            <FormLabel className="text-xs">Contractor *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Company" className="h-8" />
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
                            <FormLabel className="text-xs">Region</FormLabel>
                            <Select value={field.value || ''} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select region" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {regions.map((region) => (
                                  <SelectItem key={region} value={region}>{region}</SelectItem>
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
                            <FormLabel className="text-xs">Email</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" className="h-8" />
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
                            <FormLabel className="text-xs">Contact</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-8" />
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
                            <FormLabel className="text-xs">Area</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-8" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditing(false);
                            if (!selectedTechnician) resetForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
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
                  // View mode - compact
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Name</label>
                        <p>{selectedTechnician.name_surname}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Tech ID</label>
                        <p>{selectedTechnician.tech_id || '-'}</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Contractor</label>
                      <p>{selectedTechnician.contractor || '-'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Region</label>
                        <p>{selectedTechnician.region || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Area</label>
                        <p>{selectedTechnician.area_based || '-'}</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Email</label>
                      <p className="truncate">{selectedTechnician.email_address || '-'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Contact</label>
                        <p>{selectedTechnician.contact_number || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Mobile</label>
                        <p>{selectedTechnician.mobile || '-'}</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Address</label>
                      <p className="text-xs">{selectedTechnician.physical_address || '-'}</p>
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
