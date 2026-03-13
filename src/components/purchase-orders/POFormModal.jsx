import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X, Tag, ShoppingCart, Truck, CreditCard, DollarSign, Globe } from 'lucide-react';
import ProductSearchDropdown from '@/components/ProductSearchDropdown';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUSES = ['pending', 'ordered', 'shipped', 'partially_received', 'received', 'cancelled'];
const RETAILERS = ['Amazon', 'Bestbuy', 'Walmart', 'Target', 'Costco', "Sam's Club", 'eBay', 'Woot', 'Apple', 'Other'];
const MARKETPLACE_PLATFORMS = ['Amazon', 'eBay', 'Mercari', 'Facebook Marketplace', 'OfferUp', 'Craigslist', 'Other'];
const PRODUCT_CATEGORIES = ['Electronics', 'Home & Garden', 'Toys & Games', 'Health & Beauty', 'Sports', 'Clothing', 'Tools', 'Gift Cards', 'Grocery', 'Other'];
const REWARD_CATEGORIES = ['dining', 'travel', 'groceries', 'gas', 'streaming', 'other'];

const getInitialForm = (o) => o ? {
  transaction_mode: o.transaction_mode || 'churning',
  multi_item: o.items?.length > 1,
  product_name: o.items?.[0]?.product_name || '',
  product_category: o.product_category || '',
  upc: o.items?.[0]?.upc || '',
  unit_cost: o.items?.[0]?.unit_cost || 0,
  quantity: o.items?.[0]?.quantity_ordered || 1,
  tax: o.tax || 0,
  shipping: o.shipping || 0,
  fees: o.fees || 0,
  order_date: o.order_date || format(new Date(), 'yyyy-MM-dd'),
  retailer: o.retailer || '',
  account: o.account || '',
  buyer: o.buyer || '',
  marketplace_platform: o.marketplace_platform || '',
  status: o.status || 'pending',
  order_number: o.order_number || '',
  tracking_numbers: o.tracking_number ? [o.tracking_number] : [''],
  credit_card_id: o.credit_card_id || '',
  category: o.category || 'other',
  gift_card_ids: o.gift_card_ids || [],
  include_tax_in_cashback: o.include_tax_in_cashback !== false,
  include_shipping_in_cashback: o.include_shipping_in_cashback !== false,
  amazon_young_adult: !!(o.bonus_notes?.toLowerCase().includes('prime young adult')),
  notes: o.notes || '',
  items: o.items || [],
} : {
  transaction_mode: 'churning',
  multi_item: false,
  product_name: '',
  product_category: '',
  upc: '',
  unit_cost: 0,
  quantity: 1,
  tax: 0,
  shipping: 0,
  fees: 0,
  order_date: format(new Date(), 'yyyy-MM-dd'),
  retailer: '',
  account: '',
  buyer: '',
  marketplace_platform: '',
  status: 'pending',
  order_number: '',
  tracking_numbers: [''],
  credit_card_id: '',
  category: 'other',
  gift_card_ids: [],
  include_tax_in_cashback: true,
  include_shipping_in_cashback: true,
  amazon_young_adult: false,
  notes: '',
  items: [],
};

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
  const [formData, setFormData] = useState(() => getInitialForm(order));
  const [productSearches, setProductSearches] = useState({});
  const [singleProductSearch, setSingleProductSearch] = useState('');
  const [singleProductId, setSingleProductId] = useState('');

  useEffect(() => {
    setFormData(getInitialForm(order));
    setProductSearches({});
  }, [order, open]);

  const set = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const selectedCard = useMemo(() => creditCards.find(c => c.id === formData.credit_card_id), [creditCards, formData.credit_card_id]);

  const cashbackRate = useMemo(() => {
    if (!selectedCard) return 0;
    const cat = formData.category;
    if (selectedCard.reward_type === 'cashback' || selectedCard.reward_type === 'both') {
      if (cat === 'dining' && selectedCard.dining_cashback_rate) return selectedCard.dining_cashback_rate;
      if (cat === 'travel' && selectedCard.travel_cashback_rate) return selectedCard.travel_cashback_rate;
      if (cat === 'groceries' && selectedCard.groceries_cashback_rate) return selectedCard.groceries_cashback_rate;
      if (cat === 'gas' && selectedCard.gas_cashback_rate) return selectedCard.gas_cashback_rate;
      if (cat === 'streaming' && selectedCard.streaming_cashback_rate) return selectedCard.streaming_cashback_rate;
      return selectedCard.cashback_rate || 0;
    }
    return 0;
  }, [selectedCard, formData.category]);

  const subtotal = parseFloat(formData.unit_cost || 0) * parseInt(formData.quantity || 1);
  const tax = parseFloat(formData.tax || 0);
  const shipping = parseFloat(formData.shipping || 0);
  const fees = parseFloat(formData.fees || 0);
  const totalCost = subtotal + tax + shipping + fees;

  const cashbackBase = subtotal
    + (formData.include_tax_in_cashback ? tax : 0)
    + (formData.include_shipping_in_cashback ? shipping : 0);
  const cashbackAmount = cashbackBase * cashbackRate / 100 + (formData.amazon_young_adult ? cashbackBase * 0.05 : 0);

  const giftCardTotal = formData.gift_card_ids.reduce((sum, id) => {
    const gc = giftCards.find(g => g.id === id);
    return sum + (gc?.value || 0);
  }, 0);

  const isAmazon = formData.retailer === 'Amazon';

  const addTrackingNumber = () => set('tracking_numbers', [...formData.tracking_numbers, '']);
  const updateTracking = (i, v) => {
    const arr = [...formData.tracking_numbers];
    arr[i] = v;
    set('tracking_numbers', arr);
  };
  const removeTracking = (i) => set('tracking_numbers', formData.tracking_numbers.filter((_, idx) => idx !== i));

  // Multi-item handlers
  const addItem = () => set('items', [...formData.items, { product_id: '', product_name: '', upc: '', quantity_ordered: 1, quantity_received: 0, unit_cost: 0 }]);
  const removeItem = (index) => set('items', formData.items.filter((_, i) => i !== index));
  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    if (field === 'quantity_ordered' || field === 'quantity_received') newItems[index][field] = value === '' ? '' : parseInt(value) || 0;
    else if (field === 'unit_cost') newItems[index][field] = value === '' ? '' : parseFloat(value) || 0;
    else newItems[index][field] = value;
    set('items', newItems);
  };
  const handleProductSelect = (index, product) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], product_id: product.id, product_name: product.name, upc: product.upc || '', unit_cost: product.price ? parseFloat(product.price) : 0, quantity_ordered: 1, quantity_received: 0 };
    set('items', newItems);
    setProductSearches({ ...productSearches, [index]: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.retailer?.trim()) { toast.error('Vendor/Store is required'); return; }

    let items;
    if (formData.multi_item) {
      items = formData.items.map(item => ({
        ...item,
        quantity_ordered: parseInt(item.quantity_ordered) || 0,
        quantity_received: parseInt(item.quantity_received) || 0,
        unit_cost: parseFloat(item.unit_cost) || 0,
      }));
    } else {
      if (!formData.product_name?.trim()) { toast.error('Product name is required'); return; }
      items = [{
        product_name: formData.product_name,
        upc: formData.upc,
        quantity_ordered: parseInt(formData.quantity) || 1,
        quantity_received: 0,
        unit_cost: parseFloat(formData.unit_cost) || 0,
        product_id: '',
      }];
    }

    const multiItemTotal = formData.multi_item
      ? formData.items.reduce((sum, item) => sum + ((item.quantity_ordered || 0) * (item.unit_cost || 0)), 0)
      : totalCost;

    const giftCardValue = formData.gift_card_ids.reduce((sum, id) => {
      const gc = giftCards.find(g => g.id === id);
      return sum + (gc?.value || 0);
    }, 0);

    const dataToSubmit = {
      transaction_mode: formData.transaction_mode,
      order_number: formData.order_number || `TXN-${Date.now()}`,
      retailer: formData.retailer,
      account: formData.account,
      buyer: formData.buyer,
      marketplace_platform: formData.marketplace_platform,
      status: formData.status,
      tracking_number: formData.tracking_numbers.filter(Boolean)[0] || '',
      credit_card_id: formData.credit_card_id || null,
      category: formData.category,
      product_category: formData.product_category,
      gift_card_ids: formData.gift_card_ids,
      gift_card_value: giftCardValue,
      include_tax_in_cashback: formData.include_tax_in_cashback,
      include_shipping_in_cashback: formData.include_shipping_in_cashback,
      tax: tax,
      shipping: shipping,
      fees: fees,
      order_date: formData.order_date,
      items,
      total_cost: multiItemTotal,
      final_cost: multiItemTotal - giftCardValue,
      notes: formData.notes,
      bonus_amount: formData.amazon_young_adult ? parseFloat((cashbackBase * 0.05).toFixed(2)) : 0,
      bonus_notes: formData.amazon_young_adult ? 'Prime Young Adult 5%' : '',
      extra_cashback_percent: 0,
    };

    onSubmit(dataToSubmit);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[95vh] overflow-y-auto p-0">
        <div className="p-6 pb-0">
          <h2 className="text-2xl font-bold text-gray-900">{order ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <p className="text-sm text-gray-500 mt-1">Record a new purchase — pick your mode and fill in the details</p>

          {/* Mode Tabs */}
          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={() => set('transaction_mode', 'churning')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${formData.transaction_mode === 'churning' ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              <Tag className="h-4 w-4" /> Churning
            </button>
            <button
              type="button"
              onClick={() => set('transaction_mode', 'marketplace')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${formData.transaction_mode === 'marketplace' ? 'bg-purple-50 border-purple-400 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              <Globe className="h-4 w-4" /> Marketplace
            </button>
            <span className="text-sm text-gray-400">
              {formData.transaction_mode === 'churning' ? 'For wholesale buyer transactions (buy → ship → scan → get paid)' : 'For marketplace sales (Amazon, eBay, Mercari, etc.)'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-0">
            {/* Left: Form */}
            <div className="flex-1 p-6 space-y-5 overflow-y-auto">
              {/* Multi-item toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                <input type="checkbox" checked={formData.multi_item} onChange={e => set('multi_item', e.target.checked)} className="rounded" />
                <ShoppingCart className="h-4 w-4" /> Multi-Item Order
              </label>

              {/* PRODUCT INFORMATION */}
              {!formData.multi_item ? (
                <div className="border rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-purple-600 font-semibold text-xs uppercase tracking-wider">
                    <ShoppingCart className="h-4 w-4" /> Product Information
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Product Name *</Label>
                    <Input className="mt-1 bg-gray-50" value={formData.product_name} onChange={e => set('product_name', e.target.value)} placeholder="e.g. Apple AirPods Pro 2nd Gen" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600">Category</Label>
                      <Select value={formData.product_category} onValueChange={v => set('product_category', v)}>
                        <SelectTrigger className="mt-1 bg-gray-50"><SelectValue placeholder="Select category..." /></SelectTrigger>
                        <SelectContent>
                          {PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">SKU / UPC</Label>
                      <Input className="mt-1 bg-gray-50" value={formData.upc} onChange={e => set('upc', e.target.value)} placeholder="Optional" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-600 font-semibold text-xs uppercase tracking-wider">
                      <ShoppingCart className="h-4 w-4" /> Items
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
                  </div>
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end p-3 bg-gray-50 rounded-lg">
                      <div style={{ width: '40%' }}>
                        <Label className="text-xs">Product</Label>
                        <ProductSearchDropdown products={products} value={item.product_id} onChange={v => updateItem(index, 'product_id', v)} onSelect={p => handleProductSelect(index, p)} searchValue={productSearches[index] || ''} onSearchChange={v => setProductSearches({ ...productSearches, [index]: v })} />
                      </div>
                      <div style={{ width: '15%' }}>
                        <Label className="text-xs">Qty</Label>
                        <Input type="number" min="1" value={item.quantity_ordered} onChange={e => updateItem(index, 'quantity_ordered', e.target.value)} className="text-sm" />
                      </div>
                      <div style={{ width: '20%' }}>
                        <Label className="text-xs">Unit Cost</Label>
                        <Input type="number" step="0.01" value={item.unit_cost} onChange={e => updateItem(index, 'unit_cost', e.target.value)} className="text-sm" />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}

              {/* PURCHASE DETAILS */}
              {!formData.multi_item && (
                <div className="border rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-wider">
                    <ShoppingCart className="h-4 w-4" /> Purchase Details
                  </div>
                  <div className="grid grid-cols-4 gap-3 items-end">
                    <div>
                      <Label className="text-xs text-gray-600">Unit Price *</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <Input className="pl-6 bg-gray-50" type="number" step="0.01" value={formData.unit_cost} onChange={e => set('unit_cost', e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Quantity</Label>
                      <div className="flex items-center gap-1 mt-1">
                        <button type="button" onClick={() => set('quantity', Math.max(1, (parseInt(formData.quantity) || 1) - 1))} className="w-8 h-9 border rounded flex items-center justify-center text-gray-600 hover:bg-gray-100">−</button>
                        <Input className="bg-gray-50 text-center w-16" type="number" min="1" value={formData.quantity} onChange={e => set('quantity', e.target.value)} />
                        <button type="button" onClick={() => set('quantity', (parseInt(formData.quantity) || 1) + 1)} className="w-8 h-9 border rounded flex items-center justify-center text-gray-600 hover:bg-gray-100">+</button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Total Price</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <Input className="pl-6 bg-gray-50" value={subtotal.toFixed(2)} readOnly placeholder="Auto-calc" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Date</Label>
                      <Input className="mt-1 bg-gray-50" type="date" value={formData.order_date} onChange={e => set('order_date', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-gray-600">Tax</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <Input className="pl-6 bg-gray-50" type="number" step="0.01" value={formData.tax} onChange={e => set('tax', e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Shipping</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <Input className="pl-6 bg-gray-50" type="number" step="0.01" value={formData.shipping} onChange={e => set('shipping', e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Fees</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <Input className="pl-6 bg-gray-50" type="number" step="0.01" value={formData.fees} onChange={e => set('fees', e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VENDOR & BUYER */}
              <div className="border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-orange-600 font-semibold text-xs uppercase tracking-wider">
                  <Truck className="h-4 w-4" /> Vendor & Buyer
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600">Vendor / Store *</Label>
                    <Select value={formData.retailer} onValueChange={v => set('retailer', v)}>
                      <SelectTrigger className="mt-1 bg-gray-50"><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                      <SelectContent>
                        {RETAILERS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.transaction_mode === 'churning' ? (
                    <div>
                      <Label className="text-xs text-gray-600">Buyer *</Label>
                      <Select value={formData.buyer} onValueChange={v => set('buyer', v)}>
                        <SelectTrigger className="mt-1 bg-gray-50"><SelectValue placeholder="Select buyer..." /></SelectTrigger>
                        <SelectContent>
                          {sellers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <Label className="text-xs text-gray-600">Marketplace *</Label>
                      <Select value={formData.marketplace_platform} onValueChange={v => set('marketplace_platform', v)}>
                        <SelectTrigger className="mt-1 bg-gray-50"><SelectValue placeholder="Select platform..." /></SelectTrigger>
                        <SelectContent>
                          {MARKETPLACE_PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-gray-600">Status</Label>
                    <Select value={formData.status} onValueChange={v => set('status', v)}>
                      <SelectTrigger className="mt-1 bg-gray-50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600">Account</Label>
                    <Input className="mt-1 bg-gray-50" value={formData.account} onChange={e => set('account', e.target.value)} placeholder="e.g. abdel" />
                    {formData.retailer && <p className="text-xs text-blue-500 mt-1">Account for {formData.retailer}</p>}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Order Number</Label>
                    <Input className="mt-1 bg-gray-50" value={formData.order_number} onChange={e => set('order_number', e.target.value)} placeholder="e.g. 112-3456789" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Tracking Numbers</Label>
                  <div className="space-y-2 mt-1">
                    {formData.tracking_numbers.map((tn, i) => (
                      <div key={i} className="flex gap-2">
                        <Input className="bg-gray-50" value={tn} onChange={e => updateTracking(i, e.target.value)} placeholder="e.g. 1Z999AA10123456784" />
                        {formData.tracking_numbers.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeTracking(i)}><X className="h-4 w-4" /></Button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={addTrackingNumber} className="text-xs text-blue-500 hover:text-blue-700 font-medium">+ Add tracking number</button>
                  </div>
                </div>
              </div>

              {/* PAYMENT & CASHBACK */}
              <div className="border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-pink-600 font-semibold text-xs uppercase tracking-wider">
                  <CreditCard className="h-4 w-4" /> Payment & Cashback
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600">Payment Method</Label>
                    <Select value={formData.credit_card_id || ''} onValueChange={v => set('credit_card_id', v)}>
                      <SelectTrigger className="mt-1 bg-gray-50"><SelectValue placeholder="Select card..." /></SelectTrigger>
                      <SelectContent>
                        {creditCards.filter(c => c.active).map(card => (
                          <SelectItem key={card.id} value={card.id}>{card.card_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Cashback Rate %</Label>
                    <div className="relative mt-1">
                      <Input className="pr-8 bg-gray-50" value={cashbackRate} readOnly placeholder="0" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Cashback Amount <span className="text-gray-400">(auto)</span></Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <Input className="pl-6 bg-gray-50" value={cashbackAmount.toFixed(2)} readOnly />
                    </div>
                  </div>
                </div>

                {/* Reward category */}
                <div>
                  <Label className="text-xs text-gray-600">Reward Category</Label>
                  <Select value={formData.category} onValueChange={v => set('category', v)}>
                    <SelectTrigger className="mt-1 bg-gray-50 w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REWARD_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gift Card */}
                <div>
                  <Label className="text-xs text-gray-600">Gift Card Used</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <Input className="pl-6 bg-gray-50" value={giftCardTotal > 0 ? giftCardTotal.toFixed(2) : '0.00'} readOnly />
                  </div>
                  <div className="mt-2 border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                    {giftCards.filter(gc => gc.status === 'available' || formData.gift_card_ids.includes(gc.id)).map(gc => (
                      <label key={gc.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={formData.gift_card_ids.includes(gc.id)} onChange={e => {
                          if (e.target.checked) set('gift_card_ids', [...formData.gift_card_ids, gc.id]);
                          else set('gift_card_ids', formData.gift_card_ids.filter(id => id !== gc.id));
                        }} className="rounded" />
                        {gc.brand} — ${gc.value} ...{gc.code?.slice(-3) || 'XXX'}
                      </label>
                    ))}
                    {giftCards.filter(gc => gc.status === 'available' || formData.gift_card_ids.includes(gc.id)).length === 0 && (
                      <p className="text-xs text-gray-400">No gift card payment method found{formData.retailer ? ` for ${formData.retailer}` : ''}</p>
                    )}
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={formData.include_tax_in_cashback} onChange={e => set('include_tax_in_cashback', e.target.checked)} className="rounded accent-purple-600" />
                    Include tax in cashback
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={formData.include_shipping_in_cashback} onChange={e => set('include_shipping_in_cashback', e.target.checked)} className="rounded accent-purple-600" />
                    Include shipping in cashback
                  </label>
                  {isAmazon && (
                    <label className={`flex items-center gap-2 text-sm cursor-pointer px-3 py-1.5 rounded-lg border transition ${formData.amazon_young_adult ? 'bg-orange-50 border-orange-300 text-orange-700' : 'border-gray-200 text-gray-500'}`}>
                      <input type="checkbox" checked={formData.amazon_young_adult} onChange={e => set('amazon_young_adult', e.target.checked)} className="rounded accent-orange-500" />
                      ✨ Amazon Young Adult 5%
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Sidebar */}
            <div className="w-64 shrink-0 border-l bg-gray-50 p-4 flex flex-col gap-4">
              <div className="bg-white rounded-xl border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <DollarSign className="h-4 w-4 text-green-500" /> Transaction Summary
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">${(formData.multi_item ? formData.items.reduce((s, i) => s + ((i.quantity_ordered || 0) * (i.unit_cost || 0)), 0) : subtotal).toFixed(2)}</span>
                </div>
                {!formData.multi_item && tax > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax</span><span>${tax.toFixed(2)}</span>
                  </div>
                )}
                {!formData.multi_item && shipping > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Shipping</span><span>${shipping.toFixed(2)}</span>
                  </div>
                )}
                {giftCardTotal > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Gift Cards</span><span>-${giftCardTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t pt-2 text-gray-900">
                  <span>Total Cost</span>
                  <span>${(formData.multi_item ? formData.items.reduce((s, i) => s + ((i.quantity_ordered || 0) * (i.unit_cost || 0)), 0) : totalCost - giftCardTotal).toFixed(2)}</span>
                </div>
                {cashbackAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Cashback</span><span>+${cashbackAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className={`rounded-xl border p-3 text-xs ${formData.transaction_mode === 'churning' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-purple-50 border-purple-200 text-purple-700'}`}>
                <div className="flex items-center gap-1 font-semibold mb-1">
                  {formData.transaction_mode === 'churning' ? <><Tag className="h-3 w-3" /> Churning Mode</> : <><Globe className="h-3 w-3" /> Marketplace Mode</>}
                </div>
                <p>{formData.transaction_mode === 'churning' ? (formData.buyer || 'No buyer selected') : (formData.marketplace_platform || 'No platform selected')}</p>
              </div>

              <Button type="submit" form="po-form" className="bg-purple-600 hover:bg-purple-700 text-white w-full" disabled={isPending} onClick={handleSubmit}>
                <Plus className="h-4 w-4 mr-1" /> {isPending ? 'Saving...' : (order ? 'Update Transaction' : 'Add Transaction')}
              </Button>

              <button type="button" onClick={() => onOpenChange(false)} className="text-xs text-gray-400 hover:text-gray-600 text-center">
                Cancel — Back to Transactions
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}