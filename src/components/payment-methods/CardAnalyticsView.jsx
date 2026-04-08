import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, CreditCard, DollarSign, Percent } from 'lucide-react';

const COLORS = ['#2d5a27','#1a5276','#b8860b','#5b2c6f','#a83260','#922b21','#4a8c42','#2980b9'];
const fmt$ = (v) => `$${(v||0).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`;

const TOOLTIP_STYLE = {
  borderRadius:10, border:'1px solid rgba(160,120,40,0.22)',
  fontSize:12, background:'#faf6ec', color:'#1c1410',
  boxShadow:'0 4px 16px rgba(0,0,0,0.08)',
};

function IssuerLogo({ issuer, size=32 }) {
  const [err, setErr] = React.useState(false);
  const ISSUER_DOMAIN = {
    'Chase':'chase.com','American Express':'americanexpress.com','Amex':'americanexpress.com',
    'Citi':'citi.com','Capital One':'capitalone.com','Discover':'discover.com',
    'Bank of America':'bankofamerica.com','Wells Fargo':'wellsfargo.com',
    'Barclays':'barclays.com','US Bank':'usbank.com',
  };
  const domain = ISSUER_DOMAIN[issuer] || `${(issuer||'').toLowerCase().replace(/\s+/g,'')}.com`;
  const url = `https://logo.clearbit.com/${domain}`;
  const initials = (issuer||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

  if (err || !issuer) return (
    <div style={{ width:size, height:size, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--terrain-bg)', border:'1px solid var(--terrain-bdr)', color:'var(--terrain)', fontWeight:700, fontSize:size*0.35, flexShrink:0 }}>
      {initials}
    </div>
  );
  return (
    <div style={{ width:size, height:size, borderRadius:8, overflow:'hidden', background:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:'1px solid var(--parch-line)' }}>
      <img src={url} alt={issuer} onError={()=>setErr(true)} style={{ width:size*0.75, height:size*0.75, objectFit:'contain' }} />
    </div>
  );
}

export default function CardAnalyticsView({ cards=[], orders=[] }) {
  const cardStats = useMemo(() => {
    return cards.map(card => {
      const cardOrders = orders.filter(o => o.credit_card_id===card.id);
      const spent      = cardOrders.reduce((s,o) => s+(o.final_cost||o.total_cost||0), 0);
      const txns       = cardOrders.length;
      const rate       = card.cashback_rate||card.points_rate||0;
      const estimatedCashback = spent*(rate/100);
      return {
        id:card.id, name:card.card_name, issuer:card.issuer,
        spent, txns, rate, estimatedCashback,
        annualFee:card.annual_fee||0,
        netBenefit:estimatedCashback-(card.annual_fee||0),
        active:card.active!==false,
      };
    }).sort((a,b) => b.spent-a.spent);
  }, [cards, orders]);

  const totalSpent        = cardStats.reduce((s,c) => s+c.spent, 0);
  const totalEstCashback  = cardStats.reduce((s,c) => s+c.estimatedCashback, 0);
  const totalFees         = cardStats.reduce((s,c) => s+c.annualFee, 0);
  const avgRate           = cardStats.length ? cardStats.reduce((s,c) => s+c.rate, 0)/cardStats.length : 0;

  const spendPieData = cardStats.filter(c=>c.spent>0).map(c=>({ name:c.name, value:c.spent }));
  const barData = cardStats.slice(0,8).map(c => ({
    name: c.name.length>14 ? c.name.slice(0,14)+'…' : c.name,
    spent: Math.round(c.spent),
    cashback: parseFloat(c.estimatedCashback.toFixed(2)),
  }));

  const kpis = [
    { label:'Total Charged',  value:fmt$(totalSpent),       color:'var(--ocean)',   accentColor:'var(--ocean)',   icon:CreditCard  },
    { label:'Est. Cashback',  value:fmt$(totalEstCashback), color:'var(--terrain)', accentColor:'var(--terrain)', icon:TrendingUp  },
    { label:'Annual Fees',    value:fmt$(totalFees),        color:'var(--crimson)', accentColor:'var(--crimson)', icon:DollarSign  },
    { label:'Avg Base Rate',  value:`${avgRate.toFixed(2)}%`, color:'var(--violet)', accentColor:'var(--violet)', icon:Percent     },
  ];

  const sectionCard = {
    background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:14,
  };

  const th = {
    textAlign:'left', fontSize:8, fontWeight:700, letterSpacing:'0.14em',
    textTransform:'uppercase', color:'var(--ink-dim)', padding:'10px 16px',
    fontFamily:"'Playfair Display', serif",
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12 }}>
        {kpis.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} style={{ ...sectionCard, padding:16, borderTop:`3px solid ${stat.accentColor}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ width:28, height:28, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--parch-warm)', border:'1px solid var(--parch-line)', flexShrink:0 }}>
                  <Icon style={{ width:14, height:14, color:stat.color }} />
                </div>
                <p style={{ fontSize:8, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-dim)', fontFamily:"'Playfair Display', serif", margin:0 }}>{stat.label}</p>
              </div>
              <p style={{ fontSize:22, fontWeight:800, color:stat.color, margin:0 }}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Bar Chart */}
        <div style={{ ...sectionCard, padding:20 }}>
          <p style={{ fontSize:8, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-dim)', marginBottom:16, fontFamily:"'Playfair Display', serif" }}>Spend & Est. Cashback by Card</p>
          {barData.length===0
            ? <p style={{ fontSize:13, color:'var(--ink-ghost)', textAlign:'center', padding:'32px 0' }}>No spend data yet.</p>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top:4, right:4, left:0, bottom:24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)" />
                  <XAxis dataKey="name" tick={{ fontSize:9, fill:'var(--ink-ghost)' }} tickLine={false} axisLine={false} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize:10, fill:'var(--ink-ghost)' }} tickLine={false} axisLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`} />
                  <Tooltip formatter={(v,n) => [fmt$(v), n==='spent'?'Spent':'Est. Cashback']} contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="spent"    fill="#1a5276" radius={[4,4,0,0]} name="spent" />
                  <Bar dataKey="cashback" fill="#2d5a27" radius={[4,4,0,0]} name="cashback" />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Pie donut */}
        <div style={{ ...sectionCard, padding:20 }}>
          <p style={{ fontSize:8, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-dim)', marginBottom:16, fontFamily:"'Playfair Display', serif" }}>Spend Distribution</p>
          {spendPieData.length===0
            ? <p style={{ fontSize:13, color:'var(--ink-ghost)', textAlign:'center', padding:'32px 0' }}>No spend data yet.</p>
            : (
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={spendPieData} cx="50%" cy="50%" innerRadius={44} outerRadius={72} dataKey="value" paddingAngle={2}>
                      {spendPieData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v=>fmt$(v)} contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6, overflow:'hidden' }}>
                  {spendPieData.map((d,i) => (
                    <div key={d.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', flexShrink:0, background:COLORS[i%COLORS.length] }} />
                      <span style={{ fontSize:11, color:'var(--ink-dim)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:'var(--ink)', flexShrink:0 }}>{fmt$(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </div>
      </div>

      {/* Performance table */}
      <div style={{ ...sectionCard, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--parch-line)', background:'var(--parch-warm)' }}>
          <p style={{ fontSize:8, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-dim)', margin:0, fontFamily:"'Playfair Display', serif" }}>Card Performance Table</p>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--parch-warm)', borderBottom:'1px solid var(--parch-line)' }}>
                {['Card','Total Spent','Transactions','Base Rate','Est. Cashback','Annual Fee','Net Benefit','Status'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cardStats.map(c => (
                <tr key={c.id} style={{ borderTop:'1px solid var(--parch-line)', transition:'background 0.1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(184,134,11,0.03)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'10px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <IssuerLogo issuer={c.issuer} size={28} />
                      <div>
                        <p style={{ fontWeight:600, color:'var(--ink)', fontSize:12, lineHeight:1.3, margin:0 }}>{c.name}</p>
                        <p style={{ fontSize:10, color:'var(--ink-ghost)', margin:0 }}>{c.issuer||'—'}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'10px 16px', fontWeight:600, color:'var(--ocean)' }}>{fmt$(c.spent)}</td>
                  <td style={{ padding:'10px 16px', color:'var(--ink-dim)' }}>{c.txns}</td>
                  <td style={{ padding:'10px 16px', fontWeight:700, color:'var(--violet)' }}>{c.rate}%</td>
                  <td style={{ padding:'10px 16px', fontWeight:600, color:'var(--terrain)' }}>{fmt$(c.estimatedCashback)}</td>
                  <td style={{ padding:'10px 16px', color:'var(--ink-dim)' }}>{fmt$(c.annualFee)}</td>
                  <td style={{ padding:'10px 16px' }}>
                    <span style={{ fontWeight:700, color:c.netBenefit>=0?'var(--terrain)':'var(--crimson)' }}>{fmt$(c.netBenefit)}</span>
                  </td>
                  <td style={{ padding:'10px 16px' }}>
                    <span style={{ fontSize:9, fontWeight:700, padding:'2px 10px', borderRadius:99, letterSpacing:'0.05em', textTransform:'uppercase',
                      ...(c.active
                        ? { background:'var(--terrain-bg)', color:'var(--terrain)', border:'1px solid var(--terrain-bdr)' }
                        : { background:'var(--parch-warm)', color:'var(--ink-ghost)', border:'1px solid var(--parch-line)' }) }}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}