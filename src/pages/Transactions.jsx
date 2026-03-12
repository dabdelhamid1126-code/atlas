import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Download, Settings, Eye } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import TransactionsStatsBar from '@/components/transactions/TransactionsStatsBar.jsx';
import TransactionsFilters from '@/components/transactions/TransactionsFilters.jsx';
import TransactionsTableMerged from '@/components/transactions/TransactionsTableMerged.jsx';
import POFormModal from '@/components/purchase-orders/POFormModal';
import PODetailsModal from '@/components/purchase-orders/PODetailsModal';

export default function Transactions() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [visibleColumns, setVisibleColumns] = useState([
    'date', 'product', 'vendor', 'platform', 'qty', 'cost', 'sale',
    'profit', 'cashback', 'orderNum', 'tracking', 'payment', 'status', 'actions'
  ]);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Data queries
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

  const { data: sellers = [] } = useQuery({
    queryKey: ['sellers'],
    queryFn: () => base44.entities.Seller.list()
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const newOrder = await base44.entities.PurchaseOrder.create(data);
      if (data.gift_card_ids?.length > 0) {
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
    },
    onError: () => {
      toast.error('Failed to save order');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updatedOrder = await base44.entities.PurchaseOrder.update(id, data);
      if (data.gift_card_ids?.length > 0) {
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
      if (order.gift_card_ids?.length > 0) {
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
    let rewardAmount = 0, rewardType = 'cashback', currency = 'USD';
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
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Tab filter
      let matchesMode = true;
      if (mode === 'churning') {
        matchesMode = order.delivery_type === 'Dropship' || order.order_type === 'Churning';
      } else if (mode === 'marketplace') {
        matchesMode = order.order_type === 'Marketplace' || order.delivery_type === 'Pickup';
      }

      // Other filters
      const matchesSearch = !search || 
        order.order_number?.toLowerCase().includes(search.toLowerCase()) ||
        order.retailer?.toLowerCase().includes(search.toLowerCase()) ||
        order.items?.some(item => item.product_name?.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesVendor = vendorFilter === 'all' || order.retailer === vendorFilter;
      const matchesPlatform = platformFilter === 'all' || order.platform === platformFilter;
      const matchesPayment = paymentMethodFilter === 'all' || order.credit_card_id === paymentMethodFilter;
      const matchesCategory = categoryFilter === 'all' || order.category === categoryFilter;

      let matchesDateRange = true;
      if (fromDate) {
        const fromD = new Date(fromDate);
        const orderD = new Date(order.order_date || order.created_date);
        matchesDateRange = orderD >= fromD;
      }
      if (toDate && matchesDateRange) {
        const toD = new Date(toDate);
        toD.setHours(23, 59, 59, 999);
        const orderD = new Date(order.order_date || order.created_date);
        matchesDateRange = orderD <= toD;
      }

      return matchesMode && matchesSearch && matchesStatus && matchesVendor && 
             matchesPlatform && matchesPayment && matchesCategory && matchesDateRange;
    });
  }, [orders, mode, search, statusFilter, vendorFilter, platformFilter, 
      paymentMethodFilter, categoryFilter, fromDate, toDate]);

  // Sorting
  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'date') {
        aVal = new Date(a.order_date || a.created_date);
        bVal = new Date(b.order_date || b.created_date);
      } else if (sortColumn === 'product') {
        aVal = a.product_name || a.items?.[0]?.product_name || '';
        bVal = b.product_name || b.items?.[0]?.product_name || '';
      } else if (sortColumn === 'vendor') {
        aVal = a.retailer || '';
        bVal = b.retailer || '';
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredOrders, sortColumn, sortDirection]);

  const handleSort = (colId) => {
    if (sortColumn === colId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colId);
      setSortDirection('asc');
    }
  };

  const toggleColumn = (colId) => {
    setVisibleColumns(prev =>
      prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]
    );
  };

  const showAllColumns = () => {
    setVisibleColumns([
      'date', 'product', 'vendor', 'platform', 'qty', 'cost', 'sale',
      'profit', 'cashback', 'orderNum', 'tracking', 'payment', 'status', 'actions'
    ]);
  };

  const handleCSVDownload = () => {
    const columnMap = {
      date: 'DATE',
      product: 'PRODUCT',
      vendor: 'VENDOR',
      platform: 'PLATFORM',
      qty: 'QTY',
      cost: 'COST',
      sale: 'SALE',
      profit: 'PROFIT',
      cashback: 'CASHBACK',
      orderNum: 'ORDER #',
      tracking: 'TRACKING #',
      payment: 'PAYMENT',
      status: 'STATUS'
    };

    const headers = visibleColumns
      .filter(col => col !== 'actions' && columnMap[col])
      .map(col => columnMap[col])
      .join(',');

    const rows = sortedOrders.map(order => {
      const values = [];
      visibleColumns.forEach(col => {
        if (col === 'actions') return;
        let val = '';
        switch (col) {
          case 'date':
            val = order.order_date ? new Date(order.order_date).toLocaleDateString() : '';
            break;
          case 'product':
            val = order.product_name || order.items?.[0]?.product_name || '';
            break;
          case 'vendor':
            val = order.retailer || '';
            break;
          case 'platform':
            val = order.platform || '';
            break;
          case 'qty':
            val = order.items?.reduce((sum, i) => sum + (i.quantity_ordered || 0), 0) || '0';
            break;
          case 'cost':
            val = (order.total_cost || order.original_price || 0).toFixed(2);
            break;
          case 'sale':
            val = (order.final_cost || order.total_cost || 0).toFixed(2);
            break;
          case 'profit':
            val = ((order.final_cost || order.total_cost || 0) - (order.total_cost || 0)).toFixed(2);
            break;
          case 'cashback':
            val = order.bonus_amount || '';
            break;
          case 'orderNum':
            val = order.order_number || '';
            break;
          case 'tracking':
            val = order.tracking_number || '';
            break;
          case 'payment':
            const card = creditCards.find(c => c.id === order.credit_card_id);
            val = card ? `${card.card_name} (${card.id?.slice(-4) || 'XXXX'})` : order.card_name || '';
            break;
          case 'status':
            val = order.status || '';
            break;
        }
        values.push(`"${String(val).replace(/"/g, '""')}"`);
      });
      return values.join(',');
    }).join('\n');

    const csv = [headers, rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const vendors = useMemo(() => {
    return [...new Set(orders.map(o => o.retailer).filter(Boolean))].sort();
  }, [orders]);

  const platforms = useMemo(() => {
    return [...new Set(orders.map(o => o.platform).filter(Boolean))].sort();
  }, [orders]);

  const modes = [
    { id: 'all', label: 'All' },
    { id: 'churning', label: '🔄 Churning' },
    { id: 'marketplace', label: '🏪 Marketplace' },
  ];

  const columnOptions = [
    { id: 'date', label: 'Date' },
    { id: 'product', label: 'Product' },
    { id: 'vendor', label: 'Vendor' },
    { id: 'platform', label: 'Platform' },
    { id: 'qty', label: 'Qty' },
    { id: 'cost', label: 'Cost' },
    { id: 'sale', label: 'Sale' },
    { id: 'profit', label: 'Profit' },
    { id: 'cashback', label: 'Cashback' },
    { id: 'orderNum', label: 'Order #' },
    { id: 'tracking', label: 'Tracking #' },
    { id: 'payment', label: 'Payment' },
    { id: 'status', label: 'Status' },
  ];

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="All purchase orders and transactions"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative group">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Columns
              </Button>
              <div className="absolute right-0 top-full mt-2 bg-white border rounded-lg shadow-lg p-2 hidden group-hover:block z-50 min-w-48">
                {columnOptions.map(col => (
                  <label key={col.id} className="flex items-center gap-2 p-2 hover:bg-slate-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.id)}
                      onChange={() => toggleColumn(col.id)}
                      className="rounded"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={showAllColumns} title="Show all columns">
              ▦ PRO
            </Button>
            <Button variant="outline" size="sm" onClick={handleCSVDownload}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button onClick={() => { setEditingOrder(null); setFormOpen(true); }} className="bg-black hover:bg-gray-800 text-white">
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
            className={`px-4 py-2 rounded-full font-medium text-sm transition border ${
              mode === m.id
                ? 'bg-purple-600 text-white border-purple-600'
                : 'border-slate-300 text-slate-700 hover:border-slate-400'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <TransactionsStatsBar orders={filteredOrders} />

      <TransactionsFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        vendorFilter={vendorFilter}
        onVendorChange={setVendorFilter}
        platformFilter={platformFilter}
        onPlatformChange={setPlatformFilter}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        toDate={toDate}
        onToDateChange={setToDate}
        paymentMethodFilter={paymentMethodFilter}
        onPaymentMethodChange={setPaymentMethodFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        accountFilter={accountFilter}
        onAccountChange={setAccountFilter}
        vendors={vendors}
        platforms={platforms}
        creditCards={creditCards}
      />

      <TransactionsTableMerged
        data={sortedOrders}
        visibleColumns={visibleColumns}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        onEdit={(order) => { setEditingOrder(order); setFormOpen(true); }}
        onView={(order) => { setSelectedOrder(order); setDetailsOpen(true); }}
        onDelete={(order) => {
          if (confirm('Delete this order?')) {
            deleteMutation.mutate(order);
          }
        }}
        creditCards={creditCards}
        isLoading={isLoading}
      />

      <POFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        order={editingOrder}
        onSubmit={(data) => {
          if (editingOrder) {
            updateMutation.mutate({ id: editingOrder.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
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
        creditCards={creditCards}
      />
    </div>
  );
}