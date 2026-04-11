import { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Calculator, TrendingUp, CreditCard, BarChart2,
  Store, ChevronUp, ChevronDown, Target, RefreshCw,
  ArrowRight, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const fmt$ = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v || 0);
const pct = (v) => `${Number(v || 0).toFixed(1)}%`;

// Revenue from sale_events — matches Dashboard/Analytics exactly
function calcRevenue(order) {
  return (order.sale_events || []).reduce(
    (sum, ev) =>
      sum +
      (ev.items || []).reduce(
        (s, item) => s + (parseFloat(item.sale_price) || 0) * (parseInt(item.quantity) || 1),
        0
      ),
    0
  );
}

const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid var(--parch-line)',
  fontSize: 11,
  background: 'var(--parch-card)',
  color: 'var(--ink)',
  boxShadow: 'var(--shadow-md)',
};

/* ─────────────────────────────────────────────
   SHARED UI
───────────────────────────────────────────── */
function SectionDivider({ title, dotColor = 'var(--gold)', lineColor = 'rgba(160,114,42,0.25)' }) {
  return (
    <div className="section-div">
      <div className="section-div-dot" style={{ background: dotColor }} />
      <span className="section-div-label" style={{ color: dotColor }}>{title}</span>
      <div className="section-div-line" style={{ background: `linear-gradient(90deg,${lineColor},rgba(160,114,42,0.06),transparent)` }} />
    </div>
  );
}

function SectionCard({ icon: Icon, title, accentColor = 'var(--violet)', children }) {
  return (
    <div className="card" style={{ overflow: 'hidden', borderTop: `3px solid ${accentColor}` }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderBottom: '1px solid var(--parch-line)',
        background: 'var(--parch-warm)',
      }}>
        <Icon style={{ width: 15, height: 15, color: accentColor, flexShrink: 0 }} />
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)', margin: 0,
        }}>{title}</h2>
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

const INP = {
  background: 'var(--parch-warm)', border: '1px solid var(--parch-line)',
  borderRadius: 8, color: 'var(--ink)', padding: '7px 11px',
  fontSize: 13, outline: 'none', width: '100%', fontFamily: 'var(--font-mono)',
};

function Label({ children }) {
  return (
    <label style={{
      fontSize: 10, color: 'var(--ink-faded)', fontWeight: 700,
      display: 'block', marginBottom: 4, letterSpacing: '0.1em',
      textTransform: 'uppercase', fontFamily: 'var(--font-serif)',
    }}>{children}</label>
  );
}

function StatBox({ label, value, color = 'var(--ink)', bg = 'var(--parch-warm)', bdr = 'var(--parch-line)' }) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '10px 12px', border: `1px solid ${bdr}`, textAlign: 'center' }}>
      <p style={{ fontSize: 9, color: 'var(--ink-faded)', marginBottom: 4, fontFamily: 'var(--font-serif)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 700, color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   1. PROFIT CALCULATOR (enhanced)
───────────────────────────────────────────── */
function ProfitCalculator({ creditCards }) {
  const [mode,          setMode]          = useState('forward'); // 'forward' | 'breakeven'
  const [unitCost,      setUnitCost]      = useState('');
  const [qty,           setQty]           = useState('1');
  const [salePrice,     setSalePrice]     = useState('');
  const [platformFee,   setPlatformFee]   = useState('');   // % marketplace takes
  const [shippingCost,  setShippingCost]  = useState('');   // $ per order
  const [selectedCardId,setSelectedCardId]= useState('');
  const [targetProfit,  setTargetProfit]  = useState('');   // break-even mode

  const q             = parseInt(qty) || 1;
  const cost          = (parseFloat(unitCost) || 0) * q;
  const shipping      = parseFloat(shippingCost) || 0;
  const totalCost     = cost + shipping;
  const feeRate       = parseFloat(platformFee) || 0;
  const selectedCard  = creditCards.find(c => c.id === selectedCardId);
  const cashbackRate  = selectedCard?.cashback_rate || 0;
  const cashbackEarned= totalCost * cashbackRate / 100;

  // Forward mode
  const grossRevenue  = (parseFloat(salePrice) || 0) * q;
  const platformFeeAmt= grossRevenue * feeRate / 100;
  const netRevenue    = grossRevenue - platformFeeAmt;
  const grossProfit   = netRevenue - totalCost;
  const netProfit     = grossProfit + cashbackEarned;
  const roi           = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const isPositive    = netProfit >= 0;

  // Break-even mode: what sale price do I need?
  const target        = parseFloat(targetProfit) || 0;
  // netRevenue - totalCost + cashbackEarned = target
  // netRevenue = target + totalCost - cashbackEarned
  // grossRevenue * (1 - feeRate/100) = netRevenue
  // grossRevenue = netRevenue / (1 - feeRate/100)
  const neededNetRev  = target + totalCost - cashbackEarned;
  const divisor       = feeRate < 100 ? (1 - feeRate / 100) : 1;
  const breakEvenGross= neededNetRev / divisor;
  const breakEvenPer  = q > 0 ? breakEvenGross / q : 0;

  const hasInput = totalCost > 0;

  return (
    <SectionCard icon={Calculator} title="Profit Calculator" accentColor="var(--violet)">
      {/* Mode toggle */}
      <div className="tab-bar" style={{ marginBottom: 14, width: 'fit-content' }}>
        {[['forward', 'Forward Calc'], ['breakeven', 'Break-Even']].map(([id, label]) => (
          <button key={id} className={`tab-btn${mode === id ? ' active' : ''}`} onClick={() => setMode(id)}>
            {label}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="grid-kpi" style={{ marginBottom: 10 }}>
        <div>
          <Label>Unit Cost ($)</Label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 12 }}>$</span>
            <input type="number" min="0" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)}
              placeholder="0.00" style={{ ...INP, paddingLeft: 22 }} />
          </div>
        </div>
        <div>
          <Label>Quantity</Label>
          <input type="number" min="1" step="1" value={qty} onChange={e => setQty(e.target.value)}
            placeholder="1" style={INP} />
        </div>
        <div>
          <Label>Shipping Cost ($)</Label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 12 }}>$</span>
            <input type="number" min="0" step="0.01" value={shippingCost} onChange={e => setShippingCost(e.target.value)}
              placeholder="0.00" style={{ ...INP, paddingLeft: 22 }} />
          </div>
        </div>
        <div>
          <Label>Platform Fee (%)</Label>
          <div style={{ position: 'relative' }}>
            <input type="number" min="0" max="100" step="0.1" value={platformFee} onChange={e => setPlatformFee(e.target.value)}
              placeholder="0.0" style={{ ...INP, paddingRight: 22 }} />
            <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 12 }}>%</span>
          </div>
        </div>
      </div>

      {/* Sale price OR target profit */}
      <div className="grid-2col" style={{ marginBottom: 12 }}>
        {mode === 'forward' ? (
          <div>
            <Label>Expected Sale Price ($)</Label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 12 }}>$</span>
              <input type="number" min="0" step="0.01" value={salePrice} onChange={e => setSalePrice(e.target.value)}
                placeholder="0.00" style={{ ...INP, paddingLeft: 22 }} />
            </div>
          </div>
        ) : (
          <div>
            <Label>Target Profit ($)</Label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 12 }}>$</span>
              <input type="number" min="0" step="0.01" value={targetProfit} onChange={e => setTargetProfit(e.target.value)}
                placeholder="0.00" style={{ ...INP, paddingLeft: 22 }} />
            </div>
          </div>
        )}
        <div>
          <Label>Credit Card</Label>
          <select value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)} style={{ ...INP, cursor: 'pointer' }}>
            <option value="">No card</option>
            {creditCards.filter(c => c.active !== false).map(c => (
              <option key={c.id} value={c.id}>{c.card_name} — {c.cashback_rate || 0}% CB</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      {hasInput && mode === 'forward' && (
        <div style={{
          borderRadius: 12, border: `1px solid ${isPositive ? 'var(--terrain-bdr)' : 'var(--crimson-bdr)'}`,
          padding: 14, background: isPositive ? 'var(--terrain-bg)' : 'var(--crimson-bg)',
        }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 10 }}>Results</p>
          <div className="grid-kpi" style={{ marginBottom: 10 }}>
            <StatBox label="Total Cost"     value={fmt$(totalCost)}  color="var(--ocean)"   bg="var(--parch-card)" />
            <StatBox label="Net Revenue"    value={fmt$(netRevenue)} color="var(--terrain)" bg="var(--parch-card)" />
            <StatBox label="Gross Profit"   value={fmt$(grossProfit)}color={grossProfit >= 0 ? 'var(--terrain)' : 'var(--crimson)'} bg="var(--parch-card)" />
            <StatBox label="ROI"            value={pct(roi)}         color={roi >= 0 ? 'var(--terrain)' : 'var(--crimson)'} bg="var(--parch-card)" />
          </div>
          {feeRate > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--parch-card)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--parch-line)', marginBottom: 8, fontSize: 12 }}>
              <span style={{ color: 'var(--ink-faded)' }}>Platform fee ({pct(feeRate)} of {fmt$(grossRevenue)})</span>
              <span style={{ color: 'var(--crimson)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>−{fmt$(platformFeeAmt)}</span>
            </div>
          )}
          {cashbackEarned > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--parch-card)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--parch-line)', marginBottom: 8, fontSize: 12 }}>
              <span style={{ color: 'var(--ink-faded)' }}>Cashback ({pct(cashbackRate)} · {selectedCard?.card_name})</span>
              <span style={{ color: 'var(--violet)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>+{fmt$(cashbackEarned)}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--parch-card)', borderRadius: 10, padding: '10px 14px', border: '2px dashed var(--parch-line)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Net Profit (after cashback)</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: isPositive ? 'var(--terrain)' : 'var(--crimson)', fontFamily: 'var(--font-mono)' }}>
              {isPositive ? '+' : ''}{fmt$(netProfit)}
            </p>
          </div>
        </div>
      )}

      {hasInput && mode === 'breakeven' && (
        <div style={{ borderRadius: 12, border: '1px solid var(--gold-bdr)', padding: 14, background: 'var(--gold-bg)' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 10 }}>Break-Even Results</p>
          <div className="grid-2col" style={{ marginBottom: 10 }}>
            <StatBox label={`Min Sale Price (each of ${q})`} value={fmt$(breakEvenPer)}  color="var(--gold)" bg="var(--parch-card)" />
            <StatBox label="Total Min Revenue"               value={fmt$(breakEvenGross)} color="var(--gold)" bg="var(--parch-card)" />
          </div>
          <p style={{ fontSize: 11, color: 'var(--ink-dim)', lineHeight: 1.5 }}>
            To make {fmt$(target)} profit on {q} unit{q > 1 ? 's' : ''} with {pct(feeRate)} platform fee
            {cashbackEarned > 0 ? ` and ${pct(cashbackRate)} cashback (${fmt$(cashbackEarned)})` : ''}, you need to sell each unit for at least <strong style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>{fmt$(breakEvenPer)}</strong>.
          </p>
        </div>
      )}
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────
   2. MONTHLY PROJECTION (fixed data)
───────────────────────────────────────────── */
function MonthlyProjection({ orders, rewards, goals }) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentOrders = useMemo(
    () => orders.filter(o => o.order_date && new Date(o.order_date) >= thirtyDaysAgo),
    [orders]
  );

  const recentRewards = useMemo(
    () => rewards.filter(r => r.date_earned && new Date(r.date_earned) >= thirtyDaysAgo && r.currency === 'USD'),
    [rewards]
  );

  const { totalCost, totalRevenue, totalCashback } = useMemo(() => {
    const totalCost     = recentOrders.reduce((s, o) => s + parseFloat(o.total_cost || o.final_cost || 0), 0);
    const totalRevenue  = recentOrders.reduce((s, o) => s + calcRevenue(o), 0);
    const totalCashback = recentRewards.reduce((s, r) => s + (r.amount || 0), 0);
    return { totalCost, totalRevenue, totalCashback };
  }, [recentOrders, recentRewards]);

  const totalProfit30d = totalRevenue - totalCost + totalCashback;
  const avgROI         = totalCost > 0 ? (totalProfit30d / totalCost) * 100 : 0;
  // Project to full month (30 days = 1 month)
  const projectedMonthlyProfit = totalProfit30d;

  const profitGoal  = goals.find(g => g.type === 'profit' && g.timeframe === 'monthly' && g.active !== false);
  const goalTarget  = profitGoal?.target_value || 0;
  const progressPct = goalTarget > 0 ? Math.min((projectedMonthlyProfit / goalTarget) * 100, 100) : 0;
  const daysLeft    = useMemo(() => Math.ceil((endOfMonth(now) - now) / (1000 * 60 * 60 * 24)), []);

  const progressColor = progressPct >= 100 ? 'var(--terrain)' : progressPct >= 60 ? 'var(--violet)' : 'var(--gold)';

  return (
    <SectionCard icon={TrendingUp} title="Monthly Projection" accentColor="var(--terrain)">
      <div className="grid-kpi" style={{ marginBottom: 12 }}>
        <StatBox label="Orders (30d)"  value={recentOrders.length}   color="var(--ink)"     />
        <StatBox label="Revenue (30d)" value={fmt$(totalRevenue)}     color="var(--terrain)" bg="var(--terrain-bg)" bdr="var(--terrain-bdr)" />
        <StatBox label="Avg ROI"       value={pct(avgROI)}            color={avgROI >= 0 ? 'var(--terrain)' : 'var(--crimson)'} />
        <StatBox label="Days Left"     value={daysLeft}               color="var(--ink)"     />
      </div>

      <div style={{
        borderRadius: 10, padding: '12px 14px',
        border: `1px solid ${projectedMonthlyProfit >= 0 ? 'var(--terrain-bdr)' : 'var(--crimson-bdr)'}`,
        background: projectedMonthlyProfit >= 0 ? 'var(--terrain-bg)' : 'var(--crimson-bg)',
        marginBottom: 14,
      }}>
        <p style={{ fontSize: 11, color: 'var(--ink-dim)' }}>Based on your last 30 days, projected monthly profit</p>
        <p style={{ fontSize: 28, fontWeight: 700, color: projectedMonthlyProfit >= 0 ? 'var(--terrain)' : 'var(--crimson)', marginTop: 4, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
          {fmt$(projectedMonthlyProfit)}
        </p>
        <p style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 6 }}>
          {fmt$(totalCost)} spend · {fmt$(totalCashback)} cashback included
        </p>
      </div>

      {goalTarget > 0 ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
            <span style={{ fontWeight: 700, color: 'var(--ink-faded)', fontFamily: 'var(--font-serif)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Monthly Goal Progress</span>
            <span style={{ color: 'var(--ink-dim)', fontFamily: 'var(--font-mono)' }}>{fmt$(projectedMonthlyProfit)} / {fmt$(goalTarget)}</span>
          </div>
          <div style={{ height: 8, background: 'var(--parch-warm)', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--parch-line)' }}>
            <div style={{ height: '100%', borderRadius: 99, background: progressColor, width: `${Math.max(0, progressPct)}%`, transition: 'width 0.7s ease' }} />
          </div>
          <p style={{ fontSize: 10, color: 'var(--ink-ghost)', textAlign: 'right', marginTop: 4 }}>{Math.max(0, progressPct).toFixed(0)}% of goal</p>
        </div>
      ) : (
        <p style={{ fontSize: 11, color: 'var(--ink-ghost)', textAlign: 'center', padding: '8px 0' }}>
          Set a monthly profit goal to track progress here
        </p>
      )}
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────
   3. BEST CARDS (improved matching)
───────────────────────────────────────────── */
function BestCardsForDeal({ creditCards }) {
  const [storeName, setStoreName] = useState('');

  const activeCards = useMemo(() => creditCards.filter(c => c.active !== false), [creditCards]);

  const ranked = useMemo(() => {
    if (!storeName.trim()) return [];
    const q = storeName.trim().toLowerCase();
    return activeCards.map(c => {
      // Try exact match first, then partial
      const rates = c.store_rates || [];
      const exact   = rates.find(sr => sr.store?.toLowerCase() === q);
      const partial = rates.find(sr => sr.store?.toLowerCase().includes(q) || q.includes(sr.store?.toLowerCase() || ''));
      const storeRate    = exact || partial;
      const effectiveRate = storeRate ? storeRate.rate : (c.cashback_rate || 0);
      return {
        id: c.id,
        card_name: c.card_name,
        effectiveRate,
        baseRate: c.cashback_rate || 0,
        hasStoreRate: !!storeRate,
        storeName: storeRate?.store,
      };
    }).sort((a, b) => b.effectiveRate - a.effectiveRate).slice(0, 6);
  }, [activeCards, storeName]);

  const topRate = ranked[0]?.effectiveRate || 0;

  return (
    <SectionCard icon={Store} title="Best Card For This Store" accentColor="var(--ocean)">
      <div style={{ marginBottom: 14 }}>
        <Label>Store name</Label>
        <input
          type="text" value={storeName} onChange={e => setStoreName(e.target.value)}
          placeholder="e.g. Amazon, Walmart, Target..."
          style={INP}
        />
      </div>

      {storeName.trim() === '' ? (
        <p style={{ fontSize: 12, color: 'var(--ink-ghost)', textAlign: 'center', padding: '16px 0' }}>
          Type a store name to rank your cards by cashback rate
        </p>
      ) : ranked.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--ink-ghost)', textAlign: 'center', padding: '16px 0' }}>No active cards found</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {ranked.map((card, idx) => (
            <div key={card.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10,
              border: `1px solid ${idx === 0 ? 'var(--ocean-bdr)' : 'var(--parch-line)'}`,
              background: idx === 0 ? 'var(--ocean-bg)' : 'var(--parch-warm)',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 10,
                fontWeight: 700, flexShrink: 0,
                background: idx === 0 ? 'var(--ocean)' : 'var(--parch-line)',
                color: idx === 0 ? '#fff' : 'var(--ink-dim)',
              }}>{idx + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{card.card_name}</p>
                <p style={{ fontSize: 10, color: 'var(--ink-faded)' }}>
                  {card.hasStoreRate
                    ? `Store-specific rate for "${card.storeName}"`
                    : 'Base cashback rate'}
                  {card.hasStoreRate && card.baseRate !== card.effectiveRate ? ` (base: ${pct(card.baseRate)})` : ''}
                </p>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: idx === 0 ? 'var(--ocean)' : 'var(--ink-dim)' }}>
                {pct(card.effectiveRate)}
              </p>
              <div style={{ width: 48, height: 5, background: 'var(--parch-line)', borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  background: idx === 0 ? 'var(--ocean)' : 'var(--ink-ghost)',
                  width: topRate > 0 ? `${(card.effectiveRate / topRate) * 100}%` : '0%',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────
   4. TREND PROJECTION (fixed revenue calc)
───────────────────────────────────────────── */
function TrendProjection({ orders, rewards }) {
  const chartData = useMemo(() => {
    const now = new Date();
    const points = [];

    // Last 3 months actuals
    for (let i = 2; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd   = endOfMonth(subMonths(now, i));

      const mOrders  = orders.filter(o => {
        if (!o.order_date) return false;
        const d = new Date(o.order_date);
        return d >= monthStart && d <= monthEnd;
      });
      const mRewards = rewards.filter(r => {
        if (!r.date_earned || r.currency !== 'USD') return false;
        const d = new Date(r.date_earned);
        return d >= monthStart && d <= monthEnd;
      });

      const revenue  = mOrders.reduce((s, o) => s + calcRevenue(o), 0);
      const cost     = mOrders.reduce((s, o) => s + parseFloat(o.total_cost || o.final_cost || 0), 0);
      const cashback = mRewards.reduce((s, r) => s + (r.amount || 0), 0);
      const profit   = revenue - cost + cashback;

      points.push({
        label: format(monthStart, 'MMM'),
        profit: Math.round(profit),
        projected: null,
        isProjected: false,
      });
    }

    // Project next 3 months using linear trend
    const actuals = points.map(p => p.profit);
    const avg     = actuals.reduce((s, v) => s + v, 0) / actuals.length;
    const slope   = actuals.length >= 2
      ? (actuals[actuals.length - 1] - actuals[0]) / (actuals.length - 1)
      : 0;

    for (let i = 1; i <= 3; i++) {
      points.push({
        label: format(subMonths(now, -i), 'MMM'),
        profit: null,
        projected: Math.round(avg + slope * i),
        isProjected: true,
      });
    }

    return points;
  }, [orders, rewards]);

  const lastActual    = chartData.filter(d => d.profit !== null).slice(-1)[0];
  const lastProjected = chartData.slice(-1)[0];
  const growth        = lastActual && lastProjected ? lastProjected.projected - lastActual.profit : 0;
  const firstProjectedLabel = chartData.find(d => d.isProjected)?.label;

  return (
    <SectionCard icon={BarChart2} title="Trend — Last 3 + Next 3 Months" accentColor="var(--gold)">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
          <div style={{ width: 24, height: 2, background: 'var(--terrain)', borderRadius: 99 }} />
          <span style={{ color: 'var(--ink-dim)' }}>Actual</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
          <div style={{ width: 24, height: 0, border: '1px dashed var(--violet)' }} />
          <span style={{ color: 'var(--ink-dim)' }}>Projected</span>
        </div>
        {growth !== 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 12, color: growth >= 0 ? 'var(--terrain)' : 'var(--crimson)', fontFamily: 'var(--font-mono)' }}>
            {growth >= 0 ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {growth >= 0 ? '+' : ''}{fmt$(growth)} trend
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fcastProfitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#4a7a35" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#4a7a35" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fcastProjGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#5a3a6e" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#5a3a6e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(153,126,103,0.18)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--ink-ghost)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--ink-ghost)', fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false}
            tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
          <Tooltip contentStyle={TOOLTIP_STYLE}
            formatter={(v, name) => [v !== null ? fmt$(v) : '—', name === 'profit' ? 'Actual Profit' : 'Projected Profit']} />
          {firstProjectedLabel && (
            <ReferenceLine x={firstProjectedLabel} stroke="var(--parch-line)" strokeDasharray="4 4" strokeWidth={1.5} />
          )}
          <Area type="monotone" dataKey="profit"    stroke="var(--terrain)" strokeWidth={2.5}
            fill="url(#fcastProfitGrad)" dot={{ fill: 'var(--terrain)', r: 4 }} connectNulls={false} />
          <Area type="monotone" dataKey="projected" stroke="var(--violet)"  strokeWidth={2}
            strokeDasharray="6 4" fill="url(#fcastProjGrad)" dot={{ fill: 'var(--violet)', r: 4 }} connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────
   5. GOAL REVERSE CALCULATOR (new)
───────────────────────────────────────────── */
function GoalCalculator({ creditCards }) {
  const [monthlyTarget, setMonthlyTarget] = useState('');
  const [avgOrderCost,  setAvgOrderCost]  = useState('');
  const [avgSalePrice,  setAvgSalePrice]  = useState('');
  const [platformFee,   setPlatformFee]   = useState('');
  const [selectedCardId,setSelectedCardId]= useState('');

  const target      = parseFloat(monthlyTarget) || 0;
  const cost        = parseFloat(avgOrderCost)  || 0;
  const sale        = parseFloat(avgSalePrice)  || 0;
  const feeRate     = parseFloat(platformFee)   || 0;
  const card        = creditCards.find(c => c.id === selectedCardId);
  const cbRate      = card?.cashback_rate || 0;

  // Per-order profit
  const netSale     = sale * (1 - feeRate / 100);
  const cashback    = cost * cbRate / 100;
  const profitPerOrder = netSale - cost + cashback;

  // How many orders/month needed
  const ordersNeeded   = profitPerOrder > 0 ? Math.ceil(target / profitPerOrder) : null;
  const ordersPerDay   = ordersNeeded != null ? (ordersNeeded / 30).toFixed(1) : null;
  const totalSpend     = ordersNeeded != null ? ordersNeeded * cost : null;
  const totalCashback  = totalSpend != null ? totalSpend * cbRate / 100 : null;

  const hasInput = target > 0 && cost > 0 && sale > 0;
  const feasible = profitPerOrder > 0;

  return (
    <SectionCard icon={Target} title="Goal Calculator — What Do I Need?" accentColor="var(--gold)">
      <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginBottom: 14, lineHeight: 1.5 }}>
        Enter your monthly profit goal and average deal metrics — we'll tell you exactly how many orders you need per day.
      </p>

      {/* Row 1 — Monthly goal spans full width for emphasis */}
      <div style={{ marginBottom: 10 }}>
        <Label>Monthly Profit Goal ($)</Label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 14 }}>$</span>
          <input type="number" min="0" step="10" value={monthlyTarget} onChange={e => setMonthlyTarget(e.target.value)}
            placeholder="1,000.00"
            style={{ ...INP, paddingLeft: 26, fontSize: 16, fontWeight: 700, height: 44, color: 'var(--gold)', background: 'var(--gold-bg)', border: '1px solid var(--gold-bdr)' }} />
        </div>
      </div>

      {/* Row 2 — Deal details: cost | sale price | platform fee */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 10, marginBottom: 10 }}>
        <div>
          <Label>Avg Order Cost ($)</Label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 12 }}>$</span>
            <input type="number" min="0" step="0.01" value={avgOrderCost} onChange={e => setAvgOrderCost(e.target.value)}
              placeholder="0.00" style={{ ...INP, paddingLeft: 22 }} />
          </div>
        </div>
        <div>
          <Label>Avg Sale Price ($)</Label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 12 }}>$</span>
            <input type="number" min="0" step="0.01" value={avgSalePrice} onChange={e => setAvgSalePrice(e.target.value)}
              placeholder="0.00" style={{ ...INP, paddingLeft: 22 }} />
          </div>
        </div>
        <div>
          <Label>Platform Fee</Label>
          <div style={{ position: 'relative' }}>
            <input type="number" min="0" max="100" step="0.1" value={platformFee} onChange={e => setPlatformFee(e.target.value)}
              placeholder="0.0" style={{ ...INP, paddingRight: 22 }} />
            <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 12 }}>%</span>
          </div>
        </div>
      </div>

      {/* Row 3 — Credit card full width */}
      <div style={{ marginBottom: 14 }}>
        <Label>Credit Card (for cashback)</Label>
        <select value={selectedCardId} onChange={e => setSelectedCardId(e.target.value)} style={{ ...INP, cursor: 'pointer' }}>
          <option value="">No card selected</option>
          {creditCards.filter(c => c.active !== false).map(c => (
            <option key={c.id} value={c.id}>{c.card_name} — {c.cashback_rate || 0}% cashback</option>
          ))}
        </select>
      </div>

      {hasInput && !feasible && (
        <div style={{ borderRadius: 10, padding: '12px 14px', background: 'var(--crimson-bg)', border: '1px solid var(--crimson-bdr)', fontSize: 12, color: 'var(--crimson)' }}>
          ⚠️ At these numbers each order loses money ({fmt$(profitPerOrder)}). Raise the sale price, lower the cost, or reduce fees.
        </div>
      )}

      {hasInput && feasible && (
        <div style={{ borderRadius: 12, border: '1px solid var(--gold-bdr)', padding: 14, background: 'var(--gold-bg)' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-dim)', marginBottom: 12 }}>
            To reach {fmt$(target)}/month you need:
          </p>

          {/* Hero numbers */}
          <div className="grid-2col" style={{ marginBottom: 12 }}>
            <div style={{ textAlign: 'center', background: 'var(--parch-card)', borderRadius: 12, padding: '16px 12px', border: '1px solid var(--gold-bdr)' }}>
              <p style={{ fontSize: 10, color: 'var(--ink-faded)', fontFamily: 'var(--font-serif)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Orders / Month</p>
              <p style={{ fontSize: 36, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{ordersNeeded}</p>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--parch-card)', borderRadius: 12, padding: '16px 12px', border: '1px solid var(--gold-bdr)' }}>
              <p style={{ fontSize: 10, color: 'var(--ink-faded)', fontFamily: 'var(--font-serif)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Orders / Day</p>
              <p style={{ fontSize: 36, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{ordersPerDay}</p>
            </div>
          </div>

          {/* Supporting stats */}
          <div className="grid-kpi">
            <StatBox label="Profit / Order"  value={fmt$(profitPerOrder)} color="var(--terrain)" bg="var(--parch-card)" />
            <StatBox label="Total Spend"     value={fmt$(totalSpend)}     color="var(--ocean)"   bg="var(--parch-card)" />
            <StatBox label="Total Cashback"  value={fmt$(totalCashback)}  color="var(--violet)"  bg="var(--parch-card)" />
            <StatBox label="Net ROI"         value={pct(cost > 0 ? (profitPerOrder / cost) * 100 : 0)} color="var(--gold)" bg="var(--parch-card)" />
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function Forecast() {
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setUserEmail(u?.email || null)).catch(() => {});
  }, []);

  const { data: orders      = [] } = useQuery({
    queryKey: ['forecastOrders', userEmail],
    queryFn:  () => userEmail ? base44.entities.PurchaseOrder.filter({ created_by: userEmail }) : [],
    enabled:  !!userEmail,
  });
  const { data: rewards     = [] } = useQuery({
    queryKey: ['forecastRewards', userEmail],
    queryFn:  () => userEmail ? base44.entities.Reward.filter({ created_by: userEmail }) : [],
    enabled:  !!userEmail,
  });
  const { data: creditCards = [] } = useQuery({
    queryKey: ['forecastCards', userEmail],
    queryFn:  () => userEmail ? base44.entities.CreditCard.filter({ created_by: userEmail }) : [],
    enabled:  !!userEmail,
  });
  const { data: goals       = [] } = useQuery({
    queryKey: ['forecastGoals', userEmail],
    queryFn:  () => userEmail ? base44.entities.Goal.filter({ created_by: userEmail }) : [],
    enabled:  !!userEmail,
  });

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
          Forecast
        </h1>
        <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 4 }}>
          Calculate profitability, plan your targets, and find your best cards
        </p>
      </div>

      {/* Row 1 — Calculator + Projection */}
      <SectionDivider title="Planning Tools" />
      <div className="grid-2col" style={{ marginBottom: 16 }}>
        <ProfitCalculator creditCards={creditCards} />
        <MonthlyProjection orders={orders} rewards={rewards} goals={goals} />
      </div>

      {/* Row 2 — Goal calc + Best cards */}
      <SectionDivider title="Strategy" dotColor="var(--ocean)" lineColor="rgba(42,92,122,0.25)" />
      <div className="grid-2col" style={{ marginBottom: 16 }}>
        <GoalCalculator creditCards={creditCards} />
        <BestCardsForDeal creditCards={creditCards} />
      </div>

      {/* Row 3 — Trend full width */}
      <SectionDivider title="Trend Projection" dotColor="var(--gold)" lineColor="rgba(160,114,42,0.25)" />
      <TrendProjection orders={orders} rewards={rewards} />

    </div>
  );
}