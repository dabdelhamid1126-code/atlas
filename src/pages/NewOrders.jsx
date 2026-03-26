import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tag, Globe, Package, ShoppingCart, Truck, CreditCard, DollarSign, Layers, Plus, Trash2, Copy, Sparkles, Info } from 'lucide-react';
import ProductAutocomplete from '@/components/purchase-orders/ProductAutocomplete';
import GiftCardPicker from '@/components/shared/GiftCardPicker';

const PRODUCT_CATEGORIES = ['Electronics', 'Home & Garden', 'Toys & Games', 'Health & Beauty', 'Sports', 'Clothing', 'Tools', 'Gift Cards', 'Grocery', 'Other'];
const RETAILERS = ['Amazon', 'Best Buy', 'Walmart', 'Target', 'Costco', "Sam's Club", 'eBay', 'Woot', 'Apple', 'Other'];
const CHURNING_STATUSES = [{ value: 'pending', label: 'Pending' }, { value: 'ordered', label: 'Ordered' }, { value: 'shipped', label: 'Shipped' }, { value: 'received', label: 'Received' }];
const MARKETPLACE_STATUSES = [{ value: 'pending', label: 'Pending' }, { value: 'ordered', label: 'Listed' }, { value: 'shipped', label: 'Sold' }, { value: 'received', label: 'Completed' }];

const fmt$ = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

function SectionHeader({ icon: Icon, label, color }) {
  const colors = { purple: 'text-purple-500', blue: 'text-blue-500', amber: 'text-amber-500', pink: 'text-pink-500', green: 'text-green-500' };
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/30">
      <Icon className={`h-4 w-4 ${colors[color] || 'text-slate-400'}`} />
      <span className={`text-xs font-bold tracking-widest uppercase ${colors[color] || 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

function SummaryRow({ label, value, color, bold }) {
  return (
    <div className="flex justify-between items-center">
      <span className={bold ? 'font-medium text-slate-700' : 'text-slate-500'}>{label}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${color || 'text-slate-700'}`}>{value}</span>
    </div>
  );
}

const defaultItem = () => ({ id: crypto.randomUUID(), product_id: '', product_name: '', upc: '', quantity_ordered: 1, unit_cost: '', sale_price: '' });

const defaultForm = () => ({
  order_type: 'churning',
  retailer: '',
  buyer: '',
  marketplace_platform: '',
  account: '',
  order_number: '',
  tracking_number: '',
  status: 'pending',
  product_category: '',
  order_date: format(new Date(), 'yyyy-MM-dd'),
  tax: '',
  shipping_cost: '',
  fees: '',
  credit_card_id: '',
  gift_card_ids: [],
  include_tax_in_cashback: true,
  include_shipping_in_cashback: true,
  amazon_yacb: false,
  cashback_rate_override: '',
  is_pickup: false,
  pickup_location: '',
  is_dropship: false,
  dropship_to: '',
  notes: '',
  items: [defaultItem(), defaultItem()],
  multi_item: true,
});

export default function NewOrders() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm());

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list() });
  const { data: creditCards = [] } = useQuery({ queryKey: ['creditCards'], queryFn: () => base44.entities.CreditCard.list() });
  const { data: giftCards = [] } = useQuery({ queryKey: ['giftCards'], queryFn: () => base44.entities.GiftCard.list() });
  const { data: sellers = [] } = useQuery({ queryKey: ['sellers'], queryFn: () => base44.entities.Seller.list() });

  // Reset form when switching mode
  useEffect(() => {
    setForm(prev => ({ ...defaultForm(), order_type: prev.order_type, multi_item: prev.multi_item }));
  }, [form.order_type]);

  // Item helpers
  const updateItem = (id, field, val) => {
    setForm(prev => ({ ...prev, items: prev.items.map(it => it.id !== id ? it : { ...it, [field]: val }) }));
  };
  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, defaultItem()] }));
  const removeItem = (id) => setForm(prev => ({ ...prev, items: prev.items.length > 1 ? prev.items.filter(it => it.id !== id) : prev.items }));
  const duplicateItem = (id) => setForm(prev => {
    const idx = prev.items.findIndex(it => it.id === id);
    const copy = { ...prev.items[idx], id: crypto.randomUUID(), product_name: prev.items[idx].product_name + ' (copy)' };
    const items = [...prev.items];
    items.splice(idx + 1, 0, copy);
    return { ...prev, items };
  });

  // Calculations
  const selectedCard = creditCards.find(c => c.id === form.credit_card_id);
  const isAmazon = form.retailer === 'Amazon';
  const statuses = form.order_type === 'churning' ? CHURNING_STATUSES : MARKETPLACE_STATUSES;

  const itemsSubtotal = useMemo(() =>
    form.items.reduce((s, it) => s + (parseFloat(it.unit_cost) || 0) * (parseInt(it.quantity_ordered) || 1), 0),
    [form.items]);
  const tax = parseFloat(form.tax) || 0;
  const shipping = parseFloat(form.shipping_cost) || 0;
  const fees = parseFloat(form.fees) || 0;
  const totalCost = itemsSubtotal + tax + shipping + fees;

  const giftCardTotal = form.gift_card_ids.reduce((s, id) => {
    const gc = giftCards.find(g => g.id === id);
    return s + (gc?.value || 0);
  }, 0);
  const finalCost = totalCost - giftCardTotal;

  const getCardRate = () => {
    if (!selectedCard) return 0;
    return selectedCard.cashback_rate || 0;
  };
  const cardRate = parseFloat(form.cashback_rate_override) || getCardRate();
  // Cashback is earned only on what the credit card actually charges (finalCost = totalCost - giftCards)
  const chargedOnCard = totalCost - giftCardTotal;
  const cashbackBase = chargedOnCard - (!form.include_tax_in_cashback ? tax : 0) - (!form.include_shipping_in_cashback ? shipping : 0);
  const cardCB = Math.max(0, cashbackBase) * cardRate / 100;
  const yaCB = form.amazon_yacb && isAmazon ? cashbackBase * 0.05 : 0;
  const totalCB = cardCB + yaCB;

  const totalSalePrice = useMemo(() =>
    form.items.reduce((s, it) => s + (parseFloat(it.sale_price) || 0) * (parseInt(it.quantity_ordered) || 1), 0),
    [form.items]);
  const commission = totalSalePrice > 0 ? totalSalePrice - totalCost : 0;
  const netProfit = totalSalePrice > 0 ? totalSalePrice - totalCost + totalCB : 0;
  const roi = totalCost > 0 && totalSalePrice > 0 ? (netProfit / totalCost) * 100 : 0;

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const order = await base44.entities.PurchaseOrder.create(data);
      if (data.gift_card_ids?.length > 0) {
        for (const cardId of data.gift_card_ids) {
          await base44.entities.GiftCard.update(cardId, { status: 'used', used_order_number: data.order_number });
        }
        queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      }
      if (order.credit_card_id && order.total_cost) {
        const card = creditCards.find(c => c.id === order.credit_card_id);
        if (card && cardRate > 0) {
          await base44.entities.Reward.create({
            credit_card_id: order.credit_card_id,
            card_name: card.card_name,
            source: card.card_name,
            type: 'cashback',
            currency: 'USD',
            purchase_amount: cashbackBase,
            amount: parseFloat(totalCB.toFixed(2)),
            purchase_order_id: order.id,
            order_number: order.order_number,
            date_earned: order.order_date,
            status: 'pending',
            notes: `Auto from order ${order.order_number}`,
          });
          queryClient.invalidateQueries({ queryKey: ['rewards'] });
        }
      }
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Order created!');
      setForm(prev => ({ ...defaultForm(), order_type: prev.order_type, multi_item: prev.multi_item, retailer: prev.retailer, credit_card_id: prev.credit_card_id, include_tax_in_cashback: prev.include_tax_in_cashback, include_shipping_in_cashback: prev.include_shipping_in_cashback, amazon_yacb: prev.amazon_yacb }));
    },
    onError: () => toast.error('Failed to create order'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.retailer) { toast.error('Vendor is required'); return; }
    const validItems = form.items.filter(it => it.product_name?.trim() && parseFloat(it.unit_cost) > 0);
    if (validItems.length === 0) { toast.error('At least one item with name and price is required'); return; }

    const items = validItems.map(it => ({
      product_id: it.product_id || null,
      product_name: it.product_name.trim(),
      upc: it.upc || null,
      quantity_ordered: parseInt(it.quantity_ordered) || 1,
      quantity_received: 0,
      unit_cost: parseFloat(it.unit_cost) || 0,
      sale_price: parseFloat(it.sale_price) || 0,
    }));

    const orderNumber = form.order_number?.trim() || `ORD-${Date.now()}`;

    createMutation.mutate({
      order_type: form.order_type,
      order_number: orderNumber,
      tracking_number: form.tracking_number || null,
      retailer: form.retailer,
      buyer: form.buyer || null,
      marketplace_platform: form.marketplace_platform || null,
      account: form.account || null,
      status: form.status,
      product_category: form.product_category || null,
      order_date: form.order_date,
      tax,
      shipping_cost: shipping,
      fees,
      total_cost: totalCost,
      gift_card_value: giftCardTotal,
      final_cost: finalCost,
      credit_card_id: form.credit_card_id || null,
      card_name: selectedCard?.card_name || null,
      gift_card_ids: form.gift_card_ids,
      include_tax_in_cashback: form.include_tax_in_cashback,
      include_shipping_in_cashback: form.include_shipping_in_cashback,
      extra_cashback_percent: form.amazon_yacb && isAmazon ? 5 : 0,
      bonus_notes: form.amazon_yacb && isAmazon ? 'Prime Young Adult' : null,
      is_pickup: form.is_pickup,
      pickup_location: form.pickup_location || null,
      is_dropship: form.is_dropship,
      dropship_to: form.dropship_to || null,
      notes: form.notes || null,
      items,
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Add New Order</h1>
        <p className="text-sm text-slate-500 mt-1">Record a new purchase — pick your mode and fill in the details</p>
      </div>

      {/* Mode toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-xl w-fit shadow-sm">
          <button type="button" onClick={() => set('order_type', 'churning')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${form.order_type === 'churning' ? 'bg-amber-500 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}>
            <Tag className="h-4 w-4" /> Churning
          </button>
          <button type="button" onClick={() => set('order_type', 'marketplace')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${form.order_type === 'marketplace' ? 'bg-blue-500 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}>
            <Globe className="h-4 w-4" /> Marketplace
          </button>
        </div>
        <p className="text-xs text-slate-400">
          {form.order_type === 'churning' ? 'Wholesale buyer transactions (buy → ship → scan → get paid)' : 'Marketplace sales (Amazon, eBay, Mercari, etc.)'}
        </p>
      </div>



      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-5">

            {/* Order Items */}
            <div className="bg-purple-50 rounded-2xl p-5">
              <SectionHeader icon={Package} label="Order Items" color="purple" />
              <div className="space-y-3">
                {form.items.map((item, idx) => (
                  <div key={item.id} className="bg-white rounded-xl border border-purple-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-purple-500">Item {idx + 1}</span>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => duplicateItem(item.id)} title="Duplicate"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {form.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(item.id)} title="Remove"
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-3">
                      <div className="col-span-2 sm:col-span-3 space-y-1">
                        <Label className="text-xs text-slate-600">Product Name *</Label>
                        <ProductAutocomplete
                          products={products}
                          nameValue={item.product_name}
                          upcValue={item.upc}
                          searchField="name"
                          onSelect={(p) => { updateItem(item.id, 'product_id', p.id); updateItem(item.id, 'product_name', p.name); updateItem(item.id, 'upc', p.upc || ''); }}
                          onChangeName={(v) => updateItem(item.id, 'product_name', v)}
                          placeholder="e.g. iPad Air"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Unit Price *</Label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                          <Input className="pl-6 h-9" type="number" step="0.01" min="0"
                            value={item.unit_cost} onChange={(e) => updateItem(item.id, 'unit_cost', e.target.value)} placeholder="0.00" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Qty</Label>
                        <Input className="h-9 text-center" type="number" min="1"
                          value={item.quantity_ordered} onChange={(e) => updateItem(item.id, 'quantity_ordered', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Total</Label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                          <Input className="pl-6 h-9 bg-slate-100" readOnly
                            value={((parseFloat(item.unit_cost) || 0) * (parseInt(item.quantity_ordered) || 1)).toFixed(2)} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">SKU / UPC</Label>
                        <ProductAutocomplete
                          products={products} nameValue={item.product_name} upcValue={item.upc}
                          searchField="upc"
                          onSelect={(p) => { updateItem(item.id, 'product_id', p.id); updateItem(item.id, 'product_name', p.name); updateItem(item.id, 'upc', p.upc || ''); }}
                          onChangeUpc={(v) => updateItem(item.id, 'upc', v)} placeholder="Optional"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Sale Price (per unit)</Label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                          <Input className="pl-6 h-9" type="number" step="0.01" min="0"
                            value={item.sale_price} onChange={(e) => updateItem(item.id, 'sale_price', e.target.value)} placeholder="0.00" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Category</Label>
                        <Select value={form.product_category} onValueChange={(v) => set('product_category', v)}>
                          <SelectTrigger className="h-9 bg-white text-xs"><SelectValue placeholder="Category..." /></SelectTrigger>
                          <SelectContent>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addItem}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-purple-200 text-purple-600 text-sm font-medium hover:border-purple-400 hover:bg-purple-50 transition">
                <Plus className="h-4 w-4" /> Add Another Item
              </button>
              {itemsSubtotal > 0 && (
                <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg bg-purple-100 border border-purple-200">
                  <span className="text-xs text-purple-600">{form.items.filter(it => parseFloat(it.unit_cost) > 0).length} item(s)</span>
                  <span className="text-sm font-semibold text-purple-700">Order Total: {fmt$(itemsSubtotal)}</span>
                </div>
              )}
            </div>

            {/* Purchase Details */}
            <div className="bg-blue-50 rounded-2xl p-5">
              <SectionHeader icon={ShoppingCart} label="Purchase Details" color="blue" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Tax</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <Input className="bg-white pl-6" type="number" step="0.01" min="0" value={form.tax} onChange={e => set('tax', e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Shipping</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <Input className="bg-white pl-6" type="number" step="0.01" min="0" value={form.shipping_cost} onChange={e => set('shipping_cost', e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Fees</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <Input className="bg-white pl-6" type="number" step="0.01" min="0" value={form.fees} onChange={e => set('fees', e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Order Date</Label>
                  <Input className="bg-white" type="date" value={form.order_date} onChange={e => set('order_date', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Vendor & Buyer */}
            <div className="bg-amber-50 rounded-2xl p-5">
              <SectionHeader icon={Truck} label="Vendor & Buyer" color="amber" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Vendor / Store *</Label>
                  <Select value={form.retailer} onValueChange={(v) => set('retailer', v)}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                    <SelectContent>{RETAILERS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.order_type === 'churning' ? (
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Buyer</Label>
                    <Select value={form.buyer} onValueChange={(v) => set('buyer', v)}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select buyer..." /></SelectTrigger>
                      <SelectContent>{sellers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Marketplace</Label>
                    <Select value={form.marketplace_platform} onValueChange={(v) => set('marketplace_platform', v)}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select platform..." /></SelectTrigger>
                      <SelectContent>{['eBay', 'Amazon', 'Facebook Marketplace', 'Mercari', 'OfferUp', 'Craigslist', 'Other'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Status</Label>
                  <Select value={form.status} onValueChange={(v) => set('status', v)}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Order Number</Label>
                  <Input className="bg-white" value={form.order_number} onChange={e => set('order_number', e.target.value)} placeholder="e.g. 112-3456789" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Account</Label>
                  <Input className="bg-white" value={form.account} onChange={e => set('account', e.target.value)} placeholder="Account used" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Tracking Number</Label>
                  <Input className="bg-white" value={form.tracking_number} onChange={e => set('tracking_number', e.target.value)} placeholder="e.g. 1Z999AA..." />
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_dropship} onChange={e => set('is_dropship', e.target.checked)} className="rounded" />
                  🚚 Dropship
                </label>
                {form.is_dropship && (
                  <Select value={form.dropship_to} onValueChange={(v) => set('dropship_to', v)}>
                    <SelectTrigger className="bg-white w-36 h-8 text-xs"><SelectValue placeholder="To seller..." /></SelectTrigger>
                    <SelectContent>{sellers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_pickup} onChange={e => set('is_pickup', e.target.checked)} className="rounded" />
                  📍 Pickup
                </label>
                {form.is_pickup && (
                  <Input className="bg-white w-36 h-8 text-xs" value={form.pickup_location} onChange={e => set('pickup_location', e.target.value)} placeholder="Pickup location" />
                )}
              </div>
            </div>

            {/* Payment & Cashback */}
            <div className="bg-rose-50 rounded-2xl p-5">
              <SectionHeader icon={CreditCard} label="Payment & Cashback" color="pink" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Payment Method</Label>
                  <Select value={form.credit_card_id} onValueChange={(v) => set('credit_card_id', v)}>
                    <SelectTrigger className="bg-white">
                      {form.credit_card_id ? <span>{selectedCard?.card_name}</span> : <SelectValue placeholder="Select card..." />}
                    </SelectTrigger>
                    <SelectContent>{creditCards.filter(c => c.active !== false).map(c => <SelectItem key={c.id} value={c.id}>{c.card_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Cashback Rate %</Label>
                  <div className="relative">
                    <Input className="bg-white pr-8" type="number" step="0.1" min="0"
                      value={form.cashback_rate_override || cardRate || ''}
                      onChange={e => set('cashback_rate_override', e.target.value)}
                      placeholder={cardRate ? String(cardRate) : '0'} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Cashback Amount <span className="text-slate-400">(auto)</span></Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <Input className="bg-slate-100 pl-6 text-green-600 font-medium" readOnly value={totalCB.toFixed(2)} />
                  </div>
                </div>
              </div>

              {/* Gift Cards */}
              <div className="mb-3">
                <GiftCardPicker
                  giftCards={giftCards}
                  selectedIds={form.gift_card_ids}
                  onChange={(ids) => set('gift_card_ids', ids)}
                  retailer={form.retailer}
                />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.include_tax_in_cashback} onChange={e => set('include_tax_in_cashback', e.target.checked)} className="rounded" />
                  Include tax in cashback
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.include_shipping_in_cashback} onChange={e => set('include_shipping_in_cashback', e.target.checked)} className="rounded" />
                  Include shipping in cashback
                </label>
                {isAmazon && (
                  <label className={`flex items-center gap-2 text-sm cursor-pointer px-3 py-1.5 rounded-lg border transition ${form.amazon_yacb ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-slate-200'}`}>
                    <input type="checkbox" checked={form.amazon_yacb} onChange={e => set('amazon_yacb', e.target.checked)} className="rounded" />
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Amazon Young Adult 5%
                  </label>
                )}
              </div>

              {totalCB > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-green-600 font-semibold mb-1">
                    <Info className="h-3 w-3" /> Cashback Breakdown
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Cashback base{form.include_tax_in_cashback ? ' + tax' : ''}{form.include_shipping_in_cashback ? ' + shipping' : ''}</span>
                    <span>{fmt$(cashbackBase)}</span>
                  </div>
                  {cardCB > 0 && <div className="flex justify-between text-slate-500"><span>Card cashback ({cardRate}%)</span><span className="text-green-600">+{fmt$(cardCB)}</span></div>}
                  {yaCB > 0 && <div className="flex justify-between text-slate-500"><span>Amazon Young Adult (5%)</span><span className="text-amber-600">+{fmt$(yaCB)}</span></div>}
                  <div className="flex justify-between font-semibold pt-1 border-t border-green-200">
                    <span>Total cashback</span><span className="text-green-600">{fmt$(totalCB)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Notes</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes..." rows={2} />
            </div>
          </div>

          {/* RIGHT COLUMN - Summary */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 space-y-4">
              {/* Transaction Summary */}
              <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-200 p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-purple-500" /> Order Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <SummaryRow label="Subtotal" value={fmt$(itemsSubtotal)} />
                  {tax > 0 && <SummaryRow label="Tax" value={`+${fmt$(tax)}`} />}
                  {shipping > 0 && <SummaryRow label="Shipping" value={`+${fmt$(shipping)}`} />}
                  {fees > 0 && <SummaryRow label="Fees" value={`+${fmt$(fees)}`} />}
                  <div className="border-t border-purple-100 pt-2">
                    <SummaryRow label="Total Cost" value={fmt$(totalCost)} bold />
                  </div>
                  {giftCardTotal > 0 && <SummaryRow label="Gift Cards" value={`-${fmt$(giftCardTotal)}`} color="text-amber-600" />}
                  {giftCardTotal > 0 && <SummaryRow label="Final Cost" value={fmt$(finalCost)} bold />}
                  {totalCB > 0 && <SummaryRow label="Cashback" value={`+${fmt$(totalCB)}`} color="text-green-600" />}
                  {totalSalePrice > 0 && (
                    <>
                      <div className="border-t border-purple-100 pt-2">
                        <SummaryRow label="Sale Total" value={fmt$(totalSalePrice)} color="text-blue-600" />
                      </div>
                      {commission !== 0 && <SummaryRow label="Commission" value={commission >= 0 ? `+${fmt$(commission)}` : `-${fmt$(Math.abs(commission))}`} color={commission >= 0 ? 'text-green-600' : 'text-red-500'} />}
                      <SummaryRow label="Net Profit" value={fmt$(netProfit)} color={netProfit >= 0 ? 'text-green-600' : 'text-red-500'} bold />
                      <SummaryRow label="ROI" value={`${roi.toFixed(1)}%`} color={roi >= 0 ? 'text-green-600' : 'text-red-500'} />
                    </>
                  )}
                </div>
              </div>

              {/* Mode badge */}
              <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${form.order_type === 'churning' ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
                {form.order_type === 'churning' ? <Tag className="h-4 w-4 text-amber-500" /> : <Globe className="h-4 w-4 text-blue-500" />}
                <div>
                  <p className={`text-sm font-semibold ${form.order_type === 'churning' ? 'text-amber-700' : 'text-blue-700'}`}>
                    {form.order_type === 'churning' ? 'Churning Mode' : 'Marketplace Mode'}
                  </p>
                  <p className="text-xs text-slate-500">{form.buyer || form.marketplace_platform ? `Buyer: ${form.buyer || form.marketplace_platform}` : 'No buyer selected'}</p>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={createMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition disabled:opacity-50 shadow-sm">
                {createMutation.isPending ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="h-4 w-4" /> Add {form.items.filter(it => it.product_name?.trim() && parseFloat(it.unit_cost) > 0).length || ''} Order(s)</>
                )}
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}