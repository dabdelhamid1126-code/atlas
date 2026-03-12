import React from 'react';
import { Target } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function GoalTracker({ goals = {}, metrics = {} }) {
  const activeGoals = Object.entries(goals).filter(([, g]) => g?.enabled && g?.target > 0);

  const goalDefs = {
    profit:       { label: 'Profit',       color: 'bg-green-500',  textColor: 'text-green-400',  getValue: () => metrics.netProfit || 0 },
    revenue:      { label: 'Revenue',      color: 'bg-purple-500', textColor: 'text-purple-400', getValue: () => metrics.saleRevenue || 0 },
    cashback:     { label: 'Cashback',     color: 'bg-pink-500',   textColor: 'text-pink-400',   getValue: () => metrics.cashback || 0 },
    transactions: { label: 'Transactions', color: 'bg-blue-500',   textColor: 'text-blue-400',   getValue: () => metrics.totalOrders || 0 },
  };

  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-4">
      <div className="flex items-center gap-2 mb-1">
        <Target className="h-4 w-4 text-purple-400" />
        <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Goal Tracker</span>
      </div>

      {activeGoals.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-1">
          Set profit goals in{' '}
          <Link to={createPageUrl('Settings')} className="text-purple-400 underline hover:text-purple-300">
            Settings
          </Link>{' '}
          to track your progress here.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeGoals.map(([key, goal]) => {
            const def = goalDefs[key];
            if (!def) return null;
            const current = def.getValue();
            const pct = Math.min((current / goal.target) * 100, 100);
            const isAmount = key !== 'transactions';
            return (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-semibold ${def.textColor}`}>{def.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {isAmount ? `$${current.toLocaleString(undefined, { maximumFractionDigits: 0 })} / $${Number(goal.target).toLocaleString()}` : `${current} / ${goal.target}`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full rounded-full ${def.color} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(0)}% · {goal.period}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}