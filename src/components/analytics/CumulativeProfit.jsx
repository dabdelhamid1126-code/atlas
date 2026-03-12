import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CumulativeProfit({ data }) {
  const cumulative = useMemo(() => {
    let running = 0;
    return data.map(d => {
      running += d.profit || 0;
      return { month: d.month, cumProfit: running };
    });
  }, [data]);

  return (
    <div className="rounded-xl border border-white/10 p-5" style={{ background: '#12122a' }}>
      <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4">Cumulative Profit</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={cumulative} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
            formatter={v => [`$${v.toFixed(2)}`, 'Cumulative Profit']}
          />
          <Line type="monotone" dataKey="cumProfit" stroke="#a78bfa" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}