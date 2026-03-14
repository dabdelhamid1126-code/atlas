import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, eachMonthOfInterval, subMonths } from 'date-fns';
import { RefreshCw, Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Percent, CreditCard, Store, Package } from 'lucide-react';

const COLORS = ['#7c3aed', '#4ade80', '#60a5fa', '#fb923c', '#f472b6', '#34d399', '#a78bfa', '#facc15'];

const fmt$ = (v) => `$${(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (v) => `${(v || 0).toFixed(2)}%`;

export default function Analytics() {
  const [mode, setMode] = useState('all'); // all | churning | marketplace
  const [period, setPeriod] = useState('monthly'); // monthly | quarterly | yearly
  const [fromDate, setFromDate] = useState(() => format(subMonths(new Date(), 12), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState('overview');
  const [storeFilter, setStoreFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [creditCards, setCreditCards] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [o, r, c] = await Promise.all([
      base44.entities.PurchaseOrder.list('-order_date'),
      base44.entities.Reward.list(),
      base44.entities.CreditCard.list(),
    ]);
    setOrders(o);
    setRewards(r);
    setCreditCards(c);
    setLoading(false);
  };

  // Filter orders by mode and date range
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const d = o.order_date || o.created_date;
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      if (mode === 'churning' && o.order_type !== 'churning') return false;
      if (mode === 'marketplace' && o.order_type !== 'marketplace') return false;
      return true;
    });
  }, [orders, mode, fromDate, toDate]);

  const filteredRewards = useMemo(() => {
    const orderIds = new Set(filteredOrders.map(o => o.id));
    return rewards.filter(r => orderIds.has(r.purchase_order_id));
  }, [rewards, filteredOrders]);

  // KPI calculations
  const kpis = useMemo(() => {
    const revenue = filteredOrders.reduce((s, o) => s + (o.total_cost || 0), 0);
    const cost = filteredOrders.reduce((s, o) => s + (o.final_cost || o.total_cost || 0), 0);
    const profit = revenue - cost;
    const roi = cost > 0 ? (profit / cost) * 100 : 0;
    const cashback = filteredRewards.filter(r => r.currency === 'USD').reduce((s, r) => s + (r.amount || 0), 0);
    const commission = profit - cashback;
    const topStore = (() => {
      const map = {};
      filteredOrders.forEach(o => { if (o.retailer) map[o.retailer] = (map[o.retailer] || 0) + (o.total_cost || 0); });
      const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
      return sorted[0]?.[0] || '—';
    })();
    const inventory = filteredOrders.reduce((s, o) => s + (o.items?.reduce((ss, i) => ss + (i.quantity_ordered || 0), 0) || 0), 0);
    return { revenue, cost, profit, roi, cashback, commission, topStore, inventory };
  }, [filteredOrders, filteredRewards]);

  // By-period data (monthly buckets)
  const periodData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const d = o.order_date || o.created_date;
      if (!d) return;
      const key = d.substring(0, 7);
      if (!map[key]) map[key] = { period: key, revenue: 0, cost: 0, cashback: 0 };
      map[key].revenue += o.total_cost || 0;
      map[key].cost += o.final_cost || o.total_cost || 0;
    });
    filteredRewards.filter(r => r.currency === 'USD').forEach(r => {
      const d = r.date_earned;
      if (!d) return;
      const key = d.substring(0, 7);
      if (map[key]) map[key].cashback += r.amount || 0;
    });
    return Object.values(map).sort((a, b) => a.period.localeCompare(b.period)).map(d => ({
      ...d,
      profit: d.revenue - d.cost,
    }));
  }, [filteredOrders, filteredRewards]);

  // Cumulative profit
  const cumulativeData = useMemo(() => {
    let cum = 0;
    return periodData.map(d => { cum += d.profit; return { period: d.period, cumProfit: cum }; });
  }, [periodData]);

  // Store breakdown
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
      ...s,
      profit: s.sales - s.purchases,
      roi: s.purchases > 0 ? ((s.sales - s.purchases) / s.purchases * 100) : 0,
      spread: s.sales - s.purchases - s.cashback,
    }));
  }, [filteredOrders, filteredRewards]);

  // Platform breakdown
  const platformData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const platform = o.marketplace_platform || o.retailer || 'Unknown';
      if (!map[platform]) map[platform] = { platform, purchases: 0, sales: 0, cashback: 0, buys: 0, salesCount: 0 };
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
      ...p,
      profit: p.sales - p.purchases,
      margin: p.sales > 0 ? ((p.sales - p.purchases) / p.sales * 100) : 0,
    }));
  }, [filteredOrders, filteredRewards]);

  // Store ROI chart data
  const storeRoiData = useMemo(() => storeData.map(s => ({ store: s.store, roi: parseFloat(s.roi.toFixed(2)) })), [storeData]);

  // Spend by category
  const categoryData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const cat = o.product_category || o.category || 'Other';
      map[cat] = (map[cat] || 0) + (o.total_cost || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  // Payment method data
  const paymentData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const key = o.credit_card_id || 'unknown';
      const card = creditCards.find(c => c.id === key);
      const name = card?.card_name || o.card_name || 'Unknown';
      if (!map[key]) map[key] = { id: key, name, spent: 0, cashback: 0, txns: 0, statedRate: card?.cashback_rate || 0 };
      map[key].spent += o.total_cost || 0;
      map[key].txns += 1;
    });
    filteredRewards.filter(r => r.currency === 'USD').forEach(r => {
      const o = filteredOrders.find(x => x.id === r.purchase_order_id);
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

  const expenseBreakdown = useMemo(() => {
    return [{ name: 'COGS', value: kpis.cost }];
  }, [kpis]);

  const stores = useMemo(() => [...new Set(filteredOrders.map(o => o.retailer).filter(Boolean))], [filteredOrders]);

  const KpiCard = ({ label, value, icon: Icon, color, subtext }) => (
    <div className={`rounded-2xl p-4 border ${color} flex flex-col gap-1 min-w-0`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">{label}</span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <span className="text-xl font-bold text-slate-900 truncate">{value}</span>
      {subtext && <span className="text-[10px] text-slate-400">{subtext}</span>}
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📈' },
    { id: 'breakdowns', label: 'Breakdowns', icon: '📊' },
    { id: 'payments', label: 'Payments', icon: '💳' },
    { id: 'tables', label: 'Detail Tables', icon: '🔍' },
  ];

  const chartTooltipStyle = { borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: 12 };

  return (
    <div className="min-h-screen bg-[#f4f5f9]">
      <div className="max-w-[1400px] mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics & Insights</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {mode === 'all' ? 'Combined overview' : mode === 'churning' ? 'Churning performance' : 'Marketplace performance'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mode Buttons */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm text-xs">
              {[{id:'all',label:'All'},{id:'churning',label:'🔄 Churning'},{id:'marketplace',label:'🏪 Marketplace'}].map(m => (
                <button key={m.id} onClick={() => setMode(m.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${mode === m.id ? 'bg-violet-100 text-violet-700 border border-violet-300' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {m.label}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
              <Download className="h-3.5 w-3.5" /> Export All
            </button>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 shadow-sm">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-5 flex flex-wrap items-end gap-5">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">Period</p>
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {['monthly','quarterly','yearly'].map(p => (
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
          {activeTab === 'breakdowns' || activeTab === 'tables' ? (
            <div>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">Store</p>
              <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)}
                className="h-8 px-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none">
                <option value="all">All Stores</option>
                {stores.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ) : null}
          {activeTab === 'payments' ? (
            <div>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">Payment Method</p>
              <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
                className="h-8 px-3 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none">
                <option value="all">All Methods</option>
                {paymentData.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          ) : null}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-5">
          <KpiCard label="Revenue" value={fmt$(kpis.revenue)} icon={DollarSign} color="bg-indigo-50 border-indigo-100" />
          <KpiCard label="Cost" value={fmt$(kpis.cost)} icon={ShoppingCart} color="bg-pink-50 border-pink-100" />
          <KpiCard label="Profit" value={fmt$(kpis.profit)} icon={TrendingUp} color="bg-green-50 border-green-100"
            subtext={kpis.cost > 0 ? `${fmtPct((kpis.profit/kpis.cost)*100)} margin` : ''} />
          <KpiCard label="ROI" value={fmtPct(kpis.roi)} icon={Percent} color="bg-purple-50 border-purple-100" />
          <KpiCard label="Cashback" value={fmt$(kpis.cashback)} icon={CreditCard} color="bg-blue-50 border-blue-100" />
          <KpiCard label="Commission" value={fmt$(kpis.commission)} icon={DollarSign} color="bg-amber-50 border-amber-100" />
          <KpiCard label="Top Store" value={kpis.topStore} icon={Store} color="bg-teal-50 border-teal-100" />
          <KpiCard label="Inventory" value={kpis.inventory.toString()} icon={Package} color="bg-slate-50 border-slate-200"
            subtext="items ordered" />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 mb-5 shadow-sm w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === t.id ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'text-slate-500 hover:bg-slate-50'
              }`}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Revenue & Profit Trend */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold tracking-widest uppercase text-slate-700">Revenue & Profit Trend</p>
                  <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold uppercase">Monthly</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-4">Revenue and profit over time line</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={periodData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={v => fmt$(v)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="revenue" stroke="#60a5fa" strokeWidth={2} dot={false} name="Revenue" />
                    <Line type="monotone" dataKey="profit" stroke="#4ade80" strokeWidth={2} dot={false} name="Profit" />
                    <Line type="monotone" dataKey="cashback" stroke="#a78bfa" strokeWidth={2} dot={false} name="Cashback" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Expense Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-4">Expense Breakdown</p>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={2}>
                        {expenseBreakdown.map((_, i) => <Cell key={i} fill={['#ef4444','#f97316','#eab308'][i % 3]} />)}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} formatter={v => fmt$(v)} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Cumulative Profit */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-4">Cumulative Profit</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={cumulativeData}>
                    <defs>
                      <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={v => fmt$(v)} />
                    <Area type="monotone" dataKey="cumProfit" stroke="#7c3aed" fill="url(#cumGrad)" strokeWidth={2} name="Cumulative Profit" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Period P&L */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-4">Period P&L</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={periodData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={v => fmt$(v)} />
                    <Bar dataKey="profit" fill="#4ade80" radius={[4,4,0,0]} name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Breakdowns */}
        {activeTab === 'breakdowns' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Store Performance */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold tracking-widest uppercase text-slate-700">Store Performance</p>
                  <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold">{storeData.length} Stores</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-4">Sales & profit by store</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={storeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <YAxis dataKey="store" type="category" width={80} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={v => fmt$(v)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="sales" fill="#60a5fa" radius={[0,4,4,0]} name="Sales" />
                    <Bar dataKey="profit" fill="#4ade80" radius={[0,4,4,0]} name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Platform Performance */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold tracking-widest uppercase text-slate-700">Platform Performance</p>
                  <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold">{platformData.length} Platforms</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-4">Revenue & profit by platform</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={platformData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="platform" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={v => fmt$(v)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="sales" fill="#60a5fa" radius={[4,4,0,0]} name="Sales" />
                    <Bar dataKey="profit" fill="#4ade80" radius={[4,4,0,0]} name="Profit" />
                    <Bar dataKey="cashback" fill="#a78bfa" radius={[4,4,0,0]} name="Cashback" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Store ROI Comparison */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-4">Store ROI Comparison</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={storeRoiData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="store" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={v => `${v}%`} />
                    <Bar dataKey="roi" fill="#4ade80" radius={[4,4,0,0]} name="ROI %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Spend by Category */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-4">Spend by Category</p>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                        {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} formatter={v => fmt$(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5 flex-1">
                    {categoryData.map((c, i) => (
                      <div key={c.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-xs text-slate-600">{c.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{fmt$(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer summary */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 grid grid-cols-4 gap-4">
              {[
                { label: 'Total Store Sales', value: fmt$(kpis.revenue), color: 'text-blue-600', icon: '💰' },
                { label: 'Store Profit', value: fmt$(kpis.profit), color: 'text-green-600', icon: '📈' },
                { label: 'Store Cashback', value: fmt$(kpis.cashback), color: 'text-violet-600', icon: '💳' },
                { label: 'Avg Store ROI', value: fmtPct(kpis.roi), color: 'text-amber-600', icon: '%' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-sm">{s.icon}</span>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium">{s.label}</p>
                    <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Payments */}
        {activeTab === 'payments' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Spend by Payment Method */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-1">Spend by Payment Method</p>
                <p className="text-[10px] text-slate-400 mb-4">Spend and cashback per card</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={paymentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={v => fmt$(v)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="spent" fill="#7c3aed" radius={[4,4,0,0]} name="Spent" />
                    <Bar dataKey="cashback" fill="#4ade80" radius={[4,4,0,0]} name="Cashback" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Cashback Distribution */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-4">Cashback Distribution</p>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={cashbackDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                        {cashbackDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} formatter={v => fmt$(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5 flex-1">
                    {cashbackDistribution.map((c, i) => (
                      <div key={c.name} className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-slate-600 truncate">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Effective vs Stated Rate */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-4">Effective Cashback Rate vs Stated Rate</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={paymentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(1)}%`} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={v => `${v.toFixed(2)}%`} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="statedRate" fill="#a78bfa" radius={[4,4,0,0]} name="Stated Rate" />
                  <Bar dataKey="effectiveRate" fill="#4ade80" radius={[4,4,0,0]} name="Effective Rate" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Payment Method Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-4">Payment Method Performance</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Payment Method','Transactions','Total Spent','Cashback Earned','Stated Rate','Effective Rate','Variance'].map(h => (
                        <th key={h} className="pb-2 text-left font-semibold text-slate-500 uppercase tracking-wider text-[10px] px-2 first:pl-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paymentData.map(p => (
                      <tr key={p.id} className="border-b border-slate-50">
                        <td className="py-3 pl-0 px-2 font-semibold text-slate-800">{p.name}</td>
                        <td className="py-3 px-2 text-slate-600">{p.txns}</td>
                        <td className="py-3 px-2 text-blue-600 font-semibold">{fmt$(p.spent)}</td>
                        <td className="py-3 px-2 text-green-600 font-semibold">{fmt$(p.cashback)}</td>
                        <td className="py-3 px-2 text-slate-600">{fmtPct(p.statedRate)}</td>
                        <td className="py-3 px-2 text-violet-600 font-semibold">{fmtPct(p.effectiveRate)}</td>
                        <td className={`py-3 px-2 font-semibold ${p.variance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {p.variance >= 0 ? '+' : ''}{fmtPct(p.variance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Footer */}
              <div className="grid grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-100">
                {[
                  { label: 'Total By Spend', value: fmt$(paymentData.reduce((s,p)=>s+p.spent,0)), color: 'text-blue-600', icon: '💳' },
                  { label: 'Total Cashback', value: fmt$(paymentData.reduce((s,p)=>s+p.cashback,0)), color: 'text-green-600', icon: '💳' },
                  { label: 'Best Rate', value: fmtPct(Math.max(...paymentData.map(p=>p.effectiveRate), 0)), color: 'text-violet-600', icon: '📈' },
                  { label: 'Best Card', value: paymentData.sort((a,b)=>b.effectiveRate-a.effectiveRate)[0]?.name || '—', color: 'text-green-600', icon: '💳' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="text-sm">{s.icon}</span>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">{s.label}</p>
                      <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Detail Tables */}
        {activeTab === 'tables' && (
          <div className="space-y-5">
            {/* Store Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold tracking-widest uppercase text-slate-700">Store Breakdown</p>
                <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold">{storeData.length} Stores</span>
              </div>
              <p className="text-[10px] text-slate-400 mb-4">Complete store-level data</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Store','Purchases','Sales','Profit','Cashback','Spread','ROI','TXNs'].map(h => (
                        <th key={h} className="pb-2 text-left font-semibold text-slate-500 uppercase tracking-wider text-[10px] px-2 first:pl-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {storeData.map(s => (
                      <tr key={s.store} className="border-b border-slate-50">
                        <td className="py-3 pl-0 px-2 font-bold text-slate-800">{s.store}</td>
                        <td className="py-3 px-2 text-blue-600 font-semibold">{fmt$(s.purchases)}</td>
                        <td className="py-3 px-2 text-green-600 font-semibold">{fmt$(s.sales)}</td>
                        <td className="py-3 px-2 text-green-600 font-semibold">{fmt$(s.profit)}</td>
                        <td className="py-3 px-2 text-violet-600 font-semibold">{fmt$(s.cashback)}</td>
                        <td className="py-3 px-2 text-amber-600 font-semibold">{fmt$(s.spread)}</td>
                        <td className="py-3 px-2 text-slate-700 font-semibold">{fmtPct(s.roi)}</td>
                        <td className="py-3 px-2 text-slate-600">{s.txns}</td>
                      </tr>
                    ))}
                    {/* Totals */}
                    <tr className="border-t-2 border-slate-200 font-bold">
                      <td className="py-3 pl-0 px-2 text-slate-900">TOTAL</td>
                      <td className="py-3 px-2 text-blue-700">{fmt$(storeData.reduce((s,x)=>s+x.purchases,0))}</td>
                      <td className="py-3 px-2 text-green-700">{fmt$(storeData.reduce((s,x)=>s+x.sales,0))}</td>
                      <td className="py-3 px-2 text-green-700">{fmt$(storeData.reduce((s,x)=>s+x.profit,0))}</td>
                      <td className="py-3 px-2 text-violet-700">{fmt$(storeData.reduce((s,x)=>s+x.cashback,0))}</td>
                      <td className="py-3 px-2 text-amber-700">{fmt$(storeData.reduce((s,x)=>s+x.spread,0))}</td>
                      <td className="py-3 px-2 text-slate-700">{fmtPct(kpis.roi)}</td>
                      <td className="py-3 px-2 text-slate-700">{storeData.reduce((s,x)=>s+x.txns,0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Platform Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold tracking-widest uppercase text-slate-700">Platform Breakdown</p>
                <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold">{platformData.length} Platforms</span>
              </div>
              <p className="text-[10px] text-slate-400 mb-4">Performance by marketplace platform</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Platform','Purchases','Sales','Cashback','Profit','# Buys','Margin'].map(h => (
                        <th key={h} className="pb-2 text-left font-semibold text-slate-500 uppercase tracking-wider text-[10px] px-2 first:pl-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {platformData.map(p => (
                      <tr key={p.platform} className="border-b border-slate-50">
                        <td className="py-3 pl-0 px-2 font-bold text-slate-800">{p.platform}</td>
                        <td className="py-3 px-2 text-blue-600 font-semibold">{fmt$(p.purchases)}</td>
                        <td className="py-3 px-2 text-green-600 font-semibold">{fmt$(p.sales)}</td>
                        <td className="py-3 px-2 text-violet-600 font-semibold">{fmt$(p.cashback)}</td>
                        <td className="py-3 px-2 text-green-600 font-semibold">{fmt$(p.profit)}</td>
                        <td className="py-3 px-2 text-slate-600">{p.buys}</td>
                        <td className="py-3 px-2 text-amber-600 font-semibold">{fmtPct(p.margin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Period-by-Period */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-1">Period-by-Period Data</p>
              <p className="text-[10px] text-slate-400 mb-4">Row totals by each period</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Period','Purchases','Sales','Cashback','Net Profit','Margin'].map(h => (
                        <th key={h} className="pb-2 text-left font-semibold text-slate-500 uppercase tracking-wider text-[10px] px-2 first:pl-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periodData.map(p => (
                      <tr key={p.period} className="border-b border-slate-50">
                        <td className="py-3 pl-0 px-2 font-semibold text-slate-700">{p.period}</td>
                        <td className="py-3 px-2 text-blue-600 font-semibold">{fmt$(p.cost)}</td>
                        <td className="py-3 px-2 text-green-600 font-semibold">{fmt$(p.revenue)}</td>
                        <td className="py-3 px-2 text-violet-600 font-semibold">{fmt$(p.cashback)}</td>
                        <td className="py-3 px-2 text-green-600 font-semibold">{fmt$(p.profit)}</td>
                        <td className="py-3 px-2 text-amber-600 font-semibold">{p.revenue > 0 ? fmtPct(p.profit/p.revenue*100) : '—'}</td>
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