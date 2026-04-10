import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target } from 'lucide-react';
import GoalToggle from '@/components/GoalToggle';

const GOAL_COLORS = {
  profit:       { color: 'var(--terrain)',  accent: 'var(--terrain-bg)',  border: 'var(--terrain-bdr)'  },
  revenue:      { color: 'var(--ocean)',    accent: 'var(--ocean-bg)',    border: 'var(--ocean-bdr)'    },
  cashback:     { color: 'var(--violet)',   accent: 'var(--violet-bg)',   border: 'var(--violet-bdr)'   },
  transactions: { color: 'var(--gold)',     accent: 'var(--gold-bg)',     border: 'var(--gold-border)'  },
};

export default function Goals({ isEmbedded = false, onSave = null }) {
  const queryClient = useQueryClient();
  const [goals, setGoals] = useState({
    profit:       { weekly: 0, monthly: 0, weeklyActive: false, monthlyActive: false },
    revenue:      { weekly: 0, monthly: 0, weeklyActive: false, monthlyActive: false },
    cashback:     { weekly: 0, monthly: 0, weeklyActive: false, monthlyActive: false },
    transactions: { weekly: 0, monthly: 0, weeklyActive: false, monthlyActive: false },
  });

  const { data: existingGoals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list(),
  });

  useEffect(() => {
    if (existingGoals.length > 0) {
      const newGoals = { ...goals };
      existingGoals.forEach(goal => {
        if (newGoals[goal.type]) {
          if (goal.timeframe === 'weekly') {
            newGoals[goal.type].weekly = goal.target_value;
            newGoals[goal.type].weeklyActive = goal.active;
          } else if (goal.timeframe === 'monthly') {
            newGoals[goal.type].monthly = goal.target_value;
            newGoals[goal.type].monthlyActive = goal.active;
          }
        }
      });
      setGoals(newGoals);
    }
  }, [existingGoals]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const existing = await base44.entities.Goal.list();
      await Promise.all(existing.map(g => base44.entities.Goal.delete(g.id)));
      const newGoals = [];
      Object.entries(goals).forEach(([type, values]) => {
        if (values.weekly > 0 || values.weeklyActive) {
          newGoals.push({ type, timeframe: 'weekly', target_value: values.weekly, active: values.weeklyActive });
        }
        if (values.monthly > 0 || values.monthlyActive) {
          newGoals.push({ type, timeframe: 'monthly', target_value: values.monthly, active: values.monthlyActive });
        }
      });
      if (newGoals.length > 0) await base44.entities.Goal.bulkCreate(newGoals);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      if (onSave) onSave();
    },
  });

  const handleValueChange = (type, timeframe, value) => {
    setGoals(prev => ({ ...prev, [type]: { ...prev[type], [timeframe]: parseFloat(value) || 0 } }));
  };

  const handleActiveChange = (type, timeframe, active) => {
    setGoals(prev => ({ ...prev, [type]: { ...prev[type], [`${timeframe}Active`]: active } }));
  };

  if (isLoading) return (
    <div style={{ padding: 24, color: 'var(--ink-dim)', fontSize: 13 }}>Loading...</div>
  );

  const goalTypes = [
    { key: 'profit',       label: 'Profit'       },
    { key: 'revenue',      label: 'Revenue'      },
    { key: 'cashback',     label: 'Cashback'     },
    { key: 'transactions', label: 'Transactions' },
  ];

  // ── Embedded mode ─────────────────────────────────────────────────────────
  if (isEmbedded) {
    return (
      <div>
        {goalTypes.map(({ key, label }, idx) => {
          const gc = GOAL_COLORS[key];
          return (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '18px 0',
              borderBottom: idx !== goalTypes.length - 1 ? '1px solid var(--parch-line)' : 'none',
            }}>
              <div style={{ width: 96, fontSize: 13, fontWeight: 700, color: gc.color, fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
                {label}
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                {['weekly', 'monthly'].map(tf => {
                  const active = goals[key][`${tf}Active`];
                  return (
                    <button key={tf}
                      onClick={() => {
                        handleActiveChange(key, tf, !goals[key][`${tf}Active`]);
                        handleActiveChange(key, tf === 'weekly' ? 'monthly' : 'weekly', false);
                      }}
                      style={{
                        padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s',
                        background: active ? 'var(--ink)' : 'transparent',
                        color: active ? 'var(--gold)' : 'var(--ink-dim)',
                        border: active ? 'none' : '1px solid var(--parch-line)',
                      }}>
                      {tf.charAt(0).toUpperCase() + tf.slice(1)}
                    </button>
                  );
                })}
              </div>

              <div style={{ position: 'relative', width: 160 }}>
                {key !== 'transactions' && (
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 13 }}>$</span>
                )}
                <input
                  type="number"
                  placeholder={key === 'transactions' ? '0' : '0.00'}
                  value={goals[key].weekly || goals[key].monthly || ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (goals[key].weeklyActive) handleValueChange(key, 'weekly', val);
                    else handleValueChange(key, 'monthly', val);
                  }}
                  style={{
                    width: '100%', height: 36, borderRadius: 8, fontSize: 13,
                    background: 'var(--parch-warm)', border: '1px solid var(--parch-line)',
                    color: 'var(--ink)', outline: 'none',
                    paddingLeft: key !== 'transactions' ? 26 : 12,
                    paddingRight: 12,
                    fontFamily: "'Cinzel', serif",
                  }}
                />
              </div>

              <GoalToggle
                checked={goals[key].weeklyActive || goals[key].monthlyActive}
                onChange={checked => {
                  handleActiveChange(key, 'weekly', checked);
                  handleActiveChange(key, 'monthly', checked);
                }}
              />
            </div>
          );
        })}

        <div style={{ paddingTop: 20, marginTop: 8 }}>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            style={{
              padding: '8px 24px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: 'var(--ink)', color: 'var(--gold)',
              border: 'none', cursor: 'pointer',
              opacity: saveMutation.isPending ? 0.6 : 1,
              fontFamily: "'Playfair Display', serif", letterSpacing: '0.04em',
            }}>
            {saveMutation.isPending ? 'Saving...' : 'Save Goals'}
          </button>
        </div>
      </div>
    );
  }

  // ── Standalone page ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Target style={{ width: 22, height: 22, color: 'var(--gold)' }} />
          <h1 style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif", fontSize: 24, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.3px' }}>
            Goal Tracking
          </h1>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
          Set profit, revenue, cashback, or transaction targets. Active goals appear on your Dashboard.
        </p>
      </div>

      <div style={{ borderRadius: 14, background: 'var(--parch-card)', border: '1px solid var(--parch-line)', overflow: 'hidden' }}>
        <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--parch-line)', background: 'var(--parch-warm)' }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Configure Your Goals</p>
          <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 2 }}>Set weekly and monthly targets for each goal type</p>
        </div>

        <div style={{ padding: '8px 20px' }}>
          {goalTypes.map(({ key, label }, idx) => {
            const gc = GOAL_COLORS[key];
            return (
              <div key={key} style={{
                padding: '20px 0',
                borderBottom: idx !== goalTypes.length - 1 ? '1px solid var(--parch-line)' : 'none',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: gc.color, marginBottom: 14, fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif", letterSpacing: '0.04em' }}>
                  {label}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {['weekly', 'monthly'].map(tf => (
                    <div key={tf} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-dim)', textTransform: 'capitalize' }}>
                          {tf} Target
                        </label>
                        <Switch
                          checked={goals[key][`${tf}Active`]}
                          onCheckedChange={checked => handleActiveChange(key, tf, checked)}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {key !== 'transactions' && (
                          <span style={{ color: 'var(--ink-ghost)', fontSize: 13 }}>$</span>
                        )}
                        <input
                          type="number"
                          placeholder="0.00"
                          value={goals[key][tf] || ''}
                          onChange={e => handleValueChange(key, tf, e.target.value)}
                          style={{
                            flex: 1, height: 36, borderRadius: 8, fontSize: 13,
                            background: 'var(--parch-warm)', border: '1px solid var(--parch-line)',
                            color: 'var(--ink)', outline: 'none', padding: '0 12px',
                            fontFamily: "'Cinzel', serif",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          style={{
            padding: '10px 32px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: 'var(--ink)', color: 'var(--gold)',
            border: 'none', cursor: 'pointer',
            opacity: saveMutation.isPending ? 0.6 : 1,
            letterSpacing: '0.04em', fontFamily: "'Playfair Display', serif",
          }}>
          {saveMutation.isPending ? 'Saving...' : 'Save Goals'}
        </button>
      </div>
    </div>
  );
}