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
  borderRadius: 10,
  border: '1px solid var(--parch-line)',
  fontSize: 11,
  background: 'var(--parch-card)',
  color: 'var(--ink)',
};

const CARD_STYLE = { background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 14 };

function KpiCard({ label, value, icon: Icon, color, subtext }) {
  return (
    <div style={{ ...CARD_STYLE, padding: 14, borderTop: `3px solid ${color}` }}>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
      {subtext && <p style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 4 }}>{subtext}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, badge, children }) {
  return (
    <div style={{ ...CARD_STYLE, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>{title}</p>
        {badge && <span style={{ fontSize: 9, background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', color: 'var(--gold)', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>{badge}</span>}
      </div>
      {subtitle && <p style={{ fontSize: 10, color: 'var(--ink-ghost)', marginBottom: 14 }}>{subtitle}</p>}
      {!subtitle && <div style={{ marginBottom: 14 }} />}
      {children}
    </div>
  );
}

function ChartLegend({ items }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 20, height: 3, borderRadius: 99, backgroundColor: item.color }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-faded)' }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutLegend({ data, colors, fmt }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
      {data.map((d, i) => (
        <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: colors[i % colors.length], flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'var(--ink-faded)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink)', flexShrink: 0 }}>{fmt ? fmt(d.value) : d.value}</span>
        </div>
      ))}
    </div>
  );
}

function SD({ title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold)' }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(184,134,11,0.25), transparent)' }} />
    </div>
  );
}

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

  const [userEmail, setUserEmail] = useState(null);
  useEffect(() => { base44.auth.me().then(u => setUserEmail(u?.email)).catch(() => {}); }, []);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['analyticsOrders', userEmail],
    queryFn: () => userEmail ? base44.entities.PurchaseOrder.filter({ created_by: userEmail }, '-order_date') : [],
    enabled: userEmail !== null,
  });
  const { data: rewards = [] } = useQuery({
    queryKey: ['analyticsRewards', userEmail],
    queryFn: () => userEmail ? base44.entities.Reward.filter({ created_by: userEmail }) : [],
    enabled: userEmail !== null,
  });
  const { data: creditCards = [] } = useQuery({
    queryKey: ['analyticsCreditCards', userEmail],
    queryFn: () => userEmail ? base44.entities.CreditCard.filter({ created_by: userEmail }) : [],
    enabled: userEmail !== null,
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
    { label: 'Revenue', value: fmt$(kpis.revenue), color: 'var(--ocean)' },
    { label: 'Cost', value: fmt$(kpis.cost), color: 'var(--crimson)' },
    { label: profitMode === 'cashback_wallet' ? 'Wallet Profit' : 'Profit', value: fmt$(kpis.profit), color: kpis.profit >= 0 ? 'var(--terrain)' : 'var(--crimson)', subtext: kpis.cost > 0 ? `${fmtPct((kpis.profit / kpis.cost) * 100)} margin` : '' },
    { label: 'ROI', value: fmtPct(kpis.roi), color: 'var(--ocean2)' },
    { label: 'Cashback', value: fmt$(kpis.cashback), color: 'var(--violet)' },
    { label: 'YA Cashback', value: fmt$(kpis.yaCashback), color: 'var(--gold)', subtext: 'Young Adult CB' },
    { label: 'Top Store', value: kpis.topStore, color: 'var(--terrain)' },
    { label: 'Inventory', value: kpis.inventory.toString(), color: 'var(--violet)', subtext: 'items ordered' },
  ];

  const inp = { background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', borderRadius: 8, color: 'var(--ink)', padding: '6px 10px', fontSize: 12, outline: 'none' };

  return (
    <div style={{ paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.3px' }}>Analytics & Insights</h1>
          <p style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 4 }}>
            {mode === 'all' ? 'Combined overview' : mode === 'churning' ? 'Churning performance' : 'Marketplace performance'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 3, borderRadius: 9, background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)}
                style={{ padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: mode === m.id ? 'var(--ink)' : 'transparent', color: mode === m.id ? 'var(--gold)' : 'var(--ink-dim)' }}>
                {m.label}
              </button>
            ))}
          </div>
          <button onClick={() => refetch()} disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: 'var(--parch-card)', border: '1px solid var(--parch-line)', color: 'var(--ink-faded)', cursor: 'pointer', fontFamily: "'Playfair Display', serif" }}>
            <RefreshCw style={{ width: 13, height: 13 }} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ── FILTER CARD ── */}
      <div style={{ ...CARD_STYLE, padding: '14px 18px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 20 }}>
        <div>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 8 }}>Period</p>
          <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 8, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)' }}>
            {['monthly', 'quarterly', 'yearly'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: period === p ? 'var(--ink)' : 'transparent', color: period === p ? 'var(--gold)' : 'var(--ink-dim)', textTransform: 'capitalize' }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 8 }}>Date Range</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inp} />
            <span style={{ color: 'var(--ink-ghost)', fontSize: 12 }}>→</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inp} />
          </div>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <SD title="Survey Markers" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {KPI_CARDS.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* ── PROFIT DETAILS BOX ── */}
      <div style={{ ...CARD_STYLE, overflow: 'hidden' }}>
        <button onClick={() => setShowProfitDetails(p => !p)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', background: 'transparent', borderBottom: showProfitDetails ? '1px solid var(--parch-line)' : 'none', cursor: 'pointer', border: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info style={{ width: 14, height: 14, color: 'var(--gold)' }} />
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Profit Breakdown</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: 'var(--gold-bg)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>
              {profitMode === 'cashback_wallet' ? 'Cashback Wallet Mode' : 'Accounting Mode'}
            </span>
          </div>
          {showProfitDetails ? <ChevronUp style={{ width: 14, height: 14, color: 'var(--ink-dim)' }} /> : <ChevronDown style={{ width: 14, height: 14, color: 'var(--ink-dim)' }} />}
        </button>
        {showProfitDetails && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, padding: '14px 18px' }}>
            {[
              { label: 'Revenue', value: fmt$(kpis.revenue), color: 'var(--terrain)', bg: 'var(--terrain-bg)', border: 'var(--terrain-bdr)', prefix: '' },
              { label: 'Card Spend', value: fmt$(kpis.cost), color: 'var(--crimson)', bg: 'var(--crimson-bg)', border: 'var(--crimson-bdr)', prefix: '−' },
              { label: 'Cashback', value: fmt$(kpis.cashback), color: 'var(--violet)', bg: 'var(--violet-bg)', border: 'var(--violet-bdr)', prefix: '+' },
              { label: profitMode === 'cashback_wallet' ? 'Wallet Profit' : 'Net Profit', value: fmt$(kpis.profit), color: 'var(--gold)', bg: 'var(--gold-bg)', border: 'var(--gold-border)', prefix: '' },
            ].map(b => (
              <div key={b.label} style={{ borderRadius: 10, padding: 12, background: b.bg, border: `1px solid ${b.border}` }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: b.color, marginBottom: 4 }}>{b.label}</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: b.color }}>{b.prefix}{b.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── TAB NAV ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 3, borderRadius: 10, width: 'fit-content', background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: activeTab === t.id ? 'var(--ink)' : 'transparent',
              color: activeTab === t.id ? 'var(--gold)' : 'var(--ink-dim)' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }}>
            <ChartCard title="Revenue & Profit Trend" subtitle="Revenue and profit over time" badge="Monthly">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={periodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-ghost)', fontFamily: "'Playfair Display',serif" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink-ghost)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
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
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-ghost)', fontSize: 13 }}>No data</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }}>
            <ChartCard title="Cumulative Profit" subtitle="Running profit over time">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={cumulativeData}>
                  <defs>
                    <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-ghost)', fontFamily: "'Playfair Display',serif" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink-ghost)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                  <Area type="monotone" dataKey="cumProfit" stroke="#10b981" fill="url(#cumGrad)" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Cumulative Profit" />
                </AreaChart>
              </ResponsiveContainer>
              <ChartLegend items={[{ label: 'Cumulative Profit', color: '#10b981' }]} />
            </ChartCard>

            <ChartCard title="Period P&L" subtitle="Profit & loss by period">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={periodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--ink-ghost)', fontFamily: "'Playfair Display',serif" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink-ghost)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }}>
            <ChartCard title="Store Performance" subtitle="Sales & profit by store" badge={`${storeData.length} Stores`}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={storeData.slice(0, 8).map(s => ({ name: s.store, sales: s.sales, profit: s.profit }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--ink-ghost)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink-ghost)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                  <Line type="monotone" dataKey="sales" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Sales" />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
              <ChartLegend items={[{ label: 'Sales', color: '#60a5fa' }, { label: 'Profit', color: '#10b981' }]} />
            </ChartCard>

            <ChartCard title="Spend by Category" subtitle="Category distribution">
              {categoryData.length === 0 ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-ghost)', fontSize: 13 }}>No data</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }}>
            <ChartCard title="Platform Performance" subtitle="Revenue & profit by platform" badge={`${platformData.length} Platforms`}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={platformData.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)" />
                  <XAxis dataKey="platform" tick={{ fontSize: 9, fill: 'var(--ink-ghost)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink-ghost)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                  <Line type="monotone" dataKey="sales" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Sales" />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Profit" />
                  <Line type="monotone" dataKey="cashback" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Cashback" />
                </LineChart>
              </ResponsiveContainer>
              <ChartLegend items={[{ label: 'Sales', color: '#60a5fa' }, { label: 'Profit', color: '#10b981' }, { label: 'Cashback', color: '#a78bfa' }]} />
            </ChartCard>

            <div style={{ ...CARD_STYLE, padding: 20 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 16 }}>Store Summary</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Total Store Sales', value: fmt$(kpis.revenue), color: 'var(--ocean)', bg: 'var(--ocean-bg)', border: 'var(--ocean-bdr)' },
                  { label: 'Store Profit', value: fmt$(kpis.profit), color: 'var(--terrain)', bg: 'var(--terrain-bg)', border: 'var(--terrain-bdr)' },
                  { label: 'Store Cashback', value: fmt$(kpis.cashback), color: 'var(--violet)', bg: 'var(--violet-bg)', border: 'var(--violet-bdr)' },
                  { label: 'Avg Store ROI', value: fmtPct(kpis.roi), color: 'var(--gold)', bg: 'var(--gold-bg)', border: 'var(--gold-border)' },
                ].map(s => (
                  <div key={s.label} style={{ borderRadius: 10, padding: 12, background: s.bg, border: `1px solid ${s.border}` }}>
                    <p style={{ fontSize: 9, color: s.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{s.label}</p>
                    <p style={{ fontSize: 17, fontWeight: 800, color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {activeTab === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }}>
            <ChartCard title="Spend by Payment Method" subtitle="Spend and cashback per card">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={paymentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--ink-ghost)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--ink-ghost)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmt$(v)} />
                  <Line type="monotone" dataKey="spent" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Spent" />
                  <Line type="monotone" dataKey="cashback" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Cashback" />
                </LineChart>
              </ResponsiveContainer>
              <ChartLegend items={[{ label: 'Spent', color: '#a78bfa' }, { label: 'Cashback', color: '#10b981' }]} />
            </ChartCard>

            <ChartCard title="Cashback Distribution" subtitle="Cashback earned per card">
              {cashbackDistribution.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-ghost)', fontSize: 13 }}>No cashback data</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--ink-ghost)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--ink-ghost)' }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(1)}%`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => `${Number(v).toFixed(2)}%`} />
                <Line type="monotone" dataKey="statedRate" stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 3, fill: '#a78bfa', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Stated Rate" />
                <Line type="monotone" dataKey="effectiveRate" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Effective Rate" />
              </LineChart>
            </ResponsiveContainer>
            <ChartLegend items={[{ label: 'Stated Rate', color: '#a78bfa' }, { label: 'Effective Rate', color: '#10b981' }]} />
          </ChartCard>

          <div style={{ ...CARD_STYLE, overflow: 'hidden' }}>
            <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--parch-line)', background: 'var(--parch-warm)' }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>Payment Method Performance</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--parch-warm)' }}>
                    {['Payment Method', 'Transactions', 'Total Spent', 'Cashback', 'Stated Rate', 'Effective Rate', 'Variance'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', borderBottom: '1px solid var(--parch-line)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paymentData.map(p => (
                    <tr key={p.id} style={{ borderTop: '1px solid var(--parch-line)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,134,11,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--ink)' }}>{p.name}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--ink-faded)' }}>{p.txns}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--ocean)', fontWeight: 600 }}>{fmt$(p.spent)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--terrain)', fontWeight: 600 }}>{fmt$(p.cashback)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--ink-faded)' }}>{fmtPct(p.statedRate)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--violet)', fontWeight: 600 }}>{fmtPct(p.effectiveRate)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: p.variance >= 0 ? 'var(--terrain)' : 'var(--crimson)' }}>
                        {p.variance >= 0 ? '+' : ''}{fmtPct(p.variance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, padding: 20, borderTop: '1px solid var(--parch-line)' }}>
              {[
                { label: 'Total Spent', value: fmt$(paymentData.reduce((s, p) => s + p.spent, 0)), color: 'var(--ocean)', bg: 'var(--ocean-bg)', border: 'var(--ocean-bdr)' },
                { label: 'Total Cashback', value: fmt$(paymentData.reduce((s, p) => s + p.cashback, 0)), color: 'var(--terrain)', bg: 'var(--terrain-bg)', border: 'var(--terrain-bdr)' },
                { label: 'Best Rate', value: fmtPct(Math.max(...paymentData.map(p => p.effectiveRate), 0)), color: 'var(--violet)', bg: 'var(--violet-bg)', border: 'var(--violet-bdr)' },
                { label: 'Best Card', value: [...paymentData].sort((a, b) => b.effectiveRate - a.effectiveRate)[0]?.name || '—', color: 'var(--gold)', bg: 'var(--gold-bg)', border: 'var(--gold-border)' },
              ].map(s => (
                <div key={s.label} style={{ borderRadius: 10, padding: 12, background: s.bg, border: `1px solid ${s.border}` }}>
                  <p style={{ fontSize: 9, color: s.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{s.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: s.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL TABLES TAB ── */}
      {activeTab === 'tables' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ ...CARD_STYLE, overflow: 'hidden' }}>
            <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--parch-line)', background: 'var(--parch-warm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>Store Breakdown</p>
              <span style={{ fontSize: 10, background: 'var(--terrain-bg)', color: 'var(--terrain)', border: '1px solid var(--terrain-bdr)', padding: '2px 10px', borderRadius: 99, fontWeight: 700 }}>{storeData.length} Stores</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--parch-warm)' }}>
                    {['Store', 'Purchases', 'Sales', 'Profit', 'Cashback', 'Spread', 'ROI', 'TXNs'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', borderBottom: '1px solid var(--parch-line)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {storeData.map(s => (
                    <tr key={s.store} style={{ borderTop: '1px solid var(--parch-line)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,134,11,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--ink)' }}>{s.store}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--ocean)', fontWeight: 600 }}>{fmt$(s.purchases)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--terrain)', fontWeight: 600 }}>{fmt$(s.sales)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--terrain)', fontWeight: 600 }}>{fmt$(s.profit)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--violet)', fontWeight: 600 }}>{fmt$(s.cashback)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--gold)', fontWeight: 600 }}>{fmt$(s.spread)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--ink-faded)', fontWeight: 600 }}>{fmtPct(s.roi)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--ink-dim)' }}>{s.txns}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid var(--parch-deep)', background: 'var(--parch-warm)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--ink)' }}>TOTAL</td>
                    <td style={{ padding: '10px 14px', color: 'var(--ocean)', fontWeight: 800 }}>{fmt$(storeData.reduce((s, x) => s + x.purchases, 0))}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--terrain)', fontWeight: 800 }}>{fmt$(storeData.reduce((s, x) => s + x.sales, 0))}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--terrain)', fontWeight: 800 }}>{fmt$(storeData.reduce((s, x) => s + x.profit, 0))}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--violet)', fontWeight: 800 }}>{fmt$(storeData.reduce((s, x) => s + x.cashback, 0))}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--gold)', fontWeight: 800 }}>{fmt$(storeData.reduce((s, x) => s + x.spread, 0))}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--ink-faded)', fontWeight: 800 }}>{fmtPct(kpis.roi)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--ink-dim)', fontWeight: 800 }}>{storeData.reduce((s, x) => s + x.txns, 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...CARD_STYLE, overflow: 'hidden' }}>
            <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--parch-line)', background: 'var(--parch-warm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>Platform Breakdown</p>
              <span style={{ fontSize: 10, background: 'var(--terrain-bg)', color: 'var(--terrain)', border: '1px solid var(--terrain-bdr)', padding: '2px 10px', borderRadius: 99, fontWeight: 700 }}>{platformData.length} Platforms</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--parch-warm)' }}>
                    {['Platform', 'Purchases', 'Sales', 'Cashback', 'Profit', '# Buys', 'Margin'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', borderBottom: '1px solid var(--parch-line)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {platformData.map(p => (
                    <tr key={p.platform} style={{ borderTop: '1px solid var(--parch-line)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,134,11,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--ink)' }}>{p.platform}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--ocean)', fontWeight: 600 }}>{fmt$(p.purchases)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--terrain)', fontWeight: 600 }}>{fmt$(p.sales)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--violet)', fontWeight: 600 }}>{fmt$(p.cashback)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--terrain)', fontWeight: 600 }}>{fmt$(p.profit)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--ink-dim)' }}>{p.buys}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--gold)', fontWeight: 600 }}>{fmtPct(p.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ ...CARD_STYLE, overflow: 'hidden' }}>
            <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--parch-line)', background: 'var(--parch-warm)' }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>Period-by-Period Data</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--parch-warm)' }}>
                    {['Period', 'Purchases', 'Sales', 'Cashback', 'Net Profit', 'Margin'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', borderBottom: '1px solid var(--parch-line)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periodData.map(p => (
                    <tr key={p.period} style={{ borderTop: '1px solid var(--parch-line)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,134,11,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--ink-faded)' }}>{p.period}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--ocean)', fontWeight: 600 }}>{fmt$(p.cost)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--terrain)', fontWeight: 600 }}>{fmt$(p.revenue)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--violet)', fontWeight: 600 }}>{fmt$(p.cashback)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--terrain)', fontWeight: 600 }}>{fmt$(p.profit)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--gold)', fontWeight: 600 }}>{p.revenue > 0 ? fmtPct(p.profit / p.revenue * 100) : '—'}</td>
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