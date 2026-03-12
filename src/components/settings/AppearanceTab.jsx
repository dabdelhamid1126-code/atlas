import React, { useState } from 'react';

const STORAGE_KEY = 'dd_appearance';

const themes = [
  {
    key: 'midnight',
    label: 'Midnight',
    colors: ['#0f0c29', '#6d28d9', '#7c3aed'],
  },
  {
    key: 'ocean',
    label: 'Ocean',
    colors: ['#0a1628', '#0ea5e9', '#38bdf8'],
  },
  {
    key: 'forest',
    label: 'Forest',
    colors: ['#0d1f12', '#16a34a', '#22c55e'],
  },
  {
    key: 'sunset',
    label: 'Sunset',
    colors: ['#1a0a00', '#ea580c', '#f97316'],
  },
  {
    key: 'rose',
    label: 'Rose',
    colors: ['#1a0010', '#e11d48', '#fb7185'],
  },
  {
    key: 'slate',
    label: 'Slate',
    colors: ['#0f172a', '#475569', '#94a3b8'],
  },
];

export default function AppearanceTab() {
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { theme: 'midnight' }; } catch { return { theme: 'midnight' }; }
  });
  const [saved, setSaved] = useState(false);

  const update = (patch) => setPrefs(prev => ({ ...prev, ...patch }));

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <span className="text-xl">🎨</span>
        <h2 className="text-xl font-bold text-foreground">Appearance</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Customize the look and feel of your workspace.</p>

      <div className="rounded-2xl border border-border bg-card p-6 mb-4">
        <p className="text-sm font-semibold text-foreground mb-4">Color Theme</p>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(theme => {
            const isSelected = prefs.theme === theme.key;
            return (
              <button
                key={theme.key}
                onClick={() => update({ theme: theme.key })}
                className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                  isSelected ? 'border-purple-500 shadow-lg shadow-purple-900/40' : 'border-border hover:border-purple-500/50'
                }`}
              >
                {/* Swatch */}
                <div className="flex h-14">
                  <div className="flex-1" style={{ background: theme.colors[0] }} />
                  <div className="w-8" style={{ background: theme.colors[1] }} />
                  <div className="w-8" style={{ background: theme.colors[2] }} />
                </div>
                <div className={`px-3 py-2 text-xs font-medium flex items-center justify-between ${
                  isSelected ? 'bg-purple-600/20 text-purple-300' : 'bg-secondary text-muted-foreground'
                }`}>
                  {theme.label}
                  {isSelected && (
                    <svg className="h-3.5 w-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors"
      >
        {saved ? '✓ Saved!' : 'Save Appearance'}
      </button>
    </div>
  );
}