import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Send, RefreshCcw, CheckCircle, DollarSign, List } from 'lucide-react';

const stages = [
  { label: 'Purchased',  key: 'ordered',             icon: Package,       color: 'text-blue-400' },
  { label: 'Shipped',    key: 'shipped',              icon: Send,          color: 'text-violet-400' },
  { label: 'Received',   key: 'received',             icon: RefreshCcw,    color: 'text-teal-400' },
  { label: 'Paid',       key: 'paid',                 icon: CheckCircle,   color: 'text-green-400' },
  { label: 'Listed',     key: 'listed',               icon: List,          color: 'text-orange-400' },
  { label: 'Sold',       key: 'sold',                 icon: DollarSign,    color: 'text-pink-400' },
  { label: 'Completed',  key: 'completed',            icon: CheckCircle,   color: 'text-emerald-400' },
];

export default function StatusPipeline({ orders = [] }) {
  const counts = {
    ordered:   orders.filter(o => o.status === 'ordered').length,
    shipped:   orders.filter(o => o.status === 'shipped').length,
    received:  orders.filter(o => o.status === 'received' || o.status === 'partially_received').length,
    paid:      0,
    listed:    0,
    sold:      0,
    completed: orders.filter(o => o.status === 'cancelled').length,
  };

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Status Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {stages.map(({ label, key, icon: Icon, color }) => (
            <div key={key} className="flex flex-col items-start gap-1 p-3 rounded-xl bg-secondary/50">
              <Icon className={`h-4 w-4 ${color} mb-1`} />
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{counts[key] ?? 0}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}