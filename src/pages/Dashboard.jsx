import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, CreditCard, Percent, Target } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import MetricCard from '@/components/dashboard/MetricCard';
import StatusPipeline from '@/components/dashboard/StatusPipeline';
import ProfitRevenueChart from '@/components/dashboard/ProfitRevenueChart';
import ByStatusChart from '@/components/dashboard/ByStatusChart';
import TopCards from '@/components/dashboard/TopCards';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import GoalTracker from '@/components/dashboard/GoalTracker';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [metrics, setMetrics] = useState({ totalCost: 0, saleRevenue: 0, cashback: 0, netProfit: 0, avgRoi: 0 });
  const [trendData, setTrendData] = useState([]);
  const [byStatusData, setByStatusData] = useState([]);
  const [topCards, setTopCards] = useState([]);
  const [timeFilter, setTimeFilter] = useState('30Days');
  const [modeFilter, setModeFilter] = useState('All');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [orders, rewards, invoices, creditCards] = await Promise.all([
        base44.entities.PurchaseOrder.list(),
        base44.entities.Reward.list(),
        base44.entities.Invoice.list(),
        base44.entities.CreditCard.list(),
      ]);

      setAllOrders(orders);

      const totalCost = orders.reduce((s, o) => s + (o.final_cost || o.total_cost || 0), 0);
      const paidInvoices = invoices.filter(i => i.status === 'paid');
      const saleRevenue = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
      const cashback = rewards.filter(r => r.currency === 'USD').reduce((s, r) => s + (r.amount || 0), 0);
      const netProfit = saleRevenue - totalCost;
      const avgRoi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

      setMetrics({ totalCost, saleRevenue, cashback, netProfit, avgRoi });

      // Trend data last 6 months
      const now = new Date();
      const trend = [];
      for (let i = 5; i >= 0; i--) {
        const md = subMonths(now, i);
        const mStart = startOfMonth(md);
        const mEnd = endOfMonth(md);
        const mOrders = orders.filter(o => {
          const d = o.order_date ? parseISO(o.order_date) : null;
          return d && d >= mStart && d <= mEnd;
        });
        const mInvoices = paidInvoices.filter(inv => {
          const d = inv.invoice_date ? parseISO(inv.invoice_date) : null;
          return d && d >= mStart && d <= mEnd;
        });
        const spent = mOrders.reduce((s, o) => s + (o.final_cost || o.total_cost || 0), 0);
        const revenue = mInvoices.reduce((s, inv) => s + (inv.total || 0), 0);
        const profit = revenue - spent;
        trend.push({ month: format(md, 'MMM'), spent, revenue, profit });
      }
      setTrendData(trend);

      // By status
      const statusCounts = {};
      orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
      setByStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));

      // Top cards
      const cardMap = {};
      orders.forEach(o => {
        if (o.credit_card_id) {
          if (!cardMap[o.credit_card_id]) {
            const card = creditCards.find(c => c.id === o.credit_card_id);
            cardMap[o.credit_card_id] = { name: card?.card_name || o.card_name || 'Unknown', spent: 0, orders: 0 };
          }
          cardMap[o.credit_card_id].spent += (o.final_cost || o.total_cost || 0);
          cardMap[o.credit_card_id].orders += 1;
        }
      });
      const sorted = Object.values(cardMap).sort((a, b) => b.spent - a.spent).slice(0, 5);
      setTopCards(sorted);
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="lg:col-span-2 h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{greeting()}, {firstName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening across your accounts.</p>
        </div>
        
        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3">
          {/* Mode Filter */}
          <div className="flex gap-2">
            {['All', 'Churning', 'Resell'].map(mode => (
              <Button
                key={mode}
                size="sm"
                onClick={() => setModeFilter(mode)}
                className={`rounded-full ${
                  modeFilter === mode
                    ? 'bg-purple-600 text-white'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode}
              </Button>
            ))}
          </div>

          {/* Time Filter */}
          <div className="flex gap-2">
            {['Today', '7 Days', '30 Days', 'YTD', 'All Time'].map(time => (
              <Button
                key={time}
                size="sm"
                onClick={() => setTimeFilter(time)}
                className={`rounded-full ${
                  timeFilter === time
                    ? 'bg-purple-600 text-white'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {time}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Total Cost"
          value={`$${metrics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`${allOrders.length} total orders`}
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
          label="Cashback"
          value={`$${metrics.cashback.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`${((metrics.cashback / (metrics.totalCost || 1)) * 100).toFixed(1)}% avg rate`}
          color="pink"
          icon={<CreditCard className="h-4 w-4" />}
        />
        <MetricCard
          label="Net Profit"
          value={`$${metrics.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={metrics.netProfit >= 0 ? 'profitable' : 'loss'}
          color="teal"
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
      <StatusPipeline orders={allOrders} />

      {/* Charts + Side Panel */}
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
      <RecentTransactions
        orders={[...allOrders].sort((a, b) =>
          new Date(b.order_date || b.created_date) - new Date(a.order_date || a.created_date)
        )}
      />
    </div>
  );
}