import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Package, Tag, Globe, Plus, Trash2, Copy, DollarSign, X, ClipboardList, Minus, ImageOff, Barcode, RefreshCw } from 'lucide-react';
import ProductAutocomplete from '@/components/purchase-orders/ProductAutocomplete';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';

const C = {
  ink:        'var(--ink)',
  inkDim:     'var(--ink-dim)',
  inkFaded:   'var(--ink-faded)',
  inkGhost:   'var(--ink-ghost)',
  gold:       'var(--gold)',
  gold2:      'var(--gold2)',
  goldBg:     'var(--gold-bg)',
  goldBdr:    'var(--gold-bdr)',
  parchCard:  'var(--parch-card)',
  parchWarm:  'var(--parch-warm)',
  parchLine:  'var(--parch-line)',
  ocean:      'var(--ocean)',
  ocean2:     'var(--ocean2)',
  oceanBg:    'var(--ocean-bg)',
  oceanBdr:   'var(--ocean-bdr)',
  terrain:    'var(--terrain)',
  terrain2:   'var(--terrain2)',
  terrainBg:  'var(--terrain-bg)',
  terrainBdr: 'var(--terrain-bdr)',
  violet:     'var(--violet)',
  violet2:    'var(--violet2)',
  violetBg:   'var(--violet-bg)',
  violetBdr:  'var(--violet-bdr)',
  crimson:    'var(--crimson)',
  crimson2:   'var(--crimson2)',
  crimsonBg:  'var(--crimson-bg)',
  crimsonBdr: 'var(--crimson-bdr)',
  neCream:    'var(--ne-cream)',
};

const FONT = 'ui-sans-serif, system-ui, -apple-system, sans-serif';
const MONO = "ui-monospace, 'SF Mono', 'Consolas', monospace";

const INP = {
  background:   C.parchWarm,
  border:       `1px solid ${C.parchLine}`,
  borderRadius: 8,
  color:        C.ink,
  padding:      '8px 10px',
  fontSize:     13,
  outline:      'none',
  width:        '100%',
  fontFamily:   FONT,
};

const DEFAULT_VENDORS = ['Amazon','Best Buy','Walmart','Target','Costco',"Sam's Club",'eBay','Woot','Apple','Staples'];

const getStoreDomain = (v) => {
  const n = String(v||'').toLowerCase().replace(/[\s\-_.']/g,'').replace(/[^a-z0-9]/g,'');
  if (n.includes('bestbuy'))  return 'bestbuy.com';
  if (n.includes('amazon'))   return 'amazon.com';
  if (n.includes('walmart'))  return 'walmart.com';
  if (n.includes('apple'))    return 'apple.com';
  if (n.includes('target'))   return 'target.com';
  if (n.includes('costco'))   return 'costco.com';
  if (n.includes('samsclub')||n.includes('sams')) return 'samsclub.com';
  if (n.includes('staples'))  return 'staples.com';
  if (n.includes('ebay'))     return 'ebay.com';
  if (n.includes('woot'))     return 'woot.com';
  return n + '.com';
};

const getCardDomain = (n) => {
  const s = String(n||'').toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'');
  if (s.includes('chase'))    return 'chase.com';
  if (s.includes('amex')||s.includes('american')) return 'americanexpress.com';
  if (s.includes('citi'))     return 'citi.com';
  if (s.includes('capital'))  return 'capitalone.com';
  if (s.includes('discover')) return 'discover.com';
  if (s.includes('bofa')||s.includes('bankofamerica')) return 'bankofamerica.com';
  if (s.includes('wells'))    return 'wellsfargo.com';
  if (s.includes('amazon'))   return 'amazon.com';
  if (s.includes('apple'))    return 'apple.com';
  return null;
};

const BRANDFETCH = '1idzVIG0BYPKsFIDJDI';
const brandfetch = (domain) => domain ? `https://cdn.brandfetch.io/domain/${domain}?c=${BRANDFETCH}` : null;

const fmt$ = (v) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(parseFloat(v)||0);

const STATUSES           = ['pending','ordered','shipped','partially_received','received','cancelled'];
const PRODUCT_CATEGORIES = ['Electronics','Home & Garden','Toys & Games','Health & Beauty','Sports','Clothing','Tools','Gift Cards','Grocery','Other'];
const TABS = [
  { id:'details', label:'Details', Icon:ClipboardList },
  { id:'items',   label:'Items',   Icon:Package       },
  { id:'payment', label:'Payment', Icon:CreditCard    },
  { id:'sales',   label:'Sales',   Icon:DollarSign    },
];

function LBL({ children }) {
  return (
    <label style={{ fontFamily:FONT, fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:C.inkFaded, display:'block', marginBottom:4 }}>
      {children}
    </label>
  );
}

function SectionHeader({ title, color=C.gold }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12, paddingBottom:8, borderBottom:`1px solid ${C.parchLine}` }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0 }}/>
      <span style={{ fontFamily:FONT, fontSize:9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:C.inkFaded }}>{title}</span>
    </div>
  );
}

function BrandLogo({ domain, size=18, fallback='?' }) {
  const [err, setErr] = useState(false);
  const url = domain ? brandfetch(domain) : null;
  if (!url||err) return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:C.oceanBg, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:size*0.4, color:C.ocean2, flexShrink:0, border:`1px solid ${C.oceanBdr}` }}>
      {String(fallback).charAt(0).toUpperCase()}
    </div>
  );
  return <img src={url} alt="" onError={()=>setErr(true)} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:`1px solid ${C.parchLine}`, display:'block' }}/>;
}

function ItemThumb({ src, name }) {
  const [err, setErr] = useState(false);
  if (!src||err) return (
    <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, background:C.terrainBg, border:`1px solid ${C.terrainBdr}`, display:'flex', alignItems:'center', justifyContent:'center', color:C.terrain2, fontSize:13, fontWeight:700, fontFamily:FONT }}>
      {name?.charAt(0)?.toUpperCase()||<ImageOff style={{width:13,height:13}}/>}
    </div>
  );
  return <img src={src} alt={name} onError={()=>setErr(true)} style={{ width:36, height:36, borderRadius:8, objectFit:'cover', flexShrink:0, border:`1px solid ${C.parchLine}` }}/>;
}

function VendorAutocomplete({ value, onChange, savedVendors }) {
  const [query, setQuery] = useState(value||'');
  const [open,  setOpen]  = useState(false);
  const ref = useRef(null);

  useEffect(()=>{ setQuery(value||''); },[value]);

  useEffect(()=>{
    const h = (e)=>{ if (ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return ()=>document.removeEventListener('mousedown', h);
  },[]);

  const allVendors = useMemo(()=>[...new Set([...DEFAULT_VENDORS, ...(savedVendors||[])])].sort(),[savedVendors]);

  const suggestions = useMemo(()=>{
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allVendors.filter(v=>v.toLowerCase().includes(q)).slice(0,8);
  },[query, allVendors]);

  const isMatched = allVendors.some(v=>v.toLowerCase()===query.toLowerCase());
  const matchedVendor = isMatched ? allVendors.find(v=>v.toLowerCase()===query.toLowerCase()) : null;
  const select = (vendor) => { setQuery(vendor); onChange(vendor); setOpen(false); };

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
        {matchedVendor && (
          <div style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', zIndex:1 }}>
            <BrandLogo domain={getStoreDomain(matchedVendor)} size={16} fallback={matchedVendor}/>
          </div>
        )}
        <input type="text" value={query}
          onChange={e=>{ const v=e.target.value; setQuery(v); onChange(v); setOpen(v.trim().length>0); }}
          onBlur={()=>setTimeout(()=>setOpen(false),150)}
          placeholder="Type vendor name..."
          style={{ ...INP, paddingLeft:matchedVendor?32:10, paddingRight:28, border:`1px solid ${open?C.goldBdr:C.parchLine}` }}
        />
        {query && (
          <button type="button" onClick={()=>{ setQuery(''); onChange(''); setOpen(false); }}
            style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.inkGhost, padding:2 }}>
            <X style={{width:12,height:12}}/>
          </button>
        )}
      </div>
      {open && (suggestions.length>0 || (query.trim()&&!isMatched)) && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:300, background:C.parchCard, border:`1px solid ${C.parchLine}`, borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.12)', overflow:'hidden' }}>
          {suggestions.map((v,i)=>(
            <div key={v} onMouseDown={()=>select(v)}
              style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', cursor:'pointer', borderBottom:i<suggestions.length-1?`1px solid ${C.parchLine}`:'none' }}
              onMouseEnter={e=>e.currentTarget.style.background=C.parchWarm}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <BrandLogo domain={getStoreDomain(v)} size={18} fallback={v}/>
              <span style={{ fontSize:13, color:C.ink, fontWeight:500, flex:1, fontFamily:FONT }}>{v}</span>
              {!DEFAULT_VENDORS.includes(v) && <span style={{ fontSize:9, color:C.inkGhost, fontStyle:'italic' }}>saved</span>}
            </div>
          ))}
          {query.trim()&&!isMatched&&(
            <div onMouseDown={()=>select(query.trim())}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', cursor:'pointer', background:C.terrainBg, borderTop:suggestions.length>0?`1px solid ${C.terrainBdr}`:'none' }}
              onMouseEnter={e=>e.currentTarget.style.opacity='0.8'}
              onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
              <Plus style={{width:13,height:13,color:C.terrain2}}/>
              <span style={{ fontSize:12, color:C.terrain2, fontWeight:600, fontFamily:FONT }}>Add "{query.trim()}" as new vendor</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GiftCardSection({ giftCards, selectedIds, onChange, retailer, orderTotal }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(()=>{
    const h=(e)=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown',h);
    return ()=>document.removeEventListener('mousedown',h);
  },[]);

  const available = useMemo(()=>giftCards.filter(gc=>gc.status!=='used'&&(gc.value||0)>0),[giftCards]);
  const filtered  = useMemo(()=>{
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter(gc=>(gc.card_name||gc.name||'').toLowerCase().includes(q)||String(gc.value||'').includes(q));
  },[available,search]);

  const selected      = available.filter(gc=>selectedIds.includes(gc.id));
  const totalSelected = selected.reduce((s,gc)=>s+(gc.value||0),0);
  const totalAvail    = available.reduce((s,gc)=>s+(gc.value||0),0);

  const getAmountUsed = (gc) => {
    if (!orderTotal||orderTotal<=0) return gc.value||0;
    const idx = selected.findIndex(c=>c.id===gc.id);
    if (idx<0) return 0;
    const coveredBefore = selected.slice(0,idx).reduce((s,c)=>s+(c.value||0),0);
    return Math.min(gc.value||0, Math.max(0,orderTotal-coveredBefore));
  };

  const toggle   = (id) => { if (selectedIds.includes(id)) onChange(selectedIds.filter(x=>x!==id)); else onChange([...selectedIds,id]); };
  const gcName   = (gc) => gc.card_name||gc.name||'Gift Card';
  const gcShort  = (gc) => gc.id?gc.id.slice(-4).toUpperCase():'????';

  if (available.length===0) return (
    <div>
      <SectionHeader title="Gift Cards" color={C.gold}/>
      <p style={{ fontSize:11, color:C.inkGhost, textAlign:'center', padding:'8px 0', fontFamily:FONT }}>No gift cards with available balance</p>
    </div>
  );

  return (
    <div ref={ref}>
      <SectionHeader title="Gift Cards" color={C.gold}/>
      <div onClick={()=>setOpen(o=>!o)}
        style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 13px', borderRadius:10, cursor:'pointer', background:selected.length>0?C.goldBg:C.parchWarm, border:`1px solid ${selected.length>0?C.goldBdr:C.parchLine}`, marginBottom:open?6:0, userSelect:'none' }}>
        <div style={{ width:32, height:32, borderRadius:8, background:C.goldBg, border:`1px solid ${C.goldBdr}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>gift</div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:12, fontWeight:700, color:selected.length>0?C.gold2:C.ink, fontFamily:FONT }}>Gift Cards</p>
          <p style={{ fontSize:9, color:C.inkGhost, marginTop:1, fontFamily:MONO }}>
            {selected.length>0?`${selected.length} selected  ${fmt$(totalSelected)} applied`:`${available.length} cards  ${fmt$(totalAvail)} available`}
          </p>
        </div>
        {selected.length>0&&<span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:99, background:C.terrainBg, color:C.terrain2, border:`1px solid ${C.terrainBdr}`, fontFamily:MONO, flexShrink:0 }}>{selected.length} selected</span>}
        <span style={{ fontSize:12, color:C.inkGhost, flexShrink:0, transform:open?'rotate(180deg)':'none', transition:'transform 0.2s' }}>v</span>
      </div>
      {open&&(
        <div style={{ background:C.parchCard, border:`1px solid ${C.goldBdr}`, borderRadius:12, overflow:'hidden', marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', background:C.goldBg, borderBottom:`1px solid ${C.goldBdr}` }}>
            <span style={{ fontFamily:FONT, fontSize:9, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:C.gold2, whiteSpace:'nowrap' }}>Select Cards</span>
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)} onClick={e=>e.stopPropagation()} placeholder="Search..."
              style={{ flex:1, background:C.parchWarm, border:`1px solid ${C.parchLine}`, borderRadius:7, padding:'5px 9px', fontSize:11, color:C.ink, outline:'none', fontFamily:FONT }}/>
            {selected.length>0&&<button type="button" onClick={e=>{e.stopPropagation();onChange([]);}} style={{ fontSize:9, color:C.crimson, background:'none', border:'none', cursor:'pointer', fontFamily:FONT, fontWeight:700, whiteSpace:'nowrap' }}>Clear</button>}
          </div>
          <div style={{ maxHeight:220, overflowY:'auto' }}>
            {filtered.map((gc,i)=>{
              const isSel = selectedIds.includes(gc.id);
              const used  = isSel?getAmountUsed(gc):null;
              const rem   = isSel?Math.max(0,(gc.value||0)-(used||0)):null;
              return (
                <div key={gc.id} onClick={e=>{e.stopPropagation();toggle(gc.id);}}
                  style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', cursor:'pointer', borderBottom:i<filtered.length-1?`1px solid ${C.parchLine}`:'none', background:isSel?C.terrainBg:'transparent' }}
                  onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background=C.parchWarm; }}
                  onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.background='transparent'; }}>
                  <div style={{ width:20, height:20, borderRadius:6, flexShrink:0, border:`1.5px solid ${isSel?C.terrain:C.parchLine}`, background:isSel?C.terrain:'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {isSel&&<span style={{color:'white',fontSize:11}}>v</span>}
                  </div>
                  <div style={{ width:28, height:28, borderRadius:7, background:C.goldBg, border:`1px solid ${C.goldBdr}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>gift</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:11, fontWeight:600, color:isSel?C.terrain2:C.ink, fontFamily:FONT }}>{gcName(gc)} #{gcShort(gc)}</p>
                    <p style={{ fontSize:9, color:C.inkGhost, marginTop:1, fontFamily:MONO }}>
                      {isSel&&used!==null&&used<(gc.value||0)?`Using ${fmt$(used)} of ${fmt$(gc.value)}  ${fmt$(rem)} stays`:'Full balance'}
                    </p>
                  </div>
                  <span style={{ fontFamily:MONO, fontSize:13, fontWeight:700, color:isSel?C.terrain2:C.gold2, flexShrink:0 }}>{fmt$(gc.value||0)}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', background:C.parchWarm, borderTop:`1px solid ${C.goldBdr}` }}>
            <p style={{ fontSize:10, fontWeight:700, color:C.terrain2, fontFamily:MONO }}>{selected.length} selected  {fmt$(totalSelected)}</p>
            <button type="button" onClick={e=>{e.stopPropagation();setOpen(false);}}
              style={{ padding:'6px 14px', borderRadius:8, background:C.ink, color:C.neCream, fontSize:11, fontWeight:700, border:'none', cursor:'pointer', fontFamily:FONT }}>Done</button>
          </div>
        </div>
      )}
      {!open&&selected.length>0&&(
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:6 }}>
          {selected.map(gc=>{
            const used = getAmountUsed(gc);
            const rem  = Math.max(0,(gc.value||0)-used);
            return (
              <div key={gc.id} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 8px', borderRadius:99, background:C.terrainBg, border:`1px solid ${C.terrainBdr}`, fontSize:10, fontWeight:700, color:C.terrain2, fontFamily:MONO }}>
                #{gcShort(gc)} {fmt$(used)}
                {rem>0&&<span style={{ fontSize:8, color:C.inkGhost, fontWeight:400 }}>({fmt$(rem)} stays)</span>}
                <button type="button" onClick={()=>toggle(gc.id)} style={{ color:C.crimson, background:'none', border:'none', cursor:'pointer', padding:'0 0 0 2px', fontSize:12, lineHeight:1 }}>x</button>
              </div>
            );
          })}
          <button type="button" onClick={()=>setOpen(true)}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:99, background:C.parchWarm, border:`1px solid ${C.parchLine}`, fontSize:10, color:C.ocean2, fontWeight:700, cursor:'pointer', fontFamily:FONT }}>
            + Add more
          </button>
        </div>
      )}
    </div>
  );
}

const findMatchedProduct = (itemName, itemProductId, products) => {
  if (itemProductId) { const byId=products.find(p=>p.id===itemProductId); if (byId) return byId; }
  const exact=(itemName||'').toLowerCase();
  const byExact=products.find(p=>p.name?.toLowerCase()===exact);
  if (byExact) return byExact;
  const stop=new Set(['the','a','an','and','or','with','for','of','in','to','by','gb','free','live','tv','wi','fi','black','white','silver','pink','blue','streaming','device']);
  const keywords=(str)=>str.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2&&!stop.has(w));
  const iw=new Set(keywords(itemName||''));
  let best=0, bestP=null;
  products.forEach(p=>{
    if (!p.name) return;
    const pw=new Set(keywords(p.name));
    const shared=[...iw].filter(w=>pw.has(w)).length;
    const score=shared/Math.max(iw.size,pw.size);
    if (score>best){best=score;bestP=p;}
  });
  return best>=0.4?bestP:null;
};

const defaultSaleEvent = () => ({ id:crypto.randomUUID(), buyer:'', sale_date:'', payout_date:'', items:[] });
const defaultItem      = () => ({ product_id:'', product_name:'', upc:'', quantity_ordered:1, quantity_received:0, unit_cost:0, sale_price:0, product_image_url:'' });

// ── FIX 1: normalize qty → quantity when loading from DB ──────────────────
const getInitialForm = (o) => {
  const items = o?.items?.length>0 ? o.items.map(i=>({...defaultItem(),...i,sale_price:i.sale_price||0})) : [defaultItem()];
  let fulfillment_type = o?.fulfillment_type||'ship_to_me';
  if (o?.is_dropship) fulfillment_type='direct_dropship';
  else if (o?.is_pickup) fulfillment_type='store_pickup';
  return o ? {
    order_type:o.order_type||'churning', order_number:o.order_number||'',
    tracking_numbers:o.tracking_numbers?.length>0?o.tracking_numbers:(o.tracking_number?[o.tracking_number]:['']),
    retailer:o.retailer||'', buyer:o.buyer||'', marketplace_platform:o.marketplace_platform||'',
    account:o.account||'', status:o.status||'pending', product_category:o.product_category||'',
    credit_card_id:o.credit_card_id||'', payment_splits:o.payment_splits?.length>0?o.payment_splits:[],
    gift_card_ids:o.gift_card_ids||[], fulfillment_type,
    dropship_to:o.dropship_to||'', pickup_location:o.pickup_location||'',
    order_date:o.order_date||'', notes:o.notes||'', items,
    // load from schema field 'qty', keep as qty in form state
    sale_events: (o.sale_events||[]).map(ev => ({
      ...ev,
      id: ev.id || crypto.randomUUID(),
      items: (ev.items||[]).map(it => ({
        ...it,
        qty: parseInt(it.qty ?? it.quantity) || 1,
      }))
    })),
    tax:o.tax??0, shipping_cost:o.shipping_cost??0, fees:o.fees??0,
    include_tax_in_cashback:o.include_tax_in_cashback!==false,
    include_shipping_in_cashback:o.include_shipping_in_cashback!==false,
    extra_cashback_percent:o.extra_cashback_percent||0, bonus_notes:o.bonus_notes||'',
    amazon_yacb:o.bonus_notes?.toLowerCase().includes('prime young adult')||false,
    cashback_rate_override:'',
  } : {
    order_type:'churning', order_number:'', tracking_numbers:[''],
    retailer:'', buyer:'', marketplace_platform:'', account:'',
    status:'pending', product_category:'', credit_card_id:'', payment_splits:[],
    gift_card_ids:[], fulfillment_type:'ship_to_me', dropship_to:'', pickup_location:'',
    order_date:format(new Date(),'yyyy-MM-dd'), notes:'', items:[defaultItem()], sale_events:[],
    tax:0, shipping_cost:0, fees:0, include_tax_in_cashback:true, include_shipping_in_cashback:true,
    extra_cashback_percent:0, bonus_notes:'', amazon_yacb:false, cashback_rate_override:'',
  };
};

export default function POFormModal({ open, onOpenChange, order, onSubmit, products, creditCards, giftCards, sellers, isPending, onDelete }) {
  const [formData,     setFormData]     = useState(()=>getInitialForm(order));
  const [activeTab,    setActiveTab]    = useState('details');
  const [visible,      setVisible]      = useState(false);
  const [savedVendors, setSavedVendors] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('atlas_vendors')||'[]'); } catch { return []; }
  });
  const queryClient = useQueryClient();

  useEffect(()=>{
    if (open) { setFormData(getInitialForm(order)); setActiveTab('details'); requestAnimationFrame(()=>setVisible(true)); }
    else setVisible(false);
  },[open, order]);

  useEffect(()=>{
    const h=(e)=>{ if(e.key==='Escape'&&open) onOpenChange(false); };
    window.addEventListener('keydown',h);
    return ()=>window.removeEventListener('keydown',h);
  },[open,onOpenChange]);

  const set = (field,value) => setFormData(prev=>({...prev,[field]:value}));

  const updateItem    = (idx,f,v) => setFormData(prev=>({...prev,items:prev.items.map((it,i)=>i===idx?{...it,[f]:v}:it)}));
  const addItem       = () => setFormData(prev=>({...prev,items:[...prev.items,defaultItem()]}));
  const removeItem    = (idx) => setFormData(prev=>({...prev,items:prev.items.length>1?prev.items.filter((_,i)=>i!==idx):prev.items}));
  const duplicateItem = (idx) => setFormData(prev=>({...prev,items:[...prev.items.slice(0,idx+1),{...prev.items[idx]},...prev.items.slice(idx+1)]}));

  const updateTracking = (idx,val) => setFormData(prev=>{const t=[...prev.tracking_numbers];t[idx]=val;return{...prev,tracking_numbers:t};});
  const addTracking    = () => setFormData(prev=>({...prev,tracking_numbers:[...prev.tracking_numbers,'']}));
  const removeTracking = (idx) => setFormData(prev=>({...prev,tracking_numbers:prev.tracking_numbers.length>1?prev.tracking_numbers.filter((_,i)=>i!==idx):['']}));

  const addSplit    = () => setFormData(prev=>({...prev,payment_splits:[...(prev.payment_splits||[]),{card_id:'',card_name:'',cashback_rate:0,amount:''}]}));
  const removeSplit = (idx) => setFormData(prev=>({...prev,payment_splits:prev.payment_splits.filter((_,i)=>i!==idx)}));
  const updateSplit = (idx,f,v) => setFormData(prev=>({...prev,payment_splits:prev.payment_splits.map((sp,i)=>{
    if(i!==idx) return sp;
    if(f==='card_id'){const card=creditCards.find(c=>c.id===v);return{...sp,card_id:v,card_name:card?.card_name||'',cashback_rate:card?.cashback_rate||0};}
    return{...sp,[f]:v};
  })}));


  // Helper: how many units of each product have already been sold in existing sale events
  const soldQtyByProduct = useMemo(() => {
    const map = {};
    formData.sale_events.forEach(ev => {
      (ev.items || []).forEach(it => {
        const key = it.product_name || '';
        map[key] = (map[key] || 0) + (parseInt(it.qty ?? it.quantity) || 1);
      });
    });
    return map;
  }, [formData.sale_events]);

  const addSaleEvent = () => {
    const ev = defaultSaleEvent();
    // Pre-fill with REMAINING qty for each product
    ev.items = formData.items
      .filter(it => it.product_name?.trim())
      .map(it => {
        const totalOrdered = parseInt(it.quantity_ordered) || 1;
        const alreadySold  = soldQtyByProduct[it.product_name] || 0;
        const remaining    = Math.max(0, totalOrdered - alreadySold);
        return { product_name: it.product_name, qty: remaining, sale_price: it.sale_price || 0 };
      })
      .filter(it => it.qty > 0); // only show items that still have remaining qty
    if (ev.items.length === 0) ev.items = [{ product_name: '', quantity: 1, sale_price: 0 }];
    setFormData(prev => ({ ...prev, sale_events: [...prev.sale_events, ev] }));
  };
  const removeSaleEvent     = (id) => setFormData(prev=>({...prev,sale_events:prev.sale_events.filter(e=>e.id!==id)}));
  const updateSaleEvent     = (id,f,v) => setFormData(prev=>({...prev,sale_events:prev.sale_events.map(e=>e.id!==id?e:{...e,[f]:v})}));
  const updateSaleEventItem = (eid,idx,f,v) => setFormData(prev=>({
    ...prev,
    sale_events: prev.sale_events.map(e => {
      if (e.id !== eid) return e;
      return { ...e, items: e.items.map((it,i) => i===idx ? {...it,[f]:v} : it) };
    })
  }));

  const tax        = parseFloat(formData.tax)||0;
  const shipping   = parseFloat(formData.shipping_cost)||0;
  const fees       = parseFloat(formData.fees)||0;
  const itemsSub   = formData.items.reduce((s,it)=>s+(parseFloat(it.unit_cost)||0)*(parseInt(it.quantity_ordered)||1),0);
  const totalPrice = itemsSub+tax+shipping+fees;
  const gcTotal    = formData.gift_card_ids.reduce((s,id)=>{const gc=giftCards.find(g=>g.id===id);return s+(gc?.value||0);},0);
  const finalCost  = totalPrice-gcTotal;
  const selectedCard = creditCards.find(c=>c.id===formData.credit_card_id);
  const cardRate   = parseFloat(formData.cashback_rate_override)||(selectedCard?.cashback_rate||0);
  const cbBase     = (()=>{let b=totalPrice;if(!formData.include_tax_in_cashback)b-=tax;if(!formData.include_shipping_in_cashback)b-=shipping;return b;})();
  const cbAmount   = cbBase*cardRate/100 + (formData.amazon_yacb?cbBase*0.05:0);
  const hasSplits  = (formData.payment_splits||[]).length>0;
  const isAmazon   = formData.retailer==='Amazon';

  // ── FIX 2: totalRevenue reads quantity ?? qty ─────────────────────────────
  const totalRevenue = formData.sale_events.reduce((s,ev)=>
    s+ev.items.reduce((ss,it)=>
      ss+(parseFloat(it.sale_price)||0)*(parseInt(it.qty??1)||1),0),0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.retailer?.trim()) { toast.error('Vendor is required'); return; }
    const items=formData.items.map(it=>({...it,quantity_ordered:parseInt(it.quantity_ordered)||1,quantity_received:parseInt(it.quantity_received)||0,unit_cost:parseFloat(it.unit_cost)||0,sale_price:parseFloat(it.sale_price)||0}));
    const splitsTotal=(formData.payment_splits||[]).reduce((s,sp)=>s+(parseFloat(sp.amount)||0),0);
    if(hasSplits&&Math.abs(splitsTotal-totalPrice)>0.01){toast.error(`Split amounts (${fmt$(splitsTotal)}) must equal total (${fmt$(totalPrice)})`);return;}

    // save using schema field name 'qty'
    const saleEvents = formData.sale_events.map(ev => ({
      ...ev,
      items: ev.items.map(it => ({
        product_name: it.product_name || '',
        qty:          parseInt(it.quantity ?? it.qty ?? 1) || 1,
        sale_price:   parseFloat(it.sale_price) || 0,
      }))
    }));

    if (formData.retailer) {
      setSavedVendors(prev=>{
        const updated=[...new Set([...prev,formData.retailer])].sort();
        try{localStorage.setItem('atlas_vendors',JSON.stringify(updated));}catch{}
        return updated;
      });
    }
    const data={
      ...formData, items, tracking_numbers:formData.tracking_numbers.filter(Boolean),
      sale_events:saleEvents, tax, shipping_cost:shipping, fees, total_cost:totalPrice,
      gift_card_value:gcTotal, final_cost:finalCost,
      credit_card_id:hasSplits?(formData.payment_splits[0]?.card_id||null):(formData.credit_card_id||null),
      payment_splits:hasSplits?formData.payment_splits.map(sp=>({card_id:sp.card_id,card_name:sp.card_name,cashback_rate:sp.cashback_rate||0,amount:parseFloat(sp.amount)||0})):[],
      extra_cashback_percent:formData.amazon_yacb?5:(parseFloat(formData.extra_cashback_percent)||0),
      bonus_notes:formData.amazon_yacb?'Prime Young Adult':formData.bonus_notes,
      is_dropship:formData.fulfillment_type==='direct_dropship',
      is_pickup:formData.fulfillment_type==='store_pickup',
    };
    delete data.amazon_yacb; delete data.cashback_rate_override;
    onSubmit(data);
  };

  if (!open&&!visible) return null;

  const subtitle=[formData.order_number&&`#${formData.order_number}`,formData.retailer,formData.order_date].filter(Boolean).join('   ');

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', justifyContent:'flex-end' }}>
      <div onClick={()=>onOpenChange(false)} style={{ position:'absolute', inset:0, background:'rgba(26,18,10,0.55)', opacity:visible?1:0, transition:'opacity 250ms ease-out' }}/>
      <div style={{ position:'relative', width:'100%', maxWidth:660, height:'100%', background:C.parchCard, borderLeft:`1px solid ${C.parchLine}`, boxShadow:'-24px 0 60px rgba(0,0,0,0.15)', display:'flex', flexDirection:'column', transform:visible?'translateX(0)':'translateX(100%)', transition:'transform 250ms ease-out' }}>

        {/* Header */}
        <div style={{ padding:'18px 24px 0', borderBottom:`1px solid ${C.parchLine}`, flexShrink:0, background:C.parchWarm }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0, flex:1 }}>
              <BrandLogo domain={getStoreDomain(formData.retailer)} size={32} fallback={formData.retailer||'?'}/>
              <div style={{ minWidth:0, flex:1 }}>
                <h2 style={{ fontFamily:FONT, fontSize:18, fontWeight:800, color:C.ink, margin:0, lineHeight:1.2 }}>{order?'Edit Order':'New Order'}</h2>
                {subtitle&&<p style={{ fontSize:12, color:C.inkDim, marginTop:4, fontFamily:FONT }}>{subtitle}</p>}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {order&&onDelete&&(
                <button type="button" onClick={()=>{onDelete(order.id);onOpenChange(false);}}
                  style={{ padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:600, color:C.crimson, background:C.crimsonBg, border:`1px solid ${C.crimsonBdr}`, cursor:'pointer', fontFamily:FONT }}>
                  Delete
                </button>
              )}
              <button type="button" onClick={()=>onOpenChange(false)}
                style={{ width:32, height:32, borderRadius:8, background:C.parchWarm, border:`1px solid ${C.parchLine}`, color:C.inkDim, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <X style={{width:16,height:16}}/>
              </button>
            </div>
          </div>
          <div style={{ display:'flex', gap:0 }}>
            {TABS.map(tab=>(
              <button key={tab.id} type="button" onClick={()=>setActiveTab(tab.id)}
                style={{ padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:6, background:'transparent', border:'none', outline:'none', fontFamily:FONT,
                  borderBottom:activeTab===tab.id?`2px solid ${C.gold}`:`2px solid transparent`,
                  color:activeTab===tab.id?C.gold:C.inkDim, transition:'all 0.15s', marginBottom:-1 }}>
                <tab.Icon style={{width:14,height:14}}/>{tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          <form id="po-form" onSubmit={handleSubmit}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

            {/* DETAILS */}
            {activeTab==='details'&&(
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div style={{ display:'flex', gap:4, padding:4, borderRadius:10, background:C.parchWarm, border:`1px solid ${C.parchLine}`, width:'fit-content' }}>
                  {[{v:'churning',label:'Churning',Icon:Tag},{v:'marketplace',label:'Marketplace',Icon:Globe}].map(({v,label,Icon})=>(
                    <button key={v} type="button" onClick={()=>set('order_type',v)}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer', border:'1px solid', fontFamily:FONT,
                        ...(formData.order_type===v?{background:C.goldBg,color:C.gold2,borderColor:C.goldBdr}:{background:'transparent',color:C.inkDim,borderColor:'transparent'}) }}>
                      <Icon style={{width:13,height:13}}/>{label}
                    </button>
                  ))}
                </div>
                <div style={{ background:C.parchCard, border:`1px solid ${C.parchLine}`, borderRadius:12, padding:16 }}>
                  <SectionHeader title="Vendor & Order"/>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10, marginBottom:10 }}>
                    <div><LBL>Vendor *</LBL><VendorAutocomplete value={formData.retailer} onChange={v=>set('retailer',v)} savedVendors={savedVendors}/></div>
                    <div>
                      <LBL>Status</LBL>
                      <select value={formData.status} onChange={e=>{
                        const v=e.target.value;
                        if(v==='received') setFormData(prev=>({...prev,status:v,items:prev.items.map(it=>({...it,quantity_received:it.quantity_ordered}))}));
                        else set('status',v);
                      }} style={{...INP,cursor:'pointer'}}>
                        {STATUSES.map(s=><option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                      </select>
                    </div>
                    <div><LBL>Order Number</LBL><input style={INP} value={formData.order_number} onChange={e=>set('order_number',e.target.value)} placeholder="112-345..."/></div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:10 }}>
                    <div><LBL>Order Date</LBL><input type="date" style={INP} value={formData.order_date} onChange={e=>set('order_date',e.target.value)}/></div>
                    <div><LBL>Account</LBL><input style={INP} value={formData.account} onChange={e=>set('account',e.target.value)} placeholder="Account used"/></div>
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <LBL>Tracking Number(s)</LBL>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {formData.tracking_numbers.map((tn,idx)=>(
                        <div key={idx} style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <input style={{...INP,flex:1}} value={tn} onChange={e=>updateTracking(idx,e.target.value)} placeholder="1Z999AA1..."/>
                          {formData.tracking_numbers.length>1&&<button type="button" onClick={()=>removeTracking(idx)} style={{color:C.crimson,background:'none',border:'none',cursor:'pointer',padding:4}}><Minus style={{width:14,height:14}}/></button>}
                        </div>
                      ))}
                      <button type="button" onClick={addTracking} style={{ fontSize:12, color:C.terrain2, background:'none', border:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:4, fontFamily:FONT }}>
                        <Plus style={{width:12,height:12}}/> Add tracking
                      </button>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:4, padding:4, borderRadius:10, background:C.parchWarm, border:`1px solid ${C.parchLine}`, width:'fit-content', flexWrap:'wrap' }}>
                    {[{v:'ship_to_me',label:'Ship to Me',color:C.ocean2,bg:C.oceanBg,bdr:C.oceanBdr},
                      {v:'store_pickup',label:'Store Pickup',color:C.violet2,bg:C.violetBg,bdr:C.violetBdr},
                      {v:'direct_dropship',label:'Dropship',color:C.gold2,bg:C.goldBg,bdr:C.goldBdr}].map(({v,label,color,bg,bdr})=>(
                      <button key={v} type="button" onClick={()=>set('fulfillment_type',v)}
                        style={{ padding:'6px 12px', borderRadius:7, fontSize:11, fontWeight:500, cursor:'pointer', border:'1px solid', fontFamily:FONT,
                          ...(formData.fulfillment_type===v?{background:bg,borderColor:bdr,color}:{background:'transparent',borderColor:'transparent',color:C.inkDim}) }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {formData.fulfillment_type==='direct_dropship'&&(<div style={{marginTop:10}}><LBL>Ship To (Buyer)</LBL><select value={formData.dropship_to} onChange={e=>set('dropship_to',e.target.value)} style={{...INP,cursor:'pointer'}}><option value="">Select buyer...</option>{sellers.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</select></div>)}
                  {formData.fulfillment_type==='store_pickup'&&(<div style={{marginTop:10}}><LBL>Pickup Location</LBL><input style={INP} value={formData.pickup_location} onChange={e=>set('pickup_location',e.target.value)} placeholder="e.g. Downtown Store"/></div>)}
                </div>
                <div><LBL>Notes</LBL><textarea value={formData.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any notes..." rows={2} style={{...INP,resize:'vertical',fontSize:13}}/></div>
              </div>
            )}

            {/* ITEMS */}
            {activeTab==='items'&&(
              <div style={{ background:C.parchCard, border:`1px solid ${C.parchLine}`, borderRadius:12, padding:16 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, paddingBottom:8, borderBottom:`1px solid ${C.parchLine}` }}>
                  <SectionHeader title={`Order Items (${formData.items.length})`} color={C.ocean2}/>
                  <select value={formData.product_category} onChange={e=>set('product_category',e.target.value)} style={{...INP,width:'auto',fontSize:11,cursor:'pointer'}}>
                    <option value="">Category...</option>
                    {PRODUCT_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {formData.items.map((item,idx)=>(
                    <div key={idx} style={{ borderRadius:10, padding:12, background:C.parchWarm, border:`1px solid ${C.parchLine}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                        <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:C.ocean2, background:C.oceanBg, padding:'2px 8px', borderRadius:20, border:`1px solid ${C.oceanBdr}`, fontFamily:FONT }}>Item {idx+1}</span>
                        <div style={{display:'flex',gap:4}}>
                          <button type="button" onClick={()=>duplicateItem(idx)} style={{padding:4,borderRadius:6,color:C.inkDim,background:C.parchCard,border:`1px solid ${C.parchLine}`,cursor:'pointer'}}><Copy style={{width:13,height:13}}/></button>
                          {formData.items.length>1&&<button type="button" onClick={()=>removeItem(idx)} style={{padding:4,borderRadius:6,color:C.crimson,background:C.crimsonBg,border:`1px solid ${C.crimsonBdr}`,cursor:'pointer'}}><Trash2 style={{width:13,height:13}}/></button>}
                        </div>
                      </div>
                      <div style={{marginBottom:8}}>
                        <LBL>Product</LBL>
                        <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                          <ItemThumb src={item.product_image_url||findMatchedProduct(item.product_name,item.product_id,products)?.image} name={item.product_name}/>
                          <div style={{flex:1}}>
                            <ProductAutocomplete products={products} nameValue={item.product_name||''} upcValue={item.upc||''} searchField="name"
                              onSelect={p=>{updateItem(idx,'product_id',p.id);updateItem(idx,'product_name',p.name);updateItem(idx,'upc',p.upc||'');updateItem(idx,'product_image_url',p.image||'');}}
                              onChangeName={val=>updateItem(idx,'product_name',val)} placeholder="e.g. iPad Air"/>
                          </div>
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                        <div>
                          <LBL>Unit Price</LBL>
                          <div style={{position:'relative'}}>
                            <span style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:C.inkGhost,fontSize:12}}>$</span>
                            <input style={{...INP,paddingLeft:22}} type="number" step="0.01" min="0" value={item.unit_cost||''} onChange={e=>updateItem(idx,'unit_cost',e.target.value)} placeholder="0.00"/>
                          </div>
                        </div>
                        <div>
                          <LBL>Qty</LBL>
                          <input style={{...INP,textAlign:'center'}} type="number" min="1" value={item.quantity_ordered||1} onChange={e=>updateItem(idx,'quantity_ordered',e.target.value)}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addItem}
                  style={{ marginTop:12, width:'100%', padding:'8px 0', borderRadius:8, fontSize:13, color:C.terrain2, background:'none', border:`1px dashed ${C.terrainBdr}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:FONT }}>
                  <Plus style={{width:14,height:14}}/> Add Item
                </button>
              </div>
            )}

            {/* PAYMENT */}
            {activeTab==='payment'&&(
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ background:C.parchCard, border:`1px solid ${C.parchLine}`, borderRadius:12, padding:16 }}>
                  <SectionHeader title="Costs"/>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(80px,1fr))', gap:10, marginBottom:12 }}>
                    {[['tax','Tax'],['shipping_cost','Shipping'],['fees','Fees']].map(([k,label])=>(
                      <div key={k}>
                        <LBL>{label}</LBL>
                        <div style={{position:'relative'}}>
                          <span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:C.inkGhost,fontSize:12}}>$</span>
                          <input style={{...INP,paddingLeft:22}} type="number" step="0.01" min="0" value={formData[k]} onChange={e=>set(k,e.target.value)} placeholder="0.00"/>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background:C.parchWarm, borderRadius:9, padding:'9px 12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'3px 0' }}><span style={{color:C.inkDim,fontFamily:FONT}}>Items subtotal</span><span style={{fontFamily:MONO,fontWeight:600,color:C.ink}}>{fmt$(itemsSub)}</span></div>
                    {gcTotal>0&&<div style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'3px 0' }}><span style={{color:C.inkDim,fontFamily:FONT}}>Gift cards</span><span style={{fontFamily:MONO,fontWeight:600,color:C.gold2}}>-{fmt$(gcTotal)}</span></div>}
                    <div style={{ display:'flex', justifyContent:'space-between', paddingTop:6, marginTop:4, borderTop:`1px solid ${C.parchLine}` }}>
                      <span style={{fontWeight:700,color:C.ink,fontSize:13,fontFamily:FONT}}>Total</span>
                      <span style={{fontFamily:MONO,fontWeight:700,color:C.gold,fontSize:14}}>{fmt$(finalCost)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ background:C.parchCard, border:`1px solid ${C.parchLine}`, borderRadius:12, padding:16 }}>
                  <SectionHeader title="Credit Card" color={C.ocean2}/>
                  {!hasSplits?(
                    <Select value={formData.credit_card_id||''} onValueChange={v=>{const card=creditCards.find(c=>c.id===v);set('credit_card_id',v);set('card_name',card?.card_name||'');}}>
                      <SelectTrigger style={{...INP,height:48,padding:'10px 14px',fontSize:13}}>
                        {formData.credit_card_id?(<div style={{display:'flex',alignItems:'center',gap:10,flex:1}}><BrandLogo domain={getCardDomain(selectedCard?.card_name)} size={22} fallback={selectedCard?.card_name||'C'}/><div style={{flex:1,minWidth:0}}><p style={{fontSize:13,fontWeight:600,color:C.ink,margin:0}}>{selectedCard?.card_name}</p>{selectedCard?.last_4_digits&&<p style={{fontSize:11,color:C.inkGhost,fontFamily:MONO,margin:'2px 0 0'}}>{selectedCard.last_4_digits}</p>}{selectedCard?.cashback_rate>0&&<p style={{fontSize:11,color:C.violet2,fontFamily:MONO,fontWeight:700,margin:'2px 0 0'}}>{selectedCard.cashback_rate}% Cashback</p>}</div></div>):<SelectValue placeholder="Select card..."/>}
                      </SelectTrigger>
                      <SelectContent style={{background:C.parchCard,border:`1px solid ${C.parchLine}`,minWidth:'320px'}}>
                        {creditCards.filter(c=>c.active!==false).map(c=>(<SelectItem key={c.id} value={c.id} style={{color:C.ink,padding:'12px 8px'}}><div style={{display:'flex',alignItems:'center',gap:12}}><BrandLogo domain={getCardDomain(c.card_name)} size={24} fallback={c.card_name}/><div style={{display:'flex',flexDirection:'column',gap:2}}><span style={{fontSize:13,fontWeight:600,color:C.ink}}>{c.card_name}</span><div style={{display:'flex',gap:12,fontSize:11}}>{c.last_4_digits&&<span style={{color:C.inkGhost,fontFamily:MONO}}>...{c.last_4_digits}</span>}{c.cashback_rate>0&&<span style={{color:C.violet2,fontFamily:MONO,fontWeight:700}}>{c.cashback_rate}%</span>}</div></div></div></SelectItem>))}
                      </SelectContent>
                    </Select>
                  ):(
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {formData.payment_splits.map((sp,idx)=>{
                        const spCard=creditCards.find(c=>c.id===sp.card_id);
                        const spCB=((parseFloat(sp.amount)||0)*(spCard?.cashback_rate||0)/100);
                        return(
                          <div key={idx} style={{display:'grid',gridTemplateColumns:'5fr 3fr 28px',gap:8,alignItems:'end',padding:'10px 12px',borderRadius:10,background:C.parchWarm,border:`1px solid ${C.parchLine}`}}>
                            <div><LBL>Card</LBL><Select value={sp.card_id||''} onValueChange={v=>updateSplit(idx,'card_id',v)}><SelectTrigger style={{...INP,height:40,padding:'8px 12px',fontSize:12}}>{sp.card_id?<div style={{display:'flex',alignItems:'center',gap:8}}><BrandLogo domain={getCardDomain(spCard?.card_name)} size={18}/><div style={{display:'flex',flexDirection:'column'}}><span style={{fontFamily:FONT,fontSize:12,fontWeight:600}}>{spCard?.card_name}</span>{spCard?.cashback_rate>0&&<span style={{fontFamily:MONO,fontSize:10,color:C.violet2,fontWeight:700}}>{spCard.cashback_rate}%</span>}</div></div>:<SelectValue placeholder="Card..."/>}</SelectTrigger><SelectContent style={{background:C.parchCard,border:`1px solid ${C.parchLine}`,minWidth:'280px'}}>{creditCards.filter(c=>c.active!==false).map(c=><SelectItem key={c.id} value={c.id} style={{color:C.ink,padding:'10px 8px'}}><div style={{display:'flex',alignItems:'center',gap:10}}><BrandLogo domain={getCardDomain(c.card_name)} size={20}/><div style={{display:'flex',flexDirection:'column'}}><span style={{fontSize:12,fontWeight:600,color:C.ink}}>{c.card_name}</span><span style={{fontSize:10,color:C.inkGhost,fontFamily:MONO}}>{c.last_4_digits?`...${c.last_4_digits}`:''}</span></div></div></SelectItem>)}</SelectContent></Select></div>
                            <div><LBL>Amount <span style={{fontFamily:MONO,color:C.violet2,fontWeight:700,fontSize:9}}>{fmt$(spCB)} CB</span></LBL><div style={{position:'relative'}}><span style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:C.inkGhost,fontSize:11}}>$</span><input style={{...INP,paddingLeft:20,fontSize:11}} type="number" step="0.01" min="0" value={sp.amount} onChange={e=>updateSplit(idx,'amount',e.target.value)} placeholder="0.00"/></div></div>
                            <button type="button" onClick={()=>removeSplit(idx)} style={{color:C.crimson,background:'none',border:'none',cursor:'pointer',padding:4,marginTop:18}}><Trash2 style={{width:13,height:13}}/></button>
                          </div>
                        );
                      })}
                      {(()=>{const st=formData.payment_splits.reduce((s,sp)=>s+(parseFloat(sp.amount)||0),0);const ok=Math.abs(st-totalPrice)<0.01;return(<div style={{padding:'8px 12px',borderRadius:8,fontSize:11,fontWeight:600,display:'flex',justifyContent:'space-between',fontFamily:FONT,...(ok?{background:C.terrainBg,border:`1px solid ${C.terrainBdr}`,color:C.terrain2}:{background:C.goldBg,border:`1px solid ${C.goldBdr}`,color:C.gold2})}}><span>Split: {fmt$(st)} / Total: {fmt$(totalPrice)}</span>{ok&&<span>Balanced</span>}</div>);})()}
                    </div>
                  )}
                  <div style={{display:'flex',gap:8,marginTop:10}}>
                    <button type="button" onClick={addSplit} style={{fontSize:11,fontWeight:700,color:C.violet2,padding:'6px 12px',borderRadius:8,background:C.violetBg,border:`1px solid ${C.violetBdr}`,cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontFamily:FONT}}><Plus style={{width:12,height:12}}/> Split payment</button>
                    {hasSplits&&<button type="button" onClick={()=>set('payment_splits',[])} style={{fontSize:11,color:C.inkDim,background:'none',border:'none',cursor:'pointer',textDecoration:'underline',fontFamily:FONT}}>Single card</button>}
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:12}}>
                    {[['include_tax_in_cashback','Tax in cashback'],['include_shipping_in_cashback','Shipping in cashback']].map(([f,label])=>(<label key={f} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:C.inkFaded,cursor:'pointer',fontFamily:FONT}}><input type="checkbox" checked={formData[f]} onChange={e=>set(f,e.target.checked)}/>{label}</label>))}
                    {isAmazon&&(<label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer',padding:'4px 10px',borderRadius:8,border:'1px solid',fontFamily:FONT,...(formData.amazon_yacb?{background:C.goldBg,borderColor:C.goldBdr,color:C.gold2}:{background:C.parchWarm,borderColor:C.parchLine,color:C.inkDim})}}><input type="checkbox" checked={formData.amazon_yacb} onChange={e=>set('amazon_yacb',e.target.checked)}/> Amazon YA 5%</label>)}
                  </div>
                  {cbAmount>0&&(<div style={{marginTop:12,background:C.violetBg,border:`1px solid ${C.violetBdr}`,borderRadius:10,padding:'10px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:11,color:C.violet2,fontFamily:FONT}}>Estimated cashback</span><span style={{fontFamily:MONO,fontSize:14,fontWeight:700,color:C.violet2}}>+{fmt$(cbAmount)}</span></div>)}
                </div>
                <div style={{ background:C.parchCard, border:`1px solid ${C.parchLine}`, borderRadius:12, padding:16 }}>
                  <GiftCardSection giftCards={giftCards} selectedIds={formData.gift_card_ids} onChange={ids=>set('gift_card_ids',ids)} retailer={formData.retailer} orderTotal={totalPrice}/>
                </div>
              </div>
            )}

            {/* SALES */}
            {activeTab==='sales'&&(
              <div style={{ background:C.parchCard, border:`1px solid ${C.parchLine}`, borderRadius:12, padding:16 }}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${C.parchLine}`}}>
                  <SectionHeader title="Sale Events" color={C.terrain2}/>
                  <button type="button" onClick={addSaleEvent} style={{fontSize:11,fontWeight:700,color:C.terrain2,padding:'5px 12px',borderRadius:8,background:C.terrainBg,border:`1px solid ${C.terrainBdr}`,cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontFamily:FONT}}><Plus style={{width:11,height:11}}/> Record Sale</button>
                </div>
                {formData.sale_events.length===0?(
                  <div style={{textAlign:'center',padding:'32px 0'}}>
                    <DollarSign style={{width:32,height:32,color:C.terrainBdr,margin:'0 auto 8px'}}/>
                    <p style={{color:C.inkDim,fontSize:13,marginBottom:12,fontFamily:FONT}}>No sale events yet</p>
                    <button type="button" onClick={addSaleEvent} style={{fontSize:12,fontWeight:600,color:C.terrain2,padding:'8px 20px',borderRadius:10,background:C.parchWarm,border:`1px solid ${C.terrainBdr}`,cursor:'pointer',fontFamily:FONT}}>+ Record First Sale</button>
                  </div>
                ):(
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    {formData.sale_events.map((ev,evIdx)=>(
                      <div key={ev.id} style={{borderRadius:10,padding:12,background:C.parchWarm,border:`1px solid ${C.terrainBdr}`}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                          <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:C.terrain2,background:C.terrainBg,padding:'2px 8px',borderRadius:99,border:`1px solid ${C.terrainBdr}`,fontFamily:FONT}}>Sale {evIdx+1}</span>
                          <button type="button" onClick={()=>removeSaleEvent(ev.id)} style={{color:C.crimson,background:'none',border:'none',cursor:'pointer',padding:4}}><Trash2 style={{width:13,height:13}}/></button>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8,marginBottom:10}}>
                          <div>
                            <LBL>Buyer / Platform</LBL>
                            <Select value={ev.buyer||''} onValueChange={v=>updateSaleEvent(ev.id,'buyer',v)}>
                              <SelectTrigger style={{...INP,height:34}}><SelectValue placeholder="Select buyer..."/></SelectTrigger>
                              <SelectContent style={{background:C.parchCard,border:`1px solid ${C.parchLine}`}}>
                                {sellers.map(s=><SelectItem key={s.id} value={s.name} style={{color:C.ink}}>{s.name}</SelectItem>)}
                                {['eBay','Amazon','Facebook Marketplace','Mercari','OfferUp'].map(p=><SelectItem key={p} value={p} style={{color:C.ink}}>{p}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div><LBL>Sale Date</LBL><input type="date" style={INP} value={ev.sale_date||''} onChange={e=>updateSaleEvent(ev.id,'sale_date',e.target.value)}/></div>
                          <div><LBL>Payout Date</LBL><input type="date" style={INP} value={ev.payout_date||''} onChange={e=>updateSaleEvent(ev.id,'payout_date',e.target.value)}/></div>
                        </div>
                        <LBL>Items Sold</LBL>
                        <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
                          {ev.items.map((it,itIdx)=>{
                            // Calculate max remaining for this product in THIS event
                            const totalOrdered = formData.items.find(i=>i.product_name===it.product_name) ? parseInt(formData.items.find(i=>i.product_name===it.product_name).quantity_ordered)||1 : 99;
                            const soldInOtherEvents = formData.sale_events
                              .filter(e=>e.id!==ev.id)
                              .reduce((s,e)=>s+(e.items||[]).filter(i=>i.product_name===it.product_name).reduce((ss,i)=>ss+(parseInt(i.qty)||1),0),0);
                            const maxQty = Math.max(1, totalOrdered - soldInOtherEvents);
                            return (
                            <div key={itIdx} style={{display:'grid',gridTemplateColumns:'4fr 1.5fr 2.5fr 20px',gap:6,alignItems:'center'}}>
                              <input style={INP} value={it.product_name||''} placeholder="Product" onChange={e=>updateSaleEventItem(ev.id,itIdx,'product_name',e.target.value)}/>
                              <div style={{position:'relative'}}>
                                <input style={{...INP,textAlign:'center',paddingBottom:16}} type="number" min="1" max={maxQty}
                                  value={parseInt(it.qty) || 1}
                                  placeholder="1"
                                  onChange={e=>updateSaleEventItem(ev.id,itIdx,'qty',Math.min(parseInt(e.target.value)||1, maxQty))}/>
                                <span style={{position:'absolute',bottom:3,left:0,right:0,textAlign:'center',fontSize:9,color:C.inkGhost,pointerEvents:'none',fontFamily:MONO}}>max {maxQty}</span>
                              </div>
                              <div style={{position:'relative'}}>
                                <span style={{position:'absolute',left:7,top:'50%',transform:'translateY(-50%)',color:C.inkGhost,fontSize:11}}>$</span>
                                <input style={{...INP,paddingLeft:18}} type="number" step="0.01" min="0" value={it.sale_price||''} placeholder="Price" onChange={e=>updateSaleEventItem(ev.id,itIdx,'sale_price',e.target.value)}/>
                              </div>
                              <button type="button" onClick={()=>updateSaleEvent(ev.id,'items',ev.items.filter((_,i)=>i!==itIdx))} style={{color:C.inkGhost,background:'none',border:'none',cursor:'pointer',padding:2}}><X style={{width:12,height:12}}/></button>
                            </div>
                            );
                          })}
                          <button type="button" onClick={()=>updateSaleEvent(ev.id,'items',[...ev.items,{product_name:'',qty:1,sale_price:0}])}
                            style={{fontSize:11,color:C.terrain2,background:'none',border:'none',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:4,fontFamily:FONT}}>
                            <Plus style={{width:11,height:11}}/> Add item
                          </button>
                          {ev.items.length>0&&(
                            <div style={{textAlign:'right',fontSize:11,color:C.terrain2,fontWeight:600,fontFamily:MONO}}>
                              Sale total: {fmt$(ev.items.reduce((s,it)=>s+(parseFloat(it.sale_price)||0)*(parseInt(it.qty)||1),0))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {totalRevenue>0&&(
                      <div style={{padding:'10px 14px',borderRadius:10,background:C.parchCard,border:`1px solid ${C.terrainBdr}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:12,color:C.terrain2,fontFamily:FONT}}>Total revenue</span>
                        <span style={{fontSize:13,color:C.terrain2,fontWeight:700,fontFamily:MONO}}>{fmt$(totalRevenue)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 24px', borderTop:`1px solid ${C.parchLine}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', background:C.parchWarm }}>
          <div style={{fontSize:12,color:C.inkDim,display:'flex',alignItems:'center',gap:0,flexWrap:'wrap',rowGap:2,fontFamily:FONT}}>
            <span style={{fontWeight:700,color:C.ink}}>{fmt$(totalPrice)}</span>
            {cbAmount>0&&<><span style={{margin:'0 6px'}}> </span><span style={{color:C.violet2,fontWeight:600,fontFamily:MONO}}>CB: {fmt$(cbAmount)}</span></>}
            {gcTotal>0&&<><span style={{margin:'0 6px'}}> </span><span style={{color:C.gold2,fontWeight:600,fontFamily:MONO}}>GC: {fmt$(gcTotal)}</span></>}
          </div>
          <div style={{display:'flex',gap:10}}>
            <button type="button" onClick={()=>onOpenChange(false)}
              style={{padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:500,color:C.inkFaded,background:C.parchWarm,border:`1px solid ${C.parchLine}`,cursor:'pointer',fontFamily:FONT}}>
              Cancel
            </button>
            <button type="submit" form="po-form" disabled={isPending}
              style={{padding:'8px 20px',borderRadius:8,fontSize:13,fontWeight:700,color:C.neCream,background:C.ink,border:'none',cursor:'pointer',opacity:isPending?0.6:1,fontFamily:FONT}}>
              {isPending?'Saving...':(order?'Save Changes':'Create Order')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}