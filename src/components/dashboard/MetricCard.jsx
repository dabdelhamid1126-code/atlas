import React from 'react';

const colorConfig = {
  blue:   { border: 'border-blue-200',   bg: 'from-blue-50 to-white',     icon: 'bg-blue-100 text-blue-600',     value: 'text-blue-700' },
  green:  { border: 'border-green-200',  bg: 'from-green-50 to-white',    icon: 'bg-green-100 text-green-600',   value: 'text-green-700' },
  red:    { border: 'border-red-200',    bg: 'from-red-50 to-white',      icon: 'bg-red-100 text-red-600',       value: 'text-red-700' },
  pink:   { border: 'border-pink-200',   bg: 'from-pink-50 to-white',     icon: 'bg-pink-100 text-pink-600',     value: 'text-pink-700' },
  teal:   { border: 'border-teal-200',   bg: 'from-teal-50 to-white',     icon: 'bg-teal-100 text-teal-600',     value: 'text-teal-700' },
  purple: { border: 'border-purple-200', bg: 'from-purple-50 to-white',   icon: 'bg-purple-100 text-purple-600', value: 'text-purple-700' },
};

// Abbreviate a dollar value: handles negatives, K, M
export function abbrevDollar(val) {
  const n = Number(val);
  if (isNaN(n)) return String(val);
  const neg = n < 0;
  const abs = Math.abs(n);
  let formatted;
  if (abs >= 1_000_000) {
    formatted = `$${(abs / 1_000_000).toFixed(1)}M`;
  } else if (abs >= 10_000) {
    formatted = `$${(abs / 1_000).toFixed(1)}K`;
  } else {
    formatted = `$${abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return neg ? `-${formatted}` : formatted;
}

export default function MetricCard({ label, value, sub, color, icon }) {
  const c = colorConfig[color] || colorConfig.blue;
  return (
    <div className={`rounded-2xl border ${c.border} bg-gradient-to-br ${c.bg} p-5 shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase leading-tight">{label}</p>
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ml-2 ${c.icon}`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold leading-tight ${c.value}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1 leading-snug">{sub}</p>}
    </div>
  );
}