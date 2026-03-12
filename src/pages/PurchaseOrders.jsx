import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import POStatsBar from '@/components/purchase-orders/POStatsBar';
import POFilters from '@/components/purchase-orders/POFilters';
import POTable from '@/components/purchase-orders/POTable';
import POFormModal from '@/components/purchase-orders/POFormModal';
import PODetailsModal from '@/components/purchase-orders/PODetailsModal';

export default function PurchaseOrders() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('all');
  const [search, setSearch] = useState('');
  const [retailerFilter, setRetailerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('order-date-new');
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(['retailer', 'orderNum', 'tracking', 'status', 'total', 'items', 'orderDate', 'actions']);

  // Data queries
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders', sortOrder],
    queryFn: async () => {
      let data = await base44.entities.PurchaseOrder.list();

      if (sortOrder === 'order-date-new') {
        data.sort((a, b) => new Date(b.order_date || 0) - new Date(a.order_date || 0));
      } else if (sortOrder === 'order-date-old') {
        data.sort((a, b) => new Date(a.order_date || 0) - new Date(b.order_date || 0));
      } else if (sortOrder === 'total-high') {
        data.sort((a, b) => (b.final_cost || b.total_cost || 0) - (a.final_cost || a.total_cost || 0));
      } else if (sortOrder === 'total-low') {
        data.sort((a, b) => (a.final_cost || a.total_cost || 0) - (b.final_cost || b.total_cost || 0));
      } else if (sortOrder === 'name-asc') {
        data.sort((a, b) => (a.retailer || '').localeCompare(b.retailer || ''));
      } else if (sortOrder === 'name-desc') {
        data.sort((a, b) => (b.retailer || '').localeCompare(a.retailer || ''));
      }

      return data;
    }
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

  const { data: sellers = [] } = useQuery({
    queryKey: ['sellers'],
    queryFn: () => base44.entities.Seller.list()
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const newOrder = await base44.entities.PurchaseOrder.create(data);

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
      toast.success('Order created successfully');

      if ((newOrder.status === 'received' || newOrder.status === 'partially_received') && newOrder.items?.length > 0) {
        for (const item of newOrder.items) {
          const qtyReceived = parseInt(item.quantity_received) || 0;
          if (qtyReceived > 0 && item.product_id) {
            await base44.entities.InventoryItem.create({
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: qtyReceived,
              status: 'in_stock',
              purchase_order_id: newOrder.id,
              unit_cost: parseFloat(item.unit_cost) || 0
            });
          }
        }
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      }

      if (newOrder.credit_card_id && newOrder.total_cost) {
        await createRewardForOrder(newOrder);
      }

      setFormOpen(false);
      setEditingOrder(null);
      await logActivity('Created purchase order', 'purchase_order', newOrder.order_number);
    },
    onError: () => {
      toast.error('Failed to save order');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updatedOrder = await base44.entities.PurchaseOrder.update(id, data);

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
      toast.success('Order updated successfully');

      if ((updatedOrder.status === 'received' || updatedOrder.status === 'partially_received') && updatedOrder.items?.length > 0) {
        for (const item of updatedOrder.items) {
          const qtyReceived = parseInt(item.quantity_received) || 0;
          if (qtyReceived > 0 && item.product_id) {
            const existingInventory = await base44.entities.InventoryItem.filter({
              purchase_order_id: updatedOrder.id,
              product_id: item.product_id
            });

            if (existingInventory && existingInventory.length > 0) {
              await base44.entities.InventoryItem.update(existingInventory[0].id, {
                quantity: qtyReceived,
                unit_cost: parseFloat(item.unit_cost) || 0,
                status: 'in_stock'
              });
            } else {
              await base44.entities.InventoryItem.create({
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: qtyReceived,
                status: 'in_stock',
                purchase_order_id: updatedOrder.id,
                unit_cost: parseFloat(item.unit_cost) || 0
              });
            }
          }
        }
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      }

      if (updatedOrder.credit_card_id && updatedOrder.total_cost) {
        const existingRewards = await base44.entities.Reward.filter({
          purchase_order_id: updatedOrder.id
        });
        for (const reward of existingRewards) {
          await base44.entities.Reward.delete(reward.id);
        }
        await createRewardForOrder(updatedOrder);
      }

      setFormOpen(false);
      setEditingOrder(null);
      await logActivity('Updated purchase order', 'purchase_order', updatedOrder.order_number);
    },
    onError: () => {
      toast.error('Failed to save order');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (order) => {
      const orderRewards = await base44.entities.Reward.filter({
        purchase_order_id: order.id
      });
      for (const reward of orderRewards) {
        await base44.entities.Reward.delete(reward.id);
      }

      if (order.gift_card_ids && order.gift_card_ids.length > 0) {
        for (const cardId of order.gift_card_ids) {
          await base44.entities.GiftCard.update(cardId, {
            status: 'available',
            used_order_number: null
          });
        }
      }

      await base44.entities.PurchaseOrder.delete(order.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      toast.success('Order deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete order');
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
    const category = order.category || 'other';
    let pointsMultiplier = card.points_rate || 1;
    let cashbackRate = card.cashback_rate || 0;

    if (category === 'dining') {
      if (card.dining_points_rate) pointsMultiplier = card.dining_points_rate;
      if (card.dining_cashback_rate) cashbackRate = card.dining_cashback_rate;
    } else if (category === 'travel') {
      if (card.travel_points_rate) pointsMultiplier = card.travel_points_rate;
      if (card.travel_cashback_rate) cashbackRate = card.travel_cashback_rate;
    } else if (category === 'groceries') {
      if (card.groceries_points_rate) pointsMultiplier = card.groceries_points_rate;
      if (card.groceries_cashback_rate) cashbackRate = card.groceries_cashback_rate;
    } else if (category === 'gas') {
      if (card.gas_points_rate) pointsMultiplier = card.gas_points_rate;
      if (card.gas_cashback_rate) cashbackRate = card.gas_cashback_rate;
    } else if (category === 'streaming') {
      if (card.streaming_points_rate) pointsMultiplier = card.streaming_points_rate;
      if (card.streaming_cashback_rate) cashbackRate = card.streaming_cashback_rate;
    }

    let rewardAmount = 0;
    let rewardType = 'cashback';
    let currency = 'USD';

    if (card.reward_type === 'cashback' && cashbackRate > 0) {
      rewardAmount = (amount * cashbackRate / 100).toFixed(2);
      rewardType = 'cashback';
      currency = 'USD';
    } else if (card.reward_type === 'points' && pointsMultiplier > 0) {
      rewardAmount = Math.round(amount * pointsMultiplier);
      rewardType = 'points';
      currency = 'points';
    } else if (card.reward_type === 'both') {
      if (cashbackRate > 0) {
        rewardAmount = (amount * cashbackRate / 100).toFixed(2);
        rewardType = 'cashback';
        currency = 'USD';
      } else if (pointsMultiplier > 0) {
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
        date_earned: order.order_date,
        status: order.status === 'received' ? 'earned' : 'pending',
        notes: `Auto-generated from order ${order.order_number}`
      });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    }
  };

  // Filter logic
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      order.retailer?.toLowerCase().includes(search.toLowerCase()) ||
      order.items?.some(item => item.product_name?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    let matchesCategory = true;
    if (categoryFilter === 'dropship') matchesCategory = order.is_dropship === true;
    else if (categoryFilter === 'pickup') matchesCategory = order.is_pickup === true;
    else if (categoryFilter === 'shipping') matchesCategory = !order.is_dropship && !order.is_pickup;

    const matchesRetailer = retailerFilter === 'all' || order.retailer === retailerFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesRetailer;
  });

  const openCreateDialog = () => {
    setEditingOrder(null);
    setFormOpen(true);
  };

  const openEditDialog = (order) => {
    setEditingOrder(order);
    setFormOpen(true);
  };

  const handleFormSubmit = (data) => {
    if (editingOrder) {
      updateMutation.mutate({ id: editingOrder.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = async (order) => {
    if (confirm('Are you sure you want to delete this purchase order?')) {
      deleteMutation.mutate(order);
      await logActivity('Deleted purchase order', 'purchase_order', order.order_number);
    }
  };

  const modes = [
    { id: 'all', label: 'All', icon: '▦' },
    { id: 'churning', label: 'Churning', icon: '◆' },
    { id: 'marketplace', label: 'Marketplace', icon: '◆' },
  ];

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Track and manage your purchases by mode"
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline">Columns</Button>
            <Button variant="outline">PRO</Button>
            <Button variant="outline">CSV</Button>
            <Button onClick={openCreateDialog} className="bg-black hover:bg-gray-800 text-white">
              <Plus className="h-4 w-4 mr-2" /> New Order
            </Button>
          </div>
        }
      />

      {/* Mode Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              mode === m.id
                ? 'bg-purple-200 text-purple-900'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <POStatsBar orders={filteredOrders} />

      <POFilters
        search={search}
        setSearch={setSearch}
        retailerFilter={retailerFilter}
        setRetailerFilter={setRetailerFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        orders={orders}
      />

      <POTable
        orders={filteredOrders}
        onEdit={openEditDialog}
        onView={(order) => {
          setSelectedOrder(order);
          setDetailsOpen(true);
        }}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      <POFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        order={editingOrder}
        onSubmit={handleFormSubmit}
        products={products}
        creditCards={creditCards}
        giftCards={giftCards}
        sellers={sellers}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <PODetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        order={selectedOrder}
        products={products}
        rewards={rewards}
      />
    </div>
  );
}