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
import { Plus, Search, Eye, Trash2, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUSES = ['pending', 'ordered', 'shipped', 'partially_received', 'received', 'cancelled'];

export default function PurchaseOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formData, setFormData] = useState({
    order_number: '',
    tracking_number: '',
    retailer: '',
    credit_card_id: '',
    gift_card_ids: [],
    is_pickup: false,
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

  const { data: creditCards = [] } = useQuery({
    queryKey: ['creditCards'],
    queryFn: () => base44.entities.CreditCard.list()
  });

  const { data: giftCards = [] } = useQuery({
    queryKey: ['giftCards'],
    queryFn: () => base44.entities.GiftCard.list()
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => base44.entities.Reward.list()
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const newOrder = await base44.entities.PurchaseOrder.create(data);
      
      // Mark gift cards as used
      if (data.gift_card_ids && data.gift_card_ids.length > 0) {
        for (const cardId of data.gift_card_ids) {
          await base44.entities.GiftCard.update(cardId, {
            status: 'used',
            used_order_number: data.order_number
          });
        }
        queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      }
      
      return newOrder;
    },
    onSuccess: async (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Purchase order created');
      
      // Auto-create reward if card is selected
      if (newOrder.credit_card_id && newOrder.total_cost) {
        await createRewardForOrder(newOrder);
      }
      
      closeDialog();
      await logActivity('Created purchase order', 'purchase_order', formData.order_number);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updatedOrder = await base44.entities.PurchaseOrder.update(id, data);
      
      // Mark gift cards as used if gift cards were added
      if (data.gift_card_ids && data.gift_card_ids.length > 0) {
        for (const cardId of data.gift_card_ids) {
          await base44.entities.GiftCard.update(cardId, {
            status: 'used',
            used_order_number: data.order_number
          });
        }
        queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      }
      
      return updatedOrder;
    },
    onSuccess: async (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Purchase order updated');
      
      // Update or create reward if card is selected
      if (updatedOrder.credit_card_id && updatedOrder.total_cost) {
        const existingReward = await base44.entities.Reward.filter({ 
          purchase_order_id: updatedOrder.id 
        });
        if (existingReward && existingReward.length > 0) {
          await updateRewardForOrder(updatedOrder, existingReward[0]);
        } else {
          await createRewardForOrder(updatedOrder);
        }
      }
      
      closeDialog();
      await logActivity('Updated purchase order', 'purchase_order', formData.order_number);
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

  const createRewardForOrder = async (order) => {
    const card = creditCards.find(c => c.id === order.credit_card_id);
    if (!card) return;

    const amount = order.total_cost;
    let rewardAmount = 0;
    let rewardType = 'cashback';
    let currency = 'USD';

    if (card.reward_type === 'cashback' && card.cashback_rate) {
      rewardAmount = (amount * card.cashback_rate / 100).toFixed(2);
      rewardType = 'cashback';
      currency = 'USD';
    } else if (card.reward_type === 'points' && card.points_rate) {
      rewardAmount = Math.round(amount * card.points_rate);
      rewardType = 'points';
      currency = 'points';
    } else if (card.reward_type === 'both') {
      if (card.cashback_rate) {
        rewardAmount = (amount * card.cashback_rate / 100).toFixed(2);
        rewardType = 'cashback';
        currency = 'USD';
      } else if (card.points_rate) {
        rewardAmount = Math.round(amount * card.points_rate);
        rewardType = 'points';
        currency = 'points';
      }
    }

    if (rewardAmount > 0) {
      await base44.entities.Reward.create({
        credit_card_id: order.credit_card_id,
        card_name: card.card_name,
        source: card.card_name,
        type: rewardType,
        purchase_amount: amount,
        amount: parseFloat(rewardAmount),
        currency: currency,
        purchase_order_id: order.id,
        order_number: order.order_number,
        date_earned: order.order_date || format(new Date(), 'yyyy-MM-dd'),
        status: order.status === 'received' ? 'earned' : 'pending',
        notes: `Auto-generated from order ${order.order_number}`
      });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      toast.success(`Reward tracked: ${currency === 'USD' ? `$${rewardAmount}` : `${rewardAmount} pts`}`);
    }
  };

  const updateRewardForOrder = async (order, existingReward) => {
    const card = creditCards.find(c => c.id === order.credit_card_id);
    if (!card) return;

    const amount = order.total_cost;
    let rewardAmount = 0;
    let rewardType = 'cashback';
    let currency = 'USD';

    if (card.reward_type === 'cashback' && card.cashback_rate) {
      rewardAmount = (amount * card.cashback_rate / 100).toFixed(2);
      rewardType = 'cashback';
      currency = 'USD';
    } else if (card.reward_type === 'points' && card.points_rate) {
      rewardAmount = Math.round(amount * card.points_rate);
      rewardType = 'points';
      currency = 'points';
    } else if (card.reward_type === 'both') {
      if (card.cashback_rate) {
        rewardAmount = (amount * card.cashback_rate / 100).toFixed(2);
        rewardType = 'cashback';
        currency = 'USD';
      } else if (card.points_rate) {
        rewardAmount = Math.round(amount * card.points_rate);
        rewardType = 'points';
        currency = 'points';
      }
    }

    if (rewardAmount > 0) {
      await base44.entities.Reward.update(existingReward.id, {
        purchase_amount: amount,
        amount: parseFloat(rewardAmount),
        status: order.status === 'received' ? 'earned' : 'pending'
      });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    }
  };

  const openDialog = (order = null) => {
    if (order) {
      setEditingOrder(order);
      setFormData({
        order_number: order.order_number || '',
        tracking_number: order.tracking_number || '',
        retailer: order.retailer || '',
        credit_card_id: order.credit_card_id || '',
        gift_card_ids: order.gift_card_ids || [],
        is_pickup: order.is_pickup || false,
        status: order.status || 'pending',
        order_date: order.order_date || '',
        expected_date: order.expected_date || '',
        notes: order.notes || '',
        items: order.items || []
      });
    } else {
      setEditingOrder(null);
      setFormData({
        order_number: '',
        tracking_number: '',
        retailer: '',
        credit_card_id: '',
        gift_card_ids: [],
        is_pickup: false,
        status: 'pending',
        order_date: format(new Date(), 'yyyy-MM-dd'),
        expected_date: '',
        notes: '',
        items: []
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingOrder(null);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', product_name: '', upc: '', quantity_ordered: 1, quantity_received: 0, unit_cost: 0 }]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    
    if (field === 'quantity_ordered') {
      newItems[index][field] = value === '' ? '' : parseInt(value) || 0;
    } else if (field === 'unit_cost') {
      newItems[index][field] = value === '' ? '' : parseFloat(value) || 0;
    } else {
      newItems[index][field] = value;
    }
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].product_name = product.name;
        newItems[index].upc = product.upc;
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const cleanedItems = formData.items.map(item => ({
      ...item,
      quantity_ordered: parseInt(item.quantity_ordered) || 0,
      quantity_received: parseInt(item.quantity_received) || 0,
      unit_cost: parseFloat(item.unit_cost) || 0
    }));
    
    const totalCost = cleanedItems.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_cost), 0);
    
    const card = creditCards.find(c => c.id === formData.credit_card_id);
    const giftCardValue = formData.gift_card_ids.reduce((sum, id) => {
      const gc = giftCards.find(g => g.id === id);
      return sum + (gc?.value || 0);
    }, 0);
    
    const dataToSubmit = {
      ...formData,
      items: cleanedItems,
      total_cost: totalCost,
      gift_card_value: giftCardValue,
      final_cost: totalCost - giftCardValue,
      card_name: card?.card_name || null
    };
    
    if (editingOrder) {
      updateMutation.mutate({ id: editingOrder.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
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
      order.retailer?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    { header: 'Order #', accessor: 'order_number', cell: (row) => (
      <span className="font-mono text-sm font-medium">{row.order_number}</span>
    )},
    { header: 'Retailer', accessor: 'retailer', cell: (row) => (
      <span className="font-medium">{row.retailer}</span>
    )},
    { header: 'Status', accessor: 'status', cell: (row) => (
      <div className="flex items-center gap-2">
        <StatusBadge status={row.status} />
        {row.is_pickup && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Pickup</span>}
      </div>
    )},
    { header: 'Items', accessor: 'items', cell: (row) => (
      <span>{row.items?.length || 0} items</span>
    )},
    { header: 'Total', accessor: 'total_cost', cell: (row) => (
      <div>
        {row.gift_card_value > 0 ? (
          <div className="text-xs">
            <div className="line-through text-slate-400">${row.total_cost?.toFixed(2)}</div>
            <div className="font-semibold text-green-700">${row.final_cost?.toFixed(2)}</div>
          </div>
        ) : (
          <span>{row.total_cost ? `$${row.total_cost.toFixed(2)}` : '-'}</span>
        )}
      </div>
    )},
    { header: 'Order Date', accessor: 'order_date', cell: (row) => (
      row.order_date ? format(new Date(row.order_date), 'MMM d, yyyy') : '-'
    )},
    { header: '', cell: (row) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => openDialog(row)}>
          <Pencil className="h-4 w-4" />
        </Button>
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
          <Button onClick={() => openDialog()} className="bg-black hover:bg-gray-800 text-white">
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
            <DialogTitle>{editingOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Order Number *</Label>
                <Input
                  value={formData.order_number}
                  onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                  placeholder="Enter order number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tracking Number</Label>
                <Input
                  value={formData.tracking_number}
                  onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                  placeholder="Tracking number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Retailer *</Label>
                <Input
                  value={formData.retailer}
                  onChange={(e) => setFormData({ ...formData, retailer: e.target.value })}
                  placeholder="Retailer name"
                  required
                />
              </div>
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
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_pickup}
                  onChange={(e) => setFormData({ ...formData, is_pickup: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium">Pickup Order</span>
              </label>
            </div>
            <div className="space-y-2">
              <Label>Credit Card (for rewards tracking)</Label>
              <Select value={formData.credit_card_id} onValueChange={(v) => setFormData({ ...formData, credit_card_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select card (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No card</SelectItem>
                  {creditCards.filter(c => c.active).map(card => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.card_name} - {card.reward_type === 'cashback' && `${card.cashback_rate}%`}
                      {card.reward_type === 'points' && `${card.points_rate}x pts`}
                      {card.reward_type === 'both' && `${card.cashback_rate}% / ${card.points_rate}x`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Gift Cards (select multiple)</Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {giftCards.filter(gc => gc.status === 'available' || formData.gift_card_ids.includes(gc.id)).map(gc => (
                  <label key={gc.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.gift_card_ids.includes(gc.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, gift_card_ids: [...formData.gift_card_ids, gc.id] });
                        } else {
                          setFormData({ ...formData, gift_card_ids: formData.gift_card_ids.filter(id => id !== gc.id) });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm flex-1">{gc.brand} - ${gc.value}</span>
                    <span className="text-xs text-slate-500">{gc.code?.slice(0, 8)}...</span>
                  </label>
                ))}
                {giftCards.filter(gc => gc.status === 'available').length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-2">No available gift cards</p>
                )}
              </div>
              {formData.gift_card_ids.length > 0 && (
                <div className="text-sm text-green-700 font-medium">
                  Gift cards total: ${formData.gift_card_ids.reduce((sum, id) => {
                    const gc = giftCards.find(g => g.id === id);
                    return sum + (gc?.value || 0);
                  }, 0).toFixed(2)}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
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
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
                        onChange={(e) => updateItem(index, 'quantity_ordered', e.target.value)}
                      />
                    </div>
                    <div className="w-28">
                      <Label className="text-xs">Unit Cost</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_cost}
                        onChange={(e) => updateItem(index, 'unit_cost', e.target.value)}
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

            {formData.items.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-semibold">
                    ${formData.items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_cost), 0).toFixed(2)}
                  </span>
                </div>
                {formData.gift_card_ids.length > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Gift Cards ({formData.gift_card_ids.length}):</span>
                    <span className="font-semibold">
                      -${formData.gift_card_ids.reduce((sum, id) => {
                        const gc = giftCards.find(g => g.id === id);
                        return sum + (gc?.value || 0);
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Final Total:</span>
                  <span>
                    ${(formData.items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_cost), 0) - 
                      formData.gift_card_ids.reduce((sum, id) => {
                        const gc = giftCards.find(g => g.id === id);
                        return sum + (gc?.value || 0);
                      }, 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

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
              <Button type="submit" className="bg-black hover:bg-gray-800 text-white">
                {editingOrder ? 'Update Order' : 'Create Order'}
              </Button>
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
                  <Label className="text-slate-500">Retailer</Label>
                  <p className="font-medium">{selectedOrder.retailer}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Status</Label>
                  <div className="mt-1"><StatusBadge status={selectedOrder.status} /></div>
                </div>
                <div>
                  <Label className="text-slate-500">Total</Label>
                  {selectedOrder.gift_card_value > 0 ? (
                    <div>
                      <p className="text-sm line-through text-slate-400">${selectedOrder.total_cost?.toFixed(2)}</p>
                      <p className="font-semibold text-green-700">${selectedOrder.final_cost?.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">Gift cards: ${selectedOrder.gift_card_value?.toFixed(2)}</p>
                    </div>
                  ) : (
                    <p className="font-semibold">${selectedOrder.total_cost?.toFixed(2) || '0.00'}</p>
                  )}
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
              {selectedOrder.credit_card_id && (() => {
                const orderReward = rewards.find(r => r.purchase_order_id === selectedOrder.id);
                if (orderReward) {
                  return (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <Label className="text-slate-500">Reward Earned</Label>
                      <p className="text-lg font-semibold text-green-700">
                        {orderReward.currency === 'USD' 
                          ? `$${orderReward.amount?.toFixed(2)} cashback` 
                          : `${orderReward.amount} points`}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        From {orderReward.card_name} • {orderReward.status}
                      </p>
                    </div>
                  );
                }
              })()}
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