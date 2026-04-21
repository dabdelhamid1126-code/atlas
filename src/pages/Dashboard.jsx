import { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, TrendingUp, CreditCard, Percent, ShoppingBag, Send,
  Package, CheckCircle, X, ImageOff, AlertTriangle, Truck,
  Gift, Boxes, FileWarning, Clock, ArrowRight, RefreshCw,
  Star, BarChart2
} from "lucide-react";
import RetailerLogo, { CardLogo } from "@/components/shared/BrandLogo";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const TIME_FILTERS = ["Today", "7 Days", "30 Days", "YTD", "All Time"];
const MODE_FILTERS = ["All", "Churning", "Resell"];
const PIE_COLORS   = ["#A0722A","#8a6d56","#2a5c7a","#5a3a6e","#997E67","#C4922E"];

const STATUS_CONFIG = {
  pending:            { label:"Pending",   icon:Clock,        color:"#997E67", bg:"rgba(153,126,103,0.10)", border:"rgba(153,126,103,0.22)" },
  ordered:            { label:"Ordered",   icon:ShoppingBag,  color:"#2a5c7a", bg:"rgba(42,92,122,0.10)",   border:"rgba(42,92,122,0.22)"   },
  shipped:            { label:"Shipped",   icon:Send,         color:"#5a3a6e", bg:"rgba(90,58,110,0.10)",   border:"rgba(90,58,110,0.20)"   },
  received:           { label:"Received",  icon:Package,      color:"#2a5c7a", bg:"rgba(42,92,122,0.10)",   border:"rgba(42,92,122,0.22)"   },
  partially_received: { label:"Partial",   icon:Package,      color:"#A0722A", bg:"rgba(160,114,42,0.10)",  border:"rgba(160,114,42,0.22)"  },
  paid:               { label:"Paid",      icon:CheckCircle,  color:"#4a7a35", bg:"rgba(74,122,53,0.10)",   border:"rgba(74,122,53,0.20)"   },
  completed:          { label:"Completed", icon:CheckCircle,  color:"#A0722A", bg:"rgba(160,114,42,0.10)",  border:"rgba(160,114,42,0.22)"  },
  cancelled:          { label:"Cancelled", icon:X,            color:"#8b3a2a", bg:"rgba(139,58,42,0.10)",   border:"rgba(139,58,42,0.20)"   },
};

// accentVar drives border-top color, icon color, and value color (unless overridden per key)
// bgVar / bdrVar drive the icon box — must match the accentVar family
const KPI_DEFS = [
  { key:"totalCost",     label:"Total Cost",      sub:"card spend",          icon:CreditCard, accentVar:"--ocean",   bgVar:"--ocean-bg",   bdrVar:"--ocean-bdr"   },
  { key:"saleRevenue",   label:"Sale Revenue",    sub:"from sales",          icon:TrendingUp, accentVar:"--terrain", bgVar:"--terrain-bg", bdrVar:"--terrain-bdr" },
  { key:"cashback",      label:"Cashback",        sub:"total USD rewards",   icon:Percent,    accentVar:"--violet",  bgVar:"--violet-bg",  bdrVar:"--violet-bdr"  },
  { key:"netProfit",     label:"Net Profit",      sub:"revenue − cost + CB", icon:DollarSign, accentVar:null,        bgVar:null,           bdrVar:null            },
  { key:"yaCashback",    label:"YA Cashback",     sub:"Young Adult rewards", icon:Star,       accentVar:"--gold",    bgVar:"--gold-bg",    bdrVar:"--gold-bdr"    },
  { key:"avgRoi",        label:"Avg ROI",         sub:"return on spend",     icon:BarChart2,  accentVar:"--ocean",   bgVar:"--ocean-bg",   bdrVar:"--ocean-bdr"   },
  { key:"inStockUnits",  label:"Units In Stock",  sub:"ready to ship",       icon:Boxes,      accentVar:"--terrain", bgVar:"--terrain-bg", bdrVar:"--terrain-bdr" },
  { key:"giftCardValue", label:"Gift Card Value", sub:"available balance",   icon:Gift,       accentVar:"--rose",    bgVar:"--rose-bg",    bdrVar:"--rose-bdr"    },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function fmt(n) {
  if (n == null) return "$0.00";
  return new Intl.NumberFormat("en-US",{ style:"currency", currency:"USD", maximumFractionDigits:2 }).format(n);
}
function abbrev(n) {
  const abs = Math.abs(n || 0);
  if (abs >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
  if (abs >= 10_000)    return `$${(n/1_000).toFixed(1)}K`;
  return fmt(n);
}
function fmtDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-US",{ month:"short", day:"numeric" }); }
  catch { return "—"; }
}
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/* ─────────────────────────────────────────────
   DATE HELPERS
───────────────────────────────────────────── */
function getDateCutoff(timeFilter) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (timeFilter === "Today")   return today;
  if (timeFilter === "7 Days")  return new Date(today - 7*864e5);
  if (timeFilter === "30 Days") return new Date(today - 30*864e5);
  if (timeFilter === "YTD")     return new Date(now.getFullYear(), 0, 1);
  return new Date(0);
}
function parseD(str) { return str ? new Date(str) : null; }

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function SectionDivider({ title, dotColor="var(--gold)", lineColor="rgba(160,114,42,0.25)" }) {
  return (
    <div className="section-div">
      <div className="section-div-dot" style={{ background: dotColor }} />
      <span className="section-div-label" style={{ color: dotColor }}>{title}</span>
      <div className="section-div-line" style={{ background:`linear-gradient(90deg,${lineColor},rgba(160,114,42,0.06),transparent)` }} />
    </div>
  );
}

/* Unified KPI card — layout: label → value → sub → icon (bottom-left, in flow)
   Matches Analytics KpiCard exactly. netProfit and avgRoi get dynamic colors. */
function KpiCard({ def, metrics }) {
  const raw      = metrics[def.key];
  const isProfit = def.key === "netProfit";
  const isRoi    = def.key === "avgRoi";

  // Border-top and icon color
  const accent = isProfit
    ? (raw >= 0 ? "var(--gold)"    : "var(--crimson)")
    : isRoi
      ? (raw >= 0 ? "var(--ocean)" : "var(--crimson)")
      : (def.accentVar ? `var(${def.accentVar})` : "var(--parch-line)");

  // Value text color — same logic
  const valColor = isProfit
    ? (raw >= 0 ? "var(--gold)"    : "var(--crimson)")
    : isRoi
      ? (raw >= 0 ? "var(--ocean)" : "var(--crimson)")
      : (def.accentVar ? `var(${def.accentVar})` : "var(--ink)");

  // Icon box bg / border — dynamic for profit/roi, static from def otherwise
  const iconBg  = isProfit
    ? (raw >= 0 ? "var(--gold-bg)"    : "var(--crimson-bg)")
    : isRoi
      ? (raw >= 0 ? "var(--ocean-bg)" : "var(--crimson-bg)")
      : (def.bgVar  ? `var(${def.bgVar})`  : "var(--parch-warm)");
  const iconBdr = isProfit
    ? (raw >= 0 ? "var(--gold-bdr)"   : "var(--crimson-bdr)")
    : isRoi
      ? (raw >= 0 ? "var(--ocean-bdr)": "var(--crimson-bdr)")
      : (def.bdrVar ? `var(${def.bdrVar})` : "var(--parch-line)");

  const display = isRoi
    ? `${raw.toFixed(1)}%`
    : (def.key === "inStockUnits" || def.key === "points")
      ? raw.toLocaleString()
      : abbrev(raw);

  const Icon = def.icon;

  return (
    <div className="kpi-card fade-up" style={{ borderTopColor: accent }}>
      <div className="kpi-label">{def.label}</div>
      <div className="kpi-value" style={{ color: valColor, margin:"6px 0 4px" }}>{display}</div>
      <div className="kpi-sub">{def.sub}</div>
      <div className="kpi-icon" style={{ marginTop:10, background: iconBg, borderColor: iconBdr }}>
        <Icon size={13} color={accent} />
      </div>
    </div>
  );
}

function AlertBanner({ icon:Icon, color, bg, border, title, value }) {
  return (
    <button className="alert-banner" style={{ background:bg, borderColor:border }}>
      <div style={{ width:28, height:28, borderRadius:7, background:bg, border:`1px solid ${border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Icon size={13} color={color} />
      </div>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:11, fontWeight:700, color, margin:0 }}>{title}</p>
        <p style={{ fontSize:10, color, opacity:0.7, marginTop:1 }}>{value}</p>
      </div>
      <ArrowRight size={12} color={color} style={{ flexShrink:0 }} />
    </button>
  );
}

function PipelineCard({ status, count }) {
  const cfg = STATUS_CONFIG[status] || { label:status, icon:Package, color:"var(--ink-dim)", bg:"var(--parch-warm)", border:"var(--parch-line)" };
  const Icon = cfg.icon;
  return (
    <div className="pipeline-card" style={{ background:cfg.bg, borderColor:cfg.border }}>
      <Icon size={13} color={cfg.color} />
      <p style={{ fontFamily:"var(--font-serif)", fontSize:7.5, fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:cfg.color, marginTop:2 }}>{cfg.label}</p>
      <p style={{ fontSize:20, fontWeight:700, lineHeight:1, color:cfg.color, fontFamily:"var(--font-mono)" }}>{count}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()];
  if (!cfg) return <span style={{ fontSize:11, color:"var(--ink-dim)", textTransform:"capitalize" }}>{status || "—"}</span>;
  return (
    <span className="status-badge" style={{ background:cfg.bg, color:cfg.color, borderColor:cfg.border }}>
      {cfg.label}
    </span>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ borderRadius:10, padding:"10px 14px", background:"var(--parch-card)", border:"1px solid var(--parch-line)", boxShadow:"var(--shadow-md)", fontSize:11 }}>
      <p style={{ fontFamily:"var(--font-serif)", fontWeight:700, color:"var(--ink)", marginBottom:6 }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:p.color, display:"inline-block" }} />
          <span style={{ color:"var(--ink-faded)", textTransform:"capitalize" }}>{p.name}:</span>
          <span style={{ fontWeight:700, color:"var(--ink)", fontFamily:"var(--font-mono)" }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function BreakdownTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ borderRadius:10, padding:"10px 14px", background:"var(--parch-card)", border:"1px solid var(--parch-line)", boxShadow:"var(--shadow-md)", fontSize:11 }}>
      <p style={{ fontWeight:700, color:"var(--ink)", marginBottom:4 }}>{payload[0].name}</p>
      <p style={{ fontFamily:"var(--font-mono)", color:"var(--ink)" }}>{fmt(payload[0].value)}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */
export default function Dashboard() {
  const [timeFilter,    setTimeFilter]    = useState("30 Days");
  const [modeFilter,    setModeFilter]    = useState("All");
  const [refreshing,    setRefreshing]    = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [modalImg,      setModalImg]      = useState(null);
  const navigate = useNavigate();

  const [allOrders,      setAllOrders]      = useState([]);
  const [allRewards,     setAllRewards]     = useState([]);
  const [creditCards,    setCreditCards]    = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [giftCards,      setGiftCards]      = useState([]);
  const [invoices,       setInvoices]       = useState([]);
  const [damagedItems,   setDamagedItems]   = useState([]);
  const [shipments,      setShipments]      = useState([]);
  const [products,       setProducts]       = useState([]);

  const loadData = useCallback(async () => {
    const u = await base44.auth.me().catch(() => null);
    if (!u?.email) { setLoading(false); return; }
    const byUser = { created_by: u.email };
    const [orders, rewards, cards, inv, gc, invs, dmg, ships, prods] = await Promise.all([
      base44.entities.PurchaseOrder.filter(byUser),
      base44.entities.Reward.filter(byUser),
      base44.entities.CreditCard.filter(byUser),
      base44.entities.InventoryItem.filter(byUser).catch(() => []),
      base44.entities.GiftCard.filter(byUser).catch(() => []),
      base44.entities.Invoice.filter(byUser).catch(() => []),
      base44.entities.DamagedItem.filter(byUser).catch(() => []),
      base44.entities.Shipment.filter(byUser).catch(() => []),
      base44.entities.Product.list().catch(() => []),
    ]);
    setAllOrders(orders);   setAllRewards(rewards); setCreditCards(cards);
    setInventoryItems(inv); setGiftCards(gc);        setInvoices(invs);
    setDamagedItems(dmg);   setShipments(ships);     setProducts(prods);
    setLoading(false);
    setLastRefreshed(new Date());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const filteredOrders = useMemo(() => {
    const cutoff = getDateCutoff(timeFilter);
    return allOrders.filter(o => {
      const d = parseD(o.order_date || o.created_date);
      if (!d || d < cutoff) return false;
      if (modeFilter === "Churning" && o.order_type !== "churning")    return false;
      if (modeFilter === "Resell"   && o.order_type !== "marketplace") return false;
      return true;
    });
  }, [allOrders, timeFilter, modeFilter]);

  const filteredRewards = useMemo(() => {
    const cutoff = getDateCutoff(timeFilter);
    return allRewards.filter(r => { const d = parseD(r.date_earned); return d && d >= cutoff; });
  }, [allRewards, timeFilter]);

  const metrics = useMemo(() => {
    const totalCost     = filteredOrders.reduce((s,o) => s + parseFloat(o.final_cost||o.total_cost||0), 0);
    const saleRevenue   = filteredOrders.reduce((s,o) => s + (o.sale_events||[]).reduce((ss,ev) =>
      ss + (ev.items||[]).reduce((is,item) =>
        is + (parseFloat(item.sale_price)||0) * (parseInt(item.qty||item.quantity)||1), 0), 0), 0);
    const usdRewards    = filteredRewards.filter(r => r.currency === "USD");
    const cashback      = usdRewards.reduce((s,r) => s + (r.amount||0), 0);
    const yaCashback    = usdRewards
      .filter(r => r.notes?.match(/Young Adult|YACB|Prime Young Adult/i))
      .reduce((s,r) => s + (r.amount||0), 0);
    const points        = filteredRewards.filter(r => r.currency === "points").reduce((s,r) => s + (r.amount||0), 0);
    const netProfit     = saleRevenue - totalCost + cashback;
    const avgRoi        = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
    const inStockUnits  = inventoryItems
      .filter(i => i.status === "in_stock")
      .reduce((s,i) => s + (i.quantity||1), 0);
    const giftCardValue = giftCards
      .filter(gc => gc.status === "available")
      .reduce((s,gc) => s + parseFloat(gc.value||0), 0);
    return { totalCost, saleRevenue, cashback, yaCashback, points, netProfit, avgRoi, inStockUnits, giftCardValue };
  }, [filteredOrders, filteredRewards, inventoryItems, giftCards]);

  const trendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length:6 }, (_,i) => {
      const d      = new Date(now.getFullYear(), now.getMonth() - (5-i), 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const mO = allOrders.filter(o  => { const dd = parseD(o.order_date);  return dd && dd >= mStart && dd <= mEnd; });
      const mR = allRewards.filter(r => { const dd = parseD(r.date_earned); return dd && dd >= mStart && dd <= mEnd; });
      const spent    = mO.reduce((s,o) => s + parseFloat(o.total_cost||0), 0);
      const revenue  = mO.reduce((s,o) => s + (o.sale_events||[]).reduce((ss,ev) =>
        ss + (ev.items||[]).reduce((is,item) =>
          is + (parseFloat(item.sale_price)||0) * (parseInt(item.qty||item.quantity)||1), 0), 0), 0);
      const cashbackM = mR.filter(r => r.currency==="USD").reduce((s,r) => s+(r.amount||0), 0);
      return { month: d.toLocaleDateString("en-US",{month:"short"}), spent, revenue, profit: revenue-spent, cashback: cashbackM };
    });
  }, [allOrders, allRewards]);

  const statusCounts = useMemo(() => {
    const c = {};
    filteredOrders.forEach(o => { const s = o.status?.toLowerCase(); if (s) c[s] = (c[s]||0) + 1; });
    return c;
  }, [filteredOrders]);

  const byStatus = useMemo(() => Object.entries(statusCounts).map(([name,value]) => ({name,value})), [statusCounts]);

  const topCards = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const key = o.credit_card_id || o.card_name || "Unknown";
      if (!map[key]) {
        const c = creditCards.find(c => c.id === o.credit_card_id);
        map[key] = { name: c?.card_name || o.card_name || "Unknown", spent:0, orders:0 };
      }
      map[key].spent  += parseFloat(o.final_cost || o.total_cost || 0);
      map[key].orders += 1;
    });
    return Object.values(map).sort((a,b) => b.spent - a.spent).slice(0,5);
  }, [filteredOrders, creditCards]);

  const costBreakdown = useMemo(() => [
    { name:"Tax",      value: filteredOrders.reduce((s,o) => s + parseFloat(o.tax||0), 0) },
    { name:"Shipping", value: filteredOrders.reduce((s,o) => s + parseFloat(o.shipping_cost||0), 0) },
    { name:"Fees",     value: filteredOrders.reduce((s,o) => s + parseFloat(o.fees||0), 0) },
  ].filter(b => b.value > 0), [filteredOrders]);

  const transactions = useMemo(() => {
    return [...filteredOrders]
      .sort((a,b) => new Date(b.order_date||b.created_date) - new Date(a.order_date||a.created_date))
      .slice(0, 10)
      .map(o => {
        const revenue = (o.sale_events||[]).reduce((s,ev) =>
          s + (ev.items||[]).reduce((is,item) =>
            is + (parseFloat(item.sale_price)||0) * (parseInt(item.qty||item.quantity)||1), 0), 0);
        const orderCashback = (allRewards||[])
          .filter(r => r.purchase_order_id === o.id && r.currency === 'USD')
          .reduce((s,r) => s + (parseFloat(r.amount)||0), 0);
        const profit = o.sale_events?.length
          ? revenue - parseFloat(o.final_cost||o.total_cost||0) + orderCashback
          : null;
        const firstItem = o.items?.[0];
        // Look up product image from catalog if not on the order item directly
        const catalogProduct = firstItem?.product_id
          ? products.find(p => p.id === firstItem.product_id)
          : products.find(p => p.name && firstItem?.product_name &&
              p.name.toLowerCase() === firstItem.product_name.toLowerCase());
        const productImageUrl =
          firstItem?.product_image ||
          firstItem?.image ||
          catalogProduct?.image ||
          null;
        return {
          id:              o.id,
          productName:     o.product_name || firstItem?.product_name || "—",
          platform:        o.retailer || "—",
          salePlatform:    o.marketplace_platform || o.sale_events?.[0]?.platform || "—",
          totalPrice:      parseFloat(o.final_cost || o.total_cost || 0),
          salePrice:       revenue || null,
          cashbackAmount:  parseFloat(o.cashback_amount || 0),
          profit,
          status:          o.status,
          transactionDate: o.order_date || o.created_date,
          productImageUrl,
        };
      });
  }, [filteredOrders, allRewards, products]);

  const today = new Date().toISOString().slice(0,10);
  const alerts = useMemo(() => ({
    overdueInvoices: invoices.filter(inv =>
      inv.status==="overdue" || (inv.status==="sent" && inv.due_date && inv.due_date < today)
    ).length,
    damagedItems: damagedItems.filter(d => d.status==="reported" || d.status==="assessed").length,
    inTransit:    shipments.filter(s => !s.delivered_date && s.status && !s.status.toLowerCase().includes("delivered")).length,
  }), [invoices, damagedItems, shipments]);

  const activeAlerts = [
    alerts.overdueInvoices > 0 && { icon:FileWarning,  color:"var(--crimson)", bg:"var(--crimson-bg)", border:"var(--crimson-bdr)", title:`${alerts.overdueInvoices} Overdue Invoice${alerts.overdueInvoices>1?"s":""}`, value:"Action required"     },
    alerts.damagedItems > 0    && { icon:AlertTriangle, color:"var(--gold)",   bg:"var(--gold-bg)",    border:"var(--gold-bdr)",    title:`${alerts.damagedItems} Damaged Item${alerts.damagedItems>1?"s":""}`,           value:"Needs assessment"   },
    alerts.inTransit > 0       && { icon:Truck,         color:"var(--ocean)",  bg:"var(--ocean-bg)",   border:"var(--ocean-bdr)",   title:`${alerts.inTransit} Shipment${alerts.inTransit>1?"s":""} In Transit`,          value:"Packages on the way"},
  ].filter(Boolean);

  const timeSince = () => {
    const s = Math.floor((Date.now() - lastRefreshed) / 1000);
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s/60)}m ago`;
  };

  if (loading) {
    return (
      <div style={{ padding:40, textAlign:"center", color:"var(--ink-ghost)", fontSize:13 }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{ maxWidth:1340, margin:"0 auto", padding:"16px 16px 40px", background:"var(--parch)" }}>

      {/* ── Header ── */}
      <div className="dash-header">
        <div>
          <h1 className="page-title">
            {greeting()}, Explorer
            {refreshing && <RefreshCw size={14} className="spin" style={{ display:"inline", marginLeft:8, color:"var(--ink-dim)", verticalAlign:"middle" }} />}
          </h1>
          <p style={{ fontSize:11, color:"var(--ink-dim)", marginTop:4, letterSpacing:"0.03em" }}>
            {new Date().toLocaleDateString("en-US",{ month:"long", day:"numeric", year:"numeric" })}
            <span style={{ margin:"0 6px", borderLeft:"1px solid var(--ink-ghost)" }} />
            Updated {timeSince()}
          </p>
        </div>
        <div className="dash-filter-row">
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
            <div className="tab-bar">
              {MODE_FILTERS.map(m => (
                <button key={m} className={`tab-btn${modeFilter===m?" active":""}`} onClick={() => setModeFilter(m)}>{m}</button>
              ))}
            </div>
            <select
              value={timeFilter}
              onChange={e => setTimeFilter(e.target.value)}
              style={{ display:"none" }}
              className="mobile-time-select"
            >
              {TIME_FILTERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="tab-bar dash-time-bar">
              {TIME_FILTERS.map(t => (
                <button key={t} className={`tab-btn${timeFilter===t?" active":""}`} onClick={() => setTimeFilter(t)}>{t}</button>
              ))}
            </div>
          </div>
          <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Alerts ── */}
      {activeAlerts.length > 0 && (
        <div className="grid-alerts" style={{ '--alert-count': activeAlerts.length, marginBottom:12 }}>
          {activeAlerts.map((a,i) => <AlertBanner key={i} {...a} />)}
        </div>
      )}

      {/* ── KPIs ── */}
      <SectionDivider title="Performance" />
      <div className="grid-kpi" style={{ marginBottom:8 }}>
        {KPI_DEFS.slice(0,4).map(def => <KpiCard key={def.key} def={def} metrics={metrics} />)}
      </div>
      <div className="grid-kpi" style={{ marginBottom:16 }}>
        {KPI_DEFS.slice(4).map(def => <KpiCard key={def.key} def={def} metrics={metrics} />)}
      </div>

      {/* ── Pipeline ── */}
      <SectionDivider title="Route Map" dotColor="var(--ocean)" lineColor="rgba(42,92,122,0.25)" />
      <div className="card" style={{ padding:"12px 14px", marginBottom:16 }}>
        <p style={{ fontFamily:"var(--font-serif)", fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ink-dim)", marginBottom:10 }}>
          Order Pipeline · {filteredOrders.length} Total
        </p>
        <div className="grid-pipeline" style={{ position:"relative" }}>
          <div style={{ position:"absolute", top:"50%", left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,rgba(160,114,42,0.2) 10%,rgba(160,114,42,0.2) 90%,transparent)", pointerEvents:"none" }} />
          {Object.keys(STATUS_CONFIG).map(s => <PipelineCard key={s} status={s} count={statusCounts[s]||0} />)}
        </div>
      </div>

      {/* ── Charts ── */}
      <SectionDivider title="Cartographic Trends" />
      <div className="grid-charts" style={{ marginBottom:16 }}>

        {/* Area chart — 6-month trend */}
        <div className="card" style={{ padding:"12px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <p style={{ fontFamily:"var(--font-serif)", fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ink-dim)" }}>
              Profit & Revenue — 6 Months
            </p>
            <span style={{ fontSize:8, background:"var(--gold-bg)", border:"1px solid var(--gold-bdr)", padding:"2px 8px", borderRadius:99, color:"var(--gold)", fontWeight:700 }}>Monthly</span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={trendData} margin={{ top:4, right:4, left:0, bottom:0 }}>
              <defs>
                {[["gRevenue","#A0722A"],["gProfit","#4a7a35"],["gSpent","#2a5c7a"],["gCash","#5a3a6e"]].map(([id,c]) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={c} stopOpacity={0.18}/>
                    <stop offset="95%" stopColor={c} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,185,168,0.4)" />
              <XAxis dataKey="month" tick={{ fontSize:10, fill:"var(--ink-ghost)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:10, fill:"var(--ink-ghost)", fontFamily:"var(--font-mono)" }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+"k":v}`} />
              <Tooltip content={<ChartTooltip />} />
              {[["revenue","#A0722A","gRevenue"],["profit","#4a7a35","gProfit"],["spent","#2a5c7a","gSpent"],["cashback","#5a3a6e","gCash"]].map(([key,c,g]) => (
                <Area key={key} type="monotone" dataKey={key} stroke={c} fill={`url(#${g})`} strokeWidth={2} name={key.charAt(0).toUpperCase()+key.slice(1)} dot={{ r:3, fill:c }} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:10 }}>
            {[["#A0722A","Revenue"],["#4a7a35","Profit"],["#2a5c7a","Spent"],["#5a3a6e","Cashback"]].map(([c,l]) => (
              <div key={l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"var(--ink-faded)" }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:c, display:"inline-block" }} />
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="grid-charts-right">

          {/* By Status donut */}
          <div className="card" style={{ padding:"12px 14px", flex:1 }}>
            <p style={{ fontFamily:"var(--font-serif)", fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ink-dim)", marginBottom:10 }}>By Status</p>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <ResponsiveContainer width={72} height={72}>
                <PieChart>
                  <Pie data={byStatus} cx="50%" cy="50%" innerRadius={20} outerRadius={34} paddingAngle={3} dataKey="value">
                    {byStatus.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:3 }}>
                {byStatus.slice(0,5).map((d,i) => (
                  <div key={d.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ width:7, height:7, borderRadius:"50%", background:PIE_COLORS[i%PIE_COLORS.length], display:"inline-block" }} />
                      <span style={{ color:"var(--ink-faded)", textTransform:"capitalize", fontSize:9 }}>{d.name.replace(/_/g," ")}</span>
                    </div>
                    <span style={{ fontWeight:700, color:"var(--ink)", fontFamily:"var(--font-mono)" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="card" style={{ padding:"12px 14px", flex:1 }}>
            <p style={{ fontFamily:"var(--font-serif)", fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ink-dim)", marginBottom:10 }}>Cost Breakdown</p>
            <ResponsiveContainer width="100%" height={76}>
              <BarChart data={costBreakdown} layout="vertical" margin={{ top:0, right:0, left:0, bottom:0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:"var(--ink-ghost)" }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<BreakdownTooltip />} />
                <Bar dataKey="value" radius={[0,5,5,0]}>
                  {costBreakdown.map((_,i) => <Cell key={i} fill={["#ef4444","#60a5fa","#8b5cf6"][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Cards */}
          <div className="card" style={{ padding:"12px 14px", flex:1 }}>
            <p style={{ fontFamily:"var(--font-serif)", fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ink-dim)", marginBottom:10 }}>Top Cards</p>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {topCards.map((card,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <CardLogo cardName={card.name} size={24} />
                    <div>
                      <p style={{ fontSize:11, fontWeight:600, color:"var(--ink)" }}>{card.name}</p>
                      <p style={{ fontSize:9, color:"var(--ink-dim)" }}>{card.orders} txns</p>
                    </div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:"var(--gold)", fontFamily:"var(--font-mono)" }}>{abbrev(card.spent)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Transactions Table ── */}
      <SectionDivider title="Recent Expeditions" dotColor="var(--terrain)" lineColor="rgba(74,122,53,0.25)" />
      <div className="card" style={{ overflow:"hidden" }}>
        <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--parch-line)", background:"var(--parch-warm)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontFamily:"var(--font-serif)", fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ink-dim)" }}>
            Recent Transactions
          </span>
          <button onClick={() => navigate("/Transactions")} style={{ fontSize:10, color:"var(--gold)", fontWeight:700, background:"none", border:"none", cursor:"pointer", letterSpacing:"0.04em" }}>
            View all →
          </button>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table className="dash-table" style={{ minWidth:800 }}>
            <thead>
              <tr>
                {["","Product","Platform","Buyer","Cost","Sale","Cashback","Profit","Status","Date"].map((h,i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => {
                const p = t.profit;
                return (
                  <tr key={t.id}>
                    <td style={{ padding:"10px 14px" }}>
                      <div
                        onClick={() => t.productImageUrl && setModalImg({ src:t.productImageUrl, alt:t.productName })}
                        style={{ width:32, height:32, borderRadius:8, background:"var(--parch-warm)", border:"1px solid var(--parch-line)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", cursor:t.productImageUrl?"pointer":"default" }}
                      >
                        {t.productImageUrl
                          ? <img src={t.productImageUrl} alt={t.productName} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                          : <ImageOff size={13} color="var(--ink-ghost)" />
                        }
                      </div>
                    </td>
                    <td style={{ maxWidth:180 }}>
                      <span style={{ display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:600, color:"var(--ink)", fontSize:12 }}>{t.productName}</span>
                    </td>
                    <td style={{ padding:"10px 8px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <RetailerLogo retailer={t.platform} size={20} />
                        <span style={{ color:"var(--ink-faded)", fontSize:11, whiteSpace:"nowrap" }}>{t.platform}</span>
                      </div>
                    </td>
                    <td style={{ color:"var(--ink-faded)", fontSize:11, whiteSpace:"nowrap" }}>{t.salePlatform || "—"}</td>
                    <td style={{ fontWeight:600, color:"var(--ocean)", fontSize:12, whiteSpace:"nowrap", fontFamily:"var(--font-mono)" }}>{fmt(t.totalPrice)}</td>
                    <td style={{ fontWeight:600, color:"var(--terrain)", fontSize:12, whiteSpace:"nowrap", fontFamily:"var(--font-mono)" }}>{t.salePrice ? fmt(t.salePrice) : "—"}</td>
                    <td style={{ fontWeight:600, color:"var(--violet)", fontSize:12, whiteSpace:"nowrap", fontFamily:"var(--font-mono)" }}>{fmt(t.cashbackAmount)}</td>
                    <td style={{ fontWeight:700, fontSize:12, whiteSpace:"nowrap", fontFamily:"var(--font-mono)", color: p==null?"var(--ink-ghost)": p>=0?"var(--gold)":"var(--crimson)" }}>
                      {p==null ? "—" : `${p>=0?"+":""}${fmt(p)}`}
                    </td>
                    <td><StatusBadge status={t.status} /></td>
                    <td style={{ fontSize:11, color:"var(--ink-ghost)", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}>{fmtDate(t.transactionDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Image Modal ── */}
      {modalImg && (
        <div onClick={() => setModalImg(null)} style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(26,22,18,0.65)" }}>
          <div onClick={e => e.stopPropagation()} style={{ position:"relative", maxWidth:480, width:"100%", margin:"0 16px" }}>
            <button onClick={() => setModalImg(null)} style={{ position:"absolute", top:-12, right:-12, zIndex:10, width:28, height:28, borderRadius:"50%", background:"var(--parch-card)", border:"1px solid var(--parch-line)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <X size={13} color="var(--ink)" />
            </button>
            <img src={modalImg.src} alt={modalImg.alt} style={{ width:"100%", borderRadius:16, objectFit:"contain", maxHeight:"80vh", background:"white" }} />
          </div>
        </div>
      )}

    </div>
  );
}