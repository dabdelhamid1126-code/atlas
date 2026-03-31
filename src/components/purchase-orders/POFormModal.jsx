import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCard, Package, ShoppingCart, Truck, Tag, Globe, Plus, Trash2, Copy, AlertTriangle, DollarSign } from 'lucide-react';
import ProductAutocomplete from '@/components/purchase-orders/ProductAutocomplete';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUSES = ['pending', 'ordered', 'shipped', 'partially_received', 'received', 'cancelled'];
const PRODUCT_CATEGORIES = ['Electronics', 'Home & Garden', 'Toys & Games', 'Health & Beauty', 'Sports', 'Clothing', 'Tools', 'Gift Cards', 'Grocery', 'Other'];
const RETAILERS = ['Amazon', 'Bestbuy', 'Walmart', 'Target', 'Costco', "Sam's Club", 'eBay', 'Woot', 'Apple', 'Other'];

// Dark style helpers
const inp = { background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' };
const inpRo = { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)' };

const SectionHeader = ({ icon: Icon, label, color }) => (
  <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
    <Icon className={`h-4 w-4 ${color}`} />
    <span className={`text-xs font-bold tracking-widest uppercase ${color}`}>{label}</span>
  </div>
);

const defaultSaleEvent = () => ({
  id: crypto.randomUUID(),
  buyer: '',
  platform: '',
  sale_date: '',
  payout_date: '',
  items: [],
});

export default function POFormModal({
  open,
  onOpenChange,
  order,
  onSubmit,
  products,
  creditCards,
  giftCards,
  sellers,
  isPending
}) {
  const defaultItem = () => ({ product_id: '', product_name: '', upc: '', quantity_ordered: 1, quantity_received: 0, unit_cost: 0, sale_price: 0 });

  const getInitialForm = (o) => {
    const items = o?.items?.length > 0 ? o.items.map(i => ({ ...defaultItem(), ...i, sale_price: i.sale_price || 0 })) : [defaultItem()];
    return o ? {
      order_type: o.order_type || 'churning',
      order_number: o.order_number || '',
      tracking_number: o.tracking_number || '',
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
      expected_date: o.expected_date || '',
      notes: o.notes || '',
      items,
      sale_events: o.sale_events || [],
      tax: o.tax || 0,
      shipping_cost: o.shipping_cost || 0,
      fees: o.fees || 0,
      include_tax_in_cashback: o.include_tax_in_cashback !== false,
      include_shipping_in_cashback: o.include_shipping_in_cashback !== false,
      extra_cashback_percent: o.extra_cashback_percent || 0,
      bonus_amount: o.bonus_amount || 0,
      bonus_notes: o.bonus_notes || '',
      rewards_on_original_price: o.rewards_on_original_price || false,
      amazon_yacb: o.bonus_notes?.toLowerCase().includes('prime young adult') || false,
      cashback_rate_override: '',
    } : {
      order_type: 'churning',
      order_number: '',
      tracking_number: '',
      retailer: '',
      buyer: '',
      marketplace_platform: '',
      account: '',
      status: 'pending',
      category: 'other',
      product_category: '',
      credit_card_id: '',
      payment_splits: [],
      gift_card_ids: [],
      is_pickup: false,
      pickup_location: '',
      is_dropship: false,
      dropship_to: '',
      order_date: format(new Date(), 'yyyy-MM-dd'),
      expected_date: '',
      notes: '',
      items: [defaultItem()],
      sale_events: [],
      tax: 0,
      shipping_cost: 0,
      fees: 0,
      include_tax_in_cashback: true,
      include_shipping_in_cashback: true,
      extra_cashback_percent: 0,
      bonus_amount: 0,
      bonus_notes: '',
      rewards_on_original_price: false,
      amazon_yacb: false,
      cashback_rate_override: '',
    };
  };

  const [formData, setFormData] = useState(() => getInitialForm(order));

  useEffect(() => {
    setFormData(getInitialForm(order));
  }, [order, open]);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const selectedCard = creditCards.find(c => c.id === formData.credit_card_id);

  // Split payment helpers
  const addSplit = () => setFormData(prev => ({
    ...prev,
    payment_splits: [...(prev.payment_splits || []), { card_id: '', card_name: '', cashback_rate: 0, amount: '' }]
  }));
  const removeSplit = (idx) => setFormData(prev => ({
    ...prev,
    payment_splits: prev.payment_splits.filter((_, i) => i !== idx)
  }));
  const updateSplit = (idx, field, value) => setFormData(prev => {
    const splits = prev.payment_splits.map((sp, i) => {
      if (i !== idx) return sp;
      if (field === 'card_id') {
        const card = creditCards.find(c => c.id === value);
        return { ...sp, card_id: value, card_name: card?.card_name || '', cashback_rate: card?.cashback_rate || 0 };
      }
      return { ...sp, [field]: value };
    });
    return { ...prev, payment_splits: splits };
  });

  // Item helpers
  const updateItem = (idx, field, value) => {
    setFormData(prev => {
      const items = prev.items.map((it, i) => i === idx ? { ...it, [field]: value } : it);
      return { ...prev, items };
    });
  };
  const addItem = () => setFormData(prev => ({ ...prev, items: [...prev.items, defaultItem()] }));
  const removeItem = (idx) => setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  const duplicateItem = (idx) => setFormData(prev => ({ ...prev, items: [...prev.items.slice(0, idx + 1), { ...prev.items[idx] }, ...prev.items.slice(idx + 1)] }));

  // Sale events helpers
  const addSaleEvent = () => {
    const newEvent = defaultSaleEvent();
    // Pre-populate items from order items
    newEvent.items = formData.items
      .filter(it => it.product_name?.trim())
      .map(it => ({ product_name: it.product_name, qty: 1, sale_price: it.sale_price || 0 }));
    setFormData(prev => ({ ...prev, sale_events: [...prev.sale_events, newEvent] }));
  };
  const removeSaleEvent = (id) => setFormData(prev => ({ ...prev, sale_events: prev.sale_events.filter(e => e.id !== id) }));
  const updateSaleEvent = (id, field, value) => setFormData(prev => ({
    ...prev,
    sale_events: prev.sale_events.map(e => e.id !== id ? e : { ...e, [field]: value })
  }));
  const updateSaleEventItem = (eventId, itemIdx, field, value) => setFormData(prev => ({
    ...prev,
    sale_events: prev.sale_events.map(e => {
      if (e.id !== eventId) return e;
      const items = e.items.map((it, i) => i === itemIdx ? { ...it, [field]: value } : it);
      return { ...e, items };
    })
  }));

  // Auto-calc total price
  const tax = parseFloat(formData.tax) || 0;
  const shippingCost = parseFloat(formData.shipping_cost) || 0;
  const fees = parseFloat(formData.fees) || 0;
  const itemsSubtotal = formData.items.reduce((s, it) => s + (parseFloat(it.unit_cost) || 0) * (parseInt(it.quantity_ordered) || 1), 0);
  const totalPrice = itemsSubtotal + tax + shippingCost + fees;

  const giftCardTotal = formData.gift_card_ids.reduce((sum, id) => {
    const gc = giftCards.find(g => g.id === id);
    return sum + (gc?.value || 0);
  }, 0);

  const getCashbackBase = () => {
    let base = totalPrice;
    if (!formData.include_tax_in_cashback) base -= tax;
    if (!formData.include_shipping_in_cashback) base -= shippingCost;
    return base;
  };

  const getCardRate = () => {
    if (!selectedCard) return 0;
    if (selectedCard.reward_type === 'cashback') return selectedCard.cashback_rate || 0;
    if (selectedCard.reward_type === 'both') return selectedCard.cashback_rate || 0;
    return 0;
  };

  const cashbackBase = getCashbackBase();
  const cardRate = parseFloat(formData.cashback_rate_override) || getCardRate();
  const cashbackAmount = (cashbackBase * cardRate / 100) + (formData.amazon_yacb ? cashbackBase * 0.05 : 0);

  // Sale events totals
  const totalItemsOrdered = formData.items.reduce((s, it) => s + (parseInt(it.quantity_ordered) || 1), 0);
  const totalItemsSold = formData.sale_events.reduce((s, ev) => s + ev.items.reduce((ss, it) => ss + (parseInt(it.qty) || 0), 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.order_number?.trim()) { toast.error('Order number is required'); return; }
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
    if (hasSplits && Math.abs(splitsTotal - totalPrice) > 0.01) {
      toast.error(`Split amounts ($${splitsTotal.toFixed(2)}) must equal order total ($${totalPrice.toFixed(2)})`);
      return;
    }

    const dataToSubmit = {
      ...formData,
      items,
      sale_events: formData.sale_events.map(ev => ({
        ...ev,
        items: ev.items.map(it => ({ ...it, qty: parseInt(it.qty) || 0, sale_price: parseFloat(it.sale_price) || 0 }))
      })),
      tax,
      shipping_cost: shippingCost,
      fees,
      total_cost: totalPrice,
      gift_card_value: giftCardTotal,
      final_cost: totalPrice - giftCardTotal,
      credit_card_id: hasSplits ? (formData.payment_splits[0]?.card_id || null) : (formData.credit_card_id || null),
      payment_splits: hasSplits
        ? formData.payment_splits.map(sp => ({
            card_id: sp.card_id,
            card_name: sp.card_name,
            cashback_rate: sp.cashback_rate || 0,
            amount: parseFloat(sp.amount) || 0,
          }))
        : [],
      extra_cashback_percent: formData.amazon_yacb ? 5 : (parseFloat(formData.extra_cashback_percent) || 0),
      bonus_notes: formData.amazon_yacb ? 'Prime Young Adult' : formData.bonus_notes,
    };
    delete dataToSubmit.amazon_yacb;
    delete dataToSubmit.cashback_rate_override;

    onSubmit(dataToSubmit);
  };

  const isAmazon = formData.retailer === 'Amazon';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] max-w-[760px] max-h-[92vh] overflow-y-auto p-0"
        style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}
      >
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="text-lg font-bold text-white">
            {order ? 'Edit Purchase Order' : 'New Purchase Order'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-5">

          {/* ORDER TYPE TOGGLE */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button type="button" onClick={() => set('order_type', 'churning')}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all border"
                style={formData.order_type === 'churning'
                  ? { background: 'rgba(245,158,11,0.15)', color: '#fbbf24', borderColor: 'rgba(245,158,11,0.4)' }
                  : { background: 'transparent', color: '#94a3b8', borderColor: 'transparent' }}>
                <Tag className="h-3.5 w-3.5" /> Churning
              </button>
              <button type="button" onClick={() => set('order_type', 'marketplace')}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all border"
                style={formData.order_type === 'marketplace'
                  ? { background: 'rgba(59,130,246,0.15)', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.4)' }
                  : { background: 'transparent', color: '#94a3b8', borderColor: 'transparent' }}>
                <Globe className="h-3.5 w-3.5" /> Marketplace
              </button>
            </div>
          </div>

          {/* VENDOR & BUYER */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <SectionHeader icon={Truck} label="Vendor & Buyer" color="text-amber-400" />
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Vendor / Store *</Label>
                <Select value={formData.retailer} onValueChange={(v) => set('retailer', v)}>
                  <SelectTrigger className="text-slate-200" style={inp}><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                  <SelectContent>{RETAILERS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {formData.order_type === 'churning' ? (
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Buyer</Label>
                  <Select value={formData.buyer} onValueChange={(v) => set('buyer', v)}>
                    <SelectTrigger className="text-slate-200" style={inp}><SelectValue placeholder="Select buyer..." /></SelectTrigger>
                    <SelectContent>{sellers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Marketplace</Label>
                  <Select value={formData.marketplace_platform} onValueChange={(v) => set('marketplace_platform', v)}>
                    <SelectTrigger className="text-slate-200" style={inp}><SelectValue placeholder="Select platform..." /></SelectTrigger>
                    <SelectContent>
                      {['eBay', 'Amazon', 'Facebook Marketplace', 'Mercari', 'OfferUp', 'Craigslist', 'Other'].map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Status</Label>
                <Select value={formData.status} onValueChange={(v) => {
                  if (v === 'received') {
                    setFormData(prev => ({ ...prev, status: v, items: prev.items.map(item => ({ ...item, quantity_received: item.quantity_ordered })) }));
                  } else { set('status', v); }
                }}>
                  <SelectTrigger className="text-slate-200" style={inp}><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Order Number</Label>
                <Input style={inp} value={formData.order_number} onChange={(e) => set('order_number', e.target.value)} placeholder="e.g. 112-3456789" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Account</Label>
                <Input style={inp} value={formData.account} onChange={(e) => set('account', e.target.value)} placeholder="Account used" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Tracking Number</Label>
                <Input style={inp} value={formData.tracking_number} onChange={(e) => set('tracking_number', e.target.value)} placeholder="1Z999AA10123456784" />
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap mt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                <input type="checkbox" checked={formData.is_dropship} onChange={(e) => set('is_dropship', e.target.checked)} className="rounded" />
                🚚 Dropship
              </label>
              {formData.is_dropship && (
                <Select value={formData.dropship_to} onValueChange={(v) => set('dropship_to', v)}>
                  <SelectTrigger className="text-slate-200 w-40" style={inp}><SelectValue placeholder="Select seller" /></SelectTrigger>
                  <SelectContent>{sellers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                <input type="checkbox" checked={formData.is_pickup} onChange={(e) => set('is_pickup', e.target.checked)} className="rounded" />
                📍 Pickup
              </label>
              {formData.is_pickup && (
                <Input className="w-40" style={inp} value={formData.pickup_location} onChange={(e) => set('pickup_location', e.target.value)} placeholder="Pickup location" />
              )}
            </div>
          </div>

          {/* ORDER ITEMS */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
            <div className="flex items-center justify-between mb-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-bold tracking-widest uppercase text-purple-400">Order Items</span>
                {formData.items.length > 1 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-purple-300" style={{ background: 'rgba(124,58,237,0.2)' }}>{formData.items.length} items</span>
                )}
              </div>
              <div className="space-y-1">
                <Select value={formData.product_category} onValueChange={(v) => set('product_category', v)}>
                  <SelectTrigger className="text-slate-200 h-8 text-xs w-36" style={inp}><SelectValue placeholder="Category..." /></SelectTrigger>
                  <SelectContent>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, idx) => (
                <div key={idx} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Item {idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => duplicateItem(idx)} title="Duplicate"
                        className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-white/10 transition">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {formData.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} title="Remove"
                          className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-slate-400">Product Name *</Label>
                      <ProductAutocomplete
                        products={products}
                        nameValue={item.product_name || ''}
                        upcValue={item.upc || ''}
                        searchField="name"
                        onSelect={(p) => {
                          updateItem(idx, 'product_id', p.id);
                          updateItem(idx, 'product_name', p.name);
                          updateItem(idx, 'upc', p.upc || '');
                          if (idx === 0) set('product_category', p.category || formData.product_category);
                        }}
                        onChangeName={(val) => updateItem(idx, 'product_name', val)}
                        placeholder="e.g. iPad Air"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Unit Price *</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                        <Input className="pl-5 h-9 text-sm" type="number" step="0.01" min="0" style={inp}
                          value={item.unit_cost || ''} onChange={(e) => updateItem(idx, 'unit_cost', e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Qty</Label>
                      <Input className="h-9 text-sm text-center" type="number" min="1" style={inp}
                        value={item.quantity_ordered || 1} onChange={(e) => updateItem(idx, 'quantity_ordered', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">SKU / UPC</Label>
                      <ProductAutocomplete
                        products={products}
                        nameValue={item.product_name || ''}
                        upcValue={item.upc || ''}
                        searchField="upc"
                        onSelect={(p) => {
                          updateItem(idx, 'product_id', p.id);
                          updateItem(idx, 'product_name', p.name);
                          updateItem(idx, 'upc', p.upc || '');
                        }}
                        onChangeUpc={(val) => updateItem(idx, 'upc', val)}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Sale Price (per unit)</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                        <Input className="pl-5 h-9 text-sm" type="number" step="0.01" min="0" style={inp}
                          value={item.sale_price || ''} onChange={(e) => updateItem(idx, 'sale_price', e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Total</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                        <Input className="pl-5 h-9 text-sm" style={inpRo} readOnly
                          value={((parseFloat(item.unit_cost) || 0) * (parseInt(item.quantity_ordered) || 1)).toFixed(2)} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={addItem}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-purple-400 text-sm font-medium hover:text-purple-300 transition"
              style={{ border: '2px dashed rgba(124,58,237,0.3)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.6)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'}>
              <Plus className="h-4 w-4" /> Add Another Item
            </button>

            {/* ── SALE EVENTS ── */}
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold tracking-widest uppercase text-emerald-400">Sale Events</span>
                  {totalItemsSold > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                      {totalItemsSold} / {totalItemsOrdered} sold
                    </span>
                  )}
                </div>
                <button type="button" onClick={addSaleEvent}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <Plus className="h-3.5 w-3.5" /> Add Sale
                </button>
              </div>

              {formData.sale_events.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-2">No sale events yet. Add one to track partial or multi-buyer sales.</p>
              )}

              <div className="space-y-3">
                {formData.sale_events.map((ev, evIdx) => (
                  <div key={ev.id} className="rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Sale {evIdx + 1}</span>
                      <button type="button" onClick={() => removeSaleEvent(ev.id)}
                        className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Buyer + dates */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      <div className="space-y-1 col-span-2 sm:col-span-1">
                        <Label className="text-xs text-slate-400">Buyer / Platform</Label>
                        <Select value={ev.buyer || ''} onValueChange={(v) => updateSaleEvent(ev.id, 'buyer', v)}>
                          <SelectTrigger className="text-slate-200 h-8 text-xs" style={inp}><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            {sellers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                            {['eBay', 'Amazon', 'Facebook Marketplace', 'Mercari', 'OfferUp'].map(p => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Sale Date</Label>
                        <Input type="date" className="h-8 text-xs" style={inp} value={ev.sale_date || ''} onChange={e => updateSaleEvent(ev.id, 'sale_date', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Payout Date</Label>
                        <Input type="date" className="h-8 text-xs" style={inp} value={ev.payout_date || ''} onChange={e => updateSaleEvent(ev.id, 'payout_date', e.target.value)} />
                      </div>
                    </div>

                    {/* Items sold in this event */}
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400">Items Sold</Label>
                      {ev.items.map((it, itIdx) => (
                        <div key={itIdx} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-5 space-y-1">
                            <Input className="h-7 text-xs" style={inp} value={it.product_name || ''} placeholder="Product name"
                              onChange={e => updateSaleEventItem(ev.id, itIdx, 'product_name', e.target.value)} />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Input className="h-7 text-xs text-center" type="number" min="0" style={inp} value={it.qty || ''} placeholder="Qty"
                              onChange={e => updateSaleEventItem(ev.id, itIdx, 'qty', e.target.value)} />
                          </div>
                          <div className="col-span-4 space-y-1">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                              <Input className="h-7 text-xs pl-5" type="number" step="0.01" min="0" style={inp}
                                value={it.sale_price || ''} placeholder="Price/unit"
                                onChange={e => updateSaleEventItem(ev.id, itIdx, 'sale_price', e.target.value)} />
                            </div>
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button type="button" onClick={() => {
                              const items = ev.items.filter((_, i) => i !== itIdx);
                              updateSaleEvent(ev.id, 'items', items);
                            }} className="text-slate-500 hover:text-red-400 transition">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={() => updateSaleEvent(ev.id, 'items', [...ev.items, { product_name: '', qty: 1, sale_price: 0 }])}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition flex items-center gap-1">
                        <Plus className="h-3 w-3" /> Add item
                      </button>
                    </div>

                    {/* Sale total */}
                    {ev.items.length > 0 && (
                      <div className="mt-2 text-right text-xs text-emerald-400 font-semibold">
                        Total: ${ev.items.reduce((s, it) => s + (parseFloat(it.sale_price) || 0) * (parseInt(it.qty) || 0), 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PURCHASE DETAILS */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <SectionHeader icon={ShoppingCart} label="Purchase Details" color="text-blue-400" />
            <div className="grid grid-cols-4 gap-3 mb-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Subtotal (items)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                  <Input className="pl-7" style={inpRo} readOnly value={itemsSubtotal.toFixed(2)} />
                </div>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-slate-400">Total Cost (incl. tax/shipping)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                  <Input className="pl-7 font-semibold" style={inpRo} readOnly value={totalPrice.toFixed(2)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Date</Label>
                <Input type="date" style={inp} value={formData.order_date} onChange={(e) => set('order_date', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Tax</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                  <Input className="pl-7" type="number" step="0.01" min="0" style={inp}
                    value={formData.tax} onChange={(e) => set('tax', e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Shipping</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                  <Input className="pl-7" type="number" step="0.01" min="0" style={inp}
                    value={formData.shipping_cost} onChange={(e) => set('shipping_cost', e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Fees</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                  <Input className="pl-7" type="number" step="0.01" min="0" style={inp}
                    value={formData.fees} onChange={(e) => set('fees', e.target.value)} placeholder="0.00" />
                </div>
              </div>
            </div>
          </div>

          {/* PAYMENT & CASHBACK */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.15)' }}>
            <SectionHeader icon={CreditCard} label="Payment Methods" color="text-pink-400" />

            {(formData.payment_splits || []).length === 0 ? (
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Payment Method</Label>
                  <Select value={formData.credit_card_id || ''} onValueChange={(v) => {
                    const card = creditCards.find(c => c.id === v);
                    set('credit_card_id', v);
                    set('card_name', card?.card_name || '');
                  }}>
                    <SelectTrigger className="text-slate-200" style={inp}>
                      {formData.credit_card_id ? <span>{selectedCard?.card_name}</span> : <SelectValue placeholder="Select card..." />}
                    </SelectTrigger>
                    <SelectContent>{creditCards.filter(c => c.active !== false).map(card => (
                      <SelectItem key={card.id} value={card.id}>{card.card_name}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Cashback Rate %</Label>
                  <div className="relative">
                    <Input className="pr-8" type="number" step="0.1" min="0" style={inp}
                      value={formData.cashback_rate_override || cardRate}
                      onChange={(e) => set('cashback_rate_override', e.target.value)}
                      placeholder={cardRate ? String(cardRate) : '0'} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Cashback (auto)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                    <Input className="pl-7" style={inpRo} readOnly value={cashbackAmount.toFixed(2)} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-3 space-y-2">
                {formData.payment_splits.map((sp, idx) => {
                  const spCard = creditCards.find(c => c.id === sp.card_id);
                  const spCashback = ((parseFloat(sp.amount) || 0) * (spCard?.cashback_rate || 0) / 100);
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="col-span-5 space-y-1">
                        <Label className="text-[10px] text-slate-500">Card</Label>
                        <Select value={sp.card_id || ''} onValueChange={(v) => updateSplit(idx, 'card_id', v)}>
                          <SelectTrigger className="text-slate-200 h-8 text-xs" style={inp}><SelectValue placeholder="Select card..." /></SelectTrigger>
                          <SelectContent>{creditCards.filter(c => c.active !== false).map(card => (
                            <SelectItem key={card.id} value={card.id}>{card.card_name}</SelectItem>
                          ))}</SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 space-y-1">
                        <Label className="text-[10px] text-slate-500">Amount</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                          <Input className="h-8 text-xs pl-5" type="number" step="0.01" min="0" style={inp}
                            value={sp.amount} onChange={(e) => updateSplit(idx, 'amount', e.target.value)} placeholder="0.00" />
                        </div>
                      </div>
                      <div className="col-span-3 space-y-1">
                        <Label className="text-[10px] text-slate-500">Cashback</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                          <Input className="h-8 text-xs pl-5" style={inpRo} readOnly value={spCashback.toFixed(2)} />
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-center pb-0.5">
                        <button type="button" onClick={() => removeSplit(idx)}
                          className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {(() => {
                  const splitsTotal = formData.payment_splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);
                  const isBalanced = Math.abs(splitsTotal - totalPrice) < 0.01;
                  return (
                    <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold`}
                      style={isBalanced
                        ? { background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }
                        : { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                      <div className="flex items-center gap-1.5">
                        {!isBalanced && <AlertTriangle className="h-3.5 w-3.5" />}
                        <span>Split: ${splitsTotal.toFixed(2)} / Total: ${totalPrice.toFixed(2)}</span>
                      </div>
                      {isBalanced && <span>✓ Balanced</span>}
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex items-center gap-2 mb-3">
              <button type="button" onClick={addSplit}
                className="flex items-center gap-1.5 text-xs font-semibold text-pink-400 hover:text-pink-300 transition px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)' }}>
                <Plus className="h-3.5 w-3.5" /> Add Payment Method
              </button>
              {(formData.payment_splits || []).length > 0 && (
                <button type="button" onClick={() => set('payment_splits', [])}
                  className="text-xs text-slate-500 hover:text-slate-300 underline transition">
                  Switch to single card
                </button>
              )}
            </div>

            {/* Gift Cards */}
            <div className="space-y-1 mb-3">
              <Label className="text-xs text-slate-400">Gift Card Used</Label>
              {giftCards.filter(gc => gc.status === 'available' || formData.gift_card_ids.includes(gc.id)).length === 0 ? (
                <p className="text-xs text-slate-500">No available gift cards</p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-1">
                  {giftCards.filter(gc => gc.status === 'available' || formData.gift_card_ids.includes(gc.id)).map(gc => (
                    <label key={gc.id} className="flex items-center gap-1 cursor-pointer text-xs px-2 py-1 rounded"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                      <input type="checkbox" checked={formData.gift_card_ids.includes(gc.id)}
                        onChange={(e) => {
                          if (e.target.checked) set('gift_card_ids', [...formData.gift_card_ids, gc.id]);
                          else set('gift_card_ids', formData.gift_card_ids.filter(id => id !== gc.id));
                        }} className="rounded" />
                      {gc.brand} ${gc.value} ...{gc.code?.slice(-3)}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                <input type="checkbox" checked={formData.include_tax_in_cashback}
                  onChange={(e) => set('include_tax_in_cashback', e.target.checked)} className="rounded" />
                Include tax in cashback
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                <input type="checkbox" checked={formData.include_shipping_in_cashback}
                  onChange={(e) => set('include_shipping_in_cashback', e.target.checked)} className="rounded" />
                Include shipping in cashback
              </label>
              {isAmazon && (
                <label className="flex items-center gap-2 cursor-pointer text-sm px-3 py-1.5 rounded-lg border transition"
                  style={formData.amazon_yacb
                    ? { background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.4)', color: '#fbbf24' }
                    : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                  <input type="checkbox" checked={formData.amazon_yacb}
                    onChange={(e) => set('amazon_yacb', e.target.checked)} className="rounded" />
                  ✨ Amazon Young Adult 5%
                </label>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => set('notes', e.target.value)}
              placeholder="Any additional notes..." rows={2}
              style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.15)', color: '#94a3b8' }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}
              style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', color: 'white', border: 'none' }}>
              {isPending ? 'Saving...' : (order ? 'Update Order' : 'Create Order')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}