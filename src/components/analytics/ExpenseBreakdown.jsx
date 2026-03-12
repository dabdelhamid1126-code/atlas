import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CARD_BG = '#1a1d2e';
const BORDER = '#2a2d3e';
const COLORS = ['#818cf8', '#60a5fa', '#4ade80', '#a855f7', '#22c55e', '#f472b6'];
const TOOLTIP = { background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 8, fontSize: 12 };

export default function ExpenseBreakdown({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const display = data.length ? data : [{ name: 'COGS', value: 1 }];

  return (
    <div className="rounded-xl p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
      <p className="text-xs font-bold tracking-widest text-white uppercase mb-4">Expense Breakdown</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={display} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
            {display.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP} formatter={v => [`$${v.toFixed(2)}`]} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
        </PieChart>
      </ResponsiveContainer>
      {data.length > 0 && (
        <p className="text-center text-xs mt-1" style={{ color: '#6b7280' }}>
          Total: <span className="text-white font-semibold">${total.toFixed(2)}</span>
        </p>
      )}
    </div>
  );
}