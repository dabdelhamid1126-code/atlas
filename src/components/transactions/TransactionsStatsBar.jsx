import React from 'react';
import { Card } from '@/components/ui/card';
import { Package, Clock, CheckCircle, CreditCard, TrendingUp } from 'lucide-react';

export default function TransactionsStatsBar({ orders = [] }) {
  const totalItems = orders.reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + (i.quantity_ordered || 0), 0) || 0), 0);
  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'ordered').length;
  const receivedCount = orders.filter(o => o.status === 'received').length;
  const totalCost = orders.reduce((sum, o) => sum + (o.total_cost || 0), 0);
  const totalProfit = orders.reduce((sum, o) => sum + ((o.final_cost || 0) - (o.total_cost || 0)), 0);

  const stats = [
    { label: 'Total Items', value: totalItems, icon: Package, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: 'Pending', value: pendingCount, icon: Clock, bgColor: 'bg-amber-50', iconColor: 'text-amber-600', valueColor: 'text-amber-600' },
    { label: 'Received', value: receivedCount, icon: CheckCircle, bgColor: 'bg-green-50', iconColor: 'text-green-600', valueColor: 'text-green-600' },
    { label: 'Total Cost', value: `$${totalCost.toFixed(2)}`, icon: CreditCard, bgColor: 'bg-red-50', iconColor: 'text-red-600', valueColor: 'text-red-600' },
    { label: 'Total Profit', value: `$${totalProfit.toFixed(2)}`, icon: TrendingUp, bgColor: 'bg-green-50', iconColor: 'text-green-600', valueColor: 'text-green-600' },
  ];

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card key={idx} className={`${stat.bgColor} p-4 border-0`}>
            <div className="flex items-start gap-3">
              <Icon className={`h-6 w-6 ${stat.iconColor}`} />
              <div className="flex-1">
                <p className="text-xs text-gray-600 font-medium">{stat.label}</p>
                <p className={`text-lg font-bold mt-1 ${stat.valueColor || 'text-gray-900'}`}>{stat.value}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}