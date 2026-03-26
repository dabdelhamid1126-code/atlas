import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, CreditCard, DollarSign, Percent } from 'lucide-react';

const COLORS = ['#7c3aed','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#84cc16'];
const fmt$ = (v) => `$${(v||0).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`;

function IssuerLogo({ issuer, size = 32 }) {
  const [err, setErr] = React.useState(false);
  const ISSUER_DOMAIN = {
    'Chase': 'chase.com', 'American Express': 'americanexpress.com', 'Amex': 'americanexpress.com',
    'Citi': 'citi.com', 'Capital One': 'capitalone.com', 'Discover': 'discover.com',
    'Bank of America': 'bankofamerica.com', 'Wells Fargo': 'wellsfargo.com',
    'Barclays': 'barclays.com', 'US Bank': 'usbank.com',
  };
  const domain = ISSUER_DOMAIN[issuer] || `${(issuer||'').toLowerCase().replace(/\s+/g,'')}.com`;
  const url = `https://logo.clearbit.com/${domain}`;
  const initials = (issuer||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

  if (err || !issuer) {
    return (
      <div className="rounded-lg flex items-center justify-center bg-violet-100 text-violet-700 font-bold shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.35 }}>
        {initials}
      </div>
    );
  }
  return (
    <div className="rounded-lg overflow-hidden bg-white border border-slate-100 flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}>
      <img src={url} alt={issuer} onError={() => setErr(true)}
        style={{ width: size * 0.78, height: size * 0.78, objectFit: 'contain' }} />
    </div>
  );
}

export default function CardAnalyticsView({ cards = [], orders = [] }) {
  const cardStats = useMemo(() => {
    return cards.map(card => {
      const cardOrders = orders.filter(o => o.credit_card_id === card.id);
      const spent = cardOrders.reduce((s, o) => s + (o.final_cost || o.total_cost || 0), 0);
      const txns = cardOrders.length;
      const rate = card.cashback_rate || card.points_rate || 0;
      const estimatedCashback = spent * (rate / 100);
      return {
        id: card.id,
        name: card.card_name,
        issuer: card.issuer,
        spent,
        txns,
        rate,
        estimatedCashback,
        annualFee: card.annual_fee || 0,
        netBenefit: estimatedCashback - (card.annual_fee || 0),
        active: card.active !== false,
      };
    }).sort((a, b) => b.spent - a.spent);
  }, [cards, orders]);

  const totalSpent = cardStats.reduce((s, c) => s + c.spent, 0);
  const totalEstCashback = cardStats.reduce((s, c) => s + c.estimatedCashback, 0);
  const totalFees = cardStats.reduce((s, c) => s + c.annualFee, 0);
  const avgRate = cardStats.length ? cardStats.reduce((s, c) => s + c.rate, 0) / cardStats.length : 0;

  const spendPieData = cardStats.filter(c => c.spent > 0).map(c => ({ name: c.name, value: c.spent }));
  const barData = cardStats.slice(0, 8).map(c => ({
    name: c.name.length > 14 ? c.name.slice(0, 14) + '…' : c.name,
    spent: Math.round(c.spent),
    cashback: parseFloat(c.estimatedCashback.toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Charged', value: fmt$(totalSpent), icon: CreditCard, color: 'blue' },
          { label: 'Est. Cashback', value: fmt$(totalEstCashback), icon: TrendingUp, color: 'green' },
          { label: 'Annual Fees', value: fmt$(totalFees), icon: DollarSign, color: 'red' },
          { label: 'Avg Base Rate', value: `${avgRate.toFixed(2)}%`, icon: Percent, color: 'purple' },
        ].map(stat => {
          const colorMap = {
            blue: 'bg-blue-50 border-blue-100 text-blue-600',
            green: 'bg-green-50 border-green-100 text-green-600',
            red: 'bg-red-50 border-red-100 text-red-600',
            purple: 'bg-purple-50 border-purple-100 text-purple-600',
          };
          return (
            <div key={stat.label} className={`rounded-2xl border p-4 ${colorMap[stat.color]}`}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="h-4 w-4" />
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Spend by Card Bar Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Spend & Est. Cashback by Card</p>
          {barData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No spend data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <Tooltip formatter={(v, n) => [fmt$(v), n === 'spent' ? 'Spent' : 'Est. Cashback']}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="spent" fill="#7c3aed" radius={[4,4,0,0]} name="spent" />
                <Bar dataKey="cashback" fill="#10b981" radius={[4,4,0,0]} name="cashback" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Spend distribution donut */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Spend Distribution</p>
          {spendPieData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No spend data yet.</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={spendPieData} cx="50%" cy="50%" innerRadius={44} outerRadius={72} dataKey="value" paddingAngle={2}>
                    {spendPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt$(v)} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 overflow-hidden">
                {spendPieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-slate-600 truncate flex-1">{d.name}</span>
                    <span className="text-xs font-bold text-slate-700 shrink-0">{fmt$(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card performance table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Card Performance Table</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Card', 'Total Spent', 'Transactions', 'Base Rate', 'Est. Cashback', 'Annual Fee', 'Net Benefit', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cardStats.map((c, i) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <IssuerLogo issuer={c.issuer} size={28} />
                      <div>
                        <p className="font-semibold text-slate-800 text-xs leading-tight">{c.name}</p>
                        <p className="text-[10px] text-slate-400">{c.issuer || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-blue-600">{fmt$(c.spent)}</td>
                  <td className="px-4 py-3 text-slate-600">{c.txns}</td>
                  <td className="px-4 py-3 font-bold text-violet-600">{c.rate}%</td>
                  <td className="px-4 py-3 font-semibold text-green-600">{fmt$(c.estimatedCashback)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmt$(c.annualFee)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${c.netBenefit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt$(c.netBenefit)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${c.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}