import React from 'react';
import { cn } from '@/lib/utils';

export default function StatsCard({ title, value, icon: Icon, trend, trendUp, className, gradient }) {
  return (
    <div className={cn("card-modern p-6 animate-slide-up", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          {trend && (
            <p className={cn(
              "mt-2 text-sm font-semibold",
              trendUp ? "text-emerald-600" : "text-red-600"
            )}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center",
            gradient || "gradient-primary"
          )}>
            <Icon className="h-7 w-7 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}