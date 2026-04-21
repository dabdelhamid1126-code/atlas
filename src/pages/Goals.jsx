import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, TrendingUp, DollarSign, Percent, ShoppingBag, Check, AlertCircle } from 'lucide-react';
import GoalToggle from '@/components/GoalToggle';

const GOAL_CONFIGS = {
  profit:       { label: 'Profit',       icon: TrendingUp,  color: 'var(--terrain2)', bg: 'var(--terrain-bg)',  border: 'var(--terrain-bdr)',  prefix: '$', desc: 'Net profit after cost' },
  revenue:      { label: 'Revenue',      icon: DollarSign,  color: 'var(--ocean2)',   bg: 'var(--ocean-bg)',    border: 'var(--ocean-bdr)',    prefix: '$', desc: 'Total sale revenue'   },
  cashback:     { label: 'Cashback',     icon: Percent,     color: 'var(--violet2)',  bg: 'var(--violet-bg)',   border: 'var(--violet-bdr)',   prefix: '$', desc: 'USD rewards earned'   },
  transactions: { label: 'Transactions', icon: ShoppingBag, color: 'var(--gold)',     bg: 'var(--gold-bg)',     border: 'var(--gold-border)',  prefix: '',  desc: 'Orders placed'        },
};

const fmt = (key, val) => {
  if (!val && val !== 0) return '—';
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  if (key === 'transactions') return Math.round(n).toLocaleString();
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const pct = (current, target) => {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
};

/* ── Progress Bar ── */
function ProgressBar({ value, color, animated = true }) {
  const clamped = Math.min(100, Math.max(0, value));
  const isComplete = clamped >= 100;
  return (
    <div style={{ height: 6, borderRadius: 99, background: 'var(--parch-deep)', overflow: 'hidden', marginTop: 8 }}>
      <div style={{
        height: '100%',
        width: `${clamped}%`,
        borderRadius: 99,
        background: isComplete ? 'var(--terrain2)' : color,
        transition: animated ? 'width 0.8s cubic-bezier(0.4,0,0.2,1)' : 'none',
      }}/>
    </div>
  );
}

/* ── KPI Progress Card ── */
function GoalProgressCard({ goalKey, weeklyGoal, monthlyGoal, metrics }) {
  const cfg = GOAL_CONFIGS[goalKey];
  const Icon = cfg.icon;

  const activeGoal = weeklyGoal?.active ? weeklyGoal : monthlyGoal?.active ? monthlyGoal : null;
  const current = metrics?.[goalKey] ?? 0;
  const target = activeGoal?.target_value ?? 0;
  const progress = pct(current, target);
  const isComplete = progress >= 100;
  const timeframe = activeGoal?.timeframe ?? null;

  return (
    <div className="kpi-card fade-up" style={{ borderTopColor: cfg.color }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div className="kpi-label">{cfg.label}</div>
        <div style={{
          width: 26, height: 26, borderRadius: 7, background: cfg.bg,
          border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: 12, height: 12, color: cfg.color }}/>
        </div>
      </div>

      <div className="kpi-value" style={{ color: cfg.color }}>{fmt(goalKey, current)}</div>

      {activeGoal ? (
        <>
          <div className="kpi-sub" style={{ marginTop: 2 }}>
            {isComplete
              ? <span style={{ color: 'var(--terrain2)', fontWeight: 700 }}>✓ Goal reached!</span>
              : <span>Target: {fmt(goalKey, target)} {timeframe && `(${timeframe})`}</span>
            }
          </div>
          <ProgressBar value={progress} color={cfg.color}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--ink-ghost)', fontFamily: 'var(--font-mono)' }}>{progress}%</span>
            <span style={{ fontSize: 10, color: 'var(--ink-ghost)', fontFamily: 'var(--font-serif)' }}>
              {fmt(goalKey, Math.max(0, target - current))} to go
            </span>
          </div>
        </>
      ) : (
        <div className="kpi-sub" style={{ marginTop: 4 }}>
          <span style={{ color: 'var(--ink-ghost)' }}>No active goal</span>
        </div>
      )}
    </div>
  );
}

export default function Goals({ isEmbedded = false, onSave = null }) {
  const queryClient = useQueryClient();
  const [goals, setGoals] = useState({
    profit:       { weekly: 0, monthly: 0, weeklyActive: false, monthlyActive: false },
    revenue:      { weekly: 0, monthly: 0, weeklyActive: false, monthlyActive: false },
    cashback:     { weekly: 0, monthly: 0, weeklyActive: false, monthlyActive: false },
    transactions: { weekly: 0, monthly: 0, weeklyActive: false, monthlyActive: false },
  });
  const [saved, setSaved] = useState(false);

  const { data: existingGoals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list(),
  });

  // Load current metrics from orders/rewards
  const { data: orders = [] } = useQuery({
    queryKey: ['goalsOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list(),
  });
  const { data: rewards = [] } = useQuery({
    queryKey: ['goalsRewards'],
    queryFn: () => base44.entities.Reward.list(),
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

  // Current metrics (this month)
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthOrders = orders.filter(o => new Date(o.created_date || o.created_at || 0) >= startOfMonth);
    const monthRewards = rewards.filter(r => new Date(r.created_date || r.created_at || 0) >= startOfMonth);

    const cost = monthOrders.reduce((s, o) => s + parseFloat(o.final_cost || o.total_cost || 0), 0);
    const revenue = monthOrders.reduce((s, o) =>
      s + (o.sale_events || []).reduce((ss, ev) =>
        ss + (ev.items || []).reduce((is, it) =>
          is + (parseFloat(it.sale_price) || 0) * (parseInt(it.qty) || 1), 0), 0), 0);
    const cashback = monthRewards.filter(r => r.currency === 'USD').reduce((s, r) => s + (r.amount || 0), 0);
    const profit = revenue - cost + cashback;

    return {
      profit: Math.max(0, profit),
      revenue,
      cashback,
      transactions: monthOrders.length,
    };
  }, [orders, rewards]);

  // Build goal lookup for cards
  const goalLookup = useMemo(() => {
    const lookup = {};
    existingGoals.forEach(g => {
      if (!lookup[g.type]) lookup[g.type] = {};
      lookup[g.type][g.timeframe] = g;
    });
    return lookup;
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
      queryClient.invalidateQueries({ queryKey: ['goalsOrders'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (onSave) onSave();
    },
  });

  const handleValueChange = (type, timeframe, value) => {
    setGoals(prev => ({ ...prev, [type]: { ...prev[type], [timeframe]: parseFloat(value) || 0 } }));
    setSaved(false);
  };

  const handleActiveChange = (type, timeframe, active) => {
    setGoals(prev => ({ ...prev, [type]: { ...prev[type], [`${timeframe}Active`]: active } }));
    setSaved(false);
  };

  const goalTypes = [
    { key: 'profit',       label: 'Profit'       },
    { key: 'revenue',      label: 'Revenue'      },
    { key: 'cashback',     label: 'Cashback'     },
    { key: 'transactions', label: 'Transactions' },
  ];

  const hasAnyActive = Object.values(goals).some(g => g.weeklyActive || g.monthlyActive);

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 24, color: 'var(--ink-dim)', fontSize: 13 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--parch-line)', borderTopColor: 'var(--gold)', animation: 'spin 0.8s linear infinite' }}/>
      Loading goals...
    </div>
  );

  // ── Embedded mode (used in Settings) ──────────────────────────────────────
  if (isEmbedded) {
    return (
      <div>
        {goalTypes.map(({ key, label }, idx) => {
          const gc = GOAL_CONFIGS[key];
          return (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', flexWrap: 'wrap',
              borderBottom: idx !== goalTypes.length - 1 ? '1px solid var(--parch-line)' : 'none',
            }}>
              <div style={{ width: 96, fontSize: 13, fontWeight: 700, color: gc.color, fontFamily: 'var(--font-serif)' }}>
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
                  type="number" placeholder={key === 'transactions' ? '0' : '0.00'}
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
                    paddingLeft: key !== 'transactions' ? 26 : 12, paddingRight: 12,
                    fontFamily: 'var(--font-serif)',
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
        <div style={{ paddingTop: 20, marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
            style={{
              padding: '8px 24px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: 'var(--ink)', color: 'var(--gold)', border: 'none', cursor: 'pointer',
              opacity: saveMutation.isPending ? 0.6 : 1, fontFamily: 'var(--font-serif)',
            }}>
            {saveMutation.isPending ? 'Saving...' : 'Save Goals'}
          </button>
          {saved && <span style={{ fontSize: 12, color: 'var(--terrain2)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-serif)' }}><Check style={{ width: 13, height: 13 }}/> Saved</span>}
        </div>
      </div>
    );
  }

  // ── Standalone page ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Target style={{ width: 20, height: 20, color: 'var(--gold)' }}/>
            <h1 className="page-title">Goal Tracking</h1>
          </div>
          <p className="page-subtitle">Set targets and track your progress. Active goals appear on your Dashboard.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {hasAnyActive && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
              background: 'var(--terrain-bg)', color: 'var(--terrain2)', border: '1px solid var(--terrain-bdr)',
              fontFamily: 'var(--font-serif)',
            }}>
              {Object.values(goals).filter(g => g.weeklyActive || g.monthlyActive).length} active
            </span>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {!hasAnyActive && existingGoals.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '40px 24px', borderRadius: 14, background: 'var(--parch-card)',
          border: '1px dashed var(--parch-deep)', textAlign: 'center', gap: 10,
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target style={{ width: 22, height: 22, color: 'var(--gold)' }}/>
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-serif)', margin: 0 }}>No goals set yet</p>
          <p style={{ fontSize: 12, color: 'var(--ink-dim)', margin: 0, maxWidth: 300, fontFamily: 'var(--font-serif)' }}>
            Set weekly or monthly targets below for profit, revenue, cashback, or transactions. They'll show as progress bars on your Dashboard.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-ghost)', fontFamily: 'var(--font-serif)' }}>
            <AlertCircle style={{ width: 12, height: 12 }}/> Scroll down to configure
          </div>
        </div>
      )}

      {/* ── KPI Progress Cards ── */}
      {hasAnyActive && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }}/>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faded)', fontFamily: 'var(--font-serif)' }}>This Month's Progress</span>
          </div>
          <div className="grid-kpi">
            {goalTypes.map(({ key }) => (
              <GoalProgressCard
                key={key}
                goalKey={key}
                weeklyGoal={goalLookup[key]?.weekly}
                monthlyGoal={goalLookup[key]?.monthly}
                metrics={metrics}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Configure Goals ── */}
      <div style={{ borderRadius: 12, background: 'var(--parch-card)', border: '1px solid var(--parch-line)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--parch-line)', background: 'var(--parch-warm)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target style={{ width: 14, height: 14, color: 'var(--gold)' }}/>
          <div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Configure Your Goals</p>
            <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 1, fontFamily: 'var(--font-serif)' }}>Set weekly and monthly targets. Toggle to activate on Dashboard.</p>
          </div>
        </div>

        <div style={{ padding: '4px 20px 8px' }}>
          {goalTypes.map(({ key, label }, idx) => {
            const gc = GOAL_CONFIGS[key];
            const Icon = gc.icon;
            const isLastRow = idx === goalTypes.length - 1;
            return (
              <div key={key} style={{
                padding: '18px 0',
                borderBottom: !isLastRow ? '1px solid var(--parch-line)' : 'none',
              }}>
                {/* Goal header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: gc.bg, border: `1px solid ${gc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon style={{ width: 13, height: 13, color: gc.color }}/>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: gc.color, fontFamily: 'var(--font-serif)', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 10, color: 'var(--ink-ghost)', fontFamily: 'var(--font-serif)', margin: 0 }}>{gc.desc}</p>
                  </div>
                </div>

                {/* Weekly + Monthly inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  {['weekly', 'monthly'].map(tf => {
                    const isActive = goals[key][`${tf}Active`];
                    return (
                      <div key={tf} style={{
                        padding: '12px 14px', borderRadius: 10,
                        background: isActive ? gc.bg : 'var(--parch-warm)',
                        border: `1px solid ${isActive ? gc.border : 'var(--parch-line)'}`,
                        transition: 'all 0.2s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: isActive ? gc.color : 'var(--ink-dim)', fontFamily: 'var(--font-serif)', textTransform: 'capitalize', letterSpacing: '0.06em' }}>
                            {tf} Target
                          </label>
                          <Switch
                            checked={goals[key][`${tf}Active`]}
                            onCheckedChange={checked => handleActiveChange(key, tf, checked)}
                          />
                        </div>
                        <div style={{ position: 'relative' }}>
                          {key !== 'transactions' && (
                            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>$</span>
                          )}
                          <input
                            type="number" placeholder={key === 'transactions' ? '0' : '0'}
                            value={goals[key][tf] || ''}
                            onChange={e => handleValueChange(key, tf, e.target.value)}
                            style={{
                              width: '100%', height: 36, borderRadius: 8, fontSize: 13,
                              background: 'var(--parch-card)', border: `1px solid ${isActive ? gc.border : 'var(--parch-line)'}`,
                              color: 'var(--ink)', outline: 'none',
                              paddingLeft: key !== 'transactions' ? 26 : 12, paddingRight: 12,
                              fontFamily: 'var(--font-mono)', transition: 'border-color 0.2s',
                            }}
                          />
                        </div>
                        {isActive && goals[key][tf] > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <ProgressBar value={pct(metrics[key], goals[key][tf])} color={gc.color}/>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                              <span style={{ fontSize: 10, color: gc.color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                                {pct(metrics[key], goals[key][tf])}%
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--ink-ghost)', fontFamily: 'var(--font-serif)' }}>
                                {fmt(key, metrics[key])} / {fmt(key, goals[key][tf])}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Save ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
          style={{
            padding: '10px 32px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: 'var(--ink)', color: 'var(--ne-cream)', border: 'none', cursor: 'pointer',
            opacity: saveMutation.isPending ? 0.6 : 1, fontFamily: 'var(--font-serif)',
            transition: 'opacity 0.15s',
          }}>
          {saveMutation.isPending ? 'Saving...' : 'Save Goals'}
        </button>
        {saved && (
          <span style={{ fontSize: 12, color: 'var(--terrain2)', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-serif)' }}>
            <Check style={{ width: 13, height: 13 }}/> Goals saved successfully
          </span>
        )}
      </div>
    </div>
  );
}