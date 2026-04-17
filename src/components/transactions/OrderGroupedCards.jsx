import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronDown, ChevronUp, Pencil, Trash2,
  Truck, Package, ImageOff, Loader, CheckCircle2,
} from 'lucide-react';
import RetailerLogo from '@/components/shared/BrandLogo';

/* ------------------------------------------------------------------ */
/*  HELPERS                                                             */
/* ------------------------------------------------------------------ */
const fmt$ = (v, fallback = '--') => {
  const n = parseFloat(v) || 0;
  if (n === 0 && fallback !== '$0.00') return fallback;
  return n < 0 ? `-$${Math.abs(n).toFixed(2)}` : `$${n.toFixed(2)}`;
};

const fmtDate = (d) => {
  try {
    if (!d) return '--';
    // Parse date string without timezone shift (treat as local date)
    const s = String(d);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, day] = s.split('-').map(Number);
      return format(new Date(y, m - 1, day), 'MMM d, yyyy');
    }
    return format(new Date(d), 'MMM d, yyyy');
  } catch { return '--'; }
};

const proxyImg = (url) =>
  url ? `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=120&h=120&fit=contain&bg=white` : null;

/* ------------------------------------------------------------------ */
/*  STATUS CONFIG                                                       */
/* ------------------------------------------------------------------ */
const STATUS_STEPS = ['ordered', 'shipped', 'delivered', 'received'];

const STATUS_META = {
  ordered:            { label:'Ordered',    color:'var(--ocean)',   bg:'var(--ocean-bg)',   bdr:'var(--ocean-bdr)'   },
  processing:         { label:'Processing', color:'var(--gold)',    bg:'var(--gold-bg)',    bdr:'var(--gold-bdr)'    },
  shipped:            { label:'Shipped',    color:'var(--gold)',    bg:'var(--gold-bg)',    bdr:'var(--gold-bdr)'    },
  delivered:          { label:'Delivered',  color:'var(--terrain)', bg:'var(--terrain-bg)', bdr:'var(--terrain-bdr)' },
  received:           { label:'Received',   color:'var(--terrain)', bg:'var(--terrain-bg)', bdr:'var(--terrain-bdr)' },
  partially_received: { label:'Partial',    color:'var(--gold)',    bg:'var(--gold-bg)',    bdr:'var(--gold-bdr)'    },
  cancelled:          { label:'Cancelled',  color:'var(--crimson)', bg:'var(--crimson-bg)', bdr:'var(--crimson-bdr)' },
  returned:           { label:'Returned',   color:'var(--crimson)', bg:'var(--crimson-bg)', bdr:'var(--crimson-bdr)' },
  pending:            { label:'Pending',    color:'var(--gold)',    bg:'var(--gold-bg)',    bdr:'var(--gold-bdr)'    },
};

const NEXT_STEP = {
  ordered:    { status:'shipped',   label:'Mark shipped',   Icon: Truck        },
  processing: { status:'shipped',   label:'Mark shipped',   Icon: Truck        },
  shipped:    { status:'delivered', label:'Mark delivered', Icon: Package      },
  delivered:  { status:'received',  label:'Mark received',  Icon: CheckCircle2 },
};

/* ------------------------------------------------------------------ */
/*  PROGRESS DOTS                                                       */
/* ------------------------------------------------------------------ */
function ProgressDots({ status }) {
  const idx  = STATUS_STEPS.indexOf(status);
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

/* ------------------------------------------------------------------ */
/*  STATUS BADGE                                                        */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status || '--', color:'var(--ink-faded)', bg:'var(--parch-warm)', bdr:'var(--parch-line)' };
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

/* ------------------------------------------------------------------ */
/*  PRODUCT IMAGE                                                       */
/* ------------------------------------------------------------------ */
function ProductImg({ src, name, size = 48 }) {
  const [rawErr,   setRawErr]   = useState(false);
  const [proxyErr, setProxyErr] = useState(false);
  const proxied = proxyImg(src);

  if (!src) return (
    <div style={{ width:size, height:size, borderRadius:8, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <ImageOff style={{ width:size*0.38, height:size*0.38, color:'var(--ink-ghost)' }}/>
    </div>
  );

  // Try raw URL first
  if (!rawErr) return (
    <img src={src} alt={name}
      onError={() => setRawErr(true)}
      style={{ width:size, height:size, borderRadius:8, objectFit:'contain', background:'white', border:'1px solid var(--parch-line)', flexShrink:0 }}/>
  );

  // Fallback to proxy
  if (proxied && !proxyErr) return (
    <img src={proxied} alt={name}
      onError={() => setProxyErr(true)}
      style={{ width:size, height:size, borderRadius:8, objectFit:'contain', background:'white', border:'1px solid var(--parch-line)', flexShrink:0 }}/>
  );

  // Both failed
  return (
    <div style={{ width:size, height:size, borderRadius:8, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <ImageOff style={{ width:size*0.38, height:size*0.38, color:'var(--ink-ghost)' }}/>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ORDER CARD                                                          */
/* ------------------------------------------------------------------ */
function OrderCard({ order, creditCards, rewards, onEdit, onDelete, onQuickStatus, selected, onToggleSelect }) {
  const [expanded,       setExpanded]       = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const orderRewards  = (rewards || []).filter(r => r.purchase_order_id === order.id);
  const totalCashback = orderRewards
    .filter(r => r.currency === 'USD')
    .reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  const nextStep = NEXT_STEP[order.status];

  const handleNextStep = async () => {
    if (!nextStep || updatingStatus) return;
    setUpdatingStatus(true);
    try { await onQuickStatus(order, nextStep.status); }
    finally { setUpdatingStatus(false); }
  };

  const items      = order.items      || [];
  const saleEvents = order.sale_events || [];

  const totalUnitsOrdered = items.reduce((s, i) => s + (parseInt(i.quantity_ordered) || 1), 0);

  /* -- Revenue from sale_events (entity uses "qty" field) -- */
  const totalRevenue = saleEvents.reduce((s, ev) =>
    s + (ev.items || []).reduce((ss, it) =>
      ss + (parseFloat(it.sale_price) || 0) * (parseInt(it.qty || it.quantity) || 1), 0), 0);

  /* -- Total cost = final_cost (after gift cards) or total_cost -- */
  const totalCost = parseFloat(order.final_cost || order.total_cost || 0);

  /* -- Total units sold across all sale events -- */
  const totalUnitsSold = saleEvents.reduce((s, ev) =>
    s + (ev.items || []).reduce((ss, it) => ss + (parseInt(it.qty || it.quantity) || 1), 0), 0);

  /* -- Profit: revenue - proportional cost of sold units (NO cashback added) -- */
  const costPerUnit   = totalUnitsOrdered > 0 ? totalCost / totalUnitsOrdered : 0;
  const soldCost      = costPerUnit * totalUnitsSold;
  const hasSale       = totalRevenue > 0;
  const orderProfit   = hasSale ? totalRevenue - soldCost : 0;
  const profitMargin  = hasSale && totalRevenue > 0 ? ((orderProfit / totalRevenue) * 100).toFixed(1) : '0';
  const profitColor   = orderProfit >= 0 ? 'var(--terrain)' : 'var(--crimson)';

  const orderNumber = order.order_number || order.id?.slice(0, 8);

  return (
    <div style={{
      background:'var(--parch-card)', border:'1px solid var(--parch-line)',
      borderRadius:12, marginBottom:12, overflow:'hidden',
    }}>

      {/* -- Collapsed header -- */}
      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'12px 14px',
        cursor:'pointer', borderBottom: expanded ? '1px solid var(--parch-line)' : 'none',
      }} onClick={() => setExpanded(e => !e)}>

        <input type="checkbox" checked={selected}
          onClick={e => e.stopPropagation()}
          onChange={() => onToggleSelect(order.id)}
          style={{ width:16, height:16, cursor:'pointer', flexShrink:0 }}/>

        <RetailerLogo retailer={order.retailer} size={30}/>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
            <span style={{ fontFamily:'var(--font-serif)', fontSize:13, fontWeight:700, color:'var(--ink)' }}>
              #{orderNumber}
            </span>
            <StatusBadge status={order.status}/>
            {order.order_type && (
              <span style={{
                fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:99,
                background:'var(--parch-warm)', border:'1px solid var(--parch-line)',
                color:'var(--ink-ghost)', fontFamily:'var(--font-serif)', textTransform:'uppercase', letterSpacing:'0.06em',
              }}>
                {order.order_type}
              </span>
            )}
          </div>
          <span style={{ fontSize:11, color:'var(--ink-dim)' }}>
            {order.retailer} {fmtDate(order.order_date)}
          </span>
        </div>

        {/* Collapsed stats */}
        <div style={{ display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:9, fontWeight:700, color:'var(--ink-ghost)', letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:'var(--font-serif)' }}>
              {totalUnitsOrdered} item{totalUnitsOrdered !== 1 ? 's' : ''}
            </div>
          </div>
          {hasSale && (
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--ink-ghost)', letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:'var(--font-serif)', marginBottom:1 }}>Profit</div>
              <div style={{ fontSize:12, fontWeight:700, color:profitColor, fontFamily:'var(--font-mono)' }}>
                {orderProfit >= 0 ? '+' : ''}{fmt$(orderProfit, '$0.00')}
              </div>
            </div>
          )}
          {totalCashback > 0 && (
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:9, fontWeight:700, color:'var(--ink-ghost)', letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:'var(--font-serif)', marginBottom:1 }}>CB</div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--violet)', fontFamily:'var(--font-mono)' }}>
                {fmt$(totalCashback, '$0.00')}
              </div>
            </div>
          )}
          <ProgressDots status={order.status}/>
          <div style={{ width:28, height:28, borderRadius:7, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-faded)', flexShrink:0 }}>
            {expanded
              ? <ChevronUp style={{ width:14, height:14 }}/>
              : <ChevronDown style={{ width:14, height:14 }}/>}
          </div>
        </div>
      </div>

      {/* -- Expanded content -- */}
      {expanded && (
        <>
          {/* Items */}
          {items.map((item, idx) => {
            const unitCost  = parseFloat(item.unit_cost) || 0;
            const qtyOrd    = parseInt(item.quantity_ordered) || 1;
            const itemName  = item.product_name || 'Unknown Product';
            const itemImage = item.product_image_url || item.product_image || item.image_url || item.image || '';

            /* Units sold and revenue for THIS item specifically */
            const itemUnitsSold = saleEvents.reduce((s, ev) =>
              s + (ev.items || []).reduce((ss, evIt) => {
                const match = (evIt.product_name || '').toLowerCase() === itemName.toLowerCase();
                return ss + (match ? (parseInt(evIt.qty || evIt.quantity) || 1) : 0);
              }, 0), 0);

            const itemRevenue = saleEvents.reduce((s, ev) =>
              s + (ev.items || []).reduce((ss, evIt) => {
                const match = (evIt.product_name || '').toLowerCase() === itemName.toLowerCase();
                return ss + (match ? (parseFloat(evIt.sale_price) || 0) * (parseInt(evIt.qty || evIt.quantity) || 1) : 0);
              }, 0), 0);

            /* Per-item cashback split evenly across items */
            const itemCB = items.length > 0 ? totalCashback / items.length : 0;

            /* Full order cost per unit (includes tax/fees proportionally) */
            const fullCostPerUnit = totalUnitsOrdered > 0 ? totalCost / totalUnitsOrdered : unitCost;

            const itemProfit = itemRevenue > 0
              ? itemRevenue - (fullCostPerUnit * itemUnitsSold)
              : null;

            return (
              <div key={idx} style={{ borderTop:'1px solid var(--parch-line)' }}>
                {/* Item row */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 70px 90px 70px 90px 90px', gap:10, padding:'12px 14px', alignItems:'center' }}>
                  {/* Product info */}
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                    <ProductImg src={itemImage} name={itemName} size={44}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12, fontWeight:600, color:'var(--ink)', margin:'0 0 3px', lineHeight:1.3 }}>
                        {itemName}
                      </p>
                      {item.upc && (
                        <p style={{ fontSize:9, color:'var(--ink-ghost)', margin:0, fontFamily:'var(--font-mono)' }}>
                          {item.upc}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ordered */}
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2, fontFamily:'var(--font-serif)' }}>Ordered</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', fontFamily:'var(--font-mono)' }}>{qtyOrd}x</div>
                  </div>

                  {/* Cost/unit */}
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2, fontFamily:'var(--font-serif)' }}>Cost/Unit</div>
                    <div style={{ fontSize:12, color:'var(--ink-dim)', fontFamily:'var(--font-mono)' }}>{fmt$(unitCost)}</div>
                  </div>

                  {/* Sold */}
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2, fontFamily:'var(--font-serif)' }}>Sold</div>
                    <div style={{ fontSize:13, fontWeight:700, color: itemUnitsSold > 0 ? 'var(--terrain)' : 'var(--ink-ghost)', fontFamily:'var(--font-mono)' }}>
                      {itemUnitsSold}/{qtyOrd}
                    </div>
                  </div>

                  {/* Sale price avg */}
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2, fontFamily:'var(--font-serif)' }}>Sale Price</div>
                    <div style={{ fontSize:12, fontWeight:600, fontFamily:'var(--font-mono)', color: itemRevenue > 0 ? 'var(--terrain)' : 'var(--ink-ghost)' }}>
                      {itemRevenue > 0 ? fmt$(itemRevenue / (itemUnitsSold || 1)) : '--'}
                    </div>
                  </div>

                  {/* Profit */}
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2, fontFamily:'var(--font-serif)' }}>Profit</div>
                    <div style={{
                      fontSize:12, fontWeight:700, fontFamily:'var(--font-mono)',
                      color: itemProfit === null ? 'var(--ink-ghost)' : itemProfit >= 0 ? 'var(--terrain)' : 'var(--crimson)'
                    }}>
                      {itemProfit === null ? '--' : `${itemProfit >= 0 ? '+' : ''}${itemProfit.toFixed(2)}`}
                    </div>
                  </div>
                </div>

                {/* Cashback row if exists */}
                {itemCB > 0 && (
                  <div style={{ padding:'0 14px 8px 68px', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:9, fontWeight:700, color:'var(--violet)', fontFamily:'var(--font-serif)', textTransform:'uppercase', letterSpacing:'0.08em' }}>CB</span>
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--violet)', fontFamily:'var(--font-mono)' }}>{fmt$(itemCB)}</span>
                  </div>
                )}

                {/* Sale event sub-rows */}
                {saleEvents.map((ev, evIdx) => {
                  const evItems = (ev.items || []).filter(it =>
                    (it.product_name || '').toLowerCase() === itemName.toLowerCase());
                  return evItems.map((it, itIdx) => {
                    const evQty      = parseInt(it.qty || it.quantity) || 1;
                    const evSaleUnit = parseFloat(it.sale_price) || 0;  // per-unit price
                    const evTotal    = evSaleUnit * evQty;               // total revenue for this sale
                    const evCost     = fullCostPerUnit * evQty;          // full order cost (tax/fees included)
                    const evCB       = itemCB / Math.max(saleEvents.length, 1);
                    const evProfit   = evSaleUnit > 0 ? evTotal - evCost : null;
                    return (
                      <div key={`${evIdx}-${itIdx}`} style={{
                        display:'grid', gridTemplateColumns:'1fr 70px 90px 70px 90px 90px',
                        gap:10, padding:'7px 14px 7px 68px',
                        alignItems:'center', background:'var(--parch-warm)',
                        borderTop:'1px solid var(--parch-line)', fontSize:11,
                      }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--terrain)', flexShrink:0 }}/>
                          <span style={{ color:'var(--terrain)', fontWeight:600, fontSize:11 }}>
                            {ev.buyer || 'Buyer'}
                          </span>
                          <span style={{ color:'var(--ink-ghost)', fontSize:10 }}>
                            {fmtDate(ev.sale_date)}
                          </span>
                        </div>
                        <div style={{ textAlign:'right', color:'var(--ink-dim)', fontFamily:'var(--font-mono)' }}>
                          {evQty} unit{evQty !== 1 ? 's' : ''}
                        </div>
                        <div style={{ textAlign:'right', color:'var(--ink-ghost)' }}>--</div>
                        <div/>
                        <div style={{ textAlign:'right', color:'var(--terrain)', fontWeight:700, fontFamily:'var(--font-mono)' }}>
                          {evSaleUnit > 0 ? (
                            <div>
                              <div style={{ fontSize:12 }}>{fmt$(evSaleUnit)}</div>
                              {evQty > 1 && (
                                <div style={{ fontSize:10, color:'var(--terrain)', opacity:0.7 }}>
                                  = {fmt$(evTotal)}
                                </div>
                              )}
                            </div>
                          ) : '--'}
                        </div>
                        <div style={{
                          textAlign:'right', fontWeight:700, fontFamily:'var(--font-mono)',
                          color: evProfit === null ? 'var(--ink-ghost)' : evProfit >= 0 ? 'var(--terrain)' : 'var(--crimson)',
                        }}>
                          {evProfit === null ? '--' : `${evProfit >= 0 ? '+' : ''}${evProfit.toFixed(2)}`}
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            );
          })}

          {items.length === 0 && (
            <div style={{ padding:'18px 14px', textAlign:'center', fontSize:12, color:'var(--ink-ghost)' }}>
              No items recorded
            </div>
          )}

          {/* -- Footer -- */}
          <div style={{
            display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
            background:'var(--parch-warm)', flexWrap:'wrap', borderTop:'1px solid var(--parch-line)',
          }}>
            <span style={{ fontSize:12, color:'var(--ink-faded)' }}>
              Total: <strong style={{ color:'var(--ink)', fontFamily:'var(--font-mono)' }}>{fmt$(totalCost, '$0.00')}</strong>
            </span>
            {hasSale && (
              <>
                <span style={{ color:'var(--parch-line)' }}>|</span>
                <span style={{ fontSize:11, color:'var(--ink-faded)' }}>
                  Revenue: <strong style={{ color:'var(--terrain)', fontFamily:'var(--font-mono)' }}>{fmt$(totalRevenue, '$0.00')}</strong>
                </span>
              </>
            )}
            {totalCashback > 0 && (
              <>
                <span style={{ color:'var(--parch-line)' }}>|</span>
                <span style={{ fontSize:11, color:'var(--ink-faded)' }}>
                  CB: <strong style={{ color:'var(--violet)', fontFamily:'var(--font-mono)' }}>{fmt$(totalCashback, '$0.00')}</strong>
                </span>
              </>
            )}
            {hasSale && (
              <>
                <span style={{ color:'var(--parch-line)' }}>|</span>
                <span style={{ fontSize:11, fontWeight:700, color:profitColor, fontFamily:'var(--font-mono)' }}>
                  Profit: {orderProfit >= 0 ? '+' : ''}{fmt$(orderProfit, '$0.00')} ({profitMargin}%)
                </span>
              </>
            )}
            {order.order_number && (
              <>
                <span style={{ color:'var(--parch-line)' }}>|</span>
                <span style={{ fontSize:10, color:'var(--ink-ghost)', fontFamily:'var(--font-mono)' }}>
                  Order #: {order.order_number}
                </span>
              </>
            )}

            {nextStep && (
              <button onClick={e => { e.stopPropagation(); handleNextStep(); }} disabled={updatingStatus}
                style={{
                  display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:7,
                  fontSize:10, fontWeight:700, border:'1px solid var(--terrain-bdr)',
                  background:'var(--terrain-bg)', color:'var(--terrain)', cursor:'pointer',
                  fontFamily:'var(--font-serif)', opacity: updatingStatus ? 0.6 : 1,
                }}>
                <nextStep.Icon style={{ width:11, height:11 }}/> {nextStep.label}
              </button>
            )}

            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
              <button onClick={e => { e.stopPropagation(); onEdit(order); }}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:'1px solid var(--parch-line)', background:'transparent', color:'var(--ink-faded)', cursor:'pointer', fontFamily:'var(--font-serif)' }}>
                <Pencil style={{ width:11, height:11 }}/> Edit
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(order); }}
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

/* ------------------------------------------------------------------ */
/*  MAIN EXPORT                                                         */
/* ------------------------------------------------------------------ */
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

  if (!data?.length) return (
    <div style={{ textAlign:'center', padding:'56px 20px', background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:12 }}>
      <Package style={{ width:36, height:36, color:'var(--ink-ghost)', margin:'0 auto 12px' }}/>
      <p style={{ fontSize:14, fontWeight:700, color:'var(--ink)', marginBottom:6, fontFamily:'var(--font-serif)' }}>No orders found</p>
      <p style={{ fontSize:12, color:'var(--ink-faded)', marginBottom:16 }}>Try adjusting your filters or add a new order</p>
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
      {(data || []).filter(Boolean).map(order => (
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