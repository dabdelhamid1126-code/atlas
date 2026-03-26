import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import {
  Search, Plus, Trash2, Package, Tag, CheckCircle,
  DollarSign, ChevronUp, ChevronDown, ArrowUpDown,
  X, Check, AlertCircle, Loader, PenLine, ShoppingBag,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────

const fmt = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(parseFloat(v) || 0);
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const STATUS_OPTIONS = [
  { value: 'IN_STOCK',  label: 'In Stock',  color: 'bg-blue-50 text-blue-700 border-blue-100' },
  { value: 'LISTED',    label: 'Listed',    color: 'bg-amber-50 text-amber-700 border-amber-100' },
  { value: 'SOLD',      label: 'Sold',      color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { value: 'RETURNED',  label: 'Returned',  color: 'bg-red-50 text-red-700 border-red-100' },
  { value: 'DAMAGED',   label: 'Damaged',   color: 'bg-slate-100 text-slate-600 border-slate-200' },
];

function StatusBadge({ status }) {
  const opt = STATUS_OPTIONS.find(s => s.value === status) || { label: status, color: 'bg-slate-100 text-slate-500 border-slate-200' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border', opt.color)}>
      {opt.label}
    </span>
  );
}

function SortTh({ label, sortKey, sortConfig, onSort, className = '' }) {
  const active = sortConfig?.key === sortKey;
  return (
    <th
      className={cn('cursor-pointer select-none group whitespace-nowrap', className)}
      onClick={() => onSort(sortKey)}
    >
      <div className={cn('flex items-center gap-1', className.includes('text-right') && 'justify-end')}>
        <span className="group-hover:text-slate-700 transition-colors text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        {active
          ? sortConfig.dir === 'asc'
            ? <ChevronUp className="w-3 h-3 text-violet-500" />
            : <ChevronDown className="w-3 h-3 text-violet-500" />
          : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
        }
      </div>
    </th>
  );
}

function KpiCard({ label, value, icon: Icon, color = 'default' }) {
  const colors = {
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    icon: 'text-blue-400'    },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   icon: 'text-amber-400'   },
    green:   { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'text-emerald-400' },
    red:     { bg: 'bg-red-50',     text: 'text-red-600',     icon: 'text-red-400'     },
    default: { bg: 'bg-slate-50',   text: 'text-slate-700',   icon: 'text-slate-400'   },
  };
  const c = colors[color] || colors.default;
  return (
    <div className="rounded-2xl border border-slate-100 p-4 bg-white shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn('w-3.5 h-3.5', c.icon)} />
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      </div>
      <p className={cn('text-xl font-bold', c.text)}>{value}</p>
    </div>
  );
}

// ── Add/Edit Modal ────────────────────────────────────────────────────────

const BLANK = { product_name: '', sku: '', quantity: 1, unit_cost: '', listing_price: '', status: 'IN_STOCK', platform: '', location: '', notes: '' };

function ItemModal({ open, onClose, onSave, item }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(item ? { ...BLANK, ...item } : BLANK);
  }, [open, item]);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity:      Number(form.quantity) || 1,
        unit_cost:     form.unit_cost     ? parseFloat(form.unit_cost)     : null,
        listing_price: form.listing_price ? parseFloat(form.listing_price) : null,
      };
      if (item?.id) await base44.entities.InventoryItem.update(item.id, payload);
      else           await base44.entities.InventoryItem.create(payload);
      onSave();
      onClose();
    } finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-800">{item ? 'Edit Item' : 'Add Inventory Item'}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Product Name *</label>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" value={form.product_name} onChange={e => upd('product_name', e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">Unit Cost</label>
                <input type="number" step="0.01" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" value={form.unit_cost} onChange={e => upd('unit_cost', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">Listing Price</label>
                <input type="number" step="0.01" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" value={form.listing_price} onChange={e => upd('listing_price', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">Quantity</label>
                <input type="number" min="0" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" value={form.quantity} onChange={e => upd('quantity', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">SKU</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" value={form.sku} onChange={e => upd('sku', e.target.value)} placeholder="UPC / SKU" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">Status</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white" value={form.status} onChange={e => upd('status', e.target.value)}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">Platform</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" value={form.platform} onChange={e => upd('platform', e.target.value)} placeholder="e.g. eBay" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">Location</label>
                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" value={form.location} onChange={e => upd('location', e.target.value)} placeholder="Storage location" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Notes</label>
              <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none" value={form.notes} onChange={e => upd('notes', e.target.value)} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader className="w-3.5 h-3.5 animate-spin" />}
                {item ? 'Update' : 'Create'} Item
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Main Inventory page ───────────────────────────────────────────────────

export default function Inventory() {
  const [items, setItems]         = useState([]);
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [sourceFilter, setSource] = useState('all');
  const [sortConfig, setSort]     = useState(null);
  const [selected, setSelected]   = useState(new Set());
  const [modalOpen, setModal]     = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [toast, setToast]         = useState(null);

  const notify = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, pos] = await Promise.all([
        base44.entities.InventoryItem.list('-created_date'),
        base44.entities.PurchaseOrder.list('-order_date'),
      ]);
      setItems(inv || []);
      setOrders(pos || []);
    } catch (e) {
      notify('Failed to load inventory', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { load(); }, [load]);

  const orderRows = useMemo(() => orders.map(o => ({
    _source:       'order',
    id:            `order-${o.id}`,
    _orderId:      o.id,
    product_name:  (o.items && o.items.length > 0) ? o.items[0].product_name : (o.retailer || 'Unnamed Order'),
    sku:           o.order_number || '—',
    quantity:      1,
    unit_cost:     parseFloat(o.final_cost || o.total_cost || 0),
    listing_price: null,
    status:        o.status === 'received' ? 'IN_STOCK' : o.status === 'shipped' ? 'IN_STOCK' : 'IN_STOCK',
    platform:      o.marketplace_platform || o.order_type || '',
    retailer:      o.retailer || '',
    sale_price:    null,
    profit:        null,
    cashback:      null,
    order_date:    o.order_date,
    created_date:  o.order_date || o.created_date,
    notes:         o.notes || '',
  })), [orders]);

  const allRows = useMemo(() => {
    const manual = items.map(i => ({ ...i, _source: 'manual' }));
    if (sourceFilter === 'orders') return orderRows;
    if (sourceFilter === 'manual') return manual;
    return [...orderRows, ...manual];
  }, [orderRows, items, sourceFilter]);

  const filtered = useMemo(() => allRows.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.product_name?.toLowerCase().includes(q) || r.sku?.toLowerCase().includes(q) || r.retailer?.toLowerCase().includes(q);
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchStatus;
  }), [allRows, search, statusFilter]);

  const sorted = useMemo(() => {
    if (!sortConfig) return filtered;
    const { key, dir } = sortConfig;
    return [...filtered].sort((a, b) => {
      let av = a[key], bv = b[key];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av == null) av = '';
      if (bv == null) bv = '';
      return av < bv ? (dir === 'asc' ? -1 : 1) : av > bv ? (dir === 'asc' ? 1 : -1) : 0;
    });
  }, [filtered, sortConfig]);

  const onSort = k => setSort(s => s?.key === k ? (s.dir === 'asc' ? { key: k, dir: 'desc' } : null) : { key: k, dir: 'asc' });

  const toggleSelect = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll   = () => setSelected(s => s.size === sorted.length ? new Set() : new Set(sorted.map(r => r.id)));
  const allSelected = sorted.length > 0 && selected.size === sorted.length;

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} item(s)?`)) return;
    const manualIds = [...selected].filter(id => !String(id).startsWith('order-'));
    await Promise.all(manualIds.map(id => base44.entities.InventoryItem.delete(id)));
    notify(`Deleted ${manualIds.length} item(s)`);
    setSelected(new Set());
    load();
  };

  const bulkStatus = async status => {
    const manualIds = [...selected].filter(id => !String(id).startsWith('order-'));
    await Promise.all(manualIds.map(id => base44.entities.InventoryItem.update(id, { status })));
    notify(`Updated ${manualIds.length} item(s) to ${status}`);
    setSelected(new Set());
    load();
  };

  const deleteOne = async (row) => {
    if (!confirm(`Delete "${row.product_name}"?`)) return;
    if (row._source === 'manual') await base44.entities.InventoryItem.delete(row.id);
    else if (row._source === 'order') await base44.entities.PurchaseOrder.delete(row._orderId);
    notify('Item deleted');
    load();
  };

  const openEdit = row => {
    if (row._source === 'order') return notify('Edit this item from the Transactions page', 'error');
    setEditItem(row);
    setModal(true);
  };

  const stats = useMemo(() => ({
    total:     filtered.length,
    inStock:   filtered.filter(r => r.status === 'IN_STOCK').length,
    listed:    filtered.filter(r => r.status === 'LISTED').length,
    sold:      filtered.filter(r => r.status === 'SOLD').length,
    totalCost: filtered.reduce((s, r) => s + (parseFloat(r.unit_cost) || 0) * (r.quantity || 1), 0),
    profit:    filtered.reduce((s, r) => s + (parseFloat(r.profit) || 0), 0),
  }), [filtered]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-10 space-y-6">

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium shadow-lg border',
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
        )}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory On Hand</h1>
          <p className="text-slate-400 text-sm mt-1">Marketplace inventory pulled from your orders</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* KPI cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Total Items"  value={String(stats.total)}    icon={Package}      />
          <KpiCard label="In Stock"     value={String(stats.inStock)}  icon={Package}      color="blue"  />
          <KpiCard label="Listed"       value={String(stats.listed)}   icon={Tag}          color="amber" />
          <KpiCard label="Sold"         value={String(stats.sold)}     icon={CheckCircle}  color="green" />
          <KpiCard label="Cost Basis"   value={fmt(stats.totalCost)}   icon={DollarSign}   color="red"   />
          <KpiCard label="Total Profit" value={fmt(stats.profit)}      icon={DollarSign}   color="green" />
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-2xl bg-violet-50 border border-violet-100 sticky top-0 z-10">
          <span className="text-sm font-semibold text-violet-700">{selected.size} selected</span>
          <div className="w-px h-4 bg-violet-200" />
          {STATUS_OPTIONS.map(s => (
            <button key={s.value} onClick={() => bulkStatus(s.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
              → {s.label}
            </button>
          ))}
          <button onClick={bulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-slate-400 hover:text-slate-600">Clear</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" placeholder="Search products, SKUs, retailers..."
              className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 text-slate-700"
            value={statusFilter} onChange={e => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-300 text-slate-700"
            value={sourceFilter} onChange={e => setSource(e.target.value)}
          >
            <option value="all">All Sources</option>
            <option value="orders">From Orders Only</option>
            <option value="manual">Manual Items Only</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{sorted.length} item{sorted.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm text-center py-20">
          <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No inventory items found.</p>
          <p className="text-slate-400 text-xs mt-1">Items are auto-pulled from your Purchase Orders, or add one manually.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="w-10 px-4 py-3">
                    <button onClick={toggleAll} className="p-0.5">
                      <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center transition-colors', allSelected ? 'bg-violet-500 border-violet-500' : 'border-slate-300')}>
                        {allSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                  <SortTh label="Date"          sortKey="created_date"  sortConfig={sortConfig} onSort={onSort} className="px-4 py-3 text-left" />
                  <SortTh label="Product"        sortKey="product_name"  sortConfig={sortConfig} onSort={onSort} className="px-4 py-3 text-left" />
                  <SortTh label="SKU / Order #"  sortKey="sku"           sortConfig={sortConfig} onSort={onSort} className="px-4 py-3 text-left" />
                  <SortTh label="Qty"            sortKey="quantity"      sortConfig={sortConfig} onSort={onSort} className="px-4 py-3 text-right" />
                  <SortTh label="Cost"           sortKey="unit_cost"     sortConfig={sortConfig} onSort={onSort} className="px-4 py-3 text-right" />
                  <SortTh label="List $"         sortKey="listing_price" sortConfig={sortConfig} onSort={onSort} className="px-4 py-3 text-right" />
                  <SortTh label="Sale"           sortKey="sale_price"    sortConfig={sortConfig} onSort={onSort} className="px-4 py-3 text-right" />
                  <SortTh label="Profit"         sortKey="profit"        sortConfig={sortConfig} onSort={onSort} className="px-4 py-3 text-right" />
                  <SortTh label="Status"         sortKey="status"        sortConfig={sortConfig} onSort={onSort} className="px-4 py-3 text-left" />
                  <th className="px-4 py-3 text-right w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sorted.map(row => {
                  const isSelected = selected.has(row.id);
                  return (
                    <tr key={row.id} className={cn('hover:bg-slate-50 transition-colors', isSelected && 'bg-violet-50')}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelect(row.id)} className="p-0.5">
                          <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center transition-colors', isSelected ? 'bg-violet-500 border-violet-500' : 'border-slate-300')}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {row._source === 'order'
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100"><ShoppingBag className="w-3 h-3" />Order</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200"><Package className="w-3 h-3" />Manual</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDate(row.created_date || row.order_date)}</td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <div className="text-sm font-medium text-slate-700 truncate" title={row.product_name}>{row.product_name}</div>
                        {row.retailer && row._source === 'order' && <div className="text-xs text-slate-400 mt-0.5">{row.retailer}</div>}
                        {row.platform && <div className="text-xs text-violet-400 mt-0.5">{row.platform}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">{row.sku || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right font-medium">{row.quantity}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-right">{row.unit_cost ? fmt(row.unit_cost) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-amber-600 text-right">{row.listing_price ? fmt(row.listing_price) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-emerald-600 text-right font-medium">{row.sale_price ? fmt(row.sale_price) : '—'}</td>
                      <td className={cn('px-4 py-3 text-sm text-right font-semibold', row.profit != null ? (row.profit >= 0 ? 'text-emerald-600' : 'text-red-500') : 'text-slate-300')}>
                        {row.profit != null ? fmt(row.profit) : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="Edit">
                            <PenLine className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                          <button onClick={() => deleteOne(row)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">Showing {sorted.length} item{sorted.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-slate-400">
              {orderRows.length} from orders · {items.length} manual
            </p>
          </div>
        </div>
      )}

      <ItemModal
        open={modalOpen}
        onClose={() => { setModal(false); setEditItem(null); }}
        onSave={load}
        item={editItem}
      />
    </div>
  );
}