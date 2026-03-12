import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Tag, Package, CheckCircle, DollarSign, Search,
  ChevronLeft, ChevronRight, Edit2, TrendingUp, Grid3x3, Globe
} from 'lucide-react';

// Use CSS variables from theme system
const getStyles = () => ({
  BG: 'var(--bg-primary)',
  CARD_BG: 'var(--bg-card)',
  BORDER: 'var(--border-color)',
  MUTED: 'var(--text-muted)',
  TEXT_PRIMARY: 'var(--text-primary)',
  ACCENT: 'var(--accent-primary)'
});

const MODE_TABS = [
  { key: 'all', label: 'All', icon: Grid3x3 },
  { key: 'churning', label: 'Churning', icon: Tag },
  { key: 'marketplace', label: 'Marketplace', icon: Globe },
];

const PAGE_SIZE = 25;

export default function Transactions() {
  const [orders, setOrders] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState(null);

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
      base44.entities.CreditCard.list(),
    ]).then(([o, r, cc]) => {
      setOrders(o);
      setRewards(r);
      setCreditCards(cc);
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

  const styles = getStyles();
  
  const selectStyle = {
    background: styles.CARD_BG, border: `1px solid ${styles.BORDER}`, color: '#e5e7eb',
    borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none', cursor: 'pointer'
  };
  
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ color: styles.TEXT_PRIMARY }}>Transactions</h1>
        <p style={{ color: styles.MUTED, fontSize: 14 }}>Track and manage all your orders</p>
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
                : { background: 'transparent', color: styles.MUTED, border: `1px solid ${styles.BORDER}` }
              }
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6 p-3 rounded-xl" style={{ background: styles.CARD_BG, border: `1px solid ${styles.BORDER}` }}>
        <div className="flex items-center gap-2 flex-1 min-w-40 rounded-lg px-3 py-2" style={{ background: styles.BG, border: `1px solid ${styles.BORDER}` }}>
          <Search size={13} color={styles.MUTED} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products..."
            className="bg-transparent outline-none text-sm flex-1"
            style={{ color: styles.TEXT_PRIMARY }}
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ ...selectStyle, background: styles.CARD_BG, border: `1px solid ${styles.BORDER}`, color: styles.TEXT_PRIMARY }}>
          <option value="all">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>)}
        </select>
        <select value={vendorFilter} onChange={e => { setVendorFilter(e.target.value); setPage(1); }} style={{ ...selectStyle, background: styles.CARD_BG, border: `1px solid ${styles.BORDER}`, color: styles.TEXT_PRIMARY }}>
          <option value="all">All Vendors</option>
          {vendors.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={platformFilter} onChange={e => { setPlatformFilter(e.target.value); setPage(1); }} style={{ ...selectStyle, background: styles.CARD_BG, border: `1px solid ${styles.BORDER}`, color: styles.TEXT_PRIMARY }}>
          <option value="all">All Platforms</option>
          {platforms.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <SummaryCard label="Total Items" value={summary.totalItems} icon={<Package size={16} />} style={styles} />
        <SummaryCard label="Listed" value={summary.listed} icon={<Tag size={16} />} style={styles} />
        <SummaryCard label="Sold" value={summary.sold} icon={<CheckCircle size={16} />} style={styles} />
        <SummaryCard label="Total Cost" value={fmt(summary.totalCost)} icon={<DollarSign size={16} />} style={styles} />
        <SummaryCard label="Total Profit" value={fmt(summary.totalProfit)} icon={<TrendingUp size={16} />} style={styles} />
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${styles.BORDER}` }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: styles.CARD_BG }}>
                {['DATE', 'PRODUCT', 'VENDOR', 'QTY', 'COST', 'SALE', 'PROFIT', 'STATUS'].map(col => (
                  <th key={col} className="px-4 py-3 text-left" style={{ color: styles.MUTED, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                    {col}
                  </th>
                ))}
                <th className="px-4 py-3 text-center" style={{ width: 60, color: styles.MUTED, fontSize: 11, fontWeight: 700 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12" style={{ color: styles.MUTED }}>Loading...</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12" style={{ color: styles.MUTED }}>No transactions found</td>
                </tr>
              ) : paginated.map((order, idx) => {
                const productName = (order.items || []).map(i => i.product_name).filter(Boolean).join(', ') || order.order_number;
                const qty = (order.items || []).reduce((s, i) => s + (i.quantity_ordered || 0), 0) || 1;
                const cost = order.final_cost ?? order.total_cost;
                const sale = order.sale_price;
                const cashback = rewardsByOrder[order.id];
                const profit = (sale != null && cost != null) ? (sale - cost + (cashback || 0)) : null;
                const statusStyle = { 'pending': '#60a5fa', 'shipped': '#fbbf24', 'completed': '#4ade80', 'cancelled': '#f87171' }[order.status] || styles.MUTED;
                
                return (
                  <tr
                    key={order.id}
                    style={{ background: idx % 2 === 0 ? styles.CARD_BG : 'transparent', borderBottom: `1px solid ${styles.BORDER}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = styles.BG}
                    onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? styles.CARD_BG : 'transparent'}
                  >
                    <td className="px-4 py-3 text-sm" style={{ color: styles.MUTED, whiteSpace: 'nowrap' }}>{fmtDate(order.order_date)}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate" style={{ color: styles.TEXT_PRIMARY }} title={productName}>{productName || '—'}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: styles.TEXT_PRIMARY }}>{order.retailer || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: styles.TEXT_PRIMARY }}>{qty}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: '#f87171' }}>{fmt(cost)}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: styles.TEXT_PRIMARY }}>{sale != null ? fmt(sale) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: profit == null ? styles.MUTED : profit >= 0 ? '#4ade80' : '#f87171' }}>
                      {profit == null ? '—' : fmt(profit)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ background: statusStyle + '22', color: statusStyle }}>
                        {(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setEditingOrder(order)} className="p-1 hover:opacity-70 transition-opacity" title="Edit">
                        <Edit2 size={14} style={{ color: styles.ACCENT }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${styles.BORDER}`, background: styles.CARD_BG }}>
          <span style={{ color: styles.MUTED, fontSize: 13 }}>
            {filtered.length === 0 ? 'No results' : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ background: styles.BG, border: `1px solid ${styles.BORDER}`, borderRadius: 6, padding: '4px 8px', color: page === 1 ? styles.BORDER : styles.TEXT_PRIMARY, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ color: styles.MUTED, fontSize: 13 }}>Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ background: styles.BG, border: `1px solid ${styles.BORDER}`, borderRadius: 6, padding: '4px 8px', color: page === totalPages ? styles.BORDER : styles.TEXT_PRIMARY, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingOrder && <EditTransactionModal order={editingOrder} creditCards={creditCards} onClose={() => setEditingOrder(null)} onSave={() => setEditingOrder(null)} />}
    </div>
  );
}

function EditTransactionModal({ order, creditCards, onClose, onSave }) {
  const [form, setForm] = useState({
    productName: (order.items?.[0]?.product_name || ''),
    status: order.status || 'pending',
    vendor: order.retailer || '',
    buyer: order.platform || '',
    date: order.order_date || '',
    unitPrice: order.items?.[0]?.unit_cost || 0,
    quantity: order.items?.[0]?.quantity_ordered || 1,
    tax: order.total_cost ? (order.total_cost - (order.items?.[0]?.unit_cost || 0) * (order.items?.[0]?.quantity_ordered || 1)) * 0.1 : 0,
    taxRate: 10,
    shipping: 0,
    fees: 0,
    creditCard: order.credit_card_id || '',
    cashbackRate: order.extra_cashback_percent || 0,
    includeTax: true,
    includeShipping: false,
    amazonYaCB: 0,
    giftCard: 0,
    salePrice: order.sale_price || 0,
    saleDate: '',
    payoutDate: '',
    notes: order.notes || '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const totalPrice = useMemo(() => parseFloat(form.unitPrice) * parseInt(form.quantity) || 0, [form.unitPrice, form.quantity]);
  const calculatedTax = useMemo(() => totalPrice * (parseFloat(form.taxRate) / 100) || 0, [totalPrice, form.taxRate]);
  
  const cashbackBase = useMemo(() => {
    let base = totalPrice;
    if (form.includeTax) base += calculatedTax;
    if (form.includeShipping) base += parseFloat(form.shipping) || 0;
    return base;
  }, [totalPrice, calculatedTax, form.includeTax, form.includeShipping, form.shipping]);

  const cashbackAmount = useMemo(() => {
    let rate = parseFloat(form.cashbackRate) || 0;
    if (form.amazonYaCB) rate += parseFloat(form.amazonYaCB) || 0;
    return (cashbackBase * (rate / 100)).toFixed(2);
  }, [cashbackBase, form.cashbackRate, form.amazonYaCB]);

  const totalCost = useMemo(() => {
    const cost = totalPrice + calculatedTax + (parseFloat(form.shipping) || 0) + (parseFloat(form.fees) || 0) - (parseFloat(form.giftCard) || 0);
    return cost.toFixed(2);
  }, [totalPrice, calculatedTax, form.shipping, form.fees, form.giftCard]);

  const commission = useMemo(() => {
    if (!form.salePrice) return 0;
    return (parseFloat(form.salePrice) - totalCost).toFixed(2);
  }, [form.salePrice, totalCost]);

  const netProfit = useMemo(() => {
    if (!form.salePrice) return 0;
    return (parseFloat(form.salePrice) - totalCost + parseFloat(cashbackAmount)).toFixed(2);
  }, [form.salePrice, totalCost, cashbackAmount]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="max-w-2xl max-h-[90vh] overflow-y-auto w-full rounded-xl" style={{ background: 'var(--bg-card)', border: `1px solid var(--border-color)` }}>
        <div className="sticky top-0 border-b p-6" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Edit Transaction</h2>
            <button onClick={onClose} className="text-2xl leading-none" style={{ color: 'var(--text-muted)' }}>×</button>
          </div>
        </div>

        <div className="p-6 space-y-6" style={{ background: 'var(--bg-primary)' }}>
          {/* SECTION 1: TOP INFO */}
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Field label="Product Name *">
                <InputEl value={form.productName} onChange={e => set('productName', e.target.value)} placeholder="Product name" />
              </Field>
              <Field label="Status">
                <SelectEl value={form.status} onChange={e => set('status', e.target.value)}>
                  {['pending', 'purchased', 'shipped', 'delivered', 'completed', 'cancelled'].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </SelectEl>
              </Field>
            </div>

            <div className="mb-4">
              <label className="text-xs uppercase font-bold tracking-wider text-[rgba(255,255,255,0.4)] block mb-3">Transaction Type</label>
              <div className="flex gap-2">
                {['auto', 'churning', 'marketplace'].map(m => (
                  <button key={m} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${m === 'auto' ? 'bg-purple-600 text-white' : 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.6)]'}`}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[rgba(255,255,255,0.3)] mt-2">Override which tab this transaction appears under. Auto uses the buyer type.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Vendor">
                <InputEl value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="Vendor" />
              </Field>
              <Field label="Buyer/Platform">
                <InputEl value={form.buyer} onChange={e => set('buyer', e.target.value)} placeholder="Buyer" />
              </Field>
              <Field label="Date">
                <InputEl type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              </Field>
              <Field label="Category">
                <SelectEl value="" onChange={() => {}}>
                  <option>Select category</option>
                </SelectEl>
              </Field>
            </div>
          </div>

          {/* SECTION 2: PURCHASE DETAILS */}
          <div className="border-t border-[rgba(255,255,255,0.08)] pt-6">
            <h3 className="text-xs uppercase font-bold tracking-wider text-purple-400 mb-4">Purchase Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Unit Price">
                  <div className="flex items-center border border-[rgba(255,255,255,0.1)] rounded-[10px] bg-[rgba(255,255,255,0.05)]">
                    <span className="px-3 text-[rgba(255,255,255,0.3)]">$</span>
                    <input type="number" style={{ background: 'transparent', outline: 'none', color: '#fff', flex: 1, padding: '10px 0' }} value={form.unitPrice} onChange={e => set('unitPrice', e.target.value)} />
                  </div>
                </Field>
                <Field label="Qty">
                  <input type="number" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', borderRadius: 10, padding: '10px 12px' }} value={form.quantity} onChange={e => set('quantity', e.target.value)} min={1} />
                </Field>
                <Field label="Total">
                  <div className="flex items-center border border-[rgba(255,255,255,0.1)] rounded-[10px] bg-[rgba(255,255,255,0.02)]">
                    <span className="px-3 text-[rgba(255,255,255,0.3)]">$</span>
                    <input type="text" style={{ background: 'transparent', outline: 'none', color: '#fff', flex: 1, padding: '10px 0' }} value={totalPrice.toFixed(2)} disabled />
                  </div>
                </Field>
                <Field label="Tax Rate %">
                  <input type="number" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', borderRadius: 10, padding: '10px 12px' }} value={form.taxRate} onChange={e => set('taxRate', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Shipping ($)">
                  <input type="number" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', borderRadius: 10, padding: '10px 12px' }} value={form.shipping} onChange={e => set('shipping', e.target.value)} placeholder="0.00" />
                </Field>
                <Field label="Fees ($)">
                  <input type="number" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', borderRadius: 10, padding: '10px 12px' }} value={form.fees} onChange={e => set('fees', e.target.value)} placeholder="0.00" />
                </Field>
                <Field label="Tax ($)">
                  <div className="flex items-center border border-[rgba(255,255,255,0.1)] rounded-[10px] bg-[rgba(255,255,255,0.02)]">
                    <span className="px-3 text-[rgba(255,255,255,0.3)]">$</span>
                    <input type="text" style={{ background: 'transparent', outline: 'none', color: '#fff', flex: 1, padding: '10px 0' }} value={calculatedTax.toFixed(2)} disabled />
                  </div>
                </Field>
              </div>
            </div>
          </div>

          {/* SECTION 3: CASHBACK DETAILS */}
          <div className="border-t border-[rgba(255,255,255,0.08)] pt-6">
            <h3 className="text-xs uppercase font-bold tracking-wider text-purple-400 mb-4">Cashback Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Payment Method">
                  <SelectEl value={form.creditCard} onChange={e => set('creditCard', e.target.value)}>
                    <option value="">Select card</option>
                    {creditCards.map(c => <option key={c.id} value={c.id}>{c.card_name}</option>)}
                  </SelectEl>
                </Field>
                <Field label="Cashback %">
                  <input type="number" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', borderRadius: 10, padding: '10px 12px' }} value={form.cashbackRate} onChange={e => set('cashbackRate', e.target.value)} placeholder="0.0" />
                </Field>
                <Field label="Cashback $">
                  <div className="flex items-center border border-[rgba(255,255,255,0.1)] rounded-[10px] bg-[rgba(255,255,255,0.02)]">
                    <span className="px-3 text-green-400">$</span>
                    <input type="text" style={{ background: 'transparent', outline: 'none', color: '#4ade80', flex: 1, padding: '10px 0', fontWeight: 'bold' }} value={cashbackAmount} disabled />
                  </div>
                </Field>
              </div>
              <p className="text-xs text-[rgba(255,255,255,0.3)]">Auto-calculated from % & flags</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.includeTax} onChange={e => set('includeTax', e.target.checked)} className="w-4 h-4 accent-purple-500" />
                  <span className="text-sm text-white">Include tax in cashback</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.includeShipping} onChange={e => set('includeShipping', e.target.checked)} className="w-4 h-4 accent-purple-500" />
                  <span className="text-sm text-white">Include shipping in cashback</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Amazon YA CB %">
                  <input type="number" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', borderRadius: 10, padding: '10px 12px' }} value={form.amazonYaCB} onChange={e => set('amazonYaCB', e.target.value)} placeholder="e.g. 5" />
                  <p className="text-xs text-[rgba(255,255,255,0.3)] mt-1">Young Adult cashback rate (Amazon only)</p>
                </Field>
                <Field label="Gift Card Used ($)">
                  <input type="number" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', borderRadius: 10, padding: '10px 12px' }} value={form.giftCard} onChange={e => set('giftCard', e.target.value)} placeholder="0.00" />
                  <p className="text-xs text-[rgba(255,255,255,0.3)] mt-1">Amount paid via vendor gift card</p>
                </Field>
              </div>
            </div>
          </div>

          {/* SECTION 4: SALE DETAILS */}
          <div className="border-t border-[rgba(255,255,255,0.08)] pt-6">
            <h3 className="text-xs uppercase font-bold tracking-wider text-green-400 mb-4">Sale Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Sale Price (Total)">
                  <div className="flex items-center border border-[rgba(255,255,255,0.1)] rounded-[10px] bg-[rgba(255,255,255,0.05)]">
                    <span className="px-3 text-[rgba(255,255,255,0.3)]">$</span>
                    <input type="number" style={{ background: 'transparent', outline: 'none', color: '#fff', flex: 1, padding: '10px 0' }} value={form.salePrice} onChange={e => set('salePrice', e.target.value)} />
                  </div>
                  {form.salePrice && form.quantity && (
                    <p className="text-xs text-green-400 mt-2">${(parseFloat(form.salePrice) / parseInt(form.quantity)).toFixed(2)}/unit</p>
                  )}
                  <button className="text-purple-400 text-xs mt-2">Switch to per unit</button>
                </Field>
                <Field label="Commission">
                  <div className="flex items-center border border-[rgba(255,255,255,0.1)] rounded-[10px] bg-[rgba(255,255,255,0.02)]">
                    <span className="px-3 text-amber-400">$</span>
                    <input type="text" style={{ background: 'transparent', outline: 'none', color: '#fbbf24', flex: 1, padding: '10px 0', fontWeight: 'bold' }} value={commission} disabled />
                  </div>
                  <p className="text-xs text-[rgba(255,255,255,0.3)] mt-1">Auto: sale - cost</p>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Sale Date">
                  <InputEl type="date" value={form.saleDate} onChange={e => set('saleDate', e.target.value)} />
                </Field>
                <Field label="Payout Date">
                  <InputEl type="date" value={form.payoutDate} onChange={e => set('payoutDate', e.target.value)} />
                </Field>
              </div>
            </div>
          </div>

          {/* SECTION 5: NOTES */}
          <div className="border-t border-[rgba(255,255,255,0.08)] pt-6">
            <label className="text-xs uppercase font-bold tracking-wider text-[rgba(255,255,255,0.4)] block mb-3">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes..." rows={3} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', borderRadius: 10, padding: '10px 12px', fontFamily: 'inherit', resize: 'vertical' }} />
          </div>

          {/* SUMMARY */}
          <div className="modal-premium p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[rgba(255,255,255,0.6)]">Cost of Goods:</span>
              <span className="text-white font-semibold">${totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[rgba(255,255,255,0.6)]">Total Cost:</span>
              <span className="text-purple-300 font-bold">${totalCost}</span>
            </div>
            {form.salePrice && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-[rgba(255,255,255,0.6)]">Sell For:</span>
                  <span className="text-green-400 font-bold">${form.salePrice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[rgba(255,255,255,0.6)]">Cashback:</span>
                  <span className="text-green-400 font-bold">+${cashbackAmount}</span>
                </div>
                <div className="border-t border-[rgba(255,255,255,0.1)] pt-2 mt-2 flex justify-between">
                  <span className="text-[rgba(255,255,255,0.6)] font-semibold">Net Profit:</span>
                  <span className="text-green-400 text-lg font-bold">+${netProfit}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-[rgba(255,255,255,0.08)] p-6 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.08)] transition-all">
            Cancel
          </button>
          <button onClick={onSave} className="px-6 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-all font-medium">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs uppercase font-bold tracking-wider text-[rgba(255,255,255,0.4)] mb-2 block">{label}</label>
      {children}
    </div>
  );
}

function InputEl({ ...props }) {
  return <input style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 14, width: '100%' }} {...props} />;
}

function SelectEl({ children, ...props }) {
  return <select style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 14, width: '100%', cursor: 'pointer' }} {...props}>{children}</select>;
}

function SummaryCard({ label, value, icon, style }) {
  return (
    <div className="rounded-xl p-4" style={{ background: style.CARD_BG, border: `1px solid ${style.BORDER}` }}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: style.ACCENT }}>{icon}</span>
        <span style={{ color: style.MUTED, fontSize: 12, fontWeight: 600 }}>{label}</span>
      </div>
      <div className="text-xl font-bold" style={{ color: style.TEXT_PRIMARY }}>{value}</div>
    </div>
  );
}