import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, CreditCard, Percent, Star } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, subDays, startOfYear } from 'date-fns';
import MetricCard from '@/components/dashboard/MetricCard';
import StatusPipeline from '@/components/dashboard/StatusPipeline';
import ProfitRevenueChart from '@/components/dashboard/ProfitRevenueChart';
import ByStatusChart from '@/components/dashboard/ByStatusChart';
import TopCards from '@/components/dashboard/TopCards';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import GoalTracker from '@/components/dashboard/GoalTracker';

const TIME_FILTERS = ['Today', '7 Days', '30 Days', 'YTD', 'All Time'];
const MODE_FILTERS = ['All', 'Churning', 'Resell'];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [metrics, setMetrics] = useState({ totalCost: 0, saleRevenue: 0, cashback: 0, points: 0, netProfit: 0, avgRoi: 0 });
  const [trendData, setTrendData] = useState([]);
  const [byStatusData, setByStatusData] = useState([]);
  const [topCards, setTopCards] = useState([]);
  const [timeFilter, setTimeFilter] = useState('30 Days');
  const [modeFilter, setModeFilter] = useState('All');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) loadData();
  }, [timeFilter, modeFilter]);

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
      const cashback = filteredRewards.filter(r => r.currency === 'USD').reduce((s, r) => s + (r.amount || 0), 0);
      const points = filteredRewards.filter(r => r.currency === 'points').reduce((s, r) => s + (r.amount || 0), 0);
      const netProfit = saleRevenue - totalCost;
      const avgRoi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

      setMetrics({ totalCost, saleRevenue, cashback, points, netProfit, avgRoi });

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
      filteredOrders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
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
  const sortedRecent = [...filteredOrders].sort((a, b) =>
    new Date(b.order_date || b.created_date) - new Date(a.order_date || a.created_date)
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{greeting()}, {firstName} 👋</h1>
          <p className="text-sm text-slate-500 mt-0.5">Here's what's happening across your accounts.</p>
        </div>

        {/* Filters + Points badge */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode tabs */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {MODE_FILTERS.map(mode => (
              <button key={mode} onClick={() => setModeFilter(mode)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  modeFilter === mode ? 'bg-purple-600 text-white shadow' : 'text-slate-500 hover:bg-slate-100'
                }`}>
                {mode}
              </button>
            ))}
          </div>

          {/* Time tabs */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {TIME_FILTERS.map(time => (
              <button key={time} onClick={() => setTimeFilter(time)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  timeFilter === time ? 'bg-purple-600 text-white shadow' : 'text-slate-500 hover:bg-slate-100'
                }`}>
                {time}
              </button>
            ))}
          </div>

          {/* Points badge */}
          {metrics.points > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl text-sm font-semibold shadow-sm">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {metrics.points.toLocaleString()} pts
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Total Cost"
          value={`$${metrics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`${filteredOrders.length} orders`}
          color="blue"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          label="Sale Revenue"
          value={`$${metrics.saleRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="from paid invoices"
          color="green"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          label="Cashback + Points"
          value={`$${metrics.cashback.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`${metrics.points.toLocaleString()} points earned`}
          color="pink"
          icon={<CreditCard className="h-4 w-4" />}
        />
        <MetricCard
          label="Net Profit"
          value={`$${metrics.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={metrics.netProfit >= 0 ? 'profitable' : 'loss'}
          color={metrics.netProfit >= 0 ? 'green' : 'red'}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg ROI"
          value={`${metrics.avgRoi.toFixed(2)}%`}
          sub="return on investment"
          color="purple"
          icon={<Percent className="h-4 w-4" />}
        />
      </div>

      {/* Goal Tracker */}
      <GoalTracker metrics={metrics} />

      {/* Status Pipeline */}
      <StatusPipeline orders={filteredOrders} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ProfitRevenueChart data={trendData} />
        </div>
        <div className="space-y-4">
          <ByStatusChart data={byStatusData} />
          <TopCards cards={topCards} />
        </div>
      </div>

      {/* Recent Transactions */}
      <RecentTransactions orders={sortedRecent} />
    </div>
  );
}