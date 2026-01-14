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
import { Plus, Search, Eye, Pencil, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DAMAGE_TYPES = ['physical', 'water', 'defective', 'missing_parts', 'other'];
const STATUSES = ['reported', 'assessed', 'written_off', 'repaired'];

export default function DamagedItems() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    product_name: '',
    sku: '',
    serial_number: '',
    quantity: 1,
    damage_type: 'physical',
    description: '',
    estimated_loss: '',
    status: 'reported',
    resolution: ''
  });

  const { data: damagedItems = [], isLoading } = useQuery({
    queryKey: ['damagedItems'],
    queryFn: () => base44.entities.DamagedItem.list('-created_date')
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.InventoryItem.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const item = await base44.entities.DamagedItem.create(data);
      // Update inventory status if linked
      if (data.inventory_item_id) {
        await base44.entities.InventoryItem.update(data.inventory_item_id, { status: 'damaged' });
      }
      return item;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['damagedItems'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Damaged item reported');
      setDialogOpen(false);
      await logActivity('Reported damaged item', 'inventory', formData.product_name);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DamagedItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damagedItems'] });
      toast.success('Damaged item updated');
      setDialogOpen(false);
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

  const openDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        product_name: item.product_name || '',
        sku: item.sku || '',
        serial_number: item.serial_number || '',
        quantity: item.quantity || 1,
        damage_type: item.damage_type || 'physical',
        description: item.description || '',
        estimated_loss: item.estimated_loss || '',
        status: item.status || 'reported',
        resolution: item.resolution || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        product_name: '',
        sku: '',
        serial_number: '',
        quantity: 1,
        damage_type: 'physical',
        description: '',
        estimated_loss: '',
        status: 'reported',
        resolution: ''
      });
    }
    setDialogOpen(true);
  };

  const viewDetails = (item) => {
    setSelectedItem(item);
    setDetailsOpen(true);
  };

  const handleInventorySelect = (inventoryId) => {
    const invItem = inventory.find(i => i.id === inventoryId);
    if (invItem) {
      setFormData({
        ...formData,
        inventory_item_id: inventoryId,
        product_name: invItem.product_name,
        sku: invItem.sku
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = await base44.auth.me();
    const data = {
      ...formData,
      estimated_loss: formData.estimated_loss ? parseFloat(formData.estimated_loss) : null,
      reported_by: user.email
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredItems = damagedItems.filter(item => {
    const matchesSearch = 
      item.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalLoss = damagedItems.reduce((sum, item) => sum + (item.estimated_loss || 0), 0);

  const columns = [
    { header: 'Product', accessor: 'product_name', cell: (row) => (
      <div>
        <span className="font-medium">{row.product_name}</span>
        {row.sku && <span className="text-xs text-slate-500 ml-2">({row.sku})</span>}
      </div>
    )},
    { header: 'Quantity', accessor: 'quantity' },
    { header: 'Damage Type', accessor: 'damage_type', cell: (row) => (
      <StatusBadge status={row.damage_type} />
    )},
    { header: 'Est. Loss', accessor: 'estimated_loss', cell: (row) => (
      row.estimated_loss ? `$${row.estimated_loss.toFixed(2)}` : '-'
    )},
    { header: 'Status', accessor: 'status', cell: (row) => (
      <StatusBadge status={row.status} />
    )},
    { header: 'Date', accessor: 'created_date', cell: (row) => (
      format(new Date(row.created_date), 'MMM d, yyyy')
    )},
    { header: '', cell: (row) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => viewDetails(row)}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => openDialog(row)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    )}
  ];

  return (
    <div>
      <PageHeader 
        title="Damaged Items" 
        description="Track and manage damaged inventory"
        actions={
          <Button onClick={() => openDialog()} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" /> Report Damage
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Reports</p>
          <p className="text-2xl font-semibold">{damagedItems.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Pending Assessment</p>
          <p className="text-2xl font-semibold">{damagedItems.filter(i => i.status === 'reported').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Est. Loss</p>
          <p className="text-2xl font-semibold text-red-600">${totalLoss.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search damaged items..."
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
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredItems}
        loading={isLoading}
        emptyMessage="No damaged items reported"
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Update Damaged Item' : 'Report Damaged Item'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingItem && (
              <div className="space-y-2">
                <Label>Select from Inventory (Optional)</Label>
                <Select onValueChange={handleInventorySelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select inventory item" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.filter(i => i.status !== 'damaged').map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.product_name} ({i.sku})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Damage Type</Label>
                <Select value={formData.damage_type} onValueChange={(v) => setFormData({ ...formData, damage_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAMAGE_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estimated Loss ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.estimated_loss}
                  onChange={(e) => setFormData({ ...formData, estimated_loss: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                rows={3}
              />
            </div>
            {editingItem && (
              <>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Resolution</Label>
                  <Textarea
                    value={formData.resolution}
                    onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                    rows={2}
                  />
                </div>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                {editingItem ? 'Update' : 'Report'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Damage Report Details</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Product</Label>
                  <p className="font-medium">{selectedItem.product_name}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Quantity</Label>
                  <p>{selectedItem.quantity}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Damage Type</Label>
                  <div className="mt-1"><StatusBadge status={selectedItem.damage_type} /></div>
                </div>
                <div>
                  <Label className="text-slate-500">Status</Label>
                  <div className="mt-1"><StatusBadge status={selectedItem.status} /></div>
                </div>
                <div>
                  <Label className="text-slate-500">Estimated Loss</Label>
                  <p className="font-semibold text-red-600">
                    {selectedItem.estimated_loss ? `$${selectedItem.estimated_loss.toFixed(2)}` : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Reported By</Label>
                  <p>{selectedItem.reported_by}</p>
                </div>
              </div>
              <div>
                <Label className="text-slate-500">Description</Label>
                <p className="text-sm mt-1">{selectedItem.description}</p>
              </div>
              {selectedItem.resolution && (
                <div>
                  <Label className="text-slate-500">Resolution</Label>
                  <p className="text-sm mt-1">{selectedItem.resolution}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}