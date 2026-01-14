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
import { Plus, Search, Eye, EyeOff, Pencil, Trash2, Filter } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';

const BRANDS = ['Amazon', 'Apple', 'Google Play', 'Target', 'Walmart', 'Best Buy', 'eBay', 'Visa', 'Mastercard', 'Other'];

export default function GiftCards() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [showCode, setShowCode] = useState({});
  const [formData, setFormData] = useState({
    brand: '',
    retailer: '',
    value: '',
    code: '',
    pin: '',
    purchase_cost: '',
    status: 'available',
    notes: ''
  });
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState('');

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['giftCards'],
    queryFn: async () => {
      const data = await base44.entities.GiftCard.list('-created_date');
      return data.sort((a, b) => (a.retailer || '').localeCompare(b.retailer || ''));
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.GiftCard.create(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      toast.success('Gift card added');
      setDialogOpen(false);
      await logActivity('Added gift card', 'gift_card', `${formData.brand} $${formData.value}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GiftCard.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      toast.success('Gift card updated');
      setDialogOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GiftCard.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      toast.success('Gift card deleted');
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

  const openDialog = (card = null) => {
    if (card) {
      setEditingCard(card);
      setFormData({
        brand: card.brand || '',
        retailer: card.retailer || '',
        value: card.value || '',
        code: card.code || '',
        pin: card.pin || '',
        purchase_cost: card.purchase_cost || '',
        status: card.status || 'available',
        notes: card.notes || ''
      });
    } else {
      setEditingCard(null);
      setFormData({
        brand: '',
        retailer: '',
        value: '',
        code: '',
        pin: '',
        purchase_cost: '',
        status: 'available',
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      value: parseFloat(formData.value),
      purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null
    };

    if (editingCard) {
      updateMutation.mutate({ id: editingCard.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = async (card) => {
    if (confirm('Are you sure you want to delete this gift card?')) {
      deleteMutation.mutate(card.id);
      await logActivity('Deleted gift card', 'gift_card', `${card.brand} $${card.value}`);
    }
  };

  const toggleShowCode = (id) => {
    setShowCode({ ...showCode, [id]: !showCode[id] });
  };

  const maskCode = (code) => {
    if (!code) return '-';
    return code.slice(0, 4) + '****' + code.slice(-4);
  };

  const handleBulkAdd = async () => {
    try {
      const lines = bulkInput.trim().split('\n').filter(l => l.trim());
      const cards = lines.map(line => {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 3) throw new Error('Invalid format');
        return {
          brand: parts[0],
          retailer: parts[1],
          value: parseFloat(parts[2]),
          code: parts[3] || '',
          pin: parts[4] || '',
          purchase_cost: parts[5] ? parseFloat(parts[5]) : null,
          status: 'available'
        };
      });
      
      await base44.entities.GiftCard.bulkCreate(cards);
      queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      toast.success(`Added ${cards.length} gift cards`);
      setBulkDialogOpen(false);
      setBulkInput('');
      await logActivity('Bulk added gift cards', 'gift_card', `Added ${cards.length} cards`);
    } catch (error) {
      toast.error('Error parsing bulk input. Check format.');
      console.error(error);
    }
  };

  const filteredCards = cards.filter(card => {
    const matchesSearch = 
      card.brand?.toLowerCase().includes(search.toLowerCase()) ||
      card.retailer?.toLowerCase().includes(search.toLowerCase()) ||
      card.code?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || card.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    { header: 'Brand', accessor: 'brand', cell: (row) => (
      <span className="font-medium">{row.brand}</span>
    )},
    { header: 'Retailer', accessor: 'retailer', cell: (row) => (
      <span className="text-sm">{row.retailer || '-'}</span>
    )},
    { header: 'Value', accessor: 'value', cell: (row) => (
      <span className="font-semibold">${row.value?.toFixed(2)}</span>
    )},
    { header: 'Code', accessor: 'code', cell: (row) => (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">
          {showCode[row.id] ? row.code : maskCode(row.code)}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleShowCode(row.id)}>
          {showCode[row.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
      </div>
    )},
    { header: 'Status', accessor: 'status', cell: (row) => (
      <StatusBadge status={row.status} />
    )},
    { header: 'Added', accessor: 'created_date', cell: (row) => (
      format(new Date(row.created_date), 'MMM d, yyyy')
    )},
    { header: '', cell: (row) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => openDialog(row)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(row)}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    )}
  ];

  const totalValue = filteredCards
    .filter(c => c.status === 'available')
    .reduce((sum, c) => sum + (c.value || 0), 0);

  return (
    <div>
      <PageHeader 
        title="Gift Cards" 
        description="Manage gift card inventory"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setBulkDialogOpen(true)} variant="outline" className="border-2 border-black">
              Bulk Add
            </Button>
            <Button onClick={() => openDialog()} className="bg-black hover:bg-gray-800 text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Card
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Cards</p>
          <p className="text-2xl font-semibold">{filteredCards.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Available Cards</p>
          <p className="text-2xl font-semibold">{filteredCards.filter(c => c.status === 'available').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Available Value</p>
          <p className="text-2xl font-semibold">${totalValue.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search gift cards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="exported">Exported</SelectItem>
            <SelectItem value="used">Used</SelectItem>
            <SelectItem value="invalid">Invalid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredCards}
        loading={isLoading}
        emptyMessage="No gift cards found"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Edit Gift Card' : 'Add Gift Card'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand *</Label>
                <Select value={formData.brand} onValueChange={(v) => setFormData({ ...formData, brand: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANDS.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Retailer</Label>
                <Input
                  value={formData.retailer}
                  onChange={(e) => setFormData({ ...formData, retailer: e.target.value })}
                  placeholder="Where purchased"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Value ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Purchase Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.purchase_cost}
                  onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Card Code *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>PIN</Label>
              <Input
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="exported">Exported</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="invalid">Invalid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-black hover:bg-gray-800 text-white">
                {editingCard ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Add Gift Cards</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-2">Format (one per line):</p>
              <code className="text-xs">Brand, Retailer, Value, Code, PIN, PurchaseCost</code>
              <p className="text-xs text-gray-600 mt-2">Example:</p>
              <code className="text-xs block mt-1">Amazon, Target, 100, AMZN1234, 5678, 92</code>
              <code className="text-xs block">Apple, Walmart, 50, APPL5678, , 46</code>
            </div>
            <div className="space-y-2">
              <Label>Paste Gift Cards</Label>
              <Textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                rows={10}
                placeholder="Paste cards here..."
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAdd} className="bg-black hover:bg-gray-800 text-white">
              Add Cards
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}