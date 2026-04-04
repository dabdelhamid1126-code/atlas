import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
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
const COLORS = ['#10b981', '#06b6d4', '#60a5fa', '#f59e0b', '#f472b6', '#34d399', '#a78bfa', '#facc15'];

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.1)',
  fontSize: 12,
  background: '#1e2738',
  color: '#e2e8f0',
};

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, colorClass, iconBg, iconBorder, subtext }) {
  return (
    <div className="rounded-2xl border p-4 flex flex-col gap-1 min-w-0 overflow-hidden"
      style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-1">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg} border ${iconBorder}`}>
          <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
        </div>
      </div>
      <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500 leading-tight">{label}</span>
      <span className={`text-lg font-bold leading-tight ${colorClass}`}>{value}</span>
      {subtext && <span className="text-[10px] text-slate-500">{subtext}</span>}
    </div>
  );
}

// ─── CHART SECTION CARD ───────────────────────────────────────────────────────
function ChartCard({ title, subtitle, badge, children }) {
  return (
    <div className="rounded-2xl border p-5" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-0.5">
        <p className="text-xs font-bold tracking-widest uppercase text-slate-500">{title}</p>
        {badge && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold uppercase">{badge}</span>}
      </div>
      {subtitle && <p className="text-[10px] text-slate-500 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

// ─── CUSTOM LEGEND ────────────────────────────────────────────────────────────
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

// ─── DONUT LEGEND ─────────────────────────────────────────────────────────────
function DonutLegend({ data, colors, fmt }) {
  return (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      {data.map((d, i) => (
        <div key={d.name} className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-xs text-slate-400 truncate">{d.name}</span>
          </div>
          <span className="text-xs font-bold text-slate-300 shrink-0">{fmt ? fmt(d.value) : d.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
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
    const storeMap = {};
    filteredOrders.forEach(o => { if (o.retailer) storeMap[o.retailer] = (storeMap[o.retailer] || 0) + (o.total_cost || 0); });
    const topStore = Object.entries(storeMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const inventory = filteredOrders.reduce((s, o) => s + (o.items?.reduce((ss, i) => ss + (i.quantity_ordered || 0), 0) || 0), 0);
    return { revenue, cost, profit, roi, cashback, yaCashback, accountingProfit, topStore, inventory };
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
      if (o.payment_splits?.length > 1) {
        o.payment_splits.forEach(sp => {
          const key = sp.card_id || 'unknown';
          const card = creditCards.find(c => c.id === key);
          const name = card?.card_name || sp.card_name || 'Unknown';
          if (!map[key]) map[key] = { id: key, name, spent: 0, cashback: 0, txns: 0, statedRate: card?.cashback_rate || 0 };
          map[key].spent += sp.amount || 0;
          const rate = card?.cashback_rate || sp.cashback_rate || 0;
          map[key].cashback += (sp.amount || 0) * rate / 100;
        });
        const primaryKey = o.payment_splits[0]?.card_id || 'unknown';
        if (map[primaryKey]) map[primaryKey].txns += 1;
      } else {
        const key = o.credit_card_id || 'unknown';
        const card = creditCards.find(c => c.id === key);
        const name = card?.card_name || o.card_name || 'Unknown';
        if (!map[key]) map[key] = { id: key, name, spent: 0, cashback: 0, txns: 0, statedRate: card?.cashback_rate || 0 };
        map[key].spent += o.total_cost || 0;
        map[key].txns += 1;
      }
    });
    filteredRewards.filter(r => r.currency === 'USD').forEach(r => {
      const o = filteredOrders.find(x => x.id === r.purchase_order_id);
      if (!o || o.payment_splits?.length > 1) return;
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
    { id: 'all', label: 'All' },
    { id: 'churning', label: 'Churning' },
    { id: 'marketplace', label: 'Marketplace' },
  ];

  const TABS = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { id: 'breakdowns', label: 'Breakdowns', icon: <BarChart2 className="h-3.5 w-3.5" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="h-3.5 w-3.5" /> },
    { id: 'tables', label: 'Detail Tables', icon: <Filter className="h-3.5 w-3.5" /> },
  ];

  const KPI_CARDS = [
    { label: 'Revenue', value: fmt$(kpis.revenue), icon: DollarSign, colorClass: 'text-blue-400', iconBg: 'bg-blue-500/10', iconBorder: 'border-blue-500/20' },
    { label: 'Cost', value: fmt$(kpis.cost), icon: ShoppingCart, colorClass: 'text-pink-400', iconBg: 'bg-pink-500/10', iconBorder: 'border-pink-500/20' },
    { label: profitMode === 'cashback_wallet' ? 'Wallet Profit' : 'Profit', value: fmt$(kpis.profit), icon: TrendingUp, colorClass: kpis.profit >= 0 ? 'text-emerald-400' : 'text-red-400', iconBg: kpis.profit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10', iconBorder: kpis.profit >= 0 ? 'border-emerald-500/20' : 'border-red-500/20', subtext: kpis.cost > 0 ? `${fmtPct((kpis.profit / kpis.cost) * 100)} margin` : '' },
    { label: 'ROI', value: fmtPct(kpis.roi), icon: Percent, colorClass: 'text-cyan-400', iconBg: 'bg-cyan-500/10', iconBorder: 'border-cyan-500/20' },
    { label: 'Cashback', value: fmt$(kpis.cashback), icon: CreditCard, colorClass: 'text-pink-400', iconBg: 'bg-pink-500/10', iconBorder: 'border-pink-500/20' },
    { label: 'YA Cashback', value: fmt$(kpis.yaCashback), icon: Star, colorClass: 'text-amber-400', iconBg: 'bg-amber-500/10', iconBorder: 'border-amber-500/20', subtext: 'Young Adult CB' },
    { label: 'Top Store', value: kpis.topStore, icon: Store, colorClass: 'text-teal-400', iconBg: 'bg-teal-500/10', iconBorder: 'border-teal-500/20' },
    { label: 'Inventory', value: kpis.inventory.toString(), icon: Package, colorClass: 'text-purple-400', iconBg: 'bg-purple-500/10', iconBorder: 'border-purple-500/20', subtext: 'items ordered' },
  ];

  const inp = { background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', padding: '6px 10px', fontSize: 12, outline: 'none' };

  return (
    <div className="space-y-5 pb-10">

      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Analytics & Insights</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {mode === 'all' ? 'Combined overview' : mode === 'churning' ? 'Churning performance' : 'Marketplace performance'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${mode === m.id ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
                {m.label}
              </button>
            ))}
          </div>
          <button onClick={() => refetch()} disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 transition"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* ── FILTER CARD ── */}
      <div className="rounded-2xl border px-5 py-4 flex flex-wrap items-end gap-5" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div>
          <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2">Period</p>
          <div className="flex items-center gap-0.5 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {['monthly', 'quarterly', 'yearly'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${period === p ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-2">Date Range</p>
          <div className="flex items-center gap-2">
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inp} />
            <span className="text-slate-500 text-xs">→</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inp} />
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {KPI_CARDS.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* ── PROFIT DETAILS BOX ── */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
        <button
          onClick={() => setShowProfitDetails(p => !p)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-emerald-400" />
            Profit Breakdown
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
              {profitMode === 'cashback_wallet' ? 'Cashback Wallet Mode' : 'Accounting Mode'}
            </span>
          </div>
          {showProfitDetails ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
        </button>
        {showProfitDetails && (
          <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
              <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Revenue</p>
              <p className="text-base font-bold text-emerald-400">{fmt$(kpis.revenue)}</p>
            </div>
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3">
              <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Card Spend</p>
              <p className="text-base font-bold text-red-400">−{fmt$(kpis.cost)}</p>
            </div>
            <div className="rounded-xl bg-pink-500/10 border border-pink-500/20 p-3">
              <p className="text-[10px] text-pink-400 font-semibold uppercase tracking-wider">Cashback</p>
              <p className="text-base font-bold text-pink-400">+{fmt$(kpis.cashback)}</p>
            </div>
            {profitMode === 'cashback_wallet' && kpis.yaCashback > 0 ? (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">YA Adjustment</p>
                <p className="text-base font-bold text-amber-400">−{fmt$(kpis.yaCashback)}</p>
                <p className="text-[9px] text-amber-500 mt-0.5">Wallet mode deduction</p>
              </div>
            ) : (
              <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3">
                <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">YA Cashback</p>
                <p className="text-base font-bold text-purple-400">{fmt$(kpis.yaCashback)}</p>
                <p className="text-[9px] text-purple-500 mt-0.5">Included in total</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── TAB NAV ── */}
      <div className="flex items-center gap-0.5 rounded-2xl p-1 w-fit" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${activeTab === t.id ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Revenue & Profit Trend" subtitle="Revenue and profit over time" badge="Monthly">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={periodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Revenue" />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Profit" />
                  <Line type="monotone" dataKey="cashback" stroke="#f472b6" strokeWidth={2.5} dot={{ r: 3, fill: '#f472b6', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Cashback" />
                </LineChart>
              </ResponsiveContainer>
              <ChartLegend items={[{ label: 'Revenue', color: '#60a5fa' }, { label: 'Profit', color: '#10b981' }, { label: 'Cashback', color: '#f472b6' }]} />
            </ChartCard>

            <ChartCard title="Expense Breakdown" subtitle="Spend categories distribution">
              {categoryData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">No data</div>
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
            <ChartCard title="Cumulative Profit" subtitle="Running profit over time">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={cumulativeData}>
                  <defs>
                    <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                  <Area type="monotone" dataKey="cumProfit" stroke="#10b981" fill="url(#cumGrad)" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Cumulative Profit" />
                </AreaChart>
              </ResponsiveContainer>
              <ChartLegend items={[{ label: 'Cumulative Profit', color: '#10b981' }]} />
            </ChartCard>

            <ChartCard title="Period P&L" subtitle="Profit & loss by period">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={periodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Revenue" />
                  <Line type="monotone" dataKey="cost" stroke="#f472b6" strokeWidth={2.5} dot={{ r: 3, fill: '#f472b6', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Cost" />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
              <ChartLegend items={[{ label: 'Revenue', color: '#60a5fa' }, { label: 'Cost', color: '#f472b6' }, { label: 'Profit', color: '#10b981' }]} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                  <Line type="monotone" dataKey="sales" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Sales" />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
              <ChartLegend items={[{ label: 'Sales', color: '#60a5fa' }, { label: 'Profit', color: '#10b981' }]} />
            </ChartCard>

            <ChartCard title="Spend by Category" subtitle="Category distribution">
              {categoryData.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">No data</div>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="platform" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                  <Line type="monotone" dataKey="sales" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Sales" />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Profit" />
                  <Line type="monotone" dataKey="cashback" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Cashback" />
                </LineChart>
              </ResponsiveContainer>
              <ChartLegend items={[{ label: 'Sales', color: '#60a5fa' }, { label: 'Profit', color: '#10b981' }, { label: 'Cashback', color: '#a78bfa' }]} />
            </ChartCard>

            <div className="rounded-2xl border p-5" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
              <p className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-4">Store Summary</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total Store Sales', value: fmt$(kpis.revenue), colorClass: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                  { label: 'Store Profit', value: fmt$(kpis.profit), colorClass: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                  { label: 'Store Cashback', value: fmt$(kpis.cashback), colorClass: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                  { label: 'Avg Store ROI', value: fmtPct(kpis.roi), colorClass: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border ${s.bg} ${s.border} p-3`}>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{s.label}</p>
                    <p className={`text-lg font-bold ${s.colorClass} mt-0.5`}>{s.value}</p>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                  <Line type="monotone" dataKey="spent" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Spent" />
                  <Line type="monotone" dataKey="cashback" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Cashback" />
                </LineChart>
              </ResponsiveContainer>
              <ChartLegend items={[{ label: 'Spent', color: '#a78bfa' }, { label: 'Cashback', color: '#10b981' }]} />
            </ChartCard>

            <ChartCard title="Cashback Distribution" subtitle="Cashback earned per card">
              {cashbackDistribution.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">No cashback data</div>
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(1)}%`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => `${Number(v).toFixed(2)}%`} />
                <Line type="monotone" dataKey="statedRate" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Stated Rate" />
                <Line type="monotone" dataKey="effectiveRate" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Effective Rate" />
              </LineChart>
            </ResponsiveContainer>
            <ChartLegend items={[{ label: 'Stated Rate', color: '#a78bfa' }, { label: 'Effective Rate', color: '#10b981' }]} />
          </ChartCard>

          <div className="rounded-2xl border overflow-hidden" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-bold tracking-widest uppercase text-slate-500">Payment Method Performance</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    {['Payment Method', 'Transactions', 'Total Spent', 'Cashback', 'Stated Rate', 'Effective Rate', 'Variance'].map(h => (
                      <th key={h} className="pb-3 pt-3 px-4 text-left font-semibold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paymentData.map(p => (
                    <tr key={p.id} className="border-b transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="py-3 px-4 font-semibold text-slate-200">{p.name}</td>
                      <td className="py-3 px-4 text-slate-400">{p.txns}</td>
                      <td className="py-3 px-4 text-blue-400 font-semibold">{fmt$(p.spent)}</td>
                      <td className="py-3 px-4 text-emerald-400 font-semibold">{fmt$(p.cashback)}</td>
                      <td className="py-3 px-4 text-slate-400">{fmtPct(p.statedRate)}</td>
                      <td className="py-3 px-4 text-purple-400 font-semibold">{fmtPct(p.effectiveRate)}</td>
                      <td className={`py-3 px-4 font-semibold ${p.variance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {p.variance >= 0 ? '+' : ''}{fmtPct(p.variance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {[
                { label: 'Total Spent', value: fmt$(paymentData.reduce((s, p) => s + p.spent, 0)), colorClass: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                { label: 'Total Cashback', value: fmt$(paymentData.reduce((s, p) => s + p.cashback, 0)), colorClass: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                { label: 'Best Rate', value: fmtPct(Math.max(...paymentData.map(p => p.effectiveRate), 0)), colorClass: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                { label: 'Best Card', value: [...paymentData].sort((a, b) => b.effectiveRate - a.effectiveRate)[0]?.name || '—', colorClass: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border ${s.bg} ${s.border} p-3`}>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">{s.label}</p>
                  <p className={`text-sm font-bold ${s.colorClass} mt-0.5 truncate`}>{s.value}</p>
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
          <div className="rounded-2xl border overflow-hidden" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-xs font-bold tracking-widest uppercase text-slate-500">Store Breakdown</p>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">{storeData.length} Stores</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    {['Store', 'Purchases', 'Sales', 'Profit', 'Cashback', 'Spread', 'ROI', 'TXNs'].map(h => (
                      <th key={h} className="pb-3 pt-3 px-4 text-left font-semibold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {storeData.map(s => (
                    <tr key={s.store} className="border-b transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="py-3 px-4 font-bold text-slate-200">{s.store}</td>
                      <td className="py-3 px-4 text-blue-400 font-semibold">{fmt$(s.purchases)}</td>
                      <td className="py-3 px-4 text-emerald-400 font-semibold">{fmt$(s.sales)}</td>
                      <td className="py-3 px-4 text-emerald-400 font-semibold">{fmt$(s.profit)}</td>
                      <td className="py-3 px-4 text-purple-400 font-semibold">{fmt$(s.cashback)}</td>
                      <td className="py-3 px-4 text-amber-400 font-semibold">{fmt$(s.spread)}</td>
                      <td className="py-3 px-4 text-slate-300 font-semibold">{fmtPct(s.roi)}</td>
                      <td className="py-3 px-4 text-slate-400">{s.txns}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                    <td className="py-3 px-4 font-bold text-slate-100">TOTAL</td>
                    <td className="py-3 px-4 text-blue-400 font-bold">{fmt$(storeData.reduce((s, x) => s + x.purchases, 0))}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{fmt$(storeData.reduce((s, x) => s + x.sales, 0))}</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">{fmt$(storeData.reduce((s, x) => s + x.profit, 0))}</td>
                    <td className="py-3 px-4 text-purple-400 font-bold">{fmt$(storeData.reduce((s, x) => s + x.cashback, 0))}</td>
                    <td className="py-3 px-4 text-amber-400 font-bold">{fmt$(storeData.reduce((s, x) => s + x.spread, 0))}</td>
                    <td className="py-3 px-4 text-slate-300 font-bold">{fmtPct(kpis.roi)}</td>
                    <td className="py-3 px-4 text-slate-400 font-bold">{storeData.reduce((s, x) => s + x.txns, 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Platform breakdown */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-xs font-bold tracking-widest uppercase text-slate-500">Platform Breakdown</p>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">{platformData.length} Platforms</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    {['Platform', 'Purchases', 'Sales', 'Cashback', 'Profit', '# Buys', 'Margin'].map(h => (
                      <th key={h} className="pb-3 pt-3 px-4 text-left font-semibold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {platformData.map(p => (
                    <tr key={p.platform} className="border-b transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="py-3 px-4 font-bold text-slate-200">{p.platform}</td>
                      <td className="py-3 px-4 text-blue-400 font-semibold">{fmt$(p.purchases)}</td>
                      <td className="py-3 px-4 text-emerald-400 font-semibold">{fmt$(p.sales)}</td>
                      <td className="py-3 px-4 text-purple-400 font-semibold">{fmt$(p.cashback)}</td>
                      <td className="py-3 px-4 text-emerald-400 font-semibold">{fmt$(p.profit)}</td>
                      <td className="py-3 px-4 text-slate-400">{p.buys}</td>
                      <td className="py-3 px-4 text-amber-400 font-semibold">{fmtPct(p.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Period breakdown */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-xs font-bold tracking-widest uppercase text-slate-500">Period-by-Period Data</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    {['Period', 'Purchases', 'Sales', 'Cashback', 'Net Profit', 'Margin'].map(h => (
                      <th key={h} className="pb-3 pt-3 px-4 text-left font-semibold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periodData.map(p => (
                    <tr key={p.period} className="border-b transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="py-3 px-4 font-semibold text-slate-300">{p.period}</td>
                      <td className="py-3 px-4 text-blue-400 font-semibold">{fmt$(p.cost)}</td>
                      <td className="py-3 px-4 text-emerald-400 font-semibold">{fmt$(p.revenue)}</td>
                      <td className="py-3 px-4 text-purple-400 font-semibold">{fmt$(p.cashback)}</td>
                      <td className="py-3 px-4 text-emerald-400 font-semibold">{fmt$(p.profit)}</td>
                      <td className="py-3 px-4 text-amber-400 font-semibold">{p.revenue > 0 ? fmtPct(p.profit / p.revenue * 100) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}