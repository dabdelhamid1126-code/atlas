import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { CreditCard, Gift, TrendingUp } from 'lucide-react';

const CARD_BG = '#1a1d2e';
const CARD_BORDER = '#2a2d3e';
const DONUT_COLORS = ['#818cf8', '#60a5fa', '#4ade80', '#a855f7', '#22c55e'];
const tooltipStyle = { background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8, fontSize: 12, color: '#e2e8f0' };

function ChartCard({ title, subtitle, children, fullWidth }) {
  return (
    <div className={`rounded-xl p-5 flex flex-col gap-3${fullWidth ? ' col-span-2' : ''}`}
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div>
        <p className="text-xs font-bold tracking-widest text-white uppercase">{title}</p>
        {subtitle && <p className="text-[11px] mt-0.5" style={{ color: '#6b7280' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function SummaryCard({ icon: Icon, iconBg, label, value, valueColor }) {
  return (
    <div className="flex-1 rounded-xl p-4 flex items-center gap-3 min-w-0"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="p-2 rounded-lg shrink-0" style={{ background: iconBg }}>
        <Icon className="h-4 w-4" style={{ color: valueColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold tracking-widest text-white/40 uppercase">{label}</p>
        <p className="text-base font-bold truncate" style={{ color: valueColor }}>{value}</p>
      </div>
    </div>
  );
}

const fmtUSD = v => `$${(v ?? 0).toFixed(2)}`;
const fmtPct = v => `${(v ?? 0).toFixed(2)}%`;

export default function PaymentsTab({ orders, rewards, creditCards }) {
  const cardStats = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      const key = o.credit_card_id || o.card_name || 'Unknown';
      const cardName = o.card_name || 'Unknown';
      if (!map[key]) {
        const cc = creditCards.find(c => c.id === o.credit_card_id || c.card_name === o.card_name);
        map[key] = {
          cardName,
          issuer: cc?.issuer || '',
          statedRate: cc?.cashback_rate || 0,
          spent: 0,
          cashback: 0,
          transactions: 0,
        };
      }
      map[key].spent += o.final_cost || o.total_cost || 0;
      map[key].transactions += 1;
    });

    rewards.filter(r => r.currency === 'USD').forEach(r => {
      const po = orders.find(o => o.id === r.purchase_order_id);
      const key = po?.credit_card_id || po?.card_name || r.card_name || 'Unknown';
      if (!map[key]) {
        map[key] = { cardName: r.card_name || 'Unknown', issuer: '', statedRate: 0, spent: 0, cashback: 0, transactions: 0 };
      }
      map[key].cashback += r.amount || 0;
    });

    return Object.values(map).map(d => ({
      ...d,
      effectiveRate: d.spent > 0 ? (d.cashback / d.spent) * 100 : 0,
      variance: d.spent > 0 ? (d.cashback / d.spent) * 100 - d.statedRate : -d.statedRate,
    }));
  }, [orders, rewards, creditCards]);

  const totals = useMemo(() => {
    const totalSpent = cardStats.reduce((s, c) => s + c.spent, 0);
    const totalCashback = cardStats.reduce((s, c) => s + c.cashback, 0);
    const best = cardStats.reduce((best, c) => (!best || c.effectiveRate > best.effectiveRate ? c : best), null);
    return { totalSpent, totalCashback, bestRate: best?.effectiveRate || 0, bestCard: best?.cardName || '—' };
  }, [cardStats]);

  return (
    <div className="space-y-4">
      {/* Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spend by Payment Method */}
        <ChartCard title="Spend by Payment Method" subtitle="Volume and cashback comparison">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cardStats} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="cardName" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtUSD(v)]} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#9ca3af' }} />
              <Bar dataKey="spent" name="Spent" fill="#818cf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cashback" name="Cashback" fill="#4ade80" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Cashback Distribution */}
        <ChartCard title="Cashback Distribution">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={180} height={200}>
              <PieChart>
                <Pie
                  data={cardStats.length ? cardStats : [{ cardName: 'None', cashback: 1 }]}
                  cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={2} dataKey="cashback"
                >
                  {(cardStats.length ? cardStats : [{}]).map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={v => [fmtUSD(v)]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {cardStats.map((c, i) => (
                <div key={c.cardName} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="text-white/80">{c.cardName}</span>
                </div>
              ))}
              {!cardStats.length && <p className="text-xs text-white/30">No data</p>}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Effective vs Stated Rate – full width */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <p className="text-xs font-bold tracking-widest text-white uppercase mb-3">Effective Cashback Rate vs Stated Rate</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={cardStats} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="cardName" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={tooltipStyle} formatter={v => [`${Number(v).toFixed(2)}%`]} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#9ca3af' }} />
            <Bar dataKey="statedRate" name="Stated Rate" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            <Bar dataKey="effectiveRate" name="Effective Rate" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Payment Method Performance Table */}
      <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <p className="text-xs font-bold tracking-widest text-white uppercase mb-4">Payment Method Performance</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                {['Payment Method', 'Transactions', 'Total Spent', 'Cashback Earned', 'Stated Rate', 'Effective Rate', 'Variance'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[10px] font-bold tracking-widest text-white/40 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cardStats.map((c, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3">
                    <p className="text-white font-medium">{c.cardName}</p>
                    {c.issuer && <p className="text-white/40 text-[10px] mt-0.5">{c.issuer}</p>}
                  </td>
                  <td className="py-3 px-3 text-white/70">{c.transactions}</td>
                  <td className="py-3 px-3 text-white/70">{fmtUSD(c.spent)}</td>
                  <td className="py-3 px-3 text-white/70">{fmtUSD(c.cashback)}</td>
                  <td className="py-3 px-3 text-white/70">{fmtPct(c.statedRate)}</td>
                  <td className="py-3 px-3 text-white/70">{fmtPct(c.effectiveRate)}</td>
                  <td className={`py-3 px-3 font-semibold ${c.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {c.variance >= 0 ? '+' : ''}{fmtPct(c.variance)}
                  </td>
                </tr>
              ))}
              {!cardStats.length && (
                <tr><td colSpan={7} className="py-6 text-center text-white/30">No payment data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SummaryCard icon={CreditCard} iconBg="#1e3a5f22" label="Total PM Spend"  value={fmtUSD(totals.totalSpent)}    valueColor="#60a5fa" />
        <SummaryCard icon={Gift}       iconBg="#2e106522" label="Total Cashback"  value={fmtUSD(totals.totalCashback)} valueColor="#a855f7" />
        <SummaryCard icon={TrendingUp} iconBg="#05521622" label="Best Rate"       value={fmtPct(totals.bestRate)}      valueColor="#22c55e" />
        <SummaryCard icon={CreditCard} iconBg="#1e3a5f22" label="Best Card"       value={totals.bestCard}              valueColor="#60a5fa" />
      </div>
    </div>
  );
}