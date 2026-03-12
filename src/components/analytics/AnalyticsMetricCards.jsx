import React from 'react';

const cards = [
  { key: 'revenue',    label: 'REVENUE',    bg: '#4c1d95', fmt: v => `$${v.toFixed(2)}` },
  { key: 'cost',       label: 'COST',       bg: '#7f1d1d', fmt: v => `$${v.toFixed(2)}` },
  { key: 'profit',     label: 'PROFIT',     bg: '#14532d', fmt: v => `$${v.toFixed(2)}`, sub: () => 'after commission' },
  { key: 'roi',        label: 'ROI',        bg: '#3b0764', fmt: v => `${v.toFixed(2)}%`, sub: v => v >= 0 ? 'profitable' : 'loss' },
  { key: 'cashback',   label: 'CASHBACK',   bg: '#164e63', fmt: v => `$${v.toFixed(2)}` },
  { key: 'commission', label: 'COMMISSION', bg: '#451a03', fmt: v => `$${v.toFixed(2)}` },
  { key: 'topStore',   label: 'TOP STORE',  bg: '#0f172a', fmt: v => v || '—' },
  { key: 'storeCount', label: 'INVENTORY',  bg: '#0f172a', fmt: v => v.toString(), sub: () => 'store count' },
];

export default function AnalyticsMetricCards({ metrics }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map(({ key, label, bg, fmt, sub }) => {
        const val = metrics[key] ?? 0;
        return (
          <div
            key={key}
            className="rounded-xl p-4 flex flex-col gap-1.5 min-w-0"
            style={{ background: bg }}
          >
            <p className="text-[10px] font-bold tracking-widest text-white/60 uppercase">{label}</p>
            <p className="text-lg font-bold text-white truncate">{fmt(val)}</p>
            {sub && <p className="text-[10px] text-white/50">{sub(val)}</p>}
          </div>
        );
      })}
    </div>
  );
}