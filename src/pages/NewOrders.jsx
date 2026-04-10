import React, { useState, useMemo, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tag, Globe, Package, CreditCard, DollarSign, Plus, Trash2,
  Copy, Sparkles, Info, Minus, Paperclip, X, FileText, TrendingUp, ImageOff,
  ClipboardList, Download,
} from 'lucide-react';
import ProductAutocomplete from '@/components/purchase-orders/ProductAutocomplete';
import GiftCardPicker from '@/components/shared/GiftCardPicker';
import SplitPaymentInput from '@/components/payment-methods/SplitPaymentInput';

const RETAILERS = ['Amazon', 'Best Buy', 'Walmart', 'Target', 'Costco', "Sam's Club", 'eBay', 'Woot', 'Apple', 'Other'];
const CHURNING_STATUSES  = [{ value: 'pending', label: 'Pending' }, { value: 'ordered', label: 'Ordered' }, { value: 'shipped', label: 'Shipped' }, { value: 'received', label: 'Received' }];
const MARKETPLACE_STATUSES = [{ value: 'pending', label: 'Pending' }, { value: 'ordered', label: 'Listed' }, { value: 'shipped', label: 'Sold' }, { value: 'received', label: 'Completed' }];
const fmt$ = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

const inp = { background: 'var(--parch-warm)', color: 'var(--ink)', borderColor: 'var(--parch-line)' };
const inpReadonly = { background: 'var(--parch-card)', color: 'var(--ink-ghost)', borderColor: 'var(--parch-line)' };

// Logo domain mappers
const getStoreDomain = (vendorName) => {
  const n = String(vendorName || '').toLowerCase().replace(/[\s\-\_\.\']/g, '').replace(/[^a-z0-9]/g, '');
  if (n.includes('bestbuy')) return 'bestbuy.com';
  if (n.includes('amazon')) return 'amazon.com';
  if (n.includes('walmart')) return 'walmart.com';
  if (n.includes('apple')) return 'apple.com';
  if (n.includes('target')) return 'target.com';
  if (n.includes('costco')) return 'costco.com';
  if (n.includes('samsclub') || n.includes('sams')) return 'samsclub.com';
  if (n.includes('ebay')) return 'ebay.com';
  if (n.includes('woot')) return 'woot.com';
  return null;
};

const getCardDomain = (cardName) => {
  const n = String(cardName || '').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
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

const BRANDFETCH_CLIENT_ID = '1idzVIG0BYPKsFIDJDI';

function BrandLogo({ domain, size = 18, fallbackInitials = 'X' }) {
  const [err, setErr] = React.useState(false);
  const logoUrl = domain ? `https://cdn.brandfetch.io/domain/${domain}?c=${BRANDFETCH_CLIENT_ID}` : null;
  if (!logoUrl || err) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #10b981, #06b6d4)', color: 'white', fontWeight: 700, fontSize: size * 0.35, flexShrink: 0 }}>
        {fallbackInitials.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img src={logoUrl} alt="logo" onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--parch-line)', display: 'block' }} />
  );
}

function ItemThumb({ src, name, onClick }) {
  const [err, setErr] = React.useState(false);
  React.useEffect(() => setErr(false), [src]);
  if (!src || err) {
    return (
      <div onClick={onClick} style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--terrain-bg)', border: '1px solid var(--terrain-bdr)', color: 'var(--terrain)', fontSize: 13, fontWeight: 700 }}>
        {name?.charAt(0)?.toUpperCase() || <ImageOff style={{ width: 14, height: 14 }} />}
      </div>
    );
  }
  return (
    <img src={src} alt={name} onClick={onClick} onError={() => setErr(true)}
      style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0, cursor: 'pointer', border: '1px solid var(--parch-line)' }} />
  );
}

function ImagePreviewModal({ src, alt, onClose }) {
  if (!src) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div style={{ position: 'relative', maxWidth: 384, width: '100%', margin: '0 16px' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: -12, right: -12, zIndex: 10, width: 32, height: 32, borderRadius: '50%', background: 'var(--parch-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--parch-line)', cursor: 'pointer' }}>
          <X style={{ width: 14, height: 14, color: 'var(--ink-dim)' }} />
        </button>
        <img src={src} alt={alt} style={{ width: '100%', borderRadius: 16, maxHeight: '80vh', objectFit: 'contain' }} />
      </div>
    </div>
  );
}

const defaultItem = () => ({ id: crypto.randomUUID(), product_id: '', product_name: '', upc: '', quantity_ordered: 1, unit_cost: '', product_image_url: '' });

const defaultSaleEvent = () => ({
  id: crypto.randomUUID(), buyer: '', sale_date: '', payout_date: '', items: [],
});

const defaultForm = () => ({
  order_type: 'churning', retailer: '', marketplace_platform: '', account: '',
  order_number: '', tracking_numbers: [''], status: 'pending',
  product_category: '', order_date: format(new Date(), 'yyyy-MM-dd'),
  tax: '', shipping_cost: '', fees: '', credit_card_id: '', payment_splits: [],
  gift_card_ids: [], include_tax_in_cashback: true, include_shipping_in_cashback: true,
  amazon_yacb: false, cashback_rate_override: '', notes: '',
  fulfillment_type: 'ship_to_me', dropship_to: '', pickup_location: '',
  items: [defaultItem()],
  sale_events: [],
});

const LBL = ({ children }) => (
  <label style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-dim)', display: 'block', marginBottom: 4 }}>
    {children}
  </label>
);

export default function NewOrders() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm());
  const [receipts, setReceipts] = useState([]);
  const [previewImg, setPreviewImg] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const fileInputRef = useRef(null);
  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const [userEmail, setUserEmail] = useState(null);
  useEffect(() => { base44.auth.me().then(u => setUserEmail(u?.email)).catch(() => {}); }, []);

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list() });
  const { data: creditCards = [] } = useQuery({ queryKey: ['creditCards', userEmail], queryFn: () => userEmail ? base44.entities.CreditCard.filter({ created_by: userEmail }) : [], enabled: userEmail !== null });
  const { data: giftCards = [] } = useQuery({ queryKey: ['giftCards', userEmail], queryFn: () => userEmail ? base44.entities.GiftCard.filter({ created_by: userEmail }) : [], enabled: userEmail !== null });
  const { data: sellers = [] } = useQuery({ queryKey: ['sellers'], queryFn: () => base44.entities.Seller.list() });

  useEffect(() => {
    setForm(prev => ({ ...defaultForm(), order_type: prev.order_type, retailer: prev.retailer, credit_card_id: prev.credit_card_id }));
    setReceipts([]);
  }, [form.order_type]);

  const updateItem = (id, f, v) => setForm(prev => ({ ...prev, items: prev.items.map(it => it.id !== id ? it : { ...it, [f]: v }) }));
  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, defaultItem()] }));
  const removeItem = (id) => setForm(prev => ({ ...prev, items: prev.items.length > 1 ? prev.items.filter(it => it.id !== id) : prev.items }));
  const duplicateItem = (id) => setForm(prev => {
    const idx = prev.items.findIndex(it => it.id === id);
    const copy = { ...prev.items[idx], id: crypto.randomUUID() };
    const items = [...prev.items]; items.splice(idx + 1, 0, copy);
    return { ...prev, items };
  });

  const updateTracking = (idx, val) => setForm(prev => { const t = [...prev.tracking_numbers]; t[idx] = val; return { ...prev, tracking_numbers: t }; });
  const addTracking = () => setForm(prev => ({ ...prev, tracking_numbers: [...prev.tracking_numbers, ''] }));
  const removeTracking = (idx) => setForm(prev => ({ ...prev, tracking_numbers: prev.tracking_numbers.length > 1 ? prev.tracking_numbers.filter((_, i) => i !== idx) : [''] }));

  const addSaleEvent = () => {
    const ev = defaultSaleEvent();
    ev.items = form.items.filter(it => it.product_name?.trim()).map(it => ({ product_name: it.product_name, quantity: 1, sale_price: 0 }));
    setForm(prev => ({ ...prev, sale_events: [...prev.sale_events, ev] }));
  };
  const removeSaleEvent = (id) => setForm(prev => ({ ...prev, sale_events: prev.sale_events.filter(e => e.id !== id) }));
  const updateSaleEvent = (id, field, value) => setForm(prev => ({ ...prev, sale_events: prev.sale_events.map(e => e.id !== id ? e : { ...e, [field]: value }) }));
  const updateSaleEventItem = (eventId, itemIdx, field, value) => setForm(prev => ({
    ...prev,
    sale_events: prev.sale_events.map(e => {
      if (e.id !== eventId) return e;
      return { ...e, items: e.items.map((it, i) => i === itemIdx ? { ...it, [field]: value } : it) };
    })
  }));

  const addReceipts = (files) => setReceipts(prev => [...prev, ...Array.from(files)]);
  const removeReceipt = (idx) => setReceipts(prev => prev.filter((_, i) => i !== idx));

  const isSplit = form.payment_splits?.length > 1;
  const primaryCardId = isSplit ? (form.payment_splits[0]?.card_id || '') : form.credit_card_id;
  const selectedCard = creditCards.find(c => c.id === primaryCardId);
  const isAmazon = form.retailer === 'Amazon';
  const statuses = form.order_type === 'churning' ? CHURNING_STATUSES : MARKETPLACE_STATUSES;

  const itemsSubtotal = useMemo(() => form.items.reduce((s, it) => s + (parseFloat(it.unit_cost) || 0) * (parseInt(it.quantity_ordered) || 1), 0), [form.items]);
  const tax = parseFloat(form.tax) || 0;
  const shipping = parseFloat(form.shipping_cost) || 0;
  const fees = parseFloat(form.fees) || 0;
  const totalCost = itemsSubtotal + tax + shipping + fees;
  const giftCardTotal = useMemo(() => form.gift_card_ids.reduce((s, id) => { const gc = giftCards.find(g => g.id === id); return s + (gc?.value || 0); }, 0), [form.gift_card_ids, giftCards]);
  const finalCost = totalCost - giftCardTotal;
  const cardRate = parseFloat(form.cashback_rate_override) || selectedCard?.cashback_rate || 0;
  const cashbackBase = (totalCost - giftCardTotal) - (!form.include_tax_in_cashback ? tax : 0) - (!form.include_shipping_in_cashback ? shipping : 0);
  const splitCashbackTotal = isSplit ? form.payment_splits.reduce((sum, sp) => { const card = creditCards.find(c => c.id === sp.card_id); return sum + ((parseFloat(sp.amount) || 0) * (card?.cashback_rate || 0) / 100); }, 0) : 0;
  const cardCB = isSplit ? splitCashbackTotal : Math.max(0, cashbackBase) * cardRate / 100;
  const yaCB = form.amazon_yacb && isAmazon ? Math.min(cashbackBase * 0.05, 100) : 0;
  const totalCB = cardCB + yaCB;
  const totalSalePrice = form.sale_events?.reduce((sum, ev) => sum + (ev.items?.reduce((s, it) => s + (parseFloat(it.sale_price) || 0) * (parseInt(it.quantity) || 1), 0) || 0), 0) || 0;
  const netProfit = totalSalePrice > 0 ? totalSalePrice - totalCost + totalCB : totalCB;
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const validItemCount = form.items.filter(it => it.product_name?.trim() && parseFloat(it.unit_cost) > 0).length;
  const hasSales = totalSalePrice > 0;

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const order = await base44.entities.PurchaseOrder.create(data);
      if (data.gift_card_ids?.length > 0) {
        for (const cardId of data.gift_card_ids) await base44.entities.GiftCard.update(cardId, { status: 'used', used_order_number: data.order_number });
        queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      }
      if (data.payment_splits?.length > 1) {
        for (const sp of data.payment_splits) {
          const card = creditCards.find(c => c.id === sp.card_id); if (!card) continue;
          const cb = parseFloat((sp.amount * (card.cashback_rate || 0) / 100).toFixed(2));
          if (cb > 0) await base44.entities.Reward.create({ credit_card_id: sp.card_id, card_name: card.card_name, source: card.card_name, type: 'cashback', currency: 'USD', purchase_amount: sp.amount, amount: cb, purchase_order_id: order.id, order_number: order.order_number, date_earned: order.order_date, status: 'pending', notes: `Auto from order ${order.order_number} (split: $${sp.amount})` });
        }
        queryClient.invalidateQueries({ queryKey: ['rewards'] });
      } else if (order.credit_card_id && totalCB > 0) {
        const card = creditCards.find(c => c.id === order.credit_card_id);
        if (card) { await base44.entities.Reward.create({ credit_card_id: order.credit_card_id, card_name: card.card_name, source: card.card_name, type: 'cashback', currency: 'USD', purchase_amount: cashbackBase, amount: parseFloat(totalCB.toFixed(2)), purchase_order_id: order.id, order_number: order.order_number, date_earned: order.order_date, status: 'pending', notes: `Auto from order ${order.order_number}` }); queryClient.invalidateQueries({ queryKey: ['rewards'] }); }
      }
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Order created!');
      setReceipts([]);
      setForm(prev => ({ ...defaultForm(), order_type: prev.order_type, retailer: prev.retailer, credit_card_id: prev.credit_card_id }));
    },
    onError: () => toast.error('Failed to create order'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.retailer) { toast.error('Vendor is required'); return; }
    const validItems = form.items.filter(it => it.product_name?.trim() && parseFloat(it.unit_cost) > 0);
    if (validItems.length === 0) { toast.error('At least one item with name and price is required'); return; }
    if (isSplit) {
      const splitsTotal = form.payment_splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);
      if (Math.abs(splitsTotal - finalCost) > 0.01) { toast.error(`Split amounts must equal final cost`); return; }
      if (form.payment_splits.some(sp => !sp.card_id)) { toast.error('Please select a card for each split payment'); return; }
    }
    const pcId = isSplit ? (form.payment_splits[0]?.card_id || null) : (form.credit_card_id || null);
    const pc = creditCards.find(c => c.id === pcId);

    const normalizedSaleEvents = form.sale_events.map(ev => ({
      ...ev,
      items: ev.items.map(it => ({
        product_name: it.product_name || '',
        quantity: parseInt(it.quantity ?? 1) || 1,
        sale_price: parseFloat(it.sale_price) || 0,
      }))
    }));

    createMutation.mutate({
      order_type: form.order_type,
      order_number: form.order_number?.trim() || `ORD-${Date.now()}`,
      tracking_numbers: form.tracking_numbers.map(t => t.trim()).filter(Boolean),
      retailer: form.retailer,
      marketplace_platform: form.marketplace_platform || null,
      account: form.account || null,
      status: form.status,
      product_category: form.product_category || null,
      order_date: form.order_date,
      tax, shipping_cost: shipping, fees,
      total_cost: totalCost,
      gift_card_value: giftCardTotal,
      final_cost: finalCost,
      credit_card_id: pcId,
      card_name: pc?.card_name || null,
      payment_splits: isSplit ? form.payment_splits.map(sp => ({ card_id: sp.card_id, card_name: sp.card_name, amount: parseFloat(sp.amount) || 0 })) : [],
      gift_card_ids: form.gift_card_ids,
      include_tax_in_cashback: form.include_tax_in_cashback,
      include_shipping_in_cashback: form.include_shipping_in_cashback,
      extra_cashback_percent: form.amazon_yacb && isAmazon ? 5 : 0,
      bonus_notes: form.amazon_yacb && isAmazon ? 'Prime Young Adult' : null,
      notes: form.notes || null,
      fulfillment_type: form.fulfillment_type || 'ship_to_me',
      dropship_to: form.fulfillment_type === 'direct_dropship' ? form.dropship_to : null,
      has_receipts: receipts.length > 0,
      items: validItems.map(it => ({ product_id: it.product_id || null, product_name: it.product_name.trim(), upc: it.upc || null, quantity_ordered: parseInt(it.quantity_ordered) || 1, quantity_received: 0, unit_cost: parseFloat(it.unit_cost) || 0, product_image_url: it.product_image_url || null })),
      sale_events: normalizedSaleEvents,
    });
  };

  // Profit color using CSS vars
  const profitColor = hasSales ? (netProfit >= 0 ? 'var(--terrain)' : 'var(--crimson)') : 'var(--violet)';
  const roiColor = roi !== 0 ? (roi >= 0 ? 'var(--terrain)' : 'var(--crimson)') : 'var(--ink-ghost)';

  const TABS = [
    { id: 'details', label: 'Details', icon: ClipboardList },
    { id: 'items', label: 'Items', icon: Package },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'sales', label: 'Sales', icon: DollarSign },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {previewImg && <ImagePreviewModal src={previewImg.src} alt={previewImg.alt} onClose={() => setPreviewImg(null)} />}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif", fontSize: 24, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.3px' }}>Add Order</h1>
        <p style={{ fontSize: 12, color: 'var(--ink-dim)', marginTop: 4 }}>Record a new purchase</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── MODE TOGGLE + TAB BAR ── */}
            <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)' }}>
                  <button type="button" onClick={() => set('order_type', 'churning')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                      ...(form.order_type === 'churning'
                        ? { background: 'var(--gold-bg)', color: 'var(--gold)', borderColor: 'var(--gold-border)' }
                        : { background: 'transparent', color: 'var(--ink-dim)', borderColor: 'transparent' }) }}>
                    <Tag style={{ width: 13, height: 13 }} /> Churning
                  </button>
                  <button type="button" onClick={() => set('order_type', 'marketplace')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                      ...(form.order_type === 'marketplace'
                        ? { background: 'var(--ocean-bg)', color: 'var(--ocean)', borderColor: 'var(--ocean-bdr)' }
                        : { background: 'transparent', color: 'var(--ink-dim)', borderColor: 'transparent' }) }}>
                    <Globe style={{ width: 13, height: 13 }} /> Marketplace
                  </button>
                </div>
              </div>

              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--parch-line)' }}>
                {TABS.map(tab => {
                  const TabIcon = tab.icon;
                  return (
                    <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                      style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', outline: 'none',
                        borderBottom: activeTab === tab.id ? '2px solid var(--terrain)' : '2px solid transparent',
                        color: activeTab === tab.id ? 'var(--terrain)' : 'var(--ink-dim)',
                        transition: 'all 0.15s', marginBottom: -1 }}>
                      <TabIcon style={{ width: 14, height: 14 }} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── TAB: DETAILS ── */}
            {activeTab === 'details' && (
              <div style={{ background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--parch-line)' }}>
                  🏪 Vendor & Order
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div><LBL>Vendor *</LBL>
                    <Select value={form.retailer} onValueChange={(v) => set('retailer', v)}>
                      <SelectTrigger className="h-9" style={inp}><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
                        {RETAILERS.map(r => (
                          <SelectItem key={r} value={r} style={{ color: 'var(--ink)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <BrandLogo domain={getStoreDomain(r)} size={16} fallbackInitials={r} />
                              {r}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><LBL>Status</LBL>
                    <Select value={form.status} onValueChange={(v) => set('status', v)}>
                      <SelectTrigger className="h-9" style={inp}><SelectValue /></SelectTrigger>
                      <SelectContent style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
                        {statuses.map(s => <SelectItem key={s.value} value={s.value} style={{ color: 'var(--ink)' }}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><LBL>Order Number</LBL>
                    <Input style={inp} className="h-9" value={form.order_number} onChange={e => set('order_number', e.target.value)} placeholder="112-3456789" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div><LBL>Order Date</LBL>
                    <Input type="date" style={inp} className="h-9" value={form.order_date} onChange={e => set('order_date', e.target.value)} />
                  </div>
                  <div><LBL>Account</LBL>
                    <Input style={inp} className="h-9" value={form.account} onChange={e => set('account', e.target.value)} placeholder="Account used" />
                  </div>
                </div>

                <div><LBL>Tracking Number(s)</LBL>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {form.tracking_numbers.map((tn, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <Input style={{ ...inp, flex: 1 }} className="h-8" value={tn} onChange={e => updateTracking(idx, e.target.value)} placeholder="1Z999AA1..." />
                        {form.tracking_numbers.length > 1 && (
                          <button type="button" onClick={() => removeTracking(idx)} style={{ color: 'var(--crimson)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                            <Minus style={{ width: 14, height: 14 }} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={addTracking} style={{ fontSize: 12, color: 'var(--terrain)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Plus style={{ width: 12, height: 12 }} /> Add tracking number
                    </button>
                  </div>
                </div>

                {/* Fulfillment Type */}
                <div style={{ display: 'flex', gap: 6, marginTop: 12, padding: 4, borderRadius: 12, background: 'var(--parch-card)', border: '1px solid var(--parch-line)', width: 'fit-content' }}>
                  {[
                    { v: 'ship_to_me', label: '📦 Ship to Me', color: 'var(--ocean)', bg: 'var(--ocean-bg)', border: 'var(--ocean-bdr)' },
                    { v: 'store_pickup', label: '📍 Store Pickup', color: 'var(--violet)', bg: 'var(--violet-bg)', border: 'var(--violet-bdr)' },
                    { v: 'direct_dropship', label: '🚛 Dropship', color: 'var(--gold)', bg: 'var(--gold-bg)', border: 'var(--gold-border)' },
                  ].map(({ v, label, color, bg, border }) => (
                    <button key={v} type="button" onClick={() => set('fulfillment_type', v)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                        ...(form.fulfillment_type === v ? { background: bg, borderColor: border, color } : { background: 'transparent', borderColor: 'transparent', color: 'var(--ink-dim)' }) }}>
                      {label}
                    </button>
                  ))}
                </div>

                {form.fulfillment_type === 'direct_dropship' && (
                  <div style={{ marginTop: 10 }}>
                    <LBL>Ship To (Buyer)</LBL>
                    <Select value={form.dropship_to} onValueChange={(v) => set('dropship_to', v)}>
                      <SelectTrigger className="h-8 text-xs" style={inp}><SelectValue placeholder="Select buyer..." /></SelectTrigger>
                      <SelectContent style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
                        {sellers.map(s => <SelectItem key={s.id} value={s.name} style={{ color: 'var(--ink)' }}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.fulfillment_type === 'store_pickup' && (
                  <div style={{ marginTop: 10 }}>
                    <LBL>Pickup Location</LBL>
                    <Input style={inp} className="h-8" value={form.pickup_location} onChange={e => set('pickup_location', e.target.value)} placeholder="e.g. Downtown Store" />
                  </div>
                )}

                <div style={{ marginTop: 12 }}><LBL>Notes</LBL>
                  <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes..." rows={2}
                    style={{ ...inp, width: '100%', padding: '8px 12px', resize: 'vertical', fontSize: 13 }} />
                </div>
              </div>
            )}

            {/* ── TAB: ITEMS ── */}
            {activeTab === 'items' && (
              <div style={{ background: 'var(--ocean-bg)', border: '1px solid var(--ocean-bdr)', borderRadius: 16, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--parch-line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package style={{ width: 14, height: 14, color: 'var(--ocean)' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ocean)' }}>Order Items</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--parch-card)', color: 'var(--ocean)', border: '1px solid var(--ocean-bdr)' }}>
                      {form.items.length}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {form.items.map((item, idx) => (
                    <div key={item.id} style={{ borderRadius: 10, padding: 12, background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ocean)', background: 'var(--ocean-bg)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--ocean-bdr)' }}>
                          Item {idx + 1}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button type="button" onClick={() => duplicateItem(item.id)} style={{ padding: 4, borderRadius: 6, color: 'var(--ink-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <Copy style={{ width: 13, height: 13 }} />
                          </button>
                          {form.items.length > 1 && (
                            <button type="button" onClick={() => removeItem(item.id)} style={{ padding: 4, borderRadius: 6, color: 'var(--crimson)', background: 'none', border: 'none', cursor: 'pointer' }}>
                              <Trash2 style={{ width: 13, height: 13 }} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ marginBottom: 8 }}><LBL>Product</LBL>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <ItemThumb src={item.product_image_url} name={item.product_name} onClick={() => item.product_image_url && setPreviewImg({ src: item.product_image_url, alt: item.product_name })} />
                          <div style={{ flex: 1 }}>
                            <ProductAutocomplete products={products} nameValue={item.product_name || ''} upcValue={item.upc || ''} searchField="name"
                              onSelect={(p) => { updateItem(item.id, 'product_id', p.id); updateItem(item.id, 'product_name', p.name); updateItem(item.id, 'upc', p.upc || ''); updateItem(item.id, 'product_image_url', p.image || ''); }}
                              onChangeName={(val) => updateItem(item.id, 'product_name', val)} placeholder="e.g. iPad Air" />
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <div><LBL>Unit Price</LBL>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 12 }}>$</span>
                            <Input className="h-8 text-sm" style={{ ...inp, paddingLeft: 22 }} type="number" step="0.01" min="0" value={item.unit_cost || ''} onChange={(e) => updateItem(item.id, 'unit_cost', e.target.value)} placeholder="0.00" />
                          </div>
                        </div>
                        <div><LBL>Qty</LBL>
                          <Input className="h-8 text-sm text-center" style={inp} type="number" min="1" value={item.quantity_ordered || 1} onChange={(e) => updateItem(item.id, 'quantity_ordered', e.target.value)} />
                        </div>
                        <div><LBL>Total</LBL>
                          <div style={{ height: 32, display: 'flex', alignItems: 'center', paddingLeft: 9, fontSize: 13, color: 'var(--ocean)', fontWeight: 600 }}>
                            {fmt$((parseFloat(item.unit_cost) || 0) * (parseInt(item.quantity_ordered) || 1))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={addItem}
                  style={{ marginTop: 12, width: '100%', padding: '8px 0', borderRadius: 8, fontSize: 13, color: 'var(--terrain)', background: 'none', border: '1px dashed var(--terrain-bdr)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Plus style={{ width: 14, height: 14 }} /> Add Item
                </button>
              </div>
            )}

            {/* ── TAB: PAYMENT ── */}
            {activeTab === 'payment' && (
              <div style={{ background: 'var(--ocean-bg)', border: '1px solid var(--ocean-bdr)', borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ocean)', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--parch-line)' }}>
                  💳 Costs & Payment
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 10, marginBottom: 14 }}>
                  <div><LBL>Tax</LBL>
                    <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 12 }}>$</span>
                      <Input className="h-8 text-sm" style={{ ...inp, paddingLeft: 20, minWidth: 80 }} type="number" step="0.01" min="0" value={form.tax} onChange={e => set('tax', e.target.value)} placeholder="0.00" /></div>
                  </div>
                  <div><LBL>Shipping</LBL>
                    <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 12 }}>$</span>
                      <Input className="h-8 text-sm" style={{ ...inp, paddingLeft: 20, minWidth: 80 }} type="number" step="0.01" min="0" value={form.shipping_cost} onChange={e => set('shipping_cost', e.target.value)} placeholder="0.00" /></div>
                  </div>
                  <div><LBL>Fees</LBL>
                    <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 12 }}>$</span>
                      <Input className="h-8 text-sm" style={{ ...inp, paddingLeft: 20, minWidth: 80 }} type="number" step="0.01" min="0" value={form.fees} onChange={e => set('fees', e.target.value)} placeholder="0.00" /></div>
                  </div>
                  <div><LBL>Card</LBL>
                    {!isSplit ? (
                      <Select value={form.credit_card_id || ''} onValueChange={(v) => set('credit_card_id', v)}>
                        <SelectTrigger className="h-8 text-xs" style={inp}>
                          {form.credit_card_id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                              <BrandLogo domain={getCardDomain(selectedCard?.card_name)} size={16} fallbackInitials={selectedCard?.card_name || 'X'} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                                {selectedCard?.card_name}
                              </span>
                              {selectedCard?.last_4_digits && (
                                <span style={{ flexShrink: 0, color: 'var(--ink-ghost)', fontSize: 11, fontFamily: 'monospace', marginLeft: 4 }}>
                                  ••••{selectedCard.last_4_digits}
                                </span>
                              )}
                            </div>
                          ) : <SelectValue placeholder="Select..." />}
                        </SelectTrigger>
                        <SelectContent style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
                          {creditCards.filter(c => c.active !== false).map(c => (
                            <SelectItem key={c.id} value={c.id} style={{ color: 'var(--ink)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <BrandLogo domain={getCardDomain(c.card_name)} size={18} fallbackInitials={c.card_name} />
                                <span>{c.card_name}{c.last_4_digits ? ` •${c.last_4_digits}` : ''}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>Split</span>}
                  </div>
                </div>

                {!isSplit && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, minHeight: 32,
                      ...(cardRate > 0 ? { background: 'var(--terrain-bg)', border: '1px solid var(--terrain-bdr)', color: 'var(--terrain)' } : { background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', color: 'var(--ink-dim)' }) }}>
                      {cardRate > 0 ? <BrandLogo domain={getCardDomain(selectedCard?.card_name)} size={16} /> : <CreditCard style={{ width: 13, height: 13 }} />}
                      {cardRate > 0 ? `${cardRate}% → ${fmt$(totalCB)} est.` : 'Select a card'}
                    </div>
                  </div>
                )}

                {isSplit && (
                  <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {form.payment_splits.map((sp, idx) => {
                      const spCard = creditCards.find(c => c.id === sp.card_id);
                      return (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '5fr 3fr 2fr 32px', gap: 8, alignItems: 'end', padding: '10px 12px', borderRadius: 10, background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
                          <div><LBL>Card</LBL>
                            <Select value={sp.card_id || ''} onValueChange={(v) => { const card = creditCards.find(c => c.id === v); setForm(prev => ({ ...prev, payment_splits: prev.payment_splits.map((s, i) => i === idx ? { ...s, card_id: v, card_name: card?.card_name || '' } : s) })); }}>
                              <SelectTrigger className="h-8 text-xs" style={inp}>
                                {sp.card_id ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <BrandLogo domain={getCardDomain(spCard?.card_name)} size={14} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spCard?.card_name}</span>
                                  </div>
                                ) : <SelectValue placeholder="Card..." />}
                              </SelectTrigger>
                              <SelectContent style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
                                {creditCards.filter(c => c.active !== false).map(c => (
                                  <SelectItem key={c.id} value={c.id} style={{ color: 'var(--ink)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <BrandLogo domain={getCardDomain(c.card_name)} size={18} />
                                      <span>{c.card_name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><LBL>Amount</LBL>
                            <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 11 }}>$</span>
                              <Input className="h-8 text-xs" style={{ ...inp, paddingLeft: 20 }} type="number" step="0.01" min="0" value={sp.amount} onChange={(e) => setForm(prev => ({ ...prev, payment_splits: prev.payment_splits.map((s, i) => i === idx ? { ...s, amount: e.target.value } : s) }))} placeholder="0.00" /></div>
                          </div>
                          <div><LBL>CB</LBL>
                            <div style={{ height: 32, display: 'flex', alignItems: 'center', paddingLeft: 8, color: 'var(--terrain)', fontWeight: 600, fontSize: 12 }}>
                              {fmt$((parseFloat(sp.amount) || 0) * (creditCards.find(c => c.id === sp.card_id)?.cashback_rate || 0) / 100)}
                            </div>
                          </div>
                          <button type="button" onClick={() => setForm(prev => ({ ...prev, payment_splits: prev.payment_splits.filter((_, i) => i !== idx) }))} style={{ color: 'var(--crimson)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginTop: 16 }}>
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, payment_splits: [...(prev.payment_splits || []), { card_id: '', card_name: '', amount: '' }] }))}
                    style={{ fontSize: 12, fontWeight: 600, color: 'var(--violet)', padding: '6px 12px', borderRadius: 8, background: 'var(--violet-bg)', border: '1px solid var(--violet-bdr)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Plus style={{ width: 12, height: 12 }} /> Split payment
                  </button>
                  {isSplit && (
                    <button type="button" onClick={() => set('payment_splits', [])} style={{ fontSize: 12, color: 'var(--ink-dim)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Single card</button>
                  )}
                </div>

                <GiftCardPicker giftCards={giftCards} selectedIds={form.gift_card_ids} onChange={(ids) => set('gift_card_ids', ids)} retailer={form.retailer} />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-faded)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.include_tax_in_cashback} onChange={e => set('include_tax_in_cashback', e.target.checked)} />
                    Tax in cashback
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-faded)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.include_shipping_in_cashback} onChange={e => set('include_shipping_in_cashback', e.target.checked)} />
                    Shipping in cashback
                  </label>
                  {isAmazon && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', padding: '4px 10px', borderRadius: 8, border: '1px solid',
                      ...(form.amazon_yacb ? { background: 'var(--gold-bg)', borderColor: 'var(--gold-border)', color: 'var(--gold)' } : { background: 'var(--parch-warm)', borderColor: 'var(--parch-line)', color: 'var(--ink-dim)' }) }}>
                      <input type="checkbox" checked={form.amazon_yacb} onChange={e => set('amazon_yacb', e.target.checked)} />
                      ✨ Amazon YA 5%
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB: SALES ── */}
            {activeTab === 'sales' && (
              <div style={{ background: 'var(--terrain-bg)', border: '1px solid var(--terrain-bdr)', borderRadius: 16, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--parch-line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DollarSign style={{ width: 14, height: 14, color: 'var(--terrain)' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--terrain)' }}>Sale Events</span>
                  </div>
                  <button type="button" onClick={addSaleEvent}
                    style={{ fontSize: 12, fontWeight: 600, color: 'var(--terrain)', padding: '6px 12px', borderRadius: 8, background: 'var(--parch-card)', border: '1px solid var(--terrain-bdr)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Plus style={{ width: 12, height: 12 }} /> Record Sale
                  </button>
                </div>

                {form.sale_events.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <DollarSign style={{ width: 32, height: 32, color: 'var(--terrain-bdr)', margin: '0 auto 8px' }} />
                    <p style={{ color: 'var(--ink-dim)', fontSize: 13, marginBottom: 12 }}>No sale events yet</p>
                    <button type="button" onClick={addSaleEvent}
                      style={{ fontSize: 13, fontWeight: 600, color: 'var(--terrain)', padding: '8px 20px', borderRadius: 10, background: 'var(--parch-card)', border: '1px solid var(--terrain-bdr)', cursor: 'pointer' }}>
                      + Record First Sale
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {form.sale_events.map((ev, evIdx) => (
                      <div key={ev.id} style={{ borderRadius: 10, padding: 12, background: 'var(--parch-card)', border: '1px solid var(--terrain-bdr)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--terrain)' }}>Sale {evIdx + 1}</span>
                          <button type="button" onClick={() => removeSaleEvent(ev.id)} style={{ color: 'var(--crimson)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                          <div><LBL>Buyer / Platform</LBL>
                            <Select value={ev.buyer || ''} onValueChange={(v) => updateSaleEvent(ev.id, 'buyer', v)}>
                              <SelectTrigger className="h-8 text-xs" style={inp}><SelectValue placeholder="Select buyer..." /></SelectTrigger>
                              <SelectContent style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
                                {sellers.map(s => <SelectItem key={s.id} value={s.name} style={{ color: 'var(--ink)' }}>{s.name}</SelectItem>)}
                                {['eBay', 'Amazon', 'Facebook Marketplace', 'Mercari', 'OfferUp'].map(p => <SelectItem key={p} value={p} style={{ color: 'var(--ink)' }}>{p}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><LBL>Sale Date</LBL>
                            <Input type="date" className="h-8 text-xs" style={inp} value={ev.sale_date || ''} onChange={(e) => updateSaleEvent(ev.id, 'sale_date', e.target.value)} />
                          </div>
                          <div><LBL>Payout Date</LBL>
                            <Input type="date" className="h-8 text-xs" style={inp} value={ev.payout_date || ''} onChange={(e) => updateSaleEvent(ev.id, 'payout_date', e.target.value)} />
                          </div>
                        </div>

                        <div><LBL>Items Sold</LBL>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                            {ev.items.map((it, itIdx) => (
                              <div key={itIdx} style={{ display: 'grid', gridTemplateColumns: '5fr 2fr 3fr 28px', gap: 6, alignItems: 'center' }}>
                                <Input className="h-7 text-xs" style={inp} value={it.product_name || ''} placeholder="Product" onChange={(e) => updateSaleEventItem(ev.id, itIdx, 'product_name', e.target.value)} />
                                <Input className="h-7 text-xs text-center" style={inp} type="number" min="1" value={it.quantity ?? 1} placeholder="1" onChange={(e) => updateSaleEventItem(ev.id, itIdx, 'quantity', parseInt(e.target.value) || 1)} />
                                <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 11 }}>$</span>
                                  <Input className="h-7 text-xs" style={{ ...inp, paddingLeft: 18 }} type="number" step="0.01" min="0" value={it.sale_price || ''} placeholder="Price" onChange={(e) => updateSaleEventItem(ev.id, itIdx, 'sale_price', e.target.value)} />
                                </div>
                                <button type="button" onClick={() => updateSaleEvent(ev.id, 'items', ev.items.filter((_, i) => i !== itIdx))} style={{ color: 'var(--ink-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                                  <X style={{ width: 12, height: 12 }} />
                                </button>
                              </div>
                            ))}
                            <button type="button" onClick={() => { updateSaleEvent(ev.id, 'items', [...ev.items, { product_name: '', quantity: 1, sale_price: 0 }]); }}
                              style={{ fontSize: 11, color: 'var(--terrain)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Plus style={{ width: 11, height: 11 }} /> Add item
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {totalSalePrice > 0 && (
                      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--parch-card)', border: '1px solid var(--terrain-bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--terrain)', fontWeight: 500 }}>
                          {form.sale_events.reduce((s, ev) => s + (ev.items?.reduce((ss, it) => ss + (parseInt(it.quantity ?? 1) || 1), 0) || 0), 0)} items sold
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--terrain)', fontWeight: 700 }}>
                          {fmt$(totalSalePrice)} revenue
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Profit summary card */}
            <div style={{ borderRadius: 16, overflow: 'hidden', background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
              <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--parch-line)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: hasSales ? 'var(--terrain)' : 'var(--violet)', marginBottom: 8 }}>
                  {hasSales ? 'Estimated Profit' : 'Cashback Profit'}
                </p>
                <p style={{ fontSize: 36, fontWeight: 600, lineHeight: 1, color: profitColor, fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
                  {fmt$(netProfit)}
                </p>
                <p style={{ fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 600, color: roiColor, fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>{roi.toFixed(1)}% ROI</span>
                  <span style={{ color: 'var(--parch-deep)' }}>·</span>
                  <span style={{ color: 'var(--ink-ghost)' }}>{validItemCount} item{validItemCount !== 1 ? 's' : ''}</span>
                </p>
                {!hasSales && (
                  <p style={{ fontSize: 11, color: 'var(--ink-ghost)', marginTop: 8 }}>Record sales in Sales tab or after saving</p>
                )}
              </div>

              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ink-dim)' }}>Items subtotal</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{fmt$(itemsSubtotal)}</span>
                </div>
                {(tax + shipping + fees) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--ink-dim)' }}>Tax + ship + fees</span>
                    <span style={{ color: 'var(--ink-faded)' }}>+{fmt$(tax + shipping + fees)}</span>
                  </div>
                )}
                {giftCardTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--ink-dim)' }}>Gift cards</span>
                    <span style={{ color: 'var(--rose)', fontWeight: 600 }}>−{fmt$(giftCardTotal)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingTop: 8, borderTop: '1px solid var(--parch-line)' }}>
                  <span style={{ color: 'var(--ink)', fontWeight: 500 }}>Total cost</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{fmt$(finalCost)}</span>
                </div>
                {totalCB > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--ink-dim)' }}>Cashback</span>
                    <span style={{ color: 'var(--violet)', fontWeight: 600 }}>+{fmt$(totalCB)}</span>
                  </div>
                )}
                {totalSalePrice > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--ink-dim)' }}>Sale total</span>
                    <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{fmt$(totalSalePrice)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--parch-line)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>{hasSales ? 'Net profit' : 'Cashback'}</span>
                  <span style={{ fontWeight: 600, fontSize: 15, color: profitColor, fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>{fmt$(netProfit)}</span>
                </div>
              </div>
            </div>

            <button type="submit" disabled={createMutation.isPending}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', borderRadius: 12, color: 'white', fontSize: 13, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', opacity: createMutation.isPending ? 0.6 : 1, transition: 'opacity 0.15s' }}>
              {createMutation.isPending ? (
                <><div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> Creating...</>
              ) : (
                <><Plus style={{ width: 16, height: 16 }} /> Add Order{validItemCount > 1 ? ` (${validItemCount} items)` : ''}</>
              )}
            </button>

            <button type="button" onClick={() => window.history.back()}
              style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontSize: 13, color: 'var(--ink-ghost)', background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}