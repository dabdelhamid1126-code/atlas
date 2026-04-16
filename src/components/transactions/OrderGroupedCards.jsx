import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronDown, ChevronUp, Edit2, Trash2, CheckCircle2,
  Truck, ScanLine, DollarSign, Package, ImageOff, ArrowRight,
  Loader,
} from 'lucide-react';
import RetailerLogo from '@/components/shared/BrandLogo';

// ── Helpers ───────────────────────────────────────────────────────────────

const fmt$ = (v) => {
  const n = parseFloat(v) || 0;
  if (n === 0) return '—';
  return n < 0 ? `-$${Math.abs(n).toFixed(2)}` : `$${n.toFixed(2)}`;
};

const fmtDate = (d) => {
  try { return d ? format(new Date(d), 'MMM d, yyyy') : '—'; } catch { return '—'; }
};

// ── Status config ─────────────────────────────────────────────────────────

const STATUS_STEPS = ['ordered', 'processing', 'shipped', 'delivered', 'received'];

const STATUS_META = {
  ordered:             { label:'Ordered',            color:'var(--ocean)',   bg:'var(--ocean-bg)',   bdr:'var(--ocean-bdr)' },
  processing:          { label:'Processing',         color:'var(--gold)',    bg:'var(--gold-bg)',    bdr:'var(--gold-bdr)'  },
  shipped:             { label:'Shipped',             color:'var(--gold)',    bg:'var(--gold-bg)',    bdr:'var(--gold-bdr)'  },
  delivered:           { label:'Delivered',           color:'var(--terrain)', bg:'var(--terrain-bg)', bdr:'var(--terrain-bdr)'},
  received:            { label:'Received',            color:'var(--terrain)', bg:'var(--terrain-bg)', bdr:'var(--terrain-bdr)'},
  partially_received:  { label:'Part. Received',      color:'var(--gold)',    bg:'var(--gold-bg)',    bdr:'var(--gold-bdr)'  },
  cancelled:           { label:'Cancelled',           color:'var(--crimson)', bg:'var(--crimson-bg)', bdr:'var(--crimson-bdr)'},
  returned:            { label:'Returned',            color:'var(--crimson)', bg:'var(--crimson-bg)', bdr:'var(--crimson-bdr)'},
};

const NEXT_STEP = {
  ordered:    { status:'shipped',   label:'Mark shipped',    Icon: Truck        },
  processing: { status:'shipped',   label:'Mark shipped',    Icon: Truck        },
  shipped:    { status:'delivered', label:'Mark delivered',  Icon: Package      },
  delivered:  { status:'received',  label:'Mark received',   Icon: ScanLine     },
};

// ── Progress dots ─────────────────────────────────────────────────────────

function ProgressDots({ status }) {
  const idx = STATUS_STEPS.indexOf(status);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:3 }}>
      {STATUS_STEPS.map((step, i) => {
        const done   = i < idx || (idx >= STATUS_STEPS.length - 1);
        const active = i === idx && idx < STATUS_STEPS.length - 1;
        return (
          <React.Fragment key={step}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: done ? 'var(--terrain)' : active ? 'var(--gold)' : 'var(--parch-line)',
              border: active ? '2px solid var(--gold-bdr)' : 'none',
              flexShrink: 0,
            }}/>
            {i < STATUS_STEPS.length - 1 && (
              <div style={{ width:12, height:2, borderRadius:1, background: i < idx ? 'var(--terrain)' : 'var(--parch-line)', flexShrink:0 }}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, color:'var(--ink-faded)', bg:'var(--parch-warm)', bdr:'var(--parch-line)' };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:meta.bg, color:meta.color, border:`1px solid ${meta.bdr}`, letterSpacing:'0.02em', fontFamily:'var(--font-serif)' }}>
      {meta.label}
    </span>
  );
}

// ── Product image ─────────────────────────────────────────────────────────

function ProductImage({ src, name, size = 36 }) {
  const [err, setErr] = useState(false);
  if (!src || err) return (
    <div style={{ width:size, height:size, borderRadius:8, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <ImageOff style={{ width:size*0.4, height:size*0.4, color:'var(--ink-ghost)' }}/>
    </div>
  );
  return (
    <img src={src} alt={name} onError={() => setErr(true)}
      style={{ width:size, height:size, borderRadius:8, objectFit:'contain', background:'white', border:'1px solid var(--parch-line)', flexShrink:0 }}/>
  );
}

// ── Order card ────────────────────────────────────────────────────────────

function OrderCard({ order, creditCards, rewards, products, giftCards, onEdit, onDelete, onQuickStatus, selected, onToggleSelect }) {
  const [expanded, setExpanded] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const card = creditCards?.find(c => c.id === order.credit_card_id);
  const orderRewards = (rewards || []).filter(r => r.purchase_order_id === order.id);
  const totalCashback = orderRewards.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const gcTotal = (order.gift_card_ids || []).reduce((s, gcId) => {
    const gc = (giftCards || []).find(g => g.id === gcId);
    return s + (parseFloat(gc?.amount) || 0);
  }, 0);

  const nextStep = NEXT_STEP[order.status];

  const handleNextStep = async () => {
    if (!nextStep || updatingStatus) return;
    setUpdatingStatus(true);
    try { await onQuickStatus(order, nextStep.status); }
    finally { setUpdatingStatus(false); }
  };

  // Per-item calcs
  const items = order.items || [];
  const itemsSaleTotal = items.reduce((s, i) => s + (parseFloat(i.sale_price) || 0) * (parseInt(i.quantity_ordered) || 1), 0);
  const itemsCostTotal = items.reduce((s, i) => s + (parseFloat(i.unit_cost) || 0) * (parseInt(i.quantity_ordered) || 1), 0);
  const orderProfit    = itemsSaleTotal > 0 ? itemsSaleTotal - itemsCostTotal + totalCashback : 0;
  const hasSale        = itemsSaleTotal > 0;

  const S = {
    card: { background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:12, marginBottom:10, overflow:'hidden' },
    hdr:  { display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderBottom: expanded ? '1px solid var(--parch-line)' : 'none', cursor:'pointer' },
    meta: { flex:1, minWidth:0 },
    ordNum:{ fontSize:13, fontWeight:700, color:'var(--ocean)', fontFamily:'var(--font-serif)', marginBottom:2 },
    ordSub:{ fontSize:11, color:'var(--ink-faded)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' },
    // Column headers
    colHdrs:{ display:'grid', gridTemplateColumns:'40px 1fr 44px 80px 80px 80px 80px 100px', gap:6, padding:'6px 14px', borderBottom:'1px solid var(--parch-line)', alignItems:'center' },
    colHdr: { fontSize:10, fontWeight:700, color:'var(--ink-ghost)', textAlign:'right', letterSpacing:'0.06em', textTransform:'uppercase' },
    // Item rows
    itemRow:{ display:'grid', gridTemplateColumns:'40px 1fr 44px 80px 80px 80px 80px 100px', gap:6, padding:'10px 14px', borderBottom:'1px solid var(--parch-line)', alignItems:'center' },
    itemName:{ fontSize:12, fontWeight:600, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
    itemSku: { fontSize:10, color:'var(--ink-ghost)', marginTop:1 },
    colVal:  { fontSize:12, textAlign:'right', color:'var(--ink-faded)' },
    footer:  { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--parch-warm)', flexWrap:'wrap' },
  };

  return (
    <div style={S.card}>
      {/* Header */}
      <div style={S.hdr}>
        {/* Checkbox */}
        <div onClick={e => { e.stopPropagation(); onToggleSelect(order.id); }}
          style={{ width:16, height:16, borderRadius:4, border:'1px solid var(--parch-line)', background: selected ? 'var(--ink)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer' }}>
          {selected && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="var(--ne-cream)" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        </div>

        {/* Logo */}
        <div style={{ width:36, height:36, borderRadius:8, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
          <RetailerLogo retailer={order.retailer} size={36}/>
        </div>

        {/* Info */}
        <div style={S.meta} onClick={() => setExpanded(v => !v)}>
          <div style={S.ordNum}>
            #{order.order_number || 'No order #'}
          </div>
          <div style={S.ordSub}>
            <span>{order.retailer || 'Unknown'}</span>
            <span style={{ color:'var(--parch-line)' }}>·</span>
            <span>{fmtDate(order.order_date)}</span>
            {order.order_type && (
              <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:99, background: order.order_type==='churning' ? 'var(--gold-bg)' : 'var(--ocean-bg)', color: order.order_type==='churning' ? 'var(--gold)' : 'var(--ocean)', border:`1px solid ${order.order_type==='churning' ? 'var(--gold-bdr)' : 'var(--ocean-bdr)'}` }}>
                {order.order_type}
              </span>
            )}
          </div>
        </div>

        {/* Right side: status + progress + next step */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }} onClick={e => e.stopPropagation()}>
          <StatusBadge status={order.status}/>
          <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--parch-warm)', color:'var(--ink-faded)', border:'1px solid var(--parch-line)' }}>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
          <ProgressDots status={order.status}/>
          {nextStep && (
            <button onClick={handleNextStep} disabled={updatingStatus}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:'1px solid var(--ocean-bdr)', background:'var(--ocean-bg)', color:'var(--ocean)', cursor:'pointer', opacity: updatingStatus ? 0.6 : 1, fontFamily:'var(--font-serif)', whiteSpace:'nowrap' }}>
              {updatingStatus
                ? <Loader style={{ width:11, height:11, animation:'spin 0.8s linear infinite' }}/>
                : <nextStep.Icon style={{ width:11, height:11 }}/>
              }
              {nextStep.label}
            </button>
          )}
          <button onClick={() => setExpanded(v => !v)}
            style={{ padding:4, borderRadius:6, border:'none', background:'transparent', color:'var(--ink-ghost)', cursor:'pointer' }}>
            {expanded ? <ChevronUp style={{ width:15, height:15 }}/> : <ChevronDown style={{ width:15, height:15 }}/>}
          </button>
        </div>
      </div>

      {/* Expanded items */}
      {expanded && (
        <>
          {/* Column headers */}
          {items.length > 0 && (
            <div style={S.colHdrs}>
              <div/>
              <div style={{ ...S.colHdr, textAlign:'left' }}>Product</div>
              <div style={S.colHdr}>Qty</div>
              <div style={S.colHdr}>Cost/unit</div>
              <div style={S.colHdr}>Sale/unit</div>
              <div style={S.colHdr}>Profit</div>
              <div style={S.colHdr}>Cashback</div>
              <div style={S.colHdr}>Payment</div>
            </div>
          )}

          {/* Item rows */}
          {items.map((item, idx) => {
            const prod      = products?.find(p => p.id === item.product_id);
            const imgSrc    = item.image_url || prod?.image || null;
            const unitCost  = parseFloat(item.unit_cost) || 0;
            const unitSale  = parseFloat(item.sale_price) || 0;
            const qty       = parseInt(item.quantity_ordered) || 1;
            const itemCashback = totalCashback > 0 && items.length > 0 ? totalCashback / items.length : 0;
            const profit    = unitSale > 0 ? (unitSale - unitCost) * qty + itemCashback : 0;
            const isLastItem = idx === items.length - 1;

            return (
              <div key={idx} style={{ ...S.itemRow, borderBottom: isLastItem ? 'none' : '1px solid var(--parch-line)' }}>
                <ProductImage src={imgSrc} name={item.product_name} size={36}/>
                <div style={{ minWidth:0 }}>
                  <div style={S.itemName} title={item.product_name}>{item.product_name || 'Unknown product'}</div>
                  {(item.sku || item.upc) && <div style={S.itemSku}>SKU: {item.sku || item.upc}</div>}
                </div>
                <div style={{ ...S.colVal, fontWeight:600, color:'var(--ink-dim)' }}>{qty}</div>
                <div style={{ ...S.colVal, color:'var(--ink)' }}>{unitCost > 0 ? `$${unitCost.toFixed(2)}` : '—'}</div>
                <div style={{ ...S.colVal, color: unitSale > 0 ? 'var(--terrain)' : 'var(--ink-ghost)', fontWeight: unitSale > 0 ? 700 : 400 }}>
                  {unitSale > 0 ? `$${unitSale.toFixed(2)}` : <span style={{ fontSize:10, color:'var(--ink-ghost)' }}>not set</span>}
                </div>
                <div style={{ ...S.colVal, color: profit > 0 ? 'var(--terrain)' : profit < 0 ? 'var(--crimson)' : 'var(--ink-ghost)', fontWeight: profit !== 0 ? 700 : 400 }}>
                  {profit !== 0 ? `${profit > 0 ? '+' : ''}$${profit.toFixed(2)}` : '—'}
                </div>
                <div style={{ ...S.colVal, color:'var(--ocean)' }}>
                  {itemCashback > 0 ? `$${itemCashback.toFixed(2)}` : '—'}
                </div>
                <div style={{ textAlign:'right' }}>
                  {card ? (
                    <span style={{ display:'inline-flex', alignItems:'center', fontSize:10, color:'var(--ink-faded)', background:'var(--parch-warm)', border:'1px solid var(--parch-line)', borderRadius:6, padding:'2px 7px', gap:3 }}>
                      {card.card_name}{card.last_4_digits ? ` ••••${card.last_4_digits}` : ''}
                    </span>
                  ) : <span style={{ fontSize:10, color:'var(--ink-ghost)' }}>—</span>}
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div style={{ padding:'20px 14px', textAlign:'center', color:'var(--ink-ghost)', fontSize:12 }}>No items</div>
          )}

          {/* Footer */}
          <div style={S.footer}>
            <span style={{ fontSize:12, color:'var(--ink-faded)' }}>
              Total: <strong style={{ color:'var(--ink)', fontFamily:'var(--font-serif)' }}>${(parseFloat(order.total_cost) || 0).toFixed(2)}</strong>
            </span>
            {order.order_number && (
              <>
                <span style={{ width:1, height:14, background:'var(--parch-line)' }}/>
                <span style={{ fontSize:11, color:'var(--ink-ghost)' }}>Order #: {order.order_number}</span>
              </>
            )}
            {hasSale && (
              <>
                <span style={{ width:1, height:14, background:'var(--parch-line)' }}/>
                <span style={{ fontSize:11, color:'var(--terrain)', fontWeight:700, fontFamily:'var(--font-serif)' }}>
                  Profit: {orderProfit >= 0 ? '+' : ''}${orderProfit.toFixed(2)}
                </span>
              </>
            )}
            {gcTotal > 0 && (
              <span style={{ display:'inline-flex', alignItems:'center', fontSize:10, color:'var(--gold)', background:'var(--gold-bg)', border:'1px solid var(--gold-bdr)', borderRadius:6, padding:'2px 8px', gap:3, fontWeight:700 }}>
                GC: ${gcTotal.toFixed(2)}
              </span>
            )}
            {totalCashback > 0 && (
              <span style={{ display:'inline-flex', alignItems:'center', fontSize:10, color:'var(--ocean)', background:'var(--ocean-bg)', border:'1px solid var(--ocean-bdr)', borderRadius:6, padding:'2px 8px', gap:3, fontWeight:700 }}>
                CB: ${totalCashback.toFixed(2)}
              </span>
            )}
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
              <button onClick={() => onEdit(order)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, fontSize:11, fontWeight:700, border:'1px solid var(--parch-line)', background:'transparent', color:'var(--ink-faded)', cursor:'pointer', fontFamily:'var(--font-serif)' }}>
                <Edit2 style={{ width:11, height:11 }}/> Edit
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

// ── Main component ────────────────────────────────────────────────────────

export default function OrderGroupedCards({
  data = [], creditCards = [], rewards = [], products = [], giftCards = [],
  onEdit, onDelete, onQuickStatus, isLoading, selectedIds, onSelectionChange, onClearFilters,
}) {
  const toggleSelect = (id) => {
    onSelectionChange(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (isLoading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:'60px 0' }}>
      <Loader style={{ width:24, height:24, color:'var(--gold)', animation:'spin 1s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!data.length) return (
    <div style={{ textAlign:'center', padding:'60px 20px', background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:12 }}>
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