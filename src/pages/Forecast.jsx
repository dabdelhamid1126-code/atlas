import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Calculator, TrendingUp, CreditCard, BarChart2, Store, ChevronUp, ChevronDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const fmt$ = (v) => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:2 }).format(v || 0);
const pct  = (v) => `${Number(v || 0).toFixed(1)}%`;

const TOOLTIP_STYLE = { borderRadius:12, border:'1px solid var(--parch-line)', fontSize:12, background:'var(--parch-card)', color:'var(--ink)' };

function SectionCard({ icon: Icon, title, accentColor = 'var(--violet)', children }) {
  return (
    <div style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:14, overflow:'hidden', borderTop:`3px solid ${accentColor}` }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 18px', borderBottom:'1px solid var(--parch-line)', background:'var(--parch-warm)' }}>
        <Icon style={{ width:16, height:16, color:accentColor }} />
        <h2 style={{ fontFamily:"ui-sans-serif, system-ui, -apple-system, sans-serif", fontSize:13, fontWeight:700, color:'var(--ink)', margin:0 }}>{title}</h2>
      </div>
      <div style={{ padding:18 }}>{children}</div>
    </div>
  );
}

const inp = { background:'var(--parch-warm)', border:'1px solid var(--parch-line)', borderRadius:10, color:'var(--ink)', padding:'8px 12px', fontSize:13, outline:'none', width:'100%' };
const LBL = ({ children }) => <label style={{ fontSize:10, color:'var(--ink-dim)', fontWeight:600, display:'block', marginBottom:4 }}>{children}</label>;

function ProfitCalculator({ creditCards }) {
  const [unitCost,       setUnitCost]       = useState('');
  const [qty,            setQty]            = useState('1');
  const [salePrice,      setSalePrice]      = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');

  const totalCost      = (parseFloat(unitCost)  || 0) * (parseInt(qty)  || 1);
  const totalSale      = (parseFloat(salePrice) || 0) * (parseInt(qty)  || 1);
  const grossProfit    = totalSale - totalCost;
  const roi            = totalCost > 0 ? (grossProfit / totalCost) * 100 : 0;
  const selectedCard   = creditCards.find(c => c.id === selectedCardId);
  const cashbackRate   = selectedCard?.cashback_rate || 0;
  const cashbackEarned = totalCost * cashbackRate / 100;
  const netProfit      = grossProfit + cashbackEarned;
  const isPositive     = netProfit >= 0;

  return (
    <SectionCard icon={Calculator} title="Profit Calculator" accentColor="var(--violet)">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
        {[['Unit Cost', unitCost, setUnitCost, true], ['Quantity', qty, setQty, false], ['Expected Sale Price', salePrice, setSalePrice, true]].map(([label, val, setter, dollar]) => (
          <div key={label}>
            <LBL>{label}</LBL>
            <div style={{ position:'relative' }}>
              {dollar && <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--ink-ghost)', fontSize:12 }}>$</span>}
              <input type="number" min="0" step={dollar ? '0.01' : '1'} value={val} onChange={e => setter(e.target.value)} placeholder={dollar ? '0.00' : '1'}
                style={{ ...inp, paddingLeft: dollar ? 22 : 12 }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom:12 }}>
        <LBL>Credit Card</LBL>
        <select value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
          <option value="">No card selected</option>
          {creditCards.filter(c => c.active !== false).map(c => (
            <option key={c.id} value={c.id}>{c.card_name} — {c.cashback_rate || 0}% cashback</option>
          ))}
        </select>
      </div>
      {totalCost > 0 && (
        <div style={{ borderRadius:12, border:`1px solid ${isPositive ? 'var(--terrain-bdr)' : 'var(--crimson-bdr)'}`, padding:14, background: isPositive ? 'var(--terrain-bg)' : 'var(--crimson-bg)' }}>
          <p style={{ fontFamily:"ui-sans-serif, system-ui, -apple-system, sans-serif", fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-dim)', marginBottom:8 }}>Calculation Results</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
            {[['Total Cost', fmt$(totalCost), 'var(--ink)'], ['Gross Profit', fmt$(grossProfit), grossProfit >= 0 ? 'var(--terrain)' : 'var(--crimson)'], ['ROI', pct(roi), roi >= 0 ? 'var(--terrain)' : 'var(--crimson)']].map(([l,v,c]) => (
              <div key={l} style={{ background:'var(--parch-card)', borderRadius:10, padding:10, border:'1px solid var(--parch-line)', textAlign:'center' }}>
                <p style={{ fontSize:9, color:'var(--ink-dim)', marginBottom:2 }}>{l}</p>
                <p style={{ fontSize:14, fontWeight:600, color:c, fontFamily:"ui-sans-serif, system-ui, -apple-system, sans-serif" }}>{v}</p>
              </div>
            ))}
          </div>
          {cashbackEarned > 0 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--parch-card)', borderRadius:10, padding:'10px 14px', border:'1px solid var(--parch-line)', marginBottom:10 }}>
              <div>
                <p style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>Cashback ({pct(cashbackRate)} on {fmt$(totalCost)})</p>
                <p style={{ fontSize:10, color:'var(--ink-dim)' }}>{selectedCard?.card_name}</p>
              </div>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--violet)' }}>+{fmt$(cashbackEarned)}</p>
            </div>
          )}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--parch-card)', borderRadius:10, padding:'10px 14px', border:'2px dashed var(--parch-line)' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>Net Profit (after cashback)</p>
            <p style={{ fontSize:22, fontWeight:600, color: isPositive ? 'var(--terrain)' : 'var(--crimson)', fontFamily:"ui-sans-serif, system-ui, -apple-system, sans-serif" }}>{isPositive ? '+' : ''}{fmt$(netProfit)}</p>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function MonthlyProjection({ orders, goals }) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentOrders = useMemo(() => orders.filter(o => o.order_date && new Date(o.order_date) >= thirtyDaysAgo), [orders]);
  const avgROI = useMemo(() => {
    const withProfit = recentOrders.filter(o => {
      const sale = (o.items || []).reduce((s, i) => s + (parseFloat(i.sale_price) || 0) * (parseInt(i.quantity_ordered) || 1), 0);
      return sale > 0 && o.total_cost > 0;
    });
    if (!withProfit.length) return 0;
    const total = withProfit.reduce((s, o) => {
      const sale = (o.items || []).reduce((acc, i) => acc + (parseFloat(i.sale_price) || 0) * (parseInt(i.quantity_ordered) || 1), 0);
      return s + (sale - o.total_cost) / o.total_cost * 100;
    }, 0);
    return total / withProfit.length;
  }, [recentOrders]);
  const totalSpent30d          = recentOrders.reduce((s, o) => s + (o.total_cost || 0), 0);
  const projectedMonthlyProfit = (totalSpent30d / 30) * 30 * (avgROI / 100);
  const profitGoal             = goals.find(g => g.type === 'profit' && g.timeframe === 'monthly' && g.active !== false);
  const goalTarget             = profitGoal?.target_value || 0;
  const progressPct            = goalTarget > 0 ? Math.min((projectedMonthlyProfit / goalTarget) * 100, 100) : 0;
  const daysLeft               = useMemo(() => Math.ceil((endOfMonth(now) - now) / (1000*60*60*24)), []);

  return (
    <SectionCard icon={TrendingUp} title="Monthly Projection" accentColor="var(--terrain)">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
        {[['30-Day Orders', recentOrders.length, 'var(--ink)'], ['Avg ROI', pct(avgROI), avgROI >= 0 ? 'var(--terrain)' : 'var(--crimson)'], ['Days Left', daysLeft, 'var(--ink)']].map(([l,v,c]) => (
          <div key={l} style={{ background:'var(--parch-warm)', borderRadius:10, padding:10, border:'1px solid var(--parch-line)', textAlign:'center' }}>
            <p style={{ fontSize:9, color:'var(--ink-dim)', marginBottom:2 }}>{l}</p>
            <p style={{ fontSize:18, fontWeight:600, color:c, fontFamily:"ui-sans-serif, system-ui, -apple-system, sans-serif" }}>{v}</p>
          </div>
        ))}
      </div>
      <div style={{ borderRadius:10, padding:'10px 14px', border:`1px solid ${projectedMonthlyProfit >= 0 ? 'var(--terrain-bdr)' : 'var(--gold-border)'}`, background: projectedMonthlyProfit >= 0 ? 'var(--terrain-bg)' : 'var(--gold-bg)', marginBottom:12 }}>
        <p style={{ fontSize:11, color:'var(--ink-dim)' }}>If you maintain this pace, you'll earn</p>
        <p style={{ fontSize:26, fontWeight:600, color: projectedMonthlyProfit >= 0 ? 'var(--terrain)' : 'var(--gold)', marginTop:2, fontFamily:"ui-sans-serif, system-ui, -apple-system, sans-serif" }}>{fmt$(projectedMonthlyProfit)}</p>
        <p style={{ fontSize:10, color:'var(--ink-dim)', marginTop:2 }}>this month in profit</p>
      </div>
      {goalTarget > 0 ? (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:6 }}>
            <span style={{ fontWeight:600, color:'var(--ink-faded)' }}>Monthly Profit Goal</span>
            <span style={{ color:'var(--ink-dim)' }}>{fmt$(projectedMonthlyProfit)} / {fmt$(goalTarget)}</span>
          </div>
          <div style={{ height:8, background:'var(--parch-warm)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:99, background: progressPct >= 100 ? 'var(--terrain)' : progressPct >= 60 ? 'var(--violet)' : 'var(--gold)', width:`${progressPct}%`, transition:'width 0.7s' }} />
          </div>
          <p style={{ fontSize:10, color:'var(--ink-dim)', textAlign:'right', marginTop:4 }}>{progressPct.toFixed(0)}% of goal</p>
        </div>
      ) : (
        <p style={{ fontSize:11, color:'var(--ink-dim)', textAlign:'center', padding:'8px 0' }}>Set a monthly profit goal in the Goals page to see progress here</p>
      )}
    </SectionCard>
  );
}

function BestCardsForDeal({ creditCards }) {
  const [storeName, setStoreName] = useState('');
  const ranked = useMemo(() => {
    if (!storeName.trim()) return [];
    const q = storeName.trim().toLowerCase();
    return creditCards.filter(c => c.active !== false).map(c => {
      const storeRate    = (c.store_rates || []).find(sr => sr.store && sr.store.toLowerCase().includes(q));
      const effectiveRate = storeRate ? storeRate.rate : (c.cashback_rate || 0);
      return { id:c.id, card_name:c.card_name, effectiveRate, baseRate:c.cashback_rate||0, hasStoreRate:!!storeRate };
    }).sort((a,b) => b.effectiveRate - a.effectiveRate).slice(0, 6);
  }, [creditCards, storeName]);
  const topRate = ranked[0]?.effectiveRate || 0;

  return (
    <SectionCard icon={Store} title="Best Cards For This Deal" accentColor="var(--ocean)">
      <div style={{ marginBottom:14 }}>
        <LBL>Enter a store name</LBL>
        <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="e.g. Amazon, Walmart, Target..." style={inp} />
      </div>
      {storeName.trim() === '' ? (
        <p style={{ fontSize:12, color:'var(--ink-ghost)', textAlign:'center', padding:'16px 0' }}>Type a store name to see your best card options</p>
      ) : ranked.length === 0 ? (
        <p style={{ fontSize:12, color:'var(--ink-ghost)', textAlign:'center', padding:'16px 0' }}>No cards found</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {ranked.map((card, idx) => (
            <div key={card.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, border:`1px solid ${idx === 0 ? 'var(--ocean-bdr)' : 'var(--parch-line)'}`, background: idx === 0 ? 'var(--ocean-bg)' : 'var(--parch-warm)' }}>
              <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0, background: idx === 0 ? 'var(--ocean)' : 'var(--parch-line)', color: idx === 0 ? 'white' : 'var(--ink-dim)' }}>{idx+1}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>{card.card_name}</p>
                <p style={{ fontSize:10, color:'var(--ink-dim)' }}>{card.hasStoreRate ? 'Store-specific rate' : 'Base cashback rate'}{card.baseRate !== card.effectiveRate ? ` (base: ${pct(card.baseRate)})` : ''}</p>
              </div>
              <p style={{ fontSize:13, fontWeight:700, color: idx === 0 ? 'var(--ocean)' : 'var(--ink)' }}>{pct(card.effectiveRate)}</p>
              <div style={{ width:50, height:6, background:'var(--parch-line)', borderRadius:99, overflow:'hidden', flexShrink:0 }}>
                <div style={{ height:'100%', borderRadius:99, background: idx === 0 ? 'var(--ocean)' : 'var(--ink-ghost)', width: topRate > 0 ? `${(card.effectiveRate/topRate)*100}%` : '0%' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function TrendProjection({ orders }) {
  const chartData = useMemo(() => {
    const now = new Date(); const points = [];
    for (let i = 2; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd   = endOfMonth(subMonths(now, i));
      const mOrders    = orders.filter(o => { if (!o.order_date) return false; const d = new Date(o.order_date); return d >= monthStart && d <= monthEnd; });
      const profit     = mOrders.reduce((s, o) => { const sale = (o.items||[]).reduce((acc,it) => acc+(parseFloat(it.sale_price)||0)*(parseInt(it.quantity_ordered)||1),0); return s+(sale>0?sale-(o.total_cost||0):0); }, 0);
      points.push({ label:format(monthStart,'MMM'), profit:Math.round(profit), projected:null, isProjected:false });
    }
    const actuals = points.map(p => p.profit);
    const avg     = actuals.reduce((s,v)=>s+v,0)/actuals.length;
    const slope   = actuals.length >= 2 ? (actuals[actuals.length-1]-actuals[0])/(actuals.length-1) : 0;
    for (let i = 1; i <= 3; i++) {
      points.push({ label:format(subMonths(now,-i),'MMM'), profit:null, projected:Math.max(0,Math.round(avg+slope*i)), isProjected:true });
    }
    return points;
  }, [orders]);
  const lastActual    = chartData.filter(d => d.profit !== null).slice(-1)[0];
  const lastProjected = chartData.slice(-1)[0];
  const growth        = lastActual && lastProjected ? lastProjected.projected - lastActual.profit : 0;

  return (
    <SectionCard icon={BarChart2} title="Trend Projection — Last 3 + Next 3 Months" accentColor="var(--gold)">
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14, fontSize:11 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}><div style={{ width:24, height:2, background:'var(--terrain)', borderRadius:99 }} /><span style={{ color:'var(--ink-dim)' }}>Actual</span></div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}><div style={{ width:24, height:0, border:'1px dashed var(--violet)' }} /><span style={{ color:'var(--ink-dim)' }}>Projected</span></div>
        {growth !== 0 && (
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:4, fontWeight:700, color: growth >= 0 ? 'var(--terrain)' : 'var(--crimson)' }}>
            {growth >= 0 ? <ChevronUp style={{ width:13, height:13 }} /> : <ChevronDown style={{ width:13, height:13 }} />}
            {growth >= 0 ? '+' : ''}{fmt$(growth)} trend
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top:5, right:5, left:0, bottom:0 }}>
          <defs>
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#245c1e" stopOpacity={0.2}/><stop offset="95%" stopColor="#245c1e" stopOpacity={0}/></linearGradient>
            <linearGradient id="projGrad"   x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#5a2e90" stopOpacity={0.15}/><stop offset="95%" stopColor="#5a2e90" stopOpacity={0}/></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--parch-line)" />
          <XAxis dataKey="label" tick={{ fontSize:11, fill:'var(--ink-ghost)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize:10, fill:'var(--ink-ghost)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v>=1000?(v/1000).toFixed(1)+'k':v}`} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v,name) => [v!==null?fmt$(v):'—', name==='profit'?'Actual Profit':'Projected Profit']} />
          <ReferenceLine x={chartData.find(d=>d.isProjected)?.label} stroke="var(--parch-deep)" strokeDasharray="4 4" strokeWidth={1.5} />
          <Area type="monotone" dataKey="profit"    stroke="var(--terrain)" strokeWidth={2.5} fill="url(#profitGrad)" dot={{ fill:'var(--terrain)', r:4 }} activeDot={{ r:5 }} connectNulls={false} />
          <Area type="monotone" dataKey="projected" stroke="var(--violet)"  strokeWidth={2}   strokeDasharray="6 4" fill="url(#projGrad)" dot={{ fill:'var(--violet)', r:4 }} activeDot={{ r:5 }} connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

export default function Forecast() {
  const { data: orders      = [] } = useQuery({ queryKey:['forecastOrders'], queryFn:() => base44.entities.PurchaseOrder.list('-order_date', 300) });
  const { data: creditCards = [] } = useQuery({ queryKey:['creditCards'],    queryFn:() => base44.entities.CreditCard.list() });
  const { data: goals       = [] } = useQuery({ queryKey:['goals'],          queryFn:() => base44.entities.Goal.list() });

  return (
    <div style={{ paddingBottom:40 }}>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontFamily:"ui-sans-serif, system-ui, -apple-system, sans-serif", fontSize:24, fontWeight:900, color:'var(--ink)', letterSpacing:'-0.3px', display:'flex', alignItems:'center', gap:8 }}>
          <TrendingUp style={{ height:22, width:22, color:'var(--violet)' }} /> Forecast
        </h1>
        <p style={{ fontSize:12, color:'var(--ink-dim)', marginTop:4 }}>Calculate profitability, project earnings, and find your best cards</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
        <ProfitCalculator creditCards={creditCards} />
        <MonthlyProjection orders={orders} goals={goals} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        <BestCardsForDeal creditCards={creditCards} />
        <TrendProjection orders={orders} />
      </div>
    </div>
  );
}