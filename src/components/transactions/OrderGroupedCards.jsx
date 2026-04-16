import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronDown, ChevronUp, Pencil, Trash2,
  Truck, ScanLine, Package, ImageOff, Loader,
  ExternalLink, CheckCircle2,
} from 'lucide-react';
import RetailerLogo from '@/components/shared/BrandLogo';

// ── Helpers ───────────────────────────────────────────────────────────────

const fmt$ = (v, fallback = '—') => {
  const n = parseFloat(v) || 0;
  if (n === 0) return fallback;
  return n < 0 ? `-$${Math.abs(n).toFixed(2)}` : `$${n.toFixed(2)}`;
};

const fmtDate = (d) => {
  try { return d ? format(new Date(d), 'MMM d, yyyy') : '—'; } catch { return '—'; }
};

function getTrackingUrl(trackingNumber) {
  if (!trackingNumber) return null;
  const t = trackingNumber.toUpperCase();
  if (t.startsWith('1Z')) return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  if (/^[0-9]{20,22}$/.test(t)) return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  return `https://www.google.com/search?q=${encodeURIComponent(trackingNumber)}+package+tracking`;
}

// ── Status config ─────────────────────────────────────────────────────────

const STATUS_STEPS = ['ordered', 'shipped', 'delivered', 'received'];

const STATUS_META = {
  ordered:            { label:'Ordered',          color:'var(--ocean)',    bg:'var(--ocean-bg)',    bdr:'var(--ocean-bdr)'   },
  processing:         { label:'Processing',        color:'var(--gold)',     bg:'var(--gold-bg)',     bdr:'var(--gold-bdr)'    },
  shipped:            { label:'Shipped',            color:'var(--gold)',     bg:'var(--gold-bg)',     bdr:'var(--gold-bdr)'    },
  delivered:          { label:'Delivered',          color:'var(--terrain)',  bg:'var(--terrain-bg)',  bdr:'var(--terrain-bdr)' },
  received:           { label:'Received',           color:'var(--terrain)',  bg:'var(--terrain-bg)',  bdr:'var(--terrain-bdr)' },
  partially_received: { label:'Partial',            color:'var(--gold)',     bg:'var(--gold-bg)',     bdr:'var(--gold-bdr)'    },
  cancelled:          { label:'Cancelled',          color:'var(--crimson)',  bg:'var(--crimson-bg)',  bdr:'var(--crimson-bdr)' },
  returned:           { label:'Returned',           color:'var(--crimson)',  bg:'var(--crimson-bg)',  bdr:'var(--crimson-bdr)' },
  pending:            { label:'Pending',            color:'var(--gold)',     bg:'var(--gold-bg)',     bdr:'var(--gold-bdr)'    },
};

const NEXT_STEP = {
  ordered:    { status:'shipped',   label:'Mark shipped',   Icon: Truck       },
  processing: { status:'shipped',   label:'Mark shipped',   Icon: Truck       },
  shipped:    { status:'delivered', label:'Mark delivered', Icon: Package     },
  delivered:  { status:'received',  label:'Mark received',  Icon: CheckCircle2},
};

// ── Progress dots ─────────────────────────────────────────────────────────

function ProgressDots({ status }) {
  const idx = STATUS_STEPS.indexOf(status);
  const done = status === 'received';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:3 }}>
      {STATUS_STEPS.map((step, i) => {
        const isDone   = done || i < idx;
        const isActive = i === idx && !done;
        return (
          <React.Fragment key={step}>
            <div style={{
              width:8, height:8, borderRadius:'50%', flexShrink:0,
              background: isDone ? 'var(--terrain)' : isActive ? 'var(--gold)' : 'var(--parch-line)',
              outline: isActive ? '2px solid var(--gold-bdr)' : 'none',
              outlineOffset: 1,
            }}/>
            {i < STATUS_STEPS.length - 1 && (
              <div style={{ width:12, height:2, borderRadius:1, background: isDone ? 'var(--terrain)' : 'var(--parch-line)', flexShrink:0 }}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status || '—', color:'var(--ink-faded)', bg:'var(--parch-warm)', bdr:'var(--parch-line)' };
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', fontSize:10, fontWeight:700,
      padding:'3px 8px', borderRadius:99, letterSpacing:'0.02em',
      fontFamily:'var(--font-serif)',
      background:meta.bg, color:meta.color, border:`1px solid ${meta.bdr}`,
    }}>
      {meta.label}
    </span>
  );
}

// ── Product image ─────────────────────────────────────────────────────────

function ProductImg({ src, name, size = 36 }) {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div style={{ width:size, height:size, borderRadius:8, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <ImageOff style={{ width:size*0.38, height:size*0.38, color:'var(--ink-ghost)' }}/>
    </div>
  );
  return (
    <img src={src} alt={name} onError={() => setErr(true)}
      style={{ width:size, height:size, borderRadius:8, objectFit:'contain', background:'white', border:'1px solid var(--parch-line)', flexShrink:0 }}/>
  );
}

// ── Column header ─────────────────────────────────────────────────────────

function ColHdr({ children, align = 'right' }) {
  return (
    <div style={{ fontSize:9, fontWeight:700, color:'var(--ink-ghost)', textAlign:align, letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:'var(--font-serif)' }}>
      {children}
    </div>
  );
}

// ── Order card ────────────────────────────────────────────────────────────

function OrderCard({ order, creditCards, rewards, products, giftCards, onEdit, onDelete, onQuickStatus, selected, onToggleSelect }) {
  const [expanded,       setExpanded]       = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const card          = creditCards?.find(c => c.id === order.credit_card_id);
  const orderRewards  = (rewards || []).filter(r => r.purchase_order_id === order.id);
  const totalCashback = orderRewards.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const gcUsed        = parseFloat(order.gift_card_value) || 0;

  const nextStep = NEXT_STEP[order.status];

  const handleNextStep = async () => {
    if (!nextStep || updatingStatus) return;
    setUpdatingStatus(true);
    try { await onQuickStatus(order, nextStep.status); }
    finally { setUpdatingStatus(false); }
  };

  const items         = order.items || [];
  const saleEvents    = order.sale_events || [];

  // Total units sold across all sale events
  const totalUnitsSold = saleEvents.reduce((s, ev) =>
    s + (ev.items || []).reduce((ss, it) => ss + (parseInt(it.quantity ?? it.qty) || 1), 0), 0);
  const totalUnitsOrdered = items.reduce((s, i) => s + (parseInt(i.quantity_ordered) || 1), 0);

  // Revenue from sale events (correct source)
  const saleEventRevenue = saleEvents.reduce((s, ev) =>
    s + (ev.items || []).reduce((ss, it) =>
      ss + (parseFloat(it.sale_price) || 0) * (parseInt(it.quantity ?? it.qty) || 1), 0), 0);

  // Fallback to item.sale_price if no sale events
  const itemSaleTotal = items.reduce((s, i) =>
    s + (parseFloat(i.sale_price) || 0) * (parseInt(i.quantity_ordered) || 1), 0);

  const itemsCost   = items.reduce((s, i) => s + (parseFloat(i.unit_cost) || 0) * (parseInt(i.quantity_ordered) || 1), 0);
  const revenue     = saleEventRevenue > 0 ? saleEventRevenue : itemSaleTotal;
  const hasSale     = revenue > 0;
  const orderProfit = hasSale ? revenue - itemsCost + totalCashback : 0;
  const profitColor = orderProfit > 0 ? 'var(--terrain)' : orderProfit < 0 ? 'var(--crimson)' : 'var(--ink-ghost)';

  // grid: checkbox | logo | info | [badges+progress+nextstep] | chevron
  const GRID = '16px 40px 1fr auto 20px';

  return (
    <div style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:12, marginBottom:10, overflow:'hidden' }}>

      {/* ── Header ── */}
      <div style={{ display:'grid', gridTemplateColumns:GRID, alignItems:'center', gap:10, padding:'12px 14px', borderBottom: expanded ? '1px solid var(--parch-line)' : 'none' }}>

        {/* Checkbox */}
        <div onClick={e => { e.stopPropagation(); onToggleSelect(order.id); }}
          style={{ width:16, height:16, borderRadius:4, border:`1px solid ${selected ? 'var(--ink)' : 'var(--parch-line)'}`, background: selected ? 'var(--ink)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          {selected && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="var(--ne-cream)" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        </div>

        {/* Logo */}
        <div style={{ width:40, height:40, borderRadius:9, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
          <RetailerLogo retailer={order.retailer} size={40}/>
        </div>

        {/* Order info */}
        <div style={{ minWidth:0, cursor:'pointer' }} onClick={() => setExpanded(v => !v)}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--ocean)', fontFamily:'var(--font-serif)' }}>
              #{order.order_number || 'No order #'}
            </span>
            <StatusBadge status={order.status}/>
            <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'var(--parch-warm)', color:'var(--ink-faded)', border:'1px solid var(--parch-line)' }}>
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
            {totalUnitsSold > 0 && (
              <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99,
                background: totalUnitsSold >= totalUnitsOrdered ? 'var(--terrain-bg)' : 'var(--gold-bg)',
                color:      totalUnitsSold >= totalUnitsOrdered ? 'var(--terrain)'    : 'var(--gold)',
                border:     `1px solid ${totalUnitsSold >= totalUnitsOrdered ? 'var(--terrain-bdr)' : 'var(--gold-bdr)'}`,
              }}>
                {totalUnitsSold}/{totalUnitsOrdered} sold
              </span>
            )}
            {order.order_type && (
              <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99,
                background: order.order_type === 'churning' ? 'var(--gold-bg)' : 'var(--ocean-bg)',
                color:      order.order_type === 'churning' ? 'var(--gold)'    : 'var(--ocean)',
                border:     `1px solid ${order.order_type === 'churning' ? 'var(--gold-bdr)' : 'var(--ocean-bdr)'}`,
              }}>
                {order.order_type}
              </span>
            )}
          </div>
          <div style={{ fontSize:11, color:'var(--ink-faded)', display:'flex', alignItems:'center', gap:6 }}>
            <span>{order.retailer || 'Unknown'}</span>
            <span style={{ color:'var(--parch-line)' }}>·</span>
            <span>{fmtDate(order.order_date)}</span>
            {hasSale && (
              <>
                <span style={{ color:'var(--parch-line)' }}>·</span>
                <span style={{ color: profitColor, fontWeight:700 }}>
                  Profit: {orderProfit >= 0 ? '+' : ''}${orderProfit.toFixed(2)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }} onClick={e => e.stopPropagation()}>
          <ProgressDots status={order.status}/>
          {nextStep && (
            <button onClick={handleNextStep} disabled={updatingStatus}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:'1px solid var(--ocean-bdr)', background:'var(--ocean-bg)', color:'var(--ocean)', cursor: updatingStatus ? 'not-allowed' : 'pointer', opacity: updatingStatus ? 0.6 : 1, fontFamily:'var(--font-serif)', whiteSpace:'nowrap' }}>
              {updatingStatus
                ? <Loader style={{ width:11, height:11, animation:'spin 0.8s linear infinite' }}/>
                : <nextStep.Icon style={{ width:11, height:11 }}/>
              }
              {nextStep.label}
            </button>
          )}
        </div>

        {/* Chevron */}
        <div onClick={() => setExpanded(v => !v)} style={{ cursor:'pointer', color:'var(--ink-ghost)' }}>
          {expanded ? <ChevronUp style={{ width:15, height:15 }}/> : <ChevronDown style={{ width:15, height:15 }}/>}
        </div>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <>
          {/* Column headers */}
          {items.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'40px 1fr 44px 80px 80px 80px 80px 110px', gap:6, padding:'6px 14px', borderBottom:'1px solid var(--parch-line)', alignItems:'center' }}>
              <div/>
              <ColHdr align="left">Product</ColHdr>
              <ColHdr>Qty</ColHdr>
              <ColHdr>Cost/unit</ColHdr>
              <ColHdr>Sale/unit</ColHdr>
              <ColHdr>Profit</ColHdr>
              <ColHdr>Cashback</ColHdr>
              <ColHdr>Payment</ColHdr>
            </div>
          )}

          {/* Item rows */}
          {items.map((item, idx) => {
            const prod       = products?.find(p => p.id === item.product_id);
            const imgSrc     = item.image_url || prod?.image || null;
            const unitCost   = parseFloat(item.unit_cost)  || 0;
            const qty        = parseInt(item.quantity_ordered) || 1;
            const perItemCB  = totalCashback > 0 && items.length > 0 ? totalCashback / items.length : 0;
            const isLast     = idx === items.length - 1;
            const trackUrl   = getTrackingUrl((order.tracking_numbers || [])[0]);

            // Sale events for this item
            const itemSaleEvts = saleEvents.filter(ev =>
              (ev.items || []).some(it =>
                it.product_name === item.product_name ||
                (item.product_id && it.product_id === item.product_id)
              )
            );

            return (
              <div key={idx} style={{ borderBottom: isLast ? 'none' : '1px solid var(--parch-line)' }}>
                {/* Item row */}
                <div style={{ display:'grid', gridTemplateColumns:'40px 1fr 80px 80px 80px 110px', gap:6, padding:'10px 14px', alignItems:'center' }}>
                  <ProductImg src={imgSrc} name={item.product_name} size={36}/>

                  {/* Name + SKU + tracking + qty */}
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }} title={item.product_name}>
                        {item.product_name || 'Unknown product'}
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color:'var(--ink-dim)', background:'var(--parch-warm)', border:'1px solid var(--parch-line)', borderRadius:6, padding:'1px 7px', flexShrink:0 }}>
                        ×{qty}
                      </span>
                    </div>
                    {(item.sku || item.upc) && (
                      <div style={{ fontSize:10, color:'var(--ink-ghost)', marginTop:1 }}>SKU: {item.sku || item.upc}</div>
                    )}
                    {trackUrl && (order.tracking_numbers || []).length > 0 && (
                      <a href={trackUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:10, color:'var(--ocean)', marginTop:2, textDecoration:'none' }}>
                        <ExternalLink style={{ width:9, height:9 }}/> {order.tracking_numbers[0]}
                      </a>
                    )}
                  </div>

                  {/* Cost/unit */}
                  <div style={{ fontSize:12, textAlign:'right', color:'var(--ink)' }}>
                    {unitCost > 0 ? `$${unitCost.toFixed(2)}` : '—'}
                  </div>

                  {/* Revenue from sale events */}
                  <div style={{ fontSize:12, textAlign:'right', fontWeight: revenue > 0 ? 700 : 400, color: revenue > 0 ? 'var(--terrain)' : 'var(--ink-ghost)' }}>
                    {saleEventRevenue > 0 ? `$${saleEventRevenue.toFixed(2)}` : itemSaleTotal > 0 ? `$${itemSaleTotal.toFixed(2)}` : <span style={{ fontSize:10 }}>not set</span>}
                  </div>

                  {/* Cashback */}
                  <div style={{ fontSize:12, textAlign:'right', color:'var(--violet)' }}>
                    {perItemCB > 0 ? `$${perItemCB.toFixed(2)}` : '—'}
                  </div>

                  {/* Payment */}
                  <div style={{ textAlign:'right' }}>
                    {card ? (
                      <span style={{ display:'inline-flex', alignItems:'center', fontSize:10, color:'var(--ink-faded)', background:'var(--parch-warm)', border:'1px solid var(--parch-line)', borderRadius:6, padding:'2px 7px' }}>
                        {card.card_name}{card.last_4_digits ? ` ••••${card.last_4_digits}` : ''}
                      </span>
                    ) : order.payment_splits?.length > 1 ? (
                      <span style={{ display:'inline-flex', alignItems:'center', fontSize:10, color:'var(--violet)', background:'var(--violet-bg,#f3f0ff)', border:'1px solid var(--violet-bdr,#d4caff)', borderRadius:6, padding:'2px 7px', fontWeight:700 }}>
                        Split ×{order.payment_splits.length}
                      </span>
                    ) : (
                      <span style={{ fontSize:10, color:'var(--ink-ghost)' }}>—</span>
                    )}
                  </div>
                </div>

                {/* Sale event rows */}
                {saleEvents.length > 0 && saleEvents.map((ev, evIdx) => {
                  const evItems = ev.items || [];
                  return evItems.map((it, itIdx) => {
                    const evQty    = parseInt(it.quantity ?? it.qty) || 1;
                    const evSale   = parseFloat(it.sale_price) || 0;
                    const evCost   = unitCost * evQty;
                    const evProfit = evSale > 0 ? evSale - evCost + (perItemCB / (saleEvents.length || 1)) : null;
                    return (
                      <div key={`${evIdx}-${itIdx}`} style={{ display:'grid', gridTemplateColumns:'40px 1fr 80px 80px 80px 110px', gap:6, padding:'5px 14px 5px 54px', alignItems:'center', background:'var(--parch-warm)', borderTop:'1px solid var(--parch-line)' }}>
                        <div/>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--terrain)', flexShrink:0 }}/>
                          <span style={{ fontSize:11, color:'var(--terrain)', fontWeight:600 }}>{ev.buyer || 'Buyer'}</span>
                        </div>
                        <div style={{ fontSize:11, textAlign:'right', color:'var(--ink-dim)' }}>{evQty} unit{evQty !== 1 ? 's' : ''}</div>
                        <div style={{ fontSize:11, textAlign:'right', color:'var(--terrain)', fontWeight:700 }}>
                          {evSale > 0 ? `$${evSale.toFixed(2)}` : '—'}
                        </div>
                        <div style={{ fontSize:11, textAlign:'right', fontWeight:700, color: evProfit === null ? 'var(--ink-ghost)' : evProfit >= 0 ? 'var(--terrain)' : 'var(--crimson)' }}>
                          {evProfit !== null ? `${evProfit >= 0 ? '+' : ''}$${evProfit.toFixed(2)}` : '—'}
                        </div>
                        <div/>
                      </div>
                    );
                  });
                })}
              </div>
            );
          })}

          {items.length === 0 && (
            <div style={{ padding:'18px 14px', textAlign:'center', fontSize:12, color:'var(--ink-ghost)' }}>No items recorded</div>
          )}

          {/* ── Footer ── */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--parch-warm)', flexWrap:'wrap', borderTop:'1px solid var(--parch-line)' }}>
            <span style={{ fontSize:12, color:'var(--ink-faded)' }}>
              Total: <strong style={{ color:'var(--ink)', fontFamily:'var(--font-serif)' }}>${(parseFloat(order.total_cost) || 0).toFixed(2)}</strong>
            </span>

            {order.order_number && (
              <><span style={{ width:1, height:12, background:'var(--parch-line)', display:'inline-block' }}/><span style={{ fontSize:11, color:'var(--ink-ghost)' }}>#{order.order_number}</span></>
            )}

            {hasSale && (
              <><span style={{ width:1, height:12, background:'var(--parch-line)', display:'inline-block' }}/>
              <span style={{ fontSize:11, fontWeight:700, color: profitColor, fontFamily:'var(--font-serif)' }}>
                {orderProfit >= 0 ? '+' : ''}${orderProfit.toFixed(2)} profit
              </span></>
            )}

            {gcUsed > 0 && (
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--gold-bg)', color:'var(--gold)', border:'1px solid var(--gold-bdr)' }}>
                GC: ${gcUsed.toFixed(2)}
              </span>
            )}

            {totalCashback > 0 && (
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--ocean-bg)', color:'var(--ocean)', border:'1px solid var(--ocean-bdr)' }}>
                CB: ${totalCashback.toFixed(2)}
              </span>
            )}

            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
              <button onClick={() => onEdit(order)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:'1px solid var(--parch-line)', background:'transparent', color:'var(--ink-faded)', cursor:'pointer', fontFamily:'var(--font-serif)' }}>
                <Pencil style={{ width:11, height:11 }}/> Edit
              </button>
              <button onClick={() => onDelete(order)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:'1px solid var(--crimson-bdr)', background:'var(--crimson-bg)', color:'var(--crimson)', cursor:'pointer', fontFamily:'var(--font-serif)' }}>
                <Trash2 style={{ width:11, height:11 }}/> Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────

export default function OrderGroupedCards({
  data = [], creditCards = [], rewards = [], products = [], giftCards = [],
  onEdit, onDelete, onQuickStatus, isLoading,
  selectedIds, onSelectionChange, onClearFilters,
}) {
  const toggleSelect = (id) => {
    onSelectionChange(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (isLoading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Loader style={{ width:24, height:24, color:'var(--gold)', animation:'spin 1s linear infinite' }}/>
    </div>
  );

  if (!data.length) return (
    <div style={{ textAlign:'center', padding:'56px 20px', background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:12 }}>
      <Package style={{ width:36, height:36, color:'var(--ink-ghost)', margin:'0 auto 12px' }}/>
      <p style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:6, fontFamily:'var(--font-serif)' }}>No orders found</p>
      <p style={{ fontSize:12, color:'var(--ink-faded)', marginBottom:16 }}>Try adjusting your filters or import orders from the Import page</p>
      {onClearFilters && (
        <button onClick={onClearFilters}
          style={{ padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:700, background:'var(--ink)', color:'var(--ne-cream)', border:'none', cursor:'pointer', fontFamily:'var(--font-serif)' }}>
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {data.map(order => (
        <OrderCard
          key={order.id}
          order={order}
          creditCards={creditCards}
          rewards={rewards}
          products={products}
          giftCards={giftCards}
          onEdit={onEdit}
          onDelete={onDelete}
          onQuickStatus={onQuickStatus}
          selected={selectedIds?.has(order.id) || false}
          onToggleSelect={toggleSelect}
        />
      ))}
    </div>
  );
}