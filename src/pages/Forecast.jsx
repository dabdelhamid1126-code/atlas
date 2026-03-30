import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Calculator, TrendingUp, CreditCard, BarChart2,
  Store, ChevronUp, ChevronDown,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt$ = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v || 0);
const pct = (v) => `${Number(v || 0).toFixed(1)}%`;

const TOOLTIP_STYLE = {
  borderRadius: 12, border: '1px solid #e2e8f0',
  fontSize: 12, background: '#fff', color: '#1e293b',
};

// ── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, color = 'violet', children }) {
  const colors = {
    violet: { icon: 'text-violet-500', bg: 'bg-violet-50', border: 'border-violet-100' },
    emerald: { icon: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    blue: { icon: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
    amber: { icon: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
  };
  const c = colors[color] || colors.violet;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-3 px-5 py-4 border-b border-slate-100 ${c.bg}`}>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-white border ${c.border}`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── 1. PROFIT CALCULATOR ──────────────────────────────────────────────────────

function ProfitCalculator({ creditCards }) {
  const [unitCost, setUnitCost] = useState('');
  const [qty, setQty] = useState('1');
  const [salePrice, setSalePrice] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');

  const totalCost = (parseFloat(unitCost) || 0) * (parseInt(qty) || 1);
  const totalSale = (parseFloat(salePrice) || 0) * (parseInt(qty) || 1);
  const grossProfit = totalSale - totalCost;
  const roi = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;

  const selectedCard = creditCards.find(c => c.id === selectedCardId);
  const cashbackRate = selectedCard?.cashback_rate || 0;
  const cashbackEarned = totalCost * cashbackRate / 100;
  const netProfit = grossProfit + cashbackEarned;

  const isPositive = netProfit >= 0;

  return (
    <SectionCard icon={Calculator} title="Profit Calculator" color="violet">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs text-slate-500 font-medium mb-1 block">Unit Cost</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input type="number" min="0" step="0.01" value={unitCost}
              onChange={e => setUnitCost(e.target.value)} placeholder="0.00"
              className="w-full h-9 pl-6 pr-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white" />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 font-medium mb-1 block">Quantity</label>
          <input type="number" min="1" step="1" value={qty}
            onChange={e => setQty(e.target.value)} placeholder="1"
            className="w-full h-9 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white" />
        </div>
        <div>
          <label className="text-xs text-slate-500 font-medium mb-1 block">Expected Sale Price</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input type="number" min="0" step="0.01" value={salePrice}
              onChange={e => setSalePrice(e.target.value)} placeholder="0.00"
              className="w-full h-9 pl-6 pr-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white" />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs text-slate-500 font-medium mb-1 block">Credit Card</label>
        <select value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)}
          className="w-full h-9 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
          <option value="">No card selected</option>
          {creditCards.filter(c => c.active !== false).map(c => (
            <option key={c.id} value={c.id}>{c.card_name} — {c.cashback_rate || 0}% cashback</option>
          ))}
        </select>
      </div>

      {/* Results */}
      {totalCost > 0 && (
        <div className={`rounded-2xl border p-4 space-y-2.5 ${isPositive ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Calculation Results</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 mb-0.5">Total Cost</p>
              <p className="text-sm font-bold text-slate-700">{fmt$(totalCost)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 mb-0.5">Gross Profit</p>
              <p className={`text-sm font-bold ${grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt$(grossProfit)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 mb-0.5">ROI</p>
              <p className={`text-sm font-bold ${roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{pct(roi)}</p>
            </div>
          </div>
          {cashbackEarned > 0 && (
            <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-700">Cashback ({pct(cashbackRate)} on {fmt$(totalCost)})</p>
                <p className="text-[10px] text-slate-400">{selectedCard?.card_name}</p>
              </div>
              <p className="text-sm font-bold text-violet-600">+{fmt$(cashbackEarned)}</p>
            </div>
          )}
          <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border-2 border-dashed border-slate-200">
            <p className="text-sm font-bold text-slate-800">Net Profit (after cashback)</p>
            <p className={`text-lg font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{fmt$(netProfit)}
            </p>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ── 2. MONTHLY PROJECTION ─────────────────────────────────────────────────────

function MonthlyProjection({ orders, goals }) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentOrders = useMemo(() => {
    return orders.filter(o => o.order_date && new Date(o.order_date) >= thirtyDaysAgo);
  }, [orders]);

  const avgROI = useMemo(() => {
    const withProfit = recentOrders.filter(o => {
      const sale = (o.items || []).reduce((s, i) => s + (parseFloat(i.sale_price) || 0) * (parseInt(i.quantity_ordered) || 1), 0);
      return sale > 0 && o.total_cost > 0;
    });
    if (!withProfit.length) return 0;
    const total = withProfit.reduce((s, o) => {
      const sale = (o.items || []).reduce((acc, i) => acc + (parseFloat(i.sale_price) || 0) * (parseInt(i.quantity_ordered) || 1), 0);
      return s + (sale - o.total_cost) / o.total_cost * 100;
    }, 0);
    return total / withProfit.length;
  }, [recentOrders]);

  const totalSpent30d = recentOrders.reduce((s, o) => s + (o.total_cost || 0), 0);
  const avgDailySpend = totalSpent30d / 30;
  const projectedMonthlyProfit = avgDailySpend * 30 * (avgROI / 100);

  const profitGoal = goals.find(g => g.type === 'profit' && g.timeframe === 'monthly' && g.active !== false);
  const goalTarget = profitGoal?.target_value || 0;
  const progressPct = goalTarget > 0 ? Math.min((projectedMonthlyProfit / goalTarget) * 100, 100) : 0;

  const daysLeft = useMemo(() => {
    const end = endOfMonth(now);
    return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  }, []);

  return (
    <SectionCard icon={TrendingUp} title="Monthly Projection" color="emerald">
      <div className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <p className="text-[10px] text-slate-400 mb-0.5">30-Day Orders</p>
            <p className="text-base font-bold text-slate-700">{recentOrders.length}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <p className="text-[10px] text-slate-400 mb-0.5">Avg ROI</p>
            <p className={`text-base font-bold ${avgROI >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{pct(avgROI)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <p className="text-[10px] text-slate-400 mb-0.5">Days Left</p>
            <p className="text-base font-bold text-slate-700">{daysLeft}</p>
          </div>
        </div>

        {/* Projection banner */}
        <div className={`rounded-xl px-4 py-3 border ${projectedMonthlyProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className="text-xs text-slate-500">If you maintain this pace, you'll earn</p>
          <p className={`text-2xl font-bold mt-0.5 ${projectedMonthlyProfit >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
            {fmt$(projectedMonthlyProfit)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">this month in profit</p>
        </div>

        {/* Progress toward goal */}
        {goalTarget > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Monthly Profit Goal</span>
              <span className="text-slate-400">{fmt$(projectedMonthlyProfit)} / {fmt$(goalTarget)}</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${progressPct >= 100 ? 'bg-emerald-500' : progressPct >= 60 ? 'bg-violet-500' : 'bg-amber-500'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 text-right">{progressPct.toFixed(0)}% of goal</p>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-2">Set a monthly profit goal in the Goals page to see progress here</p>
        )}
      </div>
    </SectionCard>
  );
}

// ── 3. BEST CARDS FOR THIS DEAL ───────────────────────────────────────────────

function BestCardsForDeal({ creditCards }) {
  const [storeName, setStoreName] = useState('');

  const ranked = useMemo(() => {
    if (!storeName.trim()) return [];
    const q = storeName.trim().toLowerCase();

    return creditCards
      .filter(c => c.active !== false)
      .map(c => {
        // Check per-store rates first
        const storeRate = (c.store_rates || []).find(sr =>
          sr.store && sr.store.toLowerCase().includes(q)
        );
        const baseRate = c.cashback_rate || 0;
        const effectiveRate = storeRate ? storeRate.rate : baseRate;
        return {
          id: c.id,
          card_name: c.card_name,
          issuer: c.issuer,
          effectiveRate,
          baseRate,
          hasStoreRate: !!storeRate,
          estimatedCashback100: effectiveRate, // per $100 spent
        };
      })
      .sort((a, b) => b.effectiveRate - a.effectiveRate)
      .slice(0, 6);
  }, [creditCards, storeName]);

  const topRate = ranked[0]?.effectiveRate || 0;

  return (
    <SectionCard icon={Store} title="Best Cards For This Deal" color="blue">
      <div className="mb-4">
        <label className="text-xs text-slate-500 font-medium mb-1 block">Enter a store name</label>
        <input
          type="text"
          value={storeName}
          onChange={e => setStoreName(e.target.value)}
          placeholder="e.g. Amazon, Walmart, Target..."
          className="w-full h-9 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        />
      </div>

      {storeName.trim() === '' ? (
        <p className="text-sm text-slate-400 text-center py-4">Type a store name to see your best card options</p>
      ) : ranked.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No cards found</p>
      ) : (
        <div className="space-y-2">
          {ranked.map((card, idx) => (
            <div key={card.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition ${
              idx === 0 ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                idx === 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{card.card_name}</p>
                <p className="text-[11px] text-slate-400">
                  {card.hasStoreRate ? `Store-specific rate` : 'Base cashback rate'}
                  {card.baseRate !== card.effectiveRate && ` (base: ${pct(card.baseRate)})`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${idx === 0 ? 'text-blue-700' : 'text-slate-700'}`}>{pct(card.effectiveRate)}</p>
                <p className="text-[10px] text-slate-400">{fmt$(card.estimatedCashback100)} per $100</p>
              </div>
              {/* Bar */}
              <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden shrink-0">
                <div
                  className={`h-full rounded-full ${idx === 0 ? 'bg-blue-500' : 'bg-slate-400'}`}
                  style={{ width: topRate > 0 ? `${(card.effectiveRate / topRate) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ── 4. TREND PROJECTION CHART ─────────────────────────────────────────────────

function TrendProjection({ orders }) {
  const chartData = useMemo(() => {
    const now = new Date();
    const points = [];

    // Last 3 months actuals
    for (let i = 2; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthOrders = orders.filter(o => {
        if (!o.order_date) return false;
        const d = new Date(o.order_date);
        return d >= monthStart && d <= monthEnd;
      });
      const profit = monthOrders.reduce((s, o) => {
        const sale = (o.items || []).reduce((acc, it) =>
          acc + (parseFloat(it.sale_price) || 0) * (parseInt(it.quantity_ordered) || 1), 0);
        return s + (sale > 0 ? sale - (o.total_cost || 0) : 0);
      }, 0);
      points.push({
        label: format(monthStart, 'MMM'),
        profit: Math.round(profit),
        projected: null,
        isProjected: false,
      });
    }

    // Compute trend slope from last 3 months
    const actuals = points.map(p => p.profit);
    const avgActual = actuals.reduce((s, v) => s + v, 0) / actuals.length;
    // Simple linear trend: slope = (last - first) / 2 months
    const slope = actuals.length >= 2 ? (actuals[actuals.length - 1] - actuals[0]) / (actuals.length - 1) : 0;

    // Next 3 months projected
    for (let i = 1; i <= 3; i++) {
      const futureMonth = subMonths(now, -i);
      const projectedProfit = Math.max(0, Math.round(avgActual + slope * i));
      points.push({
        label: format(futureMonth, 'MMM'),
        profit: null,
        projected: projectedProfit,
        isProjected: true,
      });
    }

    return points;
  }, [orders]);

  const lastActual = chartData.filter(d => d.profit !== null).slice(-1)[0];
  const lastProjected = chartData.slice(-1)[0];
  const projectedGrowth = lastActual && lastProjected
    ? lastProjected.projected - lastActual.profit
    : 0;

  return (
    <SectionCard icon={BarChart2} title="Trend Projection — Last 3 Months + Next 3 Months" color="amber">
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-0.5 bg-emerald-500 rounded" />
          <span className="text-slate-500">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-0.5 border-t-2 border-dashed border-violet-400" />
          <span className="text-slate-500">Projected</span>
        </div>
        {projectedGrowth !== 0 && (
          <div className={`ml-auto flex items-center gap-1 font-semibold ${projectedGrowth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {projectedGrowth >= 0 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {projectedGrowth >= 0 ? '+' : ''}{fmt$(projectedGrowth)} trend
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
            tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
          <Tooltip contentStyle={TOOLTIP_STYLE}
            formatter={(v, name) => [v !== null ? fmt$(v) : '—', name === 'profit' ? 'Actual Profit' : 'Projected Profit']} />
          {/* Divider between actual and projected */}
          <ReferenceLine x={chartData.find(d => d.isProjected)?.label}
            stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth={1.5} />
          <Area type="monotone" dataKey="profit" name="profit"
            stroke="#10b981" strokeWidth={2.5} fill="url(#profitGrad)"
            dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 5 }}
            connectNulls={false} />
          <Area type="monotone" dataKey="projected" name="projected"
            stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 4"
            fill="url(#projectedGrad)"
            dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 5 }}
            connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Forecast() {
  const { data: orders = [] } = useQuery({
    queryKey: ['forecastOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-order_date', 300),
  });
  const { data: creditCards = [] } = useQuery({
    queryKey: ['creditCards'],
    queryFn: () => base44.entities.CreditCard.list(),
  });
  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list(),
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-violet-500" /> Forecast
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">Calculate profitability, project earnings, and find your best cards</p>
      </div>

      {/* Top 2 cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ProfitCalculator creditCards={creditCards} />
        <MonthlyProjection orders={orders} goals={goals} />
      </div>

      {/* Bottom 2 cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BestCardsForDeal creditCards={creditCards} />
        <TrendProjection orders={orders} />
      </div>
    </div>
  );
}