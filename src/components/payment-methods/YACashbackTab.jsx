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
    const earned   = yaRewards.reduce((s, r) => s + (r.amount || 0), 0);
    const redeemed = yaRewards.filter(r => r.status === 'redeemed').reduce((s, r) => s + (r.amount || 0), 0);
    const pending  = yaRewards.filter(r => r.status === 'pending').reduce((s, r) => s + (r.amount || 0), 0);
    const available = earned - redeemed;
    return { earned, redeemed, pending, available, count: yaRewards.length };
  }, [yaRewards]);

  const byMonth = useMemo(() => {
    const map = {};
    yaRewards.forEach(r => {
      const key = r.date_earned?.substring(0, 7) || 'Unknown';
      if (!map[key]) map[key] = { month: key, earned: 0, count: 0 };
      map[key].earned += r.amount || 0;
      map[key].count  += 1;
    });
    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month));
  }, [yaRewards]);

  if (isLoading) return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:24, color:'var(--ink-dim)', fontSize:13, fontFamily:'var(--font-serif)' }}>
      <div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid var(--parch-line)', borderTopColor:'var(--gold)', animation:'spin 0.8s linear infinite' }}/>
      Loading YA Cashback...
    </div>
  );

  const kpis = [
    { label:'Total YA Earned', value:abbrev$(stats.earned),    color:'var(--gold)',    accent:'var(--gold-bg)',    border:'var(--gold-bdr)',    icon:Star        },
    { label:'YA Available',    value:abbrev$(stats.available), color:'var(--terrain2)',accent:'var(--terrain-bg)', border:'var(--terrain-bdr)', icon:DollarSign  },
    { label:'YA Spent / Used', value:abbrev$(stats.redeemed),  color:'var(--ocean2)',  accent:'var(--ocean-bg)',   border:'var(--ocean-bdr)',   icon:ShoppingBag },
    { label:'YA Pending',      value:abbrev$(stats.pending),   color:'var(--violet2)', accent:'var(--violet-bg)',  border:'var(--violet-bdr)',  icon:TrendingUp  },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── KPI cards ── */}
      <div className="grid-kpi">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="kpi-card fade-up" style={{ borderTopColor: k.color }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <div className="kpi-label">{k.label}</div>
                <div style={{ width:26, height:26, borderRadius:7, background:k.accent, border:`1px solid ${k.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon style={{ width:12, height:12, color:k.color }}/>
                </div>
              </div>
              <div className="kpi-value" style={{ color:k.color }}>{k.value}</div>
            </div>
          );
        })}
      </div>

      {/* ── Empty state ── */}
      {yaRewards.length === 0 ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 24px', borderRadius:14, background:'var(--parch-card)', border:'1px dashed var(--parch-deep)', textAlign:'center', gap:10 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:'var(--gold-bg)', border:'1px solid var(--gold-bdr)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Star style={{ width:22, height:22, color:'var(--gold)' }}/>
          </div>
          <p style={{ fontSize:15, fontWeight:700, color:'var(--ink)', fontFamily:'var(--font-serif)', margin:0 }}>No YA Cashback Recorded</p>
          <p style={{ fontSize:12, color:'var(--ink-dim)', margin:0, maxWidth:360, fontFamily:'var(--font-serif)' }}>
            YA cashback appears here when orders include "Prime Young Adult" or "YACB" in bonus notes.
          </p>
        </div>
      ) : (
        <>
          {/* Monthly breakdown */}
          <div style={{ borderRadius:12, background:'var(--parch-card)', border:'1px solid var(--parch-line)', overflow:'hidden' }}>
            <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--parch-line)', background:'var(--parch-warm)' }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-faded)', fontFamily:'var(--font-serif)' }}>Monthly YA Activity</span>
            </div>
            <div style={{ padding:'8px 0' }}>
              {byMonth.map(m => (
                <div key={m.month} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 20px', borderBottom:'1px solid var(--parch-line)' }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--ink)', fontFamily:'var(--font-serif)', margin:0 }}>{m.month}</p>
                    <p style={{ fontSize:10, color:'var(--ink-ghost)', fontFamily:'var(--font-serif)', margin:0, marginTop:2 }}>{m.count} reward{m.count !== 1 ? 's' : ''}</p>
                  </div>
                  <p style={{ fontSize:15, fontWeight:700, color:'var(--gold)', fontFamily:'var(--font-mono)', margin:0 }}>{fmt$(m.earned)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reward history table */}
          <div style={{ borderRadius:12, background:'var(--parch-card)', border:'1px solid var(--parch-line)', overflow:'hidden' }}>
            <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--parch-line)', background:'var(--parch-warm)' }}>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-faded)', fontFamily:'var(--font-serif)' }}>
                YA Reward History ({stats.count})
              </span>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--parch-line)', background:'var(--parch-warm)' }}>
                    {['Date','Order #','Amount','Status','Notes'].map(h => (
                      <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-faded)', fontFamily:'var(--font-serif)', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {yaRewards.map(r => (
                    <tr key={r.id} style={{ borderBottom:'1px solid var(--parch-line)' }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--parch-warm)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'10px 16px', color:'var(--ink-dim)', fontFamily:'var(--font-serif)', fontSize:12 }}>{r.date_earned || '—'}</td>
                      <td style={{ padding:'10px 16px', color:'var(--ink-dim)', fontFamily:'var(--font-mono)', fontSize:11 }}>{r.order_number || '—'}</td>
                      <td style={{ padding:'10px 16px', fontWeight:700, color:'var(--gold)', fontFamily:'var(--font-mono)', fontSize:13 }}>{fmt$(r.amount)}</td>
                      <td style={{ padding:'10px 16px' }}>
                        <span style={{
                          fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:99, textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'var(--font-serif)',
                          background: r.status==='redeemed' ? 'var(--ocean-bg)' : r.status==='earned' ? 'var(--terrain-bg)' : 'var(--gold-bg)',
                          color:      r.status==='redeemed' ? 'var(--ocean2)'   : r.status==='earned' ? 'var(--terrain2)'  : 'var(--gold2)',
                          border:     `1px solid ${r.status==='redeemed' ? 'var(--ocean-bdr)' : r.status==='earned' ? 'var(--terrain-bdr)' : 'var(--gold-bdr)'}`,
                        }}>{r.status}</span>
                      </td>
                      <td style={{ padding:'10px 16px', color:'var(--ink-ghost)', fontFamily:'var(--font-serif)', fontSize:11, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.notes || '—'}</td>
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