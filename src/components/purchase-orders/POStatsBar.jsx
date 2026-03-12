import React from 'react';
import { Package, DollarSign, Clock, CheckCircle2 } from 'lucide-react';

export default function POStatsBar({ orders }) {
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.final_cost || o.total_cost || 0), 0);
  const pendingInTransit = orders.filter(o => ['pending', 'ordered', 'shipped', 'partially_received'].includes(o.status)).length;
  const received = orders.filter(o => o.status === 'received').length;

  const stats = [
    { label: 'Total Orders', value: totalOrders, icon: Package, color: 'blue' },
    { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}`, icon: DollarSign, color: 'purple' },
    { label: 'Pending/In Transit', value: pendingInTransit, icon: Clock, color: 'amber' },
    { label: 'Received', value: received, icon: CheckCircle2, color: 'green' },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    green: 'bg-green-50 border-green-200 text-green-700',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className={`${colorClasses[stat.color]} border rounded-lg p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold opacity-75">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <Icon className="h-8 w-8 opacity-20" />
            </div>
          </div>
        );
      })}
    </div>
  );
}