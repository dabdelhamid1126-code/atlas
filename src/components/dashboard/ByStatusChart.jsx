import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#06b6d4'];

export default function ByStatusChart({ data = [] }) {
  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">By Status</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No data</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(258,30%,10%)', border: '1px solid hsl(258,20%,22%)', borderRadius: '8px', color: '#f5f5f5', fontSize: '12px' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', color: 'hsl(258,15%,60%)' }}
                formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}