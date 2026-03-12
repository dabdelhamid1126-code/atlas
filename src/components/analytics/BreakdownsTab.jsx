import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, TrendingUp, Gift, Percent } from 'lucide-react';

const CARD_BG = '#1a1d2e';
const CARD_BORDER = '#2a2d3e';
const DONUT_COLORS = ['#818cf8', '#60a5fa', '#4ade80', '#a855f7', '#22c55e'];

function ChartCard({ title, subtitle, badge, children }) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-white uppercase">{title}</p>
          {subtitle && <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>{subtitle}</p>}
        </div>
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#6366f1', color: '#e0e7ff' }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SummaryCard({ icon: Icon, iconBg, label, value, valueColor }) {
  return (
    <div className="flex-1 rounded-xl p-4 flex items-center gap-3" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="p-2 rounded-lg shrink-0" style={{ background: iconBg }}>
        <Icon className="h-4 w-4" style={{ color: valueColor }} />
      </div>
      <div>
        <p className="text-[9px] font-bold tracking-widest text-white/40 uppercase">{label}</p>
        <p className="text-base font-bold" style={{ color: valueColor }}>{value}</p>
      </div>
    </div>
  );
}

const fmtUSD = v => `$${(v ?? 0).toFixed(2)}`;
const fmtPct = v => `${(v ?? 0).toFixed(2)}%`;

export default function BreakdownsTab({ orders, invoices, rewards }) {
  const storeData = useMemo(() => {
    const map = {};
    const paidInvoices = invoices.filter(i => i.status === 'paid');
    orders.forEach(o => {
      const store = o.retailer || 'Unknown';
      if (!map[store]) map[store] = { store, sales: 0, cost: 0, cashback: 0 };
      map[store].cost += o.final_cost || o.total_cost || 0;
    });
    paidInvoices.forEach(inv => {
      const store = inv.buyer || 'Unknown';
      if (!map[store]) map[store] = { store, sales: 0, cost: 0, cashback: 0 };
      map[store].sales += inv.total || 0;
    });
    rewards.filter(r => r.currency === 'USD').forEach(r => {
      const po = orders.find(o => o.id === r.purchase_order_id);
      const store = po?.retailer || 'Unknown';
      if (!map[store]) map[store] = { store, sales: 0, cost: 0, cashback: 0 };
      map[store].cashback += r.amount || 0;
    });
    return Object.values(map).map(d => ({
      ...d,
      profit: d.sales - d.cost,
      roi: d.cost > 0 ? ((d.sales - d.cost) / d.cost) * 100 : 0,
    }));
  }, [orders, invoices, rewards]);

  const categoryData = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      const cat = o.category || 'other';
      if (!map[cat]) map[cat] = { name: cat.charAt(0).toUpperCase() + cat.slice(1), count: 0, value: 0 };
      map[cat].count += 1;
      map[cat].value += o.final_cost || o.total_cost || 0;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [orders]);

  const totals = useMemo(() => {
    const sales = storeData.reduce((s, d) => s + d.sales, 0);
    const profit = storeData.reduce((s, d) => s + d.profit, 0);
    const cashback = storeData.reduce((s, d) => s + d.cashback, 0);
    const avgRoi = storeData.length ? storeData.reduce((s, d) => s + d.roi, 0) / storeData.length : 0;
    return { sales, profit, cashback, avgRoi };
  }, [storeData]);

  const tooltipStyle = { background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8, fontSize: 12, color: '#e2e8f0' };

  return (
    <div className="space-y-4">
      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Store Performance – horizontal bar */}
        <ChartCard title="Store Performance" subtitle="Sales & profit by store" badge={`${storeData.length} STORES`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={storeData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="store" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={60} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtUSD(v)]} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="sales" name="Sales" fill="#60a5fa" radius={[0, 4, 4, 0]} />
              <Bar dataKey="profit" name="Profit" fill="#4ade80" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Platform Performance – vertical bar */}
        <ChartCard title="Platform Performance" subtitle="Revenue & profit by platform" badge={`${storeData.length} PLATFORMS`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={storeData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="store" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtUSD(v)]} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#9ca3af' }} />
              <Bar dataKey="sales" name="Sales" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="Profit" fill="#4ade80" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cashback" name="Cashback" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Store ROI Comparison */}
        <ChartCard title="Store ROI Comparison" subtitle="">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={storeData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="store" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtPct(v), 'ROI']} />
              <Bar dataKey="roi" name="ROI %" fill="#4ade80" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Spend by Category – donut */}
        <ChartCard title="Spend by Category" subtitle="">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={160} height={180}>
              <PieChart>
                <Pie data={categoryData.length ? categoryData : [{ name: 'None', count: 1, value: 1 }]}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {(categoryData.length ? categoryData : [{}]).map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtUSD(v)]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {categoryData.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-white/80 min-w-[70px]">{c.name}</span>
                  <span className="text-white/40">{c.count}x</span>
                  <span className="text-white/70 font-semibold">{fmtUSD(c.value)}</span>
                </div>
              ))}
              {!categoryData.length && <p className="text-xs text-white/30">No data</p>}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Summary Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SummaryCard icon={DollarSign} iconBg="#1e3a5f22" label="Total Store Sales"  value={fmtUSD(totals.sales)}    valueColor="#60a5fa" />
        <SummaryCard icon={TrendingUp} iconBg="#05521622" label="Store Profit"       value={fmtUSD(totals.profit)}   valueColor="#4ade80" />
        <SummaryCard icon={Gift}       iconBg="#2e106522" label="Store Cashback"     value={fmtUSD(totals.cashback)} valueColor="#a855f7" />
        <SummaryCard icon={Percent}    iconBg="#05521622" label="Avg Store ROI"      value={fmtPct(totals.avgRoi)}   valueColor="#22c55e" />
      </div>
    </div>
  );
}