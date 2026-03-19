import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Target } from 'lucide-react';
import { abbrevDollar } from '@/components/dashboard/MetricCard';

const goalConfig = {
  profit:       { label: 'Net Profit',    color: 'text-green-600',  bar: 'bg-green-500',  bg: 'bg-green-50  border-green-200' },
  revenue:      { label: 'Revenue',       color: 'text-blue-600',   bar: 'bg-blue-500',   bg: 'bg-blue-50   border-blue-200' },
  cashback:     { label: 'Cashback',      color: 'text-pink-600',   bar: 'bg-pink-500',   bg: 'bg-pink-50   border-pink-200' },
  transactions: { label: 'Transactions', color: 'text-amber-600',  bar: 'bg-amber-500',  bg: 'bg-amber-50  border-amber-200' },
};

export default function GoalTracker({ metrics }) {
  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list(),
  });

  const activeGoals = goals.filter(g => g.active);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
          <Target className="h-4 w-4 text-purple-600" />
        </div>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Goal Tracker</h3>
      </div>

      {activeGoals.length === 0 ? (
        <p className="text-sm text-slate-400">Set profit goals in Settings to track your progress here.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeGoals.map(goal => {
            const config = goalConfig[goal.type] || goalConfig.profit;
            const current = goal.type === 'profit' ? (metrics.netProfit || 0)
              : goal.type === 'revenue' ? (metrics.saleRevenue || 0)
              : goal.type === 'cashback' ? (metrics.cashback || 0)
              : 0;
            const pct = Math.min((current / goal.target_value) * 100, 100);
            const reached = current >= goal.target_value;

            return (
              <div key={`${goal.type}-${goal.timeframe}`}
                className={`rounded-xl border p-4 ${config.bg} ${reached ? 'ring-2 ring-amber-400 shadow-amber-100 shadow-md' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold uppercase ${config.color}`}>{config.label}</span>
                  <span className="text-xs bg-white/60 text-slate-500 px-2 py-0.5 rounded-full capitalize">{goal.timeframe}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-3 flex-wrap">
                  <span className={`text-xl font-bold ${config.color}`}>
                    {goal.type === 'transactions' ? current : abbrevDollar(current)}
                  </span>
                  <span className="text-xs text-slate-400">
                    / {goal.type === 'transactions' ? goal.target_value : abbrevDollar(goal.target_value)}
                  </span>
                </div>
                <div className="h-2 bg-white/60 rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full transition-all ${reached ? 'bg-amber-400' : config.bar}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs font-semibold">
                  {reached
                    ? <span className="text-amber-600">Goal reached! 🎉</span>
                    : <span className="text-slate-400">{Math.round(pct)}% complete</span>
                  }
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}