import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Package, Upload, X, Loader, ChevronLeft, ChevronRight, Check, Barcode } from 'lucide-react';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  EXACT VALUES FROM globals.css                                       */
/* ------------------------------------------------------------------ */
const C = {
  ink:        '#3D2B1A',
  inkDim:     '#664930',
  inkFaded:   '#8a6d56',
  inkGhost:   '#b89e8a',
  gold:       '#A0722A',
  gold2:      '#C4922E',
  goldBg:     'rgba(160,114,42,0.08)',
  goldBdr:    'rgba(160,114,42,0.22)',
  parchCard:  '#FFF8F0',
  parchWarm:  '#F5EDE0',
  parchLine:  'rgba(153,126,103,0.18)',
  parchDeep:  '#EDE0CC',
  ocean:      '#2a5c7a',
  ocean2:     '#336e90',
  oceanBg:    'rgba(42,92,122,0.08)',
  oceanBdr:   'rgba(42,92,122,0.2)',
  terrain:    '#4a7a35',
  terrain2:   '#5a8c42',
  terrainBg:  'rgba(74,122,53,0.08)',
  terrainBdr: 'rgba(74,122,53,0.2)',
  violet:     '#5a3a6e',
  violet2:    '#6e4a85',
  violetBg:   'rgba(90,58,110,0.08)',
  violetBdr:  'rgba(90,58,110,0.2)',
  crimson:    '#8b3a2a',
  crimson2:   '#a34535',
  crimsonBg:  'rgba(139,58,42,0.08)',
  crimsonBdr: 'rgba(139,58,42,0.2)',
  neCream:    '#FFDBBB',
};

/* font-serif in globals.css = ui-sans-serif (system font, NOT Playfair) */
const FONT = 'ui-sans-serif, system-ui, -apple-system, sans-serif';
const MONO = "ui-monospace, 'SF Mono', 'Consolas', monospace";

const CAT = {
  phones:      { bg:C.oceanBg,   color:C.ocean2,   border:C.oceanBdr   },
  tablets:     { bg:C.terrainBg, color:C.terrain2,  border:C.terrainBdr },
  laptops:     { bg:C.violetBg,  color:C.violet2,   border:C.violetBdr  },
  gaming:      { bg:C.crimsonBg, color:C.crimson2,  border:C.crimsonBdr },
  accessories: { bg:C.goldBg,    color:C.gold2,     border:C.goldBdr    },
  wearables:   { bg:C.oceanBg,   color:'#1a4060',   border:C.oceanBdr   },
  audio:       { bg:C.violetBg,  color:C.violet2,   border:C.violetBdr  },
  other:       { bg:'rgba(153,126,103,0.08)', color:C.inkFaded, border:'rgba(153,126,103,0.22)' },
};

const SRC = {
  'UPCitemdb': { bg:C.oceanBg,   color:C.ocean2,  border:C.oceanBdr  },
  'Best Buy':  { bg:C.goldBg,    color:C.gold2,   border:C.goldBdr   },
  'Google':    { bg:C.terrainBg, color:C.terrain2, border:C.terrainBdr},
};

const INP = {
  background:   C.parchWarm,
  border:       `1px solid ${C.parchLine}`,
  borderRadius: 8,
  color:        C.ink,
  padding:      '8px 12px',
  fontSize:     13,
  outline:      'none',
  width:        '100%',
  fontFamily:   FONT,
};

/* ------------------------------------------------------------------ */
/*  NAME CLEANER                                                        */
/* ------------------------------------------------------------------ */
function cleanDisplayName(name) {
  if (!name) return '';
  let n = name;
  n = n.replace(/\s*\|\s*(?:for\s+\w+|compatible with[^,|]*)(\s*\|)?/gi, '');
  n = n.replace(/\s*\(\d{4}(?:,\s*\d+(?:st|nd|rd|th)\s+generation)?\)/gi, '');
  n = n.replace(/\s*,\s*\d{4}\s*$/gi, '');
  n = n.replace(/\((\d+(?:st|nd|rd|th))\s+generation\)/gi, '$1 Gen');
  n = n.replace(/\s+-\s+/g, ' ');
  n = n.replace(/^([\w]+)\s+-\s+/, '$1 ');
  n = n.replace(/\s+with\s+\d+-core\s+CPU[^,)]*/gi, '');
  n = n.replace(/\s+chip\b/gi, '');
  n = n.replace(/\(\s*\)/g, '');
  n = n.replace(/\s{2,}/g, ' ').trim();
  if (n.length > 52) {
    const parts = n.split(' ');
    let result = '';
    for (const part of parts) {
      if ((result + ' ' + part).trim().length > 52) break;
      result = (result + ' ' + part).trim();
    }
    n = result;
  }
  return n;
}

/* ------------------------------------------------------------------ */
/*  CATEGORY GUESSER                                                    */
/* ------------------------------------------------------------------ */
function guessCategory(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('ipad')||n.includes('tablet')||n.includes('galaxy tab')||n.includes('fire hd')) return 'tablets';
  if (n.includes('iphone')||n.includes('galaxy s')||n.includes('galaxy a')||n.includes('pixel')||n.includes('smartphone')) return 'phones';
  if (n.includes('macbook')||n.includes('laptop')||n.includes('notebook')||n.includes('chromebook')||n.includes('thinkpad')||n.includes('inspiron')||n.includes('mac mini')||n.includes('imac')||n.includes('mac pro')||n.includes('desktop')||n.includes('surface pro')) return 'laptops';
  if (n.includes('airpods')||n.includes('earbuds')||n.includes('headphone')||n.includes('headset')||n.includes('speaker')||n.includes('soundbar')||n.includes('buds')||n.includes('tws')) return 'audio';
  if (n.includes('apple watch')||n.includes('galaxy watch')||n.includes('watch se')||n.includes('watch series')||n.includes('fitbit')||n.includes('garmin')||n.includes('smartwatch')) return 'wearables';
  if (n.includes('nintendo')||n.includes('playstation')||n.includes('xbox')||n.includes('switch')||n.includes('ps5')||n.includes('ps4')||n.includes('mario')) return 'gaming';
  if (n.includes('airtag')||n.includes('case')||n.includes('cable')||n.includes('charger')||n.includes('adapter')||n.includes('hub')||n.includes('keyboard')||n.includes('mouse')||n.includes('webcam')||n.includes('pencil')||n.includes('stylus')||n.includes('hdmi')||n.includes('usb')||n.includes('ssd')||n.includes('fire stick')||n.includes('fire tv')||n.includes('roku')||n.includes('echo')||n.includes('alexa')||n.includes('ring')) return 'accessories';
  return 'other';
}

/* ------------------------------------------------------------------ */
/*  DUPLICATE CHECK                                                     */
/* ------------------------------------------------------------------ */
function findDuplicate(formData, products, editingId) {
  const upc  = (formData.upc  || '').trim();
  const name = (formData.name || '').trim().toLowerCase();
  for (const p of products) {
    if (editingId && p.id === editingId) continue;
    if (upc  && p.upc  && p.upc.trim()               === upc)  return { field:'upc',  product:p };
    if (name && p.name && p.name.trim().toLowerCase() === name) return { field:'name', product:p };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  MICRO COMPONENTS                                                    */
/* ------------------------------------------------------------------ */

/* Matches .section-div from globals.css exactly */
function SectionDivider({ title, dotColor=C.gold, lineColor='rgba(160,114,42,0.25)' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, margin:'18px 0 12px' }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:dotColor, flexShrink:0 }}/>
      <span style={{ fontFamily:FONT, fontSize:10, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:C.inkFaded, whiteSpace:'nowrap' }}>{title}</span>
      <div style={{ flex:1, height:1, background:`linear-gradient(to right, ${lineColor}, transparent)` }}/>
    </div>
  );
}

/* Matches .kpi-label from globals.css */
function LBL({ children }) {
  return (
    <label style={{ fontFamily:FONT, fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:C.inkFaded, display:'block', marginBottom:4 }}>
      {children}
    </label>
  );
}

/* Matches .status-badge from globals.css */
function CategoryBadge({ category }) {
  const s = CAT[category] || CAT.other;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', background:s.bg, color:s.color, border:`1px solid ${s.border}`, fontFamily:FONT }}>
      {category || 'other'}
    </span>
  );
}

function SourceBadge({ source }) {
  const s = SRC[source] || SRC['Google'];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', background:s.bg, color:s.color, border:`1px solid ${s.border}`, whiteSpace:'nowrap', flexShrink:0, fontFamily:FONT }}>
      {source}
    </span>
  );
}

function ProductImage({ src, name, size=60 }) {
  const [err, setErr] = useState(false);
  if (src && !err) return (
    <img src={src} alt={name} onError={()=>setErr(true)}
      style={{ width:size, height:size, borderRadius:10, objectFit:'contain', objectPosition:'center', flexShrink:0, padding:4 }}/>
  );
  return (
    <div style={{ width:size, height:size, borderRadius:10, background:C.terrainBg, border:`1px solid ${C.terrainBdr}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontSize:size*0.4, fontWeight:700, color:C.terrain2, fontFamily:FONT }}>{name?.charAt(0)?.toUpperCase()||'?'}</span>
    </div>
  );
}

function ProductThumb({ src, name, size=38 }) {
  const [err, setErr] = useState(false);
  if (src && !err) return (
    <img src={src} alt={name} onError={()=>setErr(true)}
      style={{ width:size, height:size, borderRadius:8, objectFit:'contain', objectPosition:'center', flexShrink:0, padding:size>50?6:3, background:C.parchWarm, border:`1px solid ${C.parchLine}` }}/>
  );
  return (
    <div style={{ width:size, height:size, borderRadius:8, flexShrink:0, background:C.terrainBg, border:`1px solid ${C.terrainBdr}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontSize:size*0.38, fontWeight:700, color:C.terrain2, fontFamily:FONT }}>{name?.charAt(0)?.toUpperCase()||'?'}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PRODUCT CARD  (matches .card from globals.css)                      */
/* ------------------------------------------------------------------ */
function ProductCard({ product, onEdit, onDelete, isAdmin }) {
  const [hovered, setHovered] = useState(false);
  const display = cleanDisplayName(product.name);
  return (
    <div
      onMouseEnter={()=>setHovered(true)}
      onMouseLeave={()=>setHovered(false)}
      style={{
        background:   hovered ? C.goldBg    : C.parchCard,
        border:       `1px solid ${hovered ? C.goldBdr : C.parchLine}`,
        borderRadius: 14,
        boxShadow:    '0 1px 4px rgba(61,43,26,0.07)',
        padding:      '12px 10px',
        display:      'flex', flexDirection:'column', alignItems:'center',
        gap:8, textAlign:'center', position:'relative',
        transition:   'all 0.15s', cursor:'default'
      }}
    >
      {hovered && (
        <div style={{ position:'absolute', top:7, right:7, display:'flex', gap:3 }}>
          <button onClick={()=>onEdit(product)} style={{ width:24, height:24, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', background:C.parchWarm, border:`1px solid ${C.parchLine}`, color:C.inkDim, cursor:'pointer' }}>
            <Pencil style={{ width:11, height:11 }}/>
          </button>
          {isAdmin && <button onClick={()=>onDelete(product)} style={{ width:24, height:24, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', background:C.crimsonBg, border:`1px solid ${C.crimsonBdr}`, color:C.crimson, cursor:'pointer' }}>
            <Trash2 style={{ width:11, height:11 }}/>
          </button>}
        </div>
      )}
      <ProductImage src={product.image} name={product.name} size={60}/>
      <div title={product.name} style={{ fontSize:11, fontWeight:600, color:C.ink, lineHeight:1.35, maxWidth:'100%', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', fontFamily:FONT }}>
        {display}
      </div>
      <CategoryBadge category={product.category}/>
      {product.upc && <span style={{ fontFamily:MONO, fontSize:9, color:C.inkGhost }}>{product.upc}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  UPC PICKER MODAL                                                    */
/* ------------------------------------------------------------------ */
function UPCPickerModal({ upc, results, onSelect, onManual, onClose }) {
  const [selected, setSelected] = useState(0);
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(26,18,10,0.6)' }}/>
      <div style={{ position:'relative', width:'100%', maxWidth:520, background:C.parchCard, borderRadius:16, border:`1px solid ${C.parchLine}`, boxShadow:'0 4px 20px rgba(61,43,26,0.10)', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.parchLine}`, display:'flex', alignItems:'flex-start', justifyContent:'space-between', background:C.parchWarm }}>
          <div>
            <div style={{ fontFamily:FONT, fontSize:14, fontWeight:700, color:C.ink }}>
              {results.length>1?'Multiple results found':'Result found'}
            </div>
            <div style={{ fontSize:10, color:C.inkDim, marginTop:2 }}>
              UPC <span style={{ fontFamily:MONO, background:C.parchWarm, padding:'1px 6px', borderRadius:4, border:`1px solid ${C.parchLine}`, color:C.inkFaded }}>{upc}</span>
              {results.length>1?' -- pick the correct product':' -- confirm or enter manually'}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.inkDim, cursor:'pointer', padding:4 }}><X style={{ width:16, height:16 }}/></button>
        </div>
        <div style={{ padding:'14px 20px', display:'flex', flexDirection:'column', gap:7, maxHeight:'60vh', overflowY:'auto' }}>
          {results.map((r,i)=>(
            <div key={i} onClick={()=>setSelected(i)}
              style={{ borderRadius:10, padding:'10px 12px', border:'1px solid', borderColor:selected===i?C.terrainBdr:C.parchLine, background:selected===i?C.terrainBg:C.parchWarm, display:'flex', alignItems:'center', gap:10, cursor:'pointer', transition:'all 0.12s' }}>
              <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0, border:selected===i?'none':`1.5px solid ${C.parchLine}`, background:selected===i?C.terrain:'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {selected===i&&<Check style={{ width:11, height:11, color:'white' }}/>}
              </div>
              <ProductThumb src={r.image} name={r.title} size={40}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:C.ink, lineHeight:1.35, fontFamily:FONT }}>{cleanDisplayName(r.title)}</div>
                <div style={{ fontSize:9, color:C.inkGhost, marginTop:2, fontFamily:MONO, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</div>
              </div>
              <SourceBadge source={r.source}/>
            </div>
          ))}
          <div onClick={onManual} style={{ borderRadius:10, padding:'9px 12px', border:`1px solid ${C.crimsonBdr}`, background:C.crimsonBg, fontSize:11, color:C.crimson, cursor:'pointer', textAlign:'center', fontFamily:FONT }}>
            None of these -- I'll enter manually
          </div>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.parchLine}`, background:C.parchWarm, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:500, background:C.parchWarm, border:`1px solid ${C.parchLine}`, color:C.inkFaded, cursor:'pointer', fontFamily:FONT }}>Cancel</button>
          <button onClick={()=>onSelect(results[selected])} style={{ padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:700, background:C.ink, color:C.neCream, border:'none', cursor:'pointer', fontFamily:FONT }}>
            Use selected
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGINATION                                                          */
/* ------------------------------------------------------------------ */
const PAGE_SIZE = 25;

function Pagination({ page, totalPages, total, onPage }) {
  if (totalPages<=1) return null;
  const start = (page-1)*PAGE_SIZE+1;
  const end   = Math.min(page*PAGE_SIZE, total);
  const pages = [];
  if (totalPages<=7) { for (let i=1;i<=totalPages;i++) pages.push(i); }
  else {
    pages.push(1);
    if (page>3) pages.push('...');
    for (let i=Math.max(2,page-1);i<=Math.min(totalPages-1,page+1);i++) pages.push(i);
    if (page<totalPages-2) pages.push('...');
    pages.push(totalPages);
  }
  const btnS = (active) => ({ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:active?700:400, cursor:'pointer', border:'1px solid', background:active?C.goldBg:C.parchCard, borderColor:active?C.goldBdr:C.parchLine, color:active?C.gold:C.inkDim, fontFamily:MONO });
  const navS = (disabled) => ({ width:32, height:32, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:disabled?'not-allowed':'pointer', border:`1px solid ${C.parchLine}`, background:C.parchCard, color:disabled?C.inkGhost:C.inkFaded, opacity:disabled?0.4:1 });
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:20, flexWrap:'wrap', gap:10 }}>
      <span style={{ fontSize:11, color:C.inkDim, fontFamily:FONT }}>Showing {start}-{end} of {total} products</span>
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <button onClick={()=>onPage(page-1)} disabled={page===1} style={navS(page===1)}><ChevronLeft style={{ width:14, height:14 }}/></button>
        {pages.map((p,i)=>p==='...'
          ? <span key={`e${i}`} style={{ width:32, textAlign:'center', fontSize:12, color:C.inkGhost }}>...</span>
          : <button key={p} onClick={()=>onPage(p)} style={btnS(p===page)}>{p}</button>
        )}
        <button onClick={()=>onPage(page+1)} disabled={page===totalPages} style={navS(page===totalPages)}><ChevronRight style={{ width:14, height:14 }}/></button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN COMPONENT                                                      */
/* ------------------------------------------------------------------ */
const CATEGORIES = ['phones','tablets','laptops','gaming','accessories','wearables','audio','other'];

export default function Products() {
  const queryClient = useQueryClient();
  const [search,         setSearch]         = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page,           setPage]           = useState(1);
  const [dialogOpen,     setDialogOpen]     = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loadingUPC,     setLoadingUPC]     = useState(false);
  const [formData,       setFormData]       = useState({ name:'', upc:'', image:'', category:'' });
  const [dupWarning,     setDupWarning]     = useState(null);
  const [pickerResults,  setPickerResults]  = useState(null);
  const [pickerUPC,      setPickerUPC]      = useState('');
  const [importOpen,     setImportOpen]     = useState(false);
  const [upcInput,       setUpcInput]       = useState('');
  const [importRows,     setImportRows]     = useState([]);
  const [importing,      setImporting]      = useState(false);
  const [lookingUp,      setLookingUp]      = useState(false);
  const [userEmail,      setUserEmail]      = useState(null);

  useEffect(()=>{ base44.auth.me().then(u=>{ setUserEmail(u?.email); setIsAdmin(u?.role==='admin'); }).catch(()=>{}); },[]);

  const [isAdmin, setIsAdmin] = useState(false);

  const { data:allProducts=[], isLoading } = useQuery({ queryKey:['products'], queryFn:()=>base44.entities.Product.list() });

  const products = allProducts;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey:['products'] }); toast.success('Product added to catalog'); closeDialog(); }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey:['products'] }); toast.success('Product updated'); closeDialog(); }
  });
  const deleteMutation = useMutation({
    mutationFn: (product) => base44.entities.Product.delete(product.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey:['products'] }); toast.success('Product deleted'); }
  });

  const openDialog = (product=null) => {
    setEditingProduct(product);
    setFormData(product ? { name:product.name||'', upc:product.upc||'', image:product.image||'', category:product.category||'' } : { name:'', upc:'', image:'', category:'' });
    setDupWarning(null);
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditingProduct(null); setDupWarning(null); };

  const handleFormChange = useCallback((field, value) => {
    const updated = { ...formData, [field]:value };
    setFormData(updated);
    setDupWarning(findDuplicate(updated, products, editingProduct?.id));
  }, [formData, products, editingProduct]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dup = findDuplicate(formData, products, editingProduct?.id);
    if (dup) { setDupWarning(dup); return; }
    if (editingProduct) updateMutation.mutate({ id:editingProduct.id, data:{ ...formData } });
    else createMutation.mutate({ ...formData });
  };

  const handleDelete = (product) => { deleteMutation.mutate(product); };

  const lookupSingleUPC = async () => {
    if (!formData.upc) { toast.error('Enter a UPC first'); return; }
    setLoadingUPC(true);
    try {
      const { data } = await base44.functions.invoke('lookupUPC', { upc:formData.upc });
      const results = data.results || [];
      if (results.length===0) toast.error('No results found -- enter manually');
      else { setPickerUPC(formData.upc); setPickerResults(results); }
    } catch { toast.error('Lookup failed. Enter manually.'); }
    finally { setLoadingUPC(false); }
  };

  const handlePickerSelect = (result) => {
    const autoCategory = guessCategory(result.title);
    setFormData(prev=>({ ...prev, name:result.title, image:result.image||prev.image, category:prev.category||autoCategory }));
    setPickerResults(null);
    setDupWarning(findDuplicate({ ...formData, name:result.title }, products, editingProduct?.id));
  };

  const handleBulkLookup = async () => {
    const rawUpcs = upcInput.split(/[\n,]+/).map(s=>s.trim().replace(/\D/g,'')).filter(s=>s.length>=6).slice(0,60);
    if (rawUpcs.length===0) { toast.error('Paste at least one UPC'); return; }
    setImportRows(rawUpcs.map(upc=>({ upc, name:'', image:'', category:'', status:'loading', selected:true })));
    setLookingUp(true);
    const existingUpcs  = new Set(products.map(p=>(p.upc||'').trim()).filter(Boolean));
    const existingNames = new Set(products.map(p=>(p.name||'').trim().toLowerCase()).filter(Boolean));
    for (const upc of rawUpcs) {
      if (existingUpcs.has(upc)) {
        setImportRows(prev=>prev.map(r=>r.upc===upc?{ ...r, status:'duplicate', selected:false, name:products.find(p=>p.upc===upc)?.name||'' }:r));
        continue;
      }
      try {
        const { data } = await base44.functions.invoke('lookupUPC', { upc });
        const results  = data.results||[];
        const best     = results.find(r=>r.source==='Best Buy')||results[0];
        if (best) {
          const nameAlreadyExists = existingNames.has((best.title||'').trim().toLowerCase());
          setImportRows(prev=>prev.map(r=>r.upc===upc?{ ...r, name:best.title, image:best.image||'', category:guessCategory(best.title), source:best.source, status:nameAlreadyExists?'duplicate':'new', selected:!nameAlreadyExists }:r));
        } else {
          setImportRows(prev=>prev.map(r=>r.upc===upc?{ ...r, status:'not_found', selected:false }:r));
        }
      } catch {
        setImportRows(prev=>prev.map(r=>r.upc===upc?{ ...r, status:'not_found', selected:false }:r));
      }
      await new Promise(res=>setTimeout(res,150));
    }
    setLookingUp(false);
  };

  const handleBulkImport = async () => {
    const toImport = importRows.filter(r=>r.selected&&r.status==='new');
    if (toImport.length===0) { toast.error('No new products selected'); return; }
    setImporting(true);
    let created=0;
    for (const row of toImport) { try { await base44.entities.Product.create({ name:row.name, upc:row.upc, image:row.image, category:row.category||'' }); created++; } catch {} }
    queryClient.invalidateQueries({ queryKey:['products'] });
    toast.success(`${created} product${created!==1?'s':''} added to catalog`);
    setImporting(false); setImportOpen(false); setUpcInput(''); setImportRows([]);
  };



  const toggleRow       = (upc) => setImportRows(prev=>prev.map(r=>r.upc===upc?{ ...r, selected:!r.selected }:r));
  const toggleAll       = () => { const allSel=importRows.filter(r=>r.status==='new').every(r=>r.selected); setImportRows(prev=>prev.map(r=>r.status==='new'?{ ...r, selected:!allSel }:r)); };
  const updateImportRow = (upc,field,value) => setImportRows(prev=>prev.map(r=>r.upc===upc?{ ...r,[field]:value }:r));

  const filtered = useMemo(()=>
    products.filter(p=>{
      const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.upc?.toLowerCase().includes(search.toLowerCase());
      const matchCat    = categoryFilter==='all' || p.category===categoryFilter;
      return matchSearch && matchCat;
    }).sort((a,b)=>(a.name||'').localeCompare(b.name||'')),
    [products, search, categoryFilter]
  );

  const totalPages = Math.ceil(filtered.length/PAGE_SIZE);
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const newCount   = importRows.filter(r=>r.status==='new').length;
  const dupCount   = importRows.filter(r=>r.status==='duplicate').length;
  const failCount  = importRows.filter(r=>r.status==='not_found').length;
  const selCount   = importRows.filter(r=>r.selected&&r.status==='new').length;

  /* Table header style matching .dash-table th from globals.css */
  const TH = { color:C.inkFaded, fontSize:10, textTransform:'uppercase', letterSpacing:'0.14em', padding:'8px 12px', textAlign:'left', borderBottom:`1px solid ${C.parchLine}`, fontWeight:700, fontFamily:FONT, whiteSpace:'nowrap' };
  const TD = { padding:'9px 12px', borderBottom:`1px solid ${C.parchLine}`, verticalAlign:'middle', fontFamily:FONT };

  return (
    <div style={{ paddingBottom:24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Master product catalog — {products.length} total</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>

          {/* Import UPCs -- matches ghost button style in Analytics */}
          <button onClick={()=>setImportOpen(true)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:8, fontSize:11, fontWeight:600, background:C.parchCard, border:`1px solid ${C.parchLine}`, color:C.inkFaded, cursor:'pointer', fontFamily:FONT }}>
            <Upload style={{ width:13, height:13 }}/> Import UPCs
          </button>
          {/* Add Product -- matches .refresh-btn from globals.css */}
          <button onClick={()=>openDialog()}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:7, fontSize:11, fontWeight:700, background:C.ink, color:C.neCream, border:'none', cursor:'pointer', fontFamily:FONT, letterSpacing:'0.06em' }}>
            <Plus style={{ width:13, height:13 }}/> Add Product
          </button>
        </div>
      </div>

      {/* Section divider + filters */}
      <SectionDivider title="Catalog"/>
      <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center', background:C.parchCard, border:`1px solid ${C.parchLine}`, borderRadius:14, padding:'8px 12px', flexWrap:'wrap', boxShadow:'0 1px 4px rgba(61,43,26,0.07)' }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:C.inkGhost }}/>
          <input type="text" placeholder="Search products or UPC..." value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }} style={{ ...INP, paddingLeft:32 }}/>
        </div>
        {/* Filter pills matching .tab-btn from globals.css */}
        <div style={{ display:'flex', gap:3, padding:3, borderRadius:8, background:C.parchWarm, border:`1px solid ${C.parchLine}` }}>
          {['all',...CATEGORIES].map(cat=>{
            const s      = cat==='all' ? null : CAT[cat];
            const active = categoryFilter===cat;
            return (
              <button key={cat} onClick={()=>{ setCategoryFilter(cat); setPage(1); }}
                style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'capitalize', cursor:'pointer', border:'none', fontFamily:FONT,
                  background:  active ? C.ink       : 'transparent',
                  color:       active ? C.neCream   : C.inkFaded,
                  transition:  'background 0.15s, color 0.15s',
                }}>
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:48 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', border:`3px solid ${C.terrainBg}`, borderTopColor:C.terrain, animation:'spin 0.8s linear infinite' }}/>
        </div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'48px 24px', background:C.parchCard, borderRadius:14, border:`1px solid ${C.parchLine}` }}>
          <Package style={{ width:36, height:36, color:C.inkGhost, margin:'0 auto 12px' }}/>
          <p style={{ color:C.inkDim, fontSize:13 }}>No products found.</p>
        </div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:10 }}>
            {paginated.map(product=><ProductCard key={product.id} product={product} onEdit={openDialog} onDelete={handleDelete} isAdmin={isAdmin}/>)}
          </div>
          <Pagination page={page} totalPages={totalPages} total={filtered.length} onPage={(p)=>{ setPage(p); window.scrollTo({ top:0, behavior:'smooth' }); }}/>
        </>
      )}

      {/* UPC PICKER */}
      {pickerResults && (
        <UPCPickerModal upc={pickerUPC} results={pickerResults} onSelect={handlePickerSelect}
          onManual={()=>setPickerResults(null)} onClose={()=>setPickerResults(null)}/>
      )}

      {/* ADD / EDIT MODAL */}
      {dialogOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={closeDialog} style={{ position:'absolute', inset:0, background:'rgba(26,18,10,0.6)' }}/>
          <div style={{ position:'relative', width:'100%', maxWidth:480, background:C.parchCard, borderRadius:16, border:`1px solid ${C.parchLine}`, boxShadow:'0 4px 20px rgba(61,43,26,0.10)', overflow:'hidden' }}>
            <div style={{ padding:'18px 24px 14px', borderBottom:`1px solid ${C.parchLine}`, background:C.parchWarm, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <h2 style={{ fontFamily:FONT, fontSize:16, fontWeight:700, margin:0, color:C.ink }}>{editingProduct?'Edit Product':'Add Product'}</h2>
                <p style={{ fontSize:10, color:C.inkGhost, marginTop:2 }}>{editingProduct?'Update product details':'Visible to all users once created'}</p>
              </div>
              <button onClick={closeDialog} style={{ background:'none', border:'none', color:C.inkDim, cursor:'pointer', padding:4 }}><X style={{ width:16, height:16 }}/></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ padding:'18px 24px', display:'flex', flexDirection:'column', gap:14 }}>
                {formData.image && <div style={{ display:'flex', justifyContent:'center' }}><ProductThumb src={formData.image} name={formData.name} size={80}/></div>}
                <div>
                  <LBL>Product Name *</LBL>
                  <input style={{ ...INP, borderColor:dupWarning?.field==='name'?C.crimson:C.parchLine }}
                    value={formData.name} onChange={e=>handleFormChange('name',e.target.value)} required placeholder="e.g. MacBook Air M5"/>
                  {dupWarning?.field==='name' && <p style={{ fontSize:11, color:C.crimson, marginTop:4 }}>Already in catalog: "{cleanDisplayName(dupWarning.product.name)}"</p>}
                  {formData.name && !dupWarning && <p style={{ fontSize:10, color:C.inkGhost, marginTop:3 }}>Displays as: <span style={{ color:C.inkDim, fontWeight:600 }}>{cleanDisplayName(formData.name)}</span></p>}
                </div>
                <div>
                  <LBL>UPC</LBL>
                  <div style={{ display:'flex', gap:8 }}>
                    <input style={{ ...INP, flex:1, borderColor:dupWarning?.field==='upc'?C.crimson:C.parchLine, fontFamily:MONO }}
                      value={formData.upc} onChange={e=>handleFormChange('upc',e.target.value)} placeholder="Barcode number"/>
                    <button type="button" disabled={loadingUPC} onClick={lookupSingleUPC}
                      style={{ padding:'8px 14px', borderRadius:8, fontSize:11, fontWeight:600, background:C.terrainBg, border:`1px solid ${C.terrainBdr}`, color:C.terrain2, cursor:'pointer', whiteSpace:'nowrap', opacity:loadingUPC?0.5:1, display:'flex', alignItems:'center', gap:5, fontFamily:FONT }}>
                      {loadingUPC ? <><div style={{ width:12, height:12, borderRadius:'50%', border:`2px solid ${C.terrain2}`, borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/> Searching...</> : <><Barcode style={{ width:13, height:13 }}/> Lookup</>}
                    </button>
                  </div>
                  {dupWarning?.field==='upc' && <p style={{ fontSize:11, color:C.crimson, marginTop:4 }}>UPC already exists: "{cleanDisplayName(dupWarning.product.name)}"</p>}
                </div>
                <div>
                  <LBL>Category <span style={{ color:C.terrain, fontSize:9, fontWeight:400, textTransform:'none', letterSpacing:0 }}>auto-detected from name</span></LBL>
                  <select value={formData.category} onChange={e=>setFormData({ ...formData, category:e.target.value })} style={{ ...INP, cursor:'pointer' }}>
                    <option value="">Select category...</option>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <LBL>Image URL</LBL>
                  <input type="text" style={INP} value={formData.image} onChange={e=>setFormData({ ...formData, image:e.target.value })} placeholder="https://..."/>
                </div>
              </div>
              <div style={{ padding:'14px 24px', borderTop:`1px solid ${C.parchLine}`, background:C.parchWarm, display:'flex', justifyContent:'flex-end', gap:10 }}>
                <button type="button" onClick={closeDialog} style={{ padding:'8px 16px', borderRadius:8, fontSize:12, fontWeight:500, background:C.parchWarm, border:`1px solid ${C.parchLine}`, color:C.inkFaded, cursor:'pointer', fontFamily:FONT }}>Cancel</button>
                <button type="submit" disabled={!!dupWarning} style={{ padding:'8px 20px', borderRadius:8, fontSize:12, fontWeight:700, background:C.ink, color:C.neCream, border:'none', cursor:dupWarning?'not-allowed':'pointer', opacity:dupWarning?0.5:1, fontFamily:FONT }}>
                  {editingProduct?'Update':'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT MODAL */}
      {importOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div onClick={()=>{ if(!lookingUp&&!importing){ setImportOpen(false); setImportRows([]); setUpcInput(''); } }} style={{ position:'absolute', inset:0, background:'rgba(26,18,10,0.6)' }}/>
          <div style={{ position:'relative', width:'100%', maxWidth:780, maxHeight:'88vh', background:C.parchCard, borderRadius:16, border:`1px solid ${C.parchLine}`, boxShadow:'0 4px 20px rgba(61,43,26,0.10)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'18px 24px 14px', borderBottom:`1px solid ${C.parchLine}`, background:C.parchWarm, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div>
                <h2 style={{ fontFamily:FONT, fontSize:16, fontWeight:700, margin:0, color:C.ink }}>Import UPCs</h2>
                <p style={{ fontSize:11, color:C.inkDim, marginTop:2 }}>Best Buy preferred  category auto-detected  duplicates skipped</p>
              </div>
              <button onClick={()=>{ setImportOpen(false); setImportRows([]); setUpcInput(''); }} style={{ background:'none', border:'none', color:C.inkDim, cursor:'pointer', padding:4 }}><X style={{ width:16, height:16 }}/></button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'18px 24px' }}>
              {importRows.length===0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <LBL>Paste UPCs (one per line or comma separated  max 60)</LBL>
                  <textarea value={upcInput} onChange={e=>setUpcInput(e.target.value)} placeholder={'840268963422\n195949836251\n045496885311\n...'} rows={10} style={{ ...INP, resize:'vertical', fontFamily:MONO, fontSize:12, lineHeight:1.6 }}/>
                  <p style={{ fontSize:11, color:C.inkDim }}>Tries Best Buy then UPCitemdb then Google  category auto-detected  you can override before importing</p>
                </div>
              ) : (
                <div>
                  <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                    {newCount >0&&<span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', background:C.terrainBg, color:C.terrain2, border:`1px solid ${C.terrainBdr}` }}>{newCount} new</span>}
                    {dupCount >0&&<span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', background:C.goldBg, color:C.gold2, border:`1px solid ${C.goldBdr}` }}>{dupCount} already exist</span>}
                    {failCount>0&&<span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', background:C.crimsonBg, color:C.crimson2, border:`1px solid ${C.crimsonBdr}` }}>{failCount} not found</span>}
                    {lookingUp&&<span  style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', background:C.oceanBg, color:C.ocean2, border:`1px solid ${C.oceanBdr}` }}>Looking up...</span>}
                  </div>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, tableLayout:'fixed' }}>
                    <colgroup><col style={{ width:32 }}/><col style={{ width:44 }}/><col/><col style={{ width:120 }}/><col style={{ width:110 }}/><col style={{ width:70 }}/><col style={{ width:70 }}/></colgroup>
                    <thead>
                      <tr style={{ background:C.parchWarm }}>
                        <th style={{ ...TH, padding:'6px 8px' }}><input type="checkbox" onChange={toggleAll} checked={importRows.filter(r=>r.status==='new').every(r=>r.selected)&&newCount>0}/></th>
                        <th style={TH}>img</th><th style={TH}>name</th><th style={TH}>upc</th><th style={TH}>category</th><th style={TH}>source</th><th style={TH}>status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map(row=>{
                        const isNew=row.status==='new', isDup=row.status==='duplicate', isFail=row.status==='not_found', isLoad=row.status==='loading';
                        return (
                          <tr key={row.upc} style={{ opacity:(isDup||isFail)?0.4:1 }}>
                            <td style={{ ...TD, textAlign:'center' }}>{isNew&&<input type="checkbox" checked={row.selected} onChange={()=>toggleRow(row.upc)}/>}</td>
                            <td style={TD}>{isLoad?<div style={{ width:32, height:32, borderRadius:6, background:C.parchWarm, display:'flex', alignItems:'center', justifyContent:'center' }}><Loader style={{ width:14, height:14, color:C.ocean, animation:'spin 1s linear infinite' }}/></div>:<ProductThumb src={row.image} name={row.name} size={32}/>}</td>
                            <td style={TD}>{isNew?<div><input value={cleanDisplayName(row.name)} onChange={e=>updateImportRow(row.upc,'name',e.target.value)} style={{ ...INP, padding:'4px 8px', fontSize:11 }}/>{row.name&&cleanDisplayName(row.name)!==row.name&&<p style={{ fontSize:9, color:C.inkGhost, marginTop:2, fontFamily:MONO }} title={row.name}>Full: {row.name.slice(0,40)}...</p>}</div>:<span style={{ fontSize:11, color:C.inkDim }}>{cleanDisplayName(row.name)||'--'}</span>}</td>
                            <td style={TD}><span style={{ fontFamily:MONO, fontSize:10, color:C.inkGhost }}>{row.upc}</span></td>
                            <td style={TD}>{isNew&&<select value={row.category} onChange={e=>updateImportRow(row.upc,'category',e.target.value)} style={{ ...INP, padding:'4px 6px', fontSize:11, cursor:'pointer' }}><option value="">--</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>}</td>
                            <td style={TD}>{row.source&&<SourceBadge source={row.source}/>}</td>
                            <td style={TD}>
                              {isLoad&&<span style={{ fontSize:10, color:C.ocean2 }}>Looking...</span>}
                              {isNew &&<span style={{ fontSize:10, fontWeight:700, color:C.terrain2 }}>New</span>}
                              {isDup &&<span style={{ fontSize:10, fontWeight:700, color:C.gold2   }}>Exists</span>}
                              {isFail&&<span style={{ fontSize:10, fontWeight:700, color:C.crimson2}}>Not found</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div style={{ padding:'14px 24px', borderTop:`1px solid ${C.parchLine}`, background:C.parchWarm, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div style={{ fontSize:11, color:C.inkDim }}>{importRows.length>0&&!lookingUp&&`${selCount} product${selCount!==1?'s':''} selected`}</div>
              <div style={{ display:'flex', gap:10 }}>
                {importRows.length>0&&!lookingUp&&<button onClick={()=>{ setImportRows([]); setUpcInput(''); }} style={{ padding:'7px 14px', borderRadius:8, fontSize:11, fontWeight:500, background:C.parchWarm, border:`1px solid ${C.parchLine}`, color:C.inkFaded, cursor:'pointer', fontFamily:FONT }}>Back</button>}
                {importRows.length===0&&<button onClick={handleBulkLookup} disabled={!upcInput.trim()||lookingUp} style={{ padding:'7px 16px', borderRadius:7, fontSize:11, fontWeight:700, background:upcInput.trim()?C.ink:C.parchWarm, border:upcInput.trim()?'none':`1px solid ${C.parchLine}`, color:upcInput.trim()?C.neCream:C.inkGhost, cursor:upcInput.trim()?'pointer':'not-allowed', fontFamily:FONT }}>Look up UPCs</button>}
                {importRows.length>0&&!lookingUp&&selCount>0&&<button onClick={handleBulkImport} disabled={importing} style={{ padding:'7px 16px', borderRadius:7, fontSize:11, fontWeight:700, background:C.ink, color:C.neCream, border:'none', cursor:'pointer', opacity:importing?0.7:1, fontFamily:FONT }}>{importing?'Importing...':`Import ${selCount} product${selCount!==1?'s':''}`}</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}