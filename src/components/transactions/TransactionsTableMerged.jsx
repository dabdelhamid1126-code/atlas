import React, { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp, ExternalLink, Package, Truck, CheckCircle2, Loader } from 'lucide-react';
import RetailerLogo from '@/components/shared/BrandLogo';

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('T')[0].split('-');
  return `${parseInt(month)}/${parseInt(day)}/${year}`;
}

function getCashbackDisplay(rewards, orderId) {
  const r = rewards.filter(r => r.purchase_order_id === orderId);
  if (!r.length) return null;
  const usd = r.filter(x => x.currency === 'USD').reduce((s, x) => s + parseFloat(x.amount || 0), 0);
  const pts = r.filter(x => x.currency === 'points').reduce((s, x) => s + parseFloat(x.amount || 0), 0);
  if (usd > 0 && pts > 0) return `$${usd.toFixed(2)} + ${Math.round(pts)} pts`;
  if (usd > 0) return `$${usd.toFixed(2)}`;
  if (pts > 0) return `${Math.round(pts)} pts`;
  return null;
}

function getTrackingUrl(trackingNumber, carrier) {
  if (!trackingNumber) return null;
  const t = trackingNumber.toUpperCase();
  const c = (carrier || '').toUpperCase();
  if (c.includes('FEDEX') || /^[0-9]{20}/.test(t)) return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  if (c.includes('UPS') || t.startsWith('1Z')) return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  if (c.includes('USPS')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  return `https://www.google.com/search?q=${encodeURIComponent(trackingNumber)}+package+tracking`;
}

// ── Status config ─────────────────────────────────────────────────────────

const STATUS_META = {
  ordered:            { label:'Ordered',     color:'var(--ocean)',   bg:'var(--ocean-bg)',   bdr:'var(--ocean-bdr)'   },
  processing:         { label:'Processing',  color:'var(--gold)',    bg:'var(--gold-bg)',    bdr:'var(--gold-bdr)'    },
  shipped:            { label:'Shipped',     color:'var(--gold)',    bg:'var(--gold-bg)',    bdr:'var(--gold-bdr)'    },
  delivered:          { label:'Delivered',   color:'var(--terrain)', bg:'var(--terrain-bg)', bdr:'var(--terrain-bdr)' },
  received:           { label:'Received',    color:'var(--terrain)', bg:'var(--terrain-bg)', bdr:'var(--terrain-bdr)' },
  partially_received: { label:'Partial',     color:'var(--gold)',    bg:'var(--gold-bg)',    bdr:'var(--gold-bdr)'    },
  cancelled:          { label:'Cancelled',   color:'var(--crimson)', bg:'var(--crimson-bg)', bdr:'var(--crimson-bdr)' },
  returned:           { label:'Returned',    color:'var(--crimson)', bg:'var(--crimson-bg)', bdr:'var(--crimson-bdr)' },
  pending:            { label:'Pending',     color:'var(--gold)',    bg:'var(--gold-bg)',    bdr:'var(--gold-bdr)'    },
};

const STATUS_STEPS = ['ordered', 'shipped', 'delivered', 'received'];

const NEXT_STEP = {
  ordered:    { status:'shipped',   label:'Mark shipped',   Icon: Truck        },
  processing: { status:'shipped',   label:'Mark shipped',   Icon: Truck        },
  shipped:    { status:'delivered', label:'Mark delivered', Icon: Package      },
  delivered:  { status:'received',  label:'Mark received',  Icon: CheckCircle2 },
};

// ── Sub-components ────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status || '—', color:'var(--ink-faded)', bg:'var(--parch-warm)', bdr:'var(--parch-line)' };
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', fontSize:10, fontWeight:700,
      padding:'3px 8px', borderRadius:99, whiteSpace:'nowrap',
      fontFamily:"'Playfair Display', serif",
      background:meta.bg, color:meta.color, border:`1px solid ${meta.bdr}`,
    }}>
      {meta.label}
    </span>
  );
}

function ProgressDots({ status }) {
  const idx  = STATUS_STEPS.indexOf(status);
  const done = status === 'received';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
      {STATUS_STEPS.map((step, i) => {
        const isDone   = done || i < idx;
        const isActive = i === idx && !done;
        return (
          <React.Fragment key={step}>
            <div style={{
              width:7, height:7, borderRadius:'50%', flexShrink:0,
              background: isDone ? 'var(--terrain)' : isActive ? 'var(--gold)' : 'var(--parch-line)',
              outline: isActive ? '2px solid var(--gold-bdr)' : 'none',
              outlineOffset: 1,
            }}/>
            {i < STATUS_STEPS.length - 1 && (
              <div style={{ width:10, height:2, borderRadius:1, flexShrink:0, background: isDone ? 'var(--terrain)' : 'var(--parch-line)' }}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Order row ─────────────────────────────────────────────────────────────

function OrderRow({ order, creditCards, rewards, products, onEdit, onDelete, onQuickStatus, isSelected, onSelectChange }) {
  const [expanded,       setExpanded]       = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const totalCost = parseFloat(order.total_cost) || 0;
  const totalSale = (order.items || []).reduce((s, i) => s + (parseFloat(i.sale_price) || 0) * (parseInt(i.quantity_ordered) || 1), 0);
  const profit    = totalSale > 0 ? totalSale - totalCost : null;
  const cashback  = getCashbackDisplay(rewards, order.id);
  const card      = creditCards.find(c => c.id === order.credit_card_id);
  const nextStep  = NEXT_STEP[order.status];

  const handleNextStep = async (e) => {
    e.stopPropagation();
    if (!nextStep || updatingStatus || !onQuickStatus) return;
    setUpdatingStatus(true);
    try { await onQuickStatus(order, nextStep.status); }
    finally { setUpdatingStatus(false); }
  };

  return (
    <div style={{
      background:'var(--parch-card)', border:'1px solid var(--parch-line)',
      borderRadius:12, marginBottom:8, overflow:'hidden',
    }}>
      {/* ── Header row ── */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', cursor:'pointer', borderBottom: expanded ? '1px solid var(--parch-line)' : 'none' }}
      >
        {/* Checkbox */}
        <div onClick={e => e.stopPropagation()}>
          <input
            type="checkbox" checked={isSelected}
            onChange={e => onSelectChange?.(order.id, e.target.checked)}
            style={{ accentColor:'var(--gold)', width:14, height:14, cursor:'pointer' }}
          />
        </div>

        {/* Logo */}
        <div style={{ width:40, height:40, borderRadius:9, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
          <RetailerLogo retailer={order.retailer} size={40}/>
        </div>

        {/* Order # + date */}
        <div style={{ minWidth:0, flexShrink:0, width:180 }}>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--ocean)', fontFamily:"'Playfair Display', serif", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {order.order_number ? `#${order.order_number}` : '—'}
          </p>
          <p style={{ fontSize:11, color:'var(--ink-faded)', marginTop:1 }}>{fmtDate(order.order_date || order.created_date)}</p>
        </div>

        {/* Items badge */}
        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--parch-warm)', color:'var(--ink-faded)', border:'1px solid var(--parch-line)', flexShrink:0, whiteSpace:'nowrap' }}>
          {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
        </span>

        {/* Order type */}
        {order.order_type && (
          <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99, flexShrink:0,
            background: order.order_type === 'churning' ? 'var(--gold-bg)' : 'var(--ocean-bg)',
            color:      order.order_type === 'churning' ? 'var(--gold)'    : 'var(--ocean)',
            border:     `1px solid ${order.order_type === 'churning' ? 'var(--gold-bdr)' : 'var(--ocean-bdr)'}`,
          }}>
            {order.order_type}
          </span>
        )}

        {/* Spacer */}
        <div style={{ flex:1 }}/>

        {/* Metrics */}
        <div style={{ display:'flex', alignItems:'center', gap:20, flexShrink:0 }}>
          <div style={{ textAlign:'right', minWidth:70 }}>
            <p style={{ fontSize:9, fontWeight:700, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2, fontFamily:"'Playfair Display', serif" }}>Cost</p>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>${totalCost.toFixed(2)}</p>
          </div>
          <div style={{ textAlign:'right', minWidth:70 }}>
            <p style={{ fontSize:9, fontWeight:700, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2, fontFamily:"'Playfair Display', serif" }}>Profit</p>
            <p style={{ fontSize:13, fontWeight:700, color: profit === null ? 'var(--ink-ghost)' : profit >= 0 ? 'var(--terrain)' : 'var(--crimson)' }}>
              {profit === null ? '—' : `${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`}
            </p>
          </div>
          <div style={{ textAlign:'right', minWidth:70 }}>
            <p style={{ fontSize:9, fontWeight:700, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2, fontFamily:"'Playfair Display', serif" }}>Cashback</p>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--ocean)' }}>{cashback || '—'}</p>
          </div>
          <div style={{ textAlign:'right', minWidth:110 }}>
            <p style={{ fontSize:9, fontWeight:700, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2, fontFamily:"'Playfair Display', serif" }}>Payment</p>
            {order.payment_splits?.length > 1 ? (
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--ocean-bg)', color:'var(--ocean)', border:'1px solid var(--ocean-bdr)' }}>
                Split ×{order.payment_splits.length}
              </span>
            ) : (
              <p style={{ fontSize:11, fontWeight:600, color:'var(--ink-dim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110 }}>
                {card ? `${card.card_name}${card.last_4_digits ? ` ••••${card.last_4_digits}` : ''}` : '—'}
              </p>
            )}
          </div>
          <StatusBadge status={order.status}/>
          <ProgressDots status={order.status}/>
          {nextStep && (
            <button onClick={handleNextStep} disabled={updatingStatus}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:'1px solid var(--ocean-bdr)', background:'var(--ocean-bg)', color:'var(--ocean)', cursor: updatingStatus ? 'not-allowed' : 'pointer', opacity: updatingStatus ? 0.6 : 1, fontFamily:"'Playfair Display', serif", whiteSpace:'nowrap' }}>
              {updatingStatus
                ? <Loader style={{ width:11, height:11, animation:'spin 0.8s linear infinite' }}/>
                : <nextStep.Icon style={{ width:11, height:11 }}/>
              }
              {nextStep.label}
            </button>
          )}
        </div>

        {/* Chevron */}
        <div style={{ flexShrink:0, color:'var(--ink-ghost)', marginLeft:4 }}>
          {expanded ? <ChevronUp style={{ width:15, height:15 }}/> : <ChevronDown style={{ width:15, height:15 }}/>}
        </div>
      </div>

      {/* ── Expanded section ── */}
      {expanded && (
        <div style={{ background:'var(--parch-warm)', padding:'12px 14px' }}>

          {/* Items */}
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:12 }}>
            {!(order.items?.length) ? (
              <p style={{ fontSize:12, color:'var(--ink-ghost)', fontStyle:'italic' }}>No items recorded</p>
            ) : (order.items || []).map((item, idx) => {
              const itemCost   = parseFloat(item.unit_cost)  || 0;
              const itemSale   = parseFloat(item.sale_price) || 0;
              const itemQty    = parseInt(item.quantity_ordered) || 1;
              const itemProfit = itemSale > 0 ? (itemSale - itemCost) * itemQty : null;
              const hasSale    = itemSale > 0;
              const trackUrl   = getTrackingUrl(order.tracking_number, order.carrier);
              const prod       = products?.find(p => p.id === item.product_id);
              const imgUrl     = item.image_url || prod?.image || null;

              return (
                <div key={idx} style={{ background:'var(--parch-card)', borderRadius:10, border:'1px solid var(--parch-line)', padding:'10px 12px', display:'flex', alignItems:'center', gap:12 }}>
                  {/* Image */}
                  <div style={{ width:40, height:40, borderRadius:8, overflow:'hidden', border:'1px solid var(--parch-line)', background:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {imgUrl
                      ? <img src={imgUrl} alt={item.product_name} style={{ width:40, height:40, objectFit:'contain' }}/>
                      : <Package style={{ width:18, height:18, color:'var(--ink-ghost)' }}/>
                    }
                  </div>

                  {/* Name + tracking */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.product_name || '—'}</p>
                    {order.tracking_number && (
                      <a href={trackUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:10, color:'var(--ocean)', textDecoration:'none', marginTop:2 }}>
                        <ExternalLink style={{ width:9, height:9 }}/>{order.tracking_number}
                      </a>
                    )}
                  </div>

                  {/* Stats */}
                  <div style={{ display:'flex', alignItems:'center', gap:20, flexShrink:0, fontSize:12 }}>
                    {[
                      { label:'Qty',       val: String(itemQty),                                   color:'var(--ink-dim)'  },
                      { label:'Cost/unit', val: `$${itemCost.toFixed(2)}`,                         color:'var(--ink)'      },
                      { label:'Sale/unit', val: hasSale ? `$${itemSale.toFixed(2)}` : '—',         color: hasSale ? 'var(--terrain)' : 'var(--ink-ghost)' },
                      { label:'Profit',    val: itemProfit !== null ? `${itemProfit >= 0 ? '+' : ''}$${itemProfit.toFixed(2)}` : '—', color: itemProfit === null ? 'var(--ink-ghost)' : itemProfit >= 0 ? 'var(--terrain)' : 'var(--crimson)' },
                    ].map(col => (
                      <div key={col.label} style={{ textAlign:'right', minWidth:60 }}>
                        <p style={{ fontSize:9, fontWeight:700, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2, fontFamily:"'Playfair Display', serif" }}>{col.label}</p>
                        <p style={{ fontSize:12, fontWeight:700, color:col.color }}>{col.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Split payment */}
          {order.payment_splits?.length > 1 && (
            <div style={{ background:'var(--ocean-bg)', border:'1px solid var(--ocean-bdr)', borderRadius:10, padding:'10px 12px', marginBottom:12 }}>
              <p style={{ fontSize:9, fontWeight:700, color:'var(--ocean)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8, fontFamily:"'Playfair Display', serif" }}>Split payment</p>
              {order.payment_splits.map((sp, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                  <span style={{ color:'var(--ink-dim)', fontWeight:600 }}>{sp.card_name}</span>
                  <span style={{ color:'var(--ink)', fontWeight:700 }}>${(sp.amount || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Summary + actions */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, paddingTop:10, borderTop:'1px solid var(--parch-line)', flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:16, fontSize:12, color:'var(--ink-faded)', flexWrap:'wrap' }}>
              <span>Cost: <strong style={{ color:'var(--ink)' }}>${totalCost.toFixed(2)}</strong></span>
              {totalSale > 0 && <span>Sale: <strong style={{ color:'var(--ink)' }}>${totalSale.toFixed(2)}</strong></span>}
              {profit !== null && (
                <span>Profit: <strong style={{ color: profit >= 0 ? 'var(--terrain)' : 'var(--crimson)' }}>
                  {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                </strong></span>
              )}
              {cashback && <span>Cashback: <strong style={{ color:'var(--ocean)' }}>{cashback}</strong></span>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }} onClick={e => e.stopPropagation()}>
              <button onClick={() => onEdit?.(order)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, fontSize:11, fontWeight:700, border:'1px solid var(--parch-line)', background:'transparent', color:'var(--ink-faded)', cursor:'pointer', fontFamily:"'Playfair Display', serif" }}>
                <Pencil style={{ width:11, height:11 }}/> Edit
              </button>
              <button onClick={() => onDelete?.(order)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, fontSize:11, fontWeight:700, border:'1px solid var(--crimson-bdr)', background:'var(--crimson-bg)', color:'var(--crimson)', cursor:'pointer', fontFamily:"'Playfair Display', serif" }}>
                <Trash2 style={{ width:11, height:11 }}/> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────

export default function TransactionsTableMerged({
  data = [], creditCards = [], rewards = [], products = [],
  isLoading = false, selectedIds = new Set(),
  onSelectionChange, onEdit, onDelete, onQuickStatus,
  visibleColumns, sortColumn, sortDirection, onSort, onView,
}) {
  const handleSelectAll = (checked) => {
    onSelectionChange?.(checked ? new Set(data.map(o => o.id)) : new Set());
  };

  const handleSelectRow = (id, checked) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    onSelectionChange?.(next);
  };

  if (isLoading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ height:64, borderRadius:12, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', animation:'pulse 1.5s ease-in-out infinite', opacity: 1 - i * 0.15 }}/>
      ))}
    </div>
  );

  if (!data.length) return (
    <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--ink-ghost)', fontSize:13 }}>
      No transactions found
    </div>
  );

  return (
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Select all header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 14px', marginBottom:4 }}>
        <input
          type="checkbox"
          checked={data.length > 0 && data.every(o => selectedIds.has(o.id))}
          onChange={e => handleSelectAll(e.target.checked)}
          style={{ accentColor:'var(--gold)', width:14, height:14, cursor:'pointer' }}
        />
        <span style={{ fontSize:10, fontWeight:700, color:'var(--ink-ghost)', textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:"'Playfair Display', serif" }}>
          {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
        </span>
      </div>

      {data.map(order => (
        <OrderRow
          key={order.id}
          order={order}
          creditCards={creditCards}
          rewards={rewards}
          products={products}
          onEdit={onEdit}
          onDelete={onDelete}
          onQuickStatus={onQuickStatus}
          isSelected={selectedIds.has(order.id)}
          onSelectChange={handleSelectRow}
        />
      ))}
    </div>
  );
}