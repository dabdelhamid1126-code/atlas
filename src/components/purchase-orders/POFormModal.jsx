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
import { CreditCard, Package, ShoppingCart, Truck, Tag, Globe, Plus, Trash2, Copy } from 'lucide-react';
import ProductAutocomplete from '@/components/purchase-orders/ProductAutocomplete';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUSES = ['pending', 'ordered', 'shipped', 'partially_received', 'received', 'cancelled'];
const PRODUCT_CATEGORIES = ['Electronics', 'Home & Garden', 'Toys & Games', 'Health & Beauty', 'Sports', 'Clothing', 'Tools', 'Gift Cards', 'Grocery', 'Other'];
const RETAILERS = ['Amazon', 'Bestbuy', 'Walmart', 'Target', 'Costco', "Sam's Club", 'eBay', 'Woot', 'Apple', 'Other'];

const SectionHeader = ({ icon: Icon, label, color }) => (
  <div className={`flex items-center gap-2 mb-3 pb-2 border-b border-slate-200`}>
    <Icon className={`h-4 w-4 ${color}`} />
    <span className={`text-xs font-bold tracking-widest uppercase ${color}`}>{label}</span>
  </div>
);

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
      gift_card_ids: o.gift_card_ids || [],
      is_pickup: o.is_pickup || false,
      pickup_location: o.pickup_location || '',
      is_dropship: o.is_dropship || false,
      dropship_to: o.dropship_to || '',
      order_date: o.order_date || '',
      expected_date: o.expected_date || '',
      notes: o.notes || '',
      items,
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
      gift_card_ids: [],
      is_pickup: false,
      pickup_location: '',
      is_dropship: false,
      dropship_to: '',
      order_date: format(new Date(), 'yyyy-MM-dd'),
      expected_date: '',
      notes: '',
      items: [defaultItem()],
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

    const dataToSubmit = {
      ...formData,
      items,
      tax,
      shipping_cost: shippingCost,
      fees,
      total_cost: totalPrice,
      gift_card_value: giftCardTotal,
      final_cost: totalPrice - giftCardTotal,
      credit_card_id: formData.credit_card_id || null,
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
      <DialogContent className="w-[95vw] max-w-[700px] max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="text-lg font-bold">{order ? 'Edit Purchase Order' : 'New Purchase Order'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-5">

          {/* ORDER TYPE */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => set('order_type', 'churning')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
                formData.order_type === 'churning'
                  ? 'bg-amber-50 border-amber-400 text-amber-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <Tag className="h-4 w-4" /> Churning
            </button>
            <button
              type="button"
              onClick={() => set('order_type', 'marketplace')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
                formData.order_type === 'marketplace'
                  ? 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <Globe className="h-4 w-4" /> Marketplace
            </button>
            {formData.order_type === 'marketplace' && (
              <span className="text-xs text-slate-400 ml-1">Wholesale buyer transaction</span>
            )}
          </div>

          {/* VENDOR & BUYER */}
          <div className="bg-orange-50 rounded-xl p-4">
            <SectionHeader icon={Truck} label="Vendor & Buyer" color="text-orange-500" />
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Vendor / Store *</Label>
                <Select value={formData.retailer} onValueChange={(v) => set('retailer', v)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {RETAILERS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {formData.order_type === 'churning' ? (
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Buyer *</Label>
                  <Select value={formData.buyer} onValueChange={(v) => set('buyer', v)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select buyer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Marketplace *</Label>
                  <Select value={formData.marketplace_platform} onValueChange={(v) => set('marketplace_platform', v)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select platform..." />
                    </SelectTrigger>
                    <SelectContent>
                      {['eBay', 'Amazon', 'Facebook Marketplace', 'Mercari', 'OfferUp', 'Craigslist', 'Other'].map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Status</Label>
                <Select value={formData.status} onValueChange={(v) => {
                  if (v === 'received') {
                    setFormData(prev => ({
                      ...prev, status: v,
                      items: prev.items.map(item => ({ ...item, quantity_received: item.quantity_ordered }))
                    }));
                  } else {
                    set('status', v);
                  }
                }}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Order Number</Label>
                <Input
                  className="bg-white"
                  value={formData.order_number}
                  onChange={(e) => set('order_number', e.target.value)}
                  placeholder="e.g. 112-3456789"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Account</Label>
                <Input
                  className="bg-white"
                  value={formData.account}
                  onChange={(e) => set('account', e.target.value)}
                  placeholder={isAmazon ? "Amazon account" : "Account"}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Tracking Number</Label>
                <Input
                  className="bg-white"
                  value={formData.tracking_number}
                  onChange={(e) => set('tracking_number', e.target.value)}
                  placeholder="e.g. 1Z999AA10123456784"
                />
              </div>
            </div>
            {/* Dropship */}
            <div className="mt-3 flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_dropship}
                  onChange={(e) => set('is_dropship', e.target.checked)} className="rounded" />
                <span className="text-sm">🚚 Dropship</span>
              </label>
              {formData.is_dropship && (
                <Select value={formData.dropship_to} onValueChange={(v) => set('dropship_to', v)}>
                  <SelectTrigger className="bg-white w-40">
                    <SelectValue placeholder="Select seller" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_pickup}
                  onChange={(e) => set('is_pickup', e.target.checked)} className="rounded" />
                <span className="text-sm">📍 Pickup</span>
              </label>
              {formData.is_pickup && (
                <Input className="bg-white w-40" value={formData.pickup_location}
                  onChange={(e) => set('pickup_location', e.target.value)} placeholder="Pickup location" />
              )}
            </div>
          </div>

          {/* ORDER ITEMS */}
          <div className="bg-purple-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-bold tracking-widest uppercase text-purple-600">Order Items</span>
                {formData.items.length > 1 && (
                  <span className="text-[10px] bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full font-bold">{formData.items.length} items</span>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Category</Label>
                <Select value={formData.product_category} onValueChange={(v) => set('product_category', v)}>
                  <SelectTrigger className="bg-white h-8 text-xs w-36">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, idx) => (
                <div key={idx} className="bg-white rounded-lg border border-purple-100 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-purple-500">Item {idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => duplicateItem(idx)} title="Duplicate"
                        className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {formData.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} title="Remove"
                          className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-slate-600">Product Name *</Label>
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
                      <Label className="text-xs text-slate-600">Unit Price *</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                        <Input className="bg-white pl-5 h-9 text-sm" type="number" step="0.01" min="0"
                          value={item.unit_cost || ''}
                          onChange={(e) => updateItem(idx, 'unit_cost', e.target.value)}
                          placeholder="0.00" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">Qty</Label>
                      <Input className="bg-white h-9 text-sm text-center" type="number" min="1"
                        value={item.quantity_ordered || 1}
                        onChange={(e) => updateItem(idx, 'quantity_ordered', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">SKU / UPC</Label>
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
                      <Label className="text-xs text-slate-600">Sale Price (per unit)</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                        <Input className="bg-white pl-5 h-9 text-sm" type="number" step="0.01" min="0"
                          value={item.sale_price || ''}
                          onChange={(e) => updateItem(idx, 'sale_price', e.target.value)}
                          placeholder="0.00" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">Total</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                        <Input className="bg-slate-100 pl-5 h-9 text-sm" readOnly
                          value={((parseFloat(item.unit_cost) || 0) * (parseInt(item.quantity_ordered) || 1)).toFixed(2)} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={addItem}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg border-2 border-dashed border-purple-200 text-purple-600 text-sm font-medium hover:border-purple-400 hover:bg-purple-50 transition">
              <Plus className="h-4 w-4" /> Add Another Item
            </button>
          </div>

          {/* PURCHASE DETAILS */}
          <div className="bg-blue-50 rounded-xl p-4">
            <SectionHeader icon={ShoppingCart} label="Purchase Details" color="text-blue-600" />
            <div className="grid grid-cols-4 gap-3 mb-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Subtotal (items)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input className="bg-slate-100 pl-7" readOnly value={itemsSubtotal.toFixed(2)} />
                </div>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-slate-600">Total Cost (incl. tax/shipping)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input className="bg-slate-100 pl-7 font-semibold" readOnly value={totalPrice.toFixed(2)} placeholder="Auto-calc" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Date</Label>
                <Input className="bg-white" type="date" value={formData.order_date}
                  onChange={(e) => set('order_date', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Tax</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input className="bg-white pl-7" type="number" step="0.01" min="0"
                    value={formData.tax} onChange={(e) => set('tax', e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Shipping</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input className="bg-white pl-7" type="number" step="0.01" min="0"
                    value={formData.shipping_cost} onChange={(e) => set('shipping_cost', e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Fees</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input className="bg-white pl-7" type="number" step="0.01" min="0"
                    value={formData.fees} onChange={(e) => set('fees', e.target.value)} placeholder="0.00" />
                </div>
              </div>
            </div>
          </div>

          {/* PAYMENT & CASHBACK */}
          <div className="bg-rose-50 rounded-xl p-4">
            <SectionHeader icon={CreditCard} label="Payment & Cashback" color="text-rose-500" />
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Payment Method</Label>
                <Select value={formData.credit_card_id || ''} onValueChange={(v) => set('credit_card_id', v)}>
                  <SelectTrigger className="bg-white">
                    {formData.credit_card_id
                      ? <span>{selectedCard?.card_name}</span>
                      : <SelectValue placeholder="Select card..." />}
                  </SelectTrigger>
                  <SelectContent>
                    {creditCards.filter(c => c.active).map(card => (
                      <SelectItem key={card.id} value={card.id}>{card.card_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Cashback Rate %</Label>
                <div className="relative">
                  <Input className="bg-white pr-8" type="number" step="0.1" min="0"
                    value={formData.cashback_rate_override || cardRate}
                    onChange={(e) => set('cashback_rate_override', e.target.value)}
                    placeholder={cardRate ? String(cardRate) : '0'}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Cashback Amount <span className="text-slate-400">(auto)</span></Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input className="bg-slate-100 pl-7" readOnly value={cashbackAmount.toFixed(2)} />
                </div>
              </div>
            </div>

            {/* Gift Cards */}
            <div className="space-y-1 mb-3">
              <Label className="text-xs text-slate-600">Gift Card Used</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <Input className="bg-slate-100 pl-7" readOnly value={giftCardTotal.toFixed(2)} />
              </div>
              {giftCards.filter(gc => gc.status === 'available' || formData.gift_card_ids.includes(gc.id)).length === 0 ? (
                <p className="text-xs text-slate-400">No gift card payment method found for {formData.retailer || 'this vendor'}</p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-1">
                  {giftCards.filter(gc => gc.status === 'available' || formData.gift_card_ids.includes(gc.id)).map(gc => (
                    <label key={gc.id} className="flex items-center gap-1 cursor-pointer text-xs bg-white border rounded px-2 py-1">
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

            {/* Checkboxes + Amazon YACB */}
            <div className="flex items-center flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={formData.include_tax_in_cashback}
                  onChange={(e) => set('include_tax_in_cashback', e.target.checked)} className="rounded" />
                Include tax in cashback
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={formData.include_shipping_in_cashback}
                  onChange={(e) => set('include_shipping_in_cashback', e.target.checked)} className="rounded" />
                Include shipping in cashback
              </label>
              {isAmazon && (
                <label className={`flex items-center gap-2 cursor-pointer text-sm px-3 py-1.5 rounded-lg border transition ${
                  formData.amazon_yacb ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-slate-200 text-slate-600'
                }`}>
                  <input type="checkbox" checked={formData.amazon_yacb}
                    onChange={(e) => set('amazon_yacb', e.target.checked)} className="rounded" />
                  ✨ Amazon Young Adult 5%
                </label>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => set('notes', e.target.value)}
              placeholder="Any additional notes..." rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="bg-black hover:bg-gray-800 text-white" disabled={isPending}>
              {isPending ? 'Saving...' : (order ? 'Update Order' : 'Create Order')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}