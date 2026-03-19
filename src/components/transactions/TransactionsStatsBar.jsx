import React from 'react';
import { Package, Tag, CheckCircle2, CreditCard, TrendingUp } from 'lucide-react';

export default function TransactionsStatsBar({ orders = [] }) {
  const totalItems = orders.reduce((sum, o) => sum + (o.items?.reduce((s, i) => s + (i.quantity_ordered || 0), 0) || 0), 0);
  const listedCount = orders.filter(o => o.status === 'ordered' || o.status === 'shipped').length;
  const soldCount = orders.filter(o => o.status === 'received').length;
  const totalCost = orders.reduce((sum, o) => sum + (o.total_cost || 0), 0);
  const totalProfit = orders.reduce((sum, o) => sum + ((o.final_cost || 0) - (o.total_cost || 0)), 0);

  const stats = [
    {
      label: 'Total Items',
      value: totalItems.toLocaleString(),
      icon: Package,
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      valueColor: 'text-slate-900',
    },
    {
      label: 'Listed',
      value: listedCount.toLocaleString(),
      icon: Tag,
      bg: 'bg-orange-50',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-500',
      valueColor: 'text-orange-600',
    },
    {
      label: 'Sold / Done',
      value: soldCount.toLocaleString(),
      icon: CheckCircle2,
      bg: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      valueColor: 'text-green-700',
    },
    {
      label: 'Total Cost',
      value: `$${totalCost.toFixed(2)}`,
      icon: CreditCard,
      bg: 'bg-red-50',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-500',
      valueColor: 'text-red-600',
    },
    {
      label: 'Total Profit',
      value: `$${totalProfit.toFixed(2)}`,
      icon: TrendingUp,
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      valueColor: totalProfit >= 0 ? 'text-emerald-700' : 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-white shadow-sm overflow-hidden`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`${stat.iconBg} rounded-lg p-2 shrink-0`}>
                <Icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500 break-words">{stat.label}</p>
                <p className={`text-xl font-bold mt-0.5 break-words ${stat.valueColor}`}>{stat.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}