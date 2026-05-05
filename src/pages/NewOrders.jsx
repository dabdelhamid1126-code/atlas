import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Copy, X, ImageOff, ClipboardList, Barcode, RefreshCw,
  Minus, Check, ChevronDown as ChevronDownIcon, AlertCircle,
} from 'lucide-react';
import ProductAutocomplete from '@/components/purchase-orders/ProductAutocomplete';
// NEW IMPORTS - Smart Pricing & Import/Spreadsheet
import ImportOrders from '@/components/ImportOrders';
import SpreadsheetTable from '@/components/SpreadsheetTable';
import { getVendorConfig } from '@/utils/smartPricing';

/* ------------------------------------------------------------------ */
/*  CONSTANTS                                                           */
/* ------------------------------------------------------------------ */
const DEFAULT_VENDORS = ['Amazon','Best Buy','Walmart','Target','Costco',"Sam's Club",'eBay','Woot','Apple','Staples'];
const CHURNING_STATUSES   = [{ value:'pending',label:'Pending' },{ value:'ordered',label:'Ordered' },{ value:'shipped',label:'Shipped' },{ value:'received',label:'Received' }];
const MARKETPLACE_STATUSES = [{ value:'pending',label:'Pending' },{ value:'ordered',label:'Listed' },{ value:'shipped',label:'Sold' },{ value:'received',label:'Completed' }];
const fmt$ = (v) => new Intl.NumberFormat('en-US',{ style:'currency', currency:'USD', maximumFractionDigits:2 }).format(parseFloat(v)||0);
const pct  = (v) => `${Number(v||0).toFixed(1)}%`;

/* ------------------------------------------------------------------ */
/*  DOMAIN HELPERS                                                      */
/* ------------------------------------------------------------------ */
const getStoreDomain = (n) => {
  const s = String(n||'').toLowerCase().replace(/[\s\-_.']/g,'').replace(/[^a-z0-9]/g,'');
  if (s.includes('bestbuy'))  return 'bestbuy.com';
  if (s.includes('amazon'))   return 'amazon.com';
  if (s.includes('walmart'))  return 'walmart.com';
  if (s.includes('apple'))    return 'apple.com';
  if (s.includes('target'))   return 'target.com';
  if (s.includes('costco'))   return 'costco.com';
  if (s.includes('samsclub')||s.includes('sams')) return 'samsclub.com';
  if (s.includes('staples'))  return 'staples.com';
  if (s.includes('ebay'))     return 'ebay.com';
  if (s.includes('woot'))     return 'woot.com';
  return null;
};
const getCardDomain = (n) => {
  const s = String(n||'').toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'');
  if (s.includes('chase'))   return 'chase.com';
  if (s.includes('amex')||s.includes('american')) return 'americanexpress.com';
  if (s.includes('citi'))    return 'citi.com';
  if (s.includes('capital')) return 'capitalone.com';
  if (s.includes('discover'))return 'discover.com';
  if (s.includes('bofa')||s.includes('bankofamerica')) return 'bankofamerica.com';
  if (s.includes('usbank'))  return 'usbank.com';
  if (s.includes('wells'))   return 'wellsfargo.com';
  if (s.includes('amazon'))  return 'amazon.com';
  if (s.includes('apple'))   return 'apple.com';
  if (s.includes('costco'))  return 'costco.com';
  if (s.includes('target'))  return 'target.com';
  return null;
};
const BRANDFETCH = '1idzVIG0BYPKsFIDJDI';
const brandfetch = (domain) => domain ? `https://cdn.brandfetch.io/domain/${domain}?c=${BRANDFETCH}` : null;
const proxyImg   = (url)    => url    ? `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=120&h=120&fit=contain&bg=white` : null;

/* ------------------------------------------------------------------ */
/*  SHARED STYLES                                                       */
/* ------------------------------------------------------------------ */
const INP = { background:'var(--parch-warm)', color:'var(--ink)', borderColor:'var(--parch-line)' };
const INP_STYLE = { background:'var(--parch-warm)', border:'1px solid var(--parch-line)', borderRadius:8, color:'var(--ink)', padding:'8px 10px', fontSize:13, outline:'none', width:'100%' };
const INP_ERROR = { background:'var(--crimson-bg)', border:'1px solid var(--crimson-bdr)', borderRadius:8, color:'var(--ink)', padding:'8px 10px', fontSize:13, outline:'none', width:'100%' };

/* ------------------------------------------------------------------ */
/*  VALIDATION ERROR HELPER                                             */
/* ------------------------------------------------------------------ */
function FieldError({ message }) {
  if (!message) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4 }}>
      <AlertCircle style={{ width:11, height:11, color:'var(--crimson)', flexShrink:0 }} />
      <span style={{ fontSize:10, color:'var(--crimson)', fontWeight:600 }}>{message}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MICRO COMPONENTS                                                    */
/* ------------------------------------------------------------------ */
function LBL({ children, error }) {
  return (
    <label style={{ fontFamily:'var(--font-serif)', fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color: error ? 'var(--crimson)' : 'var(--ink-faded)', display:'block', marginBottom:4 }}>
      {children}
    </label>
  );
}

function SectionHeader({ color = 'var(--gold)', title, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:11, paddingBottom:8, borderBottom:'1px solid var(--parch-line)' }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }} />
      <span style={{ fontFamily:'var(--font-serif)', fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-faded)' }}>{title}</span>
      {right && <div style={{ marginLeft:'auto' }}>{right}</div>}
    </div>
  );
}

function BrandLogo({ domain, size=18, fallback='?' }) {
  const [err, setErr] = useState(false);
  const url = domain ? brandfetch(domain) : null;
  if (!url||err) return (
    <div style={{ width:size, height:size, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--parch-warm)', border:'1px solid var(--parch-line)', borderRadius:5, fontSize:10, fontWeight:700, color:'var(--ink-ghost)' }}>
      {fallback}
    </div>
  );
  return <img src={proxyImg(url)} onError={()=>setErr(true)} style={{ width:size, height:size, borderRadius:5 }} alt="brand"/>;
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                      */
/* ------------------------------------------------------------------ */
export default function NewOrders() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('form'); // 'form' | 'spreadsheet' | 'import'
  
  // NEW STATE - Vendor Configs
  const [vendorConfigs, setVendorConfigs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vendorConfigs') || '[]');
    } catch {
      return [];
    }
  });

  // NEW STATE - Spreadsheet Mode
  const [spreadsheetRows, setSpreadsheetRows] = useState([]);

  // Fetch products for autocomplete and matching
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const resp = await base44.entities.Product.list();
      return resp || [];
    },
  });

  // Form state (for classic form mode)
  const defaultForm = useCallback(() => ({
    order_type: 'churning',
    order_number: '',
    retailer: '',
    marketplace_platform: '',
    account: '',
    status: 'ordered',
    product_category: '',
    order_date: new Date().toISOString().split('T')[0],
    items: [{ id: 1, product_id: null, product_name: '', upc: '', quantity_ordered: 1, quantity_received: 0, unit_cost: 0, product_image_url: '' }],
    tracking_numbers: [''],
    credit_card_id: null,
    isSplit: false,
    payment_splits: [],
    gift_card_ids: [],
    include_tax_in_cashback: false,
    include_shipping_in_cashback: false,
    amazon_yacb: false,
    notes: '',
    tax: 0,
    shipping: 0,
    fees: 0,
    fulfillment_type: 'ship_to_me',
    dropship_to: '',
    sale_events: [],
  }), []);

  const [form, setForm] = useState(defaultForm());
  const [activeTab, setActiveTab] = useState('details');
  const [errors, setErrors] = useState({});
  const [previewImg, setPreviewImg] = useState(null);

  // Fetch other data
  const { data: creditCards = [] } = useQuery({
    queryKey: ['creditCards'],
    queryFn: async () => {
      const resp = await base44.entities.CreditCard.list();
      return resp || [];
    },
  });

  const { data: giftCards = [] } = useQuery({
    queryKey: ['giftCards'],
    queryFn: async () => {
      const resp = await base44.entities.GiftCard.list();
      return resp || [];
    },
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      const resp = await base44.entities.Seller.list();
      return resp || [];
    },
  });

  // Form setters
  const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));
  const setItem = (id, field, val) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(it => it.id === id ? { ...it, [field]: val } : it),
    }));
  };
  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { id: Math.max(...prev.items.map(i => i.id || 0), 0) + 1, product_id: null, product_name: '', upc: '', quantity_ordered: 1, quantity_received: 0, unit_cost: 0, product_image_url: '' }],
    }));
  };
  const removeItem = (id) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter(it => it.id !== id),
    }));
  };

  // Tracking numbers
  const updateTrackingNumber = (idx, val) => {
    const updated = [...form.tracking_numbers];
    updated[idx] = val;
    set('tracking_numbers', updated);
  };
  const addTrackingNumber = () => {
    set('tracking_numbers', [...form.tracking_numbers, '']);
  };
  const removeTrackingNumber = (idx) => {
    set('tracking_numbers', form.tracking_numbers.filter((_, i) => i !== idx));
  };

  // Payment splits
  const addPaymentSplit = () => {
    setForm(prev => ({
      ...prev,
      payment_splits: [...prev.payment_splits, { card_id: null, card_name: '', amount: 0 }],
    }));
  };
  const updatePaymentSplit = (idx, field, val) => {
    setForm(prev => ({
      ...prev,
      payment_splits: prev.payment_splits.map((sp, i) => i === idx ? { ...sp, [field]: val } : sp),
    }));
  };
  const removePaymentSplit = (idx) => {
    setForm(prev => ({
      ...prev,
      payment_splits: prev.payment_splits.filter((_, i) => i !== idx),
    }));
  };

  // Sale events
  const addSaleEvent = () => {
    setForm(prev => ({
      ...prev,
      sale_events: [...prev.sale_events, { id: crypto.randomUUID(), buyer: '', sale_date: new Date().toISOString().split('T')[0], payout_date: '', items: [{ product_name: '', quantity: 1, sale_price: 0 }] }],
    }));
  };
  const removeSaleEvent = (id) => {
    setForm(prev => ({
      ...prev,
      sale_events: prev.sale_events.filter(ev => ev.id !== id),
    }));
  };
  const updateSaleEvent = (id, field, val) => {
    setForm(prev => ({
      ...prev,
      sale_events: prev.sale_events.map(ev => ev.id === id ? { ...ev, [field]: val } : ev),
    }));
  };
  const updateSaleEventItem = (evId, itIdx, field, val) => {
    setForm(prev => ({
      ...prev,
      sale_events: prev.sale_events.map(ev =>
        ev.id === evId
          ? { ...ev, items: ev.items.map((it, i) => i === itIdx ? { ...it, [field]: val } : it) }
          : ev
      ),
    }));
  };

  // Calculations
  const isAmazon = String(form.retailer).toLowerCase().includes('amazon');
  const isSplit = form.isSplit && form.payment_splits.length > 0;
  const validItemCount = form.items.filter(it => it.product_name?.trim() && parseFloat(it.unit_cost) > 0).length;
  const totalCost = form.items.reduce((s, it) => s + (parseFloat(it.unit_cost) || 0) * (parseInt(it.quantity_ordered) || 1), 0);
  const giftCardTotal = form.gift_card_ids.reduce((s, id) => s + (giftCards.find(gc => gc.id === id)?.amount || 0), 0);
  const shipping = parseFloat(form.shipping) || 0;
  const tax = parseFloat(form.tax) || 0;
  const fees = parseFloat(form.fees) || 0;
  const finalCost = totalCost + shipping + tax + fees - giftCardTotal;
  const totalCB = form.items.reduce((s, it) => {
    const isCB = it.product_name?.trim() && parseFloat(it.unit_cost) > 0;
    if (!isCB) return s;
    const itemTotal = parseFloat(it.unit_cost) * (parseInt(it.quantity_ordered) || 1);
    const baseCB = (itemTotal + (form.include_shipping_in_cashback ? shipping : 0) + (form.include_tax_in_cashback ? tax : 0)) * 0.01 * 5;
    return s + baseCB;
  }, 0);
  const cardCB = isAmazon && form.amazon_yacb ? form.items.reduce((s, it) => {
    const isCB = it.product_name?.trim() && parseFloat(it.unit_cost) > 0;
    if (!isCB) return s;
    const itemTotal = parseFloat(it.unit_cost) * (parseInt(it.quantity_ordered) || 1);
    const baseCB = (itemTotal + (form.include_shipping_in_cashback ? shipping : 0) + (form.include_tax_in_cashback ? tax : 0)) * 0.01 * 5;
    return s + baseCB;
  }, 0) : 0;
  const yaCB = totalCB - cardCB;
  const totalSalePrice = form.sale_events.reduce((s, ev) => s + ev.items.reduce((ss, it) => ss + (parseFloat(it.sale_price) || 0) * (parseInt(it.quantity) || 1), 0), 0);
  const netProfit = totalSalePrice - finalCost;
  const hasSales = form.sale_events.length > 0 && totalSalePrice > 0;

  const getSaleItemProfit = (item, items) => {
    const cost = items.find(it => it.product_name === item.product_name)?.unit_cost || 0;
    if (!cost || !item.sale_price) return null;
    const profit = (parseFloat(item.sale_price) || 0) * (parseInt(item.quantity) || 1) - cost * (parseInt(item.quantity) || 1);
    const roi = cost > 0 ? (profit / cost) * 100 : 0;
    return { cost, profit, roi };
  };

  // Validation
  const validate = () => {
    const errs = {};
    if (!form.retailer?.trim()) errs.retailer = 'Retailer required';
    if (!form.items.some(it => it.product_name?.trim() && parseFloat(it.unit_cost) > 0)) errs.items = 'Add at least one valid item (name + cost > 0)';
    if (isSplit && form.payment_splits.some((sp, i) => !sp.card_id || parseFloat(sp.amount) <= 0)) errs.splits = 'All payment splits require card + amount';
    return errs;
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      return await base44.entities.PurchaseOrder.create(payload);
    },
    onSuccess: () => {
      toast.success('✅ Order created');
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setForm(prev => ({ ...defaultForm(), order_type: prev.order_type, retailer: prev.retailer, credit_card_id: prev.credit_card_id }));
      setErrors({});
    },
    onError: () => toast.error('Failed to create order'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      if (errs.retailer) setActiveTab('details');
      else if (errs.items) setActiveTab('items');
      else if (errs.splits) setActiveTab('payment');
      return;
    }
    const pcId = isSplit ? (form.payment_splits[0]?.card_id || null) : (form.credit_card_id || null);
    const pc = creditCards.find(c => c.id === pcId);
    createMutation.mutate({
      order_type: form.order_type,
      order_number: form.order_number?.trim() || `ORD-${Date.now()}`,
      tracking_numbers: form.tracking_numbers.map(t => t.trim()).filter(Boolean),
      retailer: form.retailer,
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
      credit_card_id: pcId,
      card_name: pc?.card_name || null,
      payment_splits: isSplit ? form.payment_splits.map(sp => ({ card_id: sp.card_id, card_name: sp.card_name, amount: parseFloat(sp.amount) || 0 })) : [],
      gift_card_ids: form.gift_card_ids,
      include_tax_in_cashback: form.include_tax_in_cashback,
      include_shipping_in_cashback: form.include_shipping_in_cashback,
      extra_cashback_percent: form.amazon_yacb && isAmazon ? 5 : 0,
      bonus_notes: form.amazon_yacb && isAmazon ? 'Prime Young Adult' : null,
      notes: form.notes || null,
      fulfillment_type: form.fulfillment_type || 'ship_to_me',
      dropship_to: form.fulfillment_type === 'direct_dropship' ? form.dropship_to : null,
      has_receipts: false,
      items: form.items.filter(it => it.product_name?.trim() && parseFloat(it.unit_cost) > 0).map(it => ({ product_id: it.product_id || null, product_name: it.product_name.trim(), upc: it.upc || null, quantity_ordered: parseInt(it.quantity_ordered) || 1, quantity_received: 0, unit_cost: parseFloat(it.unit_cost) || 0, product_image_url: it.product_image_url || null })),
      sale_events: form.sale_events.map(ev => ({ ...ev, items: ev.items.map(it => ({ product_name: it.product_name || '', quantity: parseInt(it.quantity ?? 1) || 1, sale_price: parseFloat(it.sale_price) || 0 })) })),
    });
  };

  // NEW HANDLER - Handle spreadsheet save
  const handleSaveSpreadsheet = async (rows) => {
    try {
      let createdCount = 0;
      for (const row of rows) {
        const po = await base44.entities.PurchaseOrder.create({
          order_type: 'churning',
          retailer: row.vendor,
          order_date: row.date || format(new Date(), 'yyyy-MM-dd'),
          status: row.status?.toLowerCase() || 'ordered',
          order_number: `SS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          items: [
            {
              product_id: row.product_id || null,
              product_name: row.product,
              quantity_ordered: row.qty || 1,
              unit_cost: row.true_cost || 0,
            },
          ],
          total_cost: (row.true_cost || 0) * (row.qty || 1),
          final_cost: (row.true_cost || 0) * (row.qty || 1),
          notes: row.notes || null,
        });

        if (row.sale && row.sale > 0) {
          const saleEvent = {
            id: crypto.randomUUID(),
            buyer: row.buyer || 'Unknown',
            sale_date: row.date || format(new Date(), 'yyyy-MM-dd'),
            items: [{ product_name: row.product, quantity: row.qty || 1, sale_price: row.sale }],
          };
          await base44.entities.PurchaseOrder.update(po.id, { sale_events: [saleEvent] });
        }
        createdCount++;
      }

      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success(`✅ Saved ${createdCount} orders`);
      setSpreadsheetRows([]);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save orders');
    }
  };

  // NEW HANDLER - Handle import complete
  const handleImportOrders = async (importedRows) => {
    try {
      let createdCount = 0;
      for (const row of importedRows) {
        const po = await base44.entities.PurchaseOrder.create({
          order_type: 'churning',
          retailer: row.vendor,
          order_date: row.date || format(new Date(), 'yyyy-MM-dd'),
          status: row.status?.toLowerCase() || 'ordered',
          order_number: `IMPORT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          items: [
            {
              product_id: row.product_id || null,
              product_name: row.product,
              quantity_ordered: row.qty || 1,
              unit_cost: row.true_cost || 0,
            },
          ],
          total_cost: (row.true_cost || 0) * (row.qty || 1),
          final_cost: (row.true_cost || 0) * (row.qty || 1),
          notes: row.notes || null,
        });

        if (row.sale && row.sale > 0) {
          const saleEvent = {
            id: crypto.randomUUID(),
            buyer: row.buyer || 'Unknown',
            sale_date: row.date || format(new Date(), 'yyyy-MM-dd'),
            items: [{ product_name: row.product, quantity: row.qty || 1, sale_price: row.sale }],
          };
          await base44.entities.PurchaseOrder.update(po.id, { sale_events: [saleEvent] });
        }
        createdCount++;
      }

      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success(`✅ Imported ${createdCount} orders`);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(`Failed to import: ${error.message}`);
    }
  };

  const TABS = [
    { id: 'details', label: 'Details', icon: ClipboardList, hasError: !!errors.retailer },
    { id: 'items', label: 'Items', icon: Package, hasError: !!errors.items },
    { id: 'payment', label: 'Payment', icon: CreditCard, hasError: !!errors.splits },
    { id: 'sales', label: 'Sales', icon: DollarSign, hasError: false },
  ];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 40 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Add Order</h1>
        <p className="page-subtitle">Record a new purchase</p>
      </div>

      {/* NEW - MODE SELECTOR */}
      <div style={{ display: 'flex', gap: 4, padding: 6, borderRadius: 12, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', width: 'fit-content', marginBottom: 20 }}>
        {[
          { v: 'form', label: 'Classic Form' },
          { v: 'spreadsheet', label: 'Spreadsheet' },
          { v: 'import', label: '📤 Import CSV/Excel' },
        ].map(({ v, label }) => (
          <button
            key={v}
            type="button"
            onClick={() => setMode(v)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid',
              fontFamily: 'var(--font-serif)',
              ...(mode === v
                ? { background: 'var(--ink)', color: 'var(--ne-cream)', borderColor: 'var(--ink)' }
                : { background: 'transparent', color: 'var(--ink-dim)', borderColor: 'transparent' }),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* SPREADSHEET MODE */}
      {mode === 'spreadsheet' && (
        <SpreadsheetTable
          rows={spreadsheetRows}
          onRowsChange={setSpreadsheetRows}
          onSave={handleSaveSpreadsheet}
          products={products}
          vendors={DEFAULT_VENDORS}
          vendorConfigs={vendorConfigs}
        />
      )}

      {/* IMPORT MODE */}
      {mode === 'import' && (
        <ImportOrders
          onImportComplete={handleImportOrders}
          products={products}
          vendors={DEFAULT_VENDORS}
          vendorConfigs={vendorConfigs}
        />
      )}

      {/* CLASSIC FORM MODE */}
      {mode === 'form' && (
        <>
          {Object.keys(errors).length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'var(--crimson-bg)', border: '1px solid var(--crimson-bdr)', marginBottom: 14 }}>
              <AlertCircle style={{ width: 15, height: 15, color: 'var(--crimson)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--crimson)', marginBottom: 4 }}>Please fix the following before saving:</p>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {Object.values(errors).filter(Boolean).map((msg, i) => (
                    <li key={i} style={{ fontSize: 11, color: 'var(--crimson)', marginBottom: 2 }}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
              {/* Order type toggle */}
              <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', width: 'fit-content', marginBottom: 14 }}>
                {[{ v: 'churning', label: 'Churning', icon: Tag, color: 'var(--gold)', bg: 'var(--gold-bg)', bdr: 'var(--gold-bdr)' },
                  { v: 'marketplace', label: 'Marketplace', icon: Globe, color: 'var(--ocean)', bg: 'var(--ocean-bg)', bdr: 'var(--ocean-bdr)' }].map(({ v, label, icon: Icon, color, bg, bdr }) => (
                    <button key={v} type="button" onClick={() => set('order_type', v)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', fontFamily: 'var(--font-serif)', ...(form.order_type === v ? { background: bg, color, borderColor: bdr } : { background: 'transparent', color: 'var(--ink-dim)', borderColor: 'transparent' }) }}>
                      <Icon style={{ width: 13, height: 13 }} /> {label}
                    </button>
                  ))}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--parch-line)' }}>
                {TABS.map(tab => {
                  const TabIcon = tab.icon;
                  return (
                    <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                      style={{ padding: '9px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-serif)', borderBottom: activeTab === tab.id ? '2px solid var(--gold)' : '2px solid transparent', color: activeTab === tab.id ? 'var(--gold)' : 'var(--ink-dim)' }}>
                      <TabIcon style={{ width: 13, height: 13 }} />
                      {tab.label}
                      {tab.hasError && <span style={{ display: 'inline-block', width: 6, height: 6, background: 'var(--crimson)', borderRadius: '50%', marginLeft: 4 }} />}
                    </button>
                  );
                })}
              </div>

              {/* Tab content - DETAILS */}
              {activeTab === 'details' && (
                <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <LBL error={!!errors.retailer}>Retailer *</LBL>
                      <Select value={form.retailer} onValueChange={v => set('retailer', v)}>
                        <SelectTrigger style={errors.retailer ? INP_ERROR : INP}><SelectValue placeholder="Select retailer..." /></SelectTrigger>
                        <SelectContent style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
                          {DEFAULT_VENDORS.map(v => <SelectItem key={v} value={v} style={{ color: 'var(--ink)' }}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FieldError message={errors.retailer} />
                    </div>
                    <div>
                      <LBL>Order #</LBL>
                      <Input type="text" placeholder="Auto-generated" value={form.order_number} onChange={e => set('order_number', e.target.value)} style={INP_STYLE} className="h-9" />
                    </div>
                  </div>

                  <div>
                    <LBL>Order Date</LBL>
                    <Input type="date" value={form.order_date} onChange={e => set('order_date', e.target.value)} style={INP_STYLE} className="h-9" />
                  </div>

                  {form.order_type === 'marketplace' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <LBL>Platform</LBL>
                        <Select value={form.marketplace_platform || ''} onValueChange={v => set('marketplace_platform', v)}>
                          <SelectTrigger style={INP}><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
                            {['eBay', 'Amazon', 'Facebook Marketplace', 'Mercari', 'OfferUp'].map(p => <SelectItem key={p} value={p} style={{ color: 'var(--ink)' }}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <LBL>Account</LBL>
                        <Input type="text" placeholder="Your account name" value={form.account || ''} onChange={e => set('account', e.target.value)} style={INP_STYLE} className="h-9" />
                      </div>
                    </div>
                  )}

                  <div>
                    <LBL>Status</LBL>
                    <Select value={form.status} onValueChange={v => set('status', v)}>
                      <SelectTrigger style={INP}><SelectValue /></SelectTrigger>
                      <SelectContent style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
                        {(form.order_type === 'churning' ? CHURNING_STATUSES : MARKETPLACE_STATUSES).map(s => <SelectItem key={s.value} value={s.value} style={{ color: 'var(--ink)' }}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <LBL>Notes</LBL>
                    <Textarea placeholder="Add notes..." value={form.notes || ''} onChange={e => set('notes', e.target.value)} style={{ ...INP_STYLE, minHeight: 80, resize: 'none' }} />
                  </div>
                </div>
              )}

              {/* Tab content - ITEMS */}
              {activeTab === 'items' && (
                <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <SectionHeader title="Items" right={<button type="button" onClick={addItem} style={{ fontSize: 10, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-serif)', fontWeight: 700 }}>+ Add Item</button>} />
                  {form.items.map((item, idx) => (
                    <div key={item.id} style={{ padding: 12, background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', borderRadius: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 30px', gap: 8, marginBottom: 8 }}>
                        <ProductAutocomplete
                          value={item.product_name}
                          onChange={name => setItem(item.id, 'product_name', name)}
                          onSelect={p => {
                            setItem(item.id, 'product_id', p.id);
                            setItem(item.id, 'product_name', p.name);
                            if (p.cost) setItem(item.id, 'unit_cost', p.cost);
                          }}
                          placeholder="Product"
                          products={products}
                        />
                        <Input type="number" min="1" value={item.quantity_ordered} onChange={e => setItem(item.id, 'quantity_ordered', parseInt(e.target.value) || 1)} placeholder="Qty" style={INP_STYLE} className="h-9" />
                        <Input type="number" step="0.01" min="0" value={item.unit_cost} onChange={e => setItem(item.id, 'unit_cost', parseFloat(e.target.value) || 0)} placeholder="Cost" style={INP_STYLE} className="h-9" />
                        <button type="button" onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--crimson)' }}><Trash2 style={{ width: 16, height: 16 }} /></button>
                      </div>
                    </div>
                  ))}
                  <FieldError message={errors.items} />
                </div>
              )}

              {/* Tab content - PAYMENT */}
              {activeTab === 'payment' && (
                <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <SectionHeader title="Costs & Adjustments" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[{ lbl: 'Subtotal', val: fmt$(totalCost), readonly: true },
                      { lbl: 'Tax', val: form.tax, onChange: v => set('tax', v) },
                      { lbl: 'Shipping', val: form.shipping, onChange: v => set('shipping', v) }].map(({ lbl, val, readonly, onChange }) => (
                        <div key={lbl}>
                          <LBL>{lbl}</LBL>
                          {readonly ? (
                            <div style={{ padding: '8px 10px', background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', borderRadius: 8, fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{fmt$(val)}</div>
                          ) : (
                            <Input type="number" step="0.01" min="0" value={val} onChange={e => onChange(e.target.value)} style={INP_STYLE} className="h-9" />
                          )}
                        </div>
                      ))}
                  </div>

                  <SectionHeader title="Payment Method" />
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, cursor: 'pointer' }}>
                      <input type="radio" name="payment" checked={!isSplit} onChange={() => set('isSplit', false)} />
                      <span style={{ fontSize: 13 }}>Single Card</span>
                    </label>
                    {!isSplit && (
                      <Select value={form.credit_card_id || ''} onValueChange={v => set('credit_card_id', v)}>
                        <SelectTrigger style={INP}><SelectValue placeholder="Select card..." /></SelectTrigger>
                        <SelectContent style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
                          {creditCards.map(c => <SelectItem key={c.id} value={c.id} style={{ color: 'var(--ink)' }}>{c.card_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, cursor: 'pointer' }}>
                      <input type="radio" name="payment" checked={isSplit} onChange={() => set('isSplit', true)} />
                      <span style={{ fontSize: 13 }}>Split Payment</span>
                    </label>
                    {isSplit && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {form.payment_splits.map((sp, idx) => (
                          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 30px', gap: 8 }}>
                            <Select value={sp.card_id || ''} onValueChange={v => { const c = creditCards.find(cc => cc.id === v); updatePaymentSplit(idx, 'card_id', v); updatePaymentSplit(idx, 'card_name', c?.card_name || ''); }}>
                              <SelectTrigger style={INP}><SelectValue placeholder="Select card..." /></SelectTrigger>
                              <SelectContent style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
                                {creditCards.map(c => <SelectItem key={c.id} value={c.id} style={{ color: 'var(--ink)' }}>{c.card_name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input type="number" step="0.01" min="0" value={sp.amount} onChange={e => updatePaymentSplit(idx, 'amount', e.target.value)} placeholder="Amount" style={INP_STYLE} className="h-9" />
                            <button type="button" onClick={() => removePaymentSplit(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--crimson)' }}><Trash2 style={{ width: 16, height: 16 }} /></button>
                          </div>
                        ))}
                        <button type="button" onClick={addPaymentSplit} style={{ fontSize: 11, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-serif)', fontWeight: 700 }}>+ Add Split</button>
                      </div>
                    )}
                  </div>
                  <FieldError message={errors.splits} />
                </div>
              )}

              {/* Tab content - SALES */}
              {activeTab === 'sales' && (
                <div style={{ paddingTop: 14 }}>
                  <SectionHeader title="Sales Events" right={form.sale_events.length === 0 ? <button type="button" onClick={addSaleEvent} style={{ fontSize: 10, color: 'var(--terrain)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-serif)', fontWeight: 700 }}>+ Record Sale</button> : null} />
                  {form.sale_events.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-faded)' }}>
                      <p style={{ fontSize: 12, marginBottom: 10 }}>No sales recorded yet</p>
                      <button type="button" onClick={addSaleEvent} style={{ fontSize: 12, fontWeight: 600, color: 'var(--terrain)', padding: '8px 20px', borderRadius: 10, background: 'var(--parch-warm)', border: '1px solid var(--terrain-bdr)', cursor: 'pointer' }}>+ Record First Sale</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {form.sale_events.map((ev, evIdx) => (
                        <div key={ev.id} style={{ borderRadius: 10, padding: 12, background: 'var(--parch-warm)', border: '1px solid var(--terrain-bdr)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--terrain)', background: 'var(--terrain-bg)', padding: '2px 8px', borderRadius: 99, border: '1px solid var(--terrain-bdr)' }}>Sale {evIdx + 1}</span>
                            <button type="button" onClick={() => removeSaleEvent(ev.id)} style={{ color: 'var(--crimson)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><Trash2 style={{ width: 13, height: 13 }} /></button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                            <div>
                              <LBL>Buyer / Platform</LBL>
                              <Select value={ev.buyer || ''} onValueChange={v => updateSaleEvent(ev.id, 'buyer', v)}>
                                <SelectTrigger className="h-8 text-xs" style={INP}><SelectValue placeholder="Select buyer..." /></SelectTrigger>
                                <SelectContent style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)' }}>
                                  {sellers.map(s => <SelectItem key={s.id} value={s.name} style={{ color: 'var(--ink)' }}>{s.name}</SelectItem>)}
                                  {['eBay', 'Amazon', 'Facebook Marketplace', 'Mercari', 'OfferUp'].map(p => <SelectItem key={p} value={p} style={{ color: 'var(--ink)' }}>{p}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <LBL>Sale Date</LBL>
                              <Input type="date" className="h-8 text-xs" style={INP} value={ev.sale_date || ''} onChange={e => updateSaleEvent(ev.id, 'sale_date', e.target.value)} />
                            </div>
                            <div>
                              <LBL>Payout Date</LBL>
                              <Input type="date" className="h-8 text-xs" style={INP} value={ev.payout_date || ''} onChange={e => updateSaleEvent(ev.id, 'payout_date', e.target.value)} />
                            </div>
                          </div>
                          <LBL>Items Sold</LBL>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                            {ev.items.map((it, itIdx) => {
                              const pp = getSaleItemProfit(it, form.items);
                              const isProfit = pp ? pp.profit >= 0 : null;
                              return (
                                <div key={itIdx} style={{ background: 'var(--parch-card)', border: '1px solid var(--parch-line)', borderRadius: 9, padding: '9px 10px' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '4fr 1.5fr 2.5fr 20px', gap: 6, alignItems: 'center', marginBottom: pp ? 7 : 0 }}>
                                    <Input className="h-7 text-xs" style={INP} value={it.product_name || ''} placeholder="Product" onChange={e => updateSaleEventItem(ev.id, itIdx, 'product_name', e.target.value)} />
                                    <Input className="h-7 text-xs text-center" style={INP} type="number" min="1" value={it.quantity ?? 1} placeholder="1" onChange={e => updateSaleEventItem(ev.id, itIdx, 'quantity', parseInt(e.target.value) || 1)} />
                                    <div style={{ position: 'relative' }}>
                                      <span style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-ghost)', fontSize: 11 }}>$</span>
                                      <Input className="h-7 text-xs" style={{ ...INP, paddingLeft: 18 }} type="number" step="0.01" min="0" value={it.sale_price || ''} placeholder="Price" onChange={e => updateSaleEventItem(ev.id, itIdx, 'sale_price', e.target.value)} />
                                    </div>
                                    <button type="button" onClick={() => updateSaleEvent(ev.id, 'items', ev.items.filter((_, i) => i !== itIdx))} style={{ color: 'var(--ink-ghost)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><X style={{ width: 12, height: 12 }} /></button>
                                  </div>
                                  {pp !== null && it.sale_price > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 7, borderTop: '1px solid var(--parch-line)', flexWrap: 'wrap' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-ghost)' }}>Profit</span>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: isProfit ? 'var(--terrain)' : 'var(--crimson)' }}>{isProfit ? '+' : ''}{fmt$(pp.profit)}</span>
                                      </div>
                                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99, fontFamily: 'var(--font-mono)', background: isProfit ? 'var(--terrain-bg)' : 'var(--crimson-bg)', color: isProfit ? 'var(--terrain)' : 'var(--crimson)', border: '1px solid ' + (isProfit ? 'var(--terrain-bdr)' : 'var(--crimson-bdr)') }}>ROI {pct(pp.roi)}</span>
                                      <span style={{ fontSize: 9, color: 'var(--ink-ghost)' }}>cost {fmt$(pp.cost)}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            <button type="button" onClick={() => updateSaleEvent(ev.id, 'items', [...ev.items, { product_name: '', quantity: 1, sale_price: 0 }])} style={{ fontSize: 11, color: 'var(--terrain)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Plus style={{ width: 11, height: 11 }} /> Add item
                            </button>
                          </div>
                        </div>
                      ))}
                      {totalSalePrice > 0 && (
                        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--parch-card)', border: '1px solid var(--terrain-bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: 'var(--terrain)' }}>{form.sale_events.reduce((s, ev) => s + (ev.items?.reduce((ss, it) => ss + (parseInt(it.quantity ?? 1) || 1), 0) || 0), 0)} items sold</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--terrain)', fontWeight: 700 }}>{fmt$(totalSalePrice)} revenue</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit buttons */}
            <button type="submit" disabled={createMutation.isPending}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', borderRadius: 8, color: 'var(--ne-cream)', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', background: 'var(--ink)', opacity: createMutation.isPending ? 0.6 : 1, transition: 'opacity 0.15s', fontFamily: 'var(--font-serif)', marginBottom: 8 }}>
              {createMutation.isPending
                ? <><div style={{ width: 16, height: 16, border: '2px solid var(--ne-cream)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> Creating...</>
                : <><Plus style={{ width: 16, height: 16 }} /> Add Order{validItemCount > 1 ? ` (${validItemCount} items)` : ''}</>}
            </button>
            <button type="button" onClick={() => window.history.back()}
              style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontSize: 12, color: 'var(--ink-ghost)', background: 'var(--parch-warm)', border: '1px solid var(--parch-line)', cursor: 'pointer' }}>
              Cancel
            </button>
          </form>
        </>
      )}
    </div>
  );
}
