import { useState, useEffect } from 'react';
import { useAuth, UserRole, ApprovalStatus } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
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

interface UserProfileAdmin {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  approval_status: ApprovalStatus;
  warehouse: string | null;
  created_at: string;
}

export default function UserManagement() {
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfileAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [userToRevoke, setUserToRevoke] = useState<UserProfileAdmin | null>(null);

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
      const updateData: any = { ...updates };

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

  const filteredUsers = users.filter((user) => {
    if (filter === 'all') return true;
    return user.approval_status === filter;
  });

  const pendingCount = users.filter((u) => u.approval_status === 'pending').length;

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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground mt-2">
              Approve pending user signups, manage user roles, and control system access. Users who sign up are placed in "pending" status until approved.
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-lg px-4 py-2">
              {pendingCount} Pending Approval{pendingCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className={user.approval_status === 'pending' ? 'border-yellow-400 border-2' : ''}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{user.full_name || 'No name'}</CardTitle>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant={
                        user.approval_status === 'approved'
                          ? 'default'
                          : user.approval_status === 'pending'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {user.approval_status}
                    </Badge>
                    <Badge variant="outline">{user.role}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-center">
                  {/* Role selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Role:</span>
                    <Select
                      value={user.role}
                      onValueChange={(value) => updateUserStatus(user.id, { role: value as UserRole })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="back_office">Back Office</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 ml-auto">
                    {user.approval_status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateUserStatus(user.id, { approval_status: 'approved' })}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateUserStatus(user.id, { approval_status: 'rejected' })}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {user.approval_status === 'rejected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateUserStatus(user.id, { approval_status: 'approved' })}
                      >
                        Approve
                      </Button>
                    )}
                    {user.approval_status === 'approved' && user.id !== profile?.id && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRevokeClick(user)}
                      >
                        Revoke Access
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-2">
                  Joined: {new Date(user.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">No users found</div>
          )}
        </div>
      )}

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
