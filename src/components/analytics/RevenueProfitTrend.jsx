import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CARD_BG = '#1a1d2e';
const BORDER = '#2a2d3e';
const TOOLTIP = { background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8, fontSize: 12, color: '#e2e8f0' };

export default function RevenueProfitTrend({ data }) {
  return (
    <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold tracking-widest text-white uppercase">Revenue &amp; Profit Trend</p>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: '#6366f1', color: '#c7d2fe' }}>Monthly</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
          <Tooltip contentStyle={TOOLTIP} labelStyle={{ color: '#e2e8f0' }} formatter={v => [`$${v.toFixed(2)}`]} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
          <Line type="monotone" dataKey="revenue" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3, fill: '#60a5fa' }} name="Revenue" />
          <Line type="monotone" dataKey="profit" stroke="#4ade80" strokeWidth={2} dot={{ r: 3, fill: '#4ade80' }} name="Profit" />
          <Line type="monotone" dataKey="cashback" stroke="#a855f7" strokeWidth={2} dot={{ r: 3, fill: '#a855f7' }} name="Cashback" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}