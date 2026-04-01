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
  { value: 'IN_STOCK',  label: 'In Stock'  },
  { value: 'LISTED',    label: 'Listed'    },
  { value: 'SOLD',      label: 'Sold'      },
  { value: 'RETURNED',  label: 'Returned'  },
  { value: 'DAMAGED',   label: 'Damaged'   },
];

const STATUS_STYLES = {
  IN_STOCK: { bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa', border: 'rgba(96,165,250,0.2)'  },
  LISTED:   { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', border: 'rgba(245,158,11,0.2)'  },
  SOLD:     { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', border: 'rgba(16,185,129,0.2)'  },
  RETURNED: { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.2)'   },
  DAMAGED:  { bg: 'rgba(255,255,255,0.06)', color: '#64748b', border: 'rgba(255,255,255,0.1)' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.DAMAGED;
  const label = STATUS_OPTIONS.find(o => o.value === status)?.label || status;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 20,
      fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {label}
    </span>
  );
}

const inp = {
  background: '#0d1117',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: 'white',
  padding: '8px 12px',
  fontSize: 13,
  width: '100%',
  outline: 'none',
};

function SortTh({ label, sortKey, sortConfig, onSort, align = 'left' }) {
  const active = sortConfig?.key === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: '10px 16px',
        textAlign: align,
        cursor: 'pointer',
        userSelect: 'none',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: active ? '#10b981' : '#64748b',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        {label}
        {active
          ? sortConfig.dir === 'asc'
            ? <ChevronUp style={{ width: 12, height: 12 }} />
            : <ChevronDown style={{ width: 12, height: 12 }} />
          : <ArrowUpDown style={{ width: 11, height: 11, opacity: 0.3 }} />
        }
      </span>
    </th>
  );
}

function KpiCard({ label, value, icon: Icon, iconColor, valueColor }) {
  return (
    <div style={{
      background: '#111827',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Icon style={{ width: 14, height: 14, color: iconColor }} />
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>{label}</span>
      </div>
      <p style={{ fontSize: 20, fontWeight: 700, color: valueColor, lineHeight: 1.2 }}>{value}</p>
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

  const labelStyle = { display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 6 };
  const inputStyle = { ...inp, transition: 'border-color 0.15s' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, overflowY: 'auto' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ display: 'flex', minHeight: '100%', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{
          position: 'relative', width: '100%', maxWidth: 520,
          background: '#111827',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          {/* Modal Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{item ? 'Edit Item' : 'Add Inventory Item'}</h3>
            <button onClick={onClose} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Product Name *</label>
              <input style={inputStyle} value={form.product_name} onChange={e => upd('product_name', e.target.value)} required
                onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Unit Cost</label>
                <input type="number" step="0.01" style={inputStyle} value={form.unit_cost} onChange={e => upd('unit_cost', e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div>
                <label style={labelStyle}>Listing Price</label>
                <input type="number" step="0.01" style={inputStyle} value={form.listing_price} onChange={e => upd('listing_price', e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Quantity</label>
                <input type="number" min="0" style={inputStyle} value={form.quantity} onChange={e => upd('quantity', e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div>
                <label style={labelStyle}>SKU</label>
                <input style={inputStyle} value={form.sku} onChange={e => upd('sku', e.target.value)} placeholder="UPC / SKU"
                  onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select style={{ ...inputStyle, appearance: 'none' }} value={form.status} onChange={e => upd('status', e.target.value)}
                  onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value} style={{ background: '#1a2234' }}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Platform</label>
                <input style={inputStyle} value={form.platform} onChange={e => upd('platform', e.target.value)} placeholder="e.g. eBay"
                  onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input style={inputStyle} value={form.location} onChange={e => upd('location', e.target.value)} placeholder="Storage location"
                  onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea rows={2} style={{ ...inputStyle, resize: 'none' }} value={form.notes} onChange={e => upd('notes', e.target.value)}
                onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <button type="button" onClick={onClose} style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                color: '#94a3b8', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={{
                padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                color: 'white', background: 'linear-gradient(135deg,#10b981,#06b6d4)', border: 'none', cursor: 'pointer',
                opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {saving && <Loader style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} />}
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
    status:        'IN_STOCK',
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

  const filterInputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: 'white',
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 0 40px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 500,
          backdropFilter: 'blur(12px)',
          ...(toast.type === 'success'
            ? { background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }
            : { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }),
        }}>
          {toast.type === 'success' ? <Check style={{ width: 15, height: 15 }} /> : <AlertCircle style={{ width: 15, height: 15 }} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>Inventory On Hand</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>Marketplace inventory pulled from your orders</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setModal(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            color: 'white', background: 'linear-gradient(135deg,#10b981,#06b6d4)',
            border: 'none', cursor: 'pointer',
          }}
        >
          <Plus style={{ width: 16, height: 16 }} /> Add Item
        </button>
      </div>

      {/* KPI cards */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
          <KpiCard label="Total Items"  value={String(stats.total)}   icon={Package}     iconColor="#60a5fa" valueColor="#60a5fa" />
          <KpiCard label="In Stock"     value={String(stats.inStock)} icon={Package}     iconColor="#60a5fa" valueColor="#60a5fa" />
          <KpiCard label="Listed"       value={String(stats.listed)}  icon={Tag}         iconColor="#f59e0b" valueColor="#fbbf24" />
          <KpiCard label="Sold"         value={String(stats.sold)}    icon={CheckCircle} iconColor="#10b981" valueColor="#10b981" />
          <KpiCard label="Cost Basis"   value={fmt(stats.totalCost)}  icon={DollarSign}  iconColor="#f87171" valueColor="#f87171" />
          <KpiCard label="Total Profit" value={fmt(stats.profit)}     icon={DollarSign}  iconColor="#10b981" valueColor="#10b981" />
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderRadius: 12, marginBottom: 16,
          background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>{selected.size} selected</span>
          <div style={{ width: 1, height: 16, background: 'rgba(16,185,129,0.3)' }} />
          {STATUS_OPTIONS.map(s => (
            <button key={s.value} onClick={() => bulkStatus(s.value)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
              color: '#cbd5e1', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
              → {s.label}
            </button>
          ))}
          <button onClick={bulkDelete} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6,
            fontSize: 11, fontWeight: 500, color: '#f87171',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
          }}>
            <Trash2 style={{ width: 13, height: 13 }} /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} style={{
            marginLeft: 'auto', fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <X style={{ width: 13, height: 13 }} /> Clear
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{
        background: '#111827', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, padding: '14px 16px', marginBottom: 16,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#64748b', pointerEvents: 'none' }} />
            <input
              type="text" placeholder="Search products, SKUs, retailers..."
              style={{ ...filterInputStyle, paddingLeft: 34 }}
              value={search} onChange={e => setSearch(e.target.value)}
              onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          <select style={{ ...filterInputStyle, appearance: 'none' }}
            value={statusFilter} onChange={e => setStatus(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}>
            <option value="" style={{ background: '#1a2234' }}>All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value} style={{ background: '#1a2234' }}>{s.label}</option>)}
          </select>
          <select style={{ ...filterInputStyle, appearance: 'none' }}
            value={sourceFilter} onChange={e => setSource(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}>
            <option value="all" style={{ background: '#1a2234' }}>All Sources</option>
            <option value="orders" style={{ background: '#1a2234' }}>From Orders Only</option>
            <option value="manual" style={{ background: '#1a2234' }}>Manual Items Only</option>
          </select>
          <span style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{sorted.length} item{sorted.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #10b981', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : sorted.length === 0 ? (
        <div style={{
          background: '#111827', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, textAlign: 'center', padding: '80px 24px',
        }}>
          <Package style={{ width: 48, height: 48, color: '#1e293b', margin: '0 auto 12px' }} />
          <p style={{ color: '#64748b', fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No inventory items found.</p>
          <p style={{ color: '#475569', fontSize: 12 }}>Items are auto-pulled from your Purchase Orders, or add one manually.</p>
        </div>
      ) : (
        <div style={{
          background: '#111827', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <th style={{ width: 40, padding: '10px 16px' }}>
                    <button onClick={toggleAll} style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer' }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `2px solid ${allSelected ? '#10b981' : '#475569'}`,
                        background: allSelected ? '#10b981' : 'transparent',
                        transition: 'all 0.15s',
                      }}>
                        {allSelected && <Check style={{ width: 10, height: 10, color: 'white' }} />}
                      </div>
                    </button>
                  </th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>Source</th>
                  <SortTh label="Date"         sortKey="created_date"  sortConfig={sortConfig} onSort={onSort} />
                  <SortTh label="Product"       sortKey="product_name"  sortConfig={sortConfig} onSort={onSort} />
                  <SortTh label="SKU / Order #" sortKey="sku"           sortConfig={sortConfig} onSort={onSort} />
                  <SortTh label="Qty"           sortKey="quantity"      sortConfig={sortConfig} onSort={onSort} align="right" />
                  <SortTh label="Cost"          sortKey="unit_cost"     sortConfig={sortConfig} onSort={onSort} align="right" />
                  <SortTh label="List $"        sortKey="listing_price" sortConfig={sortConfig} onSort={onSort} align="right" />
                  <SortTh label="Sale"          sortKey="sale_price"    sortConfig={sortConfig} onSort={onSort} align="right" />
                  <SortTh label="Profit"        sortKey="profit"        sortConfig={sortConfig} onSort={onSort} align="right" />
                  <SortTh label="Status"        sortKey="status"        sortConfig={sortConfig} onSort={onSort} />
                  <th style={{ padding: '10px 16px', width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, idx) => {
                  const isSelected = selected.has(row.id);
                  return (
                    <tr key={row.id}
                      style={{
                        borderBottom: idx < sorted.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        background: isSelected ? 'rgba(16,185,129,0.06)' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(16,185,129,0.06)' : 'transparent'; }}
                    >
                      <td style={{ padding: '10px 16px' }}>
                        <button onClick={() => toggleSelect(row.id)} style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer' }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `2px solid ${isSelected ? '#10b981' : '#475569'}`,
                            background: isSelected ? '#10b981' : 'transparent',
                            transition: 'all 0.15s',
                          }}>
                            {isSelected && <Check style={{ width: 10, height: 10, color: 'white' }} />}
                          </div>
                        </button>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {row._source === 'order'
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
                              <ShoppingBag style={{ width: 11, height: 11 }} /> Order
                            </span>
                          : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <Package style={{ width: 11, height: 11 }} /> Manual
                            </span>
                        }
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(row.created_date || row.order_date)}</td>
                      <td style={{ padding: '10px 16px', maxWidth: 240 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.product_name}>{row.product_name}</div>
                        {row.retailer && row._source === 'order' && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{row.retailer}</div>}
                        {row.platform && <div style={{ fontSize: 11, color: '#06b6d4', marginTop: 2 }}>{row.platform}</div>}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{row.sku || '—'}</td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#e2e8f0', fontWeight: 500, textAlign: 'right' }}>{row.quantity}</td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#60a5fa', textAlign: 'right' }}>{row.unit_cost ? fmt(row.unit_cost) : '—'}</td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#fbbf24', textAlign: 'right' }}>{row.listing_price ? fmt(row.listing_price) : '—'}</td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#10b981', textAlign: 'right', fontWeight: 500 }}>{row.sale_price ? fmt(row.sale_price) : '—'}</td>
                      <td style={{
                        padding: '10px 16px', fontSize: 13, textAlign: 'right', fontWeight: 600,
                        color: row.profit != null ? (row.profit >= 0 ? '#10b981' : '#f87171') : '#334155',
                      }}>
                        {row.profit != null ? fmt(row.profit) : '—'}
                      </td>
                      <td style={{ padding: '10px 16px' }}><StatusBadge status={row.status} /></td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          <button onClick={() => openEdit(row)} title="Edit" style={{
                            padding: 6, borderRadius: 6, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer',
                          }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#10b981'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}>
                            <PenLine style={{ width: 14, height: 14 }} />
                          </button>
                          <button onClick={() => deleteOne(row)} title="Delete" style={{
                            padding: 6, borderRadius: 6, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer',
                          }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#f87171'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}>
                            <Trash2 style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.01)',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <p style={{ fontSize: 11, color: '#64748b' }}>Showing {sorted.length} item{sorted.length !== 1 ? 's' : ''}</p>
            <p style={{ fontSize: 11, color: '#475569' }}>
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