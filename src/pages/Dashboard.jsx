import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, Percent, ShoppingCart, Tag } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, startOfYear, isAfter, subDays } from 'date-fns';
import StatusPipeline from '@/components/dashboard/StatusPipeline';
import ProfitRevenueChart from '@/components/dashboard/ProfitRevenueChart';
import ByStatusChart from '@/components/dashboard/ByStatusChart';
import GoalTracker from '@/components/dashboard/GoalTracker';

const TIME_FILTERS = ['Today', '7 Days', '30 Days', 'YTD', 'All Time'];
const TYPE_FILTERS = ['All', 'Churning', 'Resell'];
const GOALS_KEY = 'dd_goals';

function filterByDate(orders, filter) {
  const now = new Date();
  if (filter === 'All Time') return orders;
  if (filter === 'Today') {
    const today = format(now, 'yyyy-MM-dd');
    return orders.filter(o => o.order_date === today);
  }
  if (filter === '7 Days') return orders.filter(o => o.order_date && isAfter(parseISO(o.order_date), subDays(now, 7)));
  if (filter === '30 Days') return orders.filter(o => o.order_date && isAfter(parseISO(o.order_date), subDays(now, 30)));
  if (filter === 'YTD') return orders.filter(o => o.order_date && isAfter(parseISO(o.order_date), startOfYear(now)));
  return orders;
}

const metricDefs = [
  {
    key: 'totalCost',
    label: 'Total Cost',
    format: v => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    color: '#22d3ee',
    Icon: ShoppingCart,
    sub: orders => `${orders.length} transaction${orders.length !== 1 ? 's' : ''}`,
  },
  {
    key: 'saleRevenue',
    label: 'Sale Revenue',
    format: v => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    color: '#4ade80',
    Icon: DollarSign,
    sub: () => 'from paid invoices',
  },
  {
    key: 'cashback',
    label: 'Cashback',
    format: v => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    color: '#f472b6',
    Icon: Tag,
    sub: (_, m) => `${((m.cashback / (m.totalCost || 1)) * 100).toFixed(1)}% avg rate`,
  },
  {
    key: 'netProfit',
    label: 'Net Profit',
    format: v => `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    color: '#4ade80',
    Icon: TrendingUp,
    sub: (_, m) => m.netProfit >= 0 ? 'profitable' : 'loss',
  },
  {
    key: 'avgRoi',
    label: 'Avg ROI',
    format: v => `${v.toFixed(2)}%`,
    color: '#e2e8f0',
    Icon: Percent,
    sub: () => 'return on investment',
  },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [allRewards, setAllRewards] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [timeFilter, setTimeFilter] = useState('30 Days');
  const [typeFilter, setTypeFilter] = useState('All');
  const [goals, setGoals] = useState({});

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    try { setGoals(JSON.parse(localStorage.getItem(GOALS_KEY)) || {}); } catch {}
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [orders, rewards, invoices] = await Promise.all([
        base44.entities.PurchaseOrder.list(),
        base44.entities.Reward.list(),
        base44.entities.Invoice.list(),
      ]);
      setAllOrders(orders);
      setAllRewards(rewards);
      setAllInvoices(invoices);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    let orders = filterByDate(allOrders, timeFilter);
    if (typeFilter === 'Churning') orders = orders.filter(o => o.is_pickup);
    if (typeFilter === 'Resell') orders = orders.filter(o => !o.is_pickup);
    return orders;
  }, [allOrders, timeFilter, typeFilter]);

  const metrics = useMemo(() => {
    const totalCost = filteredOrders.reduce((s, o) => s + (o.final_cost || o.total_cost || 0), 0);
    const paidInvoices = allInvoices.filter(i => i.status === 'paid');
    const saleRevenue = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const cashback = allRewards.filter(r => r.currency === 'USD').reduce((s, r) => s + (r.amount || 0), 0);
    const netProfit = saleRevenue - totalCost;
    const avgRoi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
    return { totalCost, saleRevenue, cashback, netProfit, avgRoi };
  }, [filteredOrders, allInvoices, allRewards]);

  const trendData = useMemo(() => {
    const now = new Date();
    const paidInvoices = allInvoices.filter(i => i.status === 'paid');
    return Array.from({ length: 6 }, (_, i) => {
      const md = subMonths(now, 5 - i);
      const mStart = startOfMonth(md);
      const mEnd = endOfMonth(md);
      const mOrders = allOrders.filter(o => { const d = o.order_date ? parseISO(o.order_date) : null; return d && d >= mStart && d <= mEnd; });
      const mInvoices = paidInvoices.filter(inv => { const d = inv.invoice_date ? parseISO(inv.invoice_date) : null; return d && d >= mStart && d <= mEnd; });
      const spent = mOrders.reduce((s, o) => s + (o.final_cost || o.total_cost || 0), 0);
      const revenue = mInvoices.reduce((s, inv) => s + (inv.total || 0), 0);
      return { month: format(md, 'MMM'), spent, revenue, profit: revenue - spent };
    });
  }, [allOrders, allInvoices]);

  const byStatusData = useMemo(() => {
    const counts = {};
    filteredOrders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  const firstName = user?.full_name?.split(' ')[0] || 'there';

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-16 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header + Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {firstName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here's how your numbers are looking.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Type filters */}
          <div className="flex rounded-xl overflow-hidden border border-border bg-card">
            {TYPE_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  typeFilter === f ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'All' && '⚡ '}{f === 'Churning' && '♻️ '}{f === 'Resell' && '🏷️ '}{f}
              </button>
            ))}
          </div>

          {/* Time filters */}
          <div className="flex rounded-xl overflow-hidden border border-border bg-card">
            {TIME_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {metricDefs.map(({ key, label, format: fmt, color, Icon, sub }) => (
          <div
            key={key}
            className="rounded-2xl border bg-card p-5 flex flex-col gap-3"
            style={{ borderColor: `${color}33` }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{label}</p>
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${color}22`, color }}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color }}>{fmt(metrics[key])}</p>
            <p className="text-xs text-muted-foreground">{sub(filteredOrders, metrics)}</p>
          </div>
        ))}
      </div>

      {/* Goal Tracker */}
      <GoalTracker goals={goals} metrics={metrics} />

      {/* Status Pipeline */}
      <StatusPipeline orders={filteredOrders} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ProfitRevenueChart data={trendData} />
        </div>
        <div>
          <ByStatusChart data={byStatusData} />
        </div>
      </div>
    </div>
  );
}