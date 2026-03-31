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

const inp = { background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' };
const inpReadonly = { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)' };

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
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)', display: 'block' }} />
  );
}

function ItemThumb({ src, name, onClick }) {
  const [err, setErr] = React.useState(false);
  React.useEffect(() => setErr(false), [src]);
  if (!src || err) {
    return (
      <div
        onClick={onClick}
        className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center cursor-pointer text-slate-400 text-sm font-bold select-none"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {name?.charAt(0)?.toUpperCase() || <ImageOff className="h-4 w-4" />}
      </div>
    );
  }
  return (
    <img src={src} alt={name} onClick={onClick} onError={() => setErr(true)}
      className="w-10 h-10 rounded-lg object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition"
      style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
  );
}

function ImagePreviewModal({ src, alt, onClose }) {
  if (!src) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="relative max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-slate-100 transition">
          <X className="w-4 h-4 text-slate-700" />
        </button>
        <img src={src} alt={alt} className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]" />
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
  <label style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
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

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list() });
  const { data: creditCards = [] } = useQuery({ queryKey: ['creditCards'], queryFn: () => base44.entities.CreditCard.list() });
  const { data: giftCards = [] } = useQuery({ queryKey: ['giftCards'], queryFn: () => base44.entities.GiftCard.list() });
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

  const profitColor = netProfit >= 0 ? 'text-emerald-400' : 'text-red-400';
  const hasSales = totalSalePrice > 0;

  const TABS = [
    { id: 'details', label: 'Details', icon: ClipboardList },
    { id: 'items', label: 'Items', icon: Package },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'sales', label: 'Sales', icon: DollarSign },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-10">
      {previewImg && <ImagePreviewModal src={previewImg.src} alt={previewImg.alt} onClose={() => setPreviewImg(null)} />}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Add Order</h1>
        <p className="text-sm text-slate-400 mt-0.5">Record a new purchase</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          <div className="space-y-4">
            {/* ── MODE TOGGLE ── */}
            <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 16 }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <button type="button" onClick={() => set('order_type', 'churning')}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all border"
                    style={form.order_type === 'churning'
                      ? { background: 'rgba(245,158,11,0.15)', color: '#fbbf24', borderColor: 'rgba(245,158,11,0.4)' }
                      : { background: 'transparent', color: '#94a3b8', borderColor: 'transparent' }}>
                    <Tag className="h-3.5 w-3.5" /> Churning
                  </button>
                  <button type="button" onClick={() => set('order_type', 'marketplace')}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all border"
                    style={form.order_type === 'marketplace'
                      ? { background: 'rgba(59,130,246,0.15)', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.4)' }
                      : { background: 'transparent', color: '#94a3b8', borderColor: 'transparent' }}>
                    <Globe className="h-3.5 w-3.5" /> Marketplace
                  </button>
                </div>
              </div>

              {/* ── TAB BAR ── */}
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {TABS.map(tab => {
                  const TabIcon = tab.icon;
                  return (
                    <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: '10px 16px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        borderBottom: activeTab === tab.id ? '2px solid #10b981' : '2px solid transparent',
                        color: activeTab === tab.id ? '#10b981' : '#94a3b8',
                        transition: 'all 0.15s',
                        marginBottom: -1,
                      }}>
                      <TabIcon style={{ width: 14, height: 14 }} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── TAB: DETAILS ── */}
            {activeTab === 'details' && (
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  🏪 Vendor & Order
                </div>

                {/* Row 1: Vendor | Status | Order Number */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div><LBL>Vendor *</LBL>
                    <Select value={form.retailer} onValueChange={(v) => set('retailer', v)}>
                      <SelectTrigger className="text-slate-200 h-9" style={inp}><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent style={{ background: '#1a2234', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        {RETAILERS.map(r => (
                          <SelectItem key={r} value={r} style={{ color: '#94a3b8', background: 'transparent', padding: '8px 12px' }}>
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
                      <SelectTrigger className="text-slate-200 h-9" style={inp}><SelectValue /></SelectTrigger>
                      <SelectContent style={{ background: '#1a2234', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        {statuses.map(s => <SelectItem key={s.value} value={s.value} style={{ color: '#94a3b8', background: 'transparent', padding: '8px 12px' }}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><LBL>Order Number</LBL>
                    <Input style={inp} className="h-9" value={form.order_number} onChange={e => set('order_number', e.target.value)} placeholder="112-3456789" />
                  </div>
                </div>

                {/* Row 2: Order Date | Account */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div><LBL>Order Date</LBL>
                    <Input type="date" style={inp} className="h-9" value={form.order_date} onChange={e => set('order_date', e.target.value)} />
                  </div>
                  <div><LBL>Account</LBL>
                    <Input style={inp} className="h-9" value={form.account} onChange={e => set('account', e.target.value)} placeholder="Account used" />
                  </div>
                </div>

                {/* Tracking Numbers */}
                <div><LBL>Tracking Number(s)</LBL>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {form.tracking_numbers.map((tn, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <Input style={{ ...inp, flex: 1 }} className="h-8" value={tn} onChange={e => updateTracking(idx, e.target.value)} placeholder="1Z999AA1..." />
                        {form.tracking_numbers.length > 1 && (
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

                {/* Fulfillment Type */}
                <div style={{ display: 'flex', gap: 6, marginTop: 12, padding: 4, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', width: 'fit-content' }}>
                  {[
                    { v: 'ship_to_me', label: '📦 Ship to Me', color: '#60a5fa', bgActive: 'rgba(96,165,250,0.15)', borderActive: 'rgba(96,165,250,0.3)' },
                    { v: 'store_pickup', label: '📍 Store Pickup', color: '#a855f7', bgActive: 'rgba(168,85,247,0.15)', borderActive: 'rgba(168,85,247,0.3)' },
                    { v: 'direct_dropship', label: '🚛 Dropship', color: '#f59e0b', bgActive: 'rgba(245,158,11,0.15)', borderActive: 'rgba(245,158,11,0.3)' }
                  ].map(({ v, label, color, bgActive, borderActive }) => (
                    <button key={v} type="button" onClick={() => set('fulfillment_type', v)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                        ...(form.fulfillment_type === v
                          ? { background: bgActive, borderColor: borderActive, color }
                          : { background: 'transparent', borderColor: 'transparent', color: '#94a3b8' })
                      }}>
                      {label}
                    </button>
                  ))}
                </div>

                {form.fulfillment_type === 'direct_dropship' && (
                  <div style={{ marginTop: 10 }}>
                    <LBL>Ship To (Buyer)</LBL>
                    <Select value={form.dropship_to} onValueChange={(v) => set('dropship_to', v)}>
                      <SelectTrigger className="text-slate-200 h-8 text-xs" style={inp}><SelectValue placeholder="Select buyer..." /></SelectTrigger>
                      <SelectContent style={{ background: '#1a2234', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                        {sellers.map(s => <SelectItem key={s.id} value={s.name} style={{ color: '#94a3b8', background: 'transparent', padding: '8px 12px' }}>{s.name}</SelectItem>)}
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

                {/* Notes */}
                <div style={{ marginTop: 12 }}><LBL>Notes</LBL>
                  <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any notes..." rows={2}
                    style={{ ...inp, width: '100%', padding: '8px 12px', resize: 'vertical', fontSize: 13 }} />
                </div>
              </div>
            )}

            {/* ── TAB: ITEMS ── */}
            {activeTab === 'items' && (
              <div style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 16, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package style={{ width: 14, height: 14, color: '#06b6d4' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#06b6d4' }}>Order Items</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.25)' }}>
                      {form.items.length}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {form.items.map((item, idx) => (
                    <div key={item.id} style={{ borderRadius: 10, padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#06b6d4', background: 'rgba(6,182,212,0.12)', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(6,182,212,0.2)' }}>
                          Item {idx + 1}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button type="button" onClick={() => duplicateItem(item.id)} style={{ padding: 4, borderRadius: 6, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
                            <Copy style={{ width: 13, height: 13 }} />
                          </button>
                          {form.items.length > 1 && (
                            <button type="button" onClick={() => removeItem(item.id)} style={{ padding: 4, borderRadius: 6, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>
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
                              onSelect={(p) => { updateItem(item.id, 'product_id', p.id); updateItem(item.id, 'product_name', p.name); updateItem(item.id, 'upc', p.upc || ''); updateItem(item.id, 'product_image_url', p.image || ''); }}
                              onChangeName={(val) => updateItem(item.id, 'product_name', val)} placeholder="e.g. iPad Air" />
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <div><LBL>Unit Price</LBL>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 12 }}>$</span>
                            <Input className="h-8 text-sm" style={{ ...inp, paddingLeft: 22 }} type="number" step="0.01" min="0" value={item.unit_cost || ''} onChange={(e) => updateItem(item.id, 'unit_cost', e.target.value)} placeholder="0.00" />
                          </div>
                        </div>
                        <div><LBL>Qty</LBL>
                          <Input className="h-8 text-sm text-center" style={inp} type="number" min="1" value={item.quantity_ordered || 1} onChange={(e) => updateItem(item.id, 'quantity_ordered', e.target.value)} />
                        </div>
                        <div><LBL>Total</LBL>
                          <div style={{ height: 32, display: 'flex', alignItems: 'center', paddingLeft: 9, fontSize: 13, color: '#60a5fa', fontWeight: 600 }}>
                            {fmt$((parseFloat(item.unit_cost) || 0) * (parseInt(item.quantity_ordered) || 1))}
                          </div>
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
            )}

            {/* ── TAB: PAYMENT ── */}
            {activeTab === 'payment' && (
              <div style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.15)', borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#ec4899', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  💳 Costs & Payment
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div><LBL>Tax</LBL>
                    <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 12 }}>$</span>
                      <Input className="h-8 text-sm" style={{ ...inp, paddingLeft: 22 }} type="number" step="0.01" min="0" value={form.tax} onChange={e => set('tax', e.target.value)} placeholder="0.00" /></div>
                  </div>
                  <div><LBL>Shipping</LBL>
                    <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 12 }}>$</span>
                      <Input className="h-8 text-sm" style={{ ...inp, paddingLeft: 22 }} type="number" step="0.01" min="0" value={form.shipping_cost} onChange={e => set('shipping_cost', e.target.value)} placeholder="0.00" /></div>
                  </div>
                  <div><LBL>Fees</LBL>
                    <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 12 }}>$</span>
                      <Input className="h-8 text-sm" style={{ ...inp, paddingLeft: 22 }} type="number" step="0.01" min="0" value={form.fees} onChange={e => set('fees', e.target.value)} placeholder="0.00" /></div>
                  </div>
                  <div><LBL>Card</LBL>
                    {!isSplit ? (
                      <Select value={form.credit_card_id || ''} onValueChange={(v) => set('credit_card_id', v)}>
                        <SelectTrigger className="text-slate-200 h-8 text-xs" style={inp}>
                          {form.credit_card_id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                              <BrandLogo domain={getCardDomain(selectedCard?.card_name)} size={16} fallbackInitials={selectedCard?.card_name || 'X'} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {selectedCard?.card_name}{selectedCard?.last_4_digits ? ` •${selectedCard.last_4_digits}` : ''}
                              </span>
                            </div>
                          ) : <SelectValue placeholder="Select..." />}
                        </SelectTrigger>
                        <SelectContent style={{ background: '#1a2234', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                          {creditCards.filter(c => c.active !== false).map(c => (
                            <SelectItem key={c.id} value={c.id} style={{ color: '#94a3b8', background: 'transparent', padding: '8px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <BrandLogo domain={getCardDomain(c.card_name)} size={18} fallbackInitials={c.card_name} />
                                <span>{c.card_name}{c.last_4_digits ? ` •${c.last_4_digits}` : ''}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : <span style={{ fontSize: 11, color: '#64748b' }}>Split</span>}
                  </div>
                </div>

                {!isSplit && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                      ...(cardRate > 0 ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }) }}>
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
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '5fr 3fr 2fr 32px', gap: 8, alignItems: 'end', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <div><LBL>Card</LBL>
                            <Select value={sp.card_id || ''} onValueChange={(v) => { const card = creditCards.find(c => c.id === v); setForm(prev => ({ ...prev, payment_splits: prev.payment_splits.map((s, i) => i === idx ? { ...s, card_id: v, card_name: card?.card_name || '' } : s) })); }}>
                              <SelectTrigger className="text-slate-200 h-8 text-xs" style={inp}>
                                {sp.card_id ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <BrandLogo domain={getCardDomain(spCard?.card_name)} size={14} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spCard?.card_name}</span>
                                  </div>
                                ) : <SelectValue placeholder="Card..." />}
                              </SelectTrigger>
                              <SelectContent style={{ background: '#1a2234', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                                {creditCards.filter(c => c.active !== false).map(c => (
                                  <SelectItem key={c.id} value={c.id} style={{ color: '#94a3b8', background: 'transparent', padding: '8px 12px' }}>
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
                            <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 11 }}>$</span>
                              <Input className="h-8 text-xs" style={{ ...inp, paddingLeft: 20 }} type="number" step="0.01" min="0" value={sp.amount} onChange={(e) => setForm(prev => ({ ...prev, payment_splits: prev.payment_splits.map((s, i) => i === idx ? { ...s, amount: e.target.value } : s) }))} placeholder="0.00" /></div>
                          </div>
                          <div><LBL>CB</LBL>
                            <div style={{ position: 'relative', height: 32, display: 'flex', alignItems: 'center', paddingLeft: 8, color: '#10b981', fontWeight: 600, fontSize: 12 }}>
                              {fmt$((parseFloat(sp.amount) || 0) * (spCard?.cashback_rate || 0) / 100)}
                            </div>
                          </div>
                          <button type="button" onClick={() => setForm(prev => ({ ...prev, payment_splits: prev.payment_splits.filter((_, i) => i !== idx) }))} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginTop: 16 }}>
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <button type="button" onClick={() => setForm(prev => ({ ...prev, payment_splits: [...(prev.payment_splits || []), { card_id: '', card_name: '', amount: '' }] }))}
                    style={{ fontSize: 12, fontWeight: 600, color: '#ec4899', padding: '6px 12px', borderRadius: 8, background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Plus style={{ width: 12, height: 12 }} /> Split payment
                  </button>
                </div>

                <GiftCardPicker giftCards={giftCards} selectedIds={form.gift_card_ids} onChange={(ids) => set('gift_card_ids', ids)} retailer={form.retailer} />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.include_tax_in_cashback} onChange={e => set('include_tax_in_cashback', e.target.checked)} />
                    Tax in cashback
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.include_shipping_in_cashback} onChange={e => set('include_shipping_in_cashback', e.target.checked)} />
                    Shipping in cashback
                  </label>
                  {isAmazon && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', padding: '4px 10px', borderRadius: 8, border: '1px solid',
                      ...(form.amazon_yacb ? { background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.4)', color: '#fbbf24' } : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }) }}>
                      <input type="checkbox" checked={form.amazon_yacb} onChange={e => set('amazon_yacb', e.target.checked)} />
                      ✨ Amazon YA 5%
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB: SALES ── */}
            {activeTab === 'sales' && (
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DollarSign style={{ width: 14, height: 14, color: '#10b981' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#10b981' }}>Sale Events</span>
                  </div>
                  <button type="button" onClick={addSaleEvent}
                    style={{ fontSize: 12, fontWeight: 600, color: '#10b981', padding: '6px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Plus style={{ width: 12, height: 12 }} /> Record Sale
                  </button>
                </div>

                {form.sale_events.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <DollarSign style={{ width: 32, height: 32, color: 'rgba(16,185,129,0.3)', margin: '0 auto 8px' }} />
                    <p style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>No sale events yet</p>
                    <button type="button" onClick={addSaleEvent}
                      style={{ fontSize: 13, fontWeight: 600, color: '#10b981', padding: '8px 20px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer' }}>
                      + Record First Sale
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {form.sale_events.map((ev, evIdx) => (
                      <div key={ev.id} style={{ borderRadius: 10, padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#10b981' }}>Sale {evIdx + 1}</span>
                          <button type="button" onClick={() => removeSaleEvent(ev.id)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                          <div><LBL>Buyer / Platform</LBL>
                            <Select value={ev.buyer || ''} onValueChange={(v) => updateSaleEvent(ev.id, 'buyer', v)}>
                              <SelectTrigger className="text-slate-200 h-8 text-xs" style={inp}><SelectValue placeholder="Select buyer..." /></SelectTrigger>
                              <SelectContent style={{ background: '#1a2234', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                                {sellers.map(s => <SelectItem key={s.id} value={s.name} style={{ color: '#94a3b8', background: 'transparent', padding: '8px 12px' }}>{s.name}</SelectItem>)}
                                {['eBay', 'Amazon', 'Facebook Marketplace', 'Mercari', 'OfferUp'].map(p => <SelectItem key={p} value={p} style={{ color: '#94a3b8', background: 'transparent', padding: '8px 12px' }}>{p}</SelectItem>)}
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
                                <div style={{ position: 'relative' }}><span style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 11 }}>$</span>
                                  <Input className="h-7 text-xs" style={{ ...inp, paddingLeft: 18 }} type="number" step="0.01" min="0" value={it.sale_price || ''} placeholder="Price" onChange={(e) => updateSaleEventItem(ev.id, itIdx, 'sale_price', e.target.value)} />
                                </div>
                                <button type="button" onClick={() => updateSaleEvent(ev.id, 'items', ev.items.filter((_, i) => i !== itIdx))} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                                  <X style={{ width: 12, height: 12 }} />
                                </button>
                              </div>
                            ))}
                            <button type="button" onClick={() => { updateSaleEvent(ev.id, 'items', [...ev.items, { product_name: '', quantity: 1, sale_price: 0 }]); }}
                              style={{ fontSize: 11, color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Plus style={{ width: 11, height: 11 }} /> Add item
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {totalSalePrice > 0 && (
                      <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#10b981', fontWeight: 500 }}>
                          {form.sale_events.reduce((s, ev) => s + (ev.items?.reduce((ss, it) => ss + (parseInt(it.quantity ?? 1) || 1), 0) || 0), 0)} items sold
                        </span>
                        <span style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>
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
          <div>
            <div className="lg:sticky lg:top-6 space-y-3">
              <div className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2">
                    {hasSales ? 'Estimated Profit' : 'Cashback Profit'}
                  </p>
                  <p className={`text-4xl leading-tight ${hasSales ? profitColor : 'text-cyan-400'}`} style={{ fontWeight: 800 }}>
                    {fmt$(netProfit)}
                  </p>
                  <p className="text-xs mt-1.5 flex items-center gap-1.5">
                    <span className={`font-semibold ${roi !== 0 ? (roi >= 0 ? 'text-cyan-400' : 'text-red-400') : 'text-slate-500'}`}>
                      {roi.toFixed(1)}% ROI
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-500">{validItemCount} item{validItemCount !== 1 ? 's' : ''}</span>
                  </p>
                  {!hasSales && (
                    <p style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>Record sales in Sales tab or after saving</p>
                  )}
                </div>

                <div className="px-5 py-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Items subtotal</span>
                    <span className="text-slate-100 font-medium">{fmt$(itemsSubtotal)}</span>
                  </div>
                  {(tax + shipping + fees) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tax + ship + fees</span>
                      <span className="text-slate-300">+{fmt$(tax + shipping + fees)}</span>
                    </div>
                  )}
                  {giftCardTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Gift cards</span>
                      <span className="text-amber-400">−{fmt$(giftCardTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <span className="text-slate-300 font-medium">Total cost</span>
                    <span className="text-slate-100 font-semibold">{fmt$(finalCost)}</span>
                  </div>
                  {totalCB > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cashback</span>
                      <span className="text-cyan-400 font-semibold">+{fmt$(totalCB)}</span>
                    </div>
                  )}
                  {totalSalePrice > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sale total</span>
                      <span className="text-slate-100 font-medium">{fmt$(totalSalePrice)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <span className="font-semibold text-slate-200">{hasSales ? 'Net profit' : 'Cashback'}</span>
                    <span className={`font-extrabold text-base ${hasSales ? profitColor : 'text-cyan-400'}`}>{fmt$(netProfit)}</span>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={createMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-extrabold tracking-wide transition disabled:opacity-50 uppercase"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', boxShadow: '0 4px 24px rgba(16,185,129,0.3)' }}>
                {createMutation.isPending ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="h-4 w-4" /> Add Order{validItemCount > 1 ? ` (${validItemCount} items)` : ''}</>
                )}
              </button>

              <button type="button" onClick={() => window.history.back()}
                className="w-full py-2.5 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}