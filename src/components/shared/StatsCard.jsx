import React from 'react';
import { cn } from '@/lib/utils';

export default function StatsCard({ title, value, icon: Icon, trend, trendUp, className }) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 p-5", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          {trend && (
            <p className={cn(
              "mt-1 text-xs font-medium",
              trendUp ? "text-emerald-600" : "text-red-600"
            )}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <Icon className="h-5 w-5 text-slate-600" />
          </div>
        )}
      </div>
    </div>
  );
}