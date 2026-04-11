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
   TOKENS — Neutral Elegance (matches Dashboard)
───────────────────────────────────────────── */
const T = {
  bg:       '#FDF5EC', card:     '#FFF8F0', warm:     '#F5EDE0',
  border:   'rgba(153,126,103,0.18)', borderMid:'rgba(102,73,48,0.22)',
  ink:      '#3D2B1A', inkDim:   '#664930', inkFaded: '#8a6d56', inkGhost: '#b89e8a',
  gold:     '#A0722A', gold2:    '#C4922E', goldBg:   'rgba(160,114,42,0.08)',  goldBdr:  'rgba(160,114,42,0.22)',
  ocean:    '#2a5c7a', oceanBg:  'rgba(42,92,122,0.08)',   oceanBdr: 'rgba(42,92,122,0.2)',
  terrain:  '#4a7a35', terrBg:   'rgba(74,122,53,0.08)',   terrBdr:  'rgba(74,122,53,0.2)',
  violet:   '#5a3a6e', violBg:   'rgba(90,58,110,0.08)',   violBdr:  'rgba(90,58,110,0.2)',
  crimson:  '#8b3a2a', crimBg:   'rgba(139,58,42,0.08)',   crimBdr:  'rgba(139,58,42,0.2)',
  amber:    '#9a6b1a', amberBg:  'rgba(154,107,26,0.08)',  amberBdr: 'rgba(154,107,26,0.2)',
  serif:    "'Playfair Display', Georgia, serif",
  sans:     "'DM Sans', -apple-system, sans-serif",
  mono:     "'DM Mono', 'Cascadia Code', monospace",
  sm:       '0 1px 4px rgba(61,43,26,0.07)',
  md:       '0 4px 20px rgba(61,43,26,0.10)',
};

const CARD = { background:T.card, border:`1px solid ${T.border}`, borderRadius:14, boxShadow:T.sm };
const PIE_COLORS = ['#A0722A','#5a3a6e','#2a5c7a','#4a7a35','#8b3a2a','#9a6b1a','#7a5a3a','#3a6a5a'];

const TOOLTIP_STYLE = {
  borderRadius:10, border:`1px solid rgba(153,126,103,0.22)`,
  fontSize:11, fontFamily:T.sans,
  background:'#FFF8F0', color:'#3D2B1A',
  boxShadow:'0 4px 16px rgba(61,43,26,0.10)',
};

const inp = {
  background:T.warm, border:`1px solid ${T.border}`,
  borderRadius:8, color:T.ink, padding:'6px 10px',
  fontSize:12, fontFamily:T.sans, outline:'none',
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
   CASHBACK HELPERS — cash, YA, points
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

/* ─────────────────────────────────────────────
   REVENUE from sale_events (correct field)
───────────────────────────────────────────── */
function calcRevenue(order) {
  return (order.sale_events||[]).reduce((sum,ev) =>
    sum + (ev.items||[]).reduce((s,item) =>
      s + (parseFloat(item.sale_price)||0) * (parseInt(item.quantity)||1), 0), 0);
}

/* ─────────────────────────────────────────────
   SHARED COMPONENTS
───────────────────────────────────────────── */
function SectionDivider({ title, color=T.gold, lineColor='rgba(160,114,42,0.25)' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'18px 0 12px' }}>
      <div style={{ width:5, height:5, borderRadius:'50%', background:color, flexShrink:0 }} />
      <span style={{ fontFamily:T.serif, fontSize:10, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color, whiteSpace:'nowrap' }}>{title}</span>
      <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${lineColor},transparent)` }} />
    </div>
  );
}

function KpiCard({ label, value, sub, icon:Icon, accentColor, bgColor, bdrColor }) {
  return (
    <div style={{ ...CARD, padding:14, borderTop:`3px solid ${accentColor}` }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontFamily:T.serif, fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:T.inkFaded, marginBottom:6 }}>{label}</p>
          <p style={{ fontFamily:T.mono, fontSize:18, fontWeight:600, color:accentColor, lineHeight:1, letterSpacing:'-0.3px' }}>{value}</p>
          {sub && <p style={{ fontFamily:T.sans, fontSize:10, color:T.inkGhost, marginTop:5 }}>{sub}</p>}
        </div>
        {Icon && (
          <div style={{ width:30, height:30, borderRadius:8, background:bgColor||T.warm, border:`1px solid ${bdrColor||T.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginLeft:8 }}>
            <Icon size={13} color={accentColor} />
          </div>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, badge, subtitle, children }) {
  return (
    <div style={{ ...CARD, padding:'14px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <p style={{ fontFamily:T.serif, fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:T.inkFaded }}>{title}</p>
        {badge && <span style={{ fontSize:9, background:T.goldBg, border:`1px solid ${T.goldBdr}`, color:T.gold, padding:'2px 8px', borderRadius:99, fontWeight:700 }}>{badge}</span>}
      </div>
      {subtitle && <p style={{ fontFamily:T.sans, fontSize:10, color:T.inkGhost, marginBottom:12 }}>{subtitle}</p>}
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
          <span style={{ fontFamily:T.sans, fontSize:10, fontWeight:500, color:T.inkFaded }}>{item.label}</span>
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
              <span style={{ fontFamily:T.sans, fontSize:10, color:T.inkFaded, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.name}</span>
            </div>
            <span style={{ fontFamily:T.mono, fontSize:10, fontWeight:600, color:T.ink, flexShrink:0 }}>{fmtFn?fmtFn(d.value):d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ label='No data yet' }) {
  return (
    <div style={{ height:190, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
      <div style={{ width:36, height:36, borderRadius:10, background:T.goldBg, border:`1px solid ${T.goldBdr}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <BarChart2 size={16} color={T.gold} />
      </div>
      <p style={{ fontFamily:T.sans, fontSize:12, color:T.inkGhost }}>{label}</p>
      <p style={{ fontFamily:T.sans, fontSize:10, color:T.inkGhost, opacity:0.7 }}>Add transactions to unlock insights</p>
    </div>
  );
}

function PillGroup({ options, active, onChange }) {
  return (
    <div style={{ display:'flex', gap:2, padding:3, borderRadius:8, background:T.warm, border:`1px solid ${T.border}` }}>
      {options.map(o => {
        const on = active===o.id;
        return (
          <button key={o.id} onClick={()=>onChange(o.id)}
            style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', border:'none', fontFamily:T.sans,
              background:on?T.ink:'transparent', color:on?T.gold2:T.inkFaded, transition:'background 0.15s,color 0.15s' }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display:'flex', gap:2, padding:3, borderRadius:10, background:T.card, border:`1px solid ${T.border}`, width:'fit-content' }}>
      {tabs.map(t => {
        const Icon=t.icon, on=active===t.id;
        return (
          <button key={t.id} onClick={()=>onChange(t.id)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 13px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', border:'none', fontFamily:T.sans,
              background:on?T.ink:'transparent', color:on?T.gold2:T.inkFaded, transition:'background 0.15s,color 0.15s' }}>
            {Icon && <Icon size={13}/>} {t.label}
          </button>
        );
      })}
    </div>
  );
}

function TableCard({ title, badge, badgeColor, badgeBg, badgeBdr, children }) {
  return (
    <div style={{ ...CARD, overflow:'hidden' }}>
      <div style={{ padding:'10px 14px', borderBottom:`1px solid ${T.border}`, background:T.warm, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <p style={{ fontFamily:T.serif, fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:T.inkFaded }}>{title}</p>
        {badge && <span style={{ fontFamily:T.sans, fontSize:10, background:badgeBg||T.goldBg, color:badgeColor||T.gold, border:`1px solid ${badgeBdr||T.goldBdr}`, padding:'2px 10px', borderRadius:99, fontWeight:700 }}>{badge}</span>}
      </div>
      <div style={{ overflowX:'auto' }}>{children}</div>
    </div>
  );
}

function Th({ children }) {
  return <th style={{ padding:'9px 13px', textAlign:'left', fontFamily:T.serif, fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:T.inkFaded, whiteSpace:'nowrap', background:T.warm }}>{children}</th>;
}

/* ─────────────────────────────────────────────
   NAV OPTIONS
───────────────────────────────────────────── */
const TABS          = [
  { id:'overview',   label:'Overview',      icon:TrendingUp },
  { id:'breakdowns', label:'Breakdowns',    icon:BarChart2  },
  { id:'payments',   label:'Payments',      icon:CreditCard },
  { id:'tables',     label:'Detail Tables', icon:Filter     },
];
const MODE_OPTIONS  = [{ id:'all',label:'All' },{ id:'churning',label:'Churning' },{ id:'marketplace',label:'Marketplace' }];
const PERIOD_OPTIONS= [{ id:'monthly',label:'Monthly' },{ id:'quarterly',label:'Quarterly' },{ id:'yearly',label:'Yearly' }];

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function Analytics() {
  const [mode,          setMode]          = useState('all');
  const [period,        setPeriod]        = useState('monthly');
  const [fromDate,      setFromDate]      = useState(() => format(subMonths(new Date(),12),'yyyy-MM-dd'));
  const [toDate,        setToDate]        = useState(() => format(new Date(),'yyyy-MM-dd'));
  const [activeTab,     setActiveTab]     = useState('overview');
  const [profitMode,    setProfitMode]    = useState('accounting');
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [userEmail,     setUserEmail]     = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUserEmail(u?.email||null);
      if (u?.profit_mode) setProfitMode(u.profit_mode);
    }).catch(()=>{});
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

  /* ── filters ── */
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
    const accountingProfit = revenue - cost + totalUSD;
    const profit = profitMode==='cashback_wallet' ? accountingProfit - yaCashback : accountingProfit;
    const roi    = cost>0 ? (profit/cost)*100 : 0;
    const storeMap = {};
    filteredOrders.forEach(o => { if(o.retailer) storeMap[o.retailer]=(storeMap[o.retailer]||0)+parseFloat(o.total_cost||0); });
    const topStore = Object.entries(storeMap).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
    const inventory = filteredOrders.reduce((s,o) => s+(o.items||[]).reduce((ss,i)=>ss+(parseInt(i.quantity_ordered)||0),0), 0);
    return { revenue, cost, profit, roi, cardCashback, yaCashback, totalUSD, points, accountingProfit, topStore, inventory };
  }, [filteredOrders, filteredRewards, profitMode]);

  /* ── Period trend ── */
  const periodData = useMemo(() => {
    const map = {};
    const getKey = d => {
      if (!d) return null;
      let key = d.substring(0,7);
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

  /* ── KPI definitions ── */
  const KPI_CARDS = [
    { label:'Sale Revenue',   value:fmt$(kpis.revenue),      sub:`${filteredOrders.filter(o=>calcRevenue(o)>0).length} sold`,  icon:TrendingUp, accentColor:T.terrain, bgColor:T.terrBg,  bdrColor:T.terrBdr  },
    { label:'Total Cost',     value:fmt$(kpis.cost),         sub:`${filteredOrders.length} orders`,                            icon:CreditCard, accentColor:T.ocean,   bgColor:T.oceanBg, bdrColor:T.oceanBdr },
    { label:profitMode==='cashback_wallet'?'Wallet Profit':'Net Profit',
                              value:fmt$(kpis.profit),       sub:fmtPct(kpis.roi)+' ROI',                                      icon:DollarSign, accentColor:kpis.profit>=0?T.gold:T.crimson,  bgColor:kpis.profit>=0?T.goldBg:T.crimBg,  bdrColor:kpis.profit>=0?T.goldBdr:T.crimBdr  },
    { label:'ROI',            value:fmtPct(kpis.roi),        sub:'return on investment',                                       icon:Percent,    accentColor:kpis.roi>=0?T.ocean:T.crimson,    bgColor:T.oceanBg, bdrColor:T.oceanBdr },
    { label:'Card Cashback',  value:fmt$(kpis.cardCashback), sub:'credit card rewards',                                        icon:CreditCard, accentColor:T.violet,  bgColor:T.violBg,  bdrColor:T.violBdr  },
    { label:'YA Cashback',    value:fmt$(kpis.yaCashback),   sub:'Young Adult rewards',                                        icon:Star,       accentColor:T.gold,    bgColor:T.goldBg,  bdrColor:T.goldBdr  },
    { label:'Points Earned',  value:fmtPts(kpis.points),     sub:'reward points',                                              icon:Gift,       accentColor:T.amber,   bgColor:T.amberBg, bdrColor:T.amberBdr },
    { label:'Total Cashback', value:fmt$(kpis.totalUSD),     sub:'card CB + YA combined',                                      icon:TrendingUp, accentColor:T.terrain, bgColor:T.terrBg,  bdrColor:T.terrBdr  },
  ];

  /* ── Loading skeleton ── */
  if (isLoading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:8, paddingBottom:40 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
        {[...Array(8)].map((_,i)=>(
          <div key={i} style={{ height:76, borderRadius:12, background:T.warm, border:`1px solid ${T.border}` }} />
        ))}
      </div>
      <div style={{ height:200, borderRadius:14, background:T.warm, border:`1px solid ${T.border}`, marginTop:8 }} />
    </div>
  );

  return (
    <div style={{ paddingBottom:40, fontFamily:T.sans }}>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:16 }}>
        <div>
          <h1 style={{ fontFamily:T.serif, fontSize:24, fontWeight:900, color:T.ink, letterSpacing:'-0.3px', lineHeight:1.1 }}>Analytics & Insights</h1>
          <p style={{ fontFamily:T.sans, fontSize:11, color:T.inkFaded, marginTop:4 }}>
            {mode==='all'?'Combined overview':mode==='churning'?'Churning performance':'Marketplace performance'}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <PillGroup options={MODE_OPTIONS} active={mode} onChange={setMode} />
          <button onClick={handleExport}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:8, fontSize:11, fontWeight:600, background:T.card, border:`1px solid ${T.border}`, color:T.inkFaded, cursor:'pointer', fontFamily:T.sans }}>
            <Download size={13}/> Export CSV
          </button>
          <button onClick={()=>refetch()} disabled={isLoading}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:8, fontSize:11, fontWeight:700, background:T.ink, border:'none', color:T.gold2, cursor:'pointer', fontFamily:T.serif, letterSpacing:'0.04em' }}>
            <RefreshCw size={13} className={isLoading?'animate-spin':''}/> Refresh
          </button>
        </div>
      </div>

      {/* ── FILTER CARD ── */}
      <div style={{ ...CARD, padding:'12px 16px', display:'flex', flexWrap:'wrap', alignItems:'flex-end', gap:16, marginBottom:14 }}>
        <div>
          <p style={{ fontFamily:T.serif, fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:T.inkFaded, marginBottom:7 }}>Period</p>
          <PillGroup options={PERIOD_OPTIONS} active={period} onChange={setPeriod} />
        </div>
        <div>
          <p style={{ fontFamily:T.serif, fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:T.inkFaded, marginBottom:7 }}>Date Range</p>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} style={inp}/>
            <span style={{ color:T.inkGhost, fontSize:12 }}>→</span>
            <input type="date" value={toDate}   onChange={e=>setToDate(e.target.value)}   style={inp}/>
          </div>
        </div>
      </div>

      {/* ── KPI GRID ── */}
      <SectionDivider title="Survey Markers" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:10 }}>
        {KPI_CARDS.map(k => <KpiCard key={k.label} {...k}/>)}
      </div>

      {/* ── PROFIT BREAKDOWN ── */}
      <div style={{ ...CARD, overflow:'hidden', marginBottom:14 }}>
        <button onClick={()=>setShowBreakdown(p=>!p)}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:T.warm, borderBottom:showBreakdown?`1px solid ${T.border}`:'none', cursor:'pointer', border:'none', fontFamily:T.sans }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <Info size={13} color={T.gold}/>
            <span style={{ fontFamily:T.serif, fontSize:11, fontWeight:700, color:T.ink }}>Profit Breakdown</span>
            <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:99, background:T.goldBg, color:T.gold, border:`1px solid ${T.goldBdr}` }}>
              {profitMode==='cashback_wallet'?'Cashback Wallet Mode':'Accounting Mode'}
            </span>
          </div>
          {showBreakdown?<ChevronUp size={13} color={T.inkFaded}/>:<ChevronDown size={13} color={T.inkFaded}/>}
        </button>
        {showBreakdown && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, padding:'10px 14px' }}>
            {[
              { label:'Revenue',    value:fmt$(kpis.revenue),       prefix:'',  color:T.terrain, bg:T.terrBg,  bdr:T.terrBdr  },
              { label:'Card Spend', value:fmt$(kpis.cost),          prefix:'−', color:T.crimson, bg:T.crimBg,  bdr:T.crimBdr  },
              { label:'Card CB',    value:fmt$(kpis.cardCashback),  prefix:'+', color:T.violet,  bg:T.violBg,  bdr:T.violBdr  },
              { label:'YA CB',      value:fmt$(kpis.yaCashback),    prefix:'+', color:T.gold,    bg:T.goldBg,  bdr:T.goldBdr  },
              { label:profitMode==='cashback_wallet'?'Wallet Profit':'Net Profit',
                                    value:fmt$(kpis.profit),        prefix:'',  color:kpis.profit>=0?T.gold:T.crimson, bg:kpis.profit>=0?T.goldBg:T.crimBg, bdr:kpis.profit>=0?T.goldBdr:T.crimBdr },
            ].map(b=>(
              <div key={b.label} style={{ borderRadius:10, padding:'10px 12px', background:b.bg, border:`1px solid ${b.bdr}` }}>
                <p style={{ fontFamily:T.serif, fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:b.color, marginBottom:4 }}>{b.label}</p>
                <p style={{ fontFamily:T.mono, fontSize:16, fontWeight:600, color:b.color, lineHeight:1 }}>{b.prefix}{b.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ marginBottom:14 }}>
        <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab}/>
      </div>

      {/* ════════════════════════════
          OVERVIEW
      ════════════════════════════ */}
      {activeTab==='overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12 }}>

            <ChartCard title="Revenue & Profit Trend" badge={PERIOD_OPTIONS.find(p=>p.id===period)?.label}>
              {periodData.length===0 ? <EmptyState/> : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={periodData} margin={{top:4,right:4,left:0,bottom:0}}>
                      <defs>
                        {[[  'gRev',T.terrain],['gPro',T.gold],['gCash',T.violet]].map(([id,c])=>(
                          <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={c} stopOpacity={0.18}/>
                            <stop offset="95%" stopColor={c} stopOpacity={0}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(153,126,103,0.3)"/>
                      <XAxis dataKey="label" tick={{fontSize:10,fill:T.inkGhost,fontFamily:T.sans}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:T.inkGhost,fontFamily:T.mono}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>fmt$(v)}/>
                      <Area type="monotone" dataKey="revenue"  stroke={T.terrain} fill="url(#gRev)"  strokeWidth={2} name="Revenue"  dot={{r:3,fill:T.terrain}}/>
                      <Area type="monotone" dataKey="profit"   stroke={T.gold}    fill="url(#gPro)"  strokeWidth={2} name="Profit"   dot={{r:3,fill:T.gold   }}/>
                      <Area type="monotone" dataKey="cashback" stroke={T.violet}  fill="url(#gCash)" strokeWidth={2} name="Cashback" dot={{r:3,fill:T.violet }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                  <ChartLegend items={[{label:'Revenue',color:T.terrain},{label:'Profit',color:T.gold},{label:'Cashback',color:T.violet}]}/>
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
                          <stop offset="5%"  stopColor={T.violet} stopOpacity={0.18}/>
                          <stop offset="95%" stopColor={T.violet} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(153,126,103,0.3)"/>
                      <XAxis dataKey="label" tick={{fontSize:10,fill:T.inkGhost}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:T.inkGhost}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>fmt$(v)}/>
                      <Area type="monotone" dataKey="cumProfit" stroke={T.violet} fill="url(#gCum)" strokeWidth={2.5} name="Cumulative Profit" dot={{r:3,fill:T.violet}}/>
                    </AreaChart>
                  </ResponsiveContainer>
                  <ChartLegend items={[{label:'Cumulative Profit',color:T.violet}]}/>
                </>
              )}
            </ChartCard>

            <ChartCard title="Period P&L">
              {periodData.length===0 ? <EmptyState/> : (
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={periodData} margin={{top:4,right:4,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(153,126,103,0.3)"/>
                    <XAxis dataKey="label" tick={{fontSize:10,fill:T.inkGhost}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:T.inkGhost}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>fmt$(v)}/>
                    <Bar dataKey="profit" name="Net Profit" radius={[5,5,0,0]}>
                      {periodData.map((d,i)=><Cell key={i} fill={d.profit>=0?T.terrain:T.crimson}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>
      )}

      {/* ════════════════════════════
          BREAKDOWNS
      ════════════════════════════ */}
      {activeTab==='breakdowns' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <ChartCard title="Store Performance" badge={`${storeData.length} Stores`}>
              {storeData.length===0 ? <EmptyState/> : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={storeData.slice(0,8).map(s=>({name:s.store,revenue:s.revenue,profit:s.profit}))} layout="vertical" margin={{left:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(153,126,103,0.3)" horizontal={false}/>
                      <XAxis type="number" tick={{fontSize:10,fill:T.inkGhost}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                      <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:T.inkGhost}} axisLine={false} tickLine={false} width={72}/>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>fmt$(v)}/>
                      <Bar dataKey="revenue" name="Revenue" fill={T.ocean}   radius={[0,5,5,0]}/>
                      <Bar dataKey="profit"  name="Profit"  fill={T.terrain} radius={[0,5,5,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                  <ChartLegend items={[{label:'Revenue',color:T.ocean},{label:'Profit',color:T.terrain}]}/>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(153,126,103,0.3)"/>
                    <XAxis dataKey="store" tick={{fontSize:9,fill:T.inkGhost}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:T.inkGhost}} axisLine={false} tickLine={false} tickFormatter={v=>`${v.toFixed(0)}%`}/>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>`${Number(v).toFixed(2)}%`}/>
                    <Bar dataKey="roi" name="ROI %" radius={[5,5,0,0]}>
                      {storeData.slice(0,8).map((s,i)=><Cell key={i} fill={s.roi>=0?T.terrain:T.crimson}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <div style={{ ...CARD, padding:'14px 16px' }}>
              <p style={{ fontFamily:T.serif, fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:T.inkFaded, marginBottom:14 }}>Store Summary</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { label:'Total Revenue', value:fmt$(storeData.reduce((s,x)=>s+x.revenue,0)), color:T.terrain, bg:T.terrBg, bdr:T.terrBdr },
                  { label:'Total Profit',  value:fmt$(storeData.reduce((s,x)=>s+x.profit,0)),  color:T.gold,    bg:T.goldBg, bdr:T.goldBdr },
                  { label:'Total CB',      value:fmt$(storeData.reduce((s,x)=>s+x.cashback,0)),color:T.violet,  bg:T.violBg, bdr:T.violBdr },
                  { label:'Avg ROI',       value:fmtPct(kpis.roi),                              color:T.ocean,   bg:T.oceanBg,bdr:T.oceanBdr },
                ].map(s=>(
                  <div key={s.label} style={{ borderRadius:10, padding:12, background:s.bg, border:`1px solid ${s.bdr}` }}>
                    <p style={{ fontFamily:T.serif, fontSize:9, color:s.color, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>{s.label}</p>
                    <p style={{ fontFamily:T.mono, fontSize:16, fontWeight:600, color:s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════
          PAYMENTS
      ════════════════════════════ */}
      {activeTab==='payments' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* 3 cashback type cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {[
              { label:'Card Cashback', value:fmt$(kpis.cardCashback), sub:'From credit cards',    color:T.violet, bg:T.violBg,  bdr:T.violBdr  },
              { label:'YA Cashback',   value:fmt$(kpis.yaCashback),   sub:'Young Adult rewards',  color:T.gold,   bg:T.goldBg,  bdr:T.goldBdr  },
              { label:'Points Earned', value:fmtPts(kpis.points),     sub:'Reward points',        color:T.amber,  bg:T.amberBg, bdr:T.amberBdr },
            ].map(c=>(
              <div key={c.label} style={{ ...CARD, padding:14, borderTop:`3px solid ${c.color}` }}>
                <p style={{ fontFamily:T.serif, fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:c.color, marginBottom:6 }}>{c.label}</p>
                <p style={{ fontFamily:T.mono, fontSize:22, fontWeight:600, color:c.color, lineHeight:1 }}>{c.value}</p>
                <p style={{ fontFamily:T.sans, fontSize:10, color:T.inkGhost, marginTop:5 }}>{c.sub}</p>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <ChartCard title="Spend by Payment Method">
              {paymentData.length===0 ? <EmptyState/> : (
                <>
                  <ResponsiveContainer width="100%" height={190}>
                    <BarChart data={paymentData.slice(0,8)} margin={{top:4,right:4,left:0,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(153,126,103,0.3)"/>
                      <XAxis dataKey="name" tick={{fontSize:9,fill:T.inkGhost}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:T.inkGhost}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>fmt$(v)}/>
                      <Bar dataKey="spent"    name="Spent"    fill={T.violet}  radius={[5,5,0,0]}/>
                      <Bar dataKey="cashback" name="Cashback" fill={T.terrain} radius={[5,5,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                  <ChartLegend items={[{label:'Spent',color:T.violet},{label:'Cashback',color:T.terrain}]}/>
                </>
              )}
            </ChartCard>

            <ChartCard title="Cashback Distribution" subtitle="Card cashback vs YA cashback split">
              {cashbackPieData.length===0
                ? <EmptyState label="No cashback data yet"/>
                : <DonutChart data={cashbackPieData} colors={[T.violet,T.gold]} fmtFn={fmt$}/>
              }
            </ChartCard>
          </div>

          <ChartCard title="Effective vs Stated Cashback Rate" subtitle="Comparing actual cashback rate to each card's stated rate">
            {paymentData.length===0 ? <EmptyState/> : (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={paymentData} margin={{top:4,right:4,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(153,126,103,0.3)"/>
                    <XAxis dataKey="name" tick={{fontSize:9,fill:T.inkGhost}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:T.inkGhost}} axisLine={false} tickLine={false} tickFormatter={v=>`${v.toFixed(1)}%`}/>
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v=>`${Number(v).toFixed(2)}%`}/>
                    <Bar dataKey="statedRate"    name="Stated Rate"    fill={T.violet}  radius={[5,5,0,0]}/>
                    <Bar dataKey="effectiveRate" name="Effective Rate" radius={[5,5,0,0]}>
                      {paymentData.map((p,i)=><Cell key={i} fill={p.effectiveRate>=p.statedRate?T.terrain:T.gold}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <ChartLegend items={[{label:'Stated Rate',color:T.violet},{label:'≥ Stated',color:T.terrain},{label:'< Stated',color:T.gold}]}/>
              </>
            )}
          </ChartCard>

          <TableCard title="Payment Method Performance" badge={`${paymentData.length} cards`} badgeColor={T.violet} badgeBg={T.violBg} badgeBdr={T.violBdr}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:T.sans }}>
              <thead><tr style={{background:T.warm}}>
                {['Card','Txns','Spent','Cashback','Stated %','Effective %','Variance'].map(h=><Th key={h}>{h}</Th>)}
              </tr></thead>
              <tbody>
                {paymentData.map(p=>(
                  <tr key={p.id} style={{borderTop:`1px solid ${T.border}`}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(160,114,42,0.03)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'9px 13px',fontWeight:600,color:T.ink}}>{p.name}</td>
                    <td style={{padding:'9px 13px',color:T.inkFaded}}>{p.txns}</td>
                    <td style={{padding:'9px 13px',color:T.ocean,  fontWeight:600,fontFamily:T.mono}}>{fmt$(p.spent)}</td>
                    <td style={{padding:'9px 13px',color:T.violet, fontWeight:600,fontFamily:T.mono}}>{fmt$(p.cashback)}</td>
                    <td style={{padding:'9px 13px',color:T.inkFaded,fontFamily:T.mono}}>{fmtPct(p.statedRate)}</td>
                    <td style={{padding:'9px 13px',fontWeight:600,fontFamily:T.mono,color:p.effectiveRate>=p.statedRate?T.terrain:T.gold}}>{fmtPct(p.effectiveRate)}</td>
                    <td style={{padding:'9px 13px',fontWeight:600,fontFamily:T.mono,color:p.variance>=0?T.terrain:T.crimson}}>{p.variance>=0?'+':''}{fmtPct(p.variance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{borderTop:`2px solid ${T.borderMid}`,background:T.warm}}>
                  <td style={{padding:'9px 13px',fontWeight:700,color:T.ink,fontFamily:T.serif}}>TOTAL</td>
                  <td style={{padding:'9px 13px',fontWeight:700,color:T.inkDim}}>{paymentData.reduce((s,p)=>s+p.txns,0)}</td>
                  <td style={{padding:'9px 13px',fontWeight:700,color:T.ocean,  fontFamily:T.mono}}>{fmt$(paymentData.reduce((s,p)=>s+p.spent,0))}</td>
                  <td style={{padding:'9px 13px',fontWeight:700,color:T.violet, fontFamily:T.mono}}>{fmt$(paymentData.reduce((s,p)=>s+p.cashback,0))}</td>
                  <td colSpan={3} style={{padding:'9px 13px',color:T.inkGhost,fontSize:10}}>
                    Best card: <span style={{color:T.gold,fontWeight:600}}>{[...paymentData].sort((a,b)=>b.effectiveRate-a.effectiveRate)[0]?.name||'—'}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </TableCard>
        </div>
      )}

      {/* ════════════════════════════
          DETAIL TABLES
      ════════════════════════════ */}
      {activeTab==='tables' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          <TableCard title="Store Breakdown" badge={`${storeData.length} stores`} badgeColor={T.terrain} badgeBg={T.terrBg} badgeBdr={T.terrBdr}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:T.sans }}>
              <thead><tr style={{background:T.warm}}>
                {['Store','Cost','Revenue','Profit','Cashback','ROI','Txns'].map(h=><Th key={h}>{h}</Th>)}
              </tr></thead>
              <tbody>
                {storeData.map(s=>(
                  <tr key={s.store} style={{borderTop:`1px solid ${T.border}`}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(160,114,42,0.03)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'9px 13px',fontWeight:600,color:T.ink}}>{s.store}</td>
                    <td style={{padding:'9px 13px',color:T.ocean,  fontWeight:600,fontFamily:T.mono}}>{fmt$(s.cost)}</td>
                    <td style={{padding:'9px 13px',color:T.terrain,fontWeight:600,fontFamily:T.mono}}>{fmt$(s.revenue)}</td>
                    <td style={{padding:'9px 13px',fontWeight:600,fontFamily:T.mono,color:s.profit>=0?T.terrain:T.crimson}}>{fmt$(s.profit)}</td>
                    <td style={{padding:'9px 13px',color:T.violet, fontWeight:600,fontFamily:T.mono}}>{fmt$(s.cashback)}</td>
                    <td style={{padding:'9px 13px',fontWeight:600,fontFamily:T.mono,color:s.roi>=0?T.terrain:T.crimson}}>{fmtPct(s.roi)}</td>
                    <td style={{padding:'9px 13px',color:T.inkFaded}}>{s.txns}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{borderTop:`2px solid ${T.borderMid}`,background:T.warm}}>
                  <td style={{padding:'9px 13px',fontWeight:700,color:T.ink,fontFamily:T.serif}}>TOTAL</td>
                  <td style={{padding:'9px 13px',fontWeight:700,color:T.ocean,  fontFamily:T.mono}}>{fmt$(storeData.reduce((s,x)=>s+x.cost,0))}</td>
                  <td style={{padding:'9px 13px',fontWeight:700,color:T.terrain,fontFamily:T.mono}}>{fmt$(storeData.reduce((s,x)=>s+x.revenue,0))}</td>
                  <td style={{padding:'9px 13px',fontWeight:700,fontFamily:T.mono,color:storeData.reduce((s,x)=>s+x.profit,0)>=0?T.terrain:T.crimson}}>{fmt$(storeData.reduce((s,x)=>s+x.profit,0))}</td>
                  <td style={{padding:'9px 13px',fontWeight:700,color:T.violet,  fontFamily:T.mono}}>{fmt$(storeData.reduce((s,x)=>s+x.cashback,0))}</td>
                  <td style={{padding:'9px 13px',fontWeight:700,fontFamily:T.mono,color:kpis.roi>=0?T.terrain:T.crimson}}>{fmtPct(kpis.roi)}</td>
                  <td style={{padding:'9px 13px',fontWeight:700,color:T.inkDim}}>{storeData.reduce((s,x)=>s+x.txns,0)}</td>
                </tr>
              </tfoot>
            </table>
          </TableCard>

          <TableCard title="Period-by-Period Data">
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:T.sans }}>
              <thead><tr style={{background:T.warm}}>
                {['Period','Cost','Revenue','Cashback','Net Profit','Margin'].map(h=><Th key={h}>{h}</Th>)}
              </tr></thead>
              <tbody>
                {periodData.map(p=>(
                  <tr key={p.period} style={{borderTop:`1px solid ${T.border}`}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(160,114,42,0.03)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'9px 13px',fontWeight:600,color:T.inkFaded,fontFamily:T.mono}}>{p.period}</td>
                    <td style={{padding:'9px 13px',color:T.ocean,  fontWeight:600,fontFamily:T.mono}}>{fmt$(p.cost)}</td>
                    <td style={{padding:'9px 13px',color:T.terrain,fontWeight:600,fontFamily:T.mono}}>{fmt$(p.revenue)}</td>
                    <td style={{padding:'9px 13px',color:T.violet, fontWeight:600,fontFamily:T.mono}}>{fmt$(p.cashback)}</td>
                    <td style={{padding:'9px 13px',fontWeight:600,fontFamily:T.mono,color:p.profit>=0?T.gold:T.crimson}}>{fmt$(p.profit)}</td>
                    <td style={{padding:'9px 13px',fontWeight:600,fontFamily:T.mono,color:p.revenue>0?(p.profit/p.revenue*100)>=0?T.terrain:T.crimson:T.inkGhost}}>
                      {p.revenue>0?fmtPct(p.profit/p.revenue*100):'—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{borderTop:`2px solid ${T.borderMid}`,background:T.warm}}>
                  <td style={{padding:'9px 13px',fontWeight:700,color:T.ink,fontFamily:T.serif}}>TOTAL</td>
                  <td style={{padding:'9px 13px',fontWeight:700,color:T.ocean,  fontFamily:T.mono}}>{fmt$(kpis.cost)}</td>
                  <td style={{padding:'9px 13px',fontWeight:700,color:T.terrain,fontFamily:T.mono}}>{fmt$(kpis.revenue)}</td>
                  <td style={{padding:'9px 13px',fontWeight:700,color:T.violet, fontFamily:T.mono}}>{fmt$(kpis.totalUSD)}</td>
                  <td style={{padding:'9px 13px',fontWeight:700,fontFamily:T.mono,color:kpis.profit>=0?T.gold:T.crimson}}>{fmt$(kpis.profit)}</td>
                  <td style={{padding:'9px 13px',fontWeight:700,fontFamily:T.mono,color:kpis.revenue>0?(kpis.profit/kpis.revenue*100)>=0?T.terrain:T.crimson:T.inkGhost}}>
                    {kpis.revenue>0?fmtPct(kpis.profit/kpis.revenue*100):'—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </TableCard>

        </div>
      )}

    </div>
  );
}