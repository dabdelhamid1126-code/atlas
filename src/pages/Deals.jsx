import React, { useState, useMemo, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Search, LayoutGrid, List, Filter, ArrowUpDown,
  RefreshCw, ExternalLink, TrendingUp, DollarSign,
  Tag, Package, ChevronDown, ChevronUp, Zap
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 2,
  }).format(n || 0);
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function normalize(str) {
  return String(str || '').toLowerCase().replace(/\.(com|net|org|gg|app|co|io)\b/g, '').replace(/[^a-z0-9]/g, '');
}

function titleCase(str) {
  return String(str || '').trim().toLowerCase().replace(/(^|\s)([a-z])/g, (_, a, b) => `${a}${b.toUpperCase()}`);
}

const ABBR = { hp: 'HP', bjs: "BJ's", bj: "BJ's", us: 'US' };
function cleanName(str) {
  const s = String(str || '').trim();
  const k = normalize(s);
  return ABBR[k] || titleCase(s);
}

function dedupeRetailers(retailers) {
  const seen = new Set();
  const out = [];
  for (const r of retailers || []) {
    const name = String(r.name || '').trim();
    if (!name) continue;
    const key = normalize(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...r, name: cleanName(name) });
  }
  return out;
}

function dedupeCashouts(cashouts) {
  const map = new Map();
  for (const c of cashouts || []) {
    const key = normalize(c.name);
    const existing = map.get(key);
    if (!existing || Number(c.offer || 0) > Number(existing.offer || 0)) map.set(key, c);
  }
  return [...map.values()];
}

function buildFilterOptions(items) {
  const seen = new Map();
  for (const s of items) {
    const key = normalize(s);
    if (!seen.has(key)) seen.set(key, s);
    else if (!/\.(com|net|org)/.test(seen.get(key)) && /\.(com|net|org)/.test(s)) seen.set(key, s);
  }
  return [...seen.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, colorClass }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        <Icon className={`w-4 h-4 ${colorClass}`} />
      </div>
      <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

// ── Deal Card ─────────────────────────────────────────────────────────────────

function DealCard({ deal, onQuickAdd }) {
  const [imgErr, setImgErr] = useState(false);
  const retailers = dedupeRetailers(deal.retailers);
  const cashouts = dedupeCashouts(deal.cashouts);
  const bestOffer = Math.max(...cashouts.map(c => Number(c.offer || 0)), 0);
  const margin = bestOffer - Number(deal.retailCost || 0);
  const marginPct = deal.retailCost > 0 ? (margin / deal.retailCost) * 100 : 0;

  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-px transition-all overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
          {deal.productImageUrl && !imgErr ? (
            <img src={deal.productImageUrl} alt={deal.title} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
          ) : (
            <span className="text-xl font-bold text-slate-300">{(deal.title || '?')[0].toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">{deal.title}</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${margin >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              {margin >= 0 ? '+' : ''}{fmt(margin)}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-slate-100 mx-4 mb-4 rounded-xl overflow-hidden">
        <div className="bg-white px-3 py-2">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Retail</p>
          <p className="text-sm font-bold text-slate-700">{fmt(deal.retailCost)}</p>
        </div>
        <div className="bg-white px-3 py-2">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Best Offer</p>
          <p className="text-sm font-bold text-emerald-600">{fmt(bestOffer)}</p>
        </div>
        <div className="bg-white px-3 py-2">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Margin%</p>
          <p className={`text-sm font-bold ${marginPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{marginPct.toFixed(1)}%</p>
        </div>
      </div>

      {/* Cashouts */}
      {cashouts.length > 0 && (
        <div className="px-4 mb-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Cashout Groups</p>
          <div className="flex flex-wrap gap-1.5">
            {cashouts.slice(0, 4).map((c, i) => (
              <a key={i} href={c.url || '#'} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition">
                {c.name}: {fmt(c.offer)}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ))}
            {cashouts.length > 4 && <span className="text-[11px] text-slate-400">+{cashouts.length - 4}</span>}
          </div>
        </div>
      )}

      {/* Retailers */}
      {retailers.length > 0 && (
        <div className="px-4 mb-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">Buy From</p>
          <div className="flex flex-wrap gap-1.5">
            {retailers.slice(0, 3).map((r, i) => (
              <a key={i} href={r.url || '#'} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition">
                {r.name}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ))}
            {retailers.length > 3 && <span className="text-[11px] text-slate-400">+{retailers.length - 3}</span>}
          </div>
        </div>
      )}

      {/* Quick Add */}
      <div className="px-4 pb-4">
        <button
          onClick={() => onQuickAdd(deal)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition"
        >
          <Zap className="w-3.5 h-3.5" /> Quick Add Transaction
        </button>
      </div>
    </article>
  );
}

// ── Compact Row ───────────────────────────────────────────────────────────────

function CompactRow({ deal, isSelected, onSelect, onQuickAdd }) {
  const cashouts = dedupeCashouts(deal.cashouts);
  const retailers = dedupeRetailers(deal.retailers);
  const best = [...cashouts].sort((a, b) => Number(b.offer || 0) - Number(a.offer || 0))[0];
  const bestOffer = Number(best?.offer || 0);
  const margin = bestOffer - Number(deal.retailCost || 0);
  const [imgErr, setImgErr] = useState(false);

  return (
    <tr
      onClick={() => onSelect()}
      className={`border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${isSelected ? 'bg-violet-50' : ''}`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
            {deal.productImageUrl && !imgErr ? (
              <img src={deal.productImageUrl} alt={deal.title} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
            ) : (
              <span className="text-xs font-bold text-slate-300">{(deal.title || '?')[0]}</span>
            )}
          </div>
          <span className="text-sm text-slate-800 font-medium line-clamp-1">{deal.title}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{fmt(deal.retailCost)}</td>
      <td className="px-4 py-3 text-sm font-semibold text-emerald-600">{fmt(bestOffer)}</td>
      <td className={`px-4 py-3 text-sm font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
        {margin >= 0 ? '+' : ''}{fmt(margin)}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {retailers.slice(0, 2).map((r, i) => (
            <a key={i} href={r.url || '#'} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
              {r.name}
            </a>
          ))}
          {retailers.length > 2 && <span className="text-[11px] text-slate-400">+{retailers.length - 2}</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        {best ? (
          <a href={best.url || '#'} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
            {best.name} <ExternalLink className="w-2.5 h-2.5" />
          </a>
        ) : <span className="text-xs text-slate-400">None</span>}
      </td>
      <td className="px-4 py-3">
        <button onClick={e => { e.stopPropagation(); onQuickAdd(deal); }}
          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition font-semibold">
          <Zap className="w-3 h-3" /> Add
        </button>
      </td>
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Deals() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ fetchedAt: null, nextRefreshAt: null, stale: false, itemCount: 0 });

  const [search, setSearch] = useState('');
  const [retailerFilter, setRetailerFilter] = useState('all');
  const [cashoutFilter, setCashoutFilter] = useState('all');
  const [minMarginPct, setMinMarginPct] = useState('');
  const [positiveOnly, setPositiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState('margin-desc');
  const [viewMode, setViewMode] = useState('cards');
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    loadDeals();
    const interval = setInterval(loadDeals, 120000);
    return () => clearInterval(interval);
  }, []);

  const loadDeals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('getDeals', {});
      const data = res.data;
      setDeals((data.products || []).map(p => ({
        ...p,
        cashouts: Array.isArray(p.cashouts) ? p.cashouts : [],
        retailers: Array.isArray(p.retailers) ? p.retailers : [],
      })));
      setMeta({
        fetchedAt: data.fetchedAt,
        nextRefreshAt: data.nextRefreshAt,
        stale: data.stale,
        itemCount: data.itemCount,
      });
    } catch (e) {
      setError(e.message || 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  // Filter options
  const retailerOptions = useMemo(() => {
    const names = [];
    for (const d of deals) for (const r of dedupeRetailers(d.retailers)) names.push(r.name);
    return buildFilterOptions(names);
  }, [deals]);

  const cashoutOptions = useMemo(() => {
    const names = [];
    for (const d of deals) for (const c of dedupeCashouts(d.cashouts)) if (c.name) names.push(c.name);
    return buildFilterOptions(names);
  }, [deals]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const minPct = Number(minMarginPct);

    return deals
      .filter(d => {
        const retailers = dedupeRetailers(d.retailers);
        const cashouts = dedupeCashouts(d.cashouts);
        const bestOffer = Math.max(...cashouts.map(c => Number(c.offer || 0)), 0);
        const margin = bestOffer - Number(d.retailCost || 0);
        const marginPct = d.retailCost > 0 ? (margin / d.retailCost) * 100 : 0;

        if (positiveOnly && margin <= 0) return false;
        if (minMarginPct && marginPct < minPct) return false;
        if (retailerFilter !== 'all' && !retailers.some(r => normalize(r.name) === retailerFilter)) return false;
        if (cashoutFilter !== 'all' && !cashouts.some(c => normalize(c.name) === cashoutFilter)) return false;
        if (q && !d.title.toLowerCase().includes(q) &&
            !retailers.some(r => r.name.toLowerCase().includes(q)) &&
            !cashouts.some(c => (c.name || '').toLowerCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) => {
        const aCashouts = dedupeCashouts(a.cashouts);
        const bCashouts = dedupeCashouts(b.cashouts);
        const aOffer = Math.max(...aCashouts.map(c => Number(c.offer || 0)), 0);
        const bOffer = Math.max(...bCashouts.map(c => Number(c.offer || 0)), 0);
        const aMargin = aOffer - Number(a.retailCost || 0);
        const bMargin = bOffer - Number(b.retailCost || 0);
        switch (sortBy) {
          case 'margin-asc': return aMargin - bMargin;
          case 'offer-desc': return bOffer - aOffer;
          case 'retail-asc': return Number(a.retailCost || 0) - Number(b.retailCost || 0);
          case 'retail-desc': return Number(b.retailCost || 0) - Number(a.retailCost || 0);
          case 'title-asc': return a.title.localeCompare(b.title);
          case 'margin-desc':
          default: return bMargin - aMargin;
        }
      });
  }, [deals, search, retailerFilter, cashoutFilter, minMarginPct, positiveOnly, sortBy]);

  // Stats
  const stats = useMemo(() => {
    let profitable = 0, totalMargin = 0, totalRetail = 0;
    for (const d of filtered) {
      const cashouts = dedupeCashouts(d.cashouts);
      const best = Math.max(...cashouts.map(c => Number(c.offer || 0)), 0);
      const margin = best - Number(d.retailCost || 0);
      if (margin > 0) profitable++;
      totalMargin += margin;
      totalRetail += Number(d.retailCost || 0);
    }
    return {
      total: filtered.length,
      profitable,
      avgRetail: filtered.length > 0 ? totalRetail / filtered.length : 0,
      avgMargin: filtered.length > 0 ? totalMargin / filtered.length : 0,
    };
  }, [filtered]);

  // Keyboard nav for compact
  useEffect(() => {
    if (viewMode !== 'compact') return;
    const handler = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewMode, filtered.length]);

  const handleQuickAdd = (deal) => {
    const cashouts = dedupeCashouts(deal.cashouts);
    const retailers = dedupeRetailers(deal.retailers);
    const best = [...cashouts].sort((a, b) => Number(b.offer || 0) - Number(a.offer || 0))[0];
    const params = new URLSearchParams();
    params.set('productName', deal.title || '');
    params.set('unitPrice', String(Number(deal.retailCost || 0)));
    params.set('quantity', '1');
    params.set('mode', 'churning');
    if (best?.offer) params.set('salePrice', String(Number(best.offer)));
    if (best?.name) params.set('salePlatform', best.name);
    if (retailers[0]?.name) params.set('platform', retailers[0].name);
    if (deal.productImageUrl) params.set('productImageUrl', deal.productImageUrl);
    window.location.href = `/NewOrders?${params.toString()}`;
  };

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="h-6 w-6 text-violet-500" /> Deals Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Live arbitrage feed — find profitable deals instantly</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Updated {timeAgo(meta.fetchedAt)}</span>
          {meta.stale && <span className="text-amber-500 font-medium">(Refreshing soon)</span>}
          <button onClick={loadDeals} disabled={loading}
            className="ml-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition text-xs font-medium disabled:opacity-50">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Deals Visible" value={String(stats.total)} icon={Tag} colorClass="text-violet-600" />
        <StatCard label="Profitable" value={String(stats.profitable)} icon={TrendingUp} colorClass="text-emerald-600" />
        <StatCard label="Avg Retail" value={fmt(stats.avgRetail)} icon={Package} colorClass="text-blue-600" />
        <StatCard label="Avg Margin" value={fmt(stats.avgMargin)} icon={DollarSign} colorClass={stats.avgMargin >= 0 ? 'text-emerald-600' : 'text-red-500'} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search title, retailer, or cashout group..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white" />
          </div>
          <select value={retailerFilter} onChange={e => setRetailerFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="all">All Retailers</option>
            {retailerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={cashoutFilter} onChange={e => setCashoutFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400">
            <option value="all">All Cashout Groups</option>
            {cashoutOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={minMarginPct} onChange={e => setMinMarginPct(e.target.value)}
              type="number" min="0" step="1" placeholder="Min margin %"
              className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setPositiveOnly(p => !p)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${positiveOnly ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
            Positive Margin Only
          </button>
          <div className="ml-auto flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
              <button onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-colors ${viewMode === 'cards' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                <LayoutGrid className="w-3.5 h-3.5" /> Cards
              </button>
              <button onClick={() => setViewMode('compact')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-colors ${viewMode === 'compact' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                <List className="w-3.5 h-3.5" /> Compact
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
                <option value="retail-desc">Retail High–Low</option>
                <option value="title-asc">Title A–Z</option>
              </select>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400">{filtered.length} of {deals.length} deals</p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-red-200 p-8 text-center">
          <p className="text-red-500 font-medium mb-1">Failed to load deals</p>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <button onClick={loadDeals} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition">
            Try Again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Zap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No deals matched your filters</p>
          <p className="text-sm text-slate-400 mt-1">Try clearing filters or refreshing the feed</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(deal => (
            <DealCard key={deal.id} deal={deal} onQuickAdd={handleQuickAdd} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[11px] uppercase tracking-wide text-slate-400 text-left">
                  {['Product', 'Retail', 'Best Offer', 'Margin', 'Retailers', 'Cashout', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((deal, idx) => (
                  <CompactRow key={deal.id} deal={deal} isSelected={idx === selectedIdx}
                    onSelect={() => setSelectedIdx(idx)} onQuickAdd={handleQuickAdd} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}