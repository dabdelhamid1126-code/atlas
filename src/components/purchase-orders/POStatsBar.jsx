import React from 'react';
import { Package, DollarSign, Clock, CheckCircle2 } from 'lucide-react';

export default function POStatsBar({ orders }) {
  const totalOrders = orders.length;
  const pending = orders.filter(o => o.status === 'pending').length;
  const received = orders.filter(o => o.status === 'received').length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.final_cost || o.total_cost || 0), 0);

  const stats = [
    { label: 'Total Items', value: totalOrders, icon: Package, color: 'slate' },
    { label: 'Pending', value: pending, icon: Clock, color: 'amber' },
    { label: 'Received', value: received, icon: CheckCircle2, color: 'green' },
    { label: 'Total Cost', value: `$${totalSpent.toFixed(2)}`, icon: DollarSign, color: 'pink' },
  ];

  const colorClasses = {
    slate: 'bg-slate-50 border-slate-200',
    amber: 'bg-amber-50 border-amber-200',
    green: 'bg-green-50 border-green-200',
    pink: 'bg-pink-50 border-pink-200',
  };

  const textColors = {
    slate: 'text-slate-600',
    amber: 'text-amber-600',
    green: 'text-green-600',
    pink: 'text-red-600',
  };

  return (
    <div className="space-y-3 mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${colorClasses[stat.color]} border rounded-lg p-4 overflow-hidden`}>
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="h-5 w-5 flex-shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-600 break-words">{stat.label}</p>
                  <p className={`text-xl font-bold mt-0.5 break-words ${textColors[stat.color]}`}>{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Profit Card */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-xs">
        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5 flex-shrink-0 text-slate-400" />
          <div>
            <p className="text-xs text-slate-600">Total Profit</p>
            <p className="text-xl font-bold mt-0.5 text-green-600">
              ${(orders.reduce((sum, o) => sum + ((o.final_cost || o.total_cost || 0) * 0.15), 0)).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}