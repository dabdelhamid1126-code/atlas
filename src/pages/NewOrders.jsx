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
  Copy, Sparkles, Info, Minus, Paperclip, X, FileText, TrendingUp,
} from 'lucide-react';
import ProductAutocomplete from '@/components/purchase-orders/ProductAutocomplete';
import GiftCardPicker from '@/components/shared/GiftCardPicker';
import SplitPaymentInput from '@/components/payment-methods/SplitPaymentInput';

// ── Constants ─────────────────────────────────────────────────────────────
const RETAILERS = ['Amazon', 'Best Buy', 'Walmart', 'Target', 'Costco', "Sam's Club", 'eBay', 'Woot', 'Apple', 'Other'];
const CHURNING_STATUSES  = [{ value: 'pending', label: 'Pending' }, { value: 'ordered', label: 'Ordered' }, { value: 'shipped', label: 'Shipped' }, { value: 'received', label: 'Received' }];
const MARKETPLACE_STATUSES = [{ value: 'pending', label: 'Pending' }, { value: 'ordered', label: 'Listed' }, { value: 'shipped', label: 'Sold' }, { value: 'received', label: 'Completed' }];
const fmt$ = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;

// ── Input style helper ────────────────────────────────────────────────────
const inp = { background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' };
const inpReadonly = { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)' };

// ── Card wrapper ──────────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  );
}

function CardHeader({ children }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      {children}
    </div>
  );
}

// ── Default factories ─────────────────────────────────────────────────────
const defaultItem = () => ({ id: crypto.randomUUID(), product_id: '', product_name: '', upc: '', quantity_ordered: 1, unit_cost: '', sale_price: '' });

const defaultForm = () => ({
  order_type: 'churning', retailer: '', buyer: '', marketplace_platform: '', account: '',
  order_number: '', tracking_numbers: [''], sale_date: '', payout_date: '', status: 'pending',
  product_category: '', order_date: format(new Date(), 'yyyy-MM-dd'),
  tax: '', shipping_cost: '', fees: '', credit_card_id: '', payment_splits: [],
  gift_card_ids: [], include_tax_in_cashback: true, include_shipping_in_cashback: true,
  amazon_yacb: false, cashback_rate_override: '', notes: '',
  items: [defaultItem(), defaultItem()],
});

// ── Main component ────────────────────────────────────────────────────────
export default function NewOrders() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm());
  const [receipts, setReceipts] = useState([]);
  const fileInputRef = useRef(null);
  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const { data: products    = [] } = useQuery({ queryKey: ['products'],    queryFn: () => base44.entities.Product.list() });
  const { data: creditCards = [] } = useQuery({ queryKey: ['creditCards'], queryFn: () => base44.entities.CreditCard.list() });
  const { data: giftCards   = [] } = useQuery({ queryKey: ['giftCards'],   queryFn: () => base44.entities.GiftCard.list() });
  const { data: sellers     = [] } = useQuery({ queryKey: ['sellers'],     queryFn: () => base44.entities.Seller.list() });

  useEffect(() => {
    setForm(prev => ({ ...defaultForm(), order_type: prev.order_type, retailer: prev.retailer, credit_card_id: prev.credit_card_id, include_tax_in_cashback: prev.include_tax_in_cashback, include_shipping_in_cashback: prev.include_shipping_in_cashback, amazon_yacb: prev.amazon_yacb }));
    setReceipts([]);
  }, [form.order_type]); // eslint-disable-line react-hooks/exhaustive-deps

  // Item helpers
  const updateItem   = (id, f, v) => setForm(prev => ({ ...prev, items: prev.items.map(it => it.id !== id ? it : { ...it, [f]: v }) }));
  const addItem      = () => setForm(prev => ({ ...prev, items: [...prev.items, defaultItem()] }));
  const removeItem   = (id) => setForm(prev => ({ ...prev, items: prev.items.length > 1 ? prev.items.filter(it => it.id !== id) : prev.items }));
  const duplicateItem = (id) => setForm(prev => {
    const idx = prev.items.findIndex(it => it.id === id);
    const copy = { ...prev.items[idx], id: crypto.randomUUID(), product_name: prev.items[idx].product_name + ' (copy)' };
    const items = [...prev.items]; items.splice(idx + 1, 0, copy);
    return { ...prev, items };
  });

  // Tracking helpers
  const updateTracking = (idx, val) => setForm(prev => { const t = [...prev.tracking_numbers]; t[idx] = val; return { ...prev, tracking_numbers: t }; });
  const addTracking    = () => setForm(prev => ({ ...prev, tracking_numbers: [...prev.tracking_numbers, ''] }));
  const removeTracking = (idx) => setForm(prev => ({ ...prev, tracking_numbers: prev.tracking_numbers.length > 1 ? prev.tracking_numbers.filter((_, i) => i !== idx) : [''] }));

  // Receipt helpers
  const addReceipts   = (files) => setReceipts(prev => [...prev, ...Array.from(files)]);
  const removeReceipt = (idx)   => setReceipts(prev => prev.filter((_, i) => i !== idx));

  // Calculations
  const isSplit      = form.payment_splits?.length > 1;
  const primaryCardId = isSplit ? (form.payment_splits[0]?.card_id || '') : form.credit_card_id;
  const selectedCard  = creditCards.find(c => c.id === primaryCardId);
  const isAmazon      = form.retailer === 'Amazon';
  const statuses      = form.order_type === 'churning' ? CHURNING_STATUSES : MARKETPLACE_STATUSES;

  const itemsSubtotal  = useMemo(() => form.items.reduce((s, it) => s + (parseFloat(it.unit_cost) || 0) * (parseInt(it.quantity_ordered) || 1), 0), [form.items]);
  const tax            = parseFloat(form.tax) || 0;
  const shipping       = parseFloat(form.shipping_cost) || 0;
  const fees           = parseFloat(form.fees) || 0;
  const totalCost      = itemsSubtotal + tax + shipping + fees;
  const giftCardTotal  = useMemo(() => form.gift_card_ids.reduce((s, id) => { const gc = giftCards.find(g => g.id === id); return s + (gc?.value || 0); }, 0), [form.gift_card_ids, giftCards]);
  const finalCost      = totalCost - giftCardTotal;
  const cardRate       = parseFloat(form.cashback_rate_override) || selectedCard?.cashback_rate || 0;
  const cashbackBase   = (totalCost - giftCardTotal) - (!form.include_tax_in_cashback ? tax : 0) - (!form.include_shipping_in_cashback ? shipping : 0);
  const splitCashbackTotal = isSplit ? form.payment_splits.reduce((sum, sp) => { const card = creditCards.find(c => c.id === sp.card_id); return sum + ((parseFloat(sp.amount) || 0) * (card?.cashback_rate || 0) / 100); }, 0) : 0;
  const cardCB         = isSplit ? splitCashbackTotal : Math.max(0, cashbackBase) * cardRate / 100;
  const yaCB           = form.amazon_yacb && isAmazon ? Math.min(cashbackBase * 0.05, 100) : 0;
  const totalCB        = cardCB + yaCB;
  const totalSalePrice = useMemo(() => form.items.reduce((s, it) => s + (parseFloat(it.sale_price) || 0) * (parseInt(it.quantity_ordered) || 1), 0), [form.items]);
  const netProfit      = totalSalePrice > 0 ? totalSalePrice - totalCost + totalCB : totalCB - totalCost;
  const roi            = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const validItemCount = form.items.filter(it => it.product_name?.trim() && parseFloat(it.unit_cost) > 0).length;

  // Mutation
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
      setForm(prev => ({ ...defaultForm(), order_type: prev.order_type, retailer: prev.retailer, credit_card_id: prev.credit_card_id, include_tax_in_cashback: prev.include_tax_in_cashback, include_shipping_in_cashback: prev.include_shipping_in_cashback, amazon_yacb: prev.amazon_yacb }));
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
      if (Math.abs(splitsTotal - finalCost) > 0.01) { toast.error(`Split amounts ($${splitsTotal.toFixed(2)}) must equal final cost ($${finalCost.toFixed(2)})`); return; }
      if (form.payment_splits.some(sp => !sp.card_id)) { toast.error('Please select a card for each split payment'); return; }
    }
    const pcId = isSplit ? (form.payment_splits[0]?.card_id || null) : (form.credit_card_id || null);
    const pc   = creditCards.find(c => c.id === pcId);
    createMutation.mutate({
      order_type: form.order_type, order_number: form.order_number?.trim() || `ORD-${Date.now()}`,
      tracking_numbers: form.tracking_numbers.map(t => t.trim()).filter(Boolean),
      sale_date: form.sale_date || null, payout_date: form.payout_date || null,
      retailer: form.retailer, buyer: form.buyer || null, marketplace_platform: form.marketplace_platform || null,
      account: form.account || null, status: form.status, product_category: form.product_category || null,
      order_date: form.order_date, tax, shipping_cost: shipping, fees,
      total_cost: totalCost, gift_card_value: giftCardTotal, final_cost: finalCost,
      credit_card_id: pcId, card_name: pc?.card_name || null,
      payment_splits: isSplit ? form.payment_splits.map(sp => ({ card_id: sp.card_id, card_name: sp.card_name, amount: parseFloat(sp.amount) || 0 })) : [],
      gift_card_ids: form.gift_card_ids,
      include_tax_in_cashback: form.include_tax_in_cashback, include_shipping_in_cashback: form.include_shipping_in_cashback,
      extra_cashback_percent: form.amazon_yacb && isAmazon ? 5 : 0, bonus_notes: form.amazon_yacb && isAmazon ? 'Prime Young Adult' : null,
      notes: form.notes || null, has_receipts: receipts.length > 0,
      items: validItems.map(it => ({ product_id: it.product_id || null, product_name: it.product_name.trim(), upc: it.upc || null, quantity_ordered: parseInt(it.quantity_ordered) || 1, quantity_received: 0, unit_cost: parseFloat(it.unit_cost) || 0, sale_price: parseFloat(it.sale_price) || 0 })),
    });
  };

  const profitColor = netProfit >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="max-w-6xl mx-auto pb-10">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Add Order</h1>
        <p className="text-sm text-slate-400 mt-0.5">Record a new purchase</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

          {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* ── CARD 1: MODE + CORE FIELDS ── */}
            <Card>
              {/* Mode toggle */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <button type="button" onClick={() => set('order_type', 'churning')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${form.order_type === 'churning' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
                    <Tag className="h-3.5 w-3.5" /> Churning
                  </button>
                  <button type="button" onClick={() => set('order_type', 'marketplace')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${form.order_type === 'marketplace' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>
                    <Globe className="h-3.5 w-3.5" /> Marketplace
                  </button>
                </div>
                <span className="text-xs text-slate-500">
                  {form.order_type === 'churning' ? 'Buy → ship → scan → get paid' : 'Amazon, eBay, Mercari, etc.'}
                </span>
              </div>

              {/* Row 1: Vendor | Buyer/Platform | Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Vendor / Store *</Label>
                  <Select value={form.retailer} onValueChange={(v) => set('retailer', v)}>
                    <SelectTrigger className="text-slate-200" style={inp}><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                    <SelectContent>{RETAILERS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.order_type === 'churning' ? (
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">Buyer</Label>
                    <Select value={form.buyer} onValueChange={(v) => set('buyer', v)}>
                      <SelectTrigger className="text-slate-200" style={inp}><SelectValue placeholder="Select buyer..." /></SelectTrigger>
                      <SelectContent>{sellers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-400">Marketplace</Label>
                    <Select value={form.marketplace_platform} onValueChange={(v) => set('marketplace_platform', v)}>
                      <SelectTrigger className="text-slate-200" style={inp}><SelectValue placeholder="Select platform..." /></SelectTrigger>
                      <SelectContent>{['eBay', 'Amazon', 'Facebook Marketplace', 'Mercari', 'OfferUp', 'Craigslist', 'Other'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Status</Label>
                  <Select value={form.status} onValueChange={(v) => set('status', v)}>
                    <SelectTrigger className="text-slate-200" style={inp}><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Order Number | Order Date | Account */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Order Number</Label>
                  <Input style={inp} value={form.order_number} onChange={e => set('order_number', e.target.value)} placeholder="e.g. 112-3456789" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Order Date</Label>
                  <Input type="date" style={inp} value={form.order_date} onChange={e => set('order_date', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Account</Label>
                  <Input style={inp} value={form.account} onChange={e => set('account', e.target.value)} placeholder="Account used" />
                </div>
              </div>
            </Card>

            {/* ── CARD 2: ORDER ITEMS ── */}
            <Card>
              <CardHeader>
                <Package className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-semibold text-slate-200">Order Items</span>
                <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold text-cyan-400" style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.2)' }}>
                  {form.items.length} item{form.items.length !== 1 ? 's' : ''}
                </span>
              </CardHeader>

              {/* Table */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <th className="text-left pb-2 pl-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest w-6">#</th>
                      <th className="text-left pb-2 px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Product</th>
                      <th className="text-left pb-2 px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest w-28">Unit Price</th>
                      <th className="text-left pb-2 px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest w-16">Qty</th>
                      <th className="text-left pb-2 px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest w-28">Sale Price</th>
                      <th className="text-left pb-2 px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest w-20">Total</th>
                      <th className="w-14 pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, idx) => (
                      <tr key={item.id} className="group" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="py-2 pl-1 text-xs text-slate-600 font-mono">{idx + 1}</td>
                        <td className="py-2 px-2">
                          <ProductAutocomplete
                            products={products}
                            nameValue={item.product_name}
                            upcValue={item.upc}
                            searchField="name"
                            onSelect={(p) => { updateItem(item.id, 'product_id', p.id); updateItem(item.id, 'product_name', p.name); updateItem(item.id, 'upc', p.upc || ''); }}
                            onChangeName={(v) => updateItem(item.id, 'product_name', v)}
                            placeholder="Product name..."
                          />
                        </td>
                        <td className="py-2 px-2">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                            <Input className="pl-5 h-8 text-sm" type="number" step="0.01" min="0" style={inp} value={item.unit_cost} onChange={(e) => updateItem(item.id, 'unit_cost', e.target.value)} placeholder="0.00" />
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <Input className="h-8 text-sm text-center" type="number" min="1" style={inp} value={item.quantity_ordered} onChange={(e) => updateItem(item.id, 'quantity_ordered', e.target.value)} />
                        </td>
                        <td className="py-2 px-2">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                            <Input className="pl-5 h-8 text-sm" type="number" step="0.01" min="0" style={inp} value={item.sale_price} onChange={(e) => updateItem(item.id, 'sale_price', e.target.value)} placeholder="0.00" />
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <span className="text-sm text-slate-400 font-mono">
                            {fmt$((parseFloat(item.unit_cost) || 0) * (parseInt(item.quantity_ordered) || 1))}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => duplicateItem(item.id)} title="Duplicate"
                              className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-white/10 transition">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            {form.items.length > 1 && (
                              <button type="button" onClick={() => removeItem(item.id)} title="Remove"
                                className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add item + total */}
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button type="button" onClick={addItem}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition">
                  <Plus className="h-3.5 w-3.5" /> Add Item
                </button>
                {itemsSubtotal > 0 && (
                  <span className="text-xs text-slate-400">
                    Subtotal: <span className="font-semibold text-slate-200">{fmt$(itemsSubtotal)}</span>
                  </span>
                )}
              </div>
            </Card>

            {/* ── CARD 3: COSTS & PAYMENT ── */}
            <Card>
              <CardHeader>
                <CreditCard className="h-4 w-4 text-pink-400" />
                <span className="text-sm font-semibold text-slate-200">Costs & Payment</span>
              </CardHeader>

              {/* Tax | Shipping | Fees | Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Tax</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                    <Input className="pl-5" type="number" step="0.01" min="0" style={inp} value={form.tax} onChange={e => set('tax', e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Shipping</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                    <Input className="pl-5" type="number" step="0.01" min="0" style={inp} value={form.shipping_cost} onChange={e => set('shipping_cost', e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Fees</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                    <Input className="pl-5" type="number" step="0.01" min="0" style={inp} value={form.fees} onChange={e => set('fees', e.target.value)} placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-400">Card</Label>
                    {!isSplit ? (
                      <button type="button" onClick={() => { const splits = form.credit_card_id ? [{ card_id: form.credit_card_id, card_name: selectedCard?.card_name || '', amount: finalCost > 0 ? finalCost.toFixed(2) : '' }] : [{ card_id: '', card_name: '', amount: '' }]; set('payment_splits', [...splits, { card_id: '', card_name: '', amount: '' }]); }}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium">+ Split</button>
                    ) : (
                      <button type="button" onClick={() => { const first = form.payment_splits[0]; set('payment_splits', []); set('credit_card_id', first?.card_id || ''); }}
                        className="text-[10px] text-slate-400 hover:text-slate-200 font-medium">Single</button>
                    )}
                  </div>
                  {!isSplit && (
                    <Select value={form.credit_card_id} onValueChange={(v) => set('credit_card_id', v)}>
                      <SelectTrigger className="text-slate-200" style={inp}>
                        {form.credit_card_id ? <span>{selectedCard?.card_name}</span> : <SelectValue placeholder="Select card..." />}
                      </SelectTrigger>
                      <SelectContent>{creditCards.filter(c => c.active !== false).map(c => <SelectItem key={c.id} value={c.id}>{c.card_name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Split payment */}
              {isSplit && (
                <div className="mb-4">
                  <SplitPaymentInput splits={form.payment_splits} onChange={(splits) => set('payment_splits', splits)} creditCards={creditCards} totalRequired={finalCost} />
                </div>
              )}

              {/* Cashback pill */}
              {!isSplit && (
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                    {cardRate > 0 ? (
                      <span className="text-emerald-400">{cardRate}% cashback → <span className="font-bold">{fmt$(totalCB)}</span> estimated</span>
                    ) : (
                      <span className="text-slate-400">Select a card to see cashback</span>
                    )}
                  </div>
                  {cardRate > 0 && (
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-slate-500 cursor-pointer flex items-center gap-1">
                        <input type="number" step="0.1" min="0" className="w-12 text-xs rounded px-1.5 py-1 text-center" style={inp}
                          value={form.cashback_rate_override || ''} onChange={e => set('cashback_rate_override', e.target.value)} placeholder={String(cardRate)} />
                        <span className="text-slate-500">%</span>
                      </Label>
                    </div>
                  )}
                </div>
              )}

              {/* Gift cards */}
              <div className="mb-4">
                <GiftCardPicker giftCards={giftCards} selectedIds={form.gift_card_ids} onChange={(ids) => set('gift_card_ids', ids)} retailer={form.retailer} />
              </div>

              {/* Checkboxes + YA */}
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={form.include_tax_in_cashback} onChange={e => set('include_tax_in_cashback', e.target.checked)} className="rounded" />
                  Tax in cashback
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={form.include_shipping_in_cashback} onChange={e => set('include_shipping_in_cashback', e.target.checked)} className="rounded" />
                  Shipping in cashback
                </label>
                {isAmazon && (
                  <label className={`flex items-center gap-1.5 text-xs cursor-pointer px-2.5 py-1 rounded-lg border transition ${form.amazon_yacb ? 'text-amber-300 border-amber-400/50' : 'text-slate-400 border-white/10'}`}
                    style={{ background: form.amazon_yacb ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)' }}>
                    <input type="checkbox" checked={form.amazon_yacb} onChange={e => set('amazon_yacb', e.target.checked)} className="rounded" />
                    <Sparkles className="h-3 w-3 text-amber-400" /> Amazon YA 5%
                  </label>
                )}
              </div>

              {/* Cashback breakdown if YA or split */}
              {totalCB > 0 && (yaCB > 0 || isSplit) && (
                <div className="mt-3 p-3 rounded-xl text-xs space-y-1" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1"><Info className="h-3 w-3" /> Cashback Breakdown</div>
                  {cardCB > 0 && <div className="flex justify-between text-slate-400"><span>Card cashback</span><span className="text-emerald-400">+{fmt$(cardCB)}</span></div>}
                  {yaCB > 0 && <div className="flex justify-between text-slate-400"><span>Amazon Young Adult (5%)</span><span className="text-amber-400">+{fmt$(yaCB)}</span></div>}
                  <div className="flex justify-between font-semibold pt-1 text-slate-200" style={{ borderTop: '1px solid rgba(16,185,129,0.15)' }}><span>Total</span><span className="text-emerald-400">{fmt$(totalCB)}</span></div>
                </div>
              )}
            </Card>

            {/* ── CARD 4: TRACKING & RECEIPTS ── */}
            <Card>
              <CardHeader>
                <span className="text-sm font-semibold text-slate-200">Tracking & Receipts</span>
                <span className="text-xs text-slate-500 ml-1">optional</span>
              </CardHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tracking numbers */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Tracking Number(s)</Label>
                  {form.tracking_numbers.map((tn, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input className="flex-1 text-sm" style={inp} value={tn} onChange={e => updateTracking(idx, e.target.value)} placeholder="e.g. 1Z999AA10123456784" />
                      {form.tracking_numbers.length > 1 && (
                        <button type="button" onClick={() => removeTracking(idx)} className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition flex-shrink-0">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addTracking} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition">
                    <Plus className="h-3 w-3" /> Add tracking number
                  </button>
                </div>

                {/* Dates + receipt upload */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Sale Date</Label>
                      <Input type="date" style={inp} value={form.sale_date} onChange={e => set('sale_date', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Payout Date</Label>
                      <Input type="date" style={inp} value={form.payout_date} onChange={e => set('payout_date', e.target.value)} />
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs text-slate-500">{receipts.length > 0 ? `${receipts.length} file(s) attached` : 'Attach receipts (PNG / PDF)...'}</span>
                    <input ref={fileInputRef} type="file" accept=".png,.pdf,image/png,application/pdf" multiple className="hidden" onChange={e => { if (e.target.files?.length) addReceipts(e.target.files); e.target.value = ''; }} />
                  </div>
                  {receipts.length > 0 && receipts.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                        <span className="text-xs text-slate-400 truncate">{file.name}</span>
                      </div>
                      <button type="button" onClick={() => removeReceipt(idx)} className="p-0.5 text-slate-500 hover:text-red-400 transition flex-shrink-0"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* ── NOTES ── */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Notes</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes..." rows={2} style={{ background: '#0d1117', color: 'white', borderColor: 'rgba(255,255,255,0.1)' }} />
            </div>
          </div>

          {/* ── RIGHT COLUMN — sticky summary ── */}
          <div>
            <div className="lg:sticky lg:top-6 space-y-3">

              {/* Hero profit card */}
              <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f2027 0%, #0d1117 60%, #111827 100%)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="px-5 pt-5 pb-4" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.06) 100%)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">Estimated Profit</p>
                  <p className={`text-3xl font-bold leading-tight ${profitColor}`}>{fmt$(netProfit)}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className={roi !== 0 ? (roi >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'}>{roi.toFixed(1)}% ROI</span>
                    <span className="mx-1.5">·</span>
                    {validItemCount} item{validItemCount !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Line items */}
                <div className="px-5 py-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Items subtotal</span>
                    <span className="text-blue-400 font-medium">{fmt$(itemsSubtotal)}</span>
                  </div>
                  {(tax + shipping + fees) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tax + shipping + fees</span>
                      <span className="text-slate-400">+{fmt$(tax + shipping + fees)}</span>
                    </div>
                  )}
                  {giftCardTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gift cards</span>
                      <span className="text-amber-400">−{fmt$(giftCardTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <span className="text-slate-300 font-medium">Total cost</span>
                    <span className="text-white font-semibold">{fmt$(finalCost)}</span>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '6px' }} />
                  {totalCB > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cashback</span>
                      <span className="text-cyan-400 font-medium">+{fmt$(totalCB)}</span>
                    </div>
                  )}
                  {totalSalePrice > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sale total</span>
                      <span className="text-blue-300 font-medium">{fmt$(totalSalePrice)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <span className="font-semibold text-slate-200">Net profit</span>
                    <span className={`font-bold text-base ${profitColor}`}>{fmt$(netProfit)}</span>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <button type="submit" disabled={createMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-bold transition disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', boxShadow: '0 4px 20px rgba(16,185,129,0.25)' }}>
                {createMutation.isPending ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="h-4 w-4" /> Add {validItemCount || ''} Order{validItemCount !== 1 ? 's' : ''}</>
                )}
              </button>

              {/* Cancel */}
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