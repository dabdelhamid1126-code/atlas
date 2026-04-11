import { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { format, subMonths, parseISO } from 'date-fns';
import {
  RefreshCw, TrendingUp, DollarSign, Percent,
  CreditCard, Star, Gift, BarChart2, Filter,
  Info, ChevronDown, ChevronUp, Download
} from 'lucide-react';

/* ─────────────────────────────────────────────
   INJECTED CSS — same block as Dashboard.jsx
   so both pages use identical tokens
───────────────────────────────────────────── */
const CSS = `
  :root {
    --font-serif: ui-sans-serif, system-ui, -apple-system, sans-serif;
    --font-sans:  ui-sans-serif, system-ui, -apple-system, sans-serif;
    --font-mono:  ui-monospace, 'SF Mono', 'Consolas', monospace;

    --ne-cream:    #FFDBBB;
    --ne-greige:   #CCBEB1;
    --ne-brown:    #997E67;
    --ne-espresso: #664930;

    --parch:       #FDF5EC;
    --parch-card:  #FFF8F0;
    --parch-warm:  #F5EDE0;
    --parch-line:  rgba(153,126,103,0.18);

    --ink:         #3D2B1A;
    --ink-dim:     #664930;
    --ink-faded:   #8a6d56;
    --ink-ghost:   #b89e8a;

    --gold:        #A0722A;
    --gold2:       #C4922E;
    --gold-bg:     rgba(160,114,42,0.08);
    --gold-bdr:    rgba(160,114,42,0.22);

    --terrain:     #4a7a35;
    --terrain2:    #5a8c42;
    --terrain-bg:  rgba(74,122,53,0.08);
    --terrain-bdr: rgba(74,122,53,0.2);

    --crimson:     #8b3a2a;
    --crimson2:    #a34535;
    --crimson-bg:  rgba(139,58,42,0.08);
    --crimson-bdr: rgba(139,58,42,0.2);

    --ocean:       #2a5c7a;
    --ocean2:      #336e90;
    --ocean-bg:    rgba(42,92,122,0.08);
    --ocean-bdr:   rgba(42,92,122,0.2);

    --violet:      #5a3a6e;
    --violet2:     #6e4a85;
    --violet-bg:   rgba(90,58,110,0.08);
    --violet-bdr:  rgba(90,58,110,0.2);

    --rose:        #8b3a2a;
    --rose-bg:     rgba(139,58,42,0.08);
    --rose-bdr:    rgba(139,58,42,0.2);

    --shadow-sm:   0 1px 4px rgba(61,43,26,0.07);
    --shadow-md:   0 4px 20px rgba(61,43,26,0.10);
  }
`;

/* ─────────────────────────────────────────────
   CSS VARIABLE TOKENS — match Dashboard exactly
───────────────────────────────────────────── */
const V = {
  bg:        'var(--parch)',
  card:      'var(--parch-card)',
  warm:      'var(--parch-warm)',
  border:    'var(--parch-line)',

  ink:       'var(--ink)',
  inkDim:    'var(--ink-dim)',
  inkFaded:  'var(--ink-faded)',
  inkGhost:  'var(--ink-ghost)',

  gold:      'var(--gold)',
  gold2:     'var(--gold2)',
  goldBg:    'var(--gold-bg)',
  goldBdr:   'var(--gold-bdr)',

  terrain:   'var(--terrain)',
  terrain2:  'var(--terrain2)',
  terrBg:    'var(--terrain-bg)',
  terrBdr:   'var(--terrain-bdr)',

  ocean:     'var(--ocean)',
  ocean2:    'var(--ocean2)',
  oceanBg:   'var(--ocean-bg)',
  oceanBdr:  'var(--ocean-bdr)',

  violet:    'var(--violet)',
  violet2:   'var(--violet2)',
  violBg:    'var(--violet-bg)',
  violBdr:   'var(--violet-bdr)',

  crimson:   'var(--crimson)',
  crimson2:  'var(--crimson2)',
  crimBg:    'var(--crimson-bg)',
  crimBdr:   'var(--crimson-bdr)',

  rose:      'var(--rose)',
  roseBg:    'var(--rose-bg)',
  roseBdr:   'var(--rose-bdr)',
};

// Hex values for recharts (can't use CSS vars inside SVG)
// Match dashboard chart colors exactly
const CH = {
  revenue:  '#A0722A',  // --gold
  profit:   '#4a7a35',  // --terrain
  spend:    '#2a5c7a',  // --ocean
  cashback: '#5a3a6e',  // --violet
  violet:   '#6e4a85',  // --violet2
  ocean:    '#336e90',  // --ocean2
  crimson:  '#8b3a2a',  // --crimson
  rose:     '#8b3a2a',  // --rose
  amber:    '#C4922E',  // --gold2
};

const PIE_COLORS = [CH.profit, CH.violet, CH.ocean, CH.revenue, CH.crimson, CH.rose, '#7a5a3a', '#3a6a5a'];

const CARD_STYLE = {
  background:   V.card,
  border:       `1px solid ${V.border}`,
  borderRadius: 14,
  boxShadow:    '0 1px 4px rgba(28,20,10,0.07)',
};

const TOOLTIP_STYLE = {
  borderRadius: 10,
  border:       `1px solid var(--parch-line)`,
  fontSize:     11,
  background: 'var(--parch-card)',
  color:        'var(--ink)',
  boxShadow:    '0 4px 16px rgba(28,20,10,0.10)',
};

const INP_STYLE = {
  background:   V.warm,
  border:       `1px solid ${V.border}`,
  borderRadius: 8,
  color:        V.ink,
  padding:      '6px 10px',
  fontSize:     12,
  outline:      'none',
};

/* ─────────────────────────────────────────────
   FORMATTERS
───────────────────────────────────────────── */
function fmt$(v) {
  const n = Math.abs(v||0), sign = v<0?'-':'';
  if (n>=1_000_000) return `${sign}$${(n/1_000_000).toFixed(1)}M`;
  if (n>=10_000)    return `${sign}$${(n/1_000).toFixed(1)}K`;
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(v||0);
}
function fmtPct(v)  { return `${(v||0).toFixed(2)}%`; }
function fmtPts(v)  { return `${(v||0).toLocaleString()} pts`; }
function fmtPeriod(iso, period) {
  if (period==='monthly') { try { return format(parseISO(iso+'-01'),'MMM yy'); } catch { return iso; } }
  return iso;
}

/* ─────────────────────────────────────────────
   CASHBACK HELPERS
───────────────────────────────────────────── */
const YA_KEYS = ['Young Adult','YACB','Prime Young Adult','young adult','ya cashback'];
const isYA = r => YA_KEYS.some(k => (r.notes||'').includes(k));

function splitCashback(rewards) {
  const usd    = rewards.filter(r => r.currency==='USD');
  const points = rewards.filter(r => r.currency==='points');
  const ya     = usd.filter(r =>  isYA(r));
  const card   = usd.filter(r => !isYA(r));
  return {
    cardCashback: card.reduce((s,r)  => s+(r.amount||0), 0),
    yaCashback:   ya.reduce((s,r)    => s+(r.amount||0), 0),
    totalUSD:     usd.reduce((s,r)   => s+(r.amount||0), 0),
    points:       points.reduce((s,r)=> s+(r.amount||0), 0),
  };
}

function calcRevenue(order) {
  return (order.sale_events||[]).reduce((sum,ev) =>
    sum + (ev.items||[]).reduce((s,item) =>
      s + (parseFloat(item.sale_price)||0) * (parseInt(item.quantity)||1), 0), 0);
}

/* ─────────────────────────────────────────────
   SHARED COMPONENTS
───────────────────────────────────────────── */
function SectionDivider({ title, dotColor="var(--gold)", lineColor="rgba(160,114,42,0.25)" }) {
  return (
    <div className="section-div">
      <div className="section-div-dot" style={{ background:dotColor }} />
      <span className="section-div-label" style={{ color:dotColor }}>{title}</span>
      <div className="section-div-line" style={{ background:`linear-gradient(90deg,${lineColor},rgba(160,114,42,0.06),transparent)` }} />
    </div>
  );
}

function KpiCard({ label, value, sub, icon:Icon, accentColor, bgColor, bdrColor }) {
  return (
    <div className="kpi-card fade-up" style={{ borderTopColor:accentColor }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color:accentColor }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {Icon && (
        <div className="kpi-icon" style={{ background:bgColor, borderColor:bdrColor }}>
          <Icon size={13} color={accentColor} />
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, badge, subtitle, children }) {
  return (
    <div className="card" style={{ padding:'12px 14px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <p style={{ fontFamily:'var(--font-serif)', fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-dim)' }}>{title}</p>
        {badge && <span style={{ fontSize:8, background:'var(--gold-bg)', border:'1px solid var(--gold-bdr)', color:'var(--gold)', padding:'2px 8px', borderRadius:99, fontWeight:700 }}>{badge}</span>}
      </div>
      {subtitle && <p style={{ fontSize:10, color:'var(--ink-ghost)', marginBottom:12 }}>{subtitle}</p>}
      {!subtitle && <div style={{ height:8 }} />}
      {children}
    </div>
  );
}

function ChartLegend({ items }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginTop:10 }}>
      {items.map(item => (
        <div key={item.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:18, height:3, borderRadius:99, background:item.color }} />
          <span style={{ fontSize:10, fontWeight:600, color:'var(--ink-faded)' }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data, colors, fmtFn }) {
  if (!data.length) return <EmptyState />;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
      <ResponsiveContainer width={110} height={110}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={28} outerRadius={50} paddingAngle={3} dataKey="value">
            {data.map((_,i) => <Cell key={i} fill={colors[i%colors.length]} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => fmtFn?fmtFn(v):v} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5 }}>
        {data.slice(0,6).map((d,i) => (
          <div key={d.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, minWidth:0 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:colors[i%colors.length], flexShrink:0 }} />
              <span style={{ fontSize:10, color:'var(--ink-faded)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</span>
            </div>
            <span style={{ fontSize:10, fontWeight:600, color:'var(--ink)', flexShrink:0 }}>{fmtFn?fmtFn(d.value):d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ label='No data yet' }) {
  return (
    <div style={{ height:190, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
      <div style={{ width:36, height:36, borderRadius:10, background:V.goldBg, border:`1px solid ${V.goldBdr}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <BarChart2 size={16} color={V.gold} />
      </div>
      <p style={{ fontSize:12, color:'var(--ink-ghost)' }}>{label}</p>
      <p style={{ fontSize:10, color:'var(--ink-ghost)', opacity:0.7 }}>Add transactions to unlock insights</p>
    </div>
  );
}

function PillGroup({ options, active, onChange }) {
  return (
    <div style={{ display:'flex', gap:2, padding:3, borderRadius:8, background:V.warm, border:`1px solid ${V.border}` }}>
      {options.map(o => {
        const on = active===o.id;
        return (
          <button key={o.id} onClick={()=>onChange(o.id)}
            style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', border:'none',
              background:on?'var(--ink)':'transparent', color:on?'var(--ne-cream)':'var(--ink-faded)', transition:'background 0.15s,color 0.15s' }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display:'flex', gap:2, padding:3, borderRadius:10, background:V.card, border:`1px solid ${V.border}`, width:'fit-content' }}>
      {tabs.map(t => {
        const Icon=t.icon, on=active===t.id;
        return (
          <button key={t.id} onClick={()=>onChange(t.id)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 13px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', border:'none',
              background:on?'var(--ink)':'transparent', color:on?'var(--ne-cream)':'var(--ink-faded)', transition:'background 0.15s,color 0.15s' }}>
            {Icon && <Icon size={13}/>} {t.label}
          </button>
        );
      })}
    </div>
  );
}

function TableWrap({ title, badge, badgeColor, badgeBg, badgeBdr, children }) {
  return (
    <div className="card" style={{ overflow:'hidden' }}>
      <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--parch-line)', background:'var(--parch-warm)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <p style={{ fontFamily:'var(--font-serif)', fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-dim)' }}>{title}</p>
        {badge && <span style={{ fontSize:10, background:badgeBg, color:badgeColor, border:`1px solid ${badgeBdr}`, padding:'2px 10px', borderRadius:99, fontWeight:700 }}>{badge}</span>}
      </div>
      <div style={{ overflowX:'auto' }}>{children}</div>
    </div>
  );
}

function Th({ children }) {
  return <th>{children}</th>;
}

function TotalsRow({ children }) {
  return (
    <tr style={{ borderTop:`2px solid var(--parch-deep)`, background:V.warm }}>
      {children}
    </tr>
  );
}

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const TABS           = [
  { id:'overview',   label:'Overview',      icon:TrendingUp },
  { id:'breakdowns', label:'Breakdowns',    icon:BarChart2  },
  { id:'payments',   label:'Payments',      icon:CreditCard },
  { id:'tables',     label:'Detail Tables', icon:Filter     },
];
const MODE_OPTIONS   = [{ id:'all',label:'All' },{ id:'churning',label:'Churning' },{ id:'marketplace',label:'Marketplace' }];
const PERIOD_OPTIONS = [{ id:'monthly',label:'Monthly' },{ id:'quarterly',label:'Quarterly' },{ id:'yearly',label:'Yearly' }];

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function Analytics() {
  const [mode,          setMode]          = useState('all');
  const [period,        setPeriod]        = useState('monthly');
  const [fromDate,      setFromDate]      = useState(() => format(subMonths(new Date(),12),'yyyy-MM-dd'));
  const [toDate,        setToDate]        = useState(() => format(new Date(),'yyyy-MM-dd'));
  const [activeTab,     setActiveTab]     = useState('overview');
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [userEmail,     setUserEmail]     = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => { setUserEmail(u?.email||null); }).catch(()=>{});
  }, []);

  const { data:orders=[], isLoading, refetch } = useQuery({
    queryKey: ['analyticsOrders', userEmail],
    queryFn:  () => userEmail ? base44.entities.PurchaseOrder.filter({ created_by:userEmail },'-order_date') : [],
    enabled:  userEmail !== null,
  });
  const { data:rewards=[] } = useQuery({
    queryKey: ['analyticsRewards', userEmail],
    queryFn:  () => userEmail ? base44.entities.Reward.filter({ created_by:userEmail }) : [],
    enabled:  userEmail !== null,
  });
  const { data:creditCards=[] } = useQuery({
    queryKey: ['analyticsCreditCards', userEmail],
    queryFn:  () => userEmail ? base44.entities.CreditCard.filter({ created_by:userEmail }) : [],
    enabled:  userEmail !== null,
  });

  const filteredOrders = useMemo(() => orders.filter(o => {
    const d = o.order_date||o.created_date||'';
    if (fromDate && d < fromDate) return false;
    if (toDate   && d > toDate)   return false;
    if (mode==='churning'    && o.order_type!=='churning')    return false;
    if (mode==='marketplace' && o.order_type!=='marketplace') return false;
    return true;
  }), [orders, mode, fromDate, toDate]);

  const filteredRewards = useMemo(() => {
    const ids = new Set(filteredOrders.map(o=>o.id));
    return rewards.filter(r => !r.purchase_order_id || ids.has(r.purchase_order_id));
  }, [rewards, filteredOrders]);

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const revenue = filteredOrders.reduce((s,o) => s+calcRevenue(o), 0);
    const cost    = filteredOrders.reduce((s,o) => s+parseFloat(o.final_cost||o.total_cost||0), 0);
    const { cardCashback, yaCashback, totalUSD, points } = splitCashback(filteredRewards);
    const profit = revenue - cost + totalUSD;
    const roi    = cost>0 ? (profit/cost)*100 : 0;
    const storeMap = {};
    filteredOrders.forEach(o => { if(o.retailer) storeMap[o.retailer]=(storeMap[o.retailer]||0)+parseFloat(o.total_cost||0); });
    const topStore = Object.entries(storeMap).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
    return { revenue, cost, profit, roi, cardCashback, yaCashback, totalUSD, points, topStore };
  }, [filteredOrders, filteredRewards]);

  /* ── Period trend ── */
  const periodData = useMemo(() => {
    const map = {};
    const getKey = d => {
      if (!d) return null;
      const key = d.substring(0,7);
      if (period==='quarterly') { const [y,m]=key.split('-'); return `${y}-Q${Math.ceil(parseInt(m)/3)}`; }
      if (period==='yearly')    return d.substring(0,4);
      return key;
    };
    filteredOrders.forEach(o => {
      const key = getKey(o.order_date||o.created_date); if(!key) return;
      if(!map[key]) map[key]={ period:key, revenue:0, cost:0, cashback:0 };
      map[key].revenue += calcRevenue(o);
      map[key].cost    += parseFloat(o.final_cost||o.total_cost||0);
    });
    filteredRewards.filter(r=>r.currency==='USD').forEach(r => {
      const key = getKey(r.date_earned); if(!key||!map[key]) return;
      map[key].cashback += (r.amount||0);
    });
    return Object.values(map)
      .sort((a,b)=>a.period.localeCompare(b.period))
      .map(d=>({ ...d, profit:d.revenue-d.cost+d.cashback, label:fmtPeriod(d.period,period) }));
  }, [filteredOrders, filteredRewards, period]);

  const cumulativeData = useMemo(() => {
    let cum = 0;
    return periodData.map(d => ({ label:d.label, cumProfit:(cum+=d.profit) }));
  }, [periodData]);

  /* ── Category ── */
  const categoryData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const cat = o.product_category||o.category||o.items?.[0]?.category||'Other';
      map[cat] = (map[cat]||0) + parseFloat(o.total_cost||0);
    });
    return Object.entries(map).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  }, [filteredOrders]);

  /* ── Store data ── */
  const storeData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const s = o.retailer||'Unknown';
      if(!map[s]) map[s]={ store:s, cost:0, revenue:0, cashback:0, txns:0 };
      map[s].cost    += parseFloat(o.final_cost||o.total_cost||0);
      map[s].revenue += calcRevenue(o);
      map[s].txns    += 1;
    });
    filteredRewards.filter(r=>r.currency==='USD').forEach(r => {
      const o = filteredOrders.find(x=>x.id===r.purchase_order_id);
      if(o?.retailer && map[o.retailer]) map[o.retailer].cashback += (r.amount||0);
    });
    return Object.values(map).map(s=>({
      ...s, profit:s.revenue-s.cost+s.cashback,
      roi:   s.cost>0?((s.revenue-s.cost+s.cashback)/s.cost)*100:0,
    })).sort((a,b)=>b.revenue-a.revenue);
  }, [filteredOrders, filteredRewards]);

  /* ── Payment data ── */
  const paymentData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const key  = o.credit_card_id||'unknown';
      const card = creditCards.find(c=>c.id===key);
      const name = card?.card_name||o.card_name||'Unknown';
      if(!map[key]) map[key]={ id:key, name, spent:0, cashback:0, txns:0, statedRate:card?.cashback_rate||0 };
      map[key].spent += parseFloat(o.final_cost||o.total_cost||0);
      map[key].txns  += 1;
    });
    filteredRewards.filter(r=>r.currency==='USD'&&!isYA(r)).forEach(r => {
      const o   = filteredOrders.find(x=>x.id===r.purchase_order_id);
      const key = o?.credit_card_id||'unknown';
      if(map[key]) map[key].cashback += (r.amount||0);
    });
    return Object.values(map).map(p=>({
      ...p,
      effectiveRate: p.spent>0?(p.cashback/p.spent)*100:0,
      variance:      p.spent>0?((p.cashback/p.spent)*100)-p.statedRate:0,
    })).sort((a,b)=>b.spent-a.spent);
  }, [filteredOrders, filteredRewards, creditCards]);

  const cashbackPieData = useMemo(()=>[
    ...(kpis.cardCashback>0?[{ name:'Card Cashback', value:kpis.cardCashback }]:[]),
    ...(kpis.yaCashback>0  ?[{ name:'YA Cashback',   value:kpis.yaCashback   }]:[]),
  ],[kpis]);

  /* ── CSV Export ── */
  const handleExport = useCallback(() => {
    const rows = ['=== TREND ===','Period,Revenue,Cost,Cashback,Profit'];
    periodData.forEach(d=>rows.push(`${d.period},${d.revenue.toFixed(2)},${d.cost.toFixed(2)},${d.cashback.toFixed(2)},${d.profit.toFixed(2)}`));
    rows.push('','=== STORES ===','Store,Cost,Revenue,Cashback,Profit,ROI%,Txns');
    storeData.forEach(s=>rows.push(`"${s.store}",${s.cost.toFixed(2)},${s.revenue.toFixed(2)},${s.cashback.toFixed(2)},${s.profit.toFixed(2)},${s.roi.toFixed(2)},${s.txns}`));
    rows.push('','=== CARDS ===','Card,Txns,Spent,Cashback,StatedRate%,EffRate%,Variance%');
    paymentData.forEach(p=>rows.push(`"${p.name}",${p.txns},${p.spent.toFixed(2)},${p.cashback.toFixed(2)},${p.statedRate.toFixed(2)},${p.effectiveRate.toFixed(2)},${p.variance.toFixed(2)}`));
    const blob = new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href=url; a.download=`atlas_analytics_${format(new Date(),'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  },[periodData,storeData,paymentData]);

  /* ── KPI card defs ── */
  const KPI_CARDS = [
    { label:'Sale Revenue',   value:fmt$(kpis.revenue),      sub:`${filteredOrders.filter(o=>calcRevenue(o)>0).length} sold`,   icon:TrendingUp, accentColor:V.terrain2, bgColor:V.terrBg, bdrColor:V.terrBdr },
    { label:'Total Cost',     value:fmt$(kpis.cost),         sub:`${filteredOrders.length} orders`,                             icon:CreditCard, accentColor:V.ocean2,   bgColor:V.oceanBg,bdrColor:V.oceanBdr },
    { label:'Net Profit',
                              value:fmt$(kpis.profit),       sub:fmtPct(kpis.roi)+' ROI',                                       icon:DollarSign, accentColor:kpis.profit>=0?V.gold:V.crimson2,   bgColor:kpis.profit>=0?V.goldBg:V.crimBg,  bdrColor:kpis.profit>=0?V.goldBdr:V.crimBdr },
    { label:'ROI',            value:fmtPct(kpis.roi),        sub:'return on investment',                                        icon:Percent,    accentColor:kpis.roi>=0?V.ocean2:V.crimson2,     bgColor:V.oceanBg, bdrColor:V.oceanBdr },
    { label:'Card Cashback',  value:fmt$(kpis.cardCashback), sub:'credit card rewards',                                         icon:CreditCard, accentColor:V.violet2,  bgColor:V.violBg, bdrColor:V.violBdr },
    { label:'YA Cashback',    value:fmt$(kpis.yaCashback),   sub:'Young Adult rewards',                                         icon:Star,       accentColor:V.gold,     bgColor:V.goldBg, bdrColor:V.goldBdr },
    { label:'Points Earned',  value:fmtPts(kpis.points),     sub:'reward points',                                               icon:Gift,       accentColor:V.rose,     bgColor:V.roseBg, bdrColor:V.roseBdr },
    { label:'Total Cashback', value:fmt$(kpis.totalUSD),     sub:'card CB + YA combined',                                       icon:TrendingUp, accentColor:V.terrain,  bgColor:V.terrBg, bdrColor:V.terrBdr },
  ];

  if (isLoading) return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, paddingBottom:40 }}>
      {[...Array(8)].map((_,i)=>(
        <div key={i} style={{ height:76, borderRadius:12, background:V.warm, border:`1px solid ${V.border}` }} />
      ))}
    </div>
  );

  const tdMono = (color, extra={}) => ({ padding:'10px 14px', color, fontWeight:600, fontFamily:'var(--font-mono)', fontSize:12, ...extra });

  return (
    <>
      <style>{CSS}</style>
      <div style={{ paddingBottom:40 }}>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:16 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-serif)', fontSize:24, fontWeight:900, color:'var(--ink)', letterSpacing:'-0.3px', lineHeight:1.1 }}>Analytics & Insights</h1>
          <p style={{ fontSize:11, color:'var(--ink-dim)', marginTop:4 }}>
            {mode==='all'?'Combined overview':mode==='churning'?'Churning performance':'Marketplace performance'}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <PillGroup options={MODE_OPTIONS} active={mode} onChange={setMode} />
          <button onClick={handleExport}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:8, fontSize:11, fontWeight:600, background:'var(--parch-card)', border:'1px solid var(--parch-line)', color:'var(--ink-faded)', cursor:'pointer' }}>
            <Download size={13}/> Export CSV
          </button>
          <button onClick={()=>refetch()} disabled={isLoading}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:8, fontSize:11, fontWeight:700, background:'var(--ink)', border:'none', color:'var(--ne-cream)', cursor:'pointer' }}>
            <RefreshCw size={13} className={isLoading?'animate-spin':''}/> Refresh
          </button>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className='card' style={{ padding:'12px 16px', display:'flex', flexWrap:'wrap', alignItems:'flex-end', gap:16, marginBottom:14 }}>
        <div>
          <p style={{ fontFamily:'var(--font-serif)', fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-dim)', marginBottom:8 }}>Period</p>
          <PillGroup options={PERIOD_OPTIONS} active={period} onChange={setPeriod} />
        </div>
        <div>
          <p style={{ fontFamily:'var(--font-serif)', fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-dim)', marginBottom:8 }}>Date Range</p>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} style={INP_STYLE}/>
            <span style={{ color:V.inkGhost, fontSize:12 }}>→</span>
            <input type="date" value={toDate}   onChange={e=>setToDate(e.target.value)}   style={INP_STYLE}/>
          </div>
        </div>
      </div>

      {/* ── KPI GRID ── */}
      <SectionDivider title="Survey Markers" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:10 }}>
        {KPI_CARDS.map(k => <KpiCard key={k.label} {...k}/>)}
      </div>


      {/* ── TAB BAR ── */}
      <div style={{ marginBottom:14 }}>
        <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab}/>
      </div>

      {/* ════════ OVERVIEW ════════ */}
      {activeTab==='overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12 }}>
            <ChartCard title="Revenue & Profit Trend" badge={PERIOD_OPTIONS.find(p=>p.id===period)?.label}>
              {periodData.length===0 ? <EmptyState/> : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={periodData} margin={{top:4,right:4,left:0,bottom:0}}>
                      <defs>
                        {[[  'gRev',CH.revenue],['gPro',CH.profit],['gCash',CH.cashback]].map(([id,c])=>(
                          <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={c} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={c} stopOpacity={0}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)"/>
                      <XAxis dataKey="label" tick={{fontSize:10,fill:'var(--ink-ghost)'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:'var(--ink-ghost)'}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>fmt$(v)}/>
                      <Area type="monotone" dataKey="revenue"  stroke={CH.revenue}  fill="url(#gRev)"  strokeWidth={2} name="Revenue"  dot={{r:3,fill:CH.revenue }}/>
                      <Area type="monotone" dataKey="profit"   stroke={CH.profit}   fill="url(#gPro)"  strokeWidth={2} name="Profit"   dot={{r:3,fill:CH.profit  }}/>
                      <Area type="monotone" dataKey="cashback" stroke={CH.cashback} fill="url(#gCash)" strokeWidth={2} name="Cashback" dot={{r:3,fill:CH.cashback}}/>
                    </AreaChart>
                  </ResponsiveContainer>
                  <ChartLegend items={[{label:'Revenue',color:CH.revenue},{label:'Profit',color:CH.profit},{label:'Cashback',color:CH.cashback}]}/>
                </>
              )}
            </ChartCard>
            <ChartCard title="Expense Breakdown">
              <DonutChart data={categoryData} colors={PIE_COLORS} fmtFn={fmt$}/>
            </ChartCard>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <ChartCard title="Cumulative Profit">
              {cumulativeData.length===0 ? <EmptyState/> : (
                <>
                  <ResponsiveContainer width="100%" height={190}>
                    <AreaChart data={cumulativeData} margin={{top:4,right:4,left:0,bottom:0}}>
                      <defs>
                        <linearGradient id="gCum" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={CH.cashback} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={CH.cashback} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)"/>
                      <XAxis dataKey="label" tick={{fontSize:10,fill:'var(--ink-ghost)'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:'var(--ink-ghost)'}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>fmt$(v)}/>
                      <Area type="monotone" dataKey="cumProfit" stroke={CH.cashback} fill="url(#gCum)" strokeWidth={2.5} name="Cumulative Profit" dot={{r:3,fill:CH.cashback}}/>
                    </AreaChart>
                  </ResponsiveContainer>
                  <ChartLegend items={[{label:'Cumulative Profit',color:CH.cashback}]}/>
                </>
              )}
            </ChartCard>

            <ChartCard title="Period P&L">
              {periodData.length===0 ? <EmptyState/> : (
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={periodData} margin={{top:4,right:4,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)"/>
                    <XAxis dataKey="label" tick={{fontSize:10,fill:'var(--ink-ghost)'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'var(--ink-ghost)'}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>fmt$(v)}/>
                    <Bar dataKey="profit" name="Net Profit" radius={[5,5,0,0]}>
                      {periodData.map((d,i)=><Cell key={i} fill={d.profit>=0?CH.revenue:CH.crimson}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>
      )}

      {/* ════════ BREAKDOWNS ════════ */}
      {activeTab==='breakdowns' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <ChartCard title="Store Performance" badge={`${storeData.length} Stores`}>
              {storeData.length===0 ? <EmptyState/> : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={storeData.slice(0,8).map(s=>({name:s.store,revenue:s.revenue,profit:s.profit}))} layout="vertical" margin={{left:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)" horizontal={false}/>
                      <XAxis type="number" tick={{fontSize:10,fill:'var(--ink-ghost)'}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                      <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:'var(--ink-ghost)'}} axisLine={false} tickLine={false} width={72}/>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>fmt$(v)}/>
                      <Bar dataKey="revenue" name="Revenue" fill={CH.spend}   radius={[0,5,5,0]}/>
                      <Bar dataKey="profit"  name="Profit"  fill={CH.revenue} radius={[0,5,5,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                  <ChartLegend items={[{label:'Revenue',color:CH.spend},{label:'Profit',color:CH.revenue}]}/>
                </>
              )}
            </ChartCard>
            <ChartCard title="Spend by Category">
              <DonutChart data={categoryData} colors={PIE_COLORS} fmtFn={fmt$}/>
            </ChartCard>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <ChartCard title="Store ROI Comparison">
              {storeData.length===0 ? <EmptyState/> : (
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={storeData.slice(0,8)} margin={{top:4,right:4,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)"/>
                    <XAxis dataKey="store" tick={{fontSize:9,fill:'var(--ink-ghost)'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'var(--ink-ghost)'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v.toFixed(0)}%`}/>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>`${Number(v).toFixed(2)}%`}/>
                    <Bar dataKey="roi" name="ROI %" radius={[5,5,0,0]}>
                      {storeData.slice(0,8).map((s,i)=><Cell key={i} fill={s.roi>=0?CH.revenue:CH.crimson}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <div style={{ ...CARD_STYLE, padding:'14px 16px' }}>
              <p style={{ fontFamily:'var(--font-serif)', fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-dim)', marginBottom:14 }}>Store Summary</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { label:'Total Revenue', value:fmt$(storeData.reduce((s,x)=>s+x.revenue,0)), color:V.terrain2, bg:V.terrBg, bdr:V.terrBdr },
                  { label:'Total Profit',  value:fmt$(storeData.reduce((s,x)=>s+x.profit,0)),  color:V.gold,     bg:V.goldBg, bdr:V.goldBdr },
                  { label:'Total CB',      value:fmt$(storeData.reduce((s,x)=>s+x.cashback,0)),color:V.violet2,  bg:V.violBg, bdr:V.violBdr },
                  { label:'Avg ROI',       value:fmtPct(kpis.roi),                              color:V.ocean2,   bg:V.oceanBg,bdr:V.oceanBdr },
                ].map(s=>(
                  <div key={s.label} style={{ borderRadius:10, padding:12, background:s.bg, border:`1px solid ${s.bdr}` }}>
                    <p style={{ fontSize:9, color:s.color, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>{s.label}</p>
                    <p style={{ fontSize:16, fontWeight:800, color:s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ PAYMENTS ════════ */}
      {activeTab==='payments' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {[
              { label:'Card Cashback', value:fmt$(kpis.cardCashback), sub:'From credit cards',   color:V.violet2, bg:V.violBg,  bdr:V.violBdr  },
              { label:'YA Cashback',   value:fmt$(kpis.yaCashback),   sub:'Young Adult rewards', color:V.gold,    bg:V.goldBg,  bdr:V.goldBdr  },
              { label:'Points Earned', value:fmtPts(kpis.points),     sub:'Reward points',       color:V.rose,    bg:V.roseBg,  bdr:V.roseBdr  },
            ].map(c=>(
              <div key={c.label} style={{ ...CARD_STYLE, padding:14, borderTop:`3px solid ${c.color}` }}>
                <p style={{ fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:c.color, marginBottom:6 }}>{c.label}</p>
                <p style={{ fontSize:22, fontWeight:800, color:c.color, lineHeight:1 }}>{c.value}</p>
                <p style={{ fontSize:10, color:'var(--ink-ghost)', marginTop:5 }}>{c.sub}</p>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <ChartCard title="Spend by Payment Method">
              {paymentData.length===0 ? <EmptyState/> : (
                <>
                  <ResponsiveContainer width="100%" height={190}>
                    <BarChart data={paymentData.slice(0,8)} margin={{top:4,right:4,left:0,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)"/>
                      <XAxis dataKey="name" tick={{fontSize:9,fill:'var(--ink-ghost)'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:'var(--ink-ghost)'}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>fmt$(v)}/>
                      <Bar dataKey="spent"    name="Spent"    fill={CH.cashback} radius={[5,5,0,0]}/>
                      <Bar dataKey="cashback" name="Cashback" fill={CH.revenue}  radius={[5,5,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                  <ChartLegend items={[{label:'Spent',color:CH.cashback},{label:'Cashback',color:CH.revenue}]}/>
                </>
              )}
            </ChartCard>
            <ChartCard title="Cashback Distribution" subtitle="Card cashback vs YA cashback">
              {cashbackPieData.length===0
                ? <EmptyState label="No cashback data yet"/>
                : <DonutChart data={cashbackPieData} colors={[CH.cashback,CH.profit]} fmtFn={fmt$}/>
              }
            </ChartCard>
          </div>

          <ChartCard title="Effective vs Stated Cashback Rate" subtitle="How your actual rate compares to each card's stated rate">
            {paymentData.length===0 ? <EmptyState/> : (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={paymentData} margin={{top:4,right:4,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)"/>
                    <XAxis dataKey="name" tick={{fontSize:9,fill:'var(--ink-ghost)'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'var(--ink-ghost)'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v.toFixed(1)}%`}/>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>`${Number(v).toFixed(2)}%`}/>
                    <Bar dataKey="statedRate"    name="Stated Rate"    fill={CH.cashback} radius={[5,5,0,0]}/>
                    <Bar dataKey="effectiveRate" name="Effective Rate" radius={[5,5,0,0]}>
                      {paymentData.map((p,i)=><Cell key={i} fill={p.effectiveRate>=p.statedRate?CH.revenue:CH.profit}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <ChartLegend items={[{label:'Stated Rate',color:CH.cashback},{label:'≥ Stated',color:CH.revenue},{label:'< Stated',color:CH.profit}]}/>
              </>
            )}
          </ChartCard>

          <TableWrap title="Payment Method Performance" badge={`${paymentData.length} cards`} badgeColor={V.violet2} badgeBg={V.violBg} badgeBdr={V.violBdr}>
            <table className='dash-table'>
              <thead><tr>{['Card','Txns','Spent','Cashback','Stated %','Effective %','Variance'].map(h=><Th key={h}>{h}</Th>)}</tr></thead>
              <tbody>
                {paymentData.map(p=>(
                  <tr key={p.id} style={{borderTop:`1px solid var(--parch-line)`}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--gold-bg)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'9px 13px',fontWeight:700,color:'var(--ink)'}}>{p.name}</td>
                    <td style={{padding:'9px 13px',color:'var(--ink-faded)'}}>{p.txns}</td>
                    <td style={tdMono(V.ocean2)}>{fmt$(p.spent)}</td>
                    <td style={tdMono(V.violet2)}>{fmt$(p.cashback)}</td>
                    <td style={{padding:'9px 13px',color:V.inkFaded}}>{fmtPct(p.statedRate)}</td>
                    <td style={tdMono(p.effectiveRate>=p.statedRate?V.terrain2:V.gold)}>{fmtPct(p.effectiveRate)}</td>
                    <td style={tdMono(p.variance>=0?V.terrain2:V.crimson2)}>{p.variance>=0?'+':''}{fmtPct(p.variance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <TotalsRow>
                  <td style={{padding:'9px 13px',fontWeight:800,color:V.ink}}>TOTAL</td>
                  <td style={{padding:'9px 13px',fontWeight:800,color:'var(--ink-dim)'}}>{paymentData.reduce((s,p)=>s+p.txns,0)}</td>
                  <td style={tdMono(V.ocean2,{fontWeight:800})}>{fmt$(paymentData.reduce((s,p)=>s+p.spent,0))}</td>
                  <td style={tdMono(V.violet2,{fontWeight:800})}>{fmt$(paymentData.reduce((s,p)=>s+p.cashback,0))}</td>
                  <td colSpan={3} style={{padding:'9px 13px',color:V.inkGhost,fontSize:10}}>
                    Best card: <span style={{color:'var(--gold)',fontWeight:700}}>{[...paymentData].sort((a,b)=>b.effectiveRate-a.effectiveRate)[0]?.name||'—'}</span>
                  </td>
                </TotalsRow>
              </tfoot>
            </table>
          </TableWrap>
        </div>
      )}

      {/* ════════ DETAIL TABLES ════════ */}
      {activeTab==='tables' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          <TableWrap title="Store Breakdown" badge={`${storeData.length} stores`} badgeColor={V.terrain2} badgeBg={V.terrBg} badgeBdr={V.terrBdr}>
            <table className='dash-table'>
              <thead><tr>{['Store','Cost','Revenue','Profit','Cashback','ROI','Txns'].map(h=><Th key={h}>{h}</Th>)}</tr></thead>
              <tbody>
                {storeData.map(s=>(
                  <tr key={s.store} style={{borderTop:`1px solid var(--parch-line)`}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--gold-bg)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'9px 13px',fontWeight:700,color:'var(--ink)'}}>{s.store}</td>
                    <td style={tdMono(V.ocean2)}>{fmt$(s.cost)}</td>
                    <td style={tdMono(V.terrain2)}>{fmt$(s.revenue)}</td>
                    <td style={tdMono(s.profit>=0?V.terrain2:V.crimson2)}>{fmt$(s.profit)}</td>
                    <td style={tdMono(V.violet2)}>{fmt$(s.cashback)}</td>
                    <td style={tdMono(s.roi>=0?V.terrain2:V.crimson2)}>{fmtPct(s.roi)}</td>
                    <td style={{padding:'9px 13px',color:'var(--ink-faded)'}}>{s.txns}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <TotalsRow>
                  <td style={{padding:'9px 13px',fontWeight:800,color:V.ink}}>TOTAL</td>
                  <td style={tdMono(V.ocean2,{fontWeight:800})}>{fmt$(storeData.reduce((s,x)=>s+x.cost,0))}</td>
                  <td style={tdMono(V.terrain2,{fontWeight:800})}>{fmt$(storeData.reduce((s,x)=>s+x.revenue,0))}</td>
                  <td style={tdMono(storeData.reduce((s,x)=>s+x.profit,0)>=0?V.terrain2:V.crimson2,{fontWeight:800})}>{fmt$(storeData.reduce((s,x)=>s+x.profit,0))}</td>
                  <td style={tdMono(V.violet2,{fontWeight:800})}>{fmt$(storeData.reduce((s,x)=>s+x.cashback,0))}</td>
                  <td style={tdMono(kpis.roi>=0?V.terrain2:V.crimson2,{fontWeight:800})}>{fmtPct(kpis.roi)}</td>
                  <td style={{padding:'9px 13px',fontWeight:800,color:'var(--ink-dim)'}}>{storeData.reduce((s,x)=>s+x.txns,0)}</td>
                </TotalsRow>
              </tfoot>
            </table>
          </TableWrap>

          <TableWrap title="Period-by-Period Data">
            <table className='dash-table'>
              <thead><tr>{['Period','Cost','Revenue','Cashback','Net Profit','Margin'].map(h=><Th key={h}>{h}</Th>)}</tr></thead>
              <tbody>
                {periodData.map(p=>(
                  <tr key={p.period} style={{borderTop:`1px solid var(--parch-line)`}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--gold-bg)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'9px 13px',fontWeight:600,color:V.inkFaded}}>{p.period}</td>
                    <td style={tdMono(V.ocean2)}>{fmt$(p.cost)}</td>
                    <td style={tdMono(V.terrain2)}>{fmt$(p.revenue)}</td>
                    <td style={tdMono(V.violet2)}>{fmt$(p.cashback)}</td>
                    <td style={tdMono(p.profit>=0?V.gold:V.crimson2)}>{fmt$(p.profit)}</td>
                    <td style={tdMono(p.revenue>0?(p.profit/p.revenue*100)>=0?V.terrain2:V.crimson2:V.inkGhost)}>
                      {p.revenue>0?fmtPct(p.profit/p.revenue*100):'—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <TotalsRow>
                  <td style={{padding:'9px 13px',fontWeight:800,color:V.ink}}>TOTAL</td>
                  <td style={tdMono(V.ocean2,{fontWeight:800})}>{fmt$(kpis.cost)}</td>
                  <td style={tdMono(V.terrain2,{fontWeight:800})}>{fmt$(kpis.revenue)}</td>
                  <td style={tdMono(V.violet2,{fontWeight:800})}>{fmt$(kpis.totalUSD)}</td>
                  <td style={tdMono(kpis.profit>=0?V.gold:V.crimson2,{fontWeight:800})}>{fmt$(kpis.profit)}</td>
                  <td style={tdMono(kpis.revenue>0?(kpis.profit/kpis.revenue*100)>=0?V.terrain2:V.crimson2:V.inkGhost,{fontWeight:800})}>
                    {kpis.revenue>0?fmtPct(kpis.profit/kpis.revenue*100):'—'}
                  </td>
                </TotalsRow>
              </tfoot>
            </table>
          </TableWrap>

        </div>
      )}
    </div>
    </>
  );
}