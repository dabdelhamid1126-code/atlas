import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CreditCard, Package, Tag, Globe, Plus, Trash2, Copy,
  AlertTriangle, DollarSign, X, ClipboardList, Minus, ImageOff,
} from 'lucide-react';

function StoreLogo({ retailer, size = 32 }) {
  const [err, setErr] = React.useState(false);
  const BRANDFETCH_CLIENT_ID = '1idzVIG0BYPKsFIDJDI';
  const getStoreDomain = (vendorName) => {
    if (!vendorName) return null;
    const n = String(vendorName || '').toLowerCase().replace(/[\s\-\_\.\']/g, '').replace(/[^a-z0-9]/g, '');
    if (n.includes('bestbuy')) return 'bestbuy.com';
    if (n.includes('amazon')) return 'amazon.com';
    if (n.includes('walmart')) return 'walmart.com';
    if (n.includes('apple')) return 'apple.com';
    if (n.includes('target')) return 'target.com';
    if (n.includes('costco')) return 'costco.com';
    if (n.includes('samsclub') || n.includes('sams')) return 'samsclub.com';
    if (n.includes('ebay')) return 'ebay.com';
    return n + '.com';
  };
  const domain = getStoreDomain(retailer);
  const logoUrl = domain ? `https://cdn.brandfetch.io/domain/${domain}?c=${BRANDFETCH_CLIENT_ID}` : null;
  const initials = (retailer || 'X').slice(0, 2).toUpperCase();
  
  if (!logoUrl || err) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #10b981, #06b6d4)', color: 'white', fontWeight: 800, fontSize: size * 0.35, flexShrink: 0 }}>
        {initials}
      </div>
    );
  }
  return (
    <img src={logoUrl} alt={retailer} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} />
  );
}
import ProductAutocomplete from '@/components/purchase-orders/ProductAutocomplete';
import GiftCardPicker from '@/components/shared/GiftCardPicker';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ── Constants ──────────────────────────────────────────────────────────────
const STATUSES = ['pending', 'ordered', 'shipped', 'partially_received', 'received', 'cancelled'];
const PRODUCT_CATEGORIES = ['Electronics', 'Home & Garden', 'Toys & Games', 'Health & Beauty', 'Sports', 'Clothing', 'Tools', 'Gift Cards', 'Grocery', 'Other'];
const RETAILERS = ['Amazon', 'Bestbuy', 'Walmart', 'Target', 'Costco', "Sam's Club", 'eBay', 'Woot', 'Apple', 'Other'];
const TABS = [
  { id: 'details',  label: 'Details', Icon: ClipboardList },
  { id: 'items',    label: 'Items', Icon: Package },
  { id: 'payment',  label: 'Payment', Icon: CreditCard },
  { id: 'sales',    label: 'Sales', Icon: DollarSign },
];

// ── Style helpers ──────────────────────────────────────────────────────────
const inp = { background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8 };
const inpRo = { background: 'rgba(255,255,255,0.04)', color: '#64748b', borderColor: 'rgba(255,255,255,0.07)', borderRadius: 8 };

const LBL = ({ children }) => (
  <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
    {children}
  </label>
);

function ItemThumb({ src, name }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#10b981', fontSize: 13, fontWeight: 700,
      }}>
        {name?.charAt(0)?.toUpperCase() || <ImageOff style={{ width: 13, height: 13 }} />}
      </div>
    );
  }
  return (
    <img src={src} alt={name} onError={() => setErr(true)}
      style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} />
  );
}

const defaultSaleEvent = () => ({
  id: crypto.randomUUID(), buyer: '', sale_date: '', payout_date: '', items: [],
});

const defaultItem = () => ({
  product_id: '', product_name: '', upc: '', quantity_ordered: 1, quantity_received: 0, unit_cost: 0, sale_price: 0, product_image_url: '',
});

// ── Main component ─────────────────────────────────────────────────────────
export default function POFormModal({ open, onOpenChange, order, onSubmit, products, creditCards, giftCards, sellers, isPending, onDelete }) {

  const getInitialForm = (o) => {
    const items = o?.items?.length > 0 ? o.items.map(i => ({ ...defaultItem(), ...i, sale_price: i.sale_price || 0 })) : [defaultItem()];
    return o ? {
      order_type: o.order_type || 'churning',
      order_number: o.order_number || '',
      tracking_numbers: o.tracking_numbers?.length > 0 ? o.tracking_numbers : (o.tracking_number ? [o.tracking_number] : ['']),
      retailer: o.retailer || '',
      buyer: o.buyer || '',
      marketplace_platform: o.marketplace_platform || '',
      account: o.account || '',
      status: o.status || 'pending',
      category: o.category || 'other',
      product_category: o.product_category || '',
      credit_card_id: o.credit_card_id || '',
      payment_splits: o.payment_splits?.length > 0 ? o.payment_splits : [],
      gift_card_ids: o.gift_card_ids || [],
      is_pickup: o.is_pickup || false,
      pickup_location: o.pickup_location || '',
      is_dropship: o.is_dropship || false,
      dropship_to: o.dropship_to || '',
      order_date: o.order_date || '',
      notes: o.notes || '',
      items,
      sale_events: o.sale_events || [],
      tax: o.tax ?? 0,
      shipping_cost: o.shipping_cost ?? 0,
      fees: o.fees ?? 0,
      include_tax_in_cashback: o.include_tax_in_cashback !== false,
      include_shipping_in_cashback: o.include_shipping_in_cashback !== false,
      extra_cashback_percent: o.extra_cashback_percent || 0,
      bonus_notes: o.bonus_notes || '',
      amazon_yacb: o.bonus_notes?.toLowerCase().includes('prime young adult') || false,
      cashback_rate_override: '',
    } : {
      order_type: 'churning', order_number: '', tracking_numbers: [''],
      retailer: '', buyer: '', marketplace_platform: '', account: '',
      status: 'pending', category: 'other', product_category: '',
      credit_card_id: '', payment_splits: [], gift_card_ids: [],
      is_pickup: false, pickup_location: '', is_dropship: false, dropship_to: '',
      order_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
      items: [defaultItem()], sale_events: [],
      tax: 0, shipping_cost: 0, fees: 0,
      include_tax_in_cashback: true, include_shipping_in_cashback: true,
      extra_cashback_percent: 0, bonus_notes: '',
      amazon_yacb: false, cashback_rate_override: '',
    };
  };

  const [formData, setFormData] = useState(() => getInitialForm(order));
  const [activeTab, setActiveTab] = useState('details');
  const [visible, setVisible] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setFormData(getInitialForm(order));
      setActiveTab('details');
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open, order]);

  // Trap escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && open) onOpenChange(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const selectedCard = creditCards.find(c => c.id === formData.credit_card_id);

  // Split helpers
  const addSplit = () => setFormData(prev => ({ ...prev, payment_splits: [...(prev.payment_splits || []), { card_id: '', card_name: '', cashback_rate: 0, amount: '' }] }));
  const removeSplit = (idx) => setFormData(prev => ({ ...prev, payment_splits: prev.payment_splits.filter((_, i) => i !== idx) }));
  const updateSplit = (idx, field, value) => setFormData(prev => {
    const splits = prev.payment_splits.map((sp, i) => {
      if (i !== idx) return sp;
      if (field === 'card_id') { const card = creditCards.find(c => c.id === value); return { ...sp, card_id: value, card_name: card?.card_name || '', cashback_rate: card?.cashback_rate || 0 }; }
      return { ...sp, [field]: value };
    });
    return { ...prev, payment_splits: splits };
  });

  // Item helpers
  const updateItem = (idx, field, value) => setFormData(prev => ({ ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, [field]: value } : it) }));
  const addItem = () => setFormData(prev => ({ ...prev, items: [...prev.items, defaultItem()] }));
  const removeItem = (idx) => setFormData(prev => ({ ...prev, items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== idx) : prev.items }));
  const duplicateItem = (idx) => setFormData(prev => ({ ...prev, items: [...prev.items.slice(0, idx + 1), { ...prev.items[idx] }, ...prev.items.slice(idx + 1)] }));

  // Tracking helpers
  const updateTracking = (idx, val) => setFormData(prev => { const t = [...prev.tracking_numbers]; t[idx] = val; return { ...prev, tracking_numbers: t }; });
  const addTracking = () => setFormData(prev => ({ ...prev, tracking_numbers: [...prev.tracking_numbers, ''] }));
  const removeTracking = (idx) => setFormData(prev => ({ ...prev, tracking_numbers: prev.tracking_numbers.length > 1 ? prev.tracking_numbers.filter((_, i) => i !== idx) : [''] }));

  // Sale event helpers
  const addSaleEvent = () => {
    const ev = defaultSaleEvent();
    ev.items = formData.items.filter(it => it.product_name?.trim()).map(it => ({ 
      product_name: it.product_name, 
      quantity: 1, 
      sale_price: it.sale_price || 0 
    }));
    setFormData(prev => ({ ...prev, sale_events: [...prev.sale_events, ev] }));
  };
  const removeSaleEvent = (id) => setFormData(prev => ({ ...prev, sale_events: prev.sale_events.filter(e => e.id !== id) }));
  const updateSaleEvent = (id, field, value) => setFormData(prev => ({ ...prev, sale_events: prev.sale_events.map(e => e.id !== id ? e : { ...e, [field]: value }) }));
  const updateSaleEventItem = (eventId, itemIdx, field, value) => setFormData(prev => ({
    ...prev,
    sale_events: prev.sale_events.map(e => {
      if (e.id !== eventId) return e;
      return { ...e, items: e.items.map((it, i) => i === itemIdx ? { ...it, [field]: value } : it) };
    })
  }));

  // Calculations
  const tax = parseFloat(formData.tax) || 0;
  const shippingCost = parseFloat(formData.shipping_cost) || 0;
  const fees = parseFloat(formData.fees) || 0;
  const itemsSubtotal = formData.items.reduce((s, it) => s + (parseFloat(it.unit_cost) || 0) * (parseInt(it.quantity_ordered) || 1), 0);
  const totalPrice = itemsSubtotal + tax + shippingCost + fees;
  const giftCardTotal = formData.gift_card_ids.reduce((sum, id) => { const gc = giftCards.find(g => g.id === id); return sum + (gc?.value || 0); }, 0);
  const cashbackBase = (() => { let b = totalPrice; if (!formData.include_tax_in_cashback) b -= tax; if (!formData.include_shipping_in_cashback) b -= shippingCost; return b; })();
  const cardRate = parseFloat(formData.cashback_rate_override) || (selectedCard?.cashback_rate || 0);
  const cashbackAmount = (cashbackBase * cardRate / 100) + (formData.amazon_yacb ? cashbackBase * 0.05 : 0);
  const totalItemsOrdered = formData.items.reduce((s, it) => s + (parseInt(it.quantity_ordered) || 1), 0);
  const totalItemsSold = formData.sale_events.reduce((s, ev) => s + ev.items.reduce((ss, it) => ss + (parseInt(it.qty) || 0), 0), 0);
  const totalSaleRevenue = formData.sale_events.reduce((s, ev) => s + ev.items.reduce((ss, it) => ss + (parseFloat(it.sale_price) || 0) * (parseInt(it.qty) || 0), 0), 0);
  const isAmazon = formData.retailer === 'Amazon';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.retailer?.trim()) { toast.error('Retailer is required'); return; }
    const items = formData.items.map(it => ({
      ...it,
      quantity_ordered: parseInt(it.quantity_ordered) || 1,
      quantity_received: parseInt(it.quantity_received) || 0,
      unit_cost: parseFloat(it.unit_cost) || 0,
      sale_price: parseFloat(it.sale_price) || 0,
    }));
    const hasSplits = (formData.payment_splits || []).length > 1;
    const splitsTotal = (formData.payment_splits || []).reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);
    if (hasSplits && Math.abs(splitsTotal - totalPrice) > 0.01) { toast.error(`Split amounts ($${splitsTotal.toFixed(2)}) must equal order total ($${totalPrice.toFixed(2)})`); return; }
    
    // Normalize sale_events structure: ensure quantity always has a fallback
    const normalizedSaleEvents = formData.sale_events.map(ev => ({
      ...ev,
      items: ev.items.map(it => ({
        product_name: it.product_name || '',
        quantity: parseInt(it.quantity ?? 1) || 1,
        sale_price: parseFloat(it.sale_price) || 0,
      }))
    }));
    
    const dataToSubmit = {
      ...formData,
      items,
      tracking_numbers: formData.tracking_numbers.filter(Boolean),
      sale_events: normalizedSaleEvents,
      tax, shipping_cost: shippingCost, fees, total_cost: totalPrice,
      gift_card_value: giftCardTotal, final_cost: totalPrice - giftCardTotal,
      credit_card_id: hasSplits ? (formData.payment_splits[0]?.card_id || null) : (formData.credit_card_id || null),
      payment_splits: hasSplits ? formData.payment_splits.map(sp => ({ card_id: sp.card_id, card_name: sp.card_name, cashback_rate: sp.cashback_rate || 0, amount: parseFloat(sp.amount) || 0 })) : [],
      extra_cashback_percent: formData.amazon_yacb ? 5 : (parseFloat(formData.extra_cashback_percent) || 0),
      bonus_notes: formData.amazon_yacb ? 'Prime Young Adult' : formData.bonus_notes,
    };
    delete dataToSubmit.amazon_yacb;
    delete dataToSubmit.cashback_rate_override;
    
    // Call onSubmit and refresh orders afterward
    onSubmit(dataToSubmit);
    
    // Invalidate purchase orders query to refresh the list
    queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
  };

  if (!open && !visible) return null;

  // ── Subtitle ──────────────────────────────────────────────────────────
  const subtitle = [formData.order_number && `#${formData.order_number}`, formData.retailer, formData.order_date].filter(Boolean).join(' · ');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Overlay */}
      <div
        onClick={() => onOpenChange(false)}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(3px)',
          transition: 'opacity 250ms ease-out',
          opacity: visible ? 1 : 0,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 660,
          height: '100%',
          background: '#111827',
          borderLeft: '1px solid rgba(255,255,255,0.11)',
          boxShadow: '-24px 0 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 250ms ease-out',
          color: 'white',
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '18px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
              <StoreLogo retailer={formData.retailer} size={32} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2 }}>
                  {order ? 'Edit Order' : 'New Order'}
                </h2>
                {subtitle && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{subtitle}</p>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {order && onDelete && (
                <button type="button" onClick={() => { onDelete(order.id); onOpenChange(false); }}
                  style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer' }}>
                  Delete
                </button>
              )}
              <button type="button" onClick={() => onOpenChange(false)}
                style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(tab => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  background: 'transparent', border: 'none', outline: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #10b981' : '2px solid transparent',
                  color: activeTab === tab.id ? '#10b981' : '#94a3b8',
                  transition: 'all 0.15s',
                  marginBottom: -1,
                }}>
                <tab.Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <form id="po-form" onSubmit={handleSubmit}>

            {/* ══ TAB: DETAILS ══════════════════════════════════════════ */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                {/* Mode toggle */}
                <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', width: 'fit-content' }}>
                  {[{v:'churning', label:'Churning', icon: Tag, activeStyle: {background:'rgba(245,158,11,0.15)', color:'#fbbf24', borderColor:'rgba(245,158,11,0.4)'}},
                    {v:'marketplace', label:'Marketplace', icon: Globe, activeStyle: {background:'rgba(59,130,246,0.15)', color:'#60a5fa', borderColor:'rgba(59,130,246,0.4)'}}
                  ].map(({v, label, icon: Icon, activeStyle}) => (
                    <button key={v} type="button" onClick={() => set('order_type', v)}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', border:'1px solid', transition:'all 0.15s',
                        ...(formData.order_type === v ? activeStyle : {background:'transparent', color:'#94a3b8', borderColor:'transparent'}) }}>
                      <Icon style={{width:13, height:13}} /> {label}
                    </button>
                  ))}
                </div>

                {/* Vendor section */}
                <div style={{ borderRadius: 12, padding: 16, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    🏪 Vendor & Order
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><LBL>Vendor *</LBL>
                      <Select value={formData.retailer} onValueChange={v => set('retailer', v)}>
                        <SelectTrigger className="text-slate-200 h-9" style={inp}><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{RETAILERS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><LBL>Status</LBL>
                      <Select value={formData.status} onValueChange={v => { if (v === 'received') setFormData(prev => ({ ...prev, status: v, items: prev.items.map(it => ({...it, quantity_received: it.quantity_ordered})) })); else set('status', v); }}>
                        <SelectTrigger className="text-slate-200 h-9" style={inp}><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><LBL>Order Number</LBL>
                      <Input style={inp} value={formData.order_number} onChange={e => set('order_number', e.target.value)} placeholder="112-3456789" />
                    </div>
                    <div><LBL>Order Date</LBL>
                      <Input type="date" style={inp} value={formData.order_date} onChange={e => set('order_date', e.target.value)} />
                    </div>
                    <div><LBL>Account</LBL>
                      <Input style={inp} value={formData.account} onChange={e => set('account', e.target.value)} placeholder="Account used" />
                    </div>
                  </div>

                  {/* Tracking numbers */}
                  <div>
                    <LBL>Tracking Number(s)</LBL>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {formData.tracking_numbers.map((tn, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <Input style={{ ...inp, flex: 1 }} value={tn} onChange={e => updateTracking(idx, e.target.value)} placeholder="1Z999AA1..." />
                          {formData.tracking_numbers.length > 1 && (
                            <button type="button" onClick={() => removeTracking(idx)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                              <Minus style={{ width: 14, height: 14 }} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={addTracking} style={{ fontSize: 12, color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Plus style={{ width: 12, height: 12 }} /> Add tracking number
                      </button>
                    </div>
                  </div>

                  {/* Marketplace note */}
                  {formData.order_type === 'marketplace' && (
                    <p style={{ fontSize: '11px', color: '#64748b', marginBottom: 12, fontStyle: 'italic' }}>
                      Buyer/platform is set per sale in the Sales tab
                    </p>
                  )}

                  {/* Dropship / Pickup toggles */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button type="button" onClick={() => set('is_dropship', !formData.is_dropship)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                        ...(formData.is_dropship
                          ? { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }
                          : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' })
                      }}>
                      🚚 Dropship
                    </button>
                    <button type="button" onClick={() => set('is_pickup', !formData.is_pickup)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                        ...(formData.is_pickup
                          ? { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }
                          : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' })
                      }}>
                      📍 Pickup
                    </button>
                  </div>
                  {formData.is_dropship && (
                    <div style={{ marginTop: 10 }}>
                      <LBL>Dropship To</LBL>
                      <Select value={formData.dropship_to} onValueChange={v => set('dropship_to', v)}>
                        <SelectTrigger className="text-slate-200 h-8 text-xs" style={inp}><SelectValue placeholder="Select seller..." /></SelectTrigger>
                        <SelectContent>{sellers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {formData.is_pickup && (
                    <div style={{ marginTop: 10 }}>
                      <LBL>Pickup Location</LBL>
                      <Input style={inp} value={formData.pickup_location} onChange={e => set('pickup_location', e.target.value)} placeholder="e.g. Store 5" />
                    </div>
                  )}
                  </div>

                {/* Notes */}
                <div><LBL>Notes</LBL>
                  <Textarea value={formData.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes..." rows={2}
                    style={{ ...inp, width: '100%', padding: '8px 12px', resize: 'vertical', fontSize: 13 }} />
                </div>
              </div>
            )}

            {/* ══ TAB: ITEMS ════════════════════════════════════════════ */}
            {activeTab === 'items' && (
              <div>
                <div style={{ borderRadius: 12, padding: 16, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Package style={{ width: 14, height: 14, color: '#06b6d4' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06b6d4' }}>Order Items</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.25)' }}>
                        {formData.items.length}
                      </span>
                    </div>
                    <Select value={formData.product_category} onValueChange={v => set('product_category', v)}>
                      <SelectTrigger className="text-slate-200 h-7 text-xs w-32" style={inp}><SelectValue placeholder="Category..." /></SelectTrigger>
                      <SelectContent>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {formData.items.map((item, idx) => (
                      <div key={idx} style={{ borderRadius: 10, padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#06b6d4', background: 'rgba(6,182,212,0.12)', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(6,182,212,0.2)' }}>
                            Item {idx + 1}
                          </span>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button type="button" onClick={() => duplicateItem(idx)} style={{ padding: 4, borderRadius: 6, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }} title="Duplicate">
                              <Copy style={{ width: 13, height: 13 }} />
                            </button>
                            {formData.items.length > 1 && (
                              <button type="button" onClick={() => removeItem(idx)} style={{ padding: 4, borderRadius: 6, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>
                                <Trash2 style={{ width: 13, height: 13 }} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ marginBottom: 8 }}><LBL>Product</LBL>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            <ItemThumb src={item.product_image_url} name={item.product_name} />
                            <div style={{ flex: 1 }}>
                              <ProductAutocomplete products={products} nameValue={item.product_name || ''} upcValue={item.upc || ''} searchField="name"
                                  onSelect={p => { updateItem(idx,'product_id',p.id); updateItem(idx,'product_name',p.name); updateItem(idx,'upc',p.upc||''); updateItem(idx,'product_image_url',p.image||p.image); if(idx===0) set('product_category',p.category||formData.product_category); }}
                                  onChangeName={val => updateItem(idx,'product_name',val)} placeholder="e.g. iPad Air" />
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div><LBL>Unit Price</LBL>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 12 }}>$</span>
                              <Input className="h-8 text-sm" style={{ ...inp, paddingLeft: 22 }} type="number" step="0.01" min="0" value={item.unit_cost || ''} onChange={e => updateItem(idx,'unit_cost',e.target.value)} placeholder="0.00" />
                            </div>
                          </div>
                          <div><LBL>Qty</LBL>
                            <Input className="h-8 text-sm text-center" style={inp} type="number" min="1" value={item.quantity_ordered || 1} onChange={e => updateItem(idx,'quantity_ordered',e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button type="button" onClick={addItem}
                    style={{ marginTop: 12, width: '100%', padding: '8px 0', borderRadius: 8, fontSize: 13, color: '#10b981', background: 'none', border: '1px dashed rgba(16,185,129,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Plus style={{ width: 14, height: 14 }} /> Add Item
                  </button>
                </div>
              </div>
            )}

            {/* ══ TAB: PAYMENT ══════════════════════════════════════════ */}
            {activeTab === 'payment' && (
              <div style={{ borderRadius: 12, padding: 16, background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.15)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ec4899', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  💳 Costs & Payment
                </div>

                {/* Tax / Shipping / Fees / Card */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div><LBL>Tax</LBL>
                    <div style={{ position: 'relative' }}><span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'#64748b', fontSize:12 }}>$</span>
                      <Input className="h-8 text-sm" style={{...inp, paddingLeft:22}} type="number" step="0.01" min="0" value={formData.tax} onChange={e => set('tax', e.target.value)} placeholder="0.00" /></div>
                  </div>
                  <div><LBL>Shipping</LBL>
                    <div style={{ position: 'relative' }}><span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'#64748b', fontSize:12 }}>$</span>
                      <Input className="h-8 text-sm" style={{...inp, paddingLeft:22}} type="number" step="0.01" min="0" value={formData.shipping_cost} onChange={e => set('shipping_cost', e.target.value)} placeholder="0.00" /></div>
                  </div>
                  <div><LBL>Fees</LBL>
                    <div style={{ position: 'relative' }}><span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'#64748b', fontSize:12 }}>$</span>
                      <Input className="h-8 text-sm" style={{...inp, paddingLeft:22}} type="number" step="0.01" min="0" value={formData.fees} onChange={e => set('fees', e.target.value)} placeholder="0.00" /></div>
                  </div>
                  <div><LBL>Card</LBL>
                    {(formData.payment_splits || []).length === 0 ? (
                      <Select value={formData.credit_card_id || ''} onValueChange={v => { const card = creditCards.find(c => c.id === v); set('credit_card_id', v); set('card_name', card?.card_name || ''); }}>
                        <SelectTrigger className="text-slate-200 h-8 text-xs" style={inp}>
                          {formData.credit_card_id ? <span className="text-xs">{selectedCard?.card_name}</span> : <SelectValue placeholder="Select..." />}
                        </SelectTrigger>
                        <SelectContent>{creditCards.filter(c => c.active !== false).map(c => <SelectItem key={c.id} value={c.id}>{c.card_name}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : <span style={{ fontSize: 11, color: '#64748b' }}>Split</span>}
                  </div>
                </div>

                {/* Cashback pill */}
                {(formData.payment_splits || []).length === 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      ...(cardRate > 0 ? {background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', color:'#10b981'} : {background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#64748b'}) }}>
                      <CreditCard style={{ width: 13, height: 13 }} />
                      {cardRate > 0 ? `💳 ${cardRate}% → $${cashbackAmount.toFixed(2)} est.` : 'Select a card for cashback'}
                    </div>
                    {cardRate > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Input className="h-7 w-14 text-xs text-center" style={inp} type="number" step="0.1" min="0"
                          value={formData.cashback_rate_override || ''} onChange={e => set('cashback_rate_override', e.target.value)} placeholder={String(cardRate)} />
                        <span style={{ fontSize: 11, color: '#64748b' }}>%</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Split payments */}
                {(formData.payment_splits || []).length > 0 && (
                  <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {formData.payment_splits.map((sp, idx) => {
                      const spCard = creditCards.find(c => c.id === sp.card_id);
                      const spCB = ((parseFloat(sp.amount)||0) * (spCard?.cashback_rate||0) / 100);
                      return (
                        <div key={idx} style={{ display:'grid', gridTemplateColumns:'5fr 3fr 3fr 32px', gap:8, alignItems:'end', padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)' }}>
                          <div><LBL>Card</LBL>
                            <Select value={sp.card_id||''} onValueChange={v => updateSplit(idx,'card_id',v)}>
                              <SelectTrigger className="text-slate-200 h-8 text-xs" style={inp}><SelectValue placeholder="Card..." /></SelectTrigger>
                              <SelectContent>{creditCards.filter(c=>c.active!==false).map(c=><SelectItem key={c.id} value={c.id}>{c.card_name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div><LBL>Amount</LBL>
                            <div style={{position:'relative'}}><span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'#64748b',fontSize:11}}>$</span>
                              <Input className="h-8 text-xs" style={{...inp,paddingLeft:20}} type="number" step="0.01" min="0" value={sp.amount} onChange={e=>updateSplit(idx,'amount',e.target.value)} placeholder="0.00" /></div>
                          </div>
                          <div><LBL>CB</LBL>
                            <div style={{position:'relative'}}><span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'#64748b',fontSize:11}}>$</span>
                              <Input className="h-8 text-xs" style={{...inpRo,paddingLeft:20}} readOnly value={spCB.toFixed(2)} /></div>
                          </div>
                          <button type="button" onClick={()=>removeSplit(idx)} style={{color:'#f87171',background:'none',border:'none',cursor:'pointer',padding:4,marginTop:16}}>
                            <Trash2 style={{width:13,height:13}} />
                          </button>
                        </div>
                      );
                    })}
                    {(() => {
                      const st = formData.payment_splits.reduce((s,sp) => s+(parseFloat(sp.amount)||0), 0);
                      const ok = Math.abs(st - totalPrice) < 0.01;
                      return (
                        <div style={{ padding:'8px 12px', borderRadius:8, fontSize:11, fontWeight:600, display:'flex', justifyContent:'space-between',
                          ...(ok ? {background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',color:'#10b981'} : {background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',color:'#f59e0b'}) }}>
                          <span>Split: ${st.toFixed(2)} / Total: ${totalPrice.toFixed(2)}</span>
                          {ok && <span>✓ Balanced</span>}
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div style={{ display:'flex', gap:10, marginBottom:14 }}>
                  <button type="button" onClick={addSplit}
                    style={{ fontSize:12, fontWeight:600, color:'#ec4899', padding:'6px 12px', borderRadius:8, background:'rgba(236,72,153,0.08)', border:'1px solid rgba(236,72,153,0.2)', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                    <Plus style={{width:12,height:12}} /> Split payment
                  </button>
                  {(formData.payment_splits||[]).length > 0 && (
                    <button type="button" onClick={() => set('payment_splits',[])}
                      style={{ fontSize:12, color:'#64748b', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                      Single card
                    </button>
                  )}
                </div>

                {/* Gift cards */}
                <GiftCardPicker giftCards={giftCards} selectedIds={formData.gift_card_ids} onChange={(ids) => set('gift_card_ids', ids)} retailer={formData.retailer} />

                {/* Checkboxes */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:16 }}>
                  <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#cbd5e1', cursor:'pointer' }}>
                    <input type="checkbox" checked={formData.include_tax_in_cashback} onChange={e => set('include_tax_in_cashback', e.target.checked)} />
                    Tax in cashback
                  </label>
                  <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#cbd5e1', cursor:'pointer' }}>
                    <input type="checkbox" checked={formData.include_shipping_in_cashback} onChange={e => set('include_shipping_in_cashback', e.target.checked)} />
                    Shipping in cashback
                  </label>
                  {isAmazon && (
                    <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, cursor:'pointer', padding:'4px 10px', borderRadius:8, border:'1px solid',
                      ...(formData.amazon_yacb ? {background:'rgba(245,158,11,0.1)', borderColor:'rgba(245,158,11,0.4)', color:'#fbbf24'} : {background:'rgba(255,255,255,0.04)', borderColor:'rgba(255,255,255,0.1)', color:'#94a3b8'}) }}>
                      <input type="checkbox" checked={formData.amazon_yacb} onChange={e => set('amazon_yacb', e.target.checked)} />
                      ✨ Amazon YA 5%
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* ══ TAB: SALES ════════════════════════════════════════════ */}
            {activeTab === 'sales' && (
              <div style={{ borderRadius: 12, padding: 16, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, paddingBottom:8, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <DollarSign style={{width:14,height:14,color:'#10b981'}} />
                    <span style={{fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#10b981'}}>Sale Events</span>
                    {totalItemsSold > 0 && (
                      <span style={{fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'rgba(16,185,129,0.12)', color:'#10b981', border:'1px solid rgba(16,185,129,0.2)'}}>
                        {totalItemsSold} / {totalItemsOrdered} sold
                      </span>
                    )}
                  </div>
                  <button type="button" onClick={addSaleEvent}
                    style={{fontSize:12, fontWeight:600, color:'#10b981', padding:'6px 12px', borderRadius:8, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', cursor:'pointer', display:'flex', alignItems:'center', gap:4}}>
                    <Plus style={{width:12,height:12}} /> Record Sale
                  </button>
                </div>

                {formData.sale_events.length === 0 ? (
                  <div style={{textAlign:'center', padding:'32px 0'}}>
                    <DollarSign style={{width:32,height:32,color:'rgba(16,185,129,0.3)',margin:'0 auto 8px'}} />
                    <p style={{color:'#64748b',fontSize:13,marginBottom:12}}>No sale events yet</p>
                    <p style={{color:'#475569',fontSize:11,maxWidth:280,margin:'0 auto 16px'}}>Track partial or multi-buyer sales. Example: CardCash bought 2 @ $150, ElectronicsBuyer bought 1 @ $145</p>
                    <button type="button" onClick={addSaleEvent}
                      style={{fontSize:13, fontWeight:600, color:'#10b981', padding:'8px 20px', borderRadius:10, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', cursor:'pointer'}}>
                      + Record First Sale
                    </button>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {formData.sale_events.map((ev, evIdx) => (
                      <div key={ev.id} style={{borderRadius:10, padding:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(16,185,129,0.15)'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                          <span style={{fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#10b981'}}>Sale {evIdx+1}</span>
                          <button type="button" onClick={() => removeSaleEvent(ev.id)} style={{color:'#f87171',background:'none',border:'none',cursor:'pointer',padding:4}}>
                            <Trash2 style={{width:13,height:13}} />
                          </button>
                        </div>

                        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:8, marginBottom:10 }}>
                          <div><LBL>Buyer / Platform</LBL>
                            <Select value={ev.buyer||''} onValueChange={v => updateSaleEvent(ev.id,'buyer',v)}>
                              <SelectTrigger className="text-slate-200 h-8 text-xs" style={inp}><SelectValue placeholder="Select buyer..." /></SelectTrigger>
                              <SelectContent>
                                {sellers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                {['eBay','Amazon','Facebook Marketplace','Mercari','OfferUp'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><LBL>Sale Date</LBL>
                            <Input type="date" className="h-8 text-xs" style={inp} value={ev.sale_date||''} onChange={e => updateSaleEvent(ev.id,'sale_date',e.target.value)} />
                          </div>
                          <div><LBL>Payout Date</LBL>
                            <Input type="date" className="h-8 text-xs" style={inp} value={ev.payout_date||''} onChange={e => updateSaleEvent(ev.id,'payout_date',e.target.value)} />
                          </div>
                        </div>

                        <div><LBL>Items Sold</LBL>
                          <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
                            {ev.items.map((it, itIdx) => (
                              <div key={itIdx} style={{display:'grid', gridTemplateColumns:'5fr 2fr 3fr 28px', gap:6, alignItems:'center'}}>
                                <Input className="h-7 text-xs" style={inp} value={it.product_name||''} placeholder="Product" onChange={e => updateSaleEventItem(ev.id,itIdx,'product_name',e.target.value)} />
                                <Input className="h-7 text-xs text-center" style={inp} type="number" min="1" value={it.quantity ?? 1} placeholder="1" onChange={e => updateSaleEventItem(ev.id,itIdx,'quantity',parseInt(e.target.value) || 1)} />
                                <div style={{position:'relative'}}><span style={{position:'absolute',left:7,top:'50%',transform:'translateY(-50%)',color:'#64748b',fontSize:11}}>$</span>
                                  <Input className="h-7 text-xs" style={{...inp,paddingLeft:18}} type="number" step="0.01" min="0" value={it.sale_price||''} placeholder="Price/unit" onChange={e => updateSaleEventItem(ev.id,itIdx,'sale_price',e.target.value)} />
                                </div>
                                <button type="button" onClick={() => updateSaleEvent(ev.id,'items',ev.items.filter((_,i)=>i!==itIdx))} style={{color:'#64748b',background:'none',border:'none',cursor:'pointer',padding:2}}>
                                  <X style={{width:12,height:12}} />
                                </button>
                              </div>
                            ))}
                            <button type="button" onClick={() => { updateSaleEvent(ev.id,'items',[...ev.items,{product_name:'',quantity:1,sale_price:0}]); }}
                              style={{fontSize:11,color:'#10b981',background:'none',border:'none',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:4}}>
                              <Plus style={{width:11,height:11}} /> Add item
                            </button>
                          </div>
                          {ev.items.length > 0 && (
                            <div style={{marginTop:8,textAlign:'right',fontSize:11,color:'#10b981',fontWeight:600}}>
                              Sale total: ${ev.items.reduce((s,it) => s+(parseFloat(it.sale_price)||0)*(parseInt(it.quantity??1)||1),0).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Running totals */}
                    {totalItemsSold > 0 && (
                      <div style={{padding:'10px 14px', borderRadius:10, background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span style={{fontSize:12,color:'#10b981',fontWeight:500}}>
                          {totalItemsSold} of {totalItemsOrdered} items sold
                        </span>
                        <span style={{fontSize:13,color:'#10b981',fontWeight:700}}>
                          ${totalSaleRevenue.toFixed(2)} revenue
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </form>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', background:'#111827' }}>
          <div style={{fontSize:12, color:'#94a3b8', display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', rowGap: 2}}>
            <span style={{fontWeight:600, color:'#e2e8f0'}}>Total: ${totalPrice.toFixed(2)}</span>
            {cashbackAmount > 0 && <><span style={{ margin: '0 6px' }}>·</span><span style={{color:'#10b981'}}>CB: ${cashbackAmount.toFixed(2)}</span></>}
            {giftCardTotal > 0 && <><span style={{ margin: '0 6px' }}>·</span><span style={{color:'#f59e0b', fontWeight: 600}}>GC: ${giftCardTotal.toFixed(2)}</span></>}
          </div>
          <div style={{display:'flex', gap:10}}>
            <button type="button" onClick={() => onOpenChange(false)}
              style={{padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:500, color:'#94a3b8', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer'}}>
              Cancel
            </button>
            <button type="submit" form="po-form" disabled={isPending}
              style={{padding:'8px 20px', borderRadius:8, fontSize:13, fontWeight:700, color:'white', background:'linear-gradient(135deg,#10b981,#06b6d4)', border:'none', cursor:'pointer', opacity: isPending ? 0.6 : 1}}>
              {isPending ? 'Saving...' : (order ? 'Save Changes' : 'Create Order')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}