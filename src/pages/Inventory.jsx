import { useState, useMemo, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, TrendingUp, Boxes, DollarSign, ShoppingCart, Check, ChevronDown, ChevronRight } from 'lucide-react';
import POFormModal from '@/components/purchase-orders/POFormModal';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

const daysAgo = (dateStr) => {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return diff + ' days ago';
};

const marginPct = (profit, cost) => {
  if (!cost || cost <= 0) return null;
  return ((profit / cost) * 100).toFixed(1) + '%';
};

const getStoreDomain = (vendorName) => {
  const n = String(vendorName || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  if (n.includes('bestbuy'))  return 'bestbuy.com';
  if (n.includes('amazon'))   return 'amazon.com';
  if (n.includes('walmart'))  return 'walmart.com';
  if (n.includes('apple'))    return 'apple.com';
  if (n.includes('target'))   return 'target.com';
  if (n.includes('costco'))   return 'costco.com';
  if (n.includes('samsclub') || n.includes('sam')) return 'samsclub.com';
  if (n.includes('staples'))  return 'staples.com';
  if (n.includes('ebay'))     return 'ebay.com';
  return n + '.com';
};

const BRANDFETCH_CLIENT_ID = '1idzVIG0BYPKsFIDJDI';
const brandfetch = (domain) =>
  'https://cdn.brandfetch.io/domain/' + domain + '?c=' + BRANDFETCH_CLIENT_ID;

const unsoldQty = (order, productName) => {
  const name = productName.toLowerCase();
  const totalQty = (order.items || [])
    .filter((i) => (i.product_name || '').toLowerCase() === name)
    .reduce((s, i) => {
      const received = parseInt(i.quantity_received) || 0;
      const ordered  = parseInt(i.quantity_ordered)  || 0;
      return s + (received > 0 ? received : ordered);
    }, 0);
  const soldQty = (order.sale_events || []).reduce(
    (s, ev) =>
      s + (ev.items || [])
        .filter((si) => (si.product_name || '').toLowerCase() === name)
        .reduce((ss, si) => ss + (parseInt(si.quantity) || 1), 0),
    0
  );
  return Math.max(0, totalQty - soldQty);
};

const soldQtyForProduct = (order, productName) => {
  const name = productName.toLowerCase();
  return (order.sale_events || []).reduce(
    (s, ev) =>
      s + (ev.items || [])
        .filter((si) => (si.product_name || '').toLowerCase() === name)
        .reduce((ss, si) => ss + (parseInt(si.quantity) || 1), 0),
    0
  );
};

const STOP_WORDS = new Set([
  'the','a','an','and','or','with','for','of','in','to','by','gb',
  'free','live','tv','wi','fi','black','white','silver','pink','blue',
  'streaming','device','cable','satellite',
]);
const getKeywords = (str) =>
  str.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));

const findMatchedProduct = (itemName, itemProductId, products) => {
  if (itemProductId) {
    const byId = products.find((p) => p.id === itemProductId);
    if (byId) return byId;
  }
  const exactName = (itemName || '').toLowerCase();
  const byExact = products.find((p) => p.name?.toLowerCase() === exactName);
  if (byExact) return byExact;
  const itemWords = new Set(getKeywords(itemName || ''));
  if (itemWords.size === 0) return null;
  let bestScore = 0.3, bestProduct = null;
  products.forEach((p) => {
    if (!p.name) return;
    const productWords = new Set(getKeywords(p.name));
    const shared = [...itemWords].filter((w) => productWords.has(w)).length;
    const score  = shared / Math.max(itemWords.size, productWords.size);
    if (score > bestScore) { bestScore = score; bestProduct = p; }
  });
  return bestScore >= 0.3 ? bestProduct : null;
};

const STATUS_PRIORITY = ['ordered', 'shipped', 'partially_received', 'received', 'paid', 'completed'];

/* ─────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────── */
const STATUS_STYLES = {
  received:           { bg: 'var(--terrain-bg)', color: 'var(--terrain)', border: 'var(--terrain-bdr)' },
  partially_received: { bg: 'var(--gold-bg)',    color: 'var(--gold2)',   border: 'var(--gold-border)' },
  paid:               { bg: 'var(--terrain-bg)', color: 'var(--terrain)', border: 'var(--terrain-bdr)' },
  ordered:            { bg: 'var(--ocean-bg)',   color: 'var(--ocean2)',  border: 'var(--ocean-bdr)'   },
  pending:            { bg: 'var(--gold-bg)',    color: 'var(--gold2)',   border: 'var(--gold-border)' },
  shipped:            { bg: 'var(--violet-bg)',  color: 'var(--violet)',  border: 'var(--violet-bdr)'  },
  cancelled:          { bg: 'var(--crimson-bg)', color: 'var(--crimson)', border: 'var(--crimson-bdr)' },
  completed:          { bg: 'var(--terrain-bg)', color: 'var(--terrain)', border: 'var(--terrain-bdr)' },
};

function StatusBadge({ status, small = false }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const label = status === 'partially_received' ? 'Partial' : (status || 'unknown');
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: small ? '1px 6px' : '2px 8px',
      borderRadius: 99,
      fontSize: small ? 8 : 9,
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      background: s.bg, color: s.color,
      border: '1px solid ' + s.border,
      whiteSpace: 'nowrap',
      fontFamily: 'var(--font-serif)',
    }}>
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   STORE LOGO
───────────────────────────────────────────── */
function StoreLogo({ retailer, size = 26 }) {
  const [err, setErr] = useState(false);
  const domain   = getStoreDomain(retailer);
  const initials = String(retailer || '??').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: 'var(--parch-card)', border: '1px solid var(--parch-line)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 800, color: 'var(--ocean)',
      fontFamily: 'var(--font-serif)',
    }}>
      {!err
        ? <img src={brandfetch(domain)} alt={retailer} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setErr(true)} />
        : initials}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PRODUCT IMAGE
───────────────────────────────────────────── */
function ProductImg({ src, name, retailer, qty, accentColor }) {
  const [imgErr,   setImgErr]   = useState(false);
  const [brandErr, setBrandErr] = useState(false);
  const brandUrl = retailer ? brandfetch(getStoreDomain(retailer)) : null;
  const initials = (name || '?').slice(0, 2).toUpperCase();
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: 46, height: 46, borderRadius: 10, overflow: 'hidden',
        background: 'var(--parch-warm)', border: '1px solid var(--parch-line)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {src && !imgErr
          ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} onError={() => setImgErr(true)} />
          : brandUrl && !brandErr
          ? <img src={brandUrl} alt={retailer} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setBrandErr(true)} />
          : <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-dim)' }}>{initials}</span>}
      </div>
      <div style={{
        position: 'absolute', bottom: -4, right: -4,
        minWidth: 18, height: 18, borderRadius: 9,
        background: accentColor || 'var(--ocean)', color: '#fff',
        fontSize: 9, fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1.5px solid var(--parch-card)',
        padding: '0 3px', fontFamily: 'var(--font-mono)',
      }}>
        {qty}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────── */
function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div style={{
      background: 'var(--parch-card)', border: '1px solid var(--parch-line)',
      borderRadius: 12, padding: '10px 13px', borderTop: '3px solid ' + color,
    }}>
      <p style={{
        fontFamily: 'var(--font-serif)', fontSize: 8, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--ink-faded)', marginBottom: 5,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        {Icon && <Icon style={{ width: 10, height: 10 }} />}
        {label}
      </p>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 9, color: 'var(--ink-ghost)', marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION DIVIDER
───────────────────────────────────────────── */
function SectionDivider({ title, count, dotColor = 'var(--gold)', lineColor = 'rgba(160,114,42,0.25)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
      <span style={{
        fontFamily: 'var(--font-serif)', fontSize: 9, fontWeight: 700,
        letterSpacing: '0.14em', textTransform: 'uppercase',
        color: dotColor, whiteSpace: 'nowrap',
      }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,' + lineColor + ',transparent)' }} />
      {count && (
        <span style={{
          fontSize: 9, fontWeight: 600, color: 'var(--ink-ghost)',
          background: 'var(--parch-warm)', padding: '2px 8px',
          borderRadius: 99, border: '1px solid var(--parch-line)',
          whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)',
        }}>{count}</span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SOURCE ORDER ROW
───────────────────────────────────────────── */
function SourceOrderRow({ order, qty, costPerUnit, onEdit, onMarkReceived }) {
  const [marking, setMarking] = useState(false);
  const [marked,  setMarked]  = useState(false);

  const ago = daysAgo(order.order_date);
  const isReceived = marked || ['received', 'paid', 'completed'].includes(order.status);

  const agoBg  = isReceived ? 'var(--terrain-bg)'  : order.status === 'shipped' ? 'var(--violet-bg)'  : 'var(--ocean-bg)';
  const agoClr = isReceived ? 'var(--terrain)'      : order.status === 'shipped' ? 'var(--violet)'     : 'var(--ocean2)';
  const agoBdr = isReceived ? 'var(--terrain-bdr)'  : order.status === 'shipped' ? 'var(--violet-bdr)' : 'var(--ocean-bdr)';

  const handleMark = async (e) => {
    e.stopPropagation();
    if (isReceived || marking) return;
    setMarking(true);
    try {
      await onMarkReceived(order.id);
      setMarked(true);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div
      onClick={() => onEdit(order)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 12px', borderBottom: '1px solid var(--parch-line)',
        cursor: 'pointer', transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gold-bg)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <StoreLogo retailer={order.retailer} size={26} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ocean)' }}>
          {order.retailer || 'Unknown'} · {order.order_number || ('#' + (order.id || '').slice(0, 8))}
        </div>
        <div style={{ fontSize: 9, color: 'var(--ink-ghost)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          {fmtDate(order.order_date)} · x{qty} unit{qty !== 1 ? 's' : ''}
          {ago && (
            <span style={{
              fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
              background: agoBg, color: agoClr, border: '1px solid ' + agoBdr,
              fontFamily: 'var(--font-mono)',
            }}>{ago}</span>
          )}
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
        {fmt(costPerUnit * qty)}
      </div>
      <StatusBadge status={marked ? 'received' : order.status} small />
      {!isReceived && (
        <button
          onClick={handleMark}
          disabled={marking}
          style={{
            fontSize: 8, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
            background: 'var(--terrain-bg)', color: 'var(--terrain)',
            border: '1px solid var(--terrain-bdr)', cursor: 'pointer',
            fontFamily: 'var(--font-serif)', letterSpacing: '0.04em',
            whiteSpace: 'nowrap', flexShrink: 0, opacity: marking ? 0.6 : 1,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {marking ? '...' : <><Check style={{ width: 8, height: 8 }} /> Mark Received</>}
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PRODUCT CARD
───────────────────────────────────────────── */
function ProductCard({ group, expanded, onToggle, onEdit, onMarkReceived }) {
  const accentColor =
    group.dominantStatus === 'shipped'            ? 'var(--violet)'  :
    ['received','paid','completed'].includes(group.dominantStatus) ? 'var(--terrain)' :
    group.dominantStatus === 'partially_received' ? 'var(--gold)'    :
    'var(--ocean)';

  const orderedQty  = group.sources.filter((s) => s.order.status === 'ordered').reduce((a, s) => a + s.qty, 0);
  const shippedQty  = group.sources.filter((s) => s.order.status === 'shipped').reduce((a, s) => a + s.qty, 0);
  const receivedQty = group.sources.filter((s) => ['received','paid','completed','partially_received'].includes(s.order.status)).reduce((a, s) => a + s.qty, 0);

  const estProfit = group.listPrice
    ? (parseFloat(group.listPrice) - group.avgCostPerUnit) * group.totalQty
    : null;
  const mPct = estProfit !== null ? marginPct(estProfit, group.totalCost) : null;

  const totalSold = group.sources.reduce((s, src) => s + soldQtyForProduct(src.order, group.productName), 0);
  const remaining = group.totalQty;

  const deliveryDates = group.sources
    .map((s) => s.order.expected_delivery_date || s.order.delivery_date || s.order.estimated_delivery)
    .filter(Boolean)
    .sort();
  const nearestDelivery = deliveryDates[0] || null;

  const retailers = [...new Set(group.sources.map((s) => s.order.retailer).filter(Boolean))];

  return (
    <div
      style={{
        background: 'var(--parch-card)',
        border: '1px solid ' + (expanded ? 'var(--gold-border)' : 'var(--parch-line)'),
        borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
        boxShadow: expanded ? '0 4px 20px rgba(201,168,76,0.14)' : 'var(--shadow-md)',
        transition: 'box-shadow 0.18s, border-color 0.18s',
      }}
      onClick={onToggle}
    >
      <div style={{ height: 3, background: accentColor }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '11px 12px 9px' }}>
        <ProductImg
          src={group.imageUrl}
          name={group.productName}
          retailer={retailers[0]}
          qty={group.totalQty}
          accentColor={accentColor}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.35, marginBottom: 2 }}>
            {group.productName}
          </div>
          <div style={{
            fontSize: 9, color: 'var(--ink-faded)', marginBottom: 6,
            fontFamily: 'var(--font-serif)', letterSpacing: '0.03em',
          }}>
            {group.sources.length} source order{group.sources.length !== 1 ? 's' : ''} &middot; {retailers.join(', ')}
          </div>

          {nearestDelivery && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 9, padding: '2px 7px', borderRadius: 6, marginBottom: 7,
              background: 'var(--terrain-bg)', color: 'var(--terrain)',
              border: '1px solid var(--terrain-bdr)', fontFamily: 'var(--font-mono)',
            }}>
              Est. delivery {fmtDate(nearestDelivery)}
            </div>
          )}

          <div style={{
            height: 5, borderRadius: 99, overflow: 'hidden',
            background: 'var(--parch-warm)', marginBottom: 5,
            display: 'flex', border: '1px solid var(--parch-line)',
          }}>
            {orderedQty  > 0 && <div style={{ flex: orderedQty,  background: 'var(--ocean)',   height: '100%', borderRadius: shippedQty === 0 && receivedQty === 0 ? 99 : '99px 0 0 99px' }} />}
            {shippedQty  > 0 && <div style={{ flex: shippedQty,  background: 'var(--violet)',  height: '100%', borderRadius: orderedQty === 0 && receivedQty === 0 ? 99 : 0 }} />}
            {receivedQty > 0 && <div style={{ flex: receivedQty, background: 'var(--terrain)', height: '100%', borderRadius: orderedQty === 0 && shippedQty === 0 ? 99 : '0 99px 99px 0' }} />}
            {orderedQty + shippedQty + receivedQty === 0 && <div style={{ flex: 1, background: 'var(--parch-line)', height: '100%', borderRadius: 99 }} />}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            {[
              { label: 'Ordered',   n: orderedQty,  color: 'var(--ocean)'   },
              { label: 'Shipped',   n: shippedQty,  color: 'var(--violet)'  },
              { label: 'Available', n: receivedQty, color: 'var(--terrain)' },
            ].map(({ label, n, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 8, color: 'var(--ink-ghost)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                {label} <span style={{ fontWeight: 700, color: 'var(--ink-dim)', fontFamily: 'var(--font-mono)' }}>{n}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {totalSold > 0 && (
              <span style={{
                fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                background: 'var(--terrain-bg)', color: 'var(--terrain)',
                border: '1px solid var(--terrain-bdr)', fontFamily: 'var(--font-mono)',
              }}>{totalSold} sold</span>
            )}
            <span style={{
              fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
              background: 'var(--parch-warm)', color: 'var(--ink-ghost)',
              border: '1px solid var(--parch-line)', fontFamily: 'var(--font-mono)',
            }}>{remaining} remaining</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0, paddingTop: 1 }}>
          <StatusBadge status={group.dominantStatus} />
          <div style={{
            width: 20, height: 20, borderRadius: 6,
            background: expanded ? 'var(--gold-bg)' : 'var(--parch-warm)',
            border: '1px solid ' + (expanded ? 'var(--gold-border)' : 'var(--parch-line)'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: expanded ? 'var(--gold)' : 'var(--ink-ghost)',
            transition: 'all 0.2s',
            transform: expanded ? 'rotate(180deg)' : 'none',
          }}>
            <ChevronDown style={{ width: 12, height: 12 }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', borderTop: '1px solid var(--parch-line)', background: 'var(--parch-warm)' }}>
        {[
          { label: 'Avg Cost',    value: fmt(group.avgCostPerUnit), color: 'var(--gold)'    },
          { label: 'Total Cost',  value: fmt(group.totalCost),      color: 'var(--gold)'    },
          { label: 'Est. Margin', value: estProfit !== null ? fmt(estProfit) : '--', color: estProfit !== null ? 'var(--terrain)' : 'var(--ink-ghost)', extra: mPct },
        ].map(({ label, value, color, extra }) => (
          <div key={label} style={{ flex: 1, padding: '7px 8px', textAlign: 'center', borderLeft: label !== 'Avg Cost' ? '1px solid var(--parch-line)' : 'none' }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 7, color: 'var(--ink-ghost)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</p>
            <p style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color, lineHeight: 1 }}>{value}</p>
            {extra && (
              <span style={{
                display: 'inline-flex', fontSize: 8, fontWeight: 700, padding: '1px 5px',
                borderRadius: 99, marginTop: 3, fontFamily: 'var(--font-mono)',
                background: 'var(--terrain-bg)', color: 'var(--terrain)',
                border: '1px solid var(--terrain-bdr)',
              }}>{extra}</span>
            )}
          </div>
        ))}
      </div>

      {expanded && (
        <div style={{ background: 'var(--parch-warm)', borderTop: '1px solid var(--parch-line)' }}>
          <div style={{ padding: '6px 12px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-ghost)' }}>
              Source Orders
            </span>
            <span style={{ fontSize: 9, color: 'var(--ink-ghost)', fontFamily: 'var(--font-mono)' }}>
              {group.sources.length} order{group.sources.length !== 1 ? 's' : ''}
            </span>
          </div>
          {group.sources.map(({ order, qty, costPerUnit }, idx) => (
            <SourceOrderRow
              key={order.id + '-' + idx}
              order={order}
              qty={qty}
              costPerUnit={costPerUnit}
              onEdit={onEdit}
              onMarkReceived={onMarkReceived}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function Inventory() {
  const queryClient = useQueryClient();
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');
  const [retailerFilter, setRetailerFilter] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [editingOrder,   setEditingOrder]   = useState(null);
  const [formOpen,       setFormOpen]       = useState(false);
  const [userEmail,      setUserEmail]      = useState(null);

  useEffect(() => {
    base44.auth.me().then((u) => setUserEmail(u?.email)).catch(() => {});
  }, []);

  const { data: orders      = [], isLoading } = useQuery({ queryKey: ['purchaseOrders', userEmail], queryFn: () => userEmail ? base44.entities.PurchaseOrder.filter({ created_by: userEmail }, '-created_date') : [], enabled: userEmail !== null });
  const { data: products    = [] }            = useQuery({ queryKey: ['products'],    queryFn: () => base44.entities.Product.list() });
  const { data: creditCards = [] }            = useQuery({ queryKey: ['creditCards', userEmail], queryFn: () => userEmail ? base44.entities.CreditCard.filter({ created_by: userEmail }) : [], enabled: userEmail !== null });
  const { data: giftCards   = [] }            = useQuery({ queryKey: ['giftCards',   userEmail], queryFn: () => userEmail ? base44.entities.GiftCard.filter({ created_by: userEmail }) : [],   enabled: userEmail !== null });
  const { data: sellers     = [] }            = useQuery({ queryKey: ['sellers'],     queryFn: () => base44.entities.Seller.list() });

  const relevantOrders = useMemo(() =>
    orders.filter((o) => ['received','partially_received','ordered','shipped','paid','completed'].includes(o.status)),
    [orders]
  );

  const groups = useMemo(() => {
    const map = {};
    relevantOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const name = (item.product_name || 'Unknown Product').trim();
        const qty  = unsoldQty(order, name);
        if (qty <= 0) return;
        const costPerUnit = parseFloat(item.unit_cost || 0);
        if (!map[name]) {
          const matched  = findMatchedProduct(name, item.product_id, products);
          const imageUrl = matched?.image || item.product_image_url || item.product_image || item.image_url || null;
          map[name] = {
            productName: name, imageUrl,
            listPrice: item.list_price || item.listing_price || null,
            sources: [], totalQty: 0, totalCost: 0, statuses: [],
          };
        }
        map[name].sources.push({ order, qty, costPerUnit });
        map[name].totalQty  += qty;
        map[name].totalCost += costPerUnit * qty;
        map[name].statuses.push(order.status);
      });
    });
    return Object.values(map).map((g) => ({
      ...g,
      avgCostPerUnit: g.totalQty > 0 ? g.totalCost / g.totalQty : 0,
      dominantStatus: [...g.statuses].sort((a, b) => STATUS_PRIORITY.indexOf(a) - STATUS_PRIORITY.indexOf(b))[0] || 'received',
    }));
  }, [relevantOrders, products]);

  const stats = useMemo(() => {
    const inHand    = groups.filter((g) => ['received','partially_received','paid','completed'].includes(g.dominantStatus));
    const inbound   = groups.filter((g) => ['ordered','shipped'].includes(g.dominantStatus));
    const withProfit = groups.filter((g) => g.listPrice);
    const estMargin  = withProfit.reduce((s, g) => s + (parseFloat(g.listPrice) - g.avgCostPerUnit) * g.totalQty, 0);
    const costBasis  = groups.reduce((s, g) => s + g.totalCost, 0);
    const mPct = costBasis > 0 && estMargin > 0 ? ((estMargin / costBasis) * 100).toFixed(1) + '%' : null;
    return {
      uniqueProducts:  groups.length,
      unitsAvailable:  inHand.reduce((s, g)  => s + g.totalQty, 0),
      unitsInbound:    inbound.reduce((s, g) => s + g.totalQty, 0),
      costBasis,
      estMargin,
      mPct,
    };
  }, [groups]);

  const retailersInData = useMemo(() => {
    const set = new Set();
    groups.forEach((g) => g.sources.forEach((s) => { if (s.order.retailer) set.add(s.order.retailer); }));
    return [...set].sort();
  }, [groups]);

  const filtered = useMemo(() => {
    let g = groups;
    if (search)         g = g.filter((x) => x.productName.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter)   g = g.filter((x) => x.dominantStatus === statusFilter);
    if (retailerFilter) g = g.filter((x) => x.sources.some((s) => s.order.retailer === retailerFilter));
    return g;
  }, [groups, search, statusFilter, retailerFilter]);

  const inboundGroups   = filtered.filter((g) => ['ordered','shipped'].includes(g.dominantStatus));
  const availableGroups = filtered.filter((g) => !['ordered','shipped'].includes(g.dominantStatus));

  const toggleGroup = (name) =>
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }));

  const handleEdit = (order) => { setEditingOrder(order); setFormOpen(true); };

  const handleMarkReceived = useCallback(async (orderId) => {
    await base44.entities.PurchaseOrder.update(orderId, { status: 'received' });
    queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
  }, [queryClient]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.3px', margin: 0 }}>
          Inventory On Hand
        </h1>
        <p style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 3 }}>
          Grouped by product &middot; derived from your purchase orders
        </p>
      </div>

      <SectionDivider title="Overview" dotColor="var(--gold)" lineColor="rgba(201,168,76,0.25)" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
        <StatCard label="Available"   value={stats.unitsAvailable} sub="units in hand"         color="var(--ocean)"   icon={Package}      />
        <StatCard label="Inbound"     value={stats.unitsInbound}   sub="ordered & shipped"     color="var(--violet)"  icon={ShoppingCart} />
        <StatCard label="Cost Basis"  value={fmt(stats.costBasis)} sub="total inventory spend"  color="var(--gold)"    icon={DollarSign}   />
        <StatCard
          label="Est. Margin"
          value={stats.estMargin > 0 ? fmt(stats.estMargin) + (stats.mPct ? ' (' + stats.mPct + ')' : '') : '--'}
          sub="if all units sell"
          color="var(--terrain)"
          icon={TrendingUp}
        />
      </div>

      {retailersInData.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {['', ...retailersInData].map((r) => (
            <button
              key={r || 'all'}
              onClick={() => setRetailerFilter(r)}
              style={{
                padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                border: '1px solid ' + (retailerFilter === r ? 'var(--ink)' : 'var(--parch-line)'),
                background: retailerFilter === r ? 'var(--ink)' : 'var(--parch-card)',
                color: retailerFilter === r ? 'var(--gold)' : 'var(--ink-faded)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)', letterSpacing: '0.03em',
                transition: 'all 0.12s',
              }}
            >
              {r || 'All Retailers'}
            </button>
          ))}
        </div>
      )}

      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        background: 'var(--parch-card)', border: '1px solid var(--parch-line)',
        borderRadius: 10, padding: '8px 12px', marginBottom: 14,
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 12, pointerEvents: 'none' }}>
            &#128269;
          </span>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', background: 'var(--parch-warm)', border: '1px solid var(--parch-line)',
              borderRadius: 7, padding: '6px 10px 6px 28px',
              fontSize: 12, color: 'var(--ink)', outline: 'none',
              fontFamily: 'var(--font-sans)',
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            background: 'var(--parch-warm)', border: '1px solid var(--parch-line)',
            borderRadius: 7, padding: '6px 10px',
            fontSize: 11, color: 'var(--ink-faded)', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All statuses</option>
          <option value="ordered">Ordered</option>
          <option value="shipped">Shipped</option>
          <option value="received">Received</option>
          <option value="partially_received">Partially received</option>
          <option value="paid">Paid</option>
        </select>
        <div style={{ fontSize: 10, color: 'var(--ink-ghost)', whiteSpace: 'nowrap' }}>
          {filtered.length} product{filtered.length !== 1 ? 's' : ''} &middot; tap to expand
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--terrain-bg)', borderTopColor: 'var(--terrain)', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--parch-card)', borderRadius: 12, border: '1px solid var(--parch-line)' }}>
          <Package style={{ width: 36, height: 36, color: 'var(--ink-ghost)', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--ink-dim)', fontSize: 13 }}>No inventory found.</p>
          <p style={{ color: 'var(--ink-ghost)', fontSize: 11, marginTop: 4 }}>Items appear here once orders are marked as received, shipped, or ordered.</p>
        </div>
      )}

      {!isLoading && inboundGroups.length > 0 && (
        <>
          <SectionDivider
            title="Inbound"
            count={inboundGroups.length + ' products \u00b7 ' + inboundGroups.reduce((s, g) => s + g.totalQty, 0) + ' units'}
            dotColor="var(--ocean)"
            lineColor="rgba(42,92,122,0.25)"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
            {inboundGroups.map((group) => (
              <ProductCard
                key={group.productName}
                group={group}
                expanded={!!expandedGroups[group.productName]}
                onToggle={() => toggleGroup(group.productName)}
                onEdit={handleEdit}
                onMarkReceived={handleMarkReceived}
              />
            ))}
          </div>
        </>
      )}

      {!isLoading && availableGroups.length > 0 && (
        <>
          <SectionDivider
            title="Available"
            count={availableGroups.length + ' products \u00b7 ' + availableGroups.reduce((s, g) => s + g.totalQty, 0) + ' units'}
            dotColor="var(--terrain)"
            lineColor="rgba(74,122,53,0.25)"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
            {availableGroups.map((group) => (
              <ProductCard
                key={group.productName}
                group={group}
                expanded={!!expandedGroups[group.productName]}
                onToggle={() => toggleGroup(group.productName)}
                onEdit={handleEdit}
                onMarkReceived={handleMarkReceived}
              />
            ))}
          </div>
        </>
      )}

      {!isLoading && filtered.length > 0 && (
        <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--ink-ghost)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
          {filtered.reduce((s, g) => s + g.totalQty, 0)} total units across {filtered.length} products
        </div>
      )}

      <POFormModal
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingOrder(null); }}
        order={editingOrder}
        onSubmit={async (data) => {
          if (editingOrder) {
            await base44.entities.PurchaseOrder.update(editingOrder.id, data);
            queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
          }
          setFormOpen(false);
          setEditingOrder(null);
        }}
        products={products}
        creditCards={creditCards}
        giftCards={giftCards}
        sellers={sellers}
        isPending={false}
      />
    </div>
  );
}