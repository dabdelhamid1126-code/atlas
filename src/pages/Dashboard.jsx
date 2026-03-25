import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign, TrendingUp, CreditCard, Percent, Star,
  ChevronDown, ChevronUp, Info, ShoppingBag, Send,
  Package, CheckCircle, ListChecks
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, subMonths,
  parseISO, subDays, startOfYear
} from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import GoalTracker from '@/components/dashboard/GoalTracker';

const TIME_FILTERS = ['Today', '7 Days', '30 Days', 'YTD', 'All Time'];
const MODE_FILTERS = ['All', 'Churning', 'Resell'];

const STATUS_CONFIG = {
  purchased:  { label: 'Purchased',  icon: ShoppingBag,  color: 'text-blue-500',    bg: 'bg-blue-50',    border: 'border-blue-100'    },
  shipped:    { label: 'Shipped',    icon: Send,          color: 'text-amber-500',   bg: 'bg-amber-50',   border: 'border-amber-100'   },
  received:   { label: 'Received',   icon: Package,       color: 'text-orange-500',  bg: 'bg-orange-50',  border: 'border-orange-100'  },
  paid:       { label: 'Paid',       icon: CheckCircle,   color: 'text-green-500',   bg: 'bg-green-50',   border: 'border-green-100'   },
  listed:     { label: 'Listed',     icon: ListChecks,    color: 'text-purple-500',  bg: 'bg-purple-50',  border: 'border-purple-100'  },
  sold:       { label: 'Sold',       icon: DollarSign,    color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  completed:  { label: 'Completed',  icon: CheckCircle,   color: 'text-teal-500',    bg: 'bg-teal-50',    border: 'border-teal-100'    },
};

const PIE_COLORS = ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6', '#ef4444'];

function fmt(n) {
  if (n === undefined || n === null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 2
  }).format(n);
}

// ── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, colorClass, iconBg, iconBorder }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
          <p className={`text-2xl font-bold leading-tight ${colorClass}`}>{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} border ${iconBorder}`}>
          <Icon className={`h-4 w-4 ${colorClass}`} />
        </div>
      </div>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ── Pipeline Card ───────────────────────────────────────────────────────────
function PipelineCard({ status, count }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] || {
    label: status, icon: Package,
    color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-100'
  };
  const Icon = cfg.icon;
  return (
    <div className={`bg-white rounded-xl border ${cfg.border} p-3 flex items-center gap-3 shadow-sm`}>
      <div className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`h-5 w-5 ${cfg.color}`} />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{cfg.label}</p>
        <p className={`text-xl font-bold ${cfg.color}`}>{count}</p>
      </div>
    </div>
  );
}

// ── Chart Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500 capitalize">{p.name}:</span>
          <span className="font-semibold text-slate-700">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [metrics, setMetrics] = useState({
    totalCost: 0, saleRevenue: 0, cashback: 0,
    points: 0, netProfit: 0, avgRoi: 0,
    yaCashback: 0, accountingProfit: 0
  });
  const [trendData, setTrendData] = useState([]);
  const [byStatusData, setByStatusData] = useState([]);
  const [topCards, setTopCards] = useState([]);
  const [timeFilter, setTimeFilter] = useState('30 Days');
  const [modeFilter, setModeFilter] = useState('All');
  const [showProfitDetails, setShowProfitDetails] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadData();
  }, []);

  const profitMode = user?.profit_mode || 'accounting';

  useEffect(() => {
    if (!loading) loadData();
  }, [timeFilter, modeFilter, profitMode]);

  const getDateCutoff = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (timeFilter) {
      case 'Today':    return today;
      case '7 Days':   return subDays(today, 7);
      case '30 Days':  return subDays(today, 30);
      case 'YTD':      return startOfYear(now);
      case 'All Time': return new Date(1970, 0, 1);
      default:         return subDays(today, 30);
    }
  };

  const filterByMode = (orders) => {
    if (modeFilter === 'All') return orders;
    if (modeFilter === 'Churning') return orders.filter(o => o.order_type === 'churning');
    if (modeFilter === 'Resell') return orders.filter(o => o.order_type === 'marketplace');
    return orders;
  };

  const filterByTime = (items, dateField) => {
    const cutoff = getDateCutoff();
    return items.filter(item => {
      const d = item[dateField] ? new Date(parseISO(item[dateField])) : null;
      return d && d >= cutoff;
    });
  };

  const loadData = async () => {
    try {
      const [orders, rewards, invoices, creditCards] = await Promise.all([
        base44.entities.PurchaseOrder.list(),
        base44.entities.Reward.list(),
        base44.entities.Invoice.list(),
        base44.entities.CreditCard.list(),
      ]);

      setAllOrders(orders);

      const filteredOrders = filterByTime(filterByMode(orders), 'order_date');
      const paidInvoices = filterByTime(invoices.filter(i => i.status === 'paid'), 'invoice_date');
      const filteredRewards = filterByTime(rewards, 'date_earned');

      const totalCost = filteredOrders.reduce((s, o) => s + (o.final_cost || o.total_cost || 0), 0);
      const saleRevenue = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
      const allCashback = filteredRewards.filter(r => r.currency === 'USD');
      const cashback = allCashback.reduce((s, r) => s + (r.amount || 0), 0);
      const yaCashback = allCashback
        .filter(r => r.notes?.includes('Young Adult') || r.notes?.includes('YACB') || r.notes?.includes('Prime Young Adult'))
        .reduce((s, r) => s + (r.amount || 0), 0);
      const points = filteredRewards.filter(r => r.currency === 'points').reduce((s, r) => s + (r.amount || 0), 0);
      const accountingProfit = saleRevenue - totalCost + cashback;
      const netProfit = profitMode === 'cashback_wallet' ? accountingProfit - yaCashback : accountingProfit;
      const avgRoi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

      setMetrics({ totalCost, saleRevenue, cashback, points, netProfit, avgRoi, yaCashback, accountingProfit });

      // Trend (6 months)
      const now = new Date();
      const trend = [];
      for (let i = 5; i >= 0; i--) {
        const md = subMonths(now, i);
        const mStart = startOfMonth(md);
        const mEnd = endOfMonth(md);
        const mOrders = filteredOrders.filter(o => {
          const d = o.order_date ? parseISO(o.order_date) : null;
          return d && d >= mStart && d <= mEnd;
        });
        const mInvoices = paidInvoices.filter(inv => {
          const d = inv.invoice_date ? parseISO(inv.invoice_date) : null;
          return d && d >= mStart && d <= mEnd;
        });
        const mRewards = filteredRewards.filter(r => {
          const d = r.date_earned ? parseISO(r.date_earned) : null;
          return d && d >= mStart && d <= mEnd;
        });
        const spent = mOrders.reduce((s, o) => s + (o.final_cost || o.total_cost || 0), 0);
        const revenue = mInvoices.reduce((s, inv) => s + (inv.total || 0), 0);
        const cashbackM = mRewards.filter(r => r.currency === 'USD').reduce((s, r) => s + (r.amount || 0), 0);
        trend.push({ month: format(md, 'MMM'), spent, revenue, profit: revenue - spent, cashback: cashbackM });
      }
      setTrendData(trend);

      // By status
      const statusCounts = {};
      filteredOrders.forEach(o => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      });
      setByStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));

      // Top cards
      const cardMap = {};
      filteredOrders.forEach(o => {
        if (o.credit_card_id) {
          if (!cardMap[o.credit_card_id]) {
            const card = creditCards.find(c => c.id === o.credit_card_id);
            cardMap[o.credit_card_id] = { name: card?.card_name || o.card_name || 'Unknown', spent: 0, orders: 0 };
          }
          cardMap[o.credit_card_id].spent += (o.final_cost || o.total_cost || 0);
          cardMap[o.credit_card_id].orders += 1;
        }
      });
      setTopCards(Object.values(cardMap).sort((a, b) => b.spent - a.spent).slice(0, 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const filteredOrders = filterByTime(filterByMode(allOrders), 'order_date');
  const sortedRecent = [...filteredOrders]
    .sort((a, b) => new Date(b.order_date || b.created_date) - new Date(a.order_date || a.created_date))
    .slice(0, 10);

  const statusCounts = {};
  filteredOrders.forEach(o => {
    if (o.status) statusCounts[o.status.toLowerCase()] = (statusCounts[o.status.toLowerCase()] || 0) + 1;
  });

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Here's what's happening across your accounts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {MODE_FILTERS.map(mode => (
              <button key={mode} onClick={() => setModeFilter(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  modeFilter === mode ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                }`}>
                {mode}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {TIME_FILTERS.map(time => (
              <button key={time} onClick={() => setTimeFilter(time)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  timeFilter === time ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                }`}>
                {time}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Cards Row 1 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Total Cost"
          value={fmt(metrics.totalCost)}
          sub={`${filteredOrders.length} orders (incl. tax & shipping)`}
          icon={ShoppingBag}
          colorClass="text-blue-500"
          iconBg="bg-blue-50"
          iconBorder="border-blue-100"
        />
        <KpiCard
          label="Sale Revenue"
          value={fmt(metrics.saleRevenue)}
          sub="from paid invoices"
          icon={TrendingUp}
          colorClass="text-green-500"
          iconBg="bg-green-50"
          iconBorder="border-green-100"
        />
        <KpiCard
          label="Cashback Earned"
          value={fmt(metrics.cashback)}
          sub={`${metrics.points.toLocaleString()} pts`}
          icon={CreditCard}
          colorClass="text-pink-500"
          iconBg="bg-pink-50"
          iconBorder="border-pink-100"
        />
      </div>

      {/* ── KPI Cards Row 2 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="YA Cashback"
          value={fmt(metrics.yaCashback)}
          sub="Young Adult CB"
          icon={Star}
          colorClass="text-teal-500"
          iconBg="bg-teal-50"
          iconBorder="border-teal-100"
        />
        <KpiCard
          label={profitMode === 'cashback_wallet' ? 'Wallet Profit' : 'Net Profit'}
          value={fmt(metrics.netProfit)}
          sub={profitMode === 'cashback_wallet' ? 'excl. YA used' : 'accounting mode'}
          icon={TrendingUp}
          colorClass={metrics.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}
          iconBg={metrics.netProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
          iconBorder={metrics.netProfit >= 0 ? 'border-emerald-100' : 'border-red-100'}
        />
        <KpiCard
          label="Avg ROI"
          value={`${metrics.avgRoi.toFixed(2)}%`}
          sub="return on investment"
          icon={Percent}
          colorClass="text-purple-500"
          iconBg="bg-purple-50"
          iconBorder="border-purple-100"
        />
      </div>

      {/* ── Profit Breakdown ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowProfitDetails(p => !p)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-violet-500" />
            Profit Breakdown
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 capitalize">
              {profitMode === 'cashback_wallet' ? 'Cashback Wallet Mode' : 'Accounting Mode'}
            </span>
          </div>
          {showProfitDetails
            ? <ChevronUp className="h-4 w-4 text-slate-400" />
            : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
        {showProfitDetails && (
          <div className="px-5 pb-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-green-50 border border-green-100 p-3">
              <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wider mb-1">Revenue</p>
              <p className="text-lg font-bold text-green-700">{fmt(metrics.saleRevenue)}</p>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
              <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider mb-1">Card Spend</p>
              <p className="text-lg font-bold text-blue-700">−{fmt(metrics.totalCost)}</p>
            </div>
            <div className="rounded-xl bg-pink-50 border border-pink-100 p-3">
              <p className="text-[10px] text-pink-600 font-semibold uppercase tracking-wider mb-1">Cashback</p>
              <p className="text-lg font-bold text-pink-700">+{fmt(metrics.cashback)}</p>
            </div>
            {profitMode === 'cashback_wallet' && metrics.yaCashback > 0 ? (
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wider mb-1">YA Adjustment</p>
                <p className="text-lg font-bold text-amber-700">−{fmt(metrics.yaCashback)}</p>
                <p className="text-[9px] text-amber-500 mt-0.5">Wallet mode deduction</p>
              </div>
            ) : (
              <div className="rounded-xl bg-violet-50 border border-violet-100 p-3">
                <p className="text-[10px] text-violet-600 font-semibold uppercase tracking-wider mb-1">YA Cashback</p>
                <p className="text-lg font-bold text-violet-700">{fmt(metrics.yaCashback)}</p>
                <p className="text-[9px] text-violet-500 mt-0.5">Included in total</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Goal Tracker ── */}
      <GoalTracker metrics={metrics} />

      {/* ── Status Pipeline ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Status Pipeline</h2>
        {Object.keys(statusCounts).length === 0 ? (
          <p className="text-sm text-slate-400">No orders in this range.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {Object.keys(STATUS_CONFIG).map(status => (
              <PipelineCard key={status} status={status} count={statusCounts[status] || 0} />
            ))}
          </div>
        )}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
            Profit &amp; Revenue Trend (6 Months)
          </h2>
          {trendData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradSpent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCashback" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue"  stroke="#10b981" fill="url(#gradRevenue)"  strokeWidth={2} name="Revenue"  dot={{ r: 3, fill: '#10b981' }} />
                <Area type="monotone" dataKey="profit"   stroke="#8b5cf6" fill="url(#gradProfit)"   strokeWidth={2} name="Profit"   dot={{ r: 3, fill: '#8b5cf6' }} />
                <Area type="monotone" dataKey="spent"    stroke="#3b82f6" fill="url(#gradSpent)"    strokeWidth={2} name="Spent"    dot={{ r: 3, fill: '#3b82f6' }} />
                <Area type="monotone" dataKey="cashback" stroke="#ec4899" fill="url(#gradCashback)" strokeWidth={2} name="Cashback" dot={{ r: 3, fill: '#ec4899' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-3">
            {[['#10b981','Revenue'],['#8b5cf6','Profit'],['#3b82f6','Spent'],['#ec4899','Cashback']].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-xs text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">By Status</h2>
            {byStatusData.length === 0 ? (
              <p className="text-sm text-slate-400">No data</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie data={byStatusData} cx="50%" cy="50%" innerRadius={28} outerRadius={46} paddingAngle={3} dataKey="value">
                      {byStatusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {byStatusData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-slate-500 uppercase text-[10px] font-medium">{d.name}</span>
                      </div>
                      <span className="font-semibold text-slate-700">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Top Cards</h2>
            {topCards.length === 0 ? (
              <p className="text-sm text-slate-400">No card data</p>
            ) : (
              <div className="space-y-3">
                {topCards.map((card, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-3.5 w-3.5 text-violet-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{card.name}</p>
                        <p className="text-[10px] text-slate-400">{card.orders} txns</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-violet-600 flex-shrink-0 ml-2">{fmt(card.spent)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Transactions ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Recent Transactions</h2>
        </div>
        {sortedRecent.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-400 text-center">No transactions in this range.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Product','Platform','Cost','Cashback','Profit','Status','Date'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRecent.map((order, i) => {
                  const cost = order.final_cost || order.total_cost || 0;
                  const cashbackAmt = order.cashback_amount || 0;
                  const profit = order.profit != null ? order.profit : (cashbackAmt - cost);
                  const statusKey = order.status?.toLowerCase();
                  const statusCfg = STATUS_CONFIG[statusKey];
                  return (
                    <tr key={order.id || i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800 max-w-[180px]">
                        <span className="truncate block">{order.product_name || order.retailer || '—'}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{order.retailer || '—'}</td>
                      <td className="px-5 py-3 text-blue-500 font-medium">{fmt(cost)}</td>
                      <td className="px-5 py-3 text-pink-500 font-medium">{fmt(cashbackAmt)}</td>
                      <td className={`px-5 py-3 font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fmt(profit)}
                      </td>
                      <td className="px-5 py-3">
                        {statusCfg ? (
                          <span className={`inline-flex items-center text-[10px] font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.color} border ${statusCfg.border}`}>
                            {statusCfg.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 capitalize">{order.status || '—'}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {order.order_date ? format(parseISO(order.order_date), 'M/d/yyyy') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}