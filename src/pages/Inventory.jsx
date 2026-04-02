import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, TrendingUp, ArrowUpRight, ChevronDown, ChevronRight, Boxes, DollarSign, ShoppingCart } from 'lucide-react';
import POFormModal from '@/components/purchase-orders/POFormModal';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const getStoreDomain = (vendorName) => {
  const n = String(vendorName || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  if (n.includes('bestbuy'))  return 'bestbuy.com';
  if (n.includes('amazon'))   return 'amazon.com';
  if (n.includes('walmart'))  return 'walmart.com';
  if (n.includes('apple'))    return 'apple.com';
  if (n.includes('target'))   return 'target.com';
  if (n.includes('costco'))   return 'costco.com';
  if (n.includes('samsclub')) return 'samsclub.com';
  if (n.includes('ebay'))     return 'ebay.com';
  if (n.includes('woot'))     return 'woot.com';
  return n + '.com';
};

const BRANDFETCH_CLIENT_ID = '1idzVIG0BYPKsFIDJDI';
const brandfetch = (domain) =>
  `https://cdn.brandfetch.io/domain/${domain}?c=${BRANDFETCH_CLIENT_ID}`;

// Unsold qty: total received - already sold via sale_events
const unsoldQty = (order, productName) => {
  const name = productName.toLowerCase();

  const totalQty = (order.items || [])
    .filter(i => (i.product_name || '').toLowerCase() === name)
    .reduce((s, i) => {
      // For received/paid orders prefer quantity_received; for others (ordered/shipped) use quantity_ordered
      const received = parseInt(i.quantity_received) || 0;
      const ordered  = parseInt(i.quantity_ordered)  || 0;
      return s + (received > 0 ? received : ordered);
    }, 0);

  const soldQty = (order.sale_events || []).reduce((s, ev) =>
    s + (ev.items || [])
      .filter(si => (si.product_name || '').toLowerCase() === name)
      .reduce((ss, si) => ss + (parseInt(si.quantity) || 1), 0)
  , 0);

  return Math.max(0, totalQty - soldQty);
};

// ─── status badge ────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  received:           { bg: 'rgba(6,182,212,0.12)',  color: '#06b6d4', border: 'rgba(6,182,212,0.25)'  },
  partially_received: { bg: 'rgba(6,182,212,0.08)',  color: '#06b6d4', border: 'rgba(6,182,212,0.18)'  },
  paid:               { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.25)' },
  ordered:            { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: 'rgba(96,165,250,0.25)' },
  pending:            { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  shipped:            { bg: 'rgba(168,85,247,0.12)', color: '#c084fc', border: 'rgba(168,85,247,0.25)' },
  cancelled:          { bg: 'rgba(239,68,68,0.10)',  color: '#ef4444', border: 'rgba(239,68,68,0.20)'  },
  completed:          { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.25)' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const label = status === 'partially_received' ? 'Partial' : (status || 'unknown');
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 99,
      fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ─── store logo ──────────────────────────────────────────────────────────────

function StoreLogo({ retailer, size = 24 }) {
  const [err, setErr] = useState(false);
  const domain   = getStoreDomain(retailer);
  const initials = String(retailer || '??').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {!err ? (
        <img src={brandfetch(domain)} alt={retailer}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setErr(true)} />
      ) : (
        <span style={{ fontSize: size * 0.36, fontWeight: 700, color: '#60a5fa' }}>{initials}</span>
      )}
    </div>
  );
}

// ─── product image ───────────────────────────────────────────────────────────

function ProductImage({ src, name, qty, retailer }) {
  const [imgErr, setImgErr] = useState(false);
  const [brandErr, setBrandErr] = useState(false);

  // Fallback: use the retailer's brandfetch logo as product image
  const brandUrl = retailer ? brandfetch(getStoreDomain(retailer)) : null;
  const initials = (name || '?').slice(0, 2).toUpperCase();

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 8, overflow: 'hidden',
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {src && !imgErr ? (
          <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgErr(true)} />
        ) : brandUrl && !brandErr ? (
          <img src={brandUrl} alt={retailer} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setBrandErr(true)} />
        ) : (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>{initials}</span>
        )}
      </div>
      <div style={{
        position: 'absolute', bottom: -4, right: -4,
        width: 17, height: 17, borderRadius: '50%',
        background: '#06b6d4', color: 'white', fontSize: 9, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1.5px solid #080c12',
      }}>
        {qty}
      </div>
    </div>
  );
}

// ─── stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, color = 'rgba(255,255,255,0.85)', icon: Icon }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 8, padding: '9px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        {Icon && <Icon style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.3)' }} />}
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

// ─── source order sub-row ────────────────────────────────────────────────────

function SourceOrderRow({ order, qty, costPerUnit, onEdit }) {
  const [hovered, setHovered] = useState(false);
  const bg = hovered ? 'rgba(96,165,250,0.06)' : 'rgba(255,255,255,0.012)';

  const cell = (extra = {}) => ({
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    background: bg, padding: '8px 8px',
    transition: 'background 0.12s', ...extra,
  });

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
      onClick={() => onEdit(order)}
    >
      <td style={cell()} />

      {/* store logo + order info */}
      <td style={cell({ paddingLeft: 28 })}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StoreLogo retailer={order.retailer} size={22} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 10, fontWeight: 500,
              color: hovered ? '#60a5fa' : 'rgba(255,255,255,0.55)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              transition: 'color 0.12s',
            }}>
              {order.retailer || 'Unknown'} · {order.order_number || order.id?.slice(0, 8)}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>
              {fmtDate(order.order_date)} · ×{qty} unit{qty !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </td>

      <td style={cell({ fontSize: 10, color: 'rgba(255,255,255,0.4)' })}>×{qty}</td>
      <td style={cell({ fontSize: 10, color: 'rgba(255,255,255,0.4)' })}>{fmt(costPerUnit)}</td>
      <td style={cell({ fontSize: 10, color: 'rgba(255,255,255,0.4)' })}>{fmt(costPerUnit * qty)}</td>
      <td style={cell({ fontSize: 10, color: 'rgba(255,255,255,0.18)' })}>—</td>
      <td style={cell()}><StatusBadge status={order.status} /></td>

      {/* hover-reveal open order button */}
      <td style={cell({ textAlign: 'right' })}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 500,
          color: '#60a5fa',
          background: hovered ? 'rgba(96,165,250,0.12)' : 'transparent',
          border: hovered ? '1px solid rgba(96,165,250,0.25)' : '1px solid transparent',
          opacity: hovered ? 1 : 0,
          transition: 'all 0.12s', whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          Open order <ArrowUpRight style={{ width: 10, height: 10 }} />
        </span>
      </td>
    </tr>
  );
}

// ─── group row ───────────────────────────────────────────────────────────────

function GroupRow({ group, expanded, onToggle, onEdit }) {
  const estProfit = group.listPrice
    ? (parseFloat(group.listPrice) - group.avgCostPerUnit) * group.totalQty
    : null;

  const hd = {
    background: 'rgba(16,185,129,0.025)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    padding: '11px 8px',
  };

  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer' }}>
        {/* chevron */}
        <td style={{ ...hd, width: 28 }}>
          <div style={{
            width: 14, height: 14, borderRadius: 3,
            background: 'rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.4)',
          }}>
            {expanded
              ? <ChevronDown style={{ width: 10, height: 10 }} />
              : <ChevronRight style={{ width: 10, height: 10 }} />}
          </div>
        </td>

        {/* product */}
        <td style={hd}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ProductImage src={group.imageUrl} name={group.productName} qty={group.totalQty} retailer={group.sources[0]?.order?.retailer} />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.92)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {group.productName}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                {group.sources.length} source order{group.sources.length !== 1 ? 's' : ''}
                {' · '}
                {[...new Set(group.sources.map(s => s.order.retailer).filter(Boolean))].join(', ')}
              </div>
            </div>
          </div>
        </td>

        {/* qty bubble */}
        <td style={hd}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: '50%',
            background: 'rgba(6,182,212,0.15)', color: '#06b6d4',
            fontSize: 10, fontWeight: 700,
          }}>
            {group.totalQty}
          </div>
        </td>

        <td style={{ ...hd, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{fmt(group.avgCostPerUnit)}</td>
        <td style={{ ...hd, fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>{fmt(group.totalCost)}</td>

        {/* est profit */}
        <td style={hd}>
          {estProfit !== null ? (
            <span style={{
              display: 'inline-flex', padding: '2px 8px', borderRadius: 99,
              fontSize: 10, fontWeight: 500,
              background: 'rgba(16,185,129,0.1)', color: '#10b981',
            }}>
              +{fmt(estProfit)}
            </span>
          ) : (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>—</span>
          )}
        </td>

        <td style={hd}><StatusBadge status={group.dominantStatus} /></td>
        <td style={hd} />
      </tr>

      {expanded && group.sources.map(({ order, qty, costPerUnit }, idx) => (
        <SourceOrderRow
          key={order.id + '-' + idx}
          order={order}
          qty={qty}
          costPerUnit={costPerUnit}
          onEdit={onEdit}
        />
      ))}
    </>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function Inventory() {
  const queryClient = useQueryClient();
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [editingOrder, setEditingOrder]   = useState(null);
  const [formOpen, setFormOpen]           = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date'),
  });
  const { data: products    = [] } = useQuery({ queryKey: ['products'],     queryFn: () => base44.entities.Product.list() });
  const { data: creditCards = [] } = useQuery({ queryKey: ['creditCards'],  queryFn: () => base44.entities.CreditCard.list() });
  const { data: giftCards   = [] } = useQuery({ queryKey: ['giftCards'],    queryFn: () => base44.entities.GiftCard.list() });
  const { data: sellers     = [] } = useQuery({ queryKey: ['sellers'],      queryFn: () => base44.entities.Seller.list() });

  const relevantOrders = useMemo(() =>
    orders.filter(o => ['received','partially_received','ordered','shipped','paid','completed'].includes(o.status)),
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
          map[name] = {
            productName: name,
            imageUrl:  item.product_image_url || item.product_image || item.image_url || null,
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
    const priority = ['ordered','shipped','partially_received','received','paid','completed'];
    return Object.values(map).map(g => ({
      ...g,
      avgCostPerUnit: g.totalQty > 0 ? g.totalCost / g.totalQty : 0,
      dominantStatus: [...g.statuses].sort((a,b) => priority.indexOf(a) - priority.indexOf(b))[0] || 'received',
    }));
  }, [relevantOrders]);

  const stats = useMemo(() => {
    const inHand = groups.filter(g => ['received','partially_received','paid','completed'].includes(g.dominantStatus));
    const onWay  = groups.filter(g => ['ordered','shipped'].includes(g.dominantStatus));
    return {
      uniqueProducts: groups.length,
      unitsInHand:    inHand.reduce((s,g) => s + g.totalQty, 0),
      unitsOnWay:     onWay.reduce((s,g)  => s + g.totalQty, 0),
      costBasis:      groups.reduce((s,g) => s + g.totalCost, 0),
      estProfit:      groups.filter(g => g.listPrice)
                            .reduce((s,g) => s + (parseFloat(g.listPrice) - g.avgCostPerUnit) * g.totalQty, 0),
    };
  }, [groups]);

  const filtered = useMemo(() => {
    let g = groups;
    if (search)       g = g.filter(x => x.productName.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter) g = g.filter(x => x.dominantStatus === statusFilter);
    return g;
  }, [groups, search, statusFilter]);

  const toggleGroup = (name) =>
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));

  const handleEdit = (order) => { setEditingOrder(order); setFormOpen(true); };

  const th = {
    color: 'rgba(255,255,255,0.28)', fontSize: 9, textTransform: 'uppercase',
    letterSpacing: '0.06em', padding: '6px 8px', textAlign: 'left',
    borderBottom: '1px solid rgba(255,255,255,0.07)', fontWeight: 600, whiteSpace: 'nowrap',
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#080c12' }}>

      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.95)', margin: 0 }}>Inventory On Hand</h1>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>Grouped by product · derived from your purchase orders</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 8, marginBottom: 14 }}>
        <StatCard label="Unique Products"  value={stats.uniqueProducts}                            color="rgba(255,255,255,0.85)" icon={Boxes}        />
        <StatCard label="Units In Hand"    value={stats.unitsInHand}                               color="#06b6d4"                icon={Package}      />
        <StatCard label="Units On the Way" value={stats.unitsOnWay}                                color="#60a5fa"                icon={ShoppingCart} />
        <StatCard label="Cost Basis"       value={fmt(stats.costBasis)}                            color="#f59e0b"                icon={DollarSign}   />
        <StatCard label="Est. Profit"      value={stats.estProfit > 0 ? fmt(stats.estProfit) : '—'} color="#10b981"              icon={TrendingUp}   />
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10, padding: '8px 12px',
      }}>
        <input
          type="text" placeholder="Search products..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7,
            padding: '6px 10px', color: 'white', fontSize: 12, outline: 'none',
          }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{
            background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 7, padding: '6px 10px', color: 'rgba(255,255,255,0.6)',
            fontSize: 11, outline: 'none', cursor: 'pointer',
          }}>
          <option value="">All statuses</option>
          <option value="received">Received</option>
          <option value="partially_received">Partially received</option>
          <option value="ordered">Ordered</option>
          <option value="shipped">Shipped</option>
          <option value="paid">Paid</option>
        </select>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
          {filtered.length} product{filtered.length !== 1 ? 's' : ''} · click to expand
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(16,185,129,0.2)', borderTopColor: '#10b981', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
          <Package style={{ width: 36, height: 36, color: 'rgba(255,255,255,0.1)', margin: '0 auto 12px' }} />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>No inventory found.</p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 4 }}>Items appear here once orders are marked as received, shipped, or ordered.</p>
        </div>
      ) : (
        <div style={{ background: '#111827', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 28 }} />
              <col style={{ width: '34%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '13%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={th} />
                <th style={th}>Product</th>
                <th style={th}>Qty</th>
                <th style={th}>Cost / unit</th>
                <th style={th}>Total cost</th>
                <th style={th}>Est. profit</th>
                <th style={th}>Status</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {filtered.map(group => (
                <GroupRow
                  key={group.productName}
                  group={group}
                  expanded={!!expandedGroups[group.productName]}
                  onToggle={() => toggleGroup(group.productName)}
                  onEdit={handleEdit}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'right' }}>
          {filtered.reduce((s, g) => s + g.totalQty, 0)} total units across {filtered.length} products
        </div>
      )}

      {/* Reuse existing POFormModal for editing */}
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