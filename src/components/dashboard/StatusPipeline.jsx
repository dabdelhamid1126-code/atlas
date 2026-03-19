import React from 'react';
import { Package, Send, RefreshCcw, CheckCircle, DollarSign, List, Trophy } from 'lucide-react';

const stages = [
  { label: 'Purchased', key: 'ordered',   icon: Package,      color: 'text-blue-600',   bg: 'bg-blue-50   border-blue-200' },
  { label: 'Shipped',   key: 'shipped',   icon: Send,         color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
  { label: 'Received',  key: 'received',  icon: RefreshCcw,   color: 'text-teal-600',   bg: 'bg-teal-50   border-teal-200' },
  { label: 'Paid',      key: 'paid',      icon: CheckCircle,  color: 'text-green-600',  bg: 'bg-green-50  border-green-200' },
  { label: 'Listed',    key: 'listed',    icon: List,         color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  { label: 'Sold',      key: 'sold',      icon: DollarSign,   color: 'text-pink-600',   bg: 'bg-pink-50   border-pink-200' },
  { label: 'Completed', key: 'completed', icon: Trophy,       color: 'text-emerald-600',bg: 'bg-emerald-50 border-emerald-200' },
];

export default function StatusPipeline({ orders = [] }) {
  const counts = {
    ordered:   orders.filter(o => o.status === 'ordered').length,
    shipped:   orders.filter(o => o.status === 'shipped').length,
    received:  orders.filter(o => o.status === 'received' || o.status === 'partially_received').length,
    paid:      orders.filter(o => o.status === 'paid').length,
    listed:    orders.filter(o => o.status === 'listed').length,
    sold:      orders.filter(o => o.status === 'sold').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-4">Status Pipeline</h3>
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {stages.map(({ label, key, icon: Icon, color, bg }) => (
          <div key={key} className={`flex flex-col items-center gap-1 p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all ${bg}`}>
            <Icon className={`h-5 w-5 ${color} mb-1`} />
            <p className="text-xs text-slate-500 font-medium">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{counts[key] ?? 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}