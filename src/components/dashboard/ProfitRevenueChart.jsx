import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ProfitRevenueChart({ data = [] }) {
  return (
    <Card className="border border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">Profit & Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(258,20%,18%)" />
            <XAxis dataKey="month" stroke="hsl(258,15%,50%)" style={{ fontSize: '11px' }} />
            <YAxis stroke="hsl(258,15%,50%)" style={{ fontSize: '11px' }} tickFormatter={v => `$${v}`} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(258,30%,10%)', border: '1px solid hsl(258,20%,22%)', borderRadius: '8px', color: '#f5f5f5', fontSize: '12px' }}
              formatter={(value, name) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name]}
            />
            <Legend wrapperStyle={{ fontSize: '12px', color: 'hsl(258,15%,60%)' }} />
            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="spent" name="Spent" stroke="#64748b" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}