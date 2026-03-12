import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const colorConfig = {
  blue:   { border: 'border-blue-500/20',   bg: 'from-blue-600/15 to-blue-900/5',   icon: 'bg-blue-500/20 text-blue-400',   value: 'text-blue-400' },
  green:  { border: 'border-green-500/20',  bg: 'from-green-600/15 to-green-900/5', icon: 'bg-green-500/20 text-green-400', value: 'text-green-400' },
  pink:   { border: 'border-pink-500/20',   bg: 'from-pink-600/15 to-pink-900/5',   icon: 'bg-pink-500/20 text-pink-400',   value: 'text-pink-400' },
  teal:   { border: 'border-teal-500/20',   bg: 'from-teal-600/15 to-teal-900/5',   icon: 'bg-teal-500/20 text-teal-400',   value: 'text-teal-400' },
  purple: { border: 'border-purple-500/20', bg: 'from-purple-600/15 to-purple-900/5', icon: 'bg-purple-500/20 text-purple-400', value: 'text-purple-400' },
};

export default function MetricCard({ label, value, sub, color, icon }) {
  const c = colorConfig[color] || colorConfig.blue;
  return (
    <Card className={`overflow-hidden border ${c.border} bg-gradient-to-br ${c.bg}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{label}</p>
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${c.icon}`}>
            {icon}
          </div>
        </div>
        <p className={`text-2xl font-bold ${c.value}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}