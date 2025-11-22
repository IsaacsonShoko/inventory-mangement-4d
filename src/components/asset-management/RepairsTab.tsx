import { useState } from 'react';
import { format } from 'date-fns';
import { Search, Filter, MoreHorizontal, Eye, Wrench } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useRepairTickets, useRepairMetrics } from '@/hooks/useAssetManagement';
import type { RepairStatusEnum, FaultCategoryEnum } from '@/integrations/supabase/services-asset';

// Status badge colors
const statusColors: Record<RepairStatusEnum, string> = {
  'Reported': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  'Assessing': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  'In-Repair': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
  'Repaired': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  'Quality-Check': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  'Returned': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
  'Decommissioned': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
};

// Fault categories for filter
const faultCategories: FaultCategoryEnum[] = [
  'Dead On Arrival',
  'Screen Damaged',
  'Cradle/Charger Damaged',
  'Enclosure Damaged',
  'Port/Connector Damaged',
  'Battery Failure',
  'Printer Malfunction',
  'Card Reader Failure',
  'Keypad Malfunction',
  'Speaker/Mic Failure',
  'Software Error',
  'Connectivity Issues',
  'Firmware Corruption',
  'SIM/Network Failure',
  'Water Damage',
  'Heat Damage',
  'Theft/Tampering',
  'Unknown',
  'Other',
];

export function RepairsTab() {
  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [faultFilter, setFaultFilter] = useState<string>('');

  // Detail view
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  // Queries
  const { data: tickets, isLoading } = useRepairTickets({
    status: statusFilter || undefined,
    faultCategory: faultFilter || undefined,
  });

  const { data: metrics } = useRepairMetrics();

  // Status options
  const statuses: RepairStatusEnum[] = [
    'Reported',
    'Assessing',
    'In-Repair',
    'Repaired',
    'Quality-Check',
    'Returned',
    'Decommissioned',
  ];

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setFaultFilter('');
  };

  // Filter tickets by search
  const filteredTickets = tickets?.filter((ticket: any) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      ticket.device?.serial_number?.toLowerCase().includes(searchLower) ||
      ticket.reported_by?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {(metrics.byStatus['Reported'] || 0) +
                  (metrics.byStatus['Assessing'] || 0) +
                  (metrics.byStatus['In-Repair'] || 0) +
                  (metrics.byStatus['Quality-Check'] || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics.byStatus['Returned'] || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Repair Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.avgRepairTimeHours > 0
                  ? `${Math.round(metrics.avgRepairTimeHours)}h`
                  : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search serial or reporter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={faultFilter} onValueChange={setFaultFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Fault Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Fault Types</SelectItem>
                {faultCategories.map((fault) => (
                  <SelectItem key={fault} value={fault}>{fault}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Repair Tickets ({filteredTickets?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Fault Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets?.map((ticket: any) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">
                      #{ticket.ticket_number}
                    </TableCell>
                    <TableCell className="font-mono">
                      {ticket.device?.serial_number || 'N/A'}
                    </TableCell>
                    <TableCell>{ticket.fault_category}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[ticket.status as RepairStatusEnum] || ''}>
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{ticket.reported_by}</TableCell>
                    <TableCell>
                      {format(new Date(ticket.reported_date), 'PP')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedTicket(ticket)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTickets?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No repair tickets found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Repair Ticket #{selectedTicket?.ticket_number}</DialogTitle>
            <DialogDescription>
              Device: {selectedTicket?.device?.serial_number}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              {/* Fault Info */}
              <div>
                <h4 className="font-medium mb-2">Fault Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Category</span>
                    <p className="font-medium">{selectedTicket.fault_category}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Severity</span>
                    <p className="font-medium">{selectedTicket.fault_severity || 'Not specified'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">Description</span>
                    <p className="font-medium">{selectedTicket.fault_description || 'No description'}</p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h4 className="font-medium mb-2">Status</h4>
                <Badge className={statusColors[selectedTicket.status as RepairStatusEnum] || ''}>
                  {selectedTicket.status}
                </Badge>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="font-medium mb-2">Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reported</span>
                    <span>{format(new Date(selectedTicket.reported_date), 'PPp')}</span>
                  </div>
                  {selectedTicket.assessment_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assessed</span>
                      <span>{format(new Date(selectedTicket.assessment_date), 'PPp')}</span>
                    </div>
                  )}
                  {selectedTicket.repair_start_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Repair Started</span>
                      <span>{format(new Date(selectedTicket.repair_start_date), 'PPp')}</span>
                    </div>
                  )}
                  {selectedTicket.repair_end_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Repair Completed</span>
                      <span>{format(new Date(selectedTicket.repair_end_date), 'PPp')}</span>
                    </div>
                  )}
                  {selectedTicket.quality_check_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quality Check</span>
                      <span>{format(new Date(selectedTicket.quality_check_date), 'PPp')}</span>
                    </div>
                  )}
                  {selectedTicket.returned_to_stock_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Returned to Stock</span>
                      <span>{format(new Date(selectedTicket.returned_to_stock_date), 'PPp')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assessment */}
              {selectedTicket.assessment_notes && (
                <div>
                  <h4 className="font-medium mb-2">Assessment</h4>
                  <p className="text-sm">{selectedTicket.assessment_notes}</p>
                  {selectedTicket.is_repairable !== null && (
                    <Badge variant={selectedTicket.is_repairable ? 'default' : 'destructive'} className="mt-2">
                      {selectedTicket.is_repairable ? 'Repairable' : 'Not Repairable'}
                    </Badge>
                  )}
                </div>
              )}

              {/* Repair Details */}
              {selectedTicket.repair_actions && (
                <div>
                  <h4 className="font-medium mb-2">Repair Actions</h4>
                  <p className="text-sm">{selectedTicket.repair_actions}</p>
                  {selectedTicket.parts_used && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Parts used: {selectedTicket.parts_used}
                    </p>
                  )}
                  {selectedTicket.repair_cost && (
                    <p className="text-sm text-muted-foreground">
                      Cost: R{selectedTicket.repair_cost}
                    </p>
                  )}
                </div>
              )}

              {/* Quality Check */}
              {selectedTicket.quality_check_notes && (
                <div>
                  <h4 className="font-medium mb-2">Quality Check</h4>
                  <p className="text-sm">{selectedTicket.quality_check_notes}</p>
                  <Badge
                    variant={selectedTicket.quality_check_passed ? 'default' : 'destructive'}
                    className="mt-2"
                  >
                    {selectedTicket.quality_check_passed ? 'Passed' : 'Failed'}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
