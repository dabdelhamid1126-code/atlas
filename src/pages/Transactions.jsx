import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Grid3X3, Tag, Globe, Columns, BarChart2, Download,
  Package, CheckCircle, DollarSign, Search, Filter,
  ChevronLeft, ChevronRight, Edit2, ExternalLink, Trash2
} from 'lucide-react';

const BG = '#0d0f1e';
const CARD_BG = '#1a1d2e';
const BORDER = '#2a2d3e';
const MUTED = '#6b7280';

const MODE_TABS = [
  { key: 'all', label: 'All', icon: Grid3X3 },
  { key: 'churning', label: 'Churning', icon: Tag },
  { key: 'marketplace', label: 'Marketplace', icon: Globe },
];

const PAGE_SIZE = 25;

export default function Transactions() {
  const [orders, setOrders] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modeTab, setModeTab] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([
      base44.entities.PurchaseOrder.list('-order_date', 500),
      base44.entities.Reward.list('-created_date', 500),
    ]).then(([o, r]) => {
      setOrders(o);
      setRewards(r);
    }).finally(() => setLoading(false));
  }, []);

  // Build reward lookup by order id
  const rewardsByOrder = useMemo(() => {
    const map = {};
    rewards.forEach(r => {
      if (r.purchase_order_id) {
        map[r.purchase_order_id] = (map[r.purchase_order_id] || 0) + (r.amount || 0);
      }
    });
    return map;
  }, [rewards]);

  // Unique vendors and platforms for filter dropdowns
  const vendors = useMemo(() => [...new Set(orders.map(o => o.retailer).filter(Boolean))].sort(), [orders]);
  const platforms = useMemo(() => [...new Set(orders.map(o => o.platform).filter(Boolean))].sort(), [orders]);
  const statuses = useMemo(() => [...new Set(orders.map(o => o.status).filter(Boolean))].sort(), [orders]);

  // Filtered rows
  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (modeTab !== 'all' && o.mode !== modeTab) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (vendorFilter !== 'all' && o.retailer !== vendorFilter) return false;
      if (platformFilter !== 'all' && o.platform !== platformFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const productNames = (o.items || []).map(i => i.product_name || '').join(' ').toLowerCase();
        if (!productNames.includes(q) && !(o.retailer || '').toLowerCase().includes(q) && !(o.order_number || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [orders, modeTab, statusFilter, vendorFilter, platformFilter, search]);

  // Summary metrics
  const summary = useMemo(() => {
    const totalItems = filtered.reduce((s, o) => s + (o.items || []).reduce((a, i) => a + (i.quantity_ordered || 0), 0), 0) || filtered.length;
    const listed = filtered.filter(o => ['ordered', 'shipped'].includes(o.status)).length;
    const sold = filtered.filter(o => o.status === 'received').length;
    const totalCost = filtered.reduce((s, o) => s + (o.final_cost ?? o.total_cost ?? 0), 0);
    const totalSale = filtered.reduce((s, o) => s + (o.sale_price || 0), 0);
    const totalProfit = totalSale - totalCost + filtered.reduce((s, o) => s + (rewardsByOrder[o.id] || 0), 0);
    return { totalItems, listed, sold, totalCost, totalProfit };
  }, [filtered, rewardsByOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const fmt = (n) => n == null ? '—' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const selectStyle = {
    background: CARD_BG, border: `1px solid ${BORDER}`, color: '#e5e7eb',
    borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none', cursor: 'pointer'
  };

  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#e5e7eb' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 2 }}>Track and manage your purchases by mode</p>
        </div>
        <div className="flex items-center gap-2">
          <button style={{ ...selectStyle, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px' }}>
            <Columns size={14} /> <span>Columns</span>
          </button>
          <button style={{ ...selectStyle, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px' }}>
            <BarChart2 size={14} /> <span className="font-bold text-purple-400">PRO</span>
          </button>
          <button style={{ ...selectStyle, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px' }}>
            <Download size={14} /> <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center gap-2 mb-5">
        {MODE_TABS.map(tab => {
          const Icon = tab.icon;
          const active = modeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setModeTab(tab.key); setPage(1); }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={active
                ? { background: '#6366f1', color: '#fff', border: '1px solid #6366f1' }
                : { background: 'transparent', color: MUTED, border: `1px solid ${BORDER}` }
              }
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <SummaryCard
          label="Total Items"
          value={summary.totalItems}
          icon={<Package size={16} />}
          iconBg="#1e293b" iconColor="#94a3b8"
          valueBg="#1e293b" valueColor="#e5e7eb"
        />
        <SummaryCard
          label="Listed"
          value={summary.listed}
          icon={<Tag size={16} />}
          iconBg="#2d1f0a" iconColor="#f59e0b"
          valueBg="#2d1f0a" valueColor="#f59e0b"
        />
        <SummaryCard
          label="Sold / Done"
          value={summary.sold}
          icon={<CheckCircle size={16} />}
          iconBg="#0a2414" iconColor="#4ade80"
          valueBg="#0a2414" valueColor="#4ade80"
        />
        <SummaryCard
          label="Total Cost"
          value={fmt(summary.totalCost)}
          icon={<DollarSign size={16} />}
          iconBg="#2a0a0a" iconColor="#f87171"
          valueBg="#2a0a0a" valueColor="#f87171"
        />
        <SummaryCard
          label="Total Profit"
          value={fmt(summary.totalProfit)}
          icon={<DollarSign size={16} />}
          iconBg="#0a2414" iconColor="#4ade80"
          valueBg="#0a2414" valueColor="#4ade80"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 flex-1 min-w-40 rounded-lg px-3 py-1.5" style={{ background: '#0d0f1e', border: `1px solid ${BORDER}` }}>
          <Search size={13} color={MUTED} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products, store"
            className="bg-transparent outline-none text-sm flex-1"
            style={{ color: '#e5e7eb' }}
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="all">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>)}
        </select>
        <select value={vendorFilter} onChange={e => { setVendorFilter(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="all">All Vendors</option>
          {vendors.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={platformFilter} onChange={e => { setPlatformFilter(e.target.value); setPage(1); }} style={selectStyle}>
          <option value="all">All Platforms</option>
          {platforms.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button style={{ display: 'flex', alignItems: 'center', gap: 5, color: MUTED, fontSize: 13, background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 4px' }}>
          <Filter size={13} /> More Filters
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#12152a' }}>
                <th className="px-4 py-3 text-left" style={{ width: 36 }}>
                  <input type="checkbox" style={{ accentColor: '#6366f1' }} />
                </th>
                {['DATE', 'PRODUCT', 'VENDOR', 'PLATFORM', 'QTY', 'COST', 'SALE', 'PROFIT', 'CASHBACK'].map(col => (
                  <th key={col} className="px-4 py-3 text-left" style={{ color: MUTED, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12" style={{ color: MUTED }}>Loading...</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12" style={{ color: MUTED }}>No transactions found</td>
                </tr>
              ) : paginated.map((order, idx) => {
                const productName = (order.items || []).map(i => i.product_name).filter(Boolean).join(', ') || order.order_number;
                const qty = (order.items || []).reduce((s, i) => s + (i.quantity_ordered || 0), 0) || 1;
                const cost = order.final_cost ?? order.total_cost;
                const sale = order.sale_price;
                const cashback = rewardsByOrder[order.id];
                const profit = (sale != null && cost != null) ? (sale - cost + (cashback || 0)) : null;
                return (
                  <tr
                    key={order.id}
                    style={{ background: idx % 2 === 0 ? CARD_BG : '#1e2235', borderBottom: `1px solid ${BORDER}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#252840'}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? CARD_BG : '#1e2235'}
                  >
                    <td className="px-4 py-3">
                      <input type="checkbox" style={{ accentColor: '#6366f1' }} />
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: MUTED, whiteSpace: 'nowrap' }}>{fmtDate(order.order_date)}</td>
                    <td className="px-4 py-3 text-sm text-white max-w-xs truncate" title={productName}>{productName || '—'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#e5e7eb' }}>{order.retailer || '—'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: MUTED }}>{order.platform || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: '#e5e7eb' }}>{qty}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: '#f87171' }}>{fmt(cost)}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: '#e5e7eb' }}>{sale != null ? fmt(sale) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: profit == null ? MUTED : profit >= 0 ? '#4ade80' : '#f87171' }}>
                      {profit == null ? '—' : fmt(profit)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: '#60a5fa' }}>{cashback ? fmt(cashback) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${BORDER}`, background: '#12152a' }}>
          <span style={{ color: MUTED, fontSize: 13 }}>
            {filtered.length === 0 ? 'No results' : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 8px', color: page === 1 ? BORDER : '#e5e7eb', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ color: MUTED, fontSize: 13 }}>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 8px', color: page === totalPages ? BORDER : '#e5e7eb', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, iconBg, iconColor, valueColor }) {
  return (
    <div className="rounded-xl p-4" style={{ background: iconBg, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: iconColor }}>{icon}</span>
        <span style={{ color: iconColor, fontSize: 12, fontWeight: 600 }}>{label}</span>
      </div>
      <div className="text-xl font-bold" style={{ color: valueColor }}>{value}</div>
    </div>
  );
}