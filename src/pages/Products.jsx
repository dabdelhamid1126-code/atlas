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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('name-asc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loadingUPC, setLoadingUPC] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    upc: '',
    ean: '',
    brand: '',
    image: '',
    category: '',
    lowest_recorded_price: '',
    highest_recorded_price: ''
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', sortOrder],
    queryFn: async () => {
      let data = await base44.entities.Product.list();
      
      // Sort based on selected option
      if (sortOrder === 'name-asc') {
        data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      } else if (sortOrder === 'name-desc') {
        data.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      } else if (sortOrder === 'category-asc') {
        data.sort((a, b) => (a.category || 'zzz').localeCompare(b.category || 'zzz'));
      } else if (sortOrder === 'category-desc') {
        data.sort((a, b) => (b.category || 'zzz').localeCompare(a.category || 'zzz'));
      }
      
      return data;
    }
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
        description: product.description || '',
        upc: product.upc || '',
        ean: product.ean || '',
        brand: product.brand || '',
        image: product.image || '',
        category: product.category || '',
        lowest_recorded_price: product.lowest_recorded_price || '',
        highest_recorded_price: product.highest_recorded_price || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        upc: '',
        ean: '',
        brand: '',
        image: '',
        category: '',
        lowest_recorded_price: '',
        highest_recorded_price: ''
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
    const data = { ...formData };

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

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.upc?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
      <span className="font-mono text-sm">{row.upc || '-'}</span>
    )},
    { header: 'Category', accessor: 'category', cell: (row) => (
      row.category ? <span className="text-sm capitalize">{row.category}</span> : '-'
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

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name: A to Z</SelectItem>
            <SelectItem value="name-desc">Name: Z to A</SelectItem>
            <SelectItem value="category-asc">Category: A to Z</SelectItem>
            <SelectItem value="category-desc">Category: Z to A</SelectItem>
          </SelectContent>
        </Select>
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
              <div className="flex items-center justify-between">
                <Label>UPC</Label>
                {loadingUPC && <span className="text-xs text-blue-600">Searching online...</span>}
              </div>
              <div className="flex gap-2">
                <Input
                  value={formData.upc}
                  onChange={(e) => setFormData({ ...formData, upc: e.target.value })}
                  placeholder="Barcode number"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (!formData.upc) {
                      toast.error('Please enter a UPC');
                      return;
                    }
                    
                    setLoadingUPC(true);
                    try {
                      const { data } = await base44.functions.invoke('lookupUPC', {
                        upc: formData.upc
                      });
                      
                      if (data.title || data.image) {
                        setFormData({
                          ...formData,
                          name: data.title || formData.name,
                          image: data.image || formData.image
                        });
                        toast.success('Product info found!');
                      }
                    } catch (error) {
                      toast.error(error.response?.data?.error || 'Product not found. Please enter manually.');
                    } finally {
                      setLoadingUPC(false);
                    }
                  }}
                  disabled={loadingUPC}
                >
                  🔍 Lookup
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Product brand"
                />
              </div>
              <div className="space-y-2">
                <Label>EAN</Label>
                <Input
                  value={formData.ean}
                  onChange={(e) => setFormData({ ...formData, ean: e.target.value })}
                  placeholder="European Article Number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lowest Recorded Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.lowest_recorded_price}
                  onChange={(e) => setFormData({ ...formData, lowest_recorded_price: e.target.value })}
                  placeholder="From UPC database"
                />
              </div>
              <div className="space-y-2">
                <Label>Highest Recorded Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.highest_recorded_price}
                  onChange={(e) => setFormData({ ...formData, highest_recorded_price: e.target.value })}
                  placeholder="From UPC database"
                />
              </div>
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