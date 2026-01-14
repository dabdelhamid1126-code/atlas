import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Search, Pencil, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function FixReceiving() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    quantity: 0,
    status: '',
    location: '',
    notes: ''
  });

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.InventoryItem.list('-created_date')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InventoryItem.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Inventory item updated');
      setDialogOpen(false);
      await logActivity('Fixed receiving error', 'inventory', selectedItem.product_name);
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

  const openEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      quantity: item.quantity || 0,
      status: item.status || 'in_stock',
      location: item.location || '',
      notes: item.notes || ''
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      id: selectedItem.id,
      data: formData
    });
  };

  const filteredInventory = inventory.filter(item =>
    item.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { header: 'SKU', accessor: 'sku', cell: (row) => (
      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{row.sku}</span>
    )},
    { header: 'Product', accessor: 'product_name', cell: (row) => (
      <span className="font-medium">{row.product_name}</span>
    )},
    { header: 'Quantity', accessor: 'quantity' },
    { header: 'Status', accessor: 'status', cell: (row) => (
      <StatusBadge status={row.status} />
    )},
    { header: 'Location', accessor: 'location', cell: (row) => row.location || '-' },
    { header: 'Received', accessor: 'created_date', cell: (row) => (
      format(new Date(row.created_date), 'MMM d, yyyy')
    )},
    { header: '', cell: (row) => (
      <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
        <Pencil className="h-4 w-4" />
      </Button>
    )}
  ];

  return (
    <div>
      <PageHeader 
        title="Fix Receiving" 
        description="Correct receiving errors and adjust inventory"
      />

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Admin/Manager Access</p>
          <p className="text-sm text-amber-700">Changes made here are logged and auditable. Use with caution.</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search inventory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredInventory}
        loading={isLoading}
        emptyMessage="No inventory items found"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fix Inventory Item</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedItem.product_name}</p>
                <p className="text-sm text-slate-500">SKU: {selectedItem.sku}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="in_stock">In Stock</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="exported">Exported</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Warehouse location"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Reason for adjustment..."
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-black hover:bg-gray-800 text-white">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}