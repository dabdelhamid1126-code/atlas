import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, TrendingUp, CreditCard, Percent, ShoppingBag, Send,
  Package, CheckCircle, X, ImageOff, AlertTriangle, Truck, Activity,
  Gift, Boxes, FileWarning, Clock, ArrowRight, RefreshCw, Info,
  ChevronDown, ChevronUp, Star, BarChart2
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

/* ─────────────────────────────────────────────
   THEME / TOKENS
───────────────────────────────────────────── */
const CSS = `
  :root {
    --font-serif: ui-sans-serif, system-ui, -apple-system, sans-serif;
    --font-sans:  ui-sans-serif, system-ui, -apple-system, sans-serif;
    --font-mono:  ui-monospace, 'SF Mono', 'Consolas', monospace;

    /* ── Neutral Elegance palette ── */
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
    --r-sm: 8px; --r-md: 12px; --r-lg: 12px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body, #root {
    background: var(--parch);
    font-family: var(--font-sans);
    color: var(--ink);
    font-size: 13px;
    line-height: 1.5;
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--parch-line); border-radius: 99px; }

  /* ── Tab bar ── */
  .tab-bar {
    display: flex;
    gap: 2px;
    background: var(--parch-warm);
    border: 1px solid var(--parch-line);
    border-radius: var(--r-sm);
    padding: 3px;
  }
  .tab-btn {
    padding: 5px 13px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    font-family: var(--font-sans);
    cursor: pointer;
    border: none;
    background: transparent;
    color: var(--ink-faded);
    transition: background 0.15s, color 0.15s;
    letter-spacing: 0.02em;
  }
  .tab-btn.active {
    background: var(--ink);
    color: var(--ne-cream);
  }
  .tab-btn:hover:not(.active) { background: rgba(61,43,26,0.06); }

  /* ── Card ── */
  .card {
    background: var(--parch-card);
    border: 1px solid var(--parch-line);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-sm);
  }
  .card-hover {
    background: var(--parch-card);
    border: 1px solid var(--parch-line);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-sm);
    transition: box-shadow 0.2s, border-color 0.2s;
  }
  .card-hover:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--gold-bdr);
  }

  /* ── KPI card ── */
  .kpi-card {
    padding: 14px;
    border-radius: var(--r-lg);
    background: var(--parch-card);
    border: 1px solid var(--parch-line);
    border-top-width: 3px;
    position: relative;
    overflow: hidden;
    transition: box-shadow 0.2s;
    box-shadow: var(--shadow-sm);
  }
  .kpi-card:hover { box-shadow: var(--shadow-md); }
  .kpi-label {
    font-family: var(--font-serif);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-faded);
    margin-bottom: 6px;
  }
  .kpi-value {
    font-size: 20px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.5px;
    font-family: var(--font-mono);
  }
  .kpi-sub {
    font-size: 10px;
    color: var(--ink-ghost);
    margin-top: 5px;
  }
  .kpi-icon {
    position: absolute;
    top: 14px; right: 14px;
    width: 30px; height: 30px;
    border-radius: var(--r-sm);
    display: flex; align-items: center; justify-content: center;
    background: var(--parch-warm);
    border: 1px solid var(--parch-line);
  }

  /* ── Section divider ── */
  .section-div {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 12px; margin-top: 4px;
  }
  .section-div-dot {
    width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
  }
  .section-div-label {
    font-family: var(--font-serif);
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--gold); white-space: nowrap;
  }
  .section-div-line {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, rgba(160,114,42,0.28), rgba(160,114,42,0.06), transparent);
  }

  /* ── Table ── */
  .dash-table { width: 100%; border-collapse: collapse; }
  .dash-table thead tr { background: var(--parch-warm); }
  .dash-table th {
    padding: 10px 14px;
    text-align: left;
    font-family: var(--font-serif);
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: var(--ink-faded);
    white-space: nowrap;
  }
  .dash-table td {
    padding: 11px 14px;
    border-top: 1px solid var(--parch-line);
    font-size: 12px;
    color: var(--ink);
  }
  .dash-table tbody tr { transition: background 0.12s; }
  .dash-table tbody tr:hover { background: rgba(160,114,42,0.03); }

  /* ── Status badge ── */
  .status-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 99px;
    font-size: 9px; font-weight: 700;
    letter-spacing: 0.07em; text-transform: uppercase;
    white-space: nowrap; border: 1px solid;
  }

  /* ── Alert banner ── */
  .alert-banner {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 14px; border-radius: var(--r-md);
    cursor: pointer; border: 1px solid; width: 100%; text-align: left;
    transition: opacity 0.15s;
    font-family: var(--font-sans);
  }
  .alert-banner:hover { opacity: 0.85; }

  /* ── Pipeline card ── */
  .pipeline-card {
    border-radius: var(--r-md); padding: 12px 6px;
    text-align: center; display: flex; flex-direction: column;
    align-items: center; gap: 4px; cursor: pointer;
    border: 1px solid; transition: transform 0.15s, box-shadow 0.15s;
  }
  .pipeline-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

  /* ── Refresh btn ── */
  .refresh-btn {
    padding: 7px 16px; border-radius: var(--r-sm);
    background: var(--ink); color: var(--ne-cream);
    font-size: 11px; font-weight: 700; cursor: pointer; border: none;
    font-family: var(--font-serif); letter-spacing: 0.04em;
    transition: opacity 0.15s;
  }
  .refresh-btn:hover { opacity: 0.85; }
  .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Breakdown box ── */
  .breakdown-box {
    border-radius: var(--r-md); padding: 14px;
  }
  .breakdown-label {
    font-family: var(--font-serif);
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    margin-bottom: 4px;
  }
  .breakdown-value {
    font-size: 20px; font-weight: 600; line-height: 1;
    font-family: var(--font-mono);
  }

  /* ── Spin ── */
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 1s linear infinite; }

  /* ── Fade in ── */
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp 0.35s ease both; }
`;

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

const KPI_DEFS = [
  { key:"totalCost",     label:"Total Cost",      icon:CreditCard,  accentVar:"--ocean",   valueVar:"--ocean"   },
  { key:"saleRevenue",   label:"Sale Revenue",    icon:TrendingUp,  accentVar:"--terrain", valueVar:"--terrain" },
  { key:"cashback",      label:"Cashback",        icon:Percent,     accentVar:"--violet",  valueVar:"--violet"  },
  { key:"netProfit",     label:"Net Profit",      icon:DollarSign,  accentVar:null,        valueVar:null        },
  { key:"yaCashback",    label:"YA Cashback",     icon:Star,        accentVar:"--gold",    valueVar:"--gold"    },
  { key:"avgRoi",        label:"Avg ROI",         icon:BarChart2,   accentVar:"--ocean",   valueVar:null        },
  { key:"inStockUnits",  label:"Units In Stock",  icon:Boxes,       accentVar:"--terrain", valueVar:"--terrain" },
  { key:"giftCardValue", label:"Gift Card Value", icon:Gift,        accentVar:"--rose",    valueVar:"--rose"    },
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
function cssVar(name) {
  if (!name) return undefined;
  return `var(${name})`;
}

/* ─────────────────────────────────────────────
   MOCK DATA  (replace with real base44 calls)
───────────────────────────────────────────── */
const MOCK_METRICS = {
  totalCost:     42380, saleRevenue: 61200, cashback: 3840,
  netProfit:     22660, avgRoi:      53.5,  yaCashback: 1200,
  inStockUnits:  148,   giftCardValue: 560, points: 12400,
};
const MOCK_TREND = [
  { month:"Nov", revenue:9200,  profit:3100, spent:7400, cashback:480 },
  { month:"Dec", revenue:14800, profit:5200, spent:10600,cashback:720 },
  { month:"Jan", revenue:8900,  profit:2800, spent:7200, cashback:310 },
  { month:"Feb", revenue:11400, profit:4100, spent:8600, cashback:550 },
  { month:"Mar", revenue:9700,  profit:3400, spent:7500, cashback:420 },
  { month:"Apr", revenue:7200,  profit:4060, spent:8880, cashback:360 },
];
const MOCK_BY_STATUS = [
  { name:"ordered",   value:14 },
  { name:"shipped",   value:8  },
  { name:"received",  value:21 },
  { name:"completed", value:37 },
  { name:"pending",   value:5  },
];
const MOCK_TOP_CARDS = [
  { name:"Amex Gold",    spent:18400, orders:34 },
  { name:"Chase Sapph.", spent:12100, orders:22 },
  { name:"Citi Double",  spent:7200,  orders:15 },
  { name:"Cap One VX",   spent:3100,  orders:8  },
  { name:"Discover It",  spent:1580,  orders:4  },
];
const MOCK_COST_BREAKDOWN = [
  { name:"Fees",     value:1840 },
  { name:"Shipping", value:2310 },
  { name:"Tax",      value:3120 },
];
const MOCK_TRANSACTIONS = [
  { id:1, productName:"Sony WH-1000XM5 Headphones",    platform:"Amazon",   salePlatform:"eBay",    totalPrice:248, salePrice:310, cashbackAmount:12.4,  profit:74,   status:"completed", transactionDate:"2024-04-08", productImageUrl:null },
  { id:2, productName:"Apple AirPods Pro 2nd Gen",     platform:"BestBuy",  salePlatform:"StockX",  totalPrice:189, salePrice:229, cashbackAmount:9.45,  profit:49,   status:"shipped",   transactionDate:"2024-04-07", productImageUrl:null },
  { id:3, productName:"Dyson V15 Detect Vacuum",       platform:"Costco",   salePlatform:"—",       totalPrice:499, salePrice:null,cashbackAmount:24.95, profit:null, status:"received",  transactionDate:"2024-04-06", productImageUrl:null },
  { id:4, productName:"Nintendo Switch OLED Bundle",   platform:"Target",   salePlatform:"Facebook",totalPrice:349, salePrice:410, cashbackAmount:17.45, profit:78,   status:"completed", transactionDate:"2024-04-05", productImageUrl:null },
  { id:5, productName:"Instant Pot Duo 7-in-1",        platform:"Walmart",  salePlatform:"Mercari", totalPrice:79,  salePrice:95,  cashbackAmount:3.95,  profit:20,   status:"paid",      transactionDate:"2024-04-04", productImageUrl:null },
  { id:6, productName:"LEGO Star Wars Millennium Fal.", platform:"Amazon",   salePlatform:"—",       totalPrice:699, salePrice:null,cashbackAmount:34.95, profit:null, status:"ordered",   transactionDate:"2024-04-03", productImageUrl:null },
  { id:7, productName:"KitchenAid Stand Mixer 5Qt",    platform:"Williams", salePlatform:"eBay",    totalPrice:329, salePrice:389, cashbackAmount:16.45, profit:76,   status:"completed", transactionDate:"2024-04-02", productImageUrl:null },
  { id:8, productName:"Canon EOS R50 Mirrorless Kit",  platform:"BestBuy",  salePlatform:"—",       totalPrice:879, salePrice:null,cashbackAmount:43.95, profit:null, status:"pending",   transactionDate:"2024-04-01", productImageUrl:null },
];
const MOCK_ALERTS = { overdueInvoices:2, damagedItems:1, inTransit:4 };
const STATUS_COUNTS = { pending:5, ordered:14, shipped:8, received:21, partially_received:3, paid:6, completed:37, cancelled:2 };

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */
function SectionDivider({ title, dotColor="var(--gold)", lineColor="rgba(184,134,11,0.25)" }) {
  return (
    <div className="section-div">
      <div className="section-div-dot" style={{ background: dotColor }} />
      <span className="section-div-label" style={{ color: dotColor }}>{title}</span>
      <div className="section-div-line" style={{ background:`linear-gradient(90deg,${lineColor},rgba(184,134,11,0.06),transparent)` }} />
    </div>
  );
}

function KpiCard({ def, metrics }) {
  const raw    = metrics[def.key];
  const isProfit = def.key === "netProfit";
  const isRoi    = def.key === "avgRoi";
  const accent = isProfit
    ? raw >= 0 ? "var(--gold)" : "var(--crimson)"
    : cssVar(def.accentVar) || "var(--parch-line)";
  const valColor = isProfit
    ? raw >= 0 ? "var(--gold)" : "var(--crimson)"
    : isRoi
      ? raw >= 0 ? "var(--ocean)" : "var(--crimson)"
      : cssVar(def.valueVar) || "var(--ink)";
  const display = isRoi ? `${raw.toFixed(1)}%`
    : def.key === "inStockUnits" || def.key === "points" ? raw.toLocaleString()
    : abbrev(raw);
  const Icon = def.icon;
  return (
    <div className="kpi-card fade-up" style={{ borderTopColor: accent }}>
      <div className="kpi-label">{def.label}</div>
      <div className="kpi-value" style={{ color: valColor }}>{display}</div>
      <div className="kpi-icon">
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
  const [timeFilter, setTimeFilter] = useState("30 Days");
  const [modeFilter, setModeFilter] = useState("All");
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [modalImg, setModalImg]           = useState(null);

  const metrics      = MOCK_METRICS;
  const trendData    = MOCK_TREND;
  const byStatus     = MOCK_BY_STATUS;
  const topCards     = MOCK_TOP_CARDS;
  const costBreakdown= MOCK_COST_BREAKDOWN;
  const transactions = MOCK_TRANSACTIONS;
  const alerts       = MOCK_ALERTS;
  const statusCounts = STATUS_COUNTS;
  const totalOrders  = Object.values(statusCounts).reduce((a,b)=>a+b,0);

  const activeAlerts = [
    alerts.overdueInvoices > 0 && { icon:FileWarning, color:"var(--crimson)", bg:"var(--crimson-bg)", border:"var(--crimson-bdr)", title:`${alerts.overdueInvoices} Overdue Invoice${alerts.overdueInvoices>1?"s":""}`, value:"Action required" },
    alerts.damagedItems > 0    && { icon:AlertTriangle,color:"var(--gold)",   bg:"var(--gold-bg)",    border:"var(--gold-bdr)",    title:`${alerts.damagedItems} Damaged Item${alerts.damagedItems>1?"s":""}`,   value:"Needs assessment" },
    alerts.inTransit > 0       && { icon:Truck,        color:"var(--ocean)",  bg:"var(--ocean-bg)",   border:"var(--ocean-bdr)",   title:`${alerts.inTransit} Shipment${alerts.inTransit>1?"s":""} In Transit`, value:"Packages on the way" },
  ].filter(Boolean);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); setLastRefreshed(new Date()); }, 900);
  }, []);

  const timeSince = () => {
    const s = Math.floor((Date.now() - lastRefreshed)/1000);
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s/60)}m ago`;
  };

  return (
    <>
      <style>{CSS}</style>

      <div style={{ maxWidth:1340, margin:"0 auto", padding:"16px 16px 40px", background:"var(--parch)" }}>

        {/* ── Header ── */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
          <div>
            <h1 style={{ fontFamily:"var(--font-serif)", fontSize:24, fontWeight:900, color:"var(--ink)", letterSpacing:"-0.3px", lineHeight:1.1 }}>
              {greeting()}, Explorer
              {refreshing && <RefreshCw size={14} className="spin" style={{ display:"inline", marginLeft:8, color:"var(--ink-dim)", verticalAlign:"middle" }} />}
            </h1>
            <p style={{ fontSize:11, color:"var(--ink-dim)", marginTop:4, letterSpacing:"0.03em", fontFamily:"var(--font-sans)" }}>
              {new Date().toLocaleDateString("en-US",{ month:"long", day:"numeric", year:"numeric" })}
              <span style={{ margin:"0 6px", color:"var(--parch-line)", borderLeft:"1px solid var(--ink-ghost)" }} />
              Updated {timeSince()}
            </p>
          </div>

          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
            <div className="tab-bar">
              {MODE_FILTERS.map(m => (
                <button key={m} className={`tab-btn${modeFilter===m?" active":""}`} onClick={() => setModeFilter(m)}>{m}</button>
              ))}
            </div>
            <div className="tab-bar">
              {TIME_FILTERS.map(t => (
                <button key={t} className={`tab-btn${timeFilter===t?" active":""}`} onClick={() => setTimeFilter(t)}>{t}</button>
              ))}
            </div>
            <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* ── Alerts ── */}
        {activeAlerts.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:`repeat(${activeAlerts.length},1fr)`, gap:6, marginBottom:12 }}>
            {activeAlerts.map((a,i) => <AlertBanner key={i} {...a} />)}
          </div>
        )}

        {/* ── KPIs Row 1 ── */}
        <SectionDivider title="Performance" />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:8 }}>
          {KPI_DEFS.slice(0,4).map(def => <KpiCard key={def.key} def={def} metrics={metrics} />)}
        </div>

        {/* ── KPIs Row 2 ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
          {KPI_DEFS.slice(4).map(def => <KpiCard key={def.key} def={def} metrics={metrics} />)}
        </div>

        {/* ── Profit Breakdown ── */}
        <div className="card" style={{ marginBottom:12, overflow:"hidden" }}>
          <button
            onClick={() => setShowBreakdown(p=>!p)}
            style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:"var(--parch-warm)", borderBottom: showBreakdown ? "1px solid var(--parch-line)" : "none", cursor:"pointer", border:"none", fontFamily:"var(--font-sans)" }}
          >
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Info size={13} color="var(--gold)" />
              <span style={{ fontFamily:"var(--font-serif)", fontSize:11, fontWeight:700, color:"var(--ink)" }}>Profit Breakdown</span>
              <span style={{ fontSize:9, fontWeight:700, padding:"2px 9px", borderRadius:99, background:"var(--gold-bg)", color:"var(--gold)", border:"1px solid var(--gold-bdr)" }}>Accounting Mode</span>
            </div>
            {showBreakdown ? <ChevronUp size={13} color="var(--ink-dim)" /> : <ChevronDown size={13} color="var(--ink-dim)" />}
          </button>
          {showBreakdown && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, padding:"10px 14px" }}>
              {[
                { label:"Revenue",    value:abbrev(metrics.saleRevenue), color:"var(--terrain)", bg:"var(--terrain-bg)", border:"var(--terrain-bdr)", prefix:"" },
                { label:"Card Spend", value:abbrev(metrics.totalCost),   color:"var(--crimson)", bg:"var(--crimson-bg)", border:"var(--crimson-bdr)", prefix:"−" },
                { label:"Cashback",   value:abbrev(metrics.cashback),    color:"var(--violet)",  bg:"var(--violet-bg)",  border:"var(--violet-bdr)",  prefix:"+" },
                { label:"Net Profit", value:abbrev(metrics.netProfit),   color: metrics.netProfit>=0?"var(--gold)":"var(--crimson)", bg:metrics.netProfit>=0?"var(--gold-bg)":"var(--crimson-bg)", border:metrics.netProfit>=0?"var(--gold-bdr)":"var(--crimson-bdr)", prefix:"" },
              ].map(b => (
                <div key={b.label} className="breakdown-box" style={{ background:b.bg, border:`1px solid ${b.border}` }}>
                  <div className="breakdown-label" style={{ color:b.color }}>{b.label}</div>
                  <div className="breakdown-value" style={{ color:b.color }}>{b.prefix}{b.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Pipeline ── */}
        <SectionDivider title="Route Map" dotColor="var(--ocean)" lineColor="rgba(26,82,118,0.25)" />
        <div className="card" style={{ padding:"12px 14px", marginBottom:12 }}>
          <p style={{ fontFamily:"var(--font-serif)", fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ink-dim)", marginBottom:10 }}>
            Order Pipeline · {totalOrders} Total
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:5, position:"relative" }}>
            <div style={{ position:"absolute", top:"50%", left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,rgba(184,134,11,0.2) 10%,rgba(184,134,11,0.2) 90%,transparent)", pointerEvents:"none" }} />
            {Object.keys(STATUS_CONFIG).map(s => <PipelineCard key={s} status={s} count={statusCounts[s]||0} />)}
          </div>
        </div>

        {/* ── Charts ── */}
        <SectionDivider title="Cartographic Trends" />
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:8, marginBottom:12 }}>

          {/* Area chart */}
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
                <XAxis dataKey="month" tick={{ fontSize:10, fill:"var(--ink-ghost)", fontFamily:"var(--font-sans)" }} axisLine={false} tickLine={false} />
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
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>

            {/* By Status donut */}
            <div className="card" style={{ padding:"12px 14px", flex:1 }}>
              <p style={{ fontFamily:"var(--font-serif)", fontSize:11, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ink-dim)", marginBottom:10 }}>By Status</p>
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

            {/* Cost breakdown horizontal bar */}
            <div className="card" style={{ padding:18, flex:1 }}>
              <p style={{ fontFamily:"var(--font-serif)", fontSize:11, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ink-dim)", marginBottom:10 }}>Cost Breakdown</p>
              <ResponsiveContainer width="100%" height={76}>
                <BarChart data={costBreakdown} layout="vertical" margin={{ top:0, right:0, left:0, bottom:0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:"var(--ink-ghost)", fontFamily:"var(--font-sans)" }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<BreakdownTooltip />} />
                  <Bar dataKey="value" radius={[0,5,5,0]}>
                    {costBreakdown.map((_,i) => <Cell key={i} fill={["#ef4444","#60a5fa","#8b5cf6"][i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Cards */}
            <div className="card" style={{ padding:18, flex:1 }}>
              <p style={{ fontFamily:"var(--font-serif)", fontSize:11, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ink-dim)", marginBottom:10 }}>Top Cards</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {topCards.map((card,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:24, height:24, borderRadius:6, background:"var(--gold-bg)", border:"1px solid var(--gold-bdr)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:700, color:"var(--gold)", fontFamily:"var(--font-serif)" }}>
                        {card.name.slice(0,2).toUpperCase()}
                      </div>
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
        <SectionDivider title="Recent Expeditions" dotColor="var(--terrain)" lineColor="rgba(45,90,39,0.25)" />
        <div className="card" style={{ overflow:"hidden" }}>
          <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--parch-line)", background:"var(--parch-warm)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontFamily:"var(--font-serif)", fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ink-dim)" }}>
              Recent Transactions
            </div>
            <button style={{ fontSize:10, color:"var(--gold)", fontWeight:700, background:"none", border:"none", cursor:"pointer", letterSpacing:"0.04em", fontFamily:"var(--font-sans)" }}>
              View all →
            </button>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table className="dash-table">
              <thead>
                <tr>
                  {["","Product","Platform","Buyer","Cost","Sale","Cashback","Profit","Status","Date"].map((h,i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => {
                  const profit = t.profit;
                  return (
                    <tr key={t.id}>
                      {/* Thumbnail */}
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
                      {/* Product */}
                      <td style={{ maxWidth:180 }}>
                        <span style={{ display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:600, color:"var(--ink)", fontSize:12 }}>{t.productName}</span>
                      </td>
                      {/* Platform */}
                      <td style={{ color:"var(--ink-faded)", fontSize:12, whiteSpace:"nowrap" }}>{t.platform}</td>
                      {/* Buyer / sale platform */}
                      <td style={{ color:"var(--ink-faded)", fontSize:11, whiteSpace:"nowrap" }}>{t.salePlatform || "—"}</td>
                      {/* Cost */}
                      <td style={{ fontWeight:600, color:"var(--ocean)", fontSize:12, whiteSpace:"nowrap", fontFamily:"var(--font-mono)" }}>{fmt(t.totalPrice)}</td>
                      {/* Sale price */}
                      <td style={{ fontWeight:600, color:"var(--terrain)", fontSize:12, whiteSpace:"nowrap", fontFamily:"var(--font-mono)" }}>{t.salePrice ? fmt(t.salePrice) : "—"}</td>
                      {/* Cashback */}
                      <td style={{ fontWeight:600, color:"var(--violet)", fontSize:12, whiteSpace:"nowrap", fontFamily:"var(--font-mono)" }}>{fmt(t.cashbackAmount)}</td>
                      {/* Profit */}
                      <td style={{ fontWeight:700, fontSize:12, whiteSpace:"nowrap", fontFamily:"var(--font-mono)", color: profit==null?"var(--ink-ghost)": profit>=0?"var(--gold)":"var(--crimson)" }}>
                        {profit==null ? "—" : `${profit>=0?"+":""}${fmt(profit)}`}
                      </td>
                      {/* Status */}
                      <td><StatusBadge status={t.status} /></td>
                      {/* Date */}
                      <td style={{ fontSize:11, color:"var(--ink-ghost)", fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}>{fmtDate(t.transactionDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
    </>
  );
}