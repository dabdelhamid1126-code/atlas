import React from 'react';
import { cn } from '@/lib/utils';

export default function StatsCard({ title, value, icon: Icon, trend, trendUp, className, gradient }) {
  return (
    <div className={cn("card-modern p-6 animate-slide-up overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-600 break-words">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2 break-words">{value}</p>
          {trend && (
            <p className={cn(
              "mt-2 text-sm font-semibold break-words",
              trendUp ? "text-emerald-600" : "text-red-600"
            )}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0",
            gradient || "gradient-primary"
          )}>
            <Icon className="h-7 w-7 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}