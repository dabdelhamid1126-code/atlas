import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'dd_goals';

const goalDefs = [
  { key: 'profit',       label: 'Profit',       color: 'text-green-400' },
  { key: 'revenue',      label: 'Revenue',      color: 'text-purple-400' },
  { key: 'cashback',     label: 'Cashback',     color: 'text-pink-400' },
  { key: 'transactions', label: 'Transactions', color: 'text-teal-400', noPrefix: true },
];

const defaultGoal = () => ({ period: 'weekly', target: '', enabled: false });

export default function GoalsTab() {
  const [goals, setGoals] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  });
  const [saved, setSaved] = useState(false);

  const get = (key) => goals[key] || defaultGoal();

  const update = (key, patch) => {
    setGoals(prev => ({ ...prev, [key]: { ...get(key), ...patch } }));
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <span className="text-xl">🎯</span>
        <h2 className="text-xl font-bold text-foreground">Goal Tracking</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Set profit, revenue, cashback, or volume targets. Active goals appear on your Dashboard.</p>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {goalDefs.map(({ key, label, color, noPrefix }) => {
          const g = get(key);
          return (
            <div key={key} className="flex items-center gap-6 px-6 py-5">
              {/* Label */}
              <span className={`w-28 text-sm font-semibold ${color}`}>{label}</span>

              {/* Period toggle */}
              <div className="flex rounded-lg overflow-hidden border border-border">
                {['weekly', 'monthly'].map(p => (
                  <button
                    key={p}
                    onClick={() => update(key, { period: p })}
                    className={`px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
                      g.period === p
                        ? 'bg-purple-600 text-white'
                        : 'bg-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>

              {/* Target input */}
              <div className="flex items-center bg-secondary border border-border rounded-xl px-3 py-2 flex-1 max-w-[160px]">
                {!noPrefix && <span className="text-muted-foreground mr-1 text-sm">$</span>}
                <input
                  type="number"
                  min="0"
                  step={noPrefix ? '1' : '0.01'}
                  value={g.target}
                  onChange={e => update(key, { target: e.target.value })}
                  placeholder={noPrefix ? '0' : '0.00'}
                  className="bg-transparent outline-none text-foreground text-sm w-full"
                />
              </div>

              {/* Toggle */}
              <Switch
                checked={!!g.enabled}
                onCheckedChange={v => update(key, { enabled: v })}
              />
            </div>
          );
        })}
      </div>

      <Button
        onClick={handleSave}
        className="mt-6 bg-purple-600 hover:bg-purple-700 text-white px-6 rounded-xl"
      >
        {saved ? 'Saved!' : 'Save Goals'}
      </Button>
    </div>
  );
}