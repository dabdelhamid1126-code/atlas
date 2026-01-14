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
import { Plus, Search, Eye, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUSES = ['pending', 'ordered', 'shipped', 'partially_received', 'received', 'cancelled'];

export default function PurchaseOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formData, setFormData] = useState({
    order_number: '',
    supplier: '',
    status: 'pending',
    order_date: '',
    expected_date: '',
    notes: '',
    items: []
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date')
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseOrder.create(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Purchase order created');
      closeDialog();
      await logActivity('Created purchase order', 'purchase_order', formData.order_number);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PurchaseOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Purchase order deleted');
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

  const openDialog = () => {
    setFormData({
      order_number: `PO-${Date.now().toString().slice(-8)}`,
      supplier: '',
      status: 'pending',
      order_date: format(new Date(), 'yyyy-MM-dd'),
      expected_date: '',
      notes: '',
      items: []
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', product_name: '', sku: '', quantity_ordered: 1, quantity_received: 0, unit_cost: 0 }]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].product_name = product.name;
        newItems[index].sku = product.sku;
        newItems[index].unit_cost = product.base_cost || 0;
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const totalCost = formData.items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_cost), 0);
    createMutation.mutate({ ...formData, total_cost: totalCost });
  };

  const viewDetails = (order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const handleDelete = async (order) => {
    if (confirm('Are you sure you want to delete this purchase order?')) {
      deleteMutation.mutate(order.id);
      await logActivity('Deleted purchase order', 'purchase_order', order.order_number);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      order.supplier?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    { header: 'Order #', accessor: 'order_number', cell: (row) => (
      <span className="font-mono text-sm font-medium text-emerald-600">{row.order_number}</span>
    )},
    { header: 'Supplier', accessor: 'supplier', cell: (row) => (
      <span className="font-medium">{row.supplier}</span>
    )},
    { header: 'Status', accessor: 'status', cell: (row) => (
      <StatusBadge status={row.status} />
    )},
    { header: 'Items', accessor: 'items', cell: (row) => (
      <span>{row.items?.length || 0} items</span>
    )},
    { header: 'Total', accessor: 'total_cost', cell: (row) => (
      row.total_cost ? `$${row.total_cost.toFixed(2)}` : '-'
    )},
    { header: 'Order Date', accessor: 'order_date', cell: (row) => (
      row.order_date ? format(new Date(row.order_date), 'MMM d, yyyy') : '-'
    )},
    { header: '', cell: (row) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => viewDetails(row)}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(row)}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    )}
  ];

  return (
    <div>
      <PageHeader 
        title="Purchase Orders" 
        description="Track purchases from retailers and suppliers"
        actions={
          <Button onClick={openDialog} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" /> New Order
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
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
        data={filteredOrders}
        loading={isLoading}
        emptyMessage="No purchase orders found"
      />

      {/* Create Order Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Order Number</Label>
                <Input value={formData.order_number} disabled />
              </div>
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Order Date</Label>
                <Input
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Expected Date</Label>
                <Input
                  type="date"
                  value={formData.expected_date}
                  onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <Label className="text-xs">Product</Label>
                      <Select
                        value={item.product_id}
                        onValueChange={(v) => updateItem(index, 'product_id', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity_ordered}
                        onChange={(e) => updateItem(index, 'quantity_ordered', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="w-28">
                      <Label className="text-xs">Unit Cost</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_cost}
                        onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value))}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {formData.items.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No items added</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Create Order</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Order Number</Label>
                  <p className="font-mono font-medium">{selectedOrder.order_number}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Supplier</Label>
                  <p className="font-medium">{selectedOrder.supplier}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Status</Label>
                  <div className="mt-1"><StatusBadge status={selectedOrder.status} /></div>
                </div>
                <div>
                  <Label className="text-slate-500">Total</Label>
                  <p className="font-semibold">${selectedOrder.total_cost?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
              <div>
                <Label className="text-slate-500">Items ({selectedOrder.items?.length || 0})</Label>
                <div className="mt-2 space-y-2">
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} className="flex justify-between p-2 bg-slate-50 rounded">
                      <span className="text-sm">{item.product_name}</span>
                      <span className="text-sm font-medium">{item.quantity_ordered} x ${item.unit_cost}</span>
                    </div>
                  ))}
                </div>
              </div>
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