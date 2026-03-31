import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, Edit2, Trash2, ImageOff } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// ── Store logo gradients ──────────────────────────────────────────────────
const STORE_GRADIENTS = {
  'amazon':   'linear-gradient(135deg,#f97316,#ea580c)',
  'best buy': 'linear-gradient(135deg,#1d4ed8,#1e3a8a)',
  'bestbuy':  'linear-gradient(135deg,#1d4ed8,#1e3a8a)',
  'walmart':  'linear-gradient(135deg,#0071ce,#004c97)',
  'apple':    'linear-gradient(135deg,#6b7280,#374151)',
  'target':   'linear-gradient(135deg,#cc0000,#990000)',
  'costco':   'linear-gradient(135deg,#005dab,#003d7a)',
};
const DEFAULT_GRADIENT = 'linear-gradient(135deg,#10b981,#06b6d4)';

const getStoreGradient = (retailer) => {
  if (!retailer) return DEFAULT_GRADIENT;
  return STORE_GRADIENTS[retailer.toLowerCase()] || DEFAULT_GRADIENT;
};

// ── Status badge ─────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:            { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  ordered:            { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  shipped:            { bg: 'rgba(168,85,247,0.12)',  color: '#c084fc', border: 'rgba(168,85,247,0.25)' },
  partially_received: { bg: 'rgba(251,146,60,0.12)',  color: '#fb923c', border: 'rgba(251,146,60,0.25)' },
  received:           { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', border: 'rgba(16,185,129,0.25)' },
  cancelled:          { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.25)' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'rgba(255,255,255,0.1)' };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {status?.replace(/_/g, ' ') || '—'}
    </span>
  );
}

function fmt$(n) { return `$${(parseFloat(n) || 0).toFixed(2)}`; }

// ── Item image ────────────────────────────────────────────────────────────
function ItemImg({ src, name }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div style={{
        width: 40, height: 40, borderRadius: 8, flexShrink: 0,
        background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#10b981', fontSize: 14, fontWeight: 700,
      }}>
        {name?.charAt(0)?.toUpperCase() || <ImageOff style={{ width: 14, height: 14 }} />}
      </div>
    );
  }
  return (
    <img src={src} alt={name} onError={() => setErr(true)}
      style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} />
  );
}

// ── Stat column ───────────────────────────────────────────────────────────
function StatCol({ label, value, color = '#e2e8f0' }) {
  return (
    <div style={{ textAlign: 'right', minWidth: 0 }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#64748b', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color, whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

// ── Single order card ─────────────────────────────────────────────────────
function OrderCard({ order, creditCards, rewards, onEdit, onDelete, isSelected, onToggleSelect }) {
  const [expanded, setExpanded] = useState(true);

  const card = creditCards.find(c => c.id === order.credit_card_id);
  const orderRewards = rewards.filter(r => r.purchase_order_id === order.id);
  const cashback = orderRewards.filter(r => r.currency === 'USD').reduce((s, r) => s + (r.amount || 0), 0);
  const totalCost = order.final_cost || order.total_cost || 0;
  const totalSale = order.items?.reduce((s, it) => s + (parseFloat(it.sale_price) || 0) * (parseInt(it.quantity_ordered) || 1), 0) || 0;
  const profit = totalSale > 0 ? totalSale - totalCost + cashback : cashback;
  const profitColor = profit >= 0 ? '#10b981' : '#f87171';
  const itemCount = order.items?.length || 0;
  const totalQty = order.items?.reduce((s, it) => s + (parseInt(it.quantity_ordered) || 1), 0) || 0;
  const initials = (order.retailer || 'X').slice(0, 2).toUpperCase();
  const orderDate = order.order_date ? (() => { try { return format(parseISO(order.order_date), 'MMM d, yyyy'); } catch { return order.order_date; } })() : '—';

  const paymentLabel = order.payment_splits?.length > 1
    ? `${order.payment_splits.length} cards`
    : (card?.card_name || order.card_name || null);

  return (
    <div style={{
      background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14,
      marginBottom: 10, transition: 'border-color 0.15s', overflow: 'hidden',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
    >
      {/* ── Header row ── */}
      <div
        onClick={() => setExpanded(p => !p)}
        style={{
          background: 'rgba(255,255,255,0.02)', padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none',
        }}
      >
        {/* Checkbox */}
        <div onClick={e => { e.stopPropagation(); onToggleSelect(order.id); }}
          style={{ flexShrink: 0, padding: 2 }}>
          <input type="checkbox" checked={isSelected} readOnly
            style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#10b981' }} />
        </div>

        {/* Store logo */}
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: getStoreGradient(order.retailer),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: 'white', letterSpacing: '0.02em',
        }}>
          {initials}
        </div>

        {/* Order info */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {order.order_number ? `#${order.order_number}` : (order.retailer || 'Unknown')}
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>
              {order.order_number && order.retailer ? `${order.retailer} · ` : ''}{orderDate}
            </span>
          </div>
        </div>

        {/* Item count badge */}
        {itemCount > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)',
            flexShrink: 0,
          }}>
            {totalQty} item{totalQty !== 1 ? 's' : ''}
          </span>
        )}

        {/* Right stats */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
          <StatCol label="Cost" value={fmt$(totalCost)} color="#60a5fa" />
          {cashback > 0 && <StatCol label="Cashback" value={fmt$(cashback)} color="#06b6d4" />}
          {(totalSale > 0 || profit !== 0) && <StatCol label="Profit" value={fmt$(profit)} color={profitColor} />}
          {paymentLabel && <StatCol label="Payment" value={paymentLabel} color="#94a3b8" />}
          <StatusBadge status={order.status} />
          <ChevronDown style={{
            width: 16, height: 16, color: '#64748b', flexShrink: 0,
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s ease',
          }} />
        </div>
      </div>

      {/* ── Items list ── */}
      {expanded && itemCount > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {order.items.map((item, idx) => {
            const unitCost = parseFloat(item.unit_cost) || 0;
            const salePrice = parseFloat(item.sale_price) || 0;
            const qty = parseInt(item.quantity_ordered) || 1;
            const itemProfit = salePrice > 0 ? (salePrice - unitCost) * qty : null;
            const itemProfitColor = itemProfit !== null ? (itemProfit >= 0 ? '#10b981' : '#f87171') : null;
            return (
              <div key={idx} style={{
                padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: idx < order.items.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                background: 'transparent',
              }}>
                <div style={{ width: 38, flexShrink: 0 }}></div>{/* spacer for checkbox */}
                <div style={{ width: 38, flexShrink: 0 }}></div>{/* spacer for logo */}
                <ItemImg src={item.product_image_url} name={item.product_name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.product_name || '—'}
                  </div>
                  {item.upc && <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>{item.upc}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
                  <StatCol label="Qty" value={qty} color="#e2e8f0" />
                  <StatCol label="Cost/unit" value={fmt$(unitCost)} color="#60a5fa" />
                  <StatCol label="Sale/unit" value={salePrice > 0 ? fmt$(salePrice) : '—'} color={salePrice > 0 ? '#10b981' : '#475569'} />
                  <StatCol label="Profit" value={itemProfit !== null ? fmt$(itemProfit) : '—'} color={itemProfit !== null ? itemProfitColor : '#475569'} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.01)',
        padding: '8px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', rowGap: 2 }}>
          <span>Total: <span style={{ color: '#60a5fa', fontWeight: 600 }}>{fmt$(totalCost)}</span></span>
          {cashback > 0 && <><span style={{ margin: '0 6px' }}>·</span><span>CB: <span style={{ color: '#06b6d4', fontWeight: 600 }}>{fmt$(cashback)}</span></span></>}
          {order.order_number && <><span style={{ margin: '0 6px' }}>·</span><span>Order #: <span style={{ color: '#94a3b8' }}>{order.order_number}</span></span></>}
          {order.buyer && <><span style={{ margin: '0 6px' }}>·</span><span>Buyer: <span style={{ color: '#94a3b8' }}>{order.buyer}</span></span></>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit(order); }}
            style={{
              fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
            <Edit2 style={{ width: 11, height: 11 }} /> Edit
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(order); }}
            style={{
              fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
            <Trash2 style={{ width: 11, height: 11 }} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────
const PAGE_SIZE = 25;

export default function OrderGroupedCards({
  data = [], creditCards = [], rewards = [],
  onEdit, onDelete, isLoading,
  selectedIds, onSelectionChange,
  onClearFilters,
}) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const paged = useMemo(() => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [data, page]);

  // Reset page when data changes
  useEffect(() => { setPage(1); }, [data.length]);

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange(next);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ height: 72, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', animation: 'pulse 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', borderRadius: 14, background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
        <p style={{ color: '#64748b', fontSize: 15, fontWeight: 500, marginBottom: 8 }}>No orders found</p>
        <p style={{ color: '#475569', fontSize: 13, marginBottom: 16 }}>Try adjusting your filters</p>
        {onClearFilters && (
          <button onClick={onClearFilters}
            style={{ fontSize: 13, fontWeight: 600, color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div>
        {paged.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            creditCards={creditCards}
            rewards={rewards}
            onEdit={onEdit}
            onDelete={onDelete}
            isSelected={selectedIds.has(order.id)}
            onToggleSelect={toggleSelect}
          />
        ))}
      </div>

      {/* Pagination */}
      {data.length > PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '12px 0' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.length)} of {data.length} orders
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page === 1 ? '#475569' : '#94a3b8' }}>
              ← Prev
            </button>
            <span style={{ padding: '6px 12px', fontSize: 12, color: '#64748b' }}>{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page === totalPages ? '#475569' : '#94a3b8' }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}