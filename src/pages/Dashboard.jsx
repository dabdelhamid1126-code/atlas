import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign, TrendingUp, CreditCard, Percent, Star,
  ChevronDown, ChevronUp, Info, ShoppingBag, Send,
  Package, CheckCircle, RefreshCw, X, ImageOff,
  AlertTriangle, Truck, Activity, Gift, Boxes,
  FileWarning, Clock, ArrowRight
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, subMonths,
  parseISO, subDays, startOfYear, formatDistanceToNow
} from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import GoalTracker from '@/components/dashboard/GoalTracker';

const TIME_FILTERS = ['Today', '7 Days', '30 Days', 'YTD', 'All Time'];
const MODE_FILTERS = ['All', 'Churning', 'Resell'];

const STATUS_CONFIG = {
  pending:    { label: 'Pending',   icon: Clock,       color: '#9c8f7e', bg: 'rgba(156,143,126,0.12)', border: 'rgba(156,143,126,0.25)' },
  ordered:    { label: 'Ordered',   icon: ShoppingBag, color: '#1a5276', bg: 'rgba(26,82,118,0.1)',    border: 'rgba(26,82,118,0.22)'   },
  shipped:    { label: 'Shipped',   icon: Send,        color: '#5b2c6f', bg: 'rgba(91,44,111,0.1)',    border: 'rgba(91,44,111,0.2)'    },
  received:   { label: 'Received',  icon: Package,     color: '#1a5276', bg: 'rgba(26,82,118,0.1)',    border: 'rgba(26,82,118,0.22)'   },
  partially_received: { label: 'Partial', icon: Package, color: '#b8860b', bg: 'rgba(184,134,11,0.1)', border: 'rgba(184,134,11,0.22)' },
  paid:       { label: 'Paid',      icon: CheckCircle, color: '#2d5a27', bg: 'rgba(45,90,39,0.1)',     border: 'rgba(45,90,39,0.2)'     },
  completed:  { label: 'Completed', icon: CheckCircle, color: '#b8860b', bg: 'rgba(184,134,11,0.1)',   border: 'rgba(184,134,11,0.22)'  },
  cancelled:  { label: 'Cancelled', icon: X,           color: '#922b21', bg: 'rgba(146,43,33,0.1)',    border: 'rgba(146,43,33,0.2)'    },
};

const ENTITY_ICON = {
  purchase_order: ShoppingBag, inventory: Boxes, product: Package,
  gift_card: Gift, invoice: FileWarning, export: Send, user: Activity, other: Activity,
};
const PIE_COLORS = ['#b8860b','#8e44ad','#2980b9','#4a8c42','#c0392b','#d4a017'];

function fmt(n) {
  if (n === undefined || n === null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}
function abbrev(n) {
  const abs = Math.abs(n || 0);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000)    return `$${(n / 1_000).toFixed(1)}K`;
  return fmt(n);
}

function SectionDivider({ title, dotColor = 'var(--gold)', lineColor = 'rgba(184,134,11,0.25)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
      <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold)', whiteSpace: 'nowrap' }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${lineColor}, rgba(184,134,11,0.06), transparent)` }} />
    </div>
  );
}

function KpiCard({ label, value, sub, accentColor, valueColor }) {
  const color = valueColor || accentColor || 'var(--ink)';
  return (
    <div style={{
      borderRadius: 14,
      padding: 16,
      background: 'var(--parch-card)',
      border: '1px solid var(--parch-line)',
      borderTop: `3px solid ${accentColor || 'var(--parch-line)'}`,
      position: 'relative',
    }}>
      <p style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', marginBottom: 8,
        color: 'var(--ink-dim)',
      }}>{label}</p>
      <p style={{
        fontSize: 24, fontWeight: 800, lineHeight: 1,
        letterSpacing: '-0.5px', color,
      }}>{value}</p>
      {sub && <p style={{ fontSize: 10, marginTop: 6, color: 'var(--ink-ghost)' }}>{sub}</p>}
    </div>
  );
}

function AlertBanner({ icon: Icon, color, bg, border, title, value, onClick }) {
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: bg, border: `1px solid ${border}`, cursor: 'pointer', width: '100%', textAlign: 'left' }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 13, height: 13, color }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color, margin: 0 }}>{title}</p>
        <p style={{ fontSize: 10, color, opacity: 0.7, marginTop: 1 }}>{value}</p>
      </div>
      <ArrowRight style={{ width: 12, height: 12, color, flexShrink: 0 }} />
    </button>
  );
}

function PipelineCard({ status, count, onClick }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] || { label: status, icon: Package, color: 'var(--ink-dim)', bg: 'var(--parch-warm)', border: 'var(--parch-line)' };
  const Icon = cfg.icon;
  return (
    <button onClick={onClick} title={cfg.label}
      style={{ borderRadius: 10, padding: '12px 6px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', border: `1px solid ${cfg.border}`, background: cfg.bg, position: 'relative', zIndex: 1 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', border: `2px solid ${cfg.color}`, marginBottom: 2 }} />
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 7.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: cfg.color }}>{cfg.label}</p>
      <p style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, color: cfg.color }}>{count}</p>
    </button>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ borderRadius: 10, padding: '10px 14px', background: 'var(--parch-card)', border: '1px solid var(--parch-line)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: 11 }}>
      <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--ink-faded)', textTransform: 'capitalize' }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function ActivityItem({ log }) {
  const Icon = ENTITY_ICON[log.entity_type] || Activity;
  const timeAgo = log.created_date ? formatDistanceToNow(new Date(log.created_date), { addSuffix: true }) : '';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 16px', borderBottom: '1px solid var(--parch-line)' }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <Icon style={{ width: 12, height: 12, color: 'var(--gold)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11.5, color: 'var(--ink-faded)', lineHeight: 1.4 }}>{log.details || log.action}</p>
        {log.user_name && <p style={{ fontSize: 10, color: 'var(--ink-ghost)', marginTop: 2 }}>{log.user_name}</p>}
      </div>
      {timeAgo && <p style={{ fontSize: 10, color: 'var(--ink-ghost)', flexShrink: 0, marginTop: 1 }}>{timeAgo}</p>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [user, setUser]                   = useState(null);
  const [allOrders, setAllOrders]         = useState([]);
  const [metrics, setMetrics]             = useState({ totalCost: 0, saleRevenue: 0, cashback: 0, points: 0, netProfit: 0, avgRoi: 0, yaCashback: 0, inStockUnits: 0, giftCardValue: 0 });
  const [trendData, setTrendData]         = useState([]);
  const [byStatusData, setByStatusData]   = useState([]);
  const [topCards, setTopCards]           = useState([]);
  const [activityLogs, setActivityLogs]   = useState([]);
  const [alerts, setAlerts]               = useState({ overdueInvoices: 0, damagedItems: 0, inTransit: 0 });
  const [shipments, setShipments]         = useState([]);
  const [timeFilter, setTimeFilter]       = useState('30 Days');
  const [modeFilter, setModeFilter]       = useState('All');
  const [showProfitDetails, setShowProfitDetails] = useState(true);
  const [modalImage, setModalImage]       = useState(null);

  const profitMode = user?.profit_mode || 'accounting';

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); loadData(); }, []);
  useEffect(() => { const i = setInterval(() => silentRefresh(), 5 * 60 * 1000); return () => clearInterval(i); }, [timeFilter, modeFilter]);
  useEffect(() => { if (!loading) loadData(); }, [timeFilter, modeFilter]);

  const getDateCutoff = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (timeFilter) {
      case 'Today':    return today;
      case '7 Days':   return subDays(today, 7);
      case '30 Days':  return subDays(today, 30);
      case 'YTD':      return startOfYear(now);
      default:         return new Date(1970, 0, 1);
    }
  };

  const filterByMode  = (orders) => modeFilter === 'All' ? orders : orders.filter(o => modeFilter === 'Churning' ? o.order_type === 'churning' : o.order_type === 'marketplace');
  const filterByTime  = (items, dateField) => { const cutoff = getDateCutoff(); return items.filter(i => { const d = i[dateField] ? new Date(parseISO(i[dateField])) : null; return d && d >= cutoff; }); };

  const silentRefresh = async () => { setRefreshing(true); await loadData(true); setRefreshing(false); };

  const loadData = async (silent = false) => {
    try {
      const currentUser = await base44.auth.me().catch(() => null);
      const userEmail = currentUser?.email;
      if (!userEmail) return;
      const byUser = { created_by: userEmail };
      const [orders, rewards, creditCards, inventoryItems, giftCards, invoices, damagedItems, shipmentsData, activityData] = await Promise.all([
        base44.entities.PurchaseOrder.filter(byUser),
        base44.entities.Reward.filter(byUser),
        base44.entities.CreditCard.filter(byUser),
        base44.entities.InventoryItem.filter(byUser).catch(() => []),
        base44.entities.GiftCard.filter(byUser).catch(() => []),
        base44.entities.Invoice.filter(byUser).catch(() => []),
        base44.entities.DamagedItem.filter(byUser).catch(() => []),
        base44.entities.Shipment.filter(byUser).catch(() => []),
        base44.entities.ActivityLog.filter(byUser).catch(() => []),
      ]);
      setAllOrders(orders);

      const filteredOrders  = filterByTime(filterByMode(orders), 'order_date');
      const filteredRewards = filterByTime(rewards, 'date_earned');

      const totalCost    = filteredOrders.reduce((s, o) => s + parseFloat(o.total_cost || 0), 0);
      const saleRevenue  = filteredOrders.reduce((sum, o) => sum + (o.sale_events || []).reduce((s, ev) => s + (ev.items || []).reduce((is, item) => is + (parseFloat(item.sale_price) || 0) * (parseInt(item.quantity) || 1), 0), 0), 0);
      const allCashback  = filteredRewards.filter(r => r.currency === 'USD');
      const cashback     = allCashback.reduce((s, r) => s + (r.amount || 0), 0);
      const yaCashback   = allCashback.filter(r => r.notes?.includes('Young Adult') || r.notes?.includes('YACB') || r.notes?.includes('Prime Young Adult')).reduce((s, r) => s + (r.amount || 0), 0);
      const points       = filteredRewards.filter(r => r.currency === 'points').reduce((s, r) => s + (r.amount || 0), 0);
      const accountingProfit = saleRevenue - totalCost + cashback;
      const netProfit    = profitMode === 'cashback_wallet' ? accountingProfit - yaCashback : accountingProfit;
      const avgRoi       = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
      const inStockUnits = inventoryItems.filter(i => i.status === 'in_stock' || i.status === 'received').reduce((s, i) => s + (i.quantity || 1), 0);
      const giftCardValue= giftCards.filter(gc => gc.status === 'available').reduce((s, gc) => s + parseFloat(gc.value || 0), 0);

      setMetrics({ totalCost, saleRevenue, cashback, points, netProfit, avgRoi, yaCashback, inStockUnits, giftCardValue });

      const now = new Date();
      const trend = [];
      for (let i = 5; i >= 0; i--) {
        const md = subMonths(now, i);
        const mStart = startOfMonth(md); const mEnd = endOfMonth(md);
        const mOrders  = filteredOrders.filter(o => { const d = o.order_date ? parseISO(o.order_date) : null; return d && d >= mStart && d <= mEnd; });
        const mRewards = filteredRewards.filter(r => { const d = r.date_earned ? parseISO(r.date_earned) : null; return d && d >= mStart && d <= mEnd; });
        const spent    = mOrders.reduce((s, o) => s + parseFloat(o.total_cost || 0), 0);
        const revenue  = mOrders.reduce((sum, o) => sum + (o.sale_events || []).reduce((s, ev) => s + (ev.items || []).reduce((is, item) => is + (parseFloat(item.sale_price) || 0) * (parseInt(item.quantity) || 1), 0), 0), 0);
        const cashbackM= mRewards.filter(r => r.currency === 'USD').reduce((s, r) => s + (r.amount || 0), 0);
        trend.push({ month: format(md, 'MMM'), spent, revenue, profit: revenue - spent, cashback: cashbackM });
      }
      setTrendData(trend);

      const statusCounts = {};
      filteredOrders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
      setByStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));

      const cardMap = {};
      filteredOrders.forEach(o => {
        if (o.credit_card_id) {
          if (!cardMap[o.credit_card_id]) { const c = creditCards.find(c => c.id === o.credit_card_id); cardMap[o.credit_card_id] = { name: c?.card_name || o.card_name || 'Unknown', spent: 0, orders: 0 }; }
          cardMap[o.credit_card_id].spent += (o.final_cost || o.total_cost || 0);
          cardMap[o.credit_card_id].orders += 1;
        }
      });
      setTopCards(Object.values(cardMap).sort((a, b) => b.spent - a.spent).slice(0, 5));

      const today = new Date().toISOString().slice(0, 10);
      setAlerts({
        overdueInvoices: invoices.filter(inv => inv.status === 'overdue' || (inv.status === 'sent' && inv.due_date && inv.due_date < today)).length,
        damagedItems:    damagedItems.filter(d => d.status === 'reported' || d.status === 'assessed').length,
        inTransit:       shipmentsData.filter(s => !s.delivered_date && s.status && !s.status.toLowerCase().includes('delivered')).length,
      });
      setShipments(shipmentsData.filter(s => !s.delivered_date).sort((a, b) => new Date(a.estimated_delivery || '9999') - new Date(b.estimated_delivery || '9999')).slice(0, 4));
      setActivityLogs([...activityData].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)).slice(0, 15));
      setLastRefreshed(new Date());
    } catch (e) { console.error(e); }
    finally { if (!silent) setLoading(false); }
  };

  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
  const firstName      = user?.full_name?.split(' ')[0] || 'there';
  const filteredOrders = filterByTime(filterByMode(allOrders), 'order_date');
  const sortedRecent   = [...filteredOrders].sort((a, b) => new Date(b.order_date || b.created_date) - new Date(a.order_date || a.created_date)).slice(0, 10);
  const statusCounts   = {};
  filteredOrders.forEach(o => { if (o.status) statusCounts[o.status.toLowerCase()] = (statusCounts[o.status.toLowerCase()] || 0) + 1; });

  const activeAlerts = [
    alerts.overdueInvoices > 0 && { icon: FileWarning, color: 'var(--crimson)', bg: 'var(--crimson-bg)', border: 'var(--crimson-bdr)', title: `${alerts.overdueInvoices} Overdue Invoice${alerts.overdueInvoices > 1 ? 's' : ''}`, value: 'Action required', onClick: () => navigate('/Invoices') },
    alerts.damagedItems > 0    && { icon: AlertTriangle, color: 'var(--gold)',    bg: 'var(--gold-bg)',    border: 'var(--gold-border)', title: `${alerts.damagedItems} Damaged Item${alerts.damagedItems > 1 ? 's' : ''}`, value: 'Needs assessment', onClick: () => navigate('/Inventory') },
    alerts.inTransit > 0       && { icon: Truck,         color: 'var(--ocean)',   bg: 'var(--ocean-bg)',  border: 'var(--ocean-bdr)',   title: `${alerts.inTransit} Shipment${alerts.inTransit > 1 ? 's' : ''} In Transit`, value: 'Packages on the way', onClick: () => navigate('/Transactions') },
  ].filter(Boolean);

  const BTN_FILTER = (active) => ({
    padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: active ? 700 : 600, cursor: 'pointer', border: 'none',
    background: active ? 'var(--ink)' : 'transparent', color: active ? 'var(--gold)' : 'var(--ink-dim)',
  });

  if (loading) {
    return (
      <div style={{ padding: 28 }}>
        <div style={{ height: 40, marginBottom: 20 }}><Skeleton className="h-full w-64" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-32 rounded-2xl mb-4" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 28px 40px 28px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
            {greeting()}, {firstName}
            {refreshing && <RefreshCw style={{ display: 'inline', width: 16, height: 16, marginLeft: 8, color: 'var(--ink-dim)', verticalAlign: 'middle' }} className="animate-spin" />}
          </h1>
          <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 5, letterSpacing: '0.04em' }}>
            {format(new Date(), "MMMM d, yyyy")}
            {lastRefreshed && ` · Updated ${formatDistanceToNow(lastRefreshed, { addSuffix: true })}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 9, padding: 3, gap: 2 }}>
            {MODE_FILTERS.map(m => <button key={m} onClick={() => setModeFilter(m)} style={BTN_FILTER(modeFilter === m)}>{m}</button>)}
          </div>
          <div style={{ display: 'flex', background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 9, padding: 3, gap: 2 }}>
            {TIME_FILTERS.map(t => <button key={t} onClick={() => setTimeFilter(t)} style={BTN_FILTER(timeFilter === t)}>{t}</button>)}
          </div>
          <button onClick={() => silentRefresh()} disabled={refreshing}
            style={{ padding: '7px 16px', borderRadius: 8, background: 'var(--ink)', color: 'var(--gold)', fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', fontFamily: "'Playfair Display', serif", letterSpacing: '0.04em' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Alerts ── */}
      {activeAlerts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${activeAlerts.length}, 1fr)`, gap: 8, marginBottom: 20 }}>
          {activeAlerts.map((a, i) => <AlertBanner key={i} {...a} />)}
        </div>
      )}

      {/* ── KPI Row 1 ── */}
      <SectionDivider title="Performance" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
        <KpiCard label="Total Cost" value={abbrev(metrics.totalCost)} sub={`${filteredOrders.length} orders`} accentColor="var(--ocean)" valueColor="var(--ocean)" />
        <KpiCard label="Sale Revenue" value={abbrev(metrics.saleRevenue)} sub={`${filteredOrders.filter(o => o.sale_events?.length > 0).length} sold`} accentColor="var(--terrain)" valueColor="var(--terrain)" />
        <KpiCard label="Cashback" value={abbrev(metrics.cashback)} sub={`${metrics.points.toLocaleString()} pts earned`} accentColor="var(--violet)" valueColor="var(--violet)" />
        <KpiCard label={profitMode === 'cashback_wallet' ? 'Wallet Profit' : 'Net Profit'} value={abbrev(metrics.netProfit)} sub={`${metrics.avgRoi.toFixed(1)}% ROI`} accentColor={metrics.netProfit >= 0 ? 'var(--gold)' : 'var(--crimson)'} valueColor={metrics.netProfit >= 0 ? 'var(--gold)' : 'var(--crimson)'} />
      </div>

      {/* ── KPI Row 2 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        <KpiCard label="YA Cashback" value={abbrev(metrics.yaCashback)} sub="Young Adult CB" accentColor="var(--gold2)" valueColor="var(--gold)" />
        <KpiCard label="Avg ROI" value={`${metrics.avgRoi.toFixed(1)}%`} sub="return on investment" accentColor="var(--ocean)" valueColor={metrics.avgRoi >= 0 ? 'var(--ocean)' : 'var(--crimson)'} />
        <KpiCard label="Units In Stock" value={metrics.inStockUnits.toLocaleString()} sub="in_stock + received" accentColor="var(--terrain)" valueColor="var(--terrain)" />
        <KpiCard label="Gift Card Value" value={abbrev(metrics.giftCardValue)} sub="available cards" accentColor="var(--rose)" valueColor="var(--rose)" />
      </div>

      {/* ── Profit Breakdown ── */}
      <div style={{ borderRadius: 14, background: 'var(--parch-card)', border: '1px solid var(--parch-line)', marginBottom: 20, overflow: 'hidden' }}>
        <button onClick={() => setShowProfitDetails(p => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--parch-warm)', borderBottom: showProfitDetails ? '1px solid var(--parch-line)' : 'none', cursor: 'pointer', border: 'none' }}>
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
              { label: 'Revenue',    value: abbrev(metrics.saleRevenue), color: 'var(--terrain)',  bg: 'var(--terrain-bg)', border: 'var(--terrain-bdr)', prefix: '' },
              { label: 'Card Spend', value: abbrev(metrics.totalCost),   color: 'var(--crimson)',  bg: 'var(--crimson-bg)', border: 'var(--crimson-bdr)', prefix: '−' },
              { label: 'Cashback',   value: abbrev(metrics.cashback),    color: 'var(--violet)',   bg: 'var(--violet-bg)',  border: 'var(--violet-bdr)',  prefix: '+' },
              { label: 'Net Profit', value: abbrev(metrics.netProfit),   color: metrics.netProfit >= 0 ? 'var(--gold)' : 'var(--crimson)', bg: metrics.netProfit >= 0 ? 'var(--gold-bg)' : 'var(--crimson-bg)', border: metrics.netProfit >= 0 ? 'var(--gold-border)' : 'var(--crimson-bdr)', prefix: '' },
            ].map(b => (
              <div key={b.label} style={{ borderRadius: 10, padding: 12, background: b.bg, border: `1px solid ${b.border}` }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: b.color, marginBottom: 4 }}>{b.label}</p>
                <p style={{ fontSize: 22, fontWeight: 600, color: b.color, lineHeight: 1, fontFamily: "'Cinzel', serif" }}>{b.prefix}{b.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Goal Tracker ── */}
      <SectionDivider title="Expedition Goals" dotColor="var(--terrain2)" lineColor="rgba(45,90,39,0.25)" />
      <div style={{ marginBottom: 20 }}>
        <GoalTracker metrics={metrics} />
      </div>

      {/* ── Pipeline ── */}
      <SectionDivider title="Route Map" dotColor="var(--ocean2)" lineColor="rgba(26,82,118,0.25)" />
      <div style={{ borderRadius: 14, padding: 18, background: 'var(--parch-card)', border: '1px solid var(--parch-line)', marginBottom: 20 }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 14 }}>Order Pipeline · {filteredOrders.length} Total</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 6, position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(184,134,11,0.2) 10%, rgba(184,134,11,0.2) 90%, transparent)', pointerEvents: 'none' }} />
          {Object.keys(STATUS_CONFIG).map(status => (
            <PipelineCard key={status} status={status} count={statusCounts[status] || 0} onClick={() => navigate(`/Transactions?status=${status}`)} />
          ))}
        </div>
      </div>

      {/* ── Charts ── */}
      <SectionDivider title="Cartographic Trends" />
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ borderRadius: 14, padding: 18, background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>Profit & Revenue — 6 Expeditions</p>
            <span style={{ fontSize: 8, background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', padding: '2px 8px', borderRadius: 99, color: 'var(--gold)', fontWeight: 700 }}>Monthly</span>
          </div>
          {trendData.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-dim)', fontSize: 13 }}>No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#b8860b" stopOpacity={0.2}/><stop offset="95%" stopColor="#b8860b" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gProfit"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2d5a27" stopOpacity={0.2}/><stop offset="95%" stopColor="#2d5a27" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gSpent"   x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1a5276" stopOpacity={0.15}/><stop offset="95%" stopColor="#1a5276" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gCash"    x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#5b2c6f" stopOpacity={0.2}/><stop offset="95%" stopColor="#5b2c6f" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--ink-ghost)', fontFamily: "'Playfair Display',serif" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--ink-ghost)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue"  stroke="#b8860b" fill="url(#gRevenue)"  strokeWidth={2} name="Revenue"  dot={{ r: 3, fill: '#b8860b' }} />
                <Area type="monotone" dataKey="profit"   stroke="#2d5a27" fill="url(#gProfit)"   strokeWidth={2} name="Profit"   dot={{ r: 3, fill: '#2d5a27' }} />
                <Area type="monotone" dataKey="spent"    stroke="#1a5276" fill="url(#gSpent)"    strokeWidth={2} name="Spent"    dot={{ r: 3, fill: '#1a5276' }} />
                <Area type="monotone" dataKey="cashback" stroke="#5b2c6f" fill="url(#gCash)"     strokeWidth={2} name="Cashback" dot={{ r: 3, fill: '#5b2c6f' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            {[['#b8860b','Revenue'],['#2d5a27','Profit'],['#1a5276','Spent'],['#5b2c6f','Cashback']].map(([color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--ink-faded)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ borderRadius: 14, padding: 18, background: 'var(--parch-card)', border: '1px solid var(--parch-line)', flex: 1 }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 14 }}>By Status</p>
            {byStatusData.length === 0 ? <p style={{ fontSize: 12, color: 'var(--ink-dim)' }}>No data</p> : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ResponsiveContainer width={72} height={72}>
                  <PieChart>
                    <Pie data={byStatusData} cx="50%" cy="50%" innerRadius={20} outerRadius={34} paddingAngle={3} dataKey="value">
                      {byStatusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {byStatusData.slice(0, 5).map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block' }} />
                        <span style={{ color: 'var(--ink-faded)', textTransform: 'capitalize', fontSize: 9 }}>{d.name?.replace(/_/g,' ')}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div style={{ borderRadius: 14, padding: 18, background: 'var(--parch-card)', border: '1px solid var(--parch-line)', flex: 1 }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 14 }}>Top Cards</p>
            {topCards.length === 0 ? <p style={{ fontSize: 12, color: 'var(--ink-dim)' }}>No data</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topCards.map((card, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: 'var(--gold)', fontFamily: "'Playfair Display',serif" }}>
                        {card.name.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>{card.name}</p>
                        <p style={{ fontSize: 9, color: 'var(--ink-dim)' }}>{card.orders} txns</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)' }}>{abbrev(card.spent)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Activity + Shipments ── */}
      <SectionDivider title="Live Dispatch" dotColor="var(--ocean2)" lineColor="rgba(26,82,118,0.25)" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--parch-line)', background: 'var(--parch-warm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'Playfair Display', serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>
              <Activity style={{ width: 12, height: 12, color: 'var(--gold)' }} /> Field Log
            </div>
            <span style={{ fontSize: 9, background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', color: 'var(--gold)', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>● Live</span>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {activityLogs.length === 0
              ? <p style={{ padding: 24, textAlign: 'center', color: 'var(--ink-dim)', fontSize: 12 }}>No recent activity</p>
              : activityLogs.map((log, i) => <ActivityItem key={log.id || i} log={log} />)}
          </div>
        </div>

        <div style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--parch-line)', background: 'var(--parch-warm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'Playfair Display', serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>
              <Truck style={{ width: 12, height: 12, color: 'var(--ocean)' }} /> Vessels In Transit
            </div>
            {alerts.inTransit > 0 && <span style={{ fontSize: 9, background: 'var(--ocean-bg)', border: '1px solid var(--ocean-bdr)', color: 'var(--ocean)', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>{alerts.inTransit} active</span>}
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {shipments.length === 0
              ? <p style={{ padding: 24, textAlign: 'center', color: 'var(--ink-dim)', fontSize: 12 }}>No shipments in transit</p>
              : shipments.map((s, i) => (
                <div key={s.id || i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--parch-line)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: 'var(--ink)' }}>{s.tracking_number}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--gold-bg)', color: 'var(--gold)', border: '1px solid var(--gold-border)' }}>{s.carrier || 'Unknown'}</span>
                  </div>
                  {s.latest_event && <p style={{ fontSize: 10, color: 'var(--ink-faded)' }}>{s.latest_event}</p>}
                  {s.current_location && <p style={{ fontSize: 10, color: 'var(--ink-dim)' }}>📍 {s.current_location}</p>}
                  {s.estimated_delivery && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ height: 4, borderRadius: 99, background: 'var(--parch-warm)', overflow: 'hidden', flex: 1, marginRight: 10 }}>
                        <div style={{ width: '60%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #8b6914, #b8860b, #d4a017)' }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', whiteSpace: 'nowrap' }}>{s.estimated_delivery}</span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ── Transactions Table ── */}
      <SectionDivider title="Recent Expeditions" dotColor="var(--terrain2)" lineColor="rgba(45,90,39,0.25)" />
      <div style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
        <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--parch-line)', background: 'var(--parch-warm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>
            Recent Transactions
          </div>
          <button onClick={() => navigate('/Transactions')} style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.04em' }}>View all →</button>
        </div>
        {sortedRecent.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--ink-dim)', fontSize: 12 }}>No transactions in this range.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--parch-warm)' }}>
                  {['', 'Product', 'Retailer', 'Cost', 'Cashback', 'Profit', 'Status', 'Date'].map((h, i) => (
                    <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-dim)', fontFamily: "'Playfair Display', serif", whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRecent.map((order, i) => {
                  const cost         = order.final_cost || order.total_cost || 0;
                  const cashbackAmt  = parseFloat(order.cashback_amount || 0);
                  const orderProfit  = (() => {
                    const events = order.sale_events || []; if (!events.length) return null;
                    const revenue = events.reduce((s, ev) => s + (ev.items || []).reduce((is, item) => is + (parseFloat(item.sale_price) || 0) * (parseInt(item.quantity) || 1), 0), 0);
                    return revenue - parseFloat(order.total_cost || order.final_cost || 0) + parseFloat(order.cashback_amount || 0);
                  })();
                  const statusKey = order.status?.toLowerCase();
                  const scfg      = STATUS_CONFIG[statusKey];
                  const productName = order.product_name || order.items?.[0]?.product_name || '—';
                  const imageUrl    = order.image_url || order.product_image_url || order.items?.[0]?.image_url || null;
                  return (
                    <tr key={order.id || i} style={{ borderTop: '1px solid var(--parch-line)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(184,134,11,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 14px' }}>
                        <div onClick={() => imageUrl && setModalImage({ src: imageUrl, alt: productName })}
                          style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: imageUrl ? 'pointer' : 'default', overflow: 'hidden' }}>
                          {imageUrl ? <img src={imageUrl} alt={productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageOff style={{ width: 14, height: 14, color: 'var(--ink-ghost)' }} />}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)', maxWidth: 160 }}><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{productName}</span></td>
                      <td style={{ padding: '12px 14px', color: 'var(--ink-faded)', fontSize: 12, whiteSpace: 'nowrap' }}>{order.retailer || '—'}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ocean)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmt(cost)}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--violet)', fontSize: 12, whiteSpace: 'nowrap' }}>{cashbackAmt > 0 ? fmt(cashbackAmt) : '—'}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap', color: orderProfit === null ? 'var(--ink-ghost)' : orderProfit >= 0 ? 'var(--gold)' : 'var(--crimson)' }}>
                        {orderProfit === null ? '—' : `${orderProfit >= 0 ? '+' : ''}${fmt(orderProfit)}`}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {scfg ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 99, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', background: scfg.bg, color: scfg.color, border: `1px solid ${scfg.border}`, whiteSpace: 'nowrap' }}>
                            {scfg.label}
                          </span>
                        ) : <span style={{ fontSize: 11, color: 'var(--ink-dim)', textTransform: 'capitalize' }}>{order.status || '—'}</span>}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 11, color: 'var(--ink-ghost)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {order.order_date ? format(parseISO(order.order_date), 'MMM d') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {modalImage && (
        <div onClick={() => setModalImage(null)} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,22,18,0.6)' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: 480, width: '100%', margin: '0 16px' }}>
            <button onClick={() => setModalImage(null)} style={{ position: 'absolute', top: -12, right: -12, zIndex: 10, width: 28, height: 28, borderRadius: '50%', background: 'var(--parch-card)', border: '1px solid var(--parch-line)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ width: 14, height: 14, color: 'var(--ink)' }} />
            </button>
            <img src={modalImage.src} alt={modalImage.alt} style={{ width: '100%', borderRadius: 16, boxShadow: '0 24px 60px rgba(0,0,0,0.3)', objectFit: 'contain', maxHeight: '80vh', background: 'white' }} />
          </div>
        </div>
      )}
    </div>
  );
}