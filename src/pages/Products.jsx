import React, { useState, useEffect } from 'react';
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
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['phones', 'tablets', 'laptops', 'gaming', 'accessories', 'wearables', 'audio', 'other'];

export default function Products() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    upc: '',
    image: '',
    value: ''
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created');
      closeDialog();
      logActivity('Created product', 'product', formData.name);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated');
      closeDialog();
      logActivity('Updated product', 'product', formData.name);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
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

  const openDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || '',
        upc: product.upc || '',
        image: product.image || '',
        value: product.value || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        upc: '',
        image: '',
        value: ''
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      value: formData.value ? parseFloat(formData.value) : null
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = async (product) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(product.id);
      logActivity('Deleted product', 'product', product.name);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.upc?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { header: 'Name', accessor: 'name', cell: (row) => (
      <div className="flex items-center gap-3">
        {row.image && (
          <img src={row.image} alt={row.name} className="h-10 w-10 object-cover rounded border" />
        )}
        <span className="font-medium text-slate-900">{row.name}</span>
      </div>
    )},
    { header: 'UPC', accessor: 'upc', cell: (row) => (
      <span className="font-mono text-sm">{row.upc}</span>
    )},
    { header: 'Value', accessor: 'value', cell: (row) => (
      row.value ? <span className="font-semibold">${row.value.toFixed(2)}</span> : '-'
    )},
    { header: 'Actions', cell: (row) => (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openDialog(row); }}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(row); }}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    )}
  ];

  return (
    <div>
      <PageHeader 
        title="Products" 
        description="Master product catalog"
        actions={
          <Button onClick={() => openDialog()} className="bg-black hover:bg-gray-800 text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        }
      />

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredProducts}
        loading={isLoading}
        emptyMessage="No products found"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>UPC *</Label>
              <Input
                value={formData.upc}
                onChange={(e) => setFormData({ ...formData, upc: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                type="url"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="space-y-2">
              <Label>Value ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" className="bg-black hover:bg-gray-800 text-white">
                {editingProduct ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}