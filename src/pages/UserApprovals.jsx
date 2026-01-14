import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, X, UserCheck, Clock, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function UserApprovals() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [notes, setNotes] = useState('');
  const [role, setRole] = useState('user');

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ['approvals'],
    queryFn: () => base44.entities.UserApproval.list('-created_date')
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.UserApproval.update(id, data);
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast.success(data.status === 'approved' ? 'User approved' : 'User rejected');
      setDialogOpen(false);
      await logActivity(
        data.status === 'approved' ? 'Approved user' : 'Rejected user',
        'user',
        selectedApproval.user_email
      );
    }
  });

  const logActivity = async (action, entityType, details) => {
    const user = await base44.auth.me();
    await base44.entities.ActivityLog.create({
      action,
      entity_type: entityType,
      details,
      user_name: user.full_name,
      user_email: user.email
    });
  };

  const openApproveDialog = (approval) => {
    setSelectedApproval(approval);
    setRole(approval.requested_role || 'user');
    setNotes('');
    setDialogOpen(true);
  };

  const handleApprove = async () => {
    const user = await base44.auth.me();
    updateMutation.mutate({
      id: selectedApproval.id,
      data: {
        status: 'approved',
        approved_by: user.email,
        approved_at: new Date().toISOString(),
        notes
      }
    });
  };

  const handleReject = async (approval) => {
    if (confirm('Are you sure you want to reject this user?')) {
      const user = await base44.auth.me();
      updateMutation.mutate({
        id: approval.id,
        data: {
          status: 'rejected',
          approved_by: user.email,
          approved_at: new Date().toISOString()
        }
      });
    }
  };

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const processedApprovals = approvals.filter(a => a.status !== 'pending');

  return (
    <div>
      <PageHeader 
        title="User Approvals" 
        description="Approve or reject new user requests"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-xl font-semibold">{pendingApprovals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Approved</p>
                <p className="text-xl font-semibold">{approvals.filter(a => a.status === 'approved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Rejected</p>
                <p className="text-xl font-semibold">{approvals.filter(a => a.status === 'rejected').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Pending Approvals</h2>
        {pendingApprovals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UserCheck className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No pending approvals</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingApprovals.map(approval => (
              <Card key={approval.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-medium">{approval.user_name}</p>
                      <p className="text-sm text-slate-500">{approval.user_email}</p>
                    </div>
                    <StatusBadge status={approval.requested_role} />
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    Requested {format(new Date(approval.created_date), 'MMM d, yyyy')}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleReject(approval)}
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => openApproveDialog(approval)}
                    >
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Processed Approvals */}
      <div>
        <h2 className="text-lg font-semibold mb-4">History</h2>
        {processedApprovals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-slate-500">No approval history</p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y">
            {processedApprovals.map(approval => (
              <div key={approval.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{approval.user_name}</p>
                  <p className="text-sm text-slate-500">{approval.user_email}</p>
                </div>
                <div className="text-right">
                  <StatusBadge status={approval.status} />
                  <p className="text-xs text-slate-400 mt-1">
                    {approval.approved_at && format(new Date(approval.approved_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve User</DialogTitle>
          </DialogHeader>
          {selectedApproval && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedApproval.user_name}</p>
                <p className="text-sm text-slate-500">{selectedApproval.user_email}</p>
              </div>
              <div className="space-y-2">
                <Label>Assign Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about this approval..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700">
              <Check className="h-4 w-4 mr-2" /> Approve User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}