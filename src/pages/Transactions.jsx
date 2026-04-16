import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download, Trash2, X, Zap, LayoutGrid, Globe,
  ChevronLeft, ChevronRight, Search, SlidersHorizontal,
  Package, CreditCard, Tag, TrendingUp, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import OrderGroupedCards from '@/components/transactions/OrderGroupedCards';
import POFormModal from '@/components/purchase-orders/POFormModal';
import PODetailsModal from '@/components/purchase-orders/PODetailsModal';

const PAGE_SIZE = 20;

const fmt$ = (v) => {
  const n = parseFloat(v) || 0;
  return n < 0 ? `-$${Math.abs(n).toFixed(2)}` : `$${n.toFixed(2)}`;
};

export default function Transactions() {
  const queryClient = useQueryClient();
  const [mode,                setMode]                = useState('all');
  const [search,              setSearch]              = useState('');
  const [statusFilter,        setStatusFilter]        = useState('all');
  const [vendorFilter,        setVendorFilter]        = useState('all');
  const [fromDate,            setFromDate]            = useState('');
  const [toDate,              setToDate]              = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [categoryFilter,      setCategoryFilter]      = useState('all');
  const [showMoreFilters,     setShowMoreFilters]     = useState(false);
  const [formOpen,            setFormOpen]            = useState(false);
  const [detailsOpen,         setDetailsOpen]         = useState(false);
  const [editingOrder,        setEditingOrder]        = useState(null);
  const [selectedOrder,       setSelectedOrder]       = useState(null);
  const [selectedIds,         setSelectedIds]         = useState(new Set());
  const [currentPage,         setCurrentPage]         = useState(1);
  const [userEmail,           setUserEmail]           = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setUserEmail(u?.email)).catch(() => {});
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders', userEmail],
    queryFn: () => userEmail ? base44.entities.PurchaseOrder.filter({ created_by: userEmail }, '-created_date') : [],
    enabled: userEmail !== null,
  });
  const { data: products    = [] } = useQuery({ queryKey: ['products'],    queryFn: () => base44.entities.Product.list() });
  const { data: creditCards = [] } = useQuery({ queryKey: ['creditCards'], queryFn: () => base44.entities.CreditCard.list() });
  const { data: giftCards   = [] } = useQuery({ queryKey: ['giftCards'],   queryFn: () => base44.entities.GiftCard.list() });
  const { data: rewards     = [] } = useQuery({ queryKey: ['rewards'],     queryFn: () => base44.entities.Reward.list() });
  const { data: sellers     = [] } = useQuery({ queryKey: ['sellers'],     queryFn: () => base44.entities.Seller.list() });

  const createRewardForOrder = async (order) => {
    const card = creditCards.find(c => c.id === order.credit_card_id);
    if (!card) return;
    const base = order.rewards_on_original_price
      ? (order.original_price || order.total_cost)
      : (order.final_cost || order.total_cost);
    const cashbackRate = card.cashback_rate || 0;
    const pointsRate   = card.points_rate   || 1;
    const rewardsToCreate = [];
    if (card.reward_type === 'cashback' && cashbackRate > 0)
      rewardsToCreate.push({ type:'cashback', currency:'USD', amount: parseFloat((base * cashbackRate / 100).toFixed(2)), notes:`Auto from order ${order.order_number}` });
    else if (card.reward_type === 'points' && pointsRate > 0)
      rewardsToCreate.push({ type:'points', currency:'points', amount: Math.round(base * pointsRate), notes:`Auto from order ${order.order_number}` });
    if (order.extra_cashback_percent > 0)
      rewardsToCreate.push({ type:'cashback', currency:'USD', amount: parseFloat((base * order.extra_cashback_percent / 100).toFixed(2)), notes:`Extra ${order.extra_cashback_percent}% on ${order.order_number}` });
    if (order.bonus_amount > 0) {
      const isPYA = order.bonus_notes?.toLowerCase().includes('prime young adult');
      rewardsToCreate.push({ type: isPYA ? 'cashback' : 'loyalty_rewards', currency: isPYA ? 'USD' : 'points', amount: order.bonus_amount, notes: order.bonus_notes || `Bonus from ${order.order_number}` });
    }
    for (const r of rewardsToCreate) {
      if (r.amount > 0) await base44.entities.Reward.create({
        credit_card_id: order.credit_card_id, card_name: card.card_name, source: card.card_name,
        type: r.type, purchase_amount: base, amount: r.amount, currency: r.currency,
        purchase_order_id: order.id, order_number: order.order_number,
        date_earned: order.order_date, status: order.status === 'received' ? 'earned' : 'pending', notes: r.notes,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['rewards'] });
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const o = await base44.entities.PurchaseOrder.create(data);
      if (data.gift_card_ids?.length > 0) {
        for (const id of data.gift_card_ids)
          await base44.entities.GiftCard.update(id, { status:'used', used_order_number: data.order_number });
        queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      }
      return o;
    },
    onSuccess: async (o) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Order created');
      if ((o.status === 'received' || o.status === 'partially_received') && o.items?.length > 0) {
        for (const item of o.items) {
          const qty = parseInt(item.quantity_received) || 0;
          if (qty > 0 && item.product_id)
            await base44.entities.InventoryItem.create({ product_id: item.product_id, product_name: item.product_name, quantity: qty, status:'in_stock', purchase_order_id: o.id, unit_cost: parseFloat(item.unit_cost) || 0 });
        }
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      }
      if (o.credit_card_id && o.total_cost) await createRewardForOrder(o);
      setFormOpen(false); setEditingOrder(null);
    },
    onError: () => toast.error('Failed to create order'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const o = await base44.entities.PurchaseOrder.update(id, data);
      if (data.gift_card_ids?.length > 0) {
        for (const gid of data.gift_card_ids)
          await base44.entities.GiftCard.update(gid, { status:'used', used_order_number: data.order_number });
        queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      }
      return o;
    },
    onSuccess: async (o) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Order updated');
      if (o.credit_card_id && o.total_cost) {
        const existing = await base44.entities.Reward.filter({ purchase_order_id: o.id });
        for (const r of existing) await base44.entities.Reward.delete(r.id);
        await createRewardForOrder(o);
      }
      setFormOpen(false); setEditingOrder(null);
    },
    onError: () => toast.error('Failed to update order'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (order) => {
      const orderRewards = await base44.entities.Reward.filter({ purchase_order_id: order.id });
      for (const r of orderRewards) await base44.entities.Reward.delete(r.id);
      if (order.gift_card_ids?.length > 0)
        for (const id of order.gift_card_ids)
          await base44.entities.GiftCard.update(id, { status:'available', used_order_number: null });
      await base44.entities.PurchaseOrder.delete(order.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      toast.success('Order deleted');
    },
    onError: () => toast.error('Failed to delete order'),
  });

  const handleQuickStatus = async (order, newStatus) => {
    try {
      await base44.entities.PurchaseOrder.update(order.id, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success(`Marked as ${newStatus}`);
    } catch { toast.error('Failed to update status'); }
  };

  const filteredOrders = useMemo(() => orders.filter(o => {
    if (mode === 'churning'    && o.order_type !== 'churning')    return false;
    if (mode === 'marketplace' && o.order_type !== 'marketplace') return false;
    if (search) {
      const s = search.toLowerCase();
      if (!o.order_number?.toLowerCase().includes(s) &&
          !o.retailer?.toLowerCase().includes(s) &&
          !o.items?.some(i => i.product_name?.toLowerCase().includes(s))) return false;
    }
    if (statusFilter !== 'all' && o.status !== statusFilter)       return false;
    if (vendorFilter !== 'all' && o.retailer !== vendorFilter)     return false;
    if (paymentMethodFilter !== 'all' && o.credit_card_id !== paymentMethodFilter) return false;
    if (categoryFilter !== 'all' && o.category !== categoryFilter) return false;
    if (fromDate) { const fd = new Date(fromDate); if (new Date(o.order_date || o.created_date) < fd) return false; }
    if (toDate)   { const td = new Date(toDate); td.setHours(23,59,59,999); if (new Date(o.order_date || o.created_date) > td) return false; }
    return true;
  }), [orders, mode, search, statusFilter, vendorFilter, paymentMethodFilter, categoryFilter, fromDate, toDate]);

  const sortedOrders = useMemo(() => [...filteredOrders].sort((a, b) => {
    const av = new Date(a.order_date || a.created_date);
    const bv = new Date(b.order_date || b.created_date);
    return bv - av;
  }), [filteredOrders]);

  /* ------------------------------------------------------------------ */
  /*  STATS -- sale_events use "qty" per entity schema                   */
  /* ------------------------------------------------------------------ */
  const stats = useMemo(() => {
    const totalItems = filteredOrders.reduce((s, o) => s + (o.items?.length || 0), 0);
    const totalCost  = filteredOrders.reduce((s, o) => s + (parseFloat(o.total_cost) || 0), 0);
    const totalSale  = filteredOrders.reduce((s, o) => {
      const fromEvents = (o.sale_events || []).reduce((es, ev) =>
        es + (ev.items || []).reduce((is, item) =>
          is + (parseFloat(item.sale_price) || 0) * (parseInt(item.qty || item.quantity) || 1), 0), 0);
      if (fromEvents > 0) return s + fromEvents;
      return s + (o.items || []).reduce((is, item) =>
        is + (parseFloat(item.sale_price) || 0) * (parseInt(item.quantity_ordered) || 1), 0);
    }, 0);
    const totalCashback = rewards
      .filter(r => filteredOrders.some(o => o.id === r.purchase_order_id))
      .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    const totalProfit = totalSale > 0 ? totalSale - totalCost + totalCashback : 0;
    return { totalItems, totalCost, totalSale, totalCashback, totalProfit };
  }, [filteredOrders, rewards]);

  const totalPages  = Math.max(1, Math.ceil(sortedOrders.length / PAGE_SIZE));
  const safePage    = Math.min(currentPage, totalPages);
  const pagedOrders = useMemo(() => sortedOrders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [sortedOrders, safePage]);
  useMemo(() => setCurrentPage(1), [mode, search, statusFilter, vendorFilter, paymentMethodFilter, categoryFilter, fromDate, toDate]);

  const handleCSVDownload = () => {
    const headers = ['Date','Retailer','Order #','Items','Cost','Sale','Profit','Cashback','Card','Status','Type'];
    const rows = sortedOrders.map(o => {
      const card = creditCards.find(c => c.id === o.credit_card_id);
      const sale = (o.sale_events || []).reduce((s, ev) =>
        s + (ev.items || []).reduce((is, item) =>
          is + (parseFloat(item.sale_price) || 0) * (parseInt(item.qty || item.quantity) || 1), 0), 0)
        || (o.items || []).reduce((s, i) => s + (parseFloat(i.sale_price) || 0) * (parseInt(i.quantity_ordered) || 1), 0);
      const profit = sale > 0 ? sale - (parseFloat(o.total_cost) || 0) : 0;
      const cb = rewards.filter(r => r.purchase_order_id === o.id).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
      return [
        o.order_date || '', o.retailer || '', o.order_number || '',
        o.items?.length || 0,
        (parseFloat(o.total_cost) || 0).toFixed(2),
        sale.toFixed(2), profit.toFixed(2), cb.toFixed(2),
        card ? card.card_name : '', o.status || '', o.order_type || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `atlas-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} selected order(s)?`)) return;
    for (const o of orders.filter(x => selectedIds.has(x.id))) await deleteMutation.mutateAsync(o);
    setSelectedIds(new Set());
  };

  const vendors = useMemo(() => [...new Set(orders.map(o => o.retailer).filter(Boolean))].sort(), [orders]);
  const modeCounts = useMemo(() => ({
    all:         orders.length,
    churning:    orders.filter(o => o.order_type === 'churning').length,
    marketplace: orders.filter(o => o.order_type === 'marketplace').length,
  }), [orders]);

  const clearFilters = () => {
    setSearch(''); setStatusFilter('all'); setVendorFilter('all');
    setFromDate(''); setToDate(''); setPaymentMethodFilter('all'); setCategoryFilter('all');
  };

  const hasActiveFilters = search || statusFilter !== 'all' || vendorFilter !== 'all' ||
    paymentMethodFilter !== 'all' || categoryFilter !== 'all' || fromDate || toDate;

  const STATUSES = [
    { value:'ordered',            label:'Ordered'            },
    { value:'shipped',            label:'Shipped'            },
    { value:'received',           label:'Received'           },
    { value:'partially_received', label:'Partially Received' },
    { value:'cancelled',          label:'Cancelled'          },
  ];

  const MODES = [
    { id:'all',         label:'All',         Icon: LayoutGrid },
    { id:'churning',    label:'Churning',    Icon: Zap        },
    { id:'marketplace', label:'Marketplace', Icon: Globe      },
  ];

  /* stat card definitions -- matches Dashboard KPI style exactly */
  const STAT_CARDS = [
    { label:'Items',      val: String(stats.totalItems),
      Icon: Package,   accent:'var(--ocean)',   bg:'var(--ocean-bg)',   bdr:'var(--ocean-bdr)',   valColor:'var(--ocean)'   },
    { label:'Total Cost', val: fmt$(stats.totalCost),
      Icon: CreditCard, accent:'var(--gold)',    bg:'var(--gold-bg)',    bdr:'var(--gold-bdr)',    valColor:'var(--gold)'    },
    { label:'Total Sale', val: stats.totalSale > 0 ? fmt$(stats.totalSale) : '--',
      Icon: Tag,        accent:'var(--terrain)', bg:'var(--terrain-bg)', bdr:'var(--terrain-bdr)', valColor: stats.totalSale > 0 ? 'var(--terrain)' : 'var(--ink-ghost)' },
    { label:'Profit',     val: stats.totalSale > 0 ? fmt$(stats.totalProfit) : '--',
      Icon: TrendingUp,
      accent: stats.totalProfit > 0 ? 'var(--terrain)' : stats.totalProfit < 0 ? 'var(--crimson)' : 'var(--ink-ghost)',
      bg:     stats.totalProfit > 0 ? 'var(--terrain-bg)' : stats.totalProfit < 0 ? 'var(--crimson-bg)' : 'var(--parch-warm)',
      bdr:    stats.totalProfit > 0 ? 'var(--terrain-bdr)' : stats.totalProfit < 0 ? 'var(--crimson-bdr)' : 'var(--parch-line)',
      valColor: stats.totalProfit > 0 ? 'var(--terrain)' : stats.totalProfit < 0 ? 'var(--crimson)' : 'var(--ink-ghost)',
    },
    { label:'Cashback',   val: stats.totalCashback > 0 ? fmt$(stats.totalCashback) : '--',
      Icon: Sparkles,  accent:'var(--violet)',  bg:'var(--violet-bg)',  bdr:'var(--violet-bdr)',  valColor:'var(--violet)'  },
  ];

  const INP = { padding:'7px 10px', borderRadius:8, fontSize:12, border:'1px solid var(--parch-line)', background:'var(--parch-warm)', color:'var(--ink-dim)', outline:'none', cursor:'pointer' };

  return (
    <div style={{ paddingBottom: 40 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* -- Header -- */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:14 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-serif)', fontSize:24, fontWeight:900, color:'var(--ink)', letterSpacing:'-0.3px', margin:0 }}>
            Transactions
          </h1>
          <p style={{ fontSize:12, color:'var(--ink-dim)', marginTop:4 }}>Track and manage your purchases</p>
        </div>
        <button onClick={handleCSVDownload}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:700, background:'var(--parch-card)', border:'1px solid var(--parch-line)', color:'var(--ink-faded)', cursor:'pointer', fontFamily:'var(--font-serif)' }}>
          <Download style={{ width:14, height:14 }}/> Export CSV
        </button>
      </div>

      {/* -- Mode tabs -- matches Dashboard tab-bar style -- */}
      <div style={{ display:'flex', gap:2, padding:3, borderRadius:10, width:'fit-content', background:'var(--parch-card)', border:'1px solid var(--parch-line)', marginBottom:18 }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            style={{
              display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8,
              fontSize:12, fontWeight:700, cursor:'pointer', border:'none', transition:'all 0.15s',
              fontFamily:'var(--font-serif)',
              background: mode === m.id ? 'var(--ink)' : 'transparent',
              color:      mode === m.id ? 'var(--gold)' : 'var(--ink-dim)',
            }}>
            <m.Icon style={{ width:13, height:13 }}/>
            {m.label}
            <span style={{ fontSize:10, opacity:0.65, fontFamily:'var(--font-mono)' }}>({modeCounts[m.id]})</span>
          </button>
        ))}
      </div>

      {/* -- Section divider -- matches Dashboard SectionDivider -- */}
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--gold)', flexShrink:0 }}/>
        <span style={{ fontFamily:'var(--font-serif)', fontSize:9, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--gold)', whiteSpace:'nowrap' }}>Performance</span>
        <div style={{ flex:1, height:1, background:'linear-gradient(90deg,rgba(160,114,42,0.25),rgba(160,114,42,0.06),transparent)' }}/>
      </div>

      {/* -- KPI Stats -- */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
        {STAT_CARDS.map(s => (
          <div key={s.label} style={{
            background: 'var(--parch-card)',
            border: '1px solid var(--parch-line)',
            borderTop: `3px solid ${s.accent}`,
            borderRadius: 12,
            padding: '12px 14px',
          }}>
            <p style={{ fontFamily:'var(--font-serif)', fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-dim)', margin:0 }}>
              {s.label}
            </p>
            <p style={{ fontFamily:'var(--font-mono)', fontSize:20, fontWeight:900, color:s.valColor, margin:'6px 0 4px', lineHeight:1 }}>
              {s.val}
            </p>
            <p style={{ fontSize:10, color:'var(--ink-ghost)', margin:0 }}>
              {s.label === 'Items' ? 'total items' : s.label === 'Total Cost' ? 'card spend' : s.label === 'Total Sale' ? 'from sales' : s.label === 'Profit' ? 'revenue - cost + CB' : 'USD rewards'}
            </p>
            <div style={{ marginTop:10, width:26, height:26, borderRadius:7, background:s.bg, border:`1px solid ${s.bdr}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <s.Icon size={13} color={s.accent}/>
            </div>
          </div>
        ))}
      </div>

      {/* -- Bulk actions -- */}
      {selectedIds.size > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, padding:'10px 16px', borderRadius:10, background:'var(--gold-bg)', border:'1px solid var(--gold-bdr)' }}>
          <span style={{ fontWeight:700, color:'var(--gold)', fontSize:13, fontFamily:'var(--font-serif)' }}>{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:7, fontSize:11, fontWeight:700, background:'var(--crimson-bg)', border:'1px solid var(--crimson-bdr)', color:'var(--crimson)', cursor:'pointer', fontFamily:'var(--font-serif)' }}>
            <Trash2 style={{ width:13, height:13 }}/> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            style={{ marginLeft:'auto', fontSize:11, color:'var(--ink-dim)', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
            <X style={{ width:13, height:13 }}/> Clear
          </button>
        </div>
      )}

      {/* -- Section divider for filters -- */}
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--ocean)', flexShrink:0 }}/>
        <span style={{ fontFamily:'var(--font-serif)', fontSize:9, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--ocean)', whiteSpace:'nowrap' }}>Filters</span>
        <div style={{ flex:1, height:1, background:'linear-gradient(90deg,rgba(42,92,122,0.25),rgba(42,92,122,0.06),transparent)' }}/>
      </div>

      {/* -- Filters -- */}
      <div style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ flex:1, minWidth:180, position:'relative', display:'flex', alignItems:'center' }}>
            <Search style={{ position:'absolute', left:10, color:'var(--ink-ghost)', pointerEvents:'none', width:14, height:14 }}/>
            <input
              style={{ width:'100%', padding:'7px 10px 7px 32px', borderRadius:8, fontSize:12, border:'1px solid var(--parch-line)', background:'var(--parch-warm)', color:'var(--ink)', outline:'none' }}
              placeholder="Search products, stores, order #..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select style={INP} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select style={INP} value={vendorFilter} onChange={e => setVendorFilter(e.target.value)}>
            <option value="all">All vendors</option>
            {vendors.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={INP} value={paymentMethodFilter} onChange={e => setPaymentMethodFilter(e.target.value)}>
            <option value="all">All cards</option>
            {creditCards.map(c => <option key={c.id} value={c.id}>{c.card_name}{c.last_4_digits ? ` ....${c.last_4_digits}` : ''}</option>)}
          </select>
          <button
            style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--ink-faded)', cursor:'pointer', padding:'6px 10px', borderRadius:7, border:'1px solid var(--parch-line)', background:'transparent', fontWeight:600, fontFamily:'var(--font-serif)' }}
            onClick={() => setShowMoreFilters(v => !v)}>
            <SlidersHorizontal style={{ width:12, height:12 }}/> {showMoreFilters ? 'Less' : 'More'} filters
            {hasActiveFilters && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--gold)', display:'inline-block', marginLeft:2 }}/>}
          </button>
          {hasActiveFilters && (
            <button style={{ fontSize:11, color:'var(--crimson)', background:'none', border:'none', cursor:'pointer', fontWeight:600, fontFamily:'var(--font-serif)' }} onClick={clearFilters}>
              Clear all
            </button>
          )}
        </div>
        {showMoreFilters && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:8, marginTop:10, paddingTop:10, borderTop:'1px solid var(--parch-line)' }}>
            {[
              { label:'From Date', el: <input type="date" style={{ ...INP, width:'100%' }} value={fromDate} onChange={e=>setFromDate(e.target.value)}/> },
              { label:'To Date',   el: <input type="date" style={{ ...INP, width:'100%' }} value={toDate}   onChange={e=>setToDate(e.target.value)}/> },
              { label:'Category',  el: (
                <select style={{ ...INP, width:'100%' }} value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}>
                  <option value="all">All categories</option>
                  {['Electronics','Home & Garden','Toys & Games','Health & Beauty','Sports','Clothing','Tools','Gift Cards','Other'].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              )},
            ].map(f => (
              <div key={f.label}>
                <p style={{ fontFamily:'var(--font-serif)', fontSize:9, fontWeight:700, color:'var(--ink-faded)', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:4 }}>{f.label}</p>
                {f.el}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* -- Count -- */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:11, color:'var(--ink-dim)', fontFamily:'var(--font-serif)' }}>
          Showing{' '}
          <strong style={{ color:'var(--ink)', fontFamily:'var(--font-mono)' }}>{Math.min((safePage-1)*PAGE_SIZE+1, sortedOrders.length)}</strong>
          {' to '}
          <strong style={{ color:'var(--ink)', fontFamily:'var(--font-mono)' }}>{Math.min(safePage*PAGE_SIZE, sortedOrders.length)}</strong>
          {' of '}
          <strong style={{ color:'var(--ink)', fontFamily:'var(--font-mono)' }}>{sortedOrders.length}</strong>
          {' orders'}
        </span>
        {totalPages > 1 && (
          <span style={{ fontSize:11, color:'var(--ink-dim)', fontFamily:'var(--font-mono)' }}>
            Page {safePage} of {totalPages}
          </span>
        )}
      </div>

      {/* -- Order Cards -- */}
      <OrderGroupedCards
        data={pagedOrders}
        creditCards={creditCards}
        rewards={rewards}
        products={products}
        giftCards={giftCards}
        onEdit={(order) => { setEditingOrder(order); setFormOpen(true); }}
        onDelete={(order) => { if (confirm('Delete this order?')) deleteMutation.mutate(order); }}
        onQuickStatus={handleQuickStatus}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onClearFilters={clearFilters}
      />

      {/* -- Pagination -- */}
      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:24, paddingBottom:8 }}>
          <button onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={safePage===1}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, border:'1px solid var(--parch-line)', background:'var(--parch-card)', fontFamily:'var(--font-serif)',
              color: safePage===1 ? 'var(--ink-ghost)' : 'var(--ink-faded)', cursor: safePage===1 ? 'not-allowed' : 'pointer' }}>
            <ChevronLeft style={{ width:14, height:14 }}/> Prev
          </button>
          <div style={{ display:'flex', gap:4 }}>
            {Array.from({ length:totalPages }, (_,i)=>i+1)
              .filter(p => p===1 || p===totalPages || Math.abs(p-safePage)<=1)
              .reduce((acc,p,i,arr) => { if(i>0 && p-arr[i-1]>1) acc.push('...'); acc.push(p); return acc; }, [])
              .map((p,i) => p==='...'
                ? <span key={`e${i}`} style={{ padding:'7px 6px', fontSize:12, color:'var(--ink-ghost)', fontFamily:'var(--font-mono)' }}>...</span>
                : <button key={p} onClick={()=>setCurrentPage(p)}
                    style={{ width:34, height:34, borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'var(--font-mono)',
                      fontWeight: p===safePage ? 700 : 500,
                      border: '1px solid',
                      borderColor: p===safePage ? 'var(--gold-bdr)' : 'var(--parch-line)',
                      background:  p===safePage ? 'var(--gold-bg)'  : 'var(--parch-card)',
                      color:       p===safePage ? 'var(--gold)'     : 'var(--ink-faded)' }}>
                    {p}
                  </button>
              )}
          </div>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))} disabled={safePage===totalPages}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, border:'1px solid var(--parch-line)', background:'var(--parch-card)', fontFamily:'var(--font-serif)',
              color: safePage===totalPages ? 'var(--ink-ghost)' : 'var(--ink-faded)', cursor: safePage===totalPages ? 'not-allowed' : 'pointer' }}>
            Next <ChevronRight style={{ width:14, height:14 }}/>
          </button>
        </div>
      )}

      <POFormModal
        open={formOpen} onOpenChange={setFormOpen} order={editingOrder}
        onSubmit={(data) => { if (editingOrder) updateMutation.mutate({ id:editingOrder.id, data }); else createMutation.mutate(data); }}
        products={products} creditCards={creditCards} giftCards={giftCards} sellers={sellers}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
      <PODetailsModal
        open={detailsOpen} onOpenChange={setDetailsOpen}
        order={selectedOrder} products={products} rewards={rewards} creditCards={creditCards}
      />
    </div>
  );
}