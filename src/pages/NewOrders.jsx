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
    <div style={{ width:size, height:size, borderRadius:'50%', background:'linear-gradient(135deg,var(--ocean-bg),var(--ocean-bdr))', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:size*0.4, color:'var(--ocean)', flexShrink:0 }}>
      {String(fallback).charAt(0).toUpperCase()}
    </div>
  );
  return <img src={url} alt="" onError={()=>setErr(true)} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'1px solid var(--parch-line)', display:'block' }} />;
}
function ItemThumb({ src, name, onClick }) {
  const [err, setErr] = useState(false);
  useEffect(()=>setErr(false),[src]);
  if (!src||err) return (
    <div onClick={onClick} style={{ width:40, height:40, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', background:'var(--terrain-bg)', border:'1px solid var(--terrain-bdr)', color:'var(--terrain)', fontSize:13, fontWeight:700 }}>
      {name?.charAt(0)?.toUpperCase()||<ImageOff style={{ width:14, height:14 }}/>}
    </div>
  );
  return <img src={src} alt={name} onClick={onClick} onError={()=>setErr(true)} style={{ width:40, height:40, borderRadius:8, objectFit:'contain', background:'white', padding:2, flexShrink:0, cursor:'pointer', border:'1px solid var(--parch-line)' }}/>;
}
function ImagePreviewModal({ src, alt, onClose }) {
  if (!src) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)' }}>
      <div onClick={e=>e.stopPropagation()} style={{ position:'relative', maxWidth:384, width:'100%', margin:'0 16px' }}>
        <button onClick={onClose} style={{ position:'absolute', top:-12, right:-12, zIndex:10, width:32, height:32, borderRadius:'50%', background:'var(--parch-card)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--parch-line)', cursor:'pointer' }}>
          <X style={{ width:14, height:14, color:'var(--ink-dim)' }}/>
        </button>
        <img src={src} alt={alt} style={{ width:'100%', borderRadius:16, maxHeight:'80vh', objectFit:'contain' }}/>
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/*  DEFAULT FACTORIES                                                   */
/* ------------------------------------------------------------------ */
const defaultItem      = () => ({ id:crypto.randomUUID(), product_id:'', product_name:'', upc:'', quantity_ordered:1, unit_cost:'', product_image_url:'' });
const defaultSaleEvent = () => ({ id:crypto.randomUUID(), buyer:'', sale_date:'', payout_date:'', items:[] });
const defaultForm      = () => ({
  order_type:'churning', retailer:'', marketplace_platform:'', account:'',
  order_number:'', tracking_numbers:[''], status:'pending',
  product_category:'', order_date:format(new Date(),'yyyy-MM-dd'),
  tax:'', shipping_cost:'', fees:'', credit_card_id:'', payment_splits:[],
  gift_card_ids:[], include_tax_in_cashback:true, include_shipping_in_cashback:true,
  amazon_yacb:false, cashback_rate_override:'', notes:'',
  fulfillment_type:'ship_to_me', dropship_to:'', pickup_location:'',
  items:[defaultItem()], sale_events:[],
});
/* ------------------------------------------------------------------ */
/*  PROFIT BAR                                                          */
/* ------------------------------------------------------------------ */
function ProfitBar({ netProfit, totalCost, finalCost, totalCB, cardCB, yaCB, totalSalePrice, validItemCount, hasSales, isSplit }) {
  const isPos = netProfit >= 0;
  const roi   = totalCost > 0 ? (netProfit/totalCost)*100 : 0;
  const profColor = hasSales ? (isPos?'var(--terrain)':'var(--crimson)') : 'var(--violet)';
  return (
    <div style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:12, padding:'12px 14px', marginBottom:10, borderTop:'3px solid '+profColor }}>
      <p style={{ fontFamily:'var(--font-serif)', fontSize:8, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-faded)', marginBottom:4 }}>
        {hasSales?'Estimated Profit':'Cashback Profit'}
      </p>
      <p style={{ fontFamily:'var(--font-mono)', fontSize:22, fontWeight:700, color:profColor, lineHeight:1 }}>{fmt$(netProfit)}</p>
      <p style={{ fontSize:10, color:'var(--ink-ghost)', marginTop:2 }}>
        {pct(roi)} ROI &middot; {validItemCount} item{validItemCount!==1?'s':''}
      </p>
      <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid var(--parch-line)', display:'flex', flexDirection:'column', gap:4 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
          <span style={{ color:'var(--ink-dim)' }}>Total cost</span>
          <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--gold)' }}>{fmt$(finalCost)}</span>
        </div>
        {cardCB > 0 && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
            <span style={{ color:'var(--ink-dim)' }}>Card cashback</span>
            <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--violet)' }}>+{fmt$(cardCB)}</span>
          </div>
        )}
        {yaCB > 0 && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
            <span style={{ color:'var(--ink-dim)' }}>Amazon YA 5%</span>
            <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--violet)' }}>+{fmt$(yaCB)}</span>
          </div>
        )}
        {totalSalePrice > 0 && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
            <span style={{ color:'var(--ink-dim)' }}>Sale total</span>
            <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--ink)' }}>{fmt$(totalSalePrice)}</span>
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', paddingTop:5, borderTop:'1px solid var(--parch-line)' }}>
          <span style={{ fontWeight:700, color:'var(--ink)', fontSize:12 }}>{hasSales?'Net profit':'Cashback'}</span>
          <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:14, color:profColor }}>{isPos&&hasSales?'+':''}{fmt$(netProfit)}</span>
        </div>
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/*  UPC LOOKUP BAR                                                      */
/* ------------------------------------------------------------------ */
function UPCLookupBar({ products, onApply }) {
  const [upc,     setUpc]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');
  const lookup = useCallback(async () => {
    const q = upc.trim().replace(/\D/g,'');
    if (!q || q.length < 6) { toast.error('Enter a valid UPC'); return; }
    setLoading(true); setResult(null); setError('');
    try {
      const inCatalog = products.find(p => p.upc === q || p.upc === upc.trim());
      if (inCatalog) {
        setResult({ title:inCatalog.name, image:proxyImg(inCatalog.image), price:'', upc:q, source:'catalog', product_id:inCatalog.id });
        setLoading(false); return;
      }
      const res  = await base44.functions.invoke('lookupUPCProxy', { upc: q });
      const data = res.data;
      const item = data.items?.[0];
      if (!item) { setError('No product found for that UPC.'); setLoading(false); return; }
      setResult({
        title:   item.title,
        image:   proxyImg(item.images?.[0] || item.images_url?.[0] || null),
        price:   item.lowest_recorded_price || item.offers?.[0]?.price || '',
        upc:     q,
        source:  'upcitemdb',
        product_id: null,
      });
    } catch {
      setError('Lookup failed - enter manually.');
    } finally {
      setLoading(false);
    }
  }, [upc, products]);
  const handleKey = (e) => { if (e.key==='Enter') lookup(); };
  return (
    <div style={{ marginBottom:12 }}>
      <LBL>UPC Scan / Lookup</LBL>
      <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:result?8:0 }}>
        <button type="button" onClick={lookup} title="Lookup UPC"
          style={{ width:38, height:38, borderRadius:9, background:'var(--ink)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          {loading
            ? <RefreshCw style={{ width:15, height:15, color:'var(--gold)', animation:'spin 0.8s linear infinite' }}/>
            : <Barcode style={{ width:16, height:16, color:'var(--gold)' }}/>}
        </button>
        <input
          type="text"
          value={upc}
          onChange={e=>{ setUpc(e.target.value); setResult(null); setError(''); }}
          onKeyDown={handleKey}
          placeholder="Paste or type UPC..."
          style={{ flex:1, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', borderRadius:8, padding:'8px 10px', fontSize:12, color:'var(--ink)', outline:'none', fontFamily:'var(--font-mono)' }}
        />
        <button type="button" onClick={lookup} disabled={loading||!upc.trim()}
          style={{ padding:'8px 12px', borderRadius:8, background:'var(--ocean-bg)', color:'var(--ocean2)', border:'1px solid var(--ocean-bdr)', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', fontFamily:'var(--font-serif)', opacity:loading||!upc.trim()?0.5:1 }}>
          {loading?'...':'Lookup'}
        </button>
      </div>
      {error && <p style={{ fontSize:11, color:'var(--crimson)', marginTop:4 }}>{error}</p>}
      {result && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--terrain-bg)', border:'1px solid var(--terrain-bdr)', borderRadius:10 }}>
          <div style={{ width:46, height:46, borderRadius:9, background:'var(--parch-card)', border:'1px solid var(--parch-line)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {result.image
              ? <img src={result.image} alt={result.title} style={{ width:'100%', height:'100%', objectFit:'contain', padding:3 }}/>
              : <Package style={{ width:18, height:18, color:'var(--ink-ghost)' }}/>}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'var(--ink)', lineHeight:1.3 }}>{result.title}</p>
            <p style={{ fontSize:9, color:'var(--ink-ghost)', marginTop:2, fontFamily:'var(--font-mono)' }}>
              UPC: {result.upc} &middot; {result.source==='catalog'?'from your catalog':'via UPCitemdb'}
            </p>
            {result.price && (
              <p style={{ fontSize:11, fontWeight:700, color:'var(--gold)', fontFamily:'var(--font-mono)', marginTop:2 }}>
                {fmt$(result.price)} <span style={{ fontSize:9, color:'var(--ink-ghost)', fontWeight:400 }}>last price</span>
              </p>
            )}
          </div>
          <button type="button"
            onClick={()=>{ onApply(result); setResult(null); setUpc(''); }}
            style={{ padding:'6px 12px', borderRadius:7, background:'var(--terrain)', color:'#fff', border:'none', fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-serif)', flexShrink:0 }}>
            <Check style={{ width:11, height:11, display:'inline', marginRight:3 }}/>Use
          </button>
        </div>
      )}
    </div>
  );
}
/* ------------------------------------------------------------------ */
/*  VENDOR AUTOCOMPLETE                                                 */
/* ------------------------------------------------------------------ */
function VendorAutocomplete({ value, onChange, savedVendors, hasError }) {
  const [query, setQuery] = useState(value || '');
  const [open,  setOpen]  = useState(false);
  const ref = useRef(null);
  useEffect(() => { setQuery(value || ''); }, [value]);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const allVendors = useMemo(() => {
    const combined = [...new Set([...DEFAULT_VENDORS, ...savedVendors])];
    return combined.sort();
  }, [savedVendors]);
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allVendors.filter(v => v.toLowerCase().includes(q)).slice(0, 8);
  }, [query, allVendors]);
  const select = (vendor) => { setQuery(vendor); onChange(vendor); setOpen(false); };
  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setOpen(val.trim().length > 0);
  };
  const handleBlur = () => { setTimeout(() => setOpen(false), 150); };
  const isMatched = allVendors.some(v => v.toLowerCase() === query.toLowerCase());
  const matchedVendor = isMatched ? allVendors.find(v => v.toLowerCase() === query.toLowerCase()) : null;
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
        {matchedVendor && (
          <div style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', zIndex:1 }}>
            <BrandLogo domain={getStoreDomain(matchedVendor)} size={16} fallback={matchedVendor}/>
          </div>
        )}
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onBlur={handleBlur}
          placeholder="Type vendor name..."
          style={{
            ...INP_STYLE,
            paddingLeft: matchedVendor ? 32 : 10,
            borderColor: hasError ? 'var(--crimson)' : open ? 'var(--gold-bdr)' : 'var(--parch-line)',
            background: hasError ? 'var(--crimson-bg)' : 'var(--parch-warm)',
            transition: 'border-color 0.15s',
          }}
        />
        {query && (
          <button type="button" onClick={() => { setQuery(''); onChange(''); setOpen(true); }}
            style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--ink-ghost)', padding:2 }}>
            <X style={{ width:12, height:12 }}/>
          </button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:100,
          background:'var(--parch-card)', border:'1px solid var(--parch-line)',
          borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.12)', overflow:'hidden',
        }}>
          {suggestions.map((v, i) => (
            <div key={v} onMouseDown={() => select(v)}
              style={{
                display:'flex', alignItems:'center', gap:9, padding:'8px 12px',
                cursor:'pointer', borderBottom: i < suggestions.length-1 ? '1px solid var(--parch-line)' : 'none',
                background: v === query ? 'var(--gold-bg)' : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--parch-warm)'}
              onMouseLeave={e => e.currentTarget.style.background = v === query ? 'var(--gold-bg)' : 'transparent'}
            >
              <BrandLogo domain={getStoreDomain(v)} size={16} fallback={v}/>
              <span style={{ fontSize:13, color:'var(--ink)', fontWeight: v === query ? 600 : 400 }}>{v}</span>
              {!DEFAULT_VENDORS.includes(v) && (
                <span style={{ marginLeft:'auto', fontSize:9, color:'var(--ink-ghost)', fontStyle:'italic' }}>saved</span>
              )}
            </div>
          ))}
          {query.trim() && !allVendors.some(v => v.toLowerCase() === query.toLowerCase()) && (
            <div onMouseDown={() => select(query.trim())}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', cursor:'pointer', background:'var(--terrain-bg)', borderTop:'1px solid var(--terrain-bdr)' }}>
              <Plus style={{ width:12, height:12, color:'var(--terrain)' }}/>
              <span style={{ fontSize:12, color:'var(--terrain)', fontWeight:600 }}>Add "{query.trim()}" as new vendor</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
/* ------------------------------------------------------------------ */
/*  GIFT CARD SECTION                                                   */
/* ------------------------------------------------------------------ */
function GiftCardSection({ giftCards, selectedIds, onChange, retailer, orderTotal }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const normRetailer = (s) =>
    String(s || '').toLowerCase().replace(/[\s\-_.']/g, '').replace(/[^a-z0-9]/g, '');
  const gcMatchesRetailer = useCallback((gc, ret) => {
    if (!ret) return true;
    const gcRetailer = gc.retailer || gc.vendor || gc.store || '';
    if (!gcRetailer) return true;
    const r  = normRetailer(ret);
    const gr = normRetailer(gcRetailer);
    return gr.includes(r) || r.includes(gr);
  }, []);
  const availableCards = useMemo(() =>
    giftCards.filter(gc =>
      gc.status !== 'used' &&
      (gc.value || 0) > 0 &&
      gcMatchesRetailer(gc, retailer)
    ),
    [giftCards, retailer, gcMatchesRetailer]
  );
  const filteredCards  = useMemo(() => {
    if (!search.trim()) return availableCards;
    const q = search.toLowerCase();
    return availableCards.filter(gc =>
      (gc.card_name || gc.name || '').toLowerCase().includes(q) ||
      String(gc.value || '').includes(q)
    );
  }, [availableCards, search]);
  const selectedCards  = availableCards.filter(gc => selectedIds.includes(gc.id));
  const totalSelected  = selectedCards.reduce((s, gc) => s + (gc.value || 0), 0);
  const totalAvailable = availableCards.reduce((s, gc) => s + (gc.value || 0), 0);
  const getAmountUsed = useCallback((gc) => {
    if (!orderTotal || orderTotal <= 0) return gc.value || 0;
    const idx = selectedCards.findIndex(c => c.id === gc.id);
    if (idx < 0) return 0;
    const coveredBefore = selectedCards.slice(0, idx).reduce((s, c) => s + (c.value || 0), 0);
    const remaining = Math.max(0, orderTotal - coveredBefore);
    return Math.min(gc.value || 0, remaining);
  }, [selectedCards, orderTotal]);
  const toggleCard = (id) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter(x => x !== id));
    else onChange([...selectedIds, id]);
  };
  const gcDisplayName = (gc) => gc.card_name || gc.name || 'Gift Card';
  const gcShortId     = (gc) => gc.id ? gc.id.slice(-4).toUpperCase() : '????';

  // ── Gate: don't show if no retailer selected ──
  if (!retailer?.trim()) {
    return (
      <div>
        <SectionHeader color="var(--gold)" title="Gift Cards" />
        <div style={{ padding:'10px 12px', borderRadius:10, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', display:'flex', alignItems:'center', gap:8 }}>
          <AlertCircle style={{ width:13, height:13, color:'var(--ink-ghost)', flexShrink:0 }} />
          <p style={{ fontSize:11, color:'var(--ink-ghost)' }}>Select a vendor first to see available gift cards</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        color="var(--gold)"
        title="Gift Cards"
        right={
          selectedCards.length > 0
            ? <span style={{ fontFamily:'var(--font-mono)', fontSize:10, fontWeight:700, color:'var(--terrain)' }}>-{fmt$(totalSelected)} applied</span>
            : availableCards.length > 0
              ? <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--ink-ghost)' }}>{availableCards.length} available</span>
              : null
        }
      />
      {availableCards.length === 0 ? (
        <p style={{ fontSize:11, color:'var(--ink-ghost)', textAlign:'center', padding:'8px 0' }}>
          No gift cards with available balance for {retailer}
        </p>
      ) : (
        <>
          <div
            onClick={() => setOpen(o => !o)}
            style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'10px 13px', borderRadius:10, cursor:'pointer',
              background: selectedCards.length > 0 ? 'var(--gold-bg)' : 'var(--parch-warm)',
              border:'1px solid ' + (selectedCards.length > 0 ? 'var(--gold-bdr)' : 'var(--parch-line)'),
              marginBottom: open ? 6 : 0,
            }}
          >
            <div style={{ width:32, height:32, borderRadius:8, background:'var(--gold-bg)', border:'1px solid var(--gold-bdr)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
              &#127873;
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:12, fontWeight:700, color: selectedCards.length > 0 ? 'var(--gold2)' : 'var(--ink)' }}>Gift Cards</p>
              <p style={{ fontSize:9, color:'var(--ink-ghost)', marginTop:1, fontFamily:'var(--font-mono)' }}>
                {selectedCards.length > 0
                  ? `${selectedCards.length} selected · ${fmt$(totalSelected)} applied`
                  : `${availableCards.length} cards · ${fmt$(totalAvailable)} available`}
              </p>
            </div>
            <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:99, background: selectedCards.length > 0 ? 'var(--terrain-bg)' : 'var(--gold-bg)', color: selectedCards.length > 0 ? 'var(--terrain)' : 'var(--gold2)', border:`1px solid ${selectedCards.length > 0 ? 'var(--terrain-bdr)' : 'var(--gold-bdr)'}`, fontFamily:'var(--font-mono)', flexShrink:0 }}>
              {selectedCards.length > 0 ? `${selectedCards.length} selected` : `${availableCards.length} cards`}
            </span>
            <ChevronDownIcon style={{ width:15, height:15, color:'var(--ink-ghost)', flexShrink:0, transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}/>
          </div>
          {open && (
            <div style={{ background:'var(--parch-card)', border:'1px solid var(--gold-bdr)', borderRadius:12, overflow:'hidden', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:'var(--gold-bg)', borderBottom:'1px solid var(--gold-bdr)' }}>
                <span style={{ fontFamily:'var(--font-serif)', fontSize:8, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--gold2)', whiteSpace:'nowrap' }}>Select Cards</span>
                <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." onClick={e=>e.stopPropagation()}
                  style={{ flex:1, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', borderRadius:7, padding:'5px 9px', fontSize:11, color:'var(--ink)', outline:'none' }}/>
                {selectedCards.length > 0 && (
                  <button type="button" onClick={e=>{ e.stopPropagation(); onChange([]); }}
                    style={{ fontSize:9, color:'var(--crimson)', background:'none', border:'none', cursor:'pointer', whiteSpace:'nowrap', fontFamily:'var(--font-serif)', fontWeight:700 }}>Clear all</button>
                )}
              </div>
              <div style={{ maxHeight:240, overflowY:'auto' }}>
                {filteredCards.length === 0
                  ? <p style={{ fontSize:11, color:'var(--ink-ghost)', textAlign:'center', padding:'16px 0' }}>No cards match</p>
                  : filteredCards.map((gc, idx) => {
                    const isSelected = selectedIds.includes(gc.id);
                    const amtUsed    = isSelected ? getAmountUsed(gc) : null;
                    const remaining  = isSelected ? Math.max(0, (gc.value||0)-(amtUsed||0)) : null;
                    return (
                      <div key={gc.id} onClick={e=>{ e.stopPropagation(); toggleCard(gc.id); }}
                        style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', borderBottom:idx<filteredCards.length-1?'1px solid var(--parch-line)':'none', cursor:'pointer', background:isSelected?'var(--terrain-bg)':'transparent' }}
                        onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.background='var(--parch-warm)'; }}
                        onMouseLeave={e=>{ if(!isSelected) e.currentTarget.style.background='transparent'; }}>
                        <div style={{ width:20, height:20, borderRadius:6, flexShrink:0, border:'1.5px solid '+(isSelected?'var(--terrain)':'var(--parch-line)'), background:isSelected?'var(--terrain)':'var(--parch-warm)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {isSelected && <Check style={{ width:11, height:11, color:'#fff' }}/>}
                        </div>
                        <div style={{ width:28, height:28, borderRadius:7, background:'var(--gold-bg)', border:'1px solid var(--gold-bdr)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>&#127873;</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:11, fontWeight:600, color:isSelected?'var(--terrain)':'var(--ink)' }}>{gcDisplayName(gc)} #{gcShortId(gc)}</p>
                          <p style={{ fontSize:9, color:'var(--ink-ghost)', marginTop:1, fontFamily:'var(--font-mono)' }}>
                            {isSelected&&amtUsed!==null&&amtUsed<(gc.value||0) ? `Using ${fmt$(amtUsed)} · ${fmt$(remaining)} stays` : 'Full balance available'}
                          </p>
                        </div>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700, color:isSelected?'var(--terrain)':'var(--gold2)', flexShrink:0 }}>{fmt$(gc.value||0)}</span>
                      </div>
                    );
                  })}
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', background:'var(--parch-warm)', borderTop:'1px solid var(--gold-bdr)' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--terrain)', fontFamily:'var(--font-mono)' }}>{selectedCards.length} selected · {fmt$(totalSelected)} applied</p>
                <button type="button" onClick={e=>{ e.stopPropagation(); setOpen(false); }}
                  style={{ padding:'6px 16px', borderRadius:8, background:'var(--ink)', color:'var(--gold)', fontSize:11, fontWeight:700, border:'none', cursor:'pointer', fontFamily:'var(--font-serif)' }}>Done</button>
              </div>
            </div>
          )}
          {!open && selectedCards.length > 0 && (
            <div style={{ marginTop:8 }}>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
                {selectedCards.map(gc => {
                  const amtUsed   = getAmountUsed(gc);
                  const remaining = Math.max(0,(gc.value||0)-amtUsed);
                  return (
                    <div key={gc.id} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 8px', borderRadius:99, background:'var(--terrain-bg)', border:'1px solid var(--terrain-bdr)', fontSize:10, fontWeight:700, color:'var(--terrain)', fontFamily:'var(--font-mono)' }}>
                      #{gcShortId(gc)} {fmt$(amtUsed)}
                      {remaining>0&&<span style={{ fontSize:8, color:'var(--ink-ghost)', fontWeight:400 }}>({fmt$(remaining)} stays)</span>}
                      <button type="button" onClick={()=>toggleCard(gc.id)} style={{ color:'var(--crimson)', background:'none', border:'none', cursor:'pointer', padding:'0 0 0 2px', fontSize:12, lineHeight:1 }}>x</button>
                    </div>
                  );
                })}
                <button type="button" onClick={()=>setOpen(true)}
                  style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:99, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', fontSize:10, color:'var(--ocean)', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-serif)' }}>
                  + Add more
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
/* ------------------------------------------------------------------ */
/*  CASHBACK BREAKDOWN                                                  */
/* ------------------------------------------------------------------ */
function CashbackBreakdown({ cardCB, yaCB, totalCB, selectedCard, isAmazon, yacbEnabled, cashbackBase }) {
  if (totalCB <= 0) return null;
  return (
    <div style={{ background:'var(--violet-bg)', border:'1px solid var(--violet-bdr)', borderRadius:10, padding:'10px 12px', marginBottom:10 }}>
      <p style={{ fontFamily:'var(--font-serif)', fontSize:8, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--violet)', marginBottom:8 }}>Cashback Sources</p>
      {cardCB > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:9, paddingBottom:6, borderBottom:yaCB>0?'1px solid rgba(90,58,110,0.15)':'none', marginBottom:yaCB>0?6:0 }}>
          <div style={{ width:26, height:26, borderRadius:7, background:'var(--parch-card)', border:'1px solid var(--parch-line)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <BrandLogo domain={getCardDomain(selectedCard?.card_name)} size={22} fallback={selectedCard?.card_name||'C'}/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--violet)' }}>{selectedCard?.card_name||'Credit Card'}</p>
            <p style={{ fontSize:9, color:'var(--ink-ghost)' }}>{selectedCard?.cashback_rate||0}% on {fmt$(cashbackBase)}</p>
          </div>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700, color:'var(--violet)' }}>+{fmt$(cardCB)}</span>
        </div>
      )}
      {yaCB > 0 && isAmazon && yacbEnabled && (
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ width:26, height:26, borderRadius:7, background:'var(--parch-card)', border:'1px solid var(--parch-line)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <BrandLogo domain="amazon.com" size={22} fallback="A"/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--violet)' }}>Amazon Prime Young Adult</p>
            <p style={{ fontSize:9, color:'var(--ink-ghost)' }}>5% extra · capped at $100</p>
          </div>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700, color:'var(--violet)' }}>+{fmt$(yaCB)}</span>
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:8, marginTop:6, borderTop:'1px solid var(--violet-bdr)' }}>
        <span style={{ fontFamily:'var(--font-serif)', fontSize:10, fontWeight:700, color:'var(--violet)' }}>Total Cashback</span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight:700, color:'var(--violet)' }}>+{fmt$(totalCB)}</span>
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                      */
/* ------------------------------------------------------------------ */
export default function NewOrders() {
  const queryClient = useQueryClient();
  const [form,         setForm]         = useState(defaultForm());
  const [receipts,     setReceipts]     = useState([]);
  const [savedVendors, setSavedVendors] = useState(() => {
    try { return JSON.parse(localStorage.getItem('atlas_vendors') || '[]'); } catch { return []; }
  });
  const [previewImg,   setPreviewImg]   = useState(null);
  const [activeTab,    setActiveTab]    = useState('details');
  const [userEmail,    setUserEmail]    = useState(null);
  const [errors,       setErrors]       = useState({});   // ← validation errors

  const set = (field, val) => {
    setForm(prev=>({ ...prev, [field]:val }));
    // Clear error for this field when user starts fixing it
    if (errors[field]) setErrors(prev=>({ ...prev, [field]:'' }));
  };

  useEffect(()=>{ base44.auth.me().then(u=>setUserEmail(u?.email)).catch(()=>{}); },[]);
  const { data:products    =[] } = useQuery({ queryKey:['products'],               queryFn:()=>base44.entities.Product.list() });
  const { data:creditCards =[] } = useQuery({ queryKey:['creditCards',userEmail],   queryFn:()=>userEmail?base44.entities.CreditCard.filter({ created_by:userEmail }):[], enabled:userEmail!==null });
  const { data:giftCards   =[] } = useQuery({ queryKey:['giftCards',userEmail],     queryFn:()=>userEmail?base44.entities.GiftCard.filter({ created_by:userEmail }):[], enabled:userEmail!==null });
  const { data:sellers     =[] } = useQuery({ queryKey:['sellers'],                 queryFn:()=>base44.entities.Seller.list() });

  useEffect(()=>{
    setForm(prev=>({ ...defaultForm(), order_type:prev.order_type, retailer:prev.retailer, credit_card_id:prev.credit_card_id }));
    setReceipts([]);
    setErrors({});
  },[form.order_type]);

  /* ITEM HELPERS */
  const updateItem    = (id,f,v) => setForm(prev=>({ ...prev, items:prev.items.map(it=>it.id!==id?it:{ ...it,[f]:v }) }));
  const addItem       = ()       => setForm(prev=>({ ...prev, items:[...prev.items, defaultItem()] }));
  const removeItem    = (id)     => setForm(prev=>({ ...prev, items:prev.items.length>1?prev.items.filter(it=>it.id!==id):prev.items }));
  const duplicateItem = (id)     => setForm(prev=>{
    const idx=prev.items.findIndex(it=>it.id===id);
    const copy={ ...prev.items[idx], id:crypto.randomUUID() };
    const items=[...prev.items]; items.splice(idx+1,0,copy);
    return { ...prev, items };
  });
  const applyUPC = useCallback((result) => {
    const newItem = {
      ...defaultItem(),
      product_id:        result.product_id || '',
      product_name:      result.title || '',
      upc:               result.upc   || '',
      product_image_url: result.image || '',
      unit_cost:         result.price ? String(parseFloat(result.price)) : '',
    };
    setForm(prev=>({ ...prev, items:[...prev.items.filter(it=>it.product_name.trim()||parseFloat(it.unit_cost)>0), newItem] }));
    toast.success('Product added from UPC');
  }, []);

  /* TRACKING */
  const updateTracking = (idx,val) => setForm(prev=>{ const t=[...prev.tracking_numbers]; t[idx]=val; return { ...prev, tracking_numbers:t }; });
  const addTracking    = ()         => setForm(prev=>({ ...prev, tracking_numbers:[...prev.tracking_numbers,''] }));
  const removeTracking = (idx)      => setForm(prev=>({ ...prev, tracking_numbers:prev.tracking_numbers.length>1?prev.tracking_numbers.filter((_,i)=>i!==idx):[''] }));

  /* SALE EVENTS */
  const addSaleEvent = () => {
    const ev=defaultSaleEvent();
    ev.items=form.items.filter(it=>it.product_name?.trim()).map(it=>({ product_name:it.product_name, quantity:1, sale_price:0 }));
    setForm(prev=>({ ...prev, sale_events:[...prev.sale_events, ev] }));
  };
  const removeSaleEvent     = (id)          => setForm(prev=>({ ...prev, sale_events:prev.sale_events.filter(e=>e.id!==id) }));
  const updateSaleEvent     = (id,f,v)      => setForm(prev=>({ ...prev, sale_events:prev.sale_events.map(e=>e.id!==id?e:{ ...e,[f]:v }) }));
  const updateSaleEventItem = (eid,idx,f,v) => setForm(prev=>({
    ...prev,
    sale_events:prev.sale_events.map(e=>{
      if(e.id!==eid) return e;
      return { ...e, items:e.items.map((it,i)=>i!==idx?it:{ ...it,[f]:v }) };
    })
  }));

  /* CALCULATIONS */
  const isSplit         = form.payment_splits?.length > 1;
  const primaryCardId   = isSplit ? (form.payment_splits[0]?.card_id||'') : form.credit_card_id;
  const selectedCard    = creditCards.find(c=>c.id===primaryCardId);
  const isAmazon        = form.retailer === 'Amazon';
  const statuses        = form.order_type==='churning' ? CHURNING_STATUSES : MARKETPLACE_STATUSES;
  const itemsSubtotal = useMemo(()=>form.items.reduce((s,it)=>s+(parseFloat(it.unit_cost)||0)*(parseInt(it.quantity_ordered)||1),0),[form.items]);
  const tax           = parseFloat(form.tax)||0;
  const shipping      = parseFloat(form.shipping_cost)||0;
  const fees          = parseFloat(form.fees)||0;
  const totalCost     = itemsSubtotal+tax+shipping+fees;
  const giftCardTotal = useMemo(()=>form.gift_card_ids.reduce((s,id)=>{ const gc=giftCards.find(g=>g.id===id); return s+(gc?.value||0); },0),[form.gift_card_ids,giftCards]);
  const finalCost     = totalCost - giftCardTotal;
  const cardRate      = parseFloat(form.cashback_rate_override)||selectedCard?.cashback_rate||0;
  const cashbackBase  = (totalCost-giftCardTotal) - (!form.include_tax_in_cashback?tax:0) - (!form.include_shipping_in_cashback?shipping:0);
  const splitCBTotal  = isSplit ? form.payment_splits.reduce((sum,sp)=>{ const c=creditCards.find(x=>x.id===sp.card_id); return sum+((parseFloat(sp.amount)||0)*(c?.cashback_rate||0)/100); },0) : 0;
  const cardCB        = isSplit ? splitCBTotal : Math.max(0,cashbackBase)*cardRate/100;
  const yaCB          = form.amazon_yacb&&isAmazon ? Math.min(cashbackBase*0.05,100) : 0;
  const totalCB       = cardCB+yaCB;
  const totalSalePrice = form.sale_events?.reduce((sum,ev)=>sum+(ev.items?.reduce((s,it)=>s+(parseFloat(it.sale_price)||0)*(parseInt(it.quantity)||1),0)||0),0)||0;
  const netProfit     = totalSalePrice>0 ? totalSalePrice-totalCost+totalCB : totalCB;
  const validItemCount = form.items.filter(it=>it.product_name?.trim()&&parseFloat(it.unit_cost)>0).length;
  const hasSales      = totalSalePrice > 0;

  /* SALE ITEM PROFIT */
  const getSaleItemProfit = (saleItem, orderItems) => {
    const matched = orderItems.find(oi=>oi.product_name?.toLowerCase()===saleItem.product_name?.toLowerCase());
    if (!matched) return null;
    const cost    = (parseFloat(matched.unit_cost)||0)*(parseInt(saleItem.quantity)||1);
    const revenue = (parseFloat(saleItem.sale_price)||0)*(parseInt(saleItem.quantity)||1);
    const profit  = revenue - cost;
    const roi     = cost > 0 ? (profit/cost)*100 : 0;
    return { profit, roi, cost };
  };

  /* VALIDATE — returns errors object, empty = valid */
  const validate = () => {
    const e = {};
    if (!form.retailer?.trim()) e.retailer = 'Vendor is required';
    const validItems = form.items.filter(it=>it.product_name?.trim()&&parseFloat(it.unit_cost)>0);
    if (validItems.length === 0) e.items = 'At least one item with a name and price is required';
    if (isSplit) {
      const t = form.payment_splits.reduce((s,sp)=>s+(parseFloat(sp.amount)||0),0);
      if (Math.abs(t-finalCost)>0.01) e.splits = 'Split amounts must equal the final cost';
      if (form.payment_splits.some(sp=>!sp.card_id)) e.splits = 'Select a card for each split';
    }
    return e;
  };

  /* SUBMIT */
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const order = await base44.entities.PurchaseOrder.create(data);
      if (data.gift_card_ids?.length>0) {
        for (const cardId of data.gift_card_ids)
          await base44.entities.GiftCard.update(cardId,{ status:'used', used_order_number:data.order_number });
        queryClient.invalidateQueries({ queryKey:['giftCards'] });
      }
      if (isSplit) {
        for (const sp of data.payment_splits) {
          const c=creditCards.find(x=>x.id===sp.card_id); if(!c) continue;
          const cb=parseFloat((sp.amount*(c.cashback_rate||0)/100).toFixed(2));
          if(cb>0) await base44.entities.Reward.create({ credit_card_id:sp.card_id, card_name:c.card_name, source:c.card_name, type:'cashback', currency:'USD', purchase_amount:sp.amount, amount:cb, purchase_order_id:order.id, order_number:order.order_number, date_earned:order.order_date, status:'pending', notes:`Auto from ${order.order_number} (split)` });
        }
        queryClient.invalidateQueries({ queryKey:['rewards'] });
      } else if (order.credit_card_id&&totalCB>0) {
        const c=creditCards.find(x=>x.id===order.credit_card_id);
        if(c) { await base44.entities.Reward.create({ credit_card_id:order.credit_card_id, card_name:c.card_name, source:c.card_name, type:'cashback', currency:'USD', purchase_amount:cashbackBase, amount:parseFloat(totalCB.toFixed(2)), purchase_order_id:order.id, order_number:order.order_number, date_earned:order.order_date, status:'pending', notes:`Auto from ${order.order_number}` }); queryClient.invalidateQueries({ queryKey:['rewards'] }); }
      }
      return order;
    },
    onSuccess:(_, data)=>{
      queryClient.invalidateQueries({ queryKey:['purchaseOrders'] });
      toast.success('Order created!');
      if (data?.retailer) {
        setSavedVendors(prev => {
          const updated = [...new Set([...prev, data.retailer])].sort();
          try { localStorage.setItem('atlas_vendors', JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
      setReceipts([]);
      setErrors({});
      setForm(prev=>({ ...defaultForm(), order_type:prev.order_type, retailer:prev.retailer, credit_card_id:prev.credit_card_id }));
    },
    onError:()=>toast.error('Failed to create order'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Auto-navigate to the tab with the first error
      if (errs.retailer) setActiveTab('details');
      else if (errs.items) setActiveTab('items');
      else if (errs.splits) setActiveTab('payment');
      return;
    }
    const pcId=isSplit?(form.payment_splits[0]?.card_id||null):(form.credit_card_id||null);
    const pc=creditCards.find(c=>c.id===pcId);
    createMutation.mutate({
      order_type:form.order_type,
      order_number:form.order_number?.trim()||`ORD-${Date.now()}`,
      tracking_numbers:form.tracking_numbers.map(t=>t.trim()).filter(Boolean),
      retailer:form.retailer,
      marketplace_platform:form.marketplace_platform||null,
      account:form.account||null,
      status:form.status,
      product_category:form.product_category||null,
      order_date:form.order_date,
      tax, shipping_cost:shipping, fees,
      total_cost:totalCost,
      gift_card_value:giftCardTotal,
      final_cost:finalCost,
      credit_card_id:pcId,
      card_name:pc?.card_name||null,
      payment_splits:isSplit?form.payment_splits.map(sp=>({ card_id:sp.card_id, card_name:sp.card_name, amount:parseFloat(sp.amount)||0 })):[],
      gift_card_ids:form.gift_card_ids,
      include_tax_in_cashback:form.include_tax_in_cashback,
      include_shipping_in_cashback:form.include_shipping_in_cashback,
      extra_cashback_percent:form.amazon_yacb&&isAmazon?5:0,
      bonus_notes:form.amazon_yacb&&isAmazon?'Prime Young Adult':null,
      notes:form.notes||null,
      fulfillment_type:form.fulfillment_type||'ship_to_me',
      dropship_to:form.fulfillment_type==='direct_dropship'?form.dropship_to:null,
      has_receipts:receipts.length>0,
      items:form.items.filter(it=>it.product_name?.trim()&&parseFloat(it.unit_cost)>0).map(it=>({ product_id:it.product_id||null, product_name:it.product_name.trim(), upc:it.upc||null, quantity_ordered:parseInt(it.quantity_ordered)||1, quantity_received:0, unit_cost:parseFloat(it.unit_cost)||0, product_image_url:it.product_image_url||null })),
      sale_events:form.sale_events.map(ev=>({ ...ev, items:ev.items.map(it=>({ product_name:it.product_name||'', quantity:parseInt(it.quantity??1)||1, sale_price:parseFloat(it.sale_price)||0 })) })),
    });
  };

  const TABS = [
    { id:'details', label:'Details', icon:ClipboardList, hasError: !!errors.retailer },
    { id:'items',   label:'Items',   icon:Package,       hasError: !!errors.items    },
    { id:'payment', label:'Payment', icon:CreditCard,    hasError: !!errors.splits   },
    { id:'sales',   label:'Sales',   icon:DollarSign,    hasError: false             },
  ];

  return (
    <div style={{ maxWidth:720, margin:'0 auto', paddingBottom:40 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {previewImg && <ImagePreviewModal src={previewImg.src} alt={previewImg.alt} onClose={()=>setPreviewImg(null)}/>}

      <div style={{ marginBottom:20 }}>
        <h1 className="page-title">Add Order</h1>
        <p className="page-subtitle">Record a new purchase</p>
      </div>

      {/* Global validation banner — shows when there are errors */}
      {Object.keys(errors).length > 0 && (
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', borderRadius:10, background:'var(--crimson-bg)', border:'1px solid var(--crimson-bdr)', marginBottom:14 }}>
          <AlertCircle style={{ width:15, height:15, color:'var(--crimson)', flexShrink:0, marginTop:1 }} />
          <div>
            <p style={{ fontSize:12, fontWeight:700, color:'var(--crimson)', marginBottom:4 }}>Please fix the following before saving:</p>
            <ul style={{ margin:0, paddingLeft:16 }}>
              {Object.values(errors).filter(Boolean).map((msg, i) => (
                <li key={i} style={{ fontSize:11, color:'var(--crimson)', marginBottom:2 }}>{msg}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Mode toggle + tabs */}
        <div style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:14, padding:14, marginBottom:14 }}>
          <div style={{ display:'flex', gap:4, padding:4, borderRadius:10, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', width:'fit-content', marginBottom:14 }}>
            {[{ v:'churning',label:'Churning',icon:Tag,color:'var(--gold)',bg:'var(--gold-bg)',bdr:'var(--gold-bdr)' },
              { v:'marketplace',label:'Marketplace',icon:Globe,color:'var(--ocean)',bg:'var(--ocean-bg)',bdr:'var(--ocean-bdr)' }].map(({ v,label,icon:Icon,color,bg,bdr })=>(
              <button key={v} type="button" onClick={()=>set('order_type',v)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', border:'1px solid', fontFamily:'var(--font-serif)',
                  ...(form.order_type===v?{ background:bg, color, borderColor:bdr }:{ background:'transparent', color:'var(--ink-dim)', borderColor:'transparent' }) }}>
                <Icon style={{ width:13, height:13 }}/> {label}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--parch-line)' }}>
            {TABS.map(tab=>{
              const TabIcon=tab.icon;
              return (
                <button key={tab.id} type="button" onClick={()=>setActiveTab(tab.id)}
                  style={{ padding:'9px 14px', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5, background:'transparent', border:'none', outline:'none', fontFamily:'var(--font-serif)',
                    borderBottom:activeTab===tab.id?'2px solid var(--gold)':'2px solid transparent',
                    color: tab.hasError ? 'var(--crimson)' : activeTab===tab.id?'var(--gold)':'var(--ink-ghost)',
                    transition:'all 0.15s', marginBottom:-1 }}>
                  <TabIcon style={{ width:13, height:13 }}/>
                  {tab.label}
                  {tab.hasError && <AlertCircle style={{ width:10, height:10, color:'var(--crimson)' }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* DETAILS TAB */}
        {activeTab==='details' && (
          <div style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:14, padding:16, marginBottom:14 }}>
            <SectionHeader color="var(--gold)" title="Vendor & Order"/>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:10, marginBottom:10 }}>
              <div>
                <LBL error={!!errors.retailer}>Vendor *</LBL>
                <VendorAutocomplete value={form.retailer} onChange={v=>set('retailer',v)} savedVendors={savedVendors} hasError={!!errors.retailer}/>
                <FieldError message={errors.retailer} />
              </div>
              <div>
                <LBL>Status</LBL>
                <Select value={form.status} onValueChange={v=>set('status',v)}>
                  <SelectTrigger className="h-9" style={INP}><SelectValue/></SelectTrigger>
                  <SelectContent style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)' }}>
                    {statuses.map(s=><SelectItem key={s.value} value={s.value} style={{ color:'var(--ink)' }}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <LBL>Order Number</LBL>
                <Input style={INP} className="h-9" value={form.order_number} onChange={e=>set('order_number',e.target.value)} placeholder="112-345..."/>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:10, marginBottom:10 }}>
              <div>
                <LBL>Order Date</LBL>
                <Input type="date" style={INP} className="h-9" value={form.order_date} onChange={e=>set('order_date',e.target.value)}/>
              </div>
              <div>
                <LBL>Account</LBL>
                <Input style={INP} className="h-9" value={form.account} onChange={e=>set('account',e.target.value)} placeholder="Account used"/>
              </div>
            </div>
            <div style={{ marginBottom:10 }}>
              <LBL>Tracking Number(s)</LBL>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {form.tracking_numbers.map((tn,idx)=>(
                  <div key={idx} style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <Input style={{ ...INP, flex:1 }} className="h-8" value={tn} onChange={e=>updateTracking(idx,e.target.value)} placeholder="1Z999AA1..."/>
                    {form.tracking_numbers.length>1&&(
                      <button type="button" onClick={()=>removeTracking(idx)} style={{ color:'var(--crimson)', background:'none', border:'none', cursor:'pointer', padding:4 }}>
                        <Minus style={{ width:14, height:14 }}/>
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addTracking} style={{ fontSize:12, color:'var(--terrain)', background:'none', border:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:4 }}>
                  <Plus style={{ width:12, height:12 }}/> Add tracking number
                </button>
              </div>
            </div>
            <div style={{ display:'flex', gap:4, padding:3, borderRadius:10, background:'var(--parch-warm)', border:'1px solid var(--parch-line)', width:'fit-content', marginBottom:12 }}>
              {[{ v:'ship_to_me',label:'Ship to Me',color:'var(--ocean)',bg:'var(--ocean-bg)',bdr:'var(--ocean-bdr)' },
                { v:'store_pickup',label:'Store Pickup',color:'var(--violet)',bg:'var(--violet-bg)',bdr:'var(--violet-bdr)' },
                { v:'direct_dropship',label:'Dropship',color:'var(--gold)',bg:'var(--gold-bg)',bdr:'var(--gold-bdr)' }].map(({ v,label,color,bg,bdr })=>(
                <button key={v} type="button" onClick={()=>set('fulfillment_type',v)}
                  style={{ padding:'6px 12px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', border:'1px solid', fontFamily:'var(--font-serif)',
                    ...(form.fulfillment_type===v?{ background:bg, borderColor:bdr, color }:{ background:'transparent', borderColor:'transparent', color:'var(--ink-ghost)' }) }}>
                  {label}
                </button>
              ))}
            </div>
            {form.fulfillment_type==='direct_dropship' && (
              <div style={{ marginBottom:10 }}>
                <LBL>Ship To (Buyer)</LBL>
                <Select value={form.dropship_to} onValueChange={v=>set('dropship_to',v)}>
                  <SelectTrigger className="h-8 text-xs" style={INP}><SelectValue placeholder="Select buyer..."/></SelectTrigger>
                  <SelectContent style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)' }}>
                    {sellers.map(s=><SelectItem key={s.id} value={s.name} style={{ color:'var(--ink)' }}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.fulfillment_type==='store_pickup' && (
              <div style={{ marginBottom:10 }}>
                <LBL>Pickup Location</LBL>
                <Input style={INP} className="h-8" value={form.pickup_location} onChange={e=>set('pickup_location',e.target.value)} placeholder="e.g. Downtown Store"/>
              </div>
            )}
            <div>
              <LBL>Notes</LBL>
              <Textarea value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any notes..." rows={2}
                style={{ ...INP, width:'100%', padding:'8px 12px', resize:'vertical', fontSize:13 }}/>
            </div>
          </div>
        )}

        {/* ITEMS TAB */}
        {activeTab==='items' && (
          <div style={{ background:'var(--parch-card)', border:`1px solid ${errors.items?'var(--crimson-bdr)':'var(--parch-line)'}`, borderRadius:14, padding:16, marginBottom:14 }}>
            <SectionHeader color={errors.items?'var(--crimson)':'var(--ocean)'} title="Order Items"
              right={<span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--ocean)', background:'var(--ocean-bg)', padding:'2px 7px', borderRadius:99, border:'1px solid var(--ocean-bdr)' }}>{form.items.length} item{form.items.length!==1?'s':''}</span>}
            />
            {errors.items && (
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', borderRadius:8, background:'var(--crimson-bg)', border:'1px solid var(--crimson-bdr)', marginBottom:12 }}>
                <AlertCircle style={{ width:13, height:13, color:'var(--crimson)', flexShrink:0 }} />
                <span style={{ fontSize:11, color:'var(--crimson)', fontWeight:600 }}>{errors.items}</span>
              </div>
            )}
            <UPCLookupBar products={products} onApply={applyUPC}/>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {form.items.map((item,idx)=>(
                <div key={item.id} style={{ borderRadius:10, padding:12, background:'var(--parch-warm)', border:`1px solid ${errors.items&&!item.product_name?.trim()?'var(--crimson-bdr)':'var(--parch-line)'}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <span style={{ fontFamily:'var(--font-serif)', fontSize:8, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ocean)', background:'var(--ocean-bg)', padding:'2px 8px', borderRadius:20, border:'1px solid var(--ocean-bdr)' }}>
                      Item {idx+1}
                    </span>
                    <div style={{ display:'flex', gap:4 }}>
                      <button type="button" onClick={()=>duplicateItem(item.id)} style={{ padding:4, borderRadius:6, color:'var(--ink-dim)', background:'var(--parch-card)', border:'1px solid var(--parch-line)', cursor:'pointer' }}><Copy style={{ width:13, height:13 }}/></button>
                      {form.items.length>1&&<button type="button" onClick={()=>removeItem(item.id)} style={{ padding:4, borderRadius:6, color:'var(--crimson)', background:'var(--crimson-bg)', border:'1px solid var(--crimson-bdr)', cursor:'pointer' }}><Trash2 style={{ width:13, height:13 }}/></button>}
                    </div>
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <LBL error={errors.items&&!item.product_name?.trim()}>Product {errors.items&&!item.product_name?.trim()?'(required)':''}</LBL>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                      <ItemThumb src={item.product_image_url} name={item.product_name} onClick={()=>item.product_image_url&&setPreviewImg({ src:item.product_image_url, alt:item.product_name })}/>
                      <div style={{ flex:1 }}>
                        <ProductAutocomplete
                          products={products}
                          nameValue={item.product_name||''}
                          upcValue={item.upc||''}
                          searchField="name"
                          onSelect={p=>{ updateItem(item.id,'product_id',p.id); updateItem(item.id,'product_name',p.name); updateItem(item.id,'upc',p.upc||''); updateItem(item.id,'product_image_url',p.image||''); }}
                          onChangeName={val=>{ updateItem(item.id,'product_name',val); if(errors.items) setErrors(prev=>({...prev,items:''})); }}
                          placeholder="e.g. iPad Air"
                        />
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                    <div>
                      <LBL error={errors.items&&!parseFloat(item.unit_cost)}>Unit Price {errors.items&&!parseFloat(item.unit_cost)?'(required)':''}</LBL>
                      <div style={{ position:'relative' }}>
                        <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--ink-ghost)', fontSize:12 }}>$</span>
                        <Input className="h-8 text-sm" style={{ ...INP, paddingLeft:22, borderColor: errors.items&&!parseFloat(item.unit_cost)?'var(--crimson)':'var(--parch-line)', background: errors.items&&!parseFloat(item.unit_cost)?'var(--crimson-bg)':'var(--parch-warm)' }} type="number" step="0.01" min="0" value={item.unit_cost||''} onChange={e=>{ updateItem(item.id,'unit_cost',e.target.value); if(errors.items) setErrors(prev=>({...prev,items:''})); }} placeholder="0.00"/>
                      </div>
                    </div>
                    <div>
                      <LBL>Qty</LBL>
                      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <Input className="h-8 text-sm text-center" style={{ ...INP, width:44, flexShrink:0 }} type="number" min="1" value={item.quantity_ordered||1} onChange={e=>updateItem(item.id,'quantity_ordered',e.target.value)}/>
                        {[2,5,10].map(n=>(
                          <button key={n} type="button" onClick={()=>updateItem(item.id,'quantity_ordered',n)}
                            style={{ padding:'3px 6px', borderRadius:6, fontSize:10, fontWeight:700,
                              background:parseInt(item.quantity_ordered)===n?'var(--ocean-bg)':'var(--parch-card)',
                              color:parseInt(item.quantity_ordered)===n?'var(--ocean2)':'var(--ink-ghost)',
                              border:'1px solid '+(parseInt(item.quantity_ordered)===n?'var(--ocean-bdr)':'var(--parch-line)'),
                              cursor:'pointer', fontFamily:'var(--font-mono)' }}>
                            x{n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <LBL>Total</LBL>
                      <div style={{ height:32, display:'flex', alignItems:'center', paddingLeft:9, fontFamily:'var(--font-mono)', fontSize:13, color:'var(--ocean)', fontWeight:600 }}>
                        {fmt$((parseFloat(item.unit_cost)||0)*(parseInt(item.quantity_ordered)||1))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem}
              style={{ marginTop:10, width:'100%', padding:'8px 0', borderRadius:8, fontSize:12, color:'var(--terrain)', background:'none', border:'1px dashed var(--terrain-bdr)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Plus style={{ width:14, height:14 }}/> Add Item
            </button>
          </div>
        )}

        {/* PAYMENT TAB */}
        {activeTab==='payment' && (
          <div style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:14, padding:16, marginBottom:14 }}>
            <SectionHeader color="var(--gold)" title="Costs"/>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(80px,1fr))', gap:10, marginBottom:12 }}>
              {[['Tax','tax'],['Shipping','shipping_cost'],['Fees','fees']].map(([lbl,field])=>(
                <div key={field}>
                  <LBL>{lbl}</LBL>
                  <div style={{ position:'relative' }}>
                    <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'var(--ink-ghost)', fontSize:12 }}>$</span>
                    <Input className="h-8 text-sm" style={{ ...INP, paddingLeft:20 }} type="number" step="0.01" min="0" value={form[field]} onChange={e=>set(field,e.target.value)} placeholder="0.00"/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background:'var(--parch-warm)', border:'1px solid var(--parch-line)', borderRadius:9, padding:'9px 12px', marginBottom:16 }}>
              {[['Items subtotal', fmt$(itemsSubtotal), 'var(--ink)'],
                (tax+shipping+fees)>0&&['Tax + ship + fees', '+'+fmt$(tax+shipping+fees), 'var(--ink-faded)'],
                giftCardTotal>0&&['Gift cards', '-'+fmt$(giftCardTotal), 'var(--gold2)'],
              ].filter(Boolean).map(([l,v,c])=>(
                <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'3px 0' }}>
                  <span style={{ color:'var(--ink-dim)' }}>{l}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontWeight:600, color:c }}>{v}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', paddingTop:6, marginTop:4, borderTop:'1px solid var(--parch-line)' }}>
                <span style={{ fontWeight:700, color:'var(--ink)', fontSize:13 }}>Total cost</span>
                <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--gold)', fontSize:14 }}>{fmt$(finalCost)}</span>
              </div>
            </div>
            <SectionHeader color="var(--ocean)" title="Credit Card"/>
            {!isSplit ? (
              <Select value={form.credit_card_id||''} onValueChange={v=>set('credit_card_id',v)}>
                <SelectTrigger className="h-9" style={INP}>
                  {form.credit_card_id ? (
                    <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
                      <BrandLogo domain={getCardDomain(selectedCard?.card_name)} size={16} fallback={selectedCard?.card_name||'C'}/>
                      <span style={{ fontSize:12, flex:1 }}>{selectedCard?.card_name}</span>
                      {selectedCard?.cashback_rate>0&&<span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--violet)', fontWeight:700 }}>{selectedCard.cashback_rate}% CB</span>}
                    </div>
                  ) : <SelectValue placeholder="Select card..."/>}
                </SelectTrigger>
                <SelectContent style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)' }}>
                  {creditCards.filter(c=>c.active!==false).map(c=>(
                    <SelectItem key={c.id} value={c.id} style={{ color:'var(--ink)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <BrandLogo domain={getCardDomain(c.card_name)} size={18} fallback={c.card_name}/>
                        <span>{c.card_name}{c.last_4_digits?` ...${c.last_4_digits}`:''}</span>
                        {c.cashback_rate>0&&<span style={{ color:'var(--violet)', fontFamily:'var(--font-mono)', fontSize:11 }}>{c.cashback_rate}%</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div style={{ marginBottom:8 }}>
                {form.payment_splits.map((sp,idx)=>{
                  const spCard=creditCards.find(c=>c.id===sp.card_id);
                  return (
                    <div key={idx} style={{ display:'grid', gridTemplateColumns:'5fr 3fr 28px', gap:8, alignItems:'end', padding:'10px 12px', borderRadius:10, background:'var(--parch-warm)', border:`1px solid ${errors.splits?'var(--crimson-bdr)':'var(--parch-line)'}`, marginBottom:6 }}>
                      <div>
                        <LBL error={!!errors.splits}>Card</LBL>
                        <Select value={sp.card_id||''} onValueChange={v=>{ const c=creditCards.find(x=>x.id===v); setForm(prev=>({ ...prev, payment_splits:prev.payment_splits.map((s,i)=>i===idx?{ ...s, card_id:v, card_name:c?.card_name||'' }:s) })); if(errors.splits) setErrors(p=>({...p,splits:''})); }}>
                          <SelectTrigger className="h-8 text-xs" style={INP}>{sp.card_id?<div style={{ display:'flex', alignItems:'center', gap:6 }}><BrandLogo domain={getCardDomain(spCard?.card_name)} size={14}/><span>{spCard?.card_name}</span></div>:<SelectValue placeholder="Card..."/>}</SelectTrigger>
                          <SelectContent style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)' }}>
                            {creditCards.filter(c=>c.active!==false).map(c=><SelectItem key={c.id} value={c.id} style={{ color:'var(--ink)' }}><div style={{ display:'flex', alignItems:'center', gap:8 }}><BrandLogo domain={getCardDomain(c.card_name)} size={16}/>{c.card_name}</div></SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <LBL error={!!errors.splits}>Amount</LBL>
                        <div style={{ position:'relative' }}><span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'var(--ink-ghost)', fontSize:11 }}>$</span>
                          <Input className="h-8 text-xs" style={{ ...INP, paddingLeft:20 }} type="number" step="0.01" min="0" value={sp.amount} onChange={e=>{ setForm(prev=>({ ...prev, payment_splits:prev.payment_splits.map((s,i)=>i===idx?{ ...s, amount:e.target.value }:s) })); if(errors.splits) setErrors(p=>({...p,splits:''})); }} placeholder="0.00"/></div>
                      </div>
                      <button type="button" onClick={()=>setForm(prev=>({ ...prev, payment_splits:prev.payment_splits.filter((_,i)=>i!==idx) }))} style={{ color:'var(--crimson)', background:'none', border:'none', cursor:'pointer', padding:4, marginTop:18 }}><Trash2 style={{ width:13, height:13 }}/></button>
                    </div>
                  );
                })}
                {errors.splits && <FieldError message={errors.splits} />}
              </div>
            )}
            <div style={{ display:'flex', gap:8, margin:'10px 0 14px', flexWrap:'wrap' }}>
              <button type="button" onClick={()=>setForm(prev=>({ ...prev, payment_splits:[...(prev.payment_splits||[]), { card_id:'', card_name:'', amount:'' }] }))}
                style={{ fontSize:11, fontWeight:700, color:'var(--violet)', padding:'6px 12px', borderRadius:8, background:'var(--violet-bg)', border:'1px solid var(--violet-bdr)', cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontFamily:'var(--font-serif)' }}>
                <Plus style={{ width:12, height:12 }}/> Split payment
              </button>
              {isSplit&&<button type="button" onClick={()=>set('payment_splits',[])} style={{ fontSize:12, color:'var(--ink-dim)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Single card</button>}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:14 }}>
              {[{ field:'include_tax_in_cashback', label:'Tax in cashback' },{ field:'include_shipping_in_cashback', label:'Shipping in cashback' }].map(({ field, label })=>(
                <label key={field} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--ink-faded)', cursor:'pointer' }}>
                  <input type="checkbox" checked={form[field]} onChange={e=>set(field,e.target.checked)}/>{label}
                </label>
              ))}
              {isAmazon && (
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer', padding:'4px 10px', borderRadius:8, border:'1px solid',
                  ...(form.amazon_yacb?{ background:'var(--gold-bg)', borderColor:'var(--gold-bdr)', color:'var(--gold2)' }:{ background:'var(--parch-warm)', borderColor:'var(--parch-line)', color:'var(--ink-dim)' }) }}>
                  <input type="checkbox" checked={form.amazon_yacb} onChange={e=>set('amazon_yacb',e.target.checked)}/>Amazon YA 5%
                </label>
              )}
            </div>
            <CashbackBreakdown cardCB={cardCB} yaCB={yaCB} totalCB={totalCB} selectedCard={selectedCard} isAmazon={isAmazon} yacbEnabled={form.amazon_yacb} cashbackBase={cashbackBase}/>
            <GiftCardSection giftCards={giftCards} selectedIds={form.gift_card_ids} onChange={ids=>set('gift_card_ids',ids)} retailer={form.retailer} orderTotal={totalCost}/>
          </div>
        )}

        {/* SALES TAB */}
        {activeTab==='sales' && (
          <div style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:14, padding:16, marginBottom:14 }}>
            <SectionHeader color="var(--terrain)" title="Sale Events"
              right={<button type="button" onClick={addSaleEvent} style={{ fontSize:10, fontWeight:700, color:'var(--terrain)', padding:'4px 10px', borderRadius:8, background:'var(--parch-warm)', border:'1px solid var(--terrain-bdr)', cursor:'pointer', fontFamily:'var(--font-serif)', display:'flex', alignItems:'center', gap:4 }}><Plus style={{ width:11, height:11 }}/> Record Sale</button>}
            />
            {form.sale_events.length===0 ? (
              <div style={{ textAlign:'center', padding:'32px 0' }}>
                <DollarSign style={{ width:32, height:32, color:'var(--terrain-bdr)', margin:'0 auto 8px' }}/>
                <p style={{ color:'var(--ink-dim)', fontSize:13, marginBottom:12 }}>No sale events yet</p>
                <button type="button" onClick={addSaleEvent} style={{ fontSize:12, fontWeight:600, color:'var(--terrain)', padding:'8px 20px', borderRadius:10, background:'var(--parch-warm)', border:'1px solid var(--terrain-bdr)', cursor:'pointer' }}>+ Record First Sale</button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {form.sale_events.map((ev,evIdx)=>(
                  <div key={ev.id} style={{ borderRadius:10, padding:12, background:'var(--parch-warm)', border:'1px solid var(--terrain-bdr)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                      <span style={{ fontFamily:'var(--font-serif)', fontSize:8, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--terrain)', background:'var(--terrain-bg)', padding:'2px 8px', borderRadius:99, border:'1px solid var(--terrain-bdr)' }}>Sale {evIdx+1}</span>
                      <button type="button" onClick={()=>removeSaleEvent(ev.id)} style={{ color:'var(--crimson)', background:'none', border:'none', cursor:'pointer', padding:4 }}><Trash2 style={{ width:13, height:13 }}/></button>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:8, marginBottom:10 }}>
                      <div>
                        <LBL>Buyer / Platform</LBL>
                        <Select value={ev.buyer||''} onValueChange={v=>updateSaleEvent(ev.id,'buyer',v)}>
                          <SelectTrigger className="h-8 text-xs" style={INP}><SelectValue placeholder="Select buyer..."/></SelectTrigger>
                          <SelectContent style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)' }}>
                            {sellers.map(s=><SelectItem key={s.id} value={s.name} style={{ color:'var(--ink)' }}>{s.name}</SelectItem>)}
                            {['eBay','Amazon','Facebook Marketplace','Mercari','OfferUp'].map(p=><SelectItem key={p} value={p} style={{ color:'var(--ink)' }}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <LBL>Sale Date</LBL>
                        <Input type="date" className="h-8 text-xs" style={INP} value={ev.sale_date||''} onChange={e=>updateSaleEvent(ev.id,'sale_date',e.target.value)}/>
                      </div>
                      <div>
                        <LBL>Payout Date</LBL>
                        <Input type="date" className="h-8 text-xs" style={INP} value={ev.payout_date||''} onChange={e=>updateSaleEvent(ev.id,'payout_date',e.target.value)}/>
                      </div>
                    </div>
                    <LBL>Items Sold</LBL>
                    <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                      {ev.items.map((it,itIdx)=>{
                        const pp=getSaleItemProfit(it,form.items);
                        const isProfit=pp?pp.profit>=0:null;
                        return (
                          <div key={itIdx} style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:9, padding:'9px 10px' }}>
                            <div style={{ display:'grid', gridTemplateColumns:'4fr 1.5fr 2.5fr 20px', gap:6, alignItems:'center', marginBottom:pp?7:0 }}>
                              <Input className="h-7 text-xs" style={INP} value={it.product_name||''} placeholder="Product" onChange={e=>updateSaleEventItem(ev.id,itIdx,'product_name',e.target.value)}/>
                              <Input className="h-7 text-xs text-center" style={INP} type="number" min="1" value={it.quantity??1} placeholder="1" onChange={e=>updateSaleEventItem(ev.id,itIdx,'quantity',parseInt(e.target.value)||1)}/>
                              <div style={{ position:'relative' }}>
                                <span style={{ position:'absolute', left:7, top:'50%', transform:'translateY(-50%)', color:'var(--ink-ghost)', fontSize:11 }}>$</span>
                                <Input className="h-7 text-xs" style={{ ...INP, paddingLeft:18 }} type="number" step="0.01" min="0" value={it.sale_price||''} placeholder="Price" onChange={e=>updateSaleEventItem(ev.id,itIdx,'sale_price',e.target.value)}/>
                              </div>
                              <button type="button" onClick={()=>updateSaleEvent(ev.id,'items',ev.items.filter((_,i)=>i!==itIdx))} style={{ color:'var(--ink-ghost)', background:'none', border:'none', cursor:'pointer', padding:2 }}><X style={{ width:12, height:12 }}/></button>
                            </div>
                            {pp!==null&&it.sale_price>0&&(
                              <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:7, borderTop:'1px solid var(--parch-line)', flexWrap:'wrap' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                                  <span style={{ fontFamily:'var(--font-serif)', fontSize:8, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--ink-ghost)' }}>Profit</span>
                                  <span style={{ fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700, color:isProfit?'var(--terrain)':'var(--crimson)' }}>{isProfit?'+':''}{fmt$(pp.profit)}</span>
                                </div>
                                <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:99, fontFamily:'var(--font-mono)', background:isProfit?'var(--terrain-bg)':'var(--crimson-bg)', color:isProfit?'var(--terrain)':'var(--crimson)', border:'1px solid '+(isProfit?'var(--terrain-bdr)':'var(--crimson-bdr)') }}>ROI {pct(pp.roi)}</span>
                                <span style={{ fontSize:9, color:'var(--ink-ghost)' }}>cost {fmt$(pp.cost)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button type="button" onClick={()=>updateSaleEvent(ev.id,'items',[...ev.items,{ product_name:'', quantity:1, sale_price:0 }])} style={{ fontSize:11, color:'var(--terrain)', background:'none', border:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:4 }}>
                        <Plus style={{ width:11, height:11 }}/> Add item
                      </button>
                    </div>
                  </div>
                ))}
                {totalSalePrice>0&&(
                  <div style={{ padding:'10px 14px', borderRadius:10, background:'var(--parch-card)', border:'1px solid var(--terrain-bdr)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'var(--terrain)' }}>{form.sale_events.reduce((s,ev)=>s+(ev.items?.reduce((ss,it)=>ss+(parseInt(it.quantity??1)||1),0)||0),0)} items sold</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--terrain)', fontWeight:700 }}>{fmt$(totalSalePrice)} revenue</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PROFIT BAR */}
        <ProfitBar netProfit={netProfit} totalCost={totalCost} finalCost={finalCost} totalCB={totalCB} cardCB={cardCB} yaCB={yaCB} totalSalePrice={totalSalePrice} validItemCount={validItemCount} hasSales={hasSales} isSplit={isSplit}/>
        {(totalCost > 0 || totalCB > 0) && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
            {[
              { lbl:'ROI',      val:pct(totalCost>0?(netProfit/totalCost)*100:0), color:netProfit>=0?'var(--terrain)':'var(--crimson)' },
              { lbl:'Cashback', val:fmt$(totalCB),                                color:'var(--violet)' },
              { lbl:'Items',    val:validItemCount,                               color:'var(--ink)'    },
            ].map(({ lbl, val, color })=>(
              <div key={lbl} style={{ background:'var(--parch-card)', border:'1px solid var(--parch-line)', borderRadius:10, padding:'9px 10px', textAlign:'center' }}>
                <p style={{ fontFamily:'var(--font-serif)', fontSize:8, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-ghost)', marginBottom:3 }}>{lbl}</p>
                <p style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight:700, color }}>{val}</p>
              </div>
            ))}
          </div>
        )}

        <button type="submit" disabled={createMutation.isPending}
          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'13px 0', borderRadius:8, color:'var(--ne-cream)', fontSize:13, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', border:'none', cursor:'pointer', background:'var(--ink)', opacity:createMutation.isPending?0.6:1, transition:'opacity 0.15s', fontFamily:'var(--font-serif)', marginBottom:8 }}>
          {createMutation.isPending
            ? <><div style={{ width:16, height:16, border:'2px solid var(--ne-cream)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.6s linear infinite' }}/> Creating...</>
            : <><Plus style={{ width:16, height:16 }}/> Add Order{validItemCount>1?` (${validItemCount} items)`:''}</>}
        </button>
        <button type="button" onClick={()=>window.history.back()}
          style={{ width:'100%', padding:'10px 0', borderRadius:12, fontSize:12, color:'var(--ink-ghost)', background:'var(--parch-warm)', border:'1px solid var(--parch-line)', cursor:'pointer' }}>
          Cancel
        </button>
      </form>
    </div>
  );
}