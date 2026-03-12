import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function RevenueProfitTrend({ data }) {
  return (
    <div className="rounded-xl border border-white/10 p-5" style={{ background: '#12122a' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Revenue &amp; Profit Trend</p>
        <span className="text-xs bg-secondary text-foreground px-2 py-0.5 rounded">Monthly</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={v => [`$${v.toFixed(2)}`]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="revenue" stroke="#a78bfa" strokeWidth={2} dot={false} name="Revenue" />
          <Line type="monotone" dataKey="profit" stroke="#4ade80" strokeWidth={2} dot={false} name="Profit" />
          <Line type="monotone" dataKey="cashback" stroke="#22d3ee" strokeWidth={2} dot={false} name="Cashback" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}