import React, { useState } from 'react';
import { THEMES, applyTheme } from '@/components/ThemeProvider';

const STORAGE_KEY = 'dd_appearance';
const THEME_ORDER = ['dark', 'light', 'midnight', 'sunset', 'tron', 'matrix'];

export default function AppearanceTab() {
  const [selected, setSelected] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY))?.theme || 'midnight'; } catch { return 'midnight'; }
  });
  const [saved, setSaved] = useState(false);

  const handleSelect = (key) => {
    setSelected(key);
    applyTheme(key);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: selected }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <span className="text-xl">🎨</span>
        <h2 className="text-xl font-bold text-foreground">Appearance</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Choose a color theme. Changes apply instantly across the entire app.</p>

      <div className="rounded-2xl border border-border bg-card p-6 mb-4">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-4">Color Theme</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {THEME_ORDER.map(key => {
            const theme = THEMES[key];
            const isSelected = selected === key;
            return (
              <button
                key={key}
                onClick={() => handleSelect(key)}
                className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${
                  isSelected
                    ? 'border-purple-500 shadow-lg shadow-purple-900/30'
                    : 'border-border hover:border-purple-400/50'
                }`}
              >
                {/* Preview swatch */}
                <div className="flex h-16">
                  <div className="flex-1" style={{ background: theme.bgColor }} />
                  <div className="w-10" style={{ background: theme.accent1 }} />
                  <div className="w-10" style={{ background: theme.accent2 }} />
                </div>
                {/* Label row */}
                <div
                  className="px-3 py-2 flex items-center justify-between"
                  style={{ background: isSelected ? `${theme.accent1}22` : theme.bgColor, borderTop: `1px solid ${theme.accent1}33` }}
                >
                  <span className="text-xs font-semibold" style={{ color: isSelected ? theme.accent1 : '#9ca3af' }}>
                    {theme.label}
                  </span>
                  {isSelected && (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke={theme.accent1} strokeWidth={3}>
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
        className="px-6 py-2.5 bg-primary hover:opacity-90 text-primary-foreground text-sm font-medium rounded-xl transition-all"
      >
        {saved ? '✓ Saved!' : 'Save Theme'}
      </button>
    </div>
  );
}