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
  const [creditCards, setCreditCards] = useState([]);
  const [sellers, setSellers] = useState([]);

  // Form state
  const [form, setForm] = useState({
    productName: '', category: '', sku: '',
    unitPrice: '', quantity: 1, date: '', tax: '', shipping: '', fees: '',
    vendor: '', buyer: '', status: 'Purchased', orderNumber: '', tracking: '',
    paymentMethod: '', cashbackRate: '', giftCard: '',
    includeTaxCashback: true, includeShippingCashback: true,
    salePerUnit: true, salePrice: '', saleDate: '', payoutDate: '',
    notes: ''
  });

  useEffect(() => {
    base44.entities.CreditCard.list().then(setCreditCards).catch(() => {});
    base44.entities.Seller.list().then(setSellers).catch(() => {});
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const totalPrice = useMemo(() => {
    const u = parseFloat(form.unitPrice) || 0;
    return (u * (form.quantity || 1)).toFixed(2);
  }, [form.unitPrice, form.quantity]);

  const subtotal = useMemo(() => {
    const base = parseFloat(totalPrice) || 0;
    return base + (parseFloat(form.tax) || 0) + (parseFloat(form.shipping) || 0) + (parseFloat(form.fees) || 0);
  }, [totalPrice, form.tax, form.shipping, form.fees]);

  const cashbackAmount = useMemo(() => {
    let base = parseFloat(totalPrice) || 0;
    if (form.includeTaxCashback) base += parseFloat(form.tax) || 0;
    if (form.includeShippingCashback) base += parseFloat(form.shipping) || 0;
    const rate = parseFloat(form.cashbackRate) || 0;
    return ((base * rate) / 100).toFixed(2);
  }, [totalPrice, form.tax, form.shipping, form.cashbackRate, form.includeTaxCashback, form.includeShippingCashback]);

  const commission = useMemo(() => {
    const sale = parseFloat(form.salePrice) || 0;
    return (sale * 0.13).toFixed(2); // 13% default commission
  }, [form.salePrice]);

  const handleSubmit = async () => {
    const items = form.productName ? [{
      product_name: form.productName,
      upc: form.sku,
      quantity_ordered: form.quantity,
      unit_cost: parseFloat(form.unitPrice) || 0,
    }] : [];
    await base44.entities.PurchaseOrder.create({
      order_number: form.orderNumber || `TXN-${Date.now()}`,
      retailer: form.vendor,
      mode: mode,
      platform: form.buyer,
      status: (form.status || 'pending').toLowerCase().replace(' ', '_'),
      items,
      total_cost: subtotal,
      final_cost: subtotal - (parseFloat(form.giftCard) || 0),
      sale_price: parseFloat(form.salePrice) || undefined,
      order_date: form.date || undefined,
      tracking_number: form.tracking,
      notes: form.notes,
      credit_card_id: form.paymentMethod,
    });
    window.location.href = createPageUrl('Transactions');
  };

  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#e5e7eb' }}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Add Transaction</h1>
        <p style={{ color: MUTED, fontSize: 14, marginTop: 2 }}>Record a new purchase — pick your mode and fill in the details</p>
      </div>

      {/* Mode Selector */}
      <div style={SECTION_CARD}>
        <div className="flex flex-wrap items-center gap-4 mb-3">
          {[
            { key: 'churning', label: 'Churning', icon: <Flame size={14} /> },
            { key: 'marketplace', label: 'Marketplace', icon: <Globe size={14} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className="flex items-center gap-2 pb-2 text-sm font-semibold transition-all"
              style={mode === tab.key
                ? { color: '#fff', borderBottom: '2px solid #6366f1' }
                : { color: MUTED, borderBottom: '2px solid transparent' }
              }
            >
              {tab.icon} {tab.label}
            </button>
          ))}
          <span style={{ color: MUTED, fontSize: 12, marginLeft: 4 }}>
            {mode === 'churning'
              ? 'For credit card churning transactions (buy → earn cashback)'
              : 'For wholesale buyer transactions (buy → ship → scan → get paid)'}
          </span>
        </div>
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
          style={{ background: '#12152a', border: `1px solid ${BORDER}`, color: '#e5e7eb' }}
        >
          <RefreshCw size={13} /> Multi-Item Order
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 flex flex-col gap-0">

          {/* Section 1: Product Information */}
          <div style={SECTION_CARD}>
            <SectionTitle icon={<Package size={14} />} label="Product Information" color="#60a5fa" />
            <div className="flex flex-col gap-3">
              <Field label="Product Name" required>
                <InputEl value={form.productName} onChange={e => set('productName', e.target.value)} placeholder="e.g. Apple AirPods Pro 2nd Gen" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <SelectEl value={form.category} onChange={e => set('category', e.target.value)}>
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </SelectEl>
                </Field>
                <Field label="SKU / UPC (optional)">
                  <InputEl value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Barcode or SKU" />
                </Field>
              </div>
            </div>
          </div>

          {/* Section 2: Purchase Details */}
          <div style={SECTION_CARD}>
            <SectionTitle icon={<ShoppingCart size={14} />} label="Purchase Details" color="#818cf8" />
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Unit Price *">
                  <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: BG }}>
                    <span style={{ padding: '8px 10px', color: MUTED, fontSize: 13 }}>$</span>
                    <input style={{ background: 'transparent', outline: 'none', color: '#e5e7eb', fontSize: 13, flex: 1, padding: '8px 8px 8px 0' }}
                      type="number" value={form.unitPrice} onChange={e => set('unitPrice', e.target.value)} placeholder="0.00" />
                  </div>
                </Field>
                <Field label="Quantity">
                  <div className="flex items-center gap-1">
                    <button onClick={() => set('quantity', Math.max(1, form.quantity - 1))} style={{ background: '#2a2d3e', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '7px 9px', color: '#e5e7eb', cursor: 'pointer' }}><Minus size={12} /></button>
                    <input style={{ ...INPUT_STYLE, textAlign: 'center', width: 52 }} type="number" value={form.quantity} onChange={e => set('quantity', parseInt(e.target.value) || 1)} min={1} />
                    <button onClick={() => set('quantity', form.quantity + 1)} style={{ background: '#2a2d3e', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '7px 9px', color: '#e5e7eb', cursor: 'pointer' }}><Plus size={12} /></button>
                  </div>
                </Field>
                <Field label="Total Price">
                  <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: '#12152a' }}>
                    <span style={{ padding: '8px 10px', color: MUTED, fontSize: 13 }}>$</span>
                    <input style={{ background: 'transparent', outline: 'none', color: MUTED, fontSize: 13, flex: 1, padding: '8px 8px 8px 0' }} value={totalPrice} disabled />
                  </div>
                </Field>
                <Field label="Date">
                  <InputEl type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[['Tax', 'tax'], ['Shipping', 'shipping'], ['Fees', 'fees']].map(([lbl, key]) => (
                  <Field key={key} label={`${lbl} ($)`}>
                    <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: BG }}>
                      <span style={{ padding: '8px 10px', color: MUTED, fontSize: 13 }}>$</span>
                      <input style={{ background: 'transparent', outline: 'none', color: '#e5e7eb', fontSize: 13, flex: 1, padding: '8px 8px 8px 0' }}
                        type="number" value={form[key]} onChange={e => set(key, e.target.value)} placeholder="0.00" />
                    </div>
                  </Field>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Vendor & Buyer */}
          <div style={SECTION_CARD}>
            <SectionTitle icon={<Tag size={14} />} label="Vendor & Buyer" color="#f59e0b" />
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Vendor / Store" required>
                  <SelectEl value={form.vendor} onChange={e => set('vendor', e.target.value)}>
                    <option value="">Select vendor</option>
                    {sellers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    <option value="Amazon">Amazon</option>
                    <option value="Walmart">Walmart</option>
                    <option value="BestBuy">Best Buy</option>
                    <option value="Target">Target</option>
                    <option value="Costco">Costco</option>
                  </SelectEl>
                </Field>
                <Field label="Buyer" required>
                  <InputEl value={form.buyer} onChange={e => set('buyer', e.target.value)} placeholder="Buyer name / platform" />
                </Field>
                <Field label="Status">
                  <SelectEl value={form.status} onChange={e => set('status', e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </SelectEl>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Order Number">
                  <InputEl value={form.orderNumber} onChange={e => set('orderNumber', e.target.value)} placeholder="e.g. 114-1234567-8901234" />
                </Field>
                <Field label="Tracking Number(s)">
                  <InputEl value={form.tracking} onChange={e => set('tracking', e.target.value)} placeholder="e.g. 1Z999AA101234567" />
                </Field>
              </div>
              <button style={{ background: 'transparent', border: 'none', color: '#6366f1', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Plus size={12} /> Add tracking number
              </button>
            </div>
          </div>

          {/* Section 4: Payment & Cashback */}
          <div style={SECTION_CARD}>
            <SectionTitle icon={<CreditCard size={14} />} label="Payment & Cashback" color="#f472b6" />
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Payment Method">
                  <SelectEl value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
                    <option value="">Select card...</option>
                    {creditCards.map(c => <option key={c.id} value={c.id}>{c.card_name}</option>)}
                  </SelectEl>
                </Field>
                <Field label="Cashback Rate %">
                  <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: BG }}>
                    <input style={{ background: 'transparent', outline: 'none', color: '#e5e7eb', fontSize: 13, flex: 1, padding: '8px 0 8px 12px' }}
                      type="number" value={form.cashbackRate} onChange={e => set('cashbackRate', e.target.value)} placeholder="0.0" />
                    <span style={{ padding: '8px 10px', color: MUTED, fontSize: 13 }}>%</span>
                  </div>
                </Field>
                <Field label="Cashback Amount (auto)">
                  <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: '#12152a' }}>
                    <span style={{ padding: '8px 10px', color: MUTED, fontSize: 13 }}>$</span>
                    <input style={{ background: 'transparent', outline: 'none', color: MUTED, fontSize: 13, flex: 1, padding: '8px 8px 8px 0' }} value={cashbackAmount} disabled />
                  </div>
                </Field>
              </div>
              <Field label="Gift Card Used ($)">
                <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: BG }}>
                  <span style={{ padding: '8px 10px', color: MUTED, fontSize: 13 }}>$</span>
                  <input style={{ background: 'transparent', outline: 'none', color: '#e5e7eb', fontSize: 13, flex: 1, padding: '8px 8px 8px 0' }}
                    type="number" value={form.giftCard} onChange={e => set('giftCard', e.target.value)} placeholder="0.00" />
                </div>
              </Field>
              <div className="flex gap-5">
                {[['includeTaxCashback', 'Include tax in cashback'], ['includeShippingCashback', 'Include shipping in cashback']].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 13, color: '#e5e7eb' }}>
                    <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} style={{ accentColor: '#6366f1', width: 14, height: 14 }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Section 5: Sale Details */}
          <div style={SECTION_CARD}>
            <SectionTitle icon={<DollarSign size={14} />} label="Sale Details (Optional)" color="#4ade80" />
            <p style={{ color: MUTED, fontSize: 12, marginBottom: 12, marginTop: -8 }}>
              Fill these in if you already have sale info. You can always update later from the Transactions page.
            </p>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 13, color: '#e5e7eb' }}>
                <input type="checkbox" checked={form.salePerUnit} onChange={e => set('salePerUnit', e.target.checked)} style={{ accentColor: '#6366f1', width: 14, height: 14 }} />
                Sale price is per unit
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Sale Price per unit ($)">
                  <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: BG }}>
                    <span style={{ padding: '8px 10px', color: MUTED, fontSize: 13 }}>$</span>
                    <input style={{ background: 'transparent', outline: 'none', color: '#e5e7eb', fontSize: 13, flex: 1, padding: '8px 8px 8px 0' }}
                      type="number" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} placeholder="0.00" />
                  </div>
                </Field>
                <Field label="Commission (auto $)">
                  <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: '#12152a' }}>
                    <span style={{ padding: '8px 10px', color: MUTED, fontSize: 13 }}>$</span>
                    <input style={{ background: 'transparent', outline: 'none', color: MUTED, fontSize: 13, flex: 1, padding: '8px 8px 8px 0' }} value={commission} disabled />
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
          </div>

          {/* Notes */}
          <div style={SECTION_CARD}>
            <label style={{ ...LABEL_STYLE, marginBottom: 8 }}>Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any additional notes..."
              rows={4}
              style={{ ...INPUT_STYLE, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="flex flex-col gap-4">
          {/* Transaction Summary */}
          <div style={SECTION_CARD}>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={14} color="#a855f7" />
              <span style={{ color: '#a855f7', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Transaction Summary</span>
            </div>
            <div className="flex flex-col gap-2">
              {[
                ['Subtotal', `$${parseFloat(totalPrice || 0).toFixed(2)}`],
                ['Tax', `$${parseFloat(form.tax || 0).toFixed(2)}`],
                ['Shipping', `$${parseFloat(form.shipping || 0).toFixed(2)}`],
                ['Fees', `$${parseFloat(form.fees || 0).toFixed(2)}`],
                ['Gift Card', form.giftCard ? `-$${parseFloat(form.giftCard).toFixed(2)}` : '$0.00'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center">
                  <span style={{ color: MUTED, fontSize: 13 }}>{label}</span>
                  <span style={{ color: '#e5e7eb', fontSize: 13 }}>{value}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 6, paddingTop: 8 }} className="flex justify-between items-center">
                <span style={{ color: '#e5e7eb', fontSize: 14, fontWeight: 700 }}>Total Cost</span>
                <span style={{ color: '#f87171', fontSize: 15, fontWeight: 700 }}>${(subtotal - (parseFloat(form.giftCard) || 0)).toFixed(2)}</span>
              </div>
              {parseFloat(cashbackAmount) > 0 && (
                <div className="flex justify-between items-center">
                  <span style={{ color: '#4ade80', fontSize: 13 }}>Cashback</span>
                  <span style={{ color: '#4ade80', fontSize: 13 }}>+${cashbackAmount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Mode Card */}
          <div style={SECTION_CARD}>
            <div className="flex items-center gap-2 mb-2">
              {mode === 'churning' ? <Flame size={14} color="#f59e0b" /> : <Globe size={14} color="#60a5fa" />}
              <span style={{ color: mode === 'churning' ? '#f59e0b' : '#60a5fa', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {mode === 'churning' ? 'Churning Mode' : 'Marketplace Mode'}
              </span>
            </div>
            <p style={{ color: MUTED, fontSize: 12 }}>
              {form.buyer ? `Buyer: ${form.buyer}` : 'No buyer selected.'}
            </p>
            {form.vendor && <p style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>Vendor: {form.vendor}</p>}
            {form.paymentMethod && creditCards.find(c => c.id === form.paymentMethod) && (
              <p style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>
                Card: {creditCards.find(c => c.id === form.paymentMethod)?.card_name}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', border: 'none', cursor: 'pointer' }}
          >
            <Plus size={15} /> Add Transaction
          </button>
          <Link
            to={createPageUrl('Transactions')}
            className="text-center text-sm block"
            style={{ color: MUTED, textDecoration: 'none' }}
          >
            Cancel — Back to Transactions
          </Link>
        </div>
      </div>
    </div>
  );
}