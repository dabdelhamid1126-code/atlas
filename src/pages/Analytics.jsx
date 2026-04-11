import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { format, subMonths, parseISO } from 'date-fns';
import {
  RefreshCw, Download, TrendingUp, DollarSign,
  Percent, CreditCard, Star, Gift, BarChart2,
  ChevronDown, ChevronUp, Info, Filter
} from 'lucide-react';

/* ─────────────────────────────────────────────
   TOKENS — Neutral Elegance
───────────────────────────────────────────── */
const T = {
  // surfaces
  bg:        '#FDF5EC',
  card:      '#FFF8F0',
  warm:      '#F5EDE0',
  border:    'rgba(153,126,103,0.18)',
  borderMid: 'rgba(102,73,48,0.22)',
  // ink
  ink:       '#3D2B1A',
  inkDim:    '#664930',
  inkFaded:  '#8a6d56',
  inkGhost:  '#b89e8a',
  // accents
  gold:      '#A0722A',
  goldBg:    'rgba(160,114,42,0.08)',
  goldBdr:   'rgba(160,114,42,0.22)',
  ocean:     '#2a5c7a',
  oceanBg:   'rgba(42,92,122,0.08)',
  oceanBdr:  'rgba(42,92,122,0.2)',
  terrain:   '#4a7a35',
  terrainBg: 'rgba(74,122,53,0.08)',
  terrainBdr:'rgba(74,122,53,0.2)',
  violet:    '#5a3a6e',
  violetBg:  'rgba(90,58,110,0.08)',
  violetBdr: 'rgba(90,58,110,0.2)',
  crimson:   '#8b3a2a',
  crimsonBg: 'rgba(139,58,42,0.08)',
  crimsonBdr:'rgba(139,58,42,0.2)',
  amber:     '#9a6a10',
  amberBg:   'rgba(154,106,16,0.08)',
  amberBdr:  'rgba(154,106,16,0.2)',
  // fonts
  serif: "'Playfair Display', Georgia, serif",
  sans:  "'DM Sans', -apple-system, sans-serif",
  mono:  "'DM Mono', 'Cascadia Code', monospace",
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const fmt$ = (v) => {
  const n = Math.abs(v || 0);
  if (n >= 1_000_000) return `$${(v/1_000_000).toFixed(1)}M`;
  if (n >= 10_000)    return `$${(v/1_000).toFixed(1)}K`;
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(v||0);
};
const fmtPts = (v) => `${(v||0).toLocaleString()} pts`;
const fmtPct = (v) => `${(v||0).toFixed(1)}%`;

// Revenue from sale_events — the CORRECT formula
const calcRevenue = (orders) =>
  orders.reduce((sum, o) =>
    sum + (o.sale_events||[]).reduce((s, ev) =>
      s + (ev.items||[]).reduce((is, item) =>
        is + (parseFloat(item.sale_price)||0) * (parseInt(item.quantity)||1), 0), 0), 0);

// Cost from orders
const calcCost = (orders) =>
  orders.reduce((s, o) => s + parseFloat(o.final_cost||o.total_cost||0), 0);

// Revenue for a single order
const orderRevenue = (o) =>
  (o.sale_events||[]).reduce((s, ev) =>
    (ev.items||[]).reduce((is, item) =>
      is + (parseFloat(item.sale_price)||0)*(parseInt(item.quantity)||1), s), s);

// YA keyword check
const isYA = (r) =>
  r.notes?.includes('Young Adult') ||
  r.notes?.includes('YACB') ||
  r.notes?.includes('Prime Young Adult');

/* ─────────────────────────────────────────────
   CSS (injected once)
───────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap');

  .an-card {
    background: ${T.card};
    border: 1px solid ${T.border};
    border-radius: 14px;
    box-shadow: 0 1px 4px rgba(61,43,26,0.07);
  }
  .an-pill-group {
    display: flex;
    background: ${T.warm};
    border: 1px solid ${T.border};
    border-radius: 8px;
    padding: 3px;
    gap: 2px;
  }
  .an-pill {
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    background: transparent;
    color: ${T.inkFaded};
    font-family: ${T.sans};
    transition: background 0.12s, color 0.12s;
  }
  .an-pill.active { background: ${T.ink}; color: #FFF8F0; }
  .an-pill:hover:not(.active) { background: rgba(61,43,26,0.06); color: ${T.inkDim}; }

  .an-tab {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 8px;
    font-size: 11px; font-weight: 600;
    cursor: pointer; border: none;
    background: transparent;
    color: ${T.inkFaded};
    font-family: ${T.sans};
    transition: background 0.12s, color 0.12s;
  }
  .an-tab.active { background: ${T.ink}; color: #FFF8F0; }
  .an-tab:hover:not(.active) { background: rgba(61,43,26,0.06); color: ${T.inkDim}; }

  .an-inp {
    background: ${T.warm};
    border: 1px solid ${T.border};
    border-radius: 8px;
    color: ${T.ink};
    padding: 6px 10px;
    font-size: 12px;
    font-family: ${T.sans};
    outline: none;
  }
  .an-inp:focus { border-color: ${T.goldBdr}; }

  .an-th {
    padding: 9px 13px;
    text-align: left;
    font-family: ${T.serif};
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: ${T.inkFaded};
    white-space: nowrap;
    background: ${T.warm};
  }
  .an-td {
    padding: 10px 13px;
    border-top: 1px solid ${T.border};
    font-size: 12px;
    color: ${T.ink};
    font-family: ${T.sans};
  }
  .an-tr:hover .an-td { background: rgba(160,114,42,0.03); }

  .an-tooltip {
    background: ${T.card} !important;
    border: 1px solid ${T.border} !important;
    border-radius: 10px !important;
    font-size: 11px !important;
    color: ${T.ink} !important;
    box-shadow: 0 4px 16px rgba(61,43,26,0.1) !important;
  }

  @keyframes an-fadeup {
    from { opacity:0; transform:translateY(6px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .an-fade { animation: an-fadeup 0.3s ease both; }
`;

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */

function SectionDiv({ title, color = T.gold, lineColor = 'rgba(160,114,42,0.25)' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'18px 0 12px' }}>
      <div style={{ width:5, height:5, borderRadius:'50%', background:color, flexShrink:0 }} />
      <span style={{ fontFamily:T.serif, fontSize:10, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color, whiteSpace:'nowrap' }}>{title}</span>
      <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${lineColor},rgba(160,114,42,0.05),transparent)` }} />
    </div>
  );
}

function KpiCard({ label, value, sub, color, bg, bdr, icon: Icon }) {
  return (
    <div className="an-card an-fade" style={{ padding:14, borderTop:`3px solid ${color}`, position:'relative' }}>
      <div style={{ fontFamily:T.serif, fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color, marginBottom:5 }}>{label}</div>
      <div style={{ fontFamily:T.mono, fontSize:19, fontWeight:600, lineHeight:1, color, letterSpacing:'-0.3px' }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:T.inkGhost, marginTop:4, fontFamily:T.sans }}>{sub}</div>}
      {Icon && (
        <div style={{ position:'absolute', top:12, right:12, width:28, height:28, borderRadius:7, background:bg, border:`1px solid ${bdr}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={13} color={color} />
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, badge, children, style }) {
  return (
    <div className="an-card" style={{ padding:'14px 16px', ...style }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontFamily:T.serif, fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:T.inkFaded }}>{title}</span>
        {badge && <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:99, background:T.goldBg, color:T.gold, border:`1px solid ${T.goldBdr}` }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function ChartLegend({ items }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginTop:10 }}>
      {items.map(item => (
        <div key={item.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:20, height:3, borderRadius:99, background:item.color }} />
          <span style={{ fontSize:10, fontWeight:600, color:T.inkFaded, fontFamily:T.sans }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutLegend({ data, colors, formatter }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6, flex:1, minWidth:0 }}>
      {data.map((d,i) => (
        <div key={d.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:colors[i%colors.length], flexShrink:0 }} />
            <span style={{ fontSize:10, color:T.inkFaded, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:T.sans }}>{d.name}</span>
          </div>
          <span style={{ fontSize:10, fontWeight:700, color:T.ink, flexShrink:0, fontFamily:T.mono }}>{formatter ? formatter(d.value) : d.value}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label = 'No data yet' }) {
  return (
    <div style={{ height:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:T.inkGhost, gap:8 }}>
      <BarChart2 size={28} color={T.inkGhost} />
      <span style={{ fontSize:12, fontFamily:T.sans }}>{label}</span>
    </div>
  );
}

const CHART_TOOLTIP = {
  contentStyle: {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    fontSize: 11,
    color: T.ink,
    boxShadow: '0 4px 16px rgba(61,43,26,0.1)',
    fontFamily: T.sans,
  },
};

const PIE_COLORS   = [T.gold, T.violet, T.ocean, T.terrain, T.crimson, T.amber, '#997E67', '#664930'];
const CHART_COLORS = { revenue:'#2a5c7a', cost:'#8b3a2a', profit:'#4a7a35', cashback:'#5a3a6e', points:'#9a6a10', ya:'#A0722A' };

/* ─────────────────────────────────────────────
   MAIN ANALYTICS PAGE
───────────────────────────────────────────── */
export default function Analytics() {
  const [mode,    setMode]    = useState('all');
  const [period,  setPeriod]  = useState('monthly');
  const [fromDate,setFromDate]= useState(() => format(subMonths(new Date(),12),'yyyy-MM-dd'));
  const [toDate,  setToDate]  = useState(() => format(new Date(),'yyyy-MM-dd'));
  const [activeTab,setActiveTab] = useState('overview');
  const [profitMode,setProfitMode] = useState('accounting');
  const [showBreakdown,setShowBreakdown] = useState(true);
  const [userEmail,setUserEmail] = useState(null);

  useEffect(() => {
    base44.auth.me()
      .then(u => { setUserEmail(u?.email); if(u?.profit_mode) setProfitMode(u.profit_mode); })
      .catch(()=>{});
  }, []);

  const { data: orders=[], isLoading, refetch } = useQuery({
    queryKey: ['analyticsOrders', userEmail],
    queryFn: () => userEmail ? base44.entities.PurchaseOrder.filter({ created_by: userEmail }, '-order_date') : [],
    enabled: !!userEmail,
  });
  const { data: rewards=[] } = useQuery({
    queryKey: ['analyticsRewards', userEmail],
    queryFn: () => userEmail ? base44.entities.Reward.filter({ created_by: userEmail }) : [],
    enabled: !!userEmail,
  });
  const { data: creditCards=[] } = useQuery({
    queryKey: ['analyticsCreditCards', userEmail],
    queryFn: () => userEmail ? base44.entities.CreditCard.filter({ created_by: userEmail }) : [],
    enabled: !!userEmail,
  });

  /* ── Filtered orders ── */
  const filteredOrders = useMemo(() => orders.filter(o => {
    const d = o.order_date || o.created_date;
    if (fromDate && d < fromDate) return false;
    if (toDate   && d > toDate)   return false;
    if (mode === 'churning'   && o.order_type !== 'churning')   return false;
    if (mode === 'marketplace'&& o.order_type !== 'marketplace') return false;
    return true;
  }), [orders, mode, fromDate, toDate]);

  /* ── Filtered rewards (by date range) ── */
  const filteredRewards = useMemo(() =>
    rewards.filter(r => {
      const d = r.date_earned;
      if (fromDate && d < fromDate) return false;
      if (toDate   && d > toDate)   return false;
      return true;
    }), [rewards, fromDate, toDate]);

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const revenue  = calcRevenue(filteredOrders);
    const cost     = calcCost(filteredOrders);

    // Cashback split
    const usdRewards    = filteredRewards.filter(r => r.currency === 'USD');
    const yaCashback    = usdRewards.filter(isYA).reduce((s,r)=>s+(r.amount||0),0);
    const cardCashback  = usdRewards.filter(r=>!isYA(r)).reduce((s,r)=>s+(r.amount||0),0);
    const totalCashback = cardCashback + yaCashback;
    const points        = filteredRewards.filter(r=>r.currency==='points').reduce((s,r)=>s+(r.amount||0),0);

    // Profit
    const accountingProfit = revenue - cost + totalCashback;
    const profit = profitMode === 'cashback_wallet' ? accountingProfit - yaCashback : accountingProfit;
    const roi    = cost > 0 ? (profit/cost)*100 : 0;

    // Top store by purchases
    const storeMap = {};
    filteredOrders.forEach(o => {
      if (o.retailer) storeMap[o.retailer] = (storeMap[o.retailer]||0) + parseFloat(o.total_cost||0);
    });
    const topStore = Object.entries(storeMap).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';

    return { revenue, cost, profit, roi, cardCashback, yaCashback, totalCashback, points, accountingProfit, topStore };
  }, [filteredOrders, filteredRewards, profitMode]);

  /* ── Period trend data ── */
  const periodData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const d = o.order_date||o.created_date; if (!d) return;
      const key = d.substring(0,7);
      if (!map[key]) map[key] = { period:key, revenue:0, cost:0, cashback:0, yacashback:0, points:0 };
      map[key].revenue += orderRevenue(o);
      map[key].cost    += parseFloat(o.final_cost||o.total_cost||0);
    });
    filteredRewards.forEach(r => {
      const d = r.date_earned; if (!d) return;
      const key = d.substring(0,7);
      if (!map[key]) map[key] = { period:key, revenue:0, cost:0, cashback:0, yacashback:0, points:0 };
      if (r.currency === 'USD') {
        if (isYA(r)) map[key].yacashback += r.amount||0;
        else         map[key].cashback   += r.amount||0;
      }
      if (r.currency === 'points') map[key].points += r.amount||0;
    });
    return Object.values(map)
      .sort((a,b)=>a.period.localeCompare(b.period))
      .map(d => ({
        ...d,
        profit: d.revenue - d.cost + d.cashback + d.yaashback,
        label: (() => { try { return format(parseISO(d.period+'-01'),'MMM yy'); } catch { return d.period; } })(),
      }));
  }, [filteredOrders, filteredRewards]);

  /* ── Cumulative profit ── */
  const cumulativeData = useMemo(() => {
    let cum = 0;
    return periodData.map(d => { cum += d.profit; return { label:d.label, cumProfit:cum }; });
  }, [periodData]);

  /* ── Category breakdown ── */
  const categoryData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const cat = o.product_category||o.category||'Other';
      map[cat] = (map[cat]||0) + parseFloat(o.total_cost||0);
    });
    return Object.entries(map).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  }, [filteredOrders]);

  /* ── Store breakdown ── */
  const storeData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const store = o.retailer||'Unknown';
      if (!map[store]) map[store] = { store, cost:0, revenue:0, cardCB:0, yaCB:0, points:0, txns:0 };
      map[store].cost    += parseFloat(o.final_cost||o.total_cost||0);
      map[store].revenue += orderRevenue(o);
      map[store].txns    += 1;
    });
    filteredRewards.forEach(r => {
      const o = filteredOrders.find(x=>x.id===r.purchase_order_id);
      const store = o?.retailer||'Unknown';
      if (!map[store]) return;
      if (r.currency==='USD') {
        if (isYA(r)) map[store].yaCB    += r.amount||0;
        else         map[store].cardCB  += r.amount||0;
      }
      if (r.currency==='points') map[store].points += r.amount||0;
    });
    return Object.values(map).map(s => ({
      ...s,
      totalCashback: s.cardCB + s.yaCB,
      profit: s.revenue - s.cost + s.cardCB + s.yaCB,
      roi: s.cost>0 ? ((s.revenue-s.cost+s.cardCB+s.yaCB)/s.cost*100) : 0,
    })).sort((a,b)=>b.revenue-a.revenue);
  }, [filteredOrders, filteredRewards]);

  /* ── Payment method breakdown ── */
  const paymentData = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const key  = o.credit_card_id||'unknown';
      const card = creditCards.find(c=>c.id===key);
      const name = card?.card_name||o.card_name||'Unknown';
      if (!map[key]) map[key] = { id:key, name, spent:0, cardCB:0, yaCB:0, points:0, txns:0, statedRate:card?.cashback_rate||0 };
      map[key].spent += parseFloat(o.total_cost||0);
      map[key].txns  += 1;
    });
    filteredRewards.forEach(r => {
      const o    = filteredOrders.find(x=>x.id===r.purchase_order_id);
      const key  = o?.credit_card_id||'unknown';
      if (!map[key]) return;
      if (r.currency==='USD') {
        if (isYA(r)) map[key].yaCB   += r.amount||0;
        else         map[key].cardCB += r.amount||0;
      }
      if (r.currency==='points') map[key].points += r.amount||0;
    });
    return Object.values(map).map(p => ({
      ...p,
      totalCashback: p.cardCB + p.yaCB,
      effectiveRate: p.spent>0 ? (p.cardCB/p.spent*100) : 0,
      variance:      p.spent>0 ? ((p.cardCB/p.spent*100)-p.statedRate) : 0,
    })).sort((a,b)=>b.spent-a.spent);
  }, [filteredOrders, filteredRewards, creditCards]);

  /* ── Cashback pie breakdown ── */
  const cashbackPie = useMemo(() => [
    { name:'Card Cashback', value:kpis.cardCashback },
    { name:'YA Cashback',   value:kpis.yaCashback   },
  ].filter(x=>x.value>0), [kpis]);

  /* ── CSV Export ── */
  const handleExport = useCallback(() => {
    const rows = ['Period,Revenue,Cost,Card CB,YA CB,Points,Profit'];
    periodData.forEach(d => rows.push([d.period,d.revenue.toFixed(2),d.cost.toFixed(2),d.cashback.toFixed(2),d.yaashback?.toFixed(2)||0,d.points||0,(d.revenue-d.cost+d.cashback).toFixed(2)].join(',')));
    rows.push('','Store,Revenue,Cost,Card CB,YA CB,Points,Profit,ROI,TXNs');
    storeData.forEach(s => rows.push([s.store,s.revenue.toFixed(2),s.cost.toFixed(2),s.cardCB.toFixed(2),s.yaCB.toFixed(2),s.points,s.profit.toFixed(2),s.roi.toFixed(2),s.txns].join(',')));
    rows.push('','Card,Transactions,Spent,Card CB,YA CB,Points,Stated Rate,Effective Rate');
    paymentData.forEach(p => rows.push([p.name,p.txns,p.spent.toFixed(2),p.cardCB.toFixed(2),p.yaCB.toFixed(2),p.points,p.statedRate,p.effectiveRate.toFixed(2)].join(',')));
    const blob = new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `atlas_analytics_${format(new Date(),'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }, [periodData, storeData, paymentData]);

  const TABS = [
    { id:'overview',   label:'Overview',      icon:TrendingUp },
    { id:'breakdowns', label:'Breakdowns',    icon:BarChart2  },
    { id:'payments',   label:'Payments',      icon:CreditCard },
    { id:'tables',     label:'Detail Tables', icon:Filter     },
  ];

  const KPI_ROWS = [
    [
      { label:'Revenue',      value:fmt$(kpis.revenue),      sub:`${filteredOrders.filter(o=>o.sale_events?.length>0).length} sold`, color:T.ocean,   bg:T.oceanBg,   bdr:T.oceanBdr,   icon:TrendingUp  },
      { label:'Cost',         value:fmt$(kpis.cost),         sub:`${filteredOrders.length} orders`,                                   color:T.crimson, bg:T.crimsonBg, bdr:T.crimsonBdr, icon:CreditCard  },
      { label:profitMode==='cashback_wallet'?'Wallet Profit':'Net Profit',
                              value:fmt$(kpis.profit),       sub:`${fmtPct(kpis.roi)} ROI`,                                          color:kpis.profit>=0?T.terrain:T.crimson, bg:kpis.profit>=0?T.terrainBg:T.crimsonBg, bdr:kpis.profit>=0?T.terrainBdr:T.crimsonBdr, icon:DollarSign },
      { label:'ROI',          value:fmtPct(kpis.roi),        sub:'return on investment',                                             color:T.gold,    bg:T.goldBg,    bdr:T.goldBdr,    icon:Percent     },
    ],
    [
      { label:'Card Cashback',value:fmt$(kpis.cardCashback), sub:'credit card rewards',                                              color:T.violet,  bg:T.violetBg,  bdr:T.violetBdr,  icon:CreditCard  },
      { label:'YA Cashback',  value:fmt$(kpis.yaCashback),   sub:'Young Adult rewards',                                              color:T.amber,   bg:T.amberBg,   bdr:T.amberBdr,   icon:Star        },
      { label:'Total Cashback',value:fmt$(kpis.totalCashback),sub:'all USD rewards',                                                 color:T.gold,    bg:T.goldBg,    bdr:T.goldBdr,    icon:Gift        },
      { label:'Points Earned',value:fmtPts(kpis.points),     sub:'non-cash rewards',                                                color:T.terrain, bg:T.terrainBg, bdr:T.terrainBdr, icon:Star        },
    ],
  ];

  /* ─── render ─── */
  return (
    <>
      <style>{CSS}</style>
      <div style={{ paddingBottom:40, display:'flex', flexDirection:'column', gap:14, fontFamily:T.sans }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div>
            <h1 style={{ fontFamily:T.serif, fontSize:24, fontWeight:900, color:T.ink, letterSpacing:'-0.3px', lineHeight:1.1 }}>Analytics & Insights</h1>
            <p style={{ fontSize:12, color:T.inkFaded, marginTop:4 }}>
              {mode==='all' ? 'Combined overview' : mode==='churning' ? 'Churning performance' : 'Marketplace performance'}
            </p>
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
            <div className="an-pill-group">
              {['all','churning','marketplace'].map(m => (
                <button key={m} className={`an-pill${mode===m?' active':''}`} onClick={()=>setMode(m)}>
                  {m==='all'?'All':m==='churning'?'Churning':'Marketplace'}
                </button>
              ))}
            </div>
            <button onClick={handleExport}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:8, fontSize:11, fontWeight:600, background:T.warm, border:`1px solid ${T.border}`, color:T.inkFaded, cursor:'pointer', fontFamily:T.sans }}>
              <Download size={13} /> Export CSV
            </button>
            <button onClick={()=>refetch()} disabled={isLoading}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:8, fontSize:11, fontWeight:700, background:T.ink, color:'#FFF8F0', cursor:'pointer', border:'none', fontFamily:T.serif, letterSpacing:'0.04em' }}>
              <RefreshCw size={13} className={isLoading?'animate-spin':''} /> Refresh
            </button>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="an-card" style={{ padding:'12px 16px', display:'flex', flexWrap:'wrap', alignItems:'flex-end', gap:16 }}>
          <div>
            <div style={{ fontFamily:T.serif, fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:T.inkFaded, marginBottom:7 }}>Period</div>
            <div className="an-pill-group">
              {[['monthly','Monthly'],['quarterly','Quarterly'],['yearly','Yearly']].map(([k,l])=>(
                <button key={k} className={`an-pill${period===k?' active':''}`} onClick={()=>setPeriod(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily:T.serif, fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:T.inkFaded, marginBottom:7 }}>Date Range</div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="date" className="an-inp" value={fromDate} onChange={e=>setFromDate(e.target.value)} />
              <span style={{ color:T.inkGhost, fontSize:12 }}>→</span>
              <input type="date" className="an-inp" value={toDate} onChange={e=>setToDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── KPI Row 1 ── */}
        <SectionDiv title="Survey Markers" />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {KPI_ROWS[0].map(k=><KpiCard key={k.label} {...k} />)}
        </div>

        {/* ── KPI Row 2 — Cashback split ── */}
        <SectionDiv title="Cashback Breakdown" color={T.violet} lineColor="rgba(90,58,110,0.25)" />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {KPI_ROWS[1].map(k=><KpiCard key={k.label} {...k} />)}
        </div>

        {/* ── Profit details panel ── */}
        <div className="an-card" style={{ overflow:'hidden' }}>
          <button onClick={()=>setShowBreakdown(p=>!p)}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', background:T.warm, borderBottom:showBreakdown?`1px solid ${T.border}`:'none', cursor:'pointer', border:'none', fontFamily:T.sans }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Info size={13} color={T.gold} />
              <span style={{ fontFamily:T.serif, fontSize:11, fontWeight:700, color:T.ink }}>Profit Breakdown</span>
              <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:99, background:T.goldBg, color:T.gold, border:`1px solid ${T.goldBdr}` }}>
                {profitMode==='cashback_wallet'?'Cashback Wallet':'Accounting Mode'}
              </span>
            </div>
            {showBreakdown ? <ChevronUp size={13} color={T.inkFaded}/> : <ChevronDown size={13} color={T.inkFaded}/>}
          </button>
          {showBreakdown && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, padding:'12px 16px' }}>
              {[
                { label:'Revenue',      value:fmt$(kpis.revenue),      color:T.ocean,   bg:T.oceanBg,   bdr:T.oceanBdr,   prefix:''  },
                { label:'Card Spend',   value:fmt$(kpis.cost),         color:T.crimson, bg:T.crimsonBg, bdr:T.crimsonBdr, prefix:'−' },
                { label:'Card CB',      value:fmt$(kpis.cardCashback), color:T.violet,  bg:T.violetBg,  bdr:T.violetBdr,  prefix:'+' },
                { label:'YA CB',        value:fmt$(kpis.yaCashback),   color:T.amber,   bg:T.amberBg,   bdr:T.amberBdr,   prefix:'+' },
                { label:'Net Profit',   value:fmt$(kpis.profit),       color:kpis.profit>=0?T.gold:T.crimson, bg:kpis.profit>=0?T.goldBg:T.crimsonBg, bdr:kpis.profit>=0?T.goldBdr:T.crimsonBdr, prefix:'' },
              ].map(b=>(
                <div key={b.label} style={{ borderRadius:10, padding:'10px 12px', background:b.bg, border:`1px solid ${b.bdr}` }}>
                  <div style={{ fontFamily:T.serif, fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:b.color, marginBottom:4 }}>{b.label}</div>
                  <div style={{ fontFamily:T.mono, fontSize:17, fontWeight:600, color:b.color, lineHeight:1 }}>{b.prefix}{b.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display:'flex', gap:2, padding:3, borderRadius:10, width:'fit-content', background:T.card, border:`1px solid ${T.border}` }}>
          {TABS.map(t=>(
            <button key={t.id} className={`an-tab${activeTab===t.id?' active':''}`} onClick={()=>setActiveTab(t.id)}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════
            OVERVIEW TAB
        ══════════════════════════════════════ */}
        {activeTab==='overview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12 }}>

              {/* Revenue & Profit trend */}
              <ChartCard title="Revenue & Profit Trend" badge="Monthly">
                {periodData.length===0 ? <EmptyState /> : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={periodData} margin={{top:4,right:4,left:0,bottom:0}}>
                        <defs>
                          {[['gr',CHART_COLORS.revenue],['gp',CHART_COLORS.profit],['gc',CHART_COLORS.cashback]].map(([id,c])=>(
                            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor={c} stopOpacity={0.2}/>
                              <stop offset="95%" stopColor={c} stopOpacity={0}/>
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)" />
                        <XAxis dataKey="label" tick={{fontSize:10,fill:T.inkGhost,fontFamily:T.sans}} tickLine={false} axisLine={false}/>
                        <YAxis tick={{fontSize:10,fill:T.inkGhost,fontFamily:T.mono}} tickLine={false} axisLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                        <Tooltip {...CHART_TOOLTIP} formatter={v=>fmt$(v)}/>
                        <Area type="monotone" dataKey="revenue"  stroke={CHART_COLORS.revenue}  fill="url(#gr)" strokeWidth={2} name="Revenue"  dot={{r:3,fill:CHART_COLORS.revenue,strokeWidth:0}}/>
                        <Area type="monotone" dataKey="profit"   stroke={CHART_COLORS.profit}   fill="url(#gp)" strokeWidth={2} name="Profit"   dot={{r:3,fill:CHART_COLORS.profit,strokeWidth:0}}/>
                        <Area type="monotone" dataKey="cashback" stroke={CHART_COLORS.cashback} fill="url(#gc)" strokeWidth={2} name="Card CB"  dot={{r:3,fill:CHART_COLORS.cashback,strokeWidth:0}}/>
                      </AreaChart>
                    </ResponsiveContainer>
                    <ChartLegend items={[{label:'Revenue',color:CHART_COLORS.revenue},{label:'Profit',color:CHART_COLORS.profit},{label:'Card CB',color:CHART_COLORS.cashback}]}/>
                  </>
                )}
              </ChartCard>

              {/* Cashback split donut */}
              <ChartCard title="Cashback Split">
                {cashbackPie.length===0 ? <EmptyState label="No cashback yet"/> : (
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <ResponsiveContainer width={100} height={100}>
                      <PieChart>
                        <Pie data={cashbackPie} cx="50%" cy="50%" innerRadius={28} outerRadius={46} paddingAngle={3} dataKey="value">
                          {cashbackPie.map((_,i)=><Cell key={i} fill={[T.violet,T.amber][i%2]}/>)}
                        </Pie>
                        <Tooltip {...CHART_TOOLTIP} formatter={v=>fmt$(v)}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11 }}>
                        <span style={{ display:'flex', alignItems:'center', gap:5, color:T.inkFaded }}>
                          <div style={{ width:8,height:8,borderRadius:'50%',background:T.violet }}/> Card CB
                        </span>
                        <span style={{ fontFamily:T.mono, fontWeight:700, color:T.violet }}>{fmt$(kpis.cardCashback)}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11 }}>
                        <span style={{ display:'flex', alignItems:'center', gap:5, color:T.inkFaded }}>
                          <div style={{ width:8,height:8,borderRadius:'50%',background:T.amber }}/> YA CB
                        </span>
                        <span style={{ fontFamily:T.mono, fontWeight:700, color:T.amber }}>{fmt$(kpis.yaCashback)}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, paddingTop:4, borderTop:`1px solid ${T.border}` }}>
                        <span style={{ color:T.inkFaded }}>Points</span>
                        <span style={{ fontFamily:T.mono, fontWeight:700, color:T.terrain }}>{fmtPts(kpis.points)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </ChartCard>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {/* Cumulative profit */}
              <ChartCard title="Cumulative Profit">
                {cumulativeData.length===0 ? <EmptyState/> : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={cumulativeData} margin={{top:4,right:4,left:0,bottom:0}}>
                        <defs>
                          <linearGradient id="gcum" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={T.terrain} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={T.terrain} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)"/>
                        <XAxis dataKey="label" tick={{fontSize:10,fill:T.inkGhost,fontFamily:T.sans}} tickLine={false} axisLine={false}/>
                        <YAxis tick={{fontSize:10,fill:T.inkGhost,fontFamily:T.mono}} tickLine={false} axisLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                        <Tooltip {...CHART_TOOLTIP} formatter={v=>fmt$(v)}/>
                        <Area type="monotone" dataKey="cumProfit" stroke={T.terrain} fill="url(#gcum)" strokeWidth={2} name="Cumulative Profit" dot={{r:3,fill:T.terrain,strokeWidth:0}}/>
                      </AreaChart>
                    </ResponsiveContainer>
                    <ChartLegend items={[{label:'Cumulative Profit',color:T.terrain}]}/>
                  </>
                )}
              </ChartCard>

              {/* Expense breakdown */}
              <ChartCard title="Spend by Category">
                {categoryData.length===0 ? <EmptyState/> : (
                  <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                    <ResponsiveContainer width={110} height={110}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2} dataKey="value">
                          {categoryData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                        </Pie>
                        <Tooltip {...CHART_TOOLTIP} formatter={v=>fmt$(v)}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <DonutLegend data={categoryData} colors={PIE_COLORS} formatter={fmt$}/>
                  </div>
                )}
              </ChartCard>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            BREAKDOWNS TAB
        ══════════════════════════════════════ */}
        {activeTab==='breakdowns' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12 }}>
              <ChartCard title="Store Performance" badge={`${storeData.length} Stores`}>
                {storeData.length===0 ? <EmptyState/> : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={storeData.slice(0,8).map(s=>({name:s.store,revenue:s.revenue,profit:s.profit}))} margin={{top:4,right:4,left:0,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)" horizontal={false}/>
                        <XAxis dataKey="name" tick={{fontSize:9,fill:T.inkGhost,fontFamily:T.sans}} tickLine={false} axisLine={false}/>
                        <YAxis tick={{fontSize:10,fill:T.inkGhost,fontFamily:T.mono}} tickLine={false} axisLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                        <Tooltip {...CHART_TOOLTIP} formatter={v=>fmt$(v)}/>
                        <Bar dataKey="revenue" name="Revenue" fill={T.ocean}   radius={[4,4,0,0]}/>
                        <Bar dataKey="profit"  name="Profit"  fill={T.terrain} radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                    <ChartLegend items={[{label:'Revenue',color:T.ocean},{label:'Profit',color:T.terrain}]}/>
                  </>
                )}
              </ChartCard>

              {/* Summary box */}
              <div className="an-card" style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ fontFamily:T.serif, fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:T.inkFaded, marginBottom:4 }}>Store Summary</div>
                {[
                  { label:'Total Revenue', value:fmt$(kpis.revenue),        color:T.ocean   },
                  { label:'Total Profit',  value:fmt$(kpis.profit),         color:T.terrain },
                  { label:'Card Cashback', value:fmt$(kpis.cardCashback),   color:T.violet  },
                  { label:'YA Cashback',   value:fmt$(kpis.yaCashback),     color:T.amber   },
                  { label:'Points',        value:fmtPts(kpis.points),       color:T.gold    },
                  { label:'Avg ROI',       value:fmtPct(kpis.roi),          color:kpis.roi>=0?T.terrain:T.crimson },
                ].map(s=>(
                  <div key={s.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:8, borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:11, color:T.inkFaded, fontFamily:T.sans }}>{s.label}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:s.color, fontFamily:T.mono }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category pie */}
            <ChartCard title="Spend by Category">
              {categoryData.length===0 ? <EmptyState/> : (
                <div style={{ display:'flex', alignItems:'center', gap:24 }}>
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2} dataKey="value">
                        {categoryData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip {...CHART_TOOLTIP} formatter={v=>fmt$(v)}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <DonutLegend data={categoryData} colors={PIE_COLORS} formatter={fmt$}/>
                </div>
              )}
            </ChartCard>
          </div>
        )}

        {/* ══════════════════════════════════════
            PAYMENTS TAB
        ══════════════════════════════════════ */}
        {activeTab==='payments' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:12 }}>
              <ChartCard title="Spend & Cashback by Card" badge={`${paymentData.length} Cards`}>
                {paymentData.length===0 ? <EmptyState/> : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={paymentData} margin={{top:4,right:4,left:0,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)" horizontal={false}/>
                        <XAxis dataKey="name" tick={{fontSize:9,fill:T.inkGhost,fontFamily:T.sans}} tickLine={false} axisLine={false}/>
                        <YAxis tick={{fontSize:10,fill:T.inkGhost,fontFamily:T.mono}} tickLine={false} axisLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                        <Tooltip {...CHART_TOOLTIP} formatter={v=>fmt$(v)}/>
                        <Bar dataKey="spent"   name="Spent"   fill={T.ocean}  radius={[4,4,0,0]}/>
                        <Bar dataKey="cardCB"  name="Card CB" fill={T.violet} radius={[4,4,0,0]}/>
                        <Bar dataKey="yaCB"    name="YA CB"   fill={T.amber}  radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                    <ChartLegend items={[{label:'Spent',color:T.ocean},{label:'Card CB',color:T.violet},{label:'YA CB',color:T.amber}]}/>
                  </>
                )}
              </ChartCard>

              {/* Cashback donut */}
              <ChartCard title="Cashback Distribution">
                {cashbackPie.length===0 ? <EmptyState label="No cashback yet"/> : (
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <ResponsiveContainer width={100} height={100}>
                      <PieChart>
                        <Pie data={cashbackPie} cx="50%" cy="50%" innerRadius={28} outerRadius={46} paddingAngle={3} dataKey="value">
                          {cashbackPie.map((_,i)=><Cell key={i} fill={[T.violet,T.amber][i%2]}/>)}
                        </Pie>
                        <Tooltip {...CHART_TOOLTIP} formatter={v=>fmt$(v)}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <DonutLegend data={cashbackPie} colors={[T.violet,T.amber]} formatter={fmt$}/>
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Effective vs stated rate */}
            <ChartCard title="Effective vs Stated Cashback Rate">
              {paymentData.length===0 ? <EmptyState/> : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={paymentData} margin={{top:4,right:4,left:0,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)" horizontal={false}/>
                      <XAxis dataKey="name" tick={{fontSize:9,fill:T.inkGhost,fontFamily:T.sans}} tickLine={false} axisLine={false}/>
                      <YAxis tick={{fontSize:10,fill:T.inkGhost,fontFamily:T.mono}} tickLine={false} axisLine={false} tickFormatter={v=>`${v.toFixed(1)}%`}/>
                      <Tooltip {...CHART_TOOLTIP} formatter={v=>`${Number(v).toFixed(2)}%`}/>
                      <Bar dataKey="statedRate"    name="Stated Rate"    fill={T.inkGhost} radius={[4,4,0,0]}/>
                      <Bar dataKey="effectiveRate" name="Effective Rate" fill={T.terrain}  radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                  <ChartLegend items={[{label:'Stated Rate',color:T.inkGhost},{label:'Effective Rate',color:T.terrain}]}/>
                </>
              )}
            </ChartCard>

            {/* Payment method table */}
            <div className="an-card" style={{ overflow:'hidden' }}>
              <div style={{ padding:'11px 16px', background:T.warm, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontFamily:T.serif, fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:T.inkFaded }}>Payment Method Performance</span>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:99, background:T.goldBg, color:T.gold, border:`1px solid ${T.goldBdr}` }}>{paymentData.length} cards</span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>
                    {['Card','Transactions','Spent','Card CB','YA CB','Points','Stated %','Effective %','Variance'].map(h=>(
                      <th key={h} className="an-th">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {paymentData.map(p=>(
                      <tr key={p.id} className="an-tr">
                        <td className="an-td" style={{ fontWeight:700 }}>{p.name}</td>
                        <td className="an-td" style={{ color:T.inkFaded }}>{p.txns}</td>
                        <td className="an-td" style={{ color:T.ocean,  fontFamily:T.mono, fontWeight:600 }}>{fmt$(p.spent)}</td>
                        <td className="an-td" style={{ color:T.violet, fontFamily:T.mono, fontWeight:600 }}>{fmt$(p.cardCB)}</td>
                        <td className="an-td" style={{ color:T.amber,  fontFamily:T.mono, fontWeight:600 }}>{fmt$(p.yaCB)}</td>
                        <td className="an-td" style={{ color:T.terrain,fontFamily:T.mono, fontWeight:600 }}>{p.points.toLocaleString()}</td>
                        <td className="an-td" style={{ color:T.inkFaded,fontFamily:T.mono }}>{fmtPct(p.statedRate)}</td>
                        <td className="an-td" style={{ color:p.effectiveRate>=p.statedRate?T.terrain:T.amber, fontFamily:T.mono, fontWeight:700 }}>{fmtPct(p.effectiveRate)}</td>
                        <td className="an-td" style={{ color:p.variance>=0?T.terrain:T.crimson, fontFamily:T.mono, fontWeight:700 }}>
                          {p.variance>=0?'+':''}{fmtPct(p.variance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Footer totals */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, padding:'12px 16px', borderTop:`1px solid ${T.border}` }}>
                {[
                  { label:'Total Spent',    value:fmt$(paymentData.reduce((s,p)=>s+p.spent,0)),   color:T.ocean   },
                  { label:'Total Card CB',  value:fmt$(paymentData.reduce((s,p)=>s+p.cardCB,0)),  color:T.violet  },
                  { label:'Total YA CB',    value:fmt$(paymentData.reduce((s,p)=>s+p.yaCB,0)),    color:T.amber   },
                  { label:'Total Points',   value:fmtPts(paymentData.reduce((s,p)=>s+p.points,0)),color:T.terrain },
                ].map(s=>(
                  <div key={s.label} style={{ borderRadius:10, padding:'10px 12px', background:T.warm, border:`1px solid ${T.border}` }}>
                    <div style={{ fontFamily:T.serif, fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:s.color, marginBottom:3 }}>{s.label}</div>
                    <div style={{ fontFamily:T.mono, fontSize:16, fontWeight:600, color:s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            DETAIL TABLES TAB
        ══════════════════════════════════════ */}
        {activeTab==='tables' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Store table */}
            <div className="an-card" style={{ overflow:'hidden' }}>
              <div style={{ padding:'11px 16px', background:T.warm, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontFamily:T.serif, fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:T.inkFaded }}>Store Breakdown</span>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:99, background:T.terrainBg, color:T.terrain, border:`1px solid ${T.terrainBdr}` }}>{storeData.length} stores</span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>
                    {['Store','Revenue','Cost','Card CB','YA CB','Points','Profit','ROI','TXNs'].map(h=>(
                      <th key={h} className="an-th">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {storeData.map(s=>(
                      <tr key={s.store} className="an-tr">
                        <td className="an-td" style={{ fontWeight:700 }}>{s.store}</td>
                        <td className="an-td" style={{ color:T.ocean,   fontFamily:T.mono, fontWeight:600 }}>{fmt$(s.revenue)}</td>
                        <td className="an-td" style={{ color:T.crimson, fontFamily:T.mono, fontWeight:600 }}>{fmt$(s.cost)}</td>
                        <td className="an-td" style={{ color:T.violet,  fontFamily:T.mono, fontWeight:600 }}>{fmt$(s.cardCB)}</td>
                        <td className="an-td" style={{ color:T.amber,   fontFamily:T.mono, fontWeight:600 }}>{fmt$(s.yaCB)}</td>
                        <td className="an-td" style={{ color:T.terrain, fontFamily:T.mono }}>{s.points.toLocaleString()}</td>
                        <td className="an-td" style={{ color:s.profit>=0?T.terrain:T.crimson, fontFamily:T.mono, fontWeight:700 }}>{fmt$(s.profit)}</td>
                        <td className="an-td" style={{ color:s.roi>=0?T.gold:T.crimson, fontFamily:T.mono, fontWeight:600 }}>{fmtPct(s.roi)}</td>
                        <td className="an-td" style={{ color:T.inkFaded }}>{s.txns}</td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr style={{ background:T.warm }}>
                      <td className="an-td" style={{ fontWeight:800, color:T.ink }}>TOTAL</td>
                      <td className="an-td" style={{ color:T.ocean,   fontFamily:T.mono, fontWeight:800 }}>{fmt$(storeData.reduce((s,x)=>s+x.revenue,0))}</td>
                      <td className="an-td" style={{ color:T.crimson, fontFamily:T.mono, fontWeight:800 }}>{fmt$(storeData.reduce((s,x)=>s+x.cost,0))}</td>
                      <td className="an-td" style={{ color:T.violet,  fontFamily:T.mono, fontWeight:800 }}>{fmt$(storeData.reduce((s,x)=>s+x.cardCB,0))}</td>
                      <td className="an-td" style={{ color:T.amber,   fontFamily:T.mono, fontWeight:800 }}>{fmt$(storeData.reduce((s,x)=>s+x.yaCB,0))}</td>
                      <td className="an-td" style={{ color:T.terrain, fontFamily:T.mono, fontWeight:800 }}>{storeData.reduce((s,x)=>s+x.points,0).toLocaleString()}</td>
                      <td className="an-td" style={{ color:kpis.profit>=0?T.terrain:T.crimson, fontFamily:T.mono, fontWeight:800 }}>{fmt$(kpis.profit)}</td>
                      <td className="an-td" style={{ color:kpis.roi>=0?T.gold:T.crimson, fontFamily:T.mono, fontWeight:800 }}>{fmtPct(kpis.roi)}</td>
                      <td className="an-td" style={{ fontWeight:800 }}>{storeData.reduce((s,x)=>s+x.txns,0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Period table */}
            <div className="an-card" style={{ overflow:'hidden' }}>
              <div style={{ padding:'11px 16px', background:T.warm, borderBottom:`1px solid ${T.border}` }}>
                <span style={{ fontFamily:T.serif, fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:T.inkFaded }}>Period-by-Period Data</span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>
                    {['Period','Revenue','Cost','Card CB','YA CB','Points','Profit','Margin'].map(h=>(
                      <th key={h} className="an-th">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {periodData.map(p=>(
                      <tr key={p.period} className="an-tr">
                        <td className="an-td" style={{ fontWeight:600, color:T.inkFaded, fontFamily:T.mono }}>{p.period}</td>
                        <td className="an-td" style={{ color:T.ocean,   fontFamily:T.mono, fontWeight:600 }}>{fmt$(p.revenue)}</td>
                        <td className="an-td" style={{ color:T.crimson, fontFamily:T.mono, fontWeight:600 }}>{fmt$(p.cost)}</td>
                        <td className="an-td" style={{ color:T.violet,  fontFamily:T.mono, fontWeight:600 }}>{fmt$(p.cashback||0)}</td>
                        <td className="an-td" style={{ color:T.amber,   fontFamily:T.mono, fontWeight:600 }}>{fmt$(p.yaashback||0)}</td>
                        <td className="an-td" style={{ color:T.terrain, fontFamily:T.mono }}>{(p.points||0).toLocaleString()}</td>
                        <td className="an-td" style={{ color:p.profit>=0?T.terrain:T.crimson, fontFamily:T.mono, fontWeight:700 }}>{fmt$(p.profit)}</td>
                        <td className="an-td" style={{ color:T.gold, fontFamily:T.mono }}>{p.revenue>0?fmtPct(p.profit/p.revenue*100):'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </>
  );
}