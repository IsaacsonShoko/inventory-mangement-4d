import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, Search, Filter, Download, RefreshCw, Loader2, User, Calendar
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

import { stockCountSupabaseService } from '@/services/stockCountSupabaseService';
import { useAuth } from '@/hooks/useAuth';
import { CountType } from '@/types/stock';

const StockCountsReport = () => {
  const { user, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [countTypeFilter, setCountTypeFilter] = useState<CountType | 'all'>('all');
  const [periodFilter, setPeriodFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  // Fetch stock counts - RLS will filter based on user role
  const { data: stockCounts = [], isLoading, refetch } = useQuery({
    queryKey: ['stockCountsReport', countTypeFilter, periodFilter, userFilter],
    queryFn: () => stockCountSupabaseService.getStockCountsForReport({
      countType: countTypeFilter === 'all' ? undefined : countTypeFilter,
      countPeriod: periodFilter || undefined,
      userEmail: userFilter || undefined,
    }),
  });

  // Get unique values for filters
  const uniquePeriods = useMemo(() => {
    const periods = [...new Set(stockCounts.map(c => c.countPeriod).filter(Boolean))];
    return periods.sort().reverse();
  }, [stockCounts]);

  const uniqueUsers = useMemo(() => {
    const users = [...new Set(stockCounts.map(c => c.userEmail).filter(Boolean))];
    return users.sort();
  }, [stockCounts]);

  // Filter by search term
  const filteredCounts = useMemo(() => {
    if (!searchTerm) return stockCounts;
    const term = searchTerm.toLowerCase();
    return stockCounts.filter(item =>
      item.deviceType.toLowerCase().includes(term) ||
      item.itemDescription.toLowerCase().includes(term) ||
      item.userEmail?.toLowerCase().includes(term)
    );
  }, [stockCounts, searchTerm]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Device Type', 'Item Code', 'Description', 'Category', 'Nature',
      'Quantity', 'Status', 'Count Type', 'Period', 'User', 'Created At'
    ];

    const rows = filteredCounts.map(item => [
      item.deviceType,
      item.itemCode,
      item.itemDescription,
      item.itemCategory,
      item.itemNature,
      item.quantity,
      item.itemStatus,
      item.countType,
      item.countPeriod || '',
      item.userEmail || '',
      item.createdAt || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-counts-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading stock counts...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Stock Counts Report</h1>
          {!isAdmin && (
            <Badge variant="secondary">My Counts Only</Badge>
          )}
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Count Type</Label>
              <Select
                value={countTypeFilter}
                onValueChange={(value) => setCountTypeFilter(value as CountType | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Mid-Month">Mid-Month</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select
                value={periodFilter}
                onValueChange={(value) => setPeriodFilter(value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Periods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  {uniquePeriods.map((period) => (
                    <SelectItem key={period} value={period!}>
                      {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <Label>User</Label>
                <Select
                  value={userFilter}
                  onValueChange={(value) => setUserFilter(value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <User className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {uniqueUsers.map((email) => (
                      <SelectItem key={email} value={email!}>
                        {email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearchTerm('');
                  setCountTypeFilter('all');
                  setPeriodFilter('');
                  setUserFilter('');
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredCounts.length}</div>
            <div className="text-sm text-muted-foreground">Total Counts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {filteredCounts.reduce((sum, c) => sum + c.quantity, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Quantity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {new Set(filteredCounts.map(c => c.deviceType)).size}
            </div>
            <div className="text-sm text-muted-foreground">Unique Devices</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {new Set(filteredCounts.map(c => c.userEmail)).size}
            </div>
            <div className="text-sm text-muted-foreground">Users</div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Counts Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Stock Counts</CardTitle>
            <div className="text-sm text-muted-foreground">
              {filteredCounts.length} {filteredCounts.length === 1 ? 'count' : 'counts'}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Device Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Count Type</TableHead>
                  <TableHead>Period</TableHead>
                  {isAdmin && <TableHead>User</TableHead>}
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCounts.length > 0 ? (
                  filteredCounts.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.deviceType}</TableCell>
                      <TableCell>{item.itemDescription}</TableCell>
                      <TableCell>{item.itemCategory}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={
                          item.countType === 'Daily' ? 'default' :
                          item.countType === 'Mid-Month' ? 'secondary' : 'outline'
                        }>
                          {item.countType}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.countPeriod || '-'}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-sm">{item.userEmail || '-'}</TableCell>
                      )}
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.itemStatus === 'In Stock'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.itemStatus || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      No stock counts found. Try adjusting your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockCountsReport;
