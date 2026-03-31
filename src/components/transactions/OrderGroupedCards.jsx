import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, Edit2, Trash2, ImageOff } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// ── Brandfetch client ID ───────────────────────────────────────────────────
const BRANDFETCH_CLIENT_ID = '1idzVIG0BYPKsFIDJDI';

// ── Store domain mapping & brand colors ─────────────────────────────────
const STORE_BRAND_COLORS = {
  'Amazon': '#f97316',
  'Best Buy': '#1d4ed8',
  'Walmart': '#0071ce',
  'Apple': '#374151',
  'Target': '#cc0000',
  'Costco': '#005dab',
  "Sam's Club": '#007dc6',
  'eBay': '#e53238',
};

const getStoreDomain = (vendorName) => {
  if (!vendorName) return null;
  const n = String(vendorName || '')
    .toLowerCase()
    .replace(/[\s\-\_\.\']/g, '')
    .replace(/[^a-z0-9]/g, '');

  if (n.includes('bestbuy')) return 'bestbuy.com';
  if (n.includes('amazon')) return 'amazon.com';
  if (n.includes('walmart')) return 'walmart.com';
  if (n.includes('apple')) return 'apple.com';
  if (n.includes('target')) return 'target.com';
  if (n.includes('costco')) return 'costco.com';
  if (n.includes('samsclub') || n.includes('sams')) return 'samsclub.com';
  if (n.includes('ebay')) return 'ebay.com';
  if (n.includes('woot')) return 'woot.com';
  if (n.includes('newegg')) return 'newegg.com';
  if (n.includes('staples')) return 'staples.com';
  if (n.includes('homedepot')) return 'homedepot.com';
  if (n.includes('lowes')) return 'lowes.com';
  return n + '.com';
};

const getStoreBrandColor = (retailer) => {
  if (!retailer) return 'linear-gradient(135deg,#10b981,#06b6d4)';
  return STORE_BRAND_COLORS[retailer] || 'linear-gradient(135deg,#10b981,#06b6d4)';
};

const getBrandfetchUrl = (domain) => {
  if (!domain) return null;
  return `https://cdn.brandfetch.io/domain/${domain}?c=${BRANDFETCH_CLIENT_ID}`;
};

// ── Store logo component ──────────────────────────────────────────────────
function StoreLogo({ retailer, size = 40 }) {
  const [err, setErr] = useState(false);
  const domain = getStoreDomain(retailer);
  const logoUrl = getBrandfetchUrl(domain);
  const initials = (retailer || 'X').slice(0, 2).toUpperCase();

  if (!logoUrl || err) {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #10b981, #06b6d4)',
        color: 'white',
        fontWeight: 800,
        fontSize: 14,
        flexShrink: 0,
      }}>
        {initials}
      </div>
    );
  }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <img
        src={logoUrl}
        alt={retailer}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        onError={() => setErr(true)}
      />
    </div>
  );
}



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
function ItemImg({ src, name, qty = 1 }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#10b981', fontSize: 14, fontWeight: 700,
        }}>
          {name?.charAt(0)?.toUpperCase() || <ImageOff style={{ width: 14, height: 14 }} />}
        </div>
        {qty > 1 && (
          <div style={{
            position: 'absolute', bottom: -4, right: -4,
            width: 18, height: 18, borderRadius: '50%',
            background: '#06b6d4', border: '2px solid #111827',
            color: 'white', fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10,
          }}>
            {qty}
          </div>
        )}
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
      <img src={src} alt={name} onError={() => setErr(true)}
        style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', display: 'block' }} />
      {qty > 1 && (
        <div style={{
          position: 'absolute', bottom: -4, right: -4,
          width: 18, height: 18, borderRadius: '50%',
          background: '#06b6d4', border: '2px solid #111827',
          color: 'white', fontSize: 10, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}>
          {qty}
        </div>
      )}
    </div>
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
function OrderCard({ order, creditCards, rewards, products = [], onEdit, onDelete, isSelected, onToggleSelect }) {
  const [expanded, setExpanded] = useState(true);

  const card = creditCards.find(c => c.id === order.credit_card_id);
  const orderRewards = rewards.filter(r => r.purchase_order_id === order.id);
  const cashback = orderRewards.filter(r => r.currency === 'USD').reduce((s, r) => s + (r.amount || 0), 0);
  const totalCost = order.final_cost || order.total_cost || 0;
  
  // Calculate revenue from sale_events
  const totalRevenue = order.sale_events?.reduce(
    (sum, event) => sum + (event.items?.reduce(
      (s, item) => s + ((parseFloat(item.sale_price) || 0) * (parseInt(item.quantity) || 1)), 0
    ) || 0), 0
  ) || 0;
  
  // Profit calculation: only show if sales exist
  const hasSales = totalRevenue > 0;
  const profit = hasSales ? totalRevenue - totalCost + cashback : 0;
  const profitColor = hasSales ? (profit >= 0 ? '#10b981' : '#f87171') : '#475569';
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
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none',
          flexWrap: 'wrap', '@media (max-width: 768px)': { gap: 8 }
        }}
      >
        {/* Checkbox */}
        <div onClick={e => { e.stopPropagation(); onToggleSelect(order.id); }}
          style={{ flexShrink: 0, padding: 2 }}>
          <input type="checkbox" checked={isSelected} readOnly
            style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#10b981' }} />
        </div>

        {/* Store logo */}
        <StoreLogo retailer={order.retailer} size={32} />

        {/* Order info */}
        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 4 }}>
            {order.order_number ? (
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`#${order.order_number}`}>
                #{order.order_number}
              </span>
            ) : (order.retailer || 'Unknown')}
          </div>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 400, whiteSpace: 'nowrap' }}>
            {order.order_number && order.retailer ? `${order.retailer} · ` : ''}{orderDate}
          </span>
        </div>

        {/* Item count badge */}
        {itemCount > 0 && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 12,
            background: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)',
            flexShrink: 0,
          }}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* Right stats - compact pills */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, color: '#e2e8f0' }}>
            <span style={{ color: '#60a5fa', fontWeight: 700 }}>{fmt$(totalCost)}</span>
            <span style={{ display: 'none', '@media (min-width: 769px)': { display: 'inline' }, color: '#64748b' }}>·</span>
            {totalRevenue > 0 && (
              <>
                <span style={{ display: 'none', '@media (min-width: 769px)': { display: 'inline' }, color: '#10b981', fontWeight: 700 }}>{fmt$(totalRevenue)}</span>
                <span style={{ display: 'none', '@media (min-width: 769px)': { display: 'inline' }, color: '#64748b' }}>·</span>
              </>
            )}
            {hasSales ? (
              <span style={{ color: profitColor, fontWeight: 700 }}>{fmt$(profit)}</span>
            ) : (
              <span style={{ color: '#64748b' }}>—</span>
            )}
            {paymentLabel && (
              <>
                <span style={{ display: 'none', '@media (min-width: 769px)': { display: 'inline' }, color: '#64748b' }}>·</span>
                <span style={{ display: 'none', '@media (min-width: 769px)': { display: 'inline' }, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#94a3b8' }} title={paymentLabel}>
                  {paymentLabel}
                </span>
              </>
            )}
          </div>
          <StatusBadge status={order.status} />
          <ChevronRight style={{
            width: 14, height: 14, color: '#64748b', flexShrink: 0, marginLeft: 4,
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }} />
        </div>
      </div>

      {/* ── Items list ── */}
      {expanded && itemCount > 0 && (
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {order.items.map((item, idx) => {
          const unitCost = parseFloat(item.unit_cost) || 0;
          const qty = parseInt(item.quantity_ordered) || 1;
          const imageUrl = item.product_image_url || products.find(p => p.id === item.product_id)?.image;

          // Find all sales for this item across all events
          const itemSales = order.sale_events?.flatMap(e => 
            (e.items || [])
              .filter(si => si.product_name?.toLowerCase() === item.product_name?.toLowerCase())
              .map(si => ({ ...si, buyer: e.buyer }))
          ) || [];

          const hasSales = itemSales.length > 0;
          const isSingleBuyer = itemSales.length <= 1;

          return (
            <div key={idx}>
              {isSingleBuyer ? (
                // Single row for 0 or 1 sale
                <div style={{
                  padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                  borderBottom: idx < order.items.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                  background: 'transparent',
                }}>
                  <div style={{ width: 38, flexShrink: 0 }}></div>
                  <div style={{ width: 38, flexShrink: 0 }}></div>
                  <ItemImg src={imageUrl} name={item.product_name} qty={qty} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.product_name || '—'}
                    </div>
                    {item.upc && <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>{item.upc}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
                    <StatCol label="Qty" value={qty} color="#e2e8f0" />
                    <StatCol label="Cost/unit" value={fmt$(unitCost)} color="#60a5fa" />
                    {hasSales ? (
                      <>
                        <StatCol label="Sale/unit" value={fmt$(parseFloat(itemSales[0].sale_price) || 0)} color="#10b981" />
                        <StatCol label="Profit" value={fmt$((parseFloat(itemSales[0].sale_price) || 0 - unitCost) * qty)} color="#10b981" />
                      </>
                    ) : (
                      <>
                        <StatCol label="Sale/unit" value="—" color="#475569" />
                        <StatCol label="Profit" value="—" color="#475569" />
                      </>
                    )}
                  </div>
                </div>
              ) : (
                // Multiple buyer rows
                <div style={{ borderBottom: idx < order.items.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                  {/* Header row with product name */}
                  <div style={{
                    padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                    background: 'transparent',
                  }}>
                    <div style={{ width: 38, flexShrink: 0 }}></div>
                    <div style={{ width: 38, flexShrink: 0 }}></div>
                    <ItemImg src={imageUrl} name={item.product_name} qty={qty} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.product_name || '—'}
                      </div>
                      {item.upc && <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>{item.upc}</div>}
                    </div>
                    <div style={{ width: 200 }}></div>
                  </div>
                  {/* Individual sale rows */}
                  {itemSales.map((sale, sIdx) => {
                    const saleQty = parseInt(sale.quantity) || 1;
                    const salePrice = parseFloat(sale.sale_price) || 0;
                    const profit = (salePrice - unitCost) * saleQty;
                    return (
                      <div key={sIdx} style={{
                        paddingLeft: '8px', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px',
                        display: 'flex', alignItems: 'center', gap: 10,
                        borderLeft: '2px solid rgba(16,185,129,0.3)',
                        background: 'transparent',
                      }}>
                        <div style={{ width: 76 + 10 }}></div>
                        <div style={{ width: 40, flexShrink: 0 }}></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: '#06b6d4', fontWeight: 500 }}>
                            {sale.buyer || 'Unknown'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
                          <StatCol label="Qty" value={saleQty} color="#e2e8f0" />
                          <StatCol label="Cost/unit" value={fmt$(unitCost)} color="#60a5fa" />
                          <StatCol label="Sale/unit" value={fmt$(salePrice)} color="#10b981" />
                          <StatCol label="Profit" value={fmt$(profit)} color={profit >= 0 ? '#10b981' : '#f87171'} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
          {totalRevenue > 0 && <><span style={{ margin: '0 6px' }}>·</span><span>Revenue: <span style={{ color: '#10b981', fontWeight: 600 }}>{fmt$(totalRevenue)}</span></span></>}
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
  data = [], creditCards = [], rewards = [], products = [],
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
            products={products}
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