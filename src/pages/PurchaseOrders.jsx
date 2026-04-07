import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
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

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders', sortOrder],
    queryFn: async () => {
      let data = await base44.entities.PurchaseOrder.list();
      if (sortOrder === 'order-date-new') data.sort((a, b) => new Date(b.order_date || 0) - new Date(a.order_date || 0));
      else if (sortOrder === 'order-date-old') data.sort((a, b) => new Date(a.order_date || 0) - new Date(b.order_date || 0));
      else if (sortOrder === 'total-high') data.sort((a, b) => (b.final_cost || b.total_cost || 0) - (a.final_cost || a.total_cost || 0));
      else if (sortOrder === 'total-low') data.sort((a, b) => (a.final_cost || a.total_cost || 0) - (b.final_cost || b.total_cost || 0));
      else if (sortOrder === 'name-asc') data.sort((a, b) => (a.retailer || '').localeCompare(b.retailer || ''));
      else if (sortOrder === 'name-desc') data.sort((a, b) => (b.retailer || '').localeCompare(a.retailer || ''));
      return data;
    }
  });

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list() });
  const { data: creditCards = [] } = useQuery({ queryKey: ['creditCards'], queryFn: () => base44.entities.CreditCard.list() });
  const { data: giftCards = [] } = useQuery({ queryKey: ['giftCards'], queryFn: () => base44.entities.GiftCard.list() });
  const { data: rewards = [] } = useQuery({ queryKey: ['rewards'], queryFn: () => base44.entities.Reward.list() });
  const { data: sellers = [] } = useQuery({ queryKey: ['sellers'], queryFn: () => base44.entities.Seller.list() });

  const logActivity = async (action, entityType, details) => {
    const user = await base44.auth.me();
    await base44.entities.ActivityLog.create({ action, entity_type: entityType, details, user_name: user.full_name, user_email: user.email });
  };

  const createRewardForOrder = async (order) => {
    const card = creditCards.find(c => c.id === order.credit_card_id);
    if (!card) return;
    const amount = order.final_cost || order.total_cost;
    const category = order.category || 'other';
    let pointsMultiplier = card.points_rate || 1;
    let cashbackRate = card.cashback_rate || 0;
    if (category === 'dining') { if (card.dining_points_rate) pointsMultiplier = card.dining_points_rate; if (card.dining_cashback_rate) cashbackRate = card.dining_cashback_rate; }
    else if (category === 'travel') { if (card.travel_points_rate) pointsMultiplier = card.travel_points_rate; if (card.travel_cashback_rate) cashbackRate = card.travel_cashback_rate; }
    else if (category === 'groceries') { if (card.groceries_points_rate) pointsMultiplier = card.groceries_points_rate; if (card.groceries_cashback_rate) cashbackRate = card.groceries_cashback_rate; }
    else if (category === 'gas') { if (card.gas_points_rate) pointsMultiplier = card.gas_points_rate; if (card.gas_cashback_rate) cashbackRate = card.gas_cashback_rate; }
    else if (category === 'streaming') { if (card.streaming_points_rate) pointsMultiplier = card.streaming_points_rate; if (card.streaming_cashback_rate) cashbackRate = card.streaming_cashback_rate; }
    let rewardAmount = 0; let rewardType = 'cashback'; let currency = 'USD';
    if (card.reward_type === 'cashback' && cashbackRate > 0) { rewardAmount = (amount * cashbackRate / 100).toFixed(2); rewardType = 'cashback'; currency = 'USD'; }
    else if (card.reward_type === 'points' && pointsMultiplier > 0) { rewardAmount = Math.round(amount * pointsMultiplier); rewardType = 'points'; currency = 'points'; }
    else if (card.reward_type === 'both') { if (cashbackRate > 0) { rewardAmount = (amount * cashbackRate / 100).toFixed(2); rewardType = 'cashback'; currency = 'USD'; } else if (pointsMultiplier > 0) { rewardAmount = Math.round(amount * pointsMultiplier); rewardType = 'points'; currency = 'points'; } }
    if (rewardAmount > 0) {
      await base44.entities.Reward.create({ credit_card_id: order.credit_card_id, card_name: card.card_name, source: card.card_name, type: rewardType, purchase_amount: amount, amount: parseFloat(rewardAmount), currency, purchase_order_id: order.id, order_number: order.order_number, date_earned: order.order_date, status: order.status === 'received' ? 'earned' : 'pending', notes: `Auto-generated from order ${order.order_number}` });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const newOrder = await base44.entities.PurchaseOrder.create(data);
      if (data.gift_card_ids?.length > 0) {
        for (const cardId of data.gift_card_ids) await base44.entities.GiftCard.update(cardId, { status: 'used', used_order_number: data.order_number });
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
          if (qtyReceived > 0 && item.product_id) await base44.entities.InventoryItem.create({ product_id: item.product_id, product_name: item.product_name, quantity: qtyReceived, status: 'in_stock', purchase_order_id: newOrder.id, unit_cost: parseFloat(item.unit_cost) || 0 });
        }
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      }
      if (newOrder.credit_card_id && newOrder.total_cost) await createRewardForOrder(newOrder);
      setFormOpen(false); setEditingOrder(null);
      await logActivity('Created purchase order', 'purchase_order', newOrder.order_number);
    },
    onError: () => toast.error('Failed to save order')
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updatedOrder = await base44.entities.PurchaseOrder.update(id, data);
      if (data.gift_card_ids?.length > 0) {
        for (const cardId of data.gift_card_ids) await base44.entities.GiftCard.update(cardId, { status: 'used', used_order_number: data.order_number });
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
            const existingInventory = await base44.entities.InventoryItem.filter({ purchase_order_id: updatedOrder.id, product_id: item.product_id });
            if (existingInventory?.length > 0) await base44.entities.InventoryItem.update(existingInventory[0].id, { quantity: qtyReceived, unit_cost: parseFloat(item.unit_cost) || 0, status: 'in_stock' });
            else await base44.entities.InventoryItem.create({ product_id: item.product_id, product_name: item.product_name, quantity: qtyReceived, status: 'in_stock', purchase_order_id: updatedOrder.id, unit_cost: parseFloat(item.unit_cost) || 0 });
          }
        }
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      }
      if (updatedOrder.credit_card_id && updatedOrder.total_cost) {
        const existingRewards = await base44.entities.Reward.filter({ purchase_order_id: updatedOrder.id });
        for (const reward of existingRewards) await base44.entities.Reward.delete(reward.id);
        await createRewardForOrder(updatedOrder);
      }
      setFormOpen(false); setEditingOrder(null);
      await logActivity('Updated purchase order', 'purchase_order', updatedOrder.order_number);
    },
    onError: () => toast.error('Failed to save order')
  });

  const deleteMutation = useMutation({
    mutationFn: async (order) => {
      const orderRewards = await base44.entities.Reward.filter({ purchase_order_id: order.id });
      for (const reward of orderRewards) await base44.entities.Reward.delete(reward.id);
      if (order.gift_card_ids?.length > 0) {
        for (const cardId of order.gift_card_ids) await base44.entities.GiftCard.update(cardId, { status: 'available', used_order_number: null });
      }
      await base44.entities.PurchaseOrder.delete(order.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      toast.success('Order deleted successfully');
    },
    onError: () => toast.error('Failed to delete order')
  });

  const filteredOrders = orders.filter(order => {
    let matchesMode = true;
    if (mode === 'churning') matchesMode = order.delivery_type === 'Dropship' || order.order_type === 'Churning';
    else if (mode === 'marketplace') matchesMode = order.order_type === 'Marketplace' || order.delivery_type === 'Pickup';
    const matchesSearch = order.order_number?.toLowerCase().includes(search.toLowerCase()) || order.retailer?.toLowerCase().includes(search.toLowerCase()) || order.items?.some(item => item.product_name?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    let matchesCategory = true;
    if (categoryFilter === 'dropship') matchesCategory = order.is_dropship === true;
    else if (categoryFilter === 'pickup') matchesCategory = order.is_pickup === true;
    else if (categoryFilter === 'shipping') matchesCategory = !order.is_dropship && !order.is_pickup;
    const matchesRetailer = retailerFilter === 'all' || order.retailer === retailerFilter;
    return matchesMode && matchesSearch && matchesStatus && matchesCategory && matchesRetailer;
  });

  const columnOptions = [
    { id: 'retailer', label: 'Retailer' }, { id: 'orderNum', label: 'Order #' },
    { id: 'tracking', label: 'Tracking #' }, { id: 'status', label: 'Status' },
    { id: 'total', label: 'Total' }, { id: 'items', label: 'Items' },
    { id: 'orderDate', label: 'Order Date' }, { id: 'actions', label: 'Actions' },
  ];

  const handleCSVDownload = () => {
    const headers = columnOptions.filter(col => visibleColumns.includes(col.id)).map(col => col.label).join(',');
    const rows = filteredOrders.map(order => {
      const values = [];
      columnOptions.forEach(col => {
        if (!visibleColumns.includes(col.id)) return;
        switch (col.id) {
          case 'retailer': values.push(`"${order.retailer || 'Unknown'}"`); break;
          case 'orderNum': values.push(`"${order.order_number}"`); break;
          case 'tracking': values.push(`"${order.tracking_number || '—'}"`); break;
          case 'status': values.push(`"${order.status}"`); break;
          case 'total': values.push((order.final_cost || order.total_cost || 0).toFixed(2)); break;
          case 'items': values.push(order.items?.reduce((sum, item) => sum + (item.quantity_ordered || 0), 0) || 0); break;
          case 'orderDate': values.push(`"${order.order_date ? new Date(order.order_date).toLocaleDateString() : ''}"`); break;
        }
      });
      return values.join(',');
    }).join('\n');
    const blob = new Blob([[headers, rows].join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `purchase-orders-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const modes = [
    { id: 'all', label: 'All' },
    { id: 'churning', label: 'Churning' },
    { id: 'marketplace', label: 'Marketplace' },
  ];

  const btnStyle = (active) => ({
    padding: '6px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'var(--ink)' : 'transparent',
    color: active ? 'var(--gold)' : 'var(--ink-dim)',
    border: active ? 'none' : '1px solid var(--parch-line)',
  });

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Track and manage your purchases by mode"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }} className="group">
              <button style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-faded)', cursor: 'pointer' }}>
                Columns
              </button>
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 10, padding: 8, zIndex: 50, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }} className="hidden group-hover:block">
                {columnOptions.map(col => (
                  <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 12, color: 'var(--ink-faded)', borderRadius: 6, whiteSpace: 'nowrap' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--parch-warm)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <input type="checkbox" checked={visibleColumns.includes(col.id)} onChange={() => setVisibleColumns(prev => prev.includes(col.id) ? prev.filter(c => c !== col.id) : [...prev, col.id])} style={{ accentColor: 'var(--gold)' }} />
                    {col.label}
                  </label>
                ))}
              </div>
            </div>
            <button onClick={() => setVisibleColumns(columnOptions.map(c => c.id))}
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-faded)', cursor: 'pointer' }}>
              PRO
            </button>
            <button onClick={handleCSVDownload}
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-faded)', cursor: 'pointer' }}>
              CSV
            </button>
            <button onClick={() => { setEditingOrder(null); setFormOpen(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--ink)', color: 'var(--gold)', border: 'none', cursor: 'pointer', fontFamily: "'Playfair Display', serif", letterSpacing: '0.04em' }}>
              <Plus style={{ width: 14, height: 14 }} /> New Order
            </button>
          </div>
        }
      />

      {/* Mode Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20, padding: 3, borderRadius: 9, background: 'var(--parch-card)', border: '1px solid var(--parch-line)', width: 'fit-content' }}>
        {modes.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)} style={btnStyle(mode === m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      <POFilters
        search={search} setSearch={setSearch}
        retailerFilter={retailerFilter} setRetailerFilter={setRetailerFilter}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
        sortOrder={sortOrder} setSortOrder={setSortOrder}
        orders={orders}
      />

      <POTable
        orders={filteredOrders}
        onEdit={order => { setEditingOrder(order); setFormOpen(true); }}
        onView={order => { setSelectedOrder(order); setDetailsOpen(true); }}
        onDelete={async order => {
          if (confirm('Are you sure you want to delete this purchase order?')) {
            deleteMutation.mutate(order);
            await logActivity('Deleted purchase order', 'purchase_order', order.order_number);
          }
        }}
        isLoading={isLoading}
        visibleColumns={visibleColumns}
      />

      <POFormModal
        open={formOpen} onOpenChange={setFormOpen}
        order={editingOrder} onSubmit={data => editingOrder ? updateMutation.mutate({ id: editingOrder.id, data }) : createMutation.mutate(data)}
        products={products} creditCards={creditCards} giftCards={giftCards} sellers={sellers}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <PODetailsModal
        open={detailsOpen} onOpenChange={setDetailsOpen}
        order={selectedOrder} products={products} rewards={rewards}
      />
    </div>
  );
}