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
    s + (ev.items || []).reduce((ss, it) => ss + (parseInt(it.qty) || 1), 0), 0);
  const totalUnitsOrdered = items.reduce((s, i) => s + (parseInt(i.quantity_ordered) || 1), 0);

  // Revenue from sale events (correct source)
  const saleEventRevenue = saleEvents.reduce((s, ev) =>
    s + (ev.items || []).reduce((ss, it) =>
      ss + (parseFloat(it.sale_price) || 0) * (parseInt(it.qty) || 1), 0), 0);

  // Fallback to item.sale_price if no sale events
  const itemSaleTotal = items.reduce((s, i) =>
    s + (parseFloat(i.sale_price) || 0) * (parseInt(i.quantity_ordered) || 1), 0);

  const itemsCost   = items.reduce((s, i) => s + (parseFloat(i.unit_cost) || 0) * (parseInt(i.quantity_ordered) || 1), 0);
  const revenue     = saleEventRevenue > 0 ? saleEventRevenue : itemSaleTotal;
  const hasSale     = revenue > 0;
  
  // ✅ FIX: Profit only on SOLD units, not order cost
  const profitOnSold = hasSale 
    ? totalUnitsSold > 0 
      ? revenue - ((itemsCost / totalUnitsOrdered) * totalUnitsSold) + totalCashback
      : 0
    : 0;
  
  const orderProfit = profitOnSold;
  const profitColor = hasSale
    ? (orderProfit >= 0 ? 'var(--terrain)' : 'var(--crimson)')
    : 'var(--ink-ghost)';

  const profitMargin = hasSale && revenue > 0 
    ? ((orderProfit / revenue) * 100).toFixed(1)
    : 0;

  return (
    <div style={{
      background:'var(--parch-card)', border:'1px solid var(--parch-line)',
      borderRadius:12, marginBottom:12, overflow:'hidden', transition:'all 0.2s'
    }}>
      {/* ── Header ── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
        padding:'14px', background:'var(--parch-card)', borderBottom:'1px solid var(--parch-line)'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
          <input type="checkbox" checked={selected} onChange={() => onToggleSelect(order.id)}
            style={{ width:18, height:18, cursor:'pointer' }}/>

          <RetailerLogo retailer={order.retailer} size={32}/>

          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
              <span style={{ fontFamily:'var(--font-serif)', fontSize:13, fontWeight:700, color:'var(--ink)' }}>
                #{order.order_number || order.id?.slice(0,8)}
              </span>
              <StatusBadge status={order.status}/>
            </div>
            <span style={{ fontSize:11, color:'var(--ink-dim)', display:'block' }}>
              {fmtDate(order.order_date)} • {order.retailer} • {totalUnitsOrdered} unit{totalUnitsOrdered !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <ProgressDots status={order.status}/>
          <button onClick={() => setExpanded(!expanded)}
            style={{ width:32, height:32, borderRadius:8, background:'transparent', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--ink-faded)' }}>
            {expanded ? <ChevronUp style={{ width:16, height:16 }}/> : <ChevronDown style={{ width:16, height:16 }}/>}
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {expanded && (
        <>
          {/* Items section */}
          <div style={{ padding:'0 0' }}>
            {items.map((item, idx) => {
              const unitCost = parseFloat(item.unit_cost) || 0;
              const qty = parseInt(item.quantity_ordered) || 1;
              const itemTotal = unitCost * qty;
              const itemImage = item.product_image || '';
              const itemName = item.product_name || 'Unknown Product';

              // Units sold for THIS item
              const itemUnitsSold = saleEvents.reduce((s, ev) =>
                s + (ev.items || []).reduce((ss, evIt) =>
                  evIt.product_name === itemName ? ss + (parseInt(evIt.qty) || 0) : ss, 0), 0);

              const itemRevenue = saleEvents.reduce((s, ev) =>
                s + (ev.items || []).reduce((ss, evIt) =>
                  evIt.product_name === itemName ? ss + (parseFloat(evIt.sale_price) || 0) * (parseInt(evIt.qty) || 1) : ss, 0), 0);

              const itemProfit = itemRevenue > 0 
                ? itemRevenue - (unitCost * itemUnitsSold) + (totalCashback / (items.length || 1))
                : 0;

              const perItemCB = totalCashback / (items.length || 1);

              return (
                <div key={idx} style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--parch-line)' }}>
                  {/* ── Main item row (reorganized grid) ── */}
                  <div style={{
                    display:'grid',
                    gridTemplateColumns:'120px 1fr 80px 100px 100px 100px 80px',
                    gap:12,
                    padding:'12px 14px',
                    alignItems:'center',
                    background:'var(--parch-card)'
                  }}>
                    {/* Product info (left) */}
                    <div style={{ display:'flex', alignItems:'flex-start', gap:8, gridColumn:'1/3' }}>
                      <ProductImg src={itemImage} name={itemName} size={48}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:600, color:'var(--ink)', margin:'0 0 4px', lineHeight:1.3 }}>
                          {itemName}
                        </p>
                        <p style={{ fontSize:10, color:'var(--ink-ghost)', margin:0, fontFamily:'var(--font-mono)', letterSpacing:'0.02em' }}>
                          UPC: {item.upc || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Ordered qty */}
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:10, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2, fontWeight:700 }}>Ordered</div>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>
                        {qty}×
                      </div>
                    </div>

                    {/* Cost section */}
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:10, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2, fontWeight:700 }}>Cost/Unit</div>
                      <div style={{ fontSize:12, color:'var(--ink-dim)', fontFamily:'var(--font-mono)' }}>
                        {fmt$(unitCost)}
                      </div>
                    </div>

                    {/* Sale status */}
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:10, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2, fontWeight:700 }}>Sold</div>
                      <div style={{ fontSize:13, fontWeight:700, color: itemUnitsSold > 0 ? 'var(--terrain)' : 'var(--ink-ghost)' }}>
                        {itemUnitsSold}/{qty}
                      </div>
                    </div>

                    {/* Sale price */}
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:10, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2, fontWeight:700 }}>Sale Price</div>
                      <div style={{ fontSize:12, color: itemRevenue > 0 ? 'var(--terrain)' : 'var(--ink-ghost)', fontFamily:'var(--font-mono)', fontWeight:600 }}>
                        {itemRevenue > 0 ? fmt$(itemRevenue / (itemUnitsSold || 1)) : '—'}
                      </div>
                    </div>

                    {/* Profit per item */}
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:10, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2, fontWeight:700 }}>Profit</div>
                      <div style={{
                        fontSize:12, fontWeight:700, fontFamily:'var(--font-mono)',
                        color: itemProfit > 0 ? 'var(--terrain)' : itemProfit < 0 ? 'var(--crimson)' : 'var(--ink-ghost)'
                      }}>
                        {itemRevenue > 0 ? `${itemProfit >= 0 ? '+' : ''}${itemProfit.toFixed(2)}` : '—'}
                      </div>
                    </div>

                    {/* Cashback */}
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:10, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2, fontWeight:700 }}>CB</div>
                      <div style={{ fontSize:12, color:'var(--violet)', fontWeight:600, fontFamily:'var(--font-mono)' }}>
                        {perItemCB > 0 ? fmt$(perItemCB) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Sale event rows (nested accordion) */}
                  {saleEvents.length > 0 && saleEvents.map((ev, evIdx) => {
                    const evItems = ev.items || [];
                    const relevantItems = evItems.filter(it => it.product_name === itemName);
                    
                    return relevantItems.map((it, itIdx) => {
                      const evQty    = parseInt(it.qty) || 1;
                      const evSale   = parseFloat(it.sale_price) || 0;
                      const evCost   = unitCost * evQty;
                      const evProfit = evSale > 0 ? evSale - evCost + (perItemCB / (saleEvents.length || 1)) : null;
                      
                      return (
                        <div key={`${evIdx}-${itIdx}`} style={{
                          display:'grid',
                          gridTemplateColumns:'120px 1fr 80px 100px 100px 100px 80px',
                          gap:12,
                          padding:'8px 14px 8px 62px',
                          alignItems:'center',
                          background:'var(--parch-warm)',
                          borderTop:'1px solid var(--parch-line)',
                          fontSize:11
                        }}>
                          <div/>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--terrain)', flexShrink:0 }}/>
                            <span style={{ color:'var(--terrain)', fontWeight:600 }}>{ev.buyer || 'Buyer'}</span>
                            <span style={{ color:'var(--ink-ghost)', fontSize:10 }}>{fmtDate(ev.sale_date)}</span>
                          </div>
                          <div style={{ textAlign:'right', color:'var(--ink-dim)' }}>{evQty} unit{evQty !== 1 ? 's' : ''}</div>
                          <div style={{ textAlign:'right', color:'var(--ink-dim)' }}>—</div>
                          <div style={{ textAlign:'right', color:'var(--terrain)', fontWeight:700 }}>
                            {evSale > 0 ? fmt$(evSale) : '—'}
                          </div>
                          <div style={{
                            textAlign:'right', fontWeight:700, color: evProfit === null ? 'var(--ink-ghost)' : evProfit >= 0 ? 'var(--terrain)' : 'var(--crimson)'
                          }}>
                            {evProfit !== null ? `${evProfit >= 0 ? '+' : ''}${evProfit.toFixed(2)}` : '—'}
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
          </div>

          {/* ── Footer ── */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'var(--parch-warm)', flexWrap:'wrap', borderTop:'1px solid var(--parch-line)' }}>
            <span style={{ fontSize:12, color:'var(--ink-faded)' }}>
              Order total: <strong style={{ color:'var(--ink)', fontFamily:'var(--font-serif)' }}>${(parseFloat(order.total_cost) || 0).toFixed(2)}</strong>
            </span>

            {hasSale && (
              <>
                <span style={{ width:1, height:12, background:'var(--parch-line)', display:'inline-block' }}/>
                <span style={{ fontSize:11, fontWeight:700, color: profitColor, fontFamily:'var(--font-serif)' }}>
                  Profit: {orderProfit >= 0 ? '+' : ''}${Math.abs(orderProfit).toFixed(2)} ({profitMargin}%)
                </span>
              </>
            )}

            {totalCashback > 0 && (
              <>
                <span style={{ width:1, height:12, background:'var(--parch-line)', display:'inline-block' }}/>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--ocean-bg)', color:'var(--ocean)', border:'1px solid var(--ocean-bdr)' }}>
                  CB: ${totalCashback.toFixed(2)}
                </span>
              </>
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