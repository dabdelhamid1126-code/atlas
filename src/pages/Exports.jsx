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
import { Search, Filter, Eye, Plus, Trash2, Pencil, PackageOpen } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];

export default function Exports() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingExport, setEditingExport] = useState(null);
  const [selectedExport, setSelectedExport] = useState(null);
  const [formData, setFormData] = useState({
    export_number: '',
    buyer: '',
    buyer_email: '',
    status: 'pending',
    items: [],
    gift_cards: [],
    export_date: format(new Date(), 'yyyy-MM-dd'),
    shipping_info: '',
    notes: ''
  });
  const [selectedInventory, setSelectedInventory] = useState([]);

  const { data: exports = [], isLoading } = useQuery({
    queryKey: ['exports'],
    queryFn: () => base44.entities.Export.list('-export_date')
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.InventoryItem.list()
  });

  const { data: giftCards = [] } = useQuery({
    queryKey: ['giftCards'],
    queryFn: () => base44.entities.GiftCard.list()
  });

  const { data: serialNumbers = [] } = useQuery({
    queryKey: ['serialNumbers'],
    queryFn: () => base44.entities.SerialNumber.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Export.create(data),
    onSuccess: async (newExport) => {
      // Update inventory items status to 'exported'
      for (const item of newExport.items) {
        await base44.entities.InventoryItem.update(item.inventory_item_id, {
          status: 'exported',
          export_id: newExport.id
        });
      }

      // Update serial numbers if any
      for (const item of newExport.items) {
        if (item.serial_numbers && item.serial_numbers.length > 0) {
          for (const serial of item.serial_numbers) {
            const serialRecord = serialNumbers.find(s => s.serial === serial);
            if (serialRecord) {
              await base44.entities.SerialNumber.update(serialRecord.id, {
                status: 'exported',
                export_id: newExport.id
              });
            }
          }
        }
      }

      // Update gift cards to 'exported' status
      if (newExport.gift_cards && newExport.gift_cards.length > 0) {
        for (const gcId of newExport.gift_cards) {
          await base44.entities.GiftCard.update(gcId, {
            status: 'exported',
            export_id: newExport.id
          });
        }
      }

      // Log activity
      const user = await base44.auth.me();
      await base44.entities.ActivityLog.create({
        action: 'Export Created',
        entity_type: 'export',
        entity_id: newExport.id,
        details: `Created export ${newExport.export_number} for ${newExport.buyer}`,
        user_name: user.full_name,
        user_email: user.email
      });

      queryClient.invalidateQueries({ queryKey: ['exports'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['serialNumbers'] });
      queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      toast.success('Export created successfully');
      setDialogOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Export.update(id, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      toast.success('Export updated');
      setDialogOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Export.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      toast.success('Export deleted');
    }
  });

  const openDialog = (exportData = null) => {
    if (exportData) {
      setEditingExport(exportData);
      setFormData({
        export_number: exportData.export_number || '',
        buyer: exportData.buyer || '',
        buyer_email: exportData.buyer_email || '',
        status: exportData.status || 'pending',
        items: exportData.items || [],
        gift_cards: exportData.gift_cards || [],
        export_date: exportData.export_date || format(new Date(), 'yyyy-MM-dd'),
        shipping_info: exportData.shipping_info || '',
        notes: exportData.notes || ''
      });
    } else {
      setEditingExport(null);
      setFormData({
        export_number: `EXP-${Date.now()}`,
        buyer: '',
        buyer_email: '',
        status: 'pending',
        items: [],
        gift_cards: [],
        export_date: format(new Date(), 'yyyy-MM-dd'),
        shipping_info: '',
        notes: ''
      });
      setSelectedInventory([]);
    }
    setDialogOpen(true);
  };

  const availableInventory = inventory.filter(item => 
    item.status === 'in_stock' && item.quantity > 0
  );

  const addInventoryItem = (invItem) => {
    if (selectedInventory.find(i => i.id === invItem.id)) return;
    
    setSelectedInventory([...selectedInventory, {
      ...invItem,
      export_quantity: 1,
      unit_price: 0
    }]);
  };

  const removeInventoryItem = (invItemId) => {
    setSelectedInventory(selectedInventory.filter(i => i.id !== invItemId));
  };

  const updateItemQuantity = (invItemId, quantity) => {
    setSelectedInventory(selectedInventory.map(i => 
      i.id === invItemId ? { ...i, export_quantity: Math.min(quantity, i.quantity) } : i
    ));
  };

  const updateItemPrice = (invItemId, price) => {
    setSelectedInventory(selectedInventory.map(i => 
      i.id === invItemId ? { ...i, unit_price: parseFloat(price) || 0 } : i
    ));
  };

  const calculateTotalValue = () => {
    return selectedInventory.reduce((sum, item) => 
      sum + (item.export_quantity * item.unit_price), 0
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingExport) {
      updateMutation.mutate({
        id: editingExport.id,
        data: {
          ...formData,
          total_value: formData.items.reduce((sum, item) => 
            sum + (item.quantity * item.unit_price), 0
          )
        }
      });
    } else {
      if (selectedInventory.length === 0) {
        toast.error('Please add at least one item');
        return;
      }

      const items = selectedInventory.map(item => ({
        inventory_item_id: item.id,
        product_name: item.product_name,
        quantity: item.export_quantity,
        unit_price: item.unit_price,
        serial_numbers: []
      }));

      const data = {
        ...formData,
        items,
        total_value: calculateTotalValue()
      };

      createMutation.mutate(data);
    }
  };

  const handleDelete = (exportData) => {
    if (confirm('Are you sure you want to delete this export?')) {
      deleteMutation.mutate(exportData.id);
    }
  };

  const viewDetails = (exportData) => {
    setSelectedExport(exportData);
    setDetailsOpen(true);
  };

  const filteredExports = exports.filter(exp => {
    const matchesSearch = 
      exp.export_number?.toLowerCase().includes(search.toLowerCase()) ||
      exp.buyer?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    { header: 'Export #', accessor: 'export_number', cell: (row) => (
      <span className="font-medium">{row.export_number}</span>
    )},
    { header: 'Buyer', accessor: 'buyer', cell: (row) => (
      <span className="text-sm">{row.buyer}</span>
    )},
    { header: 'Items', accessor: 'items', cell: (row) => (
      <span className="text-sm">{row.items?.length || 0} items</span>
    )},
    { header: 'Total Value', accessor: 'total_value', cell: (row) => (
      <span className="font-semibold text-green-600">
        ${(row.total_value || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
      </span>
    )},
    { header: 'Date', accessor: 'export_date', cell: (row) => (
      row.export_date ? format(new Date(row.export_date), 'MMM d, yyyy') : '-'
    )},
    { header: 'Status', accessor: 'status', cell: (row) => (
      <StatusBadge status={row.status} />
    )},
    { header: '', cell: (row) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => viewDetails(row)}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => openDialog(row)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(row)}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    )}
  ];

  const totalExports = filteredExports.length;
  const totalValue = filteredExports.reduce((sum, exp) => sum + (exp.total_value || 0), 0);
  const completedValue = filteredExports
    .filter(e => e.status === 'completed')
    .reduce((sum, exp) => sum + (exp.total_value || 0), 0);

  return (
    <div>
      <PageHeader 
        title="Exports & Sales" 
        description="Manage product exports and sales"
        actions={
          <Button onClick={() => openDialog()} className="bg-black hover:bg-gray-800 text-white">
            <Plus className="h-4 w-4 mr-2" /> Create Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <PackageOpen className="h-5 w-5 text-blue-600" />
            <p className="text-sm text-blue-700 font-medium">Total Exports</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">{totalExports}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-5 w-5 text-emerald-600" />
            <p className="text-sm text-emerald-700 font-medium">Total Value</p>
          </div>
          <p className="text-2xl font-bold text-emerald-900">${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-700 font-medium">Completed Sales</p>
          </div>
          <p className="text-2xl font-bold text-green-900">${completedValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search exports..."
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
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredExports}
        loading={isLoading}
        emptyMessage="No exports found"
      />

      {/* Create/Edit Export Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExport ? 'Edit Export' : 'Create Export'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Export Number *</Label>
                <Input
                  value={formData.export_number}
                  onChange={(e) => setFormData({ ...formData, export_number: e.target.value })}
                  placeholder="EXP-001"
                  required
                  disabled={editingExport}
                />
              </div>
              <div className="space-y-2">
                <Label>Export Date *</Label>
                <Input
                  type="date"
                  value={formData.export_date}
                  onChange={(e) => setFormData({ ...formData, export_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Buyer Name *</Label>
                <Input
                  value={formData.buyer}
                  onChange={(e) => setFormData({ ...formData, buyer: e.target.value })}
                  placeholder="Company or person name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Buyer Email</Label>
                <Input
                  type="email"
                  value={formData.buyer_email}
                  onChange={(e) => setFormData({ ...formData, buyer_email: e.target.value })}
                  placeholder="buyer@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!editingExport && (
              <>
                <div className="space-y-2">
                  <Label>Add Items</Label>
                  <Select onValueChange={(id) => {
                    const item = availableInventory.find(i => i.id === id);
                    if (item) addInventoryItem(item);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select inventory item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableInventory.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.product_name} (Qty: {item.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedInventory.length > 0 && (
                  <div className="border rounded-lg p-4 space-y-3">
                    <Label className="font-semibold">Selected Items</Label>
                    {selectedInventory.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.product_name}</p>
                          <p className="text-xs text-slate-500">Available: {item.quantity}</p>
                        </div>
                        <div className="w-24">
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            max={item.quantity}
                            value={item.export_quantity}
                            onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="h-8"
                          />
                        </div>
                        <div className="w-32">
                          <Label className="text-xs">Unit Price ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItemPrice(item.id, e.target.value)}
                            className="h-8"
                            placeholder="0.00"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeInventoryItem(item.id)}
                          className="text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Value:</span>
                        <span className="text-2xl font-bold text-green-600">
                          ${calculateTotalValue().toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label>Shipping Information</Label>
              <Textarea
                value={formData.shipping_info}
                onChange={(e) => setFormData({ ...formData, shipping_info: e.target.value })}
                placeholder="Tracking number, carrier, etc."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-black hover:bg-gray-800 text-white">
                {editingExport ? 'Update Export' : 'Create Export'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Export Details</DialogTitle>
          </DialogHeader>
          {selectedExport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Export Number</Label>
                  <p className="font-medium">{selectedExport.export_number}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Buyer</Label>
                  <p className="font-medium">{selectedExport.buyer}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Date</Label>
                  <p>{selectedExport.export_date ? format(new Date(selectedExport.export_date), 'MMM d, yyyy') : '-'}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Status</Label>
                  <div className="mt-1"><StatusBadge status={selectedExport.status} /></div>
                </div>
              </div>

              {selectedExport.items && selectedExport.items.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-semibold">Items</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium">Product</th>
                          <th className="text-right p-3 text-sm font-medium">Quantity</th>
                          <th className="text-right p-3 text-sm font-medium">Unit Price</th>
                          <th className="text-right p-3 text-sm font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedExport.items.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-3 text-sm">{item.product_name}</td>
                            <td className="p-3 text-sm text-right">{item.quantity}</td>
                            <td className="p-3 text-sm text-right">${item.unit_price?.toFixed(2)}</td>
                            <td className="p-3 text-sm text-right font-semibold">
                              ${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2">
                        <tr>
                          <td colSpan="3" className="p-3 text-right font-semibold">Total:</td>
                          <td className="p-3 text-right font-bold text-green-600">
                            ${(selectedExport.total_value || 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {selectedExport.shipping_info && (
                <div>
                  <Label className="text-slate-500">Shipping Information</Label>
                  <p className="text-sm">{selectedExport.shipping_info}</p>
                </div>
              )}

              {selectedExport.notes && (
                <div>
                  <Label className="text-slate-500">Notes</Label>
                  <p className="text-sm">{selectedExport.notes}</p>
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