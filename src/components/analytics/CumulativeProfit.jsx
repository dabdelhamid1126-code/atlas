import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CARD_BG = '#1a1d2e';
const BORDER = '#2a2d3e';
const TOOLTIP = { background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8, fontSize: 12 };

export default function CumulativeProfit({ data }) {
  const cumulative = useMemo(() => {
    let running = 0;
    return data.map(d => { running += d.profit || 0; return { month: d.month, cumProfit: running }; });
  }, [data]);

  return (
    <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
      <p className="text-xs font-bold tracking-widest text-white uppercase mb-4">Cumulative Profit</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={cumulative} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
          <Tooltip contentStyle={TOOLTIP} formatter={v => [`$${v.toFixed(2)}`, 'Cumulative Profit']} />
          <Line type="monotone" dataKey="cumProfit" stroke="#4ade80" strokeWidth={2} dot={{ r: 3, fill: '#4ade80' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}