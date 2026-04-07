import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, Edit2, Trash2, ImageOff } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const BRANDFETCH_CLIENT_ID = '1idzVIG0BYPKsFIDJDI';

const getCardDomain = (cardName) => {
  const n = String(cardName || '').toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'');
  if (n.includes('chase')) return 'chase.com';
  if (n.includes('amex') || n.includes('american')) return 'americanexpress.com';
  if (n.includes('citi')) return 'citi.com';
  if (n.includes('capital')) return 'capitalone.com';
  if (n.includes('discover')) return 'discover.com';
  if (n.includes('bofa') || n.includes('bankofamerica')) return 'bankofamerica.com';
  if (n.includes('usbank')) return 'usbank.com';
  if (n.includes('wells')) return 'wellsfargo.com';
  if (n.includes('amazon')) return 'amazon.com';
  if (n.includes('apple')) return 'apple.com';
  if (n.includes('costco')) return 'costco.com';
  if (n.includes('target')) return 'target.com';
  return null;
};

function CardLogo({ cardName, size = 16 }) {
  const [err, setErr] = React.useState(false);
  const domain = getCardDomain(cardName);
  const logoUrl = domain ? `https://cdn.brandfetch.io/domain/${domain}?c=${BRANDFETCH_CLIENT_ID}` : null;
  const initials = (cardName || 'X').split(' ')[0].charAt(0).toUpperCase();
  if (!logoUrl || err) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ocean-bg)', color: 'var(--ocean)', fontWeight: 700, fontSize: size * 0.45, flexShrink: 0, border: '1px solid var(--ocean-bdr)' }}>
        {initials}
      </div>
    );
  }
  return (
    <img src={logoUrl} alt={cardName} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--parch-line)' }} />
  );
}

const getSaleRowsForItem = (order, item) => {
  if (!order.sale_events?.length) return [];
  const rows = [];
  order.sale_events.forEach(event => {
    const matchedItem = (event.items || []).find(si => {
      if (si.product_name && item.product_name) {
        const siName = si.product_name.toLowerCase().trim();
        const itemName = item.product_name.toLowerCase().trim();
        if (siName === itemName || siName.includes(itemName.slice(0, 20)) || itemName.includes(siName.slice(0, 20))) return true;
      }
      if (si.item_id && item.id && si.item_id === item.id) return true;
      if (si.item_id && item.product_id && si.item_id === item.product_id) return true;
      if ((order.items?.length === 1) && (event.items?.length >= 1)) return true;
      return false;
    });
    if (matchedItem) {
      const costPerUnit = parseFloat(item.unit_cost || item.unit_price || item.cost_per_unit || 0);
      const salePrice   = parseFloat(matchedItem.sale_price || 0);
      const qty         = parseInt(matchedItem.quantity || 1);
      rows.push({ buyer: event.buyer || 'Unknown Buyer', quantity: qty, sale_price: salePrice, cost_per_unit: costPerUnit, profit: (salePrice - costPerUnit) * qty });
    }
  });
  return rows;
};

const getStoreDomain = (vendorName) => {
  if (!vendorName) return null;
  const n = String(vendorName).toLowerCase().replace(/[\s\-\_\.\']/g,'').replace(/[^a-z0-9]/g,'');
  if (n.includes('bestbuy'))  return 'bestbuy.com';
  if (n.includes('amazon'))   return 'amazon.com';
  if (n.includes('walmart'))  return 'walmart.com';
  if (n.includes('apple'))    return 'apple.com';
  if (n.includes('target'))   return 'target.com';
  if (n.includes('costco'))   return 'costco.com';
  if (n.includes('samsclub') || n.includes('sams')) return 'samsclub.com';
  if (n.includes('ebay'))     return 'ebay.com';
  if (n.includes('woot'))     return 'woot.com';
  if (n.includes('newegg'))   return 'newegg.com';
  if (n.includes('staples'))  return 'staples.com';
  return n + '.com';
};

function StoreLogo({ retailer, size = 40 }) {
  const [err, setErr] = useState(false);
  const domain  = getStoreDomain(retailer);
  const logoUrl = domain ? `https://cdn.brandfetch.io/domain/${domain}?c=${BRANDFETCH_CLIENT_ID}` : null;
  const initials = (retailer || 'X').slice(0, 2).toUpperCase();
  if (!logoUrl || err) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#10b981,#06b6d4)', color: 'white', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
        {initials}
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', overflow: 'hidden', flexShrink: 0 }}>
      <img src={logoUrl} alt={retailer} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={() => setErr(true)} />
    </div>
  );
}

const STATUS_STYLES = {
  pending:            { bg: 'var(--gold-bg)',    color: 'var(--gold2)',   border: 'var(--gold-border)' },
  ordered:            { bg: 'var(--ocean-bg)',   color: 'var(--ocean)',   border: 'var(--ocean-bdr)'   },
  shipped:            { bg: 'var(--violet-bg)',  color: 'var(--violet)',  border: 'var(--violet-bdr)'  },
  partially_received: { bg: 'var(--gold-bg)',    color: 'var(--gold)',    border: 'var(--gold-border)' },
  received:           { bg: 'var(--ocean-bg)',   color: 'var(--ocean2)',  border: 'var(--ocean-bdr)'   },
  paid:               { bg: 'var(--terrain-bg)', color: 'var(--terrain)', border: 'var(--terrain-bdr)' },
  cancelled:          { bg: 'var(--crimson-bg)', color: 'var(--crimson)', border: 'var(--crimson-bdr)' },
  completed:          { bg: 'var(--terrain-bg)', color: 'var(--terrain)', border: 'var(--terrain-bdr)' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { bg: 'var(--parch-warm)', color: 'var(--ink-dim)', border: 'var(--parch-line)' };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {status?.replace(/_/g, ' ') || '—'}
    </span>
  );
}

function fmt$(n) { return `$${(parseFloat(n) || 0).toFixed(2)}`; }

function ItemImg({ src, name, qty = 1 }) {
  const [err, setErr] = useState(false);
  const initial = name?.charAt(0)?.toUpperCase() || '?';
  return (
    <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
      {src && !err
        ? <img src={src} alt={name} onError={() => setErr(true)} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--parch-line)', display: 'block' }} />
        : <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--terrain-bg)', border: '1px solid var(--terrain-bdr)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--terrain)', fontSize: 14, fontWeight: 700 }}>
            {initial}
          </div>
      }
      {qty > 1 && (
        <div style={{ position: 'absolute', bottom: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: 'var(--ocean)', border: '2px solid var(--parch-card)', color: 'white', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          {qty}
        </div>
      )}
    </div>
  );
}

function StatCol({ label, value, color = 'var(--ink)' }) {
  return (
    <div style={{ textAlign: 'right', minWidth: 0 }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--ink-ghost)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color, whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

function OrderCard({ order, creditCards, rewards, products = [], onEdit, onDelete, isSelected, onToggleSelect }) {
  const [expanded, setExpanded] = useState(true);

  const card         = creditCards.find(c => c.id === order.credit_card_id);
  const orderRewards = rewards.filter(r => r.purchase_order_id === order.id);
  const cashback     = orderRewards.filter(r => r.currency === 'USD').reduce((s, r) => s + (r.amount || 0), 0);
  const totalCost    = order.final_cost || order.total_cost || 0;
  const totalRevenue = order.sale_events?.reduce((sum, event) => sum + (event.items?.reduce((s, item) => s + ((parseFloat(item.sale_price) || 0) * (parseInt(item.quantity) || 1)), 0) || 0), 0) || 0;
  const hasSales     = totalRevenue > 0;
  const profit       = hasSales ? totalRevenue - totalCost + cashback : 0;
  const profitColor  = hasSales ? (profit >= 0 ? 'var(--terrain)' : 'var(--crimson)') : 'var(--ink-ghost)';
  const itemCount    = order.items?.length || 0;
  const orderDate    = order.order_date ? (() => { try { return format(parseISO(order.order_date), 'MMM d, yyyy'); } catch { return order.order_date; } })() : '—';
  const paymentLabel = order.payment_splits?.length > 1 ? `${order.payment_splits.length} cards` : (card?.card_name || order.card_name || null);

  return (
    <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 14, marginBottom: 10, overflow: 'hidden', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--parch-deep)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--parch-line)'}>

      {/* ── Header ── */}
      <div onClick={() => setExpanded(p => !p)}
        style={{ background: 'var(--parch-warm)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--gold-bg)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--parch-warm)'}>

        <div onClick={e => { e.stopPropagation(); onToggleSelect(order.id); }} style={{ flexShrink: 0, padding: 2 }}>
          <input type="checkbox" checked={isSelected} readOnly style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--gold)' }} />
        </div>

        <StoreLogo retailer={order.retailer} size={32} />

        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {order.order_number
              ? <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontWeight: 700, color: 'var(--ocean)' }} title={`#${order.order_number}`}>#{order.order_number}</span>
              : (order.retailer || 'Unknown')}
          </div>
          <span style={{ fontSize: 10, color: 'var(--ink-ghost)', fontWeight: 400, whiteSpace: 'nowrap' }}>
            {order.order_number && order.retailer ? `${order.retailer} · ` : ''}{orderDate}
          </span>
        </div>

        {itemCount > 0 && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 12, background: 'var(--ocean-bg)', color: 'var(--ocean)', border: '1px solid var(--ocean-bdr)', flexShrink: 0 }}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {hasSales && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-ghost)' }}>Profit</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: profitColor }}>{fmt$(profit)}</div>
            </div>
          )}
          {order.credit_card_id && card?.last_4_digits && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CardLogo cardName={paymentLabel} size={16} />
              <span style={{ fontSize: 11, color: 'var(--ink-dim)', fontFamily: 'monospace', fontWeight: 700 }}>••••{card.last_4_digits}</span>
            </div>
          )}
          <StatusBadge status={order.status} />
          {order.fulfillment_type === 'store_pickup' && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: 'var(--violet-bg)', color: 'var(--violet)', border: '1px solid var(--violet-bdr)', whiteSpace: 'nowrap' }}>📍 Pickup</span>
          )}
          {order.fulfillment_type === 'direct_dropship' && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: 'var(--gold-bg)', color: 'var(--gold)', border: '1px solid var(--gold-border)', whiteSpace: 'nowrap' }}>🚛 Dropship{order.dropship_to ? ` → ${order.dropship_to}` : ''}</span>
          )}
          <ChevronDown style={{ width: 16, height: 16, color: 'var(--ink-dim)', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
        </div>
      </div>

      {/* ── Items list ── */}
      {expanded && itemCount > 0 && (
        <div style={{ borderTop: '1px solid var(--parch-line)' }}>
          {order.items.map((item, idx) => {
            const unitCost  = parseFloat(item.unit_cost) || 0;
            const qty       = parseInt(item.quantity_ordered) || 1;
            const imageUrl  = item.product_image_url || products.find(p => p.id === item.product_id)?.image || products.find(p => p.name?.toLowerCase().trim() === item.product_name?.toLowerCase().trim())?.image;
            const saleRows  = getSaleRowsForItem(order, item);
            const hasSaleRows = saleRows.length > 0;

            return (
              <div key={idx} style={{ borderBottom: idx < order.items.length - 1 ? '1px solid var(--parch-line)' : 'none' }}>
                <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <ItemImg src={imageUrl} name={item.product_name} qty={qty} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.product_name || '—'}
                    </div>
                    {item.upc && <div style={{ fontSize: 10, color: 'var(--ink-ghost)', marginTop: 1 }}>{item.upc}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 18, flexShrink: 0 }}>
                    <StatCol label="Qty"       value={qty}          color="var(--ink)"   />
                    <StatCol label="Cost/unit" value={fmt$(unitCost)} color="var(--ocean)" />
                    {!hasSaleRows && (
                      <>
                        <StatCol label="Sale/unit" value="—" color="var(--ink-ghost)" />
                        <StatCol label="Profit"    value="—" color="var(--ink-ghost)" />
                      </>
                    )}
                  </div>
                </div>

                {hasSaleRows && (
                  <div style={{ marginTop: 6, marginLeft: 50, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {saleRows.map((row, i, arr) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', position: 'relative', borderBottom: i < arr.length - 1 ? '1px solid var(--parch-line)' : 'none' }}>
                        <div style={{ position: 'absolute', left: -12, top: '50%', transform: 'translateY(-50%)', width: 7, height: 7, borderRadius: '50%', background: 'var(--terrain)', border: '2px solid var(--parch-card)', zIndex: 1 }} />
                        <span style={{ color: 'var(--ocean)', fontSize: 11, fontWeight: 700, minWidth: 130 }}>{row.buyer}</span>
                        <span style={{ color: 'var(--ink-dim)', fontSize: 10 }}>{row.quantity} unit{row.quantity !== 1 ? 's' : ''}</span>
                        <span style={{ color: 'var(--ink-ghost)', fontSize: 10 }}>→</span>
                        <span style={{ color: 'var(--terrain)', fontWeight: 700, fontSize: 12 }}>${parseFloat(row.sale_price).toFixed(2)}</span>
                        <span style={{ background: row.profit >= 0 ? 'var(--terrain-bg)' : 'var(--crimson-bg)', color: row.profit >= 0 ? 'var(--terrain)' : 'var(--crimson)', border: `1px solid ${row.profit >= 0 ? 'var(--terrain-bdr)' : 'var(--crimson-bdr)'}`, padding: '2px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 700 }}>
                          {row.profit >= 0 ? '+' : ''}${row.profit.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid var(--parch-line)', background: 'var(--parch-warm)', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-dim)', display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', rowGap: 2 }}>
          <span>Total: <span style={{ color: 'var(--ocean)', fontWeight: 600 }}>{fmt$(totalCost)}</span></span>
          {totalRevenue > 0 && <><span style={{ margin: '0 6px' }}>·</span><span>Revenue: <span style={{ color: 'var(--terrain)', fontWeight: 600 }}>{fmt$(totalRevenue)}</span></span></>}
          {cashback > 0 && <><span style={{ margin: '0 6px' }}>·</span><span>CB: <span style={{ color: 'var(--violet)', fontWeight: 600 }}>{fmt$(cashback)}</span></span></>}
          {hasSales && <><span style={{ margin: '0 6px' }}>·</span><span>Profit: <span style={{ color: profit >= 0 ? 'var(--terrain)' : 'var(--crimson)', fontWeight: 600 }}>{fmt$(profit)}</span></span></>}
          {order.order_number && <><span style={{ margin: '0 6px' }}>·</span><span>Order #: <span style={{ color: 'var(--ink-faded)' }}>{order.order_number}</span></span></>}
          {order.fulfillment_type === 'direct_dropship' && order.dropship_to && <><span style={{ margin: '0 6px' }}>·</span><span style={{ color: 'var(--gold)', fontWeight: 600 }}>🚛 → {order.dropship_to}</span></>}
          {order.fulfillment_type === 'store_pickup' && <><span style={{ margin: '0 6px' }}>·</span><span style={{ color: 'var(--violet)', fontWeight: 600 }}>📍 Pickup</span></>}
          {order.buyer && <><span style={{ margin: '0 6px' }}>·</span><span>Buyer: <span style={{ color: 'var(--ink-faded)' }}>{order.buyer}</span></span></>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(order); }}
            style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-faded)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Edit2 style={{ width: 11, height: 11 }} /> Edit
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(order); }}
            style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', background: 'var(--crimson-bg)', border: '1px solid var(--crimson-bdr)', color: 'var(--crimson)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Trash2 style={{ width: 11, height: 11 }} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 25;

export default function OrderGroupedCards({ data = [], creditCards = [], rewards = [], products = [], onEdit, onDelete, isLoading, selectedIds, onSelectionChange, onClearFilters }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const paged = useMemo(() => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [data, page]);

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
          <div key={i} style={{ height: 72, borderRadius: 14, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)' }} />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', borderRadius: 14, background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
        <p style={{ color: 'var(--ink-dim)', fontSize: 15, fontWeight: 500, marginBottom: 8 }}>No orders found</p>
        <p style={{ color: 'var(--ink-ghost)', fontSize: 13, marginBottom: 16 }}>Try adjusting your filters</p>
        {onClearFilters && (
          <button onClick={onClearFilters} style={{ fontSize: 13, fontWeight: 600, color: 'var(--terrain)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
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
          <OrderCard key={order.id} order={order} creditCards={creditCards} rewards={rewards} products={products}
            onEdit={onEdit} onDelete={onDelete} isSelected={selectedIds.has(order.id)} onToggleSelect={toggleSelect} />
        ))}
      </div>

      {data.length > PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '12px 0' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.length)} of {data.length} orders
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer', background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: page === 1 ? 'var(--ink-ghost)' : 'var(--ink-faded)' }}>
              ← Prev
            </button>
            <span style={{ padding: '6px 12px', fontSize: 12, color: 'var(--ink-ghost)' }}>{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer', background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: page === totalPages ? 'var(--ink-ghost)' : 'var(--ink-faded)' }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}