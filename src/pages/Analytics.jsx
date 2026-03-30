import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { format, subMonths, parseISO } from 'date-fns';
import {
  RefreshCw, Download, TrendingUp, DollarSign, ShoppingCart,
  Percent, CreditCard, Store, Package, BarChart2, Filter, Star, ChevronDown, ChevronUp, Info
} from 'lucide-react';

const fmt$ = (v) => {
  const n = Math.abs(v || 0);
  if (n >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${(v || 0).toFixed(2)}`;
};
const fmtPct = (v) => `${(v || 0).toFixed(2)}%`;
const COLORS = ['#7c3aed', '#4ade80', '#60a5fa', '#fb923c', '#f472b6', '#34d399', '#a78bfa', '#facc15'];

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 16px 0 rgba(80,60,180,0.08)',
  fontSize: 12,
  background: '#fff',
  color: '#1e293b',
};

// ─── KPI CARD ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, bg, iconColor, subtext }) {
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-1 min-w-0 overflow-hidden ${bg}`}>
      <div className="flex items-center justify-between mb-1">
        <Icon className={`h-4 w-4 ${iconColor} shrink-0`} />
      </div>
      <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500 leading-tight break-words">{label}</span>
      <span className="text-lg font-bold text-slate-900 leading-tight break-words">{value}</span>
      {subtext && <span className="text-[10px] text-slate-400 break-words">{subtext}</span>}
    </div>
  );
}

// ─── CHART SECTION CARD ──────────────────────────────────────────────────────
function ChartCard({ title, subtitle, badge, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-xs font-bold tracking-widest uppercase text-slate-700">{title}</p>
        {badge && <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold uppercase">{badge}</span>}
      </div>
      {subtitle && <p className="text-[10px] text-slate-400 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

// ─── CUSTOM LEGEND ───────────────────────────────────────────────────────────
function ChartLegend({ items }) {
  return (
    <div className="flex items-center gap-5 mt-3 flex-wrap">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className="h-2.5 w-7 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-[11px] font-semibold text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── DONUT LEGEND ────────────────────────────────────────────────────────────
function DonutLegend({ data, colors, fmt }) {
  return (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      {data.map((d, i) => (
        <div key={d.name} className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-xs text-slate-600 truncate">{d.name}</span>
          </div>
          <span className="text-xs font-bold text-slate-700 shrink-0">{fmt ? fmt(d.value) : d.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function Analytics() {
  const [mode, setMode] = useState('all');
  const [period, setPeriod] = useState('monthly');
  const [fromDate, setFromDate] = useState(() => format(subMonths(new Date(), 12), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState('overview');
  const [profitMode, setProfitMode] = useState('accounting');
  const [showProfitDetails, setShowProfitDetails] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => { if (u?.profit_mode) setProfitMode(u.profit_mode); }).catch(() => {});
  }, []);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['analyticsOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-order_date'),
  });
  const { data: rewards = [] } = useQuery({
    queryKey: ['analyticsRewards'],
    queryFn: () => base44.entities.Reward.list(),
  });
  const { data: creditCards = [] } = useQuery({
    queryKey: ['analyticsCreditCards'],
    queryFn: () => base44.entities.CreditCard.list(),
  });

  const filteredOrders = useMemo(() => orders.filter(o => {
    const d = o.order_date || o.created_date;
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    if (mode === 'churning' && o.order_type !== 'churning') return false;
    if (mode === 'marketplace' && o.order_type !== 'marketplace') return false;
    return true;
  }), [orders, mode, fromDate, toDate]);

  const filteredRewards = useMemo(() => {
    const ids = new Set(filteredOrders.map(o => o.id));
    return rewards.filter(r => ids.has(r.purchase_order_id));
  }, [rewards, filteredOrders]);

  const kpis = useMemo(() => {
    const revenue = filteredOrders.reduce((s, o) => s + (o.total_cost || 0), 0);
    const cost = filteredOrders.reduce((s, o) => s + (o.final_cost || o.total_cost || 0), 0);
    const cashbackRewards = filteredRewards.filter(r => r.currency === 'USD');
    const cashback = cashbackRewards.reduce((s, r) => s + (r.amount || 0), 0);
    const yaCashback = cashbackRewards.filter(r => r.notes?.includes('Young Adult') || r.notes?.includes('YACB') || r.notes?.includes('Prime Young Adult')).reduce((s, r) => s + (r.amount || 0), 0);
    const accountingProfit = revenue - cost + cashback;
    const profit = profitMode === 'cashback_wallet' ? accountingProfit - yaCashback : accountingProfit;
    const roi = cost > 0 ? (profit / cost) * 100 : 0;
    const commission = accountingProfit - cashback;
    const storeMap = {};
    filteredOrders.forEach(o => { if (o.retailer) storeMap[o.retailer] = (storeMap[o.retailer] || 0) + (o.total_cost || 0); });
    const topStore = Object.entries(storeMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const inventory = filteredOrders.reduce((s, o) => s + (o.items?.reduce((ss, i) => ss + (i.quantity_ordered || 0), 0) || 0), 0);
    return { revenue, cost, profit, roi, cashback, yaCashback, accountingProfit, commission, topStore, inventory };
  }, [filteredOrders, filteredRewards, profitMode]);

  const periodData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const d = o.order_date || o.created_date; if (!d) return;
      const key = d.substring(0, 7);
      if (!map[key]) map[key] = { period: key, revenue: 0, cost: 0, cashback: 0 };
      map[key].revenue += o.total_cost || 0;
      map[key].cost += o.final_cost || o.total_cost || 0;
    });
    filteredRewards.filter(r => r.currency === 'USD').forEach(r => {
      const d = r.date_earned; if (!d) return;
      const key = d.substring(0, 7);
      if (map[key]) map[key].cashback += r.amount || 0;
    });
    return Object.values(map).sort((a, b) => a.period.localeCompare(b.period)).map(d => ({
      ...d,
      profit: d.revenue - d.cost,
      label: (() => { try { return format(parseISO(d.period + '-01'), 'MMM'); } catch { return d.period; } })(),
    }));
  }, [filteredOrders, filteredRewards]);

  const cumulativeData = useMemo(() => {
    let cum = 0;
    return periodData.map(d => { cum += d.profit; return { label: d.label, cumProfit: cum }; });
  }, [periodData]);

  const categoryData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => { const cat = o.product_category || o.category || 'Other'; map[cat] = (map[cat] || 0) + (o.total_cost || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredOrders]);

  const storeData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const store = o.retailer || 'Unknown';
      if (!map[store]) map[store] = { store, purchases: 0, sales: 0, cashback: 0, txns: 0 };
      map[store].purchases += o.final_cost || o.total_cost || 0;
      map[store].sales += o.total_cost || 0;
      map[store].txns += 1;
    });
    filteredRewards.filter(r => r.currency === 'USD').forEach(r => {
      const o = filteredOrders.find(x => x.id === r.purchase_order_id);
      if (o?.retailer && map[o.retailer]) map[o.retailer].cashback += r.amount || 0;
    });
    return Object.values(map).map(s => ({
      ...s, profit: s.sales - s.purchases,
      roi: s.purchases > 0 ? ((s.sales - s.purchases) / s.purchases * 100) : 0,
      spread: s.sales - s.purchases - s.cashback,
    })).sort((a, b) => b.sales - a.sales);
  }, [filteredOrders, filteredRewards]);

  const platformData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const platform = o.marketplace_platform || o.retailer || 'Unknown';
      if (!map[platform]) map[platform] = { platform, purchases: 0, sales: 0, cashback: 0, buys: 0 };
      map[platform].purchases += o.final_cost || o.total_cost || 0;
      map[platform].sales += o.total_cost || 0;
      map[platform].buys += 1;
    });
    filteredRewards.filter(r => r.currency === 'USD').forEach(r => {
      const o = filteredOrders.find(x => x.id === r.purchase_order_id);
      const platform = o?.marketplace_platform || o?.retailer || 'Unknown';
      if (map[platform]) map[platform].cashback += r.amount || 0;
    });
    return Object.values(map).map(p => ({
      ...p, profit: p.sales - p.purchases,
      margin: p.sales > 0 ? ((p.sales - p.purchases) / p.sales * 100) : 0,
    }));
  }, [filteredOrders, filteredRewards]);

  const paymentData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      // Handle split payments — distribute spend across each card in the split
      if (o.payment_splits?.length > 1) {
        o.payment_splits.forEach(sp => {
          const key = sp.card_id || 'unknown';
          const card = creditCards.find(c => c.id === key);
          const name = card?.card_name || sp.card_name || 'Unknown';
          if (!map[key]) map[key] = { id: key, name, spent: 0, cashback: 0, txns: 0, statedRate: card?.cashback_rate || 0 };
          map[key].spent += sp.amount || 0;
          // cashback per split card = amount * card rate
          const rate = card?.cashback_rate || sp.cashback_rate || 0;
          map[key].cashback += (sp.amount || 0) * rate / 100;
        });
        // Count txn once on the primary card
        const primaryKey = o.payment_splits[0]?.card_id || 'unknown';
        if (map[primaryKey]) map[primaryKey].txns += 1;
      } else {
        const key = o.credit_card_id || 'unknown';
        const card = creditCards.find(c => c.id === key);
        const name = card?.card_name || o.card_name || 'Unknown';
        if (!map[key]) map[key] = { id: key, name, spent: 0, cashback: 0, txns: 0, statedRate: card?.cashback_rate || 0 };
        map[key].spent += o.total_cost || 0;
        map[key].txns += 1;
        // Add cashback from rewards for non-split orders
        // (handled below via filteredRewards)
      }
    });
    // Add rewards cashback for non-split orders only
    filteredRewards.filter(r => r.currency === 'USD').forEach(r => {
      const o = filteredOrders.find(x => x.id === r.purchase_order_id);
      if (!o || o.payment_splits?.length > 1) return; // skip split orders (already computed above)
      const key = o?.credit_card_id || 'unknown';
      if (map[key]) map[key].cashback += r.amount || 0;
    });
    return Object.values(map).map(p => ({
      ...p,
      effectiveRate: p.spent > 0 ? (p.cashback / p.spent * 100) : 0,
      variance: p.spent > 0 ? ((p.cashback / p.spent * 100) - p.statedRate) : 0,
    }));
  }, [filteredOrders, filteredRewards, creditCards]);

  const cashbackDistribution = useMemo(() => paymentData.map(p => ({ name: p.name, value: p.cashback })).filter(p => p.value > 0), [paymentData]);

  const MODES = [
    { id: 'all', label: 'All', activeClass: 'bg-violet-600 text-white' },
    { id: 'churning', label: 'Churning', activeClass: 'bg-blue-500 text-white' },
    { id: 'marketplace', label: 'Marketplace', activeClass: 'bg-green-500 text-white' },
  ];

  const TABS = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { id: 'breakdowns', label: 'Breakdowns', icon: <BarChart2 className="h-3.5 w-3.5" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="h-3.5 w-3.5" /> },
    { id: 'tables', label: 'Detail Tables', icon: <Filter className="h-3.5 w-3.5" /> },
  ];

  const KPI_CARDS = [
    { label: 'Revenue', value: fmt$(kpis.revenue), icon: DollarSign, bg: 'bg-blue-50 border-blue-100', iconColor: 'text-blue-400' },
    { label: 'Cost', value: fmt$(kpis.cost), icon: ShoppingCart, bg: 'bg-pink-50 border-pink-100', iconColor: 'text-pink-400' },
    { label: profitMode === 'cashback_wallet' ? 'Wallet Profit' : 'Profit', value: fmt$(kpis.profit), icon: TrendingUp, bg: 'bg-green-50 border-green-100', iconColor: 'text-green-400', subtext: kpis.cost > 0 ? `${fmtPct((kpis.profit / kpis.cost) * 100)} margin` : '' },
    { label: 'ROI', value: fmtPct(kpis.roi), icon: Percent, bg: 'bg-violet-50 border-violet-100', iconColor: 'text-violet-400' },
    { label: 'Cashback', value: fmt$(kpis.cashback), icon: CreditCard, bg: 'bg-pink-50 border-pink-100', iconColor: 'text-pink-400' },
    { label: 'YA Cashback', value: fmt$(kpis.yaCashback), icon: Star, bg: 'bg-amber-50 border-amber-100', iconColor: 'text-amber-400', subtext: 'Young Adult CB' },
    { label: 'Top Store', value: kpis.topStore, icon: Store, bg: 'bg-teal-50 border-teal-100', iconColor: 'text-teal-400' },
    { label: 'Inventory', value: kpis.inventory.toString(), icon: Package, bg: 'bg-indigo-50 border-indigo-100', iconColor: 'text-indigo-400', subtext: 'items ordered' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── HEADER ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics & Insights</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {mode === 'all' ? 'Combined overview' : mode === 'churning' ? 'Churning performance' : 'Marketplace performance'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode tabs */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm">
              {MODES.map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${mode === m.id ? m.activeClass : 'text-slate-500 hover:bg-slate-50'}`}>
                  {m.label}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
              <Download className="h-3.5 w-3.5" /> Export All
            </button>
            <button onClick={() => refetch()} disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 shadow-sm transition">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* ── FILTER CARD ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex flex-wrap items-end gap-5">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">Period</p>
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {['monthly', 'quarterly', 'yearly'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${period === p ? 'bg-white text-violet-700 shadow-sm border border-violet-200' : 'text-slate-500 hover:text-slate-700'}`}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">Date Range</p>
            <div className="flex items-center gap-2">
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="h-8 px-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
              <span className="text-slate-400 text-xs">→</span>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="h-8 px-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-violet-400" />
            </div>
          </div>
          <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition ml-auto">
            <Filter className="h-3.5 w-3.5 text-slate-400" /> Filters
          </button>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {KPI_CARDS.map(k => <KpiCard key={k.label} {...k} />)}
        </div>

        {/* ── PROFIT DETAILS BOX ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowProfitDetails(p => !p)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-violet-500" />
              Profit Breakdown
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 capitalize">
                {profitMode === 'cashback_wallet' ? 'Cashback Wallet Mode' : 'Accounting Mode'}
              </span>
            </div>
            {showProfitDetails ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {showProfitDetails && (
            <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-100 pt-4">
              <div className="rounded-xl bg-green-50 border border-green-100 p-3">
                <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wider">Revenue</p>
                <p className="text-base font-bold text-green-700">{fmt$(kpis.revenue)}</p>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Card Spend</p>
                <p className="text-base font-bold text-blue-700">−{fmt$(kpis.cost)}</p>
              </div>
              <div className="rounded-xl bg-pink-50 border border-pink-100 p-3">
                <p className="text-[10px] text-pink-600 font-semibold uppercase tracking-wider">Cashback</p>
                <p className="text-base font-bold text-pink-700">+{fmt$(kpis.cashback)}</p>
              </div>
              {profitMode === 'cashback_wallet' && kpis.yaCashback > 0 ? (
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                  <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider">YA Adjustment</p>
                  <p className="text-base font-bold text-amber-700">−{fmt$(kpis.yaCashback)}</p>
                  <p className="text-[9px] text-amber-500 mt-0.5">Wallet mode deduction</p>
                </div>
              ) : (
                <div className="rounded-xl bg-violet-50 border border-violet-100 p-3">
                  <p className="text-[10px] text-violet-600 font-semibold uppercase tracking-wider">YA Cashback</p>
                  <p className="text-base font-bold text-violet-700">{fmt$(kpis.yaCashback)}</p>
                  <p className="text-[9px] text-violet-500 mt-0.5">Included in total</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── TAB NAV ── */}
        <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 gap-1 shadow-sm w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${activeTab === t.id ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Revenue & Profit Trend */}
              <ChartCard title="Revenue & Profit Trend" subtitle="Revenue and profit over time" badge="Monthly">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={periodData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                    <Line type="monotone" dataKey="revenue" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Revenue" />
                    <Line type="monotone" dataKey="profit" stroke="#4ade80" strokeWidth={2.5} dot={{ r: 3, fill: '#4ade80', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Profit" />
                    <Line type="monotone" dataKey="cashback" stroke="#f472b6" strokeWidth={2.5} dot={{ r: 3, fill: '#f472b6', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Cashback" />
                  </LineChart>
                </ResponsiveContainer>
                <ChartLegend items={[{ label: 'Revenue', color: '#60a5fa' }, { label: 'Profit', color: '#4ade80' }, { label: 'Cashback', color: '#f472b6' }]} />
              </ChartCard>

              {/* Expense Breakdown (Donut) */}
              <ChartCard title="Expense Breakdown" subtitle="Spend categories distribution">
                {categoryData.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No data</div>
                ) : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={2}>
                          {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <DonutLegend data={categoryData} colors={COLORS} fmt={fmt$} />
                  </div>
                )}
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Cumulative Profit */}
              <ChartCard title="Cumulative Profit" subtitle="Running profit over time">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={cumulativeData}>
                    <defs>
                      <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                    <Area type="monotone" dataKey="cumProfit" stroke="#7c3aed" fill="url(#cumGrad)" strokeWidth={2.5} dot={{ r: 3, fill: '#7c3aed', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Cumulative Profit" />
                  </AreaChart>
                </ResponsiveContainer>
                <ChartLegend items={[{ label: 'Cumulative Profit', color: '#7c3aed' }]} />
              </ChartCard>

              {/* Period P&L — line chart not bar */}
              <ChartCard title="Period P&L" subtitle="Profit & loss by period">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={periodData}>
                    <defs>
                      <linearGradient id="plGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                    <Line type="monotone" dataKey="revenue" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Revenue" />
                    <Line type="monotone" dataKey="cost" stroke="#f472b6" strokeWidth={2.5} dot={{ r: 3, fill: '#f472b6', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Cost" />
                    <Line type="monotone" dataKey="profit" stroke="#4ade80" strokeWidth={2.5} dot={{ r: 3, fill: '#4ade80', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Profit" />
                  </LineChart>
                </ResponsiveContainer>
                <ChartLegend items={[{ label: 'Revenue', color: '#60a5fa' }, { label: 'Cost', color: '#f472b6' }, { label: 'Profit', color: '#4ade80' }]} />
              </ChartCard>
            </div>
          </div>
        )}

        {/* ── BREAKDOWNS TAB ── */}
        {activeTab === 'breakdowns' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Store Performance" subtitle="Sales & profit by store" badge={`${storeData.length} Stores`}>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={storeData.slice(0, 8).map(s => ({ name: s.store, sales: s.sales, profit: s.profit }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                    <Line type="monotone" dataKey="sales" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Sales" />
                    <Line type="monotone" dataKey="profit" stroke="#4ade80" strokeWidth={2.5} dot={{ r: 3, fill: '#4ade80', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Profit" />
                  </LineChart>
                </ResponsiveContainer>
                <ChartLegend items={[{ label: 'Sales', color: '#60a5fa' }, { label: 'Profit', color: '#4ade80' }]} />
              </ChartCard>

              <ChartCard title="Spend by Category" subtitle="Category distribution">
                {categoryData.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">No data</div>
                ) : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={2}>
                          {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <DonutLegend data={categoryData} colors={COLORS} fmt={fmt$} />
                  </div>
                )}
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Platform Performance" subtitle="Revenue & profit by platform" badge={`${platformData.length} Platforms`}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={platformData.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="platform" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                    <Line type="monotone" dataKey="sales" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Sales" />
                    <Line type="monotone" dataKey="profit" stroke="#4ade80" strokeWidth={2.5} dot={{ r: 3, fill: '#4ade80', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Profit" />
                    <Line type="monotone" dataKey="cashback" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Cashback" />
                  </LineChart>
                </ResponsiveContainer>
                <ChartLegend items={[{ label: 'Sales', color: '#60a5fa' }, { label: 'Profit', color: '#4ade80' }, { label: 'Cashback', color: '#a78bfa' }]} />
              </ChartCard>

              {/* Store summary stats */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
                <p className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-4">Store Summary</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Total Store Sales', value: fmt$(kpis.revenue), color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                    { label: 'Store Profit', value: fmt$(kpis.profit), color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
                    { label: 'Store Cashback', value: fmt$(kpis.cashback), color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
                    { label: 'Avg Store ROI', value: fmtPct(kpis.roi), color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl border ${s.bg} ${s.border} p-3`}>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{s.label}</p>
                      <p className={`text-lg font-bold ${s.color} mt-0.5`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PAYMENTS TAB ── */}
        {activeTab === 'payments' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Spend by Payment Method" subtitle="Spend and cashback per card">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={paymentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                    <Line type="monotone" dataKey="spent" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3, fill: '#7c3aed', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Spent" />
                    <Line type="monotone" dataKey="cashback" stroke="#4ade80" strokeWidth={2.5} dot={{ r: 3, fill: '#4ade80', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Cashback" />
                  </LineChart>
                </ResponsiveContainer>
                <ChartLegend items={[{ label: 'Spent', color: '#7c3aed' }, { label: 'Cashback', color: '#4ade80' }]} />
              </ChartCard>

              <ChartCard title="Cashback Distribution" subtitle="Cashback earned per card">
                {cashbackDistribution.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">No cashback data</div>
                ) : (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={cashbackDistribution} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={2}>
                          {cashbackDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <DonutLegend data={cashbackDistribution} colors={COLORS} fmt={fmt$} />
                  </div>
                )}
              </ChartCard>
            </div>

            <ChartCard title="Effective vs. Stated Cashback Rate" subtitle="Compare your effective rate to the card's stated rate">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={paymentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(1)}%`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => `${Number(v).toFixed(2)}%`} />
                  <Line type="monotone" dataKey="statedRate" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Stated Rate" />
                  <Line type="monotone" dataKey="effectiveRate" stroke="#4ade80" strokeWidth={2.5} dot={{ r: 3, fill: '#4ade80', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Effective Rate" />
                </LineChart>
              </ResponsiveContainer>
              <ChartLegend items={[{ label: 'Stated Rate', color: '#a78bfa' }, { label: 'Effective Rate', color: '#4ade80' }]} />
            </ChartCard>

            {/* Payment table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-4">Payment Method Performance</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Payment Method', 'Transactions', 'Total Spent', 'Cashback', 'Stated Rate', 'Effective Rate', 'Variance'].map(h => (
                        <th key={h} className="pb-2 text-left font-semibold text-slate-400 uppercase tracking-wider text-[10px] px-2 first:pl-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paymentData.map(p => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 pl-0 px-2 font-semibold text-slate-800">{p.name}</td>
                        <td className="py-3 px-2 text-slate-500">{p.txns}</td>
                        <td className="py-3 px-2 text-blue-600 font-semibold">{fmt$(p.spent)}</td>
                        <td className="py-3 px-2 text-green-600 font-semibold">{fmt$(p.cashback)}</td>
                        <td className="py-3 px-2 text-slate-500">{fmtPct(p.statedRate)}</td>
                        <td className="py-3 px-2 text-violet-600 font-semibold">{fmtPct(p.effectiveRate)}</td>
                        <td className={`py-3 px-2 font-semibold ${p.variance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {p.variance >= 0 ? '+' : ''}{fmtPct(p.variance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
                {[
                  { label: 'Total Spent', value: fmt$(paymentData.reduce((s, p) => s + p.spent, 0)), color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                  { label: 'Total Cashback', value: fmt$(paymentData.reduce((s, p) => s + p.cashback, 0)), color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
                  { label: 'Best Rate', value: fmtPct(Math.max(...paymentData.map(p => p.effectiveRate), 0)), color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
                  { label: 'Best Card', value: [...paymentData].sort((a, b) => b.effectiveRate - a.effectiveRate)[0]?.name || '—', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border ${s.bg} ${s.border} p-3`}>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">{s.label}</p>
                    <p className={`text-sm font-bold ${s.color} mt-0.5 truncate`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DETAIL TABLES TAB ── */}
        {activeTab === 'tables' && (
          <div className="space-y-5">
            {/* Store breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold tracking-widest uppercase text-slate-700">Store Breakdown</p>
                <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold">{storeData.length} Stores</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Store', 'Purchases', 'Sales', 'Profit', 'Cashback', 'Spread', 'ROI', 'TXNs'].map(h => (
                        <th key={h} className="pb-2 text-left font-semibold text-slate-400 uppercase tracking-wider text-[10px] px-2 first:pl-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {storeData.map(s => (
                      <tr key={s.store} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 pl-0 px-2 font-bold text-slate-800">{s.store}</td>
                        <td className="py-3 px-2 text-blue-600 font-semibold">{fmt$(s.purchases)}</td>
                        <td className="py-3 px-2 text-green-600 font-semibold">{fmt$(s.sales)}</td>
                        <td className="py-3 px-2 text-green-600 font-semibold">{fmt$(s.profit)}</td>
                        <td className="py-3 px-2 text-violet-600 font-semibold">{fmt$(s.cashback)}</td>
                        <td className="py-3 px-2 text-amber-600 font-semibold">{fmt$(s.spread)}</td>
                        <td className="py-3 px-2 text-slate-700 font-semibold">{fmtPct(s.roi)}</td>
                        <td className="py-3 px-2 text-slate-500">{s.txns}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-200 font-bold bg-slate-50">
                      <td className="py-3 pl-0 px-2 text-slate-900">TOTAL</td>
                      <td className="py-3 px-2 text-blue-700">{fmt$(storeData.reduce((s, x) => s + x.purchases, 0))}</td>
                      <td className="py-3 px-2 text-green-700">{fmt$(storeData.reduce((s, x) => s + x.sales, 0))}</td>
                      <td className="py-3 px-2 text-green-700">{fmt$(storeData.reduce((s, x) => s + x.profit, 0))}</td>
                      <td className="py-3 px-2 text-violet-700">{fmt$(storeData.reduce((s, x) => s + x.cashback, 0))}</td>
                      <td className="py-3 px-2 text-amber-700">{fmt$(storeData.reduce((s, x) => s + x.spread, 0))}</td>
                      <td className="py-3 px-2 text-slate-700">{fmtPct(kpis.roi)}</td>
                      <td className="py-3 px-2 text-slate-700">{storeData.reduce((s, x) => s + x.txns, 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Platform breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold tracking-widest uppercase text-slate-700">Platform Breakdown</p>
                <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold">{platformData.length} Platforms</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Platform', 'Purchases', 'Sales', 'Cashback', 'Profit', '# Buys', 'Margin'].map(h => (
                        <th key={h} className="pb-2 text-left font-semibold text-slate-400 uppercase tracking-wider text-[10px] px-2 first:pl-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {platformData.map(p => (
                      <tr key={p.platform} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 pl-0 px-2 font-bold text-slate-800">{p.platform}</td>
                        <td className="py-3 px-2 text-blue-600 font-semibold">{fmt$(p.purchases)}</td>
                        <td className="py-3 px-2 text-green-600 font-semibold">{fmt$(p.sales)}</td>
                        <td className="py-3 px-2 text-violet-600 font-semibold">{fmt$(p.cashback)}</td>
                        <td className="py-3 px-2 text-green-600 font-semibold">{fmt$(p.profit)}</td>
                        <td className="py-3 px-2 text-slate-500">{p.buys}</td>
                        <td className="py-3 px-2 text-amber-600 font-semibold">{fmtPct(p.margin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Period breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-4">Period-by-Period Data</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Period', 'Purchases', 'Sales', 'Cashback', 'Net Profit', 'Margin'].map(h => (
                        <th key={h} className="pb-2 text-left font-semibold text-slate-400 uppercase tracking-wider text-[10px] px-2 first:pl-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periodData.map(p => (
                      <tr key={p.period} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 pl-0 px-2 font-semibold text-slate-700">{p.period}</td>
                        <td className="py-3 px-2 text-blue-600 font-semibold">{fmt$(p.cost)}</td>
                        <td className="py-3 px-2 text-green-600 font-semibold">{fmt$(p.revenue)}</td>
                        <td className="py-3 px-2 text-violet-600 font-semibold">{fmt$(p.cashback)}</td>
                        <td className="py-3 px-2 text-green-600 font-semibold">{fmt$(p.profit)}</td>
                        <td className="py-3 px-2 text-amber-600 font-semibold">{p.revenue > 0 ? fmtPct(p.profit / p.revenue * 100) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}