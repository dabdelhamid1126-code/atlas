import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutGrid, List, Filter, ArrowUpDown,
  TrendingUp, DollarSign, Tag, Package, Zap, ExternalLink,
} from 'lucide-react';

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_DEALS = [
  {
    id: '1',
    title: 'Apple AirPods Pro (2nd Gen) USB-C',
    productImageUrl: 'https://images.unsplash.com/photo-1588423771073-b8903fead714?w=200&q=80',
    retailCost: 189.99,
    retailers: [
      { name: 'Amazon', url: 'https://amazon.com' },
      { name: 'Best Buy', url: 'https://bestbuy.com' },
    ],
    cashouts: [
      { name: 'CardCash', offer: 228.00, url: 'https://cardcash.com' },
      { name: 'GiftDeals', offer: 221.50, url: 'https://giftdeals.com' },
      { name: 'Raise', offer: 215.00, url: 'https://raise.com' },
    ],
  },
  {
    id: '2',
    title: 'Samsung 65" QLED 4K Smart TV QN65Q80C',
    productImageUrl: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=200&q=80',
    retailCost: 897.99,
    retailers: [
      { name: 'Walmart', url: 'https://walmart.com' },
      { name: 'Costco', url: 'https://costco.com' },
    ],
    cashouts: [
      { name: 'CardCash', offer: 940.00, url: 'https://cardcash.com' },
      { name: 'ClipKard', offer: 930.50, url: 'https://clipkard.com' },
    ],
  },
  {
    id: '3',
    title: 'Dyson V15 Detect Absolute Cordless Vacuum',
    productImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80',
    retailCost: 549.99,
    retailers: [
      { name: 'Target', url: 'https://target.com' },
      { name: 'Best Buy', url: 'https://bestbuy.com' },
    ],
    cashouts: [
      { name: 'GiftDeals', offer: 605.00, url: 'https://giftdeals.com' },
      { name: 'Raise', offer: 595.00, url: 'https://raise.com' },
    ],
  },
  {
    id: '4',
    title: 'PlayStation 5 Console (Disc Edition)',
    productImageUrl: 'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=200&q=80',
    retailCost: 499.99,
    retailers: [
      { name: 'Walmart', url: 'https://walmart.com' },
      { name: 'Target', url: 'https://target.com' },
      { name: 'Best Buy', url: 'https://bestbuy.com' },
    ],
    cashouts: [
      { name: 'CardCash', offer: 475.00, url: 'https://cardcash.com' },
      { name: 'GiftDeals', offer: 462.00, url: 'https://giftdeals.com' },
    ],
  },
  {
    id: '5',
    title: 'Nintendo Switch OLED Model',
    productImageUrl: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=200&q=80',
    retailCost: 349.99,
    retailers: [
      { name: 'Amazon', url: 'https://amazon.com' },
      { name: "Sam's Club", url: 'https://samsclub.com' },
    ],
    cashouts: [
      { name: 'CardCash', offer: 385.00, url: 'https://cardcash.com' },
      { name: 'GiftDeals', offer: 378.00, url: 'https://giftdeals.com' },
      { name: 'ClipKard', offer: 370.00, url: 'https://clipkard.com' },
    ],
  },
  {
    id: '6',
    title: 'Ninja Foodi 14-in-1 8-Qt XL Pressure Cooker',
    productImageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&q=80',
    retailCost: 219.99,
    retailers: [
      { name: 'Walmart', url: 'https://walmart.com' },
      { name: 'Costco', url: 'https://costco.com' },
    ],
    cashouts: [
      { name: 'Raise', offer: 258.00, url: 'https://raise.com' },
      { name: 'GiftDeals', offer: 252.00, url: 'https://giftdeals.com' },
    ],
  },
  {
    id: '7',
    title: 'Apple Watch Series 9 GPS 45mm Midnight',
    productImageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80',
    retailCost: 429.00,
    retailers: [
      { name: 'Amazon', url: 'https://amazon.com' },
      { name: 'Best Buy', url: 'https://bestbuy.com' },
    ],
    cashouts: [
      { name: 'CardCash', offer: 420.00, url: 'https://cardcash.com' },
      { name: 'ClipKard', offer: 410.00, url: 'https://clipkard.com' },
    ],
  },
  {
    id: '8',
    title: 'iRobot Roomba j7+ Self-Emptying Robot Vacuum',
    productImageUrl: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=200&q=80',
    retailCost: 599.99,
    retailers: [
      { name: 'Best Buy', url: 'https://bestbuy.com' },
      { name: 'Target', url: 'https://target.com' },
    ],
    cashouts: [
      { name: 'GiftDeals', offer: 672.00, url: 'https://giftdeals.com' },
      { name: 'CardCash', offer: 660.00, url: 'https://cardcash.com' },
    ],
  },
  {
    id: '9',
    title: 'KitchenAid Artisan Series 5-Qt Stand Mixer',
    productImageUrl: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=200&q=80',
    retailCost: 449.99,
    retailers: [
      { name: 'Amazon', url: 'https://amazon.com' },
      { name: 'Walmart', url: 'https://walmart.com' },
    ],
    cashouts: [
      { name: 'Raise', offer: 504.00, url: 'https://raise.com' },
      { name: 'CardCash', offer: 495.00, url: 'https://cardcash.com' },
      { name: 'GiftDeals', offer: 488.00, url: 'https://giftdeals.com' },
    ],
  },
  {
    id: '10',
    title: 'Xbox Series X 1TB Console',
    productImageUrl: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=200&q=80',
    retailCost: 499.99,
    retailers: [
      { name: 'Walmart', url: 'https://walmart.com' },
      { name: 'Target', url: 'https://target.com' },
    ],
    cashouts: [
      { name: 'CardCash', offer: 455.00, url: 'https://cardcash.com' },
      { name: 'ClipKard', offer: 448.00, url: 'https://clipkard.com' },
    ],
  },
  {
    id: '11',
    title: 'Bose QuietComfort 45 Wireless Headphones',
    productImageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80',
    retailCost: 279.00,
    retailers: [
      { name: 'Best Buy', url: 'https://bestbuy.com' },
      { name: 'Amazon', url: 'https://amazon.com' },
    ],
    cashouts: [
      { name: 'GiftDeals', offer: 318.00, url: 'https://giftdeals.com' },
      { name: 'Raise', offer: 310.00, url: 'https://raise.com' },
    ],
  },
  {
    id: '12',
    title: 'LEGO Star Wars Millennium Falcon 75257',
    productImageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=200&q=80',
    retailCost: 159.99,
    retailers: [
      { name: 'Target', url: 'https://target.com' },
      { name: 'Walmart', url: 'https://walmart.com' },
    ],
    cashouts: [
      { name: 'CardCash', offer: 168.00, url: 'https://cardcash.com' },
      { name: 'GiftDeals', offer: 163.00, url: 'https://giftdeals.com' },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n || 0);

function getBestOffer(cashouts) {
  return Math.max(...(cashouts || []).map(c => Number(c.offer || 0)), 0);
}

function getMargin(deal) {
  return getBestOffer(deal.cashouts) - Number(deal.retailCost || 0);
}

function getMarginPct(deal) {
  const retail = Number(deal.retailCost || 0);
  if (!retail) return 0;
  return (getMargin(deal) / retail) * 100;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, color }) {
  const colors = {
    violet: { text: 'text-violet-600', bg: 'bg-violet-50', icon: 'text-violet-500' },
    emerald: { text: 'text-emerald-700', bg: 'bg-emerald-50', icon: 'text-emerald-500' },
    blue: { text: 'text-blue-700', bg: 'bg-blue-50', icon: 'text-blue-500' },
    amber: { text: 'text-amber-700', bg: 'bg-amber-50', icon: 'text-amber-500' },
    red: { text: 'text-red-600', bg: 'bg-red-50', icon: 'text-red-400' },
  };
  const c = colors[color] || colors.violet;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <div className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
    </div>
  );
}

// ── Deal Card ─────────────────────────────────────────────────────────────────

function DealCard({ deal }) {
  const navigate = useNavigate();
  const [imgErr, setImgErr] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState(deal.retailers[0]?.name || '');
  const [selectedCashout, setSelectedCashout] = useState(deal.cashouts[0]?.name || '');

  const bestOffer = getBestOffer(deal.cashouts);
  const margin = getMargin(deal);
  const marginPct = getMarginPct(deal);
  const isPositive = margin > 0;

  const handleQuickAdd = () => {
    const cashout = deal.cashouts.find(c => c.name === selectedCashout) || deal.cashouts[0];
    const params = new URLSearchParams();
    params.set('productName', deal.title || '');
    params.set('unitPrice', String(deal.retailCost || 0));
    params.set('quantity', '1');
    params.set('mode', 'churning');
    if (cashout?.offer) params.set('salePrice', String(cashout.offer));
    if (selectedRetailer) params.set('platform', selectedRetailer);
    if (cashout?.name) params.set('salePlatform', cashout.name);
    navigate(`/NewOrders?${params.toString()}`);
  };

  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col">
      {/* Product header */}
      <div className="p-4 flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
          {deal.productImageUrl && !imgErr ? (
            <img src={deal.productImageUrl} alt={deal.title} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
          ) : (
            <Package className="w-6 h-6 text-slate-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">{deal.title}</h3>
          </div>
          <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${
            isPositive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-600 border-red-200'
          }`}>
            {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}{fmt(margin)}
          </span>
        </div>
      </div>

      {/* 3 Metric boxes */}
      <div className="grid grid-cols-3 gap-px bg-slate-100 mx-4 rounded-xl overflow-hidden mb-4">
        <div className="bg-white px-3 py-2.5">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-0.5">Retail</p>
          <p className="text-sm font-bold text-slate-700">{fmt(deal.retailCost)}</p>
        </div>
        <div className="bg-white px-3 py-2.5">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-0.5">Best Offer</p>
          <p className="text-sm font-bold text-emerald-600">{fmt(bestOffer)}</p>
        </div>
        <div className={`px-3 py-2.5 ${isPositive ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-0.5">Margin %</p>
          <p className={`text-sm font-bold ${isPositive ? 'text-emerald-700' : 'text-red-600'}`}>
            {marginPct >= 0 ? '+' : ''}{marginPct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Quick Transaction */}
      <div className="px-4 mb-4 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Transaction</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">Retailer</label>
            <select
              value={selectedRetailer}
              onChange={e => setSelectedRetailer(e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              {deal.retailers.map(r => (
                <option key={r.name} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 mb-1 block">Cashout Group</label>
            <select
              value={selectedCashout}
              onChange={e => setSelectedCashout(e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              {deal.cashouts.map(c => (
                <option key={c.name} value={c.name}>{c.name} — {fmt(c.offer)}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleQuickAdd}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition shadow-sm"
        >
          <Zap className="w-3.5 h-3.5" /> Quick Add Transaction
        </button>
      </div>

      {/* Tags */}
      <div className="px-4 pb-4 mt-auto space-y-2">
        {/* Cashout tags */}
        <div className="flex flex-wrap gap-1.5">
          {deal.cashouts.map((c, i) => (
            <a key={i} href={c.url || '#'} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition">
              {c.name} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ))}
        </div>
        {/* Retailer tags */}
        <div className="flex flex-wrap gap-1.5">
          {deal.retailers.map((r, i) => (
            <a key={i} href={r.url || '#'} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition">
              {r.name} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}

// ── Compact Row ───────────────────────────────────────────────────────────────

function CompactRow({ deal }) {
  const navigate = useNavigate();
  const [imgErr, setImgErr] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState(deal.retailers[0]?.name || '');
  const [selectedCashout, setSelectedCashout] = useState(deal.cashouts[0]?.name || '');

  const bestOffer = getBestOffer(deal.cashouts);
  const margin = getMargin(deal);
  const marginPct = getMarginPct(deal);
  const isPositive = margin > 0;

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    const cashout = deal.cashouts.find(c => c.name === selectedCashout) || deal.cashouts[0];
    const params = new URLSearchParams();
    params.set('productName', deal.title || '');
    params.set('unitPrice', String(deal.retailCost || 0));
    params.set('quantity', '1');
    params.set('mode', 'churning');
    if (cashout?.offer) params.set('salePrice', String(cashout.offer));
    if (selectedRetailer) params.set('platform', selectedRetailer);
    if (cashout?.name) params.set('salePlatform', cashout.name);
    navigate(`/NewOrders?${params.toString()}`);
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
            {deal.productImageUrl && !imgErr ? (
              <img src={deal.productImageUrl} alt={deal.title} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
            ) : (
              <Package className="w-3.5 h-3.5 text-slate-300" />
            )}
          </div>
          <span className="text-sm text-slate-800 font-medium line-clamp-1">{deal.title}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{fmt(deal.retailCost)}</td>
      <td className="px-4 py-3 text-sm font-semibold text-emerald-600">{fmt(bestOffer)}</td>
      <td className="px-4 py-3">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
          isPositive
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-600 border-red-200'
        }`}>
          {isPositive ? '+' : ''}{marginPct.toFixed(1)}%
        </span>
      </td>
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <select
          value={selectedRetailer}
          onChange={e => setSelectedRetailer(e.target.value)}
          className="h-7 px-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none"
        >
          {deal.retailers.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
        </select>
      </td>
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <select
          value={selectedCashout}
          onChange={e => setSelectedCashout(e.target.value)}
          className="h-7 px-2 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none"
        >
          {deal.cashouts.map(c => <option key={c.name} value={c.name}>{c.name} — {fmt(c.offer)}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={handleQuickAdd}
          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition font-semibold"
        >
          <Zap className="w-3 h-3" /> Add
        </button>
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Deals() {
  const [search, setSearch] = useState('');
  const [retailerFilter, setRetailerFilter] = useState('all');
  const [cashoutFilter, setCashoutFilter] = useState('all');
  const [minMarginPct, setMinMarginPct] = useState('');
  const [positiveOnly, setPositiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState('margin-desc');
  const [viewMode, setViewMode] = useState('cards');

  // Build filter options
  const allRetailers = useMemo(() => {
    const names = new Set();
    MOCK_DEALS.forEach(d => d.retailers.forEach(r => names.add(r.name)));
    return [...names].sort();
  }, []);

  const allCashouts = useMemo(() => {
    const names = new Set();
    MOCK_DEALS.forEach(d => d.cashouts.forEach(c => names.add(c.name)));
    return [...names].sort();
  }, []);

  // Filtered + sorted deals
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minPct = Number(minMarginPct);

    return MOCK_DEALS
      .filter(d => {
        const margin = getMargin(d);
        const pct = getMarginPct(d);
        if (positiveOnly && margin <= 0) return false;
        if (minMarginPct && pct < minPct) return false;
        if (retailerFilter !== 'all' && !d.retailers.some(r => r.name === retailerFilter)) return false;
        if (cashoutFilter !== 'all' && !d.cashouts.some(c => c.name === cashoutFilter)) return false;
        if (q) {
          const haystack = [d.title, ...d.retailers.map(r => r.name), ...d.cashouts.map(c => c.name)].join(' ').toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'margin-asc': return getMargin(a) - getMargin(b);
          case 'offer-desc': return getBestOffer(b.cashouts) - getBestOffer(a.cashouts);
          case 'retail-asc': return Number(a.retailCost) - Number(b.retailCost);
          case 'margin-desc':
          default: return getMargin(b) - getMargin(a);
        }
      });
  }, [search, retailerFilter, cashoutFilter, minMarginPct, positiveOnly, sortBy]);

  // KPI stats
  const stats = useMemo(() => {
    const profitable = filtered.filter(d => getMargin(d) > 0).length;
    const avgRetail = filtered.length ? filtered.reduce((s, d) => s + Number(d.retailCost || 0), 0) / filtered.length : 0;
    const avgMargin = filtered.length ? filtered.reduce((s, d) => s + getMargin(d), 0) / filtered.length : 0;
    return { total: filtered.length, profitable, avgRetail, avgMargin };
  }, [filtered]);

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Zap className="h-6 w-6 text-violet-500" /> Deals Dashboard
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">Live arbitrage feed — find profitable deals instantly</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Deals Visible" value={String(stats.total)} icon={Tag} color="violet" />
        <KpiCard label="Profitable" value={String(stats.profitable)} icon={TrendingUp} color="emerald" />
        <KpiCard label="Avg Retail" value={fmt(stats.avgRetail)} icon={Package} color="blue" />
        <KpiCard label="Avg Margin" value={fmt(stats.avgMargin)} icon={DollarSign} color={stats.avgMargin >= 0 ? 'emerald' : 'red'} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search product, retailer, or cashout group..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
            />
          </div>
          {/* Retailer */}
          <select value={retailerFilter} onChange={e => setRetailerFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="all">All Retailers</option>
            {allRetailers.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {/* Cashout group */}
          <select value={cashoutFilter} onChange={e => setCashoutFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="all">All Cashout Groups</option>
            {allCashouts.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* Min margin % */}
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={minMarginPct}
              onChange={e => setMinMarginPct(e.target.value)}
              type="number" min="0" step="1" placeholder="Min margin %"
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Positive only toggle */}
          <button
            onClick={() => setPositiveOnly(p => !p)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              positiveOnly
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}
          >
            ✓ Positive Margin Only
          </button>

          <div className="ml-auto flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'cards' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                <LayoutGrid className="w-3.5 h-3.5" /> Cards
              </button>
              <button onClick={() => setViewMode('compact')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'compact' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                <List className="w-3.5 h-3.5" /> Table
              </button>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="h-9 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none">
                <option value="margin-desc">Margin High–Low</option>
                <option value="margin-asc">Margin Low–High</option>
                <option value="offer-desc">Best Offer High–Low</option>
                <option value="retail-asc">Retail Low–High</option>
              </select>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400">{filtered.length} of {MOCK_DEALS.length} deals shown</p>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Zap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No deals match your filters</p>
          <p className="text-sm text-slate-400 mt-1">Try clearing filters or adjusting your search</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(deal => <DealCard key={deal.id} deal={deal} />)}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] uppercase tracking-wide text-slate-400 text-left">
                  {['Product', 'Retail', 'Best Offer', 'Margin', 'Retailer', 'Cashout Group', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(deal => <CompactRow key={deal.id} deal={deal} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}