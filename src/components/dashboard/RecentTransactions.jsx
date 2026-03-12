import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const statusColors = {
  ordered:             'bg-blue-500/20 text-blue-400 border-blue-500/30',
  shipped:             'bg-violet-500/20 text-violet-400 border-violet-500/30',
  received:            'bg-teal-500/20 text-teal-400 border-teal-500/30',
  partially_received:  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  cancelled:           'bg-red-500/20 text-red-400 border-red-500/30',
  pending:             'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function RecentTransactions({ orders = [] }) {
  const recent = orders.slice(0, 10);

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Product', 'Retailer', 'Cost', 'Cashback', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No transactions yet</td></tr>
              )}
              {recent.map(order => (
                <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 pr-4 text-foreground font-medium">
                    {order.items?.map(i => i.product_name).join(', ') || '—'}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{order.retailer || '—'}</td>
                  <td className="py-3 pr-4 text-foreground">${(order.final_cost || order.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-3 pr-4 text-green-400">—</td>
                  <td className="py-3 pr-4">
                    <Badge className={`text-xs border ${statusColors[order.status] || statusColors.pending}`}>
                      {order.status?.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 text-muted-foreground text-xs">{order.order_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}