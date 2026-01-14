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
import { Search, Filter, Eye, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';

const STATUSES = ['pending', 'received', 'in_stock', 'reserved', 'exported', 'damaged'];

export default function Inventory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.InventoryItem.list('-created_date')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InventoryItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  const logActivity = async (action, details) => {
    const user = await base44.auth.me();
    await base44.entities.ActivityLog.create({
      action,
      entity_type: 'inventory',
      entity_id: selectedItem?.id,
      details,
      user_name: user.full_name,
      user_email: user.email
    });
  };

  const handleAdjustment = async () => {
    if (!adjustmentQty || !adjustmentReason) return;

    const qty = parseFloat(adjustmentQty);
    const currentQty = selectedItem.quantity || 0;
    const newQty = adjustmentType === 'add' ? currentQty + qty : currentQty - qty;

    if (newQty < 0) {
      alert('Quantity cannot be negative');
      return;
    }

    await updateMutation.mutateAsync({
      id: selectedItem.id,
      data: { ...selectedItem, quantity: newQty }
    });

    await logActivity(
      `Inventory ${adjustmentType === 'add' ? 'Increase' : 'Decrease'}`,
      `${adjustmentType === 'add' ? 'Added' : 'Removed'} ${qty} units of ${selectedItem.product_name}. Reason: ${adjustmentReason}`
    );

    setAdjustOpen(false);
    setAdjustmentQty('');
    setAdjustmentReason('');
  };

  const openAdjustment = (item, type) => {
    setSelectedItem(item);
    setAdjustmentType(type);
    setAdjustOpen(true);
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const viewDetails = (item) => {
    setSelectedItem(item);
    setDetailsOpen(true);
  };

  const columns = [
    { header: 'SKU', accessor: 'sku', cell: (row) => (
      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{row.sku}</span>
    )},
    { header: 'Product', accessor: 'product_name', cell: (row) => (
      <span className="font-medium text-slate-900">{row.product_name}</span>
    )},
    { header: 'Quantity', accessor: 'quantity', cell: (row) => (
      <span className="font-semibold">{row.quantity}</span>
    )},
    { header: 'Status', accessor: 'status', cell: (row) => (
      <StatusBadge status={row.status} />
    )},
    { header: 'Location', accessor: 'location', cell: (row) => row.location || '-' },
    { header: 'Unit Cost', accessor: 'unit_cost', cell: (row) => (
      row.unit_cost ? `$${row.unit_cost.toFixed(2)}` : '-'
    )},
    { header: 'Date', accessor: 'created_date', cell: (row) => (
      format(new Date(row.created_date), 'MMM d, yyyy')
    )},
    { header: '', cell: (row) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => openAdjustment(row, 'add')} title="Add stock">
          <Plus className="h-4 w-4 text-green-600" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => openAdjustment(row, 'subtract')} title="Remove stock">
          <Minus className="h-4 w-4 text-red-600" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => viewDetails(row)}>
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    )}
  ];

  const totalValue = filteredInventory.reduce((sum, item) => 
    sum + (item.quantity * (item.unit_cost || 0)), 0
  );

  return (
    <div>
      <PageHeader 
        title="Inventory" 
        description="View and manage all inventory items"
      />

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by product or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Items</p>
          <p className="text-2xl font-semibold text-slate-900">{filteredInventory.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Quantity</p>
          <p className="text-2xl font-semibold text-slate-900">
            {filteredInventory.reduce((sum, item) => sum + (item.quantity || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Value</p>
          <p className="text-2xl font-semibold text-slate-900">${totalValue.toLocaleString()}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredInventory}
        loading={isLoading}
        emptyMessage="No inventory items found"
      />

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inventory Item Details</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Product</Label>
                  <p className="font-medium">{selectedItem.product_name}</p>
                </div>
                <div>
                  <Label className="text-slate-500">SKU</Label>
                  <p className="font-mono">{selectedItem.sku}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Quantity</Label>
                  <p className="font-semibold">{selectedItem.quantity}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Status</Label>
                  <div className="mt-1"><StatusBadge status={selectedItem.status} /></div>
                </div>
                <div>
                  <Label className="text-slate-500">Location</Label>
                  <p>{selectedItem.location || '-'}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Unit Cost</Label>
                  <p>{selectedItem.unit_cost ? `$${selectedItem.unit_cost.toFixed(2)}` : '-'}</p>
                </div>
              </div>
              {selectedItem.notes && (
                <div>
                  <Label className="text-slate-500">Notes</Label>
                  <p className="text-sm">{selectedItem.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === 'add' ? 'Add' : 'Remove'} Stock
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-500">Product</Label>
                <p className="font-medium">{selectedItem.product_name}</p>
                <p className="text-sm text-slate-500">Current Quantity: {selectedItem.quantity}</p>
              </div>
              <div>
                <Label>Quantity to {adjustmentType === 'add' ? 'Add' : 'Remove'}</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>
              <div>
                <Label>Reason for Adjustment</Label>
                <Input
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="e.g., Physical count correction, damaged units, etc."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAdjustment}
              disabled={!adjustmentQty || !adjustmentReason}
            >
              Confirm {adjustmentType === 'add' ? 'Addition' : 'Removal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}