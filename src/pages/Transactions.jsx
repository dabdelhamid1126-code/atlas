import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, Trash2, Tag, Globe, X, Zap, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import TransactionsStatsBar from '@/components/transactions/TransactionsStatsBar.jsx';
import TransactionsFilters from '@/components/transactions/TransactionsFilters.jsx';
import OrderGroupedCards from '@/components/transactions/OrderGroupedCards';
import POFormModal from '@/components/purchase-orders/POFormModal';
import PODetailsModal from '@/components/purchase-orders/PODetailsModal';

const PAGE_SIZE = 20;

export default function Transactions() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [visibleColumns, setVisibleColumns] = useState([
    'date', 'product', 'vendor', 'qty', 'cost', 'sale',
    'profit', 'cashback', 'orderNum', 'tracking', 'payment', 'status', 'actions'
  ]);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const [userEmail, setUserEmail] = useState(null);
  useEffect(() => { base44.auth.me().then(u => setUserEmail(u?.email)).catch(() => {}); }, []);

  const { data: orders = [], isLoading } = useQuery({ queryKey: ['purchaseOrders', userEmail], queryFn: () => userEmail ? base44.entities.PurchaseOrder.filter({ created_by: userEmail }, '-created_date') : [], enabled: userEmail !== null });
  const { data: products = [] }    = useQuery({ queryKey: ['products'],     queryFn: () => base44.entities.Product.list() });
  const { data: creditCards = [] } = useQuery({ queryKey: ['creditCards'],  queryFn: () => base44.entities.CreditCard.list() });
  const { data: giftCards = [] }   = useQuery({ queryKey: ['giftCards'],    queryFn: () => base44.entities.GiftCard.list() });
  const { data: rewards = [] }     = useQuery({ queryKey: ['rewards'],      queryFn: () => base44.entities.Reward.list() });
  const { data: sellers = [] }     = useQuery({ queryKey: ['sellers'],      queryFn: () => base44.entities.Seller.list() });

  const createRewardForOrder = async (order) => {
    const card = creditCards.find(c => c.id === order.credit_card_id);
    if (!card) return;
    const baseAmount = order.rewards_on_original_price ? (order.original_price || order.total_cost) : (order.final_cost || order.total_cost);
    const category = order.category || 'other';
    let pointsMultiplier = card.points_rate || 1;
    let cashbackRate = card.cashback_rate || 0;
    if (category === 'dining')     { if (card.dining_points_rate)     pointsMultiplier = card.dining_points_rate;     if (card.dining_cashback_rate)     cashbackRate = card.dining_cashback_rate; }
    else if (category === 'travel')    { if (card.travel_points_rate)     pointsMultiplier = card.travel_points_rate;     if (card.travel_cashback_rate)     cashbackRate = card.travel_cashback_rate; }
    else if (category === 'groceries') { if (card.groceries_points_rate)  pointsMultiplier = card.groceries_points_rate;  if (card.groceries_cashback_rate)  cashbackRate = card.groceries_cashback_rate; }
    else if (category === 'gas')       { if (card.gas_points_rate)        pointsMultiplier = card.gas_points_rate;        if (card.gas_cashback_rate)        cashbackRate = card.gas_cashback_rate; }
    else if (category === 'streaming') { if (card.streaming_points_rate)  pointsMultiplier = card.streaming_points_rate;  if (card.streaming_cashback_rate)  cashbackRate = card.streaming_cashback_rate; }
    const rewardsToCreate = [];
    if (card.reward_type === 'cashback' && cashbackRate > 0) rewardsToCreate.push({ type: 'cashback', currency: 'USD', amount: parseFloat((baseAmount * cashbackRate / 100).toFixed(2)), notes: `Auto-generated from order ${order.order_number}` });
    else if (card.reward_type === 'points' && pointsMultiplier > 0) rewardsToCreate.push({ type: 'points', currency: 'points', amount: Math.round(baseAmount * pointsMultiplier), notes: `Auto-generated from order ${order.order_number}` });
    else if (card.reward_type === 'both') {
      if (cashbackRate > 0) rewardsToCreate.push({ type: 'cashback', currency: 'USD', amount: parseFloat((baseAmount * cashbackRate / 100).toFixed(2)), notes: `Auto-generated from order ${order.order_number}` });
      else if (pointsMultiplier > 0) rewardsToCreate.push({ type: 'points', currency: 'points', amount: Math.round(baseAmount * pointsMultiplier), notes: `Auto-generated from order ${order.order_number}` });
    }
    if (order.extra_cashback_percent > 0) rewardsToCreate.push({ type: 'cashback', currency: 'USD', amount: parseFloat((baseAmount * order.extra_cashback_percent / 100).toFixed(2)), notes: `Extra ${order.extra_cashback_percent}% cashback on order ${order.order_number}` });
    if (order.bonus_amount > 0) {
      const isPrimeYoungAdult = order.bonus_notes?.toLowerCase().includes('prime young adult');
      rewardsToCreate.push({ type: isPrimeYoungAdult ? 'cashback' : 'loyalty_rewards', currency: isPrimeYoungAdult ? 'USD' : 'points', amount: order.bonus_amount, notes: order.bonus_notes || `Bonus from order ${order.order_number}` });
    }
    for (const r of rewardsToCreate) {
      if (r.amount > 0) await base44.entities.Reward.create({ credit_card_id: order.credit_card_id, card_name: card.card_name, source: card.card_name, type: r.type, purchase_amount: baseAmount, amount: r.amount, currency: r.currency, purchase_order_id: order.id, order_number: order.order_number, date_earned: order.order_date, status: order.status === 'received' ? 'earned' : 'pending', notes: r.notes });
    }
    queryClient.invalidateQueries({ queryKey: ['rewards'] });
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const newOrder = await base44.entities.PurchaseOrder.create(data);
      if (data.gift_card_ids?.length > 0) { for (const cardId of data.gift_card_ids) await base44.entities.GiftCard.update(cardId, { status: 'used', used_order_number: data.order_number }); queryClient.invalidateQueries({ queryKey: ['giftCards'] }); }
      return newOrder;
    },
    onSuccess: async (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }); toast.success('Order created successfully');
      if ((newOrder.status === 'received' || newOrder.status === 'partially_received') && newOrder.items?.length > 0) {
        for (const item of newOrder.items) { const qty = parseInt(item.quantity_received) || 0; if (qty > 0 && item.product_id) await base44.entities.InventoryItem.create({ product_id: item.product_id, product_name: item.product_name, quantity: qty, status: 'in_stock', purchase_order_id: newOrder.id, unit_cost: parseFloat(item.unit_cost) || 0 }); }
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      }
      if (newOrder.credit_card_id && newOrder.total_cost) await createRewardForOrder(newOrder);
      setFormOpen(false); setEditingOrder(null);
    },
    onError: () => toast.error('Failed to save order')
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updatedOrder = await base44.entities.PurchaseOrder.update(id, data);
      if (data.gift_card_ids?.length > 0) { for (const cardId of data.gift_card_ids) await base44.entities.GiftCard.update(cardId, { status: 'used', used_order_number: data.order_number }); queryClient.invalidateQueries({ queryKey: ['giftCards'] }); }
      return updatedOrder;
    },
    onSuccess: async (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] }); toast.success('Order updated successfully');
      if (updatedOrder.credit_card_id && updatedOrder.total_cost) {
        const existingRewards = await base44.entities.Reward.filter({ purchase_order_id: updatedOrder.id });
        for (const reward of existingRewards) await base44.entities.Reward.delete(reward.id);
        await createRewardForOrder(updatedOrder);
      }
      setFormOpen(false); setEditingOrder(null);
    },
    onError: () => toast.error('Failed to save order')
  });

  const deleteMutation = useMutation({
    mutationFn: async (order) => {
      const orderRewards = await base44.entities.Reward.filter({ purchase_order_id: order.id });
      for (const reward of orderRewards) await base44.entities.Reward.delete(reward.id);
      if (order.gift_card_ids?.length > 0) { for (const cardId of order.gift_card_ids) await base44.entities.GiftCard.update(cardId, { status: 'available', used_order_number: null }); }
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

  const filteredOrders = useMemo(() => orders.filter(order => {
    let matchesMode = true;
    if (mode === 'churning') matchesMode = order.order_type === 'churning';
    else if (mode === 'marketplace') matchesMode = order.order_type === 'marketplace';
    const matchesSearch = !search || order.order_number?.toLowerCase().includes(search.toLowerCase()) || order.retailer?.toLowerCase().includes(search.toLowerCase()) || order.items?.some(item => item.product_name?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus  = statusFilter === 'all' || order.status === statusFilter;
    const matchesVendor  = vendorFilter === 'all' || order.retailer === vendorFilter;
    const matchesPayment = paymentMethodFilter === 'all' || order.credit_card_id === paymentMethodFilter;
    const matchesCategory = categoryFilter === 'all' || order.category === categoryFilter;
    let matchesDateRange = true;
    if (fromDate) { const fromD = new Date(fromDate); const orderD = new Date(order.order_date || order.created_date); matchesDateRange = orderD >= fromD; }
    if (toDate && matchesDateRange) { const toD = new Date(toDate); toD.setHours(23,59,59,999); const orderD = new Date(order.order_date || order.created_date); matchesDateRange = orderD <= toD; }
    return matchesMode && matchesSearch && matchesStatus && matchesVendor && matchesPayment && matchesCategory && matchesDateRange;
  }), [orders, mode, search, statusFilter, vendorFilter, paymentMethodFilter, categoryFilter, fromDate, toDate]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let aVal = a[sortColumn]; let bVal = b[sortColumn];
      if (sortColumn === 'date') { aVal = new Date(a.order_date || a.created_date); bVal = new Date(b.order_date || b.created_date); }
      else if (sortColumn === 'product') { aVal = a.product_name || a.items?.[0]?.product_name || ''; bVal = b.product_name || b.items?.[0]?.product_name || ''; }
      else if (sortColumn === 'vendor') { aVal = a.retailer || ''; bVal = b.retailer || ''; }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedOrders = useMemo(() => sortedOrders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [sortedOrders, safePage]);
  useMemo(() => { setCurrentPage(1); }, [mode, search, statusFilter, vendorFilter, paymentMethodFilter, categoryFilter, fromDate, toDate, sortColumn, sortDirection]);

  const handleCSVDownload = () => {
    const columnMap = { date:'DATE', product:'PRODUCT', vendor:'VENDOR', qty:'QTY', cost:'COST', sale:'SALE', profit:'PROFIT', cashback:'CASHBACK', orderNum:'ORDER #', tracking:'TRACKING #', payment:'PAYMENT', status:'STATUS' };
    const headers = visibleColumns.filter(col => col !== 'actions' && columnMap[col]).map(col => columnMap[col]).join(',');
    const rows = sortedOrders.map(order => {
      const values = [];
      visibleColumns.forEach(col => {
        if (col === 'actions') return;
        let val = '';
        switch (col) {
          case 'date': val = order.order_date ? new Date(order.order_date).toLocaleDateString() : ''; break;
          case 'product': val = order.product_name || order.items?.[0]?.product_name || ''; break;
          case 'vendor': val = order.retailer || ''; break;
          case 'qty': val = order.items?.reduce((sum, i) => sum + (i.quantity_ordered || 0), 0) || '0'; break;
          case 'cost': val = (order.total_cost || order.original_price || 0).toFixed(2); break;
          case 'sale': val = (order.final_cost || order.total_cost || 0).toFixed(2); break;
          case 'profit': val = ((order.final_cost || order.total_cost || 0) - (order.total_cost || 0)).toFixed(2); break;
          case 'cashback': val = order.bonus_amount || ''; break;
          case 'orderNum': val = order.order_number || ''; break;
          case 'tracking': val = order.tracking_number || ''; break;
          case 'payment': const card = creditCards.find(c => c.id === order.credit_card_id); val = card ? `${card.card_name}` : order.card_name || ''; break;
          case 'status': val = order.status || ''; break;
        }
        values.push(`"${String(val).replace(/"/g, '""')}"`);
      });
      return values.join(',');
    }).join('\n');
    const blob = new Blob([[headers, rows].join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} selected order(s)?`)) return;
    const toDelete = orders.filter(o => selectedIds.has(o.id));
    for (const order of toDelete) await deleteMutation.mutateAsync(order);
    setSelectedIds(new Set());
  };

  const vendors = useMemo(() => [...new Set(orders.map(o => o.retailer).filter(Boolean))].sort(), [orders]);
  const modeCounts = useMemo(() => ({ all: orders.length, churning: orders.filter(o => o.order_type === 'churning').length, marketplace: orders.filter(o => o.order_type === 'marketplace').length }), [orders]);

  const modes = [
    { id: 'all',         label: 'All',         Icon: LayoutGrid },
    { id: 'churning',    label: 'Churning',    Icon: Zap        },
    { id: 'marketplace', label: 'Marketplace', Icon: Globe      },
  ];

  const clearFilters = () => { setSearch(''); setStatusFilter('all'); setVendorFilter('all'); setFromDate(''); setToDate(''); setPaymentMethodFilter('all'); setCategoryFilter('all'); setAccountFilter('all'); };

  const activeTabStyle  = { background: 'var(--ink)', color: 'var(--gold)', border: 'none' };
  const inactiveTabStyle = { background: 'transparent', color: 'var(--ink-dim)', border: 'none' };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.3px' }}>Transactions</h1>
          <p style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 4 }}>Track and manage your purchases</p>
        </div>
        <button onClick={handleCSVDownload}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--parch-card)', border: '1px solid var(--parch-line)', color: 'var(--ink-faded)', cursor: 'pointer' }}>
          <Download style={{ width: 14, height: 14 }} /> Export CSV
        </button>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 20, padding: 3, borderRadius: 10, width: 'fit-content', background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
        {modes.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', ...(mode === m.id ? activeTabStyle : inactiveTabStyle) }}>
            <m.Icon style={{ width: 14, height: 14 }} />
            {m.label}
            <span style={{ fontSize: 10, opacity: 0.7, fontFamily: "'Cinzel', serif" }}>({modeCounts[m.id]})</span>
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 16px', borderRadius: 10, background: 'var(--gold-bg)', border: '1px solid var(--gold-border)' }}>
          <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 13 }}>{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: 'var(--crimson-bg)', border: '1px solid var(--crimson-bdr)', color: 'var(--crimson)', cursor: 'pointer' }}>
            <Trash2 style={{ width: 14, height: 14 }} /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <X style={{ width: 14, height: 14 }} /> Clear
          </button>
        </div>
      )}

      <TransactionsStatsBar orders={filteredOrders} />

      <TransactionsFilters
        search={search} onSearchChange={setSearch}
        statusFilter={statusFilter} onStatusChange={setStatusFilter}
        vendorFilter={vendorFilter} onVendorChange={setVendorFilter}
        fromDate={fromDate} onFromDateChange={setFromDate}
        toDate={toDate} onToDateChange={setToDate}
        paymentMethodFilter={paymentMethodFilter} onPaymentMethodChange={setPaymentMethodFilter}
        categoryFilter={categoryFilter} onCategoryChange={setCategoryFilter}
        accountFilter={accountFilter} onAccountChange={setAccountFilter}
        vendors={vendors} creditCards={creditCards}
      />

      {/* Results count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
          Showing <strong style={{ color: 'var(--ink)' }}>{Math.min((safePage - 1) * PAGE_SIZE + 1, sortedOrders.length)}–{Math.min(safePage * PAGE_SIZE, sortedOrders.length)}</strong> of <strong style={{ color: 'var(--ink)' }}>{sortedOrders.length}</strong> orders
        </span>
        {totalPages > 1 && <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>Page {safePage} of {totalPages}</span>}
      </div>

      <OrderGroupedCards
        data={pagedOrders} creditCards={creditCards} rewards={rewards} products={products}
        onEdit={(order) => { setEditingOrder(order); setFormOpen(true); }}
        onDelete={(order) => { if (confirm('Delete this order?')) deleteMutation.mutate(order); }}
        isLoading={isLoading} selectedIds={selectedIds} onSelectionChange={setSelectedIds}
        onClearFilters={clearFilters}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, paddingBottom: 8 }}>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid var(--parch-line)', background: 'var(--parch-card)', color: safePage === 1 ? 'var(--ink-ghost)' : 'var(--ink-faded)', cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}>
            <ChevronLeft style={{ width: 14, height: 14 }} /> Prev
          </button>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push('...'); acc.push(p); return acc; }, [])
              .map((p, i) => p === '...'
                ? <span key={`e-${i}`} style={{ padding: '7px 6px', fontSize: 12, color: 'var(--ink-ghost)' }}>…</span>
                : <button key={p} onClick={() => setCurrentPage(p)}
                    style={{ width: 34, height: 34, borderRadius: 8, fontSize: 12, fontWeight: p === safePage ? 700 : 500, border: '1px solid', cursor: 'pointer', borderColor: p === safePage ? 'var(--gold-border)' : 'var(--parch-line)', background: p === safePage ? 'var(--gold-bg)' : 'var(--parch-card)', color: p === safePage ? 'var(--gold)' : 'var(--ink-faded)' }}>
                    {p}
                  </button>
              )}
          </div>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid var(--parch-line)', background: 'var(--parch-card)', color: safePage === totalPages ? 'var(--ink-ghost)' : 'var(--ink-faded)', cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}>
            Next <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      <POFormModal
        open={formOpen} onOpenChange={setFormOpen} order={editingOrder}
        onSubmit={(data) => { if (editingOrder) updateMutation.mutate({ id: editingOrder.id, data }); else createMutation.mutate(data); }}
        products={products} creditCards={creditCards} giftCards={giftCards} sellers={sellers}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
      <PODetailsModal open={detailsOpen} onOpenChange={setDetailsOpen} order={selectedOrder} products={products} rewards={rewards} creditCards={creditCards} />
    </div>
  );
}