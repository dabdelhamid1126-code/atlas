import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

function abbrevDollar(n) {
  const abs = Math.abs(n || 0);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000)    return `$${(n / 1_000).toFixed(1)}K`;
  return `$${(n || 0).toFixed(2)}`;
}

const GOAL_CONFIG = {
  profit:       { label: 'Monthly Profit',   color: 'var(--gold)',    border: 'var(--gold)',    bar: 'linear-gradient(90deg,#8b6914,#b8860b,#d4a017)', suffix: '✦' },
  revenue:      { label: 'Monthly Revenue',  color: 'var(--ocean)',   border: 'var(--ocean2)',  bar: 'linear-gradient(90deg,var(--ocean),var(--ocean2))',  suffix: '' },
  cashback:     { label: 'Monthly Cashback', color: 'var(--violet)',  border: 'var(--violet2)', bar: 'linear-gradient(90deg,var(--violet),var(--violet2))', suffix: '' },
  transactions: { label: 'Transactions',     color: 'var(--terrain)', border: 'var(--terrain2)',bar: 'linear-gradient(90deg,var(--terrain),var(--terrain2))', suffix: '' },
};

export default function GoalTracker({ metrics }) {
  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list(),
  });

  const activeGoals = goals.filter(g => g.active);
  if (activeGoals.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
      {activeGoals.map(goal => {
        const config   = GOAL_CONFIG[goal.type] || GOAL_CONFIG.profit;
        const current  = goal.type === 'profit' ? (metrics.netProfit || 0)
          : goal.type === 'revenue'  ? (metrics.saleRevenue || 0)
          : goal.type === 'cashback' ? (metrics.cashback || 0)
          : 0;
        const isNeg    = current < 0;
        const pct      = (!goal.target_value || isNeg) ? 0 : Math.min((current / goal.target_value) * 100, 100);
        const reached  = goal.target_value > 0 && !isNeg && current >= goal.target_value;
        const barColor = isNeg ? 'linear-gradient(90deg, var(--crimson), var(--crimson2))' : config.bar;

        return (
          <div key={`${goal.type}-${goal.timeframe}`}
            style={{ borderRadius: 12, padding: 14, background: 'var(--parch-card)', border: `1px solid var(--parch-line)`, borderTop: `3px solid ${config.border}` }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: config.color, marginBottom: 4 }}>
              {config.label}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: isNeg ? 'var(--crimson)' : config.color }}>
                {goal.type === 'transactions' ? current : abbrevDollar(current)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
                / {goal.type === 'transactions' ? goal.target_value : abbrevDollar(goal.target_value)}
              </span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: 'var(--parch-warm)', overflow: 'hidden', margin: '8px 0 5px' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: barColor, transition: 'width 0.5s ease' }} />
            </div>
            <p style={{ fontSize: 10, fontWeight: 600, color: reached ? 'var(--terrain)' : isNeg ? 'var(--crimson)' : config.color }}>
              {reached ? `Goal reached! ${config.suffix}` : isNeg ? 'Negative value' : `${Math.round(pct)}% complete`}
            </p>
          </div>
        );
      })}
    </div>
  );
}