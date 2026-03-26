import React, { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Upload, FileText, Mail, X, Check, Loader, AlertCircle,
  ChevronDown, ChevronUp, Plus, Trash2, Edit2, Package,
  Tag, Globe, DollarSign, Gift, Hash, Truck, Calendar,
  RefreshCw, Lock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ── helpers ───────────────────────────────────────────────────────────────

const fmt$ = (v) => `$${(parseFloat(v) || 0).toFixed(2)}`;
const today = () => format(new Date(), 'yyyy-MM-dd');

const RETAILERS = [
  'Amazon', 'Best Buy', 'Walmart', 'Target', 'Costco',
  "Sam's Club", 'eBay', 'Woot', 'Apple', 'Other',
];

const RETAILER_DOMAINS = {
  'Amazon':     'amazon.com',
  'Best Buy':   'bestbuy.com',
  'Walmart':    'walmart.com',
  'Target':     'target.com',
  'Costco':     'costco.com',
  "Sam's Club": 'samsclub.com',
  'eBay':       'ebay.com',
  'Woot':       'woot.com',
  'Apple':      'apple.com',
};

function RetailerLogo({ retailer }) {
  const domain = RETAILER_DOMAINS[retailer] || `${(retailer || '').toLowerCase().replace(/\s+/g, '')}.com`;
  const [error, setError] = useState(false);
  if (!retailer || error) {
    return (
      <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
        <FileText className="h-4 w-4 text-violet-500" />
      </div>
    );
  }
  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={retailer}
      className="w-9 h-9 rounded-xl object-contain border border-slate-100 bg-white flex-shrink-0"
      onError={() => setError(true)}
    />
  );
}

function ProductImage({ upc, name, savedImage }) {
  const [imgUrl, setImgUrl] = useState(savedImage || null);

  useEffect(() => {
    if (savedImage) { setImgUrl(savedImage); return; }
    if (!upc) return;
    const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        const img = d?.items?.[0]?.images?.[0];
        if (img) setImgUrl(img);
      })
      .catch(() => {});
  }, [upc, savedImage]);

  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        alt={name}
        className="w-12 h-12 rounded-lg object-contain border border-slate-200 bg-white flex-shrink-0"
        onError={() => setImgUrl(null)}
      />
    );
  }

  return (
    <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center flex-shrink-0">
      <Package className="h-5 w-5 text-slate-300" />
    </div>
  );
}

// No longer needed — extraction happens server-side



// ── Sub-components ────────────────────────────────────────────────────────

function TabButton({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
        active
          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
          : 'text-slate-500 border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {badge && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
          active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function DropZone({ onFiles, loading }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      f => f.type === 'application/pdf' || f.type.startsWith('image/')
    );
    if (files.length) onFiles(files);
  }, [onFiles]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
        dragging
          ? 'border-violet-400 bg-violet-50'
          : 'border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50/50'
      } ${loading ? 'pointer-events-none opacity-60' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,image/*"
        className="hidden"
        onChange={e => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); e.target.value = ''; }}
      />
      {loading ? (
        <>
          <Loader className="h-8 w-8 text-violet-500 animate-spin" />
          <p className="text-sm font-medium text-violet-600">Extracting order data...</p>
          <p className="text-xs text-slate-400">Claude is reading your invoice</p>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center">
            <Upload className="h-6 w-6 text-violet-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">Drop invoices here or click to upload</p>
            <p className="text-xs text-slate-400 mt-1">PDF, PNG, JPG — any retailer order confirmation</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {['Best Buy', 'Amazon', 'Target', 'Walmart', 'Costco'].map(r => (
              <span key={r} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-500">{r}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Review card for a single extracted order
function ReviewCard({
  draft, idx, creditCards, giftCards,
  onUpdate, onConfirm, onDiscard, confirming,
}) {
  const [expanded, setExpanded] = useState(true);
  const [form, setForm] = useState(draft.extracted);
  const set = (k, v) => { const f = { ...form, [k]: v }; setForm(f); onUpdate(idx, f); };
  const setItem = (iid, k, v) => {
    const items = form.items.map(it => it.id === iid ? { ...it, [k]: v } : it);
    set('items', items);
  };
  const removeItem = (iid) => set('items', form.items.filter(it => it.id !== iid));
  const addItem = () => set('items', [...form.items, { id: crypto.randomUUID(), product_name: '', sku: '', quantity: 1, unit_cost: '', total_cost: '' }]);

  const itemsTotal = form.items.reduce((s, it) => s + (parseFloat(it.unit_cost) || 0) * (parseInt(it.quantity) || 1), 0);
  const gcTotal    = (form.gift_cards || []).reduce((s, gc) => s + (parseFloat(gc.amount) || 0), 0);

  const statusColor = {
    pending:  'bg-slate-100 text-slate-600',
    ready:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
    error:    'bg-red-50 text-red-600 border border-red-200',
    confirmed:'bg-violet-50 text-violet-700 border border-violet-200',
  };

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
      draft.status === 'confirmed' ? 'border-emerald-200 opacity-75' :
      draft.status === 'error'     ? 'border-red-200' : 'border-slate-100'
    }`}>
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <RetailerLogo retailer={form.retailer} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {form.retailer || 'Unknown Retailer'}
              {form.order_number && <span className="text-slate-400 font-normal ml-2">#{form.order_number}</span>}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {form.items?.length || 0} item(s) · {fmt$(itemsTotal)}
              {draft.filename && <span className="ml-2">· {draft.filename}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[draft.status] || statusColor.pending}`}>
            {draft.status === 'confirmed' ? 'Saved' :
             draft.status === 'error'     ? 'Error' :
             draft.status === 'ready'     ? 'Ready' : 'Review'}
          </span>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-400">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {draft.status !== 'confirmed' && (
            <button onClick={() => onDiscard(idx)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-400 transition">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {expanded && draft.status !== 'confirmed' && (
        <div className="px-5 py-4 space-y-5">

          {/* Error message */}
          {draft.error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {draft.error}
            </div>
          )}

          {/* Order basics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 flex items-center gap-1"><Tag className="h-3 w-3" /> Retailer</Label>
              <Select value={form.retailer || ''} onValueChange={v => set('retailer', v)}>
                <SelectTrigger className="h-9 bg-slate-50"><SelectValue placeholder="Select retailer..." /></SelectTrigger>
                <SelectContent>
                  {RETAILERS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 flex items-center gap-1"><Hash className="h-3 w-3" /> Order #</Label>
              <Input className="h-9 bg-slate-50" value={form.order_number || ''} onChange={e => set('order_number', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> Order Date</Label>
              <Input className="h-9 bg-slate-50" type="date" value={form.order_date || today()} onChange={e => set('order_date', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Order Type</Label>
              <Select value={form.order_type_hint || 'churning'} onValueChange={v => set('order_type_hint', v)}>
                <SelectTrigger className="h-9 bg-slate-50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="churning"><span className="flex items-center gap-1.5"><Tag className="h-3 w-3 text-amber-500" /> Churning</span></SelectItem>
                  <SelectItem value="marketplace"><span className="flex items-center gap-1.5"><Globe className="h-3 w-3 text-blue-500" /> Marketplace</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tracking numbers */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500 flex items-center gap-1"><Truck className="h-3 w-3" /> Tracking Number(s)</Label>
            {(form.tracking_numbers?.length ? form.tracking_numbers : ['']).map((tn, ti) => (
              <div key={ti} className="flex items-center gap-2">
                <Input className="h-9 bg-slate-50 flex-1" value={tn}
                  onChange={e => {
                    const t = [...(form.tracking_numbers || [''])];
                    t[ti] = e.target.value;
                    set('tracking_numbers', t);
                  }}
                  placeholder="e.g. 1Z999AA10123456784" />
                {(form.tracking_numbers?.length || 1) > 1 && (
                  <button type="button" onClick={() => set('tracking_numbers', form.tracking_numbers.filter((_, i) => i !== ti))}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button type="button"
              onClick={() => set('tracking_numbers', [...(form.tracking_numbers || ['']), ''])}
              className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 font-medium">
              <Plus className="h-3 w-3" /> Add tracking number
            </button>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-500 flex items-center gap-1"><Package className="h-3 w-3" /> Items</Label>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 font-medium">
                <Plus className="h-3 w-3" /> Add item
              </button>
            </div>
            {(form.items || []).map((item) => (
              <div key={item.id} className="p-3 bg-slate-50 rounded-xl space-y-2">
                {/* Row 1: image + name + remove */}
                <div className="flex items-center gap-2">
                  <ProductImage upc={item.upc || item.sku} name={item.product_name} savedImage={item._saved_image || item._upc_lookup_image} />
                  <div className="flex-1 min-w-0">
                    <Input className="h-8 text-xs bg-white w-full" value={item.product_name || ''}
                      onChange={e => setItem(item.id, 'product_name', e.target.value)} placeholder="Product name" />
                    {item._matched_product && (
                      <p className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                        <Check className="h-2.5 w-2.5" /> Matched: {item._matched_product}
                      </p>
                    )}
                  </div>
                  <button onClick={() => removeItem(item.id)} className="p-1 rounded-lg text-red-400 hover:bg-red-50 transition flex-shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {/* Row 2: UPC/SKU + qty + price + total */}
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <p className="text-[10px] text-slate-400 mb-0.5">UPC / SKU</p>
                    <Input className="h-8 text-xs bg-white" value={item.sku || ''}
                      onChange={e => setItem(item.id, 'sku', e.target.value)} placeholder="UPC or SKU" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 mb-0.5">Qty</p>
                    <Input className="h-8 text-xs bg-white text-center" type="number" min="1"
                      value={item.quantity || 1} onChange={e => setItem(item.id, 'quantity', e.target.value)} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 mb-0.5">Unit Price</p>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      <Input className="h-8 text-xs bg-white pl-5" type="number" step="0.01"
                        value={item.unit_cost || ''} onChange={e => setItem(item.id, 'unit_cost', e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 mb-0.5">Total</p>
                    <div className="h-8 flex items-center px-2 bg-slate-100 rounded-md text-xs font-semibold text-slate-600">
                      {fmt$((parseFloat(item.unit_cost) || 0) * (parseInt(item.quantity) || 1))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Name · SKU · Qty · Unit Price · Total</span>
              <span className="font-semibold text-slate-600">{fmt$(itemsTotal)} subtotal</span>
            </div>
          </div>

          {/* Tax / shipping / fees */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Tax</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <Input className="h-9 bg-slate-50 pl-6 text-sm" type="number" step="0.01"
                  value={form.tax || ''} onChange={e => set('tax', e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Shipping</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <Input className="h-9 bg-slate-50 pl-6 text-sm" type="number" step="0.01"
                  value={form.shipping_cost || ''} onChange={e => set('shipping_cost', e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Fees</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <Input className="h-9 bg-slate-50 pl-6 text-sm" type="number" step="0.01"
                  value={form.fees || ''} onChange={e => set('fees', e.target.value)} placeholder="0.00" />
              </div>
            </div>
          </div>

          {/* Gift cards detected */}
          {(form.gift_cards || []).length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-500 flex items-center gap-1">
                <Gift className="h-3 w-3 text-amber-500" /> Gift Cards Detected
              </Label>
              <div className="flex flex-wrap gap-2">
                {form.gift_cards.map((gc, gi) => {
                  const matched = giftCards.find(g =>
                    g.last_four === gc.last_four || String(g.id).endsWith(gc.last_four)
                  );
                  return (
                    <div key={gi} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                      matched ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <Gift className="h-3 w-3" />
                      ••••{gc.last_four} — {fmt$(gc.amount)}
                      {matched && <span className="text-emerald-600 font-semibold">✓ matched</span>}
                      {!matched && <span className="text-slate-400">(not in system)</span>}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400">
                Total gift cards: {fmt$(gcTotal)}
              </p>
            </div>
          )}

          {/* Payment method */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Payment Method</Label>
            <Select value={form.credit_card_id || ''} onValueChange={v => set('credit_card_id', v)}>
              <SelectTrigger className="bg-slate-50 h-9">
                <SelectValue placeholder={
                  form.payment_method_last_four
                    ? `Card ending ••••${form.payment_method_last_four} — select to match`
                    : 'Select payment method...'
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No card</SelectItem>
                {creditCards.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.card_name}{c.last_four ? ` (••••${c.last_four})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.payment_method_last_four && (
              <p className="text-xs text-slate-400">
                Invoice shows card ending ••••{form.payment_method_last_four}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Notes</Label>
            <Textarea className="bg-slate-50 text-sm resize-none" rows={2}
              value={form.notes || ''} onChange={e => set('notes', e.target.value)}
              placeholder="Any additional notes..." />
          </div>

          {/* Order total summary */}
          <div className="flex items-center justify-between p-3 bg-violet-50 border border-violet-100 rounded-xl text-sm">
            <div className="space-y-0.5">
              <p className="text-xs text-slate-500">Items {fmt$(itemsTotal)} + tax {fmt$(form.tax || 0)} + shipping {fmt$(form.shipping_cost || 0)}</p>
              {gcTotal > 0 && <p className="text-xs text-amber-600">Gift cards: −{fmt$(gcTotal)}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Final cost</p>
              <p className="text-base font-bold text-violet-700">
                {fmt$(itemsTotal + (parseFloat(form.tax) || 0) + (parseFloat(form.shipping_cost) || 0) + (parseFloat(form.fees) || 0) - gcTotal)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => onConfirm(idx, form)}
              disabled={confirming || !form.retailer || !form.items?.length}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {confirming ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {confirming ? 'Saving...' : 'Confirm & Save Order'}
            </button>
            <button onClick={() => onDiscard(idx)}
              className="px-4 py-2.5 rounded-xl text-sm text-slate-500 border border-slate-200 hover:bg-slate-50 transition">
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Confirmed state */}
      {draft.status === 'confirmed' && (
        <div className="px-5 py-3 flex items-center gap-2 text-sm text-emerald-600">
          <Check className="h-4 w-4" />
          Order saved successfully
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function ImportOrders() {
  const queryClient = useQueryClient();
  const [tab, setTab]       = useState('upload');
  const [drafts, setDrafts] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [confirmingIdx, setConfirmingIdx] = useState(null);

  const { data: creditCards = [] } = useQuery({
    queryKey: ['creditCards'],
    queryFn: () => base44.entities.CreditCard.list(),
  });
  const { data: giftCards = [] } = useQuery({
    queryKey: ['giftCards'],
    queryFn: () => base44.entities.GiftCard.list(),
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  // Match extracted items against saved products by SKU or name similarity
  const matchItemsToProducts = (items) => {
    return items.map(item => {
      // Try SKU/UPC match first
      let matched = products.find(p =>
        item.sku && p.upc && String(p.upc) === String(item.sku)
      );
      // Fallback: name match (normalize)
      if (!matched && item.product_name) {
        const normalize = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const itemNorm = normalize(item.product_name);
        matched = products.find(p => {
          const pNorm = normalize(p.name);
          return itemNorm && pNorm && (itemNorm.includes(pNorm) || pNorm.includes(itemNorm));
        });
      }
      if (matched) {
        return {
          ...item,
          product_id: matched.id,
          product_name: item.product_name || matched.name,
          sku: item.sku || matched.upc || '',
          upc: matched.upc || item.sku || '',
          _matched_product: matched.name,
          _saved_image: matched.image || null,
        };
      }
      return item;
    });
  };

  // ── Extract from files ──────────────────────────────────────────────────

  const handleFiles = async (files) => {
    setExtracting(true);
    const newDrafts = [];

    for (const file of files) {
      try {
        // Upload file to get a public URL
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        // Call backend function to extract via GPT-4o
        const res = await base44.functions.invoke('extractInvoice', {
          file_url,
          file_type: file.type,
        });

        const extracted = res.data.extracted;

        // Add unique IDs to items
        extracted.items = (extracted.items || []).map(it => ({
          ...it,
          id: crypto.randomUUID(),
        }));

        // Match items against saved products to fill in UPC
        extracted.items = matchItemsToProducts(extracted.items);

        // For items with a UPC but weak/missing product name, look up via upcitemdb
        extracted.items = await Promise.all(extracted.items.map(async (item) => {
          const upc = item.upc || item.sku;
          const nameLooksWeak = !item.product_name || item.product_name.trim().length < 5;
          if (upc && nameLooksWeak) {
            try {
              const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`);
              const d = await r.json();
              const found = d?.items?.[0];
              if (found?.title) {
                return {
                  ...item,
                  product_name: found.title,
                  _upc_lookup_image: found.images?.[0] || null,
                };
              }
            } catch {}
          }
          return item;
        }));

        // Try to auto-match credit card by last four
        if (extracted.payment_method_last_four) {
          const matched = creditCards.find(c =>
            String(c.last_4_digits) === String(extracted.payment_method_last_four)
          );
          if (matched) extracted.credit_card_id = matched.id;
        }

        newDrafts.push({
          id:        crypto.randomUUID(),
          filename:  file.name,
          status:    'ready',
          extracted,
          error:     null,
        });
      } catch (err) {
        newDrafts.push({
          id:        crypto.randomUUID(),
          filename:  file.name,
          status:    'error',
          extracted: { items: [], gift_cards: [], tracking_numbers: [] },
          error:     `Failed to extract: ${err.message || 'Unknown error'}`,
        });
      }
    }

    setDrafts(prev => [...newDrafts, ...prev]);
    setExtracting(false);
  };

  // ── Update draft ────────────────────────────────────────────────────────

  const handleUpdate = (idx, form) => {
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, extracted: form } : d));
  };

  // ── Discard draft ───────────────────────────────────────────────────────

  const handleDiscard = (idx) => {
    setDrafts(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Confirm + save ──────────────────────────────────────────────────────

  const handleConfirm = async (idx, form) => {
    setConfirmingIdx(idx);
    try {
      const gcTotal = (form.gift_cards || []).reduce((s, gc) => s + (parseFloat(gc.amount) || 0), 0);
      const itemsSubtotal = (form.items || []).reduce(
        (s, it) => s + (parseFloat(it.unit_cost) || 0) * (parseInt(it.quantity) || 1), 0
      );
      const tax      = parseFloat(form.tax)           || 0;
      const shipping = parseFloat(form.shipping_cost) || 0;
      const fees     = parseFloat(form.fees)          || 0;
      const totalCost = itemsSubtotal + tax + shipping + fees;
      const finalCost = totalCost - gcTotal;

      // Match gift cards by last_four
      const matchedGiftCardIds = (form.gift_cards || []).reduce((acc, gc) => {
        const match = giftCards.find(g =>
          String(g.last_four) === String(gc.last_four) && g.status === 'available'
        );
        if (match) acc.push(match.id);
        return acc;
      }, []);

      const order = await base44.entities.PurchaseOrder.create({
        order_type:       form.order_type_hint || 'churning',
        order_number:     form.order_number || `ORD-${Date.now()}`,
        retailer:         form.retailer,
        order_date:       form.order_date || today(),
        status:           'ordered',
        tax,
        shipping_cost:    shipping,
        fees,
        total_cost:       totalCost,
        gift_card_value:  gcTotal,
        final_cost:       finalCost,
        credit_card_id:   form.credit_card_id || null,
        gift_card_ids:    matchedGiftCardIds,
        tracking_numbers: (form.tracking_numbers || []).filter(Boolean),
        notes:            form.notes || null,
        product_name:     form.items?.[0]?.product_name || '',
        items: (form.items || []).map(it => ({
          product_id:        it.product_id || null,
          product_name:      it.product_name,
          upc:               it.upc || it.sku || null,
          sku:               it.sku || null,
          quantity_ordered:  parseInt(it.quantity) || 1,
          quantity_received: 0,
          unit_cost:         parseFloat(it.unit_cost) || 0,
          sale_price:        0,
        })),
        imported_from: 'invoice_upload',
      });

      // Mark gift cards as used
      for (const gcId of matchedGiftCardIds) {
        await base44.entities.GiftCard.update(gcId, {
          status: 'used',
          used_order_number: form.order_number,
        });
      }

      // Auto-create reward if card selected
      if (form.credit_card_id && totalCost > 0) {
        const card = creditCards.find(c => c.id === form.credit_card_id);
        if (card?.cashback_rate) {
          const cashbackBase = finalCost;
          const cashbackAmount = parseFloat((cashbackBase * card.cashback_rate / 100).toFixed(2));
          if (cashbackAmount > 0) {
            await base44.entities.Reward.create({
              credit_card_id:    card.id,
              card_name:         card.card_name,
              source:            card.card_name,
              type:              'cashback',
              currency:          'USD',
              purchase_amount:   cashbackBase,
              amount:            cashbackAmount,
              purchase_order_id: order.id,
              order_number:      form.order_number,
              date_earned:       form.order_date || today(),
              status:            'pending',
              notes:             `Auto from imported order ${form.order_number}`,
            });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['giftCards'] });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });

      setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, status: 'confirmed' } : d));
      toast.success(`Order ${form.order_number || ''} saved!`);
    } catch (err) {
      setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, status: 'error', error: err.message } : d));
      toast.error('Failed to save order');
    } finally {
      setConfirmingIdx(null);
    }
  };

  const pendingCount   = drafts.filter(d => d.status !== 'confirmed').length;
  const confirmedCount = drafts.filter(d => d.status === 'confirmed').length;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 lg:px-8 lg:py-10">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Import Orders</h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload invoices or connect Gmail to auto-import your orders
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <TabButton
          active={tab === 'upload'}
          onClick={() => setTab('upload')}
          icon={Upload}
          label="Upload Invoice"
          badge={pendingCount > 0 ? pendingCount : null}
        />
        <TabButton
          active={tab === 'gmail'}
          onClick={() => setTab('gmail')}
          icon={Mail}
          label="Gmail Sync"
        />
      </div>

      {/* ── UPLOAD TAB ─────────────────────────────────────────────────── */}
      {tab === 'upload' && (
        <div className="space-y-5">
          <DropZone onFiles={handleFiles} loading={extracting} />

          {/* Stats row */}
          {drafts.length > 0 && (
            <div className="flex items-center gap-4 px-1">
              <span className="text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{drafts.length}</span> invoice{drafts.length !== 1 ? 's' : ''} imported
              </span>
              {confirmedCount > 0 && (
                <span className="text-sm text-emerald-600 font-medium">
                  ✓ {confirmedCount} saved
                </span>
              )}
              {pendingCount > 0 && (
                <span className="text-sm text-amber-600 font-medium">
                  {pendingCount} pending review
                </span>
              )}
              <button
                onClick={() => setDrafts(d => d.filter(x => x.status !== 'confirmed'))}
                className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition"
              >
                Clear saved
              </button>
            </div>
          )}

          {/* Review cards */}
          <div className="space-y-4">
            {drafts.map((draft, idx) => (
              <ReviewCard
                key={draft.id}
                draft={draft}
                idx={idx}
                creditCards={creditCards}
                giftCards={giftCards}
                onUpdate={handleUpdate}
                onConfirm={handleConfirm}
                onDiscard={handleDiscard}
                confirming={confirmingIdx === idx}
              />
            ))}
          </div>

          {/* Empty state */}
          {drafts.length === 0 && !extracting && (
            <div className="text-center py-8 text-slate-400 text-sm">
              Upload a PDF or image of any order confirmation to get started
            </div>
          )}
        </div>
      )}

      {/* ── GMAIL TAB — Coming Soon ─────────────────────────────────────── */}
      {tab === 'gmail' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
            <Lock className="h-7 w-7 text-slate-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-700">Gmail Sync — Coming Soon</h2>
            <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto">
              Connect one or more Gmail accounts to automatically detect and import order confirmation emails.
              Orders with the same order number across multiple emails (confirmed, shipped, delivered) will be merged automatically.
            </p>
          </div>

          {/* Feature preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left mt-4">
            {[
              { icon: Mail,       label: 'Multiple accounts',    desc: 'Connect several Gmail addresses' },
              { icon: RefreshCw,  label: 'Auto-merge emails',    desc: 'Same order # = one record'       },
              { icon: Tag,        label: 'Retailer filters',     desc: 'Only scan stores you care about' },
            ].map(f => (
              <div key={f.label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <f.icon className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-600">{f.label}</p>
                  <p className="text-xs text-slate-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400">
            Requires Gmail OAuth setup — available in a future update
          </p>
        </div>
      )}
    </div>
  );
}