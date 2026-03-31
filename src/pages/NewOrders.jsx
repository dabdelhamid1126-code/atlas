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
  Tag, Globe, Package, ShoppingCart, Truck, CreditCard,
  DollarSign, Plus, Trash2, Copy, Sparkles, Info, Minus,
  Paperclip, X, FileText,
} from 'lucide-react';
import ProductAutocomplete from '@/components/purchase-orders/ProductAutocomplete';
import GiftCardPicker from '@/components/shared/GiftCardPicker';
import SplitPaymentInput from '@/components/payment-methods/SplitPaymentInput';

// ── Constants ─────────────────────────────────────────────────────────────

const PRODUCT_CATEGORIES = [
  'Electronics', 'Home & Garden', 'Toys & Games', 'Health & Beauty',
  'Sports', 'Clothing', 'Tools', 'Gift Cards', 'Grocery', 'Other',
];
const RETAILERS = [
  'Amazon', 'Best Buy', 'Walmart', 'Target', 'Costco',
  "Sam's Club", 'eBay', 'Woot', 'Apple', 'Other',
];
const CHURNING_STATUSES = [
  { value: 'pending',  label: 'Pending'  },
  { value: 'ordered',  label: 'Ordered'  },
  { value: 'shipped',  label: 'Shipped'  },
  { value: 'received', label: 'Received' },
];
const MARKETPLACE_STATUSES = [
  { value: 'pending',  label: 'Pending'   },
  { value: 'ordered',  label: 'Listed'    },
  { value: 'shipped',  label: 'Sold'      },
  { value: 'received', label: 'Completed' },
];

const fmt$ = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

// ── Shared UI helpers ─────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, color }) {
  const colors = {
    purple: 'text-purple-500', blue: 'text-blue-500',
    amber: 'text-amber-500',   pink: 'text-pink-500',
    green: 'text-green-500',
  };
  return (
    <div className="flex items-center gap-2 mb-4 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <Icon className={`h-4 w-4 ${colors[color] || 'text-slate-400'}`} />
      <span className={`text-xs font-bold tracking-widest uppercase ${colors[color] || 'text-slate-400'}`}>
        {label}
      </span>
    </div>
  );
}

function SummaryRow({ label, value, color, bold }) {
  return (
    <div className="flex justify-between items-center">
      <span className={bold ? 'font-medium text-slate-300' : 'text-slate-400'}>{label}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${color || 'text-slate-100'}`}>{value}</span>
    </div>
  );
}

// ── Default state factories ───────────────────────────────────────────────

const defaultItem = () => ({
  id: crypto.randomUUID(),
  product_id: '',
  product_name: '',
  upc: '',
  quantity_ordered: 1,
  unit_cost: '',
  sale_price: '',
});

const defaultForm = () => ({
  order_type: 'churning',
  retailer: '',
  buyer: '',
  marketplace_platform: '',
  account: '',
  order_number: '',
  tracking_numbers: [''],
  sale_date: '',
  payout_date: '',
  status: 'pending',
  product_category: '',
  order_date: format(new Date(), 'yyyy-MM-dd'),
  tax: '',
  shipping_cost: '',
  fees: '',
  credit_card_id: '',
  payment_splits: [],
  gift_card_ids: [],
  include_tax_in_cashback: true,
  include_shipping_in_cashback: true,
  amazon_yacb: false,
  cashback_rate_override: '',
  notes: '',
  items: [defaultItem(), defaultItem()],
});

// ── Main component ────────────────────────────────────────────────────────

export default function NewOrders() {
  const queryClient  = useQueryClient();
  const [form, setForm] = useState(defaultForm());
  const [receipts, setReceipts] = useState([]);
  const fileInputRef = useRef(null);

  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  // ── Data queries ────────────────────────────────────────────────────────

  const { data: products    = [] } = useQuery({ queryKey: ['products'],    queryFn: () => base44.entities.Product.list() });
  const { data: creditCards = [] } = useQuery({ queryKey: ['creditCards'], queryFn: () => base44.entities.CreditCard.list() });
  const { data: giftCards   = [] } = useQuery({ queryKey: ['giftCards'],   queryFn: () => base44.entities.GiftCard.list() });
  const { data: sellers     = [] } = useQuery({ queryKey: ['sellers'],     queryFn: () => base44.entities.Seller.list() });

  // Reset most fields when switching churning ↔ marketplace
  useEffect(() => {
    setForm(prev => ({
      ...defaultForm(),
      order_type: prev.order_type,
      retailer: prev.retailer,
      credit_card_id: prev.credit_card_id,
      include_tax_in_cashback: prev.include_tax_in_cashback,
      include_shipping_in_cashback: prev.include_shipping_in_cashback,
      amazon_yacb: prev.amazon_yacb,
    }));
    setReceipts([]);
  }, [form.order_type]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Item helpers ────────────────────────────────────────────────────────

  const updateItem = (id, field, val) =>
    setForm(prev => ({ ...prev, items: prev.items.map(it => it.id !== id ? it : { ...it, [field]: val }) }));

  const addItem = () =>
    setForm(prev => ({ ...prev, items: [...prev.items, defaultItem()] }));

  const removeItem = (id) =>
    setForm(prev => ({ ...prev, items: prev.items.length > 1 ? prev.items.filter(it => it.id !== id) : prev.items }));

  const duplicateItem = (id) =>
    setForm(prev => {
      const idx  = prev.items.findIndex(it => it.id === id);
      const copy = { ...prev.items[idx], id: crypto.randomUUID(), product_name: prev.items[idx].product_name + ' (copy)' };
      const items = [...prev.items];
      items.splice(idx + 1, 0, copy);
      return { ...prev, items };
    });

  // ── Tracking number helpers ─────────────────────────────────────────────

  const updateTracking = (idx, val) =>
    setForm(prev => {
      const t = [...prev.tracking_numbers];
      t[idx] = val;
      return { ...prev, tracking_numbers: t };
    });

  const addTracking    = () => setForm(prev => ({ ...prev, tracking_numbers: [...prev.tracking_numbers, ''] }));
  const removeTracking = (idx) =>
    setForm(prev => ({
      ...prev,
      tracking_numbers: prev.tracking_numbers.length > 1
        ? prev.tracking_numbers.filter((_, i) => i !== idx)
        : [''],
    }));

  // ── Receipt helpers ─────────────────────────────────────────────────────

  const addReceipts = (files) => setReceipts(prev => [...prev, ...Array.from(files)]);
  const removeReceipt = (idx) => setReceipts(prev => prev.filter((_, i) => i !== idx));

  // ── Calculations ────────────────────────────────────────────────────────

  // Split payment helpers
  const isSplit = form.payment_splits && form.payment_splits.length > 1;
  // Primary card for cashback calc: first split or single card
  const primaryCardId = isSplit
    ? (form.payment_splits[0]?.card_id || '')
    : form.credit_card_id;
  const selectedCard = creditCards.find(c => c.id === primaryCardId);
  const isAmazon     = form.retailer === 'Amazon';
  const statuses     = form.order_type === 'churning' ? CHURNING_STATUSES : MARKETPLACE_STATUSES;

  const itemsSubtotal = useMemo(() =>
    form.items.reduce((s, it) => s + (parseFloat(it.unit_cost) || 0) * (parseInt(it.quantity_ordered) || 1), 0),
    [form.items]);

  const tax      = parseFloat(form.tax)           || 0;
  const shipping = parseFloat(form.shipping_cost) || 0;
  const fees     = parseFloat(form.fees)          || 0;
  const totalCost = itemsSubtotal + tax + shipping + fees;

  const giftCardTotal = useMemo(() =>
    form.gift_card_ids.reduce((s, id) => {
      const gc = giftCards.find(g => g.id === id);
      return s + (gc?.value || 0);
    }, 0),
    [form.gift_card_ids, giftCards]);

  const finalCost = totalCost - giftCardTotal;

  const cardRate    = parseFloat(form.cashback_rate_override) || selectedCard?.cashback_rate || 0;
  const chargedOnCard  = totalCost - giftCardTotal;
  const cashbackBase   = chargedOnCard
    - (!form.include_tax_in_cashback      ? tax      : 0)
    - (!form.include_shipping_in_cashback ? shipping : 0);

  // For split payments: sum cashback across all cards proportionally
  const splitCashbackTotal = isSplit
    ? form.payment_splits.reduce((sum, sp) => {
        const card = creditCards.find(c => c.id === sp.card_id);
        const rate = card?.cashback_rate || 0;
        const amt  = parseFloat(sp.amount) || 0;
        return sum + (amt * rate / 100);
      }, 0)
    : 0;

  const cardCB  = isSplit ? splitCashbackTotal : Math.max(0, cashbackBase) * cardRate / 100;
  const yaCB    = form.amazon_yacb && isAmazon ? Math.min(cashbackBase * 0.05, 100) : 0;
  const totalCB = cardCB + yaCB;

  const totalSalePrice = useMemo(() =>
    form.items.reduce((s, it) => s + (parseFloat(it.sale_price) || 0) * (parseInt(it.quantity_ordered) || 1), 0),
    [form.items]);

  const commission = totalSalePrice > 0 ? totalSalePrice - totalCost : 0;
  const netProfit  = totalSalePrice > 0 ? totalSalePrice - totalCost + totalCB : 0;
  const roi        = totalCost > 0 && totalSalePrice > 0 ? (netProfit / totalCost) * 100 : 0;

  // ── Mutation ────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const order = await base44.entities.PurchaseOrder.create(data);

      if (data.gift_card_ids?.length > 0) {
        for (const cardId of data.gift_card_ids) {
          await base44.entities.GiftCard.update(cardId, {
            status: 'used',
            used_order_number: data.order_number,
          });
        }
        queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      }

      // Create rewards — split or single
      if (data.payment_splits?.length > 1) {
        for (const sp of data.payment_splits) {
          const card = creditCards.find(c => c.id === sp.card_id);
          if (!card) continue;
          const rate = card.cashback_rate || 0;
          const cb   = parseFloat((sp.amount * rate / 100).toFixed(2));
          if (cb > 0) {
            await base44.entities.Reward.create({
              credit_card_id:  sp.card_id,
              card_name:       card.card_name,
              source:          card.card_name,
              type:            'cashback',
              currency:        'USD',
              purchase_amount: sp.amount,
              amount:          cb,
              purchase_order_id: order.id,
              order_number:    order.order_number,
              date_earned:     order.order_date,
              status:          'pending',
              notes:           `Auto from order ${order.order_number} (split: $${sp.amount})`,
            });
          }
        }
        queryClient.invalidateQueries({ queryKey: ['rewards'] });
      } else if (order.credit_card_id && totalCB > 0) {
        const card = creditCards.find(c => c.id === order.credit_card_id);
        if (card) {
          await base44.entities.Reward.create({
            credit_card_id:  order.credit_card_id,
            card_name:       card.card_name,
            source:          card.card_name,
            type:            'cashback',
            currency:        'USD',
            purchase_amount: cashbackBase,
            amount:          parseFloat(totalCB.toFixed(2)),
            purchase_order_id: order.id,
            order_number:    order.order_number,
            date_earned:     order.order_date,
            status:          'pending',
            notes:           `Auto from order ${order.order_number}`,
          });
          queryClient.invalidateQueries({ queryKey: ['rewards'] });
        }
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success('Order created!');
      setReceipts([]);
      setForm(prev => ({
        ...defaultForm(),
        order_type:                  prev.order_type,
        retailer:                    prev.retailer,
        credit_card_id:              prev.credit_card_id,
        include_tax_in_cashback:     prev.include_tax_in_cashback,
        include_shipping_in_cashback: prev.include_shipping_in_cashback,
        amazon_yacb:                 prev.amazon_yacb,
      }));
    },
    onError: () => toast.error('Failed to create order'),
  });

  // ── Submit ──────────────────────────────────────────────────────────────

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.retailer) { toast.error('Vendor is required'); return; }
    const validItems = form.items.filter(it => it.product_name?.trim() && parseFloat(it.unit_cost) > 0);
    if (validItems.length === 0) { toast.error('At least one item with name and price is required'); return; }

    const items = validItems.map(it => ({
      product_id:        it.product_id || null,
      product_name:      it.product_name.trim(),
      upc:               it.upc || null,
      quantity_ordered:  parseInt(it.quantity_ordered) || 1,
      quantity_received: 0,
      unit_cost:         parseFloat(it.unit_cost) || 0,
      sale_price:        parseFloat(it.sale_price) || 0,
    }));

    const orderNumber = form.order_number?.trim() || `ORD-${Date.now()}`;

    // Validate split totals
    if (isSplit) {
      const splitsTotal = form.payment_splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);
      if (Math.abs(splitsTotal - finalCost) > 0.01) {
        toast.error(`Split amounts ($${splitsTotal.toFixed(2)}) must equal final cost ($${finalCost.toFixed(2)})`);
        return;
      }
      if (form.payment_splits.some(sp => !sp.card_id)) {
        toast.error('Please select a card for each split payment');
        return;
      }
    }

    // Primary card = first split or single card
    const primaryCardId = isSplit ? (form.payment_splits[0]?.card_id || null) : (form.credit_card_id || null);
    const primaryCard   = creditCards.find(c => c.id === primaryCardId);

    createMutation.mutate({
      order_type:          form.order_type,
      order_number:        orderNumber,
      tracking_numbers:    form.tracking_numbers.map(t => t.trim()).filter(Boolean),
      sale_date:           form.sale_date   || null,
      payout_date:         form.payout_date || null,
      retailer:            form.retailer,
      buyer:               form.buyer               || null,
      marketplace_platform: form.marketplace_platform || null,
      account:             form.account             || null,
      status:              form.status,
      product_category:    form.product_category    || null,
      order_date:          form.order_date,
      tax,
      shipping_cost:       shipping,
      fees,
      total_cost:          totalCost,
      gift_card_value:     giftCardTotal,
      final_cost:          finalCost,
      credit_card_id:      primaryCardId,
      card_name:           primaryCard?.card_name  || null,
      payment_splits:      isSplit ? form.payment_splits.map(sp => ({
        card_id:   sp.card_id,
        card_name: sp.card_name,
        amount:    parseFloat(sp.amount) || 0,
      })) : [],
      gift_card_ids:       form.gift_card_ids,
      include_tax_in_cashback:     form.include_tax_in_cashback,
      include_shipping_in_cashback: form.include_shipping_in_cashback,
      extra_cashback_percent: form.amazon_yacb && isAmazon ? 5 : 0,
      bonus_notes:         form.amazon_yacb && isAmazon ? 'Prime Young Adult' : null,
      notes:               form.notes || null,
      has_receipts:        receipts.length > 0,
      items,
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Add New Order</h1>
        <p className="text-sm text-slate-400 mt-1">Record a new purchase — pick your mode and fill in the details</p>
      </div>

      {/* Mode toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button type="button" onClick={() => set('order_type', 'churning')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all
              ${form.order_type === 'churning' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
            <Tag className="h-4 w-4" /> Churning
          </button>
          <button type="button" onClick={() => set('order_type', 'marketplace')}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all
              ${form.order_type === 'marketplace' ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
            <Globe className="h-4 w-4" /> Marketplace
          </button>
        </div>
        <p className="text-xs text-slate-400">
          {form.order_type === 'churning'
            ? 'Wholesale buyer transactions (buy → ship → scan → get paid)'
            : 'Marketplace sales (Amazon, eBay, Mercari, etc.)'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* ORDER ITEMS */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
              <SectionHeader icon={Package} label="Order Items" color="purple" />
              <div className="space-y-3">
                {form.items.map((item, idx) => (
                  <div key={item.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-purple-500">Item {idx + 1}</span>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => duplicateItem(item.id)} title="Duplicate"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {form.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(item.id)} title="Remove"
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-3">
                      <div className="col-span-2 sm:col-span-3 space-y-1">
                        <Label className="text-xs text-slate-400">Product Name *</Label>
                        <ProductAutocomplete
                          products={products}
                          nameValue={item.product_name}
                          upcValue={item.upc}
                          searchField="name"
                          onSelect={(p) => {
                            updateItem(item.id, 'product_id',   p.id);
                            updateItem(item.id, 'product_name', p.name);
                            updateItem(item.id, 'upc',          p.upc || '');
                          }}
                          onChangeName={(v) => updateItem(item.id, 'product_name', v)}
                          placeholder="e.g. iPad Air"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Unit Price *</Label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                          <Input className="pl-6 h-9" type="number" step="0.01" min="0"
                           style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}
                           value={item.unit_cost}
                           onChange={(e) => updateItem(item.id, 'unit_cost', e.target.value)}
                           placeholder="0.00" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Qty</Label>
                        <Input className="h-9 text-center" type="number" min="1"
                          style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}
                          value={item.quantity_ordered}
                          onChange={(e) => updateItem(item.id, 'quantity_ordered', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Total</Label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                          <Input className="pl-6 h-9" readOnly
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)' }}
                            value={((parseFloat(item.unit_cost) || 0) * (parseInt(item.quantity_ordered) || 1)).toFixed(2)} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">SKU / UPC</Label>
                        <ProductAutocomplete
                          products={products}
                          nameValue={item.product_name}
                          upcValue={item.upc}
                          searchField="upc"
                          onSelect={(p) => {
                            updateItem(item.id, 'product_id',   p.id);
                            updateItem(item.id, 'product_name', p.name);
                            updateItem(item.id, 'upc',          p.upc || '');
                          }}
                          onChangeUpc={(v) => updateItem(item.id, 'upc', v)}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Sale Price (per unit)</Label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                          <Input className="pl-6 h-9" type="number" step="0.01" min="0"
                            style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}
                            value={item.sale_price}
                            onChange={(e) => updateItem(item.id, 'sale_price', e.target.value)}
                            placeholder="0.00" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Category</Label>
                        <Select value={form.product_category} onValueChange={(v) => set('product_category', v)}>
                        <SelectTrigger className="h-9 text-xs text-slate-200" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.1)' }}><SelectValue placeholder="Category..." /></SelectTrigger>
                          <SelectContent>
                            {PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addItem}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-purple-400 text-sm font-medium transition"
                style={{ border: '2px dashed rgba(124,58,237,0.3)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Plus className="h-4 w-4" /> Add Another Item
              </button>

              {itemsSubtotal > 0 && (
                <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <span className="text-xs text-purple-400">
                    {form.items.filter(it => parseFloat(it.unit_cost) > 0).length} item(s)
                  </span>
                  <span className="text-sm font-semibold text-purple-300">Order Total: {fmt$(itemsSubtotal)}</span>
                </div>
              )}
            </div>

            {/* PURCHASE DETAILS */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
              <SectionHeader icon={ShoppingCart} label="Purchase Details" color="blue" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Tax</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <Input className="pl-6" type="number" step="0.01" min="0"
                      style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}
                      value={form.tax} onChange={e => set('tax', e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Shipping</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <Input className="pl-6" type="number" step="0.01" min="0"
                      style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}
                      value={form.shipping_cost} onChange={e => set('shipping_cost', e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Fees</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <Input className="pl-6" type="number" step="0.01" min="0"
                      style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}
                      value={form.fees} onChange={e => set('fees', e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Order Date</Label>
                  <Input type="date"
                    style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}
                    value={form.order_date} onChange={e => set('order_date', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Sale Date <span className="text-slate-500">(optional)</span></Label>
                  <Input type="date"
                    style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}
                    value={form.sale_date} onChange={e => set('sale_date', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Payout Date <span className="text-slate-500">(optional)</span></Label>
                  <Input type="date"
                    style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}
                    value={form.payout_date} onChange={e => set('payout_date', e.target.value)} />
                </div>
              </div>
            </div>

            {/* VENDOR & BUYER */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <SectionHeader icon={Truck} label="Vendor & Buyer" color="amber" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Vendor / Store *</Label>
                  <Select value={form.retailer} onValueChange={(v) => set('retailer', v)}>
                    <SelectTrigger className="text-slate-200" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.1)' }}><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                    <SelectContent>
                      {RETAILERS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {form.order_type === 'churning' ? (
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">Buyer</Label>
                    <Select value={form.buyer} onValueChange={(v) => set('buyer', v)}>
                      <SelectTrigger className="text-slate-200" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.1)' }}><SelectValue placeholder="Select buyer..." /></SelectTrigger>
                      <SelectContent>
                        {sellers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">Marketplace</Label>
                    <Select value={form.marketplace_platform} onValueChange={(v) => set('marketplace_platform', v)}>
                      <SelectTrigger className="text-slate-200" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.1)' }}><SelectValue placeholder="Select platform..." /></SelectTrigger>
                      <SelectContent>
                        {['eBay', 'Amazon', 'Facebook Marketplace', 'Mercari', 'OfferUp', 'Craigslist', 'Other']
                          .map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Status</Label>
                  <Select value={form.status} onValueChange={(v) => set('status', v)}>
                    <SelectTrigger className="text-slate-200" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.1)' }}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Order Number</Label>
                  <Input value={form.order_number}
                    style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}
                    onChange={e => set('order_number', e.target.value)} placeholder="e.g. 112-3456789" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Account</Label>
                  <Input value={form.account}
                    style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}
                    onChange={e => set('account', e.target.value)} placeholder="Account used" />
                </div>
              </div>

              {/* Multiple tracking numbers */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Tracking Number(s)</Label>
                <div className="space-y-2">
                  {form.tracking_numbers.map((tn, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input className="flex-1" value={tn}
                        style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}
                        onChange={e => updateTracking(idx, e.target.value)}
                        placeholder="e.g. 1Z999AA10123456784" />
                      {form.tracking_numbers.length > 1 && (
                        <button type="button" onClick={() => removeTracking(idx)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition flex-shrink-0">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addTracking}
                    className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium transition">
                    <Plus className="h-3 w-3" /> Add tracking number
                  </button>
                </div>
              </div>

              {/* Receipt upload */}
              <div className="mt-4 space-y-2">
                <Label className="text-xs text-slate-400">Receipts <span className="text-slate-400">(PNG or PDF, optional)</span></Label>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(245,158,11,0.3)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(245,158,11,0.6)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)'}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500">Attach receipts...</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.pdf,image/png,application/pdf"
                    multiple
                    className="hidden"
                    onChange={e => { if (e.target.files?.length) addReceipts(e.target.files); e.target.value = ''; }}
                  />
                </div>
                {receipts.length > 0 && (
                  <div className="space-y-1.5">
                    {receipts.map((file, idx) => (
                      <div key={idx}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-400 truncate">{file.name}</span>
                        </div>
                        <button type="button" onClick={() => removeReceipt(idx)}
                          className="p-1 text-slate-400 hover:text-red-400 flex-shrink-0 transition">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* PAYMENT & CASHBACK */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.15)' }}>
              <SectionHeader icon={CreditCard} label="Payment & Cashback" color="pink" />

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-400">Payment Method(s)</Label>
                  {!isSplit && (
                    <button type="button"
                      onClick={() => {
                        const splits = form.credit_card_id
                          ? [{ card_id: form.credit_card_id, card_name: selectedCard?.card_name || '', amount: finalCost > 0 ? finalCost.toFixed(2) : '' }]
                          : [{ card_id: '', card_name: '', amount: '' }];
                        set('payment_splits', [...splits, { card_id: '', card_name: '', amount: '' }]);
                      }}
                      className="text-xs text-pink-600 hover:text-pink-700 font-medium flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Split payment
                    </button>
                  )}
                  {isSplit && (
                    <button type="button"
                      onClick={() => {
                        const first = form.payment_splits[0];
                        set('payment_splits', []);
                        set('credit_card_id', first?.card_id || '');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 font-medium">
                      Use single card
                    </button>
                  )}
                </div>

                {isSplit ? (
                  <SplitPaymentInput
                    splits={form.payment_splits}
                    onChange={(splits) => set('payment_splits', splits)}
                    creditCards={creditCards}
                    totalRequired={finalCost}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Select value={form.credit_card_id} onValueChange={(v) => set('credit_card_id', v)}>
                        <SelectTrigger className="text-slate-200" style={{ background: '#0d1117', borderColor: 'rgba(255,255,255,0.1)' }}>
                          {form.credit_card_id
                            ? <span>{selectedCard?.card_name}</span>
                            : <SelectValue placeholder="Select card..." />}
                        </SelectTrigger>
                        <SelectContent>
                          {creditCards.filter(c => c.active !== false).map(c =>
                            <SelectItem key={c.id} value={c.id}>{c.card_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <div className="relative">
                        <Input className="pr-8" type="number" step="0.1" min="0"
                          style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}
                          value={form.cashback_rate_override || cardRate || ''}
                          onChange={e => set('cashback_rate_override', e.target.value)}
                          placeholder={cardRate ? String(cardRate) : '0 %'} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <Input className="pl-6 font-medium" readOnly
                          style={{ background: 'rgba(255,255,255,0.05)', color: '#34d399', borderColor: 'rgba(255,255,255,0.1)' }}
                          value={totalCB.toFixed(2)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Gift card chip picker */}
              <div className="mb-4">
                <GiftCardPicker
                  giftCards={giftCards}
                  selectedIds={form.gift_card_ids}
                  onChange={(ids) => set('gift_card_ids', ids)}
                  retailer={form.retailer}
                />
              </div>

              {/* Cashback checkboxes + YA toggle */}
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-300">
                <input type="checkbox" checked={form.include_tax_in_cashback}
                  onChange={e => set('include_tax_in_cashback', e.target.checked)} className="rounded" />
                Include tax in cashback
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-300">
                <input type="checkbox" checked={form.include_shipping_in_cashback}
                  onChange={e => set('include_shipping_in_cashback', e.target.checked)} className="rounded" />
                Include shipping in cashback
                </label>
                {isAmazon && (
                <label className={`flex items-center gap-2 text-sm cursor-pointer px-3 py-1.5 rounded-lg border transition
                  ${form.amazon_yacb ? 'bg-amber-500/20 border-amber-400/50 text-amber-300' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                    <input type="checkbox" checked={form.amazon_yacb}
                      onChange={e => set('amazon_yacb', e.target.checked)} className="rounded" />
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Amazon Young Adult 5%
                  </label>
                )}
              </div>

              {/* Cashback breakdown */}
              {totalCB > 0 && (
                <div className="mt-3 p-3 rounded-xl text-xs space-y-1" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                    <Info className="h-3 w-3" /> Cashback Breakdown
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>
                      Cashback base
                      {form.include_tax_in_cashback      ? ' + tax'      : ''}
                      {form.include_shipping_in_cashback ? ' + shipping' : ''}
                    </span>
                    <span>{fmt$(cashbackBase)}</span>
                  </div>
                  {cardCB > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Card cashback ({cardRate}%)</span>
                      <span className="text-emerald-400">+{fmt$(cardCB)}</span>
                    </div>
                  )}
                  {yaCB > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Amazon Young Adult (5%)</span>
                      <span className="text-amber-400">+{fmt$(yaCB)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-1" style={{ borderTop: '1px solid rgba(16,185,129,0.2)' }}>
                    <span className="text-slate-300">Total cashback</span>
                    <span className="text-emerald-400">{fmt$(totalCB)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* NOTES */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Notes</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Any additional notes..." rows={2}
                style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }} />
            </div>
          </div>

          {/* ── RIGHT COLUMN — sticky summary ───────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6 space-y-4">

              {/* Order Summary */}
              <div className="rounded-2xl p-5 space-y-3" style={{ background: '#111827', border: '1px solid rgba(124,58,237,0.2)' }}>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-purple-400" /> Order Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <SummaryRow label="Subtotal" value={fmt$(itemsSubtotal)} />
                  {tax      > 0 && <SummaryRow label="Tax"      value={`+${fmt$(tax)}`}      />}
                  {shipping > 0 && <SummaryRow label="Shipping" value={`+${fmt$(shipping)}`} />}
                  {fees     > 0 && <SummaryRow label="Fees"     value={`+${fmt$(fees)}`}     />}
                  <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <SummaryRow label="Total Cost" value={fmt$(totalCost)} bold />
                  </div>
                  {giftCardTotal > 0 && (
                    <SummaryRow label="Gift Cards" value={`-${fmt$(giftCardTotal)}`} color="text-amber-400" />
                  )}
                  {giftCardTotal > 0 && (
                    <SummaryRow label="Final Cost" value={fmt$(finalCost)} bold />
                  )}
                  {totalCB > 0 && (
                    <SummaryRow label="Cashback" value={`+${fmt$(totalCB)}`} color="text-emerald-400" />
                  )}
                  {totalSalePrice > 0 && (
                    <>
                      <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <SummaryRow label="Sale Total" value={fmt$(totalSalePrice)} color="text-blue-400" />
                      </div>
                      {commission !== 0 && (
                        <SummaryRow
                          label="Commission"
                          value={commission >= 0 ? `+${fmt$(commission)}` : `-${fmt$(Math.abs(commission))}`}
                          color={commission >= 0 ? 'text-emerald-400' : 'text-red-400'}
                        />
                      )}
                      <SummaryRow label="Net Profit" value={fmt$(netProfit)}
                        color={netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'} bold />
                      <SummaryRow label="ROI" value={`${roi.toFixed(1)}%`}
                        color={roi >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                    </>
                  )}
                </div>
              </div>

              {/* Mode badge */}
              <div className={`rounded-xl px-4 py-3 flex items-center gap-3`}
                style={{
                  background: form.order_type === 'churning' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                  border: `1px solid ${form.order_type === 'churning' ? 'rgba(245,158,11,0.25)' : 'rgba(59,130,246,0.25)'}`,
                }}>
                {form.order_type === 'churning'
                  ? <Tag className="h-4 w-4 text-amber-400" />
                  : <Globe className="h-4 w-4 text-blue-400" />}
                <div>
                  <p className={`text-sm font-semibold ${form.order_type === 'churning' ? 'text-amber-300' : 'text-blue-300'}`}>
                    {form.order_type === 'churning' ? 'Churning Mode' : 'Marketplace Mode'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {form.buyer || form.marketplace_platform
                      ? `Buyer: ${form.buyer || form.marketplace_platform}`
                      : 'No buyer selected'}
                  </p>
                </div>
              </div>

              {/* Receipts indicator */}
              {receipts.length > 0 && (
                <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Paperclip className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} attached
                    </p>
                    <p className="text-xs text-slate-500">Will be saved with this order</p>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={createMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition disabled:opacity-50 shadow-sm">
                {createMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add {form.items.filter(it => it.product_name?.trim() && parseFloat(it.unit_cost) > 0).length || ''} Order(s)
                  </>
                )}
              </button>

              <button type="button" onClick={() => window.history.back()}
                className="w-full py-2.5 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancel — Back to Transactions
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}