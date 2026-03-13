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
import { CreditCard, Package, ShoppingCart, Truck, Tag, Globe } from 'lucide-react';
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
  const getInitialForm = (o) => o ? {
    order_number: o.order_number || '',
    tracking_number: o.tracking_number || '',
    retailer: o.retailer || '',
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
    items: o.items || [],
    unit_price: o.items?.[0]?.unit_cost || 0,
    quantity: o.items?.reduce((s, i) => s + (i.quantity_ordered || 0), 0) || 1,
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
    order_number: '',
    tracking_number: '',
    retailer: '',
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
    items: [],
    unit_price: 0,
    quantity: 1,
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

  const [formData, setFormData] = useState(() => getInitialForm(order));

  useEffect(() => {
    setFormData(getInitialForm(order));
  }, [order, open]);

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const selectedCard = creditCards.find(c => c.id === formData.credit_card_id);

  // Auto-calc total price
  const unitPrice = parseFloat(formData.unit_price) || 0;
  const quantity = parseInt(formData.quantity) || 1;
  const tax = parseFloat(formData.tax) || 0;
  const shippingCost = parseFloat(formData.shipping_cost) || 0;
  const fees = parseFloat(formData.fees) || 0;
  const totalPrice = unitPrice * quantity + tax + shippingCost + fees;

  const giftCardTotal = formData.gift_card_ids.reduce((sum, id) => {
    const gc = giftCards.find(g => g.id === id);
    return sum + (gc?.value || 0);
  }, 0);

  // Cashback calc
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

    const totalCost = unitPrice * quantity + tax + shippingCost + fees;
    const items = formData.items.length > 0 ? formData.items : [{
      product_id: '',
      product_name: '',
      upc: '',
      quantity_ordered: quantity,
      quantity_received: 0,
      unit_cost: unitPrice,
    }];

    const dataToSubmit = {
      ...formData,
      items,
      tax,
      shipping_cost: shippingCost,
      fees,
      total_cost: totalCost,
      gift_card_value: giftCardTotal,
      final_cost: totalCost - giftCardTotal,
      credit_card_id: formData.credit_card_id || null,
      extra_cashback_percent: formData.amazon_yacb ? 5 : (parseFloat(formData.extra_cashback_percent) || 0),
      bonus_notes: formData.amazon_yacb ? 'Prime Young Adult' : formData.bonus_notes,
    };
    // remove UI-only fields
    delete dataToSubmit.amazon_yacb;
    delete dataToSubmit.cashback_rate_override;
    delete dataToSubmit.unit_price;

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

          {/* VENDOR & BUYER */}
          <div className="bg-orange-50 rounded-xl p-4">
            <SectionHeader icon={Truck} label="Vendor & Buyer" color="text-orange-500" />
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Vendor / Store *</Label>
                <Select value={formData.retailer} onValueChange={(v) => set('retailer', v)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {RETAILERS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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

          {/* PRODUCT INFORMATION */}
          <div className="bg-purple-50 rounded-xl p-4">
            <SectionHeader icon={Package} label="Product Information" color="text-purple-600" />
            <div className="space-y-1 mb-3">
              <Label className="text-xs text-slate-600">Product Name *</Label>
              <ProductAutocomplete
                products={products}
                nameValue={formData.items?.[0]?.product_name || ''}
                upcValue={formData.items?.[0]?.upc || ''}
                searchField="name"
                onSelect={(p) => {
                  const base = { product_id: p.id, product_name: p.name, upc: p.upc || '', quantity_ordered: quantity, quantity_received: 0, unit_cost: unitPrice };
                  const items = formData.items.length > 0 ? formData.items.map((it, i) => i === 0 ? { ...it, ...base } : it) : [base];
                  setFormData(prev => ({ ...prev, items, product_category: p.category || prev.product_category }));
                }}
                onChangeName={(val) => {
                  const items = formData.items.length > 0
                    ? formData.items.map((it, i) => i === 0 ? { ...it, product_name: val } : it)
                    : [{ product_id: '', product_name: val, upc: '', quantity_ordered: quantity, quantity_received: 0, unit_cost: unitPrice }];
                  setFormData(prev => ({ ...prev, items }));
                }}
                placeholder="e.g. Apple AirPods Pro 2nd Gen"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Category</Label>
                <Select value={formData.product_category} onValueChange={(v) => set('product_category', v)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">SKU / UPC</Label>
                <ProductAutocomplete
                  products={products}
                  nameValue={formData.items?.[0]?.product_name || ''}
                  upcValue={formData.items?.[0]?.upc || ''}
                  searchField="upc"
                  onSelect={(p) => {
                    const base = { product_id: p.id, product_name: p.name, upc: p.upc || '', quantity_ordered: quantity, quantity_received: 0, unit_cost: unitPrice };
                    const items = formData.items.length > 0 ? formData.items.map((it, i) => i === 0 ? { ...it, ...base } : it) : [base];
                    setFormData(prev => ({ ...prev, items, product_category: p.category || prev.product_category }));
                  }}
                  onChangeUpc={(val) => {
                    const items = formData.items.length > 0
                      ? formData.items.map((it, i) => i === 0 ? { ...it, upc: val } : it)
                      : [{ product_id: '', product_name: '', upc: val, quantity_ordered: quantity, quantity_received: 0, unit_cost: unitPrice }];
                    setFormData(prev => ({ ...prev, items }));
                  }}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* PURCHASE DETAILS */}
          <div className="bg-blue-50 rounded-xl p-4">
            <SectionHeader icon={ShoppingCart} label="Purchase Details" color="text-blue-600" />
            <div className="grid grid-cols-4 gap-3 mb-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Unit Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input className="bg-white pl-7" type="number" step="0.01" min="0"
                    value={formData.unit_price}
                    onChange={(e) => set('unit_price', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Quantity</Label>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 bg-white shrink-0"
                    onClick={() => set('quantity', Math.max(1, quantity - 1))}>−</Button>
                  <Input className="bg-white text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" type="number" min="1"
                    value={formData.quantity}
                    onChange={(e) => set('quantity', parseInt(e.target.value) || 1)}
                  />
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 bg-white shrink-0"
                    onClick={() => set('quantity', quantity + 1)}>+</Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">Total Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <Input className="bg-slate-100 pl-7" readOnly value={totalPrice.toFixed(2)} placeholder="Auto-calc" />
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