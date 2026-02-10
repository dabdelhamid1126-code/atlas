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
import { format, parseISO } from 'date-fns';

const STATUSES = ['pending', 'ordered', 'shipped', 'partially_received', 'received', 'cancelled'];

export default function PurchaseOrders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('new-to-old');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [formData, setFormData] = useState({
    order_number: '',
    tracking_number: '',
    retailer: '',
    category: 'other',
    credit_card_id: '',
    gift_card_ids: [],
    is_pickup: false,
    status: 'pending',
    order_date: '',
    expected_date: '',
    notes: '',
    items: [],
    original_price: '',
    discount_amount: '',
    price_after_discount: '',
    extra_cashback_percent: '',
    bonus_amount: '',
    bonus_notes: '',
    rewards_on_original_price: false
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders', sortOrder],
    queryFn: () => base44.entities.PurchaseOrder.list(sortOrder === 'new-to-old' ? '-created_date' : 'created_date')
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: creditCards = [] } = useQuery({
    queryKey: ['creditCards'],
    queryFn: async () => {
      const cards = await base44.entities.CreditCard.list();
      return cards.sort((a, b) => {
        if (a.issuer !== b.issuer) return (a.issuer || '').localeCompare(b.issuer || '');
        return (a.card_name || '').localeCompare(b.card_name || '');
      });
    }
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
      
      // Create inventory items if order is received or partially received
      if ((updatedOrder.status === 'received' || updatedOrder.status === 'partially_received') && updatedOrder.items?.length > 0) {
        for (const item of updatedOrder.items) {
          if (item.quantity_received > 0) {
            // Check if inventory item already exists
            const existingInventory = await base44.entities.InventoryItem.filter({
              purchase_order_id: updatedOrder.id,
              product_id: item.product_id
            });
            
            if (existingInventory && existingInventory.length > 0) {
              // Update existing inventory
              await base44.entities.InventoryItem.update(existingInventory[0].id, {
                quantity: item.quantity_received,
                unit_cost: item.unit_cost
              });
            } else {
              // Create new inventory item
              await base44.entities.InventoryItem.create({
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity_received,
                status: 'in_stock',
                purchase_order_id: updatedOrder.id,
                unit_cost: item.unit_cost
              });
            }
          }
        }
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        toast.success('Inventory items created');
      }
      
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

    const amount = order.final_cost || order.total_cost;
    let rewardAmount = 0;
    let rewardType = 'cashback';
    let currency = 'USD';

    // Get points multiplier based on order category
    const category = order.category || 'other';
    let pointsMultiplier = card.points_rate || 1;
    let cashbackBonus = 0;
    
    if (category === 'dining' && card.dining_points_rate) {
      pointsMultiplier = card.dining_points_rate;
    } else if (category === 'travel' && card.travel_points_rate) {
      pointsMultiplier = card.travel_points_rate;
    } else if (category === 'groceries' && card.groceries_points_rate) {
      pointsMultiplier = card.groceries_points_rate;
    } else if (category === 'gas' && card.gas_points_rate) {
      pointsMultiplier = card.gas_points_rate;
    } else if (category === 'streaming' && card.streaming_points_rate) {
      pointsMultiplier = card.streaming_points_rate;
    }

    if (card.reward_type === 'cashback' && card.cashback_rate) {
      rewardAmount = (amount * card.cashback_rate / 100).toFixed(2);
      rewardType = 'cashback';
      currency = 'USD';
    } else if (card.reward_type === 'points' && pointsMultiplier) {
      rewardAmount = Math.round(amount * pointsMultiplier);
      rewardType = 'points';
      currency = 'points';
    } else if (card.reward_type === 'both') {
      if (card.cashback_rate) {
        rewardAmount = (amount * card.cashback_rate / 100).toFixed(2);
        rewardType = 'cashback';
        currency = 'USD';
      } else if (pointsMultiplier) {
        rewardAmount = Math.round(amount * pointsMultiplier);
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
    
    // Add bonus for category-specific rates if applicable
    if (card.reward_type === 'points' || card.reward_type === 'both') {
      const baseRate = card.points_rate || 1;
      if (pointsMultiplier > baseRate) {
        const bonusPoints = Math.round(amount * (pointsMultiplier - baseRate));
        if (bonusPoints > 0) {
          await base44.entities.Reward.create({
            credit_card_id: order.credit_card_id,
            card_name: card.card_name,
            source: card.card_name,
            type: 'points',
            purchase_amount: amount,
            amount: bonusPoints,
            currency: 'points',
            purchase_order_id: order.id,
            order_number: order.order_number,
            date_earned: order.order_date || format(new Date(), 'yyyy-MM-dd'),
            status: order.status === 'received' ? 'earned' : 'pending',
            notes: `Bonus ${category} category: ${pointsMultiplier}x total (${bonusPoints} bonus points)`
          });
        }
      }
    }
    
    // Create extra points reward if specified (e.g., 5% back on Amazon)
    if (order.extra_cashback_percent && parseFloat(order.extra_cashback_percent) > 0) {
      // Calculate on original price if specified, otherwise on price after discount or final charged amount
      const baseAmount = order.rewards_on_original_price 
        ? (order.original_price || order.total_cost) 
        : (order.price_after_discount || amount);
      const extraPoints = Math.round(baseAmount * parseFloat(order.extra_cashback_percent) / 100);
      await base44.entities.Reward.create({
        credit_card_id: order.credit_card_id,
        card_name: card.card_name,
        source: card.card_name,
        type: 'points',
        purchase_amount: baseAmount,
        amount: extraPoints,
        currency: 'points',
        purchase_order_id: order.id,
        order_number: order.order_number,
        date_earned: order.order_date || format(new Date(), 'yyyy-MM-dd'),
        status: order.status === 'received' ? 'earned' : 'pending',
        notes: `${order.extra_cashback_percent}% back on ${order.rewards_on_original_price ? 'original' : 'final'} price - ${order.bonus_notes || '5% Amazon, delivery day, etc.'}`
      });
    }
    
    // Create bonus on purchases (points) or Prime Young Adult (cashback)
    if (order.bonus_amount && parseFloat(order.bonus_amount) > 0) {
      await base44.entities.Reward.create({
        credit_card_id: order.credit_card_id,
        card_name: card.card_name,
        source: card.card_name,
        type: order.bonus_notes?.toLowerCase().includes('prime young adult') ? 'cashback' : 'points',
        purchase_amount: amount,
        amount: parseFloat(order.bonus_amount),
        currency: order.bonus_notes?.toLowerCase().includes('prime young adult') ? 'USD' : 'points',
        purchase_order_id: order.id,
        order_number: order.order_number,
        date_earned: order.order_date || format(new Date(), 'yyyy-MM-dd'),
        status: order.status === 'received' ? 'earned' : 'pending',
        notes: `Bonus - ${order.bonus_notes || 'Bonus on purchases'}`
      });
    }
  };

  const updateRewardForOrder = async (order, existingReward) => {
    const card = creditCards.find(c => c.id === order.credit_card_id);
    if (!card) return;

    const amount = order.final_cost || order.total_cost;
    let rewardAmount = 0;
    let rewardType = 'cashback';
    let currency = 'USD';

    // Get points multiplier based on order category
    const category = order.category || 'other';
    let pointsMultiplier = card.points_rate || 1;
    
    if (category === 'dining' && card.dining_points_rate) {
      pointsMultiplier = card.dining_points_rate;
    } else if (category === 'travel' && card.travel_points_rate) {
      pointsMultiplier = card.travel_points_rate;
    } else if (category === 'groceries' && card.groceries_points_rate) {
      pointsMultiplier = card.groceries_points_rate;
    } else if (category === 'gas' && card.gas_points_rate) {
      pointsMultiplier = card.gas_points_rate;
    } else if (category === 'streaming' && card.streaming_points_rate) {
      pointsMultiplier = card.streaming_points_rate;
    }

    if (card.reward_type === 'cashback' && card.cashback_rate) {
      rewardAmount = (amount * card.cashback_rate / 100).toFixed(2);
      rewardType = 'cashback';
      currency = 'USD';
    } else if (card.reward_type === 'points' && pointsMultiplier) {
      rewardAmount = Math.round(amount * pointsMultiplier);
      rewardType = 'points';
      currency = 'points';
    } else if (card.reward_type === 'both') {
      if (card.cashback_rate) {
        rewardAmount = (amount * card.cashback_rate / 100).toFixed(2);
        rewardType = 'cashback';
        currency = 'USD';
      } else if (pointsMultiplier) {
        rewardAmount = Math.round(amount * pointsMultiplier);
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
        category: order.category || 'other',
        credit_card_id: order.credit_card_id || '',
        gift_card_ids: order.gift_card_ids || [],
        is_pickup: order.is_pickup || false,
        status: order.status || 'pending',
        order_date: order.order_date || '',
        expected_date: order.expected_date || '',
        notes: order.notes || '',
        items: order.items || [],
        original_price: order.original_price || '',
        discount_amount: order.discount_amount || '',
        price_after_discount: order.price_after_discount || '',
        extra_cashback_percent: order.extra_cashback_percent || '',
        bonus_amount: order.bonus_amount || '',
        bonus_notes: order.bonus_notes || '',
        rewards_on_original_price: order.rewards_on_original_price || false
      });
    } else {
      setEditingOrder(null);
      setFormData({
        order_number: '',
        tracking_number: '',
        retailer: '',
        category: 'other',
        credit_card_id: '',
        gift_card_ids: [],
        is_pickup: false,
        status: 'pending',
        order_date: format(new Date(), 'yyyy-MM-dd'),
        expected_date: '',
        notes: '',
        items: [],
        original_price: '',
        discount_amount: '',
        price_after_discount: '',
        extra_cashback_percent: '',
        bonus_amount: '',
        bonus_notes: '',
        rewards_on_original_price: false
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
    
    if (field === 'quantity_ordered' || field === 'quantity_received') {
      newItems[index][field] = value === '' ? '' : parseInt(value) || 0;
    } else if (field === 'unit_cost') {
      newItems[index][field] = value === '' ? '' : parseFloat(value) || 0;
    } else {
      newItems[index][field] = value;
    }
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].product_id = value;
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
      credit_card_id: formData.credit_card_id || null,
      items: cleanedItems,
      total_cost: parseFloat(formData.original_price) || totalCost,
      gift_card_value: giftCardValue,
      final_cost: (parseFloat(formData.price_after_discount) || totalCost) - giftCardValue,
      card_name: card?.card_name || null,
      original_price: parseFloat(formData.original_price) || null,
      discount_amount: parseFloat(formData.discount_amount) || null,
      price_after_discount: parseFloat(formData.price_after_discount) || null,
      extra_cashback_percent: formData.extra_cashback_percent ? parseFloat(formData.extra_cashback_percent) : null,
      bonus_amount: formData.bonus_amount ? parseFloat(formData.bonus_amount) : null
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
      order.retailer?.toLowerCase().includes(search.toLowerCase()) ||
      order.items?.some(item => item.product_name?.toLowerCase().includes(search.toLowerCase()));
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
      row.order_date ? format(parseISO(row.order_date), 'MMM d, yyyy') : '-'
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
        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new-to-old">Newest First</SelectItem>
            <SelectItem value="old-to-new">Oldest First</SelectItem>
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
                <Select value={formData.status} onValueChange={(v) => {
                  // Auto-fill quantity_received when marking as received
                  if (v === 'received') {
                    const updatedItems = formData.items.map(item => ({
                      ...item,
                      quantity_received: item.quantity_ordered
                    }));
                    setFormData({ ...formData, status: v, items: updatedItems });
                  } else {
                    setFormData({ ...formData, status: v });
                  }
                }}>
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
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dining">Dining</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="groceries">Groceries</SelectItem>
                  <SelectItem value="gas">Gas</SelectItem>
                  <SelectItem value="streaming">Streaming</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">Category determines reward points rate</p>
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
              <Select value={formData.credit_card_id || undefined} onValueChange={(v) => {
                setFormData({ ...formData, credit_card_id: v });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select card (optional)" />
                </SelectTrigger>
                <SelectContent>
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
            
            {formData.retailer?.toLowerCase().includes('amazon') && (
              <div className="space-y-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  🛒 Amazon Order Pricing
                </h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Original Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.original_price}
                      onChange={(e) => {
                        const original = parseFloat(e.target.value) || 0;
                        const discount = parseFloat(formData.discount_amount) || 0;
                        setFormData({ 
                          ...formData, 
                          original_price: e.target.value,
                          price_after_discount: (original - discount).toFixed(2)
                        });
                      }}
                      placeholder="59.99"
                    />
                    <p className="text-xs text-slate-600">Before any discounts</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Discount Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.discount_amount}
                      onChange={(e) => {
                        const original = parseFloat(formData.original_price) || 0;
                        const discount = parseFloat(e.target.value) || 0;
                        setFormData({ 
                          ...formData, 
                          discount_amount: e.target.value,
                          price_after_discount: (original - discount).toFixed(2)
                        });
                      }}
                      placeholder="30.00"
                    />
                    <p className="text-xs text-slate-600">Promos, coupons</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Price After Discount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price_after_discount}
                      onChange={(e) => setFormData({ ...formData, price_after_discount: e.target.value })}
                      placeholder="29.99"
                    />
                    <p className="text-xs text-slate-600">What you actually paid</p>
                  </div>
                </div>
                
                {formData.original_price && formData.price_after_discount && (
                  <div className="space-y-2">
                    <div className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">You saved:</span>
                        <span className="font-semibold text-green-600">
                          ${(parseFloat(formData.original_price) - parseFloat(formData.price_after_discount)).toFixed(2)}
                          {formData.original_price && ` (${((1 - parseFloat(formData.price_after_discount) / parseFloat(formData.original_price)) * 100).toFixed(0)}% off)`}
                        </span>
                      </div>
                    </div>
                    
                    {(() => {
                      const priceAfterDiscount = parseFloat(formData.price_after_discount) || 0;
                      const giftCardTotal = formData.gift_card_ids.reduce((sum, id) => {
                        const gc = giftCards.find(g => g.id === id);
                        return sum + (gc?.value || 0);
                      }, 0);
                      const finalTotal = priceAfterDiscount - giftCardTotal;
                      
                      return (
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 text-white shadow-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold">Final Total:</span>
                            <span className="text-2xl font-bold">${finalTotal.toFixed(2)}</span>
                          </div>
                          {giftCardTotal > 0 && (
                            <div className="text-sm mt-2 text-green-100">
                              After ${giftCardTotal.toFixed(2)} in gift cards
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
            
            {formData.credit_card_id && formData.retailer?.toLowerCase().includes('amazon') && (() => {
              const orderTotal = parseFloat(formData.original_price) || formData.items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_cost), 0);
              const giftCardTotal = formData.gift_card_ids.reduce((sum, id) => {
                const gc = giftCards.find(g => g.id === id);
                return sum + (gc?.value || 0);
              }, 0);
              const priceAfterDiscount = parseFloat(formData.price_after_discount) || 0;
              const finalTotal = priceAfterDiscount - giftCardTotal;
              
              // Calculate rewards on original or final price based on checkbox
              const rewardBaseAmount = formData.rewards_on_original_price ? orderTotal : (priceAfterDiscount || finalTotal);
              const extraPoints = formData.extra_cashback_percent ? Math.round(rewardBaseAmount * parseFloat(formData.extra_cashback_percent) / 100) : 0;
              const flatBonus = formData.bonus_amount ? parseFloat(formData.bonus_amount) : 0;
              const isPrimeYoungAdult = formData.bonus_notes?.toLowerCase().includes('prime young adult');
              
              return (
                <div className="space-y-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">💳 Bonus Rewards</h3>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.rewards_on_original_price}
                        onChange={(e) => setFormData({ ...formData, rewards_on_original_price: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-slate-700">Calculate % on original price</span>
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Extra Points %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.extra_cashback_percent}
                        onChange={(e) => setFormData({ ...formData, extra_cashback_percent: e.target.value })}
                        placeholder="e.g., 5"
                      />
                      <p className="text-xs text-slate-600">
                        {formData.rewards_on_original_price 
                          ? `On original $${orderTotal.toFixed(2)}`
                          : `On charged $${(priceAfterDiscount || finalTotal).toFixed(2)}`}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Bonus Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.bonus_amount}
                        onChange={(e) => setFormData({ ...formData, bonus_amount: e.target.value })}
                        placeholder="e.g., 29.99"
                      />
                      <p className="text-xs text-slate-600">Bonus pts or Prime YA $</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Bonus Notes</Label>
                      <Input
                        value={formData.bonus_notes}
                        onChange={(e) => setFormData({ ...formData, bonus_notes: e.target.value })}
                        placeholder="Description"
                      />
                      <p className="text-xs text-slate-600">Include "Prime Young Adult" for cashback</p>
                    </div>
                  </div>
                  
                  {(extraPoints > 0 || flatBonus > 0) && (
                    <div className="bg-white border border-green-300 rounded-lg p-3 shadow-sm">
                      <div className="text-sm font-semibold text-slate-900 mb-2">💰 Total Bonus Rewards:</div>
                      {extraPoints > 0 && (
                        <p className="text-sm text-slate-700">
                          • {formData.extra_cashback_percent}% on ${rewardBaseAmount.toFixed(2)}: <span className="font-semibold text-green-700">{extraPoints} pts</span>
                        </p>
                      )}
                      {flatBonus > 0 && (
                        <p className="text-sm text-slate-700">
                          • Bonus reward: <span className="font-semibold text-green-700">
                            {isPrimeYoungAdult ? `$${flatBonus.toFixed(2)} cashback` : `${flatBonus} pts`}
                          </span>
                        </p>
                      )}
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <span className="text-sm font-semibold text-slate-900">Grand Total: </span>
                        <span className="font-bold text-green-700">
                          {extraPoints + (isPrimeYoungAdult ? 0 : flatBonus)} pts
                          {isPrimeYoungAdult && flatBonus > 0 && ` + $${flatBonus.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            
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
                        value={item.product_name}
                        onValueChange={(v) => {
                          const product = products.find(p => p.name === v);
                          updateItem(index, 'product_id', product?.id || '');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Qty Ordered</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity_ordered}
                        onChange={(e) => updateItem(index, 'quantity_ordered', e.target.value)}
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Qty Received</Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.quantity_received || 0}
                        onChange={(e) => updateItem(index, 'quantity_received', e.target.value)}
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