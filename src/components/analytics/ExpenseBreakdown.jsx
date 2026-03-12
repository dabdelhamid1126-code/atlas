import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

export default function ExpenseBreakdown({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const display = data.length ? data : [{ name: 'COGS', value: 1 }];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-4">Expense Breakdown</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={display}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {display.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
            formatter={v => [`$${v.toFixed(2)}`]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      {data.length > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-1">
          Total: <span className="text-foreground font-semibold">${total.toFixed(2)}</span>
        </p>
      )}
    </div>
  );
}