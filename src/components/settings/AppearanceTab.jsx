import React, { useState, useEffect } from 'react';
import { applyTheme, getActiveTheme } from '@/App';

const THEME_OPTIONS = [
  { key: 'dark', name: 'Dark', desc: 'Deep navy base with purple accents' },
  { key: 'darker', name: 'Darker', desc: 'Pure black with violet accents' },
  { key: 'midnight', name: 'Midnight', desc: 'Deep blue base with indigo accents' },
  { key: 'slate', name: 'Slate', desc: 'Dark gray with cool tones' },
  { key: 'light', name: 'Light', desc: 'White/light with dark text' },
];

export default function AppearanceTab() {
  const [selected, setSelected] = useState(() => getActiveTheme());
  const [saved, setSaved] = useState(false);

  const handleSelect = (key) => {
    setSelected(key);
    applyTheme(key);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <span className="text-xl">🎨</span>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Appearance</h2>
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Choose a color theme. Changes apply instantly across the entire app.</p>

      <div className="rounded-2xl p-6 mb-4" style={{ background: 'var(--bg-card)', border: `1px solid var(--border-color)` }}>
        <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--text-muted)' }}>Color Theme</p>
        <div className="space-y-2">
          {THEME_OPTIONS.map(theme => {
            const isSelected = selected === theme.key;
            return (
              <button
                key={theme.key}
                onClick={() => handleSelect(theme.key)}
                className="w-full px-4 py-3 rounded-xl transition-all text-left flex items-start gap-3"
                style={{
                  background: isSelected ? 'var(--bg-hover)' : 'transparent',
                  border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                }}
              >
                <input type="radio" checked={isSelected} onChange={() => {}} className="mt-1 accent-purple-500" />
                <div className="flex-1">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{theme.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{theme.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="px-6 py-2.5 text-sm font-medium rounded-xl transition-all text-white"
        style={{ background: 'var(--accent-primary)' }}
      >
        {saved ? '✓ Saved!' : 'Save Theme'}
      </button>
    </div>
  );
}