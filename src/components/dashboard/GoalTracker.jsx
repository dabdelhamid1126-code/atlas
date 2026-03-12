import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Target } from 'lucide-react';
import { Card } from '@/components/ui/card';

const goalConfig = {
  profit: { label: 'Profit', color: 'text-green-400', bgColor: 'bg-green-400/20', barColor: 'bg-green-400' },
  revenue: { label: 'Revenue', color: 'text-blue-400', bgColor: 'bg-blue-400/20', barColor: 'bg-blue-400' },
  cashback: { label: 'Cashback', color: 'text-pink-400', bgColor: 'bg-pink-400/20', barColor: 'bg-pink-400' },
  transactions: { label: 'Transactions', color: 'text-amber-400', bgColor: 'bg-amber-400/20', barColor: 'bg-amber-400' },
};

export default function GoalTracker({ metrics }) {
  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list(),
  });

  const activeGoals = goals.filter(g => g.active);

  if (activeGoals.length === 0) {
    return (
      <Card className="bg-card border-border p-6">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Goal Tracker</h3>
        </div>
        <p className="text-muted-foreground text-sm">Set profit goals in Settings to track your progress here.</p>
      </Card>
    );
  }

  const getCurrentValue = (goalType) => {
    switch (goalType) {
      case 'profit':
        return metrics.netProfit || 0;
      case 'revenue':
        return metrics.saleRevenue || 0;
      case 'cashback':
        return metrics.cashback || 0;
      case 'transactions':
        return 0; // Would need transaction count from data
      default:
        return 0;
    }
  };

  return (
    <Card className="bg-card border-border p-6">
      <div className="flex items-center gap-2 mb-6">
        <Target className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Goal Tracker</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeGoals.map(goal => {
          const config = goalConfig[goal.type];
          const current = getCurrentValue(goal.type);
          const percentage = (current / goal.target_value) * 100;
          const isOverAchieved = percentage > 100;

          return (
            <div key={`${goal.type}-${goal.timeframe}`} className={`${config.bgColor} rounded-lg p-4 border border-border/50`}>
              <div className="flex items-start justify-between mb-2">
                <span className={`text-xs font-semibold ${config.color} uppercase`}>{config.label}</span>
                <span className="text-xs text-muted-foreground capitalize">{goal.timeframe}</span>
              </div>

              <div className="mb-3">
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${config.color}`}>
                    {goal.type === 'transactions' ? current : `$${current.toFixed(2)}`}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {goal.type === 'transactions' ? goal.target_value : `$${goal.target_value.toFixed(2)}`}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-2 bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${isOverAchieved ? 'bg-amber-400' : config.barColor}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>

              {/* Status Text */}
              <div className="text-xs font-medium">
                {isOverAchieved ? (
                  <span className="text-amber-400">{Math.round(percentage)}% — Goal reached! 🎉</span>
                ) : (
                  <span className="text-muted-foreground">{Math.round(percentage)}% complete</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}