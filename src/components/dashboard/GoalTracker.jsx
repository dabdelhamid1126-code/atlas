import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Target } from 'lucide-react';
import { abbrevDollar } from '@/components/dashboard/MetricCard';

const goalConfig = {
  profit:       { label: 'Net Profit',   color: 'text-emerald-400' },
  revenue:      { label: 'Revenue',      color: 'text-cyan-400'    },
  cashback:     { label: 'Cashback',     color: 'text-pink-400'    },
  transactions: { label: 'Transactions', color: 'text-amber-400'   },
};

export default function GoalTracker({ metrics }) {
  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list(),
  });

  const activeGoals = goals.filter(g => g.active);

  return (
    <div className="rounded-2xl border p-6" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-5">
        <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Target className="h-4 w-4 text-purple-400" />
        </div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Goal Tracker</h3>
      </div>

      {activeGoals.length === 0 ? (
        <p className="text-sm text-slate-500">Set profit goals in Settings to track your progress here.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeGoals.map(goal => {
            const config = goalConfig[goal.type] || goalConfig.profit;
            const current = goal.type === 'profit' ? (metrics.netProfit || 0)
              : goal.type === 'revenue' ? (metrics.saleRevenue || 0)
              : goal.type === 'cashback' ? (metrics.cashback || 0)
              : 0;
            const isNegative = current < 0;
            const pct = isNegative ? 0 : Math.min((current / goal.target_value) * 100, 100);
            const reached = !isNegative && current >= goal.target_value;

            const barColor = isNegative
              ? 'linear-gradient(90deg, #ef4444, #f87171)'
              : reached
                ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                : 'linear-gradient(90deg, #10b981, #06b6d4)';

            const borderColor = isNegative
              ? 'rgba(239,68,68,0.3)'
              : reached
                ? 'rgba(16,185,129,0.3)'
                : 'rgba(255,255,255,0.07)';

            const glowShadow = isNegative
              ? '0 0 16px rgba(239,68,68,0.08)'
              : reached
                ? '0 0 16px rgba(16,185,129,0.08)'
                : 'none';

            return (
              <div
                key={`${goal.type}-${goal.timeframe}`}
                className="rounded-xl border p-4 overflow-hidden min-w-0"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderColor,
                  boxShadow: glowShadow,
                }}
              >
                <div className="flex items-start justify-between gap-1 mb-1 flex-wrap">
                  <span className={`text-xs font-bold uppercase leading-tight break-words ${config.color}`}>{config.label}</span>
                  <span
                    className="text-xs text-slate-400 px-2 py-0.5 rounded-full capitalize shrink-0 border"
                    style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    {goal.timeframe}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-3 flex-wrap">
                  <span className={`text-xl font-bold ${isNegative ? 'text-red-400' : 'text-slate-200'}`}>
                    {goal.type === 'transactions' ? current : abbrevDollar(current)}
                  </span>
                  <span className="text-xs text-slate-500">
                    / {goal.type === 'transactions' ? goal.target_value : abbrevDollar(goal.target_value)}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: barColor }}
                  />
                </div>
                <p className="text-xs font-semibold">
                  {isNegative
                    ? <span className="text-red-400">Negative value</span>
                    : reached
                      ? <span className="text-amber-400">Goal reached! 🎉</span>
                      : <span className="text-slate-500">{Math.round(pct)}% complete</span>
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