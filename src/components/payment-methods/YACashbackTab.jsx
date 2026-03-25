import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Star, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';

const fmt$ = (v) => `$${(v || 0).toFixed(2)}`;
const abbrev$ = (v) => {
  const n = Math.abs(v || 0);
  if (n >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${(v || 0).toFixed(2)}`;
};

export default function YACashbackTab() {
  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ['rewards'],
    queryFn: () => base44.entities.Reward.list('-date_earned'),
  });
  const { data: orders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-order_date', 200),
  });

  const yaRewards = useMemo(() => rewards.filter(r =>
    r.notes?.includes('Young Adult') || r.notes?.includes('YACB') || r.notes?.includes('Prime Young Adult')
  ), [rewards]);

  const stats = useMemo(() => {
    const earned = yaRewards.reduce((s, r) => s + (r.amount || 0), 0);
    const redeemed = yaRewards.filter(r => r.status === 'redeemed').reduce((s, r) => s + (r.amount || 0), 0);
    const pending = yaRewards.filter(r => r.status === 'pending').reduce((s, r) => s + (r.amount || 0), 0);
    const available = earned - redeemed;
    return { earned, redeemed, pending, available, count: yaRewards.length };
  }, [yaRewards]);

  // Group by month
  const byMonth = useMemo(() => {
    const map = {};
    yaRewards.forEach(r => {
      const key = r.date_earned?.substring(0, 7) || 'Unknown';
      if (!map[key]) map[key] = { month: key, earned: 0, count: 0 };
      map[key].earned += r.amount || 0;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
  }, [yaRewards]);

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading YA Cashback data...</div>;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total YA Earned', value: abbrev$(stats.earned), color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: <Star className="h-4 w-4 text-amber-500" /> },
          { label: 'YA Available', value: abbrev$(stats.available), color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: <DollarSign className="h-4 w-4 text-green-500" /> },
          { label: 'YA Spent/Used', value: abbrev$(stats.redeemed), color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: <ShoppingBag className="h-4 w-4 text-blue-500" /> },
          { label: 'YA Pending', value: abbrev$(stats.pending), color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', icon: <TrendingUp className="h-4 w-4 text-violet-500" /> },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
            <div className="flex items-center gap-2 mb-1">{s.icon}<p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.label}</p></div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {yaRewards.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Star className="h-10 w-10 text-amber-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">No YA Cashback Recorded</p>
          <p className="text-sm text-slate-400 mt-1">YA cashback appears here when orders include "Prime Young Adult" or "YACB" in bonus notes.</p>
        </div>
      ) : (
        <>
          {/* Monthly breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-4">Monthly YA Activity</p>
            <div className="space-y-2">
              {byMonth.map(m => (
                <div key={m.month} className="flex items-center gap-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">{m.month}</p>
                    <p className="text-[11px] text-slate-400">{m.count} reward{m.count !== 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-base font-bold text-amber-700">{fmt$(m.earned)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reward list */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-700 mb-4">YA Reward History ({stats.count})</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Date', 'Order #', 'Amount', 'Status', 'Notes'].map(h => (
                      <th key={h} className="pb-2 text-left font-semibold text-slate-400 uppercase tracking-wider text-[10px] px-2 first:pl-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {yaRewards.map(r => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pl-0 px-2 text-slate-500">{r.date_earned || '—'}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-600">{r.order_number || '—'}</td>
                      <td className="py-2.5 px-2 font-bold text-amber-600">{fmt$(r.amount)}</td>
                      <td className="py-2.5 px-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.status === 'redeemed' ? 'bg-blue-100 text-blue-700' : r.status === 'earned' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-slate-400 max-w-xs truncate">{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}