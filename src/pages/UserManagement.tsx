import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, UserRole, ApprovalStatus } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Home, Users, UserCheck, UserX, Clock, Search, ChevronUp, ChevronDown, Building2 } from 'lucide-react';
import { DonutChart, HorizontalBarChart, CHART_PALETTE } from '@/components/charts';
import { Skeleton } from '@/components/ui/skeleton';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface UserProfileAdmin {
  id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  role: UserRole;
  approval_status: ApprovalStatus;
  warehouse: string | null;
  created_at: string;
}

type SortField = 'full_name' | 'email' | 'created_at' | 'approval_status' | 'role';
type SortDirection = 'asc' | 'desc';

export default function UserManagement() {
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfileAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [userToRevoke, setUserToRevoke] = useState<UserProfileAdmin | null>(null);

  // Role selection dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<{ userId: string; userName: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (
    userId: string,
    updates: { approval_status?: ApprovalStatus; role?: UserRole }
  ) => {
    try {
      const updateData: Record<string, unknown> = { ...updates };

      if (updates.approval_status === 'approved') {
        updateData.approved_by = profile?.id;
        updateData.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User updated successfully',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  // Handle approval status change with role prompt
  const handleApprovalChange = (user: UserProfileAdmin, newStatus: ApprovalStatus) => {
    if (newStatus === 'approved' && user.approval_status !== 'approved') {
      // Show role selection dialog
      setPendingApproval({ userId: user.id, userName: user.full_name || user.email });
      setSelectedRole(user.role || 'user');
      setRoleDialogOpen(true);
    } else {
      updateUserStatus(user.id, { approval_status: newStatus });
    }
  };

  // Confirm approval with selected role
  const confirmApprovalWithRole = async () => {
    if (!pendingApproval) return;

    await updateUserStatus(pendingApproval.userId, {
      approval_status: 'approved',
      role: selectedRole,
    });

    setRoleDialogOpen(false);
    setPendingApproval(null);
    setSelectedRole('user');
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = users.length;
    const approved = users.filter(u => u.approval_status === 'approved').length;
    const pending = users.filter(u => u.approval_status === 'pending').length;
    const rejected = users.filter(u => u.approval_status === 'rejected').length;

    const byRole = users.reduce((acc, user) => {
      const role = user.role || 'user';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCompany = users.reduce((acc, user) => {
      const company = user.company || 'Unknown';
      acc[company] = (acc[company] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, approved, pending, rejected, byRole, byCompany };
  }, [users]);

  // Sorting and filtering
  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    // Apply status filter
    if (filter !== 'all') {
      result = result.filter(u => u.approval_status === filter);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(u =>
        (u.full_name?.toLowerCase().includes(term)) ||
        u.email.toLowerCase().includes(term) ||
        (u.company?.toLowerCase().includes(term))
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'full_name':
          aVal = a.full_name || a.email;
          bVal = b.full_name || b.email;
          break;
        case 'email':
          aVal = a.email;
          bVal = b.email;
          break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case 'approval_status':
          aVal = a.approval_status;
          bVal = b.approval_status;
          break;
        case 'role':
          aVal = a.role;
          bVal = b.role;
          break;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }
      return sortDirection === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
    });

    return result;
  }, [users, filter, searchTerm, sortField, sortDirection]);

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
      <ChevronUp className="h-4 w-4 inline ml-1" /> :
      <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

  const handleRevokeClick = (user: UserProfileAdmin) => {
    setUserToRevoke(user);
    setRevokeDialogOpen(true);
  };

  const confirmRevoke = async () => {
    if (!userToRevoke) return;
    await updateUserStatus(userToRevoke.id, { approval_status: 'rejected' });
    setRevokeDialogOpen(false);
    setUserToRevoke(null);
  };

  const getStatusBadgeVariant = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'back_office': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage user access, roles, and approvals
            </p>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold animate-count-up">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Registered accounts</p>
              </CardContent>
            </Card>

            <Card className="card-hover border-green-200 dark:border-green-900">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 animate-count-up">{stats.approved}</div>
                <p className="text-xs text-muted-foreground">Active users</p>
              </CardContent>
            </Card>

            <Card className={`card-hover ${stats.pending > 0 ? 'border-yellow-400 dark:border-yellow-600' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600 animate-count-up">{stats.pending}</div>
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                <UserX className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 animate-count-up">{stats.rejected}</div>
                <p className="text-xs text-muted-foreground">Access denied</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <DonutChart
              title="Users by Role"
              description="Distribution of system access rights"
              data={Object.entries(stats.byRole).map(([role, count]) => ({
                name: role === 'back_office' ? 'Back Office' : role.charAt(0).toUpperCase() + role.slice(1),
                value: count,
              }))}
              height={220}
              innerRadius={40}
              outerRadius={70}
            />

            <HorizontalBarChart
              title="Users by Company"
              description="Organization breakdown"
              data={Object.entries(stats.byCompany)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([company, count]) => ({
                  name: company.length > 20 ? company.slice(0, 20) + '...' : company,
                  value: count,
                }))}
              color={CHART_PALETTE[1]}
              height={220}
            />
          </div>

          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <div className="ml-auto text-sm text-muted-foreground">
                  Showing {filteredAndSortedUsers.length} of {users.length} users
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inline Editing Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Directory
              </CardTitle>
              <CardDescription>
                Click on dropdowns to change approval status or system rights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead
                        className="cursor-pointer hover:bg-muted/80 w-[200px]"
                        onClick={() => handleSort('full_name')}
                      >
                        User <SortIcon field="full_name" />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/80"
                        onClick={() => handleSort('email')}
                      >
                        Email <SortIcon field="email" />
                      </TableHead>
                      <TableHead className="w-[120px]">Company</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/80 w-[140px]"
                        onClick={() => handleSort('approval_status')}
                      >
                        Approval Status <SortIcon field="approval_status" />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/80 w-[140px]"
                        onClick={() => handleSort('role')}
                      >
                        System Rights <SortIcon field="role" />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/80 w-[100px]"
                        onClick={() => handleSort('created_at')}
                      >
                        Joined <SortIcon field="created_at" />
                      </TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedUsers.map((user) => (
                        <TableRow
                          key={user.id}
                          className={`
                            ${user.approval_status === 'pending' ? 'bg-yellow-50/50 dark:bg-yellow-950/20' : ''}
                            ${user.id === profile?.id ? 'bg-primary/5' : ''}
                          `}
                        >
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="truncate max-w-[180px]">
                                {user.full_name || 'No name'}
                              </span>
                              {user.id === profile?.id && (
                                <Badge variant="outline" className="text-[10px] w-fit mt-0.5">You</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <span className="truncate block max-w-[200px]">{user.email}</span>
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="truncate block max-w-[100px]" title={user.company || undefined}>
                              {user.company || '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.approval_status}
                              onValueChange={(v) => handleApprovalChange(user, v as ApprovalStatus)}
                              disabled={user.id === profile?.id}
                            >
                              <SelectTrigger className="h-8 text-xs w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                    Pending
                                  </div>
                                </SelectItem>
                                <SelectItem value="approved">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    Approved
                                  </div>
                                </SelectItem>
                                <SelectItem value="rejected">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    Rejected
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(v) => updateUserStatus(user.id, { role: v as UserRole })}
                              disabled={user.approval_status !== 'approved' || user.id === profile?.id}
                            >
                              <SelectTrigger
                                className={`h-8 text-xs w-[120px] ${user.approval_status !== 'approved' ? 'opacity-50' : ''}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-3 w-3" />
                                    User
                                  </div>
                                </SelectItem>
                                <SelectItem value="back_office">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-3 w-3" />
                                    Back Office
                                  </div>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <UserCheck className="h-3 w-3" />
                                    Admin
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {user.approval_status === 'approved' && user.id !== profile?.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleRevokeClick(user)}
                              >
                                Revoke
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Role Selection Dialog (shown when approving) */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign System Rights</DialogTitle>
            <DialogDescription>
              Select the appropriate system rights for <strong>{pendingApproval?.userName}</strong> before approving their access.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">System Rights</label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <div>
                      <div className="font-medium">User</div>
                      <div className="text-xs text-muted-foreground">Standard access to view data</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="back_office">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Back Office</div>
                      <div className="text-xs text-muted-foreground">Can manage inventory and orders</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Admin</div>
                      <div className="text-xs text-muted-foreground">Full system access including user management</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmApprovalWithRole}>
              Approve with {selectedRole === 'back_office' ? 'Back Office' : selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Rights
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Access Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke User Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access for <strong>{userToRevoke?.full_name || userToRevoke?.email}</strong> and set their status to "rejected". They will no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevoke} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
