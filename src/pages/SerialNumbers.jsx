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
import { Plus, Search, Pencil, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SerialNumbers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSerial, setEditingSerial] = useState(null);
  const [formData, setFormData] = useState({
    serial: '',
    product_id: '',
    product_name: '',
    status: 'in_stock',
    notes: ''
  });

  const { data: serials = [], isLoading } = useQuery({
    queryKey: ['serials'],
    queryFn: () => base44.entities.SerialNumber.list('-created_date')
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SerialNumber.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serials'] });
      toast.success('Serial number added');
      setDialogOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SerialNumber.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serials'] });
      toast.success('Serial number updated');
      setDialogOpen(false);
    }
  });

  const openDialog = (serial = null) => {
    if (serial) {
      setEditingSerial(serial);
      setFormData({
        serial: serial.serial || '',
        product_id: serial.product_id || '',
        product_name: serial.product_name || '',
        status: serial.status || 'in_stock',
        notes: serial.notes || ''
      });
    } else {
      setEditingSerial(null);
      setFormData({
        serial: '',
        product_id: '',
        product_name: '',
        status: 'in_stock',
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    setFormData({
      ...formData,
      product_id: productId,
      product_name: product?.name || ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check for duplicate serial
    if (!editingSerial) {
      const existing = serials.find(s => s.serial === formData.serial);
      if (existing) {
        toast.error('This serial number already exists');
        return;
      }
    }

    if (editingSerial) {
      updateMutation.mutate({ id: editingSerial.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredSerials = serials.filter(serial => {
    const matchesSearch = 
      serial.serial?.toLowerCase().includes(search.toLowerCase()) ||
      serial.product_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || serial.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    { header: 'Serial Number', accessor: 'serial', cell: (row) => (
      <span className="font-mono text-sm font-medium">{row.serial}</span>
    )},
    { header: 'Product', accessor: 'product_name', cell: (row) => (
      <span className="font-medium">{row.product_name}</span>
    )},
    { header: 'Status', accessor: 'status', cell: (row) => (
      <StatusBadge status={row.status} />
    )},
    { header: 'Added', accessor: 'created_date', cell: (row) => (
      format(new Date(row.created_date), 'MMM d, yyyy')
    )},
    { header: '', cell: (row) => (
      <Button variant="ghost" size="icon" onClick={() => openDialog(row)}>
        <Pencil className="h-4 w-4" />
      </Button>
    )}
  ];

  return (
    <div>
      <PageHeader 
        title="Serial Numbers" 
        description="Track serialized inventory"
        actions={
          <Button onClick={() => openDialog()} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" /> Add Serial
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search serial numbers..."
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
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="exported">Exported</SelectItem>
            <SelectItem value="damaged">Damaged</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredSerials}
        loading={isLoading}
        emptyMessage="No serial numbers found"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSerial ? 'Edit Serial Number' : 'Add Serial Number'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Serial Number *</Label>
              <Input
                value={formData.serial}
                onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                placeholder="Enter serial number"
                required
                disabled={!!editingSerial}
              />
            </div>
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={formData.product_id} onValueChange={handleProductChange} disabled={!!editingSerial}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="exported">Exported</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                {editingSerial ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}