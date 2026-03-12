import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from 'recharts';

const CARD_BG = '#1a1d2e';
const BORDER = '#2a2d3e';
const TOOLTIP = { background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8, fontSize: 12 };

export default function PeriodPnL({ data }) {
  return (
    <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
      <p className="text-xs font-bold tracking-widest text-white uppercase mb-4">Period P&amp;L</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
          <Tooltip contentStyle={TOOLTIP} formatter={v => [`$${v.toFixed(2)}`, 'Profit']} />
          <ReferenceLine y={0} stroke="#374151" />
          <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.profit >= 0 ? '#4ade80' : '#ef4444'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}