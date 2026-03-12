import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Download, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  format, subMonths, startOfMonth, endOfMonth, parseISO,
  startOfQuarter, endOfQuarter, startOfYear, endOfYear
} from 'date-fns';
import AnalyticsMetricCards from '@/components/analytics/AnalyticsMetricCards';
import RevenueProfitTrend from '@/components/analytics/RevenueProfitTrend';
import ExpenseBreakdown from '@/components/analytics/ExpenseBreakdown';
import CumulativeProfit from '@/components/analytics/CumulativeProfit';
import PeriodPnL from '@/components/analytics/PeriodPnL';

const TYPE_FILTERS = ['All', 'Churning', 'Marketplace'];
const PERIOD_FILTERS = ['Monthly', 'Quarterly', 'Yearly'];
const TABS = ['Overview', 'Breakdowns', 'Payments', 'Detail Tables'];

function getPeriodBuckets(period, orders, invoices, rewards) {
  const now = new Date();
  let buckets = [];

  if (period === 'Monthly') {
    buckets = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i);
      return { label: format(d, 'MMM'), start: startOfMonth(d), end: endOfMonth(d) };
    });
  } else if (period === 'Quarterly') {
    buckets = Array.from({ length: 4 }, (_, i) => {
      const d = subMonths(now, (3 - i) * 3);
      return { label: `Q${Math.ceil((d.getMonth() + 1) / 3)} ${format(d, 'yy')}`, start: startOfQuarter(d), end: endOfQuarter(d) };
    });
  } else {
    buckets = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now.getFullYear() - (2 - i), 0, 1);
      return { label: format(d, 'yyyy'), start: startOfYear(d), end: endOfYear(d) };
    });
  }

  const paidInvoices = invoices.filter(i => i.status === 'paid');

  return buckets.map(({ label, start, end }) => {
    const bOrders = orders.filter(o => { const d = o.order_date ? parseISO(o.order_date) : null; return d && d >= start && d <= end; });
    const bInvoices = paidInvoices.filter(i => { const d = i.invoice_date ? parseISO(i.invoice_date) : null; return d && d >= start && d <= end; });
    const bRewards = rewards.filter(r => { const d = r.date_earned ? parseISO(r.date_earned) : null; return d && d >= start && d <= end; });
    const cost = bOrders.reduce((s, o) => s + (o.final_cost || o.total_cost || 0), 0);
    const revenue = bInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const cashback = bRewards.filter(r => r.currency === 'USD').reduce((s, r) => s + (r.amount || 0), 0);
    const commission = bInvoices.reduce((s, i) => s + ((i.items || []).reduce((ss, it) => ss + ((it.unit_price - it.unit_cost) * it.quantity || 0), 0)), 0);
    const profit = revenue - cost;
    return { month: label, revenue, cost, profit, cashback, commission };
  });
}

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [allOrders, setAllOrders] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [allRewards, setAllRewards] = useState([]);
  const [typeFilter, setTypeFilter] = useState('All');
  const [period, setPeriod] = useState('Monthly');
  const [activeTab, setActiveTab] = useState('Overview');
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 6), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orders, invoices, rewards] = await Promise.all([
        base44.entities.PurchaseOrder.list(),
        base44.entities.Invoice.list(),
        base44.entities.Reward.list(),
      ]);
      setAllOrders(orders);
      setAllInvoices(invoices);
      setAllRewards(rewards);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    let orders = allOrders;
    if (typeFilter === 'Churning') orders = orders.filter(o => o.is_pickup);
    if (typeFilter === 'Marketplace') orders = orders.filter(o => o.is_dropship);
    return orders.filter(o => {
      if (!o.order_date) return true;
      return o.order_date >= dateFrom && o.order_date <= dateTo;
    });
  }, [allOrders, typeFilter, dateFrom, dateTo]);

  const filteredInvoices = useMemo(() => {
    return allInvoices.filter(i => {
      if (!i.invoice_date) return true;
      return i.invoice_date >= dateFrom && i.invoice_date <= dateTo;
    });
  }, [allInvoices, dateFrom, dateTo]);

  const metrics = useMemo(() => {
    const paidInvoices = filteredInvoices.filter(i => i.status === 'paid');
    const revenue = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
    const cost = filteredOrders.reduce((s, o) => s + (o.final_cost || o.total_cost || 0), 0);
    const cashback = allRewards.filter(r => r.currency === 'USD').reduce((s, r) => s + (r.amount || 0), 0);
    const commission = 0; // extend if commission entity exists
    const profit = revenue - cost - commission;
    const roi = cost > 0 ? (profit / cost) * 100 : 0;

    const storeCounts = {};
    filteredOrders.forEach(o => { if (o.retailer) storeCounts[o.retailer] = (storeCounts[o.retailer] || 0) + 1; });
    const topStore = Object.entries(storeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const storeCount = Object.keys(storeCounts).length;

    return { revenue, cost, profit, roi, cashback, commission, topStore, storeCount };
  }, [filteredOrders, filteredInvoices, allRewards]);

  const trendData = useMemo(() => {
    return getPeriodBuckets(period, filteredOrders, filteredInvoices, allRewards);
  }, [period, filteredOrders, filteredInvoices, allRewards]);

  const expenseData = useMemo(() => {
    return [{ name: 'COGS', value: metrics.cost }];
  }, [metrics]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Analytics &amp; Insights</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Combined overview</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {TYPE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                typeFilter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground bg-card'
              }`}
            >
              {f}
            </button>
          ))}
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export All
          </Button>
          <Button size="sm" className="text-xs gap-1.5 bg-primary hover:bg-primary/90" onClick={loadData}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-card border border-border">
        {/* Period toggle */}
        <div className="flex rounded-lg overflow-hidden border border-border">
          {PERIOD_FILTERS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-secondary border border-border text-foreground text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-secondary border border-border text-foreground text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Metric Cards */}
      <AnalyticsMetricCards metrics={metrics} trendData={trendData} />

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RevenueProfitTrend data={trendData} />
          <ExpenseBreakdown data={expenseData} />
          <CumulativeProfit data={trendData} />
          <PeriodPnL data={trendData} />
        </div>
      )}

      {/* Placeholder tabs */}
      {activeTab !== 'Overview' && (
        <div className="flex items-center justify-center h-48 rounded-xl border border-border bg-card text-muted-foreground text-sm">
          {activeTab} — coming soon
        </div>
      )}
    </div>
  );
}