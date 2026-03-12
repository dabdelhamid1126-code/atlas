import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingCart, DollarSign, Percent, Gift, Award, Store, Package, ArrowUpRight } from 'lucide-react';

const fmtCurrency = v => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
};

const CARDS = [
  { key: 'revenue',    label: 'Revenue',    bg: '#1e1b4b', accent: '#818cf8', border: '#4f46e5', Icon: TrendingUp,   fmt: fmtCurrency,              sub: 'Total income',        sparkKey: 'revenue'    },
  { key: 'cost',       label: 'Cost',       bg: '#450a0a', accent: '#f87171', border: '#dc2626', Icon: ShoppingCart, fmt: fmtCurrency,              sub: 'Total spent',         sparkKey: 'cost'       },
  { key: 'profit',     label: 'Profit',     bg: '#052e16', accent: '#4ade80', border: '#16a34a', Icon: DollarSign,   fmt: fmtCurrency,              sub: 'After expenses',      sparkKey: 'profit'     },
  { key: 'roi',        label: 'ROI',        bg: '#2e1065', accent: '#c084fc', border: '#7c3aed', Icon: Percent,      fmt: v => `${v.toFixed(1)}%`,  sub: 'Return on invest.',   sparkKey: null         },
  { key: 'cashback',   label: 'Cashback',   bg: '#4a0d2e', accent: '#f472b6', border: '#db2777', Icon: Gift,         fmt: fmtCurrency,              sub: 'Rewards earned',      sparkKey: 'cashback'   },
  { key: 'commission', label: 'Commission', bg: '#431407', accent: '#fbbf24', border: '#d97706', Icon: Award,        fmt: fmtCurrency,              sub: 'Fees paid',           sparkKey: 'commission' },
  { key: 'topStore',   label: 'Top Store',  bg: '#042f2e', accent: '#2dd4bf', border: '#0f766e', Icon: Store,        fmt: v => v || '—',            sub: 'Most ordered'                                },
  { key: 'storeCount', label: 'Inventory',  bg: '#1e1b4b', accent: '#6366f1', border: '#3730a3', Icon: Package,      fmt: v => String(v),           sub: 'Store count'                                 },
];

export default function AnalyticsMetricCards({ metrics, trendData = [] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
      {CARDS.map(({ key, label, bg, accent, border, Icon, fmt, sub, sparkKey }) => {
        const val = metrics[key] ?? 0;
        const sparkData = sparkKey && trendData.length > 1
          ? trendData.map((d, i) => ({ i, v: d[sparkKey] ?? 0 }))
          : [];

        return (
          <div
            key={key}
            className="rounded-xl flex flex-col gap-1.5 relative overflow-hidden"
            style={{ background: bg, borderLeft: `3px solid ${border}`, padding: '14px 14px 0 14px' }}
          >
            {/* Icon + arrow row */}
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg" style={{ background: `${accent}22` }}>
                <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5" style={{ color: accent }} />
            </div>

            {/* Value */}
            <p className="text-base font-bold text-white leading-snug" style={{ wordBreak: 'break-all' }}>
              {fmt(val)}
            </p>

            {/* Label */}
            <p className="text-[9px] font-extrabold tracking-widest uppercase" style={{ color: `${accent}bb` }}>
              {label}
            </p>

            {/* Sub */}
            <p className="text-[10px] text-white/40">{sub}</p>

            {/* Sparkline */}
            {sparkData.length > 1 ? (
              <div className="h-10 -mx-3.5 mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparkData}>
                    <Line type="monotone" dataKey="v" stroke={accent} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-4" />
            )}
          </div>
        );
      })}
    </div>
  );
}