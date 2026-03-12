import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Flame, Globe, Package, ShoppingCart, Tag, CreditCard, DollarSign, Plus, Minus, ChevronDown, ChevronUp
} from 'lucide-react';

const LABEL_STYLE = { fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', marginBottom: 6, display: 'block', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' };
const INPUT_STYLE = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', padding: '10px 12px', fontSize: 13, outline: 'none', width: '100%' };
const SECTION_STYLE = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px', marginBottom: 16, backdropFilter: 'blur(12px)' };

const CATEGORIES = ['Electronics', 'Phones', 'Tablets', 'Laptops', 'Gaming', 'Accessories', 'Wearables', 'Audio', 'Other'];
const STATUSES = ['Pending', 'Purchased', 'Shipped', 'Delivered', 'Completed'];

function SectionTitle({ icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-5 pb-4 border-b border-[rgba(255,255,255,0.05)]">
      <span className="text-purple-400">{icon}</span>
      <span className="text-xs uppercase font-bold tracking-wider text-white">{label}</span>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="flex flex-col">
      <label style={LABEL_STYLE}>{label}{required && <span className="text-purple-400"> *</span>}</label>
      {children}
    </div>
  );
}

function InputEl({ ...props }) {
  return <input style={INPUT_STYLE} {...props} />;
}

function SelectEl({ children, ...props }) {
  return (
    <select style={{ ...INPUT_STYLE, cursor: 'pointer', appearance: 'none', paddingRight: 28 }} {...props}>
      {children}
    </select>
  );
}

export default function AddTransaction() {
  const [mode, setMode] = useState('churning');
  const [multiItem, setMultiItem] = useState(false);
  const [expandSale, setExpandSale] = useState(false);
  const [creditCards, setCreditCards] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [giftCards, setGiftCards] = useState([]);

  // Form state
  const [form, setForm] = useState({
    orderNumber: '', trackingNumber: '', vendor: '', status: 'Pending',
    productName: '', category: '', sku: '', pickup: false, dropship: false,
    unitPrice: '', quantity: 1, tax: '', shipping: '', fees: '', date: '',
    creditCard: '', selectedGiftCards: [], cashbackRate: '', includeTax: true, includeShipping: true,
    buyer: '', buyerOrderNumber: '', buyerTrackingNumbers: [],
    salePrice: '', saleDate: '', payoutDate: '', notes: ''
  });

  useEffect(() => {
    base44.entities.CreditCard.list().then(setCreditCards).catch(() => {});
    base44.entities.Vendor.list().then(setVendors).catch(() => {});
    base44.entities.Buyer.list().then(setBuyers).catch(() => {});
    base44.entities.GiftCard.list().then(gc => setGiftCards(gc.filter(g => g.status === 'available'))).catch(() => {});
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const totalPrice = useMemo(() => {
    const u = parseFloat(form.unitPrice) || 0;
    return (u * (form.quantity || 1)).toFixed(2);
  }, [form.unitPrice, form.quantity]);

  const giftCardTotal = useMemo(() => {
    return form.selectedGiftCards.reduce((sum, gcId) => {
      const gc = giftCards.find(g => g.id === gcId);
      return sum + (gc?.value || 0);
    }, 0).toFixed(2);
  }, [form.selectedGiftCards, giftCards]);

  const subtotal = useMemo(() => {
    const base = parseFloat(totalPrice) || 0;
    return base + (parseFloat(form.tax) || 0) + (parseFloat(form.shipping) || 0) + (parseFloat(form.fees) || 0);
  }, [totalPrice, form.tax, form.shipping, form.fees]);

  const totalCost = useMemo(() => {
    return (subtotal - parseFloat(giftCardTotal || 0)).toFixed(2);
  }, [subtotal, giftCardTotal]);

  const cashbackAmount = useMemo(() => {
    let base = parseFloat(totalPrice) || 0;
    if (form.includeTax) base += parseFloat(form.tax) || 0;
    if (form.includeShipping) base += parseFloat(form.shipping) || 0;
    const rate = parseFloat(form.cashbackRate) || 0;
    return ((base * rate) / 100).toFixed(2);
  }, [totalPrice, form.tax, form.shipping, form.cashbackRate, form.includeTax, form.includeShipping]);

  const handleSubmit = async () => {
    const items = form.productName ? [{
      product_name: form.productName,
      upc: form.sku,
      quantity_ordered: parseInt(form.quantity) || 1,
      unit_cost: parseFloat(form.unitPrice) || 0,
    }] : [];
    
    await base44.entities.PurchaseOrder.create({
      order_number: form.orderNumber || `TXN-${Date.now()}`,
      retailer: form.vendor,
      mode: mode,
      platform: mode === 'churning' ? form.buyer : undefined,
      status: form.status.toLowerCase().replace(' ', '_'),
      category: form.category.toLowerCase(),
      items,
      total_cost: subtotal,
      final_cost: totalCost,
      gift_card_value: parseFloat(giftCardTotal) || 0,
      is_pickup: form.pickup,
      is_dropship: form.dropship,
      dropship_to: form.dropship ? form.buyer : undefined,
      sale_price: parseFloat(form.salePrice) || undefined,
      order_date: form.date || new Date().toISOString().split('T')[0],
      tracking_number: form.trackingNumber,
      notes: form.notes,
      credit_card_id: form.creditCard || undefined,
      extra_cashback_percent: parseFloat(form.cashbackRate) || 0,
    });
    window.location.href = createPageUrl('Transactions');
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-page-title mb-2">Add Transaction</h1>
        <p className="text-page-subtitle">Record a new purchase — pick your mode</p>
      </div>

      {/* Mode Selector */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'churning', label: 'Churning', icon: Flame, desc: 'Buy → Ship → Scan → Get Paid', sub: 'Wholesale buyer transactions' },
          { key: 'marketplace', label: 'Marketplace', icon: Globe, desc: 'List → Sell → Get Paid', sub: 'eBay, Amazon, Facebook etc.' },
        ].map(m => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`p-6 rounded-[16px] border-2 transition-all text-left ${mode === m.key ? 'border-purple-400 bg-[rgba(124,58,237,0.2)] shadow-lg shadow-purple-500/30' : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.1)]'}`}
              style={{ backdropFilter: 'blur(12px)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Icon size={20} className={mode === m.key ? 'text-purple-400' : 'text-[rgba(255,255,255,0.4)]'} />
                <span className="font-bold text-white text-lg">{m.label}</span>
              </div>
              <p className="text-sm text-white mb-1">{m.desc}</p>
              <p className="text-xs text-[rgba(255,255,255,0.4)]">{m.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Multi-Item Toggle */}
      <div className="mb-8 flex items-center gap-3">
        <input type="checkbox" checked={multiItem} onChange={e => setMultiItem(e.target.checked)} className="w-4 h-4 accent-purple-500 cursor-pointer" />
        <label className="text-sm text-white font-medium cursor-pointer">Multi-Item Order</label>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
        {/* LEFT: MAIN FORM */}
        <div className="flex flex-col gap-6">

          {/* SECTION 1: ORDER DETAILS */}
          <div style={SECTION_STYLE}>
            <SectionTitle icon={<ShoppingCart size={16} />} label="Order Details" />
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Order Number *" required>
                  <InputEl value={form.orderNumber} onChange={e => set('orderNumber', e.target.value)} placeholder="e.g. 114-1234567-8901234" />
                </Field>
                <Field label="Tracking Number">
                  <InputEl value={form.trackingNumber} onChange={e => set('trackingNumber', e.target.value)} placeholder="e.g. 1Z999AA101234567" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Retailer/Vendor *" required>
                  <SelectEl value={form.vendor} onChange={e => set('vendor', e.target.value)}>
                    <option value="">Select vendor</option>
                    {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                  </SelectEl>
                </Field>
                <Field label="Status *">
                  <SelectEl value={form.status} onChange={e => set('status', e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </SelectEl>
                </Field>
              </div>
            </div>
          </div>

          {/* SECTION 2: PRODUCT INFORMATION */}
          <div style={SECTION_STYLE}>
            <SectionTitle icon={<Package size={16} />} label="Product Information" />
            <div className="flex flex-col gap-4">
              <Field label="Product Name *" required>
                <InputEl value={form.productName} onChange={e => set('productName', e.target.value)} placeholder="e.g. Apple AirPods Pro 2nd Gen" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Category *" required>
                  <SelectEl value={form.category} onChange={e => set('category', e.target.value)}>
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </SelectEl>
                </Field>
                <Field label="SKU / UPC">
                  <InputEl value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Optional barcode or SKU" />
                </Field>
              </div>
              <p className="text-xs text-purple-400">Category determines reward points rate</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.pickup} onChange={e => set('pickup', e.target.checked)} className="w-4 h-4 accent-purple-500" />
                  <span className="text-sm text-white">Pickup Order</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.dropship} onChange={e => set('dropship', e.target.checked)} className="w-4 h-4 accent-purple-500" />
                  <span className="text-sm text-white">Dropship Order</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 3: PURCHASE DETAILS */}
          <div style={SECTION_STYLE}>
            <SectionTitle icon={<CreditCard size={16} />} label="Purchase Details" />
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Unit Price *" required>
                  <div className="flex items-center rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)]">
                    <span className="px-3 text-[rgba(255,255,255,0.4)] text-sm">$</span>
                    <input type="number" style={{ background: 'transparent', outline: 'none', color: '#fff', flex: 1, padding: '10px 0 10px 0' }} value={form.unitPrice} onChange={e => set('unitPrice', e.target.value)} placeholder="0.00" />
                  </div>
                </Field>
                <Field label="Quantity">
                  <div className="flex items-center gap-1">
                    <button onClick={() => set('quantity', Math.max(1, form.quantity - 1))} className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.08)] text-white">
                      <Minus size={14} />
                    </button>
                    <input type="number" style={{ ...INPUT_STYLE, textAlign: 'center', flex: 1 }} value={form.quantity} onChange={e => set('quantity', Math.max(1, parseInt(e.target.value) || 1))} min={1} />
                    <button onClick={() => set('quantity', form.quantity + 1)} className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.08)] text-white">
                      <Plus size={14} />
                    </button>
                  </div>
                </Field>
                <Field label="Total Price">
                  <div className="flex items-center rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
                    <span className="px-3 text-[rgba(255,255,255,0.4)] text-sm">$</span>
                    <input type="text" style={{ background: 'transparent', outline: 'none', color: '#fff', flex: 1, padding: '10px 0 10px 0' }} value={totalPrice} disabled />
                  </div>
                </Field>
                <Field label="Date">
                  <InputEl type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[['Tax', 'tax'], ['Shipping', 'shipping'], ['Fees', 'fees']].map(([lbl, key]) => (
                  <Field key={key} label={`${lbl} ($)`}>
                    <div className="flex items-center rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)]">
                      <span className="px-3 text-[rgba(255,255,255,0.4)] text-sm">$</span>
                      <input type="number" style={{ background: 'transparent', outline: 'none', color: '#fff', flex: 1, padding: '10px 0 10px 0' }} value={form[key]} onChange={e => set(key, e.target.value)} placeholder="0.00" />
                    </div>
                  </Field>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 4: PAYMENT & CASHBACK */}
          <div style={SECTION_STYLE}>
            <SectionTitle icon={<CreditCard size={16} />} label="Payment & Cashback" />
            <div className="flex flex-col gap-4">
              <Field label="Credit Card">
                <SelectEl value={form.creditCard} onChange={e => set('creditCard', e.target.value)}>
                  <option value="">Select card (optional)</option>
                  {creditCards.map(c => <option key={c.id} value={c.id}>{c.card_name}</option>)}
                </SelectEl>
              </Field>
              
              {/* Gift Cards Multi-select */}
              <Field label="Gift Cards">
                <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[10px]">
                  {giftCards.length === 0 ? (
                    <p className="text-xs text-[rgba(255,255,255,0.3)]">No available gift cards</p>
                  ) : (
                    giftCards.map(gc => (
                      <label key={gc.id} className="flex items-center gap-2 cursor-pointer hover:bg-[rgba(255,255,255,0.04)] p-2 rounded">
                        <input type="checkbox" checked={form.selectedGiftCards.includes(gc.id)} onChange={e => {
                          if (e.target.checked) {
                            set('selectedGiftCards', [...form.selectedGiftCards, gc.id]);
                          } else {
                            set('selectedGiftCards', form.selectedGiftCards.filter(id => id !== gc.id));
                          }
                        }} className="w-4 h-4 accent-purple-500" />
                        <div className="flex-1 text-sm text-white">{gc.brand}</div>
                        <span className="text-xs text-[rgba(255,255,255,0.4)]">${gc.value} ****{gc.code.slice(-3)}</span>
                      </label>
                    ))
                  )}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Cashback Rate %">
                  <div className="flex items-center rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)]">
                    <input type="number" style={{ background: 'transparent', outline: 'none', color: '#fff', flex: 1, padding: '10px 0 10px 12px' }} value={form.cashbackRate} onChange={e => set('cashbackRate', e.target.value)} placeholder="0.0" />
                    <span className="px-3 text-[rgba(255,255,255,0.4)] text-sm">%</span>
                  </div>
                </Field>
                <Field label="Cashback Amount">
                  <div className="flex items-center rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
                    <span className="px-3 text-[rgba(255,255,255,0.4)] text-sm">$</span>
                    <input type="text" style={{ background: 'transparent', outline: 'none', color: '#fff', flex: 1, padding: '10px 0 10px 0' }} value={cashbackAmount} disabled />
                  </div>
                </Field>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.includeTax} onChange={e => set('includeTax', e.target.checked)} className="w-4 h-4 accent-purple-500" />
                  <span className="text-sm text-white">Include tax</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.includeShipping} onChange={e => set('includeShipping', e.target.checked)} className="w-4 h-4 accent-purple-500" />
                  <span className="text-sm text-white">Include shipping</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 5: BUYER (Churning only) */}
          {mode === 'churning' && (
            <div style={SECTION_STYLE}>
              <SectionTitle icon={<Flame size={16} />} label="Buyer" />
              <div className="flex flex-col gap-4">
                <Field label="Buyer *" required>
                  <SelectEl value={form.buyer} onChange={e => set('buyer', e.target.value)}>
                    <option value="">Select buyer</option>
                    {buyers.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </SelectEl>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Order Number">
                    <InputEl value={form.buyerOrderNumber} onChange={e => set('buyerOrderNumber', e.target.value)} placeholder="Order ref" />
                  </Field>
                  <Field label="Tracking Numbers">
                    <InputEl value={form.buyerTrackingNumbers.join(', ')} onChange={e => set('buyerTrackingNumbers', e.target.value.split(',').map(s => s.trim()))} placeholder="Comma-separated" />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: SALE DETAILS (Collapsible) */}
          <div style={SECTION_STYLE}>
            <button onClick={() => setExpandSale(!expandSale)} className="flex items-center gap-2 w-full text-left mb-4 pb-4 border-b border-[rgba(255,255,255,0.05)]">
              <span className="text-xs uppercase font-bold tracking-wider text-white flex items-center gap-2">
                <DollarSign size={16} className="text-purple-400" />
                Sale Details (Optional)
              </span>
              <div className="ml-auto">{expandSale ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
            </button>
            {expandSale && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Sale Price">
                    <div className="flex items-center rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)]">
                      <span className="px-3 text-[rgba(255,255,255,0.4)] text-sm">$</span>
                      <input type="number" style={{ background: 'transparent', outline: 'none', color: '#fff', flex: 1, padding: '10px 0 10px 0' }} value={form.salePrice} onChange={e => set('salePrice', e.target.value)} placeholder="0.00" />
                    </div>
                  </Field>
                  <Field label="Sale Date">
                    <InputEl type="date" value={form.saleDate} onChange={e => set('saleDate', e.target.value)} />
                  </Field>
                  <Field label="Payout Date">
                    <InputEl type="date" value={form.payoutDate} onChange={e => set('payoutDate', e.target.value)} />
                  </Field>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 7: NOTES */}
          <div style={SECTION_STYLE}>
            <label style={LABEL_STYLE}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes..." rows={4} style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </div>

        {/* RIGHT: SUMMARY SIDEBAR */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-8 lg:h-fit">
          {/* Transaction Summary Card */}
          <div style={SECTION_STYLE}>
            <h3 className="text-xs uppercase font-bold tracking-wider text-white mb-5 pb-4 border-b border-[rgba(255,255,255,0.05)]">Transaction Summary</h3>
            <div className="space-y-3">
              {[
                ['Subtotal', `$${parseFloat(totalPrice || 0).toFixed(2)}`],
                ['Tax', `$${parseFloat(form.tax || 0).toFixed(2)}`],
                ['Shipping', `$${parseFloat(form.shipping || 0).toFixed(2)}`],
                ['Fees', `$${parseFloat(form.fees || 0).toFixed(2)}`],
                [giftCardTotal > 0 ? 'Gift Card' : null, giftCardTotal > 0 ? `-$${giftCardTotal}` : null],
              ].filter(([l]) => l).map(([label, value]) => (
                <div key={label} className="flex justify-between items-center text-sm">
                  <span className="text-[rgba(255,255,255,0.5)]">{label}</span>
                  <span className="text-white">{value}</span>
                </div>
              ))}
              <div className="border-t border-[rgba(255,255,255,0.05)] mt-4 pt-4 flex justify-between items-center">
                <span className="text-sm font-semibold text-white">Total Cost</span>
                <span className="text-lg font-bold text-purple-300">${totalCost}</span>
              </div>
              {parseFloat(cashbackAmount) > 0 && (
                <div className="flex justify-between items-center text-sm text-green-400 mt-2">
                  <span>Cashback</span>
                  <span>+${cashbackAmount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Mode Info Card */}
          <div style={SECTION_STYLE}>
            <div className="flex items-center gap-2 mb-3">
              {mode === 'churning' ? <Flame size={16} className="text-amber-400" /> : <Globe size={16} className="text-blue-400" />}
              <span className={`text-xs uppercase font-bold tracking-wider ${mode === 'churning' ? 'text-amber-400' : 'text-blue-400'}`}>
                {mode === 'churning' ? 'Churning Mode' : 'Marketplace Mode'}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              {form.buyer && <p className="text-[rgba(255,255,255,0.5)]">Buyer: <span className="text-white">{form.buyer}</span></p>}
              {!form.buyer && <p className="text-[rgba(255,255,255,0.3)]">No buyer selected</p>}
              {form.vendor && <p className="text-[rgba(255,255,255,0.5)]">Vendor: <span className="text-white">{form.vendor}</span></p>}
              {form.creditCard && creditCards.find(c => c.id === form.creditCard) && (
                <p className="text-[rgba(255,255,255,0.5)]">Card: <span className="text-white">{creditCards.find(c => c.id === form.creditCard)?.card_name}</span></p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <button onClick={handleSubmit} className="btn-primary-premium w-full py-3 flex items-center justify-center gap-2 text-white font-semibold">
            <Plus size={16} /> Add Transaction
          </button>
          <Link to={createPageUrl('Transactions')} className="text-center text-sm text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.6)] transition-colors">
            Cancel — Back to Transactions
          </Link>
        </div>
      </div>
    </div>
  );
}