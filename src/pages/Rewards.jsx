import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Search, Filter, Pencil, Trash2, TrendingUp, DollarSign, Award } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Rewards() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [formData, setFormData] = useState({
    source: '',
    type: 'cashback',
    amount: '',
    currency: 'USD',
    order_number: '',
    date_earned: format(new Date(), 'yyyy-MM-dd'),
    date_redeemed: '',
    status: 'pending',
    notes: ''
  });

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => base44.entities.Reward.list('-date_earned')
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Reward.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast.success('Reward added');
      setDialogOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Reward.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast.success('Reward updated');
      setDialogOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Reward.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast.success('Reward deleted');
    }
  });

  const openDialog = (reward = null) => {
    if (reward) {
      setEditingReward(reward);
      setFormData({
        source: reward.source || '',
        type: reward.type || 'cashback',
        amount: reward.amount || '',
        currency: reward.currency || 'USD',
        order_number: reward.order_number || '',
        date_earned: reward.date_earned || format(new Date(), 'yyyy-MM-dd'),
        date_redeemed: reward.date_redeemed || '',
        status: reward.status || 'pending',
        notes: reward.notes || ''
      });
    } else {
      setEditingReward(null);
      setFormData({
        source: '',
        type: 'cashback',
        amount: '',
        currency: 'USD',
        order_number: '',
        date_earned: format(new Date(), 'yyyy-MM-dd'),
        date_redeemed: '',
        status: 'pending',
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      amount: parseFloat(formData.amount),
      date_redeemed: formData.date_redeemed || null
    };

    if (editingReward) {
      updateMutation.mutate({ id: editingReward.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (reward) => {
    if (confirm('Are you sure you want to delete this reward?')) {
      deleteMutation.mutate(reward.id);
    }
  };

  const markAsRedeemed = async (reward) => {
    await base44.entities.Reward.update(reward.id, {
      status: 'redeemed',
      date_redeemed: format(new Date(), 'yyyy-MM-dd')
    });
    queryClient.invalidateQueries({ queryKey: ['rewards'] });
    toast.success('Reward marked as redeemed');
  };

  const filteredRewards = rewards.filter(reward => {
    const matchesSearch = 
      reward.source?.toLowerCase().includes(search.toLowerCase()) ||
      reward.order_number?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || reward.status === statusFilter;
    const matchesType = typeFilter === 'all' || reward.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const columns = [
    { header: 'Source', accessor: 'source', cell: (row) => (
      <span className="font-medium">{row.source}</span>
    )},
    { header: 'Type', accessor: 'type', cell: (row) => (
      <div className="flex items-center gap-2">
        {row.type === 'cashback' && <DollarSign className="h-4 w-4 text-green-600" />}
        {row.type === 'points' && <Award className="h-4 w-4 text-blue-600" />}
        {row.type === 'loyalty_rewards' && <TrendingUp className="h-4 w-4 text-purple-600" />}
        <span className="text-sm capitalize">{row.type.replace('_', ' ')}</span>
      </div>
    )},
    { header: 'Amount', accessor: 'amount', cell: (row) => (
      <span className="font-semibold">
        {row.currency === 'USD' ? `$${row.amount?.toFixed(2)}` : `${row.amount} pts`}
      </span>
    )},
    { header: 'Order #', accessor: 'order_number', cell: (row) => (
      <span className="text-sm">{row.order_number || '-'}</span>
    )},
    { header: 'Date Earned', accessor: 'date_earned', cell: (row) => (
      row.date_earned ? format(new Date(row.date_earned), 'MMM d, yyyy') : '-'
    )},
    { header: 'Status', accessor: 'status', cell: (row) => (
      <StatusBadge status={row.status} />
    )},
    { header: '', cell: (row) => (
      <div className="flex items-center gap-1">
        {row.status === 'earned' && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => markAsRedeemed(row)}
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
          >
            Redeem
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => openDialog(row)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(row)}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    )}
  ];

  const totalEarned = filteredRewards
    .filter(r => r.status === 'earned' && r.currency === 'USD')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const totalRedeemed = filteredRewards
    .filter(r => r.status === 'redeemed' && r.currency === 'USD')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const totalPoints = filteredRewards
    .filter(r => r.status === 'earned' && r.currency === 'points')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div>
      <PageHeader 
        title="Rewards & Cashback" 
        description="Track points, cashback, and loyalty rewards"
        actions={
          <Button onClick={() => openDialog()} className="bg-black hover:bg-gray-800 text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Reward
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-700 font-medium">Cashback Earned</p>
          </div>
          <p className="text-2xl font-bold text-green-900">${totalEarned.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-700 font-medium">Points Available</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">{totalPoints.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <p className="text-sm text-purple-700 font-medium">Total Redeemed</p>
          </div>
          <p className="text-2xl font-bold text-purple-900">${totalRedeemed.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search rewards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="cashback">Cashback</SelectItem>
            <SelectItem value="points">Points</SelectItem>
            <SelectItem value="loyalty_rewards">Loyalty</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="earned">Earned</SelectItem>
            <SelectItem value="redeemed">Redeemed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredRewards}
        loading={isLoading}
        emptyMessage="No rewards found"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingReward ? 'Edit Reward' : 'Add Reward'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Source (Credit Card or Retailer) *</Label>
              <Input
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="e.g., Chase Sapphire, Amazon Rewards"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashback">Cashback</SelectItem>
                    <SelectItem value="points">Points</SelectItem>
                    <SelectItem value="loyalty_rewards">Loyalty Rewards</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Currency *</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="points">Points</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder={formData.currency === 'USD' ? '0.00' : '0'}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Order Number</Label>
              <Input
                value={formData.order_number}
                onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                placeholder="Optional reference"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date Earned *</Label>
                <Input
                  type="date"
                  value={formData.date_earned}
                  onChange={(e) => setFormData({ ...formData, date_earned: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="earned">Earned</SelectItem>
                    <SelectItem value="redeemed">Redeemed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.status === 'redeemed' && (
              <div className="space-y-2">
                <Label>Date Redeemed</Label>
                <Input
                  type="date"
                  value={formData.date_redeemed}
                  onChange={(e) => setFormData({ ...formData, date_redeemed: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-black hover:bg-gray-800 text-white">
                {editingReward ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}